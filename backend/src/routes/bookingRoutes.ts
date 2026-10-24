import { Router } from 'express';
import {
  createBooking,
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
  requestCompletion,
  confirmCompletion,
  createBookingSchema,
  updateBookingStatusSchema,
} from '../controllers/bookingController';
import { validateRequest } from '../middleware/validate';
import { requireAuth, requireRole } from '../middleware/rbac';

const router = Router();

// Only authenticated CUSTOMER can request services
router.post('/', requireRole('CUSTOMER'), validateRequest(createBookingSchema), createBooking);

// Only CUSTOMER can access customer bookings
router.get('/customer', requireRole('CUSTOMER'), getCustomerBookings);

// Only SERVICE_PROVIDER can access assigned provider bookings
router.get('/provider', requireRole('SERVICE_PROVIDER'), getProviderBookings);

// General bookings list route dispatched by user role
router.get('/', requireAuth, (req: any, res) => {
  if (req.user?.role === 'SERVICE_PROVIDER') {
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

export default router;

