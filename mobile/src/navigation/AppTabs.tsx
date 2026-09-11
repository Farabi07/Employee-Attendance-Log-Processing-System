import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { EMP_NAV, MGR_NAV } from "./navConfig";
import AppHeader from "../components/AppHeader";
import GradientBackground from "../components/GradientBackground";
import WhatsNewModal from "../components/WhatsNewModal";

const Tab = createBottomTabNavigator();

// Replaces frontend/src/components/Sidebar.jsx's desktop-rail-vs-mobile-tab-bar
// duality — RN is phone-form-factor by default, so that split just goes
// away; EMP_NAV/MGR_NAV feed this Tab.Navigator directly instead of custom
// rail/bar JSX. role: "employee" | "manager" (moderators pass "manager" —
// same screens, same in-page permission checks as the web app).
export default function AppTabs({ role }: { role: "employee" | "manager" }) {
  const T = useTheme();
  const items = role === "employee" ? EMP_NAV : MGR_NAV;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        tabBar: {
          // Solid navy chrome, same as AppHeader — kept as the constant
          // `navy` token (not `navyDeep`, which flips to a light color in
          // dark mode for text-on-tint use) so this stays a dark bar with
          // white icons/labels in both themes.
          backgroundColor: T.navy,
          borderTopWidth: 0,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          overflow: "hidden",
          ...Platform.select({
            ios: {
              shadowColor: T.shadow,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
            },
            android: { elevation: 14 },
          }),
        },
        tabItem: { paddingTop: 2 },
        iconPill: {
          width: 46,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
        },
        iconPillActive: {
          backgroundColor: "rgba(255,255,255,0.22)",
        },
        activeDot: {
          position: "absolute",
          top: -7,
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#fff",
        },
        label: {
          fontFamily: fonts.body.medium,
          fontSize: 10.5,
          marginTop: 3,
        },
        labelActive: {
          fontFamily: fonts.body.semibold,
        },
      }),
    [T]
  );

  return (
    <>
      <WhatsNewModal />
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: "#fff",
          tabBarInactiveTintColor: "rgba(255,255,255,0.62)",
          tabBarStyle: styles.tabBar,
          tabBarItemStyle: styles.tabItem,
          tabBarBackground: () => <GradientBackground />,
          tabBarLabelStyle: { fontFamily: fonts.body.medium, fontSize: 10.5 },
          animation: "shift",
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
                  {focused && <View style={styles.activeDot} />}
                  <item.icon color={focused ? "#fff" : color} size={size ?? 19} strokeWidth={focused ? 2.2 : 1.8} />
                </View>
              ),
              tabBarLabel: ({ focused, color }) => (
                <Text
                  style={[
                    styles.label,
                    { color },
                    focused && styles.labelActive,
                  ]}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              ),
            }}
          />
        ))}
      </Tab.Navigator>
    </>
  );
}
