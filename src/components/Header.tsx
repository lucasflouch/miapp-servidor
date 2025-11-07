import React, { useState } from 'react';
import { Page, PublicUser, Usuario } from '../types';
import * as api from '../apiService';

interface HeaderProps {
  currentUser: Usuario | null;
  publicUser: PublicUser | null;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  onPublicLogout: () => void;
  onResetData: () => void;
  unreadCount: number;
}

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);


const Header: React.FC<HeaderProps> = ({ currentUser, publicUser, onNavigate, onLogout, onPublicLogout, onResetData, unreadCount }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isAdmin = currentUser && api.isAdmin(currentUser.email);
  const viewer = currentUser || publicUser;

  const NavItems: React.FC<{ isMobile: boolean }> = ({ isMobile }) => {
    const handleNavClick = (page: Page) => {
        onNavigate(page);
        setIsMobileMenuOpen(false);
    };

    const handleLogoutClick = () => {
        onLogout();
        setIsMobileMenuOpen(false);
    };
    
    const handlePublicLogoutClick = () => {
        onPublicLogout();
        setIsMobileMenuOpen(false);
    }
    
    const handleResetClick = () => {
        onResetData();
        setIsMobileMenuOpen(false);
    }
    
    const baseButtonClass = isMobile ? 'block w-full text-left px-4 py-3 text-base font-medium rounded-md' : 'font-medium transition-colors text-sm';
    const linkClass = isMobile ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-600 hover:text-indigo-600';
    const primaryButtonClass = isMobile ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700';
    const secondaryButtonClass = isMobile ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-red-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-600';
    const tertiaryButtonClass = isMobile ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'text-xs bg-gray-200 text-gray-600 px-3 py-1 rounded-md hover:bg-gray-300';
    const specialLinkClass = isMobile ? 'text-yellow-800 bg-yellow-50 hover:bg-yellow-100' : 'text-yellow-600 hover:text-yellow-800 font-bold';

    return (
        <>
            <button onClick={() => handleNavClick(Page.Home)} className={`${baseButtonClass} ${linkClass}`}>
                Inicio
            </button>
          
            {viewer && (
                <button onClick={() => handleNavClick(Page.Chat)} className={`relative ${baseButtonClass} ${linkClass}`}>
                    Mensajes
                    {unreadCount > 0 && (
                         <span className={`absolute ${isMobile ? 'top-3 right-3' : '-top-1 -right-2'} flex h-4 w-4`}>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-xs items-center justify-center">{unreadCount}</span>
                        </span>
                    )}
                </button>
            )}

            {currentUser ? (
                <>
                    {isAdmin && (
                        <button onClick={() => handleNavClick(Page.Admin)} className={`${baseButtonClass} ${specialLinkClass}`}>
                            ★ Admin
                        </button>
                    )}
                    <button onClick={() => handleNavClick(Page.Dashboard)} className={`${baseButtonClass} ${linkClass}`}>
                        Mi Panel
                    </button>
                    <button onClick={handleLogoutClick} className={`${baseButtonClass} ${secondaryButtonClass}`}>
                        Salir
                    </button>
                </>
            ) : publicUser ? (
                <>
                    {!isMobile && <span className="text-sm text-gray-700 hidden sm:block self-center">Hola, {publicUser.nombre}</span>}
                    <button onClick={() => handleNavClick(Page.ClientDashboard)} className={`${baseButtonClass} ${linkClass}`}>
                        Mis Favoritos
                    </button>
                    <button onClick={handlePublicLogoutClick} className={`${baseButtonClass} ${secondaryButtonClass}`}>
                        Salir
                    </button>
                </>
            ) : (
                <button onClick={() => handleNavClick(Page.Login)} className={`${baseButtonClass} ${primaryButtonClass}`}>
                    Soy Comerciante
                </button>
            )}

            <button onClick={handleResetClick} className={`${baseButtonClass} ${tertiaryButtonClass}`} title="Borra todos los datos y carga los de prueba">
                Restaurar Datos
            </button>
        </>
    );
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div 
          className="text-2xl font-bold text-indigo-600 cursor-pointer"
          onClick={() => { onNavigate(Page.Home); setIsMobileMenuOpen(false); }}
        >
          <span role="img" aria-label="store">🏪</span> GuíaComercial
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-4 md:space-x-6">
          <NavItems isMobile={false} />
        </nav>
        
        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
            {unreadCount > 0 && !isMobileMenuOpen && (
                 <span className="relative flex h-3 w-3 mr-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
            )}
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
            >
                <span className="sr-only">Abrir menú principal</span>
                {isMobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
        </div>
      </div>
      
      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden animate-slide-down" id="mobile-menu">
            <nav className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <NavItems isMobile={true} />
            </nav>
        </div>
      )}
    </header>
  );
};

export default Header;