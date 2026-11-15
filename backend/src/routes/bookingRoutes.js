const { Router } = require('express');
const { createBooking, getCustomerBookings, getProviderBookings, getBookingById, updateBookingStatus, requestCompletion, confirmCompletion, createBookingSchema, updateBookingStatusSchema, } = require('../controllers/bookingController');
const { validateRequest } = require('../middleware/validate');
const { requireAuth, requireRole } = require('../middleware/rbac');
const router = Router();
// Only authenticated CUSTOMER can request services
router.post('/', requireRole('CUSTOMER'), validateRequest(createBookingSchema), createBooking);
// Only CUSTOMER can access customer bookings
router.get('/customer', requireRole('CUSTOMER'), getCustomerBookings);
// Only SERVICE_PROVIDER can access assigned provider bookings
router.get('/provider', requireRole('SERVICE_PROVIDER'), getProviderBookings);
// General bookings list route dispatched by role query or user role
router.get('/', requireAuth, (req, res) => {
    if (req.query.role === 'SERVICE_PROVIDER' || (req.user?.role === 'SERVICE_PROVIDER' && req.query.role !== 'CUSTOMER')) {
        return getProviderBookings(req, res);
    }
    return getCustomerBookings(req, res);
});
// Booking detail
router.get('/:id', requireAuth, getBookingById);
// Status updates (accepts PUT, PATCH, and POST)
router.put('/:id/status', requireAuth, validateRequest(updateBookingStatusSchema), updateBookingStatus);
router.patch('/:id/status', requireAuth, validateRequest(updateBookingStatusSchema), updateBookingStatus);
router.post('/:id/status', requireAuth, validateRequest(updateBookingStatusSchema), updateBookingStatus);
// Dual-confirmation completion endpoints
router.post('/:id/request-completion', requireAuth, requestCompletion);
router.put('/:id/request-completion', requireAuth, requestCompletion);
router.post('/:id/confirm-completion', requireAuth, confirmCompletion);
router.put('/:id/confirm-completion', requireAuth, confirmCompletion);


module.exports = router;
