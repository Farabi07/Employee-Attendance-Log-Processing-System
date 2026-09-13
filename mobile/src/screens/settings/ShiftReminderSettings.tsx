import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Switch, StyleSheet, Pressable } from "react-native";
import { ChevronLeft, Clock3, CalendarClock } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import {
  getShiftReminderPreference,
  setShiftReminderPreference,
  getUpcomingShiftReminders,
  refreshAllShiftReminders,
  cancelAllShiftReminders,
  DEFAULT_REMINDER_MINUTES,
} from "../../lib/shiftReminder";
import { formatDayLabel } from "../../lib/dates";
import IconChip from "../../components/IconChip";
import EmptyState from "../../components/EmptyState";
import { tapSelection } from "../../lib/haptics";

function timeUntil(iso: string) {
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (seconds < 60) return "in under a minute";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

// Reached via Settings > Reminders — split out from NotificationSettings
// into its own top-level Settings destination (rather than nested under
// Notifications) so it's easier to find at a glance, and to make room for
// the "Upcoming" list below without crowding the Notifications screen.
export default function ShiftReminderSettings({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(true);
  const [minutes, setMinutes] = useState(String(DEFAULT_REMINDER_MINUTES));
  const [upcoming, setUpcoming] = useState<any[]>([]);

  const loadUpcoming = useCallback(() => {
    getUpcomingShiftReminders().then(setUpcoming);
  }, []);

  useEffect(() => {
    getShiftReminderPreference().then(({ enabled: e, minutesBefore }) => {
      setEnabled(e);
      setMinutes(String(minutesBefore));
    });
    loadUpcoming();
  }, [loadUpcoming]);

  const toggle = async (value: boolean) => {
    tapSelection();
    setEnabled(value);
    await setShiftReminderPreference({ enabled: value });
    // Takes effect right away instead of waiting for the next time Today
    // or My Shifts happens to load.
    if (value && user?.id) {
      await refreshAllShiftReminders(user.id);
    } else {
      await cancelAllShiftReminders();
    }
    loadUpcoming();
  };

  const commitMinutes = async (text: string) => {
    const digitsOnly = text.replace(/[^0-9]/g, "");
    setMinutes(digitsOnly);
    const value = Math.max(5, Math.min(Number(digitsOnly) || DEFAULT_REMINDER_MINUTES, 120));
    await setShiftReminderPreference({ minutesBefore: value });
    if (enabled && user?.id) {
      await refreshAllShiftReminders(user.id);
      loadUpcoming();
    }
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
        upcomingTitle: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.ink, marginBottom: 2 },
        upcomingSub: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 4, lineHeight: 17 },
        upcomingTime: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint },
        emptyWrap: { paddingVertical: 4 },
      }),
    [T]
  );

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Reminders</Text>
      </View>

      <View style={styles.content}>
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
              value={enabled}
              onValueChange={toggle}
              trackColor={{ false: T.line, true: T.tealBg }}
              thumbColor={enabled ? T.teal : undefined}
            />
          </View>
          {enabled && (
            <>
              <View style={styles.rowDivider} />
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>Minutes before shift</Text>
                </View>
                <TextInput value={minutes} onChangeText={commitMinutes} keyboardType="number-pad" style={styles.minutesInput} />
              </View>
            </>
          )}
        </View>

        {enabled && (
          <>
            <Text style={styles.sectionLabel}>Upcoming</Text>
            {upcoming.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyState icon={CalendarClock} title="No upcoming reminders" subtitle="Open Today or My Shifts to schedule the next ones." />
              </View>
            ) : (
              <View style={styles.rowGroup}>
                {upcoming.map((r, i) => (
                  <React.Fragment key={r.rosterId}>
                    <View style={styles.row}>
                      <IconChip bg={T.tealBg} size={32}>
                        <Clock3 size={16} color={T.tealDeep} />
                      </IconChip>
                      <View style={styles.rowText}>
                        <Text style={styles.upcomingTitle}>{r.shiftName}</Text>
                        <Text style={styles.upcomingSub}>
                          {formatDayLabel(r.date)} · {r.startTime.slice(0, 5)}
                        </Text>
                        <Text style={styles.upcomingTime}>{timeUntil(r.triggerAt)}</Text>
                      </View>
                    </View>
                    {i < upcoming.length - 1 && <View style={styles.rowDivider} />}
                  </React.Fragment>
                ))}
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
