import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { PieChart, Paperclip } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api, BASE_URL, getToken, mediaUrl } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import DateField from "../../components/DateField";
import { PrimaryButton } from "../../components/Button";

// Ported from frontend/src/pages/employee/Leave.jsx. The web version's
// side-by-side (request form | history) grid becomes one scrollable
// column; the <select> becomes @react-native-picker/picker. Weekly
// availability lives on the Shifts screen instead — see that file.
export default function Leave() {
  const { user } = useAuth();
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [balance, setBalance] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [attachment, setAttachment] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const pickAttachment = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
    if (!result.canceled) setAttachment(result.assets[0]);
  };

  const load = useCallback(async () => {
    const [typesRes, historyRes, balanceRes] = await Promise.all([
      api.get(endpoints.leaveTypesAll()),
      api.get(endpoints.leaveRequestByEmployee(user!.id, "?size=100")),
      api.get(endpoints.leaveBalanceMine()),
    ]);
    const types = typesRes.leave_types || [];
    setLeaveTypes(types);
    setHistory(historyRes.leave_requests || []);
    setLeaveTypeId((current) => current || (types.length ? String(types[0].id) : ""));
    setBalance(balanceRes.balance || []);
  }, [user!.id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const balanceByTypeId = Object.fromEntries(balance.map((b) => [b.leave_type_id, b]));
  const totalUsed = balance.reduce((sum, b) => sum + b.used, 0);
  const totalQuota = balance.reduce((sum, b) => sum + b.days_per_year, 0);

  const handleSubmit = async () => {
    setMessage(null);
    if (!leaveTypeId || !from || !to) {
      setMessage({ type: "error", text: "Please fill in leave type and both dates." });
      return;
    }
    setSubmitting(true);
    try {
      if (attachment) {
        // fetch()+FormData throws "Unsupported FormDataPart implementation"
        // on Android regardless of HTTP method — see ProfileModal.tsx.
        // Route file uploads through expo-file-system's native multipart
        // upload instead.
        const token = await getToken();
        const result = await FileSystem.uploadAsync(`${BASE_URL}${endpoints.leaveRequestCreate()}`, attachment.uri, {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "attachment",
          mimeType: attachment.mimeType || "application/octet-stream",
          parameters: { leave_type: leaveTypeId, start_date: from, end_date: to, reason },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (result.status < 200 || result.status >= 300) {
          throw new Error(JSON.parse(result.body || "{}")?.detail || "Could not submit request");
        }
      } else {
        await api.post(endpoints.leaveRequestCreate(), {
          leave_type: Number(leaveTypeId),
          start_date: from,
          end_date: to,
          reason,
        });
      }
      setMessage({ type: "success", text: "Sent to your manager for review." });
      setFrom("");
      setTo("");
      setReason("");
      setAttachment(null);
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
              {leaveTypes.map((lt) => {
                const b = balanceByTypeId[lt.id];
                const suffix = b && b.days_per_year > 0 ? ` (${b.remaining} of ${b.days_per_year} left)` : "";
                return <Picker.Item key={lt.id} label={`${lt.name}${suffix}`} value={String(lt.id)} />;
              })}
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

          <Pressable onPress={pickAttachment} style={styles.attachRow}>
            <Paperclip size={13} color={T.muted} />
            <Text style={styles.attachText} numberOfLines={1}>
              {attachment ? attachment.name : "Attach a document (optional, e.g. a medical certificate)"}
            </Text>
          </Pressable>

          <PrimaryButton title={submitting ? "Sending…" : "Submit request"} onPress={handleSubmit} loading={submitting} />
          {message && (
            <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>
              {message.text}
            </Text>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <PieChart size={16} color={T.ink} />
            <Text style={styles.title}>Leave balance</Text>
          </View>
          <Text style={styles.balanceSubtitle}>
            {totalQuota > 0 ? `${totalUsed} of ${totalQuota} days used this year` : "This year"}
          </Text>
          {balance.length === 0 ? (
            <Text style={styles.emptyText}>No leave types set up yet.</Text>
          ) : (
            balance.map((b) => (
              <View key={b.leave_type_id} style={styles.balanceRow}>
                <View style={styles.balanceRowTop}>
                  <Text style={styles.balanceName}>{b.name}</Text>
                  <Text style={styles.balanceValue}>
                    {b.days_per_year > 0 ? `${b.used} / ${b.days_per_year} days` : `${b.used} days (unlimited)`}
                  </Text>
                </View>
                {b.days_per_year > 0 && (
                  <View style={styles.balanceTrack}>
                    <View
                      style={[
                        styles.balanceFill,
                        {
                          width: `${Math.min(100, (b.used / b.days_per_year) * 100)}%`,
                          backgroundColor: b.remaining === 0 ? T.coral : T.teal,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            ))
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
                {l.attachment && (
                  <Pressable onPress={() => Linking.openURL(mediaUrl(l.attachment)!)} style={styles.historyAttachRow}>
                    <Paperclip size={11} color={T.navyDeep} />
                    <Text style={styles.historyAttachText}>View attachment</Text>
                  </Pressable>
                )}
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
  iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  balanceSubtitle: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 14 },
  balanceRow: { marginBottom: 12 },
  balanceRowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  balanceName: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink },
  balanceValue: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.muted },
  balanceTrack: { height: 6, borderRadius: 3, backgroundColor: T.line2, overflow: "hidden" },
  balanceFill: { height: "100%", borderRadius: 3 },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  attachText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, flexShrink: 1 },
  historyAttachRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  historyAttachText: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.navyDeep },
});
