import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { initialCategories } from '../src/config/seed';
import { ServiceCategory } from '../src/models/ServiceCategory';
import { User } from '../src/models/User';
import { ProviderProfile } from '../src/models/ProviderProfile';
import { ProviderVerification } from '../src/models/ProviderVerification';
import { COOKIE_NAME } from '../src/middleware/auth';

describe('Lehulu Verification Pipeline, Role Isolation & Search Relevance Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let app: any;

  let adminCookie: string;
  let customerCookie: string;
  let providerCookie: string;
  let providerUserId: string;
  let providerProfileId: string;
  let verificationId: string;
  let homeCategoryId: string;
  let autoCategoryId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Seed test categories
    for (const cat of initialCategories) {
      await ServiceCategory.create(cat);
    }
    const homeCat = await ServiceCategory.findOne({ slug: 'home-maintenance' });
    const autoCat = await ServiceCategory.findOne({ slug: 'automotive' });
    homeCategoryId = homeCat?._id.toString() || '';
    autoCategoryId = autoCat?._id.toString() || '';

    app = createApp();

    // 1. Setup Admin
    const adminEmail = process.env.ADMIN_EMAIL || 'petrossisay1646@gmail.com';
    const adminRes = await request(app)
      .post('/api/v1/auth/google')
      .send({
        idToken: `mock-google-token-${adminEmail}`,
      });
    expect(adminRes.status).toBe(200);
    const adminCookies = adminRes.headers['set-cookie'] as unknown as string[];
    adminCookie = adminCookies[0].split(';')[0];

    // 2. Setup Customer
    const custRes = await request(app)
      .post('/api/v1/auth/google')
      .send({
        idToken: 'mock-google-token-customer-e2e@lehulu.et',
      });
    expect(custRes.status).toBe(200);
    const custCookies = custRes.headers['set-cookie'] as unknown as string[];
    customerCookie = custCookies[0].split(';')[0];
    await request(app)
      .post('/api/v1/auth/onboarding')
      .set('Cookie', customerCookie)
      .send({
        role: 'CUSTOMER',
        phone: '+251911000111',
        city: 'Adama',
      });
  });

  afterAll(async () => {
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  describe('Phase 1: Provider Onboarding without Mandatory ID Image', () => {
    it('registers a provider and creates automatic ProviderVerification record in PENDING_REVIEW', async () => {
      const provRes = await request(app)
        .post('/api/v1/auth/google')
        .send({
          idToken: 'mock-google-token-provider-test@lehulu.et',
        });
      expect(provRes.status).toBe(200);
      const provCookies = provRes.headers['set-cookie'] as unknown as string[];
      providerCookie = provCookies[0].split(';')[0];
      const provUser = provRes.body.user;
      providerUserId = provUser.id || provUser._id;

      // Complete onboarding without an image URL (ID number provided)
      const onboardRes = await request(app)
        .post('/api/v1/auth/onboarding')
        .set('Cookie', providerCookie)
        .send({
          role: 'SERVICE_PROVIDER',
          phone: '+251922334455',
          city: 'Adama',
          businessName: 'Kebede Plumbing Solutions',
          category: homeCategoryId,
          trades: ['Plumbing', 'Pipe Fitting', 'Drain Cleaning'],
          bio: 'Certified master plumber in Adama and Bishoftu with 8 years experience.',
          serviceCities: ['Adama', 'Bishoftu'],
          nationalIdNumber: 'ETH-98765432-AD',
          consentGiven: true,
          // Note: idCardImageUrl is deliberately omitted to verify optional behavior
        });

      expect(onboardRes.status).toBe(200);
      expect(onboardRes.body.success).toBe(true);

      // Verify ProviderProfile state
      const profile = await ProviderProfile.findOne({ userId: providerUserId });
      expect(profile).not.toBeNull();
      expect(profile?.isVerified).toBe(false);
      expect(profile?.verificationStatus).toBe('PENDING_REVIEW');
      expect(profile?.skills).toContain('Plumbing');
      providerProfileId = profile?._id.toString() || '';

      // Verify automatic ProviderVerification creation
      const verif = await ProviderVerification.findOne({ providerProfileId: profile?._id });
      expect(verif).not.toBeNull();
      expect(verif?.status).toBe('PENDING_REVIEW');
      expect(verif?.nationalIdNumber).toBe('ETH-98765432-AD');
      expect(verif?.consentGiven).toBe(true);
      verificationId = verif?._id.toString() || '';
    });
  });

  describe('Phase 2 & 4: Unverified Providers Hidden from Customer Discovery', () => {
    it('excludes pending providers from public provider listing', async () => {
      const res = await request(app).get('/api/v1/providers');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeUndefined();
    });

    it('excludes pending providers from public search queries', async () => {
      const res = await request(app).get('/api/v1/providers?q=plumber');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeUndefined();
    });

    it('does not expose sensitive national ID number on public profile endpoint', async () => {
      const res = await request(app).get(`/api/v1/providers/${providerProfileId}`);
      if (res.status === 200) {
        expect(res.body.data.nationalIdNumber).toBeUndefined();
        expect(res.body.data.idCardImageUrl).toBeUndefined();
      } else {
        expect(res.status).toBe(404);
      }
    });
  });

  describe('Phase 2 & 3: Admin Review Queue & Bi-directional Approval', () => {
    it('presents pending application in admin verification queue with masked national ID', async () => {
      const res = await request(app)
        .get('/api/v1/admin/verifications?status=PENDING_REVIEW')
        .set('Cookie', adminCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const items = res.body.verifications || res.body.data || [];
      const item = items.find((v: any) => v._id === verificationId);
      expect(item).toBeDefined();
      // Verify national ID masking for privacy
      expect(item.nationalIdNumber).toContain('•');
      expect(item.nationalIdNumber).not.toBe('ETH-98765432-AD');
    });

    it('rejects verification attempt by unauthorized non-admin user with 403', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${verificationId}`)
        .set('Cookie', customerCookie)
        .send({ status: 'VERIFIED' });

      expect(res.status).toBe(403);
    });

    it('admin approves verification application and synchronizes verification status across models', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${verificationId}`)
        .set('Cookie', adminCookie)
        .send({ status: 'VERIFIED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify ProviderVerification status
      const updatedVerif = await ProviderVerification.findById(verificationId);
      expect(updatedVerif?.status).toBe('VERIFIED');

      // Verify ProviderProfile status
      const updatedProfile = await ProviderProfile.findById(providerProfileId);
      expect(updatedProfile?.verificationStatus).toBe('VERIFIED');
      expect(updatedProfile?.isVerified).toBe(true);

      // Verify User status
      const updatedUser = await User.findById(providerUserId);
      expect(updatedUser?.isActive).toBe(true);
    });
  });

  describe('Phase 5: Search Relevance & Category Matching After Approval', () => {
    it('now includes the approved provider in public provider listing', async () => {
      const res = await request(app).get('/api/v1/providers');
      expect(res.status).toBe(200);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeDefined();
      expect(found.isVerified).toBe(true);
    });

    it('matches exact trade query "plumber"', async () => {
      const res = await request(app).get('/api/v1/providers?q=plumber');
      expect(res.status).toBe(200);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeDefined();
    });

    it('matches synonym query "pipe"', async () => {
      const res = await request(app).get('/api/v1/providers?q=pipe');
      expect(res.status).toBe(200);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeDefined();
    });

    it('excludes provider when searching for unrelated trade "mechanic"', async () => {
      const res = await request(app).get('/api/v1/providers?q=mechanic');
      expect(res.status).toBe(200);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeUndefined();
    });

    it('matches provider when filtering by their category slug "home-maintenance"', async () => {
      const res = await request(app).get('/api/v1/providers?category=home-maintenance');
      expect(res.status).toBe(200);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeDefined();
    });

    it('strictly excludes provider when filtering by mismatched category "automotive"', async () => {
      const res = await request(app).get('/api/v1/providers?category=automotive');
      expect(res.status).toBe(200);
      const providers = res.body.providers || res.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeUndefined();
    });
  });

  describe('Phase 4: Provider Suspension & Revocation', () => {
    it('admin suspends/rejects provider and provider is immediately hidden from discovery', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/verifications/${verificationId}`)
        .set('Cookie', adminCookie)
        .send({ status: 'REJECTED', rejectionReason: 'License lapsed' });

      expect(res.status).toBe(200);

      // Verify DB flags
      const updatedProfile = await ProviderProfile.findById(providerProfileId);
      expect(updatedProfile?.verificationStatus).toBe('REJECTED');
      expect(updatedProfile?.isVerified).toBe(false);

      // Verify hidden from public discovery
      const searchRes = await request(app).get('/api/v1/providers');
      const providers = searchRes.body.providers || searchRes.body.data || [];
      const found = providers.find((p: any) => p._id === providerProfileId);
      expect(found).toBeUndefined();
    });
  });
});
