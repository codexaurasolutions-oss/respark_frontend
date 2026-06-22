/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import { formatCurrency, formatCurrencyNumber, getCurrencyMeta, normalizeCurrencyCode } from "../utils/currency";
import {
  extractCurrencyCodeFromSettings,
  readSalonSettingsCache,
  SETTINGS_UPDATED_EVENT,
  writeSalonSettingsCache
} from "../utils/salonSettings";

const SalonSettingsContext = createContext({
  currencyCode: "INR",
  currencyMeta: getCurrencyMeta("INR"),
  formatMoney: (value, options) => formatCurrency(value, "INR", options),
  formatNumber: (value, options) => formatCurrencyNumber(value, "INR", options),
  setCurrencyCode: () => {}
});

export const SalonSettingsProvider = ({ children }) => {
  const { auth } = useAuth();
  const salonId = auth?.salonId || auth?.membership?.salonId || auth?.membership?.salon?.id || "global";
  const initialCurrency = useMemo(() => {
    const cached = readSalonSettingsCache(salonId);
    return extractCurrencyCodeFromSettings(cached) || normalizeCurrencyCode(auth?.membership?.salon?.currency || "INR");
  }, [auth?.membership?.salon?.currency, salonId]);

  const [currencyCode, setCurrencyCode] = useState(initialCurrency);
  const [settings, setSettings] = useState(() => readSalonSettingsCache(salonId));

  useEffect(() => {
    setCurrencyCode(initialCurrency);
  }, [initialCurrency]);

  useEffect(() => {
    if (!auth || !auth.accessToken) return undefined;

    const permissions = auth.membership?.permissions || {};
    const hasSettingsPermission = Array.isArray(permissions.settings) && permissions.settings.includes("view");
    const isSuperAdmin = auth.user?.systemRole === "SUPER_ADMIN";

    if (!hasSettingsPermission && !isSuperAdmin) {
      return undefined;
    }

    let active = true;

    const syncSettings = async () => {
      try {
        const response = await api.get("/owner/settings");
        if (!active || !response.data) return;
        const nextCode = extractCurrencyCodeFromSettings(response.data);
        setCurrencyCode(nextCode);
        setSettings(response.data);
        writeSalonSettingsCache(salonId, response.data);
      } catch {
        // Keep cached currency if settings fetch fails.
      }
    };

    void syncSettings();

    const onSettingsUpdated = (event) => {
      if (!active) return;
      const detailSalonId = event?.detail?.salonId || "global";
      if (detailSalonId !== salonId) return;
      setCurrencyCode(extractCurrencyCodeFromSettings(event.detail.settings));
      setSettings(event.detail.settings);
    };

    window.addEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    return () => {
      active = false;
      window.removeEventListener(SETTINGS_UPDATED_EVENT, onSettingsUpdated);
    };
  }, [auth, salonId]);

  useEffect(() => {
    const ui = settings?.advancedSettings?.uiSettings || {};
    const sidebar = ui.sidebarColor || "";
    const button = ui.buttonColor || "";
    const navbar = ui.navbarColor || "";
    const font = ui.fontColor || "";

    const root = document.documentElement;

    if (sidebar) root.style.setProperty("--sidebar-bg", sidebar);
    else root.style.removeProperty("--sidebar-bg");

    if (button) {
      root.style.setProperty("--button-bg", button);
      root.style.setProperty("--button-bg-solid", button);
      root.style.setProperty("--accent", button);
    } else {
      root.style.removeProperty("--button-bg");
      root.style.removeProperty("--button-bg-solid");
      root.style.removeProperty("--accent");
    }

    if (navbar) root.style.setProperty("--navbar-bg", navbar);
    else root.style.removeProperty("--navbar-bg");

    if (font) root.style.setProperty("--font-color", font);
    else root.style.removeProperty("--font-color");
  }, [settings]);

  const value = useMemo(() => {
    const safeCode = normalizeCurrencyCode(currencyCode);
    return {
      currencyCode: safeCode,
      currencyMeta: getCurrencyMeta(safeCode),
      currencySymbol: getCurrencyMeta(safeCode).symbol,
      formatMoney: (amount, options) => formatCurrency(amount, safeCode, options),
      formatNumber: (amount, options) => formatCurrencyNumber(amount, safeCode, options),
      setCurrencyCode: (nextCode) => setCurrencyCode(normalizeCurrencyCode(nextCode))
    };
  }, [currencyCode]);

  return <SalonSettingsContext.Provider value={value}>{children}</SalonSettingsContext.Provider>;
};

export const useSalonSettings = () => useContext(SalonSettingsContext);
