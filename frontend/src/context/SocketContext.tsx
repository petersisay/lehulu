import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Message, Booking, Notification } from '../types';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBooking: (bookingId: string) => void;
  leaveBooking: (bookingId: string) => void;
  onBookingUpdated?: (callback: (booking: Booking) => void) => () => void;
  onNewMessage?: (callback: (message: Message) => void) => () => void;
  onNotification?: (callback: (notification: Notification) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
  : 'http://localhost:5000';

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated]);

  const joinBooking = (bookingId: string) => {
    if (socket && isConnected) {
      socket.emit('join_booking', bookingId);
    }
  };

  const leaveBooking = (bookingId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_booking', bookingId);
    }
  };

  const onBookingUpdated = (callback: (booking: Booking) => void) => {
    if (!socket) return () => {};
    socket.on('booking_status_updated', callback);
    return () => {
      socket.off('booking_status_updated', callback);
    };
  };

  const onNewMessage = (callback: (message: Message) => void) => {
    if (!socket) return () => {};
    socket.on('new_message', callback);
    return () => {
      socket.off('new_message', callback);
    };
  };

  const onNotification = (callback: (notification: Notification) => void) => {
    if (!socket) return () => {};
    socket.on('notification', callback);
    return () => {
      socket.off('notification', callback);
    };
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinBooking,
        leaveBooking,
        onBookingUpdated,
        onNewMessage,
        onNotification,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
