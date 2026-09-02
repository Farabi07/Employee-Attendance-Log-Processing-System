import React, { useState } from "react";
import { Text, StyleSheet } from "react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import AuthShell from "../../components/AuthShell";
import FormField from "../../components/FormField";
import { PrimaryButton, TextButton } from "../../components/Button";

// Ported from frontend/src/pages/ForgotPassword.jsx. Promoted from an
// inline sub-view of Login to its own pushed screen (see AuthStack.tsx).
export default function ForgotPassword({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await api.post(endpoints.djoserResetPassword(), { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <Text style={styles.title}>Reset password</Text>
        <Text style={styles.body}>
          If an account exists for <Text style={{ fontFamily: fonts.body.semibold }}>{email}</Text>, a reset link has
          been sent.
        </Text>
        <PrimaryButton title="Back to sign in" onPress={() => navigation.goBack()} />
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Enter your work email and we'll send you a reset link.</Text>
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoComplete="email"
      />
      {!!error && <Text style={styles.error}>{error}</Text>}
      <PrimaryButton title={submitting ? "Sending…" : "Send reset link"} onPress={handleSubmit} loading={submitting} />
      <TextButton title="Back to sign in" onPress={() => navigation.goBack()} color={T.muted} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 16 },
  body: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.ink, marginVertical: 16 },
  error: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 14 },
});
