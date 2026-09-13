import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, Moon, Bell } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme, useThemeSetting } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import IconChip from "../../components/IconChip";
import NotificationSettings from "./NotificationSettings";
import { tapSelection, tapLight } from "../../lib/haptics";
import { animateLayout } from "../../lib/animateLayout";

type SettingsView = "root" | "notifications";

// Rendered as a swapped-in view inside AccountMenu's existing Modal, same
// pattern as AccountDeletion.tsx. Laid out as a grouped list (a "General"
// section, each row either an inline toggle or a chevron into its own
// sub-screen) rather than the old segmented-button/inline-toggle mix —
// closer to how most native Settings screens group things, so more rows
// (data & storage, language, ...) have an obvious place to land later.
export default function Settings({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { billing } = useAuth();
  const { preference, setPreference } = useThemeSetting();
  const [view, setViewState] = useState<SettingsView>("root");
  const setView = (v: SettingsView) => {
    animateLayout();
    setViewState(v);
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        backButton: { padding: 2 },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink },
        content: { padding: 20 },
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
        rowDivider: { height: 1, backgroundColor: T.line2, marginLeft: 60 },
        row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 14 },
        rowLabel: { flex: 1, fontFamily: fonts.body.medium, fontSize: 14.5, color: T.ink },
        footer: { alignItems: "center", marginTop: 32 },
        footerApp: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 1 },
        footerOrg: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginTop: 3 },
      }),
    [T]
  );

  if (view === "notifications") {
    return <NotificationSettings onBack={() => setView("root")} />;
  }

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>General</Text>
        <View style={styles.rowGroup}>
          <View style={styles.row}>
            <IconChip bg={T.navyBg} size={32}>
              <Moon size={16} color={T.navy} />
            </IconChip>
            <Text style={styles.rowLabel}>Night mode</Text>
            <Switch
              value={preference === "dark"}
              onValueChange={(v) => {
                tapSelection();
                setPreference(v ? "dark" : "light");
              }}
              trackColor={{ false: T.line, true: T.tealBg }}
              thumbColor={preference === "dark" ? T.teal : undefined}
            />
          </View>

          <View style={styles.rowDivider} />

          <Pressable
            onPress={() => {
              tapLight();
              setView("notifications");
            }}
            style={styles.row}
          >
            <IconChip bg={T.amberBg} size={32}>
              <Bell size={16} color={T.amber} />
            </IconChip>
            <Text style={styles.rowLabel}>Notifications</Text>
            <ChevronRight size={16} color={T.faint} />
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerApp}>TimeTap</Text>
          {!!billing?.organization_name && <Text style={styles.footerOrg}>{billing.organization_name}</Text>}
        </View>
      </View>
    </View>
  );
}
