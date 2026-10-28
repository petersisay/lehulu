import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Star, MapPin, CheckCircle2, Clock, Calendar } from 'lucide-react';
import { ProviderProfile } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface ProviderCardProps {
  provider: ProviderProfile;
  distanceKm?: number;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({ provider, distanceKm }) => {
  const { language, t } = useLanguage();

  const user = typeof provider.userId === 'object' ? provider.userId : null;
  const displayName = provider.businessName || user?.displayName || 'Service Specialist';
  const bio = (language === 'am' && provider.bioAm) ? provider.bioAm : provider.bioEn;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      <div className="p-5">
        {/* Top Header: Avatar, Name, Verification */}
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={displayName}
                className="w-16 h-16 rounded-lg object-cover border-2 border-slate-100 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            {provider.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-1 rounded-full shadow-md"
                title={t('trustBadges.verifiedBadge')}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                {displayName}
              </h3>
              {provider.isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  {t('provider.verified')}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {t('provider.pending')}
                </span>
              )}

              {/* Blue Sign: Job Completed & Ready for Next Service */}
              {provider.completedBookingsCount > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  <span>Job Completed • Ready</span>
                </span>
              )}
            </div>

            {/* City & Distance */}
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {provider.serviceCities?.join(', ') || provider.publicAddress || 'Adama'}
              </span>
              {distanceKm !== undefined && (
                <span className="text-emerald-600 font-medium">
                  • {distanceKm.toFixed(1)} km
                </span>
              )}
            </div>

            {/* Rating & Real Completed Counts */}
            <div className="flex items-center gap-3 mt-2 text-xs">
              <div className="flex items-center gap-1 text-slate-700 font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>
                  {provider.reviewCount > 0
                    ? provider.rating.toFixed(1)
                    : t('provider.noReviews')}
                </span>
                {provider.reviewCount > 0 && (
                  <span className="text-slate-400 font-normal">
                    ({provider.reviewCount})
                  </span>
                )}
              </div>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1 text-slate-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>
                  {provider.completedBookingsCount}{' '}
                  {t('provider.completedJobs')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio Preview */}
        {bio && (
          <p className="mt-3.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {bio}
          </p>
        )}

        {/* Skills / Categories Badges */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {provider.skills?.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md"
            >
              {skill}
            </span>
          ))}
          {provider.experienceYears > 0 && (
            <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
              {provider.experienceYears} {t('provider.yearsExperience')}
            </span>
          )}
        </div>
      </div>

      {/* Card Footer: Pricing and Action */}
      <div className="bg-slate-50/80 px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
            {t('provider.startingFrom')}
          </span>
          <span className="text-sm font-extrabold text-slate-900">
            {provider.pricing?.startingPrice ? (
              <>
                {provider.pricing.startingPrice.toLocaleString()} {t('currency.etb')}
              </>
            ) : (
              t('pricing.custom')
            )}
          </span>
        </div>

        <Link
          to={`/providers/${provider._id}`}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 shadow-xs hover:shadow-sm transition-all"
        >
          {t('provider.viewProfile')}
        </Link>
      </div>
    </div>
  );
};
