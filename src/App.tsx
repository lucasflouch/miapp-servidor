import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Page, Provincia, Ciudad, Rubro, SubRubro, Comercio, Banner, AppData, Usuario, Pago, PublicUser, Opinion, Conversation } from './types';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreateComercioPage from './pages/CreateComercioPage';
import ComercioDetailPage from './pages/ComercioDetailPage';
import AccountPage from './pages/AccountPage';
import PromotePage from './pages/PromotePage';
import ClientPage from './pages/ClientPage';
import AdminPage from './pages/AdminPage';
import ChatPage from './pages/ChatPage';
import * as api from './apiService';
import { NotificationProvider, useNotification } from './hooks/useNotification';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const [data, setData] = useState<AppData | null>(null);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [provinciasLoading, setProvinciasLoading] = useState(true);
  const [provinciasError, setProvinciasError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null); // Comerciante
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null); // Cliente público
  const [viewingComercio, setViewingComercio] = useState<Comercio | null>(null);
  const [promotingComercio, setPromotingComercio] = useState<Comercio | null>(null);
  const [chatTargetComercio, setChatTargetComercio] = useState<Comercio | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { showNotification } = useNotification();
  const prevConversationsRef = useRef<Conversation[]>([]);

  // Efecto para comprobar sesiones (comerciante y cliente) al cargar la app
  useEffect(() => {
    const checkSession = () => {
      const userFromSession = api.getCurrentUserFromSession();
      if (userFromSession) {
        setCurrentUser(userFromSession);
      }
      const publicUserFromStorage = localStorage.getItem('publicUserSession');
      if(publicUserFromStorage) {
        try {
          const parsedUser: PublicUser = JSON.parse(publicUserFromStorage);
          setPublicUser(parsedUser);
        } catch(e) {
          console.error("Error parsing public user session:", e);
          localStorage.removeItem('publicUserSession');
        }
      }
    };
    checkSession();
  }, []);
  
  // Efecto para actualizar el contador de no leídos
  useEffect(() => {
    const count = currentUser?.unreadMessageCount || publicUser?.unreadMessageCount || 0;
    setUnreadCount(count);
  }, [currentUser, publicUser]);

  const viewingSubRubro = useMemo(() => {
    if (currentPage === Page.ComercioDetail && viewingComercio && data) {
        return data.subRubros.find(sr => sr.id === viewingComercio.subRubroId);
    }
    return null;
  }, [currentPage, viewingComercio, data]);

  // Efecto para actualizar el título del documento (SEO)
  useEffect(() => {
    if (currentPage === Page.ComercioDetail && viewingComercio && viewingSubRubro) {
      document.title = `${viewingSubRubro.nombre} en ${viewingComercio.ciudadNombre} | ${viewingComercio.nombre}`;
    } else {
      document.title = 'Guía de Comercios Locales';
    }
  }, [currentPage, viewingComercio, viewingSubRubro]);


  useEffect(() => {
    const controller = new AbortController();
    
    const fetchProvincias = async () => {
      setProvinciasLoading(true);
      setProvinciasError(null);
      try {
        const response = await fetch('https://apis.datos.gob.ar/georef/api/v2.0/provincias?campos=id,nombre&orden=nombre', {
          signal: controller.signal
        });
        
        if (!response.ok) {
          throw new Error(`El servidor de geolocalización respondió con el estado: ${response.status}`);
        }
        const apiData = await response.json();
        const mappedProvincias = apiData.provincias.map((p: any) => ({ id: p.id, nombre: p.nombre }));
        setProvincias(mappedProvincias);
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') {
          console.log('Fetch de provincias abortado en cleanup.');
        } else {
          const errorMessage = e instanceof Error ? e.message : 'Error desconocido';
          console.error("Could not load provinces from external API:", e);
          setProvinciasError(`No se pudo conectar con el servicio de geolocalización de Argentina. Se usará una lista de prueba limitada. (Error: ${errorMessage})`);
        }
      } finally {
        if (!controller.signal.aborted) {
            setProvinciasLoading(false);
        }
      }
    };

    fetchProvincias();

    return () => {
      controller.abort();
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiData = await api.getData();
      
      const normalizedComercios = apiData.comercios.map(comercio => ({
        ...comercio,
        opiniones: Array.isArray(comercio.opiniones) ? comercio.opiniones : [],
      }));
      const normalizedData = { ...apiData, comercios: normalizedComercios };

      setData(normalizedData);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      console.error("Error al cargar datos:", errorMessage);
      setError(`Error al cargar los datos locales: ${errorMessage}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efecto para notificaciones de publicaciones por vencer
  useEffect(() => {
    if (currentUser && data) {
      const managedComercios = data.comercios.filter(c => c.usuarioId === currentUser.id);
      managedComercios.forEach(comercio => {
        if (comercio.vencimientoPublicidad) {
          const vencimiento = new Date(comercio.vencimientoPublicidad);
          const hoy = new Date();
          const diasRestantes = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

          if (diasRestantes >= 0 && diasRestantes <= 7) {
            const notificationKey = `notif_expire_${comercio.id}`;
            if (!sessionStorage.getItem(notificationKey)) {
              showNotification(`Tu publicación para "${comercio.nombre}" vence en ${diasRestantes} día(s).`, 'warning');
              sessionStorage.setItem(notificationKey, 'true');
            }
          }
        }
      });
    }
  }, [data, currentUser, showNotification]);

  // Efecto para polling y notificaciones de nuevos mensajes
  useEffect(() => {
    const pollForNewMessages = async () => {
        if (document.hidden || !currentUser) return; // No hacer nada si la pestaña no está activa o no hay usuario

        try {
            const conversations = await api.getConversations(currentUser.id);
            if (prevConversationsRef.current.length > 0) {
                conversations.forEach(newConvo => {
                    const oldConvo = prevConversationsRef.current.find(c => c.id === newConvo.id);
                    const isNewer = oldConvo && newConvo.lastMessageTimestamp && oldConvo.lastMessageTimestamp &&
                                    new Date(newConvo.lastMessageTimestamp) > new Date(oldConvo.lastMessageTimestamp);
                    
                    if (isNewer && newConvo.lastMessageSenderId !== currentUser.id) {
                         // Es un mensaje nuevo de la otra persona
                         const senderName = 'apellido' in currentUser ? newConvo.comercioNombre : newConvo.clienteNombre;
                         showNotification(`Nuevo mensaje de ${senderName}`, 'info');
                    }
                });
            }
            prevConversationsRef.current = conversations;
        } catch (e) {
            console.error("Error during message poll:", e);
        }
    };

    const intervalId = setInterval(pollForNewMessages, 15000); // Polling cada 15 segundos
    return () => clearInterval(intervalId);

  }, [currentUser, showNotification]);


  const navigate = useCallback((page: Page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const managedComercios = useMemo(() => 
    currentUser && data ? data.comercios.filter(c => c.usuarioId === currentUser.id) : []
  , [currentUser, data]);
  
  const managedBanners = useMemo(() =>
    currentUser && data ? data.banners.filter(b => managedComercios.some(c => c.id === b.comercioId)) : []
  , [currentUser, data, managedComercios]);

  const managedPagos = useMemo(() =>
    currentUser && data ? data.pagos.filter(p => managedComercios.some(c => c.id === p.comercioId)) : []
  , [currentUser, data, managedComercios]);


  const handleRegister = async (userData: Omit<Usuario, 'id'>): Promise<{ success: boolean; message: string; email?: string; verificationCode?: string; }> => {
    try {
      const result = await api.registerUser(userData);
      return { success: true, message: result.message, email: result.email, verificationCode: result.verificationCode };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
      return { success: false, message };
    }
  };

  const handleLogin = async (credentials: Pick<Usuario, 'email' | 'password'>, keepSession: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const loggedInUser = await api.loginUser(credentials, keepSession);
      setCurrentUser(loggedInUser);
      navigate(Page.Dashboard);
      return { success: true, message: 'Inicio de sesión exitoso' };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
      return { success: false, message };
    }
  };

  const handleLogout = () => {
    api.logoutUser();
    setCurrentUser(null);
    setViewingComercio(null);
    navigate(Page.Home);
  };
  
  const handlePublicRegister = async (userData: Omit<PublicUser, 'id' | 'favorites' | 'history'>): Promise<{ success: boolean; message: string }> => {
    try {
        const registeredUser = await api.registerPublicUser(userData);
        const loggedInUser = await api.loginPublicUser({ email: registeredUser.email, password: userData.password! });
        setPublicUser(loggedInUser);
        return { success: true, message: 'Registro e inicio de sesión exitosos.' };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
        return { success: false, message };
    }
  };

  const handlePublicLogin = async (credentials: Pick<PublicUser, 'email' | 'password'>): Promise<{ success: boolean; message: string }> => {
    try {
        const loggedInUser = await api.loginPublicUser(credentials);
        setPublicUser(loggedInUser);
        return { success: true, message: 'Inicio de sesión exitoso.' };
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido';
        return { success: false, message };
    }
  };
  
  const handleGoogleLogin = () => {
    const mockUser: PublicUser = {
        id: 'pub-google-123',
        nombre: 'Usuario',
        apellido: 'Google',
        email: 'usuario.google@example.com',
        favorites: [],
        history: [],
        unreadMessageCount: 0,
    };
    setPublicUser(mockUser);
    localStorage.setItem('publicUserSession', JSON.stringify(mockUser));
  };

  const handlePublicLogout = useCallback(() => {
    setPublicUser(null);
    localStorage.removeItem('publicUserSession');
    navigate(Page.Home);
  }, [navigate]);

  const updatePublicUserWithInteraction = useCallback(async (updatedUser: PublicUser) => {
    try {
        setPublicUser(updatedUser); // Optimistic update
        await api.updatePublicUser(updatedUser);
    } catch (e) {
        console.error("Failed to sync public user data:", e);
        alert("Hubo un problema al guardar tu acción. Por favor, intentá de nuevo.");
        // Podríamos revertir el estado aquí si fuera necesario
    }
  }, []);

  const handleToggleFavorite = useCallback((comercio: Comercio) => {
    if (!publicUser) return;
    
    const isFavorite = publicUser.favorites.includes(comercio.id);
    const newFavorites = isFavorite
      ? publicUser.favorites.filter(id => id !== comercio.id)
      : [...publicUser.favorites, comercio.id];
    
    const newInteraction = {
        comercioId: comercio.id,
        comercioNombre: comercio.nombre,
        type: 'favorite' as const,
        timestamp: new Date().toISOString()
    };
    
    const updatedUser = { 
        ...publicUser, 
        favorites: newFavorites,
        history: [newInteraction, ...publicUser.history].slice(0, 50) // Limitar historial a 50
    };

    updatePublicUserWithInteraction(updatedUser);
  }, [publicUser, updatePublicUserWithInteraction]);

  const handleCreateComercio = useCallback(async (newComercioData: Omit<Comercio, 'id' | 'usuarioId'>) => {
     if (!currentUser) return;

    const newComercioWithUser: Omit<Comercio, 'id'> = {
        ...newComercioData,
        usuarioId: currentUser.id
    };

    try {
        const createdComercio = await api.createComercio(newComercioWithUser);
        
        setData(prevData => prevData ? ({
            ...prevData,
            comercios: [...prevData.comercios, createdComercio]
        }) : null);
        
        setViewingComercio(createdComercio);
        navigate(Page.ComercioDetail);
        const galleryMessage = createdComercio.galeriaImagenes && createdComercio.galeriaImagenes.length > 0
            ? ` Se cargaron ${createdComercio.galeriaImagenes.length} imágenes en la galería.`
            : '';
        alert(`¡Tu comercio "${createdComercio.nombre}" ha sido creado con éxito!${galleryMessage}`);

    } catch(e) {
        const message = e instanceof Error ? e.message : "No se pudo crear el comercio.";
        console.error(e);
        alert(message);
    }
  }, [currentUser, navigate]);
  
  const handleUpdateComercio = useCallback(async (updatedComercio: Comercio) => {
    try {
      const returnedComercio = await api.updateComercio(updatedComercio);
      
      setData(prevData => {
        if (!prevData) return null;
        const updatedComercios = prevData.comercios.map(c => 
            c.id === returnedComercio.id ? returnedComercio : c
        );
        return { ...prevData, comercios: updatedComercios };
      });

      alert("El comercio ha sido actualizado con éxito.");
      return true;
    } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudieron guardar los cambios.';
        console.error(e);
        alert(message);
        return false;
    }
  }, []);

  const handleUpdateUser = useCallback(async (updatedUserData: Pick<Usuario, 'nombre' | 'telefono'>) => {
    if (!currentUser) return;
    try {
      const updatedUser = await api.updateUser(currentUser.id, updatedUserData);
      setCurrentUser(updatedUser); // Actualizar el usuario en sesión
      setData(prevData => { // Actualizar la lista maestra de usuarios
        if (!prevData) return null;
        return {
          ...prevData,
          usuarios: prevData.usuarios.map(u => u.id === updatedUser.id ? updatedUser : u)
        };
      });
      alert('Tus datos han sido actualizados.');
    } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudieron actualizar tus datos.';
        console.error(e);
        alert(message);
    }
  }, [currentUser]);


  const handleDeleteComercio = useCallback(async (comercioId: string) => {
    try {
        await api.deleteComercio(comercioId);
        await fetchData();
        return true;
    } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo eliminar el comercio.';
        console.error(e);
        alert(message);
        return false;
    }
  }, [fetchData]);

  const handleResetData = useCallback(async () => {
    if (window.confirm("¿Estás seguro de que querés borrar TODOS los datos y restaurar los de prueba? Esta acción no se puede deshacer.")) {
        try {
            await api.resetData();
            alert("Los datos han sido restaurados.");
            await fetchData();
            setCurrentUser(null);
            setPublicUser(null);
            navigate(Page.Home);
        } catch (e) {
            console.error(e);
            alert("No se pudieron restaurar los datos.");
        }
    }
  }, [fetchData, navigate]);
  
  const handleViewComercio = useCallback((comercio: Comercio) => {
    api.trackEvent(comercio.id, 'view', publicUser?.id).catch(console.error);

    if (publicUser && !publicUser.history.some(h => h.comercioId === comercio.id && h.type === 'view')) {
         const newInteraction = {
            comercioId: comercio.id,
            comercioNombre: comercio.nombre,
            type: 'view' as const,
            timestamp: new Date().toISOString()
        };
        const updatedUser = { 
            ...publicUser, 
            history: [newInteraction, ...publicUser.history].slice(0, 50)
        };
       updatePublicUserWithInteraction(updatedUser);
    }
    setViewingComercio(comercio);
    navigate(Page.ComercioDetail);
  }, [navigate, publicUser, updatePublicUserWithInteraction]);

  const handleNavigateToPromote = useCallback((comercio: Comercio) => {
    setPromotingComercio(comercio);
    navigate(Page.Promote);
  }, [navigate]);

  const handleAddOpinion = useCallback(async (comercioId: string, opinionData: { rating: number; texto: string }, viewer: Usuario | PublicUser | null) => {
    if (!viewer) {
        alert("Debés iniciar sesión para dejar una opinión.");
        return;
    }
    
    const isPublic = 'apellido' in viewer;
    const usuarioNombre = isPublic ? `${viewer.nombre} ${(viewer as PublicUser).apellido.charAt(0)}.` : viewer.nombre;

    const newOpinion: Opinion = {
      id: `temp-${Date.now()}`,
      usuarioId: viewer.id,
      usuarioNombre,
      rating: opinionData.rating,
      texto: opinionData.texto,
      timestamp: new Date().toISOString(),
      likes: [],
    };

    setData(prevData => {
      if (!prevData) return null;
      const updatedComercios = prevData.comercios.map(c => {
        if (c.id === comercioId) {
          const currentOpinions = Array.isArray(c.opiniones) ? c.opiniones : [];
          return { ...c, opiniones: [...currentOpinions, newOpinion] };
        }
        return c;
      });
      return { ...prevData, comercios: updatedComercios };
    });

    setViewingComercio(prev => {
        if (prev?.id === comercioId) {
            const currentOpinions = Array.isArray(prev.opiniones) ? prev.opiniones : [];
            return { ...prev, opiniones: [...currentOpinions, newOpinion] };
        }
        return prev;
    });

    try {
        const updatedComercio = await api.addOpinion(comercioId, {
            usuarioId: viewer.id,
            usuarioNombre: usuarioNombre,
            ...opinionData
        });

        setData(prevData => {
            if (!prevData) return null;
            const finalUpdatedComercios = prevData.comercios.map(c =>
                c.id === updatedComercio.id ? { ...updatedComercio, opiniones: Array.isArray(updatedComercio.opiniones) ? updatedComercio.opiniones : [] } : c
            );
            return { ...prevData, comercios: finalUpdatedComercios };
        });
        
        const syncedViewingComercio = { ...updatedComercio, opiniones: Array.isArray(updatedComercio.opiniones) ? updatedComercio.opiniones : [] };
        setViewingComercio(prev => prev?.id === updatedComercio.id ? syncedViewingComercio : prev);

        if (isPublic && publicUser) {
            const newInteraction = {
                comercioId: comercioId,
                comercioNombre: updatedComercio.nombre,
                type: 'opinion' as const,
                timestamp: new Date().toISOString()
            };
            const updatedUser = { 
                ...publicUser, 
                history: [newInteraction, ...publicUser.history].slice(0, 50)
            };
            updatePublicUserWithInteraction(updatedUser);
        }

    } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo guardar tu opinión.';
        console.error("Error al guardar la opinión.", e);
        alert("Error al guardar la opinión.");
        fetchData();
    }
  }, [publicUser, updatePublicUserWithInteraction, fetchData]);

  const handleReplyToOpinion = useCallback(async (comercioId: string, opinionId: string, texto: string) => {
    if (!currentUser) {
        alert("Solo el dueño del comercio puede responder.");
        return;
    }
    try {
        const updatedComercio = await api.addOpinionReply(comercioId, opinionId, texto, currentUser.id);
        
        setData(prevData => {
            if (!prevData) return null;
            const updatedComercios = prevData.comercios.map(c => c.id === updatedComercio.id ? updatedComercio : c);
            return { ...prevData, comercios: updatedComercios };
        });
        setViewingComercio(prev => prev?.id === updatedComercio.id ? updatedComercio : prev);

    } catch (e) {
        const message = e instanceof Error ? e.message : 'No se pudo guardar la respuesta.';
        console.error("Error al guardar la respuesta.", e);
        alert(message);
    }
  }, [currentUser]);

  const handleToggleLike = useCallback(async (comercioId: string, opinionId: string) => {
    if (!publicUser) {
        alert("Debés iniciar sesión como cliente para dar 'me gusta'.");
        return;
    }

    const updateOpinions = (opinions: Opinion[]) => {
        return opinions.map(op => {
            if (op.id === opinionId) {
                const likes = op.likes || [];
                const hasLiked = likes.includes(publicUser.id);
                const newLikes = hasLiked ? likes.filter(id => id !== publicUser.id) : [...likes, publicUser.id];
                return { ...op, likes: newLikes };
            }
            return op;
        });
    };

    setData(prevData => {
        if (!prevData) return null;
        const updatedComercios = prevData.comercios.map(c => 
            c.id === comercioId ? { ...c, opiniones: updateOpinions(c.opiniones) } : c
        );
        return { ...prevData, comercios: updatedComercios };
    });

    setViewingComercio(prev => {
        if (prev?.id === comercioId) {
            return { ...prev, opiniones: updateOpinions(prev.opiniones) };
        }
        return prev;
    });

    try {
        await api.toggleOpinionLike(comercioId, opinionId, publicUser.id);
    } catch (e) {
        console.error("Error al dar 'me gusta'.", e);
        alert("No se pudo procesar tu 'me gusta'. Reintentando...");
        fetchData();
    }
  }, [publicUser, fetchData]);
  
  const handleStartChat = useCallback((comercio: Comercio) => {
    if (!publicUser) {
      alert("Debés iniciar sesión como cliente para enviar un mensaje.");
      return;
    }
    setChatTargetComercio(comercio);
    navigate(Page.Chat);
  }, [publicUser, navigate]);
  
  const handleUnreadCountUpdate = (newCount: number) => {
    setUnreadCount(newCount);
    const userToUpdate = currentUser || publicUser;
    if (userToUpdate) {
        if ('apellido' in userToUpdate) {
            setPublicUser(prev => prev ? ({ ...prev, unreadMessageCount: newCount }) : null);
        } else {
            setCurrentUser(prev => prev ? ({ ...prev, unreadMessageCount: newCount }) : null);
        }
    }
  };


  const renderPage = () => {
    if (loading || provinciasLoading) {
      return (
        <div className="flex justify-center items-center h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-600 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800">{provinciasLoading ? "Cargando geolocalización..." : "Cargando datos..."}</h1>
            <p className="text-gray-600">Por favor, espere un momento.</p>
          </div>
        </div>
      );
    }
    
    if (error || !data) {
       return (
        <div className="flex justify-center items-center h-screen">
          <div className="text-center bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative max-w-lg" role="alert">
            <strong className="font-bold">Error de Carga</strong>
            <span className="block sm:inline ml-2">{error || "No se pudieron cargar los datos."}</span>
            <p className="text-sm mt-2">Esto puede ocurrir si el servidor está inactivo. Por favor, esperá un momento y volvé a intentarlo.</p>
            <button
              onClick={() => fetchData()}
              className="mt-4 bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700 transition-colors"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }

    const finalProvincias = provincias.length > 0 ? provincias : data.provincias;
    const viewer = currentUser || publicUser;

    switch (currentPage) {
      case Page.Login:
        return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      
      case Page.Dashboard:
        if (!currentUser) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        return (
          <DashboardPage 
            currentUser={currentUser}
            comercios={managedComercios} 
            provincias={finalProvincias}
            rubros={data.rubros}
            subRubros={data.subRubros}
            onUpdate={handleUpdateComercio}
            onDelete={handleDeleteComercio}
            onCreateNew={() => navigate(Page.CreateComercio)}
            onNavigateToAccount={() => navigate(Page.Account)}
            onPreviewComercio={handleViewComercio}
            onNavigateToPromote={handleNavigateToPromote}
            onNavigateToChat={() => navigate(Page.Chat)}
          />
        );

      case Page.CreateComercio:
        if (!currentUser) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        return (
            <CreateComercioPage 
                provincias={finalProvincias}
                rubros={data.rubros}
                subRubros={data.subRubros}
                onCreate={handleCreateComercio}
            />
        );
        
       case Page.ComercioDetail:
        if (!viewingComercio) {
          navigate(Page.Home);
          return null;
        }
        const rubro = data.rubros.find(r => r.id === viewingComercio.rubroId);
        
        if (!rubro || !viewingSubRubro) {
          alert("Error: Faltan datos del rubro/sub-rubro para mostrar la vista previa. Volviendo al inicio.");
          navigate(Page.Home);
          return null;
        }
        
        return (
            <ComercioDetailPage
                comercio={viewingComercio}
                rubro={rubro}
                subRubro={viewingSubRubro}
                onBackToList={() => navigate(Page.Home)}
                onEditInPanel={() => navigate(Page.Dashboard)}
                viewer={viewer}
                onAddOpinion={(opinionData) => handleAddOpinion(viewingComercio.id, opinionData, viewer)}
                onStartChat={handleStartChat}
                onReplyToOpinion={handleReplyToOpinion}
                onToggleLike={handleToggleLike}
            />
        );
      
      case Page.Account:
        if (!currentUser) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        return (
            <AccountPage
                currentUser={currentUser}
                comercios={managedComercios}
                banners={managedBanners}
                pagos={managedPagos}
                onNavigateToDashboard={() => navigate(Page.Dashboard)}
                onUpdateUser={handleUpdateUser}
            />
        );
      
      case Page.Promote:
        if (!currentUser || !promotingComercio) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        return (
            <PromotePage
                comercio={promotingComercio}
                onPaymentSuccess={() => {
                    fetchData();
                    navigate(Page.Dashboard);
                }}
                onBack={() => navigate(Page.Dashboard)}
            />
        );
      
      case Page.ClientDashboard:
        if (!publicUser) {
          navigate(Page.Home);
          return null;
        }
        const favoriteComercios = data.comercios.filter(c => publicUser.favorites.includes(c.id));
        return (
          <ClientPage
            publicUser={publicUser}
            favoriteComercios={favoriteComercios}
            rubros={data.rubros}
            subRubros={data.subRubros}
            onViewComercio={handleViewComercio}
            onNavigateToMerchantLogin={() => navigate(Page.Login)}
            onToggleFavorite={handleToggleFavorite}
            onNavigateToChat={() => navigate(Page.Chat)}
          />
        );
      
      case Page.Admin:
        if (!currentUser || !api.isAdmin(currentUser.email)) {
            navigate(Page.Home);
            return null;
        }
        return <AdminPage 
          rubros={data.rubros} 
          comercios={data.comercios}
          usuarios={data.usuarios}
          pagos={data.pagos}
        />;

      case Page.Chat:
        if (!viewer) {
          navigate(Page.Home);
          return null;
        }
        return (
          <ChatPage
            currentUser={viewer}
            targetComercio={chatTargetComercio}
            onViewComercio={handleViewComercio}
            onUnreadCountChange={handleUnreadCountUpdate}
            onClearTarget={() => setChatTargetComercio(null)}
          />
        );

      case Page.Home:
      default:
        return (
          <HomePage 
            data={data} 
            provincias={finalProvincias} 
            onViewComercio={handleViewComercio}
            publicUser={publicUser}
            currentUser={currentUser}
            onPublicRegister={handlePublicRegister}
            onPublicLogin={handlePublicLogin}
            onGoogleLogin={handleGoogleLogin}
            onToggleFavorite={handleToggleFavorite}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header 
        currentUser={currentUser}
        publicUser={publicUser}
        onNavigate={navigate}
        onLogout={handleLogout}
        onPublicLogout={handlePublicLogout}
        onResetData={handleResetData}
        unreadCount={unreadCount}
      />
      <main className="container mx-auto px-4 py-8">
        {provinciasError && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md" role="alert">
            <p className="font-bold">Aviso de Conexión Externa</p>
            <p>{provinciasError}</p>
          </div>
        )}
        {renderPage()}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <NotificationProvider>
    <AppContent />
  </NotificationProvider>
);

export default App;