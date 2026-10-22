import { Router } from 'express';
import {
  createReview,
  getProviderReviews,
  respondToReview,
  createReviewSchema,
  respondToReviewSchema,
} from '../controllers/reviewController';
import { validateRequest } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/rbac';

const router = Router();

// Customer submits review for completed service
router.post('/', requireAuth, validateRequest(createReviewSchema), createReview);

// Public provider reviews listing
router.get('/provider/:providerId', getProviderReviews);

// Provider response to customer review
router.post(
  '/:reviewId/respond',
  requireRole('SERVICE_PROVIDER', 'ADMIN'),
  validateRequest(respondToReviewSchema),
  respondToReview
);

export default router;
