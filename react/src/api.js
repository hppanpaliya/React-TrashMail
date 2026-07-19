import axios from "axios";
import { env } from "./env";

// Requests to these paths are part of the auth handshake itself; a 401 here
// means "bad credentials", not "session expired", so it must NOT trigger the
// global logout side effect.
const AUTH_PATH_PREFIX = "/api/auth/";
const DEFAULT_TIMEOUT_MS = Number(env.REACT_APP_API_TIMEOUT_MS) || 15000;

if (!env.REACT_APP_API_URL) {
  // Not fatal (valid for same-origin deploys) but usually a misconfiguration.
  console.warn("[api] REACT_APP_API_URL is empty; requests will target the current origin.");
}

// Shared API client: injects the auth token on every request and
// funnels session-expiry 401s into a single logout handler.
const api = axios.create({
  baseURL: env.REACT_APP_API_URL,
  timeout: DEFAULT_TIMEOUT_MS,
});

let onUnauthorized = null;

// Registered by AuthProvider so a session-expiry 401 anywhere logs the user out.
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// Single point of token access — swap this out when migrating off localStorage.
const getToken = () => localStorage.getItem("token");

const isAuthRequest = (config) => typeof config?.url === "string" && config.url.includes(AUTH_PATH_PREFIX);

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers["x-auth-token"] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only log out for a real session failure: a token exists and this is not
    // the login/signup call. 403 is deliberately excluded — the backend uses
    // it for authorization denials on valid sessions (e.g. non-admin).
    if (error.response?.status === 401 && getToken() && !isAuthRequest(error.config) && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

// True when a request was canceled via AbortController — not a real error.
export const isCanceled = (error) => axios.isCancel(error) || error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

export default api;
