import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, Bell, List, VolumeX } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { getNotificationsEnabled, setNotificationsEnabled, getSilentModeEnabled, setSilentModeEnabled } from "../../lib/push";
import IconChip from "../../components/IconChip";
import Notifications from "./Notifications";
import { tapSelection, tapLight } from "../../lib/haptics";
import { animateLayout } from "../../lib/animateLayout";

// Reached via Settings > Notifications (see Settings.tsx) rather than
// living inline there or as its own top-level AccountMenu row — grouped
// list + drill-in-for-detail structure borrowed from how most native
// apps lay out Settings > Notifications. Shift reminders live in their
// own Settings > Reminders destination (ShiftReminderSettings.tsx)
// instead of nested here, so they're easier to find at a glance.
export default function NotificationSettings({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [silentMode, setSilentMode] = useState(false);
  const [showHistory, setShowHistoryState] = useState(false);
  const setShowHistory = (v: boolean) => {
    animateLayout();
    setShowHistoryState(v);
  };

  useEffect(() => {
    getNotificationsEnabled().then(setEnabled);
    getSilentModeEnabled().then(setSilentMode);
  }, []);

  const toggle = async (value: boolean) => {
    tapSelection();
    setEnabled(value);
    setBusy(true);
    try {
      await setNotificationsEnabled(value);
    } finally {
      setBusy(false);
    }
  };

  const toggleSilentMode = async (value: boolean) => {
    tapSelection();
    setSilentMode(value);
    await setSilentModeEnabled(value);
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
        backButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.line2 },
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
          marginBottom: 22,
        },
        rowDivider: { height: 1, backgroundColor: T.line2, marginLeft: 60 },
        row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 14 },
        rowText: { flex: 1 },
        rowLabel: { fontFamily: fonts.body.medium, fontSize: 14.5, color: T.ink },
        rowHint: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginTop: 2 },
      }),
    [T]
  );

  if (showHistory) {
    return <Notifications onBack={() => setShowHistory(false)} />;
  }

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Push notifications</Text>
        <View style={styles.rowGroup}>
          <View style={styles.row}>
            <IconChip bg={T.amberBg} size={32}>
              <Bell size={16} color={T.amber} />
            </IconChip>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Allow notifications</Text>
              <Text style={styles.rowHint}>Shift, approval, and payroll updates.</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggle}
              disabled={busy}
              trackColor={{ false: T.line, true: T.tealBg }}
              thumbColor={enabled ? T.teal : undefined}
            />
          </View>
          {enabled && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <IconChip bg={T.navyBg} size={32}>
                  <VolumeX size={16} color={T.navy} />
                </IconChip>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Silent mode</Text>
                  <Text style={styles.rowHint}>Notifications still show, just no sound. Shift reminders always ring.</Text>
                </View>
                <Switch
                  value={silentMode}
                  onValueChange={toggleSilentMode}
                  trackColor={{ false: T.line, true: T.tealBg }}
                  thumbColor={silentMode ? T.teal : undefined}
                />
              </View>
            </>
          )}
        </View>

        <Text style={styles.sectionLabel}>History</Text>
        <View style={styles.rowGroup}>
          <Pressable
            onPress={() => {
              tapLight();
              setShowHistory(true);
            }}
            style={styles.row}
          >
            <IconChip bg={T.navyBg} size={32}>
              <List size={16} color={T.navy} />
            </IconChip>
            <Text style={[styles.rowText, styles.rowLabel]}>View notification history</Text>
            <ChevronRight size={16} color={T.faint} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
