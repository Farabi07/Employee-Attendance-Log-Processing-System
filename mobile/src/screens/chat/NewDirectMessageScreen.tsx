import React, { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useToast } from "../../components/Toast";
import TeammatePickerList from "./TeammatePickerList";

// Any org member can start a DM (no manager gating) — reuses an existing
// conversation with the same person instead of creating a duplicate every
// time (see chat/views/conversation_views.py::startConversation).
export default function NewDirectMessageScreen({ onBack, onStarted }: { onBack: () => void; onStarted: (conversation: any) => void }) {
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
      }),
    [T]
  );

  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);

  useEffect(() => {
    api
      .get(endpoints.teammatesAll())
      .then((res) => setEmployees(res.employees || []))
      .finally(() => setLoading(false));
  }, []);

  const start = async (userId: number) => {
    setStarting(userId);
    try {
      const conversation = await api.post(endpoints.conversationStart(), { user_id: userId });
      onStarted(conversation);
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setStarting(null);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onBack}>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton} accessibilityLabel="Go back" accessibilityRole="button">
            <ChevronLeft size={18} color={T.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>New message</Text>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={T.teal} />
          </View>
        ) : starting != null ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={T.teal} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <TeammatePickerList employees={employees} selectedIds={[]} onToggle={start} multi={false} />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
