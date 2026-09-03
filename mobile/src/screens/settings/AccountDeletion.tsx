import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { AlertTriangle, ChevronLeft } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";

// New screen, not a port — required by Apple App Store guideline 5.1.1(v)
// (any app that lets someone create an account must let them delete it
// in-app too). The web app has no equivalent feature yet. Backend is a
// soft-delete (authentication/views/account_views.py's deactivateMyAccount)
// so payroll/attendance history survives for the employer's records; the
// account is fully locked out immediately (Django + SIMPLE_JWT already
// reject is_active=False both at login and on any already-issued token).
//
// Rendered as a swapped-in view inside ProfileModal's existing Modal
// (see ProfileModal.tsx) rather than a routed screen — ProfileModal
// itself is a plain RN Modal opened from AppHeader, not a navigator
// screen, so this follows the same pattern instead of registering a new
// route just for one back-and-forth.
export default function AccountDeletion({ onBack }: { onBack: () => void }) {
  const { logout } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");
    try {
      await api.post(endpoints.deactivateAccount());
      await logout();
    } catch (err: any) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <View>
      <View style={styles.header}>
        <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
          <ChevronLeft size={20} color={T.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Delete account</Text>
      </View>

      <View style={styles.content}>
          <View style={styles.iconCircle}>
            <AlertTriangle size={22} color={T.coral} />
          </View>
          <Text style={styles.title}>Delete your account?</Text>
          <Text style={styles.body}>
            This deactivates your TimeTap account immediately — you won't be able to sign in again. Your attendance and
            wallet history stays on record for your employer's payroll and tax purposes, but your account itself is closed.
          </Text>
          <Text style={styles.body}>If you deactivated by mistake, ask your manager to reactivate your account for you.</Text>

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {!confirming ? (
            <Pressable onPress={() => setConfirming(true)} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete my account</Text>
            </Pressable>
          ) : (
            <View style={styles.confirmBlock}>
              <Text style={styles.confirmText}>Are you sure? This can't be undone by you — only your manager can reverse it.</Text>
              <View style={styles.confirmRow}>
                <Pressable onPress={handleDelete} disabled={submitting} style={[styles.deleteButton, { flex: 1 }]}>
                  <Text style={styles.deleteButtonText}>{submitting ? "Deleting…" : "Yes, delete it"}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirming(false)} disabled={submitting} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  content: { padding: 24, alignItems: "center" },
  iconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: T.coralBg, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontFamily: fonts.display.semibold, fontSize: 17, color: T.ink, marginBottom: 10, textAlign: "center" },
  body: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, textAlign: "center", lineHeight: 19, marginBottom: 12 },
  errorText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 10, textAlign: "center" },
  deleteButton: { backgroundColor: T.coral, borderRadius: 9, paddingVertical: 11, paddingHorizontal: 20, marginTop: 8, alignItems: "center" },
  deleteButtonText: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: "#fff" },
  confirmBlock: { width: "100%", marginTop: 6 },
  confirmText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, textAlign: "center", marginBottom: 12 },
  confirmRow: { flexDirection: "row", gap: 8 },
  cancelButton: { paddingVertical: 11, paddingHorizontal: 16, borderRadius: 9, borderWidth: 1, borderColor: T.line, marginTop: 8, alignItems: "center", justifyContent: "center" },
  cancelButtonText: { fontFamily: fonts.body.semibold, fontSize: 13, color: T.muted },
});
