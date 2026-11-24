import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
const SocketContext = createContext(undefined);
const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:5000';
export const SocketProvider = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    useEffect(() => {
        if (!isAuthenticated) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }
        let isCancelled = false;
        let activeSocket = null;
        import('socket.io-client').then(({ io }) => {
            if (isCancelled)
                return;
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
            activeSocket = newSocket;
            setSocket(newSocket);
        });
        return () => {
            isCancelled = true;
            activeSocket?.disconnect();
        };
    }, [isAuthenticated]);
    const joinBooking = (bookingId) => {
        if (socket && isConnected) {
            socket.emit('join_booking', bookingId);
            socket.emit('booking:join', bookingId);
        }
    };
    const leaveBooking = (bookingId) => {
        if (socket && isConnected) {
            socket.emit('leave_booking', bookingId);
            socket.emit('booking:leave', bookingId);
        }
    };
    const onBookingUpdated = (callback) => {
        if (!socket)
            return () => { };
        socket.on('booking_status_updated', callback);
        socket.on('booking:status_changed', callback);
        return () => {
            socket.off('booking_status_updated', callback);
            socket.off('booking:status_changed', callback);
        };
    };
    const onNewMessage = (callback) => {
        if (!socket)
            return () => { };
        socket.on('new_message', callback);
        socket.on('message:received', callback);
        return () => {
            socket.off('new_message', callback);
            socket.off('message:received', callback);
        };
    };
    const onNotification = (callback) => {
        if (!socket)
            return () => { };
        socket.on('notification', callback);
        socket.on('notification:new', callback);
        return () => {
            socket.off('notification', callback);
            socket.off('notification:new', callback);
        };
    };
    return (<SocketContext.Provider value={{
            socket,
            isConnected,
            joinBooking,
            leaveBooking,
            onBookingUpdated,
            onNewMessage,
            onNotification,
        }}>
      {children}
    </SocketContext.Provider>);
};
export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
