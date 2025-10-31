// mockData.js
// Este archivo exporta los datos iniciales para que el servidor los pueda usar.

const today = new Date();
const futureDate = new Date();
futureDate.setDate(today.getDate() + 30);
const pastDate = new Date();
pastDate.setDate(today.getDate() - 5);

const initialData = {
  provincias: [
    { id: '02', nombre: 'Ciudad Autónoma de Buenos Aires' },
    { id: '06', nombre: 'Buenos Aires' },
    { id: '10', nombre: 'Catamarca' },
    { id: '14', nombre: 'Córdoba' },
    { id: '18', nombre: 'Corrientes' },
    { id: '22', nombre: 'Chaco' },
    { id: '26', nombre: 'Chubut' },
    { id: '30', nombre: 'Entre Ríos' },
    { id: '34', nombre: 'Formosa' },
    { id: '38', nombre: 'Jujuy' },
    { id: '42', nombre: 'La Pampa' },
    { id: '46', nombre: 'La Rioja' },
    { id: '50', nombre: 'Mendoza' },
    { id: '54', nombre: 'Misiones' },
    { id: '58', nombre: 'Neuquén' },
    { id: '62', nombre: 'Río Negro' },
    { id: '66', nombre: 'Salta' },
    { id: '70', nombre: 'San Juan' },
    { id: '74', nombre: 'San Luis' },
    { id: '78', nombre: 'Santa Cruz' },
    { id: '82', nombre: 'Santa Fe' },
    { id: '86', nombre: 'Santiago del Estero' },
    { id: '90', nombre: 'Tucumán' },
    { id: '94', nombre: 'Tierra del Fuego, Antártida e Islas del Atlántico Sur' },
  ],
  ciudades: [
    { id: 'c1', nombre: 'CABA', provinciaId: '02' },
    { id: 'c2', nombre: 'La Plata', provinciaId: '06' },
    { id: 'c3', nombre: 'Mar del Plata', provinciaId: '06' },
    { id: 'c4', nombre: 'Córdoba Capital', provinciaId: '14' },
    { id: 'c5', nombre: 'Villa Carlos Paz', provinciaId: '14' },
    { id: 'c6', nombre: 'Rosario', provinciaId: '82' },
    { id: 'c7', nombre: 'Santa Fe Capital', provinciaId: '82' },
    { id: 'c8', nombre: 'Mendoza Capital', provinciaId: '50' },
    { id: 'c9', nombre: 'San Rafael', provinciaId: '50' },
  ],
  rubros: [
    { id: 'r1', nombre: 'Gastronomía', icon: '🍔' },
    { id: 'r2', nombre: 'Indumentaria', icon: '👕' },
    { id: 'r3', nombre: 'Tecnología', icon: '💻' },
    { id: 'r4', nombre: 'Servicios', icon: '🛠️' },
    { id: 'r5', nombre: 'Turismo', icon: '✈️' },
  ],
  usuarios: [
    { id: 'u1', nombre: 'Juan Perez', email: 'juan.perez@example.com', password: 'password123', telefono: '1122334455' },
    { id: 'u2', nombre: 'Maria Gomez', email: 'maria.gomez@example.com', password: 'password123', telefono: '3512233445' },
    { id: 'u3', nombre: 'Carlos Lopez', email: 'carlos.lopez@example.com', password: 'password123', telefono: null },
    { id: 'u4', nombre: 'Ana Fernandez', email: 'ana.fernandez@example.com', password: 'password123', telefono: '2212233445' },
    { id: 'u5', nombre: 'Luis Martinez', email: 'luis.martinez@example.com', password: 'password123', telefono: null },
    { id: 'u6', nombre: 'Sofia Rodriguez', email: 'sofia.rodriguez@example.com', password: 'password123', telefono: null },
  ],
  comercios: [
    { id: 'co1', nombre: 'La Pizzería de Juan', imagenUrl: 'https://picsum.photos/400/300?random=1', rubroId: 'r1', provinciaId: '02', provinciaNombre: 'Ciudad Autónoma de Buenos Aires', ciudadId: 'c1', ciudadNombre: 'CABA', usuarioId: 'u1', whatsapp: '5491112345678', direccion: 'Av. Corrientes 1234', googleMapsUrl: 'https://www.google.com/maps', websiteUrl: 'https://example.com', description: 'La mejor pizza de la ciudad, con ingredientes frescos y horno de barro. Más de 20 años de experiencia.', galeriaImagenes: ['https://picsum.photos/800/600?random=11', 'https://picsum.photos/800/600?random=12', 'https://picsum.photos/800/600?random=13'] },
    { id: 'co2', nombre: 'Boutique María', imagenUrl: 'https://picsum.photos/400/300?random=2', rubroId: 'r2', provinciaId: '14', provinciaNombre: 'Córdoba', ciudadId: 'c4', ciudadNombre: 'Córdoba Capital', usuarioId: 'u2', whatsapp: '5493511234567', direccion: 'Av. Colón 500', googleMapsUrl: 'https://www.google.com/maps', websiteUrl: 'https://example.com', description: 'Ropa de diseño exclusivo para mujeres modernas. Últimas tendencias de la moda europea.', galeriaImagenes: ['https://picsum.photos/800/600?random=21'] },
    { id: 'co3', nombre: 'Tech Shop', imagenUrl: 'https://picsum.photos/400/300?random=3', rubroId: 'r3', provinciaId: '82', provinciaNombre: 'Santa Fe', ciudadId: 'c6', ciudadNombre: 'Rosario', usuarioId: 'u3', whatsapp: '5493411234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '' },
    { id: 'co4', nombre: 'Plomero 24hs', imagenUrl: 'https://picsum.photos/400/300?random=4', rubroId: 'r4', provinciaId: '06', provinciaNombre: 'Buenos Aires', ciudadId: 'c2', ciudadNombre: 'La Plata', usuarioId: 'u4', whatsapp: '5492211234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: 'Servicio de plomería y gasista matriculado. Urgencias las 24 horas en La Plata y alrededores.' },
    { id: 'co5', nombre: 'Excursiones Mendoza', imagenUrl: 'https://picsum.photos/400/300?random=5', rubroId: 'r5', provinciaId: '50', provinciaNombre: 'Mendoza', ciudadId: 'c8', ciudadNombre: 'Mendoza Capital', usuarioId: 'u5', whatsapp: '5492611234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '', galeriaImagenes: ['https://picsum.photos/800/600?random=51', 'https://picsum.photos/800/600?random=52'] },
    { id: 'co6', nombre: 'Café de la Plaza', imagenUrl: 'https://picsum.photos/400/300?random=6', rubroId: 'r1', provinciaId: '14', provinciaNombre: 'Córdoba', ciudadId: 'c5', ciudadNombre: 'Villa Carlos Paz', usuarioId: 'u6', whatsapp: '5493541123456', direccion: '', googleMapsUrl: '', websiteUrl: 'https://example.com', description: 'Un lugar acogedor para disfrutar de café de especialidad y pastelería casera frente a la plaza principal.' },
    { id: 'co7', nombre: 'Ropa Deportiva SF', imagenUrl: 'https://picsum.photos/400/300?random=7', rubroId: 'r2', provinciaId: '82', provinciaNombre: 'Santa Fe', ciudadId: 'c7', ciudadNombre: 'Santa Fe Capital', usuarioId: 'u1', whatsapp: '5493421234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '' },
  ],
  banners: [
    { id: 'b1', comercioId: 'co2', imagenUrl: 'https://picsum.photos/800/200?random=10', venceEl: futureDate.toISOString() },
    { id: 'b2', comercioId: 'co5', imagenUrl: 'https://picsum.photos/800/200?random=11', venceEl: futureDate.toISOString() },
    { id: 'b3', comercioId: 'co1', imagenUrl: 'https://picsum.photos/800/200?random=12', venceEl: pastDate.toISOString() }, // Vencido
  ],
  pagos: [
    { id: 'pay1', comercioId: 'co2', monto: 5000, fecha: new Date().toISOString(), mercadoPagoId: 'mp123' },
  ],
};

module.exports = { initialData };