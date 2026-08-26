import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Search, UserPlus, DollarSign, ShieldCheck, History } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useAuth } from "../../lib/auth";
import { currencySymbol, formatMoney, CURRENCIES } from "../../lib/currency";
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
const cardTitleStyle = { fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 };

const ROLE_BADGE = {
  manager: { label: "Manager", color: T.teal, bg: T.tealBg },
  moderator: { label: "Moderator", color: T.amber, bg: T.amberBg },
};

const PAYOUT_CYCLES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const MODERATOR_PERMISSIONS = [
  { key: "moderator_can_add_employees", label: "Add employees", hint: "Never other moderators — that stays Manager-only." },
  { key: "moderator_can_manage_qr", label: "Manage check-in QR & geofence", hint: "" },
  { key: "moderator_can_manage_subscription", label: "Manage subscription/billing", hint: "" },
];

function initialsOf(emp) {
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

export default function ManagerTeam() {
  const isMobile = useIsMobile();
  const { isManager, billing, refreshBilling } = useAuth();
  const canAddEmployees = isManager || !!billing?.can_add_employees;
  const [savingAccess, setSavingAccess] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgRole, setOrgRole] = useState("employee");
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState(billing?.currency || "usd");
  const [payoutCycle, setPayoutCycle] = useState("weekly");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingPayId, setEditingPayId] = useState(null);
  const [editRate, setEditRate] = useState("");
  const [editCurrency, setEditCurrency] = useState("usd");
  const [editCycle, setEditCycle] = useState("weekly");
  const [savingPay, setSavingPay] = useState(false);

  const [historyForId, setHistoryForId] = useState(null);
  const [historyById, setHistoryById] = useState({});
  const [loadingHistory, setLoadingHistory] = useState(false);

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
        org_role: isManager ? orgRole : "employee",
        payout_cycle: payoutCycle,
        ...(hourlyRate ? { hourly_rate: hourlyRate, currency } : {}),
      });
      setMessage({ type: "success", text: "Employee added." });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setOrgRole("employee");
      setHourlyRate("");
      setCurrency(billing?.currency || "usd");
      setPayoutCycle("weekly");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleModAccess = async (key, checked) => {
    setSavingAccess(key);
    try {
      await api.put(endpoints.organizationSettings(), { [key]: checked });
      await refreshBilling();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingAccess(null);
    }
  };

  const startEditPay = (emp) => {
    setHistoryForId(null);
    setEditingPayId(emp.id);
    setEditRate(emp.hourly_rate ?? "");
    setEditCurrency(emp.currency || billing?.currency || "usd");
    setEditCycle(emp.payout_cycle || "weekly");
  };

  const savePay = async (id) => {
    setSavingPay(true);
    try {
      await api.put(endpoints.employeeUpdate(id), {
        payout_cycle: editCycle,
        ...(editRate !== "" ? { hourly_rate: editRate, currency: editCurrency } : {}),
      });
      setEditingPayId(null);
      setHistoryById((h) => ({ ...h, [id]: undefined }));
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingPay(false);
    }
  };

  const toggleHistory = async (emp) => {
    setEditingPayId(null);
    if (historyForId === emp.id) {
      setHistoryForId(null);
      return;
    }
    setHistoryForId(emp.id);
    if (!historyById[emp.id]) {
      setLoadingHistory(true);
      try {
        const res = await api.get(endpoints.rateHistory(emp.id));
        setHistoryById((h) => ({ ...h, [emp.id]: res.history || [] }));
      } catch (err) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {canAddEmployees ? (
          <Card style={{ padding: "22px 24px" }}>
            <h3 style={cardTitleStyle}>
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

              {isManager ? (
                <>
                  <label style={labelStyle}>Role</label>
                  <select value={orgRole} onChange={(e) => setOrgRole(e.target.value)} style={inputStyle}>
                    <option value="employee">Employee</option>
                    <option value="moderator">Moderator (can manage shifts, leave &amp; employees, but not create staff or branch QR codes)</option>
                  </select>
                </>
              ) : (
                <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.faint, margin: "-6px 0 14px" }}>
                  Added as a regular Employee — only the Manager can create Moderators.
                </p>
              )}

              <label style={labelStyle}>Hourly rate (optional)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="number" step="0.01" min="0" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder="e.g. 15.00" style={{ ...inputStyle, flex: 1 }} />
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={{ ...inputStyle, width: 90, flex: "0 0 auto" }}>
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.value.toUpperCase()}</option>
                  ))}
                </select>
              </div>

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
            <h3 style={{ ...cardTitleStyle, marginBottom: 10 }}>Add employee</h3>
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 }}>
              Only the store Manager can add new employees or moderators — ask them to turn on "Add employees" below if you need this.
            </p>
          </Card>
        )}

        {isManager && (
          <Card style={{ padding: "20px 22px" }}>
            <h3 style={{ ...cardTitleStyle, marginBottom: 4 }}>
              <ShieldCheck size={16} /> Moderator access
            </h3>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 14px" }}>
              A Moderator can always manage shifts, roster and leave. Everything below is off until you turn it on.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {MODERATOR_PERMISSIONS.map((opt) => (
                <label key={opt.key} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontFamily: fontBody, fontSize: 12.5, color: T.ink, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={!!billing?.[opt.key]}
                    onChange={(e) => toggleModAccess(opt.key, e.target.checked)}
                    disabled={savingAccess === opt.key}
                    style={{ marginTop: 2 }}
                  />
                  <span>
                    {opt.label}
                    {opt.hint && <span style={{ display: "block", color: T.faint, fontSize: 11, marginTop: 1 }}>{opt.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Card style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
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
        ) : filtered.length === 0 ? (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No one matches "{query}".</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            {filtered.map((emp, i) => {
              const badge = ROLE_BADGE[emp.org_role];
              const isEditing = editingPayId === emp.id;
              const isHistoryOpen = historyForId === emp.id;
              const history = historyById[emp.id];
              return (
                <div key={emp.id} style={{ borderTop: i === 0 ? "none" : `1px solid ${T.line2}`, minWidth: 420 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 4px" }}>
                    <Avatar initials={initialsOf(emp)} size={34} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 600, color: T.ink, margin: 0, whiteSpace: "nowrap" }}>
                          {emp.first_name} {emp.last_name}
                        </p>
                        {badge && (
                          <span style={{ fontFamily: fontBody, fontSize: 10.5, fontWeight: 600, color: badge.color, background: badge.bg, padding: "2px 7px", borderRadius: 999, flexShrink: 0 }}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: "2px 0 0" }}>
                        {emp.email}
                        {emp.hourly_rate && (
                          <> · {currencySymbol(emp.currency)}{Number(emp.hourly_rate).toFixed(2)}/h · {PAYOUT_CYCLES.find((c) => c.value === emp.payout_cycle)?.label || "Weekly"}</>
                        )}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => toggleHistory(emp)}
                        aria-label="View pay history"
                        title="Pay history"
                        style={{ border: "none", background: isHistoryOpen ? T.tealBg : "transparent", borderRadius: 7, cursor: "pointer", padding: 6, display: "flex" }}
                      >
                        <History size={15} color={isHistoryOpen ? T.tealDeep : T.faint} />
                      </button>
                      {canAddEmployees && (
                        <button
                          onClick={() => (isEditing ? setEditingPayId(null) : startEditPay(emp))}
                          aria-label="Edit pay"
                          title="Edit pay"
                          style={{ border: "none", background: isEditing ? T.tealBg : "transparent", borderRadius: 7, cursor: "pointer", padding: 6, display: "flex" }}
                        >
                          <DollarSign size={15} color={isEditing ? T.tealDeep : T.teal} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "0 4px 14px 46px", flexWrap: "wrap" }}>
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
                        value={editCurrency}
                        onChange={(e) => setEditCurrency(e.target.value)}
                        style={{ padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }}
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.value.toUpperCase()}</option>
                        ))}
                      </select>
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

                  {isHistoryOpen && (
                    <div style={{ padding: "0 4px 14px 46px" }}>
                      {loadingHistory && !history ? (
                        <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: 0 }}>Loading…</p>
                      ) : !history || history.length === 0 ? (
                        <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: 0 }}>No pay changes recorded yet.</p>
                      ) : (
                        history.map((h) => (
                          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontFamily: fontBody, fontSize: 12 }}>
                            <span style={{ color: T.faint, fontFamily: fontMono, width: 130, flexShrink: 0 }}>
                              {new Date(h.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                            </span>
                            <span style={{ color: T.ink }}>
                              {h.old_hourly_rate ? `${formatMoney(h.old_hourly_rate, h.old_currency)} → ` : "Set to "}
                              <strong>{formatMoney(h.new_hourly_rate, h.new_currency)}/h</strong>
                              {h.changed_by && ` by ${h.changed_by.first_name} ${h.changed_by.last_name}`}
                            </span>
                          </div>
                        ))
                      )}
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
