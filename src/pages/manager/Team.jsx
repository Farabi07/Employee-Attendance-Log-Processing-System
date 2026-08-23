import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Search, UserPlus } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 8,
  border: `1px solid ${T.line}`,
  fontFamily: fontBody,
  fontSize: 13.5,
  marginBottom: 14,
  background: T.card,
};
const labelStyle = { fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 };

function initialsOf(emp) {
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

export default function ManagerTeam() {
  const isMobile = useIsMobile();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isManagerRole, setIsManagerRole] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(endpoints.employeesAll());
    setEmployees(res.employees || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(
    () => employees.filter((e) => `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(query.toLowerCase())),
    [employees, query]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.employeeCreate(), {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        is_admin: isManagerRole,
      });
      setMessage({ type: "success", text: "Employee added." });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setIsManagerRole(false);
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 20 }}>
      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
          <UserPlus size={17} /> Add employee
        </h3>
        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>First name</label>
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required style={inputStyle} />

          <label style={labelStyle}>Last name</label>
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} required style={inputStyle} />

          <label style={labelStyle}>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />

          <label style={labelStyle}>Temporary password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isManagerRole} onChange={(e) => setIsManagerRole(e.target.checked)} />
            Give manager access
          </label>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: submitting ? 0.7 : 1, marginTop: 4 }}
          >
            {submitting ? "Adding…" : "Add employee"}
          </button>
          {message && (
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: message.type === "error" ? T.coral : T.teal, marginTop: 10, textAlign: "center" }}>
              {message.text}
            </p>
          )}
        </form>
      </Card>

      <Card style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>Team ({employees.length})</h3>
          <div style={{ position: "relative" }}>
            <Search size={14} color={T.faint} style={{ position: "absolute", left: 10, top: 9 }} />
            <input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: "7px 10px 7px 30px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, width: 160 }}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {filtered.map((emp, i) => (
              <div
                key={emp.id}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 4px", borderTop: i === 0 ? "none" : `1px solid ${T.line2}`, minWidth: 280 }}
              >
                <Avatar initials={initialsOf(emp)} size={32} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 500, color: T.ink, margin: 0 }}>
                    {emp.first_name} {emp.last_name}
                  </p>
                  <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: 0 }}>{emp.email}</p>
                </div>
                {emp.is_admin && (
                  <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: T.teal, background: T.tealBg, padding: "3px 8px", borderRadius: 999 }}>
                    Manager
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
