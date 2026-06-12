export const normalizeIndianPhone = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0091")) digits = digits.slice(2);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return `+91${digits}`;
};

export const isValidIndianPhone = (value) => /^\+91[6-9]\d{9}$/.test(normalizeIndianPhone(value));

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
