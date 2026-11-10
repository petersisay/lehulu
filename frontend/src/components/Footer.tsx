import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, MapPin, Heart, Phone, Mail } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 text-slate-300 border-t border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-blue-500/30">
                <img
                  src="/lehulu-logo.jpg"
                  alt="Lehulu ለሁሉ"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-white">
                  {t('brand.name')}
                </span>
                <span className="text-xs font-semibold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-700/50">
                  {t('brand.amharicName')}
                </span>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              {t('brand.subtagline')}
            </p>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-300 bg-blue-950/40 p-2.5 rounded-lg border border-blue-800/40 w-fit">
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{t('trustBadges.verifiedBadge')}</span>
            </div>
          </div>

          {/* Regional Hubs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('locations.title')}
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('locations.adama')}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                <span>{t('locations.bishoftu')}</span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-600" />
                <span>{t('locations.addisAbaba')} (Coming Soon)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-500">
                <MapPin className="w-3.5 h-3.5 text-slate-600" />
                <span>{t('locations.hawassa')} (Future Expansion)</span>
              </li>
            </ul>
          </div>

          {/* Popular Categories */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('nav.categories')}
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/discover?category=home-repairs" className="hover:text-blue-400 transition-colors">
                  Electricians & Plumbers
                </Link>
              </li>
              <li>
                <Link to="/discover?category=automotive" className="hover:text-blue-400 transition-colors">
                  Auto Mechanics & Diagnostics
                </Link>
              </li>
              <li>
                <Link to="/discover?category=cleaning" className="hover:text-blue-400 transition-colors">
                  House & Office Cleaning
                </Link>
              </li>
              <li>
                <Link to="/discover?category=technology" className="hover:text-blue-400 transition-colors">
                  Computers, CCTV & Networks
                </Link>
              </li>
              <li>
                <Link to="/discover?category=events" className="hover:text-blue-400 transition-colors">
                  Photography & Events
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust & Legal */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {t('howItWorks.title')}
            </h3>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link to="/privacy" className="hover:text-blue-400 transition-colors">
                  {t('footer.privacy')}
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-blue-400 transition-colors">
                  {t('footer.terms')}
                </Link>
              </li>
              <li>
                <Link to="/safety" className="hover:text-blue-400 transition-colors">
                  Trust & Safety Standards
                </Link>
              </li>
              <li>
                <Link to="/login?role=SERVICE_PROVIDER" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  {t('footer.providerPortal')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} {t('brand.name')} ({t('brand.amharicName')}) Marketplace. {t('footer.rights')}
          </p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Built with care for Ethiopian communities</span>
            <Heart className="w-3.5 h-3.5 text-red-500 inline fill-red-500" />
          </div>
        </div>
      </div>
    </footer>
  );
};
