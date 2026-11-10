import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  Phone,
  MapPin,
  Globe,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RotateCcw,
  Loader2,
  DollarSign,
  Clock,
  Sparkles,
  Camera,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { userApi, providerApi } from '../services/api';
import { ProviderProfile } from '../types';

export const ProfilePage: React.FC = () => {
  const { user, profile: authProfile, isAuthenticated, loading: authLoading, updateUser, refreshUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  // Basic User Form State
  const [displayName, setDisplayName] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [city, setCity] = useState<string>('Adama');
  const [preferredLang, setPreferredLang] = useState<'en' | 'am'>('en');
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  // Provider-Specific Form State
  const [providerProfile, setProviderProfile] = useState<ProviderProfile | null>(null);
  const [businessName, setBusinessName] = useState<string>('');
  const [bioEn, setBioEn] = useState<string>('');
  const [bioAm, setBioAm] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState<number>(1);
  const [startingPrice, setStartingPrice] = useState<number>(200);
  const [hourlyRate, setHourlyRate] = useState<number>(150);
  const [serviceCities, setServiceCities] = useState<string[]>(['Adama']);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Status & Feedback State
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state from current user / profile
  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
      setCity(user.city || 'Adama');
      setPreferredLang(user.preferredLanguage || (language as 'en' | 'am') || 'en');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user, language]);

  // If user is provider, load provider profile
  useEffect(() => {
    if (user?.role === 'SERVICE_PROVIDER') {
      const loadProviderData = async () => {
        try {
          setLoadingProfile(true);
          const res = await providerApi.getMyProfile();
          if (res.data.success && res.data.data) {
            const p = (res.data.data as any).provider || res.data.data;
            setProviderProfile(p);
            setBusinessName(p.businessName || user.displayName || '');
            setBioEn(p.bioEn || '');
            setBioAm(p.bioAm || '');
            setExperienceYears(p.experienceYears || 1);
            setStartingPrice(p.pricing?.startingPrice || 200);
            setHourlyRate(p.pricing?.hourlyRate || 150);
            setServiceCities(p.serviceCities && p.serviceCities.length > 0 ? p.serviceCities : [user.city || 'Adama']);
            setIsAvailable(p.isAvailable !== undefined ? p.isAvailable : true);
          }
        } catch {
          // If profile does not exist yet, fallback to defaults
        } finally {
          setLoadingProfile(false);
        }
      };
      loadProviderData();
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    navigate('/login');
    return null;
  }

  const handleReset = () => {
    if (user) {
      setDisplayName(user.displayName || '');
      setPhoneNumber(user.phoneNumber || '');
      setCity(user.city || 'Adama');
      setPreferredLang(user.preferredLanguage || (language as 'en' | 'am') || 'en');
      setAvatarUrl(user.avatarUrl || '');
    }
    if (providerProfile) {
      setBusinessName(providerProfile.businessName || '');
      setBioEn(providerProfile.bioEn || '');
      setBioAm(providerProfile.bioAm || '');
      setExperienceYears(providerProfile.experienceYears || 1);
      setStartingPrice(providerProfile.pricing?.startingPrice || 200);
      setHourlyRate(providerProfile.pricing?.hourlyRate || 150);
      setServiceCities(providerProfile.serviceCities || ['Adama']);
      setIsAvailable(providerProfile.isAvailable ?? true);
    }
    setFeedback(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      // 1. Update Core User Profile
      await userApi.updateProfile({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim(),
        city,
        preferredLanguage: preferredLang,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      // Update active app language if changed
      if (preferredLang !== language) {
        setLanguage(preferredLang);
      }

      // 2. If Provider, update Provider Profile
      if (user.role === 'SERVICE_PROVIDER') {
        await providerApi.updateMyProfile({
          businessName: businessName.trim(),
          bioEn: bioEn.trim(),
          bioAm: bioAm.trim(),
          experienceYears: Number(experienceYears),
          serviceCities,
          isAvailable,
          pricing: {
            model: 'HOURLY',
            startingPrice: Number(startingPrice),
            hourlyRate: Number(hourlyRate),
          },
        });
      }

      await refreshUser();
      setFeedback({
        type: 'success',
        message: language === 'am' ? 'መረጃዎ በተሳካ ሁኔታ ተዘምኗል!' : 'Your profile has been successfully updated!',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message ||
          (language === 'am' ? 'መረጃውን ማዘመን አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to update profile. Please try again.'),
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleCity = (c: string) => {
    if (serviceCities.includes(c)) {
      if (serviceCities.length > 1) {
        setServiceCities(serviceCities.filter((x) => x !== c));
      }
    } else {
      setServiceCities([...serviceCities, c]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Banner / Breadcrumb */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {language === 'am' ? 'የመለያ መረጃ እና መገለጫ' : 'Account & Profile Settings'}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {language === 'am'
              ? 'የግል መረጃዎችን፣ ስልክ ቁጥርን እና የመለያዎን ምርጫዎች ያስተዳድሩ።'
              : 'Manage your contact details, service locations, and platform preferences.'}
          </p>
        </div>

        {/* Role Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>{user.role}</span>
          {user.isVerified && (
            <span className="bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {language === 'am' ? 'የተረጋገጠ' : 'VERIFIED'}
            </span>
          )}
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-start gap-3 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
        </div>
      )}

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-8">
        {/* Identity & Avatar Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-600" />
            {language === 'am' ? 'የግል ማንነት እና መገለጫ' : 'Personal Identity'}
          </h2>

          <div className="flex flex-col sm:flex-row items-center gap-6 pb-6 border-b border-slate-100">
            {/* Avatar Preview */}
            <div className="relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-100 bg-slate-100 flex items-center justify-center text-slate-400">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName || 'User Avatar'}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-slate-400" />
                )}
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {language === 'am' ? 'የመገለጫ ፎቶ አድራሻ (Avatar URL)' : 'Profile Photo URL'}
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                />
              </div>
              <p className="text-xs text-slate-500">
                {language === 'am'
                  ? 'ከ Google መለያዎ ጋር የተያያዘውን ፎቶ ወይም አዲስ የፎቶ አድራሻ ማስገባት ይችላሉ።'
                  : 'You can use your Google account photo or enter a custom hosted image URL.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {language === 'am' ? 'ሙሉ ስም *' : 'Display Name *'}
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              />
            </div>

            {/* Email (Read-only identity) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {language === 'am' ? 'የኢሜይል አድራሻ (ከ Google የተረጋገጠ)' : 'Email Address (Google Verified)'}
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  {language === 'am' ? 'ስልክ ቁጥር' : 'Phone Number'}
                </span>
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 91 123 4567"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                {language === 'am' ? 'የኢትዮጵያ ስልክ ቁጥር (+251 ወይም 09...)' : 'Ethiopian phone format (+251 or 09...)'}
              </span>
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {language === 'am' ? 'መኖሪያ ከተማ' : 'City / Location'}
                </span>
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-white"
              >
                <option value="Adama">Adama (አዳማ)</option>
                <option value="Bishoftu">Bishoftu (ቢሾፍቱ)</option>
                <option value="Addis Ababa">Addis Ababa (አዲስ አበባ)</option>
                <option value="Hawassa">Hawassa (ሐዋሳ)</option>
                <option value="Dire Dawa">Dire Dawa (ድሬዳዋ)</option>
              </select>
            </div>

            {/* Preferred Language */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  {language === 'am' ? 'ተመራጭ ቋንቋ' : 'Preferred Language'}
                </span>
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value as 'en' | 'am')}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-white"
              >
                <option value="en">English (እንግሊዝኛ)</option>
                <option value="am">አማርኛ (Amharic)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Service Provider Details Card */}
        {user.role === 'SERVICE_PROVIDER' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" />
                {language === 'am' ? 'የአገልግሎት ሰጪ መረጃ' : 'Professional Provider Details'}
              </h2>

              {/* Instant Availability Toggle */}
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAvailable}
                  onChange={(e) => setIsAvailable(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="text-xs font-semibold text-slate-700">
                  {isAvailable
                    ? language === 'am'
                      ? 'ስራ ለመቀበል ዝግጁ'
                      : 'Available for Bookings'
                    : language === 'am'
                    ? 'ስራ ማቆም ላይ'
                    : 'Unavailable'}
                </span>
              </label>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Business Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {language === 'am' ? 'የንግድ ወይም የስራ ስም' : 'Business / Trade Name'}
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                  />
                </div>

                {/* Experience Years */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {language === 'am' ? 'የስራ ልምድ (በዓመታት)' : 'Experience (Years)'}
                    </span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {language === 'am' ? 'መነሻ ክፍያ (ETB)' : 'Starting Price (ETB)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(Number(e.target.value))}
                      className="w-full pl-3.5 pr-12 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-white"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-slate-500">ETB</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {language === 'am' ? 'የሰዓት ክፍያ (ETB / ሰዓት)' : 'Estimated Hourly Rate (ETB / hr)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                      className="w-full pl-3.5 pr-12 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors bg-white"
                    />
                    <span className="absolute right-3 top-2 text-xs font-semibold text-slate-500">ETB/hr</span>
                  </div>
                </div>
              </div>

              {/* Service Cities Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  {language === 'am' ? 'አገልግሎት የሚሰጡባቸው ከተሞች' : 'Service Coverage Cities'}
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Adama', 'Bishoftu', 'Addis Ababa', 'Mojo', 'Hawassa'].map((c) => {
                    const active = serviceCities.includes(c);
                    return (
                      <button
                        type="button"
                        key={c}
                        onClick={() => toggleCity(c)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          active
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio / About (EN & AM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {language === 'am' ? 'ስለ እርስዎ አጭር መግለጫ (እንግሊዝኛ)' : 'About / Biography (English)'}
                  </label>
                  <textarea
                    rows={3}
                    value={bioEn}
                    onChange={(e) => setBioEn(e.target.value)}
                    placeholder="Certified professional offering high-quality repair services in Adama..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {language === 'am' ? 'ስለ እርስዎ አጭር መግለጫ (አማርኛ)' : 'About / Biography (Amharic)'}
                  </label>
                  <textarea
                    rows={3}
                    value={bioAm}
                    onChange={(e) => setBioAm(e.target.value)}
                    placeholder="በአዳማ እና አካባቢው አስተማማኝ እና ጥራት ያለው የጥገና አገልግሎት..."
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Verification Callout if unverified */}
              {!user.isVerified && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-900">
                        {language === 'am' ? 'የአገልግሎት ሰጪ ማረጋገጫ' : 'Service Provider Verification'}
                      </p>
                      <p className="text-xs text-amber-700 mt-0.5">
                        {language === 'am'
                          ? 'የደንበኞችን እምነት ለመጨመር እና የባጅ ምልክት ለማግኘት መታወቂያዎን በዳሽቦርዱ በኩል ያስገቡ።'
                          : 'Submit your national ID card to earn a verified trust badge and unlock more bookings.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/provider/dashboard')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm self-start sm:self-auto shrink-0"
                  >
                    <span>{language === 'am' ? 'ወደ ማረጋገጫ ሂድ' : 'Verification Center'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>{language === 'am' ? 'ሰርዝ' : 'Reset'}</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{language === 'am' ? 'በማስቀመጥ ላይ...' : 'Saving...'}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{language === 'am' ? 'ለውጦችን መዝግብ' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;
