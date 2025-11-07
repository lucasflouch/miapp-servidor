import React, { useState } from 'react';
import { Comercio, Rubro, SubRubro, Opinion, PublicUser } from '../types';
import StarRating from './StarRating';
import * as api from '../apiService';

// --- Iconos ---
const WhatsAppIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 mr-2"} viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.803 6.166l-1.331 4.869 4.892-1.284zm7.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
);
const GlobeIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.293l1.414-1.414a1 1 0 011.414 0l1.414 1.414M12 21a9 9 0 100-18 9 9 0 000 18z" />
    </svg>
);
const LocationMarkerIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-6 w-6"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);
const CameraIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-4 w-4 mr-1.5"} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
);
const HeartIcon: React.FC<{isFavorite: boolean}> = ({ isFavorite }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-colors duration-200 ${isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
);
const ShareIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);

interface BusinessCardProps {
  comercio: Comercio;
  rubro: Rubro;
  subRubro: SubRubro;
  onViewComercio: (comercio: Comercio) => void;
  publicUser: PublicUser | null;
  isFavorite: boolean;
  onToggleFavorite: (comercio: Comercio) => void;
  distance?: number;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ comercio, rubro, subRubro, onViewComercio, publicUser, isFavorite, onToggleFavorite, distance }) => {
  const [isCopied, setIsCopied] = useState(false);
  const whatsappLink = `https://wa.me/${comercio.whatsapp}?text=Hola!%20Vi%20tu%20comercio%20en%20la%20Guía%20y%20quería%20consultar%20por...`;
  const locationString = [comercio.barrio, comercio.ciudadNombre].filter(Boolean).join(', ');

  const handleTrackAndOpen = (eventType: 'whatsapp_click' | 'website_click', url: string, e: React.MouseEvent) => {
      e.stopPropagation();
      api.trackEvent(comercio.id, eventType, publicUser?.id);
      window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/comercios/${comercio.id}`;
    const shareData = {
        title: comercio.nombre,
        text: `¡Mirá este comercio que encontré en GuíaComercial: ${comercio.nombre}!`,
        url: shareUrl,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (error) {
            console.error('Error al usar la Web Share API:', error);
        }
    } else {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (error) {
            console.error('Error al copiar al portapapeles:', error);
            alert('No se pudo copiar el enlace.');
        }
    }
  };

  const FavoriteButton = () => (
    publicUser ? (
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(comercio); }}
        className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition-colors z-10"
        aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      >
        <HeartIcon isFavorite={isFavorite} />
      </button>
    ) : null
  );

  const DistanceInfo = () => (
    distance !== undefined && distance !== Infinity ? (
        <p className="text-sm font-semibold text-indigo-600">
            {distance < 1 ? `a ${Math.round(distance * 1000)} m` : `a ${distance.toFixed(1)} km`}
        </p>
    ) : null
  );

  // Render Nivel 1: "Gratis"
  if (comercio.publicidad === 1) {
    return (
      <div 
        className="bg-white p-3 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 hover:bg-gray-50 transition-colors cursor-pointer relative"
        onClick={() => onViewComercio(comercio)}
      >
        <div>
            <p className="text-gray-800 font-medium text-center sm:text-left flex-grow">{comercio.nombre}</p>
            <DistanceInfo />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <button
                onClick={handleShareClick}
                className={`flex items-center text-xs font-bold py-1 px-3 rounded-full transition-colors ${isCopied ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                title="Compartir"
            >
                <ShareIcon className="h-3 w-3 mr-1.5" />
                {isCopied ? 'Copiado' : 'Compartir'}
            </button>
            <button 
              onClick={(e) => handleTrackAndOpen('whatsapp_click', whatsappLink, e)}
              className="flex items-center bg-green-100 text-green-800 text-xs font-bold py-1 px-3 rounded-full hover:bg-green-200 transition-colors"
            >
              <WhatsAppIcon className="h-4 w-4 mr-1.5" />
              WhatsApp
            </button>
            <FavoriteButton />
        </div>
      </div>
    );
  }

  // Render Nivel 2: Gratis + Foto
  if (comercio.publicidad === 2) {
    return (
       <div 
        className="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row items-start gap-4 hover:shadow-lg transition-shadow cursor-pointer relative"
        onClick={() => onViewComercio(comercio)}
      >
        <FavoriteButton />
        <img src={comercio.imagenUrl} alt={comercio.nombre} className="w-full sm:w-24 h-32 sm:h-24 rounded-md object-cover flex-shrink-0" />
        <div className="flex-grow w-full">
          <h3 className="text-lg font-bold text-gray-900">{comercio.nombre}</h3>
          <div className="my-1">
            <StarRating opiniones={comercio.opiniones} />
          </div>
          <p className="text-sm text-gray-600">{locationString}</p>
          <DistanceInfo />
          <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-dashed">
             <button
                onClick={handleShareClick}
                className={`flex-1 flex items-center justify-center text-sm font-bold py-2 px-3 rounded-lg transition-colors ${isCopied ? 'bg-blue-500 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
                title="Compartir"
              >
                 {isCopied ? '¡Copiado!' : <><ShareIcon className="h-4 w-4 mr-1.5" /> Compartir</>}
              </button>
             <button 
              onClick={(e) => handleTrackAndOpen('whatsapp_click', whatsappLink, e)}
              className="flex-1 flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors"
              title="Contactar por WhatsApp"
            >
              <WhatsAppIcon className="h-5 w-5 mr-1.5" /> Contactar
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Render Nivel 3: Nivel 2 + "Más fotos" + Link web + Letra más grande
  if (comercio.publicidad === 3) {
      return (
        <div 
            className="bg-white p-4 rounded-lg shadow-md flex flex-col hover:shadow-lg transition-shadow cursor-pointer relative"
            onClick={() => onViewComercio(comercio)}
        >
            <FavoriteButton />
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <img src={comercio.imagenUrl} alt={comercio.nombre} className="w-full sm:w-28 h-36 sm:h-28 rounded-md object-cover flex-shrink-0" />
              <div className="flex-grow">
                  <h3 className="text-xl font-bold text-gray-900">{comercio.nombre}</h3>
                  <div className="my-1">
                    <StarRating opiniones={comercio.opiniones} />
                  </div>
                  <p className="text-md text-gray-600 mb-1">{locationString}</p>
                  <DistanceInfo />
                  {comercio.galeriaImagenes && comercio.galeriaImagenes.length > 0 && (
                      <span className="inline-flex items-center text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold mt-1">
                          <CameraIcon/>
                          {comercio.galeriaImagenes.length + 1} Fotos
                      </span>
                  )}
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-dashed grid grid-cols-1 sm:grid-cols-3 gap-2">
                 <button
                  onClick={handleShareClick}
                  className={`flex items-center justify-center text-sm font-bold py-2 px-3 rounded-lg transition-colors ${isCopied ? 'bg-blue-500 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
                  title="Compartir"
                >
                    {isCopied ? '¡Copiado!' : <><ShareIcon className="h-4 w-4 mr-1.5" /> Compartir</>}
                </button>
                 {comercio.websiteUrl && (
                    <button 
                        onClick={(e) => handleTrackAndOpen('website_click', comercio.websiteUrl!, e)}
                        className="flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors"
                        title="Visitar Sitio Web"
                    >
                        <GlobeIcon className="h-5 w-5 mr-1.5"/> Web
                    </button>
                )}
                 <button 
                    onClick={(e) => handleTrackAndOpen('whatsapp_click', whatsappLink, e)}
                    className="sm:col-start-3 flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-3 rounded-lg hover:bg-gray-800 transition-colors"
                    title="Contactar por WhatsApp"
                >
                    <WhatsAppIcon className="h-5 w-5 mr-1.5" /> Contactar
                </button>
            </div>
        </div>
      )
  }

  // Render Nivel 4: Banner publicitario (tarjeta completa)
  return (
    <div 
      className="bg-white rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-1 transition-transform duration-300 flex flex-col cursor-pointer border-2 border-indigo-500 relative"
      onClick={() => onViewComercio(comercio)}
    >
        <FavoriteButton />
        <div className="relative">
            <img src={comercio.imagenUrl} alt={comercio.nombre} className="w-full h-48 object-cover" />
             <span className="absolute top-2 left-2 text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-semibold self-start">Recomendado</span>
        </div>
      <div className="p-4 flex flex-col flex-grow">
        <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full font-semibold self-start">{rubro.icon} {subRubro.nombre}</span>
        <h3 className="text-xl font-bold mt-2 mb-1 text-gray-900">{comercio.nombre}</h3>
        <div className="mb-2">
            <StarRating opiniones={comercio.opiniones} />
        </div>
        <p className="text-sm text-gray-600 mb-1">{locationString}</p>
        <DistanceInfo />

        {comercio.description && (
          <p className="text-sm text-gray-700 my-4 line-clamp-3">
            {comercio.description}
          </p>
        )}
        
        <div className="flex items-center space-x-4 text-gray-500 mt-2 mb-4">
            {comercio.websiteUrl && (
                <button onClick={(e) => handleTrackAndOpen('website_click', comercio.websiteUrl!, e)} title="Página Web" className="hover:text-indigo-600 transition-colors">
                    <GlobeIcon/>
                </button>
            )}
            {comercio.googleMapsUrl && (
                <a onClick={(e) => e.stopPropagation()} href={comercio.googleMapsUrl} target="_blank" rel="noopener noreferrer" title="Ubicación en Google Maps" className="hover:text-indigo-600 transition-colors">
                    <LocationMarkerIcon/>
                </a>
            )}
        </div>

        <div className="mt-auto pt-4 border-t grid grid-cols-2 gap-2">
            <button
              onClick={handleShareClick}
              className={`w-full flex items-center justify-center font-bold py-2 px-4 rounded-lg transition-colors ${isCopied ? 'bg-blue-500 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
            >
              <ShareIcon className="h-5 w-5 mr-2" />
              {isCopied ? '¡Copiado!' : 'Compartir'}
            </button>
            <button 
              onClick={(e) => handleTrackAndOpen('whatsapp_click', whatsappLink, e)}
              className="w-full flex items-center justify-center bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <WhatsAppIcon />
              Contactar
            </button>
        </div>
      </div>
    </div>
  );
};

export default BusinessCard;