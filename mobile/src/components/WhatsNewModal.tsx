import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Modal, StyleSheet } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Sparkles } from "lucide-react-native";
import { fonts } from "../theme";
import { useTheme } from "../lib/ThemeContext";
import { WHATS_NEW_VERSION, WHATS_NEW_ITEMS } from "../lib/whatsNew";
import Card from "./Card";
import IconChip from "./IconChip";
import { PrimaryButton } from "./Button";

const SEEN_KEY = "whats_new_seen_version";

// Mounted once at the root of the authenticated app shell (see
// navigation/AppTabs.tsx) — checks SecureStore for the last What's New
// version this device has acknowledged and, if it doesn't match the
// current WHATS_NEW_VERSION, shows the highlight list once. Silent no-op
// on a fresh install too (first read seeds SEEN_KEY without showing
// anything) — this is for surfacing *changes* to existing users, not a
// first-run tour.
export default function WhatsNewModal() {
  const T = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(SEEN_KEY)
      .then((stored) => {
        if (stored === null) {
          // Fresh install / pre-existing account on a device that's never
          // recorded a seen version — nothing to announce yet, just seed it.
          SecureStore.setItemAsync(SEEN_KEY, WHATS_NEW_VERSION).catch(() => {});
          return;
        }
        if (stored !== WHATS_NEW_VERSION) setVisible(true);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    setVisible(false);
    SecureStore.setItemAsync(SEEN_KEY, WHATS_NEW_VERSION).catch(() => {});
  };

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", padding: 20 },
        card: { width: "100%", maxWidth: 380, padding: 24 },
        headerRow: { alignItems: "center", marginBottom: 18 },
        iconCircle: {
          width: 48,
          height: 48,
          borderRadius: 14,
          backgroundColor: T.navy,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 18, color: T.ink },
        headerSubtitle: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginTop: 4, textAlign: "center" },
        item: { flexDirection: "row", gap: 12, marginBottom: 16 },
        itemText: { flex: 1 },
        itemTitle: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.ink, marginBottom: 2 },
        itemBody: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, lineHeight: 18 },
      }),
    [T]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Sparkles size={22} color={T.onAccent} />
            </View>
            <Text style={styles.headerTitle}>What's new</Text>
            <Text style={styles.headerSubtitle}>A few things changed in TimeTap since you last checked.</Text>
          </View>

          {WHATS_NEW_ITEMS.map((item) => (
            <View key={item.title} style={styles.item}>
              <IconChip bg={T.tealBg} size={26}>
                <Sparkles size={13} color={T.tealDeep} />
              </IconChip>
              <View style={styles.itemText}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemBody}>{item.body}</Text>
              </View>
            </View>
          ))}

          <PrimaryButton title="Got it" onPress={dismiss} />
        </Card>
      </View>
    </Modal>
  );
}
