import axios from 'axios';
import { useAuthStore } from './authStore'; // <-- Import the auth store

const api = axios.create({
  baseURL: 'https://api.pixelforgedeveloper.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- THIS IS THE UPGRADE ---
// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // Get the token from your Zustand store
    const token = useAuthStore.getState().token;

    // If the token exists, add it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
// --- END OF UPGRADE ---

export default api;