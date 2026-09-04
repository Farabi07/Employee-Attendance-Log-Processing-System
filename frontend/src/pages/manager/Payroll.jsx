import React, { useEffect, useState, useCallback } from "react";
import { Wallet, CheckCircle2, XCircle, ListChecks, Download, FileText, FileSpreadsheet, CreditCard, Banknote } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api, downloadFile } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useAuth } from "../../lib/auth";
import { formatMoney, CURRENCIES } from "../../lib/currency";
import { weekDates } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

const CYCLE_LABEL = { hourly: "Hourly", weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };

function dueLabel(row) {
  if (!row.next_payout_due_at) return row.current_balance > 0 ? "Due now" : "—";
  const due = new Date(row.next_payout_due_at);
  const label = due.toLocaleDateString([], { month: "short", day: "numeric" });
  return row.is_payout_due ? `Due now (was ${label})` : label;
}

export default function ManagerPayroll() {
  const isMobile = useIsMobile();
  const { isManager } = useAuth();
  const [summary, setSummary] = useState(undefined);
  const [transactions, setTransactions] = useState([]);
  const [message, setMessage] = useState(null);
  const [running, setRunning] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [cashConfirmingId, setCashConfirmingId] = useState(null);
  const [cashNote, setCashNote] = useState("");
  const [payingCashEmployeeId, setPayingCashEmployeeId] = useState(null);
  const [directCashAmount, setDirectCashAmount] = useState("");
  const [directCashNote, setDirectCashNote] = useState("");
  const [payingCashBusy, setPayingCashBusy] = useState(false);
  const [currency, setCurrency] = useState("usd");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [payoutCard, setPayoutCard] = useState(undefined);
  const [settingUpCard, setSettingUpCard] = useState(false);

  const defaultWeek = weekDates();
  const [exportFrom, setExportFrom] = useState(defaultWeek[0]);
  const [exportTo, setExportTo] = useState(defaultWeek[6]);
  const [exporting, setExporting] = useState(null); // "csv" | "pdf" | "excel" | null

  const money = (v) => formatMoney(v, summary?.currency);

  const load = useCallback(async () => {
    const [summaryRes, txRes, cardRes] = await Promise.all([
      api.get(endpoints.payrollSummary()),
      api.get(endpoints.walletTransactions("?size=20")),
      isManager ? api.get(endpoints.payoutCardStatus()) : Promise.resolve(undefined),
    ]);
    setSummary(summaryRes);
    setTransactions(txRes.transactions || []);
    setCurrency(summaryRes.currency || "usd");
    if (cardRes) setPayoutCard(cardRes);
  }, [isManager]);

  useEffect(() => {
    load();
  }, [load]);

  // Returning from a Stripe Checkout redirect (payout card setup, or a
  // one-off payout payment) — confirm it right away instead of waiting on
  // the webhook, then tidy the URL back up.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");

    if (params.get("payout_card") === "success" && sessionId) {
      api
        .post(endpoints.payoutCardConfirm(), { session_id: sessionId })
        .then(() => {
          setMessage({ type: "success", text: "Payout card saved — future approvals will charge it automatically." });
          load();
        })
        .catch((err) => setMessage({ type: "error", text: err.message }));
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("payout_card") === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("payout") === "success" && sessionId) {
      api
        .post(endpoints.payoutConfirm(), { session_id: sessionId })
        .then(() => {
          setMessage({ type: "success", text: "Payment confirmed." });
          load();
        })
        .catch((err) => setMessage({ type: "error", text: err.message }));
      window.history.replaceState({}, "", window.location.pathname);
    } else if (params.get("payout") === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPayoutCardSetup = async () => {
    setMessage(null);
    setSettingUpCard(true);
    try {
      const res = await api.post(endpoints.payoutCardSetup());
      window.location.href = res.checkout_url;
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setSettingUpCard(false);
    }
  };

  const saveCurrency = async (value) => {
    setCurrency(value);
    setSavingCurrency(true);
    try {
      await api.put(endpoints.organizationSettings(), { currency: value });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingCurrency(false);
    }
  };

  const runPayroll = async () => {
    setMessage(null);
    setRunning(true);
    try {
      const res = await api.post(endpoints.payrollRun(), {});
      let text = `Paid ${res.employees_paid} employee(s), total ${money(res.total_paid)}.`;
      if (res.employees_failed) text += ` ${res.employees_failed} card charge(s) failed.`;
      if (res.employees_skipped?.length) text += ` Skipped (no payout method set up): ${res.employees_skipped.join(", ")}.`;
      setMessage({ type: (res.employees_failed || res.employees_skipped?.length) ? "error" : "success", text });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setRunning(false);
    }
  };

  const reject = async (id) => {
    setReviewingId(id);
    setMessage(null);
    try {
      await api.post(endpoints.payoutReview(id), { action: "reject" });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  const confirmApprove = async (id) => {
    setReviewingId(id);
    setMessage(null);
    try {
      const res = await api.post(endpoints.payoutReview(id), { action: "approve" });
      if (res.checkout_url) {
        window.location.href = res.checkout_url;
        return;
      }
      // Saved card on file — already charged synchronously, no redirect.
      setConfirmingId(null);
      setMessage({ type: "success", text: `Paid ${money(res.total_charge)} from your saved card.` });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  const confirmCash = async (id) => {
    setReviewingId(id);
    setMessage(null);
    try {
      await api.post(endpoints.payoutReview(id), { action: "approve", payout_method: "cash", note: cashNote || undefined });
      setCashConfirmingId(null);
      setCashNote("");
      setMessage({ type: "success", text: "Marked as paid in cash — waiting for the employee to confirm they received it." });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  const openPayCash = (row) => {
    setPayingCashEmployeeId(row.employee.id);
    setDirectCashAmount(String(row.current_balance));
    setDirectCashNote("");
    setMessage(null);
  };

  const submitPayCash = async (row) => {
    setPayingCashBusy(true);
    setMessage(null);
    try {
      await api.post(endpoints.payoutPayCash(row.employee.id), { amount: directCashAmount, note: directCashNote || undefined });
      setMessage({ type: "success", text: `Marked as paid in cash — waiting for ${row.employee.first_name} to confirm.` });
      setPayingCashEmployeeId(null);
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPayingCashBusy(false);
    }
  };

  const exportPayroll = async (kind) => {
    setExporting(kind);
    try {
      const params = `?date_from=${exportFrom}&date_to=${exportTo}`;
      const filename = `payroll-report_${exportFrom}_to_${exportTo}`;
      if (kind === "csv") {
        await downloadFile(endpoints.payrollExportCsv(params), `${filename}.csv`);
      } else if (kind === "pdf") {
        await downloadFile(endpoints.payrollExportPdf(params), `${filename}.pdf`);
      } else {
        await downloadFile(endpoints.payrollExportExcel(params), `${filename}.xlsx`);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setExporting(null);
    }
  };

  if (summary === undefined) {
    return <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>;
  }

  const distinctCurrencies = new Set(summary.employees.map((r) => r.currency).filter(Boolean));
  const hasMixedCurrencies = distinctCurrencies.size > 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {isManager && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <label style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted }}>Store currency (used for all wallets &amp; payouts)</label>
          <select
            value={currency}
            onChange={(e) => saveCurrency(e.target.value)}
            disabled={savingCurrency}
            style={{ padding: "6px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, background: T.card }}
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 14 }}>
        <Card style={{ padding: "18px 20px" }}>
          <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>Total payable now</p>
          <p style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: T.ink, margin: 0 }}>{money(summary.total_payable)}</p>
          {hasMixedCurrencies && (
            <p style={{ fontFamily: fontBody, fontSize: 10.5, color: T.faint, margin: "4px 0 0" }}>
              Employees are paid in different currencies — this total doesn't convert between them.
            </p>
          )}
        </Card>
        <Card style={{ padding: "18px 20px" }}>
          <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>Pending cash-out requests</p>
          <p style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: T.ink, margin: 0 }}>{summary.pending_request_count}</p>
        </Card>
        <Card style={{ padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {isManager ? (
            <button
              onClick={runPayroll}
              disabled={running || Number(summary.total_payable) <= 0}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 9,
                border: "none",
                background: T.teal,
                color: T.paper,
                fontFamily: fontBody,
                fontWeight: 600,
                fontSize: 13.5,
                cursor: "pointer",
                opacity: running || Number(summary.total_payable) <= 0 ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Wallet size={15} /> {running ? "Processing…" : "Approve & Pay Payroll"}
            </button>
          ) : (
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0, textAlign: "center" }}>
              Only the store Manager can run payroll.
            </p>
          )}
        </Card>
      </div>

      {isManager && (
        <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: 0 }}>
          This pays everyone's full balance right now, regardless of their own cycle. Each employee's cycle (set in Team) decides when they're paid automatically.
        </p>
      )}

      {isManager && (
        <Card style={{ padding: "18px 20px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 14.5, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>
            <CreditCard size={15} /> Payout card
          </h3>
          {payoutCard === undefined ? (
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 }}>Loading…</p>
          ) : payoutCard.saved ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <p style={{ fontFamily: fontMono, fontSize: 13, color: T.ink, margin: 0, textTransform: "capitalize" }}>
                {payoutCard.brand} •••• {payoutCard.last4}
              </p>
              <span style={{ fontFamily: fontBody, fontSize: 11.5, color: T.tealDeep, background: T.tealBg, padding: "3px 8px", borderRadius: 999, fontWeight: 600 }}>
                Approvals charge this automatically
              </span>
              <button
                onClick={startPayoutCardSetup}
                disabled={settingUpCard}
                style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.ink, fontFamily: fontBody, fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                {settingUpCard ? "Opening…" : "Replace card"}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 12px" }}>
                Add a card once so approving a cash-out charges it instantly — no redirect each time. Without one, you'll pay through a one-off checkout page per approval.
              </p>
              <button
                onClick={startPayoutCardSetup}
                disabled={settingUpCard}
                style={{ padding: "9px 16px", borderRadius: 9, border: "none", background: T.navy, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: settingUpCard ? 0.7 : 1 }}
              >
                {settingUpCard ? "Opening…" : "Add a payout card"}
              </button>
            </div>
          )}
        </Card>
      )}

      {message && (
        <p style={{ fontFamily: fontBody, fontSize: 13, color: message.type === "error" ? T.coral : T.teal, margin: 0 }}>{message.text}</p>
      )}

      <Card style={{ padding: "20px 22px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Export for accounting</h3>
        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 14px" }}>
          Gross pay per employee for a pay period — hours, rate, and total earned. Import the CSV straight into Xero, MYOB, or Excel.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }} />
          <span style={{ color: T.muted, fontSize: 12 }}>to</span>
          <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }} />
          <button
            onClick={() => exportPayroll("csv")}
            disabled={exporting !== null}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: `1px solid ${T.navyBg}`, background: T.navyBg, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.navyDeep, cursor: "pointer" }}
          >
            <Download size={14} /> {exporting === "csv" ? "Preparing…" : "CSV"}
          </button>
          <button
            onClick={() => exportPayroll("pdf")}
            disabled={exporting !== null}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: `1px solid ${T.navyBg}`, background: T.navyBg, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.navyDeep, cursor: "pointer" }}
          >
            <FileText size={14} /> {exporting === "pdf" ? "Preparing…" : "PDF"}
          </button>
          <button
            onClick={() => exportPayroll("excel")}
            disabled={exporting !== null}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: `1px solid ${T.navyBg}`, background: T.navyBg, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.navyDeep, cursor: "pointer" }}
          >
            <FileSpreadsheet size={14} /> {exporting === "excel" ? "Preparing…" : "Excel"}
          </button>
        </div>
      </Card>

      <Card style={{ padding: "20px 22px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 14px" }}>Team balances</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                {["Employee", "Rate", "Cycle", "Next due", "This week", "Balance", "Pending", ""].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontFamily: fontBody, fontSize: 11.5, color: T.faint, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3, padding: "0 8px 10px", borderBottom: `1px solid ${T.line}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.employees.map((row) => (
                <React.Fragment key={row.employee.id}>
                <tr className="row-hover">
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontBody, fontSize: 13, color: T.ink }}>
                    {row.employee.first_name} {row.employee.last_name}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontMono, fontSize: 12.5, color: T.muted }}>
                    {row.hourly_rate ? `${formatMoney(row.hourly_rate, row.currency)}/h` : "—"}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontBody, fontSize: 12.5, color: T.muted }}>
                    {CYCLE_LABEL[row.payout_cycle] || "Weekly"}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontMono, fontSize: 12, color: row.is_payout_due ? T.coral : T.faint }}>
                    {dueLabel(row)}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontMono, fontSize: 12.5, color: T.muted }}>
                    {formatMoney(row.this_week_earnings, row.currency)}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontMono, fontSize: 13, fontWeight: 600, color: T.ink }}>
                    {formatMoney(row.current_balance, row.currency)}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, fontFamily: fontMono, fontSize: 12.5, color: T.amber }}>
                    {Number(row.pending_payout) > 0 ? formatMoney(row.pending_payout, row.currency) : "—"}
                  </td>
                  <td style={{ padding: "10px 8px", borderBottom: `1px solid ${T.line2}`, whiteSpace: "nowrap" }}>
                    {Number(row.current_balance) > 0 && payingCashEmployeeId !== row.employee.id && (
                      <button
                        onClick={() => openPayCash(row)}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 7, border: "none", background: T.amberBg, color: T.amber, fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <Banknote size={12} /> Pay cash
                      </button>
                    )}
                  </td>
                </tr>
                {payingCashEmployeeId === row.employee.id && (
                  <tr>
                    <td colSpan={8} style={{ padding: "0 8px 14px", borderBottom: `1px solid ${T.line2}` }}>
                      <div style={{ padding: "12px 14px", borderRadius: 9, background: T.amberBg, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div>
                          <label style={{ display: "block", fontFamily: fontBody, fontSize: 11, color: T.ink, marginBottom: 4 }}>Amount</label>
                          <input
                            type="number" step="0.01" min="0" max={row.current_balance}
                            value={directCashAmount}
                            onChange={(e) => setDirectCashAmount(e.target.value)}
                            style={{ width: 110, padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontMono, fontSize: 12.5 }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <label style={{ display: "block", fontFamily: fontBody, fontSize: 11, color: T.ink, marginBottom: 4 }}>Note (optional)</label>
                          <input
                            type="text"
                            value={directCashNote}
                            onChange={(e) => setDirectCashNote(e.target.value)}
                            style={{ width: "100%", padding: "7px 9px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, boxSizing: "border-box" }}
                          />
                        </div>
                        <button
                          onClick={() => submitPayCash(row)}
                          disabled={payingCashBusy}
                          style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.amber, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          {payingCashBusy ? "Marking…" : "I've paid this in cash"}
                        </button>
                        <button
                          onClick={() => setPayingCashEmployeeId(null)}
                          disabled={payingCashBusy}
                          style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {summary.pending_requests.length > 0 && (
        <Card style={{ padding: "20px 22px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Cash-out requests awaiting review</h3>
          {isManager && !summary.payouts_available && (
            <p style={{ fontFamily: fontBody, fontSize: 12, color: T.amber, margin: "0 0 14px" }}>
              Paying these out requires a paid subscription — not available during the free trial.
            </p>
          )}
          {summary.pending_requests.map((t, i) => {
            const commissionPercent = Number(summary.commission_percent || 0);
            const commissionAmount = Math.round(Number(t.amount) * commissionPercent) / 100;
            const totalCharge = Number(t.amount) + commissionAmount;
            const isConfirming = confirmingId === t.id;
            const isCashConfirming = cashConfirmingId === t.id;
            return (
              <div key={t.id} className="row-hover" style={{ padding: "12px 4px", borderRadius: 8, borderTop: i === 0 ? "none" : `1px solid ${T.line2}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 500, color: T.ink, margin: 0 }}>
                      {t.employee.first_name} {t.employee.last_name}
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: 0 }}>
                      {new Date(t.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <span style={{ fontFamily: fontMono, fontSize: 14, fontWeight: 600, color: T.ink }}>{formatMoney(t.amount, t.currency)}</span>
                  {isManager ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {!isConfirming && !isCashConfirming && (
                        <>
                          <button
                            onClick={() => setConfirmingId(t.id)}
                            disabled={reviewingId === t.id || !summary.payouts_available}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "none", background: T.tealBg, color: T.tealDeep, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: summary.payouts_available ? 1 : 0.5 }}
                          >
                            <CheckCircle2 size={14} /> Pay via Stripe
                          </button>
                          <button
                            onClick={() => setCashConfirmingId(t.id)}
                            disabled={reviewingId === t.id || !summary.payouts_available}
                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "none", background: T.amberBg, color: T.amber, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer", opacity: summary.payouts_available ? 1 : 0.5 }}
                          >
                            <Banknote size={14} /> Pay with cash
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => reject(t.id)}
                        disabled={reviewingId === t.id}
                        style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 8, border: "none", background: T.coralBg, color: T.coral, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  ) : (
                    <StatusPill status="pending" />
                  )}
                </div>

                {isConfirming && (
                  <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 9, background: T.navyBg }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 4, fontFamily: fontMono, fontSize: 12.5, color: T.navyDeep, marginBottom: 10 }}>
                      <span>{t.employee.first_name} receives</span>
                      <span style={{ fontWeight: 600, textAlign: "right" }}>{formatMoney(t.amount, t.currency)}</span>
                      <span>Platform fee ({commissionPercent}%)</span>
                      <span style={{ textAlign: "right" }}>{formatMoney(commissionAmount, t.currency)}</span>
                      <span style={{ fontWeight: 700 }}>Charged to your card</span>
                      <span style={{ fontWeight: 700, textAlign: "right" }}>{formatMoney(totalCharge, t.currency)}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => confirmApprove(t.id)}
                        disabled={reviewingId === t.id}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.teal, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        {reviewingId === t.id
                          ? payoutCard?.saved ? "Paying…" : "Redirecting…"
                          : payoutCard?.saved ? "Pay now" : "Continue to payment"}
                      </button>
                      <button
                        onClick={() => setConfirmingId(null)}
                        disabled={reviewingId === t.id}
                        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {isCashConfirming && (
                  <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 9, background: T.amberBg }}>
                    <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.ink, margin: "0 0 10px", lineHeight: 1.5 }}>
                      Hand {t.employee.first_name} {formatMoney(t.amount, t.currency)} in cash, then confirm below. It won't count as paid until {t.employee.first_name} confirms receiving it in their Wallet.
                    </p>
                    <input
                      type="text"
                      placeholder="Note (optional)"
                      value={cashNote}
                      onChange={(e) => setCashNote(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, marginBottom: 10, boxSizing: "border-box" }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => confirmCash(t.id)}
                        disabled={reviewingId === t.id}
                        style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.amber, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        {reviewingId === t.id ? "Marking…" : "I've paid this in cash"}
                      </button>
                      <button
                        onClick={() => { setCashConfirmingId(null); setCashNote(""); }}
                        disabled={reviewingId === t.id}
                        style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Card style={{ padding: "20px 22px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 14px", display: "flex", alignItems: "center", gap: 8 }}>
          <ListChecks size={16} /> Recent transactions
        </h3>
        {transactions.length === 0 && <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No transactions yet.</p>}
        <div style={{ overflowX: "auto" }}>
          {transactions.map((t, i) => (
            <div key={t.id} className="row-hover" style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 4px", borderRadius: 8, borderTop: i === 0 ? "none" : `1px solid ${T.line2}`, minWidth: 500 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, margin: 0 }}>
                  {t.employee.first_name} {t.employee.last_name} — {t.type === "earning" ? "earned" : "payout"}
                </p>
                <p style={{ fontFamily: fontMono, fontSize: 10.5, color: T.faint, margin: 0 }}>{t.transaction_id}</p>
              </div>
              <span style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 600, color: t.type === "earning" ? T.teal : T.ink }}>
                {t.type === "earning" ? "+" : "-"}{formatMoney(t.amount, t.currency)}
              </span>
              <StatusPill status={t.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
