import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useTheme } from "../lib/ThemeContext";

// Shared bordered-box wrapper for @react-native-picker/picker, used
// anywhere the web app had an inline <select> (Team.jsx, Roster.jsx).
export default function InlinePicker({
  selectedValue,
  onValueChange,
  items,
  style,
}: {
  selectedValue: string;
  onValueChange: (v: string) => void;
  items: { value: string; label: string }[];
  style?: object;
}) {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        box: { borderWidth: 1, borderColor: T.line, borderRadius: 8, overflow: "hidden" },
        picker: { color: T.ink, backgroundColor: T.card },
      }),
    [T]
  );

  return (
    <View style={[styles.box, style]}>
      <Picker selectedValue={selectedValue} onValueChange={onValueChange} style={styles.picker}>
        {items.map((it) => (
          <Picker.Item key={it.value} label={it.label} value={it.value} />
        ))}
      </Picker>
    </View>
  );
}
