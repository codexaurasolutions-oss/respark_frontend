import axios from "axios";
import { normalizePhoneFields, validatePhoneFields } from "../utils/phone";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5050/api/v1").replace(/\/+$/, "");

export const api = axios.create({ baseURL: API_BASE });

let getSession = () => null;
let updateSession = () => {};
let clearSession = () => {};
let refreshPromise = null;

export const setToken = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

export const setAuthSessionHandlers = ({ getCurrentSession, onRefreshSuccess, onAuthFailure }) => {
  getSession = getCurrentSession;
  updateSession = onRefreshSuccess;
  clearSession = onAuthFailure;
};

api.interceptors.request.use((config) => {
  const session = getSession?.();
  const accessToken = session?.accessToken;
  config.headers = config.headers || {};
  if (accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  if (config.data && typeof config.data === "object" && !(config.data instanceof FormData)) {
    validatePhoneFields(config.data);
    config.data = normalizePhoneFields(config.data);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response || error.response.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const session = getSession?.();
    const refreshToken = session?.refreshToken;
    if (!refreshToken) {
      clearSession?.();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
      }
      const refreshResponse = await refreshPromise;
      refreshPromise = null;
      const nextAccessToken = refreshResponse.data.accessToken;
      updateSession?.(nextAccessToken);
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      clearSession?.();
      return Promise.reject(refreshError);
    }
  }
);
