import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Download, FileText, FileSpreadsheet, UserX } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api, downloadFile } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { weekDates, formatDayLabel, formatDuration, todayISO } from "../../lib/dates";

import Card from "../../components/Card";

function daysBetweenInclusive(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000) + 1;
}

function overlapDays(start, end, rangeFrom, rangeTo) {
  const s = start > rangeFrom ? start : rangeFrom;
  const e = end < rangeTo ? end : rangeTo;
  if (s > e) return 0;
  return daysBetweenInclusive(s, e);
}

export default function ManagerReports() {
  const defaultWeek = weekDates();
  const [dateFrom, setDateFrom] = useState(defaultWeek[0]);
  const [dateTo, setDateTo] = useState(defaultWeek[6]);
  const [attendances, setAttendances] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null); // "pdf" | "excel" | null

  const [absentDate, setAbsentDate] = useState(todayISO());
  const [absentBusy, setAbsentBusy] = useState(false);
  const [absentMsg, setAbsentMsg] = useState(null);

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
    const byEmployee = {};
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

  const exportCsv = () => {
    const header = ["Employee", "Days present", "Hours worked", "Leave days"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push([r.name, r.days, formatDuration(r.hours), r.leaveDays].map((v) => `"${v}"`).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report_${dateFrom}_to_${dateTo}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportServer = async (kind) => {
    setExporting(kind);
    try {
      const params = `?date_from=${dateFrom}&date_to=${dateTo}`;
      if (kind === "pdf") {
        await downloadFile(endpoints.exportPdf(params), `attendance-report_${dateFrom}_to_${dateTo}.pdf`);
      } else {
        await downloadFile(endpoints.exportExcel(params), `attendance-report_${dateFrom}_to_${dateTo}.xlsx`);
      }
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
    } catch (err) {
      setAbsentMsg({ type: "error", text: err.message });
    } finally {
      setAbsentBusy(false);
    }
  };

  const exportBtnStyle = { display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9, border: `1px solid ${T.navyBg}`, background: T.navyBg, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.navyDeep, cursor: "pointer" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>Attendance report</h3>
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>
              {formatDayLabel(dateFrom)} – {formatDayLabel(dateTo)}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }} />
            <span style={{ color: T.muted, fontSize: 12 }}>to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          <button onClick={exportCsv} disabled={rows.length === 0} style={exportBtnStyle}>
            <Download size={14} /> CSV
          </button>
          <button onClick={() => exportServer("pdf")} disabled={exporting !== null} style={exportBtnStyle}>
            <FileText size={14} /> {exporting === "pdf" ? "Preparing…" : "PDF"}
          </button>
          <button onClick={() => exportServer("excel")} disabled={exporting !== null} style={exportBtnStyle}>
            <FileSpreadsheet size={14} /> {exporting === "excel" ? "Preparing…" : "Excel"}
          </button>
        </div>

        {loading ? (
          <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
        ) : rows.length === 0 ? (
          <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No attendance or leave records in this range.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 480 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", padding: "0 4px 10px", borderBottom: `1px solid ${T.line}` }}>
              {["Employee", "Days present", "Hours worked", "Leave days"].map((h) => (
                <span key={h} style={{ fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, color: T.faint, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {h}
                </span>
              ))}
            </div>
            {rows.map((r) => (
              <div key={r.name} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", alignItems: "center", padding: "12px 4px", borderBottom: `1px solid ${T.line2}` }}>
                <span style={{ fontFamily: fontBody, fontSize: 13.5, color: T.ink }}>{r.name}</span>
                <span style={{ fontFamily: fontMono, fontSize: 13, color: T.muted }}>{r.days} / {totalDays}</span>
                <span style={{ fontFamily: fontMono, fontSize: 13, color: T.muted }}>{formatDuration(r.hours)}</span>
                <span style={{ fontFamily: fontMono, fontSize: 13, color: r.leaveDays ? T.amber : T.faint }}>{r.leaveDays}</span>
              </div>
            ))}
          </div>
          </div>
        )}
      </Card>

      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
          <UserX size={16} /> Mark absentees
        </h3>
        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 14px" }}>
          Anyone rostered on this date with no attendance record gets marked absent (or on leave, if approved leave covers it).
          Runs automatically once a day if cron is set up on the server — use this to run it by hand.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input type="date" value={absentDate} onChange={(e) => setAbsentDate(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5 }} />
          <button onClick={runAbsenteeCheck} disabled={absentBusy} style={exportBtnStyle}>
            {absentBusy ? "Running…" : "Run check"}
          </button>
        </div>
        {absentMsg && (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: absentMsg.type === "error" ? T.coral : T.teal, marginTop: 10 }}>{absentMsg.text}</p>
        )}
      </Card>
    </div>
  );
}
