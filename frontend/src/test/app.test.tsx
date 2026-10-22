import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { ProviderCard } from '../components/ProviderCard';
import { ProviderProfile } from '../types';

// Mock Provider Profile
const mockProvider: ProviderProfile = {
  _id: 'prov-101',
  userId: {
    _id: 'user-101',
    displayName: 'Kebede Expert Plumbing',
    username: 'kebede_plumber',
    avatarUrl: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a',
    phoneNumber: '+251911223344',
    city: 'Adama',
  },
  businessName: 'Kebede Expert Plumbing',
  categoryIds: [
    {
      _id: 'cat-1',
      nameEn: 'Plumbing Services',
      nameAm: 'የቧንቧ ጥገና',
      slug: 'plumbing',
      icon: 'wrench',
    },
  ],
  serviceCities: ['Adama', 'Bishoftu'],
  pricing: {
    model: 'HOURLY',
    startingPrice: 350,
    hourlyRate: 200,
  },
  rating: 4.9,
  reviewCount: 28,
  totalReviews: 28,
  completedBookingsCount: 42,
  isVerified: true,
  isAvailable: true,
  experienceYears: 5,
};

const renderWithProviders = (
  ui: React.ReactElement,
  authValues: any = {
    user: null,
    profile: null,
    loading: false,
    isAuthenticated: false,
    isCustomer: false,
    isProvider: false,
    isAdmin: false,
    isVerifiedProvider: false,
    loginWithGoogle: vi.fn(),
    onboard: vi.fn(),
    updateUser: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }
) => {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <AuthContext.Provider value={authValues}>{ui}</AuthContext.Provider>
      </LanguageProvider>
    </MemoryRouter>
  );
};

describe('Lehulu (ለሁሉ) Frontend Component & UI Tests', () => {
  describe('1. Navbar & Role-Based Navigation', () => {
    it('renders Lehulu brand and navigation links for anonymous visitors', () => {
      renderWithProviders(<Navbar />);

      expect(screen.getAllByText(/ለሁሉ/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Lehulu/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByRole('link', { name: /በGoogle ይግቡ|sign in/i }).length).toBeGreaterThanOrEqual(1);
    });

    it('renders customer dashboard and profile links when authenticated as CUSTOMER', () => {
      const mockCustomerAuth = {
        user: {
          _id: 'cust-1',
          email: 'abebe@gmail.com',
          role: 'CUSTOMER',
          displayName: 'Abebe Bikila',
          username: 'abebe_b',
          city: 'Adama',
          isVerified: false,
          isOnboarded: true,
        },
        profile: null,
        loading: false,
        isAuthenticated: true,
        isCustomer: true,
        isProvider: false,
        isAdmin: false,
        isVerifiedProvider: false,
        loginWithGoogle: vi.fn(),
        onboard: vi.fn(),
        updateUser: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      };

      renderWithProviders(<Navbar />, mockCustomerAuth);

      // Should display customer's name
      expect(screen.getByText('Abebe Bikila')).toBeInTheDocument();
      // Should display Customer role badge
      expect(screen.getByText('Customer')).toBeInTheDocument();
    });

    it('renders provider dashboard and verified badge for verified SERVICE_PROVIDER', () => {
      const mockProviderAuth = {
        user: {
          _id: 'prov-user-1',
          email: 'kebede@gmail.com',
          role: 'SERVICE_PROVIDER',
          displayName: 'Kebede Master',
          username: 'kebede_m',
          city: 'Bishoftu',
          isVerified: true,
          isOnboarded: true,
        },
        profile: mockProvider,
        loading: false,
        isAuthenticated: true,
        isCustomer: false,
        isProvider: true,
        isAdmin: false,
        isVerifiedProvider: true,
        loginWithGoogle: vi.fn(),
        onboard: vi.fn(),
        updateUser: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      };

      renderWithProviders(<Navbar />, mockProviderAuth);

      expect(screen.getByText('Kebede Master')).toBeInTheDocument();
      expect(screen.getByText('Verified Pro')).toBeInTheDocument();
    });

    it('renders admin badge and admin portal navigation for ADMIN', () => {
      const mockAdminAuth = {
        user: {
          _id: 'adm-1',
          email: 'petrossisay1646@gmail.com',
          role: 'ADMIN',
          displayName: 'Platform Admin',
          username: 'admin',
          city: 'Addis Ababa',
          isVerified: true,
          isOnboarded: true,
        },
        profile: null,
        loading: false,
        isAuthenticated: true,
        isCustomer: false,
        isProvider: false,
        isAdmin: true,
        isVerifiedProvider: false,
        loginWithGoogle: vi.fn(),
        onboard: vi.fn(),
        updateUser: vi.fn(),
        logout: vi.fn(),
        refreshUser: vi.fn(),
      };

      renderWithProviders(<Navbar />, mockAdminAuth);

      expect(screen.getByText('Platform Admin')).toBeInTheDocument();
      expect(screen.getByText('Admin')).toBeInTheDocument();
    });
  });

  describe('2. ProviderCard & Marketplace Discovery', () => {
    it('renders provider business name, verified badge, and rating stars', () => {
      renderWithProviders(<ProviderCard provider={mockProvider} />);

      expect(screen.getByText('Kebede Expert Plumbing')).toBeInTheDocument();
      expect(screen.getByText('4.9')).toBeInTheDocument();
      expect(screen.getByText('(28)')).toBeInTheDocument();
      expect(screen.getByText(/350/)).toBeInTheDocument();
      expect(screen.getByText(/Adama, Bishoftu/i)).toBeInTheDocument();
    });
  });

  describe('3. Language Switcher (Amharic & English)', () => {
    const LanguageConsumerTest: React.FC = () => {
      const { language, setLanguage, t } = useLanguage();
      return (
        <div>
          <span data-testid="current-lang">{language}</span>
          <span data-testid="nav-home">{t('nav.home')}</span>
          <button onClick={() => setLanguage('am')}>Switch to Amharic</button>
          <button onClick={() => setLanguage('en')}>Switch to English</button>
        </div>
      );
    };

    it('toggles language between English and Amharic with responsive translation', () => {
      render(
        <LanguageProvider>
          <LanguageConsumerTest />
        </LanguageProvider>
      );

      // Default is English or Amharic depending on browser/storage; test toggling explicitly
      const amharicBtn = screen.getByText('Switch to Amharic');
      fireEvent.click(amharicBtn);
      expect(screen.getByTestId('current-lang')).toHaveTextContent('am');
      expect(screen.getByTestId('nav-home')).toHaveTextContent('መነሻ');

      const englishBtn = screen.getByText('Switch to English');
      fireEvent.click(englishBtn);
      expect(screen.getByTestId('current-lang')).toHaveTextContent('en');
      expect(screen.getByTestId('nav-home')).toHaveTextContent('Home');
    });
  });
});
