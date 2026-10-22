import mongoose, { Schema, Document, Types } from 'mongoose';
import { UserRole } from '../types';

export interface IMessage extends Document {
  bookingId: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId: Types.ObjectId;
  senderRole: UserRole;
  content: string;
  attachments: string[];
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    senderRole: {
      type: String,
      enum: ['CUSTOMER', 'SERVICE_PROVIDER', 'ADMIN'],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: [{ type: String }],
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ bookingId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
