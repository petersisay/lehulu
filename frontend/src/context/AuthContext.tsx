import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, ProviderProfile } from '../types';
import { authApi, userApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  profile: ProviderProfile | any | null;
  loading: boolean;
  isAuthenticated: boolean;
  isCustomer: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  isVerifiedProvider: boolean;
  loginWithGoogle: (idToken: string, targetRole?: UserRole) => Promise<User>;
  onboard: (data: {
    role: UserRole;
    displayName: string;
    phoneNumber?: string;
    city: string;
    preferredLanguage?: string;
    businessName?: string;
    categoryIds?: string[];
    skills?: string[];
    experienceYears?: number;
    startingPrice?: number;
  }) => Promise<User>;
  updateUser: (data: Partial<User>) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.data.success && response.data.data.user) {
        setUser(response.data.data.user);
        setProfile(response.data.data.profile || null);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithGoogle = async (idToken: string, targetRole?: UserRole): Promise<User> => {
    setLoading(true);
    try {
      const response = await authApi.loginWithGoogle(idToken, targetRole);
      const authenticatedUser = response.data.data.user;
      setUser(authenticatedUser);
      await refreshUser();
      return authenticatedUser;
    } finally {
      setLoading(false);
    }
  };

  const onboard = async (data: {
    role: UserRole;
    displayName: string;
    phoneNumber?: string;
    city: string;
    preferredLanguage?: string;
    businessName?: string;
    categoryIds?: string[];
    skills?: string[];
    experienceYears?: number;
    startingPrice?: number;
  }): Promise<User> => {
    setLoading(true);
    try {
      const response = await authApi.onboard(data);
      const updatedUser = response.data.data.user;
      setUser(updatedUser);
      setProfile(response.data.data.profile || null);
      return updatedUser;
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (data: Partial<User>): Promise<User> => {
    const response = await userApi.updateProfile(data);
    const updated = response.data.data.user;
    setUser(updated);
    return updated;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const isAuthenticated = !!user;
  const isCustomer = user?.role === 'CUSTOMER';
  const isProvider = user?.role === 'SERVICE_PROVIDER';
  const isAdmin = user?.role === 'ADMIN';
  const isVerifiedProvider = isProvider && (user?.isVerified === true || profile?.verificationStatus === 'VERIFIED');

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated,
        isCustomer,
        isProvider,
        isAdmin,
        isVerifiedProvider,
        loginWithGoogle,
        onboard,
        updateUser,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
