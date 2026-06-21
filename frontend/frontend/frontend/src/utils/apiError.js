export const formatApiError = (error, fallback = "Something went wrong.") => {
  if (error?.name === "SyntaxError") {
    return error.message || fallback;
  }

  const data = error?.response?.data;
  if (!data) return fallback;

  if (Array.isArray(data.issues) && data.issues.length) {
    return data.issues
      .map((issue) => issue?.field ? `${issue.field}: ${issue.message}` : issue?.message)
      .filter(Boolean)
      .join(" | ");
  }

  return data.message || fallback;
};
