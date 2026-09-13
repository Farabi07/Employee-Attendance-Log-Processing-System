import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet, Animated } from "react-native";
import { Bell, BellOff, Clock3, CalendarClock, Megaphone } from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import { getUpcomingShiftReminders } from "../lib/shiftReminder";
import { formatDayLabel } from "../lib/dates";
import IconChip from "./IconChip";
import EmptyState from "./EmptyState";

// Ported from frontend/src/components/NotificationBell.jsx. Same 20s
// polling, same optimistic mark-read/mark-all-read. The web version's
// "click outside to close" dropdown (document.addEventListener) becomes a
// Modal with a transparent, press-to-dismiss backdrop — RN has no
// equivalent DOM event to listen for.
function timeAgo(iso: string) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Shift reminders are scheduled entirely on-device (lib/shiftReminder.js)
// and never create a backend Notification row, so "in 25m" here is
// computed forward from now rather than reusing timeAgo above.
function timeUntil(iso: string) {
  const seconds = Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
  if (seconds < 60) return "in under a minute";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `in ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `in ${hours}h ${minutes % 60}m`;
  return `in ${Math.floor(hours / 24)}d`;
}

type Tab = "notifications" | "reminders" | "notices";

export default function NotificationBell() {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        bellButton: {
          width: 28,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
        },
        badge: {
          position: "absolute",
          top: -4,
          right: -4,
          minWidth: 16,
          height: 16,
          paddingHorizontal: 3,
          borderRadius: 8,
          backgroundColor: T.coral,
          alignItems: "center",
          justifyContent: "center",
        },
        badgeText: { fontFamily: fonts.body.semibold, fontSize: 10, color: "#fff" },
        backdrop: { flex: 1, backgroundColor: "rgba(22,35,58,0.25)", alignItems: "flex-end", padding: 16, paddingTop: 60 },
        panel: {
          width: 320,
          maxWidth: "100%",
          maxHeight: 480,
          backgroundColor: T.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: T.line,
          overflow: "hidden",
        },
        panelHeader: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          padding: 14,
          paddingBottom: 10,
        },
        panelTitle: { fontFamily: fonts.display.semibold, fontSize: 13.5, color: T.ink },
        markAllText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.teal },
        tabs: { flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingBottom: 12 },
        tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 7, borderRadius: 8, backgroundColor: T.line2 },
        tabBtnActive: { backgroundColor: T.tealBg },
        tabText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.muted },
        tabTextActive: { color: T.tealDeep },
        listWrap: { borderTopWidth: 1, borderTopColor: T.line2 },
        emptyWrap: { paddingVertical: 12 },
        notifRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: T.line2, flexDirection: "row", gap: 8 },
        notifRowUnread: { backgroundColor: T.tealBg },
        unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.teal, marginTop: 5 },
        notifTitle: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.ink, marginBottom: 2 },
        notifMessage: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 4, lineHeight: 17 },
        notifTime: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint },
        reminderRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: T.line2, flexDirection: "row", gap: 10, alignItems: "center" },
      }),
    [T]
  );
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("notifications");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [reminders, setReminders] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [noticesUnread, setNoticesUnread] = useState(0);
  const badgeScale = useRef(new Animated.Value(1)).current;
  const prevUnreadRef = useRef(0);

  // Pop the badge whenever the unread count goes UP (a new notification
  // actually arrived) — not on mount, and not when it drops from marking
  // things read, which should feel calm rather than call attention back.
  useEffect(() => {
    const total = unreadCount + noticesUnread;
    const prevTotal = prevUnreadRef.current;
    if (total > prevTotal) {
      badgeScale.setValue(0.6);
      Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 14 }).start();
    }
    prevUnreadRef.current = total;
  }, [unreadCount, noticesUnread, badgeScale]);

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notificationsMine("?size=15"));
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silent — polling, don't disrupt the UI on a transient failure
    }
    try {
      const res = await api.get(endpoints.noticesMine("?size=15"));
      setNotices(res.notifications || []);
      setNoticesUnread(res.unread_count || 0);
    } catch {
      // silent — same as above
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  // Reminders are local-only, so there's nothing to poll — just refresh
  // whenever the panel opens, in case one got (re)scheduled since last time.
  useEffect(() => {
    if (open) getUpcomingShiftReminders().then(setReminders);
  }, [open]);

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

  const markNoticeRead = async (id: number) => {
    setNotices((list) => list.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    setNoticesUnread((c) => Math.max(0, c - 1));
    try {
      await api.post(endpoints.notificationMarkRead(id));
    } catch {
      load();
    }
  };

  const markAllNoticesRead = async () => {
    setNotices((list) => list.map((n) => ({ ...n, is_read: true })));
    setNoticesUnread(0);
    try {
      await api.post(endpoints.noticeMarkAllRead());
    } catch {
      load();
    }
  };

  const totalUnread = unreadCount + noticesUnread;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.bellButton}
        hitSlop={8}
        accessibilityLabel={totalUnread > 0 ? `Notifications, ${totalUnread} unread` : "Notifications"}
        accessibilityRole="button"
      >
        <Bell size={20} color={T.amber} fill={T.amber} strokeWidth={1.5} />
        {totalUnread > 0 && (
          <Animated.View style={[styles.badge, { transform: [{ scale: badgeScale }] }]}>
            <Text style={styles.badgeText}>{totalUnread > 9 ? "9+" : totalUnread}</Text>
          </Animated.View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {tab === "notifications" && unreadCount > 0 && (
                <Pressable onPress={markAllRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
              {tab === "notices" && noticesUnread > 0 && (
                <Pressable onPress={markAllNoticesRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
            </View>

            <View style={styles.tabs}>
              <Pressable onPress={() => setTab("notifications")} style={[styles.tabBtn, tab === "notifications" && styles.tabBtnActive]}>
                <Bell size={13} color={tab === "notifications" ? T.tealDeep : T.muted} />
                <Text style={[styles.tabText, tab === "notifications" && styles.tabTextActive]}>
                  Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
                </Text>
              </Pressable>
              <Pressable onPress={() => setTab("reminders")} style={[styles.tabBtn, tab === "reminders" && styles.tabBtnActive]}>
                <Clock3 size={13} color={tab === "reminders" ? T.tealDeep : T.muted} />
                <Text style={[styles.tabText, tab === "reminders" && styles.tabTextActive]}>
                  Reminders{reminders.length > 0 ? ` (${reminders.length})` : ""}
                </Text>
              </Pressable>
              <Pressable onPress={() => setTab("notices")} style={[styles.tabBtn, tab === "notices" && styles.tabBtnActive]}>
                <Megaphone size={13} color={tab === "notices" ? T.tealDeep : T.muted} />
                <Text style={[styles.tabText, tab === "notices" && styles.tabTextActive]}>
                  Notices{noticesUnread > 0 ? ` (${noticesUnread})` : ""}
                </Text>
              </Pressable>
            </View>

            <View style={styles.listWrap}>
              {tab === "notifications" ? (
                notifications.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <EmptyState icon={BellOff} title="No notifications yet" />
                  </View>
                ) : (
                  <FlatList
                    data={notifications}
                    keyExtractor={(n) => String(n.id)}
                    style={{ maxHeight: 400 }}
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
                )
              ) : tab === "reminders" ? (
                reminders.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <EmptyState icon={CalendarClock} title="No upcoming reminders" subtitle="Turn these on in Settings, or open My Shifts." />
                  </View>
                ) : (
                  <FlatList
                    data={reminders}
                    keyExtractor={(r) => String(r.rosterId)}
                    style={{ maxHeight: 400 }}
                    renderItem={({ item: r }) => (
                      <View style={styles.reminderRow}>
                        <IconChip bg={T.tealBg} size={30}>
                          <Clock3 size={14} color={T.tealDeep} />
                        </IconChip>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.notifTitle}>{r.shiftName}</Text>
                          <Text style={styles.notifMessage}>
                            {formatDayLabel(r.date)} · {r.startTime.slice(0, 5)}
                          </Text>
                          <Text style={styles.notifTime}>{timeUntil(r.triggerAt)}</Text>
                        </View>
                      </View>
                    )}
                  />
                )
              ) : notices.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <EmptyState icon={Megaphone} title="No notices" subtitle="Store-wide announcements from your manager show up here." />
                </View>
              ) : (
                <FlatList
                  data={notices}
                  keyExtractor={(n) => String(n.id)}
                  style={{ maxHeight: 400 }}
                  renderItem={({ item: n }) => (
                    <Pressable
                      onPress={() => !n.is_read && markNoticeRead(n.id)}
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
