import React, { useState, useEffect } from 'react';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const ICONS: Record<NotificationType, React.FC<{ className?: string }>> = {
    info: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    success: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    warning: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    error: ({ className }) => <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
};

const STYLES: Record<NotificationType, { bg: string; text: string; border: string }> = {
    info: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-400' },
    success: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-400' },
    warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-400' },
    error: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-400' },
};


const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
    }, 5000); // Duración de la notificación

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isExiting) {
      const timer = setTimeout(onClose, 300); // Coincide con la duración de la animación de salida
      return () => clearTimeout(timer);
    }
  }, [isExiting, onClose]);

  const Icon = ICONS[type];
  const style = STYLES[type];

  return (
    <div
      className={`max-w-sm w-full ${style.bg} shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${style.border} ${isExiting ? 'animate-slide-out-right' : 'animate-slide-in-right'}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${style.text}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className={`text-sm font-medium ${style.text}`}>{message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => setIsExiting(true)}
              className={`inline-flex rounded-md p-1 ${style.text} hover:bg-opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2`}
            >
              <span className="sr-only">Cerrar</span>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;
