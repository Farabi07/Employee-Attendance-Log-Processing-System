import React, { useEffect, useState } from "react";
import { LogOut, Building2, DollarSign } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { CURRENCIES } from "../../lib/currency";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

const inputStyle = { padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13 };

function planLabel(o) {
  if (o.plan && o.plan !== "none") return o.plan[0].toUpperCase() + o.plan.slice(1);
  if (o.subscription_status === "trialing") return "Trial";
  return "No plan";
}

function fmt(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function PlatformOwnerDashboard() {
  const { user, logout } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricing, setPricing] = useState(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [pricingMsg, setPricingMsg] = useState(null);

  useEffect(() => {
    api
      .get(endpoints.organizationsAll())
      .then((res) => setOrgs(res.organizations || []))
      .finally(() => setLoading(false));
    api.get(endpoints.platformSettings()).then(setPricing);
  }, []);

  const savePricing = async (e) => {
    e.preventDefault();
    setPricingMsg(null);
    setSavingPricing(true);
    try {
      const res = await api.put(endpoints.platformSettings(), pricing);
      setPricing(res);
      setPricingMsg({ type: "success", text: "Pricing updated." });
    } catch (err) {
      setPricingMsg({ type: "error", text: err.message });
    } finally {
      setSavingPricing(false);
    }
  };

  const counts = {
    total: orgs.length,
    trialing: orgs.filter((o) => o.subscription_status === "trialing").length,
    active: orgs.filter((o) => o.subscription_status === "active").length,
    lapsed: orgs.filter((o) => ["past_due", "canceled"].includes(o.subscription_status)).length,
  };

  return (
    <div style={{ fontFamily: fontBody, background: T.paper, minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 28px", borderBottom: `1px solid ${T.line}` }}>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 19, fontWeight: 600, color: T.ink, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <Building2 size={19} /> Platform · All stores
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted }}>{user.email}</span>
          <button
            onClick={logout}
            aria-label="Log out"
            style={{ border: `1px solid ${T.line}`, background: T.card, borderRadius: 9, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <LogOut size={15} color={T.muted} />
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 28px" }}>
        <Card style={{ padding: "20px 22px", marginBottom: 20 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 7 }}>
            <DollarSign size={16} /> Subscription pricing
          </h3>
          {pricing ? (
            <form onSubmit={savePricing} style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>Monthly price</label>
                <input
                  type="number" step="0.01" min="0"
                  value={pricing.monthly_price}
                  onChange={(e) => setPricing((p) => ({ ...p, monthly_price: e.target.value }))}
                  style={{ ...inputStyle, width: 110 }}
                />
              </div>
              <div>
                <label style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>Yearly price</label>
                <input
                  type="number" step="0.01" min="0"
                  value={pricing.yearly_price}
                  onChange={(e) => setPricing((p) => ({ ...p, yearly_price: e.target.value }))}
                  style={{ ...inputStyle, width: 110 }}
                />
              </div>
              <div>
                <label style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, display: "block", marginBottom: 5 }}>Currency</label>
                <select
                  value={pricing.currency}
                  onChange={(e) => setPricing((p) => ({ ...p, currency: e.target.value }))}
                  style={inputStyle}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={savingPricing}
                style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
              >
                {savingPricing ? "Saving…" : "Save pricing"}
              </button>
              {pricingMsg && (
                <span style={{ fontFamily: fontBody, fontSize: 12.5, color: pricingMsg.type === "error" ? T.coral : T.teal }}>{pricingMsg.text}</span>
              )}
            </form>
          ) : (
            <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
          )}
          <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.faint, marginTop: 10 }}>
            This is what every store pays for their subscription — changes apply to new checkouts immediately, existing subscribers keep their current price until they resubscribe.
          </p>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14, marginBottom: 20 }}>
          {[
            { label: "Total stores", value: counts.total, color: T.ink },
            { label: "Trialing", value: counts.trialing, color: T.amber },
            { label: "Active subscriptions", value: counts.active, color: T.teal },
            { label: "Past due / canceled", value: counts.lapsed, color: T.coral },
          ].map((m) => (
            <Card key={m.label} style={{ padding: "16px 18px" }}>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>{m.label}</p>
              <p style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: m.color, margin: 0 }}>{m.value}</p>
            </Card>
          ))}
        </div>

        <Card style={{ padding: "20px 22px" }}>
          {loading ? (
            <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <div style={{ minWidth: 700 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", padding: "0 4px 10px", borderBottom: `1px solid ${T.line}` }}>
                  {["Store", "Owner", "Members", "Plan", "Status", "Expires"].map((h) => (
                    <span key={h} style={{ fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {h}
                    </span>
                  ))}
                </div>
                {orgs.map((o) => (
                  <div key={o.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 1fr", alignItems: "center", padding: "12px 4px", borderBottom: `1px solid ${T.line2}` }}>
                    <span style={{ fontFamily: fontBody, fontSize: 13.5, color: T.ink }}>{o.name}</span>
                    <span style={{ fontFamily: fontMono, fontSize: 12, color: T.muted }}>{o.owner_email || "—"}</span>
                    <span style={{ fontFamily: fontMono, fontSize: 13, color: T.muted }}>{o.member_count}</span>
                    <span style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted }}>{planLabel(o)}</span>
                    <StatusPill status={o.subscription_status} />
                    <span style={{ fontFamily: fontMono, fontSize: 12, color: T.muted }}>{fmt(o.trial_ends_at)}</span>
                  </div>
                ))}
                {orgs.length === 0 && <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, padding: "12px 4px" }}>No stores have signed up yet.</p>}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
