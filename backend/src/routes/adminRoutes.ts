import { Router } from 'express';
import {
  getVerificationQueue,
  auditProviderVerification,
  getPlatformStats,
  getDisputes,
  resolveDispute,
  getAuditLogs,
  auditVerificationSchema,
  resolveDisputeSchema,
} from '../controllers/adminController';
import { validateRequest } from '../middleware/validate';
import { requireRole } from '../middleware/rbac';

const router = Router();

// Apply strict ADMIN role authorization to all admin endpoints
router.use(requireRole('ADMIN'));

// Platform metrics & health
router.get('/stats', getPlatformStats);

// Provider verification queue & auditing
router.get('/verifications', getVerificationQueue);
router.patch('/verifications/:id', validateRequest(auditVerificationSchema), auditProviderVerification);

// Dispute moderation
router.get('/disputes', getDisputes);
router.patch('/disputes/:id', validateRequest(resolveDisputeSchema), resolveDispute);

// Immutable system audit logs
router.get('/audit-logs', getAuditLogs);

export default router;
