import React, { useEffect, useState, useCallback } from "react";
import { Repeat, Check, X, CalendarClock } from "lucide-react";
import { T, fontDisplay, fontBody, fontMono } from "../../theme";
import { useAuth } from "../../lib/auth";
import { api } from "../../lib/api";
import { endpoints } from "../../lib/endpoints";
import { weekDates, formatDayLabel, todayISO } from "../../lib/dates";
import Card from "../../components/Card";
import StatusPill from "../../components/StatusPill";

const SWAP_STATUS_LABEL = {
  pending_peer: "pending",
  pending_manager: "pending",
  approved: "approved",
  rejected: "rejected",
  cancelled: "rejected",
};

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function defaultWeek() {
  return DAY_LABELS.map((_, i) => ({ day_of_week: i, is_available: true, start_time: "", end_time: "" }));
}

function SwapRow({ swap, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${T.line2}` }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.ink, margin: "0 0 2px" }}>
          {swap.roster?.shift?.name || "Shift"} · {swap.roster?.date}
        </p>
        <p style={{ fontFamily: fontMono, fontSize: 11, color: T.faint, margin: 0 }}>
          {swap.requested_by?.first_name} {swap.requested_by?.last_name}
          {swap.proposed_to ? ` → ${swap.proposed_to.first_name} ${swap.proposed_to.last_name}` : " · open to anyone"}
          {swap.reason ? ` — "${swap.reason}"` : ""}
        </p>
      </div>
      {right}
    </div>
  );
}

export default function EmployeeShifts() {
  const { user } = useAuth();
  const [rosters, setRosters] = useState([]);
  const [teammates, setTeammates] = useState([]);
  const [swaps, setSwaps] = useState({ outgoing: [], incoming: [], open: [] });
  const [loading, setLoading] = useState(true);
  const [openSwapDate, setOpenSwapDate] = useState(null);
  const [proposedTo, setProposedTo] = useState("");
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  const [availability, setAvailability] = useState(defaultWeek());
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState(null);

  const load = useCallback(async () => {
    const [rosterRes, teammateRes, swapRes, availabilityRes] = await Promise.all([
      api.get(endpoints.rosterByEmployee(user.id, "?size=100")),
      api.get(endpoints.teammatesAll()),
      api.get(endpoints.shiftSwapMine()),
      api.get(endpoints.availabilityMine()),
    ]);
    setRosters(rosterRes.rosters || []);
    setTeammates(teammateRes.employees || []);
    setSwaps({ outgoing: swapRes.outgoing || [], incoming: swapRes.incoming || [], open: swapRes.open || [] });

    const byDay = {};
    for (const row of availabilityRes.availability || []) byDay[row.day_of_week] = row;
    setAvailability(
      defaultWeek().map((d) => {
        const saved = byDay[d.day_of_week];
        return saved
          ? { day_of_week: d.day_of_week, is_available: saved.is_available, start_time: saved.start_time || "", end_time: saved.end_time || "" }
          : d;
      })
    );
  }, [user.id]);

  const updateAvailabilityDay = (dayOfWeek, patch) => {
    setAvailability((week) => week.map((d) => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const saveAvailability = async () => {
    setSavingAvailability(true);
    setAvailabilityMessage(null);
    try {
      await api.put(endpoints.availabilityMineUpdate(), { days: availability });
      setAvailabilityMessage({ type: "success", text: "Availability saved." });
    } catch (err) {
      setAvailabilityMessage({ type: "error", text: err.message });
    } finally {
      setSavingAvailability(false);
    }
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const days = weekDates();
  const byDate = Object.fromEntries(rosters.map((r) => [r.date, r]));
  const today = todayISO();

  const requestSwap = async (roster) => {
    setMessage(null);
    setBusyId(roster.id);
    try {
      await api.post(endpoints.shiftSwapRequest(), {
        roster: roster.id,
        proposed_to: proposedTo || undefined,
        reason: reason || undefined,
      });
      setMessage({ type: "success", text: "Swap requested." });
      setOpenSwapDate(null);
      setProposedTo("");
      setReason("");
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const respond = async (swapId, action) => {
    setMessage(null);
    setBusyId(swapId);
    try {
      await api.post(endpoints.shiftSwapRespond(swapId), { action });
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const cancelSwap = async (swapId) => {
    setMessage(null);
    setBusyId(swapId);
    try {
      await api.post(endpoints.shiftSwapCancel(swapId));
      await load();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: "24px 26px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 16.5, fontWeight: 600, color: T.ink, margin: "0 0 4px" }}>This week</h3>
        <p style={{ fontFamily: fontBody, fontSize: 13, color: T.muted, margin: "0 0 22px" }}>
          {formatDayLabel(days[0])} – {formatDayLabel(days[6])} · assigned by your manager
        </p>
        {loading ? (
          <p style={{ fontFamily: fontBody, color: T.muted }}>Loading…</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(120px, 1fr))", gap: 10 }}>
              {days.map((date) => {
                const roster = byDate[date];
                const shift = roster?.shift;
                const canSwap = roster && date >= today;
                const hasActiveSwap = roster && swaps.outgoing.some((s) => s.roster?.id === roster.id && !["rejected", "cancelled"].includes(s.status));
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
                        <p style={{ fontFamily: fontMono, fontSize: 10.5, color: T.muted, margin: "0 0 8px" }}>
                          {shift.start_time?.slice(0, 5)}–{shift.end_time?.slice(0, 5)}
                        </p>
                        {canSwap && !hasActiveSwap && (
                          <button
                            onClick={() => setOpenSwapDate(openSwapDate === date ? null : date)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 8px", borderRadius: 7, border: "none", background: T.card, color: T.navyDeep, fontFamily: fontBody, fontSize: 10.5, fontWeight: 600, cursor: "pointer" }}
                          >
                            <Repeat size={11} /> Swap
                          </button>
                        )}
                        {hasActiveSwap && <StatusPill status="pending" />}
                      </>
                    ) : (
                      <p style={{ fontFamily: fontBody, fontSize: 12, color: T.faint, margin: "14px 0 0" }}>Off</p>
                    )}
                  </div>
                );
              })}
            </div>

            {openSwapDate && byDate[openSwapDate] && (
              <div style={{ marginTop: 16, padding: "14px 16px", borderRadius: 9, background: T.line2 }}>
                <p style={{ fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, color: T.ink, margin: "0 0 10px" }}>
                  Request a swap for {formatDayLabel(openSwapDate)}
                </p>
                <select
                  value={proposedTo}
                  onChange={(e) => setProposedTo(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, marginBottom: 8, background: T.card }}
                >
                  <option value="">Open to anyone in the store</option>
                  {teammates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Reason (optional)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, marginBottom: 10, boxSizing: "border-box" }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => requestSwap(byDate[openSwapDate])}
                    disabled={busyId === byDate[openSwapDate].id}
                    style={{ padding: "8px 14px", borderRadius: 8, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Send request
                  </button>
                  <button
                    onClick={() => setOpenSwapDate(null)}
                    style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${T.line}`, background: T.card, color: T.muted, fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        {message && (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: message.type === "error" ? T.coral : T.teal, marginTop: 14 }}>{message.text}</p>
        )}
      </Card>

      {(swaps.incoming.length > 0 || swaps.open.length > 0 || swaps.outgoing.length > 0) && (
        <Card style={{ padding: "22px 24px" }}>
          <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>
            <Repeat size={15} /> Shift swaps
          </h3>
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 6px" }}>
            Give up a shift above, accept a colleague's, or grab an open one — your manager gives the final approval either way.
          </p>

          {swaps.incoming.length > 0 && (
            <>
              <h4 style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.muted, margin: "16px 0 4px" }}>Asked of you</h4>
              {swaps.incoming.map((s) => (
                <SwapRow
                  key={s.id}
                  swap={s}
                  right={
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => respond(s.id, "accept")} disabled={busyId === s.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, border: "none", background: T.tealBg, color: T.tealDeep, fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                        <Check size={12} /> Accept
                      </button>
                      <button onClick={() => respond(s.id, "decline")} disabled={busyId === s.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, border: "none", background: T.coralBg, color: T.coral, fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                        <X size={12} /> Decline
                      </button>
                    </div>
                  }
                />
              ))}
            </>
          )}

          {swaps.open.length > 0 && (
            <>
              <h4 style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.muted, margin: "16px 0 4px" }}>Open to claim</h4>
              {swaps.open.map((s) => (
                <SwapRow
                  key={s.id}
                  swap={s}
                  right={
                    <button onClick={() => respond(s.id, "accept")} disabled={busyId === s.id} style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", borderRadius: 7, border: "none", background: T.tealBg, color: T.tealDeep, fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                      <Check size={12} /> Claim
                    </button>
                  }
                />
              ))}
            </>
          )}

          {swaps.outgoing.length > 0 && (
            <>
              <h4 style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: T.muted, margin: "16px 0 4px" }}>Your requests</h4>
              {swaps.outgoing.map((s) => (
                <SwapRow
                  key={s.id}
                  swap={s}
                  right={
                    s.status === "pending_peer" ? (
                      <button onClick={() => cancelSwap(s.id)} disabled={busyId === s.id} style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${T.line}`, background: T.card, color: T.muted, fontFamily: fontBody, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                        Cancel
                      </button>
                    ) : (
                      <StatusPill status={SWAP_STATUS_LABEL[s.status] || s.status} />
                    )
                  }
                />
              ))}
            </>
          )}
        </Card>
      )}

      <Card style={{ padding: "22px 24px" }}>
        <h3 style={{ fontFamily: fontDisplay, fontSize: 15.5, fontWeight: 600, color: T.ink, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 7 }}>
          <CalendarClock size={16} /> Weekly availability
        </h3>
        <p style={{ fontFamily: fontBody, fontSize: 12.5, color: T.muted, margin: "0 0 16px" }}>
          Let your manager know which days you're generally free to work — this is advisory, it doesn't block them from rostering you outside it.
        </p>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 560 }}>
            {availability.map((d) => (
              <div
                key={d.day_of_week}
                style={{ display: "grid", gridTemplateColumns: "110px auto 1fr 1fr", alignItems: "center", gap: 12, padding: "9px 0", borderTop: d.day_of_week === 0 ? "none" : `1px solid ${T.line2}` }}
              >
                <span style={{ fontFamily: fontBody, fontSize: 13, color: T.ink }}>{DAY_LABELS[d.day_of_week]}</span>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: fontBody, fontSize: 12.5, color: T.muted, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={d.is_available}
                    onChange={(e) => updateAvailabilityDay(d.day_of_week, { is_available: e.target.checked })}
                  />
                  Available
                </label>
                <input
                  type="time"
                  value={d.start_time || ""}
                  disabled={!d.is_available}
                  onChange={(e) => updateAvailabilityDay(d.day_of_week, { start_time: e.target.value })}
                  style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, opacity: d.is_available ? 1 : 0.4 }}
                />
                <input
                  type="time"
                  value={d.end_time || ""}
                  disabled={!d.is_available}
                  onChange={(e) => updateAvailabilityDay(d.day_of_week, { end_time: e.target.value })}
                  style={{ padding: "6px 8px", borderRadius: 7, border: `1px solid ${T.line}`, fontFamily: fontBody, fontSize: 12.5, opacity: d.is_available ? 1 : 0.4 }}
                />
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={saveAvailability}
          disabled={savingAvailability}
          style={{ marginTop: 16, padding: "10px 18px", borderRadius: 9, border: "none", background: T.ink, color: T.paper, fontFamily: fontBody, fontWeight: 600, fontSize: 13, cursor: "pointer", opacity: savingAvailability ? 0.7 : 1 }}
        >
          {savingAvailability ? "Saving…" : "Save availability"}
        </button>
        {availabilityMessage && (
          <p style={{ fontFamily: fontBody, fontSize: 12.5, color: availabilityMessage.type === "error" ? T.coral : T.teal, marginTop: 10 }}>
            {availabilityMessage.text}
          </p>
        )}
      </Card>
    </div>
  );
}
