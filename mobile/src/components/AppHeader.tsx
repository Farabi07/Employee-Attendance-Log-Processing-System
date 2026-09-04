import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LogOut } from "lucide-react-native";
import { T, fonts } from "../theme";
import { useAuth } from "../lib/auth";
import { BASE_URL } from "../lib/api";
import Avatar from "./Avatar";
import NotificationBell from "./NotificationBell";
import ProfileModal from "./ProfileModal";

// Ported from the header bar inside frontend/src/App.jsx's Shell(). Used
// as each AppTabs screen's `header` (see navigation/AppTabs.tsx) so every
// tab gets title + NotificationBell + profile/avatar + logout, same as
// the web app's shared header above the page content.
export default function AppHeader({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;
  const initials = `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase();

  return (
    <SafeAreaView edges={["top"]} style={styles.safe}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.actions}>
          <NotificationBell />
          <Pressable onPress={() => setShowProfile(true)} hitSlop={4}>
            <Avatar initials={initials} size={32} src={user.image ? `${BASE_URL}${user.image}` : undefined} />
          </Pressable>
          <Pressable onPress={logout} style={styles.logoutButton}>
            <LogOut size={15} color={T.muted} />
          </Pressable>
        </View>
      </View>
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: T.card, borderBottomWidth: 1, borderBottomColor: T.line },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  title: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, flex: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoutButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: T.line,
    backgroundColor: T.card,
    alignItems: "center",
    justifyContent: "center",
  },
});
