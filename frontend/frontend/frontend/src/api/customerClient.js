import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://resparkbackend-production-ba7b.up.railway.app/api/v1";
const STORAGE_KEY = "respark_customer_session";

export const customerApi = axios.create({ baseURL: API_BASE });

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

bootstrapCustomerSession();
