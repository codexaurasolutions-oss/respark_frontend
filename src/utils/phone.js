export const normalizeIndianPhone = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+91") && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0091")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("091")) {
    digits = digits.slice(3);
  } else if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return `+91${digits}`;
};

export const isValidIndianPhone = (value) => /^\+91[6-9]\d{9}$/.test(normalizeIndianPhone(value));

export const extractIndianPhoneDigits = (value) => {
  const normalized = normalizeIndianPhone(value);
  return normalized.startsWith("+91") ? normalized.slice(3, 13) : "";
};

export const normalizeIndianPhoneInputDigits = (value) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";

  if (String(value ?? "").trim().startsWith("+91") && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0091")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("091")) {
    digits = digits.slice(3);
  } else if (digits.length > 10 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return digits.slice(0, 10);
};

const phoneKeyPattern = /(^|_)(phone|mobile|whatsapp)(number)?$/i;
const phoneKeys = new Set(["phone", "customerPhone", "supportPhone", "whatsappNumber", "alternatePhone"]);

export const isPhoneLikeKey = (key) => phoneKeys.has(key) || phoneKeyPattern.test(key);

export const normalizePhoneFields = (value, key = "") => {
  if (Array.isArray(value)) return value.map((item) => normalizePhoneFields(item));
  if (!value || typeof value !== "object") {
    if (!key || !isPhoneLikeKey(key) || value == null || value === "") return value;
    return normalizeIndianPhone(value);
  }
  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [entryKey, normalizePhoneFields(entryValue, entryKey)])
  );
};

export const validatePhoneFields = (value, path = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validatePhoneFields(item, [...path, index]));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, entryValue]) => {
    const nextPath = [...path, key];
    if (isPhoneLikeKey(key) && entryValue !== undefined && entryValue !== null && entryValue !== "" && !isValidIndianPhone(entryValue)) {
      const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
      throw new Error(`${label} must be a valid Indian +91 mobile number`);
    }
    validatePhoneFields(entryValue, nextPath);
  });
};
