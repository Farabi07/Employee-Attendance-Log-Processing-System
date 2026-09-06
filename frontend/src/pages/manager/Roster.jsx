import React, { useEffect, useState, useCallback } from "react";
import { Plus, QrCode, Trash2, Pencil, MapPin, Building2, Tag, Maximize2 } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatDayLabel, todayISO } from "../../lib/dates";
import { useIsMobile } from "../../lib/useMediaQuery";
import { useAuth } from "../../lib/auth";
import Card from "../../components/Card";
import LiveQrDisplay from "../../components/LiveQrDisplay";

function dayOfWeekFromDate(isoDate) {
  const jsDay = new Date(`${isoDate}T00:00:00`).getDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun, matching the backend's DayOfWeek
}

const inputStyle = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 8,
  border: `1px solid ${T.line}`,
  fontFamily: fontBody,
  fontSize: 13.5,
  marginBottom: 14,
  background: T.card,
};
const labelStyle = { fontFamily: fontBody, fontSize: 12.5, color: T.muted, display: "block", marginBottom: 6 };
const smallBtn = { border: "none", background: "transparent", cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" };

export default function ManagerRoster() {
  const isMobile = useIsMobile();
  const { isManager, billing } = useAuth();
  const canManageQr = isManager || !!billing?.can_manage_qr;

  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilityByEmployee, setAvailabilityByEmployee] = useState({});

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [shiftId, setShiftId] = useState("");
  const [assignMsg, setAssignMsg] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftName, setShiftName] = useState("Morning");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [shiftBranchId, setShiftBranchId] = useState("");
  const [creatingShift, setCreatingShift] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [editShift, setEditShift] = useState({ name: "", start_time: "", end_time: "" });

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [leaveTypeName, setLeaveTypeName] = useState("");
  const [leaveTypeDays, setLeaveTypeDays] = useState("");
  const [creatingLeaveType, setCreatingLeaveType] = useState(false);

  const [qrBranchId, setQrBranchId] = useState("");
  const [showLiveQr, setShowLiveQr] = useState(false);
  const [geoLat, setGeoLat] = useState("");
  const [geoLon, setGeoLon] = useState("");
  const [geoRadius, setGeoRadius] = useState("");
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [geoMsg, setGeoMsg] = useState(null);

  const load = useCallback(async () => {
    const [empRes, shiftRes, branchRes, leaveTypeRes, rosterRes, availabilityRes] = await Promise.all([
      api.get(endpoints.employeesAll()),
      api.get(endpoints.shiftsAll()),
      api.get(endpoints.branchesAll()),
      api.get(endpoints.leaveTypesAll()),
      api.get(endpoints.rosterAll("?size=50")),
      api.get(endpoints.availabilityAll()),
    ]);
    const emps = empRes.employees || [];
    const shiftList = shiftRes.shifts || [];
    const branchList = branchRes.branches || [];

    setEmployees(emps);
    setShifts(shiftList);
    setBranches(branchList);
    setLeaveTypes(leaveTypeRes.leave_types || []);
    setAssignments((rosterRes.rosters || []).filter((r) => r.date >= todayISO()).sort((a, b) => a.date.localeCompare(b.date)));

    const availByEmp = {};
    for (const row of availabilityRes.availability || []) {
      const empId = row.employee?.id;
      if (!empId) continue;
      (availByEmp[empId] ||= {})[row.day_of_week] = row;
    }
    setAvailabilityByEmployee(availByEmp);

    if (emps.length && !employeeId) setEmployeeId(String(emps[0].id));
    if (shiftList.length && !shiftId) setShiftId(String(shiftList[0].id));
    if (branchList.length) {
      if (!shiftBranchId) setShiftBranchId(String(branchList[0].id));
      if (!qrBranchId) setQrBranchId(String(branchList[0].id));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const assign = async (e) => {
    e.preventDefault();
    setAssignMsg(null);
    if (!employeeId || !shiftId || !date) {
      setAssignMsg({ type: "error", text: "Pick an employee, date and shift." });
      return;
    }
    setAssigning(true);
    try {
      await api.post(endpoints.rosterCreate(), { employee: Number(employeeId), shift: Number(shiftId), date });
      setAssignMsg({ type: "success", text: "Shift assigned." });
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setAssigning(false);
    }
  };

  const createShift = async (e) => {
    e.preventDefault();
    setCreatingShift(true);
    try {
      await api.post(endpoints.shiftCreate(), {
        name: shiftName,
        start_time: `${shiftStart}:00`,
        end_time: `${shiftEnd}:00`,
        branch: shiftBranchId ? Number(shiftBranchId) : null,
        grace_minutes: 15,
      });
      setShowShiftForm(false);
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setCreatingShift(false);
    }
  };

  const startEditShift = (s) => {
    setEditingShiftId(s.id);
    setEditShift({ name: s.name, start_time: s.start_time?.slice(0, 5), end_time: s.end_time?.slice(0, 5) });
  };

  const saveEditShift = async (id) => {
    try {
      await api.put(endpoints.shiftUpdate(id), {
        name: editShift.name,
        start_time: `${editShift.start_time}:00`,
        end_time: `${editShift.end_time}:00`,
      });
      setEditingShiftId(null);
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    }
  };

  const deleteShift = async (id) => {
    if (!window.confirm("Delete this shift? Existing roster assignments referencing it will lose their shift link.")) return;
    try {
      await api.del(endpoints.shiftDelete(id));
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    }
  };

  const createBranch = async (e) => {
    e.preventDefault();
    setCreatingBranch(true);
    try {
      await api.post(endpoints.branchCreate(), { name: branchName });
      setBranchName("");
      setShowBranchForm(false);
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setCreatingBranch(false);
    }
  };

  const createLeaveType = async (e) => {
    e.preventDefault();
    if (!leaveTypeName.trim()) return;
    setCreatingLeaveType(true);
    try {
      await api.post(endpoints.leaveTypeCreate(), { name: leaveTypeName, days_per_year: leaveTypeDays || 0 });
      setLeaveTypeName("");
      setLeaveTypeDays("");
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setCreatingLeaveType(false);
    }
  };

  const deleteLeaveType = async (id) => {
    if (!window.confirm("Delete this leave type?")) return;
    try {
      await api.del(endpoints.leaveTypeDelete(id));
      await load();
    } catch (err) {
      setAssignMsg({ type: "error", text: err.message });
    }
  };

  const loadGeofenceInfo = useCallback(async (branchId) => {
    if (!branchId) return;
    const info = await api.get(endpoints.qrGeofence(branchId)).catch(() => null);
    if (info) {
      setGeoLat(info.latitude ?? "");
      setGeoLon(info.longitude ?? "");
      setGeoRadius(info.allowed_radius_meters ?? "");
    }
  }, []);

  useEffect(() => {
    if (qrBranchId) loadGeofenceInfo(qrBranchId);
  }, [qrBranchId, loadGeofenceInfo]);

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setGeoLat(pos.coords.latitude.toFixed(6));
      setGeoLon(pos.coords.longitude.toFixed(6));
    });
  };

  const saveGeofence = async () => {
    if (!qrBranchId) return;
    setSavingGeofence(true);
    setGeoMsg(null);
    try {
      await api.put(endpoints.qrGeofence(qrBranchId), {
        latitude: geoLat === "" ? null : Number(geoLat),
        longitude: geoLon === "" ? null : Number(geoLon),
        allowed_radius_meters: geoRadius === "" ? null : Number(geoRadius),
      });
      setGeoMsg({ type: "success", text: "Geofence saved." });
    } catch (err) {
      setGeoMsg({ type: "error", text: err.message });
    } finally {
      setSavingGeofence(false);
    }
  };

  if (loading) return <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "320px 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Assign a shift</h3>

          {employees.length === 0 && (
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.coral, marginBottom: 12 }}>No employees found yet.</p>
          )}

          <form onSubmit={assign}>
            <label style={labelStyle}>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} style={inputStyle}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, marginBottom: 6 }} />
            {(() => {
              const day = availabilityByEmployee[employeeId]?.[dayOfWeekFromDate(date)];
              if (!day) return null;
              const hours = day.start_time && day.end_time ? ` (${day.start_time.slice(0, 5)}–${day.end_time.slice(0, 5)})` : "";
              return (
                <p style={{ fontFamily: fontBody, fontSize: 11.5, color: day.is_available ? T.tealDeep : T.coral, margin: "0 0 14px" }}>
                  {day.is_available ? `✓ Usually available${hours}` : "⚠ Marked unavailable this day"}
                </p>
              );
            })()}

            <label style={labelStyle}>Shift</label>
            {shifts.length === 0 ? (
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, marginBottom: 14 }}>
                No shifts yet — create one below first.
              </p>
            ) : (
              <select value={shiftId} onChange={(e) => setShiftId(e.target.value)} style={inputStyle}>
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}
                  </option>
                ))}
              </select>
            )}

            <button
              type="submit"
              disabled={assigning || shifts.length === 0}
              style={{ width: "100%", padding: "11px 0", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: assigning ? 0.7 : 1 }}
            >
              <Plus size={15} /> {assigning ? "Assigning…" : "Assign shift"}
            </button>
            {assignMsg && (
              <p style={{ fontFamily: fontBody, fontSize: 12.5, color: assignMsg.type === "error" ? T.coral : T.teal, marginTop: 10, textAlign: "center" }}>
                {assignMsg.text}
              </p>
            )}
          </form>
        </Card>

        <Card style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: 0 }}>Shifts</h3>
            <button
              onClick={() => setShowShiftForm((v) => !v)}
              style={{ border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {showShiftForm ? "Cancel" : "+ New shift"}
            </button>
          </div>

          {!showShiftForm && (
            <div style={{ marginTop: 12 }}>
              {shifts.map((s) =>
                editingShiftId === s.id ? (
                  <div key={s.id} style={{ padding: "8px 0", borderTop: `1px solid ${T.line2}` }}>
                    <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <input
                        value={editShift.name}
                        onChange={(e) => setEditShift((v) => ({ ...v, name: e.target.value }))}
                        style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12.5 }}
                      />
                      <input
                        type="time"
                        value={editShift.start_time}
                        onChange={(e) => setEditShift((v) => ({ ...v, start_time: e.target.value }))}
                        style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12.5 }}
                      />
                      <input
                        type="time"
                        value={editShift.end_time}
                        onChange={(e) => setEditShift((v) => ({ ...v, end_time: e.target.value }))}
                        style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${T.line}`, fontSize: 12.5 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => saveEditShift(s.id)} style={{ ...smallBtn, background: T.teal, color: "#fff", borderRadius: 6, padding: "5px 10px", fontSize: 12 }}>
                        Save
                      </button>
                      <button onClick={() => setEditingShiftId(null)} style={{ ...smallBtn, border: `1px solid ${T.line}`, borderRadius: 6, padding: "5px 10px", fontSize: 12 }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", padding: "6px 0", borderTop: `1px solid ${T.line2}` }}>
                    <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, margin: 0, flex: 1 }}>
                      {s.name} <span style={{ fontFamily: fontMono, color: T.muted, fontSize: 12 }}>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</span>
                    </p>
                    <button onClick={() => startEditShift(s)} style={smallBtn} aria-label="Edit shift">
                      <Pencil size={13} color={T.muted} />
                    </button>
                    <button onClick={() => deleteShift(s.id)} style={smallBtn} aria-label="Delete shift">
                      <Trash2 size={13} color={T.coral} />
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {showShiftForm && (
            <form onSubmit={createShift} style={{ marginTop: 14 }}>
              <label style={labelStyle}>Name</label>
              <input value={shiftName} onChange={(e) => setShiftName(e.target.value)} style={inputStyle} />
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start</label>
                  <input type="time" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End</label>
                  <input type="time" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <label style={labelStyle}>Branch</label>
              <select value={shiftBranchId} onChange={(e) => setShiftBranchId(e.target.value)} style={inputStyle}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={creatingShift}
                style={{ width: "100%", padding: "10px 0", borderRadius: 9, border: "none", background: T.teal, color: "#fff", fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                {creatingShift ? "Creating…" : "Create shift"}
              </button>
            </form>
          )}
        </Card>

        <Card style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: 0, display: "flex", alignItems: "center", gap: 7 }}>
              <Building2 size={15} /> Branches
            </h3>
            <button
              onClick={() => setShowBranchForm((v) => !v)}
              style={{ border: "none", background: "transparent", color: T.teal, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {showBranchForm ? "Cancel" : "+ New branch"}
            </button>
          </div>

          {!showBranchForm ? (
            <div style={{ marginTop: 12 }}>
              {branches.map((b) => (
                <p key={b.id} style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, margin: "6px 0" }}>{b.name}</p>
              ))}
            </div>
          ) : (
            <form onSubmit={createBranch} style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <input value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Branch name" required style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
              <button type="submit" disabled={creatingBranch} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: T.teal, color: "#fff", fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                {creatingBranch ? "…" : "Add"}
              </button>
            </form>
          )}
        </Card>

        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, color: T.ink, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 7 }}>
            <Tag size={15} /> Leave types
          </h3>
          {leaveTypes.map((lt) => (
            <div key={lt.id} style={{ display: "flex", alignItems: "center", padding: "5px 0" }}>
              <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, margin: 0, flex: 1 }}>{lt.name}</p>
              <span style={{ fontFamily: fontMono, fontSize: 12, color: T.muted, marginRight: 10 }}>
                {lt.days_per_year > 0 ? `${lt.days_per_year} days/yr` : "unlimited"}
              </span>
              <button onClick={() => deleteLeaveType(lt.id)} style={smallBtn} aria-label="Delete leave type">
                <Trash2 size={13} color={T.coral} />
              </button>
            </div>
          ))}
          <form onSubmit={createLeaveType} style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input value={leaveTypeName} onChange={(e) => setLeaveTypeName(e.target.value)} placeholder="e.g. Casual" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
            <input
              type="number" min="0"
              value={leaveTypeDays}
              onChange={(e) => setLeaveTypeDays(e.target.value)}
              placeholder="Days/yr"
              style={{ ...inputStyle, marginBottom: 0, width: 90 }}
            />
            <button type="submit" disabled={creatingLeaveType} style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: T.teal, color: "#fff", fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
              {creatingLeaveType ? "…" : "Add"}
            </button>
          </form>
        </Card>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 16px" }}>Upcoming assignments</h3>
          {assignments.length === 0 && <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: 0 }}>No upcoming assignments.</p>}
          <div style={{ overflowX: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 320 }}>
            {assignments.map((a, i) => (
              <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i === 0 ? "none" : `1px solid ${T.line2}` }}>
                <span style={{ fontFamily: fontBody, fontSize: 13.5, color: T.ink, flex: 1 }}>
                  {a.employee?.first_name} {a.employee?.last_name}
                </span>
                <span style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, width: 130 }}>{formatDayLabel(a.date)}</span>
                <span style={{ fontFamily: fontMono, fontSize: 12, color: T.teal, width: 90, textAlign: "right" }}>{a.shift?.name}</span>
              </div>
            ))}
          </div>
          </div>
        </Card>

        {!canManageQr && (
          <Card style={{ padding: "22px 24px" }}>
            <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 8 }}>
              <QrCode size={17} /> Branch check-in QR &amp; geofence
            </h3>
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: 0 }}>
              Only the store Manager can generate or manage a branch's check-in QR code — ask them to turn this on if you need it.
            </p>
          </Card>
        )}

        {canManageQr && (
        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 8 }}>
            <QrCode size={17} /> Live check-in QR &amp; geofence
          </h3>
          <p style={{ fontFamily: fontBody, fontSize: 12, color: T.muted, margin: "0 0 14px" }}>
            The code refreshes every 30 seconds — display it on a screen at the entrance, don't print it.
          </p>
          <label style={labelStyle}>Branch</label>
          <select value={qrBranchId} onChange={(e) => setQrBranchId(e.target.value)} style={inputStyle}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowLiveQr(true)}
            disabled={!qrBranchId}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.ink, cursor: "pointer" }}
          >
            <Maximize2 size={14} /> Show live QR
          </button>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.line2}` }}>
            <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={13} /> Optional: require check-in within a radius of this branch
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <input placeholder="Latitude" value={geoLat} onChange={(e) => setGeoLat(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
              <input placeholder="Longitude" value={geoLon} onChange={(e) => setGeoLon(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input placeholder="Radius (meters)" value={geoRadius} onChange={(e) => setGeoRadius(e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
              <button type="button" onClick={useMyLocation} style={{ padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.ink, cursor: "pointer", whiteSpace: "nowrap" }}>
                Use my location
              </button>
            </div>
            <button
              onClick={saveGeofence}
              disabled={savingGeofence}
              style={{ padding: "9px 14px", borderRadius: 8, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
            >
              {savingGeofence ? "Saving…" : "Save geofence"}
            </button>
            {geoMsg && (
              <p style={{ fontFamily: fontBody, fontSize: 12, color: geoMsg.type === "error" ? T.coral : T.teal, marginTop: 8 }}>{geoMsg.text}</p>
            )}
            <p style={{ fontFamily: fontBody, fontSize: 11.5, color: T.faint, marginTop: 8 }}>
              Leave all three blank to allow check-in from anywhere.
            </p>
          </div>
        </Card>
        )}
      </div>

      {showLiveQr && qrBranchId && <LiveQrDisplay branchId={qrBranchId} onClose={() => setShowLiveQr(false)} />}
    </div>
  );
}
