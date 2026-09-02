import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import AuthShell from "../../components/AuthShell";
import FormField from "../../components/FormField";
import { PrimaryButton } from "../../components/Button";

// Ported from frontend/src/pages/ResetPasswordConfirm.jsx. The web version
// read uid/token by manually regexing window.location.pathname on app
// load; here they arrive as real route params from the emailed deep link
// (timetap://password/reset/confirm/:uid/:token — see navigation/linking.ts).
export default function ResetPasswordConfirm({ route, navigation }: any) {
  const { uid, token } = route.params;
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserResetPasswordConfirm(), { uid, token, new_password: newPassword });
      setDone(true);
    } catch (err: any) {
      setError(err.message || "This reset link may have expired.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Text style={styles.title}>Set a new password</Text>

      {done ? (
        <>
          <Text style={styles.done}>Password updated — you can sign in now.</Text>
          <PrimaryButton title="Go to sign in" onPress={() => navigation.replace("Login")} />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Choose a new password for your account.</Text>
          <FormField
            label="New password"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            secureTextEntry
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <PrimaryButton title={submitting ? "Saving…" : "Save new password"} onPress={handleSubmit} loading={submitting} />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 16 },
  done: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.teal, marginVertical: 16 },
  error: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 14 },
});
