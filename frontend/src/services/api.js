import axios from 'axios';
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
export const authApi = {
    loginWithGoogle: (idToken, targetRole) => apiClient.post('/auth/google', { idToken, targetRole }),
    getMe: () => apiClient.get('/auth/me'),
    onboard: (data) => apiClient.post('/auth/onboard', data),
    logout: () => apiClient.post('/auth/logout'),
};
export const userApi = {
    getProfile: () => apiClient.get('/users/profile'),
    updateProfile: (data) => apiClient.put('/users/profile', data),
};
export const categoryApi = {
    getAll: () => apiClient.get('/categories'),
    create: (data) => apiClient.post('/categories', data),
    update: (id, data) => apiClient.put(`/categories/${id}`, data),
};
export const providerApi = {
    search: (params) => apiClient.get('/providers', { params }),
    getById: (id) => apiClient.get(`/providers/${id}`),
    getMyProfile: () => apiClient.get('/providers/profile'),
    updateMyProfile: (data) => apiClient.put('/providers/profile', data),
    submitVerification: (data) => apiClient.post('/providers/verification', data),
};
export const bookingApi = {
    create: (data) => apiClient.post('/bookings', data),
    getMyBookings: (role, status) => apiClient.get('/bookings', { params: { role, status } }),
    getById: (id) => apiClient.get(`/bookings/${id}`),
    updateStatus: async (id, status, cancellationReason) => {
        try {
            return await apiClient.put(`/bookings/${id}/status`, { status, cancellationReason });
        }
        catch (err) {
            if (err.response?.status === 404 || err.response?.status === 405) {
                return await apiClient.patch(`/bookings/${id}/status`, { status, cancellationReason });
            }
            throw err;
        }
    },
    requestCompletion: async (id) => {
        try {
            return await apiClient.post(`/bookings/${id}/request-completion`);
        }
        catch (err) {
            if (err.response?.status === 404) {
                return await apiClient.put(`/bookings/${id}/status`, { status: 'COMPLETION_PENDING' });
            }
            throw err;
        }
    },
    confirmCompletion: async (id) => {
        try {
            return await apiClient.post(`/bookings/${id}/confirm-completion`);
        }
        catch (err) {
            if (err.response?.status === 404) {
                return await apiClient.put(`/bookings/${id}/status`, { status: 'COMPLETED' });
            }
            throw err;
        }
    },
};
export const quoteApi = {
    create: (data) => apiClient.post('/quotes', data),
    getByBooking: (bookingId) => apiClient.get(`/quotes/booking/${bookingId}`),
    accept: async (id) => {
        try {
            return await apiClient.put(`/quotes/${id}/accept`);
        }
        catch (err) {
            if (err.response?.status === 404) {
                return await apiClient.post(`/quotes/${id}/respond`, { action: 'ACCEPT' });
            }
            throw err;
        }
    },
    reject: async (id, reason) => {
        try {
            return await apiClient.put(`/quotes/${id}/reject`, { reason });
        }
        catch (err) {
            if (err.response?.status === 404) {
                return await apiClient.post(`/quotes/${id}/respond`, { action: 'REJECT', reason });
            }
            throw err;
        }
    },
};
export const messageApi = {
    getByBooking: (bookingId, page = 1) => apiClient.get(`/messages/${bookingId}`, { params: { page } }),
    send: (bookingId, content, attachments = []) => apiClient.post(`/messages/${bookingId}`, { content, attachments }),
};
export const reviewApi = {
    create: (bookingId, rating, comment) => apiClient.post(`/reviews/${bookingId}`, { bookingId, rating, comment }),
    getByProvider: (providerId, page = 1) => apiClient.get(`/reviews/provider/${providerId}`, { params: { page } }),
    respond: (reviewId, text) => apiClient.post(`/reviews/${reviewId}/response`, { text }),
};
export const notificationApi = {
    getAll: () => apiClient.get('/notifications'),
    markAsRead: (id) => apiClient.put(`/notifications/${id}/read`),
    markAllAsRead: () => apiClient.put('/notifications/read-all'),
};
export const adminApi = {
    getStats: () => apiClient.get('/admin/stats'),
    getVerifications: (status) => apiClient.get('/admin/verifications', { params: status ? { status } : {} }),
    reviewVerification: (id, status, rejectionReason) => apiClient.patch(`/admin/verifications/${id}`, { status, rejectionReason }),
    getUsers: (role) => apiClient.get('/admin/users', { params: { role } }),
    getAllBookings: () => apiClient.get('/admin/bookings'),
    getAuditLogs: (page = 1) => apiClient.get('/admin/audit-logs', { params: { page } }),
    getLeads: (params) => apiClient.get('/admin/leads', { params }),
    updateLeadStatus: (id, data) => apiClient.patch(`/admin/leads/${id}`, data),
};
