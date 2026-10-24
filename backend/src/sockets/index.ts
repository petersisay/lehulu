import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { AuthUserPayload } from '../types';
import { COOKIE_NAME } from '../middleware/auth';
import { Booking } from '../models/Booking';
import { ProviderProfile } from '../models/ProviderProfile';

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
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const normalizedClient = env.CLIENT_URL.replace(/\/+$/, '');
        const isAllowed =
          origin === normalizedClient ||
          origin === 'http://localhost:5173' ||
          origin === 'http://127.0.0.1:5173' ||
          /\.vercel\.app$/.test(new URL(origin).hostname);

        if (isAllowed) {
          return callback(null, true);
        }
        return callback(new Error(`CORS policy: Origin ${origin} not allowed`));
      },
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
      console.log(`[SOCKET]: Client authenticated and connected: ${user.email} (${socket.id})`);
    }

    // Securely join booking conversation room with participant authorization
    const handleJoinBooking = async (bookingId: string) => {
      try {
        if (!bookingId || !Types.ObjectId.isValid(bookingId)) {
          socket.emit('error', { message: 'Invalid booking ID provided' });
          return;
        }

        const booking = await Booking.findById(bookingId).populate('providerId');
        if (!booking) {
          socket.emit('error', { message: 'Booking not found' });
          return;
        }

        // Authorization check: User must be customer, assigned provider, or admin
        const customerId = (booking.customerId as any)?._id?.toString() || booking.customerId?.toString();
        let providerUserId = (booking.providerId as any)?.userId?.toString() || (booking.providerId as any)?.userId?._id?.toString();
        if (!providerUserId && booking.providerId) {
          const prof = await ProviderProfile.findById((booking.providerId as any)?._id || booking.providerId);
          providerUserId = prof?.userId?.toString();
        }
        const userProf = await ProviderProfile.findOne({ userId: user._id }).select('_id');
        const bookingProviderId = (booking.providerId as any)?._id?.toString() || booking.providerId?.toString();

        const isAuthorized =
          user.role === 'ADMIN' ||
          customerId === user._id ||
          providerUserId === user._id ||
          (userProf && userProf._id.toString() === bookingProviderId);

        if (!isAuthorized) {
          console.warn(`[SOCKET SECURITY ALERT]: User ${user.email} (${user._id}) attempted unauthorized access to booking:${bookingId}`);
          socket.emit('unauthorized', { message: 'Forbidden: You are not a participant in this booking' });
          return;
        }

        socket.join(`booking:${bookingId}`);
        socket.emit('joined_booking', { bookingId });
        console.log(`[SOCKET]: User ${user.email} securely joined room booking:${bookingId}`);
      } catch (err: any) {
        console.error('[SOCKET ERROR]: handleJoinBooking failed:', err.message);
        socket.emit('error', { message: 'Failed to join booking room' });
      }
    };

    const handleLeaveBooking = (bookingId: string) => {
      if (bookingId) {
        socket.leave(`booking:${bookingId}`);
        socket.emit('left_booking', { bookingId });
      }
    };

    // Support both event name conventions
    socket.on('booking:join', handleJoinBooking);
    socket.on('join_booking', handleJoinBooking);

    socket.on('booking:leave', handleLeaveBooking);
    socket.on('leave_booking', handleLeaveBooking);

    socket.on('disconnect', () => {
      console.log(`[SOCKET]: Client disconnected: ${socket.id}`);
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
