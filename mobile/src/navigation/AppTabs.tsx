import React from "react";
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
        tabBarStyle: { borderTopColor: T.line },
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
            tabBarIcon: ({ color, size }) => <item.icon color={color} size={size ?? 20} strokeWidth={1.8} />,
          }}
        />
      ))}
    </Tab.Navigator>
  );
}
