import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'CUSTOMER' | 'SERVICE_PROVIDER' | 'ADMIN';

export type VerificationStatus = 
  | 'PENDING_REVIEW' 
  | 'VERIFIED' 
  | 'REJECTED' 
  | 'NEEDS_RECHECK' 
  | 'SUSPENDED';

export type PricingModel = 'HOURLY' | 'FIXED' | 'INSPECTION' | 'CUSTOM';

export type BookingStatus = 
  | 'REQUESTED' 
  | 'AWAITING_QUOTE' 
  | 'QUOTED' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETION_PENDING' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'DISPUTED';

export type QuoteStatus = 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED';

export type NotificationType = 
  | 'BOOKING_REQUEST' 
  | 'QUOTE_RECEIVED' 
  | 'QUOTE_ACCEPTED' 
  | 'BOOKING_CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETION_PENDING' 
  | 'BOOKING_COMPLETED' 
  | 'NEW_MESSAGE' 
  | 'VERIFICATION_UPDATE' 
  | 'REVIEW_RECEIVED';

export type PaymentMethod = 'CASH_AFTER_SERVICE' | 'CHAPA' | 'TELEBIRR';

export type PaymentStatus = 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'REFUNDED';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface AuthUserPayload {
  _id: string;
  email: string;
  role: UserRole;
  displayName: string;
  username: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isOnboarded: boolean;
  preferredLanguage: 'en' | 'am';
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}
