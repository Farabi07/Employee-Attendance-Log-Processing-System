import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet } from "react-native";
import { ChevronLeft, BellOff } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import EmptyState from "../../components/EmptyState";

// Same data/polling logic as components/NotificationBell.tsx's dropdown
// panel, rendered full-page instead — this is the "Notification" row
// inside AccountMenu.tsx, the bell icon in AppHeader stays as the
// quick-glance dropdown.
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
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
        backButton: { padding: 2 },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, flex: 1 },
        markAllText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.teal },
        emptyWrap: { paddingTop: 40, paddingHorizontal: 24 },
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

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notificationsMine("?size=50"));
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silent — same as the bell dropdown, don't disrupt the UI on a transient failure
    }
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

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <Pressable onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon={BellOff} title="No notifications yet" subtitle="Shift, approval, and payroll updates will show up here." />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
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
      )}
    </View>
  );
}
