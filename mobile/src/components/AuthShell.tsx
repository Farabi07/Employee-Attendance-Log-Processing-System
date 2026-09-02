import React from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Clock } from "lucide-react-native";
import { T, fonts } from "../theme";
import Card from "./Card";

// Shared centered-card-with-logo shell used by Login, Signup, and
// ResetPasswordConfirm on the web (each repeated the same header markup).
export default function AuthShell({ children, maxWidth = 360 }: { children: React.ReactNode; maxWidth?: number }) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Card style={[styles.card, { maxWidth }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoMark}>
              <Clock size={16} color={T.paper} strokeWidth={2} />
            </View>
            <Text style={styles.logoText}>TimeTap</Text>
          </View>
          {children}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: T.paper },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: { width: "100%", padding: 28 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 26 },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: T.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontFamily: fonts.display.semibold,
    fontSize: 18,
    color: T.ink,
  },
});
