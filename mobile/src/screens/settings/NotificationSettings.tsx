import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Switch, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, Bell, Clock3, List, VolumeX } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { getNotificationsEnabled, setNotificationsEnabled, getSilentModeEnabled, setSilentModeEnabled } from "../../lib/push";
import {
  getShiftReminderPreference,
  setShiftReminderPreference,
  refreshAllShiftReminders,
  cancelAllShiftReminders,
  DEFAULT_REMINDER_MINUTES,
} from "../../lib/shiftReminder";
import IconChip from "../../components/IconChip";
import Notifications from "./Notifications";
import { tapSelection, tapLight } from "../../lib/haptics";
import { animateLayout } from "../../lib/animateLayout";

// Reached via Settings > Notifications (see Settings.tsx) rather than
// living inline there or as its own top-level AccountMenu row — grouped
// list + drill-in-for-detail structure borrowed from how most native
// apps lay out Settings > Notifications.
export default function NotificationSettings({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  // Shift reminders are scheduled entirely on-device (see lib/shiftReminder.js)
  // rather than through the server's push pipeline — no server round trip
  // to read/write this preference, just SecureStore like theme/language.
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(String(DEFAULT_REMINDER_MINUTES));
  const [silentMode, setSilentMode] = useState(false);
  const [showHistory, setShowHistoryState] = useState(false);
  const setShowHistory = (v: boolean) => {
    animateLayout();
    setShowHistoryState(v);
  };

  useEffect(() => {
    getNotificationsEnabled().then(setEnabled);
    getSilentModeEnabled().then(setSilentMode);
    getShiftReminderPreference().then(({ enabled: e, minutesBefore }) => {
      setRemindersEnabled(e);
      setReminderMinutes(String(minutesBefore));
    });
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

  const toggleReminders = async (value: boolean) => {
    tapSelection();
    setRemindersEnabled(value);
    await setShiftReminderPreference({ enabled: value });
    // Takes effect right away instead of waiting for the next time Today
    // or My Shifts happens to load.
    if (value && user?.id) {
      refreshAllShiftReminders(user.id);
    } else {
      cancelAllShiftReminders();
    }
  };

  const toggleSilentMode = async (value: boolean) => {
    tapSelection();
    setSilentMode(value);
    await setSilentModeEnabled(value);
  };

  const commitReminderMinutes = async (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    setReminderMinutes(digitsOnly);
    const minutes = Math.max(5, Math.min(Number(digitsOnly) || DEFAULT_REMINDER_MINUTES, 120));
    await setShiftReminderPreference({ minutesBefore: minutes });
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
          marginBottom: 22,
        },
        rowDivider: { height: 1, backgroundColor: T.line2, marginLeft: 60 },
        row: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13, paddingHorizontal: 14 },
        rowText: { flex: 1 },
        rowLabel: { fontFamily: fonts.body.medium, fontSize: 14.5, color: T.ink },
        rowHint: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginTop: 2 },
        minutesInput: {
          width: 56,
          textAlign: "center",
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 8,
          paddingVertical: 7,
          fontFamily: fonts.body.medium,
          fontSize: 13.5,
          color: T.ink,
        },
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
          <ChevronLeft size={20} color={T.ink} />
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

        <Text style={styles.sectionLabel}>Shift reminders</Text>
        <View style={styles.rowGroup}>
          <View style={styles.row}>
            <IconChip bg={T.tealBg} size={32}>
              <Clock3 size={16} color={T.tealDeep} />
            </IconChip>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Remind me before my shift</Text>
              <Text style={styles.rowHint}>Scheduled on your phone — works even if you're offline.</Text>
            </View>
            <Switch
              value={remindersEnabled}
              onValueChange={toggleReminders}
              trackColor={{ false: T.line, true: T.tealBg }}
              thumbColor={remindersEnabled ? T.teal : undefined}
            />
          </View>
          {remindersEnabled && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Minutes before shift</Text>
                </View>
                <TextInput
                  value={reminderMinutes}
                  onChangeText={commitReminderMinutes}
                  keyboardType="number-pad"
                  style={styles.minutesInput}
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
