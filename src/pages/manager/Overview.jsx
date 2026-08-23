import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatTime, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import StatusPill from "../../components/StatusPill";

function initialsOf(emp) {
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

export default function ManagerOverview() {
  const [employees, setEmployees] = useState([]);
  const [attendanceByEmp, setAttendanceByEmp] = useState({});
  const [leaveEmployeeIds, setLeaveEmployeeIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const today = todayISO();
    Promise.all([
      api.get(endpoints.employeesAll()),
      api.get(endpoints.attendanceSearch(`?date=${today}&size=200`)),
      api.get(endpoints.leaveRequestAll(`?status=approved&size=200`)),
    ]).then(([empRes, attRes, leaveRes]) => {
      setEmployees(empRes.employees || []);

      const map = {};
      for (const a of attRes.attendances || []) {
        if (a.employee?.id) map[a.employee.id] = a;
      }
      setAttendanceByEmp(map);

      const onLeaveIds = new Set(
        (leaveRes.leave_requests || [])
          .filter((l) => l.start_date <= today && today <= l.end_date)
          .map((l) => l.employee?.id)
      );
      setLeaveEmployeeIds(onLeaveIds);
    }).finally(() => setLoading(false));
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
    let checkedIn = 0, onLeave = 0, notIn = 0;
    for (const e of employees) {
      const att = attendanceByEmp[e.id];
      if (att?.check_in_time) checkedIn++;
      else if (leaveEmployeeIds.has(e.id)) onLeave++;
      else notIn++;
    }
    return { checkedIn, onLeave, notIn };
  }, [employees, attendanceByEmp, leaveEmployeeIds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 14 }}>
        {[
          { label: "Team size", value: employees.length, color: T.ink },
          { label: "Checked in today", value: counts.checkedIn, color: T.teal },
          { label: "On leave", value: counts.onLeave, color: T.amber },
          { label: "Not checked in", value: counts.notIn, color: T.coral },
        ].map((m) => (
          <Card key={m.label} style={{ padding: "16px 18px" }}>
            <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>{m.label}</p>
            <p style={{ fontFamily: fontDisplay, fontSize: 24, fontWeight: 600, color: m.color, margin: 0 }}>{m.value}</p>
          </Card>
        ))}
      </div>

      <Card style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: 0 }}>Team attendance · today</h3>
          <div style={{ position: "relative" }}>
            <Search size={14} color={T.faint} style={{ position: "absolute", left: 10, top: 9 }} />
            <input
              placeholder="Search employee"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ padding: "7px 10px 7px 30px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, width: 180 }}
            />
          </div>
        </div>

        {loading ? (
          <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 420 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", padding: "0 4px 10px", borderBottom: `1px solid ${T.line}` }}>
              {["Employee", "Status", "Since"].map((h) => (
                <span key={h} style={{ fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {h}
                </span>
              ))}
            </div>
            {rows.map(({ employee, attendance, display }) => (
              <div key={employee.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", alignItems: "center", padding: "12px 4px", borderBottom: `1px solid ${T.line2}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar initials={initialsOf(employee)} size={32} />
                  <div>
                    <p style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 500, color: T.ink, margin: 0 }}>
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: 0 }}>{employee.email}</p>
                  </div>
                </div>
                <StatusPill status={display} />
                <span style={{ fontFamily: fontMono, fontSize: 12.5, color: T.muted }}>{formatTime(attendance?.check_in_time)}</span>
              </div>
            ))}
          </div>
          </div>
        )}
      </Card>
    </div>
  );
}
