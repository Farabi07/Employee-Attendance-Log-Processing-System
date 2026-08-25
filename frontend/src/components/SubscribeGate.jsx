import React, { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { T, fontDisplay, fontBody } from "../theme";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { endpoints } from "../lib/endpoints";
import { formatMoney } from "../lib/currency";
import Card from "./Card";

function daysLeft(trialEndsAt) {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt) - new Date();
  return Math.max(0, Math.ceil(ms / 86400000));
}

function PlanButtons({ onPick, busy }) {
  const [pricing, setPricing] = useState(null);

  useEffect(() => {
    api.get(endpoints.platformSettings()).then(setPricing).catch(() => {});
  }, []);

  const btn = {
    flex: 1,
    padding: "12px 0",
    borderRadius: 9,
    border: "none",
    background: T.ink,
    color: T.paper,
    fontFamily: fontBody,
    fontWeight: 600,
    fontSize: 13.5,
    cursor: busy ? "default" : "pointer",
    opacity: busy ? 0.7 : 1,
  };
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <button disabled={busy} onClick={() => onPick("monthly")} style={btn}>
        {busy ? "…" : pricing ? `Monthly · ${formatMoney(pricing.monthly_price, pricing.currency)}` : "Monthly"}
      </button>
      <button disabled={busy} onClick={() => onPick("yearly")} style={{ ...btn, background: T.teal }}>
        {busy ? "…" : pricing ? `Yearly · ${formatMoney(pricing.yearly_price, pricing.currency)}` : "Yearly"}
      </button>
    </div>
  );
}

export function TrialBanner() {
  const { billing } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!billing || billing.subscription_status !== "trialing" || !billing.has_active_access) return null;

  const subscribe = async (plan) => {
    setError("");
    setBusy(true);
    try {
      const res = await api.post(endpoints.billingCheckout(), { plan });
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ background: T.amberBg, borderBottom: `1px solid ${T.line}`, padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontFamily: fontBody, fontSize: 12.5, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}>
        <AlertTriangle size={14} color={T.amber} />
        {daysLeft(billing.trial_ends_at)} day(s) left in your free trial.
        {error && <span style={{ color: T.coral }}> {error}</span>}
      </span>
      {billing.is_manager && (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => subscribe("monthly")} disabled={busy} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Subscribe
          </button>
        </div>
      )}
    </div>
  );
}

export default function SubscribeGate() {
  const { billing, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const subscribe = async (plan) => {
    setError("");
    setBusy(true);
    try {
      const res = await api.post(endpoints.billingCheckout(), { plan });
      window.location.href = res.checkout_url;
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const expired = billing?.subscription_status === "canceled" || billing?.subscription_status === "past_due" || billing?.subscription_status === "trialing";

  return (
    <div style={{ minHeight: "100vh", background: T.paper, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: fontBody, padding: 16 }}>
      <Card style={{ width: "min(420px, 100%)", padding: "32px 28px", textAlign: "center" }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: T.coralBg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <Clock size={22} color={T.coral} />
        </div>

        <h1 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, margin: "0 0 8px" }}>
          {expired ? "Your free trial has ended" : "Subscription required"}
        </h1>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 24px" }}>
          {billing?.organization_name ? `${billing.organization_name} needs` : "This store needs"} an active subscription to keep using check-in, roster, and leave features.
        </p>

        {billing?.is_manager ? (
          <>
            <PlanButtons onPick={subscribe} busy={busy} />
            {error && <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, marginTop: 12 }}>{error}</p>}
          </>
        ) : (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, background: T.line2, padding: "12px 14px", borderRadius: 9 }}>
            Ask your store manager to subscribe to restore access.
          </p>
        )}

        <button
          onClick={logout}
          style={{ marginTop: 20, border: "none", background: "transparent", color: T.muted, fontFamily: fontBody, fontSize: 12.5, cursor: "pointer" }}
        >
          Log out
        </button>
      </Card>
    </div>
  );
}
