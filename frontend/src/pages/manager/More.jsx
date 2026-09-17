import React from "react";
import { BarChart3, ChevronRight, Receipt } from "lucide-react";
import { T, fontBody, fontDisplay } from "../../theme";
import Card from "../../components/Card";

export default function More({ onOpen }) {
  const items = [
    { key: "reports", title: "Reports", body: "Export attendance and timesheet data", icon: BarChart3 },
    { key: "expenses", title: "Business finance", body: "Track revenue, expenses and receipts", icon: Receipt },
  ];

  return (
    <div style={{ maxWidth: 680 }}>
      <p style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, letterSpacing: 0.7, textTransform: "uppercase", color: T.tealDeep, margin: "0 0 5px" }}>Workspace</p>
      <h2 style={{ fontFamily: fontDisplay, fontSize: 24, color: T.ink, margin: "0 0 6px" }}>More tools</h2>
      <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, lineHeight: 1.5, margin: "0 0 18px" }}>Keep primary navigation focused while keeping every manager tool one tap away.</p>
      <div style={{ display: "grid", gap: 12 }}>
        {items.map(({ key, title, body, icon: Icon }) => (
          <Card key={key} style={{ padding: 0 }}>
            <button onClick={() => onOpen(key)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: 16, border: 0, background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 42, height: 42, borderRadius: 13, display: "grid", placeItems: "center", background: T.tealBg }}><Icon size={20} color={T.tealDeep} /></span>
              <span style={{ flex: 1 }}><strong style={{ display: "block", fontFamily: fontBody, fontSize: 14, color: T.ink }}>{title}</strong><span style={{ display: "block", fontFamily: fontBody, fontSize: 12, color: T.muted, marginTop: 3 }}>{body}</span></span>
              <ChevronRight size={18} color={T.faint} />
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}
