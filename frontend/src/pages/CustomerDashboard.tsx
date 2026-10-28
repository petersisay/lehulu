import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Star,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { bookingApi } from '../services/api';
import { Booking, BookingStatus } from '../types';
import { ReviewModal } from '../components/ReviewModal';

export const CustomerDashboard: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [error, setError] = useState<string | null>(null);

  // Review modal state
  const [reviewBooking, setReviewBooking] = useState<{ id: string; providerName: string } | null>(null);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await bookingApi.getMyBookings('CUSTOMER');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login?redirect=/customer/dashboard');
      return;
    }
    if (isAuthenticated) {
      fetchBookings();
    }
  }, [isAuthenticated, authLoading]);

  const handleConfirmCompletion = async (bookingId: string, providerName: string) => {
    if (!window.confirm('Confirm that this service has been satisfactorily completed?')) return;
    try {
      const res = await bookingApi.confirmCompletion(bookingId);
      if (res.data.success) {
        await fetchBookings();
        setReviewBooking({ id: bookingId, providerName });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to confirm completion.');
    }
  };

  const activeBookings = bookings.filter(
    (b) => !['COMPLETED', 'CANCELLED'].includes(b.status)
  );
  const completedBookings = bookings.filter(
    (b) => ['COMPLETED', 'CANCELLED'].includes(b.status)
  );

  const statusBadge = (status: BookingStatus) => {
    const config: Record<BookingStatus, { bg: string; text: string; label: string }> = {
      REQUESTED: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: 'Request Sent' },
      AWAITING_QUOTE: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Awaiting Quote' },
      QUOTED: { bg: 'bg-emerald-50 border-emerald-300', text: 'text-emerald-800 font-extrabold', label: 'Quote Ready (Action)' },
      CONFIRMED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Confirmed' },
      IN_PROGRESS: { bg: 'bg-indigo-50 border-indigo-200', text: 'text-indigo-700', label: 'Work In Progress' },
      COMPLETION_PENDING: { bg: 'bg-amber-50 border-amber-300', text: 'text-amber-800 font-extrabold', label: 'Confirm Completion' },
      COMPLETED: { bg: 'bg-emerald-100/70 border-emerald-300', text: 'text-emerald-800', label: 'Completed' },
      CANCELLED: { bg: 'bg-slate-100 border-slate-200', text: 'text-slate-500', label: 'Cancelled' },
      DISPUTED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Disputed' },
    };
    const c = config[status] || { bg: 'bg-slate-100', text: 'text-slate-700', label: status };
    return (
      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${c.bg} ${c.text}`}>
        {c.label}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
            Customer Dashboard
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1">
            Welcome back, {user?.displayName}
          </h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Serving your home in {user?.city || 'Adama, Ethiopia'}</span>
          </p>
        </div>

        <Link
          to="/discover"
          className="px-5 py-2.5 bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold rounded-lg shadow-md transition-all shrink-0"
        >
          Book Another Service
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeTab === 'active'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active Bookings ({activeBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Past & Completed ({completedBookings.length})
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-semibold">Loading your bookings...</p>
        </div>
      ) : (activeTab === 'active' ? activeBookings : completedBookings).length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-lg flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'active' ? 'No active bookings' : 'No past bookings found'}
          </h3>
          <p className="text-xs text-slate-500">
            {activeTab === 'active'
              ? 'Browse verified electricians, plumbers, and mechanics near you and schedule your first service.'
              : 'Completed service records and ratings will appear here.'}
          </p>
          {activeTab === 'active' && (
            <Link
              to="/discover"
              className="inline-block px-5 py-2.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800"
            >
              Explore Services
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'active' ? activeBookings : completedBookings).map((booking) => {
            const provider = typeof booking.providerId === 'object' ? booking.providerId : null;
            const category = typeof booking.categoryId === 'object' ? booking.categoryId : null;
            const provName = provider?.businessName || 'Service Specialist';

            return (
              <div
                key={booking._id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-500">
                      #{booking.bookingNumber}
                    </span>
                    {statusBadge(booking.status)}
                    {category && (
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {category.nameEn}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {booking.problemDescription}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {provName}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {booking.requestedDate} ({booking.requestedTimeSlot})
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {booking.serviceAddress.streetAddress}, {booking.serviceAddress.city}
                    </span>
                  </div>

                  {booking.agreedPrice && (
                    <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg w-fit">
                      Agreed Price: {booking.agreedPrice.amount.toLocaleString()} ETB
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 flex-wrap">
                  {['COMPLETION_PENDING', 'IN_PROGRESS'].includes(booking.status) && (
                    <button
                      onClick={() => handleConfirmCompletion(booking._id, provName)}
                      className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm Complete</span>
                    </button>
                  )}

                  {booking.status === 'COMPLETED' && (
                    <button
                      onClick={() => setReviewBooking({ id: booking._id, providerName: provName })}
                      className="px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>Leave Review</span>
                    </button>
                  )}

                  <Link
                    to={`/bookings/${booking._id}`}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all"
                  >
                    <span>View Details & Chat</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal if active */}
      {reviewBooking && (
        <ReviewModal
          bookingId={reviewBooking.id}
          providerName={reviewBooking.providerName}
          isOpen={!!reviewBooking}
          onClose={() => setReviewBooking(null)}
          onSuccess={() => {
            fetchBookings();
            setReviewBooking(null);
          }}
        />
      )}
    </div>
  );
};
