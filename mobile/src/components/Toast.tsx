import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Text, StyleSheet, Animated, Easing } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, XCircle } from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { tapSuccess, tapWarning } from "../lib/haptics";

// A floating toast that slides in from the top and auto-dismisses, mounted
// once at the app root — any screen can call useToast().show(...) instead
// of keeping its own inline success/error <Text> banner.
type ToastType = "success" | "error";
type ToastState = { text: string; type: ToastType; id: number } | null;

const ToastContext = createContext<{ show: (text: string, type?: ToastType) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: { position: "absolute", top: 0, left: 0, right: 0, alignItems: "center", zIndex: 999 },
        toast: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginTop: 6,
          paddingVertical: 11,
          paddingHorizontal: 16,
          borderRadius: 12,
          maxWidth: "92%",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 6,
        },
        text: { fontFamily: fonts.body.medium, fontSize: 13, color: "#fff", flexShrink: 1 },
      }),
    [T]
  );
  const [toast, setToast] = useState<ToastState>(null);
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const show = useCallback(
    (text: string, type: ToastType = "success") => {
      if (timerRef.current) clearTimeout(timerRef.current);
      idRef.current += 1;
      setToast({ text, type, id: idRef.current });
      (type === "error" ? tapWarning : tapSuccess)();
      translateY.setValue(-120);
      opacity.setValue(0);
      scale.setValue(0.9);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 6 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }),
      ]).start();
      timerRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -120, duration: 220, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        ]).start(() => setToast(null));
      }, 2800);
    },
    [translateY, opacity, scale]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <SafeAreaView pointerEvents="none" edges={["top"]} style={styles.wrap}>
          <Animated.View
            style={[
              styles.toast,
              {
                // Solid fill + white text always — use the constant `teal`
                // accent, not `tealDeep` (that token flips to a *light*
                // teal in dark mode, meant for text on a tinted surface,
                // which would make a poor solid toast background).
                backgroundColor: toast.type === "error" ? T.coral : T.teal,
                transform: [{ translateY }, { scale }],
                opacity,
              },
            ]}
          >
            {toast.type === "error" ? <XCircle size={16} color="#fff" /> : <CheckCircle2 size={16} color="#fff" />}
            <Text style={styles.text} numberOfLines={2}>
              {toast.text}
            </Text>
          </Animated.View>
        </SafeAreaView>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
