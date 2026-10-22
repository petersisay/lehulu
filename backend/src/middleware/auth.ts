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
  const isSecure = env.IS_PRODUCTION || env.IS_STAGING;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

export const clearSessionCookie = (res: Response): void => {
  const isSecure = env.IS_PRODUCTION || env.IS_STAGING;
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'strict' : 'lax',
    path: '/',
  });
};

export const verifyGoogleIdToken = async (idToken: string): Promise<{
  googleId: string;
  email: string;
  name: string;
  picture?: string;
}> => {
  const isMockToken = idToken.startsWith('mock') || idToken.startsWith('test-');
  const isProduction = env.IS_PRODUCTION;
  const isStaging = env.IS_STAGING || process.env.APP_ENV === 'staging' || process.env.STAGING === 'true';

  // Rule 1: Production and Staging strictly reject mock tokens under all circumstances
  if (isProduction || isStaging) {
    if (isMockToken) {
      throw new Error('Mock authentication tokens are strictly prohibited in staging and production environments.');
    }
  }

  // Rule 2: Explicit test-only mechanism: requires NODE_ENV === 'test' AND ALLOW_TEST_AUTH === 'true'
  // Local development must not accidentally enable privileged mock authentication.
  const isTestAuthAllowed = env.IS_TEST && (env.ALLOW_TEST_AUTH || process.env.ALLOW_TEST_AUTH === 'true');

  if (isMockToken) {
    if (!isTestAuthAllowed) {
      throw new Error('Mock authentication is disabled. Real Google Identity verification is required.');
    }

    // Inside isolated automated tests with ALLOW_TEST_AUTH:
    if (idToken.startsWith('mock-google-token-')) {
      const email = idToken.replace('mock-google-token-', '').trim().toLowerCase();
      // Only assign administrator privileges if in isolated test and email exactly matches configured ADMIN_EMAIL
      const isAdmin = email === env.ADMIN_EMAIL.toLowerCase();
      return {
        googleId: `mock-google-id-${email}`,
        email,
        name: isAdmin ? 'Petros Sisay (Administrator)' : email.split('@')[0],
        picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(isAdmin ? 'Petros Sisay' : email.split('@')[0])}&background=059669&color=fff`,
      };
    }

    if (idToken.startsWith('mock_token_admin') || idToken === 'mock-admin') {
      const email = env.ADMIN_EMAIL.toLowerCase();
      return {
        googleId: `mock-google-id-${email}`,
        email,
        name: 'Petros Sisay (Administrator)',
        picture: 'https://ui-avatars.com/api/?name=Petros+Sisay&background=059669&color=fff',
      };
    }

    if (idToken.startsWith('mock_token_service_provider') || idToken === 'mock-provider') {
      const email = 'provider@lehulu.et';
      return {
        googleId: `mock-google-id-${email}`,
        email,
        name: 'Abebe Kebede (Technician)',
        picture: 'https://ui-avatars.com/api/?name=Abebe+Kebede&background=059669&color=fff',
      };
    }

    if (idToken.startsWith('mock_token_customer') || idToken === 'mock-customer' || idToken.startsWith('mock_token_')) {
      const email = 'customer@lehulu.et';
      return {
        googleId: `mock-google-id-${email}`,
        email,
        name: 'Almaz Tadesse',
        picture: 'https://ui-avatars.com/api/?name=Almaz+Tadesse&background=059669&color=fff',
      };
    }

    throw new Error('Unrecognized mock authentication token.');
  }

  // Real Google ID Token Verification
  if (!env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID.trim() === '') {
    throw new Error('Google OAuth Client ID is not configured on the server.');
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error('Invalid Google ID token payload: missing email.');
  }

  if (!payload.email_verified) {
    throw new Error('Unverified Google email accounts are not permitted on Lehulu.');
  }

  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!payload.iss || !validIssuers.includes(payload.iss)) {
    throw new Error('Invalid Google token issuer.');
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
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
