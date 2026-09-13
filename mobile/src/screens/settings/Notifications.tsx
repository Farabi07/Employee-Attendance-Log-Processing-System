import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { ChevronLeft, BellOff, Clock3 } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { getUpcomingShiftReminders } from "../../lib/shiftReminder";
import { formatDayLabel } from "../../lib/dates";
import IconChip from "../../components/IconChip";
import EmptyState from "../../components/EmptyState";

// Same data/polling logic as components/NotificationBell.tsx's dropdown
// panel, rendered full-page instead — this is the "Notification" row
// inside AccountMenu.tsx, the bell icon in AppHeader stays as the
// quick-glance dropdown. Shift reminders (lib/shiftReminder.js) are
// scheduled entirely on-device and never create a backend Notification
// row, so they're rendered as their own "Reminders" section — sourced
// locally — above the server-backed "History" list rather than mixed in.
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function timeUntil(iso: string) {
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (seconds < 60) return "in under a minute";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

export default function Notifications({ onBack }: { onBack: () => void }) {
  const T = useTheme();
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
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, flex: 1 },
        markAllText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.teal },
        emptyWrap: { paddingTop: 40, paddingHorizontal: 24 },
        sectionLabel: {
          fontFamily: fonts.body.semibold,
          fontSize: 11,
          color: T.faint,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          marginTop: 18,
          marginBottom: 8,
          paddingHorizontal: 16,
        },
        remindersGroup: {
          marginHorizontal: 16,
          backgroundColor: T.card,
          borderRadius: 14,
          overflow: "hidden",
          shadowColor: T.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        },
        reminderRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14 },
        reminderDivider: { height: 1, backgroundColor: T.line2, marginLeft: 58 },
        notifRow: { padding: 16, borderBottomWidth: 1, borderBottomColor: T.line2, flexDirection: "row", gap: 8 },
        notifRowUnread: { backgroundColor: T.tealBg },
        unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.teal, marginTop: 5 },
        notifTitle: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.ink, marginBottom: 2 },
        notifMessage: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 4, lineHeight: 17 },
        notifTime: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint },
      }),
    [T]
  );

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notificationsMine("?size=50"));
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silent — same as the bell dropdown, don't disrupt the UI on a transient failure
    }
    getUpcomingShiftReminders().then(setReminders);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markRead = async (id: number) => {
    setNotifications((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await api.post(endpoints.notificationMarkRead(id));
    } catch {
      load();
    }
  };

  const markAllRead = async () => {
    setNotifications((list) => list.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      await api.post(endpoints.notificationMarkAllRead());
    } catch {
      load();
    }
  };

  const remindersSection = reminders.length === 0 ? null : (
    <>
      <Text style={styles.sectionLabel}>Reminders</Text>
      <View style={styles.remindersGroup}>
        {reminders.map((r, i) => (
          <React.Fragment key={r.rosterId}>
            <View style={styles.reminderRow}>
              <IconChip bg={T.tealBg} size={32}>
                <Clock3 size={16} color={T.tealDeep} />
              </IconChip>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifTitle}>{r.shiftName}</Text>
                <Text style={styles.notifMessage}>
                  {formatDayLabel(r.date)} · {r.startTime.slice(0, 5)}
                </Text>
                <Text style={styles.notifTime}>{timeUntil(r.triggerAt)}</Text>
              </View>
            </View>
            {i < reminders.length - 1 && <View style={styles.reminderDivider} />}
          </React.Fragment>
        ))}
      </View>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => String(n.id)}
        ListHeaderComponent={
          <>
            {remindersSection}
            <Text style={styles.sectionLabel}>History</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <EmptyState icon={BellOff} title="No notifications yet" subtitle="Shift, approval, and payroll updates will show up here." />
          </View>
        }
        renderItem={({ item: n }) => (
          <Pressable
            onPress={() => !n.is_read && markRead(n.id)}
            style={[styles.notifRow, !n.is_read && styles.notifRowUnread]}
          >
            {!n.is_read && <View style={styles.unreadDot} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{n.title}</Text>
              {!!n.message && <Text style={styles.notifMessage}>{n.message}</Text>}
              <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
