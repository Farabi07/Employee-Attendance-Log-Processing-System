import React, { useState } from "react";
import { Clock } from "lucide-react";
import { T, fontDisplay, fontBody } from "../theme";
import { useAuth } from "../lib/auth";
import Card from "../components/Card";

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, marginBottom: 14 };
const labelStyle = { fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 };

export default function Signup({ onBackToLogin }) {
  const { signup } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await signup({
        organization_name: organizationName,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody, padding: 16 }}>
      <Card style={{ width: "min(400px, 100%)", padding: "32px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 22 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Clock size={16} color={T.paper} strokeWidth={2} />
          </div>
          <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 18, color: T.ink }}>Roster</span>
        </div>

        <h1 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Start your free trial</h1>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 20px" }}>
          7 days free, no card required. Cancel anytime.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Store / business name</label>
          <input value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} required style={inputStyle} placeholder="e.g. Dhaka Coffee House" />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />
            </div>
          </div>

          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} placeholder="you@yourstore.com" />

          <label style={labelStyle}>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />

          {error && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, margin: "0 0 14px" }}>{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: submitting ? 0.7 : 1, marginBottom: 10 }}
          >
            {submitting ? "Creating your store…" : "Start free trial"}
          </button>
          <button
            type="button"
            onClick={onBackToLogin}
            style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: "transparent", fontFamily: fontBody, fontSize: 12.5, color: T.muted, cursor: "pointer" }}
          >
            Already have an account? Sign in
          </button>
        </form>
      </Card>
    </div>
  );
}
