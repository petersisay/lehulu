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

// Only authenticated CUSTOMER can submit review for completed service
router.post('/', requireRole('CUSTOMER'), validateRequest(createReviewSchema), createReview);

// Public provider reviews listing
router.get('/provider/:providerId', getProviderReviews);

// Only assigned SERVICE_PROVIDER can respond to customer review
router.post(
  '/:reviewId/respond',
  requireRole('SERVICE_PROVIDER'),
  validateRequest(respondToReviewSchema),
  respondToReview
);

export default router;
