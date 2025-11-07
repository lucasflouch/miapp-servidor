import React, { useState, useMemo, FormEvent } from 'react';
import { Comercio, Rubro, SubRubro, PublicUser, Opinion, Usuario } from '../types';
import StarRating from '../components/StarRating';
import * as api from '../apiService';

// --- Iconos para la UI ---
const WhatsAppIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 mr-2"} viewBox="0 0 24 24" fill="currentColor"> <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.267.651 4.383 1.803 6.166l-1.331 4.869 4.892-1.284zm7.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/> </svg>);
const GlobeIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 mr-2"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h10a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.707 4.293l1.414-1.414a1 1 0 011.414 0l1.414 1.414M12 21a9 9 0 100-18 9 9 0 000 18z" /> </svg>);
const LocationMarkerIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 mr-2"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /> <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /> </svg>);
const ShareIcon: React.FC<{className?: string}> = ({className}) => ( <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 mr-2"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.002l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.367a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" /> </svg>);
const ArrowLeftIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /> </svg>);
const ArrowRightIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /> </svg>);
const CloseIcon: React.FC = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>);
const ChatIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5 mr-2"} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>);
const ThumbUpIcon: React.FC<{className?: string}> = ({className}) => (<svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333V17a1 1 0 001 1h6.758a1 1 0 00.97-1.226l-1.395-4.586a1.5 1.5 0 00-1.423-1.053H9.5a1.5 1.5 0 00-1.5 1.5v.002zM6 9.333V5.5A1.5 1.5 0 017.5 4h1a1.5 1.5 0 011.5 1.5v1.333a1.5 1.5 0 01-1.5 1.5h-1A1.5 1.5 0 016 9.333z" /></svg>);


const InteractiveStar: React.FC<{ filled: boolean, onMouseEnter: () => void, onClick: () => void, onMouseLeave: () => void }> = ({ filled, onMouseEnter, onClick, onMouseLeave }) => (
  <svg
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
    onClick={onClick}
    className={`w-8 h-8 cursor-pointer transition-transform duration-150 transform hover:scale-125 ${filled ? 'text-yellow-400' : 'text-gray-300'}`}
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

interface ReportModalProps {
    comercioId: string;
    usuarioId?: string;
    onClose: () => void;
}

const ReportModal: React.FC<ReportModalProps> = ({ comercioId, usuarioId, onClose }) => {
    const [motivo, setMotivo] = useState('');
    const [detalles, setDetalles] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!motivo) {
            setError('Por favor, seleccioná un motivo.');
            return;
        }
        setError('');
        setIsSubmitting(true);
        try {
            await api.submitReporte({
                comercioId,
                motivo,
                detalles,
                usuarioId,
            });
            alert('Tu denuncia ha sido enviada. Gracias por ayudarnos a mantener la comunidad segura.');
            onClose();
        } catch (err) {
            const message = err instanceof Error ? err.message : 'No se pudo enviar la denuncia.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4 animate-fade-in-fast" onClick={onClose}>
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full transform animate-scale-in" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Denunciar Publicación</h3>
                {error && <p className="text-red-600 bg-red-100 p-3 rounded-md mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 mb-1">Motivo de la denuncia</label>
                        <select
                            id="motivo"
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                            required
                        >
                            <option value="">Seleccioná un motivo...</option>
                            <option value="informacion_incorrecta">La información es incorrecta o está desactualizada.</option>
                            <option value="contenido_inapropiado">El contenido es ofensivo o inapropiado.</option>
                            <option value="estafa">Parece ser una estafa o fraude.</option>
                            <option value="no_existe">El comercio ya no existe.</option>
                            <option value="otro">Otro motivo (especificar abajo).</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="detalles" className="block text-sm font-medium text-gray-700 mb-1">Detalles adicionales (Opcional)</label>
                        <textarea
                            id="detalles"
                            rows={4}
                            value={detalles}
                            onChange={e => setDetalles(e.target.value)}
                            placeholder="Aportá más detalles si es necesario."
                            className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Cancelar</button>
                        <button type="submit" disabled={isSubmitting} className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 disabled:bg-red-400">
                            {isSubmitting ? 'Enviando...' : 'Enviar Denuncia'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


interface ComercioDetailPageProps {
  comercio: Comercio;
  rubro: Rubro;
  subRubro: SubRubro;
  onBackToList: () => void;
  onEditInPanel: () => void;
  viewer: PublicUser | Usuario | null;
  onAddOpinion: (opinionData: { rating: number, texto: string }) => Promise<void>;
  onStartChat: (comercio: Comercio) => void;
  onReplyToOpinion: (comercioId: string, opinionId: string, texto: string) => Promise<void>;
  onToggleLike: (comercioId: string, opinionId: string) => Promise<void>;
}

const ComercioDetailPage: React.FC<ComercioDetailPageProps> = ({
  comercio,
  rubro,
  subRubro,
  onBackToList,
  onEditInPanel,
  viewer,
  onAddOpinion,
  onStartChat,
  onReplyToOpinion,
  onToggleLike
}) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // State for new opinion form
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for reply form
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  const isOwner = useMemo(() => viewer?.id === comercio.usuarioId, [viewer, comercio.usuarioId]);
  const isPublicUser = useMemo(() => viewer && 'apellido' in viewer, [viewer]);

  const allImages = useMemo(() => {
    return [comercio.imagenUrl, ...(comercio.galeriaImagenes || [])];
  }, [comercio]);

  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setIsGalleryOpen(true);
  };

  const closeGallery = () => setIsGalleryOpen(false);

  const goToNextImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % allImages.length);
  };

  const goToPrevImage = () => {
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + allImages.length) % allImages.length);
  };
  
  const handleOpinionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newRating === 0 || isSubmitting) return;
    setIsSubmitting(true);
    await onAddOpinion({ rating: newRating, texto: commentText });
    
    // Reset form after submission
    setNewRating(0);
    setHoverRating(0);
    setCommentText('');
    setIsSubmitting(false);
  };

  const handleReplySubmit = async (e: FormEvent, opinionId: string) => {
      e.preventDefault();
      if (!replyText.trim()) return;
      setIsSubmittingReply(true);
      await onReplyToOpinion(comercio.id, opinionId, replyText);
      setReplyingTo(null);
      setReplyText('');
      setIsSubmittingReply(false);
  };

  const handleTrackAndOpen = (eventType: 'whatsapp_click' | 'website_click', url: string) => {
      api.trackEvent(comercio.id, eventType, viewer?.id);
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

  const whatsappLink = `https://wa.me/${comercio.whatsapp}?text=Hola!%20Vi%20tu%20comercio%20en%20la%20Guía%20y%20quería%20consultar%20por...`;
  const fullLocationString = [comercio.barrio, comercio.ciudadNombre, comercio.provinciaNombre].filter(Boolean).join(', ');

  const hasUserAlreadyOpinado = useMemo(() => {
    return viewer && comercio.opiniones.some(op => op.usuarioId === viewer.id);
  }, [viewer, comercio.opiniones]);


  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        <div className="flex justify-between items-start mb-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{`${subRubro.nombre} en ${comercio.ciudadNombre} | ${comercio.nombre}`}</h1>
            <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                {isOwner && (
                    <button
                        onClick={onEditInPanel}
                        className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                    >
                        Editar en Panel
                    </button>
                )}
                <button
                    onClick={onBackToList}
                    className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                    &larr; Volver
                </button>
            </div>
        </div>

        <div className="mb-6">
            <StarRating opiniones={comercio.opiniones} />
        </div>
        
        <div className="relative mb-6">
          <img 
            src={comercio.imagenUrl} 
            alt={`Imagen principal de ${comercio.nombre}`}
            className={`w-full h-64 sm:h-80 object-cover rounded-lg shadow-md ${allImages.length > 1 ? 'cursor-pointer' : ''}`}
            onClick={() => allImages.length > 1 && openGallery(0)}
          />
           {allImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white text-sm px-3 py-1 rounded-full">
                {`1 / ${allImages.length} (Click para ver galería)`}
              </div>
            )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
                 <div className="flex items-center gap-2">
                    <span className="text-sm bg-gray-200 text-gray-800 px-3 py-1 rounded-full font-semibold">{rubro.icon} {rubro.nombre}</span>
                    <span className="text-gray-400">/</span>
                    <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full font-semibold">{subRubro.nombre}</span>
                </div>
                <p className="text-base text-gray-600 mt-4 mb-2">{fullLocationString}</p>
                 {comercio.direccion && <p className="text-base text-gray-800 mb-4">{comercio.direccion}</p>}
                
                {comercio.description && (
                    <div className="prose max-w-none text-gray-700">
                        <p>{comercio.description}</p>
                    </div>
                )}
            </div>

            <div className="md:col-span-1 space-y-4">
                 {isPublicUser && !isOwner && (
                    <button 
                        onClick={() => onStartChat(comercio)}
                        className="w-full flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ChatIcon />
                        Enviar Mensaje
                    </button>
                 )}
                 <button 
                    onClick={() => handleTrackAndOpen('whatsapp_click', whatsappLink)}
                    className="w-full flex items-center justify-center bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors"
                >
                    <WhatsAppIcon />
                    Contactar
                </button>
                <button
                    onClick={handleShareClick}
                    className={`w-full flex items-center justify-center font-bold py-3 px-4 rounded-lg transition-colors ${isCopied ? 'bg-blue-500 text-white' : 'bg-green-500 text-white hover:bg-green-600'}`}
                >
                    {isCopied ? (
                        '¡Enlace Copiado!'
                    ) : (
                        <>
                            <ShareIcon />
                            Compartir
                        </>
                    )}
                </button>
                {comercio.websiteUrl && (
                    <button 
                        onClick={() => handleTrackAndOpen('website_click', comercio.websiteUrl!)}
                        className="w-full flex items-center justify-center bg-gray-800 text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors"
                    >
                        <GlobeIcon />
                        Visitar Web
                    </button>
                )}
                {comercio.googleMapsUrl && (
                    <a 
                        href={comercio.googleMapsUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="w-full flex items-center justify-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <LocationMarkerIcon />
                        Ver en Maps
                    </a>
                )}
            </div>
        </div>

        {/* --- SECCIÓN DE OPINIONES --- */}
        <div className="mt-8 pt-8 border-t">
          <h3 className="text-2xl font-bold text-gray-800 mb-6">Opiniones de Clientes</h3>
          
          {comercio.opiniones && comercio.opiniones.length > 0 ? (
            <div className="space-y-6">
              {[...comercio.opiniones].reverse().map(opinion => (
                <div key={opinion.id}>
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">{opinion.usuarioNombre.charAt(0)}</span>
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-gray-800">{opinion.usuarioNombre}</p>
                                <p className="text-xs text-gray-500">{new Date(opinion.timestamp).toLocaleString('es-AR')}</p>
                            </div>
                            <StarRating opiniones={[opinion]} showText={false} />
                        </div>
                        {opinion.texto && <p className="text-gray-700 whitespace-pre-wrap mt-2">{opinion.texto}</p>}
                        
                        <div className="flex items-center gap-4 mt-3">
                           {isPublicUser && (
                                <button
                                    onClick={() => onToggleLike(comercio.id, opinion.id)}
                                    className={`flex items-center text-sm font-semibold transition-colors ${opinion.likes?.includes(viewer!.id) ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-500'}`}
                                >
                                    <ThumbUpIcon className="h-5 w-5 mr-1" />
                                    {opinion.likes?.length || 0}
                                </button>
                           )}
                           {isOwner && !opinion.respuesta && (
                                <button onClick={() => setReplyingTo(replyingTo === opinion.id ? null : opinion.id)} className="text-sm font-semibold text-gray-500 hover:text-indigo-600">
                                    Responder
                                </button>
                           )}
                        </div>
                      </div>
                    </div>
                    
                    {opinion.respuesta && (
                        <div className="mt-4 ml-10 md:ml-16 pl-4 border-l-2 border-indigo-200 bg-indigo-50 p-4 rounded-r-lg">
                            <p className="font-bold text-sm text-indigo-800">Respuesta del comerciante</p>
                            <p className="text-xs text-gray-500 mb-2">{new Date(opinion.respuesta.timestamp).toLocaleString('es-AR')}</p>
                            <p className="text-gray-700 whitespace-pre-wrap">{opinion.respuesta.texto}</p>
                        </div>
                    )}

                    {isOwner && replyingTo === opinion.id && (
                        <form onSubmit={(e) => handleReplySubmit(e, opinion.id)} className="mt-4 ml-10 md:ml-16">
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                rows={2}
                                placeholder="Escribí tu respuesta..."
                                required
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button type="button" onClick={() => setReplyingTo(null)} className="text-sm font-semibold py-1 px-3 rounded-md hover:bg-gray-100">Cancelar</button>
                                <button type="submit" disabled={isSubmittingReply} className="text-sm font-semibold bg-indigo-600 text-white py-1 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
                                    {isSubmittingReply ? 'Enviando...' : 'Enviar'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Todavía no hay opiniones. ¡Sé el primero en opinar!</p>
          )}

          {viewer && !isOwner && (
            <div className="mt-8 border-t pt-6">
              {hasUserAlreadyOpinado ? (
                <div className="bg-green-100 text-green-800 p-4 rounded-lg text-center font-semibold">
                  ¡Gracias por dejar tu opinión!
                </div>
              ) : (
                <form onSubmit={handleOpinionSubmit}>
                  <h4 className="font-semibold text-lg mb-2">Dejá tu opinión</h4>
                   <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tu calificación *</label>
                      <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, index) => {
                          const ratingValue = index + 1;
                          return (
                            <InteractiveStar
                              key={ratingValue}
                              filled={ratingValue <= (hoverRating || newRating)}
                              onMouseEnter={() => setHoverRating(ratingValue)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setNewRating(ratingValue)}
                            />
                          );
                        })}
                      </div>
                   </div>
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                    placeholder="¿Qué te pareció este comercio? (Opcional)"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || newRating === 0}
                    className="mt-3 bg-indigo-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400"
                  >
                    {isSubmitting ? 'Publicando...' : 'Publicar Opinión'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
        
        {/* --- SECCIÓN DE DENUNCIA --- */}
        <div className="text-center mt-8 pt-4 border-t border-dashed">
            <button onClick={() => setIsReportModalOpen(true)} className="text-sm text-gray-500 hover:text-red-600 transition-colors">
                Denunciar publicación
            </button>
        </div>
      </div>

       {isGalleryOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in-fast" onClick={closeGallery}>
          <div className="relative w-full max-w-4xl h-full max-h-[90vh] p-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeGallery} className="absolute -top-2 -right-2 text-white hover:text-gray-300 z-10" aria-label="Cerrar galería">
              <CloseIcon />
            </button>
            
            <div className="w-full h-full flex justify-center items-center">
                <img src={allImages[currentImageIndex]} alt={`Imagen ${currentImageIndex + 1} de ${comercio.nombre}`} className="max-w-full max-h-full object-contain rounded-lg"/>
            </div>

            <button onClick={goToPrevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-30 hover:bg-opacity-50 text-gray-800 p-3 rounded-full" aria-label="Imagen anterior">
              <ArrowLeftIcon/>
            </button>
            <button onClick={goToNextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-30 hover:bg-opacity-50 text-gray-800 p-3 rounded-full" aria-label="Siguiente imagen">
              <ArrowRightIcon/>
            </button>
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-70 text-white text-lg px-4 py-2 rounded-full">
                {`${currentImageIndex + 1} / ${allImages.length}`}
            </div>
          </div>
        </div>
      )}
      
      {isReportModalOpen && (
          <ReportModal
              comercioId={comercio.id}
              usuarioId={viewer?.id}
              onClose={() => setIsReportModalOpen(false)}
          />
      )}


      <style>{`
            @keyframes fade-in-fast {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .animate-fade-in-fast { animation: fade-in-fast 0.2s ease-out forwards; }
            @keyframes scale-in {
              from { transform: scale(0.95); opacity: 0; }
              to { transform: scale(1); opacity: 1; }
            }
            .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default ComercioDetailPage;