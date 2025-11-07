import React from 'react';
import { PublicUser, Comercio, Rubro, SubRubro } from '../types';
import BusinessCard from '../components/BusinessCard';

interface ClientPageProps {
  publicUser: PublicUser;
  favoriteComercios: Comercio[];
  rubros: Rubro[];
  subRubros: SubRubro[];
  onViewComercio: (comercio: Comercio) => void;
  onToggleFavorite: (comercio: Comercio) => void;
  onNavigateToMerchantLogin: () => void;
  onNavigateToChat: () => void;
}

const InteractionIcon: React.FC<{ type: 'view' | 'favorite' | 'opinion' }> = ({ type }) => {
    switch (type) {
        case 'view':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
        case 'favorite':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>;
        case 'opinion':
            return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>;
        default:
            return null;
    }
};

const ClientPage: React.FC<ClientPageProps> = ({ publicUser, favoriteComercios, rubros, subRubros, onViewComercio, onToggleFavorite, onNavigateToMerchantLogin, onNavigateToChat }) => {
  const unreadCount = publicUser.unreadMessageCount || 0;
  
  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900">Bienvenido, {publicUser.nombre}</h1>
        <p className="mt-2 text-lg text-gray-600">
          Aquí podés encontrar tus comercios favoritos y gestionar tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
            {/* --- SECCIÓN: COMERCIOS FAVORITOS --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Mis Comercios Favoritos ({favoriteComercios.length})</h2>
                {favoriteComercios.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                    {favoriteComercios.map((comercio, index) => {
                    const rubro = rubros.find(r => r.id === comercio.rubroId);
                    const subRubro = subRubros.find(sr => sr.id === comercio.subRubroId);
                    if (rubro && subRubro) {
                        return (
                          <div key={comercio.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            <BusinessCard 
                                comercio={comercio}
                                rubro={rubro}
                                subRubro={subRubro}
                                onViewComercio={onViewComercio}
                                publicUser={publicUser}
                                isFavorite={true} // Siempre es favorito en esta página
                                onToggleFavorite={onToggleFavorite}
                            />
                          </div>
                        );
                    }
                    return null;
                    })}
                </div>
                ) : (
                <div className="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h3 className="mt-4 text-xl font-semibold text-gray-700">Aún no tenés favoritos</h3>
                    <p className="text-gray-500 mt-2">Explorá la guía y hacé clic en el corazón para guardar los comercios que te interesan.</p>
                </div>
                )}
            </div>
        </div>

        <div className="md:col-span-1 space-y-8">
            {/* --- SECCIÓN: BANDEJA DE ENTRADA --- */}
            <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold">Tus Mensajes</h2>
                <p className="mt-2 mb-4">Consultá tus conversaciones con los comercios.</p>
                <button 
                    onClick={onNavigateToChat}
                    className="relative bg-white text-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors shadow-md w-full"
                >
                    Ir a Bandeja de Entrada
                    {unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 flex h-6 w-6">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex items-center justify-center rounded-full h-6 w-6 bg-red-500 text-white text-xs font-bold">{unreadCount}</span>
                      </span>
                    )}
                </button>
            </div>

            {/* --- SECCIÓN: CONVERTIRSE EN COMERCIANTE --- */}
            <div className="bg-indigo-600 text-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold">¿Tenés un negocio?</h2>
                <p className="mt-2 mb-4">¡Registralo en nuestra guía y llegá a miles de nuevos clientes!</p>
                <button 
                onClick={onNavigateToMerchantLogin}
                className="bg-white text-indigo-600 font-bold py-2 px-4 rounded-lg hover:bg-indigo-50 transition-colors shadow-md w-full"
                >
                Convertirme en Comerciante
                </button>
            </div>
            
            {/* --- SECCIÓN: HISTORIAL DE ACTIVIDAD --- */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 border-b pb-3 mb-4">Actividad Reciente</h2>
                {publicUser.history && publicUser.history.length > 0 ? (
                    <ul className="space-y-3">
                        {publicUser.history.slice(0, 5).map((interaction, index) => (
                            <li key={index} className="flex items-center gap-3 text-sm">
                                <InteractionIcon type={interaction.type} />
                                <div className="flex-grow">
                                    <p className="text-gray-800">
                                        {interaction.type === 'view' && 'Viste'}
                                        {interaction.type === 'favorite' && 'Agregaste a favoritos'}
                                        {interaction.type === 'opinion' && 'Opinaste sobre'}
                                        <strong className="ml-1">{interaction.comercioNombre}</strong>
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {new Date(interaction.timestamp).toLocaleString('es-AR')}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">Aún no tenés actividad registrada.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClientPage;