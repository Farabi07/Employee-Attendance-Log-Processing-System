import React, { useEffect, useRef, useState, useCallback } from "react";
import QRCode from "qrcode";
import { X } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";

export default function LiveQrDisplay({ branchId, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [secondsRemaining, setSecondsRemaining] = useState(null);
  const [periodSeconds, setPeriodSeconds] = useState(30);
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef(null);
  const tickRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoints.qrLive(branchId));
      const dataUrl = await QRCode.toDataURL(res.code, { width: 320, margin: 1, color: { dark: T.ink, light: T.card } });
      setQrDataUrl(dataUrl);
      setSecondsRemaining(res.seconds_remaining);
      setPeriodSeconds(res.period_seconds);
      setBranchName(res.branch_name);
      setError("");

      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(load, (res.seconds_remaining + 0.2) * 1000);
    } catch (err) {
      setError(err.message || "Could not load the live code");
    }
  }, [branchId]);

  useEffect(() => {
    load();
    tickRef.current = setInterval(() => {
      setSecondsRemaining((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => {
      clearTimeout(timerRef.current);
      clearInterval(tickRef.current);
    };
  }, [load]);

  const pct = secondsRemaining !== null ? secondsRemaining / periodSeconds : 1;
  const size = 26;
  const r = 11;
  const c = 2 * Math.PI * r;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: T.ink,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        gap: 22,
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        style={{ position: "absolute", top: 20, right: 20, border: "none", background: "rgba(255,255,255,0.1)", borderRadius: 10, width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
      >
        <X size={18} color={T.paper} />
      </button>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: "rgba(245,246,242,0.6)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: 0.6 }}>
          Scan to check in / out
        </p>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.paper, margin: 0 }}>{branchName || "…"}</h1>
      </div>

      <div style={{ background: T.card, borderRadius: 20, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        {qrDataUrl ? (
          <img src={qrDataUrl} alt="Live check-in QR code" width={280} height={280} style={{ display: "block" }} />
        ) : (
          <div style={{ width: 280, height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: T.muted, fontFamily: fontBody }}>
            {error || "Loading…"}
          </div>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={T.teal}
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray={`${c * pct} ${c}`}
            style={{ transition: "stroke-dasharray 0.9s linear" }}
          />
        </svg>
        <span style={{ fontFamily: fontMono, fontSize: 13, color: "rgba(245,246,242,0.75)" }}>
          refreshes in {secondsRemaining ?? periodSeconds}s
        </span>
      </div>

      <p style={{ fontFamily: fontBody, fontSize: 12.5, color: "rgba(245,246,242,0.45)", maxWidth: 380, textAlign: "center", lineHeight: 1.6 }}>
        This code changes every {periodSeconds} seconds — leave this screen open on a counter device. A printed copy or a
        screenshot stops working the moment it refreshes.
      </p>
    </div>
  );
}
