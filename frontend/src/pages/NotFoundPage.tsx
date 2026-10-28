import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, Search, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const NotFoundPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-black text-slate-900 tracking-tight">404</span>
          <h1 className="text-lg font-bold text-slate-900">
            Page Not Found / ገጹ አልተገኘም
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The page or service you requested does not exist or may have been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <Link
            to="/discover"
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Search Services</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
