import React, { useState } from "react";
import { X, Megaphone } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";

// Manager/moderator only (App.jsx only renders this for that role) — a
// broadcast to everyone else in the org, shown in their Notices tab
// (NotificationBell.jsx), kept separate from the regular Notifications
// feed. Mirrors mobile's screens/settings/SendNotice.tsx.
export default function SendNoticeModal({ onClose, onSent }) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const inputStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, marginBottom: 12, boxSizing: "border-box" };

  const send = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Give the notice a title.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const res = await api.post(endpoints.noticeCreate(), { title: title.trim(), message: message.trim() });
      onSent?.(res?.detail);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: T.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <Card style={{ width: "min(420px, 92vw)", padding: "22px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: T.amberBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Megaphone size={16} color={T.amber} />
            </div>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>Send a notice</h3>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Close">
            <X size={18} color={T.muted} />
          </button>
        </div>

        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
          Goes to everyone else in your organization as a notice — kept separate from their regular notifications.
        </p>

        <form onSubmit={send}>
          <input placeholder="Title, e.g. Store closed Friday" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} style={inputStyle} />
          <textarea
            placeholder="Message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />

          {error && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.coral, marginTop: -4, marginBottom: 12 }}>{error}</p>}

          <button
            type="submit"
            disabled={sending}
            style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: T.teal, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: sending ? 0.7 : 1 }}
          >
            {sending ? "Sending…" : "Send notice"}
          </button>
        </form>
      </Card>
    </div>
  );
}
