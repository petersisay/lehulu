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

// Customer creates booking
router.post('/', requireAuth, validateRequest(createBookingSchema), createBooking);

// Customer gets own bookings
router.get('/customer', requireAuth, getCustomerBookings);

// Provider gets assigned bookings
router.get('/provider', requireRole('SERVICE_PROVIDER', 'ADMIN'), getProviderBookings);

// Booking detail & status updates
router.get('/:id', requireAuth, getBookingById);
router.patch('/:id/status', requireAuth, validateRequest(updateBookingStatusSchema), updateBookingStatus);

export default router;
