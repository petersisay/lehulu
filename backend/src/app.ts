import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { getDatabaseStatus } from './config/db';
import { authenticate } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import categoryRoutes from './routes/categoryRoutes';
import providerRoutes from './routes/providerRoutes';
import bookingRoutes from './routes/bookingRoutes';
import quoteRoutes from './routes/quoteRoutes';
import messageRoutes from './routes/messageRoutes';
import reviewRoutes from './routes/reviewRoutes';
import adminRoutes from './routes/adminRoutes';

export const createApp = (): Application => {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allow inline styles & fonts in dev
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Configuration
  app.use(
    cors({
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
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  app.set('trust proxy', 1);

  // Rate Limiting - Generous threshold with automatic skip for background real-time sync polling
  const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000,
    max: env.RATE_LIMIT_MAX_REQUESTS || 10000,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false },
    skip: (req) => {
      // Never rate-limit health checks or real-time polling
      return (
        req.path.includes('/health') ||
        req.headers['x-polling'] === 'true' ||
        (req.method === 'GET' && req.path.includes('/messages')) ||
        (req.method === 'GET' && req.path.includes('/bookings'))
      );
    },
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
  });
  app.use('/api', limiter);

  // Body and Cookie Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Logging in development
  if (env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Session & Authentication middleware applied globally
  app.use(authenticate);

  // Health check endpoint
  app.get('/api/v1/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      service: 'Lehulu API',
      timestamp: new Date().toISOString(),
      environment: env.IS_STAGING ? 'staging' : env.NODE_ENV,
      version: '1.0.0',
      database: getDatabaseStatus(),
    });
  });

  // REST API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/categories', categoryRoutes);
  app.use('/api/v1/providers', providerRoutes);
  app.use('/api/v1/bookings', bookingRoutes);
  app.use('/api/v1/quotes', quoteRoutes);
  app.use('/api/v1/messages', messageRoutes);
  app.use('/api/v1/reviews', reviewRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // 404 Route Handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Endpoint ${req.originalUrl} not found on Lehulu server.`,
    });
  });

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
