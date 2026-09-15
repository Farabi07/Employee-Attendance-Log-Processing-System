import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Hash } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useToast } from "../../components/Toast";
import { PrimaryButton } from "../../components/Button";
import TeammatePickerList from "./TeammatePickerList";

// Manager/moderator only (gated by ChatListScreen before this ever
// mounts) — an invite-only channel, so members are picked up front rather
// than the channel starting open to the whole org.
export default function CreateChannelScreen({ onBack, onCreated }: { onBack: () => void; onCreated: (channel: any) => void }) {
  const T = useTheme();
  const toast = useToast();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
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
        iconCircle: { width: 38, height: 38, borderRadius: 12, backgroundColor: T.tealBg, alignItems: "center", justifyContent: "center" },
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
        sectionLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink, marginBottom: 8 },
      }),
    [T]
  );

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .get(endpoints.teammatesAll())
      .then((res) => setEmployees(res.employees || []))
      .catch(() => {});
  }, []);

  const toggle = (id: number) => setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const create = async () => {
    if (!name.trim()) {
      toast.show("Give the channel a name.", "error");
      return;
    }
    setCreating(true);
    try {
      const channel = await api.post(endpoints.channelCreate(), {
        name: name.trim(),
        description: description.trim(),
        member_ids: selectedIds,
      });
      toast.show("Channel created.");
      onCreated(channel);
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
              <ChevronLeft size={18} color={T.ink} />
            </Pressable>
            <Text style={styles.headerTitle}>New channel</Text>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.intro}>
              <View style={styles.iconCircle}>
                <Hash size={18} color={T.tealDeep} />
              </View>
              <Text style={styles.introText}>
                Invite-only — only the people you add below can see this channel. You can add or remove members later.
              </Text>
            </View>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Weekend crew"
              placeholderTextColor={T.faint}
              maxLength={100}
            />

            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="What's this channel for?"
              placeholderTextColor={T.faint}
              maxLength={255}
            />

            <Text style={styles.sectionLabel}>Add members{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}</Text>
            <TeammatePickerList employees={employees} selectedIds={selectedIds} onToggle={toggle} />
          </ScrollView>

          <View style={{ padding: 16 }}>
            <PrimaryButton title={creating ? "Creating…" : "Create channel"} onPress={create} disabled={creating} loading={creating} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
