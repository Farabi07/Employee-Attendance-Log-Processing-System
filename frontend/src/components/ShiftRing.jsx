import React from "react";
import { QrCode } from "lucide-react";
import { T, fontBody } from "../theme";

export default function ShiftRing({ checkedIn, elapsedMinutes, targetMinutes, onScan, scanning, disabled, label }) {
  const size = 176;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, elapsedMinutes / targetMinutes);
  const dash = checkedIn ? c * pct : 0;

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.line2} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={checkedIn ? T.teal : T.faint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <button
        onClick={disabled ? undefined : onScan}
        disabled={disabled}
        aria-label={checkedIn ? "Scan to check out" : "Scan to check in"}
        style={{
          position: "absolute",
          inset: stroke + 8,
          borderRadius: "50%",
          border: "none",
          cursor: disabled ? "default" : "pointer",
          background: checkedIn ? T.tealBg : T.paper,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          transform: scanning ? "scale(0.94)" : "scale(1)",
          transition: "transform 0.15s ease",
          opacity: disabled ? 0.75 : 1,
        }}
      >
        <QrCode size={30} color={checkedIn ? T.tealDeep : T.ink} strokeWidth={1.6} />
        <span style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: checkedIn ? T.tealDeep : T.ink }}>
          {label || (checkedIn ? "Tap to check out" : "Tap to check in")}
        </span>
      </button>
    </div>
  );
}
