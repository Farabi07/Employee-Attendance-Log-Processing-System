import React, { useState } from "react";
import { T, fontBody } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";

export default function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserResetPassword(), { email });
      setSent(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div>
        <p style={{ fontFamily: fontBody, fontSize: 13.5, color: T.ink, margin: "0 0 16px" }}>
          If an account exists for <strong>{email}</strong>, a reset link has been sent.
        </p>
        <button
          onClick={onBack}
          style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: `1px solid ${T.line}`, background: T.card, fontFamily: fontBody, fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 16px" }}>
        Enter your work email and we'll send you a reset link.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@company.com"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, marginBottom: 14 }}
      />
      {error && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, margin: "0 0 14px" }}>{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: submitting ? 0.7 : 1, marginBottom: 10 }}
      >
        {submitting ? "Sending…" : "Send reset link"}
      </button>
      <button
        type="button"
        onClick={onBack}
        style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: "transparent", fontFamily: fontBody, fontSize: 12.5, color: T.muted, cursor: "pointer" }}
      >
        Back to sign in
      </button>
    </form>
  );
}
