import { Router } from 'express';
import {
  getBookingMessages,
  sendMessage,
  sendMessageSchema,
} from '../controllers/messageController';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/rbac';

const router = Router();

// Retrieve in-booking chat history (participant authorized)
router.get('/:bookingId', requireAuth, getBookingMessages);

// Send message within booking
router.post('/:bookingId', requireAuth, validateRequest(sendMessageSchema), sendMessage);

export default router;
