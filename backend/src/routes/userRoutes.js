const { Router } = require('express');
const { updateProfile, getNotifications, markNotificationRead, markAllNotificationsRead, getSavedProviders, toggleSavedProvider, updateProfileSchema, } = require('../controllers/userController');
const { validateRequest } = require('../middleware/validate');
const { requireAuth } = require('../middleware/rbac');
const router = Router();
router.put('/profile', requireAuth, validateRequest(updateProfileSchema), updateProfile);
router.get('/notifications', requireAuth, getNotifications);
router.patch('/notifications/read-all', requireAuth, markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAuth, markNotificationRead);
router.get('/saved-providers', requireAuth, getSavedProviders);
router.post('/saved-providers/:providerId', requireAuth, toggleSavedProvider);


module.exports = router;
