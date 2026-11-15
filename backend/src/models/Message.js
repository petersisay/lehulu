const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema(
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

const Message = mongoose.model('Message', MessageSchema);

module.exports = {
  Message,
};
