import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Users, CheckCircle2, Coffee, UserX, LayoutGrid, ClipboardCheck } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatTime, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import StatusPill from "../../components/StatusPill";
import Team from "./Team";
import Approvals from "./Approvals";

// Overview now doubles as the home for Team and Approvals — those stopped
// being their own bottom tabs (per the manager/moderator nav consolidation:
// Overview, Roster, Payroll, Reports) and live here instead, switched via
// the segmented row below. Team/Approvals are rendered unmodified as their
// own self-contained screens (each still wraps itself in a SafeAreaView) —
// nesting a no-inset SafeAreaView (edges=[]) inside another is a no-op for
// layout, so this reuses them exactly as they worked as standalone tabs.
type Section = "overview" | "team" | "approvals";

const SECTIONS: { key: Section; label: string; icon: any }[] = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "team", label: "Team", icon: Users },
  { key: "approvals", label: "Approvals", icon: ClipboardCheck },
];

function initialsOf(emp: any) {
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

function OverviewDashboard() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceByEmp, setAttendanceByEmp] = useState<Record<number, any>>({});
  const [leaveEmployeeIds, setLeaveEmployeeIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const today = todayISO();
    Promise.all([
      api.get(endpoints.employeesAll()),
      api.get(endpoints.attendanceSearch(`?date=${today}&size=200`)),
      api.get(endpoints.leaveRequestAll(`?status=approved&size=200`)),
    ])
      .then(([empRes, attRes, leaveRes]) => {
        setEmployees(empRes.employees || []);

        const map: Record<number, any> = {};
        for (const a of attRes.attendances || []) {
          if (a.employee?.id) map[a.employee.id] = a;
        }
        setAttendanceByEmp(map);

        const onLeaveIds = new Set<number>(
          (leaveRes.leave_requests || [])
            .filter((l: any) => l.start_date <= today && today <= l.end_date)
            .map((l: any) => l.employee?.id)
        );
        setLeaveEmployeeIds(onLeaveIds);
      })
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    return employees
      .filter((e) => `${e.first_name} ${e.last_name}`.toLowerCase().includes(query.toLowerCase()))
      .map((e) => {
        const att = attendanceByEmp[e.id];
        const onLeave = leaveEmployeeIds.has(e.id);
        let display = "out";
        if (att?.check_in_time && !att?.check_out_time) display = "in";
        else if (att?.check_in_time && att?.check_out_time) display = att.status;
        else if (onLeave) display = "on_leave";
        return { employee: e, attendance: att, display };
      });
  }, [employees, attendanceByEmp, leaveEmployeeIds, query]);

  const counts = useMemo(() => {
    let checkedIn = 0,
      onLeave = 0,
      notIn = 0;
    for (const e of employees) {
      const att = attendanceByEmp[e.id];
      if (att?.check_in_time) checkedIn++;
      else if (leaveEmployeeIds.has(e.id)) onLeave++;
      else notIn++;
    }
    return { checkedIn, onLeave, notIn };
  }, [employees, attendanceByEmp, leaveEmployeeIds]);

  const metrics = [
    { label: "Team size", value: employees.length, color: T.navy, bg: T.navyBg, icon: Users },
    { label: "Checked in today", value: counts.checkedIn, color: T.tealDeep, bg: T.tealBg, icon: CheckCircle2 },
    { label: "On leave", value: counts.onLeave, color: T.amber, bg: T.amberBg, icon: Coffee },
    { label: "Not checked in", value: counts.notIn, color: T.coral, bg: T.coralBg, icon: UserX },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.metricsGrid}>
        {metrics.map((m) => (
          <Card key={m.label} style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <View style={[styles.metricIconBox, { backgroundColor: m.bg }]}>
                <m.icon size={14} color={m.color} strokeWidth={2.2} />
              </View>
            </View>
            <Text style={styles.metricValue}>{m.value}</Text>
          </Card>
        ))}
      </View>

      <Card style={styles.tableCard}>
        <Text style={styles.tableTitle}>Team attendance · today</Text>
        <View style={styles.searchBox}>
          <Search size={14} color={T.faint} style={styles.searchIcon} />
          <TextInput
            placeholder="Search employee"
            placeholderTextColor={T.faint}
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
          />
        </View>
        {loading ? (
          <ActivityIndicator color={T.navy} style={{ marginTop: 12 }} />
        ) : (
          <>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>Employee</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Status</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Since</Text>
            </View>
            {rows.map(({ employee, attendance, display }) => (
              <View key={employee.id} style={styles.row}>
                <View style={styles.employeeCell}>
                  <Avatar initials={initialsOf(employee)} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.employeeName}>
                      {employee.first_name} {employee.last_name}
                    </Text>
                    <Text style={styles.employeeEmail}>{employee.email}</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <StatusPill status={display} />
                </View>
                <Text style={[styles.sinceText, { flex: 1 }]}>{formatTime(attendance?.check_in_time)}</Text>
              </View>
            ))}
          </>
        )}
      </Card>
    </ScrollView>
  );
}

export default function Overview() {
  const [section, setSection] = useState<Section>("overview");

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.segmentedRow}>
        {SECTIONS.map((s) => {
          const active = section === s.key;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSection(s.key)}
              style={[styles.segment, active && styles.segmentActive]}
            >
              <s.icon size={14} color={active ? T.paper : T.muted} strokeWidth={2.2} />
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }}>
        {section === "overview" && <OverviewDashboard />}
        {section === "team" && <Team />}
        {section === "approvals" && <Approvals />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  segmentedRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: T.line2,
  },
  segmentActive: { backgroundColor: T.navy },
  segmentText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.muted },
  segmentTextActive: { color: T.paper },
  scrollContent: { padding: 16, gap: 16 },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { flexBasis: "47%", flexGrow: 1, padding: 16 },
  metricHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  metricLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: T.muted, flexShrink: 1 },
  metricIconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  metricValue: { fontFamily: fonts.display.semibold, fontSize: 26, color: T.ink },
  tableCard: { padding: 20 },
  tableTitle: { fontFamily: fonts.display.semibold, fontSize: 16, color: T.ink, marginBottom: 12 },
  searchBox: { position: "relative", marginBottom: 12 },
  searchIcon: { position: "absolute", left: 10, top: 10, zIndex: 1 },
  searchInput: {
    paddingVertical: 8,
    paddingLeft: 30,
    paddingRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    color: T.ink,
  },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.line },
  tableHeaderText: { fontFamily: fonts.body.semibold, fontSize: 11, color: T.faint, textTransform: "uppercase", letterSpacing: 0.4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.line2 },
  employeeCell: { flex: 2, flexDirection: "row", alignItems: "center", gap: 10 },
  employeeName: { fontFamily: fonts.body.medium, fontSize: 13.5, color: T.ink },
  employeeEmail: { fontFamily: fonts.mono.regular, fontSize: 11, color: T.faint },
  sinceText: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.muted },
});
