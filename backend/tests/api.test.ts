import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { initialCategories } from '../src/config/seed';
import { ServiceCategory } from '../src/models/ServiceCategory';
import { User } from '../src/models/User';
import { ProviderProfile } from '../src/models/ProviderProfile';
import { Booking } from '../src/models/Booking';
import { Quote } from '../src/models/Quote';
import { Review } from '../src/models/Review';
import { COOKIE_NAME } from '../src/middleware/auth';

describe('Lehulu (ለሁሉ) Full-Stack Marketplace API Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  // Test session variables
  let customerCookie: string;
  let customerUser: any;
  let providerCookie: string;
  let providerUser: any;
  let adminCookie: string;
  let adminUser: any;
  let testCategoryId: string;
  let testProviderProfileId: string;
  let testBookingId: string;
  let testQuoteId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed categories
    for (const cat of initialCategories) {
      await ServiceCategory.create(cat);
    }
    const cat = await ServiceCategory.findOne({ slug: 'home-maintenance' });
    testCategoryId = cat?._id.toString() || '';

    app = createApp();
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('1. Health Check & Platform Setup', () => {
    it('GET /api/v1/health should return UP status and version info', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.service).toBe('Lehulu API');
    });

    it('GET /api/v1/categories should list all active service categories', async () => {
      const res = await request(app).get('/api/v1/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(5);
      expect(res.body.categories[0]).toHaveProperty('nameAm');
    });
  });

  describe('2. Authentication & Three-Role Onboarding', () => {
    it('POST /api/v1/auth/google should register a new customer', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-abebe@gmail.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.email).toBe('abebe@gmail.com');
      expect(res.body.user.role).toBe('CUSTOMER');
      expect(res.body.user.isOnboarded).toBe(false);

      // Verify HttpOnly cookie
      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toContain(COOKIE_NAME);
      customerCookie = cookies[0].split(';')[0];
      customerUser = res.body.user;
    });

    it('POST /api/v1/auth/onboarding should complete customer onboarding', async () => {
      const res = await request(app)
        .post('/api/v1/auth/onboarding')
        .set('Cookie', customerCookie)
        .send({
          role: 'CUSTOMER',
          city: 'Adama',
          phoneNumber: '0911223344',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.isOnboarded).toBe(true);
      expect(res.body.user.role).toBe('CUSTOMER');
    });

    it('POST /api/v1/auth/google should register a service provider and initialize profile', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-kebede.plumber@gmail.com' });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'] as unknown as string[];
      providerCookie = cookies[0].split(';')[0];
      providerUser = res.body.user;

      // Onboard as SERVICE_PROVIDER
      const onboardRes = await request(app)
        .post('/api/v1/auth/onboarding')
        .set('Cookie', providerCookie)
        .send({
          role: 'SERVICE_PROVIDER',
          city: 'Adama',
          businessName: 'Kebede Expert Plumbing',
          categoryId: testCategoryId,
          phoneNumber: '0922334455',
        });

      expect(onboardRes.status).toBe(200);
      expect(onboardRes.body.user.role).toBe('SERVICE_PROVIDER');
      expect(onboardRes.body.user.isVerified).toBe(false); // Unverified initially

      const profile = await ProviderProfile.findOne({ userId: providerUser._id });
      expect(profile).toBeDefined();
      expect(profile?.verificationStatus).toBe('PENDING_REVIEW');
      testProviderProfileId = profile?._id.toString() || '';
    });

    it('POST /api/v1/auth/google should provision configured super administrator', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-petrossisay1646@gmail.com' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('ADMIN');
      expect(res.body.user.isOnboarded).toBe(true);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      adminCookie = cookies[0].split(';')[0];
      adminUser = res.body.user;
    });
  });

  describe('3. Role-Based Authorization & Security Boundaries', () => {
    it('Customer should be rejected with 403 when accessing Admin verification queue', async () => {
      const res = await request(app)
        .get('/api/v1/admin/verifications')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Customer should not be able to escalate role to ADMIN via onboarding', async () => {
      const res = await request(app)
        .post('/api/v1/auth/onboarding')
        .set('Cookie', customerCookie)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(400);
    });
  });

  describe('4. Provider Verification Workflow', () => {
    let verificationId: string;

    it('Provider submits credentials & national ID for verification', async () => {
      const res = await request(app)
        .post('/api/v1/providers/verify')
        .set('Cookie', providerCookie)
        .send({
          nationalIdNumber: 'ETH-10293847',
          idCardImageUrl: 'https://storage.lehulu.et/docs/kebede_kebele_id.jpg',
          tradeLicenseUrl: 'https://storage.lehulu.et/docs/plumbing_cert.jpg',
          certificateUrls: ['https://storage.lehulu.et/docs/tvet_diploma.jpg'],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verification.status).toBe('PENDING_REVIEW');
      verificationId = res.body.verification._id;
    });

    it('Admin views verification queue and approves provider', async () => {
      const queueRes = await request(app)
        .get('/api/v1/admin/verifications?status=PENDING_REVIEW')
        .set('Cookie', adminCookie);

      expect(queueRes.status).toBe(200);
      expect(queueRes.body.verifications.length).toBeGreaterThanOrEqual(1);

      // Approve verification
      const approveRes = await request(app)
        .patch(`/api/v1/admin/verifications/${verificationId}`)
        .set('Cookie', adminCookie)
        .send({
          status: 'VERIFIED',
          adminNotes: 'National ID and TVET plumbing credentials verified successfully.',
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.verification.status).toBe('VERIFIED');
      expect(approveRes.body.provider.isVerified).toBe(true);
      expect(approveRes.body.provider.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('5. Provider Discovery & Search', () => {
    it('GET /api/v1/providers should discover verified providers in Adama', async () => {
      const res = await request(app)
        .get('/api/v1/providers')
        .query({ city: 'Adama', verifiedOnly: 'true' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.providers.length).toBeGreaterThanOrEqual(1);
      expect(res.body.providers[0].businessName).toBe('Kebede Expert Plumbing');
      expect(res.body.providers[0].isVerified).toBe(true);
    });

    it('GET /api/v1/providers/:id should return complete public profile without exposing sensitive private address', async () => {
      const res = await request(app).get(`/api/v1/providers/${testProviderProfileId}`);
      expect(res.status).toBe(200);
      expect(res.body.provider.businessName).toBe('Kebede Expert Plumbing');
      expect(res.body.provider.isVerified).toBe(true);
      expect(res.body.provider).not.toHaveProperty('nationalIdNumber'); // Sensitive ID protected
    });
  });

  describe('6. Booking, Quotations & Dual Confirmation Lifecycle', () => {
    it('Customer creates service booking request', async () => {
      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', customerCookie)
        .send({
          providerId: testProviderProfileId,
          categoryId: testCategoryId,
          requestedDate: new Date(Date.now() + 86400000).toISOString(),
          requestedTimeSlot: '10:00 AM - 01:00 PM',
          problemDescription: 'Water pipe leaking under kitchen sink, needs urgent replacement of washer and joint.',
          serviceAddress: {
            city: 'Adama',
            subcity: 'Bole',
            kebele: 'Kebele 04',
            streetAddress: 'Near Stadium, House 412',
            contactPhone: '0911223344',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.status).toBe('REQUESTED');
      expect(res.body.booking.bookingNumber).toMatch(/^LHL-\d{4}-\d{5}$/);
      testBookingId = res.body.booking._id;
    });

    it('Provider submits itemized formal quotation in ETB', async () => {
      const res = await request(app)
        .post('/api/v1/quotes')
        .set('Cookie', providerCookie)
        .send({
          bookingId: testBookingId,
          items: [
            { description: 'Pipe joint replacement & sealing', quantity: 1, unitPrice: 450 },
            { description: 'Labor & diagnostics inspection fee', quantity: 1, unitPrice: 350 },
          ],
          estimatedDurationHours: 2,
          inspectionIncluded: true,
          notes: 'Includes high-grade copper fittings.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.quote.totalAmount).toBe(800);
      expect(res.body.quote.currency).toBe('ETB');
      expect(res.body.quote.status).toBe('PROPOSED');
      testQuoteId = res.body.quote._id;

      // Verify booking status transitioned to QUOTED
      const booking = await Booking.findById(testBookingId);
      expect(booking?.status).toBe('QUOTED');
    });

    it('Customer accepts quotation and booking transitions to CONFIRMED', async () => {
      const res = await request(app)
        .post(`/api/v1/quotes/${testQuoteId}/respond`)
        .set('Cookie', customerCookie)
        .send({ action: 'ACCEPT' });

      expect(res.status).toBe(200);
      expect(res.body.quote.status).toBe('ACCEPTED');
      expect(res.body.booking.status).toBe('CONFIRMED');
      expect(res.body.booking.agreedPrice.amount).toBe(800);
      expect(res.body.booking.agreedPrice.isFinal).toBe(true);
    });

    it('Provider starts work: CONFIRMED -> IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Cookie', providerCookie)
        .send({ status: 'IN_PROGRESS' });

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('IN_PROGRESS');
    });

    it('Provider marks job as COMPLETION_PENDING for customer verification', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Cookie', providerCookie)
        .send({ status: 'COMPLETION_PENDING' });

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('COMPLETION_PENDING');
    });

    it('Customer confirms satisfaction: COMPLETION_PENDING -> COMPLETED', async () => {
      const res = await request(app)
        .patch(`/api/v1/bookings/${testBookingId}/status`)
        .set('Cookie', customerCookie)
        .send({ status: 'COMPLETED' });

      expect(res.status).toBe(200);
      expect(res.body.booking.status).toBe('COMPLETED');

      // Verify provider completed booking counter was incremented
      const provider = await ProviderProfile.findById(testProviderProfileId);
      expect(provider?.completedBookingsCount).toBe(1);
    });
  });

  describe('7. In-Booking Messaging & Tenancy Authorization', () => {
    it('Customer sends message in booking room', async () => {
      const res = await request(app)
        .post(`/api/v1/messages/${testBookingId}`)
        .set('Cookie', customerCookie)
        .send({ content: 'Hello Kebede, thank you for the excellent plumbing work today!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('excellent plumbing work');
    });

    it('Unrelated user should be forbidden (403) from accessing booking chat', async () => {
      // Register a third unrelated customer
      const thirdRes = await request(app)
        .post('/api/v1/auth/google')
        .send({ idToken: 'mock-google-token-stranger@gmail.com' });
      const strangerCookie = (thirdRes.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      const res = await request(app)
        .get(`/api/v1/messages/${testBookingId}`)
        .set('Cookie', strangerCookie);

      expect(res.status).toBe(403);
    });
  });

  describe('8. Authentic Reviews & Rating Calculation', () => {
    it('Customer submits genuine review for completed booking', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', customerCookie)
        .send({
          bookingId: testBookingId,
          rating: 5,
          comment: 'Kebede was punctual, professional, and solved our kitchen leak quickly. Highly recommended!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.review.rating).toBe(5);

      // Verify provider aggregate rating was recalculated from real database records
      const provider = await ProviderProfile.findById(testProviderProfileId);
      expect(provider?.rating).toBe(5);
      expect(provider?.reviewCount).toBe(1);
    });

    it('Customer cannot submit a second duplicate review for the same booking', async () => {
      const res = await request(app)
        .post('/api/v1/reviews')
        .set('Cookie', customerCookie)
        .send({
          bookingId: testBookingId,
          rating: 4,
          comment: 'Trying to submit duplicate review.',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already been submitted');
    });

    it('Provider responds professionally to the customer review', async () => {
      const reviews = await Review.find({ providerId: testProviderProfileId });
      const reviewId = reviews[0]._id;

      const res = await request(app)
        .post(`/api/v1/reviews/${reviewId}/respond`)
        .set('Cookie', providerCookie)
        .send({ text: 'Thank you Abebe! It was a pleasure serving your household.' });

      expect(res.status).toBe(200);
      expect(res.body.review.providerResponse.text).toContain('Thank you Abebe');
    });
  });

  describe('9. Administrative Platform Analytics & Audit Logs', () => {
    it('Admin views honest platform statistics derived from database', async () => {
      const res = await request(app)
        .get('/api/v1/admin/stats')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.stats.verifiedProviders).toBe(1);
      expect(res.body.stats.completedBookings).toBe(1);
      expect(res.body.stats.totalCustomers).toBeGreaterThanOrEqual(1);
    });

    it('Admin inspects audit logs recording verification approvals', async () => {
      const res = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.logs.length).toBeGreaterThanOrEqual(1);
      expect(res.body.logs.some((l: any) => l.action.includes('PROVIDER_VERIFICATION'))).toBe(true);
    });
  });

  describe('10. User Profile Updates & Logout', () => {
    it('Customer updates profile preferences and preferred language to Amharic', async () => {
      const res = await request(app)
        .put('/api/v1/users/profile')
        .set('Cookie', customerCookie)
        .send({
          displayName: 'Abebe Bikila',
          preferredLanguage: 'am',
          city: 'Adama',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('Abebe Bikila');
      expect(res.body.user.preferredLanguage).toBe('am');
    });

    it('POST /api/v1/auth/logout should clear session cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const cookies = res.headers['set-cookie'] as unknown as string[];
      expect(cookies[0]).toContain(`${COOKIE_NAME}=;`);
    });
  });
});
