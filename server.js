const express = require('express');
const path = require('path');
const cors = require('cors');
const { getInitialData } = require('./src/data/mockData.js');

const app = express();
const PORT = process.env.PORT || 10000;

let db = getInitialData();

// --- CONFIGURACIÓN DE CORS ROBUSTA ---
// Esto permite que tu frontend (que Render sirve desde un dominio diferente en desarrollo/previsualización)
// pueda hacer peticiones a tu backend.
app.use(cors({
  origin: '*', // Permite cualquier origen. Para producción más estricta, podrías poner la URL de tu frontend.
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(express.json({ limit: '10mb' }));

// --- SERVIR ARCHIVOS ESTÁTICOS DEL FRONTEND ---
// Esta es la parte clave. Le dice a Express que sirva la aplicación de React ya compilada.
const staticPath = path.join(__dirname, 'dist');
app.use(express.static(staticPath));


// --- API Endpoints ---
app.get('/api/data', (req, res) => {
  res.json(db);
});

// Más endpoints de tu API aquí...
// (login, register, comercios, etc.)
app.post('/api/reset-data', (req, res) => {
  db = getInitialData();
  res.status(200).json({ message: 'Datos restaurados con éxito.' });
});

// --- RUTA CATCH-ALL ---
// Esta es la regla mágica que soluciona el problema de la "pantalla en blanco".
// Si el navegador pide una ruta que no es de la API (ej: /login, /comercios/123),
// simplemente le devolvemos el index.html principal. React se encargará del resto.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
