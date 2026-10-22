import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Wrench,
  Car,
  Home,
  Laptop,
  Briefcase,
  ChevronRight,
  Star,
  Users,
  Award,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { categoryApi, providerApi } from '../services/api';
import { ServiceCategory, ProviderProfile } from '../types';
import { ProviderCard } from '../components/ProviderCard';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'home-repairs': <Wrench className="w-6 h-6 text-emerald-600" />,
  automotive: <Car className="w-6 h-6 text-emerald-600" />,
  cleaning: <Home className="w-6 h-6 text-emerald-600" />,
  technology: <Laptop className="w-6 h-6 text-emerald-600" />,
  events: <Briefcase className="w-6 h-6 text-emerald-600" />,
};

export const LandingPage: React.FC = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [featuredProviders, setFeaturedProviders] = useState<ProviderProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [catRes, provRes] = await Promise.all([
          categoryApi.getAll(),
          providerApi.search({ limit: 4, verifiedOnly: true }),
        ]);

        if (catRes.data.success) {
          const catList = (catRes.data as any).categories || catRes.data.data || [];
          setCategories(Array.isArray(catList) ? catList : []);
        }
        if (provRes.data.success) {
          const provList = (provRes.data as any).providers || provRes.data.data || [];
          setFeaturedProviders(Array.isArray(provList) ? provList : []);
        }
      } catch (err) {
        console.error('Landing page data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (selectedCity) params.set('city', selectedCity);
    navigate(`/discover?${params.toString()}`);
  };

  return (
    <div className="space-y-20 pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-emerald-50/60 via-slate-50/40 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/70 border border-emerald-300 text-emerald-800 text-xs font-bold animate-in fade-in">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>{t('hero.badge')}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15]">
              {t('hero.title')}
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSearch}
              className="mt-8 p-2 bg-white rounded-2xl shadow-xl border border-slate-200/80 flex flex-col sm:flex-row items-center gap-2 max-w-2xl mx-auto"
            >
              <div className="flex items-center gap-2.5 px-3 flex-1 w-full border-b sm:border-b-0 sm:border-r border-slate-100 py-2 sm:py-0">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="w-full text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 px-3 w-full sm:w-auto py-2 sm:py-0">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full sm:w-36 text-xs sm:text-sm font-medium text-slate-700 focus:outline-none bg-transparent cursor-pointer"
                >
                  <option value="">{t('hero.allCities')}</option>
                  <option value="Adama">{t('locations.adama')}</option>
                  <option value="Bishoftu">{t('locations.bishoftu')}</option>
                  <option value="Addis Ababa">{t('locations.addisAbaba')}</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer"
              >
                {t('hero.searchButton')}
              </button>
            </form>

            <p className="text-xs text-slate-400">
              {t('hero.popularSearch')}
            </p>
          </div>
        </div>
      </section>

      {/* Trust & Safety Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {t('trustBadges.verifiedBadge')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every verified professional submits authentic Ethiopian National ID and professional trade credentials.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {t('trustBadges.pricingBadge')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Clear itemized price quotes in Ethiopian Birr (ETB). No hidden surprises or arbitrary price hikes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {t('trustBadges.chatBadge')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Communicate directly with your technician, agree on schedules, and track arrival privately.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-purple-100/70 text-purple-700 flex items-center justify-center mb-4">
              <Star className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              {t('trustBadges.reviewBadge')}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Ratings are 100% genuine. Only customers with completed booking records can leave reviews.
            </p>
          </div>
        </div>
      </section>

      {/* Service Categories Grid */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {t('categories.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {t('categories.subtitle')}
            </p>
          </div>
          <Link
            to="/discover"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            <span>{t('categories.viewAll')}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {categories.map((cat) => {
            const name = language === 'am' ? cat.nameAm : cat.nameEn;
            const desc = language === 'am' ? cat.descriptionAm : cat.descriptionEn;
            return (
              <Link
                key={cat._id}
                to={`/discover?category=${cat.slug}`}
                className="group p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    {CATEGORY_ICONS[cat.slug] || <Wrench className="w-6 h-6 text-emerald-600" />}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                    {desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
                  <span>Browse Trades</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold">
              {t('howItWorks.title')}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {t('howItWorks.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-lg shadow-lg">
                1
              </div>
              <h3 className="text-base font-bold text-white">{t('howItWorks.step1Title')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('howItWorks.step1Desc')}
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-lg shadow-lg">
                2
              </div>
              <h3 className="text-base font-bold text-white">{t('howItWorks.step2Title')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('howItWorks.step2Desc')}
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-lg shadow-lg">
                3
              </div>
              <h3 className="text-base font-bold text-white">{t('howItWorks.step3Title')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('howItWorks.step3Desc')}
              </p>
            </div>

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-lg shadow-lg">
                4
              </div>
              <h3 className="text-base font-bold text-white">{t('howItWorks.step4Title')}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {t('howItWorks.step4Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Verified Providers */}
      {featuredProviders.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Verified Specialists in Adama & Bishoftu
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Background-checked local experts ready to handle your repair and maintenance needs.
              </p>
            </div>
            <Link
              to="/discover"
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Explore All</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProviders.map((provider) => (
              <ProviderCard key={provider._id} provider={provider} />
            ))}
          </div>
        </section>
      )}

      {/* Become a Provider CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-950 p-8 sm:p-12 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl space-y-4">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-600/40">
              For Professional Trades & Technicians
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Grow Your Service Business with Lehulu
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Connect with genuine homeowners and businesses in Adama and Bishoftu. Build your verified reputation, receive direct booking requests, and manage transparent ETB quotations.
            </p>
          </div>

          <Link
            to="/login?role=SERVICE_PROVIDER"
            className="px-8 py-4 bg-white text-emerald-900 hover:bg-emerald-50 text-sm font-extrabold rounded-2xl shadow-lg transition-transform hover:scale-105 shrink-0"
          >
            {t('nav.becomeProvider')}
          </Link>
        </div>
      </section>
    </div>
  );
};
