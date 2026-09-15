import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import TeammatePickerList from "./TeammatePickerList";

// Any org member can start a DM (no manager gating) — reuses an existing
// conversation with the same person instead of creating a duplicate every
// time (see chat/views/conversation_views.py::startConversation).
export default function NewDirectMessageModal({ onClose, onStarted }) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(endpoints.teammatesAll())
      .then((res) => setEmployees(res.employees || []))
      .finally(() => setLoading(false));
  }, []);

  const start = async (userId) => {
    setStarting(true);
    setError(null);
    try {
      const conversation = await api.post(endpoints.conversationStart(), { user_id: userId });
      onStarted(conversation);
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,58,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <Card style={{ width: "min(380px, 92vw)", padding: "22px 22px", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>New message</h3>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Close">
            <X size={18} color={T.muted} />
          </button>
        </div>

        {loading || starting ? (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, textAlign: "center", padding: "16px 0" }}>Loading…</p>
        ) : (
          <TeammatePickerList employees={employees} selectedIds={[]} onToggle={start} multi={false} />
        )}

        {error && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.coral, marginTop: 10 }}>{error}</p>}
      </Card>
    </div>
  );
}
