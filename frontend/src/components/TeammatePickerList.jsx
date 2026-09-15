import React, { useState } from "react";
import { Search, Check } from "lucide-react";
import { T, fontBody } from "../theme";
import { mediaUrl } from "../lib/api";
import Avatar from "./Avatar";

function initialsOf(person) {
  return `${(person?.first_name || "?")[0]}${(person?.last_name || "?")[0]}`.toUpperCase();
}

// Shared by CreateChannelModal (multi-select members), ChannelMembersModal
// (multi-select to add) and NewDirectMessageModal (single-select) — same
// search-then-click list in all three, mirroring mobile's
// screens/chat/TeammatePickerList.tsx.
export default function TeammatePickerList({ employees, selectedIds, onToggle, multi = true }) {
  const [query, setQuery] = useState("");
  const filtered = employees.filter((e) => `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search size={14} color={T.faint} style={{ position: "absolute", left: 12, top: 11 }} />
        <input
          placeholder="Search teammates"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ width: "100%", padding: "9px 12px 9px 34px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13, boxSizing: "border-box" }}
        />
      </div>

      {filtered.length === 0 ? (
        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, textAlign: "center", padding: "16px 0" }}>No matches</p>
      ) : (
        filtered.map((emp, i) => {
          const selected = selectedIds.includes(emp.id);
          return (
            <button
              key={emp.id}
              onClick={() => onToggle(emp.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 4px",
                border: "none",
                borderTop: i > 0 ? `1px solid ${T.line2}` : "none",
                background: "transparent",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Avatar initials={initialsOf(emp)} size={32} src={mediaUrl(emp.image)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 500, color: T.ink, margin: 0 }}>
                  {emp.first_name} {emp.last_name}
                </p>
                <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.faint, margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {emp.email}
                </p>
              </div>
              {multi && (
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: `1.5px solid ${selected ? T.teal : T.line}`,
                    background: selected ? T.teal : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {selected && <Check size={12} color={T.onAccent} strokeWidth={3} />}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
