const { Server: SocketIOServer } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');
const { env } = require('../config/env');
const { COOKIE_NAME } = require('../middleware/auth');
const { Booking } = require('../models/Booking');
const { ProviderProfile } = require('../models/ProviderProfile');

let io = null;

const parseCookies = (cookieHeader) => {
  const list = {};
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0] ? parts[0].trim() : undefined;
    if (!name) return;
    const value = parts.slice(1).join('=').trim();
    list[name] = decodeURIComponent(value);
  });
  return list;
};

const initSockets = (httpServer) => {
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
  io.use((socket, next) => {
    try {
      let token;

      // Check cookie from handshake headers
      if (socket.handshake.headers.cookie) {
        const parsedCookies = parseCookies(socket.handshake.headers.cookie);
        token = parsedCookies[COOKIE_NAME];
      }

      // Check auth handshake payload
      if (!token && socket.handshake.auth && socket.handshake.auth.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication token missing for WebSocket connection'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error(`WebSocket authentication error: ${err.message}`));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (user && user._id) {
      // Join personal user room for targeted notifications
      socket.join(`user:${user._id}`);
      console.log(`[SOCKET]: Client authenticated and connected: ${user.email} (${socket.id})`);
    }

    // Securely join booking conversation room with participant authorization
    const handleJoinBooking = async (bookingId) => {
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
        const customerId = (booking.customerId && booking.customerId._id) ? booking.customerId._id.toString() : (booking.customerId ? booking.customerId.toString() : '');
        let providerUserId = (booking.providerId && booking.providerId.userId) ? (booking.providerId.userId._id ? booking.providerId.userId._id.toString() : booking.providerId.userId.toString()) : undefined;
        if (!providerUserId && booking.providerId) {
          const prof = await ProviderProfile.findById(booking.providerId._id || booking.providerId);
          providerUserId = prof && prof.userId ? prof.userId.toString() : undefined;
        }
        const userProf = await ProviderProfile.findOne({ userId: user._id }).select('_id');
        const bookingProviderId = (booking.providerId && booking.providerId._id) ? booking.providerId._id.toString() : (booking.providerId ? booking.providerId.toString() : '');

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
      } catch (err) {
        console.error('[SOCKET ERROR]: handleJoinBooking failed:', err.message);
        socket.emit('error', { message: 'Failed to join booking room' });
      }
    };

    const handleLeaveBooking = (bookingId) => {
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

const emitSocketEvent = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

const getIO = () => io;

module.exports = {
  initSockets,
  emitSocketEvent,
  getIO,
};
