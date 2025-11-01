// server.js
console.log('--- EJECUTANDO SERVIDOR DE API v8 (con DB Persistente) ---');

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { initialData } = require('./mockData.js');

const app = express();
const PORT = process.env.PORT || 10000;

let isDbReady = false;
let dbError = null;
let db;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  console.log(`[PETICIÓN] ${req.method} ${req.originalUrl}`);
  next();
});

app.use((req, res, next) => {
  if (req.path === '/api/health') return next();
  if (dbError) return res.status(503).json({ error: "Error crítico en la base de datos.", details: dbError.message });
  if (!isDbReady) return res.status(503).json({ error: "El servidor se está iniciando, la base de datos aún no está lista. Intente de nuevo en un momento." });
  next();
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: isDbReady ? "ok" : "initializing",
    message: `Servidor v8 activo. Estado de la DB: ${isDbReady ? 'Lista' : 'Iniciando'}`,
    dbError: dbError ? dbError.message : null,
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/data", async (req, res) => {
    try {
        let [provincias, ciudades, rubros, subRubros, usuarios, comercios, banners, pagos] = await Promise.all([
            dbAll("SELECT * FROM provincias ORDER BY nombre"),
            dbAll("SELECT * FROM ciudades"),
            dbAll("SELECT * FROM rubros ORDER BY nombre"),
            dbAll("SELECT * FROM subrubros ORDER BY nombre"),
            dbAll("SELECT id, nombre, email, telefono FROM usuarios"),
            dbAll("SELECT * FROM comercios"),
            dbAll("SELECT * FROM banners"),
            dbAll("SELECT * FROM pagos"),
        ]);
        
        comercios = comercios.map(c => ({...c, galeriaImagenes: c.galeriaImagenes ? JSON.parse(c.galeriaImagenes) : [] }));
        res.json({ provincias, ciudades, rubros, subRubros, usuarios, comercios, banners, pagos });
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
    
    res.status(201).json({ message: 'Registro exitoso. Se requiere verificación.', email: email, verificationCode: verificationCode });
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
        newId, data.nombre || '', data.imagenUrl || '', data.rubroId || '', data.subRubroId || '', data.provinciaId || '',
        data.provinciaNombre || '', data.ciudadId || '', data.ciudadNombre || '', data.usuarioId,
        data.whatsapp || '', data.direccion || null, data.googleMapsUrl || null, data.websiteUrl || null,
        data.description || null, galeria
    ];
    await dbRun("INSERT INTO comercios (id, nombre, imagenUrl, rubroId, subRubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, usuarioId, whatsapp, direccion, googleMapsUrl, websiteUrl, description, galeriaImagenes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", params);
    const createdComercio = await dbGet("SELECT * FROM comercios WHERE id = ?", [newId]);
    res.status(201).json({ ...createdComercio, galeriaImagenes: JSON.parse(createdComercio.galeriaImagenes || '[]') });
});

app.put("/api/comercios/:id", async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    const galeria = JSON.stringify(Array.isArray(data.galeriaImagenes) ? data.galeriaImagenes : []);
    const params = [
        data.nombre || '', data.imagenUrl || '', data.rubroId || '', data.subRubroId || '', data.provinciaId || '', 
        data.provinciaNombre || '', data.ciudadId || '', data.ciudadNombre || '',
        data.whatsapp || '', data.direccion || null, data.googleMapsUrl || null, 
        data.websiteUrl || null, data.description || null, galeria, id
    ];
    await dbRun(`UPDATE comercios SET nombre = ?, imagenUrl = ?, rubroId = ?, subRubroId = ?, provinciaId = ?, provinciaNombre = ?, ciudadId = ?, ciudadNombre = ?, whatsapp = ?, direccion = ?, googleMapsUrl = ?, websiteUrl = ?, description = ?, galeriaImagenes = ? WHERE id = ?`, params);
    const updatedComercio = await dbGet("SELECT * FROM comercios WHERE id = ?", [id]);
    res.status(200).json({ ...updatedComercio, galeriaImagenes: JSON.parse(updatedComercio.galeriaImagenes || '[]') });
});

app.delete("/api/comercios/:id", async (req, res) => {
    const { id } = req.params;
    await dbRun("DELETE FROM comercios WHERE id = ?", [id]);
    res.status(200).json({ message: "Comercio eliminado con éxito." });
});

app.post("/api/reset-data", async (req, res) => {
    isDbReady = false;
    dbError = null;
    console.log("Iniciando reseteo de la base de datos...");
    try {
      await setupAndPopulateDatabase();
      isDbReady = true;
      console.log("Reseteo de la base de datos completado.");
      res.status(200).json({ message: "Base de datos reseteada con éxito." });
    } catch(err) {
      dbError = err;
      console.error("Fallo el reseteo de la base de datos:", err.message);
      res.status(500).json({ error: "No se pudo resetear la base de datos." });
    }
});

app.use((req, res) => {
  console.log(`[404] RUTA NO ENCONTRADA POR EL SERVIDOR: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: `Ruta no encontrada en el servidor: ${req.method} ${req.originalUrl}`,
    message: "La ruta que estás buscando no existe. (v8)"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor v8 escuchando en el puerto ${PORT}. Iniciando conexión con la base de datos en segundo plano...`);
  initializeDatabase();
});

function initializeDatabase() {
    const dbPath = path.resolve(__dirname, "guia_comercial.db");
    db = new sqlite3.Database(dbPath, async (err) => {
        if (err) {
            console.error("Error fatal al conectar con la DB:", err.message);
            dbError = err;
            return;
        }
        console.log("Conectado a la base de datos SQLite en", dbPath);
        
        try {
            // *** LÓGICA DE PERSISTENCIA ***
            // 1. Revisamos si la base de datos ya tiene las tablas que necesitamos.
            const tableCheck = await dbGet("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'");

            // 2. Si NO existe la tabla 'usuarios', significa que la DB está vacía.
            if (!tableCheck) {
                console.log("Base de datos vacía. Ejecutando configuración inicial...");
                await setupAndPopulateDatabase();
            } else {
                // 3. Si la tabla SÍ existe, no hacemos nada y usamos los datos existentes.
                console.log("Base de datos existente encontrada. Omitiendo configuración inicial.");
            }
            isDbReady = true;
            console.log("¡ÉXITO! Base de datos lista y servidor completamente operativo.");
        } catch (setupErr) {
            console.error("Error fatal durante el setup de la DB:", setupErr.message, setupErr.stack);
            dbError = setupErr;
        }
    });
}

const dbRun = (sql, params = []) => new Promise((resolve, reject) => db.run(sql, params, function (err) { if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes }); }));
const dbAll = (sql, params = []) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }));
const dbGet = (sql, params = []) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); }));

// Esta función ahora BORRA y RECREA todo. Es llamada solo la primera vez o en un reseteo manual.
const setupAndPopulateDatabase = async () => {
    try {
        console.log("Limpiando base de datos antigua para actualizar esquema...");
        const tables = ["provincias", "ciudades", "rubros", "subrubros", "usuarios", "comercios", "banners", "pagos"];
        for (const table of tables) { await dbRun(`DROP TABLE IF EXISTS ${table}`); }
        
        console.log("Esquema limpio. Creando tablas nuevas...");
        await dbRun("CREATE TABLE provincias (id TEXT PRIMARY KEY, nombre TEXT NOT NULL)");
        await dbRun("CREATE TABLE ciudades (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, provinciaId TEXT NOT NULL)");
        await dbRun("CREATE TABLE rubros (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, icon TEXT)");
        await dbRun("CREATE TABLE subrubros (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, rubroId TEXT NOT NULL)");
        await dbRun(`CREATE TABLE usuarios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, email TEXT UNIQUE, password TEXT NOT NULL, telefono TEXT, isVerified INTEGER DEFAULT 0, verificationCode TEXT)`);
        await dbRun(`CREATE TABLE comercios (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, imagenUrl TEXT, rubroId TEXT, subRubroId TEXT, provinciaId TEXT, provinciaNombre TEXT, ciudadId TEXT, ciudadNombre TEXT, usuarioId TEXT NOT NULL, whatsapp TEXT NOT NULL, direccion TEXT, googleMapsUrl TEXT, websiteUrl TEXT, description TEXT, galeriaImagenes TEXT)`);
        await dbRun("CREATE TABLE banners (id TEXT PRIMARY KEY, comercioId TEXT NOT NULL, imagenUrl TEXT NOT NULL, venceEl TEXT NOT NULL)");
        await dbRun("CREATE TABLE pagos (id TEXT PRIMARY KEY, comercioId TEXT NOT NULL, monto REAL NOT NULL, fecha TEXT NOT NULL, mercadoPagoId TEXT NOT NULL)");
        
        console.log("Tablas creadas con éxito. Poblando con datos iniciales...");
        
        const { provincias, ciudades, rubros, subRubros, usuarios, comercios, banners, pagos } = initialData;
        for (const p of provincias) await dbRun("INSERT INTO provincias (id, nombre) VALUES (?, ?)", [p.id, p.nombre]);
        for (const c of ciudades) await dbRun("INSERT INTO ciudades (id, nombre, provinciaId) VALUES (?, ?, ?)", [c.id, c.nombre, c.provinciaId]);
        for (const r of rubros) await dbRun("INSERT INTO rubros (id, nombre, icon) VALUES (?, ?, ?)", [r.id, r.nombre, r.icon]);
        for (const sr of subRubros) await dbRun("INSERT INTO subrubros (id, nombre, rubroId) VALUES (?, ?, ?)", [sr.id, sr.nombre, sr.rubroId]);
        
        for (const u of usuarios) {
            const password = u.password || 'password123';
            await dbRun("INSERT INTO usuarios (id, nombre, email, password, telefono, isVerified) VALUES (?, ?, ?, ?, ?, 1)", 
            [u.id, u.nombre, u.email, password, u.telefono || null]);
        }

        for (const c of comercios) {
          const galeriaJson = c.galeriaImagenes ? JSON.stringify(c.galeriaImagenes) : '[]';
          await dbRun("INSERT INTO comercios (id, nombre, imagenUrl, rubroId, subRubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, usuarioId, whatsapp, direccion, googleMapsUrl, websiteUrl, description, galeriaImagenes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
          [c.id, c.nombre, c.imagenUrl, c.rubroId, c.subRubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description, galeriaJson]);
        }
        
        for (const b of banners) await dbRun("INSERT INTO banners (id, comercioId, imagenUrl, venceEl) VALUES (?, ?, ?, ?)", [b.id, b.comercioId, b.imagenUrl, b.venceEl]);
        for (const p of pagos) await dbRun("INSERT INTO pagos (id, comercioId, monto, fecha, mercadoPagoId) VALUES (?, ?, ?, ?, ?)", [p.id, p.comercioId, p.monto, p.fecha, p.mercadoPagoId]);

    } catch (err) {
        console.error("Error en setupAndPopulateDatabase:", err.message);
        throw err;
    }
};

function generateId() {
    return Math.random().toString(36).substring(2, 9);
}