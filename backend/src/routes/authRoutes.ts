import { Router } from 'express';
import {
  googleLogin,
  completeOnboarding,
  getMe,
  logout,
  googleAuthSchema,
  onboardingRoleSchema,
} from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/rbac';

const router = Router();

router.post('/google', validateRequest(googleAuthSchema), googleLogin);
router.post('/onboarding', requireAuth, validateRequest(onboardingRoleSchema), completeOnboarding);
router.get('/me', getMe);
router.post('/logout', logout);

export default router;
