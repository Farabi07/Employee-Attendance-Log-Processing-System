import React from "react";
import { T, fontBody } from "../theme";

const MAP = {
  in: { label: "Checked in", fg: T.teal, bg: T.tealBg },
  out: { label: "Not checked in", fg: T.muted, bg: T.line2 },
  leave: { label: "On leave", fg: T.amber, bg: T.amberBg },

  present: { label: "Present", fg: T.teal, bg: T.tealBg },
  late: { label: "Late", fg: T.amber, bg: T.amberBg },
  absent: { label: "Absent", fg: T.coral, bg: T.coralBg },
  half_day: { label: "Half day", fg: T.amber, bg: T.amberBg },
  on_leave: { label: "On leave", fg: T.amber, bg: T.amberBg },

  approved: { label: "Approved", fg: T.teal, bg: T.tealBg },
  pending: { label: "Pending", fg: T.amber, bg: T.amberBg },
  rejected: { label: "Rejected", fg: T.coral, bg: T.coralBg },

  completed: { label: "Completed", fg: T.teal, bg: T.tealBg },
  failed: { label: "Failed", fg: T.coral, bg: T.coralBg },
};

export default function StatusPill({ status }) {
  const s = MAP[status] || { label: status || "—", fg: T.muted, bg: T.line2 };
  return (
    <span
      style={{
        fontFamily: fontBody,
        fontSize: 12,
        fontWeight: 600,
        color: s.fg,
        background: s.bg,
        padding: "4px 10px",
        borderRadius: 999,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
