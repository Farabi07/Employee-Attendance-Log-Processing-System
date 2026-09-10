import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";
import { lightColors, darkColors } from "../theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedScheme = "light" | "dark";
export type Colors = typeof lightColors;

const PREFERENCE_KEY = "theme_preference";

type ThemeContextValue = {
  colors: Colors;
  scheme: ResolvedScheme;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// System dark/light + a manual override, the same pattern most premium
// apps use (Settings > Appearance: Light/Dark/System). The preference is
// persisted the same way the auth token is (see lib/api.js) — SecureStore
// is already a dependency, no reason to pull in AsyncStorage just for one
// small string.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(PREFERENCE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    SecureStore.setItemAsync(PREFERENCE_KEY, pref).catch(() => {});
  }, []);

  const scheme: ResolvedScheme = preference === "system" ? (systemScheme === "dark" ? "dark" : "light") : preference;
  const colors = scheme === "dark" ? darkColors : lightColors;

  const value = useMemo(() => ({ colors, scheme, preference, setPreference }), [colors, scheme, preference, setPreference]);

  // Render with the light palette (the pre-dark-mode default) until the
  // stored preference is read, rather than flashing system-dark for a
  // frame on every cold start.
  if (!loaded) {
    return <ThemeContext.Provider value={{ colors: lightColors, scheme: "light", preference: "system", setPreference }}>{children}</ThemeContext.Provider>;
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Screens/components call this exactly like they used to import T — same
// key names, so `const T = useTheme();` is a drop-in replacement.
export function useTheme(): Colors {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx.colors;
}

// The Settings screen's Light/Dark/System picker uses this instead —
// needs the preference + setter + resolved scheme, not just the colors.
export function useThemeSetting() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeSetting must be used within a ThemeProvider");
  return ctx;
}
