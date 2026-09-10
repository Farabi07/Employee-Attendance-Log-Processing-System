import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";

// Temporary stand-in for screens not yet built (Phase 1/2 per the RN
// rewrite plan) — proves the navigation shell/role routing works before
// the real screen content lands.
export default function PlaceholderScreen({ title }: { title: string }) {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        container: { flex: 1, alignItems: "center", justifyContent: "center" },
        title: { fontFamily: fonts.display.semibold, fontSize: 18, color: T.ink, marginBottom: 6 },
        subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted },
      }),
    [T]
  );

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}
