
export const MERCADOPAGO_CHECKOUT_LINK = "https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=YOUR_PREFERENCE_ID_HERE";

export const AD_TIERS = [
  {
    level: 1,
    name: 'Gratis',
    price: 0,
    features: [
      'Aparece en listados con filtros',
      'Línea de texto simple con tu nombre',
      'Botón de contacto a WhatsApp',
    ],
    isCurrent: (level: number) => level === 1,
  },
  {
    level: 2,
    name: 'Básico',
    price: 1500,
    features: [
      'Todo lo del plan Gratis',
      'Foto principal del comercio',
      'Mayor visibilidad que el plan Gratis',
    ],
    isCurrent: (level: number) => level === 2,
  },
  {
    level: 3,
    name: 'Estándar',
    price: 3000,
    features: [
      'Todo lo del plan Básico',
      'Link a tu página web',
      'Indicador de "Más Fotos" en la lista',
      'Letra más grande y mayor espacio',
    ],
    isCurrent: (level: number) => level === 3,
  },
  {
    level: 4,
    name: 'Avanzado',
    price: 5000,
    features: [
      'Todo lo del plan Estándar',
      'Formato de tarjeta completa (banner)',
      'Descripción, ubicación y más detalles visibles',
      'Borde resaltado como "Recomendado"',
    ],
    isCurrent: (level: number) => level === 4,
  },
  {
    level: 5,
    name: 'Destacado',
    price: 8000,
    features: [
      'Todo lo del plan Avanzado',
      'Banner publicitario grande en cabecera',
      'Aparece antes de los resultados de búsqueda',
      'Máxima visibilidad en los listados',
    ],
    isCurrent: (level: number) => level === 5,
  },
   {
    level: 6,
    name: 'Exclusivo',
    price: 12000,
    features: [
      'Todo lo del plan Destacado',
      'Banner gigante en la página de Inicio',
      'Visibilidad inmediata para todos los usuarios',
      'Etiqueta "Exclusivo" para máximo impacto',
    ],
    isCurrent: (level: number) => level === 6,
  },
];