import { createContext, useState, useEffect, useContext, useCallback, useMemo } from "react";
import { env } from "../env";
import { setUnauthorizedHandler } from "../api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }, []);

  // Any 401 from the shared API client logs the user out;
  // PrivateRoute then redirects to /login.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    // Re-verify: hold route guards on the loader until the user is known,
    // otherwise a post-login render pass sees token set but user null and
    // fail-closed guards would bounce a legitimate admin.
    setLoading(true);

    // ignore + abort: a late /me response for a superseded token must never
    // resurrect a logged-out session.
    let ignore = false;
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${env.REACT_APP_API_URL}/api/auth/me`, {
          headers: { "x-auth-token": token },
          signal: controller.signal,
        });
        if (ignore) return;
        if (response.ok) {
          const userData = await response.json();
          if (!ignore) setUser(userData);
        } else {
          logout();
        }
      } catch (error) {
        if (error.name === "AbortError" || ignore) return; // expected on token change/unmount
        console.error("Error fetching user:", error);
        logout();
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [token, logout]);

  // Shared login/signup POST: network failures and non-JSON responses
  // surface as a message instead of an unhandled rejection.
  const authenticate = useCallback(async (path, body, fallbackMessage) => {
    try {
      const response = await fetch(`${env.REACT_APP_API_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        // Guard: setItem(undefined) would store the literal string "undefined"
        // and make the app appear logged in with a garbage token.
        if (typeof data.token === "string" && data.token) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          return { success: true };
        }
        return { success: false, message: fallbackMessage };
      }
      // Express-validator errors arrive as { error, details: [{ msg }] }.
      const message = data.message || data.details?.[0]?.msg || data.error || fallbackMessage;
      return { success: false, message };
    } catch {
      return { success: false, message: "Could not reach the server. Please try again." };
    }
  }, []);

  const login = useCallback((username, password) => authenticate("/api/auth/login", { username, password }, "Login failed"), [authenticate]);

  const signup = useCallback(
    (username, password, inviteCode) => authenticate("/api/auth/signup", { username, password, inviteCode }, "Signup failed"),
    [authenticate]
  );

  const value = useMemo(() => ({ user, token, loading, login, signup, logout }), [user, token, loading, login, signup, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
