import React, { useMemo, useState } from "react";
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WifiOff } from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { useAuth } from "../lib/auth";

// Shown by RootNavigator when a signed-in device can't reach the server on
// cold start (auth.jsx's connectionError) — a real "your session is still
// here, we just can't confirm it right now" state, distinct from actually
// being logged out. Never shown once the app has loaded successfully this
// session; a mid-session network drop just leaves whatever screen is
// already open in place, with its own action failing with a friendly
// toast (see lib/api.js).
export default function NoConnectionScreen() {
  const T = useTheme();
  const { refreshUser } = useAuth();
  const [retrying, setRetrying] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
        iconCircle: {
          width: 64,
          height: 64,
          borderRadius: 18,
          backgroundColor: T.navyBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        },
        title: { fontFamily: fonts.display.semibold, fontSize: 18, color: T.ink, marginBottom: 8, textAlign: "center" },
        body: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.muted, textAlign: "center", lineHeight: 20, maxWidth: 300, marginBottom: 24 },
        button: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: T.teal,
          borderRadius: 9,
          paddingVertical: 12,
          paddingHorizontal: 28,
        },
        buttonText: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.onAccent },
      }),
    [T]
  );

  const retry = async () => {
    setRetrying(true);
    try {
      await refreshUser();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <WifiOff size={28} color={T.navy} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>No internet connection</Text>
        <Text style={styles.body}>
          You're still signed in — TimeTap just can't reach the server right now. Check your connection and try again.
        </Text>
        <Pressable onPress={retry} disabled={retrying} style={[styles.button, { opacity: retrying ? 0.7 : 1 }]}>
          {retrying ? <ActivityIndicator color={T.onAccent} size="small" /> : <Text style={styles.buttonText}>Try again</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
