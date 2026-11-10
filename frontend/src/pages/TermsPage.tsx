import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ChevronLeft } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const TermsPage: React.FC = () => {
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
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-500">Last updated: October 2026 • Lehulu Marketplace (ለሁሉ)</p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 space-y-4 leading-relaxed">
          <p>
            Welcome to Lehulu (ለሁሉ), an Ethiopian local services marketplace operating in Adama, Bishoftu, and expanding nationwide. By accessing or using our platform, you agree to comply with these terms.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2">1. User Roles & Eligibility</h3>
          <p>
            Lehulu supports Customers, Service Providers, and Administrators. Providers must undergo verification before receiving verified badges. Customers agree to provide accurate service locations and private contact details solely for booked assignments.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2">2. Quotations & Pricing in Ethiopian Birr</h3>
          <p>
            All quotations and service payments are denominated in Ethiopian Birr (ETB). Prices agreed through accepted quotations form binding agreements between the customer and the provider.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2">3. Genuine Reviews & Anti-Fraud</h3>
          <p>
            Only customers with authenticated completed service bookings may submit ratings and reviews. Fabricated reviews, automated spam, or self-reviews by providers will result in permanent account suspension.
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2">4. Contact & Disputes</h3>
          <p>
            For inquiries or dispute investigations, contact our moderation team at support@lehulu.et or via the in-app dispute reporting tool.
          </p>
        </div>
      </div>
    </div>
  );
};
