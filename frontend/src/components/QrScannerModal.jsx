import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, KeyRound } from "lucide-react";
import { T, fontBody, fontDisplay, fontMono } from "../theme";
import Card from "./Card";

const SCANNER_ID = "qr-scanner-region";

export default function QrScannerModal({ title, onClose, onToken }) {
  const [error, setError] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [starting, setStarting] = useState(true);

  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_ID);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (!cancelled) onTokenRef.current(decodedText);
        },
        () => {}
      )
      .then(() => {
        if (!cancelled) setStarting(false);
      })
      .catch(() => {
        if (!cancelled) {
          setStarting(false);
          setError("Camera unavailable — enter the code manually below.");
        }
      });

    return () => {
      cancelled = true;
      scanner
        .stop()
        .then(() => scanner.clear())
        .catch(() => {});
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(22,35,58,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <Card style={{ width: "min(360px, 92vw)", padding: "22px 22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
            aria-label="Close"
          >
            <X size={18} color={T.muted} />
          </button>
        </div>

        <div id={SCANNER_ID} style={{ width: "100%", minHeight: 220, borderRadius: 10, overflow: "hidden", background: T.line2 }} />

        {starting && (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, marginTop: 10, textAlign: "center" }}>
            Starting camera…
          </p>
        )}
        {error && (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, marginTop: 10, textAlign: "center" }}>{error}</p>
        )}

        <div style={{ marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.line2}` }}>
          <label
            style={{
              fontFamily: fontBody,
              fontSize: 12,
              color: T.muted,
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 8,
            }}
          >
            <KeyRound size={13} /> No camera? Type the current 6-digit code
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              placeholder="e.g. 482913"
              inputMode="numeric"
              style={{
                flex: 1,
                padding: "9px 10px",
                borderRadius: 8,
                border: `1px solid ${T.line}`,
                fontFamily: fontMono,
                fontSize: 12.5,
              }}
            />
            <button
              onClick={() => manualToken.trim() && onTokenRef.current(manualToken.trim())}
              style={{
                padding: "9px 14px",
                borderRadius: 8,
                border: "none",
                background: T.ink,
                color: T.paper,
                fontFamily: fontBody,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Use
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
