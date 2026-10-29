import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShieldCheck,
  Filter,
  Navigation,
  Radio,
  X,
  List,
  Map as MapIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { categoryApi, providerApi } from '../services/api';
import { ServiceCategory, ProviderProfile } from '../types';
import { ProviderCard } from '../components/ProviderCard';
import { MapDiscovery, UserLocation, calculateDistanceKm, normalizeCoordinates } from '../components/MapDiscovery';

export const DiscoveryPage: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state from query parameters
  const [search, setSearch] = useState<string>(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || '');
  const [selectedCity, setSelectedCity] = useState<string>(searchParams.get('city') || '');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(searchParams.get('verified') === 'true');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLiveTracking, setIsLiveTracking] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Stop watching on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getAll();
        if (res.data.success) {
          const list = (res.data as any).categories || res.data.data || [];
          setCategories(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (search.trim()) {
        params.q = search.trim();
        params.search = search.trim();
      }
      if (selectedCategory) params.category = selectedCategory;
      if (selectedCity && selectedCity !== 'All') params.city = selectedCity;
      params.verifiedOnly = true;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.maxDistance = 60000; // 60km
        params.radiusKm = 60;
      }

      const res = await providerApi.search(params);
      if (res.data.success) {
        const list = (res.data as any).providers || res.data.data || [];
        setProviders(Array.isArray(list) ? list : []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to search providers.');
    } finally {
      setLoading(false);
    }
  };

  // Keep URL parameters and filter state synchronized
  useEffect(() => {
    const urlSearch = searchParams.get('search') || searchParams.get('q') || '';
    const urlCat = searchParams.get('category') || '';
    const urlCity = searchParams.get('city') || '';
    if (urlSearch !== search) setSearch(urlSearch);
    if (urlCat !== selectedCategory) setSelectedCategory(urlCat);
    if (urlCity !== selectedCity) setSelectedCity(urlCity);
  }, [searchParams]);

  useEffect(() => {
    fetchProviders();
  }, [selectedCategory, selectedCity, verifiedOnly, userLocation]);

  // Compute live real-time distances from customer coordinates to all providers
  const computedProviders = useMemo(() => {
    if (!userLocation) return providers;
    return providers
      .map((p) => {
        const coords = normalizeCoordinates(p.location?.coordinates);
        let dist = p.distanceKm;
        if (coords) {
          dist = calculateDistanceKm(userLocation.lat, userLocation.lng, coords[0], coords[1]);
        }
        return {
          ...p,
          distanceKm: dist,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));
  }, [providers, userLocation]);

  // Keep active route line provider synchronized
  useEffect(() => {
    if (computedProviders.length > 0) {
      const exists = computedProviders.some((p) => p._id === selectedProviderId);
      if (!exists) {
        setSelectedProviderId(computedProviders[0]._id);
      }
    }
  }, [computedProviders, selectedProviderId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newParams = new URLSearchParams(searchParams);
    if (search.trim()) newParams.set('search', search.trim());
    else newParams.delete('search');
    if (selectedCategory) newParams.set('category', selectedCategory);
    else newParams.delete('category');
    if (selectedCity && selectedCity !== 'All') newParams.set('city', selectedCity);
    else newParams.delete('city');
    setSearchParams(newParams);
    fetchProviders();
  };

  // 1. One-shot accurate GPS fix
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setError(language === 'am' ? 'የአሰሳ አካባቢ መለያ በአሳሽዎ አይደገፍም።' : 'Geolocation is not supported by your browser.');
      return;
    }
    setLocationLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isLiveTracking: false,
        });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        let msg = language === 'am' ? 'የአሁኑን አካባቢ ማግኘት አልተቻለም።' : 'Unable to retrieve your location.';
        if (err.code === 1) {
          msg = language === 'am'
            ? 'የአካባቢ ፈቃድ ተከልክሏል። እባክዎ በአሳሽዎ ፈቃድ ይስጡ ወይም ከተማ ይምረጡ።'
            : 'Location access was denied. Please allow location permissions in your browser or select a city manually.';
        }
        setError(msg);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  // 2. Continuous real-time live GPS tracking
  const handleToggleLiveTracking = () => {
    if (!navigator.geolocation) {
      setError(language === 'am' ? 'የአሰሳ አካባቢ መለያ በአሳሽዎ አይደገፍም።' : 'Geolocation is not supported by your browser.');
      return;
    }

    if (isLiveTracking && watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLiveTracking(false);
      return;
    }

    setLocationLoading(true);
    setError(null);
    setIsLiveTracking(true);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isLiveTracking: true,
        });
        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        setIsLiveTracking(false);
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        let msg = 'Unable to track your location.';
        if (err.code === 1) {
          msg = 'Location access was denied. Please allow location permissions in your browser.';
        }
        setError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;
  };

  // 3. User clicked anywhere on the map to place/adjust pin
  const handleLocationSelect = (lat: number, lng: number, accuracy: number = 10) => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsLiveTracking(false);
    }
    setUserLocation({
      lat,
      lng,
      accuracy,
      isLiveTracking: false,
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by trade (electrician, plumber, mechanic...) or pro name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <MapPin className="w-4 h-4 text-blue-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white font-medium text-slate-700"
              >
                <option value="">{t('hero.allCities')}</option>
                <option value="Adama">{t('locations.adama')}</option>
                <option value="Bishoftu">{t('locations.bishoftu')}</option>
                <option value="Addis Ababa">{t('locations.addisAbaba')}</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleToggleLiveTracking}
                disabled={locationLoading}
                className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isLiveTracking
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                    : userLocation
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
                title={isLiveTracking ? 'Live GPS tracking is active' : 'Turn on Live GPS Location tracking'}
              >
                {locationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                ) : isLiveTracking ? (
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                ) : (
                  <Navigation className="w-4 h-4 text-blue-600" />
                )}
                <span className="hidden md:inline">
                  {isLiveTracking ? 'Live Tracking' : userLocation ? 'Location Set' : 'Near Me'}
                </span>
              </button>

              {userLocation && (
                <button
                  type="button"
                  onClick={() => {
                    if (watchIdRef.current !== null) {
                      navigator.geolocation.clearWatch(watchIdRef.current);
                      watchIdRef.current = null;
                      setIsLiveTracking(false);
                    }
                    setUserLocation(null);
                  }}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs transition-colors cursor-pointer"
                  title="Clear location filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-lg shadow-xs transition-all cursor-pointer"
            >
              Search
            </button>
          </div>
        </form>

        {/* Category Pills & Verified Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                selectedCategory === ''
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const name = language === 'am' ? cat.nameAm : cat.nameEn;
              const active = selectedCategory === cat.slug;
              return (
                <button
                  key={cat._id}
                  type="button"
                  onClick={() => setSelectedCategory(active ? '' : cat.slug)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm focus:ring-blue-500"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Verified Only
              </span>
            </label>

            {/* View Mode Switcher */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-md text-xs font-semibold ${
                  viewMode === 'split' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="Split View"
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md text-xs font-semibold ${
                  viewMode === 'list' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-md text-xs font-semibold ${
                  viewMode === 'map' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="Map View"
              >
                <MapIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-xs font-medium">Searching verified specialists...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {userLocation ? 'No Verified Providers Near Your Location' : 'No Verified Providers Found'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {userLocation
              ? 'No verified service providers are available near your current location within 50 km yet. Try selecting Adama or Bishoftu, or turn off location to view all providers.'
              : 'No verified service providers are available for this category in your selected area yet. Try another category or location, or check back later.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {userLocation ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setUserLocation(null);
                    setSelectedCity('Adama');
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Browse Adama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserLocation(null);
                    setSelectedCity('Bishoftu');
                  }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Browse Bishoftu
                </button>
                <button
                  type="button"
                  onClick={() => setUserLocation(null)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Turn Off Location
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedCity('');
                  setSearch('');
                  setVerifiedOnly(false);
                  setUserLocation(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Are you a local service provider in this trade?{' '}
            <Link to="/profile" className="text-blue-700 font-bold hover:underline">
              Register as a Specialist →
            </Link>
          </div>
        </div>
      ) : (
        <div className={`grid gap-6 ${
          viewMode === 'split'
            ? 'grid-cols-1 lg:grid-cols-12'
            : viewMode === 'list'
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            : 'grid-cols-1'
        }`}>
          {/* List Area */}
          {(viewMode === 'split' || viewMode === 'list') && (
            <div className={viewMode === 'split' ? 'lg:col-span-7 space-y-4' : 'contents'}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
                <span>
                  Showing {computedProviders.length} local service specialist{computedProviders.length > 1 ? 's' : ''}
                </span>
                {userLocation && (
                  <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    📍 Sorted by nearest to your live location
                  </span>
                )}
              </div>
              <div className={viewMode === 'split' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'contents'}>
                {computedProviders.map((prov) => (
                  <ProviderCard
                    key={prov._id}
                    provider={prov}
                    distanceKm={prov.distanceKm}
                    isSelected={selectedProviderId === prov._id}
                    onLocateRoute={() => {
                      setSelectedProviderId(prov._id);
                      if (viewMode === 'list') {
                        setViewMode('split');
                      }
                      const mapEl = document.getElementById('map-discovery-container');
                      if (mapEl) {
                        mapEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Map Area */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <div className={viewMode === 'split' ? 'lg:col-span-5' : 'w-full'}>
              <div className="sticky top-28">
                <MapDiscovery
                  providers={computedProviders}
                  userLocation={userLocation}
                  onLocationSelect={handleLocationSelect}
                  selectedCity={selectedCity || 'Adama'}
                  selectedProviderId={selectedProviderId || undefined}
                  onProviderSelect={(prov) => setSelectedProviderId(prov._id)}
                  isLiveTracking={isLiveTracking}
                  onToggleLiveTracking={handleToggleLiveTracking}
                  onLocateMe={handleLocateMe}
                  gpsLoading={locationLoading}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
