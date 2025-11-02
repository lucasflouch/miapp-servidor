// server.js
const express = require('express');
const cors = require('cors');
const uuid = require('uuid');
const { getInitialData } = require('./mockData.js'); // Importamos la nueva función

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '10mb' })); 

// --- "Base de datos" en memoria ---
// Usamos la función para obtener una copia limpia al iniciar
let db = getInitialData();

// --- Mapa de precios de prueba ---
const AD_PRICES = {
    1: 0,
    2: 1500,
    3: 3000,
    4: 5000,
    5: 8000,
    6: 12000,
};

// --- Endpoints de la API ---

// [GET] /api/data - Devuelve todos los datos de la "base de datos"
app.get('/api/data', (req, res) => {
    res.json(db);
});

// [POST] /api/reset-data - Restaura los datos al estado inicial
app.post('/api/reset-data', (req, res) => {
    console.log("Restaurando datos iniciales...");
    // Volvemos a llamar a la función para garantizar una copia 100% nueva
    db = getInitialData(); 
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

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    const newUser = {
        id: uuid.v4(),
        nombre,
        email,
        password,
        telefono: telefono || null,
        isVerified: false,
        verificationCode,
    };
    db.usuarios.push(newUser);
    
    console.log(`Usuario registrado: ${email}, Código: ${verificationCode}`);

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
    delete user.verificationCode;
    
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
    if (user.password !== inputPassword) { 
        return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
    }
    
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

    const vencimiento = newComercioData.publicidad > 1
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    const newComercio = {
        id: `co-${uuid.v4()}`,
        ...newComercioData,
        publicidad: newComercioData.publicidad || 1,
        renovacionAutomatica: newComercioData.publicidad > 1 ? newComercioData.renovacionAutomatica : false,
        vencimientoPublicidad: vencimiento,
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

    db.comercios[comercioIndex] = {
        ...db.comercios[comercioIndex],
        ...updatedData
    };
    
    res.status(200).json(db.comercios[comercioIndex]);
});

// [POST] /api/comercios/:id/upgrade - Simula el pago y la mejora de un plan
app.post('/api/comercios/:id/upgrade', (req, res) => {
    const { id } = req.params;
    const { newLevel } = req.body;
    const comercioIndex = db.comercios.findIndex(c => c.id === id);

    if (comercioIndex === -1) {
        return res.status(404).json({ error: 'Comercio no encontrado.' });
    }
    if (!newLevel || !AD_PRICES.hasOwnProperty(newLevel)) {
        return res.status(400).json({ error: 'Nivel de publicidad inválido.' });
    }

    db.comercios[comercioIndex].publicidad = newLevel;
    db.comercios[comercioIndex].vencimientoPublicidad = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const newPago = {
        id: `pay-${uuid.v4()}`,
        comercioId: id,
        monto: AD_PRICES[newLevel],
        fecha: new Date().toISOString(),
        mercadoPagoId: `mp-test-${Date.now()}`,
    };
    db.pagos.push(newPago);

    console.log(`Comercio ${id} mejorado a nivel ${newLevel}. Vence el ${db.comercios[comercioIndex].vencimientoPublicidad}`);

    res.status(200).json({
        updatedComercio: db.comercios[comercioIndex],
        newPago,
    });
});


// [DELETE] /api/comercios/:id - Elimina un comercio
app.delete('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = db.comercios.length;
    db.comercios = db.comercios.filter(c => c.id !== id);
    
    if (db.comercios.length === initialLength) {
        return res.status(404).json({ error: 'Comercio no encontrado para eliminar.' });
    }
    
    db.banners = db.banners.filter(b => b.comercioId !== id);
    db.pagos = db.pagos.filter(p => p.comercioId !== id);

    res.status(200).json({ message: 'Comercio eliminado con éxito.' });
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor de GuíaComercial escuchando en http://localhost:${PORT}`);
});