// server.js
console.log('--- EJECUTANDO SERVIDOR DE API ---');

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { initialData } = require('./mockData.js');

const app = express();
const PORT = process.env.PORT || 3001;

// --- MIDDLEWARE DE LOGGING ---
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Petición recibida: ${req.method} ${req.originalUrl}`);
  next();
});

// --- CONFIGURACIÓN MIDDLEWARE ---
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

// --- CONEXIÓN A LA BASE DE DATOS ---
const dbPath = path.resolve(__dirname, "guia_comercial.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error fatal al conectar con la DB:", err.message);
    process.exit(1);
  }
  console.log("Conectado a la base de datos SQLite en", dbPath);
  
  // Iniciar servidor solo después de que la DB esté lista.
  setupDatabaseAndData()
    .then(() => {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`Servidor de API activo y accesible públicamente en el puerto ${PORT}`);
      });
    })
    .catch(error => {
      console.error("No se pudo iniciar el servidor por un error en la base de datos.", error);
      process.exit(1);
    });
});

// --- HELPERS DE BASE DE DATOS PROMISIFICADOS ---
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
    });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

// --- FUNCIÓN PARA CREAR Y POBLAR LA DB ---
const setupDatabaseAndData = async () => {
    try {
        await dbRun("DROP TABLE IF EXISTS provincias");
        await dbRun("DROP TABLE IF EXISTS ciudades");
        await dbRun("DROP TABLE IF EXISTS rubros");
        await dbRun("DROP TABLE IF EXISTS usuarios");
        await dbRun("DROP TABLE IF EXISTS comercios");
        
        await dbRun("CREATE TABLE IF NOT EXISTS provincias (id TEXT PRIMARY KEY, nombre TEXT NOT NULL)");
        await dbRun("CREATE TABLE IF NOT EXISTS ciudades (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, provinciaId TEXT NOT NULL)");
        await dbRun("CREATE TABLE IF NOT EXISTS rubros (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, icon TEXT)");
        await dbRun(`CREATE TABLE IF NOT EXISTS usuarios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT UNIQUE, password TEXT NOT NULL, telefono TEXT, isVerified INTEGER DEFAULT 0, verificationCode TEXT)`);
        await dbRun(`CREATE TABLE IF NOT EXISTS comercios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, imagenUrl TEXT, rubroId TEXT, provinciaId TEXT, provinciaNombre TEXT, ciudadId TEXT, ciudadNombre TEXT, usuarioId TEXT NOT NULL, whatsapp TEXT NOT NULL, direccion TEXT, googleMapsUrl TEXT, websiteUrl TEXT, description TEXT, galeriaImagenes TEXT)`);
        
        console.log("Tablas creadas con éxito.");
        
        const { provincias, ciudades, rubros, usuarios, comercios } = initialData;
        for (const p of provincias) await dbRun("INSERT OR IGNORE INTO provincias (id, nombre) VALUES (?, ?)", [p.id, p.nombre]);
        for (const c of ciudades) await dbRun("INSERT OR IGNORE INTO ciudades (id, nombre, provinciaId) VALUES (?, ?, ?)", [c.id, c.nombre, c.provinciaId]);
        for (const r of rubros) await dbRun("INSERT OR IGNORE INTO rubros (id, nombre, icon) VALUES (?, ?, ?)", [r.id, r.nombre, r.icon]);
        for (const u of usuarios) await dbRun("INSERT OR IGNORE INTO usuarios (id, nombre, email, password, telefono, isVerified) VALUES (?, ?, ?, ?, ?, 1)", [u.id, u.nombre, u.email, u.password, u.telefono || null]);
        for (const c of comercios) {
          const galeriaJson = c.galeriaImagenes ? JSON.stringify(c.galeriaImagenes) : '[]';
          await dbRun("INSERT OR IGNORE INTO comercios (id, nombre, imagenUrl, rubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, usuarioId, whatsapp, direccion, googleMapsUrl, websiteUrl, description, galeriaImagenes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
          [c.id, c.nombre, c.imagenUrl, c.rubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description, galeriaJson]);
        }
        console.log("Base de datos lista para recibir conexiones.");
    } catch (err) {
        console.error("Error fatal durante el setup de la DB:", err.message);
        throw err;
    }
};

// --- RUTAS DE LA API ---

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Servidor activo y saludable! v2", // Mensaje actualizado para confirmar el despliegue
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/data", async (req, res) => {
    try {
        let [provincias, ciudades, rubros, usuarios, comercios] = await Promise.all([
            dbAll("SELECT * FROM provincias ORDER BY nombre"),
            dbAll("SELECT * FROM ciudades"),
            dbAll("SELECT * FROM rubros ORDER BY nombre"),
            dbAll("SELECT id, nombre, email, telefono FROM usuarios"),
            dbAll("SELECT * FROM comercios"),
        ]);
        
        comercios = comercios.map(c => ({...c, galeriaImagenes: c.galeriaImagenes ? JSON.parse(c.galeriaImagenes) : [] }));
        res.json({ provincias, ciudades, rubros, usuarios, comercios, banners: initialData.banners, pagos: initialData.pagos });
    } catch (err) {
        console.error('ERROR EN GET /api/data:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.post("/api/register", async (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password) return res.status(400).json({ error: "Nombre, email y contraseña son requeridos." });
    
    const existingUser = await dbGet("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (existingUser) return res.status(409).json({ error: "El email ya está registrado." });

    const newUserId = generateId();
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`--- CÓDIGO DE VERIFICACIÓN PARA ${email}: ${verificationCode} ---`);
    
    await dbRun("INSERT INTO usuarios (id, nombre, email, password, telefono, verificationCode) VALUES (?, ?, ?, ?, ?, ?)", 
        [newUserId, nombre, email, password, telefono || null, verificationCode]);
    
    res.status(201).json({ message: 'Registro exitoso. Se requiere verificación.', email: email });
});

app.post("/api/verify", async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: "Email y código son requeridos." });

    const user = await dbGet("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
    if (user.isVerified) return res.status(400).json({ error: "Esta cuenta ya ha sido verificada." });
    if (user.verificationCode !== code) return res.status(400).json({ error: "El código de verificación es incorrecto." });

    await dbRun("UPDATE usuarios SET isVerified = 1, verificationCode = NULL WHERE id = ?", [user.id]);
    const { password: _, ...verifiedUser } = user;
    res.status(200).json({ ...verifiedUser, isVerified: true });
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email y contraseña son requeridos." });
    
    const user = await dbGet("SELECT * FROM usuarios WHERE email = ?", [email]);
    if (!user || user.password !== password) return res.status(401).json({ error: "Credenciales inválidas." });
    if (!user.isVerified) return res.status(403).json({ error: "Tu cuenta no ha sido verificada." });

    const { password: _, verificationCode: __, ...userToReturn } = user;
    res.status(200).json(userToReturn);
});

app.put("/api/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    const { nombre, telefono } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es requerido." });

    await dbRun("UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?", [nombre, telefono || null, id]);
    const updatedUser = await dbGet("SELECT id, nombre, email, telefono FROM usuarios WHERE id = ?", [id]);
    res.status(200).json(updatedUser);
});

app.post("/api/comercios", async (req, res) => {
    const data = req.body;
    const newId = generateId();
    const galeria = JSON.stringify(Array.isArray(data.galeriaImagenes) ? data.galeriaImagenes : []);
    const params = [
        newId, data.nombre || '', data.imagenUrl || '', data.rubroId || '', data.provinciaId || '',
        data.provinciaNombre || '', data.ciudadId || '', data.ciudadNombre || '', data.usuarioId,
        data.whatsapp || '', data.direccion || null, data.googleMapsUrl || null, data.websiteUrl || null,
        data.description || null, galeria
    ];
    await dbRun("INSERT INTO comercios (id, nombre, imagenUrl, rubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, usuarioId, whatsapp, direccion, googleMapsUrl, websiteUrl, description, galeriaImagenes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", params);
    const createdComercio = await dbGet("SELECT * FROM comercios WHERE id = ?", [newId]);
    res.status(201).json({ ...createdComercio, galeriaImagenes: JSON.parse(createdComercio.galeriaImagenes || '[]') });
});

app.put("/api/comercios/:id", async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const galeria = JSON.stringify(Array.isArray(data.galeriaImagenes) ? data.galeriaImagenes : []);
    const params = [
        data.nombre || '', data.imagenUrl || '', data.rubroId || '', data.provinciaId || '', 
        data.provinciaNombre || '', data.ciudadId || '', data.ciudadNombre || '',
        data.whatsapp || '', data.direccion || null, data.googleMapsUrl || null, 
        data.websiteUrl || null, data.description || null, galeria, id
    ];
    await dbRun(`UPDATE comercios SET nombre = ?, imagenUrl = ?, rubroId = ?, provinciaId = ?, provinciaNombre = ?, ciudadId = ?, ciudadNombre = ?, whatsapp = ?, direccion = ?, googleMapsUrl = ?, websiteUrl = ?, description = ?, galeriaImagenes = ? WHERE id = ?`, params);
    const updatedComercio = await dbGet("SELECT * FROM comercios WHERE id = ?", [id]);
    res.status(200).json({ ...updatedComercio, galeriaImagenes: JSON.parse(updatedComercio.galeriaImagenes || '[]') });
});

app.delete("/api/comercios/:id", async (req, res) => {
    const { id } = req.params;
    await dbRun("DELETE FROM comercios WHERE id = ?", [id]);
    res.status(200).json({ message: "Comercio eliminado con éxito." });
});

app.post("/api/reset-data", async (req, res) => {
    await setupDatabaseAndData();
    res.status(200).json({ message: "Base de datos reseteada con éxito." });
});

// --- MANEJADOR 404 PERSONALIZADO (IMPORTANTE: VA AL FINAL) ---
app.use((req, res) => {
  console.log(`[404] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    message: "La ruta que estás buscando no existe en este servidor. (v2)"
  });
});

// --- FUNCIÓN UTILITARIA ---
function generateId() {
    return Math.random().toString(36).substring(2, 9);
}
