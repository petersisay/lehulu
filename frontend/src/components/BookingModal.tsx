import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Calendar, Clock, MapPin, Phone, AlertCircle, ShieldCheck } from 'lucide-react';
import { ProviderProfile } from '../types';
import { bookingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface BookingModalProps {
  provider: ProviderProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  provider,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [categoryId, setCategoryId] = useState<string>(
    provider.categoryIds && provider.categoryIds.length > 0
      ? (typeof provider.categoryIds[0] === 'object' ? provider.categoryIds[0]._id : provider.categoryIds[0])
      : ''
  );
  const [requestedDate, setRequestedDate] = useState<string>('');
  const [requestedTimeSlot, setRequestedTimeSlot] = useState<string>('morning');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [city, setCity] = useState<string>(user?.city || provider.serviceCities?.[0] || 'Adama');
  const [subcity, setSubcity] = useState<string>('');
  const [kebele, setKebele] = useState<string>('');
  const [streetAddress, setStreetAddress] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>(user?.phoneNumber || '');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }

    if (!problemDescription.trim() || problemDescription.trim().length < 2) {
      setError(t('booking.problemRequired') || 'Please describe the problem or requested work.');
      return;
    }

    if (!requestedDate) {
      setError(t('booking.dateRequired') || 'Please select a preferred service date.');
      return;
    }

    if (!streetAddress.trim()) {
      setError('Please provide a street address or landmark.');
      return;
    }

    const cleanPhone = contactPhone.trim();
    if (!cleanPhone || cleanPhone.replace(/\D/g, '').length < 8) {
      setError('Please provide a valid contact phone number (at least 8 digits).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resolvedCategoryId =
        categoryId ||
        (provider.categoryIds && provider.categoryIds.length > 0
          ? (typeof provider.categoryIds[0] === 'object' ? (provider.categoryIds[0] as any)._id : provider.categoryIds[0])
          : undefined);

      const normalizedCity =
        city && !city.startsWith('locations.')
          ? city
          : (provider.serviceCities && provider.serviceCities.length > 0 ? provider.serviceCities[0] : 'Adama');

      const response = await bookingApi.create({
        providerId: provider._id,
        categoryId: resolvedCategoryId,
        requestedDate,
        requestedTimeSlot,
        problemDescription: problemDescription.trim(),
        referenceImages: referenceImageUrl ? [referenceImageUrl] : [],
        serviceAddress: {
          city: normalizedCity,
          subcity: subcity.trim() || undefined,
          kebele: kebele.trim() || undefined,
          streetAddress: streetAddress.trim(),
          contactPhone: cleanPhone,
        },
      });

      if (response.data.success && response.data.data) {
        if (onSuccess) {
          onSuccess(response.data.data._id);
        } else {
          onClose();
          navigate(`/bookings/${response.data.data._id}`);
        }
      }
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.errors && Array.isArray(resp.errors) && resp.errors.length > 0) {
        setError(resp.errors.map((e: any) => e.message).join('. '));
      } else {
        setError(resp?.message || err.message || 'Failed to submit service request. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {t('booking.requestTitle')}
            </h2>
            <p className="text-xs text-slate-500">
              {t('booking.requestSubtitle')}: {provider.businessName || 'Service Specialist'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-lg flex items-center gap-2.5 text-emerald-800 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              Your exact address and contact phone are kept strictly private and shared only with this verified professional once you confirm.
            </span>
          </div>

          {/* Problem Description */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              {t('booking.describeWork')} *
            </label>
            <textarea
              rows={3}
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              placeholder="e.g. Living room socket sparking, kitchen pipe leaking under sink, car brakes squeaking..."
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              required
            />
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                {t('booking.preferredDate')} *
              </label>
              <input
                type="date"
                min={minDate}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {t('booking.timeSlot')} *
              </label>
              <select
                value={requestedTimeSlot}
                onChange={(e) => setRequestedTimeSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
              >
                <option value="morning">Morning (8:00 AM – 12:00 PM)</option>
                <option value="afternoon">Afternoon (12:00 PM – 4:00 PM)</option>
                <option value="evening">Evening (4:00 PM – 7:00 PM)</option>
                <option value="flexible">Flexible / Any Time</option>
              </select>
            </div>
          </div>

          {/* Service Location */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-t border-slate-100 pt-3">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              {t('booking.serviceLocation')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  {t('locations.title')} *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="Adama">{t('locations.adama')}</option>
                  <option value="Bishoftu">{t('locations.bishoftu')}</option>
                  <option value="Addis Ababa">{t('locations.addisAbaba')}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Subcity / Kifle Ketema
                </label>
                <input
                  type="text"
                  value={subcity}
                  onChange={(e) => setSubcity(e.target.value)}
                  placeholder="e.g. Boku, Bole"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kebele
                </label>
                <input
                  type="text"
                  value={kebele}
                  onChange={(e) => setKebele(e.target.value)}
                  placeholder="e.g. Kebele 04"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Street Address / Landmark *
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="e.g. Near Posta Bet, House #412"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-600" />
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +251 91 123 4567"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>
            </div>
          </div>

          {/* Reference Image Link (optional) */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Reference Photo URL (Optional)
            </label>
            <input
              type="url"
              value={referenceImageUrl}
              onChange={(e) => setReferenceImageUrl(e.target.value)}
              placeholder="https://... photo of damaged item or room"
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              {loading ? 'Submitting Request...' : t('booking.submitRequest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
