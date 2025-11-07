import React, { useState } from 'react';
import { Comercio, Opinion, PublicUser } from '../types';
import StarRating from './StarRating';
import * as api from '../apiService';

const HeartIcon: React.FC<{isFavorite: boolean}> = ({ isFavorite }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-7 w-7 transition-colors duration-200 ${isFavorite ? 'text-red-500' : 'text-white hover:text-red-200'}`} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
);

const ShareIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
    </svg>
);


interface BannerCardProps {
  comercio: Comercio;
  level: 5 | 6;
  onViewComercio: (comercio: Comercio) => void;
  publicUser: PublicUser | null;
  isFavorite: boolean;
  onToggleFavorite: (comercio: Comercio) => void;
}

const BannerCard: React.FC<BannerCardProps> = ({ comercio, level, onViewComercio, publicUser, isFavorite, onToggleFavorite }) => {
    const [isCopied, setIsCopied] = useState(false);
    const whatsappLink = `https://wa.me/${comercio.whatsapp}?text=Hola!%20Vi%20tu%20comercio%20destacado%20en%20la%20Guía%20y%20quería%20consultar%20por...`;
    const image = comercio.galeriaImagenes?.[0] || comercio.imagenUrl;
    const isPremium = level === 6;

    const handleTrackAndOpen = (eventType: 'whatsapp_click', url: string, e: React.MouseEvent) => {
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


  return (
    <div 
        className={`relative rounded-lg overflow-hidden shadow-2xl group ${isPremium ? 'min-h-[300px]' : 'min-h-[250px]'} cursor-pointer transform hover:scale-105 transition-transform duration-300`}
        onClick={() => onViewComercio(comercio)}
    >
      <img src={image} alt={`Banner de ${comercio.nombre}`} className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent group-hover:from-black/90 transition-all duration-300 flex flex-col justify-end p-6">
        {isPremium && <span className="absolute top-4 left-4 bg-yellow-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Exclusivo</span>}
         {publicUser && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(comercio); }}
              className="absolute top-4 right-4 p-1.5 bg-white/30 rounded-full shadow-md hover:bg-white/50 backdrop-blur-sm transition-colors z-10"
              aria-label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            >
              <HeartIcon isFavorite={isFavorite} />
            </button>
        )}
        <h3 className={`font-extrabold text-white drop-shadow-lg ${isPremium ? 'text-4xl' : 'text-3xl'}`}>{comercio.nombre}</h3>
        <div className="my-2 bg-black bg-opacity-20 rounded-full px-2 py-1 self-start">
            <StarRating opiniones={comercio.opiniones} />
        </div>
        <p className="text-lg text-white font-medium drop-shadow-md mb-4">{[comercio.ciudadNombre, comercio.provinciaNombre].filter(Boolean).join(', ')}</p>
        {isPremium && comercio.description && <p className="text-white drop-shadow-md mb-4 line-clamp-2">{comercio.description}</p>}
        <div className="flex items-center flex-wrap gap-4">
          <button 
            onClick={(e) => handleTrackAndOpen('whatsapp_click', whatsappLink, e)}
            className="bg-gray-800 text-white font-bold py-2 px-5 rounded-lg hover:bg-gray-900 transition-colors self-start shadow-lg"
          >
            ¡Contactar ahora!
          </button>
           <button
                onClick={handleShareClick}
                className={`flex items-center justify-center text-sm font-bold py-2 px-4 rounded-lg transition-colors ${isCopied ? 'bg-blue-500' : 'bg-green-500 hover:bg-green-600'} text-white shadow-lg`}
            >
                {isCopied ? '¡Copiado!' : <><ShareIcon className="h-4 w-4 mr-2" /> Compartir</>}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BannerCard;