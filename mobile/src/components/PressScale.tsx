import React, { useRef, ReactNode } from "react";
import { Pressable, Animated, StyleProp, ViewStyle, PressableProps } from "react-native";

// Shared tactile press feedback — spring down on press-in, spring back on
// release. Used anywhere a tap should feel like it's pressing something
// physical rather than just toggling an opacity.
export default function PressScale({
  children,
  style,
  pressableStyle,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  scaleTo = 0.96,
  ...rest
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  pressableStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  scaleTo?: number;
} & Omit<PressableProps, "style" | "children" | "disabled">) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[{ flex: 1 }, pressableStyle]}
        onPressIn={(e) => {
          if (!disabled) Animated.spring(scale, { toValue: scaleTo, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
          onPressOut?.(e);
        }}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
