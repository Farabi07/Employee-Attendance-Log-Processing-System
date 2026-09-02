import React from "react";
import { View, ActivityIndicator } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { T } from "../theme";
import { useAuth } from "../lib/auth";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";
import Organizations from "../screens/platform/Organizations";
import SubscribeGateScreen from "../screens/SubscribeGateScreen";

const Stack = createNativeStackNavigator();

// Ported from frontend/src/App.jsx's AppContent() gate cascade: loading ->
// not authenticated -> platform owner -> billing paywall -> app. Kept as
// the same imperative decision tree (picking which top-level Stack.Screen
// to mount) rather than encoding it as deep navigator state — each branch
// is registered under a stable name ("Auth", "PlatformOwner", "Subscribe",
// "App") so linking.ts's deep-link config (e.g. Auth.screens.Login) can
// still resolve into whichever branch is actually mounted.
//
// The web version's password-reset-link-in-URL check happens for free
// here: React Navigation's `linking` config routes a
// timetap://password/reset/confirm/:uid/:token deep link straight to that
// screen inside AuthStack on its own, no manual pathname parsing needed.
export default function RootNavigator() {
  const { loading, isAuthenticated, isPlatformOwner, isManagerOrModerator, billing } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: T.paper }}>
        <ActivityIndicator color={T.navy} size="large" />
      </View>
    );
  }

  const needsSubscription = isAuthenticated && !isPlatformOwner && billing && !billing.has_active_access;
  const role = isManagerOrModerator ? "manager" : "employee";

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : isPlatformOwner ? (
        <Stack.Screen name="PlatformOwner" component={Organizations} />
      ) : needsSubscription ? (
        <Stack.Screen name="Subscribe" component={SubscribeGateScreen} />
      ) : (
        <Stack.Screen name="App">{() => <AppTabs role={role} />}</Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
