import React, { useState } from "react";
import { Clock } from "lucide-react";
import { T, fontDisplay, fontBody } from "../theme";
import { useAuth } from "../lib/auth";
import Card from "../components/Card";
import ForgotPassword from "./ForgotPassword";

export default function Login({ onSignup }) {
  const { login } = useAuth();
  const [mode, setMode] = useState("login"); // "login" | "forgot"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.paper,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fontBody,
        padding: 16,
      }}
    >
      <Card style={{ width: "min(360px, 100%)", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 26 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={16} color={T.paper} strokeWidth={2} />
          </div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18, color: T.ink }}>Roster</span>
        </div>

        {mode === "login" ? (
          <>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Sign in</h1>
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 22px" }}>
              Use your work email and password.
            </p>

            <form onSubmit={handleSubmit}>
              <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 }}>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, marginBottom: 14 }}
              />

              <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 }}>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, marginBottom: 10 }}
              />

              <div style={{ textAlign: "right", marginBottom: 18 }}>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  style={{ border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer", padding: 0 }}
                >
                  Forgot password?
                </button>
              </div>

              {error && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, margin: "0 0 14px" }}>{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "11px 0",
                  borderRadius: 9,
                  border: "none",
                  background: T.ink,
                  color: T.paper,
                  fontFamily: fontBody,
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                }}
              >
                {submitting ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, textAlign: "center", marginTop: 16 }}>
              New store?{" "}
              <button
                type="button"
                onClick={onSignup}
                style={{ border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 0 }}
              >
                Start a free trial
              </button>
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Reset password</h1>
            <ForgotPassword onBack={() => setMode("login")} />
          </>
        )}
      </Card>
    </div>
  );
}
