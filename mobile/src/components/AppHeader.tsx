import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut } from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/auth";
import { mediaUrl } from "../lib/api";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";
import ProfileModal from "./ProfileModal";
import GradientBackground from "./GradientBackground";

// Ported from the header bar inside frontend/src/App.jsx's Shell(). Used
// as each AppTabs screen's `header` (see navigation/AppTabs.tsx) so every
// tab gets title + NotificationBell + profile/avatar + logout, same as
// the web app's shared header above the page content.
export default function AppHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const T = useTheme();
  const [showProfile, setShowProfile] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: {
          backgroundColor: T.navy,
          overflow: "hidden",
          shadowColor: T.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 10,
        },
        title: { fontFamily: fonts.display.semibold, fontSize: 17, color: "#fff", flex: 1 },
        actions: { flexDirection: "row", alignItems: "center", gap: 10 },
        avatarRing: {
          borderRadius: 17,
          borderWidth: 2,
          borderColor: "rgba(255,255,255,0.55)",
        },
        logoutButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        },
        logoutText: {
          fontFamily: fonts.body.semibold,
          fontSize: 12,
          color: T.coral,
        },
      }),
    [T]
  );

  if (!user) return null;
  const initials = `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <GradientBackground />
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.actions}>
          <NotificationBell />
          <Pressable onPress={() => setShowProfile(true)} hitSlop={4} style={styles.avatarRing}>
            <Avatar initials={initials} size={30} src={mediaUrl(user.image)} />
          </Pressable>
          <Pressable onPress={logout} style={styles.logoutButton} hitSlop={6}>
            <LogOut size={15} color={T.coral} strokeWidth={2.2} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
    </SafeAreaView>
  );
}
