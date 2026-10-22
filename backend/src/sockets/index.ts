import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUserPayload } from '../types';
import { COOKIE_NAME } from '../middleware/auth';

let io: SocketIOServer | null = null;

const parseCookies = (cookieHeader: string): Record<string, string> => {
  const list: Record<string, string> = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0]?.trim();
    if (!name) return;
    const value = parts.slice(1).join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
};

export const initSockets = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  // Socket authentication middleware
  io.use((socket: Socket, next) => {
    try {
      let token: string | undefined;

      // Check cookie from handshake headers
      if (socket.handshake.headers.cookie) {
        const parsedCookies = parseCookies(socket.handshake.headers.cookie);
        token = parsedCookies[COOKIE_NAME];
      }

      // Check auth handshake payload
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication token missing for WebSocket connection'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
      (socket as any).user = decoded;
      next();
    } catch (err: any) {
      next(new Error(`WebSocket authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user as AuthUserPayload;
    if (user && user._id) {
      // Join personal user room for targeted notifications
      socket.join(`user:${user._id}`);
      console.log(`Socket client connected: ${user.email} (${socket.id})`);
    }

    // Join booking conversation room
    socket.on('booking:join', (bookingId: string) => {
      if (bookingId) {
        socket.join(`booking:${bookingId}`);
        console.log(`Socket ${socket.id} joined booking room: booking:${bookingId}`);
      }
    });

    socket.on('booking:leave', (bookingId: string) => {
      if (bookingId) {
        socket.leave(`booking:${bookingId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const emitSocketEvent = (room: string, event: string, data: any): void => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

export const getIO = (): SocketIOServer | null => io;
