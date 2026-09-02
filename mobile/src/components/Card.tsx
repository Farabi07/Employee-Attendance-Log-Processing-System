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
    backgroundColor: T.card,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 14,
    shadowColor: "#0F2B24",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 3,
  },
});
