import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import FormField from "../../components/FormField";
import { PrimaryButton, TextButton } from "../../components/Button";

// Ported from frontend/src/pages/Signup.jsx.
export default function Signup({ navigation }: any) {
  const { signup } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      await signup({
        organization_name: organizationName,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
      });
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell maxWidth={400}>
      <Text style={styles.title}>Start your free trial</Text>
      <Text style={styles.subtitle}>7 days free, no card required. Cancel anytime.</Text>

      <FormField
        label="Store / business name"
        value={organizationName}
        onChangeText={setOrganizationName}
        placeholder="e.g. Dhaka Coffee House"
      />

      <View style={styles.row}>
        <FormField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          containerStyle={styles.rowField}
        />
        <FormField
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          containerStyle={styles.rowField}
        />
      </View>

      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@yourstore.com"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
        autoComplete="password-new"
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <PrimaryButton
        title={submitting ? "Creating your store…" : "Start free trial"}
        onPress={handleSubmit}
        loading={submitting}
      />
      <View style={styles.backRow}>
        <TextButton title="Already have an account? Sign in" onPress={() => navigation.goBack()} color={T.muted} />
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 20 },
  row: { flexDirection: "row", gap: 10 },
  rowField: { flex: 1 },
  error: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 14 },
  backRow: { marginTop: 10, alignItems: "center" },
});
