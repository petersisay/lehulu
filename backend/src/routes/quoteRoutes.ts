import { Router } from 'express';
import {
  createQuote,
  getBookingQuotes,
  respondToQuote,
  createQuoteSchema,
  respondToQuoteSchema,
} from '../controllers/quoteController';
import { validateRequest } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/rbac';

const router = Router();

// Only assigned SERVICE_PROVIDER can submit quotation
router.post(
  '/',
  requireRole('SERVICE_PROVIDER'),
  validateRequest(createQuoteSchema),
  createQuote
);

// Quotes for a booking (participants checked inside controller)
router.get('/booking/:bookingId', requireAuth, getBookingQuotes);

// Only CUSTOMER can accept or reject quotation
router.post(
  '/:quoteId/respond',
  requireRole('CUSTOMER'),
  validateRequest(respondToQuoteSchema),
  respondToQuote
);

export default router;
