import React, { useRef } from "react";
import { Pressable, Text, StyleSheet, ActivityIndicator, Animated } from "react-native";
import { T, fonts } from "../theme";

// A subtle spring-back scale on press-in/out — the single biggest "does
// this feel expensive" tell on a button, and the main CTA is used on
// nearly every screen, so this one change carries the most weight.
function usePressScale(disabled?: boolean) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };
  return { scale, onPressIn, onPressOut };
}

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
  const { scale, onPressIn, onPressOut } = usePressScale(isDisabled);
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isDisabled}
        style={[styles.primary, { opacity: isDisabled ? 0.7 : 1 }]}
      >
        {loading ? <ActivityIndicator color={T.paper} /> : <Text style={styles.primaryLabel}>{title}</Text>}
      </Pressable>
    </Animated.View>
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
    backgroundColor: T.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.tealDeep,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 2,
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
