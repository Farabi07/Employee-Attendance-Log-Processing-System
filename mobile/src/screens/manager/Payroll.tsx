import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import { Wallet, CheckCircle2, XCircle, ListChecks, Download, FileText, FileSpreadsheet, CreditCard, Banknote } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { downloadAndShare } from "../../lib/download";
import { useAuth } from "../../lib/auth";
import { formatMoney, CURRENCIES } from "../../lib/currency";
import { weekDates } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import DateField from "../../components/DateField";
import InlinePicker from "../../components/InlinePicker";

// Ported from frontend/src/pages/manager/Payroll.jsx. The web version's
// <table> becomes a horizontally-scrollable fixed-column row layout (RN
// has no <table>). The four Stripe/URL-return spots — payout card setup,
// one-off payout checkout, and their confirm-on-return logic — use
// expo-web-browser's openAuthSessionAsync with our own custom-scheme
// return path instead of window.location.href + reading
// window.location.search on mount; the session_id is read straight off
// the browser result instead.
const CYCLE_LABEL: Record<string, string> = { hourly: "Hourly", weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly" };
const PAYOUT_CARD_RETURN = "timetap://payout-card/success";
const PAYOUT_RETURN = "timetap://payout/success";

function dueLabel(row: any) {
  if (!row.next_payout_due_at) return row.current_balance > 0 ? "Due now" : "—";
  const due = new Date(row.next_payout_due_at);
  const label = due.toLocaleDateString([], { month: "short", day: "numeric" });
  return row.is_payout_due ? `Due now (was ${label})` : label;
}

function extractQueryParam(url: string, key: string): string | null {
  const match = url.match(new RegExp(`[?&]${key}=([^&]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Payroll() {
  const { isManager } = useAuth();
  const [summary, setSummary] = useState<any>(undefined);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [running, setRunning] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [cashConfirmingId, setCashConfirmingId] = useState<number | null>(null);
  const [cashNote, setCashNote] = useState("");
  const [payingCashEmployee, setPayingCashEmployee] = useState<any>(null);
  const [directCashAmount, setDirectCashAmount] = useState("");
  const [directCashNote, setDirectCashNote] = useState("");
  const [payingCashBusy, setPayingCashBusy] = useState(false);
  const [currency, setCurrency] = useState("usd");
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [payoutCard, setPayoutCard] = useState<any>(undefined);
  const [settingUpCard, setSettingUpCard] = useState(false);

  const defaultWeek = weekDates();
  const [exportFrom, setExportFrom] = useState(defaultWeek[0]);
  const [exportTo, setExportTo] = useState(defaultWeek[6]);
  const [exporting, setExporting] = useState<string | null>(null);

  const money = (v: any) => formatMoney(v, summary?.currency);

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

  const startPayoutCardSetup = async () => {
    setMessage(null);
    setSettingUpCard(true);
    try {
      const res = await api.post(endpoints.payoutCardSetup(), { success_url: PAYOUT_CARD_RETURN, cancel_url: PAYOUT_CARD_RETURN });
      const result = await WebBrowser.openAuthSessionAsync(res.checkout_url, PAYOUT_CARD_RETURN);
      if (result.type === "success" && result.url) {
        const sessionId = extractQueryParam(result.url, "session_id");
        if (sessionId) {
          await api.post(endpoints.payoutCardConfirm(), { session_id: sessionId });
          setMessage({ type: "success", text: "Payout card saved — future approvals will charge it automatically." });
          await load();
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSettingUpCard(false);
    }
  };

  const saveCurrency = async (value: string) => {
    setCurrency(value);
    setSavingCurrency(true);
    try {
      await api.put(endpoints.organizationSettings(), { currency: value });
      await load();
    } catch (err: any) {
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
      setMessage({ type: res.employees_failed || res.employees_skipped?.length ? "error" : "success", text });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setRunning(false);
    }
  };

  const reject = async (id: number) => {
    setReviewingId(id);
    setMessage(null);
    try {
      await api.post(endpoints.payoutReview(id), { action: "reject" });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  const confirmApprove = async (id: number) => {
    setReviewingId(id);
    setMessage(null);
    try {
      const res = await api.post(endpoints.payoutReview(id), { action: "approve", success_url: PAYOUT_RETURN, cancel_url: PAYOUT_RETURN });
      if (res.checkout_url) {
        const result = await WebBrowser.openAuthSessionAsync(res.checkout_url, PAYOUT_RETURN);
        if (result.type === "success" && result.url) {
          const sessionId = extractQueryParam(result.url, "session_id");
          if (sessionId) {
            await api.post(endpoints.payoutConfirm(), { session_id: sessionId });
            setMessage({ type: "success", text: "Payment confirmed." });
          }
        }
        setConfirmingId(null);
        await load();
        return;
      }
      // Saved card on file — already charged synchronously, no redirect.
      setConfirmingId(null);
      setMessage({ type: "success", text: `Paid ${money(res.total_charge)} from your saved card.` });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  const confirmCash = async (id: number) => {
    setReviewingId(id);
    setMessage(null);
    try {
      await api.post(endpoints.payoutReview(id), { action: "approve", payout_method: "cash", note: cashNote || undefined });
      setCashConfirmingId(null);
      setCashNote("");
      setMessage({ type: "success", text: "Marked as paid in cash — waiting for the employee to confirm they received it." });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setReviewingId(null);
    }
  };

  const openPayCash = (row: any) => {
    setPayingCashEmployee(row);
    setDirectCashAmount(String(row.current_balance));
    setDirectCashNote("");
    setMessage(null);
  };

  const submitPayCash = async () => {
    if (!payingCashEmployee) return;
    setPayingCashBusy(true);
    setMessage(null);
    try {
      await api.post(endpoints.payoutPayCash(payingCashEmployee.employee.id), {
        amount: directCashAmount,
        note: directCashNote || undefined,
      });
      setMessage({ type: "success", text: `Marked as paid in cash — waiting for ${payingCashEmployee.employee.first_name} to confirm.` });
      setPayingCashEmployee(null);
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setPayingCashBusy(false);
    }
  };

  const exportPayroll = async (kind: "csv" | "pdf" | "excel") => {
    setExporting(kind);
    try {
      const params = `?date_from=${exportFrom}&date_to=${exportTo}`;
      const filename = `payroll-report_${exportFrom}_to_${exportTo}`;
      if (kind === "csv") await downloadAndShare(endpoints.payrollExportCsv(params), `${filename}.csv`);
      else if (kind === "pdf") await downloadAndShare(endpoints.payrollExportPdf(params), `${filename}.pdf`);
      else await downloadAndShare(endpoints.payrollExportExcel(params), `${filename}.xlsx`);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setExporting(null);
    }
  };

  if (summary === undefined) {
    return (
      <SafeAreaView style={styles.loadingSafe} edges={[]}>
        <Text style={styles.bodyMuted}>Loading…</Text>
      </SafeAreaView>
    );
  }

  const distinctCurrencies = new Set(summary.employees.map((r: any) => r.currency).filter(Boolean));
  const hasMixedCurrencies = distinctCurrencies.size > 1;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isManager && (
          <View style={styles.currencyRow}>
            <Text style={styles.currencyLabel}>Store currency (used for all wallets & payouts)</Text>
            <InlinePicker
              selectedValue={currency}
              onValueChange={saveCurrency}
              items={CURRENCIES.map((c) => ({ value: c.value, label: c.label }))}
              style={{ opacity: savingCurrency ? 0.6 : 1 }}
            />
          </View>
        )}

        <View style={styles.metricsRow}>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Total payable now</Text>
            <Text style={styles.metricValue}>{money(summary.total_payable)}</Text>
            {hasMixedCurrencies && <Text style={styles.mixedCurrencyNote}>Mixed currencies — total doesn't convert.</Text>}
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.metricLabel}>Pending cash-out requests</Text>
            <Text style={styles.metricValue}>{summary.pending_request_count}</Text>
          </Card>
        </View>

        {isManager ? (
          <Pressable
            onPress={runPayroll}
            disabled={running || Number(summary.total_payable) <= 0}
            style={[styles.runPayrollButton, { opacity: running || Number(summary.total_payable) <= 0 ? 0.6 : 1 }]}
          >
            <Wallet size={15} color={T.paper} />
            <Text style={styles.runPayrollButtonText}>{running ? "Processing…" : "Approve & Pay Payroll"}</Text>
          </Pressable>
        ) : (
          <Text style={styles.bodyMuted}>Only the store Manager can run payroll.</Text>
        )}
        {isManager && (
          <Text style={styles.hintText}>
            This pays everyone's full balance right now, regardless of their own cycle. Each employee's cycle (set in Team)
            decides when they're paid automatically.
          </Text>
        )}

        {isManager && (
          <Card style={styles.card}>
            <View style={styles.iconTitleRow}>
              <CreditCard size={15} color={T.ink} />
              <Text style={styles.cardTitleSmall}>Payout card</Text>
            </View>
            {payoutCard === undefined ? (
              <Text style={styles.bodyMuted}>Loading…</Text>
            ) : payoutCard.saved ? (
              <View style={styles.cardStatusRow}>
                <Text style={styles.cardBrandText}>
                  {payoutCard.brand} •••• {payoutCard.last4}
                </Text>
                <View style={styles.cardBadge}>
                  <Text style={styles.cardBadgeText}>Approvals charge this automatically</Text>
                </View>
                <Pressable onPress={startPayoutCardSetup} disabled={settingUpCard} style={styles.outlineButtonSmall}>
                  <Text style={styles.outlineButtonSmallText}>{settingUpCard ? "Opening…" : "Replace card"}</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={styles.bodyMuted}>
                  Add a card once so approving a cash-out charges it instantly — no redirect each time. Without one, you'll pay
                  through a one-off checkout page per approval.
                </Text>
                <Pressable onPress={startPayoutCardSetup} disabled={settingUpCard} style={styles.navyButtonSmall}>
                  <Text style={styles.navyButtonSmallText}>{settingUpCard ? "Opening…" : "Add a payout card"}</Text>
                </Pressable>
              </View>
            )}
          </Card>
        )}

        {message && (
          <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>{message.text}</Text>
        )}

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Export for accounting</Text>
          <Text style={styles.bodyMuted}>
            Gross pay per employee for a pay period — hours, rate, and total earned. Import the CSV straight into Xero, MYOB,
            or Excel.
          </Text>
          <View style={styles.exportDateRow}>
            <DateField label="From" value={exportFrom} onChange={setExportFrom} />
            <DateField label="To" value={exportTo} onChange={setExportTo} />
          </View>
          <View style={styles.exportButtonRow}>
            <Pressable onPress={() => exportPayroll("csv")} disabled={exporting !== null} style={styles.exportButton}>
              <Download size={14} color={T.navyDeep} />
              <Text style={styles.exportButtonText}>{exporting === "csv" ? "Preparing…" : "CSV"}</Text>
            </Pressable>
            <Pressable onPress={() => exportPayroll("pdf")} disabled={exporting !== null} style={styles.exportButton}>
              <FileText size={14} color={T.navyDeep} />
              <Text style={styles.exportButtonText}>{exporting === "pdf" ? "Preparing…" : "PDF"}</Text>
            </Pressable>
            <Pressable onPress={() => exportPayroll("excel")} disabled={exporting !== null} style={styles.exportButton}>
              <FileSpreadsheet size={14} color={T.navyDeep} />
              <Text style={styles.exportButtonText}>{exporting === "excel" ? "Preparing…" : "Excel"}</Text>
            </Pressable>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Team balances</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              <View style={styles.tableHeaderRow}>
                {["Employee", "Rate", "Cycle", "Next due", "This week", "Balance", "Pending", "Action"].map((h) => (
                  <Text key={h} style={[styles.tableHeaderCell, { width: columnWidths[h] }]}>
                    {h}
                  </Text>
                ))}
              </View>
              {summary.employees.map((row: any) => (
                <View key={row.employee.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: columnWidths.Employee }]}>
                    {row.employee.first_name} {row.employee.last_name}
                  </Text>
                  <Text style={[styles.tableCellMono, { width: columnWidths.Rate }]}>
                    {row.hourly_rate ? `${formatMoney(row.hourly_rate, row.currency)}/h` : "—"}
                  </Text>
                  <Text style={[styles.tableCell, { width: columnWidths.Cycle }]}>{CYCLE_LABEL[row.payout_cycle] || "Weekly"}</Text>
                  <Text style={[styles.tableCellMono, { width: columnWidths["Next due"], color: row.is_payout_due ? T.coral : T.faint }]}>
                    {dueLabel(row)}
                  </Text>
                  <Text style={[styles.tableCellMono, { width: columnWidths["This week"] }]}>{formatMoney(row.this_week_earnings, row.currency)}</Text>
                  <Text style={[styles.tableCellMono, styles.tableCellBold, { width: columnWidths.Balance }]}>{formatMoney(row.current_balance, row.currency)}</Text>
                  <Text style={[styles.tableCellMono, { width: columnWidths.Pending, color: T.amber }]}>
                    {Number(row.pending_payout) > 0 ? formatMoney(row.pending_payout, row.currency) : "—"}
                  </Text>
                  <View style={{ width: columnWidths.Action }}>
                    {Number(row.current_balance) > 0 && (
                      <Pressable onPress={() => openPayCash(row)} style={styles.payCashBtn}>
                        <Banknote size={12} color={T.amber} />
                        <Text style={styles.payCashBtnText}>Pay cash</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </Card>

        {payingCashEmployee && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>
              Pay {payingCashEmployee.employee.first_name} in cash
            </Text>
            <Text style={styles.bodyMuted}>
              Hand them the cash, then confirm below. It won't count as paid until they confirm receiving it in their Wallet.
            </Text>
            <Text style={styles.confirmLabel}>Amount</Text>
            <TextInput
              value={directCashAmount}
              onChangeText={setDirectCashAmount}
              keyboardType="decimal-pad"
              style={[styles.cashNoteInput, { marginBottom: 10 }]}
            />
            <Text style={styles.confirmLabel}>Note (optional)</Text>
            <TextInput value={directCashNote} onChangeText={setDirectCashNote} style={styles.cashNoteInput} />
            <View style={[styles.exportButtonRow, { marginTop: 12 }]}>
              <Pressable onPress={submitPayCash} disabled={payingCashBusy} style={styles.cashPayButton}>
                <Text style={styles.cashPayButtonText}>{payingCashBusy ? "Marking…" : "I've paid this in cash"}</Text>
              </Pressable>
              <Pressable onPress={() => setPayingCashEmployee(null)} disabled={payingCashBusy} style={styles.exportButton}>
                <Text style={styles.exportButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {summary.pending_requests.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Cash-out requests awaiting review</Text>
            {isManager && !summary.payouts_available && (
              <Text style={styles.warningText}>Paying these out requires a paid subscription — not available during the free trial.</Text>
            )}
            {summary.pending_requests.map((t: any, i: number) => {
              const commissionPercent = Number(summary.commission_percent || 0);
              const commissionAmount = Math.round(Number(t.amount) * commissionPercent) / 100;
              const totalCharge = Number(t.amount) + commissionAmount;
              const isConfirming = confirmingId === t.id;
              const isCashConfirming = cashConfirmingId === t.id;
              return (
                <View key={t.id} style={[styles.payoutRow, i > 0 && styles.borderTop]}>
                  <View style={styles.payoutRowTop}>
                    <View style={{ flex: 1, minWidth: 140 }}>
                      <Text style={styles.payoutName}>
                        {t.employee.first_name} {t.employee.last_name}
                      </Text>
                      <Text style={styles.payoutDate}>{new Date(t.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</Text>
                    </View>
                    <Text style={styles.payoutAmount}>{formatMoney(t.amount, t.currency)}</Text>
                    {isManager ? (
                      <View style={styles.payoutActions}>
                        {!isConfirming && !isCashConfirming && (
                          <>
                            <Pressable
                              onPress={() => setConfirmingId(t.id)}
                              disabled={reviewingId === t.id || !summary.payouts_available}
                              style={[styles.approveBtn, { opacity: summary.payouts_available ? 1 : 0.5 }]}
                            >
                              <CheckCircle2 size={14} color={T.tealDeep} />
                              <Text style={styles.approveBtnText}>Pay via Stripe</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => setCashConfirmingId(t.id)}
                              disabled={reviewingId === t.id || !summary.payouts_available}
                              style={[styles.cashBtn, { opacity: summary.payouts_available ? 1 : 0.5 }]}
                            >
                              <Banknote size={14} color={T.amber} />
                              <Text style={styles.cashBtnText}>Cash</Text>
                            </Pressable>
                          </>
                        )}
                        <Pressable onPress={() => reject(t.id)} disabled={reviewingId === t.id} style={styles.rejectBtn}>
                          <XCircle size={14} color={T.coral} />
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <StatusPill status="pending" />
                    )}
                  </View>

                  {isConfirming && (
                    <View style={styles.confirmBox}>
                      <View style={styles.confirmLine}>
                        <Text style={styles.confirmLabel}>{t.employee.first_name} receives</Text>
                        <Text style={styles.confirmValue}>{formatMoney(t.amount, t.currency)}</Text>
                      </View>
                      <View style={styles.confirmLine}>
                        <Text style={styles.confirmLabel}>Platform fee ({commissionPercent}%)</Text>
                        <Text style={styles.confirmValueLight}>{formatMoney(commissionAmount, t.currency)}</Text>
                      </View>
                      <View style={styles.confirmLine}>
                        <Text style={styles.confirmLabelBold}>Charged to your card</Text>
                        <Text style={styles.confirmValueBold}>{formatMoney(totalCharge, t.currency)}</Text>
                      </View>
                      <View style={styles.actionRow}>
                        <Pressable onPress={() => confirmApprove(t.id)} disabled={reviewingId === t.id} style={styles.payNowButton}>
                          <Text style={styles.payNowButtonText}>
                            {reviewingId === t.id ? (payoutCard?.saved ? "Paying…" : "Redirecting…") : payoutCard?.saved ? "Pay now" : "Continue to payment"}
                          </Text>
                        </Pressable>
                        <Pressable onPress={() => setConfirmingId(null)} disabled={reviewingId === t.id} style={styles.cancelButton}>
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {isCashConfirming && (
                    <View style={styles.cashConfirmBox}>
                      <Text style={styles.cashConfirmText}>
                        Hand {t.employee.first_name} {formatMoney(t.amount, t.currency)} in cash, then confirm below. It won't count as paid
                        until {t.employee.first_name} confirms receiving it in their Wallet.
                      </Text>
                      <TextInput
                        placeholder="Note (optional)"
                        value={cashNote}
                        onChangeText={setCashNote}
                        style={styles.cashNoteInput}
                        placeholderTextColor={T.faint}
                      />
                      <View style={styles.actionRow}>
                        <Pressable onPress={() => confirmCash(t.id)} disabled={reviewingId === t.id} style={styles.cashPayButton}>
                          <Text style={styles.cashPayButtonText}>{reviewingId === t.id ? "Marking…" : "I've paid this in cash"}</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => { setCashConfirmingId(null); setCashNote(""); }}
                          disabled={reviewingId === t.id}
                          style={styles.cancelButton}
                        >
                          <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </Card>
        )}

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <ListChecks size={16} color={T.ink} />
            <Text style={styles.cardTitle}>Recent transactions</Text>
          </View>
          {transactions.length === 0 && <Text style={styles.bodyMuted}>No transactions yet.</Text>}
          {transactions.map((t, i) => (
            <View key={t.id} style={[styles.txRow, i > 0 && styles.borderTop]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.txName}>
                  {t.employee.first_name} {t.employee.last_name} — {t.type === "earning" ? "earned" : "payout"}
                </Text>
                <Text style={styles.txId}>{t.transaction_id}</Text>
              </View>
              <Text style={[styles.txAmount, { color: t.type === "earning" ? T.teal : T.ink }]}>
                {t.type === "earning" ? "+" : "-"}
                {formatMoney(t.amount, t.currency)}
              </Text>
              <StatusPill status={t.status} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const columnWidths: Record<string, number> = {
  Employee: 150,
  Rate: 90,
  Cycle: 100,
  "Next due": 110,
  "This week": 90,
  Balance: 90,
  Pending: 90,
  Action: 100,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  loadingSafe: { flex: 1, backgroundColor: T.paper, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 14 },
  card: { padding: 20 },
  cardTitle: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink, marginBottom: 12 },
  cardTitleSmall: { fontFamily: fonts.display.semibold, fontSize: 14.5, color: T.ink },
  iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  bodyMuted: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 8 },
  hintText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted },
  warningText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.amber, marginBottom: 14 },
  currencyRow: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  currencyLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, padding: 16 },
  metricLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, marginBottom: 6 },
  metricValue: { fontFamily: fonts.display.semibold, fontSize: 22, color: T.ink },
  mixedCurrencyNote: { fontFamily: fonts.body.regular, fontSize: 10.5, color: T.faint, marginTop: 4 },
  runPayrollButton: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", backgroundColor: T.teal, borderRadius: 9, paddingVertical: 11 },
  runPayrollButtonText: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.paper },
  cardStatusRow: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  cardBrandText: { fontFamily: fonts.mono.regular, fontSize: 13, color: T.ink, textTransform: "capitalize" },
  cardBadge: { backgroundColor: T.tealBg, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  cardBadgeText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.tealDeep },
  outlineButtonSmall: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  outlineButtonSmallText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink },
  navyButtonSmall: { alignSelf: "flex-start", paddingVertical: 9, paddingHorizontal: 16, borderRadius: 9, backgroundColor: T.navy },
  navyButtonSmallText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  messageText: { fontFamily: fonts.body.regular, fontSize: 13, textAlign: "center" },
  exportDateRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  exportButtonRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  exportButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, backgroundColor: T.navyBg },
  exportButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.navyDeep },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  tableHeaderCell: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line2 },
  tableCell: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink },
  tableCellMono: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.muted },
  tableCellBold: { fontFamily: fonts.mono.regular, fontWeight: "600" as any, fontSize: 13, color: T.ink },
  borderTop: { borderTopWidth: 1, borderTopColor: T.line2 },
  payoutRow: { paddingVertical: 12 },
  payoutRowTop: { flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap" },
  payoutName: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
  payoutDate: { fontFamily: fonts.mono.regular, fontSize: 11, color: T.faint },
  payoutAmount: { fontFamily: fonts.mono.regular, fontSize: 14, fontWeight: "600" as any, color: T.ink },
  payoutActions: { flexDirection: "row", gap: 8 },
  approveBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: T.tealBg },
  approveBtnText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.tealDeep },
  cashBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: T.amberBg },
  cashBtnText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.amber },
  rejectBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: T.coralBg },
  rejectBtnText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.coral },
  confirmBox: { marginTop: 10, padding: 14, borderRadius: 9, backgroundColor: T.navyBg },
  confirmLine: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  confirmLabel: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.navyDeep },
  confirmLabelBold: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.navyDeep, fontWeight: "700" as any },
  confirmValue: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.navyDeep, fontWeight: "600" as any },
  confirmValueLight: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.navyDeep },
  confirmValueBold: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.navyDeep, fontWeight: "700" as any },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  payNowButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.teal },
  payNowButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  cancelButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.muted },
  cashConfirmBox: { marginTop: 10, padding: 14, borderRadius: 9, backgroundColor: T.amberBg },
  cashConfirmText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, lineHeight: 18, marginBottom: 10 },
  cashNoteInput: { borderWidth: 1, borderColor: T.line, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 10, fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, backgroundColor: T.card },
  cashPayButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.amber },
  cashPayButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  payCashBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 7, backgroundColor: T.amberBg, alignSelf: "flex-start" },
  payCashBtnText: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.amber },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11 },
  txName: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink },
  txId: { fontFamily: fonts.mono.regular, fontSize: 10.5, color: T.faint },
  txAmount: { fontFamily: fonts.mono.regular, fontSize: 13, fontWeight: "600" as any },
});
