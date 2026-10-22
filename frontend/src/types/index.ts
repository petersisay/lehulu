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

export type Language = 'en' | 'am';

export interface User {
  _id: string;
  email: string;
  role: UserRole;
  displayName: string;
  username: string;
  avatarUrl?: string;
  phoneNumber?: string;
  preferredLanguage: Language;
  city: string;
  isVerified?: boolean;
  isOnboarded: boolean;
}

export interface ServiceCategory {
  _id: string;
  nameEn: string;
  nameAm: string;
  slug: string;
  descriptionEn: string;
  descriptionAm: string;
  icon: string;
  displayOrder: number;
  isActive: boolean;
  subcategories: {
    nameEn: string;
    nameAm: string;
    slug: string;
  }[];
}

export interface ProviderProfile {
  _id: string;
  userId: User;
  businessName: string;
  bioEn: string;
  bioAm?: string;
  experienceYears: number;
  categoryIds: ServiceCategory[];
  skills: string[];
  serviceCities: string[];
  serviceRadiusKm: number;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  publicAddress?: string;
  pricing: {
    model: PricingModel;
    startingPrice: number;
    hourlyRate?: number;
    inspectionFee?: number;
  };
  workingHours: {
    dayOfWeek: number;
    open: string;
    close: string;
    isClosed: boolean;
  }[];
  portfolioImages: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  rating: number;
  reviewCount: number;
  completedBookingsCount: number;
  isAvailable: boolean;
  createdAt: string;
}

export interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  _id: string;
  bookingId: string;
  providerId: string;
  customerId: string;
  quoteNumber: string;
  items: QuoteItem[];
  totalAmount: number;
  currency: 'ETB';
  estimatedDurationHours?: number;
  inspectionIncluded: boolean;
  notes?: string;
  status: QuoteStatus;
  validUntil: string;
  createdAt: string;
}

export interface Booking {
  _id: string;
  bookingNumber: string;
  customerId: User;
  providerId: ProviderProfile;
  categoryId: ServiceCategory;
  status: BookingStatus;
  requestedDate: string;
  requestedTimeSlot: string;
  problemDescription: string;
  referenceImages: string[];
  serviceAddress: {
    city: string;
    subcity?: string;
    kebele?: string;
    streetAddress: string;
    coordinates?: [number, number];
    contactPhone: string;
  };
  agreedPrice?: {
    amount: number;
    currency: 'ETB';
    pricingModel: PricingModel;
    isFinal: boolean;
  };
  cancellationReason?: string;
  completionRequestedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  bookingId: string;
  senderId: User;
  recipientId: string;
  senderRole: UserRole;
  content: string;
  attachments: string[];
  readAt?: string;
  createdAt: string;
}

export interface Review {
  _id: string;
  bookingId: string;
  customerId: User;
  providerId: string;
  rating: number;
  comment: string;
  providerResponse?: {
    text: string;
    respondedAt: string;
  };
  createdAt: string;
}

export interface Notification {
  _id: string;
  userId: string;
  type: string;
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  createdAt: string;
}
