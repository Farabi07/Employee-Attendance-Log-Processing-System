import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { T, fonts } from "../theme";

// Small shared wrapper for the label+input pairs repeated across every
// auth screen in the web app (inputStyle/labelStyle objects there).
// secureTextEntry gets a show/hide eye toggle for free — RN has no native
// equivalent of the web's type="text"/"password" swap, so this manages its
// own local `show` state and only actually sets secureTextEntry when hidden.
export default function FormField({
  label,
  containerStyle,
  secureTextEntry,
  ...inputProps
}: { label: string; containerStyle?: object } & TextInputProps) {
  const [show, setShow] = useState(false);
  const isPassword = !!secureTextEntry;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={T.faint}
          style={[styles.input, isPassword && styles.inputWithIcon]}
          autoCapitalize="none"
          secureTextEntry={isPassword && !show}
          {...inputProps}
        />
        {isPassword && (
          <Pressable onPress={() => setShow((s) => !s)} style={styles.eyeButton} hitSlop={8}>
            {show ? <EyeOff size={16} color={T.faint} /> : <Eye size={16} color={T.faint} />}
          </Pressable>
        )}
      </View>
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
  inputWrap: { position: "relative", justifyContent: "center" },
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
  inputWithIcon: { paddingRight: 40 },
  eyeButton: { position: "absolute", right: 10 },
});
