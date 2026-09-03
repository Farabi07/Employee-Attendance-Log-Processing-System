import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Clock } from "lucide-react-native";
import { T, fonts } from "../theme";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import { formatMoney } from "../lib/currency";
import Card from "../components/Card";

// Ported from frontend/src/components/SubscribeGate.jsx (default export
// only — TrialBanner is a separate, smaller header banner not yet ported).
// Subscription checkout is the 4th and last Stripe flow to move to
// expo-web-browser's openAuthSessionAsync; confirm-on-return uses the same
// billingConfirm() endpoint the web app calls from its URL-param check on
// load, just triggered from the browser session result instead.
const BILLING_RETURN = "timetap://billing/success";

function extractQueryParam(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function PlanButtons({ onPick, busy }: { onPick: (plan: "monthly" | "yearly") => void; busy: boolean }) {
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    api
      .get(endpoints.platformSettings())
      .then(setPricing)
      .catch(() => {});
  }, []);

  return (
    <View style={styles.planRow}>
      <Pressable disabled={busy} onPress={() => onPick("monthly")} style={[styles.planButton, { opacity: busy ? 0.7 : 1 }]}>
        <Text style={styles.planButtonText}>
          {busy ? "…" : pricing ? `Monthly · ${formatMoney(pricing.monthly_price, pricing.currency)}` : "Monthly"}
        </Text>
      </Pressable>
      <Pressable
        disabled={busy}
        onPress={() => onPick("yearly")}
        style={[styles.planButton, styles.planButtonTeal, { opacity: busy ? 0.7 : 1 }]}
      >
        <Text style={styles.planButtonText}>
          {busy ? "…" : pricing ? `Yearly · ${formatMoney(pricing.yearly_price, pricing.currency)}` : "Yearly"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function SubscribeGateScreen() {
  const { billing, logout, refreshBilling } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subscribe = async (plan: "monthly" | "yearly") => {
    setError("");
    setBusy(true);
    try {
      const res = await api.post(endpoints.billingCheckout(), { plan, success_url: BILLING_RETURN, cancel_url: BILLING_RETURN });
      const result = await WebBrowser.openAuthSessionAsync(res.checkout_url, BILLING_RETURN);
      if (result.type === "success" && result.url) {
        const sessionId = extractQueryParam(result.url, "session_id");
        if (sessionId) {
          await api.post(endpoints.billingConfirm(), { session_id: sessionId });
          await refreshBilling();
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const expired = billing?.subscription_status === "canceled" || billing?.subscription_status === "past_due" || billing?.subscription_status === "trialing";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <View style={styles.iconCircle}>
            <Clock size={22} color={T.coral} />
          </View>

          <Text style={styles.title}>{expired ? "Your free trial has ended" : "Subscription required"}</Text>
          <Text style={styles.subtitle}>
            {billing?.organization_name ? `${billing.organization_name} needs` : "This store needs"} an active subscription to
            keep using check-in, roster, and leave features.
          </Text>

          {billing?.can_manage_subscription ? (
            <>
              <PlanButtons onPick={subscribe} busy={busy} />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
            </>
          ) : (
            <Text style={styles.askManagerText}>Ask your store manager to subscribe to restore access.</Text>
          )}

          <Pressable onPress={logout} style={{ marginTop: 20 }}>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  card: { width: "100%", maxWidth: 420, padding: 28, alignItems: "center" },
  iconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: T.coralBg, alignItems: "center", justifyContent: "center", marginBottom: 18 },
  title: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink, marginBottom: 8, textAlign: "center" },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 24, textAlign: "center", lineHeight: 19 },
  planRow: { flexDirection: "row", gap: 10, width: "100%" },
  planButton: { flex: 1, paddingVertical: 12, borderRadius: 9, backgroundColor: T.ink, alignItems: "center" },
  planButtonTeal: { backgroundColor: T.teal },
  planButtonText: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.paper },
  errorText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginTop: 12 },
  askManagerText: {
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: T.ink,
    backgroundColor: T.line2,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 9,
    textAlign: "center",
    width: "100%",
  },
  logoutText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
});
