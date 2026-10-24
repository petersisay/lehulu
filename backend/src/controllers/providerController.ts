import { Request, Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { ProviderProfile } from '../models/ProviderProfile';
import { ProviderVerification } from '../models/ProviderVerification';
import { ServiceCategory } from '../models/ServiceCategory';
import { User } from '../models/User';
import { Review } from '../models/Review';

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
    nationalIdNumber: z.string().trim().min(4, 'National ID number is required'),
    idCardImageUrl: z.string().optional().default(''),
    consentGiven: z.boolean().optional().default(true),
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
      maxDistance,
      verifiedOnly,
      minRating,
      availableOnly,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    const queryObj: any = {};

    // PHASE 4 REQUIREMENT: Unverified/pending/rejected/suspended providers MUST NEVER appear in public customer search
    const authReq = req as AuthenticatedRequest;
    const isAdmin = authReq.user?.role === 'ADMIN';
    if (!isAdmin) {
      queryObj.isVerified = true;
      queryObj.verificationStatus = 'VERIFIED';
    } else if (verifiedOnly === 'true' || req.query.includeUnverified !== 'true') {
      queryObj.isVerified = true;
      queryObj.verificationStatus = 'VERIFIED';
    }

    // Strict category filtering by ID, slug, name, or subcategory
    let activeCategoryDocIds: Types.ObjectId[] = [];
    if (category && category !== 'all' && category !== 'All') {
      if (Types.ObjectId.isValid(category as string)) {
        activeCategoryDocIds.push(new Types.ObjectId(category as string));
      } else {
        const catStr = (category as string).trim().toLowerCase();
        const normalizedSlug = catStr === 'home-repairs' ? 'home-maintenance' : catStr;
        const catDocs = await ServiceCategory.find({
          $or: [
            { slug: normalizedSlug },
            { nameEn: { $regex: new RegExp(`^${catStr}$`, 'i') } },
            { nameAm: category as string },
            { 'subcategories.slug': catStr },
            { 'subcategories.nameEn': { $regex: new RegExp(`^${catStr}$`, 'i') } },
            { 'subcategories.nameAm': category as string },
          ],
        });
        activeCategoryDocIds = catDocs.map((c) => c._id as Types.ObjectId);
      }

      if (activeCategoryDocIds.length > 0) {
        queryObj.categoryIds = { $in: activeCategoryDocIds };
      } else {
        // Explicit unmatched category must yield no results
        queryObj.categoryIds = new Types.ObjectId();
      }
    }

    // Filter by city (Adama, Bishoftu, etc.)
    if (city && city !== 'All') {
      queryObj.serviceCities = { $regex: new RegExp(city as string, 'i') };
    }

    // Availability filter
    if (availableOnly === 'true') {
      queryObj.isAvailable = true;
    }

    // Minimum rating filter
    if (minRating) {
      queryObj.rating = { $gte: parseFloat(minRating as string) };
    }

    // Enhanced trade synonym dictionary covering English and Amharic (Phase 5)
    const TRADE_SYNONYMS: Record<string, string[]> = {
      plumber: ['plumber', 'plumbing', 'pipe', 'leak', 'drain', 'faucet', 'toilet', 'sink', 'sanitary', 'water pipe', 'ቧንቧ', 'የውሃ ቧንቧ', 'ሳኒተሪ', 'ቧንቧ ሰሪ', 'ቧንቧ ባለሙያ'],
      electrician: ['electrician', 'electrical', 'electric', 'wiring', 'breaker', 'power', 'generator', 'socket', 'lighting', 'light', 'circuit', 'መብራት', 'ኤሌክትሪክ', 'የኤሌክትሪክ', 'ሽቦ', 'ኤሌክትሪሺያን'],
      mechanic: ['mechanic', 'automotive', 'auto', 'car', 'vehicle', 'motor', 'engine', 'transmission', 'brake', 'garage', 'oil change', 'መካኒክ', 'መኪና', 'አውቶሞቲቭ', 'ጋራዥ', 'የመኪና ጥገና'],
      cleaning: ['cleaner', 'cleaning', 'clean', 'janitorial', 'house cleaning', 'laundry', 'carpet', 'deep clean', 'maid', 'ጽዳት', 'የጽዳት', 'የቤት ጽዳት', 'ምንጣፍ', 'ላውንድሪ', 'እጥበት'],
      computer: ['computer', 'pc', 'laptop', 'it', 'technology', 'software', 'hardware', 'network', 'wifi', 'printer', 'tech', 'ኮምፒውተር', 'ላፕቶፕ', 'አይቲ', 'ሶፍትዌር', 'ቴክኖሎጂ', 'የኮምፒውተር ጥገና'],
      carpentry: ['carpenter', 'carpentry', 'wood', 'furniture', 'door', 'cabinet', 'አናጺ', 'የእንጨት', 'ፈረኒቸር', 'እንጨት'],
      painting: ['painter', 'painting', 'paint', 'wall', 'ቀለም', 'ቀለም ቅብ', 'ቀቢ'],
    };

    if (q && typeof q === 'string') {
      const cleanQ = q.trim();
      if (cleanQ.length > 0) {
        const lowerQ = cleanQ.toLowerCase();
        const matchedKeywords = new Set<string>([cleanQ]);

        for (const [trade, synonyms] of Object.entries(TRADE_SYNONYMS)) {
          const hasMatch =
            lowerQ.includes(trade) ||
            synonyms.some((syn) => lowerQ.includes(syn.toLowerCase()) || syn.toLowerCase().includes(lowerQ));
          if (hasMatch) {
            matchedKeywords.add(trade);
            synonyms.forEach((syn) => matchedKeywords.add(syn));
          }
        }

        // Also check if search query matches any ServiceCategory name or subcategory
        const matchedCatsForQuery = await ServiceCategory.find({
          $or: [
            { slug: { $regex: new RegExp(cleanQ, 'i') } },
            { nameEn: { $regex: new RegExp(cleanQ, 'i') } },
            { nameAm: { $regex: new RegExp(cleanQ, 'i') } },
            { 'subcategories.slug': { $regex: new RegExp(cleanQ, 'i') } },
            { 'subcategories.nameEn': { $regex: new RegExp(cleanQ, 'i') } },
            { 'subcategories.nameAm': { $regex: new RegExp(cleanQ, 'i') } },
          ],
        });
        const queryCatIds = matchedCatsForQuery.map((c) => c._id as Types.ObjectId);

        const regexPattern = Array.from(matchedKeywords)
          .map((kw) => kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('|');
        const searchRegex = new RegExp(regexPattern, 'i');

        // Only show related trade, verified skills, or category
        const searchConditions: any[] = [
          { businessName: searchRegex },
          { skills: { $in: [searchRegex] } },
        ];
        if (queryCatIds.length > 0) {
          searchConditions.push({ categoryIds: { $in: queryCatIds } });
        }

        if (queryObj.$or) {
          queryObj.$and = [
            { $or: queryObj.$or },
            { $or: searchConditions },
          ];
          delete queryObj.$or;
        } else {
          queryObj.$or = searchConditions;
        }
      }
    }

    let isGeospatialActive = false;
    let userLng = 0;
    let userLat = 0;

    // Geolocation radius filter ($geoWithin with $centerSphere to support countDocuments and custom sorting)
    if (lng && lat) {
      userLng = parseFloat(lng as string);
      userLat = parseFloat(lat as string);

      if (!isNaN(userLng) && !isNaN(userLat)) {
        isGeospatialActive = true;
        const radiusMeters =
          parseFloat(maxDistance as string) ||
          (parseFloat(radiusKm as string) ? parseFloat(radiusKm as string) * 1000 : 50000);

        // $centerSphere takes [[longitude, latitude], radiusInRadians]
        // Earth radius ~6,378,137 meters
        const radiusRadians = radiusMeters / 6378137;

        queryObj.location = {
          $geoWithin: {
            $centerSphere: [[userLng, userLat], radiusRadians],
          },
        };
      }
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    let sortObj: any = { isVerified: -1, rating: -1, completedBookingsCount: -1 };
    if (sort === 'rating') sortObj = { rating: -1 };
    if (sort === 'price_asc') sortObj = { 'pricing.startingPrice': 1 };
    if (sort === 'price_desc') sortObj = { 'pricing.startingPrice': -1 };

    const [rawProviders, total] = await Promise.all([
      ProviderProfile.find(queryObj)
        .populate('userId', 'displayName username avatarUrl phoneNumber')
        .populate('categoryIds', 'nameEn nameAm slug icon')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum),
      ProviderProfile.countDocuments(queryObj),
    ]);

    let providers = rawProviders.map((p) => {
      const doc: any = p.toObject();
      if (isGeospatialActive && doc.location?.coordinates && doc.location.coordinates.length === 2) {
        const [pLng, pLat] = doc.location.coordinates;
        // Haversine distance in km
        const R = 6371;
        const dLat = ((pLat - userLat) * Math.PI) / 180;
        const dLon = ((pLng - userLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((userLat * Math.PI) / 180) *
            Math.cos((pLat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        doc.distanceKm = Math.round(R * c * 10) / 10;
      }
      return doc;
    });

    if (isGeospatialActive && (!sort || sort === 'distance')) {
      providers.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    }

    res.status(200).json({
      success: true,
      providers,
      data: providers,
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

    if (!profile && Types.ObjectId.isValid(id)) {
      // Fallback search by userId
      profile = await ProviderProfile.findOne({ userId: id })
        .populate('userId', 'displayName username avatarUrl phoneNumber city')
        .populate('categoryIds', 'nameEn nameAm slug icon');
    }

    if (!profile && Types.ObjectId.isValid(id)) {
      // Fallback search by ProviderVerification ID
      const verDoc = await ProviderVerification.findById(id);
      if (verDoc) {
        const profId = (verDoc.providerProfileId as any)?._id || verDoc.providerProfileId;
        if (profId) {
          profile = await ProviderProfile.findById(profId)
            .populate('userId', 'displayName username avatarUrl phoneNumber city')
            .populate('categoryIds', 'nameEn nameAm slug icon');
        }
        if (!profile && verDoc.userId) {
          profile = await ProviderProfile.findOne({ userId: verDoc.userId })
            .populate('userId', 'displayName username avatarUrl phoneNumber city')
            .populate('categoryIds', 'nameEn nameAm slug icon');
        }
      }
    }

    if (!profile) {
      res.status(404).json({ success: false, message: 'Provider profile not found' });
      return;
    }

    const authReq = req as AuthenticatedRequest;
    const isOwner =
      authReq.user &&
      profile.userId &&
      ((profile.userId as any)._id?.toString() === authReq.user._id?.toString() ||
        profile.userId.toString() === authReq.user._id?.toString());
    const isAdmin = authReq.user?.role === 'ADMIN';

    // Synchronize and self-heal verification status if ProviderVerification is verified
    if (!profile.isVerified || profile.verificationStatus !== 'VERIFIED') {
      const activeVerification = await ProviderVerification.findOne({
        $or: [
          { providerProfileId: profile._id },
          { userId: (profile.userId as any)?._id || profile.userId },
        ],
        status: 'VERIFIED',
      });
      if (activeVerification) {
        profile.isVerified = true;
        profile.verificationStatus = 'VERIFIED';
        await ProviderProfile.findByIdAndUpdate(profile._id, {
          isVerified: true,
          verificationStatus: 'VERIFIED',
        });
      }
    }

    const isVerifiedProvider = profile.isVerified === true || profile.verificationStatus === 'VERIFIED';

    // Phase 4: Prevent public access to unapproved provider profiles
    if (!isVerifiedProvider && !isOwner && !isAdmin) {
      res.status(404).json({
        success: false,
        message: 'Provider profile not found or pending verification',
      });
      return;
    }

    const reviews = await Review.find({ providerId: profile._id })
      .populate('customerId', 'displayName avatarUrl')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      provider: profile,
      reviews,
      data: {
        provider: profile,
        reviews,
      },
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
      data: profile,
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

    const { nationalIdNumber, idCardImageUrl, tradeLicenseUrl, certificateUrls, consentGiven } = req.body;

    const verification = await ProviderVerification.findOneAndUpdate(
      { providerProfileId: profile._id },
      {
        providerProfileId: profile._id,
        userId: req.user._id,
        nationalIdNumber: (nationalIdNumber || '').trim(),
        idCardImageUrl: idCardImageUrl || '',
        consentGiven: consentGiven ?? true,
        tradeLicenseUrl: tradeLicenseUrl || '',
        certificateUrls: certificateUrls || [],
        status: 'PENDING_REVIEW',
        submittedAt: new Date(),
        rejectionReason: '',
      },
      { upsert: true, new: true }
    );

    profile.verificationStatus = 'PENDING_REVIEW';
    profile.isVerified = false;
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
