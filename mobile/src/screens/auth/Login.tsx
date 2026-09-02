import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import FormField from "../../components/FormField";
import { PrimaryButton, TextButton } from "../../components/Button";

// Ported from frontend/src/pages/Login.jsx. The web version toggled an
// inline "forgot password" sub-view with local state — here that's a real
// pushed screen instead (see navigation/AuthStack.tsx), so this only
// handles the sign-in form.
export default function Login({ navigation }: any) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.subtitle}>Use your work email and password.</Text>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password"
      />

      <View style={styles.forgotRow}>
        <TextButton title="Forgot password?" onPress={() => navigation.navigate("ForgotPassword")} />
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton title={submitting ? "Signing in…" : "Sign in"} onPress={handleSubmit} loading={submitting} />

      <View style={styles.signupRow}>
        <Text style={styles.signupText}>New store? </Text>
        <TextButton title="Start a free trial" onPress={() => navigation.navigate("Signup")} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 22 },
  forgotRow: { alignItems: "flex-end", marginBottom: 18, marginTop: -4 },
  error: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 14 },
  signupRow: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
  signupText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
});
