const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProviderVerificationSchema = new Schema(
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
      default: '',
    },
    consentGiven: {
      type: Boolean,
      default: true,
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

ProviderVerificationSchema.index({ status: 1, submittedAt: -1 });

const ProviderVerification = mongoose.model(
  'ProviderVerification',
  ProviderVerificationSchema
);

module.exports = {
  ProviderVerification,
};
