import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest, VerificationStatus } from '../types';
import { User } from '../models/User';
import { ProviderProfile } from '../models/ProviderProfile';
import { ProviderVerification } from '../models/ProviderVerification';
import { Booking } from '../models/Booking';
import { Dispute } from '../models/Dispute';
import { AuditLog } from '../models/AuditLog';
import { Notification } from '../models/Notification';
import { recordAuditLog } from '../middleware/audit';

export const auditVerificationSchema = z.object({
  body: z.object({
    status: z.enum(['VERIFIED', 'REJECTED', 'NEEDS_RECHECK', 'SUSPENDED']),
    rejectionReason: z.string().optional(),
    adminNotes: z.string().optional(),
  }),
});

export const resolveDisputeSchema = z.object({
  body: z.object({
    status: z.enum(['RESOLVED', 'DISMISSED']),
    resolutionNotes: z.string().min(5, 'Resolution notes are required'),
  }),
});

export const getVerificationQueue = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status = 'PENDING_REVIEW', page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const queryObj: any = {};
    if (status && status !== 'ALL') {
      queryObj.status = status;
    }

    const [verifications, total] = await Promise.all([
      ProviderVerification.find(queryObj)
        .populate('userId', 'displayName email phoneNumber avatarUrl city')
        .populate({
          path: 'providerProfileId',
          populate: { path: 'categoryIds', select: 'nameEn nameAm slug icon' },
        })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ProviderVerification.countDocuments(queryObj),
    ]);

    res.status(200).json({
      success: true,
      verifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const auditProviderVerification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { status, rejectionReason, adminNotes } = req.body as {
      status: VerificationStatus;
      rejectionReason?: string;
      adminNotes?: string;
    };

    const verification = await ProviderVerification.findById(id).populate('providerProfileId');
    if (!verification) {
      res.status(404).json({ success: false, message: 'Verification application not found' });
      return;
    }

    verification.status = status;
    verification.reviewedBy = new Types.ObjectId(req.user._id);
    verification.reviewedAt = new Date();
    if (rejectionReason) verification.rejectionReason = rejectionReason;
    if (adminNotes) verification.adminNotes = adminNotes;
    await verification.save();

    // Update the provider's official verified status and verificationStatus
    const isNowVerified = status === 'VERIFIED';
    const provider = await ProviderProfile.findByIdAndUpdate(
      verification.providerProfileId._id,
      {
        isVerified: isNowVerified,
        verificationStatus: status,
      },
      { new: true }
    );

    // Record immutable audit log of administrative decision
    await recordAuditLog({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: `PROVIDER_VERIFICATION_${status}`,
      entityType: 'ProviderVerification',
      entityId: verification._id,
      details: {
        providerId: verification.providerProfileId._id,
        newStatus: status,
        rejectionReason,
        adminNotes,
      },
      req,
    });

    // Notify provider of administrative verification decision
    await Notification.create({
      userId: verification.userId,
      type: 'VERIFICATION_UPDATE',
      titleEn: `Verification Application: ${status}`,
      titleAm: `የባለሙያ ማረጋገጫ ማመልከቻ: ${status}`,
      messageEn: isNowVerified
        ? 'Congratulations! Your Lehulu service provider account has been verified.'
        : `Your verification status has been updated to ${status}. ${rejectionReason || ''}`,
      messageAm: isNowVerified
        ? 'እንኳን ደስ አሎት! የለሁሉ አገልግሎት ሰጪ መለያዎ በአስተዳዳሪው ተረጋግጧል::'
        : `የማረጋገጫ ሁኔታዎ ወደ ${status} ተቀይሯል:: ${rejectionReason || ''}`,
      referenceId: verification._id,
      referenceType: 'ProviderVerification',
    });

    res.status(200).json({
      success: true,
      message: `Provider verification status updated to ${status}`,
      verification,
      provider,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPlatformStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    // Compute genuine metrics directly from database
    const [
      totalCustomers,
      totalProviders,
      verifiedProviders,
      pendingVerifications,
      activeBookings,
      completedBookings,
      openDisputes,
    ] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      User.countDocuments({ role: 'SERVICE_PROVIDER' }),
      ProviderProfile.countDocuments({ isVerified: true }),
      ProviderVerification.countDocuments({ status: 'PENDING_REVIEW' }),
      Booking.countDocuments({
        status: { $in: ['REQUESTED', 'AWAITING_QUOTE', 'QUOTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETION_PENDING'] },
      }),
      Booking.countDocuments({ status: 'COMPLETED' }),
      Dispute.countDocuments({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalCustomers,
        totalProviders,
        verifiedProviders,
        pendingVerifications,
        activeBookings,
        completedBookings,
        openDisputes,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDisputes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const queryObj: any = {};
    if (status && status !== 'ALL') {
      queryObj.status = status;
    }

    const [disputes, total] = await Promise.all([
      Dispute.find(queryObj)
        .populate('raisedByUserId', 'displayName email phoneNumber role')
        .populate({
          path: 'bookingId',
          populate: [
            { path: 'customerId', select: 'displayName email phoneNumber' },
            { path: 'providerId', populate: { path: 'userId', select: 'displayName phoneNumber' } },
          ],
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Dispute.countDocuments(queryObj),
    ]);

    res.status(200).json({
      success: true,
      disputes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const resolveDispute = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { status, resolutionNotes } = req.body;

    const dispute = await Dispute.findById(id);
    if (!dispute) {
      res.status(404).json({ success: false, message: 'Dispute record not found' });
      return;
    }

    dispute.status = status;
    dispute.resolutionNotes = resolutionNotes;
    dispute.resolvedBy = new Types.ObjectId(req.user._id);
    dispute.resolvedAt = new Date();
    await dispute.save();

    await recordAuditLog({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: `DISPUTE_${status}`,
      entityType: 'Dispute',
      entityId: dispute._id,
      details: { resolutionNotes },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Dispute resolved successfully',
      dispute,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAuditLogs = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find()
        .populate('actorId', 'displayName email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(),
    ]);

    res.status(200).json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
