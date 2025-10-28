// server.js
console.log('--- EJECUTANDO VERSIÓN CORRECTA DEL SERVIDOR (con mensaje de control) ---');

const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
// SOLUCIÓN DEFINITIVA: Usar path.join para asegurar que siempre se cargue desde el directorio actual.
const { initialData } = require(path.join(__dirname, 'mockData.js'));

// SOLUCIÓN DEFINITIVA: Función interna para generar IDs, eliminando la dependencia 'uuid'.
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const app = express();
const PORT = 3001;

// --- CONFIGURACIÓN ---
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// --- MANEJADOR DE ERRORES DE SINTAXIS JSON ---
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('Petición con JSON malformado:', err.message);
    return res.status(400).json({ error: 'La petición contiene un JSON malformado.' });
  }
  next(err);
});

// --- CONEXIÓN A LA BASE DE DATOS ---
// SOLUCIÓN DEFINITIVA: Usar path.resolve para crear una ruta absoluta al archivo de la DB.
// Esto asegura que siempre se use el archivo correcto, sin importar desde dónde se ejecute el script.
const dbPath = path.resolve(__dirname, "guia_comercial.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error al conectar con la DB:", err.message);
    process.exit(1);
  } else {
    console.log("Conectado a la base de datos SQLite en", dbPath);
    initializeDatabase();
  }
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

// --- FUNCIÓN PARA CREAR LAS TABLAS ---
const initializeDatabase = async () => {
    try {
        // SOLUCIÓN: Eliminar las tablas al iniciar para forzar la actualización del esquema.
        console.log("Limpiando base de datos antigua para actualizar esquema...");
        await dbRun("DROP TABLE IF EXISTS provincias");
        await dbRun("DROP TABLE IF EXISTS ciudades");
        await dbRun("DROP TABLE IF EXISTS rubros");
        await dbRun("DROP TABLE IF EXISTS usuarios");
        await dbRun("DROP TABLE IF EXISTS comercios");
        console.log("Esquema limpio. Creando tablas nuevas...");
        
        // Volver a crear las tablas con el esquema correcto.
        await dbRun("CREATE TABLE IF NOT EXISTS provincias (id TEXT PRIMARY KEY, nombre TEXT NOT NULL)");
        await dbRun("CREATE TABLE IF NOT EXISTS ciudades (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, provinciaId TEXT NOT NULL)");
        await dbRun("CREATE TABLE IF NOT EXISTS rubros (id TEXT PRIMARY KEY, nombre TEXT NOT NULL, icon TEXT)");
        await dbRun(`CREATE TABLE IF NOT EXISTS usuarios (
            id TEXT PRIMARY KEY, 
            nombre TEXT NOT NULL, 
            email TEXT UNIQUE, 
            password TEXT NOT NULL, 
            telefono TEXT,
            isVerified INTEGER DEFAULT 0,
            verificationCode TEXT
        )`);
        await dbRun(`CREATE TABLE IF NOT EXISTS comercios (
            id TEXT PRIMARY KEY, nombre TEXT NOT NULL, imagenUrl TEXT, rubroId TEXT, provinciaId TEXT, provinciaNombre TEXT, ciudadId TEXT, ciudadNombre TEXT,
            usuarioId TEXT NOT NULL, whatsapp TEXT NOT NULL, direccion TEXT, googleMapsUrl TEXT, websiteUrl TEXT, description TEXT
        )`);
         console.log("Tablas creadas con éxito.");
    } catch (err) {
        console.error("Error fatal inicializando la DB:", err.message);
        process.exit(1);
    }
};

// --- FUNCIÓN PARA POBLAR LA BASE DE DATOS ---
const populateDatabase = async () => {
    try {
        console.log("Poblando la base de datos con datos iniciales...");
        const { provincias, ciudades, rubros, usuarios, comercios } = initialData;
        for (const p of provincias) await dbRun("INSERT OR IGNORE INTO provincias (id, nombre) VALUES (?, ?)", [p.id, p.nombre]);
        for (const c of ciudades) await dbRun("INSERT OR IGNORE INTO ciudades (id, nombre, provinciaId) VALUES (?, ?, ?)", [c.id, c.nombre, c.provinciaId]);
        for (const r of rubros) await dbRun("INSERT OR IGNORE INTO rubros (id, nombre, icon) VALUES (?, ?, ?)", [r.id, r.nombre, r.icon]);
        // Marcar todos los usuarios de prueba como verificados
        for (const u of usuarios) await dbRun("INSERT OR IGNORE INTO usuarios (id, nombre, email, password, telefono, isVerified) VALUES (?, ?, ?, ?, ?, 1)", [u.id, u.nombre, u.email, u.password, u.telefono || null]);
        for (const c of comercios) {
          await dbRun("INSERT OR IGNORE INTO comercios (id, nombre, imagenUrl, rubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, usuarioId, whatsapp, direccion, googleMapsUrl, websiteUrl, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [c.id, c.nombre, c.imagenUrl, c.rubroId, c.provinciaId, c.provinciaNombre, c.ciudadId, c.ciudadNombre, c.usuarioId, c.whatsapp, c.direccion, c.googleMapsUrl, c.websiteUrl, c.description]);
        }
    } catch (err) {
        console.error("Error poblando la DB:", err.message);
        throw err;
    }
};

// --- RUTAS DE LA API ---

app.get("/data", async (req, res) => {
    try {
        const check = await dbGet("SELECT COUNT(*) as count FROM provincias");
        if (check.count === 0) {
            await populateDatabase();
        }
        const [provincias, ciudades, rubros, usuarios, comercios] = await Promise.all([
            dbAll("SELECT * FROM provincias ORDER BY nombre"), dbAll("SELECT * FROM ciudades"),
            dbAll("SELECT * FROM rubros ORDER BY nombre"), dbAll("SELECT id, nombre, email, telefono FROM usuarios"),
            dbAll("SELECT * FROM comercios"),
        ]);
        res.json({ provincias, ciudades, rubros, usuarios, comercios, banners: initialData.banners, pagos: initialData.pagos });
    } catch (err) {
        console.error('ERROR EN GET /data:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.post("/register", async (req, res) => {
    console.log('\n[REGISTRO] Petición de registro recibida.');
    try {
        const { nombre, email, password, telefono } = req.body;
        console.log('[REGISTRO] Datos recibidos:', { nombre, email: email, telefono: telefono });

        if (!nombre || !email || !password) {
            console.log('[REGISTRO] Error de validación: Faltan campos requeridos.');
            return res.status(400).json({ error: "Nombre, email y contraseña son requeridos." });
        }
        
        console.log('[REGISTRO] Verificando si el email ya existe en la base de datos...');
        const existingUser = await dbGet("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (existingUser) {
            console.log(`[REGISTRO] Error: El email '${email}' ya está registrado.`);
            return res.status(409).json({ error: "El email ya está registrado." });
        }
        console.log('[REGISTRO] Email disponible. Generando datos para el nuevo usuario...');

        const newUserId = generateId();
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[REGISTRO] ID de Usuario: ${newUserId}, Código de Verificación: ${verificationCode}`);

        console.log('[REGISTRO] Intentando guardar el nuevo usuario en la base de datos...');
        
        await dbRun("INSERT INTO usuarios (id, nombre, email, password, telefono, verificationCode) VALUES (?, ?, ?, ?, ?, ?)", 
            [newUserId, nombre, email, password, telefono || null, verificationCode]);
        console.log('[REGISTRO] Usuario guardado en la base de datos con éxito.');
        
        // Este es el log que debe aparecer en la consola para la verificación.
        console.log(`\n\n--- CÓDIGO DE VERIFICACIÓN PARA ${email}: ${verificationCode} ---\n\n`);
        
        console.log('[REGISTRO] Enviando respuesta de éxito (201) al cliente.');
        res.status(201).json({ message: 'Registro exitoso. Se requiere verificación.', email: email });

    } catch (err) {
        console.error('[REGISTRO] ¡ERROR FATAL DENTRO DEL BLOQUE TRY-CATCH!:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.post("/verify", async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: "Email y código son requeridos." });

        const user = await dbGet("SELECT * FROM usuarios WHERE email = ?", [email]);

        if (!user) return res.status(404).json({ error: "Usuario no encontrado." });
        if (user.isVerified) return res.status(400).json({ error: "Esta cuenta ya ha sido verificada." });
        if (user.verificationCode !== code) return res.status(400).json({ error: "El código de verificación es incorrecto." });

        await dbRun("UPDATE usuarios SET isVerified = 1, verificationCode = NULL WHERE id = ?", [user.id]);
        
        const { password: _, ...verifiedUser } = user;
        res.status(200).json({ ...verifiedUser, isVerified: true });

    } catch (err) {
        console.error('ERROR EN POST /verify:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});


app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email y contraseña son requeridos." });
        
        const user = await dbGet("SELECT * FROM usuarios WHERE email = ?", [email]);
        if (!user || user.password !== password) return res.status(401).json({ error: "Credenciales inválidas." });

        if (!user.isVerified) {
            console.log(`Intento de login de usuario no verificado: ${email}`);
            return res.status(403).json({ error: "Tu cuenta no ha sido verificada. Por favor, completá el registro con el código que te enviamos." });
        }

        const { password: _, verificationCode: __, ...userToReturn } = user;
        res.status(200).json(userToReturn);
    } catch (err) {
        console.error('ERROR EN POST /login:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.put("/usuarios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, telefono } = req.body;
        if (!nombre) return res.status(400).json({ error: "El nombre es requerido." });

        await dbRun("UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?", [nombre, telefono || null, id]);
        const updatedUser = await dbGet("SELECT id, nombre, email, telefono FROM usuarios WHERE id = ?", [id]);
        if (!updatedUser) return res.status(404).json({ error: "Usuario no encontrado." });
        res.status(200).json(updatedUser);
    } catch (err) {
        console.error(`ERROR EN PUT /usuarios/${req.params.id}:`, err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.post("/comercios", async (req, res) => {
    try {
        const newComercioData = req.body;
        if (!newComercioData.usuarioId) return res.status(400).json({ error: "Falta el ID del usuario." });
        const newComercioId = generateId();
        const newComercio = { ...newComercioData, id: newComercioId };
        const params = [newComercio.id, newComercio.nombre, newComercio.imagenUrl, newComercio.rubroId, newComercio.provinciaId, newComercio.provinciaNombre, newComercio.ciudadId, newComercio.ciudadNombre, newComercio.usuarioId, newComercio.whatsapp, newComercio.direccion, newComercio.googleMapsUrl, newComercio.websiteUrl, newComercio.description];
        await dbRun("INSERT INTO comercios (id, nombre, imagenUrl, rubroId, provinciaId, provinciaNombre, ciudadId, ciudadNombre, usuarioId, whatsapp, direccion, googleMapsUrl, websiteUrl, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", params);
        const createdComercio = await dbGet("SELECT * FROM comercios WHERE id = ?", [newComercio.id]);
        res.status(201).json(createdComercio);
    } catch (err) {
        console.error('ERROR EN POST /comercios:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.put("/comercios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const params = [data.nombre, data.imagenUrl, data.rubroId, data.provinciaId, data.provinciaNombre, data.ciudadId, data.ciudadNombre, data.whatsapp, data.direccion, data.googleMapsUrl, data.websiteUrl, data.description, id];
        await dbRun("UPDATE comercios SET nombre = ?, imagenUrl = ?, rubroId = ?, provinciaId = ?, provinciaNombre = ?, ciudadId = ?, ciudadNombre = ?, whatsapp = ?, direccion = ?, googleMapsUrl = ?, websiteUrl = ?, description = ? WHERE id = ?", params);
        const updatedComercio = await dbGet("SELECT * FROM comercios WHERE id = ?", [id]);
        res.status(200).json(updatedComercio);
    } catch (err) {
        console.error(`ERROR EN PUT /comercios/${req.params.id}:`, err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.delete("/comercios/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await dbRun("DELETE FROM comercios WHERE id = ?", [id]);
        if (result.changes === 0) return res.status(404).json({ error: "Comercio no encontrado." });
        res.status(200).json({ message: "Comercio eliminado con éxito." });
    } catch (err) {
        console.error(`ERROR EN DELETE /comercios/${req.params.id}:`, err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

app.post("/reset-data", async (req, res) => {
    try {
        console.log("Recibida petición para resetear la base de datos.");
        await initializeDatabase(); // Limpia y recrea las tablas
        console.log("Tablas limpiadas. Repoblando...");
        await populateDatabase();
        res.status(200).json({ message: "Base de datos reseteada con éxito." });
    } catch(err) {
        console.error('ERROR EN POST /reset-data:', err.stack);
        res.status(500).json({ error: 'Error desconocido en el servidor.' });
    }
});

// --- MANEJADOR PARA RUTAS NO ENCONTRADAS (404) ---
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});


// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`Servidor completo activo en http://localhost:${PORT}`);
});