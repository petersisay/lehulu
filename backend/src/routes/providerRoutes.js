const { Router } = require('express');
const { searchProviders, getProviderProfile, getMyProviderProfile, updateProviderProfile, submitVerification, updateProviderProfileSchema, submitVerificationSchema, } = require('../controllers/providerController');
const { validateRequest } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');
const router = Router();
// Public provider discovery routes
router.get('/', searchProviders);
// Provider self-management routes
router.get('/me', requireRole('SERVICE_PROVIDER', 'ADMIN'), getMyProviderProfile);
router.get('/profile', requireRole('SERVICE_PROVIDER', 'ADMIN'), getMyProviderProfile);
router.put('/me', requireRole('SERVICE_PROVIDER'), validateRequest(updateProviderProfileSchema), updateProviderProfile);
router.put('/profile', requireRole('SERVICE_PROVIDER'), validateRequest(updateProviderProfileSchema), updateProviderProfile);
router.post('/verify', requireRole('SERVICE_PROVIDER'), validateRequest(submitVerificationSchema), submitVerification);
router.post('/verification', requireRole('SERVICE_PROVIDER'), validateRequest(submitVerificationSchema), submitVerification);
// Public provider profile view by ID
router.get('/:id', getProviderProfile);


module.exports = router;
