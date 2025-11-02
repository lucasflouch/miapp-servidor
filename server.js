// server.js
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { initialData } = require('./mockData.js');

const app = express();
// Usamos el puerto que nos asigne el proveedor de hosting (como Render), o 3001 para desarrollo local.
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors()); // Habilita CORS para que el frontend pueda hacer peticiones.
// Aumentamos el límite del payload para poder recibir imágenes en base64.
app.use(express.json({ limit: '10mb' })); 

// --- "Base de datos" en memoria ---
// Hacemos una copia profunda de los datos iniciales para poder modificarlos y resetearlos.
let db = JSON.parse(JSON.stringify(initialData));

// --- Endpoints de la API ---

// [GET] /api/data - Devuelve todos los datos de la "base de datos"
app.get('/api/data', (req, res) => {
    res.json(db);
});

// [POST] /api/reset-data - Restaura los datos al estado inicial
app.post('/api/reset-data', (req, res) => {
    console.log("Restaurando datos iniciales...");
    db = JSON.parse(JSON.stringify(initialData)); // Volvemos a copiar los datos originales
    res.status(200).json({ message: 'Datos restaurados con éxito.' });
});

// [POST] /api/register - Registra un nuevo usuario
app.post('/api/register', (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    if (!nombre || !email || !password) {
        return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios.' });
    }
    if (db.usuarios.some(u => u.email === email)) {
        return res.status(409).json({ error: 'El email ya está registrado.' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos
    
    const newUser = {
        id: uuidv4(),
        nombre,
        email,
        password, // IMPORTANTE: En una app real, la contraseña debe ser "hasheada" (ej: con bcrypt)
        telefono: telefono || null,
        isVerified: false,
        verificationCode,
    };
    db.usuarios.push(newUser);
    
    console.log(`Usuario registrado: ${email}, Código: ${verificationCode}`);

    // En la demo, no se envía un email real. Devolvemos el código para simular el proceso.
    res.status(201).json({
        message: 'Registro exitoso. Por favor, verifica tu cuenta.',
        email: newUser.email,
        verificationCode: newUser.verificationCode,
    });
});

// [POST] /api/verify - Verifica la cuenta de un usuario con el código
app.post('/api/verify', (req, res) => {
    const { email, code } = req.body;
    const user = db.usuarios.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    if (user.isVerified) {
        return res.status(400).json({ error: 'El usuario ya está verificado.' });
    }
    if (user.verificationCode !== code) {
        return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    }
    
    user.isVerified = true;
    delete user.verificationCode; // Limpiamos el código una vez usado
    
    // Devolvemos los datos del usuario sin la contraseña
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
});


// [POST] /api/login - Inicia sesión de un usuario
app.post('/api/login', (req, res) => {
    const { email, password: inputPassword } = req.body;
    const user = db.usuarios.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({ error: 'Email o contraseña incorrectos.' });
    }
    if (!user.isVerified) {
        return res.status(403).json({ error: 'Tu cuenta no ha sido verificada. Por favor, revisá tu email.' });
    }
    // IMPORTANTE: En una app real, se comparan contraseñas "hasheadas"
    if (user.password !== inputPassword) { 
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }
    
    // Devolvemos el usuario sin la contraseña
    const { password, ...userToReturn } = user;
    res.status(200).json(userToReturn);
});

// [PUT] /api/usuarios/:id - Actualiza los datos de un usuario
app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, telefono } = req.body;
    const userIndex = db.usuarios.findIndex(u => u.id === id);

    if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const updatedUser = {
        ...db.usuarios[userIndex],
        nombre: nombre || db.usuarios[userIndex].nombre,
        telefono: telefono !== undefined ? telefono : db.usuarios[userIndex].telefono,
    };
    db.usuarios[userIndex] = updatedUser;
    
    const { password, ...userToReturn } = updatedUser;
    res.status(200).json(userToReturn);
});


// [POST] /api/comercios - Crea un nuevo comercio
app.post('/api/comercios', (req, res) => {
    const newComercioData = req.body;
    if (!newComercioData.nombre || !newComercioData.usuarioId) {
        return res.status(400).json({ error: 'Faltan datos obligatorios para crear el comercio.' });
    }
    const newComercio = {
        id: `co-${uuidv4()}`, // Generamos un ID único
        ...newComercioData,
        // Por defecto, un comercio nuevo es de publicidad nivel 1 (gratis)
        publicidad: newComercioData.publicidad || 1, 
    };
    db.comercios.push(newComercio);
    res.status(201).json(newComercio);
});

// [PUT] /api/comercios/:id - Actualiza un comercio existente
app.put('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const comercioIndex = db.comercios.findIndex(c => c.id === id);

    if (comercioIndex === -1) {
        return res.status(404).json({ error: 'Comercio no encontrado.' });
    }

    // Fusionamos los datos antiguos con los nuevos
    db.comercios[comercioIndex] = {
        ...db.comercios[comercioIndex],
        ...updatedData
    };
    
    res.status(200).json(db.comercios[comercioIndex]);
});

// [DELETE] /api/comercios/:id - Elimina un comercio
app.delete('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = db.comercios.length;
    db.comercios = db.comercios.filter(c => c.id !== id);
    
    if (db.comercios.length === initialLength) {
        return res.status(404).json({ error: 'Comercio no encontrado para eliminar.' });
    }
    
    // Eliminamos también los banners y pagos asociados
    db.banners = db.banners.filter(b => b.comercioId !== id);
    db.pagos = db.pagos.filter(p => p.comercioId !== id);

    res.status(200).json({ message: 'Comercio eliminado con éxito.' });
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor de GuíaComercial escuchando en http://localhost:${PORT}`);
});
