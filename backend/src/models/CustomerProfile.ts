import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomerProfile extends Document {
  userId: Types.ObjectId;
  savedProviderIds: Types.ObjectId[];
  defaultAddress?: {
    street: string;
    city: string;
    subcity?: string;
    kebele?: string;
    coordinates?: [number, number]; // [lng, lat]
  };
  createdAt: Date;
  updatedAt: Date;
}

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    savedProviderIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ProviderProfile',
      },
    ],
    defaultAddress: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Adama' },
      subcity: { type: String, default: '' },
      kebele: { type: String, default: '' },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const CustomerProfile = mongoose.model<ICustomerProfile>('CustomerProfile', CustomerProfileSchema);
