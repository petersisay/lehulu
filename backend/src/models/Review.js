const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true, // Strictly one review per completed booking
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
    },
    providerResponse: {
      text: { type: String, trim: true },
      respondedAt: { type: Date },
    },
    isReported: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ providerId: 1, rating: -1 });
ReviewSchema.index({ providerId: 1, createdAt: -1 });

const Review = mongoose.model('Review', ReviewSchema);

module.exports = {
  Review,
};
