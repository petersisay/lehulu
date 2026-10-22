import { Router } from 'express';
import {
  createBooking,
  getCustomerBookings,
  getProviderBookings,
  getBookingById,
  updateBookingStatus,
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
router.get('/', requireAuth, (req, res) => {
  if (req.user?.role === 'SERVICE_PROVIDER') {
    return getProviderBookings(req, res);
  }
  return getCustomerBookings(req, res);
});

// Booking detail & status updates (participants checked inside controller)
router.get('/:id', requireAuth, getBookingById);
router.patch('/:id/status', requireAuth, validateRequest(updateBookingStatusSchema), updateBookingStatus);

export default router;
