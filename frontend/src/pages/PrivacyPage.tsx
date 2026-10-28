import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ChevronLeft, ShieldCheck, EyeOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const PrivacyPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-500">Last updated: October 2026 • Lehulu Marketplace (ለሁሉ)</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 space-y-4 leading-relaxed">
          <p>
            At Lehulu (ለሁሉ), we prioritize the safety and privacy of both customers and service specialists across Adama, Bishoftu, and Ethiopia.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2 flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-blue-600" />
            <span>1. Customer Address & Location Privacy</span>
          </h3>
          <p>
            We never publish your residential street address or contact phone number publicly. Service addresses are stored securely and revealed only to the specific provider assigned to your confirmed booking request.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>2. Provider Credentials & Identity Security</span>
          </h3>
          <p>
            Ethiopian National ID card images and trade license scans uploaded during provider onboarding are strictly restricted to the administrative verification queue. They are never indexed by search engines or shared with third parties.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2">3. Google Authentication & Sessions</h3>
          <p>
            We use Google Identity Services to verify identity. Session tokens are transmitted exclusively via encrypted, HttpOnly, SameSite cookies to protect your account against cross-site scripting (XSS) and CSRF attacks.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2">4. Questions & Privacy Requests</h3>
          <p>
            If you have questions regarding data privacy or wish to request data deletion, contact us at privacy@lehulu.et.
          </p>
        </div>
      </div>
    </div>
  );
};
