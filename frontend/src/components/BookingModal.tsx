import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  ShieldCheck,
  Navigation,
  LocateFixed,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
  Check,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ProviderProfile } from '../types';
import { bookingApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const CITY_COORDINATES: Record<string, [number, number]> = {
  Adama: [8.54, 39.27],
  Bishoftu: [8.75, 38.98],
  'Addis Ababa': [9.02, 38.74],
};

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

  // Interactive Leaflet Location Picker State
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null); // [lng, lat]
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize and calibrate Leaflet map inside modal when expanded
  useEffect(() => {
    if (!isOpen || !isMapExpanded || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialCenter: [number, number] = selectedCoordinates
        ? [selectedCoordinates[1], selectedCoordinates[0]]
        : CITY_COORDINATES[city] || [8.54, 39.27];

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: selectedCoordinates ? 15 : 13,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Handle map click to drop or move service location pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        const lat = Number(e.latlng.lat.toFixed(6));
        const lng = Number(e.latlng.lng.toFixed(6));
        setGpsError(null);
        setSelectedCoordinates([lng, lat]);
      });
    }

    // Modal sizing timers to eliminate grey tiles on reveal
    const timers = [
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 80),
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 250),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isOpen, isMapExpanded, city]);

  // Clean up Leaflet map when modal is closed
  useEffect(() => {
    if (!isOpen && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
      setIsMapExpanded(false);
      setGpsError(null);
    }
  }, [isOpen]);

  // Synchronize draggable pin marker when coordinates are selected or updated
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    if (selectedCoordinates) {
      const [lng, lat] = selectedCoordinates;
      const pinIcon = L.divIcon({
        className: 'custom-booking-service-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: grab;">
            <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: #2563eb; opacity: 0.3; animation: pulse 2s infinite;"></div>
            <div style="background-color: #1d4ed8; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2.5px solid white;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon, draggable: true })
        .bindTooltip('Service Location (Drag to adjust)', { direction: 'top', offset: [0, -18] })
        .addTo(mapInstanceRef.current);

      marker.on('dragend', (e) => {
        const pos = e.target.getLatLng();
        setSelectedCoordinates([Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))]);
      });

      markerRef.current = marker;
    }
  }, [selectedCoordinates]);

  // Optional GPS Location Helper
  const handleLocateGPS = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setSelectedCoordinates([lng, lat]);
        setGpsLoading(false);
        if (!isMapExpanded) setIsMapExpanded(true);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1 });
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) {
          setGpsError('Location permission was denied. You can still click anywhere on the map to pin your location.');
        } else {
          setGpsError('Could not determine your GPS location. Please click on the map to place your pin manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const handleClearCoordinates = () => {
    setSelectedCoordinates(null);
    setGpsError(null);
  };

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
          ...(selectedCoordinates ? { coordinates: selectedCoordinates } : {}),
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
          <div className="p-3 bg-blue-50/70 border border-blue-200/60 rounded-lg flex items-center gap-2.5 text-blue-900 text-xs">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
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
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
              required
            />
          </div>

          {/* Date & Time Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                {t('booking.preferredDate')} *
              </label>
              <input
                type="date"
                min={minDate}
                value={requestedDate}
                onChange={(e) => setRequestedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {t('booking.timeSlot')} *
              </label>
              <select
                value={requestedTimeSlot}
                onChange={(e) => setRequestedTimeSlot(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
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
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-600" />
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="e.g. +251 91 123 4567"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                />
              </div>
            </div>

            {/* Optional Interactive Map Location Picker */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    Exact Map Location (Optional)
                  </span>
                  {selectedCoordinates && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <Check className="w-3 h-3" />
                      <span>Pinned</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleLocateGPS}
                    disabled={gpsLoading}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    title="Use my current GPS position"
                  >
                    <LocateFixed className={`w-3 h-3 ${gpsLoading ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                    <span>{gpsLoading ? 'Locating...' : 'Use GPS'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMapExpanded((prev) => !prev)}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>{isMapExpanded ? 'Hide Map' : selectedCoordinates ? 'View Map Pin' : 'Select on Map'}</span>
                    {isMapExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {selectedCoordinates ? (
                <div className="flex items-center justify-between text-[11px] bg-white px-2.5 py-1.5 rounded-lg border border-blue-100 text-slate-600">
                  <span>
                    📍 Pinned Coordinates: <strong className="text-blue-700">{selectedCoordinates[1].toFixed(5)}°N, {selectedCoordinates[0].toFixed(5)}°E</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleClearCoordinates}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                    title="Remove pinned coordinates"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Optional: Expand the map or tap &quot;Use GPS&quot; to pin your exact house or work site coordinates for the specialist.
                </p>
              )}

              {gpsError && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3 shrink-0" />
                  <span>{gpsError}</span>
                </div>
              )}

              {isMapExpanded && (
                <div className="space-y-1.5 pt-1">
                  <div
                    ref={mapContainerRef}
                    className="w-full h-52 rounded-lg overflow-hidden border border-slate-300/80 shadow-inner z-0 cursor-crosshair bg-slate-100"
                  />
                  <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                    <span>💡 Click map to drop pin, or drag marker to reposition</span>
                    <span>Centered on {city}</span>
                  </div>
                </div>
              )}
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
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              {loading ? 'Submitting Request...' : t('booking.submitRequest')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
