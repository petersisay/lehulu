import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { initialCategories } from '../src/config/seed';
import { ServiceCategory } from '../src/models/ServiceCategory';
import { User } from '../src/models/User';
import { ProviderProfile } from '../src/models/ProviderProfile';
import { Booking } from '../src/models/Booking';
import { COOKIE_NAME } from '../src/middleware/auth';

describe('Lehulu (ለሁሉ) Security, RBAC & Role Boundary Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  let customer1Cookie: string;
  let customer1User: any;
  let customer2Cookie: string;
  let customer2User: any;
  let provider1Cookie: string;
  let provider1User: any;
  let provider1Profile: any;
  let provider2Cookie: string;
  let provider2User: any;
  let adminCookie: string;
  let adminUser: any;
  let categoryId: string;
  let activeBookingId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    app = createApp();

    // Seed categories
    for (const cat of initialCategories) {
      await ServiceCategory.create(cat);
    }
    const cat = await ServiceCategory.findOne({ slug: 'home-maintenance' });
    categoryId = cat?._id.toString() || '';

    // Register Customer 1
    const resC1 = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-google-token-c1@example.com' });
    customer1Cookie = (resC1.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    customer1User = resC1.body.user;

    // Register Customer 2
    const resC2 = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-google-token-c2@example.com' });
    customer2Cookie = (resC2.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    customer2User = resC2.body.user;

    // Register and Onboard Provider 1
    const resP1 = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-google-token-p1@example.com' });
    provider1Cookie = (resP1.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    await request(app)
      .post('/api/v1/auth/onboarding')
      .set('Cookie', provider1Cookie)
      .send({
        role: 'SERVICE_PROVIDER',
        city: 'Adama',
        businessName: 'Provider 1 Services',
        categoryId,
        phoneNumber: '0911000001',
      });
    provider1User = await User.findOne({ email: 'p1@example.com' });
    provider1Profile = await ProviderProfile.findOne({ userId: provider1User._id });

    // Register and Onboard Provider 2
    const resP2 = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-google-token-p2@example.com' });
    provider2Cookie = (resP2.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    await request(app)
      .post('/api/v1/auth/onboarding')
      .set('Cookie', provider2Cookie)
      .send({
        role: 'SERVICE_PROVIDER',
        city: 'Bishoftu',
        businessName: 'Provider 2 Services',
        categoryId,
        phoneNumber: '0911000002',
      });
    provider2User = await User.findOne({ email: 'p2@example.com' });

    // Register Super Admin
    const resAdm = await request(app)
      .post('/api/v1/auth/google')
      .send({ idToken: 'mock-google-token-petrossisay1646@gmail.com' });
    adminCookie = (resAdm.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    adminUser = resAdm.body.user;

    // Create an active booking between Customer 1 and Provider 1
    const resBooking = await request(app)
      .post('/api/v1/bookings')
      .set('Cookie', customer1Cookie)
      .send({
        providerId: provider1Profile._id.toString(),
        categoryId,
        requestedDate: '2026-11-15',
        requestedTimeSlot: 'MORNING',
        problemDescription: 'Faulty circuit breaker in Adama kebele 04 residence.',
        serviceAddress: {
          city: 'Adama',
          subcity: 'Bole',
          kebele: '04',
          streetAddress: 'House 524 near stadium',
          contactPhone: '0911000001',
        },
      });
    activeBookingId = resBooking.body?.booking?._id;
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('1. Unauthenticated Request Protection', () => {
    it('should reject unauthenticated booking creation with 401', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .send({
          providerId: provider1Profile._id.toString(),
          categoryId,
          requestedDate: '2026-11-15',
          requestedTimeSlot: 'MORNING',
          problemDescription: 'Unauthorized request attempt',
          serviceAddress: {
            city: 'Adama',
            subcity: 'Central',
            kebele: '01',
            streetAddress: 'Main St 123',
            contactPhone: '0911000001',
          },
        });
      expect(res.status).toBe(401);
    });

    it('should return authenticated: false when unauthenticated user queries /auth/me', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
      expect(res.body.user).toBeNull();
    });

    it('should reject unauthenticated access to protected user profile with 401', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .send({ displayName: 'Hacker' });
      expect(res.status).toBe(401);
    });

    it('should reject malformed or tampered auth cookies with 401', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Cookie', `${COOKIE_NAME}=malicious.fake.token`)
        .send({ displayName: 'Hacker' });
      expect(res.status).toBe(401);
    });
  });

  describe('2. Strict Role Authorization Boundaries', () => {
    it('SERVICE_PROVIDER cannot create a booking request (must return 403)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', provider1Cookie)
        .send({
          providerId: provider1Profile._id.toString(),
          categoryId,
          requestedDate: '2026-11-15',
          requestedTimeSlot: 'MORNING',
          problemDescription: 'Provider attempting self-booking',
          serviceAddress: {
            city: 'Adama',
            subcity: 'Central',
            kebele: '01',
            streetAddress: 'Main St 123',
            contactPhone: '0911000001',
          },
        });
      expect(res.status).toBe(403);
    });

    it('ADMIN cannot create a customer booking request (must return 403)', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', adminCookie)
        .send({
          providerId: provider1Profile._id.toString(),
          categoryId,
          requestedDate: '2026-11-15',
          requestedTimeSlot: 'MORNING',
          problemDescription: 'Admin attempting customer booking',
          serviceAddress: {
            city: 'Adama',
            subcity: 'Central',
            kebele: '01',
            streetAddress: 'Main St 123',
            contactPhone: '0911000001',
          },
        });
      expect(res.status).toBe(403);
    });

    it('CUSTOMER cannot submit a formal quotation (must return 403)', async () => {
      const res = await request(app)
        .post('/api/v1/quotes')
        .set('Cookie', customer1Cookie)
        .send({
          bookingId: activeBookingId,
          items: [{ description: 'Unauthorized labor', quantity: 1, unitPrice: 500 }],
          estimatedDurationHours: 2,
        });
      expect(res.status).toBe(403);
    });

    it('SERVICE_PROVIDER cannot accept or decline a quotation (must return 403)', async () => {
      const res = await request(app)
        .post(`/api/v1/quotes/${new mongoose.Types.ObjectId()}/respond`)
        .set('Cookie', provider1Cookie)
        .send({ action: 'ACCEPT' });
      expect(res.status).toBe(403);
    });

    it('SERVICE_PROVIDER cannot submit reviews (must return 403)', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', provider1Cookie)
        .send({
          bookingId: activeBookingId,
          providerId: provider1Profile._id.toString(),
          rating: 5,
          comment: 'Self review attempt',
        });
      expect(res.status).toBe(403);
    });

    it('CUSTOMER cannot submit provider response to a review (must return 403)', async () => {
      const res = await request(app)
        .post(`/api/v1/reviews/${new mongoose.Types.ObjectId()}/respond`)
        .set('Cookie', customer1Cookie)
        .send({ response: 'Customer impersonating provider response' });
      expect(res.status).toBe(403);
    });

    it('CUSTOMER cannot access admin verification queue (must return 403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/verifications')
        .set('Cookie', customer1Cookie);
      expect(res.status).toBe(403);
    });
  });

  describe('3. Multi-Tenant Tenancy & Data Isolation Boundaries', () => {
    it('Customer 2 cannot view or modify Customer 1 private booking', async () => {
      const res = await request(app)
        .get(`/api/v1/bookings/${activeBookingId}`)
        .set('Cookie', customer2Cookie);
      // Must be forbidden (403) or not found (404)
      expect([403, 404]).toContain(res.status);
    });

    it('Provider 2 cannot submit quotation for Provider 1 booking', async () => {
      const res = await request(app)
        .post('/api/v1/quotes')
        .set('Cookie', provider2Cookie)
        .send({
          bookingId: activeBookingId,
          items: [{ description: 'Interloper quote', quantity: 1, unitPrice: 750 }],
          estimatedDurationHours: 3,
        });
      // Should reject because Provider 2 is not the assigned provider
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('4. Input Validation & Error Handling Boundaries', () => {
    it('should reject booking creation with missing required fields with 400', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customer1Cookie)
        .send({
          // Missing providerId, categoryId, etc.
          problemDescription: 'Incomplete payload',
        });
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle non-existent resource ID requests with 404 without crashing', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/v1/bookings/${nonExistentId}`)
        .set('Cookie', customer1Cookie);
      expect(res.status).toBe(404);
    });

    it('should reject invalid or non-existent route with 404 message', async () => {
      const res = await request(app).get('/api/v1/non-existent-endpoint');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
