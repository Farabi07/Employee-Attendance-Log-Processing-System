export const BASE_URL = import.meta.env.VITE_API_BASE_URL;
const TOKEN_KEY = "attendance_access_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
}

// Lets lib/chatSocket.js reuse the exact same "sign the user out" flow a
// 401 triggers here, when the chat WebSocket closes with code 4001 (bad or
// expired token) — one definition of "the token is no good" instead of two.
export function triggerUnauthorized() {
  unauthorizedHandler?.();
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function extractMessage(data) {
  if (!data) return "Request failed";
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const firstKey = Object.keys(data)[0];
  if (firstKey) {
    const val = data[firstKey];
    return `${firstKey}: ${Array.isArray(val) ? val.join(", ") : val}`;
  }
  return "Request failed";
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const headers = {};
  if (body !== undefined && !isFormData) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  if (res.status === 401 && auth) {
    unauthorizedHandler?.();
  }

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(extractMessage(data), res.status, data);
  }
  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  patch: (path, body) => request(path, { method: "PATCH", body }),
  del: (path) => request(path, { method: "DELETE" }),
  login: (email, password) => request("/djoser/auth/jwt/create/", { method: "POST", body: { email, password }, auth: false }),
};

export async function fetchBlobUrl(path) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError("Failed to load image", res.status, null);
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// Some endpoints (Djoser's /me, which DRF builds with request context) return
// an already-absolute image URL; others (our own hand-rolled /account/me/)
// return a bare MEDIA_URL-relative path. Normalize both to a usable <img src>
// instead of assuming one shape and silently breaking on the other.
export function mediaUrl(path) {
  if (!path) return undefined;
  return /^https?:\/\//.test(path) ? path : `${BASE_URL}${path}`;
}

export async function downloadFile(path, filename) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(extractMessage(data), res.status, data);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Same trick as downloadFile — fetch as a blob and click a synthetic
// <a download>, so it actually saves instead of just navigating to the file
// (a plain <a href> cross-origin download attribute is ignored by browsers).
// Takes an already-absolute URL rather than a BASE_URL-relative path, since
// chat attachments (chat/serializers.py's get_attachment) come back as full
// URLs that may point straight at Cloudinary in production, not this API —
// the auth header is only useful (and only sent) for our own origin.
export async function downloadUrl(fileUrl, filename) {
  const sameOrigin = fileUrl.startsWith(BASE_URL);
  const token = sameOrigin ? getToken() : null;
  const res = await fetch(fileUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError("Could not download the file", res.status, null);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
