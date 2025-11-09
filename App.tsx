import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
import { NotificationProvider } from './hooks/useNotification';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.Home);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [publicUser, setPublicUser] = useState<PublicUser | null>(null);
  const [viewingComercio, setViewingComercio] = useState<Comercio | null>(null);
  const [promotingComercio, setPromotingComercio] = useState<Comercio | null>(null);
  const [chatTargetComercio, setChatTargetComercio] = useState<Comercio | null>(null);

  useEffect(() => {
    const userFromSession = api.getCurrentUserFromSession();
    if (userFromSession) {
      setCurrentUser(userFromSession);
    }
    const publicUserFromStorage = localStorage.getItem('publicUserSession');
    if(publicUserFromStorage) {
      try {
        setPublicUser(JSON.parse(publicUserFromStorage));
      } catch(e) {
        localStorage.removeItem('publicUserSession');
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiData = await api.getData();
      setData(apiData);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
      setError(`Error al cargar los datos: ${errorMessage}`);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      return { success: false, message: e instanceof Error ? e.message : 'Error' };
    }
  };

  const handleLogin = async (credentials: Pick<Usuario, 'email' | 'password'>, keepSession: boolean): Promise<{ success: boolean; message: string }> => {
    try {
      const loggedInUser = await api.loginUser(credentials, keepSession);
      setCurrentUser(loggedInUser);
      navigate(Page.Dashboard);
      return { success: true, message: 'Inicio de sesión exitoso' };
    } catch (e) {
      return { success: false, message: e instanceof Error ? e.message : 'Error' };
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
        return { success: true, message: 'Registro exitoso.' };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Error' };
    }
  };

  const handlePublicLogin = async (credentials: Pick<PublicUser, 'email' | 'password'>): Promise<{ success: boolean; message: string }> => {
    try {
        const loggedInUser = await api.loginPublicUser(credentials);
        setPublicUser(loggedInUser);
        return { success: true, message: 'Inicio de sesión exitoso.' };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : 'Error' };
    }
  };
  
  const handleGoogleLogin = () => {
    const mockUser: PublicUser = { id: 'pub-google-123', nombre: 'Usuario', apellido: 'Google', email: 'usuario.google@example.com', favorites: [], history: [] };
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
        setPublicUser(updatedUser);
        await api.updatePublicUser(updatedUser);
    } catch (e) {
        console.error("Failed to sync public user data:", e);
    }
  }, []);

  const handleToggleFavorite = useCallback((comercio: Comercio) => {
    if (!publicUser) return;
    const isFavorite = publicUser.favorites.includes(comercio.id);
    const newFavorites = isFavorite ? publicUser.favorites.filter(id => id !== comercio.id) : [...publicUser.favorites, comercio.id];
    const updatedUser = { ...publicUser, favorites: newFavorites };
    updatePublicUserWithInteraction(updatedUser);
  }, [publicUser, updatePublicUserWithInteraction]);

  const handleCreateComercio = useCallback(async (newComercioData: Omit<Comercio, 'id' | 'usuarioId'>) => {
     if (!currentUser) return;
    try {
        const createdComercio = await api.createComercio({ ...newComercioData, usuarioId: currentUser.id });
        await fetchData();
        setViewingComercio(createdComercio);
        navigate(Page.ComercioDetail);
    } catch(e) {
        alert(e instanceof Error ? e.message : "No se pudo crear el comercio.");
    }
  }, [currentUser, navigate, fetchData]);
  
  const handleUpdateComercio = useCallback(async (updatedComercio: Comercio) => {
    try {
      await api.updateComercio(updatedComercio);
      await fetchData();
      return true;
    } catch (e) {
        alert(e instanceof Error ? e.message : 'No se pudieron guardar los cambios.');
        return false;
    }
  }, [fetchData]);

  const handleUpdateUser = useCallback(async (updatedUserData: Pick<Usuario, 'nombre' | 'telefono'>) => {
    if (!currentUser) return;
    try {
      const updatedUser = await api.updateUser(currentUser.id, updatedUserData);
      setCurrentUser(updatedUser);
      await fetchData();
    } catch (e) {
        alert(e instanceof Error ? e.message : 'No se pudieron actualizar tus datos.');
    }
  }, [currentUser, fetchData]);

  const handleDeleteComercio = useCallback(async (comercioId: string) => {
    try {
        await api.deleteComercio(comercioId);
        await fetchData();
        return true;
    } catch (e) {
        alert(e instanceof Error ? e.message : 'No se pudo eliminar el comercio.');
        return false;
    }
  }, [fetchData]);

  const handleResetData = useCallback(async () => {
    if (window.confirm("¿Seguro que querés borrar TODOS los datos y restaurar los de prueba?")) {
        try {
            await api.resetData();
            await fetchData();
            setCurrentUser(null);
            setPublicUser(null);
            navigate(Page.Home);
        } catch (e) {
            alert("No se pudieron restaurar los datos.");
        }
    }
  }, [fetchData, navigate]);
  
  const handleViewComercio = useCallback((comercio: Comercio) => {
    setViewingComercio(comercio);
    navigate(Page.ComercioDetail);
  }, [navigate]);

  const handleNavigateToPromote = useCallback((comercio: Comercio) => {
    setPromotingComercio(comercio);
    navigate(Page.Promote);
  }, [navigate]);

  const handleAddOpinion = useCallback(async (comercioId: string, opinionData: { rating: number; texto: string }, viewer: Usuario | PublicUser | null) => {
    if (!viewer) return;
    const isPublic = 'apellido' in viewer;
    const usuarioNombre = isPublic ? `${viewer.nombre} ${(viewer as PublicUser).apellido.charAt(0)}.` : viewer.nombre;
    try {
        await api.addOpinion(comercioId, { usuarioId: viewer.id, usuarioNombre, ...opinionData });
        await fetchData();
    } catch (e) {
        alert("Error al guardar la opinión.");
    }
  }, [fetchData]);

  const handleReplyToOpinion = useCallback(async (comercioId: string, opinionId: string, texto: string) => {
    if (!currentUser) return;
    try {
        await api.addOpinionReply(comercioId, opinionId, texto, currentUser.id);
        await fetchData();
    } catch (e) {
        alert(e instanceof Error ? e.message : 'No se pudo guardar la respuesta.');
    }
  }, [currentUser, fetchData]);

  const handleToggleLike = useCallback(async (comercioId: string, opinionId: string) => {
    if (!publicUser) return;
    try {
        await api.toggleOpinionLike(comercioId, opinionId, publicUser.id);
        await fetchData();
    } catch (e) {
        alert("No se pudo procesar tu 'me gusta'.");
    }
  }, [publicUser, fetchData]);
  
  const handleStartChat = useCallback((comercio: Comercio) => {
    if (!publicUser) return;
    setChatTargetComercio(comercio);
    navigate(Page.Chat);
  }, [publicUser, navigate]);
  
  const renderPage = () => {
    if (loading) return <div className="text-center p-12">Cargando...</div>;
    if (error || !data) return <div className="text-center p-12 text-red-500">{error || "Error al cargar datos."}</div>;

    const viewer = currentUser || publicUser;
    const unreadCount = (viewer as any)?.unreadMessageCount || 0;

    switch (currentPage) {
      case Page.Login: return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      case Page.Dashboard: return currentUser ? <DashboardPage currentUser={currentUser} comercios={managedComercios} provincias={data.provincias} ciudades={data.ciudades} rubros={data.rubros} subRubros={data.subRubros} onUpdate={handleUpdateComercio} onDelete={handleDeleteComercio} onCreateNew={() => navigate(Page.CreateComercio)} onNavigateToAccount={() => navigate(Page.Account)} onPreviewComercio={handleViewComercio} onNavigateToPromote={handleNavigateToPromote} onNavigateToChat={() => navigate(Page.Chat)} /> : <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      case Page.CreateComercio: return currentUser ? <CreateComercioPage provincias={data.provincias} ciudades={data.ciudades} rubros={data.rubros} subRubros={data.subRubros} onCreate={handleCreateComercio} /> : <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      case Page.ComercioDetail:
        const subRubro = viewingComercio ? data.subRubros.find(sr => sr.id === viewingComercio.subRubroId) : null;
        const rubro = subRubro ? data.rubros.find(r => r.id === subRubro.rubroId) : null;
        return viewingComercio && rubro && subRubro ? <ComercioDetailPage comercio={viewingComercio} rubro={rubro} subRubro={subRubro} onBackToList={() => navigate(Page.Home)} onEditInPanel={() => navigate(Page.Dashboard)} viewer={viewer} onAddOpinion={(opinionData) => handleAddOpinion(viewingComercio.id, opinionData, viewer)} onStartChat={handleStartChat} onReplyToOpinion={handleReplyToOpinion} onToggleLike={handleToggleLike} /> : null;
      case Page.Account: return currentUser ? <AccountPage currentUser={currentUser} comercios={managedComercios} banners={managedBanners} pagos={managedPagos} onNavigateToDashboard={() => navigate(Page.Dashboard)} onUpdateUser={handleUpdateUser} /> : <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      case Page.Promote: return currentUser && promotingComercio ? <PromotePage comercio={promotingComercio} onPaymentSuccess={() => { fetchData(); navigate(Page.Dashboard); }} onBack={() => navigate(Page.Dashboard)} /> : <LoginPage onLogin={handleLogin} onRegister={handleRegister} />;
      case Page.ClientDashboard:
        const favoriteComercios = publicUser ? data.comercios.filter(c => publicUser.favorites.includes(c.id)) : [];
        return publicUser ? <ClientPage publicUser={publicUser} favoriteComercios={favoriteComercios} rubros={data.rubros} subRubros={data.subRubros} onViewComercio={handleViewComercio} onToggleFavorite={handleToggleFavorite} onNavigateToMerchantLogin={() => navigate(Page.Login)} onNavigateToChat={() => navigate(Page.Chat)} /> : null;
      case Page.Admin: return currentUser && api.isAdmin(currentUser.email) ? <AdminPage rubros={data.rubros} comercios={data.comercios} usuarios={data.usuarios} pagos={data.pagos} /> : null;
      case Page.Chat: return viewer ? <ChatPage currentUser={viewer} targetComercio={chatTargetComercio} onViewComercio={handleViewComercio} onUnreadCountChange={() => {}} onClearTarget={() => setChatTargetComercio(null)} /> : null;
      default: return <HomePage data={data} onViewComercio={handleViewComercio} publicUser={publicUser} currentUser={currentUser} onPublicRegister={handlePublicRegister} onPublicLogin={handlePublicLogin} onGoogleLogin={handleGoogleLogin} onToggleFavorite={handleToggleFavorite} />;
    }
  };

  const viewer = currentUser || publicUser;
  const unreadCount = (viewer as any)?.unreadMessageCount || 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header currentUser={currentUser} publicUser={publicUser} onNavigate={navigate} onLogout={handleLogout} onPublicLogout={handlePublicLogout} onResetData={handleResetData} unreadCount={unreadCount} />
      <main className="container mx-auto px-4 py-8">
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
