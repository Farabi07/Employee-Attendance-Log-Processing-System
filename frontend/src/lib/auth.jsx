import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";
import { endpoints } from "./endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadBilling = useCallback(async (me) => {
    const isPlatformOwner = !!me?.is_admin && me?.organization == null;
    if (isPlatformOwner) {
      setBilling(null);
      return;
    }
    try {
      const status = await api.get(endpoints.billingStatus());
      setBilling(status);
    } catch {
      setBilling(null);
    }
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const me = await api.get(endpoints.djoserMe());
      setUser(me);
      await loadBilling(me);
      return me;
    } catch {
      setToken(null);
      setUser(null);
      setBilling(null);
      return null;
    }
  }, [loadBilling]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setUser(null);
      setBilling(null);
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

  const signup = async (payload) => {
    const data = await api.post(endpoints.signup(), payload);
    setToken(data.access);
    const me = await loadMe();
    if (!me) throw new Error("Could not load your account after signup");
    return me;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setBilling(null);
  };

  const isPlatformOwner = !!user?.is_admin && user?.organization == null;
  const isManager = user?.org_role === "manager";
  const isModerator = user?.org_role === "moderator";

  const value = {
    user,
    billing,
    loading,
    login,
    signup,
    logout,
    refreshBilling: () => loadBilling(user),
    isAuthenticated: !!user,
    isPlatformOwner,
    isManager,
    isModerator,
    isManagerOrModerator: isManager || isModerator,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
