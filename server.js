const express = require('express');
const path = require('path');
const cors = require('cors');
const { getInitialData } = require('./src/data/mockData.js');

const app = express();
const PORT = process.env.PORT || 10000;

let db = getInitialData();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

const staticPath = path.join(__dirname, 'dist');
app.use(express.static(staticPath));

app.get('/api/data', (req, res) => {
  res.json(db);
});

app.post('/api/reset-data', (req, res) => {
  db = getInitialData();
  res.status(200).json({ message: 'Datos restaurados con éxito.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});