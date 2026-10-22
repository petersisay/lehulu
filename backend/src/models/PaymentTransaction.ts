import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../types';

export interface IPaymentTransaction extends Document {
  bookingId: Types.ObjectId;
  customerId: Types.ObjectId;
  providerId: Types.ObjectId;
  amount: number;
  currency: 'ETB';
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionReference: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentTransactionSchema = new Schema<IPaymentTransaction>(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
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
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'ETB',
    },
    paymentMethod: {
      type: String,
      enum: ['CASH_AFTER_SERVICE', 'CHAPA', 'TELEBIRR'],
      default: 'CASH_AFTER_SERVICE',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESSFUL', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    transactionReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const PaymentTransaction = mongoose.model<IPaymentTransaction>(
  'PaymentTransaction',
  PaymentTransactionSchema
);
