// Ported from frontend/src/lib/api.js. Two real differences from the web
// version, both forced by the platform, not by choice:
//   1. Token storage is expo-secure-store (Keychain/Keystore), which is
//      async — so getToken/setToken (and therefore login/request) are
//      async here, where the web version was synchronous over
//      localStorage. Every caller needs to await these now.
//   2. BASE_URL comes from an EXPO_PUBLIC_ env var (Expo's own convention,
//      inlined at build time same as Vite's import.meta.env.VITE_*) rather
//      than import.meta.env, which doesn't exist in React Native.
import * as SecureStore from "expo-secure-store";

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;
const TOKEN_KEY = "attendance_access_token";

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token) {
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

let unauthorizedHandler = null;
export function setUnauthorizedHandler(fn) {
  unauthorizedHandler = fn;
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
    const token = await getToken();
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
  del: (path) => request(path, { method: "DELETE" }),
  login: (email, password) => request("/djoser/auth/jwt/create/", { method: "POST", body: { email, password }, auth: false }),
};
