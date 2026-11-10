import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { categoryApi, providerApi } from '../services/api';
import { ServiceCategory, ProviderProfile } from '../types';
import { ProviderCard } from '../components/ProviderCard';

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
  }, [selectedCategory, selectedCity, verifiedOnly]);

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
            No Verified Providers Found
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No verified service providers are available for this category in your selected area yet. Try another category or city, or check back later.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('');
                setSelectedCity('');
                setSearch('');
                setVerifiedOnly(false);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500">
            Are you a local service provider in this trade?{' '}
            <Link to="/profile" className="text-blue-700 font-bold hover:underline">
              Register as a Specialist →
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>
              Showing {providers.length} local service specialist{providers.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {providers.map((prov) => (
              <ProviderCard
                key={prov._id}
                provider={prov}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscoveryPage;
