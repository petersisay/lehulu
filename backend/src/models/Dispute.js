const mongoose = require('mongoose');
const { Schema } = mongoose;

const DisputeSchema = new Schema(
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

const Dispute = mongoose.model('Dispute', DisputeSchema);

module.exports = {
  Dispute,
};
