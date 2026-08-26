import React from "react";
import { WifiOff } from "lucide-react";
import { T, fontBody } from "../theme";
import { useOnlineStatus } from "../lib/useOnlineStatus";

export default function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      style={{
        background: T.coralBg,
        borderBottom: `1px solid ${T.line}`,
        padding: "10px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
      }}
    >
      <WifiOff size={14} color={T.coral} />
      <span style={{ fontFamily: fontBody, fontSize: 12.5, color: T.ink, fontWeight: 600 }}>
        You're offline — check-in, roster, and payroll need a connection. Showing the last loaded screen.
      </span>
    </div>
  );
}
