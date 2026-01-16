'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuth } from '@susmi/auth';

export interface Notification {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  timestamp: Date;
  data?: any;
}

interface NotificationsContextType {
  notifications: Notification[];
  clearNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Connect to Socket.IO server
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to notifications server');

      // Register user with their socket
      if (user.id) {
        newSocket.emit('register', user.id);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from notifications server');
    });

    newSocket.on('notification', (notification: Notification) => {
      console.log('📬 Received notification:', notification);

      // Add to notifications list
      setNotifications((prev) => [notification, ...prev]);

      // Show toast notification
      const toastOptions = {
        description: notification.message,
        duration: 5000,
      };

      switch (notification.type) {
        case 'success':
          toast.success(notification.title, toastOptions);
          break;
        case 'error':
          toast.error(notification.title, toastOptions);
          break;
        case 'warning':
          toast.warning(notification.title, toastOptions);
          break;
        case 'info':
        default:
          toast.info(notification.title, toastOptions);
          break;
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <NotificationsContext.Provider
      value={{ notifications, clearNotification, clearAll }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}
