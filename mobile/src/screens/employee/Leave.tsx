import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, Linking, RefreshControl, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { PieChart, Paperclip, CalendarX2 } from "lucide-react-native";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import IconChip from "../../components/IconChip";
import { useToast } from "../../components/Toast";
import { tapLight } from "../../lib/haptics";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { api, BASE_URL, getToken, mediaUrl } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import Card from "../../components/Card";
import InlinePicker from "../../components/InlinePicker";
import StatusPill from "../../components/StatusPill";
import DateField from "../../components/DateField";
import { PrimaryButton } from "../../components/Button";

// Ported from frontend/src/pages/employee/Leave.jsx. The web version's
// side-by-side (request form | history) grid becomes one scrollable
// column; the <select> becomes @react-native-picker/picker. Weekly
// availability lives on the Shifts screen instead — see that file.
export default function Leave() {
  const { user } = useAuth();
  const toast = useToast();
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
        scrollContent: { padding: 16, gap: 16 },
        card: { padding: 20 },
        title: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink, marginBottom: 16 },
        label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
        pickerBox: { marginBottom: 14 },
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
      }),
    [T]
  );
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

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    tapLight();
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const balanceByTypeId = Object.fromEntries(balance.map((b) => [b.leave_type_id, b]));
  const totalUsed = balance.reduce((sum, b) => sum + b.used, 0);
  const totalQuota = balance.reduce((sum, b) => sum + b.days_per_year, 0);

  const handleSubmit = async () => {
    if (!leaveTypeId || !from || !to) {
      toast.show("Please fill in leave type and both dates.", "error");
      return;
    }
    setSubmitting(true);
    try {
      if (attachment) {
        // fetch()+FormData throws "Unsupported FormDataPart implementation"
        // on Android regardless of HTTP method — see screens/settings/ProfileDetails.tsx.
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
      toast.show("Sent to your manager for review.");
      setFrom("");
      setTo("");
      setReason("");
      setAttachment(null);
      await load();
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} colors={[T.teal]} />}
      >
        <Card style={styles.card}>
          <Text style={styles.title}>Request leave</Text>

          <Text style={styles.label}>Leave type</Text>
          <InlinePicker
            style={styles.pickerBox}
            selectedValue={leaveTypeId}
            onValueChange={setLeaveTypeId}
            enabled={leaveTypes.length > 0}
            items={
              leaveTypes.length === 0
                ? [{ value: "", label: "No leave types yet" }]
                : leaveTypes.map((lt) => {
                    const b = balanceByTypeId[lt.id];
                    const suffix = b && b.days_per_year > 0 ? ` (${b.remaining} of ${b.days_per_year} left)` : "";
                    return { value: String(lt.id), label: `${lt.name}${suffix}` };
                  })
            }
          />

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
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <IconChip bg={T.tealBg}>
              <PieChart size={15} color={T.tealDeep} />
            </IconChip>
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
          {loading && (
            <View style={{ gap: 12 }}>
              {[0, 1].map((i) => (
                <View key={i} style={{ gap: 6 }}>
                  <Skeleton width="40%" height={12} radius={4} />
                  <Skeleton width="60%" height={10} radius={4} />
                </View>
              ))}
            </View>
          )}
          {!loading && history.length === 0 && (
            <EmptyState icon={CalendarX2} title="No requests yet" subtitle="Your leave requests will show up here." />
          )}
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
