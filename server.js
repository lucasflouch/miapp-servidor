// server.js
const express = require('express');
const cors = require('cors');
const path =require('path');
const { v4: uuidv4 } = require('uuid');
const { getInitialData } = require('./data.js');

const app = express();
const PORT = process.env.PORT || 3001;

// --- IN-MEMORY DATABASE ---
let db = getInitialData();

const AD_PRICES = { 1: 0, 2: 1500, 3: 3000, 4: 5000, 5: 8000, 6: 12000 };
const ADMIN_EMAIL = 'admin@guiacomercial.com';

// --- MIDDLEWARES ---
// Se aplican antes para todas las rutas
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Aumentado el límite para las imágenes en base64


// --- API ENDPOINTS ---
// Todas las rutas de la API se definen ANTES de servir los archivos estáticos.

// GET /api/data - Obtener todos los datos
app.get('/api/data', (req, res) => {
  res.json(db);
});

// POST /api/register - Registrar un nuevo usuario (comerciante)
app.post('/api/register', (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    if (db.usuarios.some(u => u.email === email)) {
        return res.status(409).json({ error: 'El email ya está registrado.' });
    }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = { id: `u${db.usuarios.length + 1}`, nombre, email, password, telefono, isVerified: false, verificationCode };
    db.usuarios.push(newUser);
    res.status(201).json({ message: 'Registro exitoso. Por favor, verifica tu cuenta.', email: newUser.email, verificationCode: newUser.verificationCode });
});

// POST /api/verify - Verificar código de email
app.post('/api/verify', (req, res) => {
    const { email, code } = req.body;
    const user = db.usuarios.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    if (user.verificationCode !== code) {
        return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    }
    user.isVerified = true;
    delete user.verificationCode;
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
});

// POST /api/login - Iniciar sesión de comerciante
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.usuarios.find(u => u.email === email);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    if (user.password !== password) {
        return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }
    if (!user.isVerified) {
        // En un caso real, se podría reenviar el código de verificación.
        // Aquí simplemente bloqueamos el login.
        // return res.status(403).json({ error: 'Tu cuenta no ha sido verificada.' });
    }
    const { password: userPassword, ...userToReturn } = user;
    res.json(userToReturn);
});

// PUT /api/usuarios/:userId - Actualizar datos de usuario
app.put('/api/usuarios/:userId', (req, res) => {
    const { userId } = req.params;
    const { nombre, telefono } = req.body;
    const userIndex = db.usuarios.findIndex(u => u.id === userId);
    if (userIndex === -1) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    db.usuarios[userIndex] = { ...db.usuarios[userIndex], nombre, telefono };
    const { password, ...updatedUser } = db.usuarios[userIndex];
    res.json(updatedUser);
});


// POST /api/public-register - Registrar usuario público
app.post('/api/public-register', (req, res) => {
    const { nombre, apellido, email, password, whatsapp } = req.body;
    // Simulación: asumimos que no hay publicUsers en la DB inicial.
    // En una DB real, habría una tabla separada.
    if (!db.publicUsers) db.publicUsers = [];
    if (db.publicUsers.some(u => u.email === email)) {
        return res.status(409).json({ error: 'El email ya está registrado.' });
    }
    const newPublicUser = {
        id: `pub-${uuidv4()}`,
        nombre,
        apellido,
        email,
        password,
        whatsapp,
        favorites: [],
        history: [],
    };
    db.publicUsers.push(newPublicUser);
    const { password: userPassword, ...userToReturn } = newPublicUser;
    res.status(201).json(userToReturn);
});

// POST /api/public-login - Login usuario público
app.post('/api/public-login', (req, res) => {
    const { email, password } = req.body;
    if (!db.publicUsers) db.publicUsers = [];
    const user = db.publicUsers.find(u => u.email === email);
    if (!user || user.password !== password) {
        return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }
    const { password: userPassword, ...userToReturn } = user;
    res.json(userToReturn);
});

// PUT /api/public-users/:id - Actualizar usuario público (favoritos, historial)
app.put('/api/public-users/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    if (!db.publicUsers) db.publicUsers = [];
    const userIndex = db.publicUsers.findIndex(u => u.id === id);

    if (userIndex === -1) {
        // Si el usuario no existe (ej. usuario de Google simulado), lo creamos.
        db.publicUsers.push(updatedData);
        res.json(updatedData);
    } else {
        db.publicUsers[userIndex] = { ...db.publicUsers[userIndex], ...updatedData };
        res.json(db.publicUsers[userIndex]);
    }
});


// POST /api/comercios - Crear un nuevo comercio
app.post('/api/comercios', (req, res) => {
    const newComercioData = req.body;
    const newComercio = {
        ...newComercioData,
        id: `co${db.comercios.length + 10}`,
        vencimientoPublicidad: newComercioData.publicidad > 1 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : undefined,
    };
    db.comercios.push(newComercio);
    res.status(201).json(newComercio);
});

// PUT /api/comercios/:id - Actualizar un comercio
app.put('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const comercioIndex = db.comercios.findIndex(c => c.id === id);
    if (comercioIndex === -1) {
        return res.status(404).json({ error: 'Comercio no encontrado.' });
    }
    db.comercios[comercioIndex] = { ...db.comercios[comercioIndex], ...updatedData };
    res.json(db.comercios[comercioIndex]);
});

// DELETE /api/comercios/:id - Eliminar un comercio
app.delete('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = db.comercios.length;
    db.comercios = db.comercios.filter(c => c.id !== id);
    if (db.comercios.length === initialLength) {
        return res.status(404).json({ error: 'Comercio no encontrado.' });
    }
    res.json({ message: 'Comercio eliminado con éxito.' });
});

// POST /api/comercios/:comercioId/opinar
app.post('/api/comercios/:comercioId/opinar', (req, res) => {
    const { comercioId } = req.params;
    const opinionData = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    
    const newOpinion = {
        ...opinionData,
        id: `op-${uuidv4()}`,
        timestamp: new Date().toISOString(),
        likes: []
    };
    comercio.opiniones.push(newOpinion);
    res.status(201).json(comercio);
});

// POST /api/comercios/:comercioId/opiniones/:opinionId/responder
app.post('/api/comercios/:comercioId/opiniones/:opinionId/responder', (req, res) => {
    const { comercioId, opinionId } = req.params;
    const { texto } = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    const opinion = comercio.opiniones.find(o => o.id === opinionId);
    if (!opinion) return res.status(404).json({ error: 'Opinión no encontrada.' });
    
    opinion.respuesta = { texto, timestamp: new Date().toISOString() };
    res.json(comercio);
});

// POST /api/comercios/:comercioId/opiniones/:opinionId/like
app.post('/api/comercios/:comercioId/opiniones/:opinionId/like', (req, res) => {
    const { comercioId, opinionId } = req.params;
    const { usuarioId } = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    const opinion = comercio.opiniones.find(o => o.id === opinionId);
    if (!opinion) return res.status(404).json({ error: 'Opinión no encontrada.' });
    
    opinion.likes = opinion.likes || [];
    const likeIndex = opinion.likes.indexOf(usuarioId);
    if (likeIndex > -1) {
        opinion.likes.splice(likeIndex, 1); // Unlike
    } else {
        opinion.likes.push(usuarioId); // Like
    }
    res.json(comercio);
});

// POST /api/reportes
app.post('/api/reportes', (req, res) => {
    const reporte = req.body;
    console.log('DENUNCIA RECIBIDA:', reporte);
    // En una app real, esto se guardaría en la base de datos para revisión.
    res.status(200).json({ message: 'Denuncia recibida.' });
});

// POST /api/track - Simulación de tracking de eventos
app.post('/api/track', (req, res) => {
    console.log('Evento trackeado:', req.body);
    // Lógica para guardar el evento en la base de datos...
    res.status(204).send();
});

// GET /api/analytics - Simulación de analíticas
app.get('/api/analytics', (req, res) => {
    if (req.query.userEmail === ADMIN_EMAIL) {
        const adminAnalytics = {
            visitsByRubro: db.rubros.map(r => ({ rubroId: r.id, rubroNombre: r.nombre, count: Math.floor(Math.random() * 500) })).sort((a,b) => b.count - a.count),
            topVisitedComercios: [...db.comercios].sort((a,b) => b.publicidad - a.publicidad).slice(0, 5).map(c => ({ comercioId: c.id, comercioNombre: c.nombre, count: Math.floor(Math.random() * 200) })),
            totalEvents: { views: Math.floor(Math.random() * 5000), whatsappClicks: Math.floor(Math.random() * 1000), websiteClicks: Math.floor(Math.random() * 800) },
        };
        return res.json(adminAnalytics);
    }
    const analytics = {
        totalViews: Math.floor(Math.random() * 1000),
        totalWhatsappClicks: Math.floor(Math.random() * 100),
        totalWebsiteClicks: Math.floor(Math.random() * 50),
    };
    res.json(analytics);
});


// POST /api/payments/confirm-payment - Simulación de confirmación de pago
app.post('/api/payments/confirm-payment', (req, res) => {
    const { comercioId, newLevel } = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    
    comercio.publicidad = newLevel;
    comercio.vencimientoPublicidad = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const newPago = {
        id: `pay-${uuidv4()}`,
        comercioId: comercio.id,
        monto: AD_PRICES[newLevel] || 0,
        fecha: new Date().toISOString(),
        mercadoPagoId: `mp-sim-${Math.random().toString(36).substring(2, 10)}`
    };
    db.pagos.push(newPago);

    res.json({ message: 'Pago confirmado y plan actualizado.' });
});


// POST /api/reset-data - Resetear los datos a los iniciales
app.post('/api/reset-data', (req, res) => {
  db = getInitialData();
  res.json({ message: 'Datos restaurados con éxito.' });
});

// --- CHAT ENDPOINTS ---
// Initialize chat data if it doesn't exist
if (!db.conversations) db.conversations = [];
if (!db.messages) db.messages = [];

app.get('/api/conversations/:userId', (req, res) => {
    const { userId } = req.params;
    const userConvos = db.conversations.filter(c => c.clienteId === userId || db.comercios.find(co => co.id === c.comercioId && co.usuarioId === userId));
    res.json(userConvos);
});

app.post('/api/conversations/start', (req, res) => {
    const { clienteId, comercioId } = req.body;
    let convo = db.conversations.find(c => c.clienteId === clienteId && c.comercioId === comercioId);
    if (convo) {
        return res.json(convo);
    }
    const cliente = db.publicUsers.find(u => u.id === clienteId);
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!cliente || !comercio) return res.status(404).json({ error: 'Cliente o comercio no encontrado' });

    const newConvo = {
        id: `conv-${uuidv4()}`,
        clienteId,
        comercioId,
        clienteNombre: `${cliente.nombre} ${cliente.apellido}`,
        comercioNombre: comercio.nombre,
        comercioImagenUrl: comercio.imagenUrl,
        lastMessage: null,
        lastMessageTimestamp: null,
        lastMessageSenderId: null,
        unreadByCliente: 0,
        unreadByComercio: 0,
    };
    db.conversations.unshift(newConvo);
    res.status(201).json(newConvo);
});

app.get('/api/messages/:conversationId', (req, res) => {
    const { conversationId } = req.params;
    const convoMessages = db.messages.filter(m => m.conversationId === conversationId);
    res.json(convoMessages);
});

app.post('/api/messages', (req, res) => {
    const { conversationId, senderId, content } = req.body;
    const conversation = db.conversations.find(c => c.id === conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });
    
    const newMessage = {
        id: `msg-${uuidv4()}`,
        conversationId,
        senderId,
        content,
        timestamp: new Date().toISOString(),
        isRead: false,
    };
    db.messages.push(newMessage);

    // Update conversation preview
    conversation.lastMessage = content;
    conversation.lastMessageTimestamp = newMessage.timestamp;
    conversation.lastMessageSenderId = senderId;
    
    // Increment unread counter for the other user
    const isSenderCliente = conversation.clienteId === senderId;
    if(isSenderCliente) {
      conversation.unreadByComercio += 1;
    } else {
      conversation.unreadByCliente += 1;
    }
    // Move conversation to top
    db.conversations = db.conversations.filter(c => c.id !== conversationId);
    db.conversations.unshift(conversation);

    res.status(201).json(newMessage);
});

app.post('/api/conversations/:conversationId/read', (req, res) => {
    const { conversationId } = req.params;
    const { userId } = req.body;
    const conversation = db.conversations.find(c => c.id === conversationId);
    if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

    const isUserCliente = conversation.clienteId === userId;
    if (isUserCliente) {
        conversation.unreadByCliente = 0;
    } else {
        conversation.unreadByComercio = 0;
    }

    res.json({ message: 'Conversación marcada como leída.' });
});


// --- SERVIR ARCHIVOS ESTÁTICOS Y RUTA CATCH-ALL ---
// Esto debe ir DESPUÉS de las rutas de la API

app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// --- Iniciar Servidor ---
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});