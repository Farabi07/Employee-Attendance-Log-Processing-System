import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, Sun, Moon, Smartphone } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme, useThemeSetting, ThemePreference } from "../../lib/ThemeContext";

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: any }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Smartphone },
];

// Rendered as a swapped-in view inside ProfileModal's existing Modal, same
// pattern as AccountDeletion.tsx — a dedicated screen rather than piling
// more sections onto ProfileModal itself, so Notifications/Privacy-style
// settings have a natural home to grow into later without that modal
// turning into an endless scroll of unrelated sections.
export default function Settings({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { preference, setPreference } = useThemeSetting();
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
        content: { padding: 24 },
        section: { marginBottom: 4 },
        sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 13.5, color: T.ink, marginBottom: 4 },
        sectionHint: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 12 },
        appearanceRow: { flexDirection: "row", gap: 8 },
        appearanceOption: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          paddingVertical: 10,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: T.line,
          backgroundColor: T.card,
        },
        appearanceOptionActive: { borderColor: T.teal, backgroundColor: T.tealBg },
        appearanceLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.muted },
        appearanceLabelActive: { color: T.tealDeep },
      }),
    [T]
  );

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <Text style={styles.sectionHint}>Follows your phone's setting by default.</Text>
          <View style={styles.appearanceRow}>
            {APPEARANCE_OPTIONS.map((opt) => {
              const active = preference === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setPreference(opt.value)}
                  style={[styles.appearanceOption, active && styles.appearanceOptionActive]}
                >
                  <opt.icon size={14} color={active ? T.tealDeep : T.muted} strokeWidth={2} />
                  <Text style={[styles.appearanceLabel, active && styles.appearanceLabelActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}
