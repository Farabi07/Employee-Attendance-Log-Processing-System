import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Building2, LogOut } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import GradientBackground from "../../components/GradientBackground";

// Platform-owner dashboard (tenant list, global subscription pricing,
// per-org payout commission override) isn't built yet — that's a later
// phase of the RN rewrite. Until then this at least lets the account log
// out instead of landing on a dead end with no way back to the login
// screen (that account only has a real dashboard on the web app today).
export default function Organizations() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <SafeAreaView edges={["top"]} style={styles.header}>
        <GradientBackground />
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Pressable onPress={logout} style={styles.logoutButton} hitSlop={6}>
            <LogOut size={15} color="#fff" strokeWidth={2.2} />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Building2 size={26} color={T.tealDeep} strokeWidth={1.8} />
        </View>
        <Text style={styles.title}>Organizations dashboard</Text>
        <Text style={styles.subtitle}>
          The platform-owner dashboard isn't in the app yet — manage organizations, billing, and payout commission
          from the web app for now.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  header: {
    backgroundColor: T.navy,
    overflow: "hidden",
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: "#fff", flex: 1 },
  logoutButton: { flexDirection: "row", alignItems: "center", gap: 4 },
  logoutText: { fontFamily: fonts.body.semibold, fontSize: 12, color: "#fff" },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.tealBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { fontFamily: fonts.display.semibold, fontSize: 18, color: T.ink, marginBottom: 8, textAlign: "center" },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, textAlign: "center", lineHeight: 19 },
});
