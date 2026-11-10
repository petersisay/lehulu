import mongoose, { Schema, Document, Types } from 'mongoose';
import { BookingStatus, PricingModel } from '../types';

export interface IBookingAddress {
  city: string;
  subcity?: string;
  kebele?: string;
  streetAddress: string;
  coordinates?: [number, number];
  contactPhone: string;
}

export interface IAgreedPrice {
  amount: number;
  currency: 'ETB';
  pricingModel: PricingModel;
  isFinal: boolean;
}

export interface IBooking extends Document {
  bookingNumber: string;
  customerId: Types.ObjectId;
  providerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  status: BookingStatus;
  requestedDate: Date;
  requestedTimeSlot: string;
  problemDescription: string;
  referenceImages: string[];
  serviceAddress: IBookingAddress;
  agreedPrice?: IAgreedPrice;
  cancellationReason?: string;
  cancelledBy?: Types.ObjectId;
  completionRequestedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BookingAddressSchema = new Schema<IBookingAddress>(
  {
    city: { type: String, required: true },
    subcity: { type: String, default: '' },
    kebele: { type: String, default: '' },
    streetAddress: { type: String, required: true },
    coordinates: { type: [Number], default: undefined },
    contactPhone: { type: String, required: true },
  },
  { _id: false }
);

const AgreedPriceSchema = new Schema<IAgreedPrice>(
  {
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'ETB' },
    pricingModel: {
      type: String,
      enum: ['HOURLY', 'FIXED', 'INSPECTION', 'CUSTOM'],
      default: 'FIXED',
    },
    isFinal: { type: Boolean, default: false },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: 'ProviderProfile',
      required: true,
      index: true,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
    },
    status: {
      type: String,
      enum: [
        'REQUESTED',
        'AWAITING_QUOTE',
        'QUOTED',
        'CONFIRMED',
        'IN_PROGRESS',
        'COMPLETION_PENDING',
        'COMPLETED',
        'CANCELLED',
        'DISPUTED',
      ],
      default: 'REQUESTED',
      index: true,
    },
    requestedDate: {
      type: Date,
      required: true,
    },
    requestedTimeSlot: {
      type: String,
      required: true,
    },
    problemDescription: {
      type: String,
      required: true,
      trim: true,
    },
    referenceImages: [{ type: String }],
    serviceAddress: {
      type: BookingAddressSchema,
      required: true,
    },
    agreedPrice: {
      type: AgreedPriceSchema,
      default: undefined,
    },
    cancellationReason: {
      type: String,
      default: '',
    },
    cancelledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    completionRequestedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

BookingSchema.index({ customerId: 1, status: 1 });
BookingSchema.index({ providerId: 1, status: 1 });
BookingSchema.index({ createdAt: -1 });

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
