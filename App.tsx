import React, { useState, useEffect, useCallback } from 'react';
import { Page, AppData, Usuario, Comercio, PublicUser } from './types';
import * as api from './apiService';
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
import { NotificationProvider, useNotification } from './hooks/useNotification';

const AppContainer: React.FC = () => {
  const [page, setPage] = useState<Page>(Page.Home);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [selectedComercio, setSelectedComercio] = useState<Comercio | null>(null);
  const [targetComercioForChat, setTargetComercioForChat] = useState<Comercio | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const { showNotification } = useNotification();

  const fetchData = useCallback(async (showSuccessMessage: boolean = false) => {
    try {
      setLoading(true);
      const appData = await api.getData();
      setData(appData);
      if (showSuccessMessage) {
        showNotification('Datos actualizados correctamente.', 'success');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showNotification('Error al cargar los datos de la aplicación.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    const sessionUser = api.getCurrentUserFromSession();
    if (sessionUser) {
      setCurrentUser(sessionUser);
    }
    const publicSession = localStorage.getItem('publicUserSession');
    if (publicSession) {
        try {
            setPublicUser(JSON.parse(publicSession));
        } catch(e) {
            console.error("Error parsing public user session", e);
            localStorage.removeItem('publicUserSession');
        }
    }
    fetchData();
  }, [fetchData]);

  const handleNavigate = (newPage: Page) => {
    setPage(newPage);
    setSelectedComercio(null); // Reset selected comercio on page change
  };
  
  const handleLogin = async (credentials: Pick<Usuario, 'email' | 'password'>, keepSession: boolean) => {
    try {
      const user = await api.loginUser(credentials, keepSession);
      setCurrentUser(user);
      setPage(Page.Dashboard);
      showNotification(`¡Bienvenido de vuelta, ${user.nombre}!`, 'success');
      return { success: true, message: 'Login exitoso' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      showNotification(message, 'error');
      return { success: false, message };
    }
  };
  
  const handleRegister = async (userData: Omit<Usuario, 'id'>) => {
    try {
      const result = await api.registerUser(userData);
      showNotification('¡Registro casi completo! Por favor, verificá tu email.', 'info');
      return { success: true, ...result };
    } catch (error) {
       const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
       showNotification(message, 'error');
       return { success: false, message };
    }
  };

  const handleLogout = () => {
    api.logoutUser();
    setCurrentUser(null);
    setPage(Page.Home);
    showNotification('Sesión de comerciante cerrada.', 'info');
  };

  const handlePublicLogout = () => {
    localStorage.removeItem('publicUserSession');
    setPublicUser(null);
    setPage(Page.Home);
    showNotification('Sesión de cliente cerrada.', 'info');
  };

  const handlePublicLogin = async (credentials: Pick<PublicUser, 'email' | 'password'>) => {
    try {
      const user = await api.loginPublicUser(credentials);
      setPublicUser(user);
      showNotification(`¡Hola de nuevo, ${user.nombre}!`, 'success');
      return { success: true, message: 'Login exitoso' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      showNotification(message, 'error');
      return { success: false, message };
    }
  };
  
  const handlePublicRegister = async (userData: Omit<PublicUser, 'id' | 'favorites' | 'history'>) => {
    try {
      const newUser = await api.registerPublicUser(userData);
      setPublicUser(newUser); // Auto-login after registration
      showNotification(`¡Bienvenido, ${newUser.nombre}! Tu cuenta ha sido creada.`, 'success');
      return { success: true, message: 'Registro exitoso' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
      showNotification(message, 'error');
      return { success: false, message };
    }
  };
  
  const handleGoogleLogin = () => {
      // Simulación de login con Google
      const simulatedUser: PublicUser = {
        id: 'google-user-123',
        nombre: 'Usuario',
        apellido: 'de Google',
        email: 'usuario.google@example.com',
        favorites: [],
        history: []
      };
      localStorage.setItem('publicUserSession', JSON.stringify(simulatedUser));
      setPublicUser(simulatedUser);
      showNotification('¡Bienvenido con Google!', 'success');
  }

  const handleToggleFavorite = async (comercio: Comercio) => {
    if (!publicUser) {
        showNotification('Necesitás iniciar sesión como cliente para guardar favoritos.', 'warning');
        return;
    }
    const isFavorite = publicUser.favorites.includes(comercio.id);
    const newFavorites = isFavorite
        ? publicUser.favorites.filter(id => id !== comercio.id)
        : [...publicUser.favorites, comercio.id];

    try {
        const updatedUser = await api.updatePublicUser({ ...publicUser, favorites: newFavorites });
        setPublicUser(updatedUser);
        showNotification(isFavorite ? 'Quitado de favoritos.' : '¡Guardado en tus favoritos!', 'success');
    } catch (error) {
        showNotification('No se pudo actualizar tus favoritos.', 'error');
    }
  };

  const handleCreateComercio = async (comercioData: Omit<Comercio, 'id' | 'usuarioId'>) => {
    if (!currentUser) return;
    try {
      await api.createComercio({ ...comercioData, usuarioId: currentUser.id });
      await fetchData();
      setPage(Page.Dashboard);
      showNotification('¡Comercio creado con éxito!', 'success');
    } catch (error) {
      showNotification('Error al crear el comercio.', 'error');
    }
  };

  const handleUpdateComercio = async (comercio: Comercio) => {
    try {
        await api.updateComercio(comercio);
        await fetchData();
        showNotification('Comercio actualizado con éxito.', 'success');
        return true;
    } catch (error) {
        showNotification('Error al actualizar el comercio.', 'error');
        return false;
    }
  };
  
  const handleDeleteComercio = async (comercioId: string) => {
     try {
        await api.deleteComercio(comercioId);
        await fetchData();
        showNotification('Comercio eliminado con éxito.', 'success');
        return true;
    } catch (error) {
        showNotification('Error al eliminar el comercio.', 'error');
        return false;
    }
  };

  const handleResetData = async () => {
      if (window.confirm("¿Estás seguro de que querés borrar TODOS los datos (incluyendo usuarios y comercios) y restaurar los datos de prueba? Esta acción no se puede deshacer.")) {
          try {
              await api.resetData();
              setCurrentUser(null);
              setPublicUser(null);
              setPage(Page.Home);
              await fetchData();
              showNotification('Los datos se han restaurado a su estado inicial.', 'success');
          } catch(error) {
              showNotification('Error al restaurar los datos.', 'error');
          }
      }
  };

  const handleViewComercio = async (comercio: Comercio) => {
    setSelectedComercio(comercio);
    setPage(Page.ComercioDetail);
    
    if (publicUser) {
        const newInteraction = {
            comercioId: comercio.id,
            type: 'view' as const,
            timestamp: new Date().toISOString(),
            comercioNombre: comercio.nombre
        };
        const updatedHistory = [newInteraction, ...(publicUser.history || [])].slice(0, 10);
        try {
            const updatedUser = await api.updatePublicUser({ ...publicUser, history: updatedHistory });
            setPublicUser(updatedUser);
        } catch(error) {
            console.error("Failed to update user history", error);
        }
    }
    
    api.trackEvent(comercio.id, 'view', publicUser?.id);
  };

  const handleUpdateUser = async (userData: Pick<Usuario, 'nombre' | 'telefono'>) => {
      if (!currentUser) return;
      try {
          const updatedUser = await api.updateUser(currentUser.id, userData);
          setCurrentUser(updatedUser);
          showNotification('Tus datos han sido actualizados.', 'success');
      } catch (error) {
          showNotification('No se pudieron actualizar tus datos.', 'error');
      }
  };

  const handleAddOpinion = async (opinionData: { rating: number, texto: string }) => {
    if (!publicUser || !selectedComercio) return;
    try {
        const newOpinion = {
            ...opinionData,
            usuarioId: publicUser.id,
            usuarioNombre: `${publicUser.nombre} ${publicUser.apellido.charAt(0)}.`,
        };
        const updatedComercio = await api.addOpinion(selectedComercio.id, newOpinion);
        setSelectedComercio(updatedComercio);
        await fetchData();
        showNotification('¡Gracias por tu opinión!', 'success');
    } catch(error) {
        showNotification('No se pudo publicar tu opinión.', 'error');
    }
  };

  const handleReplyToOpinion = async (comercioId: string, opinionId: string, texto: string) => {
    if (!currentUser) return;
     try {
        const updatedComercio = await api.addOpinionReply(comercioId, opinionId, texto, currentUser.id);
        setSelectedComercio(updatedComercio);
        await fetchData();
        showNotification('Respuesta enviada.', 'success');
    } catch(error) {
        showNotification('Error al enviar la respuesta.', 'error');
    }
  };
  
  const handleToggleLike = async (comercioId: string, opinionId: string) => {
      if (!publicUser) return;
      try {
          const updatedComercio = await api.toggleOpinionLike(comercioId, opinionId, publicUser.id);
          setSelectedComercio(updatedComercio);
          await fetchData();
      } catch (error) {
          showNotification('No se pudo registrar tu "Me Gusta".', 'error');
      }
  };

  const handleStartChat = (comercio: Comercio) => {
    if (!publicUser) {
      showNotification("Necesitás iniciar sesión para chatear.", 'warning');
      return;
    }
    setTargetComercioForChat(comercio);
    setPage(Page.Chat);
  };
  
  const handleUnreadCountChange = useCallback((newCount: number) => {
    setUnreadCount(newCount);
    // Actualizar también el estado del usuario logueado para consistencia
    if (currentUser) {
        setCurrentUser(prev => prev ? ({ ...prev, unreadMessageCount: newCount }) : null);
    }
    if (publicUser) {
        setPublicUser(prev => prev ? ({ ...prev, unreadMessageCount: newCount }) : null);
    }
  }, [currentUser, publicUser]);


  const renderPage = () => {
    if (loading || !data) {
      return <div className="text-center p-10">Cargando Guía Comercial...</div>;
    }
    
    switch (page) {
      case Page.Login:
        return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      case Page.Dashboard:
        if (!currentUser) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        const userComercios = data.comercios.filter(c => c.usuarioId === currentUser.id);
        return <DashboardPage 
            currentUser={currentUser}
            comercios={userComercios} 
            provincias={data.provincias}
            ciudades={data.ciudades}
            rubros={data.rubros}
            subRubros={data.subRubros}
            onUpdate={handleUpdateComercio}
            onDelete={handleDeleteComercio}
            onCreateNew={() => setPage(Page.CreateComercio)}
            onNavigateToAccount={() => setPage(Page.Account)}
            onPreviewComercio={handleViewComercio}
            onNavigateToPromote={(c) => { setSelectedComercio(c); setPage(Page.Promote); }}
            onNavigateToChat={() => setPage(Page.Chat)}
        />;
      case Page.CreateComercio:
        if (!currentUser) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        return <CreateComercioPage 
            provincias={data.provincias}
            ciudades={data.ciudades}
            rubros={data.rubros}
            subRubros={data.subRubros}
            onCreate={handleCreateComercio}
        />;
      case Page.ComercioDetail:
        const rubro = data.rubros.find(r => r.id === selectedComercio?.rubroId);
        const subRubro = data.subRubros.find(sr => sr.id === selectedComercio?.subRubroId);
        if (selectedComercio && rubro && subRubro) {
          return <ComercioDetailPage 
            comercio={selectedComercio} 
            rubro={rubro} 
            subRubro={subRubro}
            onBackToList={() => { setSelectedComercio(null); setPage(Page.Home); }}
            onEditInPanel={() => setPage(Page.Dashboard)}
            viewer={currentUser || publicUser}
            onAddOpinion={handleAddOpinion}
            onStartChat={handleStartChat}
            onReplyToOpinion={handleReplyToOpinion}
            onToggleLike={handleToggleLike}
          />;
        }
        return <div>Comercio no encontrado.</div>;
       case Page.Account:
        if (!currentUser) return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
        const userComerciosForAccount = data.comercios.filter(c => c.usuarioId === currentUser.id);
        const userBanners = data.banners.filter(b => userComerciosForAccount.some(c => c.id === b.comercioId));
        const userPagos = data.pagos.filter(p => userComerciosForAccount.some(c => c.id === p.comercioId));
        return <AccountPage 
          currentUser={currentUser}
          comercios={userComerciosForAccount}
          banners={userBanners}
          pagos={userPagos}
          onNavigateToDashboard={() => setPage(Page.Dashboard)}
          onUpdateUser={handleUpdateUser}
        />;
      case Page.Promote:
        if (!currentUser || !selectedComercio) {
            handleNavigate(Page.Dashboard);
            return null;
        }
        return <PromotePage 
            comercio={selectedComercio}
            onPaymentSuccess={() => {
                fetchData(true);
                handleNavigate(Page.Dashboard);
            }}
            onBack={() => handleNavigate(Page.Dashboard)}
        />;
      case Page.ClientDashboard:
        if (!publicUser) { handleNavigate(Page.Home); return null; }
        const favoriteComercios = data.comercios.filter(c => publicUser.favorites.includes(c.id));
        return <ClientPage
          publicUser={publicUser}
          favoriteComercios={favoriteComercios}
          rubros={data.rubros}
          subRubros={data.subRubros}
          onViewComercio={handleViewComercio}
          onToggleFavorite={handleToggleFavorite}
          onNavigateToMerchantLogin={() => handleNavigate(Page.Login)}
          onNavigateToChat={() => setPage(Page.Chat)}
        />;
       case Page.Admin:
         if (!currentUser || !api.isAdmin(currentUser.email)) { handleNavigate(Page.Home); return null; }
         return <AdminPage 
            rubros={data.rubros}
            comercios={data.comercios}
            usuarios={data.usuarios}
            pagos={data.pagos}
          />;
       case Page.Chat:
        const loggedInUser = publicUser || currentUser;
        if (!loggedInUser) { handleNavigate(Page.Home); return null; }
        return <ChatPage 
          currentUser={loggedInUser}
          targetComercio={targetComercioForChat}
          onViewComercio={handleViewComercio}
          onUnreadCountChange={handleUnreadCountChange}
          onClearTarget={() => setTargetComercioForChat(null)}
        />;
      case Page.Home:
      default:
        return <HomePage 
            data={data}
            onViewComercio={handleViewComercio}
            publicUser={publicUser}
            currentUser={currentUser}
            onPublicRegister={handlePublicRegister}
            onPublicLogin={handlePublicLogin}
            onGoogleLogin={handleGoogleLogin}
            onToggleFavorite={handleToggleFavorite}
        />;
    }
  };

  return (
    <>
      <Header 
        currentUser={currentUser} 
        publicUser={publicUser}
        onNavigate={handleNavigate} 
        onLogout={handleLogout}
        onPublicLogout={handlePublicLogout}
        onResetData={handleResetData}
        unreadCount={unreadCount}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {renderPage()}
      </main>
    </>
  );
};


const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContainer />
    </NotificationProvider>
  );
};


export default App;
