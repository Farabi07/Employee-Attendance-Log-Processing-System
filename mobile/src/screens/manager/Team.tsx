import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, TextInput, ScrollView, Pressable, Switch, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, UserPlus, DollarSign, ShieldCheck, History, User } from "lucide-react-native";
import { T, fonts } from "../../theme";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { useAuth } from "../../lib/auth";
import { currencySymbol, formatMoney, CURRENCIES } from "../../lib/currency";
import { todayISO, formatDayLabel } from "../../lib/dates";
import Card from "../../components/Card";
import Avatar from "../../components/Avatar";
import FormField from "../../components/FormField";
import { PrimaryButton } from "../../components/Button";
import InlinePicker from "../../components/InlinePicker";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Ported from frontend/src/pages/manager/Team.jsx. The web version's
// side-by-side (forms | team list) grid becomes one scrollable column;
// checkboxes become RN Switch; the inline pay-edit/history rows keep the
// same expand-in-place pattern.
const ROLE_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  manager: { label: "Manager", color: T.teal, bg: T.tealBg },
  moderator: { label: "Moderator", color: T.amber, bg: T.amberBg },
};

const PAYOUT_CYCLES = [
  { value: "hourly", label: "Hourly" },
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const MODERATOR_PERMISSIONS = [
  { key: "moderator_can_add_employees", label: "Add employees", hint: "Never other moderators — that stays Manager-only." },
  { key: "moderator_can_manage_qr", label: "Manage check-in QR & geofence", hint: "" },
  { key: "moderator_can_manage_subscription", label: "Manage subscription/billing", hint: "" },
];

function initialsOf(emp: any) {
  return `${(emp.first_name || "?")[0]}${(emp.last_name || "?")[0]}`.toUpperCase();
}

export default function Team() {
  const { isManager, billing, refreshBilling } = useAuth();
  const canAddEmployees = isManager || !!billing?.can_add_employees;
  const [savingAccess, setSavingAccess] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgRole, setOrgRole] = useState("employee");
  const [hourlyRate, setHourlyRate] = useState("");
  const [currency, setCurrency] = useState<string>(billing?.currency || "usd");
  const [payoutCycle, setPayoutCycle] = useState("weekly");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [editingPayId, setEditingPayId] = useState<number | null>(null);
  const [editRate, setEditRate] = useState("");
  const [editCurrency, setEditCurrency] = useState("usd");
  const [editCycle, setEditCycle] = useState("weekly");
  const [savingPay, setSavingPay] = useState(false);

  const [historyForId, setHistoryForId] = useState<number | null>(null);
  const [historyById, setHistoryById] = useState<Record<number, any[] | undefined>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [profileForId, setProfileForId] = useState<number | null>(null);
  const [profileById, setProfileById] = useState<Record<number, any | undefined>>({});
  const [loadingProfile, setLoadingProfile] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get(endpoints.employeesAll());
    setEmployees(res.employees || []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(
    () => employees.filter((e) => `${e.first_name} ${e.last_name} ${e.email}`.toLowerCase().includes(query.toLowerCase())),
    [employees, query]
  );

  const handleSubmit = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      await api.post(endpoints.employeeCreate(), {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        org_role: isManager ? orgRole : "employee",
        payout_cycle: payoutCycle,
        ...(hourlyRate ? { hourly_rate: hourlyRate, currency } : {}),
      });
      setMessage({ type: "success", text: "Employee added." });
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setOrgRole("employee");
      setHourlyRate("");
      setCurrency(billing?.currency || "usd");
      setPayoutCycle("weekly");
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleModAccess = async (key: string, checked: boolean) => {
    setSavingAccess(key);
    try {
      await api.put(endpoints.organizationSettings(), { [key]: checked });
      await refreshBilling();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingAccess(null);
    }
  };

  const startEditPay = (emp: any) => {
    setHistoryForId(null);
    setEditingPayId(emp.id);
    setEditRate(emp.hourly_rate != null ? String(emp.hourly_rate) : "");
    setEditCurrency(emp.currency || billing?.currency || "usd");
    setEditCycle(emp.payout_cycle || "weekly");
  };

  const savePay = async (id: number) => {
    setSavingPay(true);
    try {
      await api.put(endpoints.employeeUpdate(id), {
        payout_cycle: editCycle,
        ...(editRate !== "" ? { hourly_rate: editRate, currency: editCurrency } : {}),
      });
      setEditingPayId(null);
      setHistoryById((h) => ({ ...h, [id]: undefined }));
      await load();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSavingPay(false);
    }
  };

  const toggleHistory = async (emp: any) => {
    setEditingPayId(null);
    if (historyForId === emp.id) {
      setHistoryForId(null);
      return;
    }
    setHistoryForId(emp.id);
    if (!historyById[emp.id]) {
      setLoadingHistory(true);
      try {
        const res = await api.get(endpoints.rateHistory(emp.id));
        setHistoryById((h) => ({ ...h, [emp.id]: res.history || [] }));
      } catch (err: any) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const toggleProfile = async (emp: any) => {
    setEditingPayId(null);
    if (profileForId === emp.id) {
      setProfileForId(null);
      return;
    }
    setProfileForId(emp.id);
    if (!profileById[emp.id]) {
      setLoadingProfile(true);
      try {
        const [availRes, rosterRes, payrollRes] = await Promise.all([
          api.get(endpoints.availabilityByEmployee(emp.id)),
          api.get(endpoints.rosterByEmployee(emp.id, "?size=100")),
          api.get(endpoints.payrollSummary()),
        ]);
        const today = todayISO();
        const upcoming = (rosterRes.rosters || [])
          .filter((r: any) => r.date >= today)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
          .slice(0, 5);
        const balanceRow = (payrollRes.employees || []).find((r: any) => r.employee.id === emp.id);
        setProfileById((p) => ({
          ...p,
          [emp.id]: {
            availability: availRes.availability || [],
            upcoming,
            balance: balanceRow?.current_balance,
            currency: balanceRow?.currency,
          },
        }));
      } catch (err: any) {
        setMessage({ type: "error", text: err.message });
      } finally {
        setLoadingProfile(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {canAddEmployees ? (
          <Card style={styles.card}>
            <View style={styles.cardTitleRow}>
              <UserPlus size={17} color={T.ink} />
              <Text style={styles.cardTitle}>Add employee</Text>
            </View>
            <FormField label="First name" value={firstName} onChangeText={setFirstName} />
            <FormField label="Last name" value={lastName} onChangeText={setLastName} />
            <FormField label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <FormField label="Temporary password" value={password} onChangeText={setPassword} secureTextEntry />

            {isManager ? (
              <View style={{ marginBottom: 14 }}>
                <Text style={styles.label}>Role</Text>
                <InlinePicker
                  selectedValue={orgRole}
                  onValueChange={setOrgRole}
                  items={[
                    { value: "employee", label: "Employee" },
                    { value: "moderator", label: "Moderator" },
                  ]}
                />
              </View>
            ) : (
              <Text style={styles.hintText}>Added as a regular Employee — only the Manager can create Moderators.</Text>
            )}

            <Text style={styles.label}>Hourly rate (optional)</Text>
            <View style={styles.rateRow}>
              <TextInput
                value={hourlyRate}
                onChangeText={setHourlyRate}
                placeholder="e.g. 15.00"
                keyboardType="decimal-pad"
                placeholderTextColor={T.faint}
                style={[styles.plainInput, { flex: 1 }]}
              />
              <View style={styles.currencyPickerBox}>
                <InlinePicker selectedValue={currency} onValueChange={setCurrency} items={CURRENCIES.map((c) => ({ value: c.value, label: c.value.toUpperCase() }))} />
              </View>
            </View>

            <Text style={styles.label}>Pay out every</Text>
            <InlinePicker selectedValue={payoutCycle} onValueChange={setPayoutCycle} items={PAYOUT_CYCLES} />
            {payoutCycle === "hourly" && (
              <Text style={styles.hintText}>Earnings settle to their wallet instantly, right after every check-out — no waiting for a batch.</Text>
            )}

            <View style={{ marginTop: 14 }}>
              <PrimaryButton title={submitting ? "Adding…" : "Add employee"} onPress={handleSubmit} loading={submitting} />
            </View>
            {message && (
              <Text style={[styles.messageText, { color: message.type === "error" ? T.coral : T.teal }]}>{message.text}</Text>
            )}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Add employee</Text>
            <Text style={styles.bodyMuted}>
              Only the store Manager can add new employees or moderators — ask them to turn on "Add employees" below if you need
              this.
            </Text>
          </Card>
        )}

        {isManager && (
          <Card style={styles.card}>
            <View style={styles.cardTitleRow}>
              <ShieldCheck size={16} color={T.ink} />
              <Text style={styles.cardTitle}>Moderator access</Text>
            </View>
            <Text style={styles.bodyMuted}>
              A Moderator can always manage shifts, roster and leave. Everything below is off until you turn it on.
            </Text>
            <View style={{ gap: 14 }}>
              {MODERATOR_PERMISSIONS.map((opt) => (
                <View key={opt.key} style={styles.permissionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.permissionLabel}>{opt.label}</Text>
                    {!!opt.hint && <Text style={styles.permissionHint}>{opt.hint}</Text>}
                  </View>
                  <Switch
                    value={!!billing?.[opt.key]}
                    onValueChange={(v) => toggleModAccess(opt.key, v)}
                    disabled={savingAccess === opt.key}
                    trackColor={{ true: T.teal, false: T.line }}
                  />
                </View>
              ))}
            </View>
          </Card>
        )}

        <Card style={styles.card}>
          <View style={styles.teamHeaderRow}>
            <Text style={styles.cardTitle}>Team ({employees.length})</Text>
            <View style={styles.searchBox}>
              <Search size={14} color={T.faint} style={styles.searchIcon} />
              <TextInput placeholder="Search" placeholderTextColor={T.faint} value={query} onChangeText={setQuery} style={styles.searchInput} />
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color={T.navy} />
          ) : filtered.length === 0 ? (
            <Text style={styles.bodyMuted}>No one matches "{query}".</Text>
          ) : (
            filtered.map((emp, i) => {
              const badge = ROLE_BADGE[emp.org_role];
              const isEditing = editingPayId === emp.id;
              const isHistoryOpen = historyForId === emp.id;
              const history = historyById[emp.id];
              const isProfileOpen = profileForId === emp.id;
              const profile = profileById[emp.id];
              return (
                <View key={emp.id} style={[styles.empBlock, i > 0 && styles.borderTop]}>
                  <View style={styles.empRow}>
                    <Avatar initials={initialsOf(emp)} size={34} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.empNameRow}>
                        <Text style={styles.empName}>
                          {emp.first_name} {emp.last_name}
                        </Text>
                        {badge && (
                          <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.empMeta} numberOfLines={1}>
                        {emp.email}
                        {emp.hourly_rate &&
                          ` · ${currencySymbol(emp.currency)}${Number(emp.hourly_rate).toFixed(2)}/h · ${
                            PAYOUT_CYCLES.find((c) => c.value === emp.payout_cycle)?.label || "Weekly"
                          }`}
                      </Text>
                    </View>
                    <Pressable onPress={() => toggleProfile(emp)} style={[styles.iconButton, isProfileOpen && styles.iconButtonActive]}>
                      <User size={15} color={isProfileOpen ? T.tealDeep : T.faint} />
                    </Pressable>
                    <Pressable onPress={() => toggleHistory(emp)} style={[styles.iconButton, isHistoryOpen && styles.iconButtonActive]}>
                      <History size={15} color={isHistoryOpen ? T.tealDeep : T.faint} />
                    </Pressable>
                    {canAddEmployees && (
                      <Pressable
                        onPress={() => (isEditing ? setEditingPayId(null) : startEditPay(emp))}
                        style={[styles.iconButton, isEditing && styles.iconButtonActive]}
                      >
                        <DollarSign size={15} color={isEditing ? T.tealDeep : T.teal} />
                      </Pressable>
                    )}
                  </View>

                  {isProfileOpen && (
                    <View style={styles.profileBlock}>
                      {loadingProfile && !profile ? (
                        <Text style={styles.bodyMuted}>Loading…</Text>
                      ) : (
                        <>
                          <View style={styles.profileFieldsRow}>
                            <View style={styles.profileField}>
                              <Text style={styles.profileFieldLabel}>Phone</Text>
                              <Text style={styles.profileFieldValue}>{emp.primary_phone || "Not set"}</Text>
                            </View>
                            <View style={styles.profileField}>
                              <Text style={styles.profileFieldLabel}>Address</Text>
                              <Text style={styles.profileFieldValue}>
                                {emp.street_address_one
                                  ? `${emp.street_address_one}${emp.street_address_two ? ", " + emp.street_address_two : ""}`
                                  : "Not set"}
                              </Text>
                            </View>
                            <View style={styles.profileField}>
                              <Text style={styles.profileFieldLabel}>Balance due</Text>
                              <Text style={[styles.profileFieldValue, { fontFamily: fonts.mono.regular }]}>
                                {profile ? formatMoney(profile.balance || 0, profile.currency) : "—"}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.profileSectionLabel}>Weekly availability</Text>
                          <View style={styles.availPillRow}>
                            {DAY_LABELS.map((label, dow) => {
                              const row = profile?.availability.find((a: any) => a.day_of_week === dow);
                              const avail = row ? row.is_available : true;
                              return (
                                <View key={dow} style={[styles.availPill, { backgroundColor: avail ? T.tealBg : T.line2 }]}>
                                  <Text style={[styles.availPillText, { color: avail ? T.tealDeep : T.faint }]}>{label.slice(0, 3)}</Text>
                                </View>
                              );
                            })}
                          </View>

                          <Text style={styles.profileSectionLabel}>Upcoming shifts</Text>
                          {!profile || profile.upcoming.length === 0 ? (
                            <Text style={styles.bodyMuted}>No upcoming shifts scheduled.</Text>
                          ) : (
                            profile.upcoming.map((r: any) => (
                              <Text key={r.id} style={styles.upcomingRow}>
                                {formatDayLabel(r.date)} · {r.shift?.name}
                                {r.shift?.start_time && (
                                  <Text style={{ fontFamily: fonts.mono.regular, color: T.muted }}>
                                    {" "}
                                    ({r.shift.start_time.slice(0, 5)}–{r.shift.end_time?.slice(0, 5)})
                                  </Text>
                                )}
                              </Text>
                            ))
                          )}
                        </>
                      )}
                    </View>
                  )}

                  {isEditing && (
                    <View style={styles.editRow}>
                      <TextInput
                        value={editRate}
                        onChangeText={setEditRate}
                        placeholder="Hourly rate"
                        keyboardType="decimal-pad"
                        placeholderTextColor={T.faint}
                        style={styles.editRateInput}
                      />
                      <View style={styles.editPickerBox}>
                        <InlinePicker selectedValue={editCurrency} onValueChange={setEditCurrency} items={CURRENCIES.map((c) => ({ value: c.value, label: c.value.toUpperCase() }))} />
                      </View>
                      <View style={[styles.editPickerBox, { flex: 1 }]}>
                        <InlinePicker selectedValue={editCycle} onValueChange={setEditCycle} items={PAYOUT_CYCLES} />
                      </View>
                      <Pressable onPress={() => savePay(emp.id)} disabled={savingPay} style={styles.saveButton}>
                        <Text style={styles.saveButtonText}>{savingPay ? "Saving…" : "Save"}</Text>
                      </Pressable>
                    </View>
                  )}

                  {isHistoryOpen && (
                    <View style={styles.historyBlock}>
                      {loadingHistory && !history ? (
                        <Text style={styles.bodyMuted}>Loading…</Text>
                      ) : !history || history.length === 0 ? (
                        <Text style={styles.bodyMuted}>No pay changes recorded yet.</Text>
                      ) : (
                        history.map((h) => (
                          <View key={h.id} style={styles.historyRow}>
                            <Text style={styles.historyDate}>
                              {new Date(h.created_at).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                            </Text>
                            <Text style={styles.historyText}>
                              {h.old_hourly_rate ? `${formatMoney(h.old_hourly_rate, h.old_currency)} → ` : "Set to "}
                              <Text style={{ fontFamily: fonts.body.semibold }}>{formatMoney(h.new_hourly_rate, h.new_currency)}/h</Text>
                              {h.changed_by && ` by ${h.changed_by.first_name} ${h.changed_by.last_name}`}
                            </Text>
                          </View>
                        ))
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.paper },
  scrollContent: { padding: 16, gap: 16 },
  card: { padding: 20 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  cardTitle: { fontFamily: fonts.display.semibold, fontSize: 15, color: T.ink },
  label: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted, marginBottom: 6 },
  hintText: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint, marginBottom: 14 },
  bodyMuted: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.muted },
  plainInput: {
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 13.5,
    color: T.ink,
  },
  rateRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  currencyPickerBox: { width: 100, borderWidth: 1, borderColor: T.line, borderRadius: 8, overflow: "hidden" },
  inlinePickerBox: { borderWidth: 1, borderColor: T.line, borderRadius: 8, overflow: "hidden", marginBottom: 14 },
  inlinePicker: { color: T.ink },
  messageText: { fontFamily: fonts.body.regular, fontSize: 12.5, marginTop: 10, textAlign: "center" },
  permissionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  permissionLabel: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink },
  permissionHint: { fontFamily: fonts.body.regular, fontSize: 11, color: T.faint, marginTop: 2 },
  teamHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 },
  searchBox: { position: "relative" },
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
    width: 150,
  },
  empBlock: { paddingVertical: 13 },
  borderTop: { borderTopWidth: 1, borderTopColor: T.line2 },
  empRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  empNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  empName: { fontFamily: fonts.body.semibold, fontSize: 13.5, color: T.ink },
  empMeta: { fontFamily: fonts.mono.regular, fontSize: 11, color: T.faint, marginTop: 2 },
  roleBadge: { paddingVertical: 2, paddingHorizontal: 7, borderRadius: 999 },
  roleBadgeText: { fontFamily: fonts.body.semibold, fontSize: 10.5 },
  iconButton: { padding: 6, borderRadius: 7 },
  iconButtonActive: { backgroundColor: T.tealBg },
  editRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingTop: 10, paddingLeft: 46, flexWrap: "wrap" },
  editRateInput: {
    width: 100,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: T.line,
    fontFamily: fonts.body.regular,
    fontSize: 12.5,
    color: T.ink,
  },
  editPickerBox: { width: 100, borderWidth: 1, borderColor: T.line, borderRadius: 7, overflow: "hidden" },
  saveButton: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 7, backgroundColor: T.teal },
  saveButtonText: { fontFamily: fonts.body.semibold, fontSize: 12, color: "#fff" },
  historyBlock: { paddingTop: 10, paddingLeft: 46 },
  historyRow: { flexDirection: "row", gap: 8, paddingVertical: 5 },
  historyDate: { fontFamily: fonts.mono.regular, fontSize: 12, color: T.faint, width: 110 },
  historyText: { fontFamily: fonts.body.regular, fontSize: 12, color: T.ink, flex: 1, flexWrap: "wrap" },
  profileBlock: { paddingTop: 12, paddingLeft: 46, gap: 12 },
  profileFieldsRow: { flexDirection: "row", flexWrap: "wrap", gap: 18 },
  profileField: { minWidth: 100 },
  profileFieldLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted, marginBottom: 3 },
  profileFieldValue: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink },
  profileSectionLabel: { fontFamily: fonts.body.regular, fontSize: 11.5, color: T.muted, marginTop: 2, marginBottom: 6 },
  availPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  availPill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  availPillText: { fontFamily: fonts.body.semibold, fontSize: 10.5 },
  upcomingRow: { fontFamily: fonts.body.regular, fontSize: 12.5, color: T.ink, marginBottom: 4 },
});
