import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, userApi } from '../services/api';
export const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const refreshUser = async () => {
        try {
            const response = await authApi.getMe();
            const userData = response.data.data?.user || response.data.user;
            const profileData = response.data.data?.profile || response.data.profile;
            if (response.data.success && userData) {
                setUser(userData);
                setProfile(profileData || null);
            }
            else {
                setUser(null);
                setProfile(null);
            }
        }
        catch {
            setUser(null);
            setProfile(null);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        refreshUser();
    }, []);
    const loginWithGoogle = async (idToken, targetRole) => {
        setLoading(true);
        try {
            const response = await authApi.loginWithGoogle(idToken, targetRole);
            const authenticatedUser = response.data.data?.user || response.data.user;
            setUser(authenticatedUser);
            await refreshUser();
            return authenticatedUser;
        }
        finally {
            setLoading(false);
        }
    };
    const onboard = async (data) => {
        setLoading(true);
        try {
            const response = await authApi.onboard(data);
            const updatedUser = response.data.data?.user || response.data.user;
            const updatedProfile = response.data.data?.profile || response.data.profile;
            setUser(updatedUser);
            setProfile(updatedProfile || null);
            return updatedUser;
        }
        finally {
            setLoading(false);
        }
    };
    const updateUser = async (data) => {
        const response = await userApi.updateProfile(data);
        const updated = response.data.data?.user || response.data.user;
        setUser(updated);
        return updated;
    };
    const logout = async () => {
        try {
            await authApi.logout();
        }
        finally {
            setUser(null);
            setProfile(null);
        }
    };
    const isAuthenticated = !!user;
    const isCustomer = user?.role === 'CUSTOMER';
    const isProvider = user?.role === 'SERVICE_PROVIDER';
    const isAdmin = user?.role === 'ADMIN';
    const isVerifiedProvider = isProvider && (user?.isVerified === true || profile?.verificationStatus === 'VERIFIED');
    return (<AuthContext.Provider value={{
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
        }}>
      {children}
    </AuthContext.Provider>);
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
