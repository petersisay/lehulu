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

// Booking detail & status updates (participants checked inside controller)
router.get('/:id', requireAuth, getBookingById);
router.patch('/:id/status', requireAuth, validateRequest(updateBookingStatusSchema), updateBookingStatus);

export default router;
