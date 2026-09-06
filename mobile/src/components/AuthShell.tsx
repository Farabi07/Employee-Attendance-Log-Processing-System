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
        <View style={[styles.cardWrap, { maxWidth }]}>
          <View style={styles.topAccent} />
          <Card style={styles.card}>
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <Clock size={16} color={T.paper} strokeWidth={2} />
              </View>
              <Text style={styles.logoText}>TimeTap</Text>
            </View>
            {children}
          </Card>
        </View>
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
  cardWrap: { width: "100%" },
  topAccent: {
    height: 6,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: T.teal,
    marginHorizontal: 10,
  },
  card: { width: "100%", padding: 28, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 26 },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: T.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.navyDeep,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  logoText: {
    fontFamily: fonts.display.semibold,
    fontSize: 18,
    color: T.ink,
  },
});
