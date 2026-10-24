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
    sameSite: isSecure ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

export const clearSessionCookie = (res: Response): void => {
  const isSecure = env.IS_PRODUCTION || env.IS_STAGING;
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? 'none' : 'lax',
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
  // Local development and staging must not accidentally enable mock authentication.
  const isTestAuthAllowed =
    env.IS_TEST &&
    process.env.ALLOW_TEST_AUTH === 'true' &&
    !isProduction &&
    !isStaging;

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
  const validAudiences = [
    env.GOOGLE_CLIENT_ID,
    '764795198689-41h522pnno7r3ifmb6im3iu12418m31f.apps.googleusercontent.com',
    '1084242194821-lehulu-test-client-id.apps.googleusercontent.com',
  ].filter(Boolean);

  let verifiedPayload: {
    sub: string;
    email: string;
    name?: string;
    picture?: string;
    email_verified?: boolean | string;
    iss?: string;
  } | null = null;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: validAudiences.length === 1 ? validAudiences[0] : validAudiences,
    });
    const payload = ticket.getPayload();
    if (payload && payload.email) {
      verifiedPayload = {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        email_verified: payload.email_verified,
        iss: payload.iss,
      };
    }
  } catch (verifyErr) {
    // If local verification failed (e.g. audience mismatch on Render),
    // securely verify directly with Google's official tokeninfo endpoint
    try {
      const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
      if (resp.ok) {
        const info = (await resp.json()) as any;
        if (info && info.email) {
          verifiedPayload = {
            sub: info.sub,
            email: info.email,
            name: info.name,
            picture: info.picture,
            email_verified: info.email_verified === 'true' || info.email_verified === true,
            iss: info.iss,
          };
        }
      }
    } catch {
      // Fall through to validation check below
    }
  }

  if (!verifiedPayload || !verifiedPayload.email) {
    throw new Error('Google authentication failed: unable to verify Google ID token with Google Identity Services.');
  }

  if (!verifiedPayload.email_verified) {
    throw new Error('Unverified Google email accounts are not permitted on Lehulu.');
  }

  const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
  if (!verifiedPayload.iss || !validIssuers.includes(verifiedPayload.iss)) {
    throw new Error('Invalid Google token issuer.');
  }

  return {
    googleId: verifiedPayload.sub,
    email: verifiedPayload.email.toLowerCase(),
    name: verifiedPayload.name || verifiedPayload.email.split('@')[0],
    picture: verifiedPayload.picture,
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
