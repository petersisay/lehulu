import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Loader2,
  Award,
  ChevronLeft,
  MessageCircle,
  Navigation,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { providerApi } from '../services/api';
import { ProviderProfile, Review } from '../types';
import { BookingModal } from '../components/BookingModal';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Helper to validate and convert GeoJSON coordinates [longitude, latitude] to Leaflet [latitude, longitude]
// Standard global geographic boundaries: Longitude: -180 to 180, Latitude: -90 to 90
const parseGeoJsonCoordinates = (
  coords?: [number, number] | number[] | null
): [number, number] | null => {
  if (!coords || !Array.isArray(coords) || coords.length !== 2) return null;
  const [lng, lat] = coords;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return null;
  return [lat, lng];
};

// Validate that service radius is a finite number within the supported 1-100 km boundary
const parseServiceRadiusKm = (radius?: number | null): number | null => {
  if (typeof radius !== 'number' || !Number.isFinite(radius)) return null;
  if (radius < 1 || radius > 100) return null;
  return radius;
};

// Helper to format latitude and longitude with correct hemisphere directions (N/S, E/W)
const formatCoordinateLabel = (lat: number, lng: number): string => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(5)}°${latDir}, ${Math.abs(lng).toFixed(5)}°${lngDir}`;
};

export const ProviderProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { language, t } = useLanguage();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState<boolean>(false);

  // Map and Location References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);

  // Parse and validate provider base coordinates
  const providerLeafletCoords = useMemo<[number, number] | null>(() => {
    return parseGeoJsonCoordinates(provider?.location?.coordinates);
  }, [provider?.location?.coordinates]);

  // Parse and validate service radius (1 - 100 km)
  const validRadiusKm = useMemo<number | null>(() => {
    return parseServiceRadiusKm(provider?.serviceRadiusKm);
  }, [provider?.serviceRadiusKm]);

  // Initialize and synchronize Leaflet service area map on mount or coordinate update
  useEffect(() => {
    if (!providerLeafletCoords || !mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      center: providerLeafletCoords,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Custom Workshop / Operating Base Marker
    const workshopPinIcon = L.divIcon({
      className: 'custom-provider-profile-base-pin',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
          <div style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background-color: #2563eb; opacity: 0.25; animation: pulse 2s infinite;"></div>
          <div style="background-color: #1d4ed8; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(29,78,216,0.4); border: 2.5px solid white;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const bName = provider?.businessName || 'Specialist Base';
    const cityText = provider?.publicAddress || provider?.serviceCities?.[0] || 'Service Area';

    L.marker(providerLeafletCoords, { icon: workshopPinIcon })
      .bindPopup(`
        <div style="font-family: inherit; font-size: 12px; line-height: 1.4; padding: 4px; min-width: 180px;">
          <div style="font-weight: 800; color: #1e3a8a; margin-bottom: 2px;">🔧 ${bName}</div>
          <div style="color: #475569; font-weight: 600;">${cityText}</div>
          <div style="color: #64748b; font-size: 11px; margin-top: 3px;">${formatCoordinateLabel(providerLeafletCoords[0], providerLeafletCoords[1])}</div>
        </div>
      `)
      .bindTooltip(`🔧 ${bName} (Operating Base)`, { direction: 'top', offset: [0, -19] })
      .addTo(map);

    // Render service radius circle only when radius is present, finite, and in supported range 1-100 km
    if (validRadiusKm) {
      const radiusMeters = validRadiusKm * 1000;
      const circle = L.circle(providerLeafletCoords, {
        radius: radiusMeters,
        color: '#2563eb',
        weight: 1.5,
        dashArray: '5, 5',
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
      }).addTo(map);

      circle.bindTooltip(`Service Radius: ~${validRadiusKm} km from base`, {
        permanent: false,
        direction: 'top',
      });

      circleRef.current = circle;
      map.fitBounds(circle.getBounds(), { padding: [25, 25], maxZoom: 15 });
    } else {
      map.setView(providerLeafletCoords, 14);
      circleRef.current = null;
    }

    mapInstanceRef.current = map;

    // Viewport resize and layout invalidation handling
    const t1 = setTimeout(() => {
      map.invalidateSize();
    }, 120);
    const t2 = setTimeout(() => {
      map.invalidateSize();
    }, 320);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', handleResize);
      map.remove();
      mapInstanceRef.current = null;
      circleRef.current = null;
    };
  }, [providerLeafletCoords, validRadiusKm, provider?.businessName, provider?.publicAddress, provider?.serviceCities]);

  const handleFitServiceArea = () => {
    if (!mapInstanceRef.current) return;
    if (circleRef.current) {
      mapInstanceRef.current.fitBounds(circleRef.current.getBounds(), { padding: [25, 25], maxZoom: 15 });
    } else if (providerLeafletCoords) {
      mapInstanceRef.current.setView(providerLeafletCoords, 14, { animate: true });
    }
  };

  useEffect(() => {
    if (!id) return;
    const fetchProvider = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await providerApi.getById(id);
        const resData = res.data as any;
        if (resData) {
          const payload = resData.data || resData;
          const p = resData.provider || payload?.provider || (payload?._id || payload?.businessName ? payload : null);
          if (p) {
            setProvider(p);
            const r = resData.reviews || payload?.reviews || [];
            setReviews(Array.isArray(r) ? r : []);
          } else {
            setError(resData.message || 'Provider profile not found or inactive.');
          }
        } else {
          setError('Failed to load provider profile.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load provider profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-xs font-semibold">Loading specialist profile...</p>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Provider Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This service profile is unavailable or inactive.'}</p>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Service Directory</span>
        </Link>
      </div>
    );
  }

  const user = typeof provider.userId === 'object' ? provider.userId : null;
  const displayName = provider.businessName || user?.displayName || 'Service Specialist';
  const bio = (language === 'am' && provider.bioAm) ? provider.bioAm : provider.bioEn;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/discover"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Specialists</span>
        </Link>
      </div>

      {/* Profile Header Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-24 h-24 rounded-lg object-cover border-2 border-slate-200 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-blue-700 to-indigo-900 text-white flex items-center justify-center font-extrabold text-3xl shadow-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {provider.isVerified && (
              <div
                className="absolute -bottom-2 -right-2 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg"
                title="Verified Professional"
              >
                <ShieldCheck className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950">
                {displayName}
              </h1>
              {provider.isVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Specialist
                </span>
              ) : (
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Verification Pending
                </span>
              )}

              {/* Blue Sign: Job Completed & Ready for Another Service */}
              {provider.completedBookingsCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-100/90 px-3 py-1 rounded-full border border-blue-300 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Job Completed • Ready for Another Service</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                {provider.serviceCities?.join(', ') || provider.publicAddress || 'Adama, Ethiopia'}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                {provider.experienceYears} Years Experience
              </span>
            </div>

            {/* Honest Review & Completed Jobs Stats */}
            <div className="flex items-center gap-4 pt-1 text-xs">
              <div className="flex items-center gap-1 font-bold text-slate-900">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span>
                  {provider.reviewCount > 0
                    ? provider.rating.toFixed(1)
                    : 'No reviews yet'}
                </span>
                {provider.reviewCount > 0 && (
                  <span className="text-slate-400 font-normal">
                    ({provider.reviewCount} genuine customer reviews)
                  </span>
                )}
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>{provider.completedBookingsCount} Verified Completed Jobs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing & CTA Column */}
        <div className="w-full md:w-auto bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Indicative Starting Rate
              </span>
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                Ready for Service
              </span>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {provider.pricing?.startingPrice ? (
                <>
                  {provider.pricing.startingPrice.toLocaleString()} <span className="text-sm font-bold text-blue-700">ETB</span>
                </>
              ) : (
                'Custom Quote'
              )}
            </div>
            {provider.pricing?.hourlyRate && (
              <span className="text-[11px] text-slate-500 block">
                Hourly rate: {provider.pricing.hourlyRate} ETB/hr
              </span>
            )}
            {provider.pricing?.inspectionFee && (
              <span className="text-[11px] text-slate-500 block">
                Inspection fee: {provider.pricing.inspectionFee} ETB
              </span>
            )}
          </div>

          <button
            onClick={() => setIsBookingOpen(true)}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Request Service Booking</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Details & Schedule & Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Bio, Skills, Portfolio, Reviews */}
        <div className="lg:col-span-2 space-y-8">
          {/* Biography */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">About the Specialist</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {bio || 'Experienced trade professional committed to high-standard local service delivery.'}
            </p>
          </div>

          {/* Skills & Specialties */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-slate-900">Skills & Trade Specialties</h2>
            <div className="flex flex-wrap gap-2">
              {provider.skills?.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* Portfolio Gallery */}
          {provider.portfolioImages && provider.portfolioImages.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900">Work Portfolio Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {provider.portfolioImages.map((img, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden aspect-video bg-slate-100 border border-slate-200">
                    <img src={img} alt="Work example" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Genuine Reviews Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Verified Customer Reviews</h2>
                <p className="text-xs text-slate-500">
                  Reviews are authenticated and linked directly to completed jobs on Lehulu.
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-slate-900">
                  {provider.reviewCount > 0 ? provider.rating.toFixed(1) : '—'}
                </span>
                <span className="text-xs text-slate-400 block">/ 5.0</span>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <MessageCircle className="w-8 h-8 mb-2 mx-auto text-slate-300" />
                <p className="font-semibold text-slate-600">No reviews recorded yet</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When a customer completes a booked service with this provider, their verified rating will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4 divide-y divide-slate-100">
                {reviews.map((rev) => {
                  const reviewer = typeof rev.customerId === 'object' ? rev.customerId : null;
                  return (
                    <div key={rev._id} className="pt-4 first:pt-0 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs">
                            {(reviewer?.displayName || 'C').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-800">
                            {reviewer?.displayName || 'Verified Customer'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                rev.rating >= s
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {rev.comment}
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>

                      {rev.providerResponse && (
                        <div className="mt-2 ml-4 p-3 bg-slate-50 border-l-2 border-blue-600 rounded-r-xl text-xs space-y-1">
                          <span className="font-bold text-slate-700 block text-[11px]">
                            Response from Specialist:
                          </span>
                          <p className="text-slate-600 text-[11px]">
                            {rev.providerResponse.text}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Working Hours & Trust Info */}
        <div className="space-y-6">
          {/* Service Area & Coverage Map Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Navigation className="w-4 h-4 text-blue-600" />
                <span>Service Coverage Area</span>
              </h3>
              {providerLeafletCoords && (
                <button
                  type="button"
                  onClick={handleFitServiceArea}
                  className="text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  Fit Service Area
                </button>
              )}
            </div>

            {/* Configured Service Cities Badges */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 block">
                Configured Service Cities:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {provider.serviceCities && provider.serviceCities.length > 0 ? (
                  provider.serviceCities.map((city, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200"
                    >
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {city}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400">No specific cities listed</span>
                )}
              </div>
            </div>

            {/* Leaflet Map / Fallback Card */}
            {providerLeafletCoords ? (
              <div className="space-y-2">
                <div
                  ref={mapContainerRef}
                  className="w-full h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner z-0 bg-slate-100"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-500 flex-wrap gap-2 px-1">
                  <span>
                    📍 Operating Base: <strong className="text-slate-800">{formatCoordinateLabel(providerLeafletCoords[0], providerLeafletCoords[1])}</strong>
                  </span>
                  {validRadiusKm ? (
                    <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      ~{validRadiusKm} km operational radius
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Exact radius not configured
                    </span>
                  )}
                </div>
                {validRadiusKm && provider.serviceCities && provider.serviceCities.length > 1 && (
                  <p className="text-[10px] text-slate-400 italic px-1">
                    Note: Circle indicates operational travel radius around the primary base; travel to other listed cities may depend on scheduled appointments.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-3">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-700">
                    No precise map coordinates published for this specialist.
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Service is offered throughout {provider.serviceCities?.join(', ') || 'their local area'}.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Working Hours */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Working Hours</span>
            </h3>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {DAY_NAMES.map((day, idx) => {
                const hourRecord = provider.workingHours?.find((h) => h.dayOfWeek === idx);
                const isClosed = hourRecord ? hourRecord.isClosed : idx === 0; // Sunday default
                return (
                  <div key={day} className="flex items-center justify-between pt-2 first:pt-0">
                    <span className="font-medium text-slate-600">{day}</span>
                    <span className={isClosed ? 'text-slate-400 font-semibold' : 'text-slate-900 font-mono font-semibold'}>
                      {isClosed ? 'Closed' : `${hourRecord?.open || '08:00'} – ${hourRecord?.close || '18:00'}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trust Guarantees Box */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-md space-y-4 border border-blue-800/40">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <span>Lehulu Trust Standard</span>
            </h3>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Verified Ethiopian National Identity & Trade Registry.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Private address & phone protection until job confirmation.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Detailed itemized quotations in ETB prior to work start.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Dual completion confirmation before marking jobs done.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {isBookingOpen && (
        <BookingModal
          provider={provider}
          isOpen={isBookingOpen}
          onClose={() => setIsBookingOpen(false)}
        />
      )}
    </div>
  );
};
