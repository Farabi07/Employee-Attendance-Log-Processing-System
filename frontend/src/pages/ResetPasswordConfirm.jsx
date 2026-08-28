import React, { useState } from "react";
import { Clock } from "lucide-react";
import { T, fontDisplay, fontBody } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "../components/Card";

export default function ResetPasswordConfirm({ uid, token, onDone }) {
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserResetPasswordConfirm(), { uid, token, new_password: newPassword });
      setDone(true);
    } catch (err) {
      setError(err.message || "This reset link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody, padding: 16 }}
    >
      <Card style={{ width: "min(360px, 100%)", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 26 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.navy, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={16} color={T.paper} strokeWidth={2} />
          </div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18, color: T.ink }}>TimeTap</span>
        </div>

        <h1 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Set a new password</h1>

        {done ? (
          <>
            <p style={{ fontFamily: fontBody, fontSize: 13.5, color: T.teal, margin: "16px 0" }}>Password updated — you can sign in now.</p>
            <button
              onClick={onDone}
              style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}
            >
              Go to sign in
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 16px" }}>Choose a new password for your account.</p>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, marginBottom: 14 }}
            />
            {error && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, margin: "0 0 14px" }}>{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
