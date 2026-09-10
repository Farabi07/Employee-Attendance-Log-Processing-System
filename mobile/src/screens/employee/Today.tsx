import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bell, MapPin, Clock, CalendarDays, AlertCircle, CalendarClock } from "lucide-react-native";
import { fonts } from "../../theme";
import { useTheme } from "../../lib/ThemeContext";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { getLocation } from "../../lib/geolocation";
import { formatTime, formatDuration, formatDayLabel, shiftDurationMinutes, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import ShiftRing from "../../components/ShiftRing";
import QrScannerModal from "../../components/QrScannerModal";
import Skeleton from "../../components/Skeleton";
import EmptyState from "../../components/EmptyState";
import { useToast } from "../../components/Toast";

// Ported from frontend/src/pages/employee/Today.jsx. The web version's
// isMobile grid-vs-sidebar layout switch doesn't apply here — a phone
// screen is always the "mobile" layout, so this is just one scrollable
// column. Everything else (GPS-first-then-camera check-in orchestration,
// week/month hour totals, upcoming shifts, pending-leave banner) ports
// as-is.
function shiftMeta(name: string | undefined, T: ReturnType<typeof useTheme>) {
  const map: Record<string, { color: string; bg: string }> = {
    Morning: { color: T.amber, bg: T.amberBg },
    Evening: { color: T.teal, bg: T.tealBg },
    Night: { color: T.ink, bg: T.line2 },
  };
  return (name && map[name]) || { color: T.muted, bg: T.line2 };
}

export default function Today() {
  const { user } = useAuth();
  const toast = useToast();
  const T = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: T.paper },
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
        metricIconPill: {
          width: 28,
          height: 28,
          borderRadius: 9,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        },
        metricLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted, marginBottom: 6 },
        metricValue: { fontFamily: fonts.display.semibold, fontSize: 18, color: T.ink },
        sectionCard: { padding: 20 },
        sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
        sectionTitle: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink },
        shiftRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
        shiftRowBorder: { borderTopWidth: 1, borderTopColor: T.line2 },
        shiftChip: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
        shiftDate: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, width: 100 },
        shiftName: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, flex: 1 },
        shiftTime: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.faint },
        leaveCard: { padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
        leaveText: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, flex: 1, flexShrink: 1 },
      }),
    [T]
  );
  const [attendance, setAttendance] = useState<any>(undefined); // undefined = loading
  const [rosterToday, setRosterToday] = useState<any>(null);
  const [upcoming, setUpcoming] = useState<any[]>([]);
  const [weekHours, setWeekHours] = useState(0);
  const [monthHours, setMonthHours] = useState(0);
  const [pendingLeave, setPendingLeave] = useState<any>(null);
  const [scanMode, setScanMode] = useState<"checkin" | "checkout" | null>(null);
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (attendance && attendance.check_in_time && !attendance.check_out_time) {
      const id = setInterval(() => setNow(Date.now()), 30000);
      return () => clearInterval(id);
    }
  }, [attendance]);

  if (attendance === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={false}>
          <Card style={[styles.ringCard, { backgroundColor: T.navyBg }]}>
            <Skeleton width={90} height={11} radius={4} style={{ marginBottom: 18 }} />
            <Skeleton width={176} height={176} radius={88} />
            <Skeleton width={80} height={20} radius={10} style={{ marginTop: 20 }} />
          </Card>
          <View style={styles.metricsRow}>
            {[0, 1, 2].map((i) => (
              <Card key={i} style={styles.metricCard}>
                <Skeleton width={28} height={28} radius={9} style={{ marginBottom: 10 }} />
                <Skeleton width={60} height={11} radius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={44} height={16} radius={4} />
              </Card>
            ))}
          </View>
          <Card style={styles.sectionCard}>
            <Skeleton width={130} height={15} radius={4} style={{ marginBottom: 16 }} />
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.shiftRow, i > 0 && styles.shiftRowBorder]}>
                <Skeleton width={26} height={26} radius={8} />
                <Skeleton width={70} height={12} radius={4} style={{ marginLeft: 10 }} />
                <Skeleton width={90} height={12} radius={4} style={{ marginLeft: 10, flex: 1 }} />
              </View>
            ))}
          </Card>
        </ScrollView>
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
    setLocating(true);
    try {
      const loc = await getLocation();
      setLocation(loc);
      setScanMode(action);
    } catch (err: any) {
      toast.show(err.message, "error");
    } finally {
      setLocating(false);
    }
  };

  const handleToken = async (code: string) => {
    const action = scanMode;
    setScanMode(null);
    try {
      const payload = location ? { code, lat: location.lat, lon: location.lon } : { code };

      if (action === "checkin") {
        await api.post(endpoints.checkin(), payload);
        toast.show("Checked in successfully.");
      } else {
        await api.post(endpoints.checkout(), payload);
        toast.show("Checked out successfully.");
      }
      await load();
    } catch (err: any) {
      toast.show(err.message, "error");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.teal} colors={[T.teal]} />}
      >
        <Card style={[styles.ringCard, { backgroundColor: T.navyBg }]}>
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
          <View style={styles.branchRow}>
            <MapPin size={13} color={T.faint} />
            <Text style={styles.branchText}>{attendance?.branch?.name || "Branch is set when you check in"}</Text>
          </View>
        </Card>

        <View style={styles.metricsRow}>
          {[
            { label: "This week", value: formatDuration(weekHours), icon: Clock, color: T.tealDeep, bg: T.tealBg },
            { label: "This month", value: formatDuration(monthHours), icon: CalendarDays, color: T.tealDeep, bg: T.tealBg },
            {
              label: "Pending leave",
              value: pendingLeave ? "1 request" : "None",
              icon: AlertCircle,
              color: pendingLeave ? T.amber : T.tealDeep,
              bg: pendingLeave ? T.amberBg : T.tealBg,
            },
          ].map((m) => (
            <Card key={m.label} style={styles.metricCard}>
              <View style={[styles.metricIconPill, { backgroundColor: m.bg }]}>
                <m.icon size={15} color={m.color} strokeWidth={2} />
              </View>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricValue}>{m.value}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <CalendarClock size={16} color={T.tealDeep} strokeWidth={2} />
            <Text style={styles.sectionTitle}>Upcoming shifts</Text>
          </View>
          {upcoming.length === 0 && (
            <EmptyState icon={CalendarClock} title="No shifts assigned yet" subtitle="Your manager hasn't scheduled anything for you yet." />
          )}
          {upcoming.map((r, i) => {
            const meta = shiftMeta(r.shift?.name, T);
            return (
              <View key={r.id} style={[styles.shiftRow, i > 0 && styles.shiftRowBorder]}>
                <View style={[styles.shiftChip, { backgroundColor: meta.color }]}>
                  <CalendarDays size={13} color="#fff" strokeWidth={2.2} />
                </View>
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
