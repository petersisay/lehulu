import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ChevronLeft, UserCheck, Lock, FileCheck2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const SafetyPage = () => {
  const { language } = useLanguage();
  const isAm = language === 'am';

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-700"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isAm ? 'ወደ መነሻ ገጽ ተመለስ' : 'Back to Home'}</span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 shadow-xs space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              {isAm ? 'የእምነት እና ደህንነት መስፈርቶች' : 'Trust & Safety Standards'}
            </h1>
            <p className="text-xs text-slate-500">
              {isAm
                ? 'ለሁሉ (Lehulu) • አዳማ እና ቢሾፍቱ የአካባቢ አገልግሎት ገበያ'
                : 'Last updated: November 2026 • Lehulu Marketplace (ለሁሉ)'}
            </p>
          </div>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-600 space-y-4 leading-relaxed">
          <p>
            {isAm
              ? 'ለሁሉ (Lehulu) በአዳማ፣ ቢሾፍቱ እና በመላው ኢትዮጵያ ለሚገኙ ደንበኞች እና ባለሙያዎች ደህንነቱ የተጠበቀ እና ታማኝ የአገልግሎት ገበያ ለመፍጠር ጥብቅ የደህንነት መስፈርቶችን ተግባራዊ ያደርጋል።'
              : 'Lehulu (ለሁሉ) enforces strict verification, transparency, and accountability standards to keep households, businesses, and service professionals safe across Adama, Bishoftu, and Ethiopia.'}
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2 flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {isAm
                ? '1. የብሔራዊ መታወቂያ እና የሙያ ፈቃድ ማረጋገጫ'
                : '1. National ID & Trade Credential Verification'}
            </span>
          </h3>
          <p>
            {isAm
              ? 'ማንኛውም አገልግሎት ሰጪ በሕዝብ ፍለጋ ከመታየቱ በፊት የኢትዮጵያ ብሔራዊ መታወቂያ ወይም የንግድ ፈቃድ በአስተዳዳሪ ቡድናችን መረጋገጥ አለበት። ያልተረጋገጡ ወይም የታገዱ ባለሙያዎች ለደንበኞች አይታዩም።'
              : 'Every service provider must pass administrative identity verification—submitting a valid Ethiopian National ID and optional trade license—before appearing in public customer search results. Unverified or suspended providers are strictly hidden from discovery.'}
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>
              {isAm
                ? '2. የመኖሪያ አድራሻ እና የግል መረጃ ጥበቃ'
                : '2. Private Address & Contact Protection'}
            </span>
          </h3>
          <p>
            {isAm
              ? 'የደንበኞች የመኖሪያ አድራሻ እና የስልክ ቁጥር በይፋ አይታዩም። መረጃዎ የሚጋራው እርስዎ የስራ ዋጋ (Quotation) ተቀብለው ካረጋገጡት ባለሙያ ጋር ብቻ ነው።'
              : 'Customer street addresses and phone numbers are never publicly exposed. Exact service locations are shared exclusively with the verified provider assigned to your confirmed booking.'}
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2 flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-indigo-600" />
            <span>
              {isAm
                ? '3. ግልጽ የሆነ የETB ዋጋ እና የተረጋገጡ ግምገማዎች'
                : '3. Itemized ETB Quotations & Authentic Reviews'}
            </span>
          </h3>
          <p>
            {isAm
              ? 'ስራ ከመጀመሩ በፊት ባለሙያዎች ዝርዝር የETB ዋጋ (የእጅ ዋጋ እና የዕቃ ዋጋ) መላክ አለባቸው። ግምገማ መስጠት የሚችሉት አገልግሎቱን በትክክል ያጠናቀቁ ደንበኞች ብቻ ናቸው።'
              : 'Providers issue itemized Ethiopian Birr (ETB) quotations—separating labor, parts, and inspection fees—for customer approval before work begins. Only customers with completed bookings can publish ratings and reviews.'}
          </p>

          <h3 className="text-base font-bold text-slate-900 pt-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>
              {isAm
                ? '4. ቅሬታ እና የደህንነት ሪፖርት'
                : '4. Dispute Resolution & Safety Reporting'}
            </span>
          </h3>
          <p>
            {isAm
              ? 'ማንኛውም የደህንነት ስጋት ወይም የስራ አለመግባባት ካለ በመተግበሪያው ውስጥ ባለው የቅሬታ መላኪያ ወይም በ support@lehulu.et ያሳውቁን።'
              : 'If you encounter unsafe conduct, pricing disputes, or policy violations, report the issue immediately through your booking page or contact our moderation team at support@lehulu.et.'}
          </p>
        </div>
      </div>
    </div>
  );
};
