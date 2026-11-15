const { Router } = require('express');
const { createQuote, getBookingQuotes, respondToQuote, acceptQuote, rejectQuote, createQuoteSchema, respondToQuoteSchema, } = require('../controllers/quoteController');
const { validateRequest } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/rbac');
const router = Router();
// Only assigned SERVICE_PROVIDER can submit quotation
router.post('/', requireRole('SERVICE_PROVIDER'), validateRequest(createQuoteSchema), createQuote);
// Quotes for a booking (participants checked inside controller)
router.get('/booking/:bookingId', requireAuth, getBookingQuotes);
// Accept quotation (supports both PUT and POST)
router.put('/:quoteId/accept', requireRole('CUSTOMER'), acceptQuote);
router.post('/:quoteId/accept', requireRole('CUSTOMER'), acceptQuote);
// Reject quotation (supports both PUT and POST)
router.put('/:quoteId/reject', requireRole('CUSTOMER'), rejectQuote);
router.post('/:quoteId/reject', requireRole('CUSTOMER'), rejectQuote);
// Only CUSTOMER can accept or reject quotation (generic respond endpoint)
router.post('/:quoteId/respond', requireRole('CUSTOMER'), validateRequest(respondToQuoteSchema), respondToQuote);


module.exports = router;
