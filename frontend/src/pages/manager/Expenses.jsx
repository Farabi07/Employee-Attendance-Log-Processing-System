import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Camera, FileSpreadsheet, Plus, Receipt, Wallet } from "lucide-react";
import { T, fontBody, fontDisplay, fontMono } from "../../theme";
import { api, getToken } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import QrScannerModal from "../../components/QrScannerModal";
import Card from "../../components/Card";

const CATEGORIES = ["supplies", "rent", "utilities", "transport", "marketing", "salary", "other"];
const periods = ["daily", "monthly", "yearly"];

function money(value) {
  return `৳${Number(value || 0).toFixed(2)}`;
}

function scannedRecipient(value) {
  try {
    const parsed = JSON.parse(value);
    return String(parsed.recipient_id ?? parsed.employee_id ?? parsed.id ?? value);
  } catch {
    return value.trim();
  }
}

export default function ManagerExpenses() {
  const [period, setPeriod] = useState("monthly");
  const [summary, setSummary] = useState({});
  const [expenses, setExpenses] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ amount: "", category: "supplies", date: new Date().toISOString().slice(0, 10), description: "", recipient_id: "" });

  const load = useCallback(async () => {
    const query = `?period=${period}`;
    const [summaryResponse, listResponse] = await Promise.all([
      api.get(endpoints.expensesSummary(query)),
      api.get(endpoints.expensesAll(`${query}&size=500`)),
    ]);
    setSummary(summaryResponse || {});
    setExpenses(listResponse?.expenses || []);
  }, [period]);

  useEffect(() => {
    load().catch((error) => window.alert(error.message || "Could not load expenses"));
  }, [load]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event) => {
    event.preventDefault();
    if (Number(form.amount) <= 0) return window.alert("Enter an amount greater than zero.");
    setSaving(true);
    try {
      await api.post(endpoints.expenseCreate(), { ...form, amount: Number(form.amount), recipient_id: form.recipient_id || null });
      setForm({ amount: "", category: "supplies", date: new Date().toISOString().slice(0, 10), description: "", recipient_id: "" });
      setFormOpen(false);
      await load();
    } catch (error) {
      window.alert(error.message || "Could not add expense");
    } finally {
      setSaving(false);
    }
  };

  const uploadExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${endpoints.expensesImportExcel()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: data,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || "Could not import spreadsheet");
      window.alert(`${payload.created || 0} expenses imported.`);
      await load();
    } catch (error) {
      window.alert(error.message || "Could not import spreadsheet");
    } finally {
      setImporting(false);
    }
  };

  const categories = Array.isArray(summary.categories) ? summary.categories : [];
  const maxCategory = Math.max(...categories.map((item) => Number(item.total || 0)), 1);
  const metrics = [
    ["Revenue", summary.revenue, T.navy],
    ["Expenses", summary.total_expense, T.coral],
    ["Net profit", summary.profit, Number(summary.profit) >= 0 ? T.tealDeep : T.coral],
  ];

  const styles = useMemo(() => ({
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 14 },
    card: { padding: 20 },
    titleRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 5 },
    title: { fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: T.ink, margin: 0 },
    muted: { fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 },
    tabs: { display: "flex", gap: 8, marginTop: 16 },
    tab: { flex: 1, padding: "9px 12px", border: `1px solid ${T.line}`, borderRadius: 8, background: T.line2, color: T.muted, fontFamily: fontBody, fontWeight: 600, cursor: "pointer" },
    tabActive: { background: T.navy, color: T.onAccent, borderColor: T.navy },
    metric: { padding: 16 },
    metricLabel: { fontFamily: fontBody, color: T.muted, fontSize: 12, margin: "0 0 7px" },
    metricValue: { fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, margin: 0 },
    actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 },
    action: { display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 12px", border: 0, borderRadius: 8, background: T.navyBg, color: T.navyDeep, fontFamily: fontBody, fontWeight: 600, cursor: "pointer" },
    sectionTitle: { fontFamily: fontDisplay, fontSize: 15, color: T.ink, margin: "0 0 14px" },
    category: { display: "grid", gridTemplateColumns: "100px 1fr 90px", alignItems: "center", gap: 10, marginBottom: 11 },
    categoryName: { fontFamily: fontBody, fontSize: 12.5, color: T.ink, textTransform: "capitalize" },
    barTrack: { height: 7, borderRadius: 5, background: T.line2, overflow: "hidden" },
    bar: { height: "100%", background: T.teal, borderRadius: 5 },
    categoryValue: { textAlign: "right", fontFamily: fontMono, fontSize: 12, color: T.muted },
    form: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    fieldFull: { gridColumn: "1 / -1" },
    label: { fontFamily: fontBody, color: T.muted, fontSize: 12 },
    input: { padding: "10px 11px", border: `1px solid ${T.line}`, borderRadius: 8, color: T.ink, background: T.card, fontFamily: fontBody },
    submit: { padding: "10px 15px", border: 0, borderRadius: 8, background: T.teal, color: T.onAccent, fontFamily: fontBody, fontWeight: 600, cursor: "pointer" },
    cancel: { padding: "10px 15px", border: `1px solid ${T.line}`, borderRadius: 8, background: "transparent", color: T.muted, fontFamily: fontBody, cursor: "pointer" },
    row: { padding: "11px 0", borderBottom: `1px solid ${T.line2}` },
    rowTop: { display: "flex", justifyContent: "space-between", gap: 10 },
    rowName: { fontFamily: fontBody, color: T.ink, fontSize: 13 },
    rowAmount: { fontFamily: fontMono, color: T.coral, fontSize: 13 },
    rowMeta: { fontFamily: fontMono, color: T.faint, fontSize: 11, marginTop: 4 },
  }), [T]);

  return (
    <div>
      <div style={styles.grid}>
        <Card style={styles.card}>
          <div style={styles.titleRow}><Wallet size={18} color={T.navy} /><h2 style={styles.title}>Expense & profit</h2></div>
          <p style={styles.muted}>Track store spending, revenue and net profit.</p>
          <div style={styles.tabs}>{periods.map((value) => <button key={value} onClick={() => setPeriod(value)} style={{ ...styles.tab, ...(period === value ? styles.tabActive : {}) }}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
          <div style={styles.actions}>
            <button style={styles.action} onClick={() => setFormOpen(true)}><Plus size={14} /> Add expense</button>
            <button style={styles.action} onClick={() => setScannerOpen(true)}><Camera size={14} /> Scan recipient</button>
            <label style={styles.action}><FileSpreadsheet size={14} /> {importing ? "Importing…" : "Upload Excel"}<input type="file" accept=".xlsx,.xls" onChange={uploadExcel} hidden /></label>
          </div>
        </Card>
        {metrics.map(([label, value, color]) => <Card key={label} style={styles.metric}><p style={styles.metricLabel}>{label}</p><p style={{ ...styles.metricValue, color }}>{money(value)}</p></Card>)}
      </div>

      {formOpen && <Card style={{ ...styles.card, marginBottom: 14 }}>
        <h3 style={styles.sectionTitle}>Add expense</h3>
        <form onSubmit={save} style={styles.form}>
          <label style={styles.field}><span style={styles.label}>Amount</span><input style={styles.input} type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => update("amount", e.target.value)} required /></label>
          <label style={styles.field}><span style={styles.label}>Date</span><input style={styles.input} type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required /></label>
          <label style={styles.field}><span style={styles.label}>Category</span><select style={styles.input} value={form.category} onChange={(e) => update("category", e.target.value)}>{CATEGORIES.map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></label>
          <label style={styles.field}><span style={styles.label}>Recipient ID (optional)</span><input style={styles.input} value={form.recipient_id} onChange={(e) => update("recipient_id", e.target.value)} placeholder="Scan or enter employee ID" /></label>
          <label style={{ ...styles.field, ...styles.fieldFull }}><span style={styles.label}>Description</span><input style={styles.input} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="What was this expense for?" /></label>
          <div style={{ ...styles.fieldFull, display: "flex", gap: 8, flexDirection: "row" }}><button style={styles.submit} disabled={saving}>{saving ? "Saving…" : "Save expense"}</button><button type="button" style={styles.cancel} onClick={() => setFormOpen(false)}>Cancel</button></div>
        </form>
      </Card>}

      <div style={styles.grid}>
        <Card style={styles.card}>
          <h3 style={styles.sectionTitle}><Receipt size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />By category</h3>
          {categories.length ? categories.map((item) => <div key={item.category} style={styles.category}><span style={styles.categoryName}>{item.category.replaceAll("_", " ")}</span><div style={styles.barTrack}><div style={{ ...styles.bar, width: `${Math.max(4, Number(item.total) / maxCategory * 100)}%` }} /></div><span style={styles.categoryValue}>{money(item.total)}</span></div>) : <p style={styles.muted}>No category data for this period.</p>}
        </Card>
        <Card style={styles.card}>
          <h3 style={styles.sectionTitle}><CalendarDays size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Recent expenses</h3>
          {expenses.length ? expenses.map((item) => <div key={item.id} style={styles.row}><div style={styles.rowTop}><span style={styles.rowName}>{item.description || item.category || "Expense"}</span><span style={styles.rowAmount}>-{money(item.amount)}</span></div><div style={styles.rowMeta}>{item.date} · {item.category}{item.recipient ? ` · ${item.recipient.first_name} ${item.recipient.last_name}` : ""}</div></div>) : <p style={styles.muted}>No expenses recorded for this period.</p>}
        </Card>
      </div>
      {scannerOpen && <QrScannerModal title="Scan expense recipient" onClose={() => setScannerOpen(false)} onToken={(value) => { update("recipient_id", scannedRecipient(value)); setScannerOpen(false); setFormOpen(true); }} />}
    </div>
  );
}
