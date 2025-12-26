import React, { createContext, useState, useEffect, useContext } from "react";
import { env } from "../env";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

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
  }, [token]);

  const login = async (username, password) => {
    const response = await fetch(`${env.REACT_APP_API_URL}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      return { success: true };
    } else {
      return { success: false, message: data.message || "Login failed" };
    }
  };

  const signup = async (username, password, inviteCode) => {
    const response = await fetch(`${env.REACT_APP_API_URL}/api/auth/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password, inviteCode }),
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem("token", data.token);
      setToken(data.token);
      return { success: true };
    } else {
      return { success: false, message: data.message || "Signup failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
