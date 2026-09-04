// Ported from frontend/src/lib/auth.jsx. Same shape/behavior as the web
// version — same state, same role booleans, same useAuth() context — with
// two differences forced by the platform:
//   1. getToken() is async (SecureStore), so the token-exists check on
//      mount has to await it instead of reading localStorage synchronously.
//   2. The web version's "confirm a Stripe Checkout session directly if we
//      just landed back here with ?billing=success&session_id=..." logic is
//      dropped — there's no equivalent URL to read on a bare app launch in
//      React Native. That confirm call moves to wherever the Phase 3
//      Stripe return handler (expo-web-browser + a custom-scheme deep
//      link) actually lands, not here.
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { api, getToken, setToken, setUnauthorizedHandler } from "./api";
import { endpoints } from "./endpoints";
import { registerForPushNotifications } from "./push";

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
      // Fire-and-forget — covers both a fresh login/signup and an
      // app restart with an existing token, in one place. Never blocks
      // the auth flow if it fails (no EAS project id yet, permission
      // denied, offline, etc.) — see lib/push.js.
      registerForPushNotifications();
      return me;
    } catch {
      await setToken(null);
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

    (async () => {
      const token = await getToken();
      if (token) {
        await loadMe();
      }
      setLoading(false);
    })();
  }, [loadMe]);

  const login = async (email, password) => {
    const data = await api.login(email, password);
    await setToken(data.access);
    const me = await loadMe();
    if (!me) throw new Error("Could not load your account after login");
    return me;
  };

  const signup = async (payload) => {
    const data = await api.post(endpoints.signup(), payload);
    await setToken(data.access);
    const me = await loadMe();
    if (!me) throw new Error("Could not load your account after signup");
    return me;
  };

  const logout = async () => {
    await setToken(null);
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
    refreshUser: loadMe,
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
