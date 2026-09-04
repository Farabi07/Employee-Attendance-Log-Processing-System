import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { T, fonts } from "../theme";

// Time-of-day counterpart to DateField — RN has no native <input
// type="time">, wraps @react-native-community/datetimepicker in "time"
// mode. Value/onChange use "HH:MM" strings, matching the web app's shift
// start_time/end_time fields.
export default function TimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label?: string;
  value: string; // "HH:MM"
  onChange: (hhmm: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const toDate = () => {
    const [h, m] = value.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0, m || 0, 0, 0);
    return d;
  };

  const handleChange = (_event: any, selected?: Date) => {
    setOpen(Platform.OS === "ios");
    if (selected) {
      const hh = String(selected.getHours()).padStart(2, "0");
      const mm = String(selected.getMinutes()).padStart(2, "0");
      onChange(`${hh}:${mm}`);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={[styles.input, disabled && styles.inputDisabled]} onPress={() => !disabled && setOpen(true)}>
        <Text style={[styles.valueText, disabled && styles.valueTextDisabled]}>{value || "--:--"}</Text>
      </Pressable>
      {open && !disabled && (
        <DateTimePicker value={toDate()} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleChange} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
  input: { paddingVertical: 9, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  inputDisabled: { opacity: 0.4 },
  valueText: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.ink },
  valueTextDisabled: { color: T.faint },
});
