import React, { useEffect, useState, useCallback } from "react";
import { Check, X } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import StatusPill from "../../components/StatusPill";

function initialsOf(emp) {
  if (!emp) return "?";
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

export default function ManagerApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState(null);

  const load = useCallback(async () => {
    const res = await api.get(endpoints.leaveRequestAll("?status=pending&size=100"));
    setRequests(res.leave_requests || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const decide = async (id, status) => {
    setDecidingId(id);
    try {
      await api.post(endpoints.leaveRequestReview(id), { status });
      await load();
    } finally {
      setDecidingId(null);
    }
  };

  return (
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
              {r.reason && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0, lineHeight: 1.5 }}>{r.reason}</p>}
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
  );
}
