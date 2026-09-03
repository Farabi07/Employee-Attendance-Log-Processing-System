import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { T, fonts } from "../theme";
import { toISODate } from "../lib/dates";

// Shared date-picker field for the leave request form and any other date
// range pickers — RN has no native <input type="date">, so this wraps
// @react-native-community/datetimepicker behind a pressable field that
// looks like the rest of FormField's text inputs.
export default function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string; // ISO date "YYYY-MM-DD" or ""
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);

  const handleChange = (_event: any, selectedDate?: Date) => {
    setOpen(Platform.OS === "ios"); // iOS's inline picker stays open until dismissed
    if (selectedDate) onChange(toISODate(selectedDate));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.input} onPress={() => setOpen(true)}>
        <Text style={value ? styles.valueText : styles.placeholderText}>{value || "Select date"}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={handleChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
  input: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
  },
  valueText: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.ink },
  placeholderText: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.faint },
});
