const { Router } = require('express');
const { googleLogin, completeOnboarding, getMe, logout, googleAuthSchema, onboardingRoleSchema, } = require('../controllers/authController');
const { validateRequest } = require('../middleware/validate');
const { requireAuth } = require('../middleware/rbac');
const router = Router();
router.post('/google', validateRequest(googleAuthSchema), googleLogin);
router.post('/onboarding', requireAuth, validateRequest(onboardingRoleSchema), completeOnboarding);
router.post('/onboard', requireAuth, validateRequest(onboardingRoleSchema), completeOnboarding);
router.get('/me', getMe);
router.post('/logout', logout);


module.exports = router;
