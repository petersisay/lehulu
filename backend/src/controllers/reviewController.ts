import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Booking } from '../models/Booking';
import { Review } from '../models/Review';
import { ProviderProfile } from '../models/ProviderProfile';
import { Notification } from '../models/Notification';

export const createReviewSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required').optional(),
    rating: z.number().int().min(1).max(5, 'Rating must be an integer between 1 and 5'),
    comment: z.string().min(3, 'Please provide constructive feedback (at least 3 characters)').max(1000),
  }),
});

export const respondToReviewSchema = z.object({
  body: z.object({
    text: z.string().min(3, 'Response must be at least 3 characters').max(1000),
  }),
});

export const createReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const bookingId = req.params.bookingId || req.body.bookingId;
    if (!bookingId) {
      res.status(400).json({ success: false, message: 'Booking ID is required' });
      return;
    }
    const { rating, comment } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    // Eligibility Rule 1: Only the customer who booked the service (or admin) can review
    const customerUserId =
      (booking.customerId as any)?._id?.toString() ||
      booking.customerId?.toString();
    if (customerUserId !== req.user._id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only the customer of this booking can leave a review.',
      });
      return;
    }

    // Auto-complete booking if customer reviews completed or completion-pending work
    if (booking.status !== 'COMPLETED') {
      booking.status = 'COMPLETED';
      booking.completedAt = new Date();
      await booking.save();

      // Increment provider completed jobs counter and set provider ready for another service
      const provId = (booking.providerId as any)?._id || booking.providerId;
      await ProviderProfile.findByIdAndUpdate(provId, {
        $inc: { completedBookingsCount: 1 },
        isAvailable: true,
      });
    } else {
      // Ensure provider is available for next service
      const provId = (booking.providerId as any)?._id || booking.providerId;
      await ProviderProfile.findByIdAndUpdate(provId, {
        isAvailable: true,
      });
    }

    // Eligibility Rule 3: Only 1 review per booking
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      res.status(400).json({
        success: false,
        message: 'A review has already been submitted for this completed service.',
      });
      return;
    }

    const review = await Review.create({
      bookingId: booking._id,
      customerId: req.user._id,
      providerId: booking.providerId,
      rating,
      comment,
    });

    // Recompute genuine average rating and reviewCount for provider from real database records
    const allReviews = await Review.find({ providerId: booking.providerId });
    const totalRatingSum = allReviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = allReviews.length > 0 ? Number((totalRatingSum / allReviews.length).toFixed(1)) : 0;

    const provider = await ProviderProfile.findByIdAndUpdate(
      booking.providerId,
      {
        rating: avgRating,
        reviewCount: allReviews.length,
        isAvailable: true,
      },
      { new: true }
    );

    // Notify provider of new review
    if (provider) {
      await Notification.create({
        userId: provider.userId,
        type: 'REVIEW_RECEIVED',
        titleEn: `New ${rating}-Star Review Received`,
        titleAm: `አዲስ የ${rating} ኮከብ አስተያየት ተሰጥቷል`,
        messageEn: `Customer left a review: "${comment.slice(0, 70)}"`,
        messageAm: `ደንበኛ አስተያየት ሰጥተዋል: "${comment.slice(0, 70)}"`,
        referenceId: review._id,
        referenceType: 'Booking',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      review,
      data: review,
      updatedProviderRating: avgRating,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getProviderReviews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      Review.find({ providerId, isReported: false })
        .populate('customerId', 'displayName avatarUrl city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ providerId, isReported: false }),
    ]);

    res.status(200).json({
      success: true,
      reviews,
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

export const respondToReview = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { reviewId } = req.params;
    const { text } = req.body;

    const review = await Review.findById(reviewId).populate('providerId');
    if (!review) {
      res.status(404).json({ success: false, message: 'Review not found' });
      return;
    }

    const providerUserId = (review.providerId as any).userId.toString();
    if (providerUserId !== req.user._id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Forbidden: Only the reviewed service provider can respond.',
      });
      return;
    }

    review.providerResponse = {
      text,
      respondedAt: new Date(),
    };
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Response posted successfully',
      review,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
