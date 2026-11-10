import mongoose, { Schema, Document, Types } from 'mongoose';
import { QuoteStatus } from '../types';

export interface IQuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface IQuote extends Document {
  bookingId: Types.ObjectId;
  providerId: Types.ObjectId;
  customerId: Types.ObjectId;
  quoteNumber: string;
  items: IQuoteItem[];
  totalAmount: number;
  currency: 'ETB';
  estimatedDurationHours?: number;
  inspectionIncluded: boolean;
  notes?: string;
  status: QuoteStatus;
  validUntil: Date;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteItemSchema = new Schema<IQuoteItem>(
  {
    description: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const QuoteSchema = new Schema<IQuote>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quoteNumber: {
      type: String,
      required: true,
    },
    items: [QuoteItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    estimatedDurationHours: {
      type: Number,
      min: 0,
    },
    inspectionIncluded: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['PROPOSED', 'ACCEPTED', 'REJECTED', 'SUPERSEDED'],
      default: 'PROPOSED',
      index: true,
    },
    validUntil: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
    },
  },
  {
    timestamps: true,
  }
);

export const Quote = mongoose.model<IQuote>('Quote', QuoteSchema);
