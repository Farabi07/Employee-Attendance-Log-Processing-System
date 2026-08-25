import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Search, UserPlus, DollarSign } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useAuth } from "../../lib/auth";
import { currencySymbol } from "../../lib/currency";
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

const ROLE_BADGE = {
  manager: { label: "Manager", color: T.teal, bg: T.tealBg },
  moderator: { label: "Moderator", color: T.amber, bg: T.amberBg },
};

const PAYOUT_CYCLES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

function initialsOf(emp) {
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

export default function ManagerTeam() {
  const isMobile = useIsMobile();
  const { isManager, billing } = useAuth();
  const symbol = currencySymbol(billing?.currency);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgRole, setOrgRole] = useState("employee");
  const [hourlyRate, setHourlyRate] = useState("");
  const [payoutCycle, setPayoutCycle] = useState("weekly");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingPayId, setEditingPayId] = useState(null);
  const [editRate, setEditRate] = useState("");
  const [editCycle, setEditCycle] = useState("weekly");
  const [savingPay, setSavingPay] = useState(false);

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
        org_role: orgRole,
        payout_cycle: payoutCycle,
        ...(hourlyRate ? { hourly_rate: hourlyRate } : {}),
      });
      setMessage({ type: "success", text: "Employee added." });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setOrgRole("employee");
      setHourlyRate("");
      setPayoutCycle("weekly");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const startEditPay = (emp) => {
    setEditingPayId(emp.id);
    setEditRate(emp.hourly_rate ?? "");
    setEditCycle(emp.payout_cycle || "weekly");
  };

  const savePay = async (id) => {
    setSavingPay(true);
    try {
      await api.put(endpoints.employeeUpdate(id), {
        payout_cycle: editCycle,
        ...(editRate !== "" ? { hourly_rate: editRate } : {}),
      });
      setEditingPayId(null);
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingPay(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 20 }}>
      {isManager ? (
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

            <label style={labelStyle}>Role</label>
            <select value={orgRole} onChange={(e) => setOrgRole(e.target.value)} style={inputStyle}>
              <option value="employee">Employee</option>
              <option value="moderator">Moderator (can manage shifts, leave &amp; employees, but not create staff or branch QR codes)</option>
            </select>

            <label style={labelStyle}>Hourly rate (optional, {symbol})</label>
            <input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 15.00" style={inputStyle} />

            <label style={labelStyle}>Pay out every</label>
            <select value={payoutCycle} onChange={(e) => setPayoutCycle(e.target.value)} style={inputStyle}>
              {PAYOUT_CYCLES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

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
      ) : (
        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 10px" }}>Add employee</h3>
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 }}>
            Only the store Manager can add new employees or moderators.
          </p>
        </Card>
      )}

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
            {filtered.map((emp, i) => {
              const badge = ROLE_BADGE[emp.org_role];
              const isEditing = editingPayId === emp.id;
              return (
                <div key={emp.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${T.line2}`, minWidth: 360 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 4px" }}>
                    <Avatar initials={initialsOf(emp)} size={32} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 500, color: T.ink, margin: 0 }}>
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: 0 }}>{emp.email}</p>
                    </div>
                    {emp.hourly_rate && (
                      <span style={{ fontFamily: fontMono, fontSize: 11.5, color: T.muted, whiteSpace: "nowrap" }}>
                        {symbol}{Number(emp.hourly_rate).toFixed(2)}/h · {PAYOUT_CYCLES.find((c) => c.value === emp.payout_cycle)?.label || "Weekly"}
                      </span>
                    )}
                    {badge && (
                      <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg, padding: "3px 8px", borderRadius: 999 }}>
                        {badge.label}
                      </span>
                    )}
                    {isManager && (
                      <button
                        onClick={() => (isEditing ? setEditingPayId(null) : startEditPay(emp))}
                        aria-label="Edit pay"
                        style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4, display: "flex" }}
                      >
                        <DollarSign size={15} color={T.teal} />
                      </button>
                    )}
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 4px 14px", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        placeholder="Hourly rate"
                        style={{ width: 110, padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }}
                      />
                      <select
                        value={editCycle}
                        onChange={(e) => setEditCycle(e.target.value)}
                        style={{ padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }}
                      >
                        {PAYOUT_CYCLES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => savePay(emp.id)}
                        disabled={savingPay}
                        style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: T.teal, color: "#fff", fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                      >
                        {savingPay ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
