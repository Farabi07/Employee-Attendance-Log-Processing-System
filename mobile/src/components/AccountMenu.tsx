import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  X,
  User,
  ShieldCheck,
  Settings as SettingsIcon,
  LogOut,
  HelpCircle,
  BookOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/auth";
import { mediaUrl } from "../lib/api";
import Avatar from "./Avatar";
import IconChip from "./IconChip";
import { tapLight } from "../lib/haptics";
import { animateLayout } from "../lib/animateLayout";
import Card from "./Card";
import ProfileDetails from "../screens/settings/ProfileDetails";
import Settings from "../screens/settings/Settings";
import PrivacyPolicy from "../screens/settings/PrivacyPolicy";
import HelpCenter from "../screens/settings/HelpCenter";
import UserGuide from "../screens/settings/UserGuide";

type MenuView = "menu" | "profile" | "privacy" | "settings" | "help" | "guide";

// Opened from AppHeader by tapping the avatar — a full-page menu (Profile,
// Privacy policy, Settings, Logout, Help center) rather than jumping
// straight into the profile editor the way the old
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
  const [view, setViewState] = useState<MenuView>("menu");
  const setView = (v: MenuView) => {
    animateLayout();
    setViewState(v);
  };

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
        closeButton: {
          width: 30,
          height: 30,
          borderRadius: 15,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: T.line2,
        },
        scrollContent: { padding: 16, gap: 20 },
        // No overflow: "hidden" here — that would also clip Card's own
        // shadow on iOS (a view can't clip its content and cast a shadow
        // outside its own bounds at the same time). The banner's rounded
        // top corners are clipped by identityInner below instead, one
        // level in, where clipping doesn't touch the shadow-casting view.
        identityCard: { padding: 0, alignItems: "center" },
        identityInner: { width: "100%", alignItems: "center", overflow: "hidden", borderRadius: 14 },
        banner: {
          width: "100%",
          height: 60,
          backgroundColor: T.tealBg,
        },
        sparkle: { position: "absolute", top: 12, right: 14, opacity: 0.5 },
        avatarRing: {
          marginTop: -32,
          borderRadius: 36,
          borderWidth: 4,
          borderColor: T.card,
          backgroundColor: T.card,
        },
        name: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, marginTop: 10 },
        email: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginTop: 2, marginBottom: 10 },
        rolePill: {
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 4,
          paddingHorizontal: 12,
          borderRadius: 999,
          backgroundColor: T.navyBg,
          marginBottom: 18,
        },
        rolePillText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.navyDeep },
        sectionLabel: {
          fontFamily: fonts.body.semibold,
          fontSize: 11,
          color: T.faint,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginBottom: 8,
          paddingHorizontal: 2,
        },
        rowGroup: {
          backgroundColor: T.card,
          borderRadius: 14,
          overflow: "hidden",
          shadowColor: T.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        },
        rowDivider: { height: 1, backgroundColor: T.line2, marginLeft: 62 },
        menuRow: {
          width: "100%",
          flexDirection: "row",
          alignItems: "center",
          gap: 13,
          paddingVertical: 13,
          paddingHorizontal: 14,
        },
        menuRowText: { flex: 1, fontFamily: fonts.body.medium, fontSize: 14.5, color: T.ink },
        menuRowTextDanger: { color: T.coral, fontFamily: fonts.body.semibold },
        menuRowPressed: { backgroundColor: T.line2 },
        footer: { alignItems: "center", marginTop: 4 },
        footerApp: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1 },
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

  type MenuRow = { key: string; label: string; icon: any; bg: string; color: string; onPress: () => void };

  // Grouped like a typical Settings list (General app-wide options, then
  // account-specific destinations) instead of one flat list — easier to
  // scan as more rows land here later.
  const GENERAL_ITEMS: MenuRow[] = [
    { key: "settings", label: "Settings", icon: SettingsIcon, bg: T.navyBg, color: T.navy, onPress: () => setView("settings") },
  ];
  const ACCOUNT_ITEMS: MenuRow[] = [
    { key: "profile", label: "Profile", icon: User, bg: T.navyBg, color: T.navy, onPress: () => setView("profile") },
    { key: "guide", label: "User guide", icon: BookOpen, bg: T.tealBg, color: T.tealDeep, onPress: () => setView("guide") },
    { key: "privacy", label: "Privacy policy", icon: ShieldCheck, bg: T.tealBg, color: T.tealDeep, onPress: () => setView("privacy") },
    { key: "help", label: "Help center", icon: HelpCircle, bg: T.amberBg, color: T.amber, onPress: () => setView("help") },
  ];

  const renderRow = (item: MenuRow, danger?: boolean) => (
    <Pressable
      key={item.key}
      onPress={() => {
        tapLight();
        item.onPress();
      }}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
    >
      <IconChip bg={item.bg} size={32}>
        <item.icon size={16} color={item.color} />
      </IconChip>
      <Text style={[styles.menuRowText, danger && styles.menuRowTextDanger]}>{item.label}</Text>
      {!danger && <ChevronRight size={16} color={T.faint} />}
    </Pressable>
  );

  const renderGroup = (items: MenuRow[], danger?: boolean) => (
    <View style={styles.rowGroup}>
      {items.map((item, i) => (
        <React.Fragment key={item.key}>
          {renderRow(item, danger)}
          {i < items.length - 1 && <View style={styles.rowDivider} />}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => (view === "menu" ? close() : setView("menu"))}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {view === "profile" ? (
          <ProfileDetails onBack={() => setView("menu")} />
        ) : view === "guide" ? (
          <UserGuide onBack={() => setView("menu")} />
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
              <Pressable onPress={close} hitSlop={8} style={styles.closeButton} accessibilityLabel="Close" accessibilityRole="button">
                <X size={17} color={T.ink} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Card style={styles.identityCard}>
                <View style={styles.identityInner}>
                  <View style={styles.banner}>
                    <Sparkles size={16} color={T.tealDeep} style={styles.sparkle} />
                  </View>
                  <View style={styles.avatarRing}>
                    <Avatar initials={initials} size={64} src={mediaUrl(user.image)} />
                  </View>
                  <Text style={styles.name}>
                    {user.first_name} {user.last_name}
                  </Text>
                  <Text style={styles.email}>{user.email}</Text>
                  <View style={styles.rolePill}>
                    <ShieldCheck size={12} color={T.navyDeep} />
                    <Text style={styles.rolePillText}>{roleLabel}</Text>
                  </View>
                </View>
              </Card>

              <View>
                <Text style={styles.sectionLabel}>General</Text>
                {renderGroup(GENERAL_ITEMS)}
              </View>

              <View>
                <Text style={styles.sectionLabel}>Account</Text>
                {renderGroup(ACCOUNT_ITEMS)}
              </View>

              {renderGroup(
                [{ key: "logout", label: "Logout", icon: LogOut, bg: T.coralBg, color: T.coral, onPress: confirmLogout }],
                true
              )}

              <View style={styles.footer}>
                <Text style={styles.footerApp}>TimeTap</Text>
              </View>
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}
