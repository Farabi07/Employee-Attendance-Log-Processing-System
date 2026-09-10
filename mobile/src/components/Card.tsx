import React, { useMemo } from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { useThemeSetting } from "../lib/ThemeContext";

// Ported from frontend/src/components/Card.jsx. RN has no `boxShadow` —
// the web's single shadow line becomes the shadowColor/Offset/Opacity/Radius
// + elevation split below (iOS reads the shadow* props, Android reads
// elevation only).
export default function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors: T, scheme } = useThemeSetting();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        // No border — a card sitting on the app's tinted page background
        // already reads as a distinct surface; a hard 1px edge on top of a
        // shadow just doubles up the outline and looks dated. The shadow
        // alone carries the "this is a raised card" read.
        card: {
          backgroundColor: T.card,
          borderRadius: 14,
          shadowColor: T.shadow,
          shadowOffset: { width: 0, height: 6 },
          // A near-black shadow barely reads at light-mode opacity against
          // an already-dark page — bump it up so cards still look raised.
          shadowOpacity: scheme === "dark" ? 0.4 : 0.1,
          shadowRadius: 18,
          elevation: 4,
        },
      }),
    [T, scheme]
  );

  return <View style={[styles.card, style]}>{children}</View>;
}
