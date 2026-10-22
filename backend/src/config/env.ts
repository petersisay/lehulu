import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const DEV_FALLBACK_SESSION = 'lehulu_dev_session_secret_32chars_long_fallback';
const DEV_FALLBACK_JWT = 'lehulu_dev_jwt_secret_32chars_long_fallback';
const DEV_FALLBACK_MONGO = 'mongodb://127.0.0.1:27017/lehulu';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    MONGODB_URI: z.string().default(DEV_FALLBACK_MONGO),
    SESSION_SECRET: z.string().default(DEV_FALLBACK_SESSION),
    JWT_SECRET: z.string().default(DEV_FALLBACK_JWT),
    COOKIE_DOMAIN: z.string().default('localhost'),
    GOOGLE_CLIENT_ID: z.string().default(''),
    ADMIN_EMAIL: z.string().default('petrossisay1646@gmail.com'),
    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    UPLOAD_DIR: z.string().default('./uploads'),
    RATE_LIMIT_WINDOW_MS: z.string().transform((val) => parseInt(val, 10)).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform((val) => parseInt(val, 10)).default('100'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.SESSION_SECRET || data.SESSION_SECRET === DEV_FALLBACK_SESSION || data.SESSION_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SESSION_SECRET'],
          message: 'Production requires a secure, custom SESSION_SECRET of at least 32 characters.',
        });
      }

      if (!data.JWT_SECRET || data.JWT_SECRET === DEV_FALLBACK_JWT || data.JWT_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_SECRET'],
          message: 'Production requires a secure, custom JWT_SECRET of at least 32 characters.',
        });
      }

      if (
        !data.MONGODB_URI ||
        data.MONGODB_URI === DEV_FALLBACK_MONGO ||
        data.MONGODB_URI.includes('127.0.0.1') ||
        data.MONGODB_URI.includes('localhost')
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['MONGODB_URI'],
          message: 'Production requires an explicit, remote MongoDB connection URI (e.g. MongoDB Atlas).',
        });
      }

      if (!data.GOOGLE_CLIENT_ID || data.GOOGLE_CLIENT_ID.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['GOOGLE_CLIENT_ID'],
          message: 'Production requires an authorized GOOGLE_CLIENT_ID for Google authentication.',
        });
      }

      if (!data.CLIENT_URL.startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLIENT_URL'],
          message: 'Production CLIENT_URL must use HTTPS protocol.',
        });
      }
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('Fatal: Invalid environment configuration:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(` - [${issue.path.join('.')}]: ${issue.message}`);
  });
  process.exit(1);
}

export const env = {
  ...parsedEnv.data,
  IS_PRODUCTION: parsedEnv.data.NODE_ENV === 'production',
  IS_TEST: parsedEnv.data.NODE_ENV === 'test',
  IS_DEV: parsedEnv.data.NODE_ENV === 'development',
};
