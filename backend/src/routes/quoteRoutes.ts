import { Router } from 'express';
import {
  createQuote,
  getBookingQuotes,
  respondToQuote,
  acceptQuote,
  rejectQuote,
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

// Accept quotation (supports both PUT and POST)
router.put('/:quoteId/accept', requireRole('CUSTOMER'), acceptQuote);
router.post('/:quoteId/accept', requireRole('CUSTOMER'), acceptQuote);

// Reject quotation (supports both PUT and POST)
router.put('/:quoteId/reject', requireRole('CUSTOMER'), rejectQuote);
router.post('/:quoteId/reject', requireRole('CUSTOMER'), rejectQuote);

// Only CUSTOMER can accept or reject quotation (generic respond endpoint)
router.post(
  '/:quoteId/respond',
  requireRole('CUSTOMER'),
  validateRequest(respondToQuoteSchema),
  respondToQuote
);

export default router;

