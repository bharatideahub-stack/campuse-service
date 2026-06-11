import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('campushub_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('campushub_token');
      localStorage.removeItem('campushub_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data: { name: string; email: string; password: string; hostel?: string; phone?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateFcmToken: (fcmToken: string) => api.post('/auth/fcm-token', { fcmToken }),
};

// Orders
export const ordersAPI = {
  getAll: (params?: Record<string, string | number>) => api.get('/orders', { params }),
  getMy: (params?: Record<string, string | number>) => api.get('/orders/my', { params }),
  getById: (id: string) => api.get(`/orders/${id}`),
  create: (data: Record<string, unknown>) => api.post('/orders', data),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch(`/orders/${id}/status`, { status, note }),
  accept: (id: string) => api.post(`/orders/${id}/accept`),
  getChat: (id: string) => api.get(`/orders/${id}/chat`),
  sendChat: (id: string, message: string) => api.post(`/orders/${id}/chat`, { message }),
};

// Bids
export const bidsAPI = {
  place: (orderId: string, data: { price: number; message?: string; estimatedTime?: number }) =>
    api.post(`/bids/${orderId}`, data),
  getByOrder: (orderId: string) => api.get(`/bids/${orderId}`),
  accept: (orderId: string, bidId: string) => api.patch(`/bids/${orderId}/${bidId}/accept`),
};

// Users
export const usersAPI = {
  getProfile: (id: string) => api.get(`/users/${id}`),
  updateProfile: (data: Record<string, string>) => api.patch('/users/me', data),
  toggleAvailability: (isAvailable: boolean, location?: { coordinates: [number, number] }) =>
    api.patch('/users/me/availability', { isAvailable, location }),
  updateLocation: (lng: number, lat: number) => api.patch('/users/me/location', { lng, lat }),
  getMyStats: () => api.get('/users/me/stats'),
  getNearbyProviders: (lat: number, lng: number, radius?: number) =>
    api.get('/users/providers/nearby', { params: { lat, lng, radius } }),
  getAllUsers: (params?: Record<string, string | number>) => api.get('/users', { params }),
  blockUser: (userId: string) => api.post(`/users/${userId}/block`, {}),
  unblockUser: (userId: string) => api.delete(`/users/${userId}/block`),
  getBlockedUsers: () => api.get('/users/me/blocked'),
};

// Reviews
export const reviewsAPI = {
  create: (data: { toUser: string; orderId: string; rating: number; comment?: string }) =>
    api.post('/reviews', data),
  createReview: (data: { toUser: string; orderId: string; rating: number; comment?: string }) =>
    api.post('/reviews', data),
  getUserReviews: (userId: string, page?: number) =>
    api.get(`/reviews/${userId}`, { params: { page } }),
};

// Wallet
export const walletAPI = {
  get: () => api.get('/wallet'),
  addFunds: (amount: number) => api.post('/wallet/add', { amount }),
  getEarnings: (period?: number) => api.get('/wallet/earnings', { params: { period } }),
};

// Messages
export const messagesAPI = {
  get: (orderId: string) => api.get(`/messages/${orderId}`),
  getMessages: (orderId: string) => api.get(`/messages/${orderId}`),
  send: (orderId: string, content: string) => api.post(`/messages/${orderId}`, { content }),
  sendMessage: (orderId: string, data: { content: string; type?: string }) =>
    api.post(`/messages/${orderId}`, data),
};

// Admin
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getHealth: () => api.get('/admin/health'),
  getTransactions: (params?: Record<string, string | number>) =>
    api.get('/admin/transactions', { params }),
  toggleBanUser: (userId: string, ban: boolean) =>
    api.patch(`/admin/users/${userId}/ban`, { ban }),
};

export default api;
