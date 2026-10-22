import mongoose, { Schema, Document, Types } from 'mongoose';
import { VerificationStatus } from '../types';

export interface IProviderVerification extends Document {
  providerProfileId: Types.ObjectId;
  userId: Types.ObjectId;
  nationalIdNumber: string;
  idCardImageUrl: string;
  tradeLicenseUrl?: string;
  certificateUrls: string[];
  status: VerificationStatus;
  reviewedBy?: Types.ObjectId;
  rejectionReason?: string;
  adminNotes?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderVerificationSchema = new Schema<IProviderVerification>(
  {
    providerProfileId: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    nationalIdNumber: {
      type: String,
      required: true,
      trim: true,
    },
    idCardImageUrl: {
      type: String,
      required: true,
    },
    tradeLicenseUrl: {
      type: String,
      default: '',
    },
    certificateUrls: [{ type: String }],
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'VERIFIED', 'REJECTED', 'NEEDS_RECHECK', 'SUSPENDED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const ProviderVerification = mongoose.model<IProviderVerification>(
  'ProviderVerification',
  ProviderVerificationSchema
);
