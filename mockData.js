// mockData.js
// Este archivo exporta los datos iniciales para que el servidor los pueda usar.

const today = new Date();
const futureDate = new Date();
futureDate.setDate(today.getDate() + 30);
const pastDate = new Date();
pastDate.setDate(today.getDate() - 5);

const initialData = {
  provincias: [
    { id: 'p1', nombre: 'Buenos Aires' },
    { id: 'p2', nombre: 'Córdoba' },
    { id: 'p3', nombre: 'Santa Fe' },
    { id: 'p4', nombre: 'Mendoza' },
  ],
  ciudades: [
    { id: 'c1', nombre: 'CABA', provinciaId: 'p1' },
    { id: 'c2', nombre: 'La Plata', provinciaId: 'p1' },
    { id: 'c3', nombre: 'Mar del Plata', provinciaId: 'p1' },
    { id: 'c4', nombre: 'Córdoba Capital', provinciaId: 'p2' },
    { id: 'c5', nombre: 'Villa Carlos Paz', provinciaId: 'p2' },
    { id: 'c6', nombre: 'Rosario', provinciaId: 'p3' },
    { id: 'c7', nombre: 'Santa Fe Capital', provinciaId: 'p3' },
    { id: 'c8', nombre: 'Mendoza Capital', provinciaId: 'p4' },
    { id: 'c9', nombre: 'San Rafael', provinciaId: 'p4' },
  ],
  rubros: [
    { id: 'r1', nombre: 'Gastronomía', icon: '🍔' },
    { id: 'r2', nombre: 'Indumentaria', icon: '👕' },
    { id: 'r3', nombre: 'Tecnología', icon: '💻' },
    { id: 'r4', nombre: 'Servicios', icon: '🛠️' },
    { id: 'r5', nombre: 'Turismo', icon: '✈️' },
  ],
  usuarios: [
    { id: 'u1', nombre: 'Juan Perez', email: 'juan.perez@example.com' },
    { id: 'u2', nombre: 'Maria Gomez', email: 'maria.gomez@example.com' },
    { id: 'u3', nombre: 'Carlos Lopez', email: 'carlos.lopez@example.com' },
    { id: 'u4', nombre: 'Ana Fernandez', email: 'ana.fernandez@example.com' },
    { id: 'u5', nombre: 'Luis Martinez', email: 'luis.martinez@example.com' },
    { id: 'u6', nombre: 'Sofia Rodriguez', email: 'sofia.rodriguez@example.com' },
  ],
  comercios: [
    { id: 'co1', nombre: 'La Pizzería de Juan', imagenUrl: 'https://picsum.photos/400/300?random=1', rubroId: 'r1', ciudadId: 'c1', usuarioId: 'u1', whatsapp: '5491112345678', direccion: 'Av. Corrientes 1234', googleMapsUrl: 'https://www.google.com/maps', websiteUrl: 'https://example.com', description: 'La mejor pizza de la ciudad, con ingredientes frescos y horno de barro. Más de 20 años de experiencia.' },
    { id: 'co2', nombre: 'Boutique María', imagenUrl: 'https://picsum.photos/400/300?random=2', rubroId: 'r2', ciudadId: 'c4', usuarioId: 'u2', whatsapp: '5493511234567', direccion: 'Av. Colón 500', googleMapsUrl: 'https://www.google.com/maps', websiteUrl: 'https://example.com', description: 'Ropa de diseño exclusivo para mujeres modernas. Últimas tendencias de la moda europea.' },
    { id: 'co3', nombre: 'Tech Shop', imagenUrl: 'https://picsum.photos/400/300?random=3', rubroId: 'r3', ciudadId: 'c6', usuarioId: 'u3', whatsapp: '5493411234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '' },
    { id: 'co4', nombre: 'Plomero 24hs', imagenUrl: 'https://picsum.photos/400/300?random=4', rubroId: 'r4', ciudadId: 'c2', usuarioId: 'u4', whatsapp: '5492211234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: 'Servicio de plomería y gasista matriculado. Urgencias las 24 horas en La Plata y alrededores.' },
    { id: 'co5', nombre: 'Excursiones Mendoza', imagenUrl: 'https://picsum.photos/400/300?random=5', rubroId: 'r5', ciudadId: 'c8', usuarioId: 'u5', whatsapp: '5492611234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '' },
    { id: 'co6', nombre: 'Café de la Plaza', imagenUrl: 'https://picsum.photos/400/300?random=6', rubroId: 'r1', ciudadId: 'c5', usuarioId: 'u6', whatsapp: '5493541123456', direccion: '', googleMapsUrl: '', websiteUrl: 'https://example.com', description: 'Un lugar acogedor para disfrutar de café de especialidad y pastelería casera frente a la plaza principal.' },
    { id: 'co7', nombre: 'Ropa Deportiva SF', imagenUrl: 'https://picsum.photos/400/300?random=7', rubroId: 'r2', ciudadId: 'c7', usuarioId: 'u1', whatsapp: '5493421234567', direccion: '', googleMapsUrl: '', websiteUrl: '', description: '' },
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
