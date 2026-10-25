import mongoose, { Schema, Document, Types } from 'mongoose';
import { PricingModel, VerificationStatus } from '../types';

export interface IWorkingHour {
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  open: string;
  close: string;
  isClosed: boolean;
}

export interface IProviderProfile extends Document {
  userId: Types.ObjectId;
  businessName: string;
  bioEn: string;
  bioAm: string;
  experienceYears: number;
  categoryIds: Types.ObjectId[];
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
  workingHours: IWorkingHour[];
  portfolioImages: string[];
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  rating: number;
  reviewCount: number;
  completedBookingsCount: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkingHourSchema = new Schema<IWorkingHour>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    open: { type: String, default: '08:00' },
    close: { type: String, default: '18:00' },
    isClosed: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProviderProfileSchema = new Schema<IProviderProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    bioEn: {
      type: String,
      default: '',
      trim: true,
    },
    bioAm: {
      type: String,
      default: '',
      trim: true,
    },
    experienceYears: {
      type: Number,
      default: 1,
      min: 0,
    },
    categoryIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ServiceCategory',
        required: true,
      },
    ],
    skills: [{ type: String, trim: true }],
    serviceCities: {
      type: [String],
      default: ['Adama'],
      index: true,
    },
    serviceRadiusKm: {
      type: Number,
      default: 15,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
        default: [39.2667, 8.5414], // Default center: Adama [lng, lat]
      },
    },
    publicAddress: {
      type: String,
      default: '',
      trim: true,
    },
    pricing: {
      model: {
        type: String,
        enum: ['HOURLY', 'FIXED', 'INSPECTION', 'CUSTOM'],
        default: 'INSPECTION',
      },
      startingPrice: { type: Number, default: 0, min: 0 },
      hourlyRate: { type: Number, min: 0 },
      inspectionFee: { type: Number, min: 0 },
    },
    workingHours: {
      type: [WorkingHourSchema],
      default: [
        { dayOfWeek: 1, open: '08:00', close: '18:00', isClosed: false },
        { dayOfWeek: 2, open: '08:00', close: '18:00', isClosed: false },
        { dayOfWeek: 3, open: '08:00', close: '18:00', isClosed: false },
        { dayOfWeek: 4, open: '08:00', close: '18:00', isClosed: false },
        { dayOfWeek: 5, open: '08:00', close: '18:00', isClosed: false },
        { dayOfWeek: 6, open: '08:00', close: '17:00', isClosed: false },
        { dayOfWeek: 0, open: '09:00', close: '15:00', isClosed: true },
      ],
    },
    portfolioImages: [{ type: String }],
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_RECHECK', 'SUSPENDED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    rating: {
      type: Number,
      default: 0.0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedBookingsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for location queries
ProviderProfileSchema.index({ location: '2dsphere' });
ProviderProfileSchema.index({ categoryIds: 1, isVerified: 1, isAvailable: 1 });
ProviderProfileSchema.index({ isVerified: 1, verificationStatus: 1, isAvailable: 1 });
ProviderProfileSchema.index({ serviceCities: 1, isVerified: 1, rating: -1 });

export const ProviderProfile = mongoose.model<IProviderProfile>('ProviderProfile', ProviderProfileSchema);
