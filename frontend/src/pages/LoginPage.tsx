import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import {
  ShieldCheck,
  UserCheck,
  Briefcase,
  AlertCircle,
  Loader2,
  MapPin,
  Phone,
  Upload,
  Trash2,
  Camera,
  CheckCircle2,
  FileText,
  Info,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';
import { categoryApi } from '../services/api';

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, loginWithGoogle, onboard } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get('redirect') || '/';
  const requestedRole = (searchParams.get('role') as UserRole) || 'CUSTOMER';

  const [step, setStep] = useState<'auth' | 'role_select' | 'onboarding'>('auth');
  const [selectedRole, setSelectedRole] = useState<UserRole>(requestedRole);
  const [displayName, setDisplayName] = useState<string>('');
  const [city, setCity] = useState<string>('Adama');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [skills, setSkills] = useState<string>('');
  const [experienceYears, setExperienceYears] = useState<number>(2);
  const [startingPrice, setStartingPrice] = useState<number>(500);

  // Dedicated Provider Onboarding & Identity Verification State
  const [categories, setCategories] = useState<{ _id: string; nameEn: string; nameAm: string; slug: string }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [serviceDescription, setServiceDescription] = useState<string>('');
  const [serviceArea, setServiceArea] = useState<string>('');
  const [nationalIdNumber, setNationalIdNumber] = useState<string>('');
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);
  const [idCardFileError, setIdCardFileError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState<boolean>(true);
  const [providerCoordinates, setProviderCoordinates] = useState<[number, number]>([39.2683, 8.54]);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories on mount for provider category dropdown
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await categoryApi.getAll();
        const loaded = (res.data as any).categories || (res.data as any).data || [];
        if (Array.isArray(loaded)) {
          setCategories(loaded);
          if (loaded.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(loaded[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // If already authenticated and onboarded, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      if (!user.isOnboarded) {
        setDisplayName(user.displayName || '');
        setStep('role_select');
      } else {
        if (user.role === 'ADMIN') navigate('/admin/dashboard');
        else if (user.role === 'SERVICE_PROVIDER') navigate('/provider/dashboard');
        else navigate('/customer/dashboard');
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('No credential returned by Google Identity Services.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loggedUser = await loginWithGoogle(credentialResponse.credential, requestedRole);
      if (loggedUser.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (!loggedUser.isOnboarded) {
        setDisplayName(loggedUser.displayName || '');
        setStep('role_select');
      } else if (loggedUser.role === 'SERVICE_PROVIDER') {
        navigate('/provider/dashboard');
      } else {
        navigate(redirectUrl && redirectUrl !== '/' ? redirectUrl : '/customer/dashboard');
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        'Google authentication failed.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleContinue = () => {
    setStep('onboarding');
  };

  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdCardFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setIdCardFileError('Please select a valid image file (JPEG, PNG, or WebP).');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSize) {
      setIdCardFileError('File size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIdCardPreview(reader.result as string);
    };
    reader.onerror = () => {
      setIdCardFileError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveIdImage = () => {
    setIdCardPreview(null);
    setIdCardFileError(null);
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setError('Browser geolocation is not supported on this device.');
      return;
    }
    setDetectingGps(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProviderCoordinates([pos.coords.longitude, pos.coords.latitude]);
        setDetectingGps(false);
      },
      (err) => {
        setDetectingGps(false);
        setError(`Could not access GPS location: ${err.message}. You can manually choose your city.`);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }

    if (selectedRole === 'SERVICE_PROVIDER' && !consentGiven) {
      setError('You must confirm consent for identity verification to apply as a service provider.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const skillsArray = skills ? skills.split(',').map((s) => s.trim()).filter(Boolean) : [];
      const updatedUser = await onboard({
        role: selectedRole,
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        city,
        businessName: selectedRole === 'SERVICE_PROVIDER' ? (businessName.trim() || displayName.trim()) : undefined,
        categoryId: selectedRole === 'SERVICE_PROVIDER' ? selectedCategoryId || undefined : undefined,
        categoryIds: selectedRole === 'SERVICE_PROVIDER' && selectedCategoryId ? [selectedCategoryId] : undefined,
        skills: selectedRole === 'SERVICE_PROVIDER' ? skillsArray : undefined,
        serviceDescription: selectedRole === 'SERVICE_PROVIDER' ? serviceDescription.trim() || undefined : undefined,
        serviceArea: selectedRole === 'SERVICE_PROVIDER' ? serviceArea.trim() || city : undefined,
        location: selectedRole === 'SERVICE_PROVIDER' ? { type: 'Point', coordinates: providerCoordinates } : undefined,
        nationalIdNumber: selectedRole === 'SERVICE_PROVIDER' ? nationalIdNumber.trim() || undefined : undefined,
        idCardImageUrl: selectedRole === 'SERVICE_PROVIDER' ? idCardPreview || undefined : undefined,
        consentGiven: selectedRole === 'SERVICE_PROVIDER' ? consentGiven : undefined,
        experienceYears: selectedRole === 'SERVICE_PROVIDER' ? Number(experienceYears) : undefined,
        startingPrice: selectedRole === 'SERVICE_PROVIDER' ? Number(startingPrice) : undefined,
      });

      if (updatedUser.role === 'ADMIN') navigate('/admin/dashboard');
      else if (updatedUser.role === 'SERVICE_PROVIDER') navigate('/provider/dashboard');
      else navigate('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete profile onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-start justify-center pt-8 sm:pt-12 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-50/70">
      <div
        className={`w-full bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xl space-y-6 transition-all ${
          step === 'onboarding' && selectedRole === 'SERVICE_PROVIDER' ? 'max-w-2xl' : 'max-w-md'
        }`}
      >
        {/* Progress Stepper */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step === 'auth'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              1
            </span>
            <span className="text-[11px] font-semibold text-slate-600">Sign In</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step === 'role_select'
                  ? 'bg-emerald-600 text-white'
                  : step === 'onboarding'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              2
            </span>
            <span className="text-[11px] font-semibold text-slate-600">Role</span>
          </div>
          <div className="w-8 h-0.5 bg-slate-200" />
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                step === 'onboarding'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              3
            </span>
            <span className="text-[11px] font-semibold text-slate-600">Profile & Verification</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-emerald-600/30 mx-auto">
            <img src="/lehulu-logo.jpg" alt="Lehulu" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 'auth'
              ? 'Sign in to Lehulu (ለሁሉ)'
              : step === 'role_select'
              ? 'Choose Your Account Type'
              : selectedRole === 'SERVICE_PROVIDER'
              ? 'Service Provider Application & Onboarding'
              : 'Complete Customer Profile'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'auth'
              ? 'Trusted Local Services for Adama, Bishoftu, and Ethiopia'
              : step === 'role_select'
              ? 'Select how you want to participate in the Lehulu marketplace'
              : selectedRole === 'SERVICE_PROVIDER'
              ? 'Provide your trade details and identity information for administrative review'
              : 'Set your primary city and contact preferences to start booking services'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Authentication */}
        {step === 'auth' && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  ADM
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Platform Administration</h4>
                  <p className="text-[11px] text-purple-700 font-medium">Authorized operators and marketplace administrators</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Platform administrators must authenticate using their authorized Google workspace credentials below.
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold">Sign in with Google Cloud ID</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-1">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google Sign-In failed or was cancelled.')}
                useOneTap={false}
                shape="pill"
                theme="outline"
                size="large"
                text="continue_with"
                width="320"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
              <span className="text-[11px] font-bold text-slate-700 block">
                Verified Google Account Required
              </span>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Only verified Google accounts are accepted. Service provider registrations undergo administrative verification of Ethiopian ID and trade details before public listing.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>We use secure HttpOnly session cookies. Real passwords are never stored.</span>
            </div>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 'role_select' && (
          <div className="space-y-4">
            <div
              onClick={() => setSelectedRole('CUSTOMER')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedRole === 'CUSTOMER'
                  ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">Find Services (Customer / ደንበኛ)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Discover verified technicians in Adama & Bishoftu, request service bookings, and receive transparent ETB quotations.
                </p>
              </div>
            </div>

            <div
              onClick={() => setSelectedRole('SERVICE_PROVIDER')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedRole === 'SERVICE_PROVIDER'
                  ? 'border-emerald-600 bg-emerald-50/60 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl mt-0.5">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-slate-900">Offer Services (Service Provider / አገልግሎት ሰጪ)</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Register as a skilled tradesperson (plumbing, electrical, automotive, cleaning, IT) and grow your verified customer base.
                </p>
                <span className="inline-block mt-2 text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-semibold">
                  Administrator verification review required before public listing
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRoleContinue}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Continue to Onboarding
            </button>
          </div>
        )}

        {/* Step 3: Onboarding Details */}
        {step === 'onboarding' && (
          <form onSubmit={handleOnboardSubmit} className="space-y-4">
            {/* Common Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / ሙሉ ስም *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Abebe Sisay"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Phone Number / ስልክ ቁጥር *
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+251 91 123 4567"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Primary City / ከተማ *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                >
                  <option value="Adama">Adama (አዳማ)</option>
                  <option value="Bishoftu">Bishoftu (ቢሾፍቱ)</option>
                  <option value="Addis Ababa">Addis Ababa (አዲስ አበባ)</option>
                </select>
              </div>

              {selectedRole === 'SERVICE_PROVIDER' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Service Area / ሰፈር ወይም አካባቢ *
                  </label>
                  <input
                    type="text"
                    value={serviceArea}
                    onChange={(e) => setServiceArea(e.target.value)}
                    placeholder="e.g. Kebele 04, Bole, Posta Bet, Bus Station"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>
              )}
            </div>

            {/* Service Provider Dedicated Fields */}
            {selectedRole === 'SERVICE_PROVIDER' && (
              <div className="space-y-4 pt-3 border-t border-slate-200">
                <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  Professional Service & Trade Information
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Business or Trade Name / የንግድ ወይም የሙያ ስም *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Abebe Expert Plumbing"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Primary Service Category / ዋና የአገልግሎት ዘርፍ *
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      required
                    >
                      {categories.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.nameEn} ({c.nameAm})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specific Trades & Skills / የተለዩ የሙያ ችሎታዎች (ኮማ ተጠቅመው ይለዩ) *
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Pipe Fitting, Drain Cleaning, Water Heater Repair"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Helps customers and search match relevant requests directly to your profile.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Service Description / የአገልግሎት ዝርዝር መግለጫ *
                  </label>
                  <textarea
                    rows={2}
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    placeholder="Briefly describe your experience, tools, and service quality..."
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Starting Rate (ETB)
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={startingPrice}
                      onChange={(e) => setStartingPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                </div>

                {/* Service Location Selection */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      Base Service Coordinates
                    </span>
                    <button
                      type="button"
                      onClick={handleDetectGps}
                      disabled={detectingGps}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                    >
                      {detectingGps ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Use Current GPS
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setProviderCoordinates([39.2683, 8.54])}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border cursor-pointer ${
                        Math.abs(providerCoordinates[0] - 39.2683) < 0.01
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Adama Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setProviderCoordinates([38.9785, 8.7523])}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border cursor-pointer ${
                        Math.abs(providerCoordinates[0] - 38.9785) < 0.01
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Bishoftu Center
                    </button>
                    <button
                      type="button"
                      onClick={() => setProviderCoordinates([38.7578, 9.0108])}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border cursor-pointer ${
                        Math.abs(providerCoordinates[0] - 38.7578) < 0.01
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Addis Ababa
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Current Coordinates: [{providerCoordinates[0].toFixed(4)}, {providerCoordinates[1].toFixed(4)}]
                  </p>
                </div>

                {/* Identity Verification Section */}
                <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                        Ethiopian Identity Verification (የብሔራዊ መታወቂያ ማረጋገጫ)
                      </h4>
                      <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                        To maintain marketplace trust and protect Ethiopian households, all service providers undergo administrative verification.
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      Ethiopian National ID Number / የፋይዳ ወይም የቀበሌ መታወቂያ ቁጥር *
                    </label>
                    <input
                      type="text"
                      value={nationalIdNumber}
                      onChange={(e) => setNationalIdNumber(e.target.value)}
                      placeholder="e.g. FAN-7892-4102 or Kebele ID / 16-digit Fayda number"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      required
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Accepts Ethiopian Fayda National ID number, resident digital ID, or official Kebele ID.
                    </span>
                  </div>

                  {/* Optional ID Card Image Upload / Scanner */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      ID Card Image / Scan (Optional / አማራጭ)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Optional: You can submit your application with just your ID number. If you choose to attach an ID photo, it will be securely reviewed by our team.
                    </p>

                    {idCardFileError && (
                      <p className="text-xs text-red-600 font-semibold">{idCardFileError}</p>
                    )}

                    {!idCardPreview ? (
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl bg-white hover:bg-emerald-50/40 transition-all cursor-pointer">
                        <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                        <span className="text-xs font-bold text-slate-700">Choose ID Card Photo or Scan</span>
                        <span className="text-[10px] text-slate-400">JPEG, PNG, or WebP up to 5MB</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleIdImageChange}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={idCardPreview}
                            alt="ID Preview"
                            className="w-16 h-12 object-cover rounded-lg border border-slate-200"
                          />
                          <div>
                            <span className="text-xs font-bold text-emerald-900 block flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ID Image Attached
                            </span>
                            <span className="text-[10px] text-slate-500">Preview ready for submission</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer">
                            Replace
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleIdImageChange}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveIdImage}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Remove Image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Privacy Notice Box */}
                  <div className="p-3 bg-white/80 border border-emerald-200 rounded-xl text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-emerald-950 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Privacy & Data Protection Notice:
                    </p>
                    <p className="leading-relaxed">
                      Your identity documents and National ID number are stored securely in encrypted private records, masked by default, and NEVER disclosed in public profiles or customer search results. They are accessible solely by authorized administrators for verification auditing.
                    </p>
                  </div>

                  {/* Consent Step */}
                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      required
                    />
                    <span className="text-[11px] text-slate-700 font-medium leading-snug">
                      I confirm that the details provided are accurate and consent to administrative verification of my identity details to maintain marketplace trust.
                    </span>
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>
                {selectedRole === 'SERVICE_PROVIDER'
                  ? 'Submit Application for Administrator Review'
                  : 'Complete Setup & Enter Lehulu'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
