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
        opiniones JSONB,
        FOREIGN KEY ("usuarioId") REFERENCES usuarios(id) ON DELETE CASCADE
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

    const res = await queryWithRetry('SELECT COUNT(id) as count FROM usuarios');
    if (res.rows[0].count === '0') {
      console.log('Base de datos vacía. Poblando con datos iniciales...');
      await populateDatabase();
    } else {
      console.log('La base de datos ya contiene datos.');
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

        for (const u of data.usuarios) {
            await client.query('INSERT INTO usuarios (id, nombre, email, password, telefono, "isVerified") VALUES ($1, $2, $3, $4, $5, $6)', [u.id, u.nombre, u.email, u.password, u.telefono, true]);
        }
        for (const c of data.comercios) {
            await client.query('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", "vencimientoPublicidad", opiniones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)', 
            [c.id, c.nombre, c.imagenUrl, c.rubroId, c.subRubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.barrio, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description, JSON.stringify(c.galeriaImagenes || []), c.publicidad, c.renovacionAutomatica, c.vencimientoPublicidad, JSON.stringify(c.opiniones || [])]);
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
        await client.query('TRUNCATE usuarios, comercios, banners, pagos, public_usuarios, reportes RESTART IDENTITY CASCADE');
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
        const result = await queryWithRetry('SELECT * FROM usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || user.password !== inputPassword) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        if (!user.isVerified) return res.status(403).json({ error: 'Tu cuenta no ha sido verificado.' });
        
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
    const newComercio = {
        id: `co-${uuidv4()}`,
        ...data,
        publicidad: data.publicidad || 1,
        renovacionAutomatica: data.publicidad > 1 ? data.renovacionAutomatica : false,
        vencimientoPublicidad: vencimiento,
        opiniones: [],
    };
    
    try {
        await queryWithRetry('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", "vencimientoPublicidad", opiniones) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)',
            [newComercio.id, newComercio.nombre, newComercio.imagenUrl, newComercio.rubroId, newComercio.subRubroId, newComercio.provinciaId, newComercio.provinciaNombre, newComercio.ciudadId, newComercio.ciudadNombre, newComercio.barrio, newComercio.usuarioId, newComercio.whatsapp, newComercio.direccion, newComercio.googleMapsUrl, newComercio.websiteUrl, newComercio.description, JSON.stringify(newComercio.galeriaImagenes || []), newComercio.publicidad, newComercio.renovacionAutomatica, newComercio.vencimientoPublicidad, JSON.stringify(newComercio.opiniones || [])]);
        res.status(201).json(newComercio);
    } catch (err) {
        console.error('ERROR EN /api/comercios (POST):', err.stack);
        res.status(500).json({ error: 'Error al crear el comercio.' });
    }
});


app.put('/api/comercios/:id', async (req, res) => {
    const { id } = req.params;
    const { nombre, imagenUrl, rubroId, subRubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, barrio, whatsapp, direccion, googleMapsUrl, websiteUrl, description, galeriaImagenes, renovacionAutomatica } = req.body;
    try {
        await queryWithRetry('UPDATE comercios SET nombre=$1, "imagenUrl"=$2, "rubroId"=$3, "subRubroId"=$4, "provinciaId"=$5, "provinciaNombre"=$6, "ciudadId"=$7, "ciudadNombre"=$8, barrio=$9, whatsapp=$10, direccion=$11, "googleMapsUrl"=$12, "websiteUrl"=$13, description=$14, "galeriaImagenes"=$15, "renovacionAutomatica"=$16 WHERE id = $17',
            [nombre, imagenUrl, rubroId, subRubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, barrio, whatsapp, direccion, googleMapsUrl, websiteUrl, description, JSON.stringify(galeriaImagenes || []), renovacionAutomatica, id]);
        
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
        const result = await queryWithRetry('SELECT * FROM public_usuarios WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || user.password !== inputPassword) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        }
        
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