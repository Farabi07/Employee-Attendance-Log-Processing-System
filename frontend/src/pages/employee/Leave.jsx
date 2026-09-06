import React, { useEffect, useState, useCallback } from "react";
import { PieChart, Paperclip } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api, BASE_URL } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

export default function EmployeeLeave() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [balance, setBalance] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const [typesRes, historyRes, balanceRes] = await Promise.all([
      api.get(endpoints.leaveTypesAll()),
      api.get(endpoints.leaveRequestByEmployee(user.id, "?size=100")),
      api.get(endpoints.leaveBalanceMine()),
    ]);
    const types = typesRes.leave_types || [];
    setLeaveTypes(types);
    if (types.length && !leaveTypeId) setLeaveTypeId(String(types[0].id));
    setHistory(historyRes.leave_requests || []);
    setBalance(balanceRes.balance || []);
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const balanceByTypeId = Object.fromEntries(balance.map((b) => [b.leave_type_id, b]));
  const totalUsed = balance.reduce((sum, b) => sum + b.used, 0);
  const totalQuota = balance.reduce((sum, b) => sum + b.days_per_year, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!leaveTypeId || !from || !to) {
      setMessage({ type: "error", text: "Please fill in leave type and both dates." });
      return;
    }
    setSubmitting(true);
    try {
      if (attachment) {
        const form = new FormData();
        form.append("leave_type", leaveTypeId);
        form.append("start_date", from);
        form.append("end_date", to);
        if (reason) form.append("reason", reason);
        form.append("attachment", attachment);
        await api.post(endpoints.leaveRequestCreate(), form);
      } else {
        await api.post(endpoints.leaveRequestCreate(), {
          leave_type: Number(leaveTypeId),
          start_date: from,
          end_date: to,
          reason,
        });
      }
      setMessage({ type: "success", text: "Sent to your manager for review." });
      setFrom("");
      setTo("");
      setReason("");
      setAttachment(null);
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "340px 1fr", gap: 20 }}>
      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Request leave</h3>

        <form onSubmit={handleSubmit}>
          <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 }}>Leave type</label>
          <select
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, color: T.ink, marginBottom: 14, background: T.card }}
          >
            {leaveTypes.length === 0 && <option value="">No leave types yet</option>}
            {leaveTypes.map((lt) => {
              const b = balanceByTypeId[lt.id];
              const suffix = b && b.days_per_year > 0 ? ` (${b.remaining} of ${b.days_per_year} left)` : "";
              return (
                <option key={lt.id} value={lt.id}>
                  {lt.name}{suffix}
                </option>
              );
            })}
          </select>

          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 }}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, color: T.ink }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 }}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, color: T.ink }}
              />
            </div>
          </div>

          <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 }}>Reason</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, color: T.ink, marginBottom: 12, resize: "vertical" }}
          />

          <label
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: fontBody, fontSize: 12, color: T.muted, marginBottom: 16, cursor: "pointer" }}
          >
            <Paperclip size={13} />
            {attachment ? attachment.name : "Attach a document (optional, e.g. a medical certificate)"}
            <input type="file" onChange={(e) => setAttachment(e.target.files?.[0] || null)} style={{ display: "none" }} />
          </label>

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
            {submitting ? "Sending…" : "Submit request"}
          </button>
          {message && (
            <p
              style={{
                fontFamily: fontBody,
                fontSize: 12.5,
                color: message.type === "error" ? T.coral : T.teal,
                marginTop: 10,
                textAlign: "center",
              }}
            >
              {message.text}
            </p>
          )}
        </form>
      </Card>

      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>
          <PieChart size={16} /> Leave balance
        </h3>
        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 14px" }}>
          {totalQuota > 0 ? `${totalUsed} of ${totalQuota} days used this year` : "This year"}
        </p>
        {balance.length === 0 ? (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No leave types set up yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {balance.map((b) => (
              <div key={b.leave_type_id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontFamily: fontBody, fontSize: 13, color: T.ink }}>{b.name}</span>
                  <span style={{ fontFamily: fontMono, fontSize: 12.5, color: T.muted }}>
                    {b.days_per_year > 0 ? `${b.used} / ${b.days_per_year} days` : `${b.used} days (unlimited)`}
                  </span>
                </div>
                {b.days_per_year > 0 && (
                  <div style={{ height: 6, borderRadius: 3, background: T.line2, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.min(100, (b.used / b.days_per_year) * 100)}%`,
                        background: b.remaining === 0 ? T.coral : T.teal,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card style={{ padding: "22px 24px", gridColumn: isMobile ? "auto" : "1 / -1" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Your requests</h3>
        {loading && <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>}
        {!loading && history.length === 0 && (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No leave requests yet.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {history.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", padding: "13px 0", borderTop: i === 0 ? "none" : `1px solid ${T.line2}` }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 500, color: T.ink, margin: "0 0 3px" }}>
                  {l.leave_type?.name || "Leave"}
                </p>
                <p style={{ fontFamily: fontMono, fontSize: 12, color: T.muted, margin: 0 }}>
                  {l.start_date} – {l.end_date}
                </p>
                {l.attachment && (
                  <a
                    href={`${BASE_URL}${l.attachment}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: fontBody, fontSize: 11.5, color: T.navyDeep, marginTop: 4 }}
                  >
                    <Paperclip size={11} /> View attachment
                  </a>
                )}
              </div>
              <StatusPill status={l.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
