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
import { ProviderLead } from '../models/ProviderLead';
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
    const { status = 'PENDING_REVIEW', q, unmask, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const queryObj: any = {};
    if (status && status !== 'ALL') {
      queryObj.status = status;
    }

    if (q && typeof q === 'string' && q.trim().length > 0) {
      const searchRegex = new RegExp(q.trim(), 'i');
      const matchingUsers = await User.find({
        $or: [
          { displayName: searchRegex },
          { email: searchRegex },
          { phoneNumber: searchRegex },
        ],
      }).select('_id');
      const userIds = matchingUsers.map((u) => u._id);

      queryObj.$or = [
        { userId: { $in: userIds } },
        { nationalIdNumber: searchRegex },
      ];
    }

    // High-performance self-healing synchronization in bulk
    const [allProfiles, allVerifs] = await Promise.all([
      ProviderProfile.find({}, '_id userId isVerified createdAt').lean(),
      ProviderVerification.find({}, 'providerProfileId userId status').lean(),
    ]);

    const existingProfileIds = new Set(allVerifs.map((v) => String(v.providerProfileId)));
    const missingVerifications: any[] = [];

    for (const prof of allProfiles) {
      if (!existingProfileIds.has(String(prof._id))) {
        missingVerifications.push({
          providerProfileId: prof._id,
          userId: prof.userId,
          nationalIdNumber: prof.isVerified ? 'ET-VERIFIED-SPECIALIST' : 'ET-PENDING-REVIEW',
          status: prof.isVerified ? 'VERIFIED' : 'PENDING_REVIEW',
          submittedAt: prof.createdAt || new Date(),
          reviewedAt: prof.isVerified ? new Date() : undefined,
          consentGiven: true,
        });
      }
    }

    if (missingVerifications.length > 0) {
      await ProviderVerification.insertMany(missingVerifications, { ordered: false });
    }

    const verifiedVerifProfileIds = allVerifs
      .filter((v) => v.status === 'VERIFIED')
      .map((v) => v.providerProfileId);

    if (verifiedVerifProfileIds.length > 0) {
      await ProviderProfile.updateMany(
        { _id: { $in: verifiedVerifProfileIds }, isVerified: { $ne: true } },
        { isVerified: true, verificationStatus: 'VERIFIED' }
      );
    }

    const [rawVerifications, total] = await Promise.all([
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

    // Privacy rule: Mask Ethiopian National ID number by default in admin table
    const maskId = (idStr: string) => {
      if (!idStr) return '••••';
      if (idStr.length <= 4) return '••••';
      return `${idStr.slice(0, 3)}••••${idStr.slice(-4)}`;
    };

    const verifications = rawVerifications.map((v) => {
      const obj: any = v.toObject();
      obj.maskedNationalId = maskId(obj.nationalIdNumber);
      if (unmask !== 'true') {
        obj.nationalIdNumber = maskId(obj.nationalIdNumber);
      }
      return obj;
    });

    res.status(200).json({
      success: true,
      verifications,
      data: verifications,
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

    let verification = await ProviderVerification.findById(id).populate('providerProfileId');
    if (!verification) {
      verification = await ProviderVerification.findOne({ providerProfileId: id }).populate('providerProfileId');
    }
    if (!verification) {
      verification = await ProviderVerification.findOne({ userId: id }).populate('providerProfileId');
    }
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
    const profileId = (verification.providerProfileId as any)?._id || verification.providerProfileId;
    let provider = profileId
      ? await ProviderProfile.findByIdAndUpdate(
          profileId,
          {
            isVerified: isNowVerified,
            verificationStatus: status,
          },
          { new: true }
        )
      : null;

    if (!provider && verification.userId) {
      provider = await ProviderProfile.findOneAndUpdate(
        { userId: verification.userId },
        {
          isVerified: isNowVerified,
          verificationStatus: status,
        },
        { new: true }
      );
    }

    // Keep User record in sync with verification status
    await User.findByIdAndUpdate(verification.userId, {
      isVerified: isNowVerified,
    });

    // Record immutable audit log of administrative decision
    await recordAuditLog({
      actorId: req.user._id,
      actorEmail: req.user.email,
      action: `PROVIDER_VERIFICATION_${status}`,
      entityType: 'ProviderVerification',
      entityId: verification._id,
      details: {
        providerId: provider?._id || profileId,
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

    const statsData = {
      totalCustomers,
      totalProviders,
      verifiedProviders,
      pendingVerifications,
      activeBookings,
      completedBookings,
      completedTransactions: completedBookings,
      openDisputes,
    };

    res.status(200).json({
      success: true,
      stats: statsData,
      data: statsData,
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
      data: logs,
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

export const getProviderLeads = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { category, city, status, page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    if (category && category !== 'ALL') query.categorySlug = category;
    if (city && city !== 'ALL') query.city = city;
    if (status && status !== 'ALL') query.status = status;

    const [leads, total] = await Promise.all([
      ProviderLead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      ProviderLead.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: leads,
      leads,
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

export const updateProviderLeadStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const updateData: any = { lastCheckedDate: new Date() };
    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const lead = await ProviderLead.findByIdAndUpdate(id, { $set: updateData }, { new: true });
    if (!lead) {
      res.status(404).json({ success: false, message: 'Provider research lead not found.' });
      return;
    }

    if (req.user?._id) {
      await recordAuditLog({
        actorId: req.user._id,
        actorEmail: req.user.email || '',
        action: 'UPDATE_PROVIDER_LEAD_STATUS',
        entityType: 'ProviderLead',
        entityId: lead._id as Types.ObjectId,
        details: { newStatus: status, notes },
        req,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Provider research lead updated successfully.',
      lead,
      data: lead,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

