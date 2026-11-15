const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProviderLeadSchema = new Schema(
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

const ProviderLead = mongoose.model('ProviderLead', ProviderLeadSchema);

module.exports = {
  ProviderLead,
};
