import React, { useEffect, useState, useCallback } from "react";
import { Check, X, Clock3, Paperclip, Repeat } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api, BASE_URL } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatMoney } from "../../lib/currency";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import StatusPill from "../../components/StatusPill";

function initialsOf(emp) {
  if (!emp) return "?";
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

const KIND_LABEL = { overtime: "Overtime", shortfall: "Shortfall" };

function PayAdjustmentRow({ request: r, onDecided }) {
  const [open, setOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState(r.requested_amount);
  const [managerNote, setManagerNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api.post(endpoints.payAdjustmentReview(r.id), {
        granted_amount: grantAmount,
        manager_note: managerNote || undefined,
      });
      onDecided();
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <Avatar initials={initialsOf(r.employee)} size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
            <p style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
              {r.employee?.first_name} {r.employee?.last_name}
            </p>
            <span
              style={{
                fontFamily: fontBody, fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999,
                background: r.kind === "overtime" ? T.tealBg : T.amberBg, color: r.kind === "overtime" ? T.tealDeep : T.amber,
              }}
            >
              {KIND_LABEL[r.kind]}
            </span>
          </div>
          <p style={{ fontFamily: fontMono, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>
            {r.attendance_date} · {r.hours}h · requesting {formatMoney(r.requested_amount, r.currency)}
          </p>
          {r.note && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.ink, margin: "0 0 6px", lineHeight: 1.5 }}>"{r.note}"</p>}
          {r.attachment && (
            <a
              href={`${BASE_URL}${r.attachment}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: fontBody, fontSize: 12, color: T.navyDeep, marginBottom: 6 }}
            >
              <Paperclip size={12} /> View attachment
            </a>
          )}
        </div>
        {!open && (
          <button
            onClick={() => setOpen(true)}
            style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.tealBg, color: T.tealDeep, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
          >
            Decide
          </button>
        )}
      </div>

      {open && (
        <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 9, background: T.line2 }}>
          <label style={{ fontFamily: fontBody, fontSize: 11.5, color: T.muted, display: "block", marginBottom: 6 }}>Grant amount</label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <input
              type="number" step="0.01" min="0" max={r.requested_amount}
              value={grantAmount}
              onChange={(e) => setGrantAmount(e.target.value)}
              style={{ width: 110, padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontMono, fontSize: 12.5 }}
            />
            {[
              { label: "Full", value: r.requested_amount },
              { label: "Half", value: (Number(r.requested_amount) / 2).toFixed(2) },
              { label: "None", value: "0" },
            ].map((opt) => (
              <button
                key={opt.label}
                onClick={() => setGrantAmount(opt.value)}
                style={{ padding: "7px 11px", borderRadius: 7, border: `1px solid ${T.line}`, background: T.card, fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.ink, cursor: "pointer" }}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <textarea
            placeholder="Note to the employee (optional)"
            value={managerNote}
            onChange={(e) => setManagerNote(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, resize: "vertical", marginBottom: 10, boxSizing: "border-box" }}
          />
          {error && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.coral, margin: "0 0 8px" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={send}
              disabled={sending}
              style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.teal, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {sending ? "Sending…" : "Send decision"}
            </button>
            <button
              onClick={() => setOpen(false)}
              disabled={sending}
              style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManagerApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState(null);
  const [payAdjustments, setPayAdjustments] = useState([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loadingSwaps, setLoadingSwaps] = useState(true);
  const [decidingSwapId, setDecidingSwapId] = useState(null);

  const load = useCallback(async () => {
    const res = await api.get(endpoints.leaveRequestAll("?status=pending&size=100"));
    setRequests(res.leave_requests || []);
  }, []);

  const loadAdjustments = useCallback(async () => {
    const res = await api.get(endpoints.payAdjustmentAll("?status=pending"));
    setPayAdjustments(res.requests || []);
  }, []);

  const loadSwaps = useCallback(async () => {
    const res = await api.get(endpoints.shiftSwapAll());
    setSwapRequests(res.pending || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    loadAdjustments().finally(() => setLoadingAdjustments(false));
    loadSwaps().finally(() => setLoadingSwaps(false));
  }, [load, loadAdjustments, loadSwaps]);

  const decide = async (id, status) => {
    setDecidingId(id);
    try {
      await api.post(endpoints.leaveRequestReview(id), { status });
      await load();
    } finally {
      setDecidingId(null);
    }
  };

  const decideSwap = async (id, action) => {
    setDecidingSwapId(id);
    try {
      await api.post(endpoints.shiftSwapReview(id), { action });
      await loadSwaps();
    } finally {
      setDecidingSwapId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Leave approvals</h3>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 18px" }}>
          {loading ? "Loading…" : `${requests.length} awaiting your review`}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!loading && requests.length === 0 && (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Nothing pending — you're all caught up.</p>
          )}
          {requests.map((r) => (
            <div key={r.id} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Avatar initials={initialsOf(r.employee)} size={38} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <p style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: T.ink, margin: 0 }}>
                    {r.employee?.first_name} {r.employee?.last_name}
                  </p>
                  <span style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted }}>· {r.leave_type?.name || "Leave"}</span>
                </div>
                <p style={{ fontFamily: fontMono, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>
                  {r.start_date} – {r.end_date}
                </p>
                {r.reason && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 6px", lineHeight: 1.5 }}>{r.reason}</p>}
                {r.attachment && (
                  <a
                    href={`${BASE_URL}${r.attachment}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: fontBody, fontSize: 12, color: T.navyDeep }}
                  >
                    <Paperclip size={12} /> View attachment
                  </a>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => decide(r.id, "rejected")}
                  disabled={decidingId === r.id}
                  style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.line}`, background: T.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Reject"
                >
                  <X size={16} color={T.coral} />
                </button>
                <button
                  onClick={() => decide(r.id, "approved")}
                  disabled={decidingId === r.id}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: T.teal, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Approve"
                >
                  <Check size={16} color="#fff" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <Clock3 size={16} /> Pay adjustment requests
        </h3>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 18px" }}>
          {loadingAdjustments ? "Loading…" : `${payAdjustments.length} awaiting your review`} — overtime worked beyond a shift, or hours short of one.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!loadingAdjustments && payAdjustments.length === 0 && (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Nothing pending here either.</p>
          )}
          {payAdjustments.map((r) => (
            <PayAdjustmentRow key={r.id} request={r} onDecided={loadAdjustments} />
          ))}
        </div>
      </Card>

      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
          <Repeat size={16} /> Shift swap approvals
        </h3>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 18px" }}>
          {loadingSwaps ? "Loading…" : `${swapRequests.length} awaiting your review`} — a colleague already agreed to take the shift, this finalizes it.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!loadingSwaps && swapRequests.length === 0 && (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Nothing pending here either.</p>
          )}
          {swapRequests.map((s) => (
            <div key={s.id} style={{ border: `1px solid ${T.line}`, borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 14 }}>
              <Avatar initials={initialsOf(s.requested_by)} size={38} />
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>
                  {s.requested_by?.first_name} {s.requested_by?.last_name} → {s.claimed_by?.first_name} {s.claimed_by?.last_name}
                </p>
                <p style={{ fontFamily: fontMono, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>
                  {s.roster?.shift?.name || "Shift"} · {s.roster?.date}
                </p>
                {s.reason && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.5 }}>"{s.reason}"</p>}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => decideSwap(s.id, "reject")}
                  disabled={decidingSwapId === s.id}
                  style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${T.line}`, background: T.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Reject"
                >
                  <X size={16} color={T.coral} />
                </button>
                <button
                  onClick={() => decideSwap(s.id, "approve")}
                  disabled={decidingSwapId === s.id}
                  style={{ width: 34, height: 34, borderRadius: 9, border: "none", background: T.teal, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                  aria-label="Approve"
                >
                  <Check size={16} color="#fff" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
