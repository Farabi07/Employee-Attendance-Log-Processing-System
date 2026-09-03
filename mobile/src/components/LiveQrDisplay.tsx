import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import { X } from "lucide-react-native";
import { T, fonts } from "../theme";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ported from frontend/src/components/LiveQrDisplay.jsx — the hardest
// single-component port in the whole rewrite (per the plan). Two real
// differences from the web version:
//   1. react-native-qrcode-svg renders directly from the raw token string
//      (`res.code`), no client-side toDataURL() step needed like the web's
//      `qrcode` package required.
//   2. The countdown ring's CSS `transition: stroke-dasharray 0.9s linear`
//      becomes an explicit Animated.timing driving strokeDashoffset each
//      time secondsRemaining ticks, same as ShiftRing.tsx's approach.
export default function LiveQrDisplay({ branchId, onClose }: { branchId: string | number; onClose: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [periodSeconds, setPeriodSeconds] = useState(30);
  const [branchName, setBranchName] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const size = 26;
  const r = 11;
  const c = 2 * Math.PI * r;
  const dashAnim = useRef(new Animated.Value(c)).current;

  const load = useCallback(async () => {
    try {
      const res = await api.get(endpoints.qrLive(branchId));
      setCode(res.code);
      setSecondsRemaining(res.seconds_remaining);
      setPeriodSeconds(res.period_seconds);
      setBranchName(res.branch_name);
      setError("");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(load, (res.seconds_remaining + 0.2) * 1000);
    } catch (err: any) {
      setError(err.message || "Could not load the live code");
    }
  }, [branchId]);

  useEffect(() => {
    load();
    tickRef.current = setInterval(() => {
      setSecondsRemaining((s) => (s !== null && s > 0 ? s - 1 : s));
    }, 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [load]);

  const pct = secondsRemaining !== null ? secondsRemaining / periodSeconds : 1;

  useEffect(() => {
    Animated.timing(dashAnim, {
      toValue: c * pct,
      duration: 900,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  }, [pct, c, dashAnim]);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
          <X size={18} color={T.paper} />
        </Pressable>

        <View style={styles.headerBlock}>
          <Text style={styles.eyebrow}>Scan to check in / out</Text>
          <Text style={styles.branchName}>{branchName || "…"}</Text>
        </View>

        <View style={styles.qrCard}>
          {code ? (
            <QRCode value={code} size={280} color={T.ink} backgroundColor={T.card} />
          ) : (
            <View style={styles.qrPlaceholder}>
              <Text style={styles.placeholderText}>{error || "Loading…"}</Text>
            </View>
          )}
        </View>

        <View style={styles.refreshRow}>
          <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
            <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={3} />
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={T.teal}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${c} ${c}`}
              strokeDashoffset={Animated.subtract(c, dashAnim)}
            />
          </Svg>
          <Text style={styles.refreshText}>refreshes in {secondsRemaining ?? periodSeconds}s</Text>
        </View>

        <Text style={styles.footnote}>
          This code changes every {periodSeconds} seconds — leave this screen open on a counter device. A printed copy or a
          screenshot stops working the moment it refreshes.
        </Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.ink, alignItems: "center", justifyContent: "center", gap: 22, padding: 24 },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBlock: { alignItems: "center" },
  eyebrow: { fontFamily: fonts.body.regular, fontSize: 13, color: "rgba(245,246,242,0.6)", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  branchName: { fontFamily: fonts.display.semibold, fontSize: 22, color: T.paper },
  qrCard: { backgroundColor: T.card, borderRadius: 20, padding: 20 },
  qrPlaceholder: { width: 280, height: 280, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontFamily: fonts.body.regular, color: T.muted },
  refreshRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  refreshText: { fontFamily: fonts.mono.regular, fontSize: 13, color: "rgba(245,246,242,0.75)" },
  footnote: { fontFamily: fonts.body.regular, fontSize: 12.5, color: "rgba(245,246,242,0.45)", maxWidth: 380, textAlign: "center", lineHeight: 19 },
});
