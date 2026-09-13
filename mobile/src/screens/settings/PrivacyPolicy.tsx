import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";

const SECTIONS: { title: string; body: string }[] = [
  {
    title: "What we collect",
    body:
      "Your name, email, phone number, and address; attendance and clock-in/out records, including GPS location captured at the moment you scan a shift QR code; leave requests and shift schedules; and payroll and wallet records tied to your employment.",
  },
  {
    title: "How it's used",
    body:
      "Solely to run your employer's attendance, scheduling, leave, and payroll processes inside TimeTap — verifying you clocked in from an approved location, calculating hours and pay, and keeping your manager's roster up to date.",
  },
  {
    title: "Who can see it",
    body:
      "Your organization's managers and moderators, for the records that fall within their role. TimeTap does not sell your data or share it with third parties outside of processing payments and sending push notifications.",
  },
  {
    title: "Data retention",
    body:
      "Attendance, leave, and payroll records are retained for as long as your employer needs them for payroll and tax purposes, even after your account is deactivated.",
  },
  {
    title: "Your choices",
    body:
      "You can review and update your profile details at any time from the Profile screen, and request account deletion from there — see Profile > Delete account.",
  },
];

export default function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  const T = useTheme();
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
        backButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.line2 },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink },
        content: { padding: 24, paddingBottom: 40 },
        updated: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginBottom: 18 },
        section: { marginBottom: 18 },
        sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 14, color: T.ink, marginBottom: 6 },
        sectionBody: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, lineHeight: 19 },
      }),
    [T]
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy policy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated January 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
