import React, { useEffect, useState } from "react";
import { X, Plus, ChevronLeft } from "lucide-react";
import { T, fontBody, fontDisplay } from "../theme";
import { useAuth } from "../lib/auth";
import { api, mediaUrl } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import Avatar from "./Avatar";
import TeammatePickerList from "./TeammatePickerList";

function initialsOf(person) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
}

// Opened from Chat.jsx's thread header (channel threads only). Add/remove
// requires being a channel admin (the creator, by default) or an org
// manager/moderator — enforced server-side (chat/views/_access.py's
// require_channel_admin); this only hides the controls for the common
// case, since the server is the actual source of truth.
export default function ChannelMembersModal({ channelId, onClose, onChanged }) {
  const { user, isManagerOrModerator } = useAuth();
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = async () => {
    const res = await api.get(endpoints.channelDetail(channelId));
    setChannel(res);
    onChanged?.(res);
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const myMembership = channel?.members?.find((m) => m.member.id === user?.id);
  const canManage = isManagerOrModerator || !!myMembership?.is_admin;

  const openAdd = async () => {
    setAdding(true);
    setSelectedIds([]);
    setError(null);
    try {
      const res = await api.get(endpoints.teammatesAll());
      const memberIds = new Set((channel?.members || []).map((m) => m.member.id));
      setEmployees((res.employees || []).filter((e) => !memberIds.has(e.id)));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = (id) => setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const saveAdd = async () => {
    if (selectedIds.length === 0) {
      setAdding(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await api.post(endpoints.channelAddMembers(channelId), { member_ids: selectedIds });
      setChannel(updated);
      onChanged?.(updated);
      setAdding(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId) => {
    try {
      const updated = await api.post(endpoints.channelRemoveMember(channelId), { member_id: memberId });
      setChannel(updated);
      onChanged?.(updated);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(22,35,58,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
      <Card style={{ width: "min(380px, 92vw)", padding: "22px 22px", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {adding && (
              <button onClick={() => setAdding(false)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }} aria-label="Back">
                <ChevronLeft size={18} color={T.ink} />
              </button>
            )}
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>{adding ? "Add members" : "Members"}</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {!adding && canManage && (
              <button
                onClick={openAdd}
                style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: T.tealBg, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                aria-label="Add members"
              >
                <Plus size={14} color={T.tealDeep} />
              </button>
            )}
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Close">
              <X size={18} color={T.muted} />
            </button>
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, textAlign: "center", padding: "16px 0" }}>Loading…</p>
        ) : adding ? (
          <>
            <TeammatePickerList employees={employees} selectedIds={selectedIds} onToggle={toggle} />
            <button
              onClick={saveAdd}
              disabled={saving || selectedIds.length === 0}
              style={{ width: "100%", marginTop: 14, padding: "10px 0", borderRadius: 9, border: "none", background: T.teal, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: saving || selectedIds.length === 0 ? 0.6 : 1 }}
            >
              {saving ? "Adding…" : `Add${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
            </button>
          </>
        ) : (
          (channel?.members || []).map((m, i) => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: i > 0 ? `1px solid ${T.line2}` : "none" }}>
              <Avatar initials={initialsOf(m.member)} size={32} src={mediaUrl(m.member.image)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 500, color: T.ink, margin: 0 }}>
                  {m.member.first_name} {m.member.last_name}
                </p>
                {m.is_admin && <p style={{ fontFamily: fontBody, fontSize: 10.5, fontWeight: 600, color: T.tealDeep, margin: "1px 0 0" }}>Admin</p>}
              </div>
              {canManage && m.member.id !== user?.id && (
                <button onClick={() => removeMember(m.member.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }} aria-label="Remove member">
                  <X size={15} color={T.coral} />
                </button>
              )}
            </div>
          ))
        )}

        {error && <p style={{ fontFamily: fontBody, fontSize: 12, color: T.coral, marginTop: 10 }}>{error}</p>}
      </Card>
    </div>
  );
}
