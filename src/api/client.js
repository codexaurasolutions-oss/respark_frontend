import axios from "axios";
import { normalizePhoneFields, validatePhoneFields } from "../utils/phone";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://resparkbackend-production-ba7b.up.railway.app/api/v1";

export const api = axios.create({ baseURL: API_BASE });

let getSession = () => null;
let updateSession = () => {};
let clearSession = () => {};
let refreshPromise = null;

let sessionBlocked = false;

export const unblockSession = () => {
  sessionBlocked = false;
};

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
  const url = config.url || "";
  const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/register") || url.includes("/auth/forgot-password") || url.includes("/auth/reset-password");
  if (sessionBlocked && !isAuthEndpoint) {
    return Promise.reject(Object.assign(new Error("Session expired"), { __sessionBlocked: true }));
  }

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
    if (error?.__sessionBlocked) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (!error.response || error.response.status !== 401 || originalRequest?._retry) {
      if (error.response?.status === 401 && !originalRequest?._retry) {
        sessionBlocked = true;
        clearSession?.();
      }
      return Promise.reject(error);
    }

    const session = getSession?.();
    const refreshToken = session?.refreshToken;
    if (!refreshToken) {
      sessionBlocked = true;
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
      sessionBlocked = true;
      clearSession?.();
      return Promise.reject(refreshError);
    }
  }
);
