import { createContext, useState, useEffect, useContext, useCallback } from "react";
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
    const fetchUser = async (authToken) => {
      try {
        const response = await fetch(`${env.REACT_APP_API_URL}/api/auth/me`, {
          headers: {
            "x-auth-token": authToken,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          logout();
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      // Verify token and get user info
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, [token, logout]);

  // Shared login/signup POST: network failures and non-JSON responses
  // surface as a message instead of an unhandled rejection.
  const authenticate = async (path, body, fallbackMessage) => {
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
        localStorage.setItem("token", data.token);
        setToken(data.token);
        return { success: true };
      }
      // Express-validator errors arrive as { error, details: [{ msg }] }.
      const message = data.message || data.details?.[0]?.msg || data.error || fallbackMessage;
      return { success: false, message };
    } catch {
      return { success: false, message: "Could not reach the server. Please try again." };
    }
  };

  const login = (username, password) => authenticate("/api/auth/login", { username, password }, "Login failed");

  const signup = (username, password, inviteCode) => authenticate("/api/auth/signup", { username, password, inviteCode }, "Signup failed");

  return <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
