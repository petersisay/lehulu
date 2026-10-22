import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronLeft,
  Loader2,
  Star,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useSocket } from '../context/SocketContext';
import { bookingApi, quoteApi } from '../services/api';
import { Booking, Quote, BookingStatus } from '../types';
import { QuotationView } from '../components/QuotationView';
import { BookingChat } from '../components/BookingChat';
import { ReviewModal } from '../components/ReviewModal';

const LIFECYCLE_STEPS: BookingStatus[] = [
  'REQUESTED',
  'QUOTED',
  'CONFIRMED',
  'IN_PROGRESS',
  'COMPLETION_PENDING',
  'COMPLETED',
];

export const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { onBookingUpdated } = useSocket();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);

  const fetchBooking = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await bookingApi.getById(id);
      if (res.data.success) {
        setBooking(res.data.data.booking);
        setQuotes(res.data.data.quotes || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/bookings/' + id);
      return;
    }
    if (isAuthenticated) {
      fetchBooking();
    }
  }, [id, isAuthenticated, authLoading]);

  // Real-time status sync via Socket.IO
  useEffect(() => {
    const unsubscribe = onBookingUpdated?.((updated: Booking) => {
      if (updated._id === id) {
        setBooking(updated);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [id, onBookingUpdated]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
        <p className="text-xs font-semibold">Loading booking details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Access Denied or Booking Missing</h2>
        <p className="text-xs text-slate-500">{error || 'You are not authorized to view this booking record.'}</p>
        <Link
          to="/"
          className="inline-block px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          Return Home
        </Link>
      </div>
    );
  }

  const customer = typeof booking.customerId === 'object' ? booking.customerId : null;
  const provider = typeof booking.providerId === 'object' ? booking.providerId : null;
  const isCustomer = user?._id === customer?._id;
  const isProvider = user?.role === 'SERVICE_PROVIDER';
  const otherPartyName = isCustomer
    ? (provider?.businessName || 'Specialist')
    : (customer?.displayName || 'Customer');

  const handleConfirmCompletion = async () => {
    if (!window.confirm('Confirm that the service has been satisfactorily completed?')) return;
    setActionLoading(true);
    try {
      const res = await bookingApi.confirmCompletion(booking._id);
      if (res.data.success) {
        setBooking(res.data.data);
        if (isCustomer) setIsReviewOpen(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm completion.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    const reason = prompt('Please specify cancellation reason:');
    if (!reason) return;
    setActionLoading(true);
    try {
      const res = await bookingApi.updateStatus(booking._id, 'CANCELLED', reason);
      if (res.data.success) {
        setBooking(res.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel booking.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartWork = async () => {
    setActionLoading(true);
    try {
      const res = await bookingApi.updateStatus(booking._id, 'IN_PROGRESS');
      if (res.data.success) setBooking(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestCompletion = async () => {
    setActionLoading(true);
    try {
      const res = await bookingApi.requestCompletion(booking._id);
      if (res.data.success) setBooking(res.data.data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request completion.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentStepIndex = LIFECYCLE_STEPS.indexOf(booking.status);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to={isCustomer ? '/customer/dashboard' : '/provider/dashboard'}
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header Info Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Booking #{booking.bookingNumber}
            </span>
            <span className="text-xs font-extrabold px-3 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-300">
              {booking.status}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950">
            {booking.problemDescription}
          </h1>
          <p className="text-xs text-slate-500">
            Created on {new Date(booking.createdAt).toLocaleDateString()} • Category:{' '}
            {(booking.categoryId as any)?.nameEn || 'General Repair'}
          </p>
        </div>

        {/* Agreed Price Badge */}
        {booking.agreedPrice ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">
              Agreed Service Total
            </span>
            <span className="text-2xl font-black text-emerald-900 font-mono">
              {booking.agreedPrice.amount.toLocaleString()} ETB
            </span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pricing Status
            </span>
            <span className="text-sm font-bold text-slate-700">
              {booking.status === 'REQUESTED' ? 'Awaiting Provider Quote' : 'Pending Confirmation'}
            </span>
          </div>
        )}
      </div>

      {/* Lifecycle Stepper Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[600px] gap-2">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = currentStepIndex > idx || booking.status === 'COMPLETED';
            const isCurrent = booking.status === step;

            return (
              <div key={step} className="flex-1 flex flex-col items-center relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors z-10 ${
                    isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 shadow-md'
                      : isCompleted
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-[11px] font-bold mt-2 text-center ${isCurrent ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {step.replace('_', ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-Column Grid: Details & Quotations on Left, Real-Time Chat on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Details & Quotations */}
        <div className="lg:col-span-7 space-y-6">
          {/* Action Callout if customer or provider needs to act */}
          {isCustomer && booking.status === 'COMPLETION_PENDING' && (
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-amber-900">Work Marked Done by Specialist</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Inspect the repair or service. Once satisfied, click confirm to close the booking and leave a review.
                </p>
              </div>
              <button
                onClick={handleConfirmCompletion}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0"
              >
                Confirm Job Complete
              </button>
            </div>
          )}

          {isProvider && booking.status === 'CONFIRMED' && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-indigo-900">Customer accepted quotation. Ready to begin work?</span>
              <button
                onClick={handleStartWork}
                disabled={actionLoading}
                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Mark Work In Progress
              </button>
            </div>
          )}

          {isProvider && booking.status === 'IN_PROGRESS' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-emerald-900">Service completed on-site?</span>
              <button
                onClick={handleRequestCompletion}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Request Customer Completion
              </button>
            </div>
          )}

          {/* Service Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Service Appointment Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Scheduled Date</span>
                  <span className="font-bold text-slate-900">{booking.requestedDate}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Time Slot</span>
                  <span className="font-bold text-slate-900 capitalize">{booking.requestedTimeSlot}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Private Service Location</span>
                  <span className="font-bold text-slate-900">
                    {booking.serviceAddress.streetAddress}, {booking.serviceAddress.city}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Contact Phone</span>
                  <span className="font-bold text-slate-900">{booking.serviceAddress.contactPhone}</span>
                </div>
              </div>
            </div>

            {/* Cancel option if eligible */}
            {['REQUESTED', 'AWAITING_QUOTE', 'QUOTED'].includes(booking.status) && (
              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleCancelBooking}
                  disabled={actionLoading}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold cursor-pointer"
                >
                  Cancel Booking Request
                </button>
              </div>
            )}
          </div>

          {/* Quotations Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Itemized Quotations ({quotes.length})</span>
            </h3>

            {quotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-600">No quotation issued yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  The provider will inspect the request and issue an itemized ETB quote here.
                </p>
              </div>
            ) : (
              quotes.map((quote) => (
                <QuotationView
                  key={quote._id}
                  quote={quote}
                  isCustomer={isCustomer}
                  onQuoteUpdated={() => fetchBooking()}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Col: Real-time In-Booking Messaging */}
        <div className="lg:col-span-5">
          <div className="sticky top-28">
            <BookingChat
              bookingId={booking._id}
              otherPartyName={otherPartyName}
            />
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {isReviewOpen && (
        <ReviewModal
          bookingId={booking._id}
          providerName={otherPartyName}
          isOpen={isReviewOpen}
          onClose={() => setIsReviewOpen(false)}
          onSuccess={() => {
            setIsReviewOpen(false);
            fetchBooking();
          }}
        />
      )}
    </div>
  );
};
