import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as DocumentPicker from "expo-document-picker";
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  Clock3,
  History,
  Landmark,
  CheckCircle2,
  Paperclip,
} from "lucide-react-native";
import { T, fonts } from "../../theme";
import { api, BASE_URL } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { formatMoney, currencySymbol } from "../../lib/currency";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import { PrimaryButton } from "../../components/Button";

// Ported from frontend/src/pages/employee/Wallet.jsx. The web version's
// side-by-side grid becomes one scrollable column. Stripe Connect
// onboarding uses expo-web-browser's openAuthSessionAsync (opens the same
// hosted Stripe URL the web app gets, but in an in-app browser session
// that resolves back to our own custom scheme instead of a same-origin
// query-param return) instead of window.location.href — see wallet_views.py's
// connectOnboard, which now accepts an optional return_url override for
// exactly this.
const CYCLE_LABEL: Record<string, string> = { hourly: "hourly", weekly: "weekly", biweekly: "every 2 weeks", monthly: "monthly" };
const KIND_LABEL: Record<string, string> = { overtime: "Overtime", shortfall: "Shortfall" };
const CONNECT_RETURN_URL = "timetap://wallet/connect/success";

function KindBadge({ kind }: { kind: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: kind === "overtime" ? T.tealBg : T.amberBg }]}>
      <Text style={[styles.badgeText, { color: kind === "overtime" ? T.tealDeep : T.amber }]}>{KIND_LABEL[kind]}</Text>
    </View>
  );
}

function EligibleClaimRow({
  item,
  currency,
  onSubmitted,
}: {
  item: any;
  currency: string;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) setAttachment(result.assets[0]);
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("attendance", String(item.attendance_id));
      form.append("kind", item.kind);
      if (note) form.append("note", note);
      if (attachment) {
        form.append("attachment", {
          uri: attachment.uri,
          name: attachment.name,
          type: attachment.mimeType || "application/octet-stream",
        } as any);
      }
      await api.post(endpoints.payAdjustmentRequest(), form);
      onSubmitted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <KindBadge kind={item.kind} />
        <Text style={styles.rowMeta} numberOfLines={1}>
          {item.date} · {item.hours}h{item.amount != null ? ` · ${formatMoney(item.amount, currency)}` : ""}
        </Text>
        {item.has_pending_request ? (
          <StatusPill status="pending" />
        ) : (
          !open && (
            <Pressable onPress={() => setOpen(true)} style={styles.smallDarkButton}>
              <Text style={styles.smallDarkButtonText}>Request</Text>
            </Pressable>
          )
        )}
      </View>

      {open && (
        <View style={styles.expandedBox}>
          <TextInput
            placeholder="Why this happened (optional)"
            placeholderTextColor={T.faint}
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={2}
            style={styles.claimTextarea}
          />
          <Pressable onPress={pickAttachment} style={styles.attachRow}>
            <Paperclip size={13} color={T.muted} />
            <Text style={styles.attachText} numberOfLines={1}>
              {attachment ? attachment.name : "Attach a document (optional)"}
            </Text>
          </Pressable>
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.actionRow}>
            <Pressable onPress={submit} disabled={submitting} style={styles.tealButton}>
              <Text style={styles.tealButtonText}>{submitting ? "Sending…" : "Send request"}</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)} disabled={submitting} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function MyAdjustmentRow({ request: r, onAccepted }: { request: any; onAccepted: () => void }) {
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await api.post(endpoints.payAdjustmentAccept(r.id));
      onAccepted();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <KindBadge kind={r.kind} />
        <Text style={styles.rowMeta} numberOfLines={2}>
          {r.attendance_date} · {r.hours}h · requested {formatMoney(r.requested_amount, r.currency)}
          {r.status !== "pending" && r.granted_amount != null && ` · granted ${formatMoney(r.granted_amount, r.currency)}`}
        </Text>
        <StatusPill status={r.status} />
      </View>
      {r.status === "reviewed" && (
        <Pressable onPress={accept} disabled={accepting} style={[styles.smallDarkButton, styles.acceptButton]}>
          <Text style={styles.smallDarkButtonText}>{accepting ? "Accepting…" : "Accept"}</Text>
        </Pressable>
      )}
      {!!r.note && <Text style={styles.quotedNote}>"{r.note}"</Text>}
      {!!r.manager_note && <Text style={styles.managerNote}>Manager: "{r.manager_note}"</Text>}
      {!!r.attachment && (
        <Pressable onPress={() => Linking.openURL(`${BASE_URL}${r.attachment}`)} style={styles.attachRow}>
          <Paperclip size={12} color={T.navyDeep} />
          <Text style={styles.attachLinkText}>View attachment</Text>
        </Pressable>
      )}
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

export default function Wallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(undefined);
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [eligibleAdjustments, setEligibleAdjustments] = useState<any[]>([]);
  const [myAdjustments, setMyAdjustments] = useState<any[]>([]);
  const [confirmingCashId, setConfirmingCashId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [res, historyRes] = await Promise.all([api.get(endpoints.walletMe()), api.get(endpoints.rateHistory(user!.id))]);
    setWallet(res);
    setRateHistory(historyRes.history || []);
  }, [user!.id]);

  const loadAdjustments = useCallback(async () => {
    const [eligibleRes, mineRes] = await Promise.all([
      api.get(endpoints.payAdjustmentEligible()),
      api.get(endpoints.payAdjustmentMine()),
    ]);
    setEligibleAdjustments(eligibleRes.eligible || []);
    setMyAdjustments(mineRes.requests || []);
  }, []);

  useEffect(() => {
    load();
    loadAdjustments();
  }, [load, loadAdjustments]);

  const refreshAdjustments = async () => {
    await Promise.all([loadAdjustments(), load()]);
  };

  const handleRequest = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.walletPayoutRequest(), { amount });
      setMessage({ type: "success", text: "Payout requested — your manager will settle it." });
      setAmount("");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmCashReceived = async (id: number) => {
    setConfirmingCashId(id);
    setMessage(null);
    try {
      await api.post(endpoints.payoutConfirmCash(id));
      setMessage({ type: "success", text: "Confirmed — thanks!" });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setConfirmingCashId(null);
    }
  };

  const startOnboarding = async () => {
    setMessage(null);
    setConnecting(true);
    try {
      const res = await api.post(endpoints.connectOnboard(), { return_url: CONNECT_RETURN_URL });
      await WebBrowser.openAuthSessionAsync(res.url, CONNECT_RETURN_URL);
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setConnecting(false);
    }
  };

  if (wallet === undefined) {
    return (
      <SafeAreaView style={styles.loadingSafe} edges={[]}>
        <ActivityIndicator color={T.navy} />
      </SafeAreaView>
    );
  }

  const money = (v: any) => formatMoney(v, wallet.currency);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={[styles.card, styles.balanceCard]}>
          <View style={styles.balanceHeader}>
            <WalletIcon size={16} color={T.paper} strokeWidth={1.8} />
            <Text style={styles.balanceLabel}>Current balance</Text>
          </View>
          <Text style={styles.balanceValue}>{money(wallet.current_balance)}</Text>
          {!!wallet.hourly_rate && (
            <Text style={styles.balanceSub}>
              {currencySymbol(wallet.currency)}
              {Number(wallet.hourly_rate).toFixed(2)}/hour · paid {CYCLE_LABEL[wallet.payout_cycle] || "weekly"}
              {wallet.next_payout_due_at &&
                ` · next payout ${new Date(wallet.next_payout_due_at).toLocaleDateString([], { month: "short", day: "numeric" })}`}
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconLabelRow}>
            <Clock3 size={14} color={T.amber} />
            <Text style={styles.mutedLabel}>Pending / processing</Text>
          </View>
          <Text style={styles.midValue}>{money(wallet.pending_payout)}</Text>
          <View style={styles.dividedBlock}>
            <Text style={styles.mutedLabel}>This week's earnings</Text>
            <Text style={styles.midValue}>{money(wallet.this_week_earnings)}</Text>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <Landmark size={15} color={T.ink} />
            <Text style={styles.cardTitle}>Payout method</Text>
          </View>
          {wallet.payouts_enabled ? (
            <>
              <View style={styles.iconLabelRow}>
                <CheckCircle2 size={14} color={T.tealDeep} />
                <Text style={styles.readyText}>Ready to receive payouts</Text>
              </View>
              <Pressable onPress={startOnboarding} disabled={connecting} style={styles.outlineButton}>
                <Text style={styles.outlineButtonText}>{connecting ? "Opening…" : "Add another bank or card"}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.bodyMuted}>
                {wallet.payout_method_connected
                  ? "Almost there — finish verifying your details with Stripe to start receiving payouts."
                  : "Add a bank account or card so your payouts can actually reach you."}
              </Text>
              <Pressable onPress={startOnboarding} disabled={connecting} style={styles.navyButton}>
                <Text style={styles.navyButtonText}>
                  {connecting ? "Opening…" : wallet.payout_method_connected ? "Finish setup" : "Connect a bank account or card"}
                </Text>
              </Pressable>
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <ArrowDownToLine size={15} color={T.ink} />
            <Text style={styles.cardTitle}>Request payout</Text>
          </View>
          {!wallet.payouts_available ? (
            <Text style={styles.bodyMuted}>Cash-out requests open up once your employer subscribes — currently on a free trial.</Text>
          ) : (
            <>
              <Text style={styles.bodyMuted}>
                Need cash before payday? Request a cash-out — your manager reviews it and pays you, via Stripe or in person.
                {!wallet.payouts_enabled && " (You don't need a bank account connected if your manager pays in cash.)"}
              </Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder={`Up to ${money(wallet.current_balance)}`}
                placeholderTextColor={T.faint}
                keyboardType="decimal-pad"
                editable={Number(wallet.current_balance) > 0}
                style={styles.amountInput}
              />
              <PrimaryButton
                title={submitting ? "Requesting…" : "Request payout"}
                onPress={handleRequest}
                loading={submitting}
                disabled={Number(wallet.current_balance) <= 0}
              />
            </>
          )}
          {message && (
            <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>{message.text}</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Earnings & payout history</Text>
          {wallet.history.length === 0 && <Text style={styles.bodyMuted}>Nothing here yet — check in to start earning.</Text>}
          {wallet.history.map((t: any, i: number) => (
            <View key={t.id} style={[styles.historyRow, i > 0 && styles.borderTop]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>
                  {t.type === "earning" ? "Earned" : t.payout_method === "cash" ? "Payout — cash" : "Payout"}
                  {t.note ? ` — ${t.note}` : ""}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(t.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                </Text>
              </View>
              <Text style={[styles.historyAmount, { color: t.type === "earning" ? T.teal : T.ink }]}>
                {t.type === "earning" ? "+" : "-"}
                {money(t.amount)}
              </Text>
              <StatusPill status={t.status} />
              {t.status === "awaiting_confirmation" && (
                <Pressable
                  onPress={() => confirmCashReceived(t.id)}
                  disabled={confirmingCashId === t.id}
                  style={styles.confirmCashButton}
                >
                  <Text style={styles.confirmCashButtonText}>{confirmingCashId === t.id ? "Confirming…" : "I received this"}</Text>
                </Pressable>
              )}
            </View>
          ))}
        </Card>

        {(eligibleAdjustments.length > 0 || myAdjustments.length > 0) && (
          <Card style={styles.card}>
            <View style={styles.iconTitleRow}>
              <Clock3 size={15} color={T.ink} />
              <Text style={styles.cardTitle}>Overtime & shortfall claims</Text>
            </View>
            <Text style={styles.bodyMuted}>Days you worked more or less than your shift sit here until you ask for them to be considered.</Text>

            {eligibleAdjustments.length > 0 && (
              <View style={styles.rowGroup}>
                {eligibleAdjustments.map((item) => (
                  <EligibleClaimRow
                    key={`${item.attendance_id}-${item.kind}`}
                    item={item}
                    currency={wallet.currency}
                    onSubmitted={refreshAdjustments}
                  />
                ))}
              </View>
            )}

            {myAdjustments.length > 0 && (
              <>
                <Text style={styles.subHeading}>Your requests</Text>
                <View style={styles.rowGroup}>
                  {myAdjustments.map((r) => (
                    <MyAdjustmentRow key={r.id} request={r} onAccepted={refreshAdjustments} />
                  ))}
                </View>
              </>
            )}
          </Card>
        )}

        {rateHistory.length > 0 && (
          <Card style={styles.card}>
            <View style={styles.iconTitleRow}>
              <History size={15} color={T.ink} />
              <Text style={styles.cardTitle}>Pay history</Text>
            </View>
            {rateHistory.map((h, i) => (
              <View key={h.id} style={[styles.rateHistoryRow, i > 0 && styles.borderTop]}>
                <Text style={styles.rateHistoryDate}>
                  {new Date(h.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                </Text>
                <Text style={styles.rateHistoryText}>
                  {h.old_hourly_rate ? `${formatMoney(h.old_hourly_rate, h.old_currency)} → ` : "Set to "}
                  <Text style={{ fontFamily: fonts.body.semibold }}>{formatMoney(h.new_hourly_rate, h.new_currency)}/h</Text>
                  {h.changed_by && ` by ${h.changed_by.first_name} ${h.changed_by.last_name}`}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  loadingSafe: { flex: 1, backgroundColor: T.paper, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 20 },
  balanceCard: { backgroundColor: T.ink },
  balanceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  balanceLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: "rgba(245,246,242,0.7)" },
  balanceValue: { fontFamily: fonts.display.semibold, fontSize: 34, color: T.paper },
  balanceSub: { fontFamily: fonts.mono.regular, fontSize: 11.5, color: "rgba(245,246,242,0.55)", marginTop: 8 },
  iconLabelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  mutedLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted },
  midValue: { fontFamily: fonts.display.semibold, fontSize: 20, color: T.ink, marginBottom: 12 },
  dividedBlock: { borderTopWidth: 1, borderTopColor: T.line2, paddingTop: 12 },
  iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  cardTitle: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.ink },
  readyText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.tealDeep },
  bodyMuted: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 14 },
  outlineButton: { width: "100%", paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: T.line, alignItems: "center" },
  outlineButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.ink },
  navyButton: { width: "100%", paddingVertical: 10, borderRadius: 9, backgroundColor: T.navy, alignItems: "center" },
  navyButtonText: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.paper },
  amountInput: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 13.5,
    color: T.ink,
    marginBottom: 10,
  },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12, marginTop: 10, textAlign: "center" },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, flexWrap: "wrap" },
  confirmCashButton: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, backgroundColor: T.teal },
  confirmCashButtonText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.paper },
  borderTop: { borderTopWidth: 1, borderTopColor: T.line2 },
  historyTitle: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
  historyDate: { fontFamily: fonts.mono.regular, fontSize: 11, color: T.faint },
  historyAmount: { fontFamily: fonts.mono.regular, fontSize: 13.5, fontWeight: "600" as any },
  rowGroup: { gap: 10 },
  subHeading: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.muted, marginTop: 18, marginBottom: 10 },
  rateHistoryRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  rateHistoryDate: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.faint, width: 110 },
  rateHistoryText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, flex: 1 },

  rowCard: { borderWidth: 1, borderColor: T.line, borderRadius: 12, padding: 14 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  rowMeta: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.muted, flex: 1, minWidth: 100 },
  badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontFamily: fonts.body.semibold, fontSize: 11 },
  smallDarkButton: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 8, backgroundColor: T.ink },
  smallDarkButtonText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.paper },
  acceptButton: { backgroundColor: T.teal, marginTop: 10, alignSelf: "flex-start" },
  expandedBox: { marginTop: 12, padding: 14, borderRadius: 9, backgroundColor: T.line2 },
  claimTextarea: {
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 7,
    padding: 8,
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    color: T.ink,
    minHeight: 60,
    textAlignVertical: "top",
    marginBottom: 10,
    backgroundColor: T.card,
  },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  attachText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, flexShrink: 1 },
  attachLinkText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.navyDeep },
  actionRow: { flexDirection: "row", gap: 8 },
  tealButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.teal },
  tealButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  ghostButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  ghostButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.muted },
  quotedNote: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, marginTop: 8, lineHeight: 18 },
  managerNote: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginTop: 6, lineHeight: 18 },
  errorText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.coral, marginTop: 8 },
});
