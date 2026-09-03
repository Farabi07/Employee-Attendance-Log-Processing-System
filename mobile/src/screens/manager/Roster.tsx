import React, { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Plus, QrCode, Trash2, Pencil, MapPin, Building2, Tag, Maximize2 } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { formatDayLabel, todayISO } from "../../lib/dates";
import { useAuth } from "../../lib/auth";
import { getLocation } from "../../lib/geolocation";
import Card from "../../components/Card";
import FormField from "../../components/FormField";
import DateField from "../../components/DateField";
import TimeField from "../../components/TimeField";
import InlinePicker from "../../components/InlinePicker";
import { PrimaryButton } from "../../components/Button";
import LiveQrDisplay from "../../components/LiveQrDisplay";

// Ported from frontend/src/pages/manager/Roster.jsx. `window.confirm` for
// shift/leave-type deletion becomes `Alert.alert` with a destructive
// confirm action. LiveQrDisplay is imported as its own RN port (see
// components/LiveQrDisplay.tsx — the plan's hardest single-component port).
export default function Roster() {
  const { isManager, billing } = useAuth();
  const canManageQr = isManager || !!billing?.can_manage_qr;

  const [employees, setEmployees] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [shiftId, setShiftId] = useState("");
  const [assignMsg, setAssignMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [showShiftForm, setShowShiftForm] = useState(false);
  const [shiftName, setShiftName] = useState("Morning");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [shiftBranchId, setShiftBranchId] = useState("");
  const [creatingShift, setCreatingShift] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<number | null>(null);
  const [editShift, setEditShift] = useState({ name: "", start_time: "", end_time: "" });

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchName, setBranchName] = useState("");
  const [creatingBranch, setCreatingBranch] = useState(false);

  const [leaveTypeName, setLeaveTypeName] = useState("");
  const [creatingLeaveType, setCreatingLeaveType] = useState(false);

  const [qrBranchId, setQrBranchId] = useState("");
  const [showLiveQr, setShowLiveQr] = useState(false);
  const [geoLat, setGeoLat] = useState("");
  const [geoLon, setGeoLon] = useState("");
  const [geoRadius, setGeoRadius] = useState("");
  const [savingGeofence, setSavingGeofence] = useState(false);
  const [geoMsg, setGeoMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    const [empRes, shiftRes, branchRes, leaveTypeRes, rosterRes] = await Promise.all([
      api.get(endpoints.employeesAll()),
      api.get(endpoints.shiftsAll()),
      api.get(endpoints.branchesAll()),
      api.get(endpoints.leaveTypesAll()),
      api.get(endpoints.rosterAll("?size=50")),
    ]);
    const emps = empRes.employees || [];
    const shiftList = shiftRes.shifts || [];
    const branchList = branchRes.branches || [];

    setEmployees(emps);
    setShifts(shiftList);
    setBranches(branchList);
    setLeaveTypes(leaveTypeRes.leave_types || []);
    setAssignments((rosterRes.rosters || []).filter((r: any) => r.date >= todayISO()).sort((a: any, b: any) => a.date.localeCompare(b.date)));

    setEmployeeId((cur) => cur || (emps.length ? String(emps[0].id) : ""));
    setShiftId((cur) => cur || (shiftList.length ? String(shiftList[0].id) : ""));
    if (branchList.length) {
      setShiftBranchId((cur) => cur || String(branchList[0].id));
      setQrBranchId((cur) => cur || String(branchList[0].id));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const assign = async () => {
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
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setAssigning(false);
    }
  };

  const createShift = async () => {
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
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setCreatingShift(false);
    }
  };

  const startEditShift = (s: any) => {
    setEditingShiftId(s.id);
    setEditShift({ name: s.name, start_time: s.start_time?.slice(0, 5), end_time: s.end_time?.slice(0, 5) });
  };

  const saveEditShift = async (id: number) => {
    try {
      await api.put(endpoints.shiftUpdate(id), {
        name: editShift.name,
        start_time: `${editShift.start_time}:00`,
        end_time: `${editShift.end_time}:00`,
      });
      setEditingShiftId(null);
      await load();
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err.message });
    }
  };

  const deleteShift = (id: number) => {
    Alert.alert("Delete this shift?", "Existing roster assignments referencing it will lose their shift link.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(endpoints.shiftDelete(id));
            await load();
          } catch (err: any) {
            setAssignMsg({ type: "error", text: err.message });
          }
        },
      },
    ]);
  };

  const createBranch = async () => {
    setCreatingBranch(true);
    try {
      await api.post(endpoints.branchCreate(), { name: branchName });
      setBranchName("");
      setShowBranchForm(false);
      await load();
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setCreatingBranch(false);
    }
  };

  const createLeaveType = async () => {
    if (!leaveTypeName.trim()) return;
    setCreatingLeaveType(true);
    try {
      await api.post(endpoints.leaveTypeCreate(), { name: leaveTypeName });
      setLeaveTypeName("");
      await load();
    } catch (err: any) {
      setAssignMsg({ type: "error", text: err.message });
    } finally {
      setCreatingLeaveType(false);
    }
  };

  const deleteLeaveType = (id: number) => {
    Alert.alert("Delete this leave type?", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(endpoints.leaveTypeDelete(id));
            await load();
          } catch (err: any) {
            setAssignMsg({ type: "error", text: err.message });
          }
        },
      },
    ]);
  };

  const loadGeofenceInfo = useCallback(async (branchId: string) => {
    if (!branchId) return;
    const info = await api.get(endpoints.qrGeofence(branchId)).catch(() => null);
    if (info) {
      setGeoLat(info.latitude != null ? String(info.latitude) : "");
      setGeoLon(info.longitude != null ? String(info.longitude) : "");
      setGeoRadius(info.allowed_radius_meters != null ? String(info.allowed_radius_meters) : "");
    }
  }, []);

  useEffect(() => {
    if (qrBranchId) loadGeofenceInfo(qrBranchId);
  }, [qrBranchId, loadGeofenceInfo]);

  const useMyLocation = async () => {
    try {
      const loc = await getLocation();
      setGeoLat(loc.lat.toFixed(6));
      setGeoLon(loc.lon.toFixed(6));
    } catch (err: any) {
      setGeoMsg({ type: "error", text: err.message });
    }
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
    } catch (err: any) {
      setGeoMsg({ type: "error", text: err.message });
    } finally {
      setSavingGeofence(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingSafe} edges={[]}>
        <ActivityIndicator color={T.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Assign a shift</Text>
          {employees.length === 0 && <Text style={styles.errorText}>No employees found yet.</Text>}

          <Text style={styles.label}>Employee</Text>
          <InlinePicker
            selectedValue={employeeId}
            onValueChange={setEmployeeId}
            items={employees.map((e) => ({ value: String(e.id), label: `${e.first_name} ${e.last_name}` }))}
            style={{ marginBottom: 14 }}
          />

          <DateField label="Date" value={date} onChange={setDate} />

          <View style={{ marginTop: 14, marginBottom: 14 }}>
            <Text style={styles.label}>Shift</Text>
            {shifts.length === 0 ? (
              <Text style={styles.bodyMuted}>No shifts yet — create one below first.</Text>
            ) : (
              <InlinePicker
                selectedValue={shiftId}
                onValueChange={setShiftId}
                items={shifts.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.start_time?.slice(0, 5)}–${s.end_time?.slice(0, 5)}` }))}
              />
            )}
          </View>

          <PrimaryButton title={assigning ? "Assigning…" : "Assign shift"} onPress={assign} loading={assigning} disabled={shifts.length === 0} />
          {assignMsg && (
            <Text style={[styles.messageText, { color: assignMsg.type === "error" ? T.coral : T.teal }]}>{assignMsg.text}</Text>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.rowHeader}>
            <Text style={styles.cardTitle}>Shifts</Text>
            <Pressable onPress={() => setShowShiftForm((v) => !v)}>
              <Text style={styles.linkText}>{showShiftForm ? "Cancel" : "+ New shift"}</Text>
            </Pressable>
          </View>

          {!showShiftForm &&
            shifts.map((s) =>
              editingShiftId === s.id ? (
                <View key={s.id} style={styles.shiftEditRow}>
                  <View style={styles.shiftEditFields}>
                    <TextInput
                      value={editShift.name}
                      onChangeText={(v) => setEditShift((cur) => ({ ...cur, name: v }))}
                      style={styles.compactInput}
                    />
                    <TimeField value={editShift.start_time} onChange={(v) => setEditShift((cur) => ({ ...cur, start_time: v }))} />
                    <TimeField value={editShift.end_time} onChange={(v) => setEditShift((cur) => ({ ...cur, end_time: v }))} />
                  </View>
                  <View style={styles.shiftEditActions}>
                    <Pressable onPress={() => saveEditShift(s.id)} style={styles.smallSaveButton}>
                      <Text style={styles.smallSaveButtonText}>Save</Text>
                    </Pressable>
                    <Pressable onPress={() => setEditingShiftId(null)} style={styles.smallCancelButton}>
                      <Text style={styles.smallCancelButtonText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View key={s.id} style={styles.shiftRow}>
                  <Text style={styles.shiftText}>
                    {s.name} <Text style={styles.shiftTime}>{s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)}</Text>
                  </Text>
                  <Pressable onPress={() => startEditShift(s)} style={styles.iconBtn}>
                    <Pencil size={13} color={T.muted} />
                  </Pressable>
                  <Pressable onPress={() => deleteShift(s.id)} style={styles.iconBtn}>
                    <Trash2 size={13} color={T.coral} />
                  </Pressable>
                </View>
              )
            )}

          {showShiftForm && (
            <View style={{ marginTop: 14 }}>
              <FormField label="Name" value={shiftName} onChangeText={setShiftName} />
              <View style={styles.timeRow}>
                <TimeField label="Start" value={shiftStart} onChange={setShiftStart} />
                <TimeField label="End" value={shiftEnd} onChange={setShiftEnd} />
              </View>
              <Text style={[styles.label, { marginTop: 14 }]}>Branch</Text>
              <InlinePicker
                selectedValue={shiftBranchId}
                onValueChange={setShiftBranchId}
                items={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                style={{ marginBottom: 14 }}
              />
              <Pressable onPress={createShift} disabled={creatingShift} style={styles.tealFullButton}>
                <Text style={styles.tealFullButtonText}>{creatingShift ? "Creating…" : "Create shift"}</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.rowHeader}>
            <View style={styles.iconTitleRow}>
              <Building2 size={15} color={T.ink} />
              <Text style={styles.cardTitle}>Branches</Text>
            </View>
            <Pressable onPress={() => setShowBranchForm((v) => !v)}>
              <Text style={styles.linkText}>{showBranchForm ? "Cancel" : "+ New branch"}</Text>
            </Pressable>
          </View>
          {!showBranchForm ? (
            branches.map((b) => (
              <Text key={b.id} style={styles.plainListItem}>
                {b.name}
              </Text>
            ))
          ) : (
            <View style={styles.inlineFormRow}>
              <TextInput
                value={branchName}
                onChangeText={setBranchName}
                placeholder="Branch name"
                placeholderTextColor={T.faint}
                style={[styles.compactInput, { flex: 1 }]}
              />
              <Pressable onPress={createBranch} disabled={creatingBranch} style={styles.addButton}>
                <Text style={styles.addButtonText}>{creatingBranch ? "…" : "Add"}</Text>
              </Pressable>
            </View>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.iconTitleRow}>
            <Tag size={15} color={T.ink} />
            <Text style={styles.cardTitle}>Leave types</Text>
          </View>
          {leaveTypes.map((lt) => (
            <View key={lt.id} style={styles.leaveTypeRow}>
              <Text style={[styles.plainListItem, { flex: 1, marginVertical: 0 }]}>{lt.name}</Text>
              <Pressable onPress={() => deleteLeaveType(lt.id)} style={styles.iconBtn}>
                <Trash2 size={13} color={T.coral} />
              </Pressable>
            </View>
          ))}
          <View style={[styles.inlineFormRow, { marginTop: 10 }]}>
            <TextInput
              value={leaveTypeName}
              onChangeText={setLeaveTypeName}
              placeholder="e.g. Casual"
              placeholderTextColor={T.faint}
              style={[styles.compactInput, { flex: 1 }]}
            />
            <Pressable onPress={createLeaveType} disabled={creatingLeaveType} style={styles.addButton}>
              <Text style={styles.addButtonText}>{creatingLeaveType ? "…" : "Add"}</Text>
            </Pressable>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming assignments</Text>
          {assignments.length === 0 && <Text style={styles.bodyMuted}>No upcoming assignments.</Text>}
          {assignments.map((a, i) => (
            <View key={a.id} style={[styles.assignmentRow, i > 0 && styles.borderTop]}>
              <Text style={[styles.assignmentName, { flex: 1 }]}>
                {a.employee?.first_name} {a.employee?.last_name}
              </Text>
              <Text style={styles.assignmentDate}>{formatDayLabel(a.date)}</Text>
              <Text style={styles.assignmentShift}>{a.shift?.name}</Text>
            </View>
          ))}
        </Card>

        {!canManageQr && (
          <Card style={styles.card}>
            <View style={styles.iconTitleRow}>
              <QrCode size={17} color={T.ink} />
              <Text style={styles.cardTitle}>Branch check-in QR & geofence</Text>
            </View>
            <Text style={styles.bodyMuted}>
              Only the store Manager can generate or manage a branch's check-in QR code — ask them to turn this on if you need
              it.
            </Text>
          </Card>
        )}

        {canManageQr && (
          <Card style={styles.card}>
            <View style={styles.iconTitleRow}>
              <QrCode size={17} color={T.ink} />
              <Text style={styles.cardTitle}>Live check-in QR & geofence</Text>
            </View>
            <Text style={styles.bodyMuted}>The code refreshes every 30 seconds — display it on a screen at the entrance, don't print it.</Text>

            <Text style={styles.label}>Branch</Text>
            <InlinePicker
              selectedValue={qrBranchId}
              onValueChange={setQrBranchId}
              items={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              style={{ marginBottom: 14 }}
            />
            <Pressable onPress={() => setShowLiveQr(true)} disabled={!qrBranchId} style={styles.outlineIconButton}>
              <Maximize2 size={14} color={T.ink} />
              <Text style={styles.outlineIconButtonText}>Show live QR</Text>
            </Pressable>

            <View style={styles.geofenceBlock}>
              <View style={styles.iconLabelRow}>
                <MapPin size={13} color={T.muted} />
                <Text style={styles.geofenceLabel}>Optional: require check-in within a radius of this branch</Text>
              </View>
              <View style={styles.geoRow}>
                <TextInput
                  placeholder="Latitude"
                  placeholderTextColor={T.faint}
                  value={geoLat}
                  onChangeText={setGeoLat}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.compactInput, { flex: 1 }]}
                />
                <TextInput
                  placeholder="Longitude"
                  placeholderTextColor={T.faint}
                  value={geoLon}
                  onChangeText={setGeoLon}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.compactInput, { flex: 1 }]}
                />
              </View>
              <View style={styles.geoRow}>
                <TextInput
                  placeholder="Radius (meters)"
                  placeholderTextColor={T.faint}
                  value={geoRadius}
                  onChangeText={setGeoRadius}
                  keyboardType="number-pad"
                  style={[styles.compactInput, { flex: 1 }]}
                />
                <Pressable onPress={useMyLocation} style={styles.outlineButtonSmall}>
                  <Text style={styles.outlineButtonSmallText}>Use my location</Text>
                </Pressable>
              </View>
              <Pressable onPress={saveGeofence} disabled={savingGeofence} style={styles.darkButtonSmall}>
                <Text style={styles.darkButtonSmallText}>{savingGeofence ? "Saving…" : "Save geofence"}</Text>
              </Pressable>
              {geoMsg && (
                <Text style={[styles.messageText, { color: geoMsg.type === "error" ? T.coral : T.teal, textAlign: "left" }]}>
                  {geoMsg.text}
                </Text>
              )}
              <Text style={styles.footHint}>Leave all three blank to allow check-in from anywhere.</Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {showLiveQr && qrBranchId && <LiveQrDisplay branchId={qrBranchId} onClose={() => setShowLiveQr(false)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  loadingSafe: { flex: 1, backgroundColor: T.paper, alignItems: "center", justifyContent: "center" },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 20 },
  cardTitle: { fontFamily: fonts.display.semibold, fontSize: 15.5, color: T.ink },
  iconTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 },
  label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
  bodyMuted: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 12 },
  errorText: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.coral, marginBottom: 12 },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 10, textAlign: "center" },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  linkText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.teal },
  shiftRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.line2, gap: 4 },
  shiftText: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, flex: 1 },
  shiftTime: { fontFamily: fonts.mono.regular, color: T.muted, fontSize: 12 },
  iconBtn: { padding: 6 },
  shiftEditRow: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.line2 },
  shiftEditFields: { flexDirection: "row", gap: 6, marginBottom: 6 },
  shiftEditActions: { flexDirection: "row", gap: 6 },
  compactInput: {
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    color: T.ink,
  },
  smallSaveButton: { backgroundColor: T.teal, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  smallSaveButtonText: { fontFamily: fonts.body.semibold, fontSize: 12, color: "#fff" },
  smallCancelButton: { borderWidth: 1, borderColor: T.line, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  smallCancelButtonText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink },
  timeRow: { flexDirection: "row", gap: 10 },
  tealFullButton: { backgroundColor: T.teal, borderRadius: 9, paddingVertical: 10, alignItems: "center" },
  tealFullButtonText: { fontFamily: fonts.body.semibold, fontSize: 13, color: "#fff" },
  plainListItem: { fontFamily: fonts.body.regular, fontSize: 13, color: T.ink, marginVertical: 6 },
  inlineFormRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  addButton: { backgroundColor: T.teal, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  addButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: "#fff" },
  leaveTypeRow: { flexDirection: "row", alignItems: "center" },
  assignmentRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12 },
  borderTop: { borderTopWidth: 1, borderTopColor: T.line2 },
  assignmentName: { fontFamily: fonts.body.regular, fontSize: 13.5, color: T.ink },
  assignmentDate: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, width: 100 },
  assignmentShift: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.teal },
  outlineIconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    alignSelf: "flex-start",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
  },
  outlineIconButtonText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.ink },
  geofenceBlock: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: T.line2 },
  iconLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  geofenceLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, flexShrink: 1 },
  geoRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  outlineButtonSmall: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: T.line, justifyContent: "center" },
  outlineButtonSmallText: { fontFamily: fonts.body.semibold, fontSize: 12, color: T.ink },
  darkButtonSmall: { backgroundColor: T.ink, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 14, alignSelf: "flex-start" },
  darkButtonSmallText: { fontFamily: fonts.body.semibold, fontSize: 12.5, color: T.paper },
  footHint: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.faint, marginTop: 8 },
});
