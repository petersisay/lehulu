import mongoose, { Schema, Document, Types } from 'mongoose';
import { DisputeStatus, UserRole } from '../types';

export interface IDispute extends Document {
  bookingId: Types.ObjectId;
  raisedByUserId: Types.ObjectId;
  raisedByRole: UserRole;
  reason: string;
  description: string;
  evidenceUrls: string[];
  status: DisputeStatus;
  resolutionNotes?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    raisedByUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    raisedByRole: {
      type: String,
      enum: ['CUSTOMER', 'SERVICE_PROVIDER'],
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    evidenceUrls: [{ type: String }],
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'OPEN',
      index: true,
    },
    resolutionNotes: {
      type: String,
      default: '',
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Dispute = mongoose.model<IDispute>('Dispute', DisputeSchema);
