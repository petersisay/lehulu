import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  Globe,
  Bell,
  User as UserIcon,
  LogOut,
  ShieldCheck,
  Briefcase,
  Calendar,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isCustomer, isProvider, isAdmin, isVerifiedProvider, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  const handleLogout = async () => {
    await logout();
    setProfileDropdownOpen(false);
    navigate('/');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'am' : 'en');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo & Identity */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-md border-2 border-blue-600/20 group-hover:scale-105 transition-transform duration-200">
              <img
                src="/lehulu-logo.jpg"
                alt="Lehulu ለሁሉ"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                  {t('brand.name')}
                </span>
                <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  {t('brand.amharicName')}
                </span>
              </div>
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                {t('brand.tagline')}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Strict Role-Based Visibility */}
          <div className="hidden md:flex items-center gap-6">
            {isAdmin ? (
              <>
                <Link
                  to="/admin/dashboard?tab=overview"
                  className="text-sm font-semibold text-purple-800 hover:text-purple-950 transition-colors"
                >
                  {t('nav.adminPanel')}
                </Link>
                <Link
                  to="/admin/dashboard?tab=verifications"
                  className="text-sm font-medium text-slate-700 hover:text-purple-800 transition-colors"
                >
                  Verification Queue
                </Link>
                <Link
                  to="/admin/dashboard?tab=leads"
                  className="text-sm font-medium text-slate-700 hover:text-purple-800 transition-colors"
                >
                  Provider Leads
                </Link>
              </>
            ) : isProvider ? (
              <>
                <Link
                  to="/provider/dashboard"
                  className="text-sm font-semibold text-blue-800 hover:text-blue-950 transition-colors"
                >
                  {t('nav.dashboard')}
                </Link>
                <Link
                  to="/provider/dashboard"
                  className="text-sm font-medium text-slate-700 hover:text-blue-800 transition-colors"
                >
                  My Requests & Bookings
                </Link>
                {isVerifiedProvider ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Provider
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                    Verification Pending
                  </span>
                )}
              </>
            ) : (
              <>
                <Link
                  to="/discover"
                  className="text-sm font-semibold text-slate-700 hover:text-blue-700 transition-colors"
                >
                  {t('nav.findServices')}
                </Link>
                <a
                  href="/#categories"
                  className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                >
                  {t('nav.categories')}
                </a>
                <a
                  href="/#how-it-works"
                  className="text-sm font-medium text-slate-600 hover:text-blue-700 transition-colors"
                >
                  {t('nav.howItWorks')}
                </a>
              </>
            )}

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all cursor-pointer"
              title="Switch Language / ቋንቋ ይቀይሩ"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{language === 'en' ? 'አማርኛ (AM)' : 'English (EN)'}</span>
            </button>

            {/* Auth Actions / Profile Dropdown */}
            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 rounded-full hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full object-cover border border-blue-500"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-sm">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="hidden lg:flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-900 leading-tight">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold uppercase">
                      {user.role === 'ADMIN'
                        ? 'Admin'
                        : user.role === 'SERVICE_PROVIDER'
                        ? isVerifiedProvider
                          ? 'Verified Pro'
                          : 'Pro (Pending)'
                        : 'Customer'}
                    </span>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {user.displayName}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    </div>

                    {isCustomer && (
                      <Link
                        to="/customer/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span>{t('nav.bookings')}</span>
                      </Link>
                    )}

                    {isProvider && (
                      <Link
                        to="/provider/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Briefcase className="w-4 h-4 text-blue-600" />
                        <span>{t('nav.dashboard')}</span>
                      </Link>
                    )}

                    {isAdmin && (
                      <Link
                        to="/admin/dashboard"
                        onClick={() => setProfileDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700"
                      >
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>{t('nav.adminPanel')}</span>
                      </Link>
                    )}

                    <Link
                      to="/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      <span>{t('nav.profile')}</span>
                    </Link>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-red-500" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {!isLoginPage ? (
                  <>
                    <Link
                      to="/login?role=SERVICE_PROVIDER"
                      className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-lg transition-colors"
                    >
                      {t('nav.becomeProvider')}
                    </Link>
                    <Link
                      to="/login"
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm px-4 py-2 rounded-lg transition-all"
                    >
                      {t('nav.signIn')}
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/"
                    className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 transition-colors"
                  >
                    ← Back to Home
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={toggleLanguage}
              type="button"
              className="p-2 text-xs font-bold text-blue-700 bg-blue-50 rounded-lg border border-blue-200"
            >
              {language === 'en' ? 'አማ' : 'EN'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-3">
          {isAdmin ? (
            <div className="space-y-1">
              <Link
                to="/admin/dashboard?tab=overview"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-purple-800"
              >
                {t('nav.adminPanel')}
              </Link>
              <Link
                to="/admin/dashboard?tab=verifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700"
              >
                Verification Queue
              </Link>
              <Link
                to="/admin/dashboard?tab=leads"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700"
              >
                Provider Leads
              </Link>
            </div>
          ) : isProvider ? (
            <div className="space-y-1">
              <Link
                to="/provider/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-bold text-blue-800"
              >
                {t('nav.dashboard')}
              </Link>
              <Link
                to="/provider/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700"
              >
                Incoming Bookings & Requests
              </Link>
              <div className="py-1">
                {isVerifiedProvider ? (
                  <span className="inline-block text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Verified Provider
                  </span>
                ) : (
                  <span className="inline-block text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Verification Review Pending
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                to="/discover"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-semibold text-slate-800 hover:text-blue-700"
              >
                {t('nav.findServices')}
              </Link>
              <a
                href="/#categories"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-600"
              >
                {t('nav.categories')}
              </a>
              <a
                href="/#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-slate-600"
              >
                {t('nav.howItWorks')}
              </a>
            </div>
          )}

          {isAuthenticated && user ? (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="flex items-center gap-3 py-2">
                <div className="w-10 h-10 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.displayName}</p>
                  <p className="text-xs text-slate-500 font-semibold uppercase">{user.role}</p>
                </div>
              </div>

              {isCustomer && (
                <Link
                  to="/customer/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm font-semibold text-blue-700"
                >
                  {t('nav.bookings')}
                </Link>
              )}

              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-slate-600"
              >
                {t('nav.profile')}
              </Link>

              <button
                onClick={handleLogout}
                className="w-full text-left py-2 text-sm font-bold text-red-600 cursor-pointer"
              >
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {!isLoginPage ? (
                <>
                  <Link
                    to="/login?role=SERVICE_PROVIDER"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 rounded-lg border border-blue-300 text-blue-700 font-semibold bg-blue-50 text-sm"
                  >
                    {t('nav.becomeProvider')}
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm shadow-sm"
                  >
                    {t('nav.signIn')}
                  </Link>
                </>
              ) : (
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm"
                >
                  ← Back to Home
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
