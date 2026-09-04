import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { T, fonts } from "../theme";

// Ported from frontend/src/components/Avatar.jsx. `borderRadius: "50%"`
// (a CSS string) doesn't exist in RN — needs the numeric half-of-size
// instead, computed from the same `size` prop.
export default function Avatar({ initials, size = 38, src }: { initials: string; size?: number; src?: string | null }) {
  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, overflow: "hidden" },
      ]}
    >
      {src ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} resizeMode="cover" />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      )}
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
