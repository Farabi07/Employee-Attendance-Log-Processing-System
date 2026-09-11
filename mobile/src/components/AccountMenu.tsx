import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  User,
  Bell,
  ShieldCheck,
  Settings as SettingsIcon,
  LogOut,
  HelpCircle,
  ChevronRight,
} from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/auth";
import { mediaUrl } from "../lib/api";
import Avatar from "./Avatar";
import IconChip from "./IconChip";
import ProfileDetails from "../screens/settings/ProfileDetails";
import Settings from "../screens/settings/Settings";
import Notifications from "../screens/settings/Notifications";
import PrivacyPolicy from "../screens/settings/PrivacyPolicy";
import HelpCenter from "../screens/settings/HelpCenter";

type MenuView = "menu" | "profile" | "notifications" | "privacy" | "settings" | "help";

// Opened from AppHeader by tapping the avatar — a full-page menu (Profile,
// Notification, Privacy policy, Settings, Logout, Help center) rather
// than jumping straight into the profile editor the way the old
// ProfileModal (since split into screens/settings/ProfileDetails.tsx) did.
// Each row swaps in its own content-only screen inside the same Modal
// (same pattern screens/settings/Settings.tsx and AccountDeletion.tsx
// already used nested inside the old ProfileModal), rather than
// registering routes on the root navigator — this whole thing is one
// self-contained overlay opened from a single header button, not a
// destination someone deep-links into.
export default function AccountMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, isManager, isManagerOrModerator, logout } = useAuth();
  const T = useTheme();
  const [view, setView] = useState<MenuView>("menu");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          backgroundColor: T.card,
        },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, flex: 1 },
        closeButton: { padding: 2 },
        identityRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 20 },
        name: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.ink },
        email: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted },
        role: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginTop: 2 },
        menuList: { paddingHorizontal: 12 },
        menuRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingVertical: 12,
          paddingHorizontal: 8,
        },
        menuRowText: { flex: 1, fontFamily: fonts.body.medium, fontSize: 14, color: T.ink },
        menuRowTextDanger: { color: T.coral },
        divider: { height: 1, backgroundColor: T.line2, marginVertical: 8, marginHorizontal: 8 },
      }),
    [T]
  );

  const close = () => {
    onClose();
    setView("menu");
  };

  if (!user) return null;
  const initials = `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase();
  const roleLabel = isManager ? "Manager" : isManagerOrModerator ? "Moderator" : "Employee";

  const confirmLogout = () => {
    Alert.alert("Log out?", "You'll need to sign in again to use TimeTap.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: () => { close(); logout(); } },
    ]);
  };

  const MENU_ITEMS: { key: MenuView | "logout"; label: string; icon: any; bg: string; color: string; onPress: () => void }[] = [
    { key: "profile", label: "Profile", icon: User, bg: T.navyBg, color: T.navy, onPress: () => setView("profile") },
    { key: "notifications", label: "Notification", icon: Bell, bg: T.amberBg, color: T.amber, onPress: () => setView("notifications") },
    { key: "privacy", label: "Privacy policy", icon: ShieldCheck, bg: T.tealBg, color: T.tealDeep, onPress: () => setView("privacy") },
    { key: "settings", label: "Settings", icon: SettingsIcon, bg: T.navyBg, color: T.navy, onPress: () => setView("settings") },
    { key: "logout", label: "Logout", icon: LogOut, bg: T.coralBg, color: T.coral, onPress: confirmLogout },
    { key: "help", label: "Help center", icon: HelpCircle, bg: T.amberBg, color: T.amber, onPress: () => setView("help") },
  ];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => (view === "menu" ? close() : setView("menu"))}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {view === "profile" ? (
          <ProfileDetails onBack={() => setView("menu")} />
        ) : view === "notifications" ? (
          <Notifications onBack={() => setView("menu")} />
        ) : view === "privacy" ? (
          <PrivacyPolicy onBack={() => setView("menu")} />
        ) : view === "settings" ? (
          <Settings onBack={() => setView("menu")} />
        ) : view === "help" ? (
          <HelpCenter onBack={() => setView("menu")} />
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Account</Text>
              <Pressable onPress={close} hitSlop={8} style={styles.closeButton}>
                <X size={20} color={T.ink} />
              </Pressable>
            </View>

            <View style={styles.identityRow}>
              <Avatar initials={initials} size={48} src={mediaUrl(user.image)} />
              <View>
                <Text style={styles.name}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={styles.email}>{user.email}</Text>
                <Text style={styles.role}>{roleLabel}</Text>
              </View>
            </View>

            <View style={styles.menuList}>
              {MENU_ITEMS.map((item) => (
                <React.Fragment key={item.key}>
                  {item.key === "logout" && <View style={styles.divider} />}
                  <Pressable onPress={item.onPress} style={styles.menuRow}>
                    <IconChip bg={item.bg} size={30}>
                      <item.icon size={15} color={item.color} />
                    </IconChip>
                    <Text style={[styles.menuRowText, item.key === "logout" && styles.menuRowTextDanger]}>{item.label}</Text>
                    {item.key !== "logout" && <ChevronRight size={16} color={T.faint} />}
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
