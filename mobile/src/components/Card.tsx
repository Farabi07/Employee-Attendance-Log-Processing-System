import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { T } from "../theme";

// Ported from frontend/src/components/Card.jsx. RN has no `boxShadow` —
// the web's single shadow line becomes the shadowColor/Offset/Opacity/Radius
// + elevation split below (iOS reads the shadow* props, Android reads
// elevation only).
export default function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    // No border — a card sitting on the app's tinted page background
    // already reads as a distinct surface; a hard 1px edge on top of a
    // shadow just doubles up the outline and looks dated. The shadow
    // alone carries the "this is a raised card" read.
    backgroundColor: T.card,
    borderRadius: 14,
    shadowColor: "#0F2B24",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
});
