import React, { useCallback, useEffect } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";

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

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
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
