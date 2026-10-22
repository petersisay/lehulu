import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { useAuth } from './context/AuthContext';

// Route-level code splitting
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const DiscoveryPage = lazy(() => import('./pages/DiscoveryPage').then((m) => ({ default: m.DiscoveryPage })));
const ProviderProfilePage = lazy(() => import('./pages/ProviderProfilePage').then((m) => ({ default: m.ProviderProfilePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })));
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard').then((m) => ({ default: m.ProviderDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const BookingDetailPage = lazy(() => import('./pages/BookingDetailPage').then((m) => ({ default: m.BookingDetailPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then((m) => ({ default: m.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

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
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-600 selection:text-white">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<RouteLoadingSpinner />}>
            <Routes>
              {/* Public Marketplace Views */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/discover" element={<DiscoveryPage />} />
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
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
