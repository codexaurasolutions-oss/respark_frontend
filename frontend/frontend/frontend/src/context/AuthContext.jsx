/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";
import { api, setAuthSessionHandlers, setToken } from "../api/client";

const AuthCtx = createContext(null);
const STORAGE_KEY = "respark_auth";

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    setToken(parsed.accessToken);
    return parsed;
  });

  const persistState = (state) => {
    setAuth(state);
    if (state) {
      setToken(state.accessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      setToken(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = async (payload) => {
    const { data } = await api.post("/auth/login", payload);
    const state = { ...data, salonId: data.membership?.salonId || null };
    persistState(state);
    return data;
  };

  const refreshSession = (nextAccessToken) => {
    setAuth((current) => {
      if (!current) return current;
      const nextState = { ...current, accessToken: nextAccessToken };
      setToken(nextAccessToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return nextState;
    });
  };

  const clearSession = () => {
    persistState(null);
  };

  const logout = async () => {
    try {
      if (auth?.refreshToken) {
        await api.post("/auth/logout", { refreshToken: auth.refreshToken });
      }
    } catch {
      // Ignore logout transport errors and still clear local session.
    }
    clearSession();
  };

  setAuthSessionHandlers({
    getCurrentSession: () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    onRefreshSuccess: refreshSession,
    onAuthFailure: clearSession
  });

  const value = { auth, login, logout, clearSession };
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
};

export const useAuth = () => useContext(AuthCtx);
