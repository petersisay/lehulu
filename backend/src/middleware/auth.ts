import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env';
import { AuthenticatedRequest, AuthUserPayload, UserRole } from '../types';
import { User } from '../models/User';
import { ProviderProfile } from '../models/ProviderProfile';

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export const COOKIE_NAME = 'lehulu_token';

export const createSessionToken = (payload: AuthUserPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

export const setSessionCookie = (res: Response, token: string): void => {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

export const clearSessionCookie = (res: Response): void => {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
};

export const verifyGoogleIdToken = async (idToken: string): Promise<{
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}> => {
  // If in dev or test mode and mock token prefix is used, decode or parse safely
  if (env.NODE_ENV !== 'production' && idToken.startsWith('mock-google-token-')) {
    const email = idToken.replace('mock-google-token-', '');
    return {
      googleId: `mock-google-id-${email}`,
      email,
      name: email.split('@')[0],
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(email.split('@')[0])}&background=059669&color=fff`,
    };
  }

  if (!env.GOOGLE_CLIENT_ID) {
    throw new Error('Google OAuth Client ID is not configured on the server.');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google ID token payload.');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name || payload.email.split('@')[0],
    picture: payload.picture,
  };
};

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
    
    // Verify user still exists and is active in database
    const user = await User.findById(decoded._id).select('-__v');
    if (!user || !user.isActive) {
      clearSessionCookie(res);
      return next();
    }

    // Attach verified provider status if user is a provider
    let isVerified = false;
    if (user.role === 'SERVICE_PROVIDER') {
      const providerProfile = await ProviderProfile.findOne({ userId: user._id }).select('isVerified verificationStatus');
      isVerified = providerProfile?.isVerified || false;
    }

    req.user = {
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

    next();
  } catch (error) {
    // If token expired or invalid, clear cookie and proceed without req.user
    clearSessionCookie(res);
    next();
  }
};
