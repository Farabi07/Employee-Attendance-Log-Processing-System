import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";

import { AuthProvider } from "./src/lib/auth";
import { useAppFonts } from "./src/lib/useAppFonts";
import { ThemeProvider, useThemeSetting } from "./src/lib/ThemeContext";
import { linking } from "./src/navigation/linking";
import RootNavigator from "./src/navigation/RootNavigator";
import { ToastProvider } from "./src/components/Toast";

SplashScreen.preventAutoHideAsync().catch(() => {});

// Ported from frontend/src/main.jsx (mounts <AuthProvider><App/></AuthProvider>)
// + the top of frontend/src/App.jsx. Extra RN-only setup here: font
// loading gate (paired with the splash screen so there's no flash of the
// OS default font), GestureHandlerRootView (required at the app root by
// react-native-gesture-handler, a peer dep of React Navigation), and
// SafeAreaProvider (device notches/home-indicator insets).
export default function App() {
  const [fontsLoaded] = useAppFonts();
  // expo-updates' default behavior only applies a downloaded OTA update on
  // the *next* cold start after the one that fetched it — one "reopen"
  // after publishing isn't enough, which was a repeated source of "the app
  // isn't updating" reports. Checking + applying before first render means
  // a single reopen is enough to pick up a new update.
  const [updateChecked, setUpdateChecked] = useState(false);

  useEffect(() => {
    (async () => {
      if (!Updates.isEnabled) {
        setUpdateChecked(true);
        return;
      }
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
          return;
        }
      } catch {
        // Offline or the check failed — fall through and run what's already installed.
      }
      setUpdateChecked(true);
    })();
  }, []);

  const ready = fontsLoaded && updateChecked;

  const onLayoutRootView = useCallback(async () => {
    if (ready) {
      await SplashScreen.hideAsync();
    }
  }, [ready]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell />
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// Every top-level screen either sits under the navy AppHeader/AuthShell
// banner (tab screens, auth screens) or is a brief transient state
// (loading spinner, subscribe gate) — the banner is navy in both themes
// (see theme.js), so light status bar icons are correct regardless of
// scheme; there's no light-mode screen with a light banner to flip for.
function AppShell() {
  const { colors: T, scheme } = useThemeSetting();
  // React Navigation paints its own background during screen transitions
  // (the gap before a new screen's own SafeAreaView takes over) — theme it
  // to match, or dark mode gets a white flash on every navigation.
  const navTheme = {
    ...(scheme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: T.paper,
      card: T.card,
      text: T.ink,
      border: T.line,
      primary: T.navy,
    },
  };

  return (
    <View style={{ flex: 1, backgroundColor: T.paper }}>
      <NavigationContainer linking={linking} theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="light" />
    </View>
  );
}
