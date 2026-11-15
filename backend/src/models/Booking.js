const mongoose = require('mongoose');
const { Schema } = mongoose;

const BookingAddressSchema = new Schema(
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

const AgreedPriceSchema = new Schema(
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

const BookingSchema = new Schema(
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

const Booking = mongoose.model('Booking', BookingSchema);

module.exports = {
  Booking,
};
