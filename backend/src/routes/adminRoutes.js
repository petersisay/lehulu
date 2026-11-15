const { Router } = require('express');
const { getVerificationQueue, auditProviderVerification, getPlatformStats, getDisputes, resolveDispute, getAuditLogs, getProviderLeads, updateProviderLeadStatus, auditVerificationSchema, resolveDisputeSchema, } = require('../controllers/adminController');
const { validateRequest } = require('../middleware/validate');
const { requireRole } = require('../middleware/rbac');
const router = Router();
// Apply strict ADMIN role authorization to all admin endpoints
router.use(requireRole('ADMIN'));
// Platform metrics & health
router.get('/stats', getPlatformStats);
router.get('/overview', getPlatformStats);
// Provider verification queue & auditing
router.get('/verifications', getVerificationQueue);
router.patch('/verifications/:id', validateRequest(auditVerificationSchema), auditProviderVerification);
router.put('/verifications/:id', validateRequest(auditVerificationSchema), auditProviderVerification);
// Dispute moderation
router.get('/disputes', getDisputes);
router.patch('/disputes/:id', validateRequest(resolveDisputeSchema), resolveDispute);
// Researched provider leads & pipeline management
router.get('/leads', getProviderLeads);
router.patch('/leads/:id', updateProviderLeadStatus);
// Immutable system audit logs
router.get('/audit-logs', getAuditLogs);


module.exports = router;
