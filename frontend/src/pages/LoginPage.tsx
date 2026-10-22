import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { ShieldCheck, UserCheck, Briefcase, AlertCircle, Loader2, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { UserRole } from '../types';

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

  const [directEmail, setDirectEmail] = useState<string>('petrossisay1646@gmail.com');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // If already authenticated and onboarded, redirect
  React.useEffect(() => {
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
      if (!loggedUser.isOnboarded) {
        setDisplayName(loggedUser.displayName || '');
        setStep('role_select');
      } else {
        navigate(redirectUrl);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async (mockRole: UserRole, customEmail?: string) => {
    setLoading(true);
    setError(null);
    try {
      let email = customEmail || 'customer@lehulu.et';
      if (!customEmail) {
        if (mockRole === 'ADMIN') email = 'petrossisay1646@gmail.com';
        else if (mockRole === 'SERVICE_PROVIDER') email = 'provider@lehulu.et';
        else email = 'customer@lehulu.et';
      }
      const mockToken = `mock-google-token-${email.trim().toLowerCase()}`;
      const loggedUser = await loginWithGoogle(mockToken, mockRole);
      if (!loggedUser.isOnboarded) {
        setSelectedRole(mockRole);
        setDisplayName(loggedUser.displayName || `Test ${mockRole}`);
        setStep('onboarding');
      } else {
        if (loggedUser.role === 'ADMIN') navigate('/admin/dashboard');
        else if (loggedUser.role === 'SERVICE_PROVIDER') navigate('/provider/dashboard');
        else navigate('/customer/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleContinue = () => {
    setStep('onboarding');
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required.');
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
        skills: selectedRole === 'SERVICE_PROVIDER' ? skillsArray : undefined,
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
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/60">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 p-8 shadow-xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-lg border-2 border-emerald-600/30 mx-auto">
            <img src="/lehulu-logo.jpg" alt="Lehulu" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {step === 'auth' ? 'Sign in to Lehulu' : step === 'role_select' ? 'Choose Your Lehulu Role' : 'Complete Your Profile'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 'auth'
              ? 'Trusted Local Services for Adama, Bishoftu, and Ethiopia'
              : step === 'role_select'
              ? 'Tell us how you would like to use Lehulu'
              : 'Add your details to start using the marketplace'}
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
            {/* Super Admin Quick Access */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  ADM
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">Super Administrator</h4>
                  <p className="text-[11px] text-purple-700 font-medium truncate">petrossisay1646@gmail.com</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDevLogin('ADMIN', 'petrossisay1646@gmail.com')}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>Sign in as petrossisay1646@gmail.com (Admin)</span>
              </button>
            </div>

            {/* Direct Email Sign-In */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (directEmail.trim()) {
                  const targetRole = directEmail.trim().toLowerCase() === 'petrossisay1646@gmail.com' ? 'ADMIN' : requestedRole;
                  handleDevLogin(targetRole, directEmail.trim());
                }
              }}
              className="space-y-2 pt-1"
            >
              <label className="text-xs font-bold text-slate-700 block">Sign In with Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  placeholder="e.g. petrossisay1646@gmail.com"
                  className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-600 bg-white"
                />
                <button
                  type="submit"
                  disabled={loading || !directEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Sign In
                </button>
              </div>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold">Or with Google Cloud ID</span>
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

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-semibold">Local Dev Fast-Login</span>
              </div>
            </div>

            {/* Dev Fallbacks if Google client id is waiting on live DNS */}
            <div className="space-y-2">
              <p className="text-[11px] text-slate-400 text-center">
                Select a role to test secure sessions immediately:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleDevLogin('CUSTOMER', 'customer@lehulu.et')}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Customer
                </button>
                <button
                  type="button"
                  onClick={() => handleDevLogin('SERVICE_PROVIDER', 'provider@lehulu.et')}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Provider
                </button>
                <button
                  type="button"
                  onClick={() => handleDevLogin('ADMIN', 'petrossisay1646@gmail.com')}
                  disabled={loading}
                  className="p-2.5 rounded-xl border border-purple-200 hover:border-purple-500 hover:bg-purple-50 text-purple-700 text-xs font-bold transition-all text-center cursor-pointer"
                >
                  Admin
                </button>
              </div>
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
                  Discover verified technicians, request service bookings, and receive transparent ETB quotations.
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
                  Apply as a professional electrician, plumber, mechanic, cleaner, or technician and grow your business.
                </p>
                <span className="inline-block mt-2 text-[10px] text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded font-semibold">
                  Verification review required before verified badge is granted
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
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Display Name *
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Primary City *
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+251 91 123 4567"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {selectedRole === 'SERVICE_PROVIDER' && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trade / Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Abebe Certified Electrical"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Skills (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="e.g. Wiring, Breaker Repair, Generator Setup"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Years Experience
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
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              <span>Complete Setup & Enter Lehulu</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
