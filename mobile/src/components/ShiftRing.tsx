import React, { useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated, Easing } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { QrCode } from "lucide-react-native";
import { T, fonts } from "../theme";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Ported from frontend/src/components/ShiftRing.jsx. Same dasharray math,
// react-native-svg's <Circle> instead of a raw browser <svg>, and the CSS
// `transition: stroke-dasharray 0.6s ease` becomes an explicit
// Animated.timing driving strokeDashoffset (SVG dash animations in RN need
// to be driven, not just declared).
export default function ShiftRing({
  checkedIn,
  elapsedMinutes,
  targetMinutes,
  onScan,
  scanning,
  disabled,
  label,
}: {
  checkedIn: boolean;
  elapsedMinutes: number;
  targetMinutes: number;
  onScan: () => void;
  scanning?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  const size = 176;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, elapsedMinutes / targetMinutes);
  const targetDash = checkedIn ? c * pct : 0;

  const dashAnim = useRef(new Animated.Value(targetDash)).current;

  useEffect(() => {
    Animated.timing(dashAnim, {
      toValue: targetDash,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [targetDash, dashAnim]);

  return (
    <View style={{ width: size, height: size, alignSelf: "center" }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.line2} strokeWidth={stroke} />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={checkedIn ? T.teal : T.faint}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={Animated.subtract(c, dashAnim)}
        />
      </Svg>
      <Pressable
        onPress={disabled ? undefined : onScan}
        disabled={disabled}
        style={[
          styles.button,
          {
            top: stroke + 8,
            left: stroke + 8,
            right: stroke + 8,
            bottom: stroke + 8,
            borderRadius: (size - (stroke + 8) * 2) / 2,
            backgroundColor: checkedIn ? T.tealBg : T.paper,
            opacity: disabled ? 0.75 : 1,
            transform: [{ scale: scanning ? 0.94 : 1 }],
          },
        ]}
      >
        <QrCode size={30} color={checkedIn ? T.tealDeep : T.ink} strokeWidth={1.6} />
        <Text style={[styles.label, { color: checkedIn ? T.tealDeep : T.ink }]}>
          {label || (checkedIn ? "Tap to check out" : "Tap to check in")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  label: {
    fontFamily: fonts.body.semibold,
    fontSize: 11,
    textAlign: "center",
  },
});
