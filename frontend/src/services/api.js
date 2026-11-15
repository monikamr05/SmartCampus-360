import axios from 'axios';

// ─── Determine base URL ───────────────────────────────────────────────────────
// Development : Vite proxy handles /api → localhost:5000 (no prefix needed)
// Production  : VITE_API_BASE_URL env var must be set to the Render backend URL
const rawBase = import.meta.env.VITE_API_BASE_URL?.trim();
const BASE_URL = rawBase
  ? `${rawBase.replace(/\/api\/?$/, '').replace(/\/+$/, '')}/api`
  : '/api';

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Request interceptor — attach Bearer token ────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('sc360_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — normalise error messages ─────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.join(', ') ||
      error.message ||
      'Something went wrong. Please try again.';

    error.message = message;

    // 401 outside auth endpoints → token expired, force re-login
    const url = error.config?.url || '';
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/profile');

    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('sc360_token');
      localStorage.removeItem('sc360_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
