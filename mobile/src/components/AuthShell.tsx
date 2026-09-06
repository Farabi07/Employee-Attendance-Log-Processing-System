import React from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock } from "lucide-react-native";
import { T, fonts } from "../theme";
import Card from "./Card";
import GradientBackground from "./GradientBackground";

// Shared centered-card-with-logo shell used by Login, Signup, and
// ResetPasswordConfirm on the web (each repeated the same header markup).
// The gradient hero mirrors AppHeader/AppTabs' navy->teal treatment so the
// very first screen someone sees already reads as the same designed app,
// not a plain white form.
export default function AuthShell({ children, maxWidth = 360 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <View style={styles.flex}>
      <View style={styles.hero}>
        <GradientBackground />
        <SafeAreaView edges={["top"]} style={styles.heroSafe}>
          <View style={styles.logoMark}>
            <Clock size={20} color="#fff" strokeWidth={2} />
          </View>
          <Text style={styles.logoText}>TimeTap</Text>
        </SafeAreaView>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Card style={[styles.card, { maxWidth }]}>{children}</Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: T.paper },
  hero: {
    height: 168,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: "hidden",
  },
  heroSafe: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  logoMark: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: fonts.display.semibold,
    fontSize: 19,
    color: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    padding: 16,
    paddingTop: 20,
    paddingBottom: 32,
  },
  card: { width: "100%", padding: 28 },
});
