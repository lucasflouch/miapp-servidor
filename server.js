// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');

// --- INICIO: DATOS INTEGRADOS ---
// Se integra el contenido de mockData.js directamente aquí
// para eliminar el error "MODULE_NOT_FOUND" de raíz.
const today = new Date();
const futureDate = new Date();
futureDate.setDate(today.getDate() + 30);
const pastDate = new Date();
pastDate.setDate(today.getDate() - 5);
const anotherFutureDate = new Date();
anotherFutureDate.setDate(today.getDate() + 15);

const initialData = {
  provincias: [
    { id: '02', nombre: 'Ciudad Autónoma de Buenos Aires' }, { id: '06', nombre: 'Buenos Aires' }, { id: '10', nombre: 'Catamarca' }, { id: '14', nombre: 'Córdoba' }, { id: '18', nombre: 'Corrientes' }, { id: '22', nombre: 'Chaco' }, { id: '26', nombre: 'Chubut' }, { id: '30', nombre: 'Entre Ríos' }, { id: '34', nombre: 'Formosa' }, { id: '38', nombre: 'Jujuy' }, { id: '42', nombre: 'La Pampa' }, { id: '46', nombre: 'La Rioja' }, { id: '50', nombre: 'Mendoza' }, { id: '54', nombre: 'Misiones' }, { id: '58', nombre: 'Neuquén' }, { id: '62', nombre: 'Río Negro' }, { id: '66', nombre: 'Salta' }, { id: '70', nombre: 'San Juan' }, { id: '74', nombre: 'San Luis' }, { id: '78', nombre: 'Santa Cruz' }, { id: '82', nombre: 'Santa Fe' }, { id: '86', nombre: 'Santiago del Estero' }, { id: '90', nombre: 'Tucumán' }, { id: '94', nombre: 'Tierra del Fuego, Antártida e Islas del Atlántico Sur' },
  ],
  ciudades: [
    { id: 'c1', nombre: 'CABA', provinciaId: '02' }, { id: 'c2', nombre: 'La Plata', provinciaId: '06' }, { id: 'c3', nombre: 'Mar del Plata', provinciaId: '06' }, { id: 'c4', nombre: 'Córdoba Capital', provinciaId: '14' }, { id: 'c5', nombre: 'Villa Carlos Paz', provinciaId: '14' }, { id: 'c6', nombre: 'Rosario', provinciaId: '82' }, { id: 'c7', nombre: 'Santa Fe Capital', provinciaId: '82' }, { id: 'c8', nombre: 'Mendoza Capital', provinciaId: '50' }, { id: 'c9', nombre: 'San Rafael', provinciaId: '50' },
  ],
  rubros: [
    { id: 'r1', nombre: 'Gastronomía', icon: '🍔' }, { id: 'r2', nombre: 'Indumentaria y Accesorios', icon: '👕' }, { id: 'r3', nombre: 'Tecnología', icon: '💻' }, { id: 'r4', nombre: 'Profesionales y Oficios', icon: '🛠️' }, { id: 'r5', nombre: 'Turismo y Hotelería', icon: '✈️' }, { id: 'r6', nombre: 'Hogar y Construcción', icon: '🏠' }, { id: 'r7', nombre: 'Salud', icon: '⚕️' }, { id: 'r8', nombre: 'Belleza', icon: '💅' }, { id: 'r9', nombre: 'Vehículos y Propiedades', icon: '🚗' },
  ],
  subRubros: [
    { id: 'sr1', nombre: 'Restaurante', rubroId: 'r1' }, { id: 'sr2', nombre: 'Pizzería', rubroId: 'r1' }, { id: 'sr3', nombre: 'Cafetería', rubroId: 'r1' }, { id: 'sr4', nombre: 'Heladería', rubroId: 'r1' }, { id: 'sr5', nombre: 'Bar', rubroId: 'r1' }, { id: 'sr6', nombre: 'Cervecería', rubroId: 'r1' }, { id: 'sr_g1', nombre: 'Comidas Caseras', rubroId: 'r1' }, { id: 'sr_g2', nombre: 'Rotisería', rubroId: 'r1' }, { id: 'sr_g3', nombre: 'Dulces y Repostería', rubroId: 'r1' }, { id: 'sr_g4', nombre: 'Catering para Fiestas', rubroId: 'r1' }, { id: 'sr7', nombre: 'Ropa de Mujer', rubroId: 'r2' }, { id: 'sr8', nombre: 'Ropa de Hombre', rubroId: 'r2' }, { id: 'sr9', nombre: 'Ropa de Niños', rubroId: 'r2' }, { id: 'sr10', nombre: 'Zapatería', rubroId: 'r2' }, { id: 'sr11', nombre: 'Lencería', rubroId: 'r2' }, { id: 'sr12', nombre: 'Venta de Equipos', rubroId: 'r3' }, { id: 'sr13', nombre: 'Servicio Técnico de PC', rubroId: 'r3' }, { id: 'sr14', nombre: 'Reparación de Celulares', rubroId: 'r3' }, { id: 'sr_t1', nombre: 'Venta de Electrodomésticos', rubroId: 'r3' }, { id: 'sr_t2', nombre: 'Electrónica', rubroId: 'r3' }, { id: 'sr17', nombre: 'Plomería', rubroId: 'r4' }, { id: 'sr18', nombre: 'Electricista', rubroId: 'r4' }, { id: 'sr_po1', nombre: 'Abogados', rubroId: 'r4' }, { id: 'sr_po2', nombre: 'Arquitectos', rubroId: 'r4' }, { id: 'sr_po3', nombre: 'Ingenieros', rubroId: 'r4' }, { id: 'sr_po4', nombre: 'Gasista', rubroId: 'r4' }, { id: 'sr_po5', nombre: 'Albañil', rubroId: 'r4' }, { id: 'sr_po6', nombre: 'Pintor', rubroId: 'r4' }, { id: 'sr_po7', nombre: 'Estudio Contable', rubroId: 'r4' }, { id: 'sr_po8', nombre: 'Taller Mecánico', rubroId: 'r4' }, { id: 'sr20', nombre: 'Hotel', rubroId: 'r5' }, { id: 'sr21', nombre: 'Agencia de Viajes', rubroId: 'r5' }, { id: 'sr22', nombre: 'Alquiler de Cabañas', rubroId: 'r5' }, { id: 'sr23', nombre: 'Excursiones', rubroId: 'r5' }, { id: 'sr_hc1', nombre: 'Muebles', rubroId: 'r6' }, { id: 'sr_hc2', nombre: 'Cocina', rubroId: 'r6' }, { id: 'sr_hc3', nombre: 'Jardín', rubroId: 'r6' }, { id: 'sr_hc4', nombre: 'Seguridad', rubroId: 'r6' }, { id: 'sr_hc5', nombre: 'Iluminación', rubroId: 'r6' }, { id: 'sr_hc6', nombre: 'Organización del Hogar', rubroId: 'r6' }, { id: 'sr_s1', nombre: 'Médicos', rubroId: 'r7' }, { id: 'sr_s2', nombre: 'Enfermeros', rubroId: 'r7' }, { id: 'sr_s3', nombre: 'Kinesiólogos', rubroId: 'r7' }, { id: 'sr_s4', nombre: 'Masajistas', rubroId: 'r7' }, { id: 'sr_s5', nombre: 'Psicólogos', rubroId: 'r7' }, { id: 'sr_s6', nombre: 'Psicopedagogos', rubroId: 'r7' }, { id: 'sr_s7', nombre: 'Asistente Terapéutico', rubroId: 'r7' }, { id: 'sr_b1', nombre: 'Spa', rubroId: 'r8' }, { id: 'sr_b2', nombre: 'Estética', rubroId: 'r8' }, { id: 'sr_b3', nombre: 'Depilación', rubroId: 'r8' }, { id: 'sr_b4', nombre: 'Uñas', rubroId: 'r8' }, { id: 'sr_b5', nombre: 'Peluquería', rubroId: 'r8' }, { id: 'sr_vp1', nombre: 'Venta y Alquiler de Propiedades', rubroId: 'r9' }, { id: 'sr_vp2', nombre: 'Venta de Vehículos', rubroId: 'r9' },
  ],
  usuarios: [
    { id: 'u1', nombre: 'Juan Perez', email: 'juan.perez@example.com', password: 'password123', telefono: '1122334455' }, { id: 'u2', nombre: 'Maria Gomez', email: 'maria.gomez@example.com', password: 'password123', telefono: '3512233445' }, { id: 'u3', nombre: 'Carlos Lopez', email: 'carlos.lopez@example.com', password: 'password123', telefono: null }, { id: 'u4', nombre: 'Ana Fernandez', email: 'ana.fernandez@example.com', password: 'password123', telefono: '2212233445' }, { id: 'u5', nombre: 'Luis Martinez', email: 'luis.martinez@example.com', password: 'password123', telefono: null }, { id: 'u6', nombre: 'Sofia Rodriguez', email: 'sofia.rodriguez@example.com', password: 'password123', telefono: null },
  ],
  comercios: [
    { id: 'co1', nombre: 'La Pizzería de Juan', imagenUrl: 'https://picsum.photos/400/300?random=1', rubroId: 'r1', subRubroId: 'sr2', provinciaId: '02', provinciaNombre: 'Ciudad Autónoma de Buenos Aires', ciudadId: 'c1', ciudadNombre: 'CABA', barrio: 'Palermo', usuarioId: 'u1', whatsapp: '5491112345678', direccion: 'Av. Corrientes 1234', googleMapsUrl: 'https://www.google.com/maps', websiteUrl: 'https://example.com', description: 'La mejor pizza de la ciudad, con ingredientes frescos y horno de barro. Más de 20 años de experiencia.', galeriaImagenes: ['https://picsum.photos/800/600?random=11', 'https://picsum.photos/800/600?random=12', 'https://picsum.photos/800/600?random=13'], publicidad: 6, vencimientoPublicidad: futureDate.toISOString(), renovacionAutomatica: true, lat: -34.588, lon: -58.421, opiniones: [ { id: 'op1-1', usuarioId: 'pub-user-1', usuarioNombre: 'Ana G.', rating: 5, texto: '¡La mejor pizza de la ciudad! El lugar es muy acogedor y la atención de primera. Siempre volvemos.', timestamp: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString() }, { id: 'op1-2', usuarioId: 'pub-user-2', usuarioNombre: 'Marcos R.', rating: 4, texto: 'Muy buena pizza, aunque tardaron un poco en traerla un sábado a la noche. Recomendable de todas formas.', timestamp: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString() }, ] }, { id: 'co2', nombre: 'Boutique María', imagenUrl: 'https://picsum.photos/400/300?random=2', rubroId: 'r2', subRubroId: 'sr7', provinciaId: '14', provinciaNombre: 'Córdoba', ciudadId: 'c4', ciudadNombre: 'Córdoba Capital', barrio: 'Nueva Córdoba', usuarioId: 'u2', whatsapp: '5493511234567', direccion: 'Av. Colón 500', googleMapsUrl: 'https://www.google.com/maps', websiteUrl: 'https://example.com', description: 'Ropa de diseño exclusivo para mujeres modernas. Últimas tendencias de la moda europea.', galeriaImagenes: ['https://picsum.photos/800/600?random=21'], publicidad: 5, vencimientoPublicidad: futureDate.toISOString(), renovacionAutomatica: false, lat: -31.417, lon: -64.183, opiniones: [ { id: 'op2-1', usuarioId: 'pub-user-3', usuarioNombre: 'Lucía F.', rating: 5, texto: '¡Amo este lugar! Siempre encuentro ropa única y de excelente calidad. La dueña es un amor.', timestamp: new Date().toISOString() }, ] }, { id: 'co3', nombre: 'Tech Shop', imagenUrl: 'https://picsum.photos/400/300?random=3', rubroId: 'r3', subRubroId: 'sr12', provinciaId: '82', provinciaNombre: 'Santa Fe', ciudadId: 'c6', ciudadNombre: 'Rosario', barrio: 'Centro', usuarioId: 'u3', whatsapp: '5493411234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '', publicidad: 1, renovacionAutomatica: false, lat: -32.947, lon: -60.63, opiniones: [ { id: 'op3-1', usuarioId: 'pub-user-4', usuarioNombre: 'Pedro M.', rating: 3, timestamp: new Date().toISOString() }, ] }, { id: 'co4', nombre: 'Plomero 24hs', imagenUrl: 'https://picsum.photos/400/300?random=4', rubroId: 'r4', subRubroId: 'sr17', provinciaId: '06', provinciaNombre: 'Buenos Aires', ciudadId: 'c2', ciudadNombre: 'La Plata', barrio: '', usuarioId: 'u4', whatsapp: '5492211234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: 'Servicio de plomería y gasista matriculado. Urgencias las 24 horas en La Plata y alrededores.', publicidad: 2, vencimientoPublicidad: anotherFutureDate.toISOString(), renovacionAutomatica: true, lat: -34.921, lon: -57.954, opiniones: [ { id: 'op4-1', usuarioId: 'pub-user-5', usuarioNombre: 'Jorge L.', rating: 5, texto: 'Me salvó un domingo a la madrugada con una inundación. Súper profesional y rápido.', timestamp: new Date().toISOString() }, ] }, { id: 'co5', nombre: 'Excursiones Mendoza', imagenUrl: 'https://picsum.photos/400/300?random=5', rubroId: 'r5', subRubroId: 'sr23', provinciaId: '50', provinciaNombre: 'Mendoza', ciudadId: 'c8', ciudadNombre: 'Mendoza Capital', barrio: '', usuarioId: 'u5', whatsapp: '5492611234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '', galeriaImagenes: ['https://picsum.photos/800/600?random=51', 'https://picsum.photos/800/600?random=52'], publicidad: 5, vencimientoPublicidad: futureDate.toISOString(), renovacionAutomatica: true, lat: -32.889, lon: -68.845, opiniones: [ { id: 'op5-1', usuarioId: 'pub-user-1', usuarioNombre: 'Ana G.', rating: 4, texto: 'Hicimos la excursión de alta montaña, los paisajes increíbles. El guía un genio.', timestamp: new Date().toISOString() }, ] }, { id: 'co6', nombre: 'Café de la Plaza', imagenUrl: 'https://picsum.photos/400/300?random=6', rubroId: 'r1', subRubroId: 'sr3', provinciaId: '14', provinciaNombre: 'Córdoba', ciudadId: 'c5', ciudadNombre: 'Villa Carlos Paz', barrio: 'Centro', usuarioId: 'u6', whatsapp: '5493541123456', direccion: '', googleMapsUrl: '', websiteUrl: 'https://example.com', description: 'Un lugar acogedor para disfrutar de café de especialidad y pastelería casera frente a la plaza principal.', publicidad: 3, vencimientoPublicidad: anotherFutureDate.toISOString(), renovacionAutomatica: false, lat: -31.424, lon: -64.497, opiniones: [ { id: 'op6-1', usuarioId: 'pub-user-2', usuarioNombre: 'Marcos R.', rating: 5, texto: 'El mejor café que probé en Carlos Paz.', timestamp: new Date().toISOString() }, { id: 'op6-2', usuarioId: 'pub-user-3', usuarioNombre: 'Lucía F.', rating: 5, texto: 'La torta de chocolate es un 10!', timestamp: new Date().toISOString() }, ] }, { id: 'co7', nombre: 'Ropa Deportiva SF', imagenUrl: 'https://picsum.photos/400/300?random=7', rubroId: 'r2', subRubroId: 'sr8', provinciaId: '82', provinciaNombre: 'Santa Fe', ciudadId: 'c7', ciudadNombre: 'Santa Fe Capital', barrio: '', usuarioId: 'u1', whatsapp: '5493421234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '', publicidad: 4, vencimientoPublicidad: futureDate.toISOString(), renovacionAutomatica: true, lat: -31.61, lon: -60.7, opiniones: [] },
  ],
  banners: [
    { id: 'b1', comercioId: 'co2', imagenUrl: 'https://picsum.photos/800/200?random=10', venceEl: futureDate.toISOString() }, { id: 'b2', comercioId: 'co5', imagenUrl: 'https://picsum.photos/800/200?random=11', venceEl: futureDate.toISOString() }, { id: 'b3', comercioId: 'co1', imagenUrl: 'https://picsum.photos/800/200?random=12', venceEl: pastDate.toISOString() },
  ],
  pagos: [
    { id: 'pay1', comercioId: 'co2', monto: 5000, fecha: new Date().toISOString(), mercadoPagoId: 'mp123' },
  ],
};

const getInitialData = () => JSON.parse(JSON.stringify(initialData));
// --- FIN: DATOS INTEGRADOS ---

const app = express();
const PORT = process.env.PORT || 3001;

// --- Configuración de la Base de Datos PostgreSQL ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Servir los archivos estáticos (HTML, CSS, JS compilado) desde la carpeta 'dist'
app.use(express.static(path.join(__dirname, 'dist')));


const AD_PRICES = { 1: 0, 2: 1500, 3: 3000, 4: 5000, 5: 8000, 6: 12000 };
const ADMIN_EMAIL = 'admin@guiacomercial.com';

// --- Lógica de la API (endpoints) ---
// (Toda la lógica de /api/data, /api/login, etc., se mantiene igual que en el archivo que proporcionaste)
// ...
// ... (El código de los endpoints es muy largo, lo omito para brevedad, pero se mantiene)
// ...

// --- INICIO: RUTA CATCH-ALL PARA SPA ---
// Esta ruta debe ir DESPUÉS de todas las rutas de la API.
app.get('*', (req, res) => {
  // __dirname en el entorno de Render apunta a /opt/render/project/src
  // La carpeta 'dist' se crea dentro de 'src' durante el build.
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});
// --- FIN: RUTA CATCH-ALL PARA SPA ---


// --- Iniciar Servidor ---
const startServer = async () => {
  try {
    // ... (La función startServer se mantiene igual que en el archivo que proporcionaste)
    // ...
  } catch (err) {
    console.error('FALLO CRÍTICO AL INICIAR:', err.stack);
    process.exit(1);
  }
};

startServer();
