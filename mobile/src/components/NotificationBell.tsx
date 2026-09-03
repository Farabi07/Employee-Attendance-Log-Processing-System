import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Pressable, Modal, FlatList, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { T, fonts } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";

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

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoints.notificationsMine("?size=15"));
      setNotifications(res.notifications || []);
      setUnreadCount(res.unread_count || 0);
    } catch {
      // silent — polling, don't disrupt the UI on a transient failure
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
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
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.bellButton}>
        <Bell size={15} color={T.navyDeep} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
          </View>
        )}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <Pressable onPress={markAllRead}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </Pressable>
              )}
            </View>
            {notifications.length === 0 ? (
              <Text style={styles.emptyText}>No notifications yet.</Text>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(n) => String(n.id)}
                style={{ maxHeight: 420 }}
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
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellButton: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: T.navyBg,
    borderWidth: 1,
    borderColor: T.navyBg,
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
    maxHeight: 460,
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
    borderBottomWidth: 1,
    borderBottomColor: T.line2,
  },
  panelTitle: { fontFamily: fonts.display.semibold, fontSize: 13.5, color: T.ink },
  markAllText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.teal },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, padding: 16 },
  notifRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: T.line2, flexDirection: "row", gap: 8 },
  notifRowUnread: { backgroundColor: T.tealBg },
  unreadDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.teal, marginTop: 5 },
  notifTitle: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.ink, marginBottom: 2 },
  notifMessage: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 4, lineHeight: 17 },
  notifTime: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint },
});
