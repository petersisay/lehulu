import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { DiscoveryPage } from './pages/DiscoveryPage';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import { LoginPage } from './pages/LoginPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { ProviderDashboard } from './pages/ProviderDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { BookingDetailPage } from './pages/BookingDetailPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useAuth } from './context/AuthContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400">
        <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
          <Routes>
            {/* Public Marketplace Views */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/discover" element={<DiscoveryPage />} />
            <Route path="/providers/:id" element={<ProviderProfilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<LoginPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            {/* Role-Protected Dashboards */}
            <Route
              path="/customer/dashboard"
              element={
                <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                  <CustomerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/provider/dashboard"
              element={
                <ProtectedRoute allowedRoles={['SERVICE_PROVIDER', 'ADMIN']}>
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
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
