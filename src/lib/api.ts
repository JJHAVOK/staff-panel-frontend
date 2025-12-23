import axios from 'axios';
import { useAuthStore } from './authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.pixelforgedeveloper.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const state = useAuthStore.getState();
  const token = state.token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 🛡️ ANTI-ZOMBIE (CORS SAFE): Add timestamp to all GET requests
  // This forces the browser to fetch fresh data without using forbidden headers
  if (config.method === 'get') {
    config.params = { ...config.params, _t: Date.now() };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const store = useAuthStore.getState();
      if (store.token) {
          store.clearAuth();
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
