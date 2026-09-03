import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Download, FileText, FileSpreadsheet, UserX } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { downloadAndShare, writeAndShareText } from "../../lib/download";
import { weekDates, formatDayLabel, formatDuration, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import DateField from "../../components/DateField";

// Ported from frontend/src/pages/manager/Reports.jsx. The client-side CSV
// export (Blob + <a download>) becomes writeAndShareText (see lib/download.js).
function daysBetweenInclusive(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000) + 1;
}

function overlapDays(start: string, end: string, rangeFrom: string, rangeTo: string) {
  const s = start > rangeFrom ? start : rangeFrom;
  const e = end < rangeTo ? end : rangeTo;
  if (s > e) return 0;
  return daysBetweenInclusive(s, e);
}

export default function Reports() {
  const defaultWeek = weekDates();
  const [dateFrom, setDateFrom] = useState(defaultWeek[0]);
  const [dateTo, setDateTo] = useState(defaultWeek[6]);
  const [attendances, setAttendances] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  const [absentDate, setAbsentDate] = useState(todayISO());
  const [absentBusy, setAbsentBusy] = useState(false);
  const [absentMsg, setAbsentMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [attRes, leaveRes] = await Promise.all([
      api.get(endpoints.attendanceSearch(`?date_from=${dateFrom}&date_to=${dateTo}&size=500`)),
      api.get(endpoints.leaveRequestAll(`?status=approved&size=500`)),
    ]);
    setAttendances(attRes.attendances || []);
    setLeaveRequests(leaveRes.leave_requests || []);
    setLoading(false);
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const byEmployee: Record<number, { name: string; days: number; hours: number; leaveDays: number }> = {};
    for (const a of attendances) {
      const emp = a.employee;
      if (!emp) continue;
      byEmployee[emp.id] ||= { name: `${emp.first_name} ${emp.last_name}`, days: 0, hours: 0, leaveDays: 0 };
      if (a.check_in_time) byEmployee[emp.id].days += 1;
      if (a.worked_hours) byEmployee[emp.id].hours += Number(a.worked_hours);
    }
    for (const l of leaveRequests) {
      const emp = l.employee;
      if (!emp) continue;
      const overlap = overlapDays(l.start_date, l.end_date, dateFrom, dateTo);
      if (overlap <= 0) continue;
      byEmployee[emp.id] ||= { name: `${emp.first_name} ${emp.last_name}`, days: 0, hours: 0, leaveDays: 0 };
      byEmployee[emp.id].leaveDays += overlap;
    }
    return Object.values(byEmployee).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendances, leaveRequests, dateFrom, dateTo]);

  const totalDays = daysBetweenInclusive(dateFrom, dateTo);

  const exportCsv = async () => {
    setExporting("csv");
    try {
      const header = ["Employee", "Days present", "Hours worked", "Leave days"];
      const lines = [header.join(",")];
      for (const r of rows) {
        lines.push([r.name, r.days, formatDuration(r.hours), r.leaveDays].map((v) => `"${v}"`).join(","));
      }
      await writeAndShareText(lines.join("\n"), `attendance-report_${dateFrom}_to_${dateTo}.csv`);
    } finally {
      setExporting(null);
    }
  };

  const exportServer = async (kind: "pdf" | "excel") => {
    setExporting(kind);
    try {
      const params = `?date_from=${dateFrom}&date_to=${dateTo}`;
      if (kind === "pdf") await downloadAndShare(endpoints.exportPdf(params), `attendance-report_${dateFrom}_to_${dateTo}.pdf`);
      else await downloadAndShare(endpoints.exportExcel(params), `attendance-report_${dateFrom}_to_${dateTo}.xlsx`);
    } finally {
      setExporting(null);
    }
  };

  const runAbsenteeCheck = async () => {
    setAbsentBusy(true);
    setAbsentMsg(null);
    try {
      const res = await api.post(endpoints.markAbsent(`?date=${absentDate}`));
      setAbsentMsg({ type: "success", text: res.detail });
      await load();
    } catch (err: any) {
      setAbsentMsg({ type: "error", text: err.message });
    } finally {
      setAbsentBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Attendance report</Text>
          <Text style={styles.subtitle}>
            {formatDayLabel(dateFrom)} – {formatDayLabel(dateTo)}
          </Text>

          <View style={styles.dateRow}>
            <DateField label="From" value={dateFrom} onChange={setDateFrom} />
            <DateField label="To" value={dateTo} onChange={setDateTo} />
          </View>

          <View style={styles.exportRow}>
            <Pressable onPress={exportCsv} disabled={rows.length === 0 || exporting !== null} style={styles.exportButton}>
              <Download size={14} color={T.navyDeep} />
              <Text style={styles.exportButtonText}>{exporting === "csv" ? "Preparing…" : "CSV"}</Text>
            </Pressable>
            <Pressable onPress={() => exportServer("pdf")} disabled={exporting !== null} style={styles.exportButton}>
              <FileText size={14} color={T.navyDeep} />
              <Text style={styles.exportButtonText}>{exporting === "pdf" ? "Preparing…" : "PDF"}</Text>
            </Pressable>
            <Pressable onPress={() => exportServer("excel")} disabled={exporting !== null} style={styles.exportButton}>
              <FileSpreadsheet size={14} color={T.navyDeep} />
              <Text style={styles.exportButtonText}>{exporting === "excel" ? "Preparing…" : "Excel"}</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={T.navy} />
          ) : rows.length === 0 ? (
            <Text style={styles.bodyMuted}>No attendance or leave records in this range.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View>
                <View style={styles.tableHeaderRow}>
                  {["Employee", "Days present", "Hours worked", "Leave days"].map((h) => (
                    <Text key={h} style={[styles.tableHeaderCell, { width: reportColumnWidths[h] }]}>
                      {h}
                    </Text>
                  ))}
                </View>
                {rows.map((r) => (
                  <View key={r.name} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: reportColumnWidths.Employee }]}>{r.name}</Text>
                    <Text style={[styles.tableCellMono, { width: reportColumnWidths["Days present"] }]}>
                      {r.days} / {totalDays}
                    </Text>
                    <Text style={[styles.tableCellMono, { width: reportColumnWidths["Hours worked"] }]}>{formatDuration(r.hours)}</Text>
                    <Text style={[styles.tableCellMono, { width: reportColumnWidths["Leave days"], color: r.leaveDays ? T.amber : T.faint }]}>
                      {r.leaveDays}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <UserX size={16} color={T.ink} />
            <Text style={styles.cardTitle}>Mark absentees</Text>
          </View>
          <Text style={styles.bodyMuted}>
            Anyone rostered on this date with no attendance record gets marked absent (or on leave, if approved leave covers
            it). Runs automatically once a day if cron is set up on the server — use this to run it by hand.
          </Text>
          <View style={styles.absentRow}>
            <View style={{ flex: 1 }}>
              <DateField value={absentDate} onChange={setAbsentDate} label="" />
            </View>
            <Pressable onPress={runAbsenteeCheck} disabled={absentBusy} style={styles.exportButton}>
              <Text style={styles.exportButtonText}>{absentBusy ? "Running…" : "Run check"}</Text>
            </Pressable>
          </View>
          {absentMsg && (
            <Text style={[styles.messageText, { color: absentMsg.type === "error" ? T.coral : T.teal }]}>{absentMsg.text}</Text>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const reportColumnWidths: Record<string, number> = {
  Employee: 160,
  "Days present": 110,
  "Hours worked": 110,
  "Leave days": 100,
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 20 },
  cardTitle: { fontFamily: fonts.display.semibold, fontSize: 16, color: T.ink },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginTop: 4, marginBottom: 14 },
  iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  bodyMuted: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 14 },
  dateRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  exportRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 18 },
  exportButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: 9, backgroundColor: T.navyBg },
  exportButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.navyDeep },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  tableHeaderCell: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: T.line2 },
  tableCell: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink },
  tableCellMono: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.muted },
  absentRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 10 },
});
