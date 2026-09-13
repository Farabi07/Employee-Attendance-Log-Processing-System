import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { ChevronLeft, Megaphone } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useToast } from "../../components/Toast";
import { PrimaryButton } from "../../components/Button";

// Reached via AccountMenu's Account section, shown only to managers/
// moderators — a manager or moderator broadcasting one message to every
// other member of their organization. Recipients see it in their own
// "Notices" section (see NotificationBell.tsx / Notifications.tsx),
// separate from the regular per-event Notifications feed, since a notice
// is store-wide news, not something tied to one of their own actions.
export default function SendNotice({ onBack }: { onBack: () => void }) {
  const T = useTheme();
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!title.trim()) {
      toast.show("Give the notice a title.", "error");
      return;
    }
    setSending(true);
    try {
      const res = await api.post(endpoints.noticeCreate(), { title: title.trim(), message: message.trim() });
      toast.show(res?.detail || "Notice sent.");
      setTitle("");
      setMessage("");
      onBack();
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setSending(false);
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
        backButton: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.line2 },
        headerTitle: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink },
        content: { padding: 20 },
        intro: { flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 20 },
        iconCircle: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.amberBg, alignItems: "center", justifyContent: "center" },
        introText: { flex: 1, fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, lineHeight: 18 },
        label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
        input: {
          borderWidth: 1,
          borderColor: T.line,
          borderRadius: 8,
          paddingVertical: 10,
          paddingHorizontal: 12,
          fontFamily: fonts.body.regular,
          fontSize: 14,
          color: T.ink,
          backgroundColor: T.card,
          marginBottom: 16,
        },
        textarea: { minHeight: 100, textAlignVertical: "top" },
      }),
    [T]
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
          <ChevronLeft size={18} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Send a notice</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.intro}>
          <View style={styles.iconCircle}>
            <Megaphone size={18} color={T.amber} />
          </View>
          <Text style={styles.introText}>
            Goes to everyone else in your organization as a notice — kept separate from their regular notifications.
          </Text>
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Store closed Friday"
          placeholderTextColor={T.faint}
          maxLength={255}
        />

        <Text style={styles.label}>Message (optional)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Add any details everyone should know…"
          placeholderTextColor={T.faint}
          multiline
        />

        <PrimaryButton title={sending ? "Sending…" : "Send notice"} onPress={send} disabled={sending} loading={sending} />
      </View>
    </KeyboardAvoidingView>
  );
}
