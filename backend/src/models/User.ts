import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  googleId: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  phoneNumber?: string;
  role: UserRole;
  preferredLanguage: 'en' | 'am';
  city: string;
  isActive: boolean;
  isOnboarded: boolean;
  lastLoginAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    phoneNumber: {
      type: String,
      default: '',
      trim: true,
    },
    role: {
      type: String,
      enum: ['CUSTOMER', 'SERVICE_PROVIDER', 'ADMIN'],
      default: 'CUSTOMER',
      index: true,
    },
    preferredLanguage: {
      type: String,
      enum: ['en', 'am'],
      default: 'am',
    },
    city: {
      type: String,
      default: 'Adama',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isOnboarded: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>('User', UserSchema);
