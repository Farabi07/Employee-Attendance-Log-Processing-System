import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { T, fonts } from "../theme";

// Ported from frontend/src/components/Avatar.jsx. `borderRadius: "50%"`
// (a CSS string) doesn't exist in RN — needs the numeric half-of-size
// instead, computed from the same `size` prop.
export default function Avatar({ initials, size = 38 }: { initials: string; size?: number }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    backgroundColor: T.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  initials: {
    fontFamily: fonts.display.semibold,
    color: T.paper,
  },
});
