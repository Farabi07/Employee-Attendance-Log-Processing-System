import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Linking, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, X, Clock3, Paperclip, Repeat, CalendarCheck, CheckCircle2 } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme, Colors } from "../../lib/ThemeContext";
import { api, BASE_URL } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatMoney } from "../../lib/currency";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import IconChip from "../../components/IconChip";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

// Ported from frontend/src/pages/manager/Approvals.jsx.
function initialsOf(emp: any) {
  if (!emp) return "?";
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

const KIND_LABEL: Record<string, string> = { overtime: "Overtime", shortfall: "Shortfall" };

// Shared by PayAdjustmentRow and the default-exported Approvals — see
// Wallet.tsx's makeStyles for why this is a factory rather than a
// module-scope StyleSheet.create.
function makeStyles(T: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.paper },
    scrollContent: { padding: 16, gap: 16 },
    card: { padding: 20 },
    cardTitle: { fontFamily: fonts.display.semibold, fontSize: 16, color: T.ink },
    cardSubtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 16 },
    iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    rowCard: { borderWidth: 1, borderColor: T.line, borderRadius: 12, padding: 16 },
    rowTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
    nameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 },
    name: { fontFamily: fonts.body.semibold, fontSize: 14, color: T.ink },
    leaveTypeText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
    meta: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.muted, marginBottom: 6 },
    reasonText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, lineHeight: 18 },
    note: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, marginBottom: 6, lineHeight: 18 },
    attachRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 6 },
    attachText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.navyDeep },
    badge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 999 },
    badgeText: { fontFamily: fonts.body.semibold, fontSize: 11 },
    decideButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.tealBg },
    decideButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.tealDeep },
    leaveActions: { flexDirection: "row", gap: 8 },
    rejectButton: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: T.line, alignItems: "center", justifyContent: "center" },
    approveButton: { width: 34, height: 34, borderRadius: 9, backgroundColor: T.teal, alignItems: "center", justifyContent: "center" },
    expandedBox: { marginTop: 12, padding: 14, borderRadius: 9, backgroundColor: T.line2 },
    grantLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted, marginBottom: 6 },
    grantRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 10 },
    grantInput: {
      width: 100,
      paddingVertical: 7,
      paddingHorizontal: 9,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: T.line,
      fontFamily: fonts.mono.regular,
      fontSize: 12.5,
      color: T.ink,
      backgroundColor: T.card,
    },
    quickButton: { paddingVertical: 7, paddingHorizontal: 11, borderRadius: 7, borderWidth: 1, borderColor: T.line, backgroundColor: T.card },
    quickButtonText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink },
    noteInput: {
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
    errorText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.coral, marginBottom: 8 },
    actionRow: { flexDirection: "row", gap: 8 },
    sendButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.teal },
    sendButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.onAccent },
    cancelButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: T.line, backgroundColor: T.card },
    cancelButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.muted },
  });
}

function PayAdjustmentRow({ request: r, onDecided }: { request: any; onDecided: () => void }) {
  const toast = useToast();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [open, setOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState(String(r.requested_amount));
  const [managerNote, setManagerNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      await api.post(endpoints.payAdjustmentReview(r.id), {
        granted_amount: grantAmount,
        manager_note: managerNote || undefined,
      });
      toast.show("Decision sent.");
      onDecided();
    } catch (err: any) {
      setError(err.message);
      toast.show(err.message, "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTop}>
        <Avatar initials={initialsOf(r.employee)} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>
              {r.employee?.first_name} {r.employee?.last_name}
            </Text>
            <View style={[styles.badge, { backgroundColor: r.kind === "overtime" ? T.tealBg : T.amberBg }]}>
              <Text style={[styles.badgeText, { color: r.kind === "overtime" ? T.tealDeep : T.amber }]}>{KIND_LABEL[r.kind]}</Text>
            </View>
          </View>
          <Text style={styles.meta}>
            {r.attendance_date} · {r.hours}h · requesting {formatMoney(r.requested_amount, r.currency)}
          </Text>
          {!!r.note && <Text style={styles.note}>"{r.note}"</Text>}
          {!!r.attachment && (
            <Pressable onPress={() => Linking.openURL(`${BASE_URL}${r.attachment}`)} style={styles.attachRow}>
              <Paperclip size={12} color={T.navyDeep} />
              <Text style={styles.attachText}>View attachment</Text>
            </Pressable>
          )}
        </View>
        {!open && (
          <Pressable onPress={() => setOpen(true)} style={styles.decideButton}>
            <Text style={styles.decideButtonText}>Decide</Text>
          </Pressable>
        )}
      </View>

      {open && (
        <View style={styles.expandedBox}>
          <Text style={styles.grantLabel}>Grant amount</Text>
          <View style={styles.grantRow}>
            <TextInput value={grantAmount} onChangeText={setGrantAmount} keyboardType="decimal-pad" style={styles.grantInput} />
            {[
              { label: "Full", value: String(r.requested_amount) },
              { label: "Half", value: (Number(r.requested_amount) / 2).toFixed(2) },
              { label: "None", value: "0" },
            ].map((opt) => (
              <Pressable key={opt.label} onPress={() => setGrantAmount(opt.value)} style={styles.quickButton}>
                <Text style={styles.quickButtonText}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            placeholder="Note to the employee (optional)"
            placeholderTextColor={T.faint}
            value={managerNote}
            onChangeText={setManagerNote}
            multiline
            numberOfLines={2}
            style={styles.noteInput}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
          <View style={styles.actionRow}>
            <Pressable onPress={send} disabled={sending} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>{sending ? "Sending…" : "Send decision"}</Text>
            </Pressable>
            <Pressable onPress={() => setOpen(false)} disabled={sending} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function Approvals() {
  const toast = useToast();
  const T = useTheme();
  const styles = useMemo(() => makeStyles(T), [T]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<number | null>(null);
  const [payAdjustments, setPayAdjustments] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(true);
  const [swapRequests, setSwapRequests] = useState<any[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState(true);
  const [decidingSwapId, setDecidingSwapId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await api.get(endpoints.leaveRequestAll("?status=pending&size=100"));
    setRequests(res.leave_requests || []);
  }, []);

  const loadAdjustments = useCallback(async () => {
    const res = await api.get(endpoints.payAdjustmentAll("?status=pending"));
    setPayAdjustments(res.requests || []);
  }, []);

  const loadSwaps = useCallback(async () => {
    const res = await api.get(endpoints.shiftSwapAll());
    setSwapRequests(res.pending || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
    loadAdjustments().finally(() => setLoadingAdjustments(false));
    loadSwaps().finally(() => setLoadingSwaps(false));
  }, [load, loadAdjustments, loadSwaps]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadAdjustments(), loadSwaps()]);
    } finally {
      setRefreshing(false);
    }
  };

  const decide = async (id: number, status: string) => {
    setDecidingId(id);
    try {
      await api.post(endpoints.leaveRequestReview(id), { status });
      toast.show(status === "approved" ? "Leave approved." : "Leave rejected.");
      await load();
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setDecidingId(null);
    }
  };

  const decideSwap = async (id: number, action: "approve" | "reject") => {
    setDecidingSwapId(id);
    try {
      await api.post(endpoints.shiftSwapReview(id), { action });
      toast.show(action === "approve" ? "Shift swap approved." : "Shift swap rejected.");
      await loadSwaps();
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setDecidingSwapId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} colors={[T.teal]} />}
      >
        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <IconChip bg={T.tealBg}>
              <CalendarCheck size={14} color={T.tealDeep} />
            </IconChip>
            <Text style={styles.cardTitle}>Leave approvals</Text>
          </View>
          <Text style={styles.cardSubtitle}>{loading ? "Loading…" : `${requests.length} awaiting your review`}</Text>
          {loading && (
            <View style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Skeleton width={38} height={38} radius={19} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width="45%" height={12} radius={4} />
                      <Skeleton width="65%" height={10} radius={4} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {!loading && requests.length === 0 && (
            <EmptyState icon={CheckCircle2} title="All caught up" subtitle="Nothing pending — no leave requests waiting on you." />
          )}
          <View style={{ gap: 12 }}>
            {requests.map((r) => (
              <View key={r.id} style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <Avatar initials={initialsOf(r.employee)} size={38} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>
                        {r.employee?.first_name} {r.employee?.last_name}
                      </Text>
                      <Text style={styles.leaveTypeText}>· {r.leave_type?.name || "Leave"}</Text>
                    </View>
                    <Text style={styles.meta}>
                      {r.start_date} – {r.end_date}
                    </Text>
                    {!!r.reason && <Text style={styles.reasonText}>{r.reason}</Text>}
                    {!!r.attachment && (
                      <Pressable onPress={() => Linking.openURL(`${BASE_URL}${r.attachment}`)} style={styles.attachRow}>
                        <Paperclip size={12} color={T.navyDeep} />
                        <Text style={styles.attachText}>View attachment</Text>
                      </Pressable>
                    )}
                  </View>
                  <View style={styles.leaveActions}>
                    <Pressable onPress={() => decide(r.id, "rejected")} disabled={decidingId === r.id} style={styles.rejectButton}>
                      <X size={16} color={T.coral} />
                    </Pressable>
                    <Pressable onPress={() => decide(r.id, "approved")} disabled={decidingId === r.id} style={styles.approveButton}>
                      <Check size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <IconChip bg={T.tealBg}>
              <Clock3 size={14} color={T.tealDeep} />
            </IconChip>
            <Text style={styles.cardTitle}>Pay adjustment requests</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            {loadingAdjustments ? "Loading…" : `${payAdjustments.length} awaiting your review`} — overtime or shortfall
            claims.
          </Text>
          {loadingAdjustments && (
            <View style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Skeleton width={38} height={38} radius={19} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width="45%" height={12} radius={4} />
                      <Skeleton width="65%" height={10} radius={4} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {!loadingAdjustments && payAdjustments.length === 0 && (
            <EmptyState icon={CheckCircle2} title="All caught up" subtitle="Nothing pending here either." />
          )}
          <View style={{ gap: 12 }}>
            {payAdjustments.map((r) => (
              <PayAdjustmentRow key={r.id} request={r} onDecided={loadAdjustments} />
            ))}
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <IconChip bg={T.tealBg}>
              <Repeat size={14} color={T.tealDeep} />
            </IconChip>
            <Text style={styles.cardTitle}>Shift swap approvals</Text>
          </View>
          <Text style={styles.cardSubtitle}>
            {loadingSwaps ? "Loading…" : `${swapRequests.length} awaiting your review`} — a colleague already agreed; this
            finalizes it.
          </Text>
          {loadingSwaps && (
            <View style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Skeleton width={38} height={38} radius={19} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Skeleton width="45%" height={12} radius={4} />
                      <Skeleton width="65%" height={10} radius={4} />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {!loadingSwaps && swapRequests.length === 0 && (
            <EmptyState icon={CheckCircle2} title="All caught up" subtitle="Nothing pending here either." />
          )}
          <View style={{ gap: 12 }}>
            {swapRequests.map((s) => (
              <View key={s.id} style={styles.rowCard}>
                <View style={styles.rowTop}>
                  <Avatar initials={initialsOf(s.requested_by)} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>
                      {s.requested_by?.first_name} {s.requested_by?.last_name} → {s.claimed_by?.first_name} {s.claimed_by?.last_name}
                    </Text>
                    <Text style={styles.meta}>
                      {s.roster?.shift?.name || "Shift"} · {s.roster?.date}
                    </Text>
                    {!!s.reason && <Text style={styles.reasonText}>"{s.reason}"</Text>}
                  </View>
                  <View style={styles.leaveActions}>
                    <Pressable onPress={() => decideSwap(s.id, "reject")} disabled={decidingSwapId === s.id} style={styles.rejectButton}>
                      <X size={16} color={T.coral} />
                    </Pressable>
                    <Pressable onPress={() => decideSwap(s.id, "approve")} disabled={decidingSwapId === s.id} style={styles.approveButton}>
                      <Check size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
