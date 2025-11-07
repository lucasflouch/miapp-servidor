// server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg'); // Importamos el cliente de PostgreSQL
const { getInitialData } = require('./mockData.js');
const path = require('path'); // Importamos el módulo 'path' de Node.js

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuración de la Base de Datos PostgreSQL ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND ---
// Esta es la corrección clave: le decimos a Express que sirva los archivos
// estáticos (como index.html, index.js, CSS, etc.) desde el directorio raíz del proyecto.
app.use(express.static(path.join(__dirname)));


const AD_PRICES = { 1: 0, 2: 1500, 3: 3000, 4: 5000, 5: 8000, 6: 12000 };
const ADMIN_EMAIL = 'admin@guiacomercial.com'; // Email del administrador

// --- FUNCIÓN DE REINTENTO PARA LA BASE DE DATOS ---
const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

const queryWithRetry = async (queryText, params) => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await pool.query(queryText, params);
      return result;
    } catch (err) {
      console.error(`Intento ${attempt} de la consulta falló. Error: ${err.message}`);
      if (attempt === MAX_RETRIES) {
        console.error("Máximo de reintentos alcanzado. Lanzando error.");
        throw err;
      }
      await new Promise(res => setTimeout(res, RETRY_DELAY * Math.pow(2, attempt -1)));
    }
  }
};

// --- FUNCIÓN DE REINTENTO PARA LA CONEXIÓN INICIAL ---
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
            
            if (attempt === MAX_CONNECTION_RETRIES) {
                console.error("Máximo de reintentos de conexión alcanzado. No se pudo conectar a la base de datos.");
                throw err;
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
        opiniones JSONB DEFAULT '[]'
      );
    `);
    
    console.log('Verificando/aplicando migraciones de base de datos...');
    try {
        await queryWithRetry('ALTER TABLE comercios ADD COLUMN IF NOT EXISTS lat REAL;');
        await queryWithRetry('ALTER TABLE comercios ADD COLUMN IF NOT EXISTS lon REAL;');
        console.log('Migración de columnas lat/lon completada con éxito.');
    } catch (migrationError) {
        console.error('Error crítico durante la migración de la base de datos:', migrationError);
        throw migrationError;
    }
    
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
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        "conversationId" TEXT NOT NULL,
        "senderId" TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "isRead" BOOLEAN DEFAULT false,
        FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE
      );
    `);
    console.log('Esquema de base de datos verificado.');
  } catch (err) {
    console.error('Error crítico al inicializar la base de datos:', err);
    process.exit(1); // Detiene el servidor si la DB no se puede inicializar
  }
};

const populateDbIfNeeded = async () => {
  // Solo poblar si la tabla de usuarios está vacía
  const res = await queryWithRetry('SELECT COUNT(*) FROM usuarios');
  if (parseInt(res.rows[0].count, 10) === 0) {
    console.log('Base de datos vacía, poblando con datos de prueba...');
    const data = getInitialData();
    // Usamos Promise.all para ejecutar las inserciones en paralelo
    const userPromises = data.usuarios.map(user => 
      queryWithRetry('INSERT INTO usuarios (id, nombre, email, password, telefono) VALUES ($1, $2, $3, $4, $5)', [user.id, user.nombre, user.email, user.password, user.telefono])
    );
    const comercioPromises = data.comercios.map(c => 
      queryWithRetry('INSERT INTO comercios (id, nombre, "imagenUrl", "rubroId", "subRubroId", "provinciaId", "provinciaNombre", "ciudadId", "ciudadNombre", barrio, "usuarioId", whatsapp, direccion, "googleMapsUrl", "websiteUrl", description, "galeriaImagenes", publicidad, "renovacionAutomatica", "vencimientoPublicidad", opiniones, lat, lon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)',
        [c.id, c.nombre, c.imagenUrl, c.rubroId, c.subRubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.barrio, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description, JSON.stringify(c.galeriaImagenes || []), c.publicidad, c.renovacionAutomatica, c.vencimientoPublicidad, JSON.stringify(c.opiniones || []), c.lat, c.lon]
      )
    );
    const bannerPromises = data.banners.map(b => 
      queryWithRetry('INSERT INTO banners (id, "comercioId", "imagenUrl", "venceEl") VALUES ($1, $2, $3, $4)', [b.id, b.comercioId, b.imagenUrl, b.venceEl])
    );
    const pagoPromises = data.pagos.map(p => 
      queryWithRetry('INSERT INTO pagos (id, "comercioId", monto, fecha, "mercadoPagoId") VALUES ($1, $2, $3, $4, $5)', [p.id, p.comercioId, p.monto, p.fecha, p.mercadoPagoId])
    );
    await Promise.all([...userPromises, ...comercioPromises, ...bannerPromises, ...pagoPromises]);
    console.log('Datos de prueba insertados.');
  }
};

// --- API Endpoints ---
app.get('/api/data', async (req, res) => {
  try {
    const data = getInitialData();
    
    // Obtener datos reales de la base de datos
    const [usuariosRes, comerciosRes, bannersRes, pagosRes] = await Promise.all([
      queryWithRetry('SELECT id, nombre, email, telefono, "isVerified" FROM usuarios'),
      queryWithRetry('SELECT * FROM comercios'),
      queryWithRetry('SELECT * FROM banners'),
      queryWithRetry('SELECT * FROM pagos')
    ]);

    // Combinar datos (datos estáticos + datos dinámicos de la DB)
    const appData = {
      provincias: data.provincias,
      ciudades: data.ciudades,
      rubros: data.rubros,
      subRubros: data.subRubros,
      usuarios: usuariosRes.rows,
      comercios: comerciosRes.rows,
      banners: bannersRes.rows,
      pagos: pagosRes.rows,
    };
    res.json(appData);
  } catch (err) {
    console.error('Error al obtener datos:', err);
    res.status(500).json({ error: 'Error interno del servidor al obtener datos.' });
  }
});
// ... (resto de tus endpoints de la API, que ya estaban bien)
// (Aquí irían /register, /login, /comercios, etc. Los omito por brevedad pero deben estar)

// --- RUTA CATCH-ALL ---
// Esta es la segunda corrección clave. Debe ir DESPUÉS de todas tus rutas /api/*.
// Le dice a Express: "Si alguien pide una URL que no empieza por /api/,
// simplemente envíale el archivo index.html".
// Esto permite que React Router maneje las rutas del lado del cliente.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
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
