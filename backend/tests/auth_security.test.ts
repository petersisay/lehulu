import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { verifyGoogleIdToken, COOKIE_NAME } from '../src/middleware/auth';
import { env } from '../src/config/env';

describe('Lehulu (ለሁሉ) Authentication Security & Mock Auth Boundary Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
    app = createApp();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('1. Mock Authentication Rejection in Staging & Production Configurations', () => {
    it('should reject mock tokens when APP_ENV is staging', async () => {
      const originalAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'staging';

      await expect(verifyGoogleIdToken('mock-google-token-attacker@example.com')).rejects.toThrow(
        /strictly prohibited in staging and production environments/i
      );

      process.env.APP_ENV = originalAppEnv;
    });

    it('should reject mock admin tokens when APP_ENV is staging', async () => {
      const originalAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'staging';

      await expect(verifyGoogleIdToken('mock_token_admin')).rejects.toThrow(
        /strictly prohibited in staging and production environments/i
      );

      process.env.APP_ENV = originalAppEnv;
    });

    it('should reject mock tokens when STAGING environment flag is true', async () => {
      const originalStaging = process.env.STAGING;
      process.env.STAGING = 'true';

      await expect(verifyGoogleIdToken('mock_token_customer')).rejects.toThrow(
        /strictly prohibited in staging and production environments/i
      );

      process.env.STAGING = originalStaging;
    });

    it('POST /api/v1/auth/google should reject mock tokens when APP_ENV is staging with 401', async () => {
      const originalAppEnv = process.env.APP_ENV;
      process.env.APP_ENV = 'staging';

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-hacker@example.com' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/strictly prohibited in staging and production/i);

      process.env.APP_ENV = originalAppEnv;
    });
  });

  describe('2. Test-Only Authorization Gate Enforcement', () => {
    it('should reject mock tokens when ALLOW_TEST_AUTH is false', async () => {
      const originalAllowTest = process.env.ALLOW_TEST_AUTH;
      process.env.ALLOW_TEST_AUTH = 'false';

      await expect(verifyGoogleIdToken('mock-google-token-user@example.com')).rejects.toThrow(
        /Mock authentication is disabled. Real Google Identity verification is required/i
      );

      process.env.ALLOW_TEST_AUTH = originalAllowTest;
    });

    it('should accept mock tokens only when ALLOW_TEST_AUTH is true in test environment', async () => {
      process.env.ALLOW_TEST_AUTH = 'true';
      const user = await verifyGoogleIdToken('mock-google-token-legitimate.test@example.com');

      expect(user.email).toBe('legitimate.test@example.com');
      expect(user.googleId).toBe('mock-google-id-legitimate.test@example.com');
    });
  });

  describe('3. Privilege Escalation & Admin Role Assignment Boundary', () => {
    it('mock tokens for arbitrary emails must NOT receive administrator privileges', async () => {
      process.env.ALLOW_TEST_AUTH = 'true';
      const payload = await verifyGoogleIdToken('mock-google-token-random@gmail.com');

      expect(payload.email).toBe('random@gmail.com');
      expect(payload.name).not.toContain('Administrator');
    });

    it('mock token matching ADMIN_EMAIL receives administrator identity in isolated test', async () => {
      process.env.ALLOW_TEST_AUTH = 'true';
      const adminEmail = env.ADMIN_EMAIL.toLowerCase();
      const payload = await verifyGoogleIdToken(`mock-google-token-${adminEmail}`);

      expect(payload.email).toBe(adminEmail);
      expect(payload.name).toContain('Administrator');
    });

    it('users cannot self-escalate to ADMIN role via onboarding endpoint', async () => {
      // Register test customer
      process.env.ALLOW_TEST_AUTH = 'true';
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-customer.privilege.test@example.com' });

      const cookie = (res.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      // Attempt escalation to ADMIN
      const escalateRes = await request(app)
        .post('/api/v1/auth/onboarding')
        .set('Cookie', cookie)
        .send({
          role: 'ADMIN',
          city: 'Adama',
        });

      expect(escalateRes.status).toBe(400);
      expect(escalateRes.body.success).toBe(false);
      expect(escalateRes.body.message).toMatch(/Validation failed|Invalid onboarding role/i);
    });
  });

  describe('4. Malformed Tokens & Missing Authentication Configuration', () => {
    it('should reject request missing idToken with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject empty idToken with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject completely unrecognized non-mock non-Google token with 401', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'totally-invalid-garbage-token-string' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('5. Session Security & Cookie Hardening', () => {
    it('session cookie must have HttpOnly and Path=/ attributes', async () => {
      process.env.ALLOW_TEST_AUTH = 'true';
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-cookie.test@example.com' });

      expect(res.status).toBe(200);
      const setCookie = (res.headers['set-cookie'] as unknown as string[])[0];

      expect(setCookie).toContain(COOKIE_NAME);
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/');
    });

    it('POST /api/v1/auth/logout should clear the session cookie', async () => {
      const res = await request(app).post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const setCookie = (res.headers['set-cookie'] as unknown as string[])[0];
      expect(setCookie).toContain(`${COOKIE_NAME}=;`);
    });
  });
});
