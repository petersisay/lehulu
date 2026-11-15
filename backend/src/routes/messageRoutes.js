const { Router } = require('express');
const { getBookingMessages, sendMessage, sendMessageSchema, } = require('../controllers/messageController');
const { validateRequest } = require('../middleware/validate');
const { requireAuth } = require('../middleware/rbac');
const router = Router();
// Retrieve in-booking chat history (participant authorized)
router.get('/:bookingId', requireAuth, getBookingMessages);
// Send message within booking
router.post('/:bookingId', requireAuth, validateRequest(sendMessageSchema), sendMessage);


module.exports = router;
