import { normalizeCurrencyCode } from "./currency";

const SETTINGS_CACHE_PREFIX = "respark_salon_settings";
export const SETTINGS_UPDATED_EVENT = "respark-settings-updated";

export const getSalonSettingsCacheKey = (salonId) => `${SETTINGS_CACHE_PREFIX}:${salonId || "global"}`;

export const readSalonSettingsCache = (salonId) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(getSalonSettingsCacheKey(salonId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const writeSalonSettingsCache = (salonId, settings) => {
  if (typeof window === "undefined") return;
  const key = getSalonSettingsCacheKey(salonId);
  try {
    window.localStorage.setItem(key, JSON.stringify(settings || {}));
  } catch {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(SETTINGS_UPDATED_EVENT, {
      detail: { salonId: salonId || "global", settings: settings || {} }
    })
  );
};

export const extractCurrencyCodeFromSettings = (settings) =>
  normalizeCurrencyCode(
    settings?.advancedSettings?.genericSettings?.defaultCurrency ||
    settings?.advancedSettings?.genericSettings?.currency ||
      settings?.genericSettings?.defaultCurrency ||
      settings?.genericSettings?.currency ||
      settings?.defaultCurrency ||
      settings?.currency ||
      "INR"
  );
