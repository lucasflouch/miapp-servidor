
import React, { useState } from 'react';
import { PublicUser } from '../types';

// Google Icon SVG
const GoogleIcon: React.FC = () => (
    <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.139,44,30.025,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
    </svg>
);


interface PublicLoginProps {
  onRegister: (userData: Omit<PublicUser, 'id' | 'favorites' | 'history'>) => Promise<{ success: boolean; message: string }>;
  onLogin: (credentials: Pick<PublicUser, 'email' | 'password'>) => Promise<{ success: boolean; message: string }>;
  onGoogleLogin: () => void;
}

const PublicLogin: React.FC<PublicLoginProps> = ({ onRegister, onLogin, onGoogleLogin }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setNombre('');
    setApellido('');
    setWhatsapp('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleTabChange = (tab: 'login' | 'register') => {
    setActiveTab(tab);
    resetForm();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setIsLoading(true);
    const result = await onRegister({ nombre, apellido, email, password, whatsapp });
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const result = await onLogin({ email, password });
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8 border-t-4 border-indigo-500 max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 text-center mb-1">Acceso de Clientes</h2>
      <p className="text-center text-gray-600 mb-4">Ingresá para ver los comercios, guardar tus favoritos y más.</p>
      
      <div className="flex border-b border-gray-200 mt-6">
          <button
            onClick={() => handleTabChange('login')}
            className={`w-1/2 py-4 text-center font-semibold transition-colors ${activeTab === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Ingresar
          </button>
          <button
            onClick={() => handleTabChange('register')}
            className={`w-1/2 py-4 text-center font-semibold transition-colors ${activeTab === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registrarse
          </button>
      </div>

      {error && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
          <p>{error}</p>
        </div>
      )}

      <div className="mt-6">
        {activeTab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label htmlFor="public-email-login" className="sr-only">Email</label>
              <input
                type="email"
                id="public-email-login"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Dirección de email"
                required
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="public-password-login" className="sr-only">Contraseña</label>
              <input
                type="password"
                id="public-password-login"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                required
                className="w-full p-2 border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-indigo-400">
              {isLoading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div>
                <label htmlFor="nombre" className="sr-only">Nombre</label>
                <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
               </div>
               <div>
                 <label htmlFor="apellido" className="sr-only">Apellido</label>
                 <input type="text" id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" required className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
               </div>
             </div>
             <div>
              <label htmlFor="public-email-register" className="sr-only">Email</label>
              <input type="email" id="public-email-register" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Dirección de email" required className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
             </div>
             <div>
                <label htmlFor="whatsapp" className="sr-only">WhatsApp (Opcional)</label>
                <input type="tel" id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (Opcional)" className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
             </div>
             <div>
              <label htmlFor="public-password-register" className="sr-only">Contraseña</label>
              <input type="password" id="public-password-register" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
             </div>
             <div>
              <label htmlFor="public-confirm-password" className="sr-only">Confirmar Contraseña</label>
              <input type="password" id="public-confirm-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" required className="w-full p-2 border border-gray-300 rounded-md shadow-sm" />
             </div>
            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 text-white py-2 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-indigo-400">
              {isLoading ? 'Registrando...' : 'Crear Cuenta'}
            </button>
          </form>
        )}
        <div className="relative flex py-4 items-center">
          <div className="flex-grow border-t border-gray-300"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">O</span>
          <div className="flex-grow border-t border-gray-300"></div>
        </div>
        <button
          type="button"
          onClick={onGoogleLogin}
          className="w-full flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <GoogleIcon />
          Continuar con Google
        </button>
      </div>
    </div>
  );
};

export default PublicLogin;