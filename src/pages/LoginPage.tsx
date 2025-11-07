

import React, { useState, FormEvent, useRef, useEffect, ChangeEvent, KeyboardEvent, ClipboardEvent } from 'react';
import { Usuario } from '../types';
import * as api from '../apiService';

interface LoginPageProps {
  onLogin: (credentials: Pick<Usuario, 'email' | 'password'>, keepSession: boolean) => Promise<{ success: boolean; message: string }>;
  onRegister: (userData: Omit<Usuario, 'id'>) => Promise<{ success: boolean; message: string; email?: string; verificationCode?: string; }>;
}

const EyeIcon: React.FC<{ size?: number }> = ({ size = 6 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-${size} w-${size} text-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeOffIcon: React.FC<{ size?: number }> = ({ size = 6 }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-${size} w-${size} text-gray-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a9.97 9.97 0 01-1.563 3.029m0 0l-3.59-3.59" />
    </svg>
);


const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onRegister }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  
  // State for forms
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  
  // State for verification flow
  const [verificationStep, setVerificationStep] = useState<'form' | 'verify'>('form');
  const [emailToVerify, setEmailToVerify] = useState('');
  const [receivedVerificationCode, setReceivedVerificationCode] = useState('');
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);


  // General state
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [keepSession, setKeepSession] = useState(false);

  useEffect(() => {
    // Pre-fill email only on the login tab
    if (activeTab === 'login') {
      const lastEmail = localStorage.getItem('lastLoggedInEmail');
      if (lastEmail) {
        setEmail(lastEmail);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (verificationStep === 'verify' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [verificationStep]);

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone: string) => /^\+?\d{10,15}$/.test(phone);

  const mailtoLink = `mailto:${emailToVerify}?subject=${encodeURIComponent(
    "Tu código de verificación para GuíaComercial"
  )}&body=${encodeURIComponent(
    `¡Hola, ${nombre}!\n\nGracias por registrarte en GuíaComercial.\n\nTu código de verificación de 6 dígitos es:\n\n${receivedVerificationCode}\n\nPor favor, ingresalo en la página de verificación para activar tu cuenta y empezar a promocionar tu negocio.\n\n¡Te esperamos!\nEl equipo de GuíaComercial`
  )}`;


  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!nombre || !email || !password || !confirmPassword) {
      return setError('Todos los campos son obligatorios, excepto el teléfono.');
    }
    if (!validateEmail(email)) {
      return setError('El formato del email no es válido.');
    }
    if (telefono && !validatePhone(telefono)) {
      return setError('El formato del teléfono no es válido (ej: 5491112345678).');
    }
    if (password !== confirmPassword) {
      return setError('Las contraseñas no coinciden.');
    }

    setIsLoading(true);
    const result = await onRegister({ nombre, email, password, telefono });
    
    if (result.success && result.email && result.verificationCode) {
      setEmailToVerify(result.email);
      setReceivedVerificationCode(result.verificationCode);
      setVerificationStep('verify');
    } else {
      setError(result.message);
    }
    
    setIsLoading(false);
  };
  
  const handleVerifySubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const verificationCodeInput = otp.join('');
    
    if (!verificationCodeInput || verificationCodeInput.length !== 6) {
      return setError('El código de verificación debe tener 6 dígitos.');
    }

    setIsLoading(true);
    try {
      await api.verifyCode(emailToVerify, verificationCodeInput);
      const loginResult = await onLogin({ email: emailToVerify, password }, keepSession);
      if (!loginResult.success) {
        setError(loginResult.message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error desconocido';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      return setError('El email y la contraseña son obligatorios.');
    }

    setIsLoading(true);
    const result = await onLogin({ email, password }, keepSession);
    if (!result.success) {
      setError(result.message);
    }
    setIsLoading(false);
  };
  
  const handleOtpChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
        const newOtp = pastedData.split('');
        // Rellenar el resto si el pegado es parcial
        while (newOtp.length < 6) {
            newOtp.push('');
        }
        setOtp(newOtp);
        const lastFilledIndex = Math.min(pastedData.length, 5);
        inputRefs.current[lastFilledIndex]?.focus();
    }
  };


  const resetForms = () => {
    setError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNombre('');
    setTelefono('');
    setVerificationStep('form');
    setEmailToVerify('');
    setReceivedVerificationCode('');
    setOtp(new Array(6).fill(''));
  };


  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-4xl font-extrabold text-gray-900 text-center">Acceso Comerciantes</h1>
        
        <div className="flex border-b border-gray-200 mt-6">
          <button
            onClick={() => { setActiveTab('login'); resetForms(); }}
            className={`w-1/2 py-4 text-center font-semibold transition-colors ${activeTab === 'login' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Ingresar
          </button>
          <button
            onClick={() => { setActiveTab('register'); resetForms(); }}
            className={`w-1/2 py-4 text-center font-semibold transition-colors ${activeTab === 'register' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Registrarse
          </button>
        </div>

        {error && (
            <div className="mt-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg" role="alert">
              <p>{error}</p>
            </div>
        )}

        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Dirección de Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
              <label htmlFor="password"  className="block text-sm font-medium text-gray-700">Contraseña</label>
              <div className="relative mt-1">
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
             <div className="flex items-center">
              <input id="keep-session" name="keep-session" type="checkbox" checked={keepSession} onChange={(e) => setKeepSession(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label htmlFor="keep-session" className="ml-2 block text-sm text-gray-900">Mantener sesión iniciada</label>
            </div>
            <div>
              <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                {isLoading ? 'Ingresando...' : 'Ingresar'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'register' && verificationStep === 'form' && (
          <form onSubmit={handleRegisterSubmit} className="mt-6 space-y-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700">Nombre completo</label>
                <input id="nombre" name="nombre" type="text" autoComplete="name" required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono para WhatsApp (Opcional)</label>
                <input id="telefono" name="telefono" type="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 5491112345678" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="email-register" className="block text-sm font-medium text-gray-700">Dirección de Email</label>
                <input id="email-register" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              </div>
              <div>
                <label htmlFor="password-register" className="block text-sm font-medium text-gray-700">Contraseña</label>
                <div className="relative mt-1">
                  <input id="password-register" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-700">Confirmar Contraseña</label>
                <div className="relative mt-1">
                  <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Método de Verificación</label>
                <div className="flex gap-4">
                  <label className="flex items-center p-3 border rounded-md has-[:checked]:bg-indigo-50 has-[:checked]:border-indigo-400">
                    <input type="radio" name="verificationMethod" value="email" checked={true} readOnly className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"/>
                    <span className="ml-2 text-sm text-gray-700">Verificar por Email</span>
                  </label>
                  <label className={`flex items-center p-3 border rounded-md opacity-50 cursor-not-allowed`}>
                    <input type="radio" name="verificationMethod" value="whatsapp" disabled={true} className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"/>
                    <span className="ml-2 text-sm text-gray-700">Verificar por WhatsApp</span>
                  </label>
                </div>
              </div>
              <div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400">
                  {isLoading ? 'Registrando...' : 'Crear mi cuenta'}
                </button>
              </div>
          </form>
        )}
        
        {activeTab === 'register' && verificationStep === 'verify' && (
            <div className="mt-6 text-center space-y-8">
              <h2 className="text-3xl font-bold text-gray-900">¡Un último paso!</h2>
              
              {/* --- PASO 1 --- */}
              <div className="text-left p-6 border rounded-lg bg-gray-50 shadow-inner">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-bold text-lg">1</span>
                    <h3 className="text-xl font-bold text-gray-800">Obtené tu Código</h3>
                 </div>
                <p className="text-gray-700 mb-4">
                  Para recibir tu código de verificación, hacé clic en el botón para abrir tu app de correo y auto-enviarte el email.
                </p>
                <a
                  href={mailtoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-block text-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Abrir mi Email para Recibir el Código
                </a>
              </div>
              
              {/* --- PASO 2 --- */}
               <form onSubmit={handleVerifySubmit} className="p-6 border rounded-lg">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold text-lg">2</span>
                    <h3 className="text-xl font-bold text-gray-800">Ingresá el Código</h3>
                 </div>
                  <p className="text-gray-600 mb-4">
                    Una vez que recibas el email, ingresá el código de 6 dígitos aquí.
                  </p>
                  <div>
                    <label htmlFor="verification-code-0" className="sr-only">Código de Verificación</label>
                    <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                      {new Array(6).fill(0).map((_, index) => (
                        <input
                          key={index}
                          id={index === 0 ? "verification-code-0" : undefined}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          type="text"
                          inputMode="numeric"
                          pattern="\d{1}"
                          maxLength={1}
                          value={otp[index]}
                          onChange={(e) => handleOtpChange(index, e)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="w-12 h-14 md:w-14 md:h-16 text-center text-3xl font-mono border-2 border-gray-300 bg-gray-50 rounded-lg shadow-inner focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                          required
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-6">
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400">
                      {isLoading ? 'Verificando...' : 'Verificar y Entrar'}
                    </button>
                  </div>
               </form>
            </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;