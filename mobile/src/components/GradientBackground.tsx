import React, { useState, useCallback } from "react";
import { StyleSheet, View, ViewStyle, StyleProp, LayoutChangeEvent } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { T } from "../theme";

// A left-to-right, lighter navy->teal gradient panel, used behind the top header
// and bottom tab bar so the app's "chrome" reads as one smart, branded
// strip instead of a flat white bar with a thin accent line. Built on
// react-native-svg (already a dependency, used by ShiftRing) rather than
// expo-linear-gradient, which isn't installed and would need a fresh
// native build instead of shipping over OTA.
//
// Renders nothing until the parent's actual pixel size is known (via
// onLayout), then draws the gradient at that exact width/height. Handing
// react-native-svg a percentage-sized <Svg> inside an absolutely
// positioned, flex-measured parent (the header sits inside a SafeAreaView
// whose own height comes from its content) is fragile — the gradient's
// objectBoundingBox math has, in practice, picked up a taller/squarer box
// than the bar actually renders at, showing up as a visible seam between
// the status-bar row and the title row instead of one smooth blend.
// Measuring first and drawing in real pixels removes that ambiguity.
export default function GradientBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ width, height });
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, style, { backgroundColor: T.navy }]} onLayout={onLayout}>
      {size && size.width > 0 && (
        <Svg width={size.width} height={size.height}>
          <Defs>
            <LinearGradient id="chrome" x1={0} y1={0} x2={size.width} y2={0} gradientUnits="userSpaceOnUse">
              <Stop offset="0" stopColor={T.navy} />
              <Stop offset="1" stopColor={T.teal} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size.width} height={size.height} fill="url(#chrome)" />
        </Svg>
      )}
    </View>
  );
}
