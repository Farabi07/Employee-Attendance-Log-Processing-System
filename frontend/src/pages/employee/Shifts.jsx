import React, { useEffect, useState } from "react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { weekDates, formatDayLabel } from "../../lib/dates";
import Card from "../../components/Card";

export default function EmployeeShifts() {
  const { user } = useAuth();
  const [rosters, setRosters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(endpoints.rosterByEmployee(user.id, "?size=100"))
      .then((res) => setRosters(res.rosters || []))
      .finally(() => setLoading(false));
  }, [user.id]);

  const days = weekDates();
  const byDate = Object.fromEntries(rosters.map((r) => [r.date, r]));

  return (
    <Card style={{ padding: "24px 26px" }}>
      <h3 style={{ fontFamily: fontDisplay, fontSize: 16.5, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>This week</h3>
      <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 22px" }}>
        {formatDayLabel(days[0])} – {formatDayLabel(days[6])} · assigned by your manager
      </p>
      {loading ? (
        <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(100px, 1fr))", gap: 10 }}>
          {days.map((date) => {
            const roster = byDate[date];
            const shift = roster?.shift;
            return (
              <div
                key={date}
                style={{
                  border: `1px solid ${T.line}`,
                  borderRadius: 12,
                  padding: "14px 10px",
                  textAlign: "center",
                  background: shift ? T.tealBg : T.paper,
                }}
              >
                <p style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.muted, margin: "0 0 10px" }}>
                  {formatDayLabel(date).split(" ")[0]}
                </p>
                {shift ? (
                  <>
                    <p style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.ink, margin: "8px 0 2px" }}>{shift.name}</p>
                    <p style={{ fontFamily: fontMono, fontSize: 10.5, color: T.muted, margin: 0 }}>
                      {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                    </p>
                  </>
                ) : (
                  <p style={{ fontFamily: fontBody, fontSize: 12, color: T.faint, margin: "14px 0 0" }}>Off</p>
                )}
              </div>
            );
          })}
        </div>
        </div>
      )}
    </Card>
  );
}
