import { api } from "../api/client";

const getFilenameFromDisposition = (headerValue, fallback) => {
  if (!headerValue) return fallback;

  // Try filename*=UTF-8''filename.ext
  const utf8Match = /filename\*=UTF-8''([^;'\n]+)/i.exec(headerValue);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (e) {
      // ignore decoding error
    }
  }

  // Try standard filename="filename.ext" or filename=filename.ext
  const match = /filename="?([^";\n]+)"?/i.exec(headerValue);
  if (match?.[1]) {
    return match[1].trim();
  }

  return fallback;
};

export const downloadFromApi = async (url, { params, fallbackFilename = "download.txt" } = {}) => {
  console.log("[downloadFromApi] Initiating download for:", url);
  let response;
  try {
    response = await api.get(url, {
      params,
      responseType: "blob"
    });
  } catch (error) {
    if (error.response?.data instanceof Blob && error.response.data.type?.includes("json")) {
      try {
        const text = await error.response.data.text();
        error.response.data = JSON.parse(text);
      } catch (e) {
        // ignore
      }
    }
    throw error;
  }

  // Safe fetch content-disposition from Axios headers (Axios v1.x uses headers.get())
  const disposition = response.headers?.get 
    ? response.headers.get("content-disposition") 
    : (response.headers?.["content-disposition"] || response.headers?.["Content-Disposition"]);
  
  console.log("[downloadFromApi] Content-Disposition header:", disposition);
  const filename = getFilenameFromDisposition(disposition, fallbackFilename);
  console.log("[downloadFromApi] Resolved filename:", filename);

  const contentType = response.headers?.get
    ? response.headers.get("content-type")
    : (response.headers?.["content-type"] || response.headers?.["Content-Type"]);
  
  const blob = response.data instanceof Blob 
    ? response.data 
    : new Blob([response.data], { type: contentType || "application/octet-stream" });

  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  
  document.body.appendChild(link);
  
  // Trigger click event
  link.dispatchEvent(new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window
  }));

  // Crucial: Defer removal and revocation to let the browser initiate the download with the set name.
  // Synchronous revocation causes the browser to fall back to the blob UUID as filename.
  setTimeout(() => {
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    console.log("[downloadFromApi] Revoked object URL and cleaned up link element");
  }, 150);
};

