import { api } from "../api/client";

export const normalizeImageUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("https")) return url;
  const base = (api.defaults.baseURL || "").replace(/\/api\/v1$/, "");
  if (url.startsWith("http")) {
    return url.replace(/^http:\/\/127\.0\.0\.1:\d+/, base).replace(/^http:\/\/localhost:\d+/, base);
  }
  return `${base}${url}`;
};