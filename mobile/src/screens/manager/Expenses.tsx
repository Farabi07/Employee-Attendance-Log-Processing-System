import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet, RefreshControl, KeyboardAvoidingView, Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { CalendarDays, Camera, FileSpreadsheet, Plus, Receipt, Wallet } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { api, BASE_URL, getToken } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatMoney } from "../../lib/currency";
import { todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import InlinePicker from "../../components/InlinePicker";
import DateField from "../../components/DateField";
import QrScannerModal from "../../components/QrScannerModal";
import { PrimaryButton } from "../../components/Button";
import { useToast } from "../../components/Toast";
import { tapLight } from "../../lib/haptics";

type Period = "daily" | "monthly" | "yearly";
const CATEGORIES = [
  { value: "supplies", label: "Supplies" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "transport", label: "Transport" },
  { value: "marketing", label: "Marketing" },
  { value: "salary", label: "Salary" },
  { value: "other", label: "Other" },
];

function amount(value: any) {
  return Number(value || 0);
}

function getRecipientCode(code: string) {
  try {
    const parsed = JSON.parse(code);
    return String(parsed.recipient_id ?? parsed.id ?? parsed.employee_id ?? code);
  } catch {
    return code.trim();
  }
}

export default function Expenses() {
  const T = useTheme();
  const toast = useToast();
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.paper },
    content: { padding: 16, gap: 14 },
    card: { padding: 18 },
    titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
    title: { fontFamily: fonts.display.semibold, fontSize: 16, color: T.ink },
    muted: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
    periodRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    period: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 8, backgroundColor: T.line2 },
    periodActive: { backgroundColor: T.navy },
    periodText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.muted },
    periodTextActive: { color: T.onAccent },
    metrics: { flexDirection: "row", gap: 9 },
    metric: { flex: 1, padding: 13 },
    metricLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted, marginBottom: 6 },
    metricValue: { fontFamily: fonts.display.semibold, fontSize: 19, color: T.ink },
    actionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 14 },
    action: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, backgroundColor: T.navyBg },
    actionText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.navyDeep },
    sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.ink, marginBottom: 12 },
    categoryRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    categoryName: { flex: 1, fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink },
    categoryValue: { width: 80, textAlign: "right", fontFamily: fonts.mono.regular, fontSize: 12, color: T.muted },
    barTrack: { width: 90, height: 7, borderRadius: 5, overflow: "hidden", backgroundColor: T.line2, marginHorizontal: 10 },
    bar: { height: "100%", backgroundColor: T.teal, borderRadius: 5 },
    formRow: { flexDirection: "row", gap: 10 },
    formHalf: { flex: 1 },
    recipientBox: { marginBottom: 14 },
    recipientLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
    recipientRow: { flexDirection: "row", gap: 8 },
    recipientInput: { flex: 1, borderWidth: 1, borderColor: T.line, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: T.ink, fontFamily: fonts.body.regular },
    scanButton: { width: 42, borderRadius: 8, backgroundColor: T.navyBg, alignItems: "center", justifyContent: "center" },
    noteInput: { minHeight: 76, textAlignVertical: "top" },
    error: { color: T.coral, fontFamily: fonts.body.regular, fontSize: 12, marginBottom: 10 },
    listRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.line2 },
    listTop: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
    listName: { flex: 1, fontFamily: fonts.body.medium, fontSize: 13, color: T.ink },
    listAmount: { fontFamily: fonts.mono.medium, fontSize: 13, color: T.coral },
    listMeta: { fontFamily: fonts.mono.regular, fontSize: 11, color: T.faint, marginTop: 4 },
  }), [T]);

  const [period, setPeriod] = useState<Period>("monthly");
  const [summary, setSummary] = useState<any>({});
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [receiptScanning, setReceiptScanning] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState(todayISO());
  const [category, setCategory] = useState("supplies");
  const [value, setValue] = useState("");
  const [description, setDescription] = useState("");
  const [recipient, setRecipient] = useState("");

  const load = useCallback(async () => {
    const query = `?period=${period}`;
    const [summaryRes, listRes] = await Promise.all([
      api.get(endpoints.expensesSummary(query)),
      api.get(endpoints.expensesAll(`${query}&size=50`)),
    ]);
    setSummary(summaryRes || {});
    setExpenses(listRes?.expenses || listRes?.results || []);
  }, [period]);

  useEffect(() => {
    setLoading(true);
    load().catch((err) => toast.show(err.message || "Could not load expenses", "error")).finally(() => setLoading(false));
  }, [load, toast]);

  const refresh = async () => {
    tapLight(); setRefreshing(true);
    try { await load(); } catch (err: any) { toast.show(err.message || "Could not refresh expenses", "error"); } finally { setRefreshing(false); }
  };

  const resetForm = () => {
    setValue(""); setDescription(""); setRecipient(""); setCategory("supplies"); setDate(todayISO()); setError("");
  };

  const saveExpense = async () => {
    const numericValue = amount(value);
    if (numericValue <= 0) { setError("Enter an expense amount greater than zero."); return; }
    setSaving(true); setError("");
    try {
      await api.post(endpoints.expenseCreate(), {
        amount: numericValue, category, description, date,
        ...(recipient.trim() ? { recipient_id: recipient.trim() } : {}),
      });
      toast.show("Expense added.");
      setShowForm(false); resetForm(); await load();
    } catch (err: any) { setError(err.message || "Could not add expense."); } finally { setSaving(false); }
  };

  const scanRecipient = (code: string) => {
    setRecipient(getRecipientCode(code));
    setShowScanner(false);
    setShowForm(true);
    toast.show("Recipient selected from QR.");
  };

  const uploadExcel = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    setImporting(true);
    try {
      const file = picked.assets[0];
      const token = await getToken();
      const result = await FileSystem.uploadAsync(`${BASE_URL}${endpoints.expensesImportExcel()}`, file.uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: file.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (result.status < 200 || result.status >= 300) throw new Error(JSON.parse(result.body || "{}")?.detail || "Could not import spreadsheet.");
      toast.show("Expenses imported from Excel.");
      await load();
    } catch (err: any) { toast.show(err.message || "Could not import spreadsheet.", "error"); } finally { setImporting(false); }
  };

  const scanReceipt = async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: "image/*",
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    setReceiptScanning(true);
    try {
      const file = picked.assets[0];
      const token = await getToken();
      const result = await FileSystem.uploadAsync(`${BASE_URL}${endpoints.expenseReceiptExtract()}`, file.uri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: "file",
        mimeType: file.mimeType || "image/jpeg",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const extracted = JSON.parse(result.body || "{}");
      if (result.status < 200 || result.status >= 300) throw new Error(extracted.detail || "Could not read receipt.");
      setValue(extracted.amount || "");
      setCategory(extracted.category || "other");
      setDate(extracted.date || todayISO());
      setDescription(extracted.description || "Receipt expense");
      setShowForm(true);
      toast.show("Receipt text extracted. Review before saving.");
    } catch (err: any) {
      toast.show(err.message || "Could not read receipt.", "error");
    } finally {
      setReceiptScanning(false);
    }
  };

  const categories = summary.categories || summary.by_category || [];
  const categoryRows = Array.isArray(categories)
    ? categories
    : Object.entries(categories).map(([name, total]) => ({ category: name, total }));
  const totalExpense = amount(summary.total_expense ?? summary.total_expenses);
  const revenue = amount(summary.revenue ?? summary.total_revenue);
  const profit = amount(summary.profit ?? revenue - totalExpense);
  const maxCategory = Math.max(...categoryRows.map((row: any) => amount(row.total ?? row.amount)), 1);

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <Card style={styles.card}>
          <View style={styles.titleRow}><Wallet size={18} color={T.navy} /><Text style={styles.title}>Expense & profit</Text></View>
          <Text style={styles.muted}>Track store spending, revenue and net profit.</Text>
          <View style={styles.periodRow}>
            {(["daily", "monthly", "yearly"] as Period[]).map((item) => (
              <Pressable key={item} onPress={() => setPeriod(item)} style={[styles.period, period === item && styles.periodActive]}>
                <Text style={[styles.periodText, period === item && styles.periodTextActive]}>{item[0].toUpperCase() + item.slice(1)}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.metrics}>
            <Card style={styles.metric}><Text style={styles.metricLabel}>Revenue</Text><Text style={styles.metricValue}>{formatMoney(revenue, "bdt")}</Text></Card>
            <Card style={styles.metric}><Text style={styles.metricLabel}>Expenses</Text><Text style={[styles.metricValue, { color: T.coral }]}>{formatMoney(totalExpense, "bdt")}</Text></Card>
            <Card style={styles.metric}><Text style={styles.metricLabel}>Net profit</Text><Text style={[styles.metricValue, { color: profit >= 0 ? T.tealDeep : T.coral }]}>{formatMoney(profit, "bdt")}</Text></Card>
          </View>
          <View style={styles.actionRow}>
            <Pressable style={styles.action} onPress={() => { resetForm(); setShowForm(true); }}><Plus size={14} color={T.navyDeep} /><Text style={styles.actionText}>Add expense</Text></Pressable>
            <Pressable style={styles.action} onPress={() => setShowScanner(true)}><Camera size={14} color={T.navyDeep} /><Text style={styles.actionText}>Scan recipient</Text></Pressable>
            <Pressable style={styles.action} onPress={scanReceipt} disabled={receiptScanning}><Receipt size={14} color={T.navyDeep} /><Text style={styles.actionText}>{receiptScanning ? "Reading receipt..." : "Scan receipt"}</Text></Pressable>
            <Pressable style={styles.action} onPress={uploadExcel} disabled={importing}><FileSpreadsheet size={14} color={T.navyDeep} /><Text style={styles.actionText}>{importing ? "Importing…" : "Upload Excel"}</Text></Pressable>
          </View>
        </Card>

        <Card style={styles.card}>
          <View style={styles.titleRow}><Receipt size={17} color={T.tealDeep} /><Text style={styles.sectionTitle}>By category</Text></View>
          {categoryRows.length === 0 ? <Text style={styles.muted}>No category data for this period.</Text> : categoryRows.map((row: any) => {
            const total = amount(row.total ?? row.amount);
            return <View key={String(row.category ?? row.name)} style={styles.categoryRow}>
              <Text style={styles.categoryName}>{String(row.category ?? row.name).replace(/_/g, " ")}</Text>
              <View style={styles.barTrack}><View style={[styles.bar, { width: `${Math.max(4, total / maxCategory * 100)}%` }]} /></View>
              <Text style={styles.categoryValue}>{formatMoney(total, "bdt")}</Text>
            </View>;
          })}
        </Card>

        {showForm && <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Card style={styles.card}>
            <View style={styles.titleRow}><Plus size={17} color={T.navy} /><Text style={styles.sectionTitle}>Add expense</Text></View>
            <View style={styles.formRow}>
              <View style={styles.formHalf}><FormField label="Amount" value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholder="0.00" /></View>
              <View style={styles.formHalf}><DateField label="Date" value={date} onChange={setDate} /></View>
            </View>
            <Text style={styles.muted}>Category</Text>
            <InlinePicker selectedValue={category} onValueChange={setCategory} items={CATEGORIES} style={{ marginBottom: 14 }} />
            <View style={styles.recipientBox}>
              <Text style={styles.recipientLabel}>Recipient (optional)</Text>
              <View style={styles.recipientRow}>
                <TextInput value={recipient} onChangeText={setRecipient} placeholder="Employee or supplier ID" placeholderTextColor={T.faint} style={styles.recipientInput} />
                <Pressable style={styles.scanButton} onPress={() => setShowScanner(true)}><Camera size={17} color={T.navyDeep} /></Pressable>
              </View>
            </View>
            <FormField label="Description" value={description} onChangeText={setDescription} placeholder="What was this expense for?" multiline style={styles.noteInput} />
            {!!error && <Text style={styles.error}>{error}</Text>}
            <View style={styles.actionRow}><PrimaryButton title={saving ? "Saving…" : "Save expense"} onPress={saveExpense} loading={saving} /><Pressable onPress={() => { setShowForm(false); resetForm(); }}><Text style={[styles.actionText, { color: T.muted, padding: 10 }]}>Cancel</Text></Pressable></View>
          </Card>
        </KeyboardAvoidingView>}

        <Card style={styles.card}>
          <View style={styles.titleRow}><CalendarDays size={17} color={T.navy} /><Text style={styles.sectionTitle}>Recent expenses</Text></View>
          {loading ? <Text style={styles.muted}>Loading expenses…</Text> : expenses.length === 0 ? <Text style={styles.muted}>No expenses recorded for this period.</Text> : expenses.map((item) => (
            <View key={String(item.id ?? `${item.date}-${item.amount}`)} style={styles.listRow}>
              <View style={styles.listTop}><Text style={styles.listName}>{item.description || item.category || "Expense"}</Text><Text style={styles.listAmount}>-{formatMoney(item.amount, "bdt")}</Text></View>
              <Text style={styles.listMeta}>{item.date || item.created_at?.slice(0, 10)} · {String(item.category || "other").replace(/_/g, " ")}{item.recipient_name ? ` · ${item.recipient_name}` : ""}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
      {showScanner && <QrScannerModal title="Scan expense recipient" onClose={() => setShowScanner(false)} onToken={scanRecipient} />}
    </SafeAreaView>
  );
}
