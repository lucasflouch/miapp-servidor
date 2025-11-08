import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { AppData, Comercio, Provincia, PublicUser, Usuario, Ciudad } from '../types';
import FilterBar from '../components/FilterBar';
import BusinessCard from '../components/BusinessCard';
import BannerCard from '../components/BannerCard';
import PublicLogin from '../components/PublicLogin';
import StarRating from '../components/StarRating';

interface HomePageProps {
  data: AppData;
  onViewComercio: (comercio: Comercio) => void;
  publicUser: PublicUser | null;
  currentUser: Usuario | null; // Acepta el comerciante logueado
  onPublicRegister: (userData: Omit<PublicUser, 'id' | 'favorites' | 'history'>) => Promise<{ success: boolean; message: string }>;
  onPublicLogin: (credentials: Pick<PublicUser, 'email' | 'password'>) => Promise<{ success: boolean; message: string }>;
  onGoogleLogin: () => void;
  onToggleFavorite: (comercio: Comercio) => void;
}

const ITEMS_PER_PAGE = 8;
type ViewMode = 'list' | 'map';

// Extender el tipo Comercio para incluir la distancia opcional
type ComercioWithDistance = Comercio & { distance?: number };

// --- Función de cálculo de distancia (Haversine) ---
const haversineDistance = (coords1: { lat: number; lon: number }, coords2: { lat: number; lon: number }): number => {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371; // Radio de la Tierra en km

    const dLat = toRad(coords2.lat - coords1.lat);
    const dLon = toRad(coords2.lon - coords1.lon);
    const lat1 = toRad(coords1.lat);
    const lat2 = toRad(coords2.lat);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distancia en km
};

// --- Componente de Mapa Interactivo Simulado ---
interface MapViewProps {
  comercios: ComercioWithDistance[];
  onViewComercio: (comercio: Comercio) => void;
}

const MapView: React.FC<MapViewProps> = ({ comercios, onViewComercio }) => {
    const [activeComercio, setActiveComercio] = useState<ComercioWithDistance | null>(null);

    const mapComercios = useMemo(() => comercios.filter(c => c.lat != null && c.lon != null), [comercios]);

    const bounds = useMemo(() => {
        if (mapComercios.length === 0) return null;
        
        let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        
        mapComercios.forEach(c => {
            if(c.lat && c.lon) {
                if (c.lat < minLat) minLat = c.lat;
                if (c.lat > maxLat) maxLat = c.lat;
                if (c.lon < minLon) minLon = c.lon;
                if (c.lon > maxLon) maxLon = c.lon;
            }
        });

        // Añadir padding para que los pines no queden en el borde.
        const latPadding = (maxLat - minLat) * 0.1 || 0.01;
        const lonPadding = (maxLon - minLon) * 0.1 || 0.01;
        
        return {
            minLat: minLat - latPadding,
            maxLat: maxLat + latPadding,
            minLon: minLon - lonPadding,
            maxLon: maxLon + lonPadding
        };
    }, [mapComercios]);

    const getPosition = (lat: number, lon: number) => {
        if (!bounds) return { top: '50%', left: '50%' };
        
        const percentX = ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 100;
        const percentY = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
        
        return {
            left: `${Math.max(0, Math.min(100, percentX))}%`,
            top: `${Math.max(0, Math.min(100, percentY))}%`
        };
    };

    if (mapComercios.length === 0) {
        return (
            <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold text-gray-700">No hay comercios con ubicación para mostrar en el mapa</h3>
                <p className="text-gray-500 mt-2">Probá cambiando los filtros o volviendo a la vista de lista.</p>
            </div>
        );
    }
    
    return (
        <div className="relative w-full h-[600px] bg-blue-100 rounded-lg shadow-lg overflow-hidden border-4 border-white"
             onClick={() => setActiveComercio(null)} // Cierra el info window al hacer clic en el mapa
        >
            {mapComercios.map(c => (
                c.lat && c.lon && (
                    <div 
                        key={c.id} 
                        style={getPosition(c.lat, c.lon)}
                        className="absolute transform -translate-x-1/2 -translate-y-full"
                        onClick={(e) => { e.stopPropagation(); setActiveComercio(c); }}
                    >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-transform duration-200 ${activeComercio?.id === c.id ? 'scale-125' : 'hover:scale-110'}`}>
                            <div className="absolute w-3 h-3 rounded-full bg-indigo-600"></div>
                            <div className="absolute w-6 h-6 rounded-full bg-indigo-600 opacity-30 animate-ping"></div>
                        </div>
                         <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 text-xs font-bold text-gray-800 bg-white bg-opacity-70 px-2 py-0.5 rounded-full whitespace-nowrap">{c.nombre}</div>
                    </div>
                )
            ))}

            {activeComercio && (
                <div 
                    style={getPosition(activeComercio.lat!, activeComercio.lon!)}
                    className="absolute transform -translate-x-1/2 -translate-y-full mb-10 z-10 w-64 bg-white rounded-lg shadow-xl"
                    onClick={e => e.stopPropagation()}
                >
                    <img src={activeComercio.imagenUrl} alt={activeComercio.nombre} className="w-full h-24 object-cover rounded-t-lg" />
                    <div className="p-3">
                        <h4 className="font-bold text-md truncate">{activeComercio.nombre}</h4>
                        <StarRating opiniones={activeComercio.opiniones} />
                        <button 
                            onClick={() => onViewComercio(activeComercio)}
                            className="mt-2 w-full bg-indigo-600 text-white text-sm font-semibold py-1.5 px-3 rounded-md hover:bg-indigo-700"
                        >
                            Ver Detalles
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


const HomePage: React.FC<HomePageProps> = ({ data, onViewComercio, publicUser, currentUser, onPublicRegister, onPublicLogin, onGoogleLogin, onToggleFavorite }) => {
  const [displayedComercios, setDisplayedComercios] = useState<ComercioWithDistance[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLocationSearch, setIsLocationSearch] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');


  const handleSearch = useCallback((filters: { provinciaId: string; ciudadId: string; rubroId: string; subRubroId: string; nombre: string; barrio: string; }) => {
    setIsLocationSearch(false);
    let results = data.comercios;

    if (filters.provinciaId) {
      results = results.filter(comercio => comercio.provinciaId === filters.provinciaId);
    }
    if (filters.ciudadId) {
      results = results.filter(comercio => comercio.ciudadId === filters.ciudadId);
    }
    if (filters.barrio.trim()) {
      const searchTerm = filters.barrio.trim().toLowerCase();
      results = results.filter(comercio =>
        comercio.barrio?.toLowerCase().includes(searchTerm)
      );
    }
    if (filters.rubroId) {
      results = results.filter(comercio => comercio.rubroId === filters.rubroId);
    }
    if (filters.subRubroId) {
        results = results.filter(comercio => comercio.subRubroId === filters.subRubroId);
    }
    if (filters.nombre.trim()) {
      const searchTerm = filters.nombre.trim().toLowerCase();
      results = results.filter(comercio =>
        comercio.nombre.toLowerCase().includes(searchTerm)
      );
    }
    
    const sortedResults = results.sort((a, b) => (b.publicidad || 0) - (a.publicidad || 0));
    setDisplayedComercios(sortedResults);
    setCurrentPage(1);
  }, [data.comercios]);
  
  const handleLocationSearch = useCallback((coords: { lat: number; lon: number }) => {
    setIsLocationSearch(true);
    
    const comerciosWithDistance = data.comercios.map(c => {
        if (c.lat != null && c.lon != null) {
            const distance = haversineDistance(coords, { lat: c.lat, lon: c.lon });
            return { ...c, distance };
        }
        return { ...c, distance: Infinity }; // Poner al final los que no tienen coords
    });
    
    // Primero ordenar por distancia, luego por publicidad para desempatar
    comerciosWithDistance.sort((a, b) => {
        if (a.distance < b.distance) return -1;
        if (a.distance > b.distance) return 1;
        return (b.publicidad || 0) - (a.publicidad || 0);
    });

    setDisplayedComercios(comerciosWithDistance);
    setCurrentPage(1);
  }, [data.comercios]);


  useEffect(() => {
    if(data.comercios.length > 0) {
      handleSearch({
          provinciaId: '06',
          ciudadId: '060364',
          barrio: '',
          rubroId: '',
          subRubroId: '',
          nombre: ''
      });
    }
  }, [data.comercios, handleSearch]);

  const recommendations = useMemo(() => {
    if (!publicUser || (!publicUser.history?.length && !publicUser.favorites?.length)) {
        return [];
    }

    const interactedComercioIds = new Set([
        ...(publicUser.history?.map(h => h.comercioId) || []),
        ...(publicUser.favorites || [])
    ]);

    const interactedComercios = data.comercios.filter(c => interactedComercioIds.has(c.id));
    if (interactedComercios.length === 0) {
        return [];
    }

    const preferredRubros = new Set(interactedComercios.map(c => c.rubroId));
    const preferredCiudades = new Set(interactedComercios.map(c => c.ciudadId));

    const potentialRecommendations = data.comercios
        .filter(c => !interactedComercioIds.has(c.id))
        .map(c => {
            let score = 0;
            if (preferredRubros.has(c.rubroId)) score += 2;
            if (preferredCiudades.has(c.ciudadId)) score += 1;
            if (c.publicidad >= 4) score += 3; // Fuerte preferencia por comercios que se ven como tarjetas
            if (c.publicidad === 3) score += 0.5;
            return { comercio: c, score };
        })
        .filter(rec => rec.score > 0);

    potentialRecommendations.sort((a, b) => b.score - a.score);

    return potentialRecommendations.slice(0, 4).map(rec => rec.comercio);
  }, [publicUser, data.comercios]);


  const {
    homeBanners,
    headerBanners,
    listItems,
  } = useMemo(() => {
    return {
      homeBanners: displayedComercios.filter(c => c.publicidad === 6),
      headerBanners: displayedComercios.filter(c => c.publicidad === 5),
      listItems: displayedComercios.filter(c => c.publicidad <= 4),
    }
  }, [displayedComercios]);

  const totalPages = Math.ceil(listItems.length / ITEMS_PER_PAGE);
  const paginatedComercios = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return listItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [listItems, currentPage]);

  const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  
  const isUserLoggedIn = !!publicUser || !!currentUser;

  return (
    <div>
      {!isUserLoggedIn ? (
        <PublicLogin onRegister={onPublicRegister} onLogin={onPublicLogin} onGoogleLogin={onGoogleLogin} />
      ) : (
        <>
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md">
            {currentUser ? (
              <>
                <p className="font-bold">¡Hola, {currentUser.nombre}!</p>
                <p>Estás navegando la guía. Para gestionar tus comercios, andá a "Mi Panel".</p>
              </>
            ) : publicUser ? (
              <>
                <p className="font-bold">¡Bienvenido de vuelta, {publicUser.nombre}!</p>
                <p>Ya podés calificar comercios y guardar tus favoritos.</p>
              </>
            ) : null}
          </div>

          {publicUser && recommendations.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Recomendado para vos</h2>
              <p className="text-gray-600 mb-6">Basado en tu actividad reciente, quizás te interese visitar estos comercios.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendations.map((comercio, index) => {
                  const rubro = data.rubros.find(r => r.id === comercio.rubroId);
                  const subRubro = data.subRubros.find(sr => sr.id === comercio.subRubroId);
                  if (rubro && subRubro) {
                    return (
                       <div key={`rec-${comercio.id}`} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                         <BusinessCard
                          comercio={comercio}
                          rubro={rubro}
                          subRubro={subRubro}
                          onViewComercio={onViewComercio}
                          publicUser={publicUser}
                          isFavorite={publicUser.favorites.includes(comercio.id)}
                          onToggleFavorite={onToggleFavorite}
                        />
                       </div>
                    );
                  }
                  return null;
                })}
              </div>
            </section>
          )}
        
          {homeBanners.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Exclusivo en GuíaComercial</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {homeBanners.map((comercio, index) => (
                   <div key={comercio.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <BannerCard 
                      comercio={comercio} 
                      level={6} 
                      onViewComercio={onViewComercio}
                      publicUser={publicUser}
                      isFavorite={publicUser?.favorites.includes(comercio.id) || false}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {headerBanners.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Comercios Destacados</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {headerBanners.map((comercio, index) => (
                   <div key={comercio.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <BannerCard 
                      comercio={comercio} 
                      level={5} 
                      onViewComercio={onViewComercio}
                      publicUser={publicUser}
                      isFavorite={publicUser?.favorites.includes(comercio.id) || false}
                      onToggleFavorite={onToggleFavorite}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Encontrá lo que buscás</h2>
            <p className="text-gray-600 mb-6">Filtrá por provincia, ciudad, barrio, rubro y sub-rubro para descubrir los mejores comercios locales.</p>
            <FilterBar 
              provincias={data.provincias} 
              ciudades={data.ciudades}
              rubros={data.rubros}
              subRubros={data.subRubros}
              onSearch={handleSearch}
              onLocationSearch={handleLocationSearch}
            />
             {isLocationSearch && (
                <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-6 rounded-md">
                    <p className="font-bold">Mostrando comercios más cercanos a tu ubicación.</p>
                </div>
             )}

            {/* --- Interruptor de Vista --- */}
            <div className="flex justify-end items-center mb-6">
                <span className="text-sm font-medium text-gray-700 mr-3">Vista:</span>
                <div className="flex items-center bg-gray-200 rounded-full p-1">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${viewMode === 'list' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600'}`}>Lista</button>
                    <button onClick={() => setViewMode('map')} className={`px-4 py-1 text-sm font-semibold rounded-full transition-colors ${viewMode === 'map' ? 'bg-white text-indigo-600 shadow' : 'text-gray-600'}`}>Mapa</button>
                </div>
            </div>

            {displayedComercios.length > 0 ? (
              <>
                {viewMode === 'list' ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {paginatedComercios.map((comercio, index) => {
                        const rubro = data.rubros.find(r => r.id === comercio.rubroId);
                        const subRubro = data.subRubros.find(sr => sr.id === comercio.subRubroId);
                        if (rubro && subRubro) {
                          return (
                            <div 
                              key={comercio.id} 
                              className={`${comercio.publicidad < 4 ? 'sm:col-span-2 lg:col-span-3 xl:col-span-4' : ''} animate-fade-in-up`}
                              style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <BusinessCard 
                                  comercio={comercio}
                                  rubro={rubro}
                                  subRubro={subRubro}
                                  onViewComercio={onViewComercio} 
                                  publicUser={publicUser}
                                  isFavorite={publicUser?.favorites.includes(comercio.id) || false}
                                  onToggleFavorite={onToggleFavorite}
                                  distance={comercio.distance}
                                />
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                     {totalPages > 1 && (
                      <div className="flex justify-center items-center mt-12 space-x-4" aria-label="Paginación">
                        <button onClick={goToPreviousPage} disabled={currentPage === 1} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Anterior</button>
                        <span className="text-gray-700 font-medium">Página {currentPage} de {totalPages}</span>
                        <button onClick={goToNextPage} disabled={currentPage === totalPages} className="px-4 py-2 bg-indigo-600 text-white rounded-md font-semibold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors">Siguiente</button>
                      </div>
                    )}
                  </>
                ) : (
                  <MapView comercios={displayedComercios} onViewComercio={onViewComercio} />
                )}
              </>
            ) : (
              <div className="text-center py-16 px-4 bg-white rounded-lg shadow-md">
                <h3 className="text-2xl font-semibold text-gray-700">No se encontraron comercios</h3>
                <p className="text-gray-500 mt-2">Probá cambiando los filtros o limpiándolos para ver más resultados.</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default HomePage;