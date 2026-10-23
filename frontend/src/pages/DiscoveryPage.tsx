import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShieldCheck,
  Filter,
  Navigation,
  List,
  Map as MapIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { categoryApi, providerApi } from '../services/api';
import { ServiceCategory, ProviderProfile } from '../types';
import { ProviderCard } from '../components/ProviderCard';
import { MapDiscovery } from '../components/MapDiscovery';

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
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');

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
      if (search.trim()) params.search = search.trim();
      if (selectedCategory) params.category = selectedCategory;
      if (selectedCity) params.city = selectedCity;
      if (verifiedOnly) params.verifiedOnly = true;
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
        params.maxDistance = 50000; // 50km
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

  useEffect(() => {
    fetchProviders();
  }, [selectedCategory, selectedCity, verifiedOnly, userLocation]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProviders();
  };

  const handleGetLocation = () => {
    if (userLocation) {
      setUserLocation(null);
      return;
    }
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
        });
        setLocationLoading(false);
      },
      (err) => {
        let msg = language === 'am' ? 'የአሁኑን አካባቢ ማግኘት አልተቻለም።' : 'Unable to retrieve your location.';
        if (err.code === 1) {
          msg = language === 'am'
            ? 'የአካባቢ ፈቃድ ተከልክሏል። እባክዎ በአሳሽዎ ፈቃድ ይስጡ ወይም ከተማ ይምረጡ።'
            : 'Location access was denied. Please allow location permissions in your browser or select a city manually.';
        } else if (err.code === 2) {
          msg = language === 'am'
            ? 'የጂፒኤስ መረጃ በአሁኑ ጊዜ አይገኝም።'
            : 'GPS location information is currently unavailable.';
        } else if (err.code === 3) {
          msg = language === 'am'
            ? 'የአካባቢ ጥያቄ ጊዜው አልቋል። እባክዎ ደግመው ይሞክሩ።'
            : 'Location request timed out. Please try again.';
        }
        setError(msg);
        setLocationLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Search & Filter Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by trade (electrician, plumber, mechanic...) or pro name..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <MapPin className="w-4 h-4 text-emerald-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="pl-9 pr-8 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white font-medium text-slate-700"
              >
                <option value="">{t('hero.allCities')}</option>
                <option value="Adama">{t('locations.adama')}</option>
                <option value="Bishoftu">{t('locations.bishoftu')}</option>
                <option value="Addis Ababa">{t('locations.addisAbaba')}</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locationLoading}
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                userLocation
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
              title="Filter by current geolocation"
            >
              {locationLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : (
                <Navigation className="w-4 h-4 text-emerald-600" />
              )}
              <span className="hidden md:inline">
                {userLocation ? 'Location Active' : 'Near Me'}
              </span>
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer"
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
                  ? 'bg-emerald-700 text-white shadow-2xs'
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
                      ? 'bg-emerald-700 text-white shadow-2xs'
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
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
              />
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Only
              </span>
            </label>

            {/* View Mode Switcher */}
            <div className="hidden lg:flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  viewMode === 'split' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="Split View"
              >
                Split
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  viewMode === 'list' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
                }`}
                title="List View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded-lg text-xs font-semibold ${
                  viewMode === 'map' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500'
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
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Searching verified specialists...</p>
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {userLocation ? 'No Providers Near Your Current Location' : 'No Providers Found'}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {userLocation
              ? 'No verified specialists were found within 50 km of your current GPS position. Lehulu currently focuses on Adama and Bishoftu. Try switching to Adama or Bishoftu, or turn off location.'
              : `No service providers matched your exact filters in ${selectedCity || 'this region'}. Try clearing category or city filters to browse all verified specialists.`}
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
                  className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
                >
                  Browse Adama
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserLocation(null);
                    setSelectedCity('Bishoftu');
                  }}
                  className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 transition-colors cursor-pointer"
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
                className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold hover:bg-emerald-800 transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            )}
          </div>
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Are you a local service provider in this trade?{' '}
            <Link to="/profile" className="text-emerald-700 font-bold hover:underline">
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
              <div className="text-xs font-semibold text-slate-500 mb-2">
                Showing {providers.length} local service specialist{providers.length > 1 ? 's' : ''}
              </div>
              <div className={viewMode === 'split' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'contents'}>
                {providers.map((prov) => (
                  <ProviderCard key={prov._id} provider={prov} distanceKm={(prov as any).distanceKm} />
                ))}
              </div>
            </div>
          )}

          {/* Map Area */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <div className={viewMode === 'split' ? 'lg:col-span-5' : 'w-full'}>
              <div className="sticky top-28">
                <MapDiscovery
                  providers={providers}
                  selectedCity={selectedCity || 'Adama'}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
