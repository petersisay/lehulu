import mongoose, { Schema, Document } from 'mongoose';

export type LeadStatus =
  | 'RESEARCHED_LEAD'
  | 'INVITED'
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export interface IProviderLead extends Document {
  businessName: string;
  categorySlug: string;
  services: string[];
  city: 'Adama' | 'Bishoftu' | 'Addis Ababa' | string;
  serviceArea: string;
  publicSourceUrl: string;
  sourceVerificationDate: Date;
  publicAddress: string;
  contactPhone?: string;
  contactEmail?: string;
  website?: string;
  status: LeadStatus;
  notes?: string;
  lastCheckedDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProviderLeadSchema = new Schema<IProviderLead>(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    categorySlug: {
      type: String,
      required: true,
      index: true,
    },
    services: [
      {
        type: String,
        trim: true,
      },
    ],
    city: {
      type: String,
      required: true,
      index: true,
    },
    serviceArea: {
      type: String,
      default: '',
      trim: true,
    },
    publicSourceUrl: {
      type: String,
      required: true,
      trim: true,
    },
    sourceVerificationDate: {
      type: Date,
      default: Date.now,
    },
    publicAddress: {
      type: String,
      default: '',
      trim: true,
    },
    contactPhone: {
      type: String,
      default: '',
      trim: true,
    },
    contactEmail: {
      type: String,
      default: '',
      trim: true,
    },
    website: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: [
        'RESEARCHED_LEAD',
        'INVITED',
        'PENDING_VERIFICATION',
        'VERIFIED',
        'REJECTED',
        'SUSPENDED',
      ],
      default: 'RESEARCHED_LEAD',
      index: true,
    },
    notes: {
      type: String,
      default: '',
    },
    lastCheckedDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

ProviderLeadSchema.index({ city: 1, categorySlug: 1, status: 1 });

export const ProviderLead = mongoose.model<IProviderLead>('ProviderLead', ProviderLeadSchema);
