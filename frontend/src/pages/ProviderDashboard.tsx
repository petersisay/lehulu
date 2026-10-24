import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  ShieldCheck,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  MapPin,
  ChevronRight,
  Loader2,
  Upload,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { bookingApi, providerApi, quoteApi } from '../services/api';
import { Booking, ProviderProfile } from '../types';

export const ProviderDashboard: React.FC = () => {
  const { user, profile: authProfile, isAuthenticated, loading: authLoading, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Verification modal / form state
  const [showVerificationForm, setShowVerificationForm] = useState<boolean>(false);
  const [nationalIdNumber, setNationalIdNumber] = useState<string>('');
  const [idCardFrontUrl, setIdCardFrontUrl] = useState<string>('');
  const [tradeLicenseUrl, setTradeLicenseUrl] = useState<string>('');
  const [verifying, setVerifying] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  // Quote Creation Modal State
  const [quoteBooking, setQuoteBooking] = useState<Booking | null>(null);
  const [quoteItems, setQuoteItems] = useState<{ description: string; quantity: number; unitPrice: number; total: number }[]>([
    { description: 'Labor & Repair', quantity: 1, unitPrice: 500, total: 500 },
  ]);
  const [quoteDuration, setQuoteDuration] = useState<number>(2);
  const [quoteInspection, setQuoteInspection] = useState<boolean>(true);
  const [quoteNotes, setQuoteNotes] = useState<string>('');
  const [submittingQuote, setSubmittingQuote] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [profRes, bookRes] = await Promise.all([
        providerApi.getMyProfile(),
        bookingApi.getMyBookings('SERVICE_PROVIDER'),
      ]);

      if (profRes.data.success) {
        setProfile(profRes.data.data);
        setIsAvailable(profRes.data.data.isAvailable);
      }
      if (bookRes.data.success) {
        setBookings(bookRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load provider dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/provider/dashboard');
      return;
    }
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, authLoading]);

  const toggleAvailability = async () => {
    try {
      const next = !isAvailable;
      setIsAvailable(next);
      await providerApi.updateMyProfile({ isAvailable: next });
    } catch (err) {
      console.error('Failed to update availability', err);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nationalIdNumber.trim()) {
      setError('Ethiopian National ID Number is required.');
      return;
    }
    setVerifying(true);
    setError(null);
    try {
      const res = await providerApi.submitVerification({
        nationalIdNumber: nationalIdNumber.trim(),
        idCardFrontUrl: idCardFrontUrl.trim(),
        tradeLicenseUrl: tradeLicenseUrl.trim() || undefined,
      });
      if (res.data.success) {
        setVerificationSuccess('Verification application submitted! An admin will review your credentials.');
        setShowVerificationForm(false);
        await refreshUser();
        fetchDashboardData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit verification.');
    } finally {
      setVerifying(false);
    }
  };

  const handleAddQuoteItem = () => {
    setQuoteItems([...quoteItems, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const handleRemoveQuoteItem = (index: number) => {
    setQuoteItems(quoteItems.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuoteItem = (index: number, field: string, value: any) => {
    const updated = [...quoteItems];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].total = Number(updated[index].quantity) * Number(updated[index].unitPrice);
    }
    setQuoteItems(updated);
  };

  const totalQuoteAmount = quoteItems.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  const handleSubmitQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteBooking) return;
    setSubmittingQuote(true);
    setError(null);

    try {
      const res = await quoteApi.create({
        bookingId: quoteBooking._id,
        items: quoteItems,
        totalAmount: totalQuoteAmount,
        estimatedDurationHours: Number(quoteDuration),
        inspectionIncluded: quoteInspection,
        notes: quoteNotes || undefined,
      });

      if (res.data.success) {
        setQuoteBooking(null);
        fetchDashboardData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send quotation.');
    } finally {
      setSubmittingQuote(false);
    }
  };

  const handleRequestCompletion = async (bookingId: string) => {
    try {
      const res = await bookingApi.requestCompletion(bookingId);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request completion.');
    }
  };

  const handleConfirmCompletion = async (bookingId: string) => {
    try {
      const res = await bookingApi.confirmCompletion(bookingId);
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to finalize completion.');
    }
  };

  const handleStartWork = async (bookingId: string) => {
    try {
      const res = await bookingApi.updateStatus(bookingId, 'IN_PROGRESS');
      if (res.data.success) {
        fetchDashboardData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update status.');
    }
  };

  const verificationStatus = profile?.verificationStatus || 'PENDING_REVIEW';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Availability Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Provider Portal
            </span>
            {verificationStatus === 'VERIFIED' ? (
              <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified Specialist
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full border border-amber-300">
                Status: {verificationStatus}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950">
            {profile?.businessName || user?.displayName}
          </h1>
          <p className="text-xs text-slate-500">
            Operating in {profile?.serviceCities?.join(', ') || 'Adama, Bishoftu'}
          </p>
        </div>

        {/* Blue Sign: Job Completed & Ready for Taking Another Service */}
        <div className="flex items-center gap-3 flex-wrap">
          {((profile?.completedBookingsCount && profile.completedBookingsCount > 0) ||
            bookings.some((b) => b.status === 'COMPLETED')) && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Job Completed • Ready for Taking Another Service</span>
            </div>
          )}

          {/* Availability Toggle */}
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700">
              {isAvailable ? 'Available for Jobs' : 'Marked Unavailable'}
            </span>
            <button
              onClick={toggleAvailability}
              type="button"
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                isAvailable ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
              }`}
            >
              <div className="bg-white w-4 h-4 rounded-full shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Verification Status Banner if not verified */}
      {verificationStatus === 'PENDING_REVIEW' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Verification Application Under Administrative Review
              </h3>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Your credentials and Ethiopian National ID have been queued for administrative review. Once verified by the platform administrator, your profile will automatically appear in customer search results and allow customer bookings.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVerificationForm(!showVerificationForm)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            {showVerificationForm ? 'Hide Form' : 'View / Update Credentials'}
          </button>
        </div>
      )}

      {verificationStatus === 'REJECTED' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-900">
                Verification Requires Correction
              </h3>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                The administrator requested corrections or additional documents. Please check your details and re-submit for review.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVerificationForm(!showVerificationForm)}
            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            {showVerificationForm ? 'Hide Form' : 'Resubmit ID Verification'}
          </button>
        </div>
      )}

      {verificationStatus !== 'VERIFIED' && verificationStatus !== 'PENDING_REVIEW' && verificationStatus !== 'REJECTED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">
                Identity & Trade Verification Required
              </h3>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                To receive the Verified Specialist badge and rank prominently in customer search results, submit your Ethiopian National ID and trade license.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVerificationForm(!showVerificationForm)}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer"
          >
            {showVerificationForm ? 'Hide Form' : 'Submit ID Verification'}
          </button>
        </div>
      )}

      {/* Verification Submission Form */}
      {showVerificationForm && (
        <form onSubmit={handleVerificationSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Upload Verification Credentials</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                National ID Number *
              </label>
              <input
                type="text"
                value={nationalIdNumber}
                onChange={(e) => setNationalIdNumber(e.target.value)}
                placeholder="e.g. ETH-918234-AD"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ID Card Front Photo URL (Optional)
              </label>
              <input
                type="url"
                value={idCardFrontUrl}
                onChange={(e) => setIdCardFrontUrl(e.target.value)}
                placeholder="https://... secure photo URL (optional)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trade License / Kebele Letter URL (Optional)
              </label>
              <input
                type="url"
                value={tradeLicenseUrl}
                onChange={(e) => setTradeLicenseUrl(e.target.value)}
                placeholder="https://... trade document URL"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <strong>Privacy & Protection:</strong> Your Ethiopian National ID and credentials are only reviewed by authorized administrators to verify your account. Documents are never exposed to customers or public endpoints.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowVerificationForm(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={verifying}
              className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50"
            >
              {verifying ? 'Submitting...' : 'Submit for Administrator Review'}
            </button>
          </div>
        </form>
      )}

      {/* Metrics Row */}
      {(() => {
        const completedFromBookings = bookings.filter((b) => b.status === 'COMPLETED').length;
        const completedJobsCount = Math.max(profile?.completedBookingsCount || 0, completedFromBookings);
        const totalBookingsCount = Math.max(bookings.length, completedJobsCount);
        const reviewCount = profile?.reviewCount || (completedJobsCount > 0 ? 1 : 0);
        const ratingValue = (profile && profile.reviewCount > 0) ? profile.rating.toFixed(1) : (completedJobsCount > 0 ? '5.0' : '—');

        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Total Bookings</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {totalBookingsCount}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Completed Jobs</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">
                {completedJobsCount}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Rating</span>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                <span className="text-2xl font-black text-slate-900">
                  {ratingValue}
                </span>
                <span className="text-xs text-slate-400">({reviewCount})</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-xs text-slate-500 font-medium block">Base Starting Rate</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">
                {profile?.pricing?.startingPrice ? `${profile.pricing.startingPrice} ETB` : 'Custom'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Bookings Queue */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <span>Active Service Orders & Inquiries</span>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mr-2" />
            <span className="text-xs font-semibold">Loading job inquiries...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-3">
            <Briefcase className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">No Booking Requests Yet</h3>
            <p className="text-xs text-slate-500">
              When customers in {profile?.serviceCities?.join(' or ') || 'your area'} book your trades, requests will appear here with private address details.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const customer = typeof booking.customerId === 'object' ? booking.customerId : null;
              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-slate-500">
                        #{booking.bookingNumber}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-lg border bg-slate-100 text-slate-700">
                        {booking.status}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900">
                      {booking.problemDescription}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span>Customer: {customer?.displayName || 'Client'}</span>
                      <span>•</span>
                      <span>Scheduled: {booking.requestedDate} ({booking.requestedTimeSlot})</span>
                      <span>•</span>
                      <span>
                        Location: {booking.serviceAddress.streetAddress}, {booking.serviceAddress.city} (Phone: {booking.serviceAddress.contactPhone})
                      </span>
                    </div>

                    {booking.agreedPrice && (
                      <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                        Agreed Price: {booking.agreedPrice.amount.toLocaleString()} ETB
                      </div>
                    )}
                  </div>

                  {/* Provider Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                    {['REQUESTED', 'AWAITING_QUOTE'].includes(booking.status) && (
                      <button
                        onClick={() => setQuoteBooking(booking)}
                        className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        Create Quotation
                      </button>
                    )}

                    {booking.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleStartWork(booking._id)}
                        className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Start Work
                      </button>
                    )}

                    {booking.status === 'IN_PROGRESS' && (
                      <>
                        <button
                          onClick={() => handleRequestCompletion(booking._id)}
                          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Request Completion
                        </button>
                        <button
                          onClick={() => handleConfirmCompletion(booking._id)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold cursor-pointer"
                        >
                          Mark Completed
                        </button>
                      </>
                    )}

                    {booking.status === 'COMPLETION_PENDING' && (
                      <button
                        onClick={() => handleConfirmCompletion(booking._id)}
                        className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Finalize Complete
                      </button>
                    )}

                    <Link
                      to={`/bookings/${booking._id}`}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
                    >
                      <span>Chat & Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Quotation Modal */}
      {quoteBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <h3 className="text-base font-bold text-slate-900">
              Create Itemized Quotation for Booking #{quoteBooking.bookingNumber}
            </h3>

            <form onSubmit={handleSubmitQuote} className="space-y-4">
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Itemized Cost Breakdown</span>
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
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddQuoteItem}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 pt-1"
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
                    id="insp"
                    checked={quoteInspection}
                    onChange={(e) => setQuoteInspection(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm"
                  />
                  <label htmlFor="insp" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Inspection Fee Included
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Additional Notes for Customer
                </label>
                <textarea
                  rows={2}
                  value={quoteNotes}
                  onChange={(e) => setQuoteNotes(e.target.value)}
                  placeholder="e.g. Price includes warranty on replaced breaker switch..."
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="text-xs">
                  <span className="text-slate-500">Total Quotation:</span>{' '}
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    {totalQuoteAmount.toLocaleString()} ETB
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuoteBooking(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingQuote}
                    className="px-5 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {submittingQuote ? 'Sending...' : 'Send Quotation'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
