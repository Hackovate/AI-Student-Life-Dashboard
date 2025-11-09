import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notificationsAPI } from './api';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  source?: string;
  action?: string;
  read: boolean;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (type: 'success' | 'error' | 'warning' | 'info', message: string, source?: string, action?: string, title?: string) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  summarizeNotifications: () => Promise<{ summary: string; notificationIds: string[] }>;
  refreshUnreadCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await notificationsAPI.getAll(50, 0);
      if (response.success) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await notificationsAPI.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  const addNotification = useCallback(async (
    type: 'success' | 'error' | 'warning' | 'info',
    message: string,
    source?: string,
    action?: string,
    title?: string
  ) => {
    try {
      const response = await notificationsAPI.create({ type, message, source, action, title });
      if (response.success) {
        // Refresh notifications and unread count
        await fetchNotifications();
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }, [fetchNotifications, refreshUnreadCount]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await notificationsAPI.markAsRead(id);
      if (response.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, [refreshUnreadCount]);

  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await notificationsAPI.delete(id);
      if (response.success) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await refreshUnreadCount();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, [refreshUnreadCount]);

  const summarizeNotifications = useCallback(async () => {
    try {
      const response = await notificationsAPI.summarize();
      if (response.success) {
        return response.data;
      }
      throw new Error('Failed to summarize notifications');
    } catch (error) {
      console.error('Error summarizing notifications:', error);
      throw error;
    }
  }, []);

  // Fetch notifications and unread count on mount
  useEffect(() => {
    fetchNotifications();
    refreshUnreadCount();
  }, [fetchNotifications, refreshUnreadCount]);

  // Refresh unread count every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        addNotification,
        markAsRead,
        deleteNotification,
        fetchNotifications,
        summarizeNotifications,
        refreshUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

