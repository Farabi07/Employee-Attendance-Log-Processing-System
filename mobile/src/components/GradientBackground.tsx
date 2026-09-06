import React from "react";
import { StyleSheet, ViewStyle, StyleProp } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { T } from "../theme";

// A diagonal navy->teal gradient panel, used behind the top header and
// bottom tab bar so the app's "chrome" reads as one smart, branded strip
// instead of a flat white bar with a thin accent line. Built on
// react-native-svg (already a dependency, used by ShiftRing) rather than
// expo-linear-gradient, which isn't installed and would need a fresh
// native build instead of shipping over OTA.
export default function GradientBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <Svg style={[StyleSheet.absoluteFill, style]} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        {/* Purely horizontal (y stays 0) — on a short, wide bar like a
            header or tab bar, any vertical component in the angle makes
            the top edge and bottom edge land on visibly different colors,
            which reads as two flat blocks stacked on top of each other
            instead of one smooth gradient. */}
        <LinearGradient id="chrome" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={T.navyDeep} />
          <Stop offset="0.4" stopColor={T.tealDeep} />
          <Stop offset="1" stopColor={T.teal} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill="url(#chrome)" />
    </Svg>
  );
}
