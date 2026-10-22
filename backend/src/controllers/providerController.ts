import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { ProviderProfile } from '../models/ProviderProfile';
import { ProviderVerification } from '../models/ProviderVerification';
import { User } from '../models/User';

export const updateProviderProfileSchema = z.object({
  body: z.object({
    businessName: z.string().min(2).optional(),
    bioEn: z.string().optional(),
    bioAm: z.string().optional(),
    experienceYears: z.number().min(0).optional(),
    categoryIds: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    serviceCities: z.array(z.string()).optional(),
    serviceRadiusKm: z.number().min(1).max(100).optional(),
    publicAddress: z.string().optional(),
    location: z
      .object({
        type: z.literal('Point'),
        coordinates: z.tuple([z.number(), z.number()]), // [lng, lat]
      })
      .optional(),
    pricing: z
      .object({
        model: z.enum(['HOURLY', 'FIXED', 'INSPECTION', 'CUSTOM']),
        startingPrice: z.number().min(0),
        hourlyRate: z.number().min(0).optional(),
        inspectionFee: z.number().min(0).optional(),
      })
      .optional(),
    workingHours: z
      .array(
        z.object({
          dayOfWeek: z.number().min(0).max(6),
          open: z.string(),
          close: z.string(),
          isClosed: z.boolean(),
        })
      )
      .optional(),
    portfolioImages: z.array(z.string()).optional(),
    isAvailable: z.boolean().optional(),
  }),
});

export const submitVerificationSchema = z.object({
  body: z.object({
    nationalIdNumber: z.string().min(4, 'National ID number is required'),
    idCardImageUrl: z.string().min(1, 'ID card photo is required'),
    tradeLicenseUrl: z.string().optional(),
    certificateUrls: z.array(z.string()).default([]),
  }),
});

export const searchProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      q,
      category,
      city,
      lng,
      lat,
      radiusKm,
      verifiedOnly,
      minRating,
      availableOnly,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const queryObj: any = {};

    // Filter by category slug or ID
    if (category) {
      if (Types.ObjectId.isValid(category as string)) {
        queryObj.categoryIds = new Types.ObjectId(category as string);
      }
    }

    // Filter by city (Adama, Bishoftu, etc.)
    if (city && city !== 'All') {
      queryObj.serviceCities = { $regex: new RegExp(city as string, 'i') };
    }

    // Verified only filter
    if (verifiedOnly === 'true') {
      queryObj.isVerified = true;
    }

    // Availability filter
    if (availableOnly === 'true') {
      queryObj.isAvailable = true;
    }

    // Minimum rating filter
    if (minRating) {
      queryObj.rating = { $gte: parseFloat(minRating as string) };
    }

    // Text query search on businessName and skills
    if (q) {
      const searchRegex = new RegExp(q as string, 'i');
      queryObj.$or = [{ businessName: searchRegex }, { skills: { $in: [searchRegex] } }];
    }

    // Geolocation radius filter
    if (lng && lat) {
      const longitude = parseFloat(lng as string);
      const latitude = parseFloat(lat as string);
      const radiusMeters = (parseFloat(radiusKm as string) || 20) * 1000;

      queryObj.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: radiusMeters,
        },
      };
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    let sortObj: any = { isVerified: -1, rating: -1, completedBookingsCount: -1 };
    if (sort === 'rating') sortObj = { rating: -1 };
    if (sort === 'price_asc') sortObj = { 'pricing.startingPrice': 1 };
    if (sort === 'price_desc') sortObj = { 'pricing.startingPrice': -1 };

    // When $nearSphere is used, MongoDB handles distance sorting automatically
    if (queryObj.location?.$nearSphere) {
      sortObj = {};
    }

    const [providers, total] = await Promise.all([
      ProviderProfile.find(queryObj)
        .populate('userId', 'displayName username avatarUrl phoneNumber')
        .populate('categoryIds', 'nameEn nameAm slug icon')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      ProviderProfile.countDocuments(queryObj),
    ]);

    res.status(200).json({
      success: true,
      providers,
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

export const getProviderProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    let profile = null;
    if (Types.ObjectId.isValid(id)) {
      profile = await ProviderProfile.findById(id)
        .populate('userId', 'displayName username avatarUrl phoneNumber city')
        .populate('categoryIds', 'nameEn nameAm slug icon');
    }

    if (!profile) {
      // Fallback search by userId
      profile = await ProviderProfile.findOne({ userId: id })
        .populate('userId', 'displayName username avatarUrl phoneNumber city')
        .populate('categoryIds', 'nameEn nameAm slug icon');
    }

    if (!profile) {
      res.status(404).json({ success: false, message: 'Provider profile not found' });
      return;
    }

    res.status(200).json({
      success: true,
      provider: profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMyProviderProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    let profile = await ProviderProfile.findOne({ userId: req.user._id })
      .populate('userId', 'displayName username email avatarUrl phoneNumber city')
      .populate('categoryIds', 'nameEn nameAm slug icon');

    if (!profile) {
      // Initialize if not created yet
      const user = await User.findById(req.user._id);
      profile = await ProviderProfile.create({
        userId: req.user._id,
        businessName: user?.displayName || 'My Business',
        serviceCities: [user?.city || 'Adama'],
      });
      profile = await ProviderProfile.findById(profile._id)
        .populate('userId', 'displayName username email avatarUrl phoneNumber city')
        .populate('categoryIds', 'nameEn nameAm slug icon');
    }

    const verification = await ProviderVerification.findOne({
      providerProfileId: profile?._id,
    });

    res.status(200).json({
      success: true,
      provider: profile,
      verification,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateProviderProfile = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    // Guard: Providers cannot mutate verification status or ratings directly
    delete req.body.isVerified;
    delete req.body.verificationStatus;
    delete req.body.rating;
    delete req.body.reviewCount;
    delete req.body.completedBookingsCount;

    const profile = await ProviderProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: req.body },
      { new: true, upsert: true }
    )
      .populate('userId', 'displayName username avatarUrl phoneNumber city')
      .populate('categoryIds', 'nameEn nameAm slug icon');

    res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully',
      provider: profile,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitVerification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const profile = await ProviderProfile.findOne({ userId: req.user._id });
    if (!profile) {
      res.status(404).json({ success: false, message: 'Provider profile not found' });
      return;
    }

    const { nationalIdNumber, idCardImageUrl, tradeLicenseUrl, certificateUrls } = req.body;

    const verification = await ProviderVerification.findOneAndUpdate(
      { providerProfileId: profile._id },
      {
        providerProfileId: profile._id,
        userId: req.user._id,
        nationalIdNumber,
        idCardImageUrl,
        tradeLicenseUrl: tradeLicenseUrl || '',
        certificateUrls: certificateUrls || [],
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        rejectionReason: '',
      },
      { upsert: true, new: true }
    );

    profile.verificationStatus = 'PENDING_REVIEW';
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Verification application submitted successfully for administrator review.',
      verification,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
