import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { T, fonts } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { weekDates, formatDayLabel } from "../../lib/dates";
import Card from "../../components/Card";

// Ported from frontend/src/pages/employee/Shifts.jsx. The web version's
// 7-column CSS grid (with an overflowX:auto fallback for narrow viewports)
// becomes a horizontal ScrollView here — a phone screen never has room for
// 7 columns at once, so this is always the "narrow" case.
export default function Shifts() {
  const { user } = useAuth();
  const [rosters, setRosters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(endpoints.rosterByEmployee(user!.id, "?size=100"))
      .then((res) => setRosters(res.rosters || []))
      .finally(() => setLoading(false));
  }, [user!.id]);

  const days = weekDates();
  const byDate = Object.fromEntries(rosters.map((r) => [r.date, r]));

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={styles.title}>This week</Text>
          <Text style={styles.subtitle}>
            {formatDayLabel(days[0])} – {formatDayLabel(days[6])} · assigned by your manager
          </Text>
          {loading ? (
            <ActivityIndicator color={T.navy} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {days.map((date) => {
                const roster = byDate[date];
                const shift = roster?.shift;
                return (
                  <View key={date} style={[styles.dayCard, { backgroundColor: shift ? T.tealBg : T.paper }]}>
                    <Text style={styles.dayLabel}>{formatDayLabel(date).split(" ")[0]}</Text>
                    {shift ? (
                      <>
                        <Text style={styles.shiftName}>{shift.name}</Text>
                        <Text style={styles.shiftTime}>
                          {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.offLabel}>Off</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  container: { flex: 1, padding: 16 },
  card: { padding: 20 },
  title: { fontFamily: fonts.display.semibold, fontSize: 16.5, color: T.ink, marginBottom: 4 },
  subtitle: { fontFamily: fonts.body.regular, fontSize: 13, color: T.muted, marginBottom: 20 },
  row: { gap: 10 },
  dayCard: {
    width: 96,
    borderWidth: 1,
    borderColor: T.line,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  dayLabel: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.muted, marginBottom: 10 },
  shiftName: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink, marginTop: 8, marginBottom: 2, textAlign: "center" },
  shiftTime: { fontFamily: fonts.mono.regular, fontSize: 10.5, color: T.muted },
  offLabel: { fontFamily: fonts.body.regular, fontSize: 12, color: T.faint, marginTop: 14 },
});
