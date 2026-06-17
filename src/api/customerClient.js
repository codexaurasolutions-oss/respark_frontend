import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5050/api/v1").replace(/\/+$/, "");
const STORAGE_KEY = "respark_customer_session";

export const customerApi = axios.create({ baseURL: API_BASE });

let refreshPromise = null;

export const getCustomerSession = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
};

export const setCustomerSession = (session) => {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY);
    delete customerApi.defaults.headers.common.Authorization;
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  customerApi.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;
};

export const bootstrapCustomerSession = () => {
  const session = getCustomerSession();
  if (session?.accessToken) {
    customerApi.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;
  }
  return session;
};

customerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response || error.response.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }
    const session = getCustomerSession();
    const refreshToken = session?.refreshToken;
    if (!refreshToken) {
      setCustomerSession(null);
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
      setCustomerSession({ ...session, accessToken: nextAccessToken });
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return customerApi(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      setCustomerSession(null);
      return Promise.reject(refreshError);
    }
  }
);

bootstrapCustomerSession();
