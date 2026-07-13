import axios from "axios";
import { env } from "./env";

// Shared API client: injects the auth token on every request and
// funnels 401 responses into a single logout handler.
const api = axios.create({ baseURL: env.REACT_APP_API_URL });

let onUnauthorized = null;

// Registered by AuthProvider so a 401 anywhere logs the user out.
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["x-auth-token"] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);

// True when a request was canceled via AbortController — not a real error.
export const isCanceled = (error) => axios.isCancel(error) || error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

export default api;
