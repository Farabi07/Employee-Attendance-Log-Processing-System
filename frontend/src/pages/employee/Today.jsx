import React, { useEffect, useState, useCallback } from "react";
import { Bell, MapPin } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useIsMobile } from "../../lib/useMediaQuery";
import { formatTime, formatDuration, formatDayLabel, shiftDurationMinutes, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";
import ShiftRing from "../../components/ShiftRing";
import QrScannerModal from "../../components/QrScannerModal";

function getLocation(timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This device doesn't support location — check-in requires it."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location access was denied. Enable it in your browser/device settings and try again."));
        } else {
          reject(new Error("Couldn't get your location. Move to an open area and try again."));
        }
      },
      { timeout: timeoutMs, maximumAge: 0, enableHighAccuracy: true }
    );
  });
}

const SHIFT_META = {
  Morning: { color: T.amber, bg: T.amberBg },
  Evening: { color: T.teal, bg: T.tealBg },
  Night: { color: T.ink, bg: T.line2 },
};

function shiftMeta(name) {
  return SHIFT_META[name] || { color: T.muted, bg: T.line2 };
}

export default function EmployeeToday() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [attendance, setAttendance] = useState(undefined); // undefined = loading
  const [rosterToday, setRosterToday] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [weekHours, setWeekHours] = useState(0);
  const [monthHours, setMonthHours] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(null);
  const [scanMode, setScanMode] = useState(null); // "checkin" | "checkout" | null
  const [locating, setLocating] = useState(false);
  const [location, setLocation] = useState(null);
  const [banner, setBanner] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    const [att, rosterRes, attHistoryRes, leaveRes] = await Promise.all([
      api.get(endpoints.today()),
      api.get(endpoints.rosterByEmployee(user.id, "?size=100")),
      api.get(endpoints.attendanceByEmployee(user.id, "?size=100")),
      api.get(endpoints.leaveRequestByEmployee(user.id, "?size=100")),
    ]);

    setAttendance(att);

    const today = todayISO();
    const rosters = rosterRes.rosters || [];
    setRosterToday(rosters.find((r) => r.date === today) || null);
    setUpcoming(
      rosters
        .filter((r) => r.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 5)
    );

    const attendances = attHistoryRes.attendances || [];
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const sum = (from) =>
      attendances
        .filter((a) => new Date(a.date) >= from && a.worked_hours)
        .reduce((s, a) => s + Number(a.worked_hours), 0);

    setWeekHours(sum(startOfWeek));
    setMonthHours(sum(startOfMonth));

    const leaves = leaveRes.leave_requests || [];
    setPendingLeave(leaves.find((l) => l.status === "pending") || null);
  }, [user.id]);

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
    return <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>;
  }

  const checkedIn = !!(attendance && attendance.check_in_time && !attendance.check_out_time);
  const completed = !!(attendance && attendance.check_in_time && attendance.check_out_time);

  const targetMinutes = shiftDurationMinutes(rosterToday?.shift);
  let elapsedMinutes = 0;
  if (checkedIn) {
    elapsedMinutes = (now - new Date(attendance.check_in_time)) / 60000;
  } else if (completed) {
    elapsedMinutes = (new Date(attendance.check_out_time) - new Date(attendance.check_in_time)) / 60000;
  }

  const ringLabel = completed ? "Day complete" : undefined;

  // GPS is checked first — the camera only opens once we have a location,
  // so a scan can never even start from outside the office if location
  // access fails or is denied.
  const startCheck = async (action) => {
    setBanner(null);
    setLocating(true);
    try {
      const loc = await getLocation();
      setLocation(loc);
      setScanMode(action);
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    } finally {
      setLocating(false);
    }
  };

  const handleToken = async (code) => {
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
    } catch (err) {
      setBanner({ type: "error", text: err.message });
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "300px 1fr", gap: 20 }}>
      <Card style={{ padding: "28px 20px", textAlign: "center" }}>
        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 18px", textTransform: "uppercase", letterSpacing: 0.4 }}>
          {formatDayLabel(todayISO())}
        </p>
        <ShiftRing
          checkedIn={checkedIn || completed}
          elapsedMinutes={elapsedMinutes}
          targetMinutes={targetMinutes}
          onScan={() => startCheck(checkedIn ? "checkout" : "checkin")}
          disabled={completed || locating}
          label={locating ? "Checking location…" : ringLabel}
        />
        <div style={{ marginTop: 20 }}>
          <StatusPill status={completed ? attendance.status : checkedIn ? "in" : "out"} />
        </div>
        {(checkedIn || completed) && (
          <p style={{ fontFamily: fontMono, fontSize: 12.5, color: T.muted, marginTop: 10 }}>
            since {formatTime(attendance.check_in_time)}
            {completed && ` · out ${formatTime(attendance.check_out_time)}`}
          </p>
        )}
        {completed && attendance.earnings !== null && attendance.earnings !== undefined && (
          <p style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.teal, marginTop: 6 }}>
            Earned today: {attendance.earnings}
          </p>
        )}
        {banner && (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: banner.type === "error" ? T.coral : T.teal, marginTop: 10 }}>
            {banner.text}
          </p>
        )}
        <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${T.line2}`, display: "flex", justifyContent: "center", gap: 6, alignItems: "center" }}>
          <MapPin size={13} color={T.faint} />
          <span style={{ fontFamily: fontBody, fontSize: 12, color: T.faint }}>
            {attendance?.branch?.name || "Branch is set when you check in"}
          </span>
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 14 }}>
          {[
            { label: "This week", value: formatDuration(weekHours) },
            { label: "This month", value: formatDuration(monthHours) },
            { label: "Pending leave", value: pendingLeave ? "1 request" : "None" },
          ].map((m) => (
            <Card key={m.label} style={{ padding: "16px 18px" }}>
              <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 6px" }}>{m.label}</p>
              <p style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 600, color: T.ink, margin: 0 }}>{m.value}</p>
            </Card>
          ))}
        </div>

        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: 0 }}>Upcoming shifts</h3>
          </div>
          {upcoming.length === 0 && (
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No shifts assigned yet.</p>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {upcoming.map((r, i) => {
              const meta = shiftMeta(r.shift?.name);
              return (
                <div
                  key={r.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i === 0 ? "none" : `1px solid ${T.line2}` }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: meta.bg, flexShrink: 0 }} />
                  <span style={{ fontFamily: fontBody, fontSize: 13.5, color: T.ink, width: 130, flexShrink: 0 }}>{formatDayLabel(r.date)}</span>
                  <span style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, flex: 1 }}>{r.shift?.name || "Shift"}</span>
                  <span style={{ fontFamily: fontMono, fontSize: 12.5, color: T.faint }}>
                    {r.shift?.start_time?.slice(0, 5)}–{r.shift?.end_time?.slice(0, 5)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {pendingLeave && (
          <Card style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 12 }}>
            <Bell size={16} color={T.amber} strokeWidth={1.8} />
            <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, margin: 0 }}>
              Your {pendingLeave.leave_type?.name?.toLowerCase() || "leave"} request ({pendingLeave.start_date} – {pendingLeave.end_date}) is
              awaiting manager approval.
            </p>
          </Card>
        )}
      </div>

      {scanMode && (
        <QrScannerModal
          title={scanMode === "checkin" ? "Scan to check in" : "Scan to check out"}
          onClose={() => setScanMode(null)}
          onToken={handleToken}
        />
      )}
    </div>
  );
}
