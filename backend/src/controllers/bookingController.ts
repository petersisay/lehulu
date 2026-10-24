import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest, BookingStatus } from '../types';
import { Booking } from '../models/Booking';
import { ProviderProfile } from '../models/ProviderProfile';
import { ProviderVerification } from '../models/ProviderVerification';
import { ServiceCategory } from '../models/ServiceCategory';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { emitSocketEvent } from '../sockets';

export const createBookingSchema = z.object({
  body: z.object({
    providerId: z.string().min(1, 'Provider ID is required'),
    categoryId: z.string().optional(),
    requestedDate: z.string().min(1, 'Requested date is required'),
    requestedTimeSlot: z.string().default('morning'),
    problemDescription: z.string().min(2, 'Please provide a description of the problem (at least 2 characters)'),
    referenceImages: z.array(z.string()).default([]),
    serviceAddress: z.object({
      city: z.string().min(1, 'City is required'),
      subcity: z.string().optional(),
      kebele: z.string().optional(),
      streetAddress: z.string().min(1, 'Street address is required'),
      contactPhone: z.string().min(8, 'Contact phone number must be at least 8 digits'),
      coordinates: z.tuple([z.number(), z.number()]).optional(),
    }),
  }),
});

export const updateBookingStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      'REQUESTED',
      'AWAITING_QUOTE',
      'QUOTED',
      'CONFIRMED',
      'IN_PROGRESS',
      'COMPLETION_PENDING',
      'COMPLETED',
      'CANCELLED',
      'DISPUTED',
    ]),
    cancellationReason: z.string().optional(),
  }),
});

export const createBooking = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const {
      providerId,
      categoryId,
      requestedDate,
      requestedTimeSlot,
      problemDescription,
      referenceImages,
      serviceAddress,
    } = req.body;

    let provider = Types.ObjectId.isValid(providerId) ? await ProviderProfile.findById(providerId) : null;
    if (!provider && Types.ObjectId.isValid(providerId)) {
      provider = await ProviderProfile.findOne({ userId: providerId });
    }
    if (!provider && Types.ObjectId.isValid(providerId)) {
      const verDoc = await ProviderVerification.findById(providerId);
      if (verDoc) {
        const pId = (verDoc.providerProfileId as any)?._id || verDoc.providerProfileId;
        if (pId) provider = await ProviderProfile.findById(pId);
        if (!provider && verDoc.userId) provider = await ProviderProfile.findOne({ userId: verDoc.userId });
      }
    }

    if (!provider) {
      res.status(404).json({ success: false, message: 'Service provider not found' });
      return;
    }

    // Prevent customers booking their own provider profile
    if (provider.userId.toString() === req.user._id) {
      res.status(400).json({ success: false, message: 'You cannot request services from yourself' });
      return;
    }

    let activeCategoryId = categoryId;
    if (!activeCategoryId && provider.categoryIds && provider.categoryIds.length > 0) {
      activeCategoryId = (provider.categoryIds[0] as any)?._id?.toString() || provider.categoryIds[0].toString();
    }
    if (!activeCategoryId) {
      const defaultCategory = await ServiceCategory.findOne();
      if (defaultCategory) activeCategoryId = defaultCategory._id.toString();
    }

    // Generate human-readable booking reference number e.g. "LHL-2026-18492"
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const bookingNumber = `LHL-${new Date().getFullYear()}-${randomDigits}`;

    const booking = await Booking.create({
      bookingNumber,
      customerId: req.user._id,
      providerId: provider._id,
      categoryId: activeCategoryId,
      requestedDate: new Date(requestedDate),
      requestedTimeSlot,
      problemDescription,
      referenceImages: referenceImages || [],
      serviceAddress,
      status: 'REQUESTED',
    });

    // Notify provider of new booking request
    await Notification.create({
      userId: provider.userId,
      type: 'BOOKING_REQUEST',
      titleEn: 'New Service Request',
      titleAm: 'አዲስ የአገልግሎት ጥያቄ ደርሶዎታል',
      messageEn: `Customer ${req.user.displayName} has requested a service (${bookingNumber}).`,
      messageAm: `ደንበኛ ${req.user.displayName} አዲስ አገልግሎት ጠይቀዋል (${bookingNumber})።`,
      referenceId: booking._id,
      referenceType: 'Booking',
    });

    emitSocketEvent(`user:${provider.userId}`, 'notification:new', {
      type: 'BOOKING_REQUEST',
      bookingId: booking._id,
      bookingNumber,
    });

    res.status(201).json({
      success: true,
      message: 'Service request created successfully',
      booking,
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCustomerBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { status, page = 1, limit = 20 } = req.query;
    const queryObj: any = { customerId: req.user._id };
    if (status && status !== 'ALL') {
      queryObj.status = status;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(queryObj)
        .populate({
          path: 'providerId',
          populate: [
            { path: 'userId', select: 'displayName avatarUrl phoneNumber' },
            { path: 'categoryIds', select: 'nameEn nameAm slug icon' },
          ],
        })
        .populate('categoryId', 'nameEn nameAm slug icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(queryObj),
    ]);

    res.status(200).json({
      success: true,
      bookings,
      data: bookings,
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

export const getProviderBookings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const provider = await ProviderProfile.findOne({ userId: req.user._id });
    if (!provider) {
      res.status(404).json({ success: false, message: 'Provider profile not found' });
      return;
    }

    const { status, page = 1, limit = 20 } = req.query;
    const queryObj: any = { providerId: provider._id };
    if (status && status !== 'ALL') {
      queryObj.status = status;
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [bookings, total] = await Promise.all([
      Booking.find(queryObj)
        .populate('customerId', 'displayName avatarUrl phoneNumber email')
        .populate('categoryId', 'nameEn nameAm slug icon')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Booking.countDocuments(queryObj),
    ]);

    res.status(200).json({
      success: true,
      bookings,
      data: bookings,
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

export const getBookingById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const booking = await Booking.findById(id)
      .populate({
        path: 'providerId',
        populate: [
          { path: 'userId', select: 'displayName avatarUrl phoneNumber email' },
          { path: 'categoryIds', select: 'nameEn nameAm slug icon' },
        ],
      })
      .populate('customerId', 'displayName avatarUrl phoneNumber email')
      .populate('categoryId', 'nameEn nameAm slug icon');

    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    // Room Authorization: strictly customer, assigned provider, or admin
    const isCustomer = booking.customerId._id.toString() === req.user._id;
    const isProvider = (booking.providerId as any)?.userId?._id?.toString() === req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isProvider && !isAdmin) {
      res.status(403).json({
        success: false,
        message: 'Access forbidden: You are not authorized to view this booking.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      booking,
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBookingStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { status: newStatus, cancellationReason } = req.body as {
      status: BookingStatus;
      cancellationReason?: string;
    };

    const booking = await Booking.findById(id).populate('providerId');
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const providerUserId = (booking.providerId as any).userId.toString();
    const isCustomer = booking.customerId.toString() === req.user._id;
    const isProvider = providerUserId === req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isProvider && !isAdmin) {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const currentStatus = booking.status;

    // Strict State Machine Verification
    if (newStatus === 'CANCELLED') {
      if (['COMPLETED', 'DISPUTED'].includes(currentStatus)) {
        res.status(400).json({ success: false, message: 'Completed or disputed bookings cannot be cancelled.' });
        return;
      }
      booking.status = 'CANCELLED';
      booking.cancellationReason = cancellationReason || 'Cancelled by user';
      booking.cancelledBy = new Types.ObjectId(req.user._id);
    } else if (newStatus === 'AWAITING_QUOTE' || newStatus === 'CONFIRMED') {
      if (!isProvider && !isAdmin) {
        res.status(403).json({ success: false, message: 'Only the provider can accept or propose quotes.' });
        return;
      }
      booking.status = newStatus;
    } else if (newStatus === 'IN_PROGRESS') {
      if (!isProvider && !isAdmin) {
        res.status(403).json({ success: false, message: 'Only the provider can start the work.' });
        return;
      }
      if (currentStatus !== 'CONFIRMED') {
        res.status(400).json({ success: false, message: 'Booking must be confirmed before starting work.' });
        return;
      }
      booking.status = 'IN_PROGRESS';
    } else if (newStatus === 'COMPLETION_PENDING') {
      if (!isProvider && !isAdmin) {
        res.status(403).json({ success: false, message: 'Only the provider can mark work complete for customer review.' });
        return;
      }
      if (currentStatus !== 'IN_PROGRESS') {
        res.status(400).json({ success: false, message: 'Booking must be in progress to request completion.' });
        return;
      }
      booking.status = 'COMPLETION_PENDING';
      booking.completionRequestedAt = new Date();
    } else if (newStatus === 'COMPLETED') {
      // Dual confirmation: Customer or Admin confirms satisfaction
      if (!isCustomer && !isAdmin) {
        res.status(403).json({ success: false, message: 'Only the customer can confirm satisfaction to complete the booking.' });
        return;
      }
      if (currentStatus !== 'COMPLETION_PENDING' && currentStatus !== 'IN_PROGRESS' && !isAdmin) {
        res.status(400).json({ success: false, message: 'Completion must be requested first.' });
        return;
      }
      booking.status = 'COMPLETED';
      booking.completedAt = new Date();

      // Increment provider completed booking counter
      await ProviderProfile.findByIdAndUpdate(booking.providerId._id, {
        $inc: { completedBookingsCount: 1 },
      });
    } else if (newStatus === 'DISPUTED') {
      booking.status = 'DISPUTED';
    } else {
      res.status(400).json({ success: false, message: `Invalid status transition from ${currentStatus} to ${newStatus}` });
      return;
    }

    await booking.save();

    // Notify the other party
    const targetUserId = isCustomer ? providerUserId : booking.customerId;
    await Notification.create({
      userId: targetUserId,
      type: newStatus === 'COMPLETED' ? 'BOOKING_COMPLETED' : 'IN_PROGRESS',
      titleEn: `Booking ${booking.bookingNumber} Status Updated`,
      titleAm: `የቦታ ማስያዣ ${booking.bookingNumber} ሁኔታ ተቀይሯል`,
      messageEn: `Booking status changed to ${newStatus}.`,
      messageAm: `የቦታ ማስያዣ ሁኔታ ወደ ${newStatus} ተቀይሯል::`,
      referenceId: booking._id,
      referenceType: 'Booking',
    });

    emitSocketEvent(`booking:${booking._id}`, 'booking:status_changed', {
      bookingId: booking._id,
      bookingNumber: booking.bookingNumber,
      status: booking.status,
    });

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${booking.status}`,
      booking,
      data: booking,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
