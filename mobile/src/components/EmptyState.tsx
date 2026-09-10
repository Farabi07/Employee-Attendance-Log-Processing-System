import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

// A small icon + message in place of a bare line of grey text for "there's
// nothing here yet" moments — the kind of detail that reads as designed
// rather than left as a placeholder.
export default function EmptyState({ icon: Icon, title, subtitle }: { icon: IconComponent; title: string; subtitle?: string }) {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { alignItems: "center", paddingVertical: 20, gap: 4 },
        iconCircle: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: T.line2,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        },
        title: { fontFamily: fonts.body.medium, fontSize: 13, color: T.muted, textAlign: "center" },
        subtitle: { fontFamily: fonts.body.regular, fontSize: 12, color: T.faint, textAlign: "center", maxWidth: 240 },
      }),
    [T]
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Icon size={20} color={T.faint} strokeWidth={1.6} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}
