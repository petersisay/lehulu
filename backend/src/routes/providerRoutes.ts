import { Router } from 'express';
import {
  searchProviders,
  getProviderProfile,
  getMyProviderProfile,
  updateProviderProfile,
  submitVerification,
  updateProviderProfileSchema,
  submitVerificationSchema,
} from '../controllers/providerController';
import { validateRequest } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/rbac';

const router = Router();

// Public provider discovery routes
router.get('/', searchProviders);

// Provider self-management routes
router.get('/me', requireRole('SERVICE_PROVIDER', 'ADMIN'), getMyProviderProfile);
router.put('/me', requireRole('SERVICE_PROVIDER'), validateRequest(updateProviderProfileSchema), updateProviderProfile);
router.post('/verify', requireRole('SERVICE_PROVIDER'), validateRequest(submitVerificationSchema), submitVerification);

// Public provider profile view by ID
router.get('/:id', getProviderProfile);

export default router;
