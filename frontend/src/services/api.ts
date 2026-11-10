import axios, { AxiosResponse } from 'axios';
import {
  User,
  ServiceCategory,
  ProviderProfile,
  Booking,
  Quote,
  Message,
  Review,
  Notification,
  UserRole,
  VerificationStatus,
  BookingStatus,
  ProviderLead,
  ProviderLeadStatus,
} from '../types';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_BASE_URL = rawApiUrl.endsWith('/api/v1')
  ? rawApiUrl
  : `${rawApiUrl.replace(/\/+$/, '')}/api/v1`;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  pages?: number;
}

export const authApi = {
  loginWithGoogle: (idToken: string, targetRole?: UserRole): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    apiClient.post('/auth/google', { idToken, targetRole }),

  getMe: (): Promise<AxiosResponse<ApiResponse<{ user: User; profile?: any }>>> =>
    apiClient.get('/auth/me'),

  onboard: (data: {
    role: UserRole;
    displayName: string;
    phoneNumber?: string;
    city: string;
    preferredLanguage?: string;
    businessName?: string;
    categoryId?: string;
    categoryIds?: string[];
    skills?: string[];
    serviceDescription?: string;
    serviceArea?: string;
    location?: { type: 'Point'; coordinates: [number, number] };
    nationalIdNumber?: string;
    idCardImageUrl?: string;
    consentGiven?: boolean;
    experienceYears?: number;
    startingPrice?: number;
  }): Promise<AxiosResponse<ApiResponse<{ user: User; profile?: any }>>> =>
    apiClient.post('/auth/onboard', data),

  logout: (): Promise<AxiosResponse<ApiResponse<null>>> =>
    apiClient.post('/auth/logout'),
};

export const userApi = {
  getProfile: (): Promise<AxiosResponse<ApiResponse<{ user: User; profile?: any }>>> =>
    apiClient.get('/users/profile'),

  updateProfile: (data: Partial<User>): Promise<AxiosResponse<ApiResponse<{ user: User }>>> =>
    apiClient.put('/users/profile', data),
};

export const categoryApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<ServiceCategory[]>>> =>
    apiClient.get('/categories'),

  create: (data: Partial<ServiceCategory>): Promise<AxiosResponse<ApiResponse<ServiceCategory>>> =>
    apiClient.post('/categories', data),

  update: (id: string, data: Partial<ServiceCategory>): Promise<AxiosResponse<ApiResponse<ServiceCategory>>> =>
    apiClient.put(`/categories/${id}`, data),
};

export interface ProviderSearchParams {
  category?: string;
  city?: string;
  lng?: number;
  lat?: number;
  maxDistance?: number;
  verifiedOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const providerApi = {
  search: (params: ProviderSearchParams): Promise<AxiosResponse<ApiResponse<ProviderProfile[]>>> =>
    apiClient.get('/providers', { params }),

  getById: (id: string): Promise<AxiosResponse<ApiResponse<{ provider: ProviderProfile; reviews: Review[] }>>> =>
    apiClient.get(`/providers/${id}`),

  getMyProfile: (): Promise<AxiosResponse<ApiResponse<ProviderProfile>>> =>
    apiClient.get('/providers/profile'),

  updateMyProfile: (data: Partial<ProviderProfile>): Promise<AxiosResponse<ApiResponse<ProviderProfile>>> =>
    apiClient.put('/providers/profile', data),

  submitVerification: (data: {
    nationalIdNumber: string;
    idCardFrontUrl?: string;
    idCardBackUrl?: string;
    tradeLicenseUrl?: string;
  }): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.post('/providers/verification', data),
};

export interface CreateBookingData {
  providerId: string;
  categoryId: string;
  requestedDate: string;
  requestedTimeSlot: string;
  problemDescription: string;
  referenceImages?: string[];
  serviceAddress: {
    city: string;
    subcity?: string;
    kebele?: string;
    streetAddress: string;
    contactPhone: string;
    coordinates?: [number, number];
  };
}

export const bookingApi = {
  create: (data: CreateBookingData): Promise<AxiosResponse<ApiResponse<Booking>>> =>
    apiClient.post('/bookings', data),

  getMyBookings: (role?: UserRole, status?: BookingStatus): Promise<AxiosResponse<ApiResponse<Booking[]>>> =>
    apiClient.get('/bookings', { params: { role, status } }),

  getById: (id: string): Promise<AxiosResponse<ApiResponse<{ booking: Booking; quotes: Quote[]; messages: Message[] }>>> =>
    apiClient.get(`/bookings/${id}`),

  updateStatus: async (id: string, status: BookingStatus, cancellationReason?: string): Promise<AxiosResponse<ApiResponse<Booking>>> => {
    try {
      return await apiClient.put(`/bookings/${id}/status`, { status, cancellationReason });
    } catch (err: any) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        return await apiClient.patch(`/bookings/${id}/status`, { status, cancellationReason });
      }
      throw err;
    }
  },

  requestCompletion: async (id: string): Promise<AxiosResponse<ApiResponse<Booking>>> => {
    try {
      return await apiClient.post(`/bookings/${id}/request-completion`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return await apiClient.put(`/bookings/${id}/status`, { status: 'COMPLETION_PENDING' });
      }
      throw err;
    }
  },

  confirmCompletion: async (id: string): Promise<AxiosResponse<ApiResponse<Booking>>> => {
    try {
      return await apiClient.post(`/bookings/${id}/confirm-completion`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return await apiClient.put(`/bookings/${id}/status`, { status: 'COMPLETED' });
      }
      throw err;
    }
  },
};

export interface CreateQuoteData {
  bookingId: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  estimatedDurationHours?: number;
  inspectionIncluded: boolean;
  notes?: string;
  validDays?: number;
}

export const quoteApi = {
  create: (data: CreateQuoteData): Promise<AxiosResponse<ApiResponse<Quote>>> =>
    apiClient.post('/quotes', data),

  getByBooking: (bookingId: string): Promise<AxiosResponse<ApiResponse<Quote[]>>> =>
    apiClient.get(`/quotes/booking/${bookingId}`),

  accept: async (id: string): Promise<AxiosResponse<ApiResponse<Quote>>> => {
    try {
      return await apiClient.put(`/quotes/${id}/accept`);
    } catch (err: any) {
      if (err.response?.status === 404) {
        return await apiClient.post(`/quotes/${id}/respond`, { action: 'ACCEPT' });
      }
      throw err;
    }
  },

  reject: async (id: string, reason?: string): Promise<AxiosResponse<ApiResponse<Quote>>> => {
    try {
      return await apiClient.put(`/quotes/${id}/reject`, { reason });
    } catch (err: any) {
      if (err.response?.status === 404) {
        return await apiClient.post(`/quotes/${id}/respond`, { action: 'REJECT', reason });
      }
      throw err;
    }
  },
};

export const messageApi = {
  getByBooking: (bookingId: string, page = 1): Promise<AxiosResponse<ApiResponse<Message[]>>> =>
    apiClient.get(`/messages/${bookingId}`, { params: { page } }),

  send: (bookingId: string, content: string, attachments: string[] = []): Promise<AxiosResponse<ApiResponse<Message>>> =>
    apiClient.post(`/messages/${bookingId}`, { content, attachments }),
};

export const reviewApi = {
  create: (bookingId: string, rating: number, comment: string): Promise<AxiosResponse<ApiResponse<Review>>> =>
    apiClient.post(`/reviews/${bookingId}`, { bookingId, rating, comment }),

  getByProvider: (providerId: string, page = 1): Promise<AxiosResponse<ApiResponse<Review[]>>> =>
    apiClient.get(`/reviews/provider/${providerId}`, { params: { page } }),

  respond: (reviewId: string, text: string): Promise<AxiosResponse<ApiResponse<Review>>> =>
    apiClient.post(`/reviews/${reviewId}/response`, { text }),
};

export const notificationApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<Notification[]>>> =>
    apiClient.get('/notifications'),

  markAsRead: (id: string): Promise<AxiosResponse<ApiResponse<Notification>>> =>
    apiClient.put(`/notifications/${id}/read`),

  markAllAsRead: (): Promise<AxiosResponse<ApiResponse<{ count: number }>>> =>
    apiClient.put('/notifications/read-all'),
};

export interface AdminStats {
  totalCustomers: number;
  totalProviders: number;
  pendingVerifications: number;
  verifiedProviders: number;
  activeBookings: number;
  completedBookings: number;
  completedTransactions?: number;
  openDisputes: number;
}

export const adminApi = {
  getStats: (): Promise<AxiosResponse<ApiResponse<AdminStats>>> =>
    apiClient.get('/admin/stats'),

  getVerifications: (status?: string): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/verifications', { params: status ? { status } : {} }),

  reviewVerification: (id: string, status: VerificationStatus, rejectionReason?: string): Promise<AxiosResponse<ApiResponse<any>>> =>
    apiClient.patch(`/admin/verifications/${id}`, { status, rejectionReason }),

  getUsers: (role?: UserRole): Promise<AxiosResponse<ApiResponse<User[]>>> =>
    apiClient.get('/admin/users', { params: { role } }),

  getAllBookings: (): Promise<AxiosResponse<ApiResponse<Booking[]>>> =>
    apiClient.get('/admin/bookings'),

  getAuditLogs: (page = 1): Promise<AxiosResponse<ApiResponse<any[]>>> =>
    apiClient.get('/admin/audit-logs', { params: { page } }),

  getLeads: (params?: { category?: string; city?: string; status?: ProviderLeadStatus; search?: string }): Promise<AxiosResponse<ApiResponse<ProviderLead[]>>> =>
    apiClient.get('/admin/leads', { params }),

  updateLeadStatus: (id: string, data: { status: ProviderLeadStatus; notes?: string }): Promise<AxiosResponse<ApiResponse<ProviderLead>>> =>
    apiClient.patch(`/admin/leads/${id}`, data),
};
