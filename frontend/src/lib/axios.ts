import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL, STORAGE_KEYS } from '@/config/constants';
import toast from 'react-hot-toast';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * Extract error message from various error response formats
 */
const extractErrorMessage = (data: any): string => {
  // Check for validation errors array
  if (data.errors && Array.isArray(data.errors)) {
    const errors = data.errors.map((err: any) => {
      if (typeof err === 'string') return err;
      if (err.message) return err.message;
      if (err.msg) return err.msg;
      return JSON.stringify(err);
    });
    return errors.length === 1 ? errors[0] : errors.join(', ');
  }

  // Check for message field
  if (data.message) {
    return data.message;
  }

  // Check for error field
  if (data.error) {
    return typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error);
  }

  return 'An unexpected error occurred';
};

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const { response } = error;

    // Network error
    if (!response) {
      const message = 'Network error. Please check your internet connection.';
      toast.error(message);
      return Promise.reject({
        ...error,
        message,
      });
    }

    const { status, data } = response;
    const isAuthEndpoint = error.config?.url?.includes('/auth');

    // Handle specific error statuses
    switch (status) {
      case 401:
        // Unauthorized - Clear tokens and redirect to login
        localStorage.removeItem(STORAGE_KEYS.TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);

        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
          toast.error('Session expired. Please login again.');
        }
        break;

      case 403: {
        const forbiddenMsg = extractErrorMessage(data) || 'You do not have permission to perform this action.';
        toast.error(forbiddenMsg);
        break;
      }

      case 404:
        if (!isAuthEndpoint) {
          const notFoundMsg = extractErrorMessage(data) || 'Resource not found.';
          toast.error(notFoundMsg);
        }
        break;

      case 422:
      case 400:
        // Validation errors - Don't show toast for auth endpoints (forms will handle it)
        if (!isAuthEndpoint) {
          const validationMsg = extractErrorMessage(data);
          toast.error(validationMsg);
        }
        break;

      case 429: {
        const rateLimitMsg = extractErrorMessage(data) || 'Too many requests. Please try again later.';
        toast.error(rateLimitMsg);
        break;
      }

      case 500:
      case 502:
      case 503: {
        const serverMsg = extractErrorMessage(data) || 'Server error. Please try again later.';
        toast.error(serverMsg);
        break;
      }

      default:
        if (!isAuthEndpoint) {
          const defaultMsg = extractErrorMessage(data);
          toast.error(defaultMsg);
        }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
