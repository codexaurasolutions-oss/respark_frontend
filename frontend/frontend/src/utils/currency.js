const LEGACY_CURRENCY_MAP = {
  "₹": "INR",
  "RS": "INR",
  "RS.": "INR",
  INR: "INR",
  PKR: "PKR",
  "₨": "PKR",
  "$": "USD",
  USD: "USD",
  "€": "EUR",
  EUR: "EUR",
  "£": "GBP",
  GBP: "GBP",
  AED: "AED",
  SAR: "SAR"
};

export const normalizeCurrencyCode = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "INR";
  return LEGACY_CURRENCY_MAP[raw] || raw;
};

export const getCurrencyMeta = (value) => {
  const code = normalizeCurrencyCode(value);

  switch (code) {
    case "USD":
      return { code, locale: "en-US", symbol: "$" };
    case "EUR":
      return { code, locale: "de-DE", symbol: "€" };
    case "GBP":
      return { code, locale: "en-GB", symbol: "£" };
    case "AED":
      return { code, locale: "en-AE", symbol: "AED" };
    case "SAR":
      return { code, locale: "en-SA", symbol: "SAR" };
    case "PKR":
      return { code, locale: "en-PK", symbol: "₨" };
    case "INR":
    default:
      return { code: "INR", locale: "en-IN", symbol: "₹" };
  }
};

export const formatCurrency = (value, currencyCode = "INR", options = {}) => {
  const amount = Number(value || 0);
  const meta = getCurrencyMeta(currencyCode);
  const formatter = new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: meta.code,
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0
  });
  return formatter.format(amount);
};

export const formatCurrencyNumber = (value, currencyCode = "INR", options = {}) => {
  const amount = Number(value || 0);
  const meta = getCurrencyMeta(currencyCode);

  return new Intl.NumberFormat(meta.locale, {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0
  }).format(amount);
};

export const getCurrencySymbol = (currencyCode = "INR") => {
  const meta = getCurrencyMeta(currencyCode);
  return meta.symbol;
};

export const formatCurrencyWithLabel = (label, value, currencyCode = "INR", options = {}) =>
  `${label} ${formatCurrency(value, currencyCode, options)}`;
