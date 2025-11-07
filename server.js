const express = require('express');
const path = require('path');
const cors = require('cors');
const { getInitialData } = require('./src/data/mockData.js'); // Apunta al archivo JS dentro de src/data
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 10000;

// Habilitar CORS para todas las rutas y orígenes ANTES de definir las rutas.
app.use(cors());

app.use(express.json({ limit: '10mb' }));

// Servir archivos estáticos desde la carpeta 'dist'
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// --- BASE DE DATOS EN MEMORIA ---
let db = getInitialData();
let publicUsers = [];
let events = [];
let reports = [];
let conversations = [];
let messages = [];

// --- ENDPOINTS DE LA API ---

app.get('/api/data', (req, res) => {
  res.json({ ...db, publicUsers, conversations, messages });
});

app.post('/api/reset-data', (req, res) => {
  db = getInitialData();
  publicUsers = [];
  events = [];
  reports = [];
  conversations = [];
  messages = [];
  res.status(200).json({ message: 'Datos restaurados con éxito.' });
});

// --- API DE COMERCIANTES (USUARIOS) ---

app.post('/api/register', (req, res) => {
    const { nombre, email, password, telefono } = req.body;
    if (db.usuarios.find(u => u.email === email)) {
        return res.status(409).json({ error: 'El email ya está registrado.' });
    }
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = { id: `u${db.usuarios.length + 1}`, nombre, email, password, telefono, isVerified: false, verificationCode };
    db.usuarios.push(newUser);
    res.status(201).json({ message: 'Registro exitoso, por favor verifica tu cuenta.', email, verificationCode });
});

app.post('/api/verify', (req, res) => {
    const { email, code } = req.body;
    const user = db.usuarios.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    if (user.verificationCode !== code) return res.status(400).json({ error: 'Código de verificación incorrecto.' });
    user.isVerified = true;
    delete user.verificationCode;
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.usuarios.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'El email no está registrado.' });
    if (user.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json(userWithoutPassword);
});

app.put('/api/usuarios/:id', (req, res) => {
    const { id } = req.params;
    const { nombre, telefono } = req.body;
    const userIndex = db.usuarios.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });
    db.usuarios[userIndex] = { ...db.usuarios[userIndex], nombre, telefono };
    const { password, ...userWithoutPassword } = db.usuarios[userIndex];
    res.status(200).json(userWithoutPassword);
});

// --- API DE COMERCIOS ---

app.post('/api/comercios', (req, res) => {
    const newComercioData = req.body;
    const newComercio = {
        id: `co${db.comercios.length + 1}-${Date.now()}`,
        ...newComercioData,
        opiniones: [],
    };
    if (newComercio.publicidad > 1) {
        const vencimiento = new Date();
        vencimiento.setDate(vencimiento.getDate() + 30);
        newComercio.vencimientoPublicidad = vencimiento.toISOString();
    }
    db.comercios.push(newComercio);
    res.status(201).json(newComercio);
});

app.put('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const comercioIndex = db.comercios.findIndex(c => c.id === id);
    if (comercioIndex === -1) return res.status(404).json({ error: 'Comercio no encontrado.' });
    db.comercios[comercioIndex] = { ...db.comercios[comercioIndex], ...updatedData };
    res.status(200).json(db.comercios[comercioIndex]);
});

app.delete('/api/comercios/:id', (req, res) => {
    const { id } = req.params;
    const initialLength = db.comercios.length;
    db.comercios = db.comercios.filter(c => c.id !== id);
    if (db.comercios.length === initialLength) return res.status(404).json({ error: 'Comercio no encontrado.' });
    res.status(200).json({ message: 'Comercio eliminado con éxito.' });
});

// --- API DE OPINIONES ---

app.post('/api/comercios/:id/opinar', (req, res) => {
    const { id } = req.params;
    const { usuarioId, usuarioNombre, rating, texto } = req.body;
    const comercio = db.comercios.find(c => c.id === id);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    if (!comercio.opiniones) comercio.opiniones = [];
    const newOpinion = { id: `op-${uuidv4()}`, usuarioId, usuarioNombre, rating, texto, timestamp: new Date().toISOString(), likes: [] };
    comercio.opiniones.push(newOpinion);
    res.status(201).json(comercio);
});

app.post('/api/comercios/:comercioId/opiniones/:opinionId/responder', (req, res) => {
    const { comercioId, opinionId } = req.params;
    const { texto, usuarioId } = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio || comercio.usuarioId !== usuarioId) return res.status(403).json({ error: 'No autorizado.' });
    const opinion = comercio.opiniones.find(o => o.id === opinionId);
    if (!opinion) return res.status(404).json({ error: 'Opinión no encontrada.' });
    opinion.respuesta = { texto, timestamp: new Date().toISOString() };
    res.status(200).json(comercio);
});

app.post('/api/comercios/:comercioId/opiniones/:opinionId/like', (req, res) => {
    const { comercioId, opinionId } = req.params;
    const { usuarioId } = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio) return res.status(404).json({ error: 'Comercio no encontrado.' });
    const opinion = comercio.opiniones.find(o => o.id === opinionId);
    if (!opinion) return res.status(404).json({ error: 'Opinión no encontrada.' });
    opinion.likes = opinion.likes || [];
    const likeIndex = opinion.likes.indexOf(usuarioId);
    if (likeIndex > -1) { opinion.likes.splice(likeIndex, 1); } else { opinion.likes.push(usuarioId); }
    res.status(200).json(comercio);
});

// --- API DE CLIENTES (PUBLIC USERS) ---

app.post('/api/public-register', (req, res) => {
    const { nombre, apellido, email, password, whatsapp } = req.body;
    if (publicUsers.find(u => u.email === email)) return res.status(409).json({ error: 'El email ya está registrado.' });
    const newUser = { id: `pub-${uuidv4()}`, nombre, apellido, email, password, whatsapp, favorites: [], history: [] };
    publicUsers.push(newUser);
    const { password: _, ...userToReturn } = newUser;
    res.status(201).json(userToReturn);
});

app.post('/api/public-login', (req, res) => {
    const { email, password } = req.body;
    const user = publicUsers.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'El email no está registrado.' });
    if (user.password !== password) return res.status(401).json({ error: 'Contraseña incorrecta.' });
    const { password: _, ...userToReturn } = user;
    res.status(200).json(userToReturn);
});

app.put('/api/public-users/:id', (req, res) => {
    const { id } = req.params;
    const updatedData = req.body;
    const userIndex = publicUsers.findIndex(u => u.id === id);
    if (userIndex === -1) return res.status(404).json({ error: 'Usuario no encontrado.' });
    publicUsers[userIndex] = { ...publicUsers[userIndex], ...updatedData };
    const { password, ...userToReturn } = publicUsers[userIndex];
    res.status(200).json(userToReturn);
});

// --- API DE PAGOS (SIMULACIÓN) ---

app.post('/api/payments/create-preference', (req, res) => {
    res.status(200).json({ preferenceId: `pref-${uuidv4()}` });
});

app.post('/api/payments/confirm-payment', (req, res) => {
    const { comercioId, newLevel } = req.body;
    const comercio = db.comercios.find(c => c.id === comercioId);
    if (!comercio) return res.status(404).json({ error: "Comercio no encontrado." });
    comercio.publicidad = newLevel;
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + 30);
    comercio.vencimientoPublicidad = vencimiento.toISOString();
    res.status(200).json({ message: 'Pago confirmado y plan actualizado.' });
});

// --- API DE TRACKING Y ANALYTICS ---

app.post('/api/track', (req, res) => {
    const { comercioId, eventType, usuarioId } = req.body;
    events.push({ comercioId, eventType, usuarioId: usuarioId || 'anonymous', timestamp: new Date().toISOString() });
    res.status(204).send();
});

app.get('/api/analytics', (req, res) => {
  const { comercioId } = req.query;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  const relevantEvents = events.filter(e => e.timestamp > thirtyDaysAgo);

  if (comercioId) {
    const comercioEvents = relevantEvents.filter(e => e.comercioId === comercioId);
    const analytics = {
        totalViews: comercioEvents.filter(e => e.eventType === 'view').length,
        totalWhatsappClicks: comercioEvents.filter(e => e.eventType === 'whatsapp_click').length,
        totalWebsiteClicks: comercioEvents.filter(e => e.eventType === 'website_click').length,
    };
    return res.json(analytics);
  }
  
  // Lógica de Admin Analytics
  const totalEvents = {
    views: relevantEvents.filter(e => e.eventType === 'view').length,
    whatsappClicks: relevantEvents.filter(e => e.eventType === 'whatsapp_click').length,
    websiteClicks: relevantEvents.filter(e => e.eventType === 'website_click').length,
  };
  
  const visitsByRubro = db.rubros.map(rubro => {
    const count = relevantEvents.filter(e => {
        const comercio = db.comercios.find(c => c.id === e.comercioId);
        return comercio && comercio.rubroId === rubro.id && e.eventType === 'view';
    }).length;
    return { rubroId: rubro.id, rubroNombre: rubro.nombre, count };
  }).sort((a,b) => b.count - a.count);

  const visitsByComercio = db.comercios.map(comercio => {
      const count = relevantEvents.filter(e => e.comercioId === comercio.id && e.eventType === 'view').length;
      return { comercioId: comercio.id, comercioNombre: comercio.nombre, count };
  }).sort((a,b) => b.count - a.count).slice(0, 5);

  res.json({ totalEvents, visitsByRubro, topVisitedComercios: visitsByComercio });
});

// --- RUTA CATCH-ALL ---
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
