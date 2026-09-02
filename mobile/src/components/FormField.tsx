import React from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { T, fonts } from "../theme";

// Small shared wrapper for the label+input pairs repeated across every
// auth screen in the web app (inputStyle/labelStyle objects there).
export default function FormField({
  label,
  containerStyle,
  ...inputProps
}: { label: string; containerStyle?: object } & TextInputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={T.faint}
        style={styles.input}
        autoCapitalize="none"
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    color: T.muted,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 13.5,
    color: T.ink,
  },
});
