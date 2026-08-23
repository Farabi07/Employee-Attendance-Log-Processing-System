import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get("/djoser/auth/users/me/");
      setUser(me);
      return me;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
    });

    if (getToken()) {
      loadMe().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [loadMe]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    setToken(data.access);
    const me = await loadMe();
    if (!me) throw new Error("Could not load your account after login");
    return me;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isManager: !!user?.is_admin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
