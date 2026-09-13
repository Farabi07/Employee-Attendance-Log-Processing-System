import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { ChevronLeft, LayoutGrid, CalendarDays, Wallet, TrendingUp, Clock, FileText, Settings as SettingsIcon } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { GUIDE_CONTENT, ACCOUNT_SECTION } from "../../lib/userGuide";
import IconChip from "../../components/IconChip";

const LANGUAGE_KEY = "guide_language";

const TAB_ICONS: Record<string, any> = {
  grid: LayoutGrid,
  calendar: CalendarDays,
  wallet: Wallet,
  trending: TrendingUp,
  clock: Clock,
  file: FileText,
};

// Two independent axes, per the request that led here: which role's guide
// shows is decided for the reader (isManagerOrModerator from useAuth()),
// never a toggle they pick themselves — only which language it reads in
// is their choice, persisted the same way theme/notification preference
// are (see lib/ThemeContext.tsx, lib/push.js).
export default function UserGuide({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const { isManagerOrModerator } = useAuth();
  const [lang, setLang] = useState<"en" | "bn">("en");

  useEffect(() => {
    SecureStore.getItemAsync(LANGUAGE_KEY).then((stored) => {
      if (stored === "en" || stored === "bn") setLang(stored);
    });
  }, []);

  const setLanguage = (v: "en" | "bn") => {
    setLang(v);
    SecureStore.setItemAsync(LANGUAGE_KEY, v).catch(() => {});
  };

  const role = isManagerOrModerator ? "manager" : "employee";
  const content = GUIDE_CONTENT[role][lang];
  const account = ACCOUNT_SECTION[lang];

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
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, flex: 1 },
        langToggle: { flexDirection: "row", backgroundColor: T.line2, borderRadius: 9, padding: 2 },
        langOption: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 7 },
        langOptionActive: { backgroundColor: T.navy },
        langOptionText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.muted },
        langOptionTextActive: { color: T.onAccent },
        content: { padding: 20, paddingBottom: 40 },
        roleNote: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 20 },
        tabBlock: { marginBottom: 28 },
        tabHeadRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 3 },
        tabTitle: { fontFamily: fonts.display.semibold, fontSize: 16, color: T.ink },
        tabLocation: {
          fontFamily: fonts.mono.regular,
          fontSize: 10.5,
          color: T.faint,
          marginLeft: 42,
          marginBottom: 12,
        },
        item: {
          backgroundColor: T.card,
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 12,
          padding: 14,
          marginBottom: 8,
        },
        itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 5 },
        itemTitle: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.ink },
        itemChip: {
          fontFamily: fonts.mono.regular,
          fontSize: 10.5,
          color: T.onAccent,
          backgroundColor: T.teal,
          paddingVertical: 2,
          paddingHorizontal: 8,
          borderRadius: 999,
          overflow: "hidden",
        },
        itemBody: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, lineHeight: 18 },
        accountBlock: { borderTopWidth: 1, borderTopColor: T.line2, paddingTop: 20, marginTop: 4 },
      }),
    [T]
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>{lang === "bn" ? "গাইড" : "Guide"}</Text>
        <View style={styles.langToggle}>
          <Pressable
            onPress={() => setLanguage("en")}
            style={[styles.langOption, lang === "en" && styles.langOptionActive]}
          >
            <Text style={[styles.langOptionText, lang === "en" && styles.langOptionTextActive]}>EN</Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage("bn")}
            style={[styles.langOption, lang === "bn" && styles.langOptionActive]}
          >
            <Text style={[styles.langOptionText, lang === "bn" && styles.langOptionTextActive]}>বাংলা</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.roleNote}>
          {lang === "bn"
            ? isManagerOrModerator
              ? "এই গাইডটা তোমার জন্য — একজন Manager/Moderator হিসেবে।"
              : "এই গাইডটা তোমার জন্য — একজন Employee হিসেবে।"
            : isManagerOrModerator
            ? "This guide is for you as a Manager/Moderator."
            : "This guide is for you as an Employee."}
        </Text>

        {content.tabs.map((tab: any) => {
          const Icon = TAB_ICONS[tab.icon] || LayoutGrid;
          return (
            <View key={tab.title} style={styles.tabBlock}>
              <View style={styles.tabHeadRow}>
                <IconChip bg={T.tealBg} size={32}>
                  <Icon size={16} color={T.tealDeep} />
                </IconChip>
                <Text style={styles.tabTitle}>{tab.title}</Text>
              </View>
              <Text style={styles.tabLocation}>{tab.location}</Text>

              {tab.items.map((item: any) => (
                <View key={item.title} style={styles.item}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {!!item.chip && <Text style={styles.itemChip}>{item.chip}</Text>}
                  </View>
                  <Text style={styles.itemBody}>{item.body}</Text>
                </View>
              ))}
            </View>
          );
        })}

        <View style={styles.accountBlock}>
          <View style={styles.tabHeadRow}>
            <IconChip bg={T.navyBg} size={32}>
              <SettingsIcon size={16} color={T.navy} />
            </IconChip>
            <Text style={styles.tabTitle}>{account.title}</Text>
          </View>
          <Text style={styles.tabLocation}>{account.location}</Text>
          {account.items.map((item: any) => (
            <View key={item.title} style={styles.item}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemBody}>{item.body}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
