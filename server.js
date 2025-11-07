// server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const path = require('path');

// --- Corrección Definitiva de Rutas para Render ---
// __dirname es el directorio donde se ejecuta este script. En Render es /opt/render/project/src
// La carpeta 'dist' se crea en el mismo nivel por el comando 'build'.
const distPath = path.join(__dirname, 'dist');

// Requerimos mockData desde su ubicación compilada dentro de 'dist'.
const { getInitialData } = require(path.join(distPath, 'mockData.js'));

const app = express();
const PORT = process.env.PORT || 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Servir Archivos Estáticos ---
// Apuntar express al directorio 'dist' que contiene nuestra app compilada.
app.use(express.static(distPath));


const AD_PRICES = { 1: 0, 2: 1500, 3: 3000, 4: 5000, 5: 8000, 6: 12000 };
const ADMIN_EMAIL = 'admin@guiacomercial.com';

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

const queryWithRetry = async (queryText, params) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await pool.query(queryText, params);
      return result;
    } catch (err) {
      console.error(`Intento ${attempt} de la consulta falló. Error: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise(res => setTimeout(res, RETRY_DELAY * Math.pow(2, attempt - 1)));
    }
  }
};

const MAX_CONNECTION_RETRIES = 10;
const INITIAL_CONNECTION_RETRY_DELAY = 1000;

const connectWithRetry = async () => {
    for (let attempt = 1; attempt <= MAX_CONNECTION_RETRIES; attempt++) {
        try {
            await pool.query('SELECT NOW()');
            console.log('Conexión con la base de datos PostgreSQL verificada.');
            return;
        } catch (err) {
            const delay = INITIAL_CONNECTION_RETRY_DELAY * Math.pow(2, attempt - 1);
            console.error(`Intento ${attempt} de conexión a la base de datos falló: ${err.message}`);
            if (attempt === MAX_CONNECTION_RETRIES) throw err;
            console.log(`Reintentando conexión en ${delay / 1000} segundos...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
};

const initializeDb = async () => {
  try {
    console.log('Inicializando esquema de la base de datos si no existe...');
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY, nombre VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password TEXT NOT NULL,
        telefono VARCHAR(50), "isVerified" BOOLEAN DEFAULT false, "verificationCode" TEXT
      );
    `);
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS comercios (
        id TEXT PRIMARY KEY, nombre VARCHAR(255) NOT NULL, "imagenUrl" TEXT NOT NULL, "rubroId" TEXT, "subRubroId" TEXT,
        "provinciaId" TEXT, "provinciaNombre" VARCHAR(255), "ciudadId" TEXT, "ciudadNombre" VARCHAR(255),
        barrio VARCHAR(255), "usuarioId" TEXT, whatsapp VARCHAR(50), direccion TEXT, "googleMapsUrl" TEXT,
        "websiteUrl" TEXT, description TEXT, "galeriaImagenes" JSONB, publicidad INTEGER, "renovacionAutomatica" BOOLEAN,
        "vencimientoPublicidad" TIMESTAMP, opiniones JSONB DEFAULT '[]', lat REAL, lon REAL
      );
    `);
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS banners ( id TEXT PRIMARY KEY, "comercioId" TEXT, "imagenUrl" TEXT, "venceEl" TIMESTAMP, FOREIGN KEY ("comercioId") REFERENCES comercios(id) ON DELETE CASCADE );
    `);
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS pagos ( id TEXT PRIMARY KEY, "comercioId" TEXT, monto REAL, fecha TIMESTAMP, "mercadoPagoId" TEXT, FOREIGN KEY ("comercioId") REFERENCES comercios(id) ON DELETE CASCADE );
    `);
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS public_usuarios (
        id TEXT PRIMARY KEY, nombre VARCHAR(255) NOT NULL, apellido VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
        password TEXT NOT NULL, whatsapp VARCHAR(50), favorites JSONB, history JSONB
      );
    `);
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY, "comercioId" TEXT NOT NULL, "rubroId" TEXT, "usuarioId" TEXT, "eventType" VARCHAR(50) NOT NULL, timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
     await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY, "clienteId" TEXT NOT NULL, "comercioId" TEXT NOT NULL, "clienteNombre" VARCHAR(255) NOT NULL,
        "comercioNombre" VARCHAR(255) NOT NULL, "comercioImagenUrl" TEXT NOT NULL, "lastMessage" TEXT, "lastMessageTimestamp" TIMESTAMP WITH TIME ZONE,
        "lastMessageSenderId" TEXT, UNIQUE("clienteId", "comercioId")
      );
    `);
    await queryWithRetry(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, "conversationId" TEXT NOT NULL, "senderId" TEXT NOT NULL, content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, "isRead" BOOLEAN DEFAULT false, FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
    console.log('Esquema de base de datos verificado.');
  } catch (err) {
    console.error('Error crítico al inicializar la base de datos:', err);
    process.exit(1);
  }
};

const populateDbIfNeeded = async () => {
  const res = await queryWithRetry('SELECT COUNT(*) FROM usuarios');
  if (parseInt(res.rows[0].count, 10) === 0) {
    console.log('Base de datos vacía, poblando con datos de prueba...');
    const data = getInitialData();
    const userPromises = data.usuarios.map(user => 
      queryWithRetry('INSERT INTO usuarios (id, nombre, email, password, telefono) VALUES ($1, $2, $3, $4, $5)', [user.id, user.nombre, user.email, user.password, user.telefono])
    );
    const comercioPromises = data.comercios.map(c => 
      queryWithRetry('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", "vencimientoPublicidad", opiniones, lat, lon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)',
        [c.id, c.nombre, c.imagenUrl, c.rubroId, c.subRubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.barrio, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description, JSON.stringify(c.galeriaImagenes || []), c.publicidad, c.renovacionAutomatica, c.vencimientoPublicidad, JSON.stringify(c.opiniones || []), c.lat, c.lon]
      )
    );
    await Promise.all([...userPromises, ...comercioPromises]);
    console.log('Datos de prueba insertados.');
  }
};

// --- API Endpoints ---
app.get('/api/data', async (req, res) => {
  try {
    const data = getInitialData();
    const [usuariosRes, comerciosRes, bannersRes, pagosRes] = await Promise.all([
      queryWithRetry('SELECT id, nombre, email, telefono, "isVerified" FROM usuarios'),
      queryWithRetry('SELECT * FROM comercios'),
      queryWithRetry('SELECT * FROM banners'),
      queryWithRetry('SELECT * FROM pagos')
    ]);
    res.json({
      provincias: data.provincias, ciudades: data.ciudades, rubros: data.rubros, subRubros: data.subRubros,
      usuarios: usuariosRes.rows, comercios: comerciosRes.rows, banners: bannersRes.rows, pagos: pagosRes.rows
    });
  } catch (err) {
    console.error('Error al obtener datos:', err);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

app.post('/api/register', async (req, res) => {
  const { nombre, email, password, telefono } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  try {
    const existingUser = await queryWithRetry('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) return res.status(409).json({ error: 'El email ya está registrado.' });

    const id = `u-${uuidv4()}`;
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    await queryWithRetry('INSERT INTO usuarios (id, nombre, email, password, telefono, "verificationCode") VALUES ($1, $2, $3, $4, $5, $6)', [id, nombre, email, password, telefono, verificationCode]);
    res.status(201).json({ message: 'Usuario registrado. Por favor, verifique su email.', email, verificationCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

app.post('/api/verify', async (req, res) => {
    const { email, code } = req.body;
    try {
        const result = await queryWithRetry('SELECT * FROM usuarios WHERE email = $1 AND "verificationCode" = $2', [email, code]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Código de verificación inválido.' });
        
        const user = result.rows[0];
        await queryWithRetry('UPDATE usuarios SET "isVerified" = true, "verificationCode" = NULL WHERE id = $1', [user.id]);
        
        const { password, ...userWithoutPassword } = user;
        res.status(200).json({ ...userWithoutPassword, isVerified: true });
    } catch (err) {
        res.status(500).json({ error: 'Error al verificar el código.' });
    }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await queryWithRetry('SELECT * FROM usuarios WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    
    const user = result.rows[0];
    if (!user.isVerified) return res.status(403).json({ error: 'La cuenta no ha sido verificada.' });

    const { password: userPassword, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor.' });
  }
});

app.post('/api/comercios', async (req, res) => {
    const newComercio = { id: `co-${uuidv4()}`, ...req.body };
    try {
        await queryWithRetry('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", opiniones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)',
            [newComercio.id, newComercio.nombre, newComercio.imagenUrl, newComercio.rubroId, newComercio.subRubroId, newComercio.provinciaId, newComercio.provinciaNombre, newComercio.ciudadId, newComercio.ciudadNombre, newComercio.barrio, newComercio.usuarioId, newComercio.whatsapp, newComercio.direccion, newComercio.googleMapsUrl, newComercio.websiteUrl, newComercio.description, JSON.stringify(newComercio.galeriaImagenes || []), newComercio.publicidad, newComercio.renovacionAutomatica, JSON.stringify(newComercio.opiniones || [])]
        );
        res.status(201).json(newComercio);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el comercio.' });
    }
});

app.put('/api/comercios/:id', async (req, res) => {
    const { id } = req.params;
    const updatedComercio = req.body;
    try {
        const result = await queryWithRetry('UPDATE comercios SET nombre = $1, "imagenUrl" = $2, "rubroId" = $3, "subRubroId" = $4, "provinciaId" = $5, "provinciaNombre" = $6, "ciudadId" = $7, "ciudadNombre" = $8, barrio = $9, whatsapp = $10, direccion = $11, "googleMapsUrl" = $12, "websiteUrl" = $13, description = $14, "galeriaImagenes" = $15, "renovacionAutomatica" = $16 WHERE id = $17 RETURNING *',
            [updatedComercio.nombre, updatedComercio.imagenUrl, updatedComercio.rubroId, updatedComercio.subRubroId, updatedComercio.provinciaId, updatedComercio.provinciaNombre, updatedComercio.ciudadId, updatedComercio.ciudadNombre, updatedComercio.barrio, updatedComercio.whatsapp, updatedComercio.direccion, updatedComercio.googleMapsUrl, updatedComercio.websiteUrl, updatedComercio.description, JSON.stringify(updatedComercio.galeriaImagenes || []), updatedComercio.renovacionAutomatica, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Comercio no encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el comercio.' });
    }
});

app.delete('/api/comercios/:id', async (req, res) => {
    try {
        await queryWithRetry('DELETE FROM comercios WHERE id = $1', [req.params.id]);
        res.status(204).send();
    } catch(err) {
        res.status(500).json({ error: 'Error al eliminar el comercio.' });
    }
});

app.post('/api/comercios/:id/opinar', async (req, res) => {
    const { id } = req.params;
    const { usuarioId, usuarioNombre, rating, texto } = req.body;
    const newOpinion = { id: `op-${uuidv4()}`, usuarioId, usuarioNombre, rating, texto, timestamp: new Date().toISOString() };
    try {
        const result = await queryWithRetry('UPDATE comercios SET opiniones = opiniones || $1::jsonb WHERE id = $2 RETURNING *', [JSON.stringify(newOpinion), id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Comercio no encontrado.' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error al agregar la opinión.' });
    }
});

app.post('/api/reset-data', async (req, res) => {
  try {
    await queryWithRetry('TRUNCATE TABLE usuarios, comercios, banners, pagos, public_usuarios, analytics_events, conversations, messages CASCADE');
    await populateDbIfNeeded();
    res.json({ message: 'Datos restaurados con éxito.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al restaurar los datos.' });
  }
});

// --- RUTA CATCH-ALL ---
// Esta debe ser la última ruta. Sirve el index.html principal para cualquier
// petición que no sea de la API. Es crucial para que el enrutador de React funcione.
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const startServer = async () => {
    try {
        await connectWithRetry();
        await initializeDb();
        await populateDbIfNeeded();
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error("No se pudo iniciar el servidor debido a un error de base de datos.", err);
        process.exit(1);
    }
};

startServer();