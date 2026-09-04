import React from "react";
import { View, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { T, fonts } from "../theme";
import { EMP_NAV, MGR_NAV } from "./navConfig";
import AppHeader from "../components/AppHeader";

const Tab = createBottomTabNavigator();

// Replaces frontend/src/components/Sidebar.jsx's desktop-rail-vs-mobile-tab-bar
// duality — RN is phone-form-factor by default, so that split just goes
// away; EMP_NAV/MGR_NAV feed this Tab.Navigator directly instead of custom
// rail/bar JSX. role: "employee" | "manager" (moderators pass "manager" —
// same screens, same in-page permission checks as the web app).
export default function AppTabs({ role }: { role: "employee" | "manager" }) {
  const items = role === "employee" ? EMP_NAV : MGR_NAV;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: T.tealDeep,
        tabBarInactiveTintColor: T.muted,
        tabBarStyle: { borderTopColor: T.line, height: 64, paddingTop: 6, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: fonts.body.medium, fontSize: 10.5 },
      }}
    >
      {items.map((item) => (
        <Tab.Screen
          key={item.key}
          name={item.key}
          component={item.component}
          options={{
            title: item.label,
            header: () => <AppHeader title={item.label} />,
            tabBarIcon: ({ focused, color, size }) => (
              <View style={[styles.iconPill, focused && styles.iconPillActive]}>
                <item.icon color={focused ? T.tealDeep : color} size={size ?? 19} strokeWidth={focused ? 2.1 : 1.8} />
              </View>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconPill: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPillActive: {
    backgroundColor: T.tealBg,
  },
});
