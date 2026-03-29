/**
 * API Service
 *
 * Axios instance with automatic token management, refresh, and CSRF protection
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  const name = 'csrf-token=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookies = decodedCookie.split(';');
  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length);
    }
  }
  return null;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests (httpOnly auth + CSRF)
});

// Request interceptor - add CSRF token to state-changing requests
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Add CSRF token for non-GET requests
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (config.method && !safeMethods.includes(config.method.toUpperCase())) {
      const csrfToken = getCsrfToken();
      if (csrfToken && config.headers) {
        config.headers['x-csrf-token'] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip retry for auth endpoints or if already retried
    const isAuthEndpoint =
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        // Try to refresh the token via cookie-based endpoint
        // The refresh token is sent automatically via httpOnly cookie
        await api.post('/auth/refresh-token');

        // Retry the original request (new access token is now in cookie)
        return api(originalRequest);
      } catch (refreshError) {
        // Token refresh failed, redirect to login
        console.error('[API] Token refresh failed:', refreshError);

        // Clear any local state and redirect
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
