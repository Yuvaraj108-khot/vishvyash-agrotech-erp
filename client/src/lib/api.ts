/**
 * API client — automatically resolves the correct base URL:
 *
 * Development (npm run dev):  Vite proxy → forwards /api to localhost:5000
 * Production (served from server/public): /api (same-origin, no prefix needed)
 *
 * VITE_API_URL in .env:
 *   - Development: Leave empty (uses Vite proxy) OR set to Render URL while testing
 *   - Production build for office server: Must be empty (built via .env.production)
 */

import axios from 'axios';

// In production build VITE_API_URL should be empty — API calls go to /api (same origin).
// In dev, VITE_API_URL can be set to an explicit host for testing against Render.
const BASE_URL = ((import.meta as any).env?.VITE_API_URL || '') + '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30 second default timeout
});

// Request interceptor — attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
