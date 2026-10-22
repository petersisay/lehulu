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

// Provider submits quotation
router.post(
  '/',
  requireRole('SERVICE_PROVIDER', 'ADMIN'),
  validateRequest(createQuoteSchema),
  createQuote
);

// Quotes for a booking
router.get('/booking/:bookingId', requireAuth, getBookingQuotes);

// Customer responds to quotation (ACCEPT / REJECT)
router.post(
  '/:quoteId/respond',
  requireAuth,
  validateRequest(respondToQuoteSchema),
  respondToQuote
);

export default router;
