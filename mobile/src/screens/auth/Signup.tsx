import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import AuthShell from "../../components/AuthShell";
import FormField from "../../components/FormField";
import InlinePicker from "../../components/InlinePicker";
import { PrimaryButton, TextButton } from "../../components/Button";

// Ported from frontend/src/pages/Signup.jsx.
export default function Signup({ navigation }: any) {
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        title: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 4 },
        subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 20 },
        row: { flexDirection: "row", gap: 10 },
        rowField: { flex: 1 },
        error: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 14 },
        backRow: { marginTop: 10, alignItems: "center" },
        fieldLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
      }),
    [T]
  );
  const { signup } = useAuth();
  const [organizationName, setOrganizationName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!country) {
      setError("Select your store country to continue.");
      return;
    }
    setSubmitting(true);
    try {
      await signup({
        organization_name: organizationName,
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        country,
        phone,
        phone_country_code: COUNTRY_CODES[country].code,
        payment_gateway: country === "BD" ? "sslcommerz" : "stripe",
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
      <Text style={styles.fieldLabel}>Country</Text>
      <InlinePicker
        selectedValue={country}
        onValueChange={setCountry}
        items={COUNTRIES}
        style={{ marginBottom: 14 }}
      />
      <FormField
        label={`Phone number (${COUNTRY_CODES[country]?.dial || "country code"})`}
        value={phone}
        onChangeText={setPhone}
        placeholder="e.g. 017XXXXXXXX"
        keyboardType="phone-pad"
        autoComplete="tel"
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

const COUNTRY_CODES: Record<string, { code: string; dial: string }> = {
  BD: { code: "BD", dial: "+880" },
  US: { code: "US", dial: "+1" },
  GB: { code: "GB", dial: "+44" },
  CA: { code: "CA", dial: "+1" },
  AU: { code: "AU", dial: "+61" },
  AE: { code: "AE", dial: "+971" },
  IN: { code: "IN", dial: "+91" },
  SG: { code: "SG", dial: "+65" },
  MY: { code: "MY", dial: "+60" },
};

const COUNTRIES = [
  { value: "", label: "Select store country" },
  { value: "BD", label: "Bangladesh (+880) · SSLCommerz" },
  { value: "US", label: "United States (+1) · Stripe" },
  { value: "GB", label: "United Kingdom (+44) · Stripe" },
  { value: "CA", label: "Canada (+1) · Stripe" },
  { value: "AU", label: "Australia (+61) · Stripe" },
  { value: "AE", label: "United Arab Emirates (+971) · Stripe" },
  { value: "IN", label: "India (+91) · Stripe" },
  { value: "SG", label: "Singapore (+65) · Stripe" },
  { value: "MY", label: "Malaysia (+60) · Stripe" },
];
