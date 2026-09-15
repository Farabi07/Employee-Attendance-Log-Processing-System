import React, { useEffect, useState } from "react";
import { X, Hash, Globe, Lock } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import TeammatePickerList from "./TeammatePickerList";

// Manager/moderator only (Chat.jsx only ever renders this for that role) —
// either an invite-only ("selective") channel with member_ids picked up
// front, or a "public" one every org member already has access to. Mirrors
// mobile's screens/chat/CreateChannelScreen.tsx.
export default function CreateChannelModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(endpoints.teammatesAll())
      .then((res) => setEmployees(res.employees || []))
      .catch(() => {});
  }, []);

  const toggle = (id) => setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const inputStyle = { width: "100%", padding: "9px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, marginBottom: 12, boxSizing: "border-box" };

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Give the channel a name.");
      return;
    }
    setError(null);
    setCreating(true);
    try {
      const channel = await api.post(endpoints.channelCreate(), {
        name: name.trim(),
        description: description.trim(),
        is_public: isPublic,
        ...(isPublic ? {} : { member_ids: selectedIds }),
      });
      onCreated(channel);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,58,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <Card style={{ width: "min(420px, 92vw)", padding: "22px 22px", maxHeight: "88vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: T.tealBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isPublic ? <Globe size={16} color={T.tealDeep} /> : <Hash size={16} color={T.tealDeep} />}
            </div>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>New channel</h3>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Close">
            <X size={18} color={T.muted} />
          </button>
        </div>

        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, marginTop: 0, marginBottom: 16, lineHeight: 1.5 }}>
          {isPublic
            ? "Public — everyone in your organization can see and join this channel automatically."
            : "Selective — only the people you add below can see this channel. You can add or remove members later."}
        </p>

        <form onSubmit={create}>
          <input placeholder="Channel name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} style={inputStyle} />
          <input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} style={inputStyle} />

          <p style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.ink, margin: "4px 0 6px" }}>Visibility</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setIsPublic(false)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 8,
                border: `1.5px solid ${!isPublic ? T.teal : T.line}`, background: !isPublic ? T.tealBg : T.card, color: !isPublic ? T.tealDeep : T.muted,
                fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Lock size={13} /> Selective
            </button>
            <button
              type="button"
              onClick={() => setIsPublic(true)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 0", borderRadius: 8,
                border: `1.5px solid ${isPublic ? T.teal : T.line}`, background: isPublic ? T.tealBg : T.card, color: isPublic ? T.tealDeep : T.muted,
                fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Globe size={13} /> Public
            </button>
          </div>

          {!isPublic && (
            <>
              <p style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.ink, margin: "4px 0 6px" }}>
                Add members{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
              </p>
              <TeammatePickerList employees={employees} selectedIds={selectedIds} onToggle={toggle} />
            </>
          )}

          {error && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.coral, marginTop: 10 }}>{error}</p>}

          <button
            type="submit"
            disabled={creating}
            style={{ width: "100%", marginTop: 16, padding: "10px 0", borderRadius: 9, border: "none", background: T.teal, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: creating ? 0.7 : 1 }}
          >
            {creating ? "Creating…" : "Create channel"}
          </button>
        </form>
      </Card>
    </div>
  );
}
