const { z } = require('zod');
const { Types } = require('mongoose');
const { Booking } = require('../models/Booking');
const { Message } = require('../models/Message');
const { Notification } = require('../models/Notification');
const { emitSocketEvent } = require('../sockets');
const sendMessageSchema = z.object({
    body: z.object({
        content: z.string().min(1, 'Message content cannot be empty').max(2000),
        attachments: z.array(z.string()).default([]),
    }),
});
const getBookingMessages = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const { bookingId } = req.params;
        const booking = await Booking.findById(bookingId).populate('providerId');
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        const providerUserId = booking.providerId.userId.toString();
        const isCustomer = booking.customerId.toString() === req.user._id;
        const isProvider = providerUserId === req.user._id;
        const isAdmin = req.user.role === 'ADMIN';
        if (!isCustomer && !isProvider && !isAdmin) {
            res.status(403).json({
                success: false,
                message: 'Forbidden: You are not authorized to view messages for this booking.',
            });
            return;
        }
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;
        const [messages, total] = await Promise.all([
            Message.find({ bookingId })
                .populate('senderId', 'displayName avatarUrl role')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit),
            Message.countDocuments({ bookingId }),
        ]);
        // Mark unread messages sent to current user as read
        await Message.updateMany({ bookingId, recipientId: req.user._id, readAt: { $exists: false } }, { readAt: new Date() });
        res.status(200).json({
            success: true,
            messages,
            data: messages,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
const sendMessage = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: 'Authentication required' });
            return;
        }
        const { bookingId } = req.params;
        const { content, attachments } = req.body;
        const booking = await Booking.findById(bookingId).populate('providerId');
        if (!booking) {
            res.status(404).json({ success: false, message: 'Booking not found' });
            return;
        }
        const providerUserId = booking.providerId.userId.toString();
        const isCustomer = booking.customerId.toString() === req.user._id;
        const isProvider = providerUserId === req.user._id;
        const isAdmin = req.user.role === 'ADMIN';
        if (!isCustomer && !isProvider && !isAdmin) {
            res.status(403).json({
                success: false,
                message: 'Forbidden: You cannot send messages for this booking.',
            });
            return;
        }
        const recipientId = isCustomer
            ? new Types.ObjectId(providerUserId)
            : new Types.ObjectId(booking.customerId);
        const message = await Message.create({
            bookingId: booking._id,
            senderId: req.user._id,
            recipientId,
            senderRole: req.user.role,
            content,
            attachments: attachments || [],
        });
        const populatedMessage = await Message.findById(message._id).populate('senderId', 'displayName avatarUrl role');
        // Create notification for recipient
        await Notification.create({
            userId: recipientId,
            type: 'NEW_MESSAGE',
            titleEn: `New Message on ${booking.bookingNumber}`,
            titleAm: `በቦታ ማስያዣ ${booking.bookingNumber} አዲስ መልዕክት ደርሶዎታል`,
            messageEn: `${req.user.displayName}: ${content.slice(0, 80)}`,
            messageAm: `${req.user.displayName}: ${content.slice(0, 80)}`,
            referenceId: booking._id,
            referenceType: 'Booking',
        });
        emitSocketEvent(`booking:${booking._id}`, 'message:received', populatedMessage);
        emitSocketEvent(`booking:${booking._id}`, 'new_message', populatedMessage);
        emitSocketEvent(`user:${recipientId}`, 'notification:new', {
            type: 'NEW_MESSAGE',
            bookingId: booking._id,
        });
        emitSocketEvent(`user:${recipientId}`, 'notification', {
            type: 'NEW_MESSAGE',
            bookingId: booking._id,
        });
        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: populatedMessage,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
  sendMessageSchema,
  getBookingMessages,
  sendMessage,
};
