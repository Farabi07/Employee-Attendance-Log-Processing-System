import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, Switch, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { Repeat, Check, X, CalendarClock } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { weekDates, formatDayLabel, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import TimeField from "../../components/TimeField";

// Ported from frontend/src/pages/employee/Shifts.jsx. The web version's
// 7-column CSS grid becomes a horizontal ScrollView — a phone screen never
// has room for 7 columns at once, so this is always the "narrow" case.
const SWAP_STATUS_LABEL: Record<string, string> = {
  pending_peer: "pending",
  pending_manager: "pending",
  approved: "approved",
  rejected: "rejected",
  cancelled: "rejected",
};

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function defaultWeek() {
  return DAY_LABELS.map((_, i) => ({ day_of_week: i, is_available: true, start_time: "", end_time: "" }));
}

function SwapRow({ swap, right }: { swap: any; right: React.ReactNode }) {
  return (
    <View style={styles.swapRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.swapTitle}>
          {swap.roster?.shift?.name || "Shift"} · {swap.roster?.date}
        </Text>
        <Text style={styles.swapMeta} numberOfLines={2}>
          {swap.requested_by?.first_name} {swap.requested_by?.last_name}
          {swap.proposed_to ? ` → ${swap.proposed_to.first_name} ${swap.proposed_to.last_name}` : " · open to anyone"}
          {swap.reason ? ` — "${swap.reason}"` : ""}
        </Text>
      </View>
      {right}
    </View>
  );
}

export default function Shifts() {
  const { user } = useAuth();
  const [rosters, setRosters] = useState<any[]>([]);
  const [teammates, setTeammates] = useState<any[]>([]);
  const [swaps, setSwaps] = useState<{ outgoing: any[]; incoming: any[]; open: any[] }>({ outgoing: [], incoming: [], open: [] });
  const [loading, setLoading] = useState(true);
  const [openSwapDate, setOpenSwapDate] = useState<string | null>(null);
  const [proposedTo, setProposedTo] = useState("");
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [availability, setAvailability] = useState(defaultWeek());
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [rosterRes, teammateRes, swapRes, availabilityRes] = await Promise.all([
      api.get(endpoints.rosterByEmployee(user!.id, "?size=100")),
      api.get(endpoints.teammatesAll()),
      api.get(endpoints.shiftSwapMine()),
      api.get(endpoints.availabilityMine()),
    ]);
    setRosters(rosterRes.rosters || []);
    setTeammates(teammateRes.employees || []);
    setSwaps({ outgoing: swapRes.outgoing || [], incoming: swapRes.incoming || [], open: swapRes.open || [] });

    const byDay: Record<number, any> = {};
    for (const row of availabilityRes.availability || []) byDay[row.day_of_week] = row;
    setAvailability(
      defaultWeek().map((d) => {
        const saved = byDay[d.day_of_week];
        return saved
          ? { day_of_week: d.day_of_week, is_available: saved.is_available, start_time: saved.start_time || "", end_time: saved.end_time || "" }
          : d;
      })
    );
  }, [user!.id]);

  const updateAvailabilityDay = (dayOfWeek: number, patch: Partial<{ is_available: boolean; start_time: string; end_time: string }>) => {
    setAvailability((week) => week.map((d) => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const saveAvailability = async () => {
    setSavingAvailability(true);
    setAvailabilityMessage(null);
    try {
      await api.put(endpoints.availabilityMineUpdate(), { days: availability });
      setAvailabilityMessage({ type: "success", text: "Availability saved." });
    } catch (err: any) {
      setAvailabilityMessage({ type: "error", text: err.message });
    } finally {
      setSavingAvailability(false);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const days = weekDates();
  const byDate = Object.fromEntries(rosters.map((r) => [r.date, r]));
  const today = todayISO();

  const requestSwap = async (roster: any) => {
    setMessage(null);
    setBusyId(roster.id);
    try {
      await api.post(endpoints.shiftSwapRequest(), {
        roster: roster.id,
        proposed_to: proposedTo || undefined,
        reason: reason || undefined,
      });
      setMessage({ type: "success", text: "Swap requested." });
      setOpenSwapDate(null);
      setProposedTo("");
      setReason("");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (swapId: number, action: "accept" | "decline") => {
    setMessage(null);
    setBusyId(swapId);
    try {
      await api.post(endpoints.shiftSwapRespond(swapId), { action });
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const cancelSwap = async (swapId: number) => {
    setMessage(null);
    setBusyId(swapId);
    try {
      await api.post(endpoints.shiftSwapCancel(swapId));
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const hasSwaps = swaps.incoming.length > 0 || swaps.open.length > 0 || swaps.outgoing.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.title}>This week</Text>
          <Text style={styles.subtitle}>
            {formatDayLabel(days[0])} – {formatDayLabel(days[6])} · assigned by your manager
          </Text>
          {loading ? (
            <ActivityIndicator color={T.navy} />
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {days.map((date) => {
                  const roster = byDate[date];
                  const shift = roster?.shift;
                  const canSwap = roster && date >= today;
                  const hasActiveSwap =
                    roster && swaps.outgoing.some((s) => s.roster?.id === roster.id && !["rejected", "cancelled"].includes(s.status));
                  return (
                    <View key={date} style={[styles.dayCard, { backgroundColor: shift ? T.tealBg : T.paper }]}>
                      <Text style={styles.dayLabel}>{formatDayLabel(date).split(" ")[0]}</Text>
                      {shift ? (
                        <>
                          <Text style={styles.shiftName}>{shift.name}</Text>
                          <Text style={styles.shiftTime}>
                            {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                          </Text>
                          {canSwap && !hasActiveSwap && (
                            <Pressable onPress={() => setOpenSwapDate(openSwapDate === date ? null : date)} style={styles.swapBtn}>
                              <Repeat size={11} color={T.navyDeep} />
                              <Text style={styles.swapBtnText}>Swap</Text>
                            </Pressable>
                          )}
                          {hasActiveSwap && <StatusPill status="pending" />}
                        </>
                      ) : (
                        <Text style={styles.offLabel}>Off</Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>

              {openSwapDate && byDate[openSwapDate] && (
                <View style={styles.swapForm}>
                  <Text style={styles.swapFormTitle}>Request a swap for {formatDayLabel(openSwapDate)}</Text>
                  <View style={styles.pickerBox}>
                    <Picker selectedValue={proposedTo} onValueChange={setProposedTo}>
                      <Picker.Item label="Open to anyone in the store" value="" />
                      {teammates.map((t) => (
                        <Picker.Item key={t.id} label={`${t.first_name} ${t.last_name}`} value={String(t.id)} />
                      ))}
                    </Picker>
                  </View>
                  <TextInput
                    placeholder="Reason (optional)"
                    placeholderTextColor={T.faint}
                    value={reason}
                    onChangeText={setReason}
                    style={styles.reasonInput}
                  />
                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => requestSwap(byDate[openSwapDate])}
                      disabled={busyId === byDate[openSwapDate].id}
                      style={styles.sendButton}
                    >
                      <Text style={styles.sendButtonText}>Send request</Text>
                    </Pressable>
                    <Pressable onPress={() => setOpenSwapDate(null)} style={styles.cancelButton}>
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </>
          )}
          {message && (
            <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>{message.text}</Text>
          )}
        </Card>

        {hasSwaps && (
          <Card style={styles.card}>
            <View style={styles.iconTitleRow}>
              <Repeat size={15} color={T.ink} />
              <Text style={styles.title}>Shift swaps</Text>
            </View>
            <Text style={styles.subtitle}>
              Give up a shift above, accept a colleague's, or grab an open one — your manager gives the final approval either way.
            </Text>

            {swaps.incoming.length > 0 && (
              <>
                <Text style={styles.subHeading}>Asked of you</Text>
                {swaps.incoming.map((s) => (
                  <SwapRow
                    key={s.id}
                    swap={s}
                    right={
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <Pressable onPress={() => respond(s.id, "accept")} disabled={busyId === s.id} style={styles.acceptBtn}>
                          <Check size={12} color={T.tealDeep} />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </Pressable>
                        <Pressable onPress={() => respond(s.id, "decline")} disabled={busyId === s.id} style={styles.declineBtn}>
                          <X size={12} color={T.coral} />
                          <Text style={styles.declineBtnText}>Decline</Text>
                        </Pressable>
                      </View>
                    }
                  />
                ))}
              </>
            )}

            {swaps.open.length > 0 && (
              <>
                <Text style={styles.subHeading}>Open to claim</Text>
                {swaps.open.map((s) => (
                  <SwapRow
                    key={s.id}
                    swap={s}
                    right={
                      <Pressable onPress={() => respond(s.id, "accept")} disabled={busyId === s.id} style={styles.acceptBtn}>
                        <Check size={12} color={T.tealDeep} />
                        <Text style={styles.acceptBtnText}>Claim</Text>
                      </Pressable>
                    }
                  />
                ))}
              </>
            )}

            {swaps.outgoing.length > 0 && (
              <>
                <Text style={styles.subHeading}>Your requests</Text>
                {swaps.outgoing.map((s) => (
                  <SwapRow
                    key={s.id}
                    swap={s}
                    right={
                      s.status === "pending_peer" ? (
                        <Pressable onPress={() => cancelSwap(s.id)} disabled={busyId === s.id} style={styles.cancelChip}>
                          <Text style={styles.cancelChipText}>Cancel</Text>
                        </Pressable>
                      ) : (
                        <StatusPill status={SWAP_STATUS_LABEL[s.status] || s.status} />
                      )
                    }
                  />
                ))}
              </>
            )}
          </Card>
        )}

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <CalendarClock size={16} color={T.ink} />
            <Text style={styles.title}>Weekly availability</Text>
          </View>
          <Text style={styles.subtitle}>
            Let your manager know which days you're generally free to work — this is advisory, it doesn't block them from rostering you outside it.
          </Text>
          {availability.map((d) => (
            <View key={d.day_of_week} style={[styles.availRow, d.day_of_week > 0 && styles.availRowBorder]}>
              <Text style={styles.availDay}>{DAY_LABELS[d.day_of_week]}</Text>
              <View style={styles.availSwitchRow}>
                <Switch
                  value={d.is_available}
                  onValueChange={(v) => updateAvailabilityDay(d.day_of_week, { is_available: v })}
                  trackColor={{ false: T.line, true: T.tealBg }}
                  thumbColor={d.is_available ? T.teal : undefined}
                />
                <Text style={styles.availSwitchLabel}>Available</Text>
              </View>
              <View style={styles.availTimeRow}>
                <TimeField value={d.start_time || ""} onChange={(v) => updateAvailabilityDay(d.day_of_week, { start_time: v })} disabled={!d.is_available} />
                <TimeField value={d.end_time || ""} onChange={(v) => updateAvailabilityDay(d.day_of_week, { end_time: v })} disabled={!d.is_available} />
              </View>
            </View>
          ))}
          <Pressable onPress={saveAvailability} disabled={savingAvailability} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>{savingAvailability ? "Saving…" : "Save availability"}</Text>
          </Pressable>
          {availabilityMessage && (
            <Text style={[styles.messageText, { color: availabilityMessage.type === "error" ? T.coral : T.teal }]}>
              {availabilityMessage.text}
            </Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 20 },
  title: { fontFamily: fonts.display.semibold, fontSize: 16.5, color: T.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 16 },
  iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  row: { gap: 10 },
  dayCard: {
    width: 108,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  dayLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.muted, marginBottom: 10 },
  shiftName: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink, marginTop: 8, marginBottom: 2, textAlign: "center" },
  shiftTime: { fontFamily: fonts.mono.regular, fontSize: 10.5, color: T.muted, marginBottom: 8 },
  offLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: T.faint, marginTop: 14 },
  swapBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 7, backgroundColor: T.card },
  swapBtnText: { fontFamily: fonts.body.semibold, fontSize: 10.5, color: T.navyDeep },
  swapForm: { marginTop: 16, padding: 14, borderRadius: 9, backgroundColor: T.line2 },
  swapFormTitle: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.ink, marginBottom: 10 },
  pickerBox: { borderWidth: 1, borderColor: T.line, borderRadius: 8, marginBottom: 8, overflow: "hidden", backgroundColor: T.card },
  reasonInput: { borderWidth: 1, borderColor: T.line, borderRadius: 7, paddingVertical: 8, paddingHorizontal: 10, fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, marginBottom: 10, backgroundColor: T.card },
  actionRow: { flexDirection: "row", gap: 8 },
  sendButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: T.ink },
  sendButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  cancelButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: T.line },
  cancelButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.muted },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 14, textAlign: "center" },
  subHeading: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.muted, marginTop: 16, marginBottom: 2 },
  swapRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: T.line2 },
  swapTitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, marginBottom: 2 },
  swapMeta: { fontFamily: fonts.mono.regular, fontSize: 11, color: T.faint },
  acceptBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 7, backgroundColor: T.tealBg },
  acceptBtnText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.tealDeep },
  declineBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 7, backgroundColor: T.coralBg },
  declineBtnText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.coral },
  cancelChip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 7, borderWidth: 1, borderColor: T.line },
  cancelChipText: { fontFamily: fonts.body.semibold, fontSize: 11.5, color: T.muted },
  availRow: { paddingVertical: 12, gap: 10 },
  availRowBorder: { borderTopWidth: 1, borderTopColor: T.line2 },
  availDay: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
  availSwitchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  availSwitchLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
  availTimeRow: { flexDirection: "row", gap: 10 },
});
