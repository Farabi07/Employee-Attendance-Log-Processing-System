import React, { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, StyleSheet } from "react-native";
import { X } from "lucide-react-native";
import { T, fonts } from "../theme";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import Card from "./Card";
import Avatar from "./Avatar";
import { PrimaryButton } from "./Button";

// Ported from frontend/src/components/ProfileModal.jsx.
export default function ProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user, isManager, isManagerOrModerator, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;
  const initials = `${(user.first_name || "?")[0]}${(user.last_name || "?")[0]}`.toUpperCase();
  const roleLabel = isManager ? "Manager" : isManagerOrModerator ? "Moderator" : "Employee";

  const handleSubmit = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserSetPassword(), { current_password: currentPassword, new_password: newPassword });
      setMessage({ type: "success", text: "Password updated. Please log in again." });
      setCurrentPassword("");
      setNewPassword("");
      setTimeout(logout, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Card style={styles.card}>
          <View style={styles.headerRow}>
            <View style={styles.identityRow}>
              <Avatar initials={initials} size={44} />
              <View>
                <Text style={styles.name}>
                  {user.first_name} {user.last_name}
                </Text>
                <Text style={styles.email}>{user.email}</Text>
                <Text style={styles.role}>{roleLabel}</Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={18} color={T.muted} />
            </Pressable>
          </View>

          <View style={styles.passwordSection}>
            <Text style={styles.sectionTitle}>Change password</Text>
            <TextInput
              secureTextEntry
              placeholder="Current password"
              placeholderTextColor={T.faint}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              style={styles.input}
            />
            <TextInput
              secureTextEntry
              placeholder="New password"
              placeholderTextColor={T.faint}
              value={newPassword}
              onChangeText={setNewPassword}
              style={styles.input}
            />
            <PrimaryButton
              title={submitting ? "Updating…" : "Update password"}
              onPress={handleSubmit}
              loading={submitting}
              disabled={!currentPassword || !newPassword}
            />
            {message && (
              <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>{message.text}</Text>
            )}
          </View>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(22,35,58,0.55)", alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 360, padding: 22 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.ink },
  email: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted },
  role: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginTop: 2 },
  passwordSection: { borderTopWidth: 1, borderTopColor: T.line2, paddingTop: 16 },
  sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 13.5, color: T.ink, marginBottom: 12 },
  input: {
    width: "100%",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: T.ink,
    marginBottom: 10,
  },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12, marginTop: 10, textAlign: "center" },
});
