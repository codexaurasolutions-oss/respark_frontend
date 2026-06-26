const today = () => new Date().toISOString().slice(0, 10);
const now = () => {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const dateMax = {
  today: today(),
  dob: today(),
  joining: today(),
  purchase: today(),
};

export const dateMin = {
  today: today(),
  now: now(),
};

export const clampDateRange = (start, end) => {
  if (start && end && start > end) return { start: end, end: start };
  return { start, end };
};

export const maxForStart = (endDate) => endDate || undefined;
export const minForEnd = (startDate) => startDate || undefined;
