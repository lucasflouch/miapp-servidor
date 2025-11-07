import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import Notification from '../components/Notification';
import { v4 as uuidv4 } from 'uuid';

type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface NotificationData {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification debe ser usado dentro de un NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const newNotification: NotificationData = {
      id: uuidv4(),
      message,
      type,
    };
    setNotifications(prev => [...prev, newNotification]);
  }, []);
  
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] space-y-3">
        {notifications.map(notification => (
          <Notification
            key={notification.id}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
