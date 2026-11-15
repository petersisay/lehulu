const mongoose = require('mongoose');
const { Schema } = mongoose;

const NotificationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'BOOKING_REQUEST',
        'QUOTE_RECEIVED',
        'QUOTE_ACCEPTED',
        'BOOKING_CONFIRMED',
        'IN_PROGRESS',
        'COMPLETION_PENDING',
        'BOOKING_COMPLETED',
        'NEW_MESSAGE',
        'VERIFICATION_UPDATE',
        'REVIEW_RECEIVED',
      ],
      required: true,
    },
    titleEn: { type: String, required: true },
    titleAm: { type: String, required: true },
    messageEn: { type: String, required: true },
    messageAm: { type: String, required: true },
    referenceId: { type: Schema.Types.ObjectId },
    referenceType: { type: String },
    isRead: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = {
  Notification,
};
