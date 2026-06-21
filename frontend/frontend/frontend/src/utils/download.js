import { api } from "../api/client";

const getFilenameFromDisposition = (headerValue, fallback) => {
  const match = /filename="?([^"]+)"?/i.exec(headerValue || "");
  return match?.[1] || fallback;
};

export const downloadFromApi = async (url, { params, fallbackFilename = "download.txt" } = {}) => {
  const response = await api.get(url, {
    params,
    responseType: "blob"
  });

  const disposition = response.headers["content-disposition"];
  const filename = getFilenameFromDisposition(disposition, fallbackFilename);
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};
