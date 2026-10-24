import { Response } from 'express';
import { z } from 'zod';
import { Types } from 'mongoose';
import { AuthenticatedRequest } from '../types';
import { Booking } from '../models/Booking';
import { Quote } from '../models/Quote';
import { ProviderProfile } from '../models/ProviderProfile';
import { Notification } from '../models/Notification';
import { emitSocketEvent } from '../sockets';

export const createQuoteSchema = z.object({
  body: z.object({
    bookingId: z.string().min(1, 'Booking ID is required'),
    items: z
      .array(
        z.object({
          description: z.string().min(1, 'Item description is required'),
          quantity: z.number().min(1).default(1),
          unitPrice: z.number().min(0, 'Unit price must be non-negative'),
        })
      )
      .min(1, 'At least one quotation item is required'),
    estimatedDurationHours: z.number().min(0).optional(),
    inspectionIncluded: z.boolean().default(true),
    notes: z.string().optional(),
    validityDays: z.number().min(1).max(30).default(7),
  }),
});

export const respondToQuoteSchema = z.object({
  body: z.object({
    action: z.enum(['ACCEPT', 'REJECT']),
  }),
});

export const createQuote = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { bookingId, items, estimatedDurationHours, inspectionIncluded, notes, validityDays } = req.body;

    const booking = await Booking.findById(bookingId).populate('providerId');
    if (!booking) {
      res.status(404).json({ success: false, message: 'Booking not found' });
      return;
    }

    const provUserId =
      (booking.providerId as any)?.userId?._id?.toString() ||
      (booking.providerId as any)?.userId?.toString();

    const userProviderProfile = await ProviderProfile.findOne({ userId: req.user._id }).select('_id');
    const userProviderId = userProviderProfile?._id?.toString();

    const bookingProvId =
      (booking.providerId as any)?._id?.toString() ||
      booking.providerId?.toString();

    const isAuthorizedProvider =
      provUserId === req.user._id ||
      (userProviderId && userProviderId === bookingProvId) ||
      req.user.role === 'ADMIN';

    if (!isAuthorizedProvider) {
      res.status(403).json({
        success: false,
        message: 'Only the assigned service provider can submit a quotation for this booking.',
      });
      return;
    }

    // Calculate item totals and grand total in ETB
    const calculatedItems = items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
    }));

    const totalAmount = calculatedItems.reduce((sum: number, item: any) => sum + item.total, 0);

    const quoteCount = await Quote.countDocuments({ bookingId });
    const quoteNumber = `Q-${booking.bookingNumber}-${quoteCount + 1}`;

    const quote = await Quote.create({
      bookingId: booking._id,
      providerId: booking.providerId._id,
      customerId: booking.customerId,
      quoteNumber,
      items: calculatedItems,
      totalAmount,
      currency: 'ETB',
      estimatedDurationHours,
      inspectionIncluded: inspectionIncluded !== undefined ? inspectionIncluded : true,
      notes: notes || '',
      status: 'PROPOSED',
      validUntil: new Date(Date.now() + (validityDays || 7) * 24 * 60 * 60 * 1000),
    });

    // Update booking status to QUOTED
    booking.status = 'QUOTED';
    await booking.save();

    // Notify customer of formal quotation
    await Notification.create({
      userId: booking.customerId,
      type: 'QUOTE_RECEIVED',
      titleEn: `Quotation Received for ${booking.bookingNumber}`,
      titleAm: `ለቦታ ማስያዣ ${booking.bookingNumber} የዋጋ ግምት ቀርቧል`,
      messageEn: `Provider proposed a quotation of ${totalAmount.toLocaleString()} ETB.`,
      messageAm: `ባለሙያው ${totalAmount.toLocaleString()} የኢትዮጵያ ብር የዋጋ ግምት ልከዋል::`,
      referenceId: quote._id,
      referenceType: 'Quote',
    });

    emitSocketEvent(`booking:${booking._id}`, 'quote:received', {
      quoteId: quote._id,
      quoteNumber,
      totalAmount,
      currency: 'ETB',
    });

    res.status(201).json({
      success: true,
      message: 'Quotation submitted successfully',
      quote,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getBookingQuotes = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
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

    const providerUserId = (booking.providerId as any).userId.toString();
    const isCustomer = booking.customerId.toString() === req.user._id;
    const isProvider = providerUserId === req.user._id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isCustomer && !isProvider && !isAdmin) {
      res.status(403).json({ success: false, message: 'Access forbidden' });
      return;
    }

    const quotes = await Quote.find({ bookingId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      quotes,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const respondToQuote = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const { quoteId } = req.params;
    const { action } = req.body as { action: 'ACCEPT' | 'REJECT' };

    const quote = await Quote.findById(quoteId).populate('bookingId');
    if (!quote) {
      res.status(404).json({ success: false, message: 'Quotation not found' });
      return;
    }

    if (quote.customerId.toString() !== req.user._id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Only the customer can accept or reject a quotation.',
      });
      return;
    }

    if (quote.status !== 'PROPOSED') {
      res.status(400).json({
        success: false,
        message: `This quotation is already ${quote.status.toLowerCase()}.`,
      });
      return;
    }

    const booking = await Booking.findById(quote.bookingId);
    if (!booking) {
      res.status(404).json({ success: false, message: 'Associated booking not found' });
      return;
    }

    const provider = await ProviderProfile.findById(quote.providerId);

    if (action === 'ACCEPT') {
      quote.status = 'ACCEPTED';
      await quote.save();

      // Supersede any other active quotes for this booking
      await Quote.updateMany(
        { bookingId: booking._id, _id: { $ne: quote._id }, status: 'PROPOSED' },
        { status: 'SUPERSEDED' }
      );

      // Lock in agreed price on the booking and transition status to CONFIRMED
      booking.status = 'CONFIRMED';
      booking.agreedPrice = {
        amount: quote.totalAmount,
        currency: 'ETB',
        pricingModel: 'FIXED',
        isFinal: true,
      };
      await booking.save();

      if (provider) {
        await Notification.create({
          userId: provider.userId,
          type: 'QUOTE_ACCEPTED',
          titleEn: `Quotation Accepted for ${booking.bookingNumber}`,
          titleAm: `የዋጋ ግምቱ በደንበኛው ተቀባይነት አግኝቷል`,
          messageEn: `Customer accepted quotation of ${quote.totalAmount.toLocaleString()} ETB. Booking is confirmed.`,
          messageAm: `ደንበኛው የቀረበውን ${quote.totalAmount.toLocaleString()} የኢትዮጵያ ብር ተቀብለዋል:: ቦታ ማስያዣው ተረጋግጧል::`,
          referenceId: booking._id,
          referenceType: 'Booking',
        });
      }

      emitSocketEvent(`booking:${booking._id}`, 'quote:accepted', {
        quoteId: quote._id,
        bookingId: booking._id,
        agreedPrice: booking.agreedPrice,
      });

      res.status(200).json({
        success: true,
        message: 'Quotation accepted and booking confirmed.',
        quote,
        booking,
      });
    } else {
      quote.status = 'REJECTED';
      await quote.save();

      booking.status = 'AWAITING_QUOTE';
      await booking.save();

      res.status(200).json({
        success: true,
        message: 'Quotation rejected.',
        quote,
      });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
