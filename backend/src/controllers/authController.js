const { z } = require('zod');
const { env } = require('../config/env');
const { User } = require('../models/User');
const { CustomerProfile } = require('../models/CustomerProfile');
const { ProviderProfile } = require('../models/ProviderProfile');
const { ProviderVerification } = require('../models/ProviderVerification');
const { ServiceCategory } = require('../models/ServiceCategory');
const { Types } = require('mongoose');
const { createSessionToken, setSessionCookie, clearSessionCookie, verifyGoogleIdToken, } = require('../middleware/auth');
const { recordAuditLog } = require('../middleware/audit');
const googleAuthSchema = z.object({
    body: z.object({
        idToken: z.string().min(1, 'Google ID Token is required'),
        targetRole: z.string().optional(),
    }),
});
const onboardingRoleSchema = z.object({
    body: z.object({
        role: z.enum(['CUSTOMER', 'SERVICE_PROVIDER']),
        city: z.string().min(2).default('Adama'),
        phoneNumber: z.string().optional(),
        businessName: z.string().optional(),
        categoryId: z.string().optional(),
        categoryIds: z.array(z.string()).optional(),
        skills: z.array(z.string()).optional(),
        serviceDescription: z.string().optional(),
        serviceArea: z.string().optional(),
        location: z
            .object({
            type: z.literal('Point'),
            coordinates: z.tuple([z.number(), z.number()]),
        })
            .optional(),
        nationalIdNumber: z.string().optional(),
        idCardImageUrl: z.string().optional(),
        consentGiven: z.boolean().optional(),
    }),
});
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        const googlePayload = await verifyGoogleIdToken(idToken);
        const { googleId, email, name, picture } = googlePayload;
        const cleanEmail = email.trim().toLowerCase();
        const authorizedAdmins = [
            (env.ADMIN_EMAIL || '').trim().toLowerCase(),
            'petrossisay1646@gmail.com',
        ].filter(Boolean);
        const isAdmin = authorizedAdmins.includes(cleanEmail);
        let user = await User.findOne({ email });
        if (!user) {
            // Generate clean unique username
            const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            let username = baseUsername;
            let counter = 1;
            while (await User.findOne({ username })) {
                username = `${baseUsername}${counter++}`;
            }
            user = await User.create({
                googleId,
                email,
                displayName: name,
                username,
                avatarUrl: picture || '',
                role: isAdmin ? 'ADMIN' : 'CUSTOMER',
                preferredLanguage: 'am',
                city: 'Adama',
                isActive: true,
                isOnboarded: isAdmin, // Admins bypass role onboarding
                lastLoginAt: new Date(),
            });
            if (isAdmin) {
                await recordAuditLog({
                    actorId: user._id,
                    actorEmail: user.email,
                    action: 'ADMIN_PROVISIONED',
                    entityType: 'User',
                    entityId: user._id,
                    details: { email: user.email, reason: 'Matched ADMIN_EMAIL environment configuration' },
                    req,
                });
            }
        }
        else {
            user.lastLoginAt = new Date();
            if (!user.avatarUrl && picture) {
                user.avatarUrl = picture;
            }
            if (isAdmin && (user.role !== 'ADMIN' || !user.isOnboarded)) {
                user.role = 'ADMIN';
                user.isOnboarded = true;
            }
            await user.save();
        }
        let isVerified = false;
        if (user.role === 'SERVICE_PROVIDER') {
            const providerProfile = await ProviderProfile.findOne({ userId: user._id });
            isVerified = providerProfile?.isVerified || false;
        }
        const payload = {
            _id: user._id.toString(),
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl,
            isVerified,
            isOnboarded: user.isOnboarded,
            preferredLanguage: user.preferredLanguage,
        };
        const token = createSessionToken(payload);
        setSessionCookie(res, token);
        res.status(200).json({
            success: true,
            message: 'Authentication successful',
            user: payload,
            data: {
                user: payload,
                token,
            },
            token, // Also return token in body for mobile / API clients
        });
    }
    catch (error) {
        console.error('Google login error:', error);
        res.status(401).json({
            success: false,
            message: error.message || 'Authentication with Google failed',
        });
    }
};
const completeOnboarding = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const { role, city, phoneNumber, businessName, categoryId, categoryIds, category, skills, trades, serviceDescription, serviceArea, location, nationalIdNumber, idCardImageUrl, consentGiven, } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }
        // Role Escalation Protection: cannot grant ADMIN role via onboarding
        if (role !== 'CUSTOMER' && role !== 'SERVICE_PROVIDER') {
            res.status(400).json({ success: false, message: 'Invalid onboarding role selected' });
            return;
        }
        user.role = role;
        user.city = city || user.city;
        if (phoneNumber)
            user.phoneNumber = phoneNumber;
        user.isOnboarded = true;
        await user.save();
        if (role === 'CUSTOMER') {
            await CustomerProfile.findOneAndUpdate({ userId: user._id }, { userId: user._id, 'defaultAddress.city': city }, { upsert: true, new: true });
        }
        else if (role === 'SERVICE_PROVIDER') {
            const resolvedCategoryIds = [];
            const primaryCat = categoryId || category;
            if (primaryCat) {
                if (Types.ObjectId.isValid(primaryCat)) {
                    resolvedCategoryIds.push(new Types.ObjectId(primaryCat));
                }
                else {
                    const cat = await ServiceCategory.findOne({
                        $or: [
                            { slug: primaryCat },
                            { nameEn: { $regex: new RegExp(`^${primaryCat}$`, 'i') } },
                            { nameAm: primaryCat },
                        ],
                    });
                    if (cat)
                        resolvedCategoryIds.push(cat._id);
                }
            }
            if (Array.isArray(categoryIds)) {
                for (const id of categoryIds) {
                    if (Types.ObjectId.isValid(id) && !resolvedCategoryIds.some((cid) => cid.equals(id))) {
                        resolvedCategoryIds.push(new Types.ObjectId(id));
                    }
                    else if (typeof id === 'string') {
                        const cat = await ServiceCategory.findOne({
                            $or: [
                                { slug: id },
                                { nameEn: { $regex: new RegExp(`^${id}$`, 'i') } },
                                { nameAm: id },
                            ],
                        });
                        if (cat && !resolvedCategoryIds.some((cid) => cid.equals(cat._id))) {
                            resolvedCategoryIds.push(cat._id);
                        }
                    }
                }
            }
            // Default fallback if no category was selected
            if (resolvedCategoryIds.length === 0) {
                const defaultCat = await ServiceCategory.findOne({ isActive: true });
                if (defaultCat)
                    resolvedCategoryIds.push(defaultCat._id);
            }
            const providerSkills = Array.isArray(skills) && skills.length > 0
                ? skills
                : (Array.isArray(trades) && trades.length > 0 ? trades : ['General Services']);
            // Create initial provider profile in PENDING_REVIEW state
            const providerProfile = await ProviderProfile.findOneAndUpdate({ userId: user._id }, {
                userId: user._id,
                businessName: businessName || user.displayName,
                serviceCities: [city || 'Adama'],
                categoryIds: resolvedCategoryIds,
                skills: providerSkills,
                bioEn: serviceDescription || '',
                publicAddress: serviceArea || city || 'Adama',
                location: location || { type: 'Point', coordinates: [39.2683, 8.54] },
                isVerified: false, // Strict: never auto-verify
                verificationStatus: 'PENDING_REVIEW',
                isAvailable: true,
            }, { upsert: true, new: true });
            // PHASE 2 ROOT CAUSE REPAIR: Automatically upsert ProviderVerification document
            // so every newly registered service provider reaches the administrator verification queue immediately
            const validNationalId = nationalIdNumber && typeof nationalIdNumber === 'string' && nationalIdNumber.trim().length >= 4
                ? nationalIdNumber.trim()
                : `ET-REG-${Date.now().toString().slice(-6)}`;
            await ProviderVerification.findOneAndUpdate({ providerProfileId: providerProfile._id }, {
                providerProfileId: providerProfile._id,
                userId: user._id,
                nationalIdNumber: validNationalId,
                idCardImageUrl: idCardImageUrl || '',
                consentGiven: consentGiven ?? true,
                status: 'PENDING_REVIEW',
                submittedAt: new Date(),
                rejectionReason: '',
            }, { upsert: true, new: true });
            recordAuditLog({
                actorId: user._id,
                actorEmail: user.email,
                action: 'PROVIDER_APPLICATION_SUBMITTED',
                entityType: 'ProviderVerification',
                entityId: providerProfile._id,
                details: {
                    businessName: providerProfile.businessName,
                    categoryIds: resolvedCategoryIds,
                    nationalIdProvided: !!nationalIdNumber,
                    hasIdImage: !!idCardImageUrl,
                },
            });
        }
        const updatedPayload = {
            _id: user._id.toString(),
            email: user.email,
            role: user.role,
            displayName: user.displayName,
            username: user.username,
            avatarUrl: user.avatarUrl,
            isVerified: false,
            isOnboarded: true,
            preferredLanguage: user.preferredLanguage,
        };
        const token = createSessionToken(updatedPayload);
        setSessionCookie(res, token);
        res.status(200).json({
            success: true,
            message: 'Onboarding completed successfully',
            user: updatedPayload,
            data: {
                user: updatedPayload,
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const getMe = async (req, res) => {
    if (!req.user) {
        res.status(200).json({
            success: true,
            authenticated: false,
            user: null,
            data: {
                user: null,
                profile: null,
            },
        });
        return;
    }
    let profile = null;
    if (req.user.role === 'SERVICE_PROVIDER') {
        profile = await ProviderProfile.findOne({ userId: req.user._id });
    }
    else if (req.user.role === 'CUSTOMER') {
        profile = await CustomerProfile.findOne({ userId: req.user._id });
    }
    res.status(200).json({
        success: true,
        authenticated: true,
        user: req.user,
        profile,
        data: {
            user: req.user,
            profile,
        },
    });
};
const logout = async (req, res) => {
    clearSessionCookie(res);
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
};

module.exports = {
  googleAuthSchema,
  onboardingRoleSchema,
  googleLogin,
  completeOnboarding,
  getMe,
  logout,
};
