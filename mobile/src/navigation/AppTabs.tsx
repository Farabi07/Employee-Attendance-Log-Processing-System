import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
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
        tabBarInactiveTintColor: T.faint,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
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
                {focused && <View style={styles.activeDot} />}
                <item.icon color={focused ? T.tealDeep : color} size={size ?? 19} strokeWidth={focused ? 2.2 : 1.8} />
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
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: T.card,
    borderTopWidth: 0,
    height: 68,
    paddingTop: 8,
    paddingBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: T.ink,
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
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
    backgroundColor: T.tealBg,
  },
  activeDot: {
    position: "absolute",
    top: -7,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.teal,
  },
  label: {
    fontFamily: fonts.body.medium,
    fontSize: 10.5,
    marginTop: 3,
  },
  labelActive: {
    fontFamily: fonts.body.semibold,
  },
});
