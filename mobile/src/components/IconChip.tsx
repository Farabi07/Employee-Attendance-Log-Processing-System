import React from "react";
import { View, StyleSheet } from "react-native";

// A small colored circle behind a section-title icon — used everywhere a
// screen has a "<Icon/> Section title" row, so those rows read as a
// designed system instead of a bare grey glyph next to text.
export default function IconChip({ children, bg, size = 26 }: { children: React.ReactNode; bg: string; size?: number }) {
  return <View style={[styles.chip, { width: size, height: size, borderRadius: size * 0.34, backgroundColor: bg }]}>{children}</View>;
}

const styles = StyleSheet.create({
  chip: { alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
