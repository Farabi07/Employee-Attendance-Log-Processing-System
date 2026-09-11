import React, { useMemo } from "react";
import { View, Text, Pressable, ScrollView, Linking, StyleSheet } from "react-native";
import { ChevronLeft, Mail } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";

const SUPPORT_EMAIL = "support@timetap.app";

const FAQS: { q: string; a: string }[] = [
  {
    q: "How do I clock in or out?",
    a: "Go to the Today tab and tap Scan to scan your workplace's shift QR code. Location is checked first, so make sure location access is on and you're on-site.",
  },
  {
    q: "How do I request leave?",
    a: "Open the Leave tab, tap the + button, pick a leave type and dates, and submit. Your manager will approve or decline it from there.",
  },
  {
    q: "Why can't I clock in?",
    a: "Clock-in needs an active shift, a working location, and being within range of the office. If it still fails, check with your manager that the shift and QR code are set up correctly.",
  },
  {
    q: "How do I update my profile photo or details?",
    a: "Tap your profile picture in the top-right corner, then Profile, to edit your name, phone, address, and photo.",
  },
  {
    q: "I forgot my password.",
    a: "On the login screen, tap Forgot password and follow the reset link sent to your email.",
  },
];

export default function HelpCenter({ onBack }: { onBack: () => void }) {
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
        backButton: { padding: 2 },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink },
        content: { padding: 24, paddingBottom: 40 },
        contactRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: T.line,
          backgroundColor: T.tealBg,
          marginBottom: 22,
        },
        contactIconCircle: {
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: T.teal,
          alignItems: "center",
          justifyContent: "center",
        },
        contactLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted },
        contactValue: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.tealDeep },
        sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 13.5, color: T.ink, marginBottom: 12 },
        faqItem: { marginBottom: 16 },
        faqQ: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.ink, marginBottom: 4 },
        faqA: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, lineHeight: 18 },
      }),
    [T]
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Help center</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Pressable style={styles.contactRow} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)}>
          <View style={styles.contactIconCircle}>
            <Mail size={15} color={T.onAccent} />
          </View>
          <View>
            <Text style={styles.contactLabel}>Still stuck? Email us</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          </View>
        </Pressable>

        <Text style={styles.sectionTitle}>Frequently asked questions</Text>
        {FAQS.map((f) => (
          <View key={f.q} style={styles.faqItem}>
            <Text style={styles.faqQ}>{f.q}</Text>
            <Text style={styles.faqA}>{f.a}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
