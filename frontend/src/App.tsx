import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ScrollToTop } from './components/ScrollToTop';
import { useAuth } from './context/AuthContext';

// Resilient route-level code splitting with automatic stale-chunk recovery
function lazyRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError) {
        const reloadKey = 'lehulu_lazy_reload_ts';
        const last = sessionStorage.getItem(reloadKey);
        const now = Date.now();
        if (!last || now - parseInt(last, 10) > 10000) {
          sessionStorage.setItem(reloadKey, now.toString());
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

const LandingPage = lazyRetry(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const DiscoveryPage = lazyRetry(() => import('./pages/DiscoveryPage').then((m) => ({ default: m.DiscoveryPage })));
const ProviderProfilePage = lazyRetry(() => import('./pages/ProviderProfilePage').then((m) => ({ default: m.ProviderProfilePage })));
const LoginPage = lazyRetry(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const CustomerDashboard = lazyRetry(() => import('./pages/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })));
const ProviderDashboard = lazyRetry(() => import('./pages/ProviderDashboard').then((m) => ({ default: m.ProviderDashboard })));
const AdminDashboard = lazyRetry(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const BookingDetailPage = lazyRetry(() => import('./pages/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage })));
const ProfilePage = lazyRetry(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const TermsPage = lazyRetry(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazyRetry(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazyRetry(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

const RouteLoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteLoadingSpinner />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'SERVICE_PROVIDER') return <Navigate to="/provider/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }

  return <>{children}</>;
};

const CustomerDiscoveryRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <RouteLoadingSpinner />;
  }

  if (isAuthenticated && user) {
    if (user.role === 'SERVICE_PROVIDER') {
      return <Navigate to="/provider/dashboard" replace />;
    }
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <ScrollToTop />
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="flex-1">
          <ErrorBoundary>
            <Suspense fallback={<RouteLoadingSpinner />}>
              <Routes>
                {/* Public & Customer Marketplace Views */}
                <Route path="/" element={<LandingPage />} />
                <Route
                  path="/discover"
                  element={
                    <CustomerDiscoveryRoute>
                      <DiscoveryPage />
                    </CustomerDiscoveryRoute>
                  }
                />
                <Route path="/providers/:id" element={<ProviderProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/onboarding" element={<LoginPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* Account & Profile Management */}
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  }
                />

                {/* Role-Protected Dashboards with Strict Role Isolation */}
                <Route
                  path="/customer/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['CUSTOMER']}>
                      <CustomerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/provider/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['SERVICE_PROVIDER']}>
                      <ProviderDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Booking Details & Messaging */}
                <Route
                  path="/bookings/:id"
                  element={
                    <ProtectedRoute>
                      <BookingDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 Catch-All */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
