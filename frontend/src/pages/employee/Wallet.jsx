import React, { useEffect, useState, useCallback } from "react";
import { Wallet as WalletIcon, ArrowDownToLine, Clock3, History, Landmark, CheckCircle2 } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useAuth } from "../../lib/auth";
import { formatMoney, currencySymbol } from "../../lib/currency";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

const CYCLE_LABEL = { hourly: "hourly", weekly: "weekly", biweekly: "every 2 weeks", monthly: "monthly" };

export default function EmployeeWallet() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [wallet, setWallet] = useState(undefined);
  const [rateHistory, setRateHistory] = useState([]);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    const [res, historyRes] = await Promise.all([
      api.get(endpoints.walletMe()),
      api.get(endpoints.rateHistory(user.id)),
    ]);
    setWallet(res);
    setRateHistory(historyRes.history || []);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRequest = async (e) => {
    e.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.walletPayoutRequest(), { amount });
      setMessage({ type: "success", text: "Payout requested — your manager will settle it." });
      setAmount("");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const startOnboarding = async () => {
    setMessage(null);
    setConnecting(true);
    try {
      const res = await api.post(endpoints.connectOnboard());
      window.location.href = res.url;
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setConnecting(false);
    }
  };

  if (wallet === undefined) {
    return <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>;
  }

  const money = (v) => formatMoney(v, wallet.currency);

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ padding: "24px 22px", background: T.ink }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <WalletIcon size={16} color={T.paper} strokeWidth={1.8} />
            <span style={{ fontFamily: fontBody, fontSize: 12.5, color: "rgba(245,246,242,0.7)" }}>Current balance</span>
          </div>
          <p style={{ fontFamily: fontDisplay, fontSize: 34, fontWeight: 600, color: T.paper, margin: 0 }}>{money(wallet.current_balance)}</p>
          {wallet.hourly_rate && (
            <p style={{ fontFamily: fontMono, fontSize: 11.5, color: "rgba(245,246,242,0.55)", marginTop: 8 }}>
              {currencySymbol(wallet.currency)}{Number(wallet.hourly_rate).toFixed(2)}/hour · paid {CYCLE_LABEL[wallet.payout_cycle] || "weekly"}
              {wallet.next_payout_due_at && ` · next payout ${new Date(wallet.next_payout_due_at).toLocaleDateString([], { month: "short", day: "numeric" })}`}
            </p>
          )}
        </Card>

        <Card style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Clock3 size={14} color={T.amber} />
            <span style={{ fontFamily: fontBody, fontSize: 12, color: T.muted }}>Pending / processing</span>
          </div>
          <p style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "0 0 12px" }}>{money(wallet.pending_payout)}</p>
          <div style={{ borderTop: `1px solid ${T.line2}`, paddingTop: 12 }}>
            <span style={{ fontFamily: fontBody, fontSize: 12, color: T.muted }}>This week's earnings</span>
            <p style={{ fontFamily: fontDisplay, fontSize: 20, fontWeight: 600, color: T.ink, margin: "2px 0 0" }}>{money(wallet.this_week_earnings)}</p>
          </div>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>
            <Landmark size={15} /> Payout method
          </h3>
          {wallet.payouts_enabled ? (
            <>
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.tealDeep, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> Ready to receive payouts
              </p>
              <button
                onClick={startOnboarding}
                disabled={connecting}
                style={{ width: "100%", padding: "9px 0", borderRadius: 9, border: `1px solid ${T.line}`, background: T.card, color: T.ink, fontFamily: fontBody, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}
              >
                {connecting ? "Opening…" : "Add another bank or card"}
              </button>
            </>
          ) : (
            <>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 14px" }}>
                {wallet.payout_method_connected
                  ? "Almost there — finish verifying your details with Stripe to start receiving payouts."
                  : "Add a bank account or card so your payouts can actually reach you."}
              </p>
              <button
                onClick={startOnboarding}
                disabled={connecting}
                style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: T.navy, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer", opacity: connecting ? 0.7 : 1 }}
              >
                {connecting ? "Opening…" : wallet.payout_method_connected ? "Finish setup" : "Connect a bank account or card"}
              </button>
            </>
          )}
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>
            <ArrowDownToLine size={15} /> Request payout
          </h3>
          {!wallet.payouts_available ? (
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 }}>
              Cash-out requests open up once your employer subscribes — currently on a free trial.
            </p>
          ) : !wallet.payouts_enabled ? (
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 }}>
              Set up your payout method above first, then you can request a cash-out here.
            </p>
          ) : (
            <>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 14px" }}>
                Need cash before payday? Request an instant cash-out — your manager approves and pays it.
              </p>
              <form onSubmit={handleRequest}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={wallet.current_balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Up to ${money(wallet.current_balance)}`}
                  required
                  disabled={Number(wallet.current_balance) <= 0}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 13.5, marginBottom: 10 }}
                />
                <button
                  type="submit"
                  disabled={submitting || Number(wallet.current_balance) <= 0}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    borderRadius: 9,
                    border: "none",
                    background: T.ink,
                    color: T.paper,
                    fontFamily: fontBody,
                    fontWeight: 600,
                    fontSize: 13.5,
                    cursor: "pointer",
                    opacity: submitting || Number(wallet.current_balance) <= 0 ? 0.6 : 1,
                  }}
                >
                  {submitting ? "Requesting…" : "Request payout"}
                </button>
              </form>
            </>
          )}
          {message && (
            <p style={{ fontFamily: fontBody, fontSize: 12, color: message.type === "error" ? T.coral : T.teal, marginTop: 10, textAlign: "center" }}>
              {message.text}
            </p>
          )}
        </Card>
      </div>

      <Card style={{ padding: "20px 22px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 14px" }}>Earnings & payout history</h3>
        {wallet.history.length === 0 && (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>Nothing here yet — check in to start earning.</p>
        )}
        <div style={{ overflowX: "auto" }}>
          {wallet.history.map((t, i) => (
            <div
              key={t.id}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 4px", borderTop: i === 0 ? "none" : `1px solid ${T.line2}`, minWidth: 420 }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 500, color: T.ink, margin: 0 }}>
                  {t.type === "earning" ? "Earned" : "Payout"}
                  {t.note ? ` — ${t.note}` : ""}
                </p>
                <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: 0 }}>
                  {new Date(t.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              <span
                style={{
                  fontFamily: fontMono,
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: t.type === "earning" ? T.teal : T.ink,
                  whiteSpace: "nowrap",
                }}
              >
                {t.type === "earning" ? "+" : "-"}{money(t.amount)}
              </span>
              <StatusPill status={t.status} />
            </div>
          ))}
        </div>
      </Card>

      {rateHistory.length > 0 && (
        <Card style={{ padding: "20px 22px", gridColumn: isMobile ? "auto" : "1 / -1" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 7 }}>
            <History size={15} /> Pay history
          </h3>
          {rateHistory.map((h, i) => (
            <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i === 0 ? "none" : `1px solid ${T.line2}`, fontFamily: fontBody, fontSize: 12.5 }}>
              <span style={{ color: T.faint, fontFamily: fontMono, width: 130, flexShrink: 0 }}>
                {new Date(h.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
              </span>
              <span style={{ color: T.ink }}>
                {h.old_hourly_rate ? `${formatMoney(h.old_hourly_rate, h.old_currency)} → ` : "Set to "}
                <strong>{formatMoney(h.new_hourly_rate, h.new_currency)}/h</strong>
                {h.changed_by && ` by ${h.changed_by.first_name} ${h.changed_by.last_name}`}
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
