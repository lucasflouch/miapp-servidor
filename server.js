const express = require('express');
const path = require('path');
const cors = require('cors');
const { getInitialData } = require('./src/data/mockData.js');

const app = express();
const PORT = process.env.PORT || 10000;

let db = getInitialData();

// Habilitar CORS para todas las rutas y orígenes
app.use(cors());

app.use(express.json({ limit: '10mb' }));

// Servir archivos estáticos desde la carpeta 'dist'
const staticPath = path.join(__dirname, 'dist');
app.use(express.static(staticPath));


// --- ENDPOINTS DE LA API ---

app.get('/api/data', (req, res) => {
  res.json(db);
});

app.post('/api/reset-data', (req, res) => {
  db = getInitialData();
  res.status(200).json({ message: 'Datos restaurados con éxito.' });
});

// Agrega aquí el resto de tus endpoints de API...


// --- RUTA CATCH-ALL ---
// Esta ruta debe ir DESPUÉS de todos los endpoints de la API.
// Envía el index.html para cualquier otra petición, permitiendo que React Router funcione.
app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});