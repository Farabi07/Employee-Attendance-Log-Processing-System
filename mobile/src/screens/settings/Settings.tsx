import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import { ChevronLeft, Sun, Moon } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme, useThemeSetting, ThemePreference } from "../../lib/ThemeContext";
import { getNotificationsEnabled, setNotificationsEnabled } from "../../lib/push";

const APPEARANCE_OPTIONS: { value: ThemePreference; label: string; icon: any }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Night", icon: Moon },
];

// Rendered as a swapped-in view inside AccountMenu's existing Modal, same
// pattern as AccountDeletion.tsx — a dedicated screen rather than piling
// more sections onto one view, so appearance/notification/privacy-style
// settings have a natural home to grow into later without that view
// turning into an endless scroll of unrelated sections.
export default function Settings({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { preference, setPreference } = useThemeSetting();
  const [notifEnabled, setNotifEnabled] = useState(true);
  const [notifBusy, setNotifBusy] = useState(false);

  useEffect(() => {
    getNotificationsEnabled().then(setNotifEnabled);
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotifEnabled(value);
    setNotifBusy(true);
    try {
      await setNotificationsEnabled(value);
    } finally {
      setNotifBusy(false);
    }
  };

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
        toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        toggleLabel: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
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
          <Text style={styles.sectionHint}>Switch between light and night mode.</Text>
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

        <View style={[styles.section, { marginTop: 20 }]}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <Text style={styles.sectionHint}>Get push alerts for shift, approval, and payroll updates.</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              disabled={notifBusy}
              trackColor={{ false: T.line, true: T.tealBg }}
              thumbColor={notifEnabled ? T.teal : undefined}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
