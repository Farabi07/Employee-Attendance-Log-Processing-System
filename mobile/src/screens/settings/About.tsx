import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, Clock } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";

const APP_VERSION = "1.0.0";

export default function About({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { billing } = useAuth();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: T.line,
          backgroundColor: T.card,
        },
        backButton: { padding: 2 },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink },
        content: { padding: 24, alignItems: "center" },
        iconCircle: {
          width: 56,
          height: 56,
          borderRadius: 16,
          backgroundColor: T.navy,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        },
        appName: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 4 },
        version: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 20 },
        tagline: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, textAlign: "center", lineHeight: 19, marginBottom: 20 },
        orgRow: {
          width: "100%",
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: T.line,
          backgroundColor: T.card,
          marginBottom: 20,
        },
        orgLabel: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint, marginBottom: 2 },
        orgValue: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.ink },
        copyright: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint },
      }),
    [T]
  );

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>About</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Clock size={26} color={T.onAccent} />
        </View>
        <Text style={styles.appName}>TimeTap</Text>
        <Text style={styles.version}>Version {APP_VERSION}</Text>
        <Text style={styles.tagline}>
          Attendance, shifts, leave, and payroll in one place — built for teams that clock in and get paid on time.
        </Text>

        {!!billing?.organization_name && (
          <View style={styles.orgRow}>
            <Text style={styles.orgLabel}>Organization</Text>
            <Text style={styles.orgValue}>{billing.organization_name}</Text>
          </View>
        )}

        <Text style={styles.copyright}>© 2026 TimeTap. All rights reserved.</Text>
      </View>
    </View>
  );
}
