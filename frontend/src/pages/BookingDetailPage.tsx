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
  Plus,
  Trash2,
  X,
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
  const { onBookingUpdated, joinBooking, leaveBooking } = useSocket();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState<boolean>(false);

  // Quote form state
  const [quoteItems, setQuoteItems] = useState<{ description: string; quantity: number; unitPrice: number; total: number }[]>([
    { description: 'Service Labor & Inspection', quantity: 1, unitPrice: 500, total: 500 },
  ]);
  const [quoteDuration, setQuoteDuration] = useState<number>(2);
  const [quoteInspection, setQuoteInspection] = useState<boolean>(true);
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [submittingQuote, setSubmittingQuote] = useState<boolean>(false);

  const fetchBooking = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await bookingApi.getById(id);
      const resData = res.data as any;
      if (resData) {
        const payload = resData.data || resData;
        const b = resData.booking || payload?.booking || (payload?._id ? payload : null);
        if (b) {
          setBooking(b);
          const q = resData.quotes || payload?.quotes || [];
          setQuotes(Array.isArray(q) ? q : []);
        } else {
          setError(resData.message || 'Booking not found');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [id]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/bookings/' + id);
      return;
    }
    if (isAuthenticated) {
      fetchBooking();
    }
  }, [id, isAuthenticated, authLoading]);

  // Real-time status sync via Socket.IO and active polling
  useEffect(() => {
    if (id) {
      joinBooking(id);
    }

    const unsubscribe = onBookingUpdated?.((updated: any) => {
      const updatedId = updated?._id || updated?.bookingId;
      if (id && String(updatedId) === String(id)) {
        if (updated && updated.status) {
          setBooking(updated);
        } else {
          fetchBooking();
        }
      }
    });

    // Auto-polling fallback to guarantee that status transitions (step 4, 5, 6) reflect across open tabs
    const interval = setInterval(() => {
      if (id && isAuthenticated && !document.hidden) {
        bookingApi.getById(id).then((res) => {
          if (res.data?.success && res.data?.data) {
            const b = res.data.data.booking;
            if (b) {
              setBooking((prev) => {
                if (!prev || prev.status !== b.status) return b;
                return prev;
              });
            }
          }
        }).catch(() => {});
      }
    }, 6000);

    return () => {
      clearInterval(interval);
      if (id) leaveBooking(id);
      if (unsubscribe) unsubscribe();
    };
  }, [id, onBookingUpdated, isAuthenticated]);

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
  const customerUserId = (customer as any)?._id || (typeof booking.customerId === 'string' ? booking.customerId : null);
  const providerUserId = (provider as any)?.userId?._id || (provider as any)?.userId;
  const isAdmin = user?.role === 'ADMIN';
  const isCustomer = Boolean(user?._id && customerUserId && user._id.toString() === customerUserId.toString()) || (!isAdmin && user?.role === 'CUSTOMER');
  const isProvider = Boolean(
    user?.role === 'SERVICE_PROVIDER' ||
    (user?._id && providerUserId && user._id.toString() === providerUserId.toString())
  );
  const otherPartyName = isCustomer
    ? (provider?.businessName || 'Specialist')
    : (customer?.displayName || 'Customer');

  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleUpdateQuoteItem = (index: number, field: string, val: any) => {
    const updated = [...quoteItems];
    (updated[index] as any)[field] = val;
    updated[index].total = Number(updated[index].quantity || 0) * Number(updated[index].unitPrice || 0);
    setQuoteItems(updated);
  };

  const handleRemoveQuoteItem = (index: number) => {
    if (quoteItems.length <= 1) return;
    setQuoteItems(quoteItems.filter((_, i) => i !== index));
  };

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = quoteItems.reduce((sum, item) => sum + item.total, 0);
    if (totalAmount <= 0) {
      alert('Quotation total must be greater than 0 ETB');
      return;
    }

    setSubmittingQuote(true);
    try {
      const res = await quoteApi.create({
        bookingId: booking._id,
        items: quoteItems,
        totalAmount,
        estimatedDurationHours: quoteDuration,
        inspectionIncluded: quoteInspection,
        notes: quoteNotes,
      });

      if (res.data.success) {
        setIsQuoteOpen(false);
        fetchBooking();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit quotation.');
    } finally {
      setSubmittingQuote(false);
    }
  };

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
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Header Info Banner */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Booking #{booking.bookingNumber || booking._id?.slice(-8)}
            </span>
            <span className="text-xs font-extrabold px-3 py-1 rounded-md border bg-blue-50 text-blue-800 border-blue-200">
              {booking.status}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950">
            {booking.problemDescription || 'Service Booking'}
          </h1>
          <p className="text-xs text-slate-500">
            Created on {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'Recently'} • Category:{' '}
            {(booking.categoryId as any)?.nameEn || 'General Repair'}
          </p>
        </div>

        {/* Agreed Price Badge */}
        {booking.agreedPrice && booking.agreedPrice.amount != null ? (
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-right">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">
              Agreed Service Total
            </span>
            <span className="text-2xl font-black text-blue-900 font-mono">
              {Number(booking.agreedPrice.amount).toLocaleString()} ETB
            </span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Pricing Status
            </span>
            <span className="text-sm font-bold text-slate-700">
              {['REQUESTED', 'AWAITING_QUOTE'].includes(booking.status) ? 'Awaiting Provider Quote' : 'Pending Confirmation'}
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
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md'
                      : isCompleted
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isCompleted && !isCurrent ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-[11px] font-bold mt-2 text-center ${isCurrent ? 'text-blue-700' : 'text-slate-500'}`}>
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
          {/* Action Callout if provider needs to issue quote */}
          {/* STEP 1: REQUESTED / AWAITING_QUOTE */}
          {isProvider && ['REQUESTED', 'AWAITING_QUOTE'].includes(booking.status) && (
            <div className="p-5 bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-blue-950">Step 1: New Booking Request Received</h3>
                <p className="text-xs text-blue-700 mt-0.5">
                  Review the customer's request and issue an itemized quotation in ETB to proceed.
                </p>
              </div>
              <button
                onClick={() => setIsQuoteOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0 flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Issue Itemized Quotation</span>
              </button>
            </div>
          )}

          {isCustomer && ['REQUESTED', 'AWAITING_QUOTE'].includes(booking.status) && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Step 1: Request Submitted</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Your specialist has received this service request and is preparing an itemized quotation in ETB.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: QUOTED */}
          {isCustomer && booking.status === 'QUOTED' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-amber-900">Step 2: Quotation Ready for Review</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Inspect the itemized breakdown below. Click "Accept & Confirm Booking" to lock in the price and schedule the job.
                </p>
              </div>
            </div>
          )}

          {isProvider && booking.status === 'QUOTED' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
              <Clock className="w-4 h-4 text-slate-500 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Step 2: Quotation Sent to Customer</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Awaiting customer acceptance of the proposed quotation. You will be notified immediately upon acceptance.
                </p>
              </div>
            </div>
          )}

          {/* STEP 3: CONFIRMED */}
          {isProvider && booking.status === 'CONFIRMED' && (
            <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-indigo-900">Step 3: Customer Accepted Quotation — Ready to Start</h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  The price is agreed. Arrive at the service location on schedule and click below when you begin the work.
                </p>
              </div>
              <button
                onClick={handleStartWork}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 shadow-sm"
              >
                Mark Work In Progress
              </button>
            </div>
          )}

          {isCustomer && booking.status === 'CONFIRMED' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-blue-900">Step 3: Booking Confirmed</h4>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Quotation accepted! The specialist will arrive as scheduled and will mark the job in progress once on-site.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: IN_PROGRESS */}
          {isProvider && booking.status === 'IN_PROGRESS' && (
            <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-blue-950">Step 4: Work In Progress</h4>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Service is actively underway. Once finished on-site, request customer completion or mark it complete directly.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleRequestCompletion}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 shadow-sm"
                >
                  Request Customer Completion
                </button>
                <button
                  onClick={handleConfirmCompletion}
                  disabled={actionLoading}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 shadow-sm"
                >
                  Mark Job Completed
                </button>
              </div>
            </div>
          )}

          {isCustomer && booking.status === 'IN_PROGRESS' && (
            <div className="p-4 bg-indigo-50 border-2 border-indigo-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-indigo-900">Step 4: Service In Progress</h4>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  The specialist is performing the service. If the work has been completed on-site, you can finalize the booking now.
                </p>
              </div>
              <button
                onClick={handleConfirmCompletion}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer shrink-0 shadow-sm"
              >
                Confirm Service Completed (Step 6)
              </button>
            </div>
          )}

          {/* STEP 5: COMPLETION_PENDING */}
          {isCustomer && booking.status === 'COMPLETION_PENDING' && (
            <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-amber-900">Step 5: Work Marked Done by Specialist</h3>
                <p className="text-xs text-amber-700 mt-0.5">
                  Inspect the repair or service. Once satisfied, click confirm to close the booking and leave a review.
                </p>
              </div>
              <button
                onClick={handleConfirmCompletion}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer shrink-0"
              >
                Confirm Job Complete
              </button>
            </div>
          )}

          {isProvider && booking.status === 'COMPLETION_PENDING' && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-amber-900">Step 5: Completion Pending Customer Review</h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  You requested job completion. Awaiting customer confirmation, or finalize directly.
                </p>
              </div>
              <button
                onClick={handleConfirmCompletion}
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer shrink-0"
              >
                Finalize Complete
              </button>
            </div>
          )}

          {/* ADMINISTRATIVE CONTROL BAR (For Admin) */}
          {isAdmin && (
            <div className="p-4 bg-purple-50 border-2 border-purple-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-purple-950">Administrative Console (Status: {booking.status})</h4>
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    Platform Administrator can supervise and advance any step of this service order.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {booking.status === 'CONFIRMED' && (
                  <button
                    onClick={handleStartWork}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Admin: Start Work (Step 4)
                  </button>
                )}
                {booking.status === 'IN_PROGRESS' && (
                  <>
                    <button
                      onClick={handleRequestCompletion}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Admin: Request Completion (Step 5)
                    </button>
                    <button
                      onClick={handleConfirmCompletion}
                      disabled={actionLoading}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Admin: Finalize Complete (Step 6)
                    </button>
                  </>
                )}
                {booking.status === 'COMPLETION_PENDING' && (
                  <button
                    onClick={handleConfirmCompletion}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Admin: Confirm Complete (Step 6)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: COMPLETED */}
          {booking.status === 'COMPLETED' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold text-blue-950">Step 6: Service Completed Successfully</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Dual confirmation finalized. Thank you for choosing Lehulu for trusted local services!
                  </p>
                </div>
              </div>
              {isCustomer && (
                <button
                  onClick={() => setIsReviewOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Rate & Review</span>
                </button>
              )}
            </div>
          )}

          {/* Service Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Service Appointment Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Scheduled Date</span>
                  <span className="font-bold text-slate-900">
                    {booking.requestedDate ? new Date(booking.requestedDate).toLocaleDateString() : 'To be confirmed'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Time Slot</span>
                  <span className="font-bold text-slate-900 capitalize">
                    {booking.requestedTimeSlot || 'Flexible'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Private Service Location</span>
                  <span className="font-bold text-slate-900">
                    {booking.serviceAddress?.streetAddress || ''}{booking.serviceAddress?.city ? `, ${booking.serviceAddress.city}` : 'Adama, Ethiopia'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Contact Phone</span>
                  <span className="font-bold text-slate-900">
                    {booking.serviceAddress?.contactPhone || 'Provided upon confirmation'}
                  </span>
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
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Itemized Quotations ({(Array.isArray(quotes) ? quotes : []).length})</span>
            </h3>

            {(!Array.isArray(quotes) || quotes.length === 0) ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs space-y-3">
                <p className="font-semibold text-slate-600">No quotation issued yet</p>
                <p className="text-[11px] text-slate-400">
                  {isProvider
                    ? 'Inspect the service details and issue your formal ETB quote below.'
                    : 'The provider will inspect the request and issue an itemized ETB quote here.'}
                </p>
                {isProvider && ['REQUESTED', 'AWAITING_QUOTE'].includes(booking.status) && (
                  <button
                    onClick={() => setIsQuoteOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Quotation Now</span>
                  </button>
                )}
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

      {/* Create Quotation Modal for Provider */}
      {isQuoteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Issue Itemized Quotation for Booking #{booking.bookingNumber}
              </h3>
              <button
                onClick={() => setIsQuoteOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitQuote} className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Itemized Cost Breakdown (ETB)</span>
                {quoteItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Item / Labor description"
                      value={item.description}
                      onChange={(e) => handleUpdateQuoteItem(idx, 'description', e.target.value)}
                      className="flex-2 px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                      required
                    />
                    <input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleUpdateQuoteItem(idx, 'quantity', Number(e.target.value))}
                      className="w-16 px-2 py-1.5 text-xs rounded-xl border border-slate-300 text-center"
                      required
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Price"
                      value={item.unitPrice}
                      onChange={(e) => handleUpdateQuoteItem(idx, 'unitPrice', Number(e.target.value))}
                      className="w-24 px-2 py-1.5 text-xs rounded-xl border border-slate-300 text-right font-mono"
                      required
                    />
                    <span className="w-20 text-xs font-mono font-bold text-right text-slate-800">
                      {item.total.toLocaleString()} ETB
                    </span>
                    {quoteItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuoteItem(idx)}
                        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddQuoteItem}
                  className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 pt-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Item</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Est. Duration (Hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quoteDuration}
                    onChange={(e) => setQuoteDuration(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                  />
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="inspDetail"
                    checked={quoteInspection}
                    onChange={(e) => setQuoteInspection(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded-sm cursor-pointer"
                  />
                  <label htmlFor="inspDetail" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Inspection Fee Included
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specialist Notes to Customer (Optional)
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. Price includes replacement breaker parts. Will arrive with all diagnostic tools."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Grand Total:</span>
                <span className="text-lg font-black text-blue-900 font-mono">
                  {quoteItems.reduce((sum, item) => sum + item.total, 0).toLocaleString()} ETB
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuoteOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingQuote}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingQuote && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Formal Quotation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
