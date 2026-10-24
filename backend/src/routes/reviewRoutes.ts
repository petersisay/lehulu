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

// Middleware to ensure bookingId from route param is copied to body if missing
const normalizeBookingId = (req: any, _res: any, next: any) => {
  if (req.params.bookingId && !req.body.bookingId) {
    req.body.bookingId = req.params.bookingId;
  }
  next();
};

// Only authenticated CUSTOMER can submit review for completed service (support both / and /:bookingId)
router.post(
  '/:bookingId',
  requireRole('CUSTOMER'),
  normalizeBookingId,
  validateRequest(createReviewSchema),
  createReview
);

router.post(
  '/',
  requireRole('CUSTOMER'),
  normalizeBookingId,
  validateRequest(createReviewSchema),
  createReview
);

// Public provider reviews listing
router.get('/provider/:providerId', getProviderReviews);

// Only assigned SERVICE_PROVIDER can respond to customer review (support both /respond and /response)
router.post(
  '/:reviewId/respond',
  requireRole('SERVICE_PROVIDER'),
  validateRequest(respondToReviewSchema),
  respondToReview
);

router.post(
  '/:reviewId/response',
  requireRole('SERVICE_PROVIDER'),
  validateRequest(respondToReviewSchema),
  respondToReview
);

export default router;
