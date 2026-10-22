import { Router } from 'express';
import {
  updateProfile,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getSavedProviders,
  toggleSavedProvider,
  updateProfileSchema,
} from '../controllers/userController';
import { validateRequest } from '../middleware/validate';
import { requireAuth } from '../middleware/rbac';

const router = Router();

router.put('/profile', requireAuth, validateRequest(updateProfileSchema), updateProfile);
router.get('/notifications', requireAuth, getNotifications);
router.patch('/notifications/read-all', requireAuth, markAllNotificationsRead);
router.patch('/notifications/:id/read', requireAuth, markNotificationRead);
router.get('/saved-providers', requireAuth, getSavedProviders);
router.post('/saved-providers/:providerId', requireAuth, toggleSavedProvider);

export default router;
