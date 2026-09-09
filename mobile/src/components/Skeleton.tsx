import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";
import { T } from "../theme";

// A pulsing placeholder block — used in place of a spinner while a
// screen's first load is in flight, shaped like the content that's
// about to appear so the layout doesn't jump once data arrives.
export default function Skeleton({
  width = "100%",
  height,
  radius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[{ width: width as any, height, borderRadius: radius, backgroundColor: T.line2, opacity }, style]}
    />
  );
}
