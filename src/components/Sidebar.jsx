import React from "react";
import { Clock, CalendarDays, FileText, LayoutGrid, TrendingUp, Users } from "lucide-react";
import { T, fontDisplay, fontBody } from "../theme";
import { useIsMobile } from "../lib/useMediaQuery";

export const EMP_NAV = [
  { key: "today", label: "Today", icon: Clock },
  { key: "shifts", label: "My shifts", icon: CalendarDays },
  { key: "leave", label: "Leave", icon: FileText },
];

export const MGR_NAV = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "team", label: "Team", icon: Users },
  { key: "roster", label: "Roster", icon: CalendarDays },
  { key: "approvals", label: "Approvals", icon: FileText },
  { key: "reports", label: "Reports", icon: TrendingUp },
];

export default function Sidebar({ role, active, setActive }) {
  const items = role === "employee" ? EMP_NAV : MGR_NAV;
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          background: T.card,
          borderTop: `1px solid ${T.line}`,
          display: "flex",
          zIndex: 40,
        }}
      >
        {items.map((it) => {
          const Icon = it.icon;
          const isActive = active === it.key;
          return (
            <button
              key={it.key}
              onClick={() => setActive(it.key)}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 3,
                border: "none",
                background: "transparent",
                color: isActive ? T.tealDeep : T.muted,
                cursor: "pointer",
              }}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              <span style={{ fontFamily: fontBody, fontSize: 10, fontWeight: isActive ? 600 : 500 }}>{it.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        width: 220,
        flexShrink: 0,
        borderRight: `1px solid ${T.line}`,
        padding: "24px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ padding: "0 10px", marginBottom: 28, display: "flex", alignItems: "center", gap: 9 }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: T.ink, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Clock size={15} color={T.paper} strokeWidth={2} />
        </div>
        <span style={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 15, color: T.ink }}>Roster</span>
      </div>
      {items.map((it) => {
        const Icon = it.icon;
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setActive(it.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 12px",
              borderRadius: 9,
              border: "none",
              background: isActive ? T.tealBg : "transparent",
              color: isActive ? T.tealDeep : T.muted,
              fontFamily: fontBody,
              fontSize: 13.5,
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Icon size={16.5} strokeWidth={1.8} />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
