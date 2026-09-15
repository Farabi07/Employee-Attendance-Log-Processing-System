import React, { useEffect, useRef, useState, useCallback } from "react";
import { Bell, Megaphone } from "lucide-react";
import { T, fontDisplay, fontBody } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";

function timeAgo(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Mirrors mobile's components/NotificationBell.tsx — same 20s polling, same
// optimistic mark-read/mark-all-read. No "Reminders" tab here (those are
// scheduled entirely on-device on mobile, nothing to show on web).
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("notifications");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notices, setNotices] = useState([]);
  const [noticesUnread, setNoticesUnread] = useState(0);
  const rootRef = useRef(null);

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

  useEffect(() => {
    function onClickOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const markRead = async (id) => {
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

  const markNoticeRead = async (id) => {
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
  const list = tab === "notifications" ? notifications : notices;
  const onItemClick = tab === "notifications" ? markRead : markNoticeRead;

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        style={{
          position: "relative",
          border: `1px solid ${T.navyBg}`,
          background: T.navyBg,
          borderRadius: 9,
          width: 34,
          height: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Bell size={15} color={T.navyDeep} />
        {totalUnread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -4,
              right: -4,
              minWidth: 16,
              height: 16,
              padding: "0 3px",
              borderRadius: 8,
              background: T.coral,
              color: "#fff",
              fontFamily: fontBody,
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 42,
            right: 0,
            width: 340,
            maxHeight: 440,
            overflowY: "auto",
            background: T.card,
            border: `1px solid ${T.line}`,
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(22,35,58,0.12)",
            zIndex: 50,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px 8px" }}>
            <span style={{ fontFamily: fontDisplay, fontSize: 13.5, fontWeight: 600, color: T.ink }}>Notifications</span>
            {tab === "notifications" && unreadCount > 0 && (
              <button onClick={markAllRead} style={{ border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Mark all read
              </button>
            )}
            {tab === "notices" && noticesUnread > 0 && (
              <button onClick={markAllNoticesRead} style={{ border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 6, padding: "0 14px 10px" }}>
            <button
              onClick={() => setTab("notifications")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 0", borderRadius: 7, border: "none",
                background: tab === "notifications" ? T.tealBg : T.line2, color: tab === "notifications" ? T.tealDeep : T.muted, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Bell size={12} /> Notifications{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
            <button
              onClick={() => setTab("notices")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "6px 0", borderRadius: 7, border: "none",
                background: tab === "notices" ? T.tealBg : T.line2, color: tab === "notices" ? T.tealDeep : T.muted, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Megaphone size={12} /> Notices{noticesUnread > 0 ? ` (${noticesUnread})` : ""}
            </button>
          </div>

          <div style={{ borderTop: `1px solid ${T.line2}` }}>
            {list.length === 0 && (
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, padding: 16, margin: 0 }}>
                {tab === "notifications" ? "No notifications yet." : "No notices yet."}
              </p>
            )}

            {list.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.is_read && onItemClick(n.id)}
                style={{
                  padding: "12px 14px",
                  borderBottom: `1px solid ${T.line2}`,
                  cursor: n.is_read ? "default" : "pointer",
                  background: n.is_read ? "transparent" : T.tealBg,
                  display: "flex",
                  gap: 8,
                }}
              >
                {!n.is_read && <div style={{ width: 6, height: 6, borderRadius: 3, background: T.teal, marginTop: 5, flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: T.ink, margin: "0 0 2px" }}>{n.title}</p>
                  {n.message && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 4px", lineHeight: 1.4 }}>{n.message}</p>}
                  <p style={{ fontFamily: fontBody, fontSize: 11, color: T.faint, margin: 0 }}>{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
