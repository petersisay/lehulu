import mongoose, { Schema, Document, Types } from 'mongoose';
import { NotificationType } from '../types';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  referenceId?: Types.ObjectId;
  referenceType?: 'Booking' | 'Quote' | 'ProviderVerification';
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
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

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
