import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import DateField from "../../components/DateField";
import { PrimaryButton } from "../../components/Button";

// Ported from frontend/src/pages/employee/Leave.jsx. The web version's
// side-by-side (request form | history) grid becomes one scrollable
// column; the <select> becomes @react-native-picker/picker.
export default function Leave() {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [typesRes, historyRes] = await Promise.all([
      api.get(endpoints.leaveTypesAll()),
      api.get(endpoints.leaveRequestByEmployee(user!.id, "?size=100")),
    ]);
    const types = typesRes.leave_types || [];
    setLeaveTypes(types);
    setHistory(historyRes.leave_requests || []);
    setLeaveTypeId((current) => current || (types.length ? String(types[0].id) : ""));
  }, [user!.id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleSubmit = async () => {
    setMessage(null);
    if (!leaveTypeId || !from || !to) {
      setMessage({ type: "error", text: "Please fill in leave type and both dates." });
      return;
    }
    setSubmitting(true);
    try {
      await api.post(endpoints.leaveRequestCreate(), {
        leave_type: Number(leaveTypeId),
        start_date: from,
        end_date: to,
        reason,
      });
      setMessage({ type: "success", text: "Sent to your manager for review." });
      setFrom("");
      setTo("");
      setReason("");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.title}>Request leave</Text>

          <Text style={styles.label}>Leave type</Text>
          <View style={styles.pickerBox}>
            <Picker selectedValue={leaveTypeId} onValueChange={setLeaveTypeId} enabled={leaveTypes.length > 0}>
              {leaveTypes.length === 0 && <Picker.Item label="No leave types yet" value="" />}
              {leaveTypes.map((lt) => (
                <Picker.Item key={lt.id} label={lt.name} value={String(lt.id)} />
              ))}
            </Picker>
          </View>

          <View style={styles.dateRow}>
            <DateField label="From" value={from} onChange={setFrom} />
            <DateField label="To" value={to} onChange={setTo} />
          </View>

          <Text style={styles.label}>Reason</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={3}
            style={styles.textarea}
            placeholderTextColor={T.faint}
          />

          <PrimaryButton title={submitting ? "Sending…" : "Submit request"} onPress={handleSubmit} loading={submitting} />
          {message && (
            <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>
              {message.text}
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.title}>Your requests</Text>
          {loading && <ActivityIndicator color={T.navy} />}
          {!loading && history.length === 0 && <Text style={styles.emptyText}>No leave requests yet.</Text>}
          {history.map((l, i) => (
            <View key={l.id} style={[styles.historyRow, i > 0 && styles.historyRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyType}>{l.leave_type?.name || "Leave"}</Text>
                <Text style={styles.historyDates}>
                  {l.start_date} – {l.end_date}
                </Text>
              </View>
              <StatusPill status={l.status} />
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 20 },
  title: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink, marginBottom: 16 },
  label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
  pickerBox: { borderWidth: 1, borderColor: T.line, borderRadius: 8, marginBottom: 14, overflow: "hidden" },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  textarea: {
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 8,
    padding: 10,
    fontFamily: fonts.body.regular,
    fontSize: 13,
    color: T.ink,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 10, textAlign: "center" },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted },
  historyRow: { flexDirection: "row", alignItems: "center", paddingVertical: 13 },
  historyRowBorder: { borderTopWidth: 1, borderTopColor: T.line2 },
  historyType: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink, marginBottom: 3 },
  historyDates: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.muted },
});
