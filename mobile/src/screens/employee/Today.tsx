import React, { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, MapPin } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { getLocation } from "../../lib/geolocation";
import { formatTime, formatDuration, formatDayLabel, shiftDurationMinutes, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import ShiftRing from "../../components/ShiftRing";
import QrScannerModal from "../../components/QrScannerModal";

// Ported from frontend/src/pages/employee/Today.jsx. The web version's
// isMobile grid-vs-sidebar layout switch doesn't apply here — a phone
// screen is always the "mobile" layout, so this is just one scrollable
// column. Everything else (GPS-first-then-camera check-in orchestration,
// week/month hour totals, upcoming shifts, pending-leave banner) ports
// as-is.
const SHIFT_META: Record<string, { color: string; bg: string }> = {
  Morning: { color: T.amber, bg: T.amberBg },
  Evening: { color: T.teal, bg: T.tealBg },
  Night: { color: T.ink, bg: T.line2 },
};

function shiftMeta(name?: string) {
  return (name && SHIFT_META[name]) || { color: T.muted, bg: T.line2 };
}

export default function Today() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<any>(undefined); // undefined = loading
  const [rosterToday, setRosterToday] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [weekHours, setWeekHours] = useState(0);
  const [monthHours, setMonthHours] = useState(0);
  const [pendingLeave, setPendingLeave] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"checkin" | "checkout" | null>(null);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const [att, rosterRes, attHistoryRes, leaveRes] = await Promise.all([
      api.get(endpoints.today()),
      api.get(endpoints.rosterByEmployee(user!.id, "?size=100")),
      api.get(endpoints.attendanceByEmployee(user!.id, "?size=100")),
      api.get(endpoints.leaveRequestByEmployee(user!.id, "?size=100")),
    ]);

    setAttendance(att);

    const today = todayISO();
    const rosters = rosterRes.rosters || [];
    setRosterToday(rosters.find((r: any) => r.date === today) || null);
    setUpcoming(
      rosters
        .filter((r: any) => r.date >= today)
        .sort((a: any, b: any) => a.date.localeCompare(b.date))
        .slice(0, 5)
    );

    const attendances = attHistoryRes.attendances || [];
    const nowDate = new Date();
    const startOfWeek = new Date(nowDate);
    startOfWeek.setDate(nowDate.getDate() - nowDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);

    const sum = (from: Date) =>
      attendances
        .filter((a: any) => new Date(a.date) >= from && a.worked_hours)
        .reduce((s: number, a: any) => s + Number(a.worked_hours), 0);

    setWeekHours(sum(startOfWeek));
    setMonthHours(sum(startOfMonth));

    const leaves = leaveRes.leave_requests || [];
    setPendingLeave(leaves.find((l: any) => l.status === "pending") || null);
  }, [user!.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (attendance && attendance.check_in_time && !attendance.check_out_time) {
      const id = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(id);
    }
  }, [attendance]);

  if (attendance === undefined) {
    return (
      <SafeAreaView style={styles.loadingSafe} edges={[]}>
        <ActivityIndicator color={T.navy} />
      </SafeAreaView>
    );
  }

  const checkedIn = !!(attendance && attendance.check_in_time && !attendance.check_out_time);
  const completed = !!(attendance && attendance.check_in_time && attendance.check_out_time);

  const targetMinutes = shiftDurationMinutes(rosterToday?.shift);
  let elapsedMinutes = 0;
  if (checkedIn) {
    elapsedMinutes = (now - new Date(attendance.check_in_time).getTime()) / 60000;
  } else if (completed) {
    elapsedMinutes = (new Date(attendance.check_out_time).getTime() - new Date(attendance.check_in_time).getTime()) / 60000;
  }

  const ringLabel = completed ? "Day complete" : undefined;

  // GPS is checked first — the camera only opens once we have a location,
  // so a scan can never even start from outside the office if location
  // access fails or is denied.
  const startCheck = async (action: "checkin" | "checkout") => {
    setBanner(null);
    setLocating(true);
    try {
      const loc = await getLocation();
      setLocation(loc);
      setScanMode(action);
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    } finally {
      setLocating(false);
    }
  };

  const handleToken = async (code: string) => {
    const action = scanMode;
    setScanMode(null);
    setBanner(null);
    try {
      const payload = location ? { code, lat: location.lat, lon: location.lon } : { code };

      if (action === "checkin") {
        await api.post(endpoints.checkin(), payload);
        setBanner({ type: "success", text: "Checked in successfully." });
      } else {
        await api.post(endpoints.checkout(), payload);
        setBanner({ type: "success", text: "Checked out successfully." });
      }
      await load();
    } catch (err: any) {
      setBanner({ type: "error", text: err.message });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.ringCard}>
          <Text style={styles.dayLabel}>{formatDayLabel(todayISO())}</Text>
          <ShiftRing
            checkedIn={checkedIn || completed}
            elapsedMinutes={elapsedMinutes}
            targetMinutes={targetMinutes}
            onScan={() => startCheck(checkedIn ? "checkout" : "checkin")}
            disabled={completed || locating}
            label={locating ? "Checking location…" : ringLabel}
          />
          <View style={{ marginTop: 20 }}>
            <StatusPill status={completed ? attendance.status : checkedIn ? "in" : "out"} />
          </View>
          {(checkedIn || completed) && (
            <Text style={styles.sinceText}>
              since {formatTime(attendance.check_in_time)}
              {completed && ` · out ${formatTime(attendance.check_out_time)}`}
            </Text>
          )}
          {completed && attendance.earnings != null && (
            <Text style={styles.earningsText}>Earned today: {attendance.earnings}</Text>
          )}
          {banner && (
            <Text style={[styles.bannerText, { color: banner.type === "error" ? T.coral : T.teal }]}>
              {banner.text}
            </Text>
          )}
          <View style={styles.branchRow}>
            <MapPin size={13} color={T.faint} />
            <Text style={styles.branchText}>{attendance?.branch?.name || "Branch is set when you check in"}</Text>
          </View>
        </Card>

        <View style={styles.metricsRow}>
          {[
            { label: "This week", value: formatDuration(weekHours) },
            { label: "This month", value: formatDuration(monthHours) },
            { label: "Pending leave", value: pendingLeave ? "1 request" : "None" },
          ].map((m) => (
            <Card key={m.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Upcoming shifts</Text>
          {upcoming.length === 0 && <Text style={styles.emptyText}>No shifts assigned yet.</Text>}
          {upcoming.map((r, i) => {
            const meta = shiftMeta(r.shift?.name);
            return (
              <View key={r.id} style={[styles.shiftRow, i > 0 && styles.shiftRowBorder]}>
                <View style={[styles.shiftDot, { backgroundColor: meta.bg }]} />
                <Text style={styles.shiftDate}>{formatDayLabel(r.date)}</Text>
                <Text style={styles.shiftName}>{r.shift?.name || "Shift"}</Text>
                <Text style={styles.shiftTime}>
                  {r.shift?.start_time?.slice(0, 5)}–{r.shift?.end_time?.slice(0, 5)}
                </Text>
              </View>
            );
          })}
        </Card>

        {pendingLeave && (
          <Card style={styles.leaveCard}>
            <Bell size={16} color={T.amber} strokeWidth={1.8} />
            <Text style={styles.leaveText}>
              Your {pendingLeave.leave_type?.name?.toLowerCase() || "leave"} request ({pendingLeave.start_date} –{" "}
              {pendingLeave.end_date}) is awaiting manager approval.
            </Text>
          </Card>
        )}
      </ScrollView>

      {scanMode && (
        <QrScannerModal
          title={scanMode === "checkin" ? "Scan to check in" : "Scan to check out"}
          onClose={() => setScanMode(null)}
          onToken={handleToken}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  loadingSafe: { flex: 1, backgroundColor: T.paper, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 16 },
  ringCard: { padding: 24, alignItems: "center" },
  dayLabel: {
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    color: T.muted,
    marginBottom: 18,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  sinceText: { fontFamily: fonts.mono.regular, fontSize: 12.5, color: T.muted, marginTop: 10 },
  earningsText: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.teal, marginTop: 6 },
  bannerText: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 10, textAlign: "center" },
  branchRow: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: T.line2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: "100%",
    justifyContent: "center",
  },
  branchText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.faint },
  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: { flex: 1, padding: 14 },
  metricLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted, marginBottom: 6 },
  metricValue: { fontFamily: fonts.display.semibold, fontSize: 18, color: T.ink },
  sectionCard: { padding: 20 },
  sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink, marginBottom: 12 },
  emptyText: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  shiftRowBorder: { borderTopWidth: 1, borderTopColor: T.line2 },
  shiftDot: { width: 24, height: 24, borderRadius: 7 },
  shiftDate: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, width: 100 },
  shiftName: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, flex: 1 },
  shiftTime: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.faint },
  leaveCard: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  leaveText: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, flex: 1, flexShrink: 1 },
});
