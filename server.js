// server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg'); // Importamos el cliente de PostgreSQL
const { getInitialData } = require('./mockData.js');

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuración de la Base de Datos PostgreSQL ---
// El servidor se conectará usando la URL que guardamos en las variables de entorno de Render.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false // Necesario para conexiones remotas en producción
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const AD_PRICES = { 1: 0, 2: 1500, 3: 3000, 4: 5000, 5: 8000, 6: 12000 };
const ADMIN_EMAIL = 'admin@guiacomercial.com'; // Email del administrador

// --- FUNCIÓN DE REINTENTO PARA LA BASE DE DATOS ---
const MAX_RETRIES = 5; // Reintentos para queries durante la ejecución
const RETRY_DELAY = 1000; // 1 segundo de base

const queryWithRetry = async (queryText, params) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await pool.query(queryText, params);
      return result;
    } catch (err) {
      console.error(`Intento ${attempt} de la consulta falló. Error: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error("Máximo de reintentos alcanzado. Lanzando error.");
        throw err; // Lanza el error después del último intento
      }
      // Esperar antes del próximo reintento con backoff exponencial
      await new Promise(res => setTimeout(res, RETRY_DELAY * Math.pow(2, attempt -1)));
    }
  }
};

// --- FUNCIÓN DE REINTENTO PARA LA CONEXIÓN INICIAL (MÁS ROBUSTA) ---
const MAX_CONNECTION_RETRIES = 10;
const INITIAL_CONNECTION_RETRY_DELAY = 1000; // Empezar con 1 segundo

const connectWithRetry = async () => {
    for (let attempt = 1; attempt <= MAX_CONNECTION_RETRIES; attempt++) {
        try {
            await pool.query('SELECT NOW()'); // Intenta una query simple para verificar la conexión
            console.log('Conexión con la base de datos PostgreSQL verificada.');
            return; // Si tiene éxito, sale de la función
        } catch (err) {
            const delay = INITIAL_CONNECTION_RETRY_DELAY * Math.pow(2, attempt - 1); // Backoff exponencial
            console.error(`Intento ${attempt} de conexión a la base de datos falló: ${err.message}`);
            
            if (attempt === MAX_CONNECTION_RETRIES) {
                console.error("Máximo de reintentos de conexión alcanzado. No se pudo conectar a la base de datos.");
                throw err; // Lanza el error después del último intento
            }

            console.log(`Reintentando conexión en ${delay / 1000} segundos...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
};


// --- Inicialización de la Base de Datos ---
const initializeDb = async () => {
  try {
    console.log('Inicializando esquema de la base de datos si no existe...');
    // Usamos sintaxis de PostgreSQL (VARCHAR, TEXT, INTEGER, BOOLEAN, TIMESTAMP, JSONB para arrays)
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        telefono VARCHAR(50),
        "isVerified" BOOLEAN DEFAULT false,
        "verificationCode" TEXT
      );
    `);

    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS comercios (
        id TEXT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        "imagenUrl" TEXT NOT NULL,
        "rubroId" TEXT,
        "subRubroId" TEXT,
        "provinciaId" TEXT,
        "provinciaNombre" VARCHAR(255),
        "ciudadId" TEXT,
        "ciudadNombre" VARCHAR(255),
        barrio VARCHAR(255),
        "usuarioId" TEXT,
        whatsapp VARCHAR(50),
        direccion TEXT,
        "googleMapsUrl" TEXT,
        "websiteUrl" TEXT,
        description TEXT,
        "galeriaImagenes" JSONB,
        publicidad INTEGER,
        "renovacionAutomatica" BOOLEAN,
        "vencimientoPublicidad" TIMESTAMP,
        opiniones JSONB DEFAULT '[]',
        lat REAL,
        lon REAL
      );
    `);
    
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS banners (
          id TEXT PRIMARY KEY,
          "comercioId" TEXT,
          "imagenUrl" TEXT,
          "venceEl" TIMESTAMP,
          FOREIGN KEY ("comercioId") REFERENCES comercios(id) ON DELETE CASCADE
      );
    `);

    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS pagos (
          id TEXT PRIMARY KEY,
          "comercioId" TEXT,
          monto REAL,
          fecha TIMESTAMP,
          "mercadoPagoId" TEXT,
          FOREIGN KEY ("comercioId") REFERENCES comercios(id) ON DELETE CASCADE
      );
    `);
    
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS public_usuarios (
        id TEXT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        apellido VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        whatsapp VARCHAR(50),
        favorites JSONB,
        history JSONB
      );
    `);
    
     await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS reportes (
        id TEXT PRIMARY KEY,
        "comercioId" TEXT NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        detalles TEXT,
        "usuarioId" TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        "comercioId" TEXT NOT NULL,
        "rubroId" TEXT,
        "usuarioId" TEXT,
        "eventType" VARCHAR(50) NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // --- NUEVAS TABLAS PARA EL CHAT ---
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        "clienteId" TEXT NOT NULL,
        "comercioId" TEXT NOT NULL,
        "clienteNombre" VARCHAR(255) NOT NULL,
        "comercioNombre" VARCHAR(255) NOT NULL,
        "comercioImagenUrl" TEXT NOT NULL,
        "lastMessage" TEXT,
        "lastMessageTimestamp" TIMESTAMP WITH TIME ZONE,
        "lastMessageSenderId" TEXT,
        UNIQUE("clienteId", "comercioId")
      );
    `);

    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        "conversationId" TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "senderId" TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "isRead" BOOLEAN DEFAULT false
      );
    `);
    console.log('Tablas de Chat verificadas/creadas.');

    // --- LÓGICA MEJORADA ---
    // Primero, comprobar si la base de datos está completamente vacía.
    const res = await queryWithRetry('SELECT COUNT(id) as count FROM usuarios');
    if (res.rows[0].count === '0') {
      console.log('Base de datos vacía. Poblando con datos iniciales...');
      await populateDatabase();
    } else {
      console.log('La base de datos ya contiene datos.');
      // Si ya hay datos, nos aseguramos de que el admin exista.
      const adminCheck = await queryWithRetry('SELECT id FROM usuarios WHERE email = $1', [ADMIN_EMAIL]);
      if (adminCheck.rows.length === 0) {
          console.log('El usuario administrador no existe. Creándolo ahora...');
          await queryWithRetry('INSERT INTO usuarios (id, nombre, email, password, "isVerified") VALUES ($1, $2, $3, $4, $5)', [uuidv4(), 'Administrador', ADMIN_EMAIL, 'admin123', true]);
          console.log('Usuario administrador creado con éxito.');
      } else {
          console.log('El usuario administrador ya existe.');
      }
    }

  } catch (err) {
    console.error('Error al inicializar la base de datos:', err.stack);
    // Lanzamos el error para que el proceso de arranque principal lo capture y se detenga.
    throw err;
  }
};

const populateDatabase = async () => {
    const data = getInitialData();
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Iniciar transacción

        // Crear usuario admin
        await client.query('INSERT INTO usuarios (id, nombre, email, password, "isVerified") VALUES ($1, $2, $3, $4, $5)', [uuidv4(), 'Administrador', ADMIN_EMAIL, 'admin123', true]);

        for (const u of data.usuarios) {
            await client.query('INSERT INTO usuarios (id, nombre, email, password, telefono, "isVerified") VALUES ($1, $2, $3, $4, $5, $6)', [u.id, u.nombre, u.email, u.password, u.telefono, true]);
        }
        for (const c of data.comercios) {
            await client.query('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", "vencimientoPublicidad", opiniones, lat, lon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)', 
            [c.id, c.nombre, c.imagenUrl, c.rubroId, c.subRubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.barrio, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description, JSON.stringify(c.galeriaImagenes || []), c.publicidad, c.renovacionAutomatica, c.vencimientoPublicidad, JSON.stringify(c.opiniones || []), c.lat, c.lon]);
        }
        for (const b of data.banners) {
            await client.query('INSERT INTO banners (id, "comercioId", "imagenUrl", "venceEl") VALUES ($1, $2, $3, $4)', [b.id, b.comercioId, b.imagenUrl, b.venceEl]);
        }
        for (const p of data.pagos) {
            await client.query('INSERT INTO pagos (id, "comercioId", monto, fecha, "mercadoPagoId") VALUES ($1, $2, $3, $4, $5)', [p.id, p.comercioId, p.monto, p.fecha, p.mercadoPagoId]);
        }
        
        await client.query('COMMIT'); // Confirmar transacción
        console.log("Datos de prueba insertados con éxito.");
    } catch (err) {
        await client.query('ROLLBACK'); // Deshacer en caso de error
        console.error('Error al poblar la base de datos, transacción deshecha.', err.stack);
    } finally {
        client.release(); // Liberar cliente
    }
};

// --- API Endpoints (Reescritos para PostgreSQL) ---

app.get('/api/data', async (req, res) => {
  try {
    const initialStaticData = getInitialData();
    const data = {
      provincias: initialStaticData.provincias,
      ciudades: initialStaticData.ciudades,
      rubros: initialStaticData.rubros,
      subRubros: initialStaticData.subRubros,
    };

    const [usuariosRes, comerciosRes, bannersRes, pagosRes] = await Promise.all([
        queryWithRetry('SELECT * FROM usuarios'),
        queryWithRetry('SELECT * FROM comercios ORDER BY publicidad DESC, nombre ASC'),
        queryWithRetry('SELECT * FROM banners'),
        queryWithRetry('SELECT * FROM pagos')
    ]);

    res.json({
        ...data,
        usuarios: usuariosRes.rows,
        comercios: comerciosRes.rows,
        banners: bannersRes.rows,
        pagos: pagosRes.rows,
    });
  } catch (err) {
    console.error('ERROR EN /api/data:', err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.post('/api/reset-data', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('TRUNCATE usuarios, comercios, banners, pagos, public_usuarios, reportes, analytics_events, conversations, chat_messages RESTART IDENTITY CASCADE');
        await client.query('COMMIT');
        console.log("Datos de la DB borrados. Repoblando...");
        await populateDatabase(); // Re-poblar la base
        res.status(200).json({ message: 'Datos restaurados con éxito.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR EN /api/reset-data:', err.stack);
        res.status(500).json({ error: 'No se pudieron restaurar los datos.' });
    } finally {
        client.release();
    }
});


app.post('/api/register', async (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan datos.' });

    try {
        const existingUser = await queryWithRetry('SELECT email FROM usuarios WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'El email ya está registrado.' });
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const newUser = { id: uuidv4(), nombre, email, password, telefono: telefono || null, verificationCode };

        await queryWithRetry('INSERT INTO usuarios (id, nombre, email, password, telefono, "verificationCode") VALUES ($1, $2, $3, $4, $5, $6)',
            [newUser.id, newUser.nombre, newUser.email, newUser.password, newUser.telefono, newUser.verificationCode]);

        console.log(`Usuario registrado: ${email}, Código: ${verificationCode}`);
        res.status(201).json({ message: 'Registro exitoso.', email: newUser.email, verificationCode });

    } catch (err) {
        console.error('ERROR EN /api/register:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await queryWithRetry('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];
        
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
        if (user.isVerified) return res.status(400).json({ error: 'El usuario ya está verificado.' });
        if (user.verificationCode !== code) return res.status(400).json({ error: 'Código de verificación incorrecto.' });

        await queryWithRetry('UPDATE usuarios SET "isVerified" = true, "verificationCode" = NULL WHERE id = $1', [user.id]);
        
        delete user.password;
        delete user.verificationCode;
        user.isVerified = true;
        res.status(200).json(user);

    } catch (err) {
        console.error('ERROR EN /api/verify:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password: inputPassword } = req.body;
    try {
        const userRes = await queryWithRetry('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = userRes.rows[0];

        if (!user || user.password !== inputPassword) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        if (!user.isVerified) return res.status(403).json({ error: 'Tu cuenta no ha sido verificado.' });
        
        // Contar mensajes no leídos como comerciante
        const unreadRes = await queryWithRetry(`
            SELECT COUNT(m.id) 
            FROM chat_messages m
            JOIN conversations c ON m."conversationId" = c.id
            WHERE c."comercioId" = (SELECT id FROM comercios WHERE "usuarioId" = $1 LIMIT 1)
            AND m."senderId" != $1 
            AND m."isRead" = false
        `, [user.id]);

        user.unreadMessageCount = parseInt(unreadRes.rows[0].count, 10);
        
        delete user.password;
        res.status(200).json(user);

    } catch (err) {
        console.error('ERROR EN /api/login:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});


app.put('/api/usuarios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono } = req.body;
    try {
        await queryWithRetry('UPDATE usuarios SET nombre = $1, telefono = $2 WHERE id = $3', [nombre, telefono, id]);
        const result = await queryWithRetry('SELECT * FROM usuarios WHERE id = $1', [id]);
        const user = result.rows[0];
        delete user.password;
        res.status(200).json(user);
    } catch (err) {
        console.error(`ERROR EN /api/usuarios/${id}:`, err.stack);
        res.status(500).json({ error: 'Error al actualizar usuario.' });
    }
});


app.post('/api/comercios', async (req, res) => {
    const data = req.body;
    const vencimiento = data.publicidad > 1 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    
    let lat = null;
    let lon = null;
    if(data.ciudadId) {
        try {
            const geoResponse = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?id=${data.ciudadId}&campos=centroide.lat,centroide.lon`);
            if (geoResponse.ok) {
                const geoData = await geoResponse.json();
                if (geoData.municipios && geoData.municipios.length > 0) {
                    lat = geoData.municipios[0].centroide.lat;
                    lon = geoData.municipios[0].centroide.lon;
                }
            }
        } catch (geoErr) {
            console.error("Error fetching geolocation during creation:", geoErr);
        }
    }

    const newComercio = {
        id: `co-${uuidv4()}`,
        ...data,
        publicidad: data.publicidad || 1,
        renovacionAutomatica: data.publicidad > 1 ? data.renovacionAutomatica : false,
        vencimientoPublicidad: vencimiento,
        opiniones: data.opiniones || [],
        lat,
        lon
    };
    
    try {
        await queryWithRetry('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", "vencimientoPublicidad", opiniones, lat, lon) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)',
            [newComercio.id, newComercio.nombre, newComercio.imagenUrl, newComercio.rubroId, newComercio.subRubroId, newComercio.provinciaId, newComercio.provinciaNombre, newComercio.ciudadId, newComercio.ciudadNombre, newComercio.barrio, newComercio.usuarioId, newComercio.whatsapp, newComercio.direccion, newComercio.googleMapsUrl, newComercio.websiteUrl, newComercio.description, JSON.stringify(newComercio.galeriaImagenes || []), newComercio.publicidad, newComercio.renovacionAutomatica, newComercio.vencimientoPublicidad, JSON.stringify(newComercio.opiniones || []), newComercio.lat, newComercio.lon]);
        res.status(201).json(newComercio);
    } catch (err) {
        console.error('ERROR EN /api/comercios (POST):', err.stack);
        res.status(500).json({ error: 'Error al crear el comercio.' });
    }
});


app.put('/api/comercios/:id', async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    
    try {
        const existingComercioRes = await queryWithRetry('SELECT "ciudadId", lat, lon FROM comercios WHERE id = $1', [id]);
        if (existingComercioRes.rows.length === 0) {
            return res.status(404).json({ error: "Comercio no encontrado." });
        }
        const existingComercio = existingComercioRes.rows[0];

        let lat = existingComercio.lat;
        let lon = existingComercio.lon;

        if (data.ciudadId && (existingComercio.ciudadId !== data.ciudadId || !lat || !lon)) {
             try {
                const geoResponse = await fetch(`https://apis.datos.gob.ar/georef/api/municipios?id=${data.ciudadId}&campos=centroide.lat,centroide.lon`);
                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.municipios && geoData.municipios.length > 0) {
                        lat = geoData.municipios[0].centroide.lat;
                        lon = geoData.municipios[0].centroide.lon;
                    }
                }
            } catch (geoErr) {
                console.error("Error fetching geolocation on update:", geoErr);
            }
        }

        await queryWithRetry('UPDATE comercios SET nombre=$1, "imagenUrl"=$2, "rubroId"=$3, "subRubroId"=$4, "provinciaId"=$5, "provinciaNombre"=$6, "ciudadId"=$7, "ciudadNombre"=$8, barrio=$9, whatsapp=$10, direccion=$11, "googleMapsUrl"=$12, "websiteUrl"=$13, description=$14, "galeriaImagenes"=$15, "renovacionAutomatica"=$16, lat=$17, lon=$18 WHERE id = $19',
            [data.nombre, data.imagenUrl, data.rubroId, data.subRubroId, data.provinciaId, data.provinciaNombre, data.ciudadId, data.ciudadNombre, data.barrio, data.whatsapp, data.direccion, data.googleMapsUrl, data.websiteUrl, data.description, JSON.stringify(data.galeriaImagenes || []), data.renovacionAutomatica, lat, lon, id]);
        
        const result = await queryWithRetry('SELECT * FROM comercios WHERE id = $1', [id]);
        res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error(`ERROR EN /api/comercios/${id} (PUT):`, err.stack);
        res.status(500).json({ error: 'Error al actualizar el comercio.' });
    }
});

app.post('/api/comercios/:id/upgrade', async (req, res) => {
    const { id } = req.params;
    const { newLevel } = req.body;
    const vencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    try {
        await queryWithRetry('UPDATE comercios SET publicidad = $1, "vencimientoPublicidad" = $2 WHERE id = $3', [newLevel, vencimiento, id]);
        
        const newPago = { id: `pay-${uuidv4()}`, comercioId: id, monto: AD_PRICES[newLevel], fecha: new Date(), mercadoPagoId: `mp-test-${Date.now()}`};
        await queryWithRetry('INSERT INTO pagos (id, "comercioId", monto, fecha, "mercadoPagoId") VALUES ($1,$2,$3,$4,$5)',
            [newPago.id, newPago.comercioId, newPago.monto, newPago.fecha, newPago.mercadoPagoId]);

        const result = await queryWithRetry('SELECT * FROM comercios WHERE id = $1', [id]);
        res.status(200).json({ updatedComercio: result.rows[0], newPago });

    } catch (err) {
        console.error(`ERROR EN /api/comercios/${id}/upgrade:`, err.stack);
        res.status(500).json({ error: 'Error al actualizar el plan.' });
    }
});

app.post('/api/comercios/:id/opinar', async (req, res) => {
    const { id: comercioId } = req.params;
    const { usuarioId, usuarioNombre, texto, rating } = req.body;

    if (!usuarioId || !usuarioNombre || !rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Faltan datos o son incorrectos para la opinión.' });
    }

    try {
        const result = await queryWithRetry('SELECT opiniones FROM comercios WHERE id = $1', [comercioId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comercio no encontrado.' });
        }

        const opiniones = result.rows[0].opiniones || [];
        const newOpinion = {
            id: `op-${uuidv4()}`,
            usuarioId,
            usuarioNombre,
            rating,
            texto: texto || '', // El texto es opcional
            timestamp: new Date().toISOString(),
        };
        const newOpiniones = [...opiniones, newOpinion];

        const updateResult = await queryWithRetry(
            'UPDATE comercios SET opiniones = $1 WHERE id = $2 RETURNING *',
            [JSON.stringify(newOpiniones), comercioId]
        );

        res.status(200).json(updateResult.rows[0]);

    } catch (err) {
        console.error(`ERROR EN /api/comercios/${comercioId}/opinar:`, err.stack);
        res.status(500).json({ error: 'Error al guardar la opinión.' });
    }
});


app.post('/api/reportes', async (req, res) => {
    const { comercioId, motivo, detalles, usuarioId } = req.body;
    if (!comercioId || !motivo) {
        return res.status(400).json({ error: 'Faltan datos para el reporte.' });
    }

    try {
        const newReporte = {
            id: `rep-${uuidv4()}`,
            comercioId,
            motivo,
            detalles: detalles || null,
            usuarioId: usuarioId || null,
        };
        await queryWithRetry(
            'INSERT INTO reportes (id, "comercioId", motivo, detalles, "usuarioId") VALUES ($1, $2, $3, $4, $5)',
            [newReporte.id, newReporte.comercioId, newReporte.motivo, newReporte.detalles, newReporte.usuarioId]
        );
        res.status(201).json({ message: 'Reporte enviado con éxito.' });
    } catch (err) {
        console.error(`ERROR EN /api/reportes:`, err.stack);
        res.status(500).json({ error: 'Error al enviar el reporte.' });
    }
});


app.delete('/api/comercios/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // La restricción ON DELETE CASCADE en la DB se encarga de borrar banners y pagos.
        await queryWithRetry('DELETE FROM comercios WHERE id = $1', [id]);
        res.status(200).json({ message: 'Comercio eliminado con éxito.' });
    } catch (err) {
        console.error(`ERROR EN /api/comercios/${id} (DELETE):`, err.stack);
        res.status(500).json({ error: 'Error al eliminar el comercio.' });
    }
});

// --- Public User Endpoints ---

app.post('/api/public-register', async (req, res) => {
    const { nombre, apellido, email, password, whatsapp } = req.body;
    if (!nombre || !apellido || !email || !password) {
        return res.status(400).json({ error: 'Faltan campos obligatorios.' });
    }

    try {
        const existingUser = await queryWithRetry('SELECT email FROM public_usuarios WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'El email ya está registrado.' });
        }

        const newUser = {
            id: `pub-${uuidv4()}`,
            nombre,
            apellido,
            email,
            password,
            whatsapp: whatsapp || null,
            favorites: [],
            history: [],
        };

        await queryWithRetry(
            'INSERT INTO public_usuarios (id, nombre, apellido, email, password, whatsapp, favorites, history) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [newUser.id, newUser.nombre, newUser.apellido, newUser.email, newUser.password, newUser.whatsapp, JSON.stringify(newUser.favorites), JSON.stringify(newUser.history)]
        );
        
        delete newUser.password; // Don't send password back
        res.status(201).json(newUser);

    } catch (err) {
        console.error('ERROR EN /api/public-register:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor al registrar usuario público.' });
    }
});

app.post('/api/public-login', async (req, res) => {
    const { email, password: inputPassword } = req.body;
    if (!email || !inputPassword) {
        return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    }

    try {
        const userRes = await queryWithRetry('SELECT * FROM public_usuarios WHERE email = $1', [email]);
        const user = userRes.rows[0];

        if (!user || user.password !== inputPassword) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        }

        // Contar mensajes no leídos como cliente
        const unreadRes = await queryWithRetry(`
            SELECT COUNT(m.id) 
            FROM chat_messages m
            JOIN conversations c ON m."conversationId" = c.id
            WHERE c."clienteId" = $1 
            AND m."senderId" != $1 
            AND m."isRead" = false
        `, [user.id]);
        
        user.unreadMessageCount = parseInt(unreadRes.rows[0].count, 10);
        
        delete user.password;
        res.status(200).json(user);

    } catch (err) {
        console.error('ERROR EN /api/public-login:', err.stack);
        res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
    }
});

app.put('/api/public-users/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, apellido, whatsapp, favorites, history } = req.body;
    if (nombre === undefined || apellido === undefined || favorites === undefined || history === undefined) {
        return res.status(400).json({ error: 'Faltan datos para la actualización.' });
    }

    try {
        const result = await queryWithRetry(
            'UPDATE public_usuarios SET nombre = $1, apellido = $2, whatsapp = $3, favorites = $4, history = $5 WHERE id = $6 RETURNING *',
            [nombre, apellido, whatsapp || null, JSON.stringify(favorites || []), JSON.stringify(history || []), id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario público no encontrado.' });
        }
        
        const updatedUser = result.rows[0];
        delete updatedUser.password;
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(`ERROR EN /api/public-users/${id}:`, err.stack);
        res.status(500).json({ error: 'Error al actualizar el usuario público.' });
    }
});


// --- ANALYTICS ENDPOINTS ---

app.post('/api/track', async (req, res) => {
    const { comercioId, eventType, usuarioId } = req.body;
    if (!comercioId || !eventType) {
        return res.status(400).json({ error: 'Faltan datos para el evento.' });
    }
    try {
        // Obtenemos el rubroId del comercio para denormalizar y facilitar las consultas
        const comercioRes = await queryWithRetry('SELECT "rubroId" FROM comercios WHERE id = $1', [comercioId]);
        if (comercioRes.rows.length === 0) {
            // Si no encontramos el comercio, no registramos el evento para mantener la integridad.
            return res.status(404).json({ error: 'Comercio no encontrado.' });
        }
        const rubroId = comercioRes.rows[0].rubroId;

        await queryWithRetry(
            'INSERT INTO analytics_events (id, "comercioId", "rubroId", "usuarioId", "eventType") VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), comercioId, rubroId, usuarioId || null, eventType]
        );
        res.status(201).send();
    } catch (err) {
        console.error('ERROR EN /api/track:', err.stack);
        res.status(500).json({ error: 'Error al registrar el evento.' });
    }
});

app.get('/api/analytics', async (req, res) => {
    const { comercioId, userEmail } = req.query; // userEmail para verificar si es admin

    // --- Vista para un Comerciante específico ---
    if (comercioId) {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            
            const [viewsRes, whatsappRes, websiteRes] = await Promise.all([
                queryWithRetry('SELECT COUNT(*) FROM analytics_events WHERE "comercioId" = $1 AND "eventType" = $2 AND timestamp >= $3', [comercioId, 'view', thirtyDaysAgo]),
                queryWithRetry('SELECT COUNT(*) FROM analytics_events WHERE "comercioId" = $1 AND "eventType" = $2 AND timestamp >= $3', [comercioId, 'whatsapp_click', thirtyDaysAgo]),
                queryWithRetry('SELECT COUNT(*) FROM analytics_events WHERE "comercioId" = $1 AND "eventType" = $2 AND timestamp >= $3', [comercioId, 'website_click', thirtyDaysAgo])
            ]);

            res.status(200).json({
                totalViews: parseInt(viewsRes.rows[0].count, 10),
                totalWhatsappClicks: parseInt(whatsappRes.rows[0].count, 10),
                totalWebsiteClicks: parseInt(websiteRes.rows[0].count, 10),
            });
        } catch (err) {
            console.error(`ERROR EN /api/analytics para comercio ${comercioId}:`, err.stack);
            res.status(500).json({ error: 'Error al obtener las métricas del comercio.' });
        }
        return;
    }
    
    // --- Vista para Administrador ---
    if (userEmail !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }

    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const staticData = getInitialData();

        const [visitsByRubroRes, topVisitedRes, totalEventsRes] = await Promise.all([
            // Visitas por rubro
            queryWithRetry(`
                SELECT "rubroId", COUNT(*) as count 
                FROM analytics_events 
                WHERE "eventType" = 'view' AND timestamp >= $1
                GROUP BY "rubroId" 
                ORDER BY count DESC`, [thirtyDaysAgo]),
            // Top 5 comercios visitados
            queryWithRetry(`
                SELECT "comercioId", c.nombre as "comercioNombre", COUNT(*) as count
                FROM analytics_events a
                JOIN comercios c ON a."comercioId" = c.id
                WHERE a."eventType" = 'view' AND a.timestamp >= $1
                GROUP BY a."comercioId", c.nombre
                ORDER BY count DESC
                LIMIT 5`, [thirtyDaysAgo]),
            // Totales de eventos
            queryWithRetry(`
                SELECT "eventType", COUNT(*) as count
                FROM analytics_events
                WHERE timestamp >= $1
                GROUP BY "eventType"`, [thirtyDaysAgo])
        ]);
        
        const visitsByRubro = visitsByRubroRes.rows.map(row => ({
            rubroId: row.rubroId,
            rubroNombre: staticData.rubros.find(r => r.id === row.rubroId)?.nombre || 'Desconocido',
            count: parseInt(row.count, 10)
        }));

        const totalEvents = totalEventsRes.rows.reduce((acc, row) => {
            if (row.eventType === 'view') acc.views = parseInt(row.count, 10);
            if (row.eventType === 'whatsapp_click') acc.whatsappClicks = parseInt(row.count, 10);
            if (row.eventType === 'website_click') acc.websiteClicks = parseInt(row.count, 10);
            return acc;
        }, { views: 0, whatsappClicks: 0, websiteClicks: 0 });

        res.status(200).json({
            visitsByRubro,
            topVisitedComercios: topVisitedRes.rows.map(r => ({...r, count: parseInt(r.count, 10)})),
            totalEvents,
        });

    } catch (err) {
        console.error('ERROR EN /api/analytics para admin:', err.stack);
        res.status(500).json({ error: 'Error al obtener las métricas de administrador.' });
    }
});


// --- CHAT ENDPOINTS ---

// Inicia o encuentra una conversación entre un cliente y un comercio
app.post('/api/conversations/start', async (req, res) => {
    const { clienteId, comercioId } = req.body;
    try {
        // Paso 1: Obtener los nombres necesarios para la creación.
        const [clienteRes, comercioRes] = await Promise.all([
            queryWithRetry('SELECT nombre, apellido FROM public_usuarios WHERE id = $1', [clienteId]),
            queryWithRetry('SELECT nombre, "imagenUrl" FROM comercios WHERE id = $1', [comercioId])
        ]);

        if (clienteRes.rows.length === 0 || comercioRes.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente o comercio no encontrado.' });
        }

        const clienteNombre = `${clienteRes.rows[0].nombre} ${clienteRes.rows[0].apellido}`;
        const comercioNombre = comercioRes.rows[0].nombre;
        const comercioImagenUrl = comercioRes.rows[0].imagenUrl;

        // Paso 2: Usar INSERT ... ON CONFLICT para manejar la condición de carrera de forma atómica.
        // Si el par (clienteId, comercioId) ya existe, no hace nada (DO NOTHING).
        await queryWithRetry(
            `INSERT INTO conversations (id, "clienteId", "comercioId", "clienteNombre", "comercioNombre", "comercioImagenUrl") 
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT ("clienteId", "comercioId") DO NOTHING`,
            [`conv-${uuidv4()}`, clienteId, comercioId, clienteNombre, comercioNombre, comercioImagenUrl]
        );

        // Paso 3: Después del insert (o del no-op), obtenemos la conversación que ahora garantizamos que existe.
        const conversationRes = await queryWithRetry('SELECT * FROM conversations WHERE "clienteId" = $1 AND "comercioId" = $2', [clienteId, comercioId]);

        if (conversationRes.rows.length === 0) {
             // Esto sería muy raro, indicaría un problema más profundo.
             throw new Error("No se pudo crear o encontrar la conversación después del intento de inserción.");
        }

        res.status(200).json(conversationRes.rows[0]); // 200 OK porque puede ser una existente o una nueva.

    } catch (err) {
        console.error('ERROR en /api/conversations/start:', err.stack);
        res.status(500).json({ error: 'Error al iniciar la conversación.' });
    }
});


// Obtiene todas las conversaciones de un usuario (sea cliente o comerciante)
app.get('/api/conversations/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const conversationsRes = await queryWithRetry(`
            SELECT 
                c.*,
                (SELECT COUNT(*) FROM chat_messages cm WHERE cm."conversationId" = c.id AND cm."senderId" != $1 AND cm."isRead" = false) as unread_count
            FROM conversations c
            WHERE c."clienteId" = $1 OR c."comercioId" IN (SELECT id FROM comercios WHERE "usuarioId" = $1)
            ORDER BY "lastMessageTimestamp" DESC NULLS LAST
        `, [userId]);
        
        // Mapear el nombre del contador
        const conversations = conversationsRes.rows.map(row => {
            const isCliente = row.clienteId === userId;
            const unreadCount = parseInt(row.unread_count, 10);
            return {
                ...row,
                unreadByCliente: isCliente ? unreadCount : 0,
                unreadByComercio: !isCliente ? unreadCount : 0,
            };
        });

        res.status(200).json(conversations);
    } catch (err) {
        console.error(`ERROR en /api/conversations/${userId}:`, err.stack);
        res.status(500).json({ error: 'Error al obtener las conversaciones.' });
    }
});


// Obtiene los mensajes de una conversación
app.get('/api/messages/:conversationId', async (req, res) => {
    const { conversationId } = req.params;
    try {
        const messagesRes = await queryWithRetry('SELECT * FROM chat_messages WHERE "conversationId" = $1 ORDER BY timestamp ASC', [conversationId]);
        res.status(200).json(messagesRes.rows);
    } catch (err) {
        console.error(`ERROR en /api/messages/${conversationId}:`, err.stack);
        res.status(500).json({ error: 'Error al obtener los mensajes.' });
    }
});

// Envía un nuevo mensaje
app.post('/api/messages', async (req, res) => {
    const { conversationId, senderId, content } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const newMessage = {
            id: `msg-${uuidv4()}`,
            conversationId,
            senderId,
            content,
            timestamp: new Date()
        };
        
        const messageRes = await client.query(
            'INSERT INTO chat_messages (id, "conversationId", "senderId", content, timestamp) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [newMessage.id, newMessage.conversationId, newMessage.senderId, newMessage.content, newMessage.timestamp]
        );

        await client.query(
            'UPDATE conversations SET "lastMessage" = $1, "lastMessageTimestamp" = $2, "lastMessageSenderId" = $3 WHERE id = $4',
            [newMessage.content, newMessage.timestamp, newMessage.senderId, newMessage.conversationId]
        );

        await client.query('COMMIT');
        res.status(201).json(messageRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR en /api/messages (POST):', err.stack);
        res.status(500).json({ error: 'Error al enviar el mensaje.' });
    } finally {
        client.release();
    }
});

// Marca los mensajes de una conversación como leídos por un usuario
app.post('/api/conversations/:conversationId/read', async (req, res) => {
    const { conversationId } = req.params;
    const { userId } = req.body; // El usuario que está leyendo
    try {
        await queryWithRetry(
            'UPDATE chat_messages SET "isRead" = true WHERE "conversationId" = $1 AND "senderId" != $2 AND "isRead" = false',
            [conversationId, userId]
        );
        res.status(200).json({ message: 'Mensajes marcados como leídos.' });
    } catch (err) {
        console.error(`ERROR en /api/conversations/${conversationId}/read:`, err.stack);
        res.status(500).json({ error: 'Error al marcar mensajes como leídos.' });
    }
});

// --- MARKETING ENDPOINTS ---

app.post('/api/marketing/send-summary', async (req, res) => {
    const { adminEmail } = req.body;

    // 1. Seguridad: Verificar que es el admin
    if (adminEmail !== ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Acceso denegado.' });
    }

    try {
        // 2. Obtener todos los comerciantes (usuarios con al menos un comercio), excluyendo al admin.
        const merchantsRes = await queryWithRetry(`
            SELECT DISTINCT u.id, u.nombre, u.email
            FROM usuarios u
            JOIN comercios c ON u.id = c."usuarioId"
            WHERE u.email != $1
        `, [ADMIN_EMAIL]);

        const merchants = merchantsRes.rows;
        if (merchants.length === 0) {
            return res.status(200).json({ message: "No se encontraron comerciantes a quienes enviar el resumen." });
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        let emailsSentCount = 0;

        // 3. Iterar sobre cada comerciante para calcular sus métricas y "enviar" el email.
        for (const merchant of merchants) {
            // Obtener todos los comercios de este comerciante
            const comerciosRes = await queryWithRetry('SELECT id, nombre FROM comercios WHERE "usuarioId" = $1', [merchant.id]);
            const merchantComercios = comerciosRes.rows;
            const comercioIds = merchantComercios.map(c => c.id);

            if (comercioIds.length === 0) continue; // Saltear si no tiene comercios (aunque la query inicial ya lo filtra)

            // Calcular métricas agregadas para todos sus comercios
            const analyticsRes = await queryWithRetry(`
                SELECT "eventType", COUNT(*) as count
                FROM analytics_events
                WHERE "comercioId" = ANY($1::text[]) AND timestamp >= $2
                GROUP BY "eventType"
            `, [comercioIds, thirtyDaysAgo]);

            const stats = analyticsRes.rows.reduce((acc, row) => {
                if (row.eventType === 'view') acc.views = parseInt(row.count, 10);
                if (row.eventType === 'whatsapp_click') acc.whatsappClicks = parseInt(row.count, 10);
                if (row.eventType === 'website_click') acc.websiteClicks = parseInt(row.count, 10);
                return acc;
            }, { views: 0, whatsappClicks: 0, websiteClicks: 0 });

            // 4. Simular el envío de email
            const emailBody = `¡Hola ${merchant.nombre}!\n\nEste es el resumen de actividad de tus comercios en GuíaComercial para los últimos 30 días:\n\n- Visitas totales a tus fichas: ${stats.views}\n- Clics a WhatsApp: ${stats.whatsappClicks}\n- Clics a tu sitio web: ${stats.websiteClicks}\n\n¡Seguí así! Para mejorar tu visibilidad, considerá promocionar tus comercios desde tu panel.\n\nSaludos,\nEl equipo de GuíaComercial.`;
            
            console.log("--- SIMULANDO ENVÍO DE EMAIL ---");
            console.log(`Para: ${merchant.email}`);
            console.log(`Asunto: Tu resumen mensual de GuíaComercial`);
            console.log(`Cuerpo:\n${emailBody}`);
            console.log("---------------------------------");
            
            emailsSentCount++;
        }

        res.status(200).json({ message: `¡Éxito! Resúmenes enviados a ${emailsSentCount} comerciantes.` });

    } catch (err) {
        console.error('ERROR EN /api/marketing/send-summary:', err.stack);
        res.status(500).json({ error: 'Error al procesar los resúmenes de marketing.' });
    }
});



// --- Iniciar Servidor ---
const startServer = async () => {
  try {
    // Usar la nueva función de conexión con reintentos.
    await connectWithRetry();
    
    // Inicializamos la DB y esperamos a que termine para evitar race conditions.
    await initializeDb();
    
    // Solo después de que la DB esté lista, empezamos a escuchar peticiones.
    app.listen(PORT, () => {
      console.log(`Servidor de GuíaComercial escuchando en http://localhost:${PORT}`);
    });

  } catch (err) {
    console.error('FALLO CRÍTICO AL INICIAR: No se pudo conectar o inicializar la base de datos.', err.stack);
    process.exit(1); // Terminar el proceso si hay un error crítico al inicio.
  }
};

startServer();