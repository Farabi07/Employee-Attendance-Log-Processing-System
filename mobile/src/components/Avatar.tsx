import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";

// Ported from frontend/src/components/Avatar.jsx. `borderRadius: "50%"`
// (a CSS string) doesn't exist in RN — needs the numeric half-of-size
// instead, computed from the same `size` prop.
export default function Avatar({ initials, size = 38, src }: { initials: string; size?: number; src?: string | null }) {
  const T = useTheme();
  // Falls back to initials if the photo fails to load (offline, a stale
  // URL after the underlying file changed, a transient CDN error) instead
  // of leaving a blank circle where a face should be.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const styles = useMemo(
    () =>
      StyleSheet.create({
        circle: {
          backgroundColor: T.navy,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        },
        initials: {
          fontFamily: fonts.display.semibold,
          color: T.onAccent,
        },
      }),
    [T]
  );

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, overflow: "hidden" },
      ]}
    >
      {src && !failed ? (
        <Image source={{ uri: src }} style={{ width: size, height: size }} resizeMode="cover" onError={() => setFailed(true)} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{initials}</Text>
      )}
    </View>
  );
}
