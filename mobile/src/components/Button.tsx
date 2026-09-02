import React from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator } from "react-native";
import { T, fonts } from "../theme";

export function PrimaryButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primary,
        { opacity: isDisabled ? 0.7 : pressed ? 0.9 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={T.paper} /> : <Text style={styles.primaryLabel}>{title}</Text>}
    </Pressable>
  );
}

export function TextButton({
  title,
  onPress,
  disabled,
  color = T.teal,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
      <Text style={[styles.textLabel, { color }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    width: "100%",
    paddingVertical: 11,
    borderRadius: 9,
    backgroundColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 13.5,
    color: T.paper,
  },
  textLabel: {
    fontFamily: fonts.body.semibold,
    fontSize: 12.5,
    textAlign: "center",
  },
});
