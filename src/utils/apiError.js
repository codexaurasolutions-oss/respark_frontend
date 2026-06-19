export const formatApiError = (error, fallback = "Something went wrong.") => {
  if (error?.name === "SyntaxError") {
    return error.message || fallback;
  }

  const data = error?.response?.data;
  if (!data) return error?.message || fallback;

  if (Array.isArray(data.issues) && data.issues.length) {
    return data.issues
      .map((issue) => {
        const field = issue?.field ? `${issue.field}: ` : "";
        const msg = issue?.message || "Invalid value";
        return `${field}${msg}`;
      })
      .filter(Boolean)
      .join("\n• ");
  }

  return data.message || fallback;
};
