import React, { useEffect, useState, useCallback } from "react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

export default function EmployeeLeave() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    const [typesRes, historyRes] = await Promise.all([
      api.get(endpoints.leaveTypesAll()),
      api.get(endpoints.leaveRequestByEmployee(user.id, "?size=100")),
    ]);
    const types = typesRes.leave_types || [];
    setLeaveTypes(types);
    if (types.length && !leaveTypeId) setLeaveTypeId(String(types[0].id));
    setHistory(historyRes.leave_requests || []);
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    if (!leaveTypeId || !from || !to) {
      setMessage({ type: "error", text: "Please fill in leave type and both dates." });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(endpoints.leaveRequestCreate(), {
        leave_type: Number(leaveTypeId),
        start_date: from,
        end_date: to,
        reason,
      });
      setMessage({ type: "success", text: "Sent to your manager for review." });
      setFrom("");
      setTo("");
      setReason("");
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
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
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
            style={{ width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, color: T.ink, marginBottom: 16, resize: "vertical" }}
          />

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
              </div>
              <StatusPill status={l.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
