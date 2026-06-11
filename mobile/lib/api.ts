import axios from 'axios';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://campuse-service.onrender.com/api';

const isWeb = Platform.OS === 'web';

const getToken = async (): Promise<string | null> => {
  if (isWeb) return typeof localStorage !== 'undefined' ? localStorage.getItem('campushub_token') : null;
  try { return await SecureStore.getItemAsync('campushub_token'); } catch { return null; }
};

const deleteToken = async () => {
  if (isWeb) { if (typeof localStorage !== 'undefined') localStorage.removeItem('campushub_token'); return; }
  await SecureStore.deleteItemAsync('campushub_token').catch(() => {});
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Storage not available in this context
  }
  return config;
});

// Handle 401 globally — stores handle navigation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await deleteToken();
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
  refresh: (refreshToken: string) => api.post('/auth/refresh', { refreshToken }),
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

// Notifications
export const notificationsAPI = {
  get: () => api.get('/notifications'),
  markRead: (id: string) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  clearAll: () => api.delete('/notifications'),
};

// Messages
export const messagesAPI = {
  get: (orderId: string) => api.get(`/messages/${orderId}`),
  getMessages: (orderId: string) => api.get(`/messages/${orderId}`),
  send: (orderId: string, content: string) => api.post(`/messages/${orderId}`, { content }),
  sendMessage: (orderId: string, data: { content: string; type?: string }) =>
    api.post(`/messages/${orderId}`, data),
};

export default api;
