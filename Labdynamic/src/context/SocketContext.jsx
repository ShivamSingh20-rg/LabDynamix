import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './Authcontext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    // 1. Guard against unauthenticated states
    if (!user) return;

    const userId = user._id || user.id;
    if (!userId) return;

    // 2. Initialize Socket.io connection without forcing transports strictly
    const newSocket = io('http://localhost:5000', {
      query: { userId },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Event listeners
    newSocket.on('connect', () => {
      console.log('⚡ Socket Connected Successfully! Socket ID:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ Socket Connection Error:', err.message);
    });

    newSocket.on('notification', (data) => {
      console.log('🔔 Received Notification:', data);
      setNotifications((prev) => [data, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    newSocket.on('slotUpdated', (data) => {
      window.dispatchEvent(new CustomEvent('slotUpdated', { detail: data }));
    });

    setSocket(newSocket);

    // Cleanup: Disconnect when component unmounts or user changes
    return () => {
      newSocket.off('connect');
      newSocket.off('connect_error');
      newSocket.off('notification');
      newSocket.off('slotUpdated');
      newSocket.disconnect();
    };
  }, [user?._id || user?.id]); // Only re-run if the actual user ID changes, preventing infinite reconnect loops

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <SocketContext.Provider
      value={{ socket, notifications, unreadCount, markAsRead, clearNotifications }}
    >
      {children}
    </SocketContext.Provider>
  );
};

// Safe Hook with default fallback values to prevent crashes
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    return {
      socket: null,
      notifications: [],
      unreadCount: 0,
      markAsRead: () => {},
      clearNotifications: () => {},
    };
  }
  return context;
};