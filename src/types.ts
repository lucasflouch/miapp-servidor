

export interface Provincia {
  id: string;
  nombre: string;
}

export interface Ciudad {
  id: string;
  nombre: string;
  provinciaId: string;
}

export interface Rubro {
  id: string;
  nombre: string;
  icon: string; // Emoji or SVG string
}

export interface SubRubro {
  id: string;
  nombre: string;
  rubroId: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password?: string;
  telefono?: string;
  isVerified?: boolean;
  verificationCode?: string;
  unreadMessageCount?: number;
}

export interface Opinion {
  id: string;
  usuarioId: string;
  usuarioNombre: string; // ej. "Carlos P."
  rating: number; // Calificación de 1 a 5
  texto?: string; // El comentario escrito es opcional
  timestamp: string; // ISO 8601 Date string
  respuesta?: {
    texto: string;
    timestamp: string;
  };
  likes?: string[]; // Array of publicUser IDs
}

export interface Interaction {
  comercioId: string;
  type: 'view' | 'favorite' | 'opinion';
  timestamp: string; // ISO 8601 Date string
  comercioNombre: string;
}

export interface PublicUser {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  password?: string; // Optional on client-side
  whatsapp?: string;
  favorites: string[];
  history: Interaction[];
  unreadMessageCount?: number;
}

export interface Comercio {
  id: string;
  nombre: string;
  imagenUrl: string;
  rubroId: string;
  subRubroId: string;
  provinciaId: string;
  provinciaNombre: string;
  ciudadId: string;
  ciudadNombre: string;
  barrio?: string; // Nuevo campo opcional
  usuarioId: string;
  whatsapp: string;
  direccion?: string;
  googleMapsUrl?: string;
  websiteUrl?: string;
  description?: string;
  galeriaImagenes?: string[];
  publicidad: number;
  renovacionAutomatica: boolean;
  vencimientoPublicidad?: string; // ISO 8601 Date string
  opiniones: Opinion[];
  lat?: number; // Nueva propiedad para latitud
  lon?: number; // Nueva propiedad para longitud
}

export interface Banner {
  id: string;
  comercioId: string;
  imagenUrl: string;
  venceEl: string; // ISO 8601 Date string
}

export interface Pago {
  id: string;
  comercioId: string;
  monto: number;
  fecha: string; // ISO 8601 Date string
  mercadoPagoId: string;
}

export interface AppData {
  provincias: Provincia[];
  ciudades: Ciudad[];
  rubros: Rubro[];
  subRubros: SubRubro[];
  usuarios: Usuario[];
  comercios: Comercio[];
  banners: Banner[];
  pagos: Pago[];
}

export interface AnalyticsData {
  totalViews: number;
  totalWhatsappClicks: number;
  totalWebsiteClicks: number;
}

export interface AdminAnalyticsData {
  visitsByRubro: { rubroId: string; rubroNombre: string; count: number }[];
  topVisitedComercios: { comercioId: string; comercioNombre: string; count: number }[];
  totalEvents: {
    views: number;
    whatsappClicks: number;
    websiteClicks: number;
  };
}

// --- Chat Types ---
export interface ChatMessage {
    id: string;
    conversationId: string;
    senderId: string;
    content: string;
    timestamp: string;
    isRead: boolean;
}

export interface Conversation {
    id: string;
    clienteId: string;
    comercioId: string;
    // Nombres para mostrar en la lista de chats
    clienteNombre: string;
    comercioNombre: string;
    comercioImagenUrl: string;
    // Info del último mensaje para la preview
    lastMessage: string | null;
    lastMessageTimestamp: string | null;
    lastMessageSenderId: string | null;
    // Contadores de no leídos para cada participante
    unreadByCliente: number;
    unreadByComercio: number;
}


export enum Page {
  Home,
  Login,
  Dashboard,
  CreateComercio,
  ComercioDetail,
  Account,
  Promote,
  ClientDashboard,
  Admin,
  Chat, // Nueva página de Chat
}