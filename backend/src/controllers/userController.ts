import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { User } from '../models/User';
import { CustomerProfile } from '../models/CustomerProfile';
import { Notification } from '../models/Notification';

export const updateProfileSchema = z.object({
  body: z.object({
    displayName: z.string().min(2).optional(),
    phoneNumber: z.string().optional(),
    preferredLanguage: z.enum(['en', 'am']).optional(),
    city: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
});

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { displayName, phoneNumber, preferredLanguage, city, avatarUrl } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    if (displayName) user.displayName = displayName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (city) user.city = city;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl,
        phoneNumber: user.phoneNumber,
        preferredLanguage: user.preferredLanguage,
        city: user.city,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments({ userId: req.user._id }),
      Notification.countDocuments({ userId: req.user._id, isRead: false }),
    ]);

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
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

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true }
    );

    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const markAllNotificationsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });

    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSavedProviders = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const customerProfile = await CustomerProfile.findOne({ userId: req.user._id }).populate({
      path: 'savedProviderIds',
      populate: [
        { path: 'userId', select: 'displayName avatarUrl' },
        { path: 'categoryIds', select: 'nameEn nameAm slug icon' },
      ],
    });

    res.status(200).json({
      success: true,
      savedProviders: customerProfile?.savedProviderIds || [],
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleSavedProvider = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { providerId } = req.params;
    const providerObjId = new Types.ObjectId(providerId);

    let customerProfile = await CustomerProfile.findOne({ userId: req.user._id });
    if (!customerProfile) {
      customerProfile = await CustomerProfile.create({
        userId: req.user._id,
        savedProviderIds: [],
      });
    }

    const existsIndex = customerProfile.savedProviderIds.findIndex(
      (id) => id.toString() === providerId
    );

    let isSaved = false;
    if (existsIndex > -1) {
      customerProfile.savedProviderIds.splice(existsIndex, 1);
      isSaved = false;
    } else {
      customerProfile.savedProviderIds.push(providerObjId);
      isSaved = true;
    }

    await customerProfile.save();

    res.status(200).json({
      success: true,
      message: isSaved ? 'Provider added to favorites' : 'Provider removed from favorites',
      isSaved,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
