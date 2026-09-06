import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";

import { AuthProvider } from "./src/lib/auth";
import { useAppFonts } from "./src/lib/useAppFonts";
import { T } from "./src/theme";
import { linking } from "./src/navigation/linking";
import RootNavigator from "./src/navigation/RootNavigator";

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
        <View style={{ flex: 1, backgroundColor: T.paper }}>
          <AuthProvider>
            <NavigationContainer linking={linking}>
              <RootNavigator />
            </NavigationContainer>
          </AuthProvider>
          <StatusBar style="dark" />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
