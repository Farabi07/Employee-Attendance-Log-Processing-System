import React, { useState } from "react";
import { X } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import Avatar from "./Avatar";

export default function ProfileModal({ onClose }) {
  const { user, isManager, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const initials = `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserSetPassword(), { current_password: currentPassword, new_password: newPassword });
      setMessage({ type: "success", text: "Password updated. Please log in again." });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(logout, 1500);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(22,35,58,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
    >
      <Card style={{ width: "min(360px, 92vw)", padding: "24px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={initials} size={44} />
            <div>
              <p style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: 0 }}>
                {user.first_name} {user.last_name}
              </p>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: 0 }}>{user.email}</p>
              <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.faint, margin: "2px 0 0" }}>{isManager ? "Manager" : "Employee"}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Close">
            <X size={18} color={T.muted} />
          </button>
        </div>

        <div style={{ borderTop: `1px solid ${T.line2}`, paddingTop: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 13.5, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>Change password</h3>
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              required
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, marginBottom: 10 }}
            />
            <input
              type="password"
              required
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, marginBottom: 14 }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
            {message && (
              <p style={{ fontFamily: fontBody, fontSize: 12, color: message.type === "error" ? T.coral : T.teal, marginTop: 10, textAlign: "center" }}>
                {message.text}
              </p>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
