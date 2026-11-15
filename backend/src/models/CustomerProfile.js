const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerProfileSchema = new Schema(
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

const CustomerProfile = mongoose.model('CustomerProfile', CustomerProfileSchema);

module.exports = {
  CustomerProfile,
};
