// Shift-start reminders, entirely on-device — no server cron, no push
// token, no network at trigger time. Today.tsx calls scheduleShiftReminder()
// every time it loads (cold start, pull-to-refresh, after check-in/out);
// that one call schedules a local notification for "shift start minus N
// minutes" if there's an unchecked-in shift today, or cancels any
// previously-scheduled one otherwise (already checked in, no shift, or the
// reminder got turned off) — always reflecting the current state instead
// of needing separate schedule/cancel calls sprinkled through every action.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";
import { endpoints } from "./endpoints";
import { todayISO } from "./dates";

const ENABLED_KEY = "shift_reminder_enabled";
const MINUTES_KEY = "shift_reminder_minutes";
const SCHEDULED_ID_PREFIX = "shift_reminder_scheduled_";

export const DEFAULT_REMINDER_MINUTES = 30;

export async function getShiftReminderPreference() {
  const [enabledRaw, minutesRaw] = await Promise.all([
    SecureStore.getItemAsync(ENABLED_KEY),
    SecureStore.getItemAsync(MINUTES_KEY),
  ]);
  return {
    enabled: enabledRaw !== "false",
    minutesBefore: minutesRaw ? Number(minutesRaw) : DEFAULT_REMINDER_MINUTES,
  };
}

/** @param {{ enabled?: boolean, minutesBefore?: number }} pref */
export async function setShiftReminderPreference({ enabled, minutesBefore }) {
  if (enabled !== undefined) await SecureStore.setItemAsync(ENABLED_KEY, enabled ? "true" : "false");
  if (minutesBefore !== undefined) await SecureStore.setItemAsync(MINUTES_KEY, String(minutesBefore));
}

// Shared by syncShiftReminder and syncUpcomingShiftReminders below — actually
// books the OS-level alarm for one roster row and remembers its id so it can
// be cancelled later. Always cancels any previous alarm for this roster
// first, so calling it again (e.g. the minutes-before setting changed) just
// reschedules rather than stacking duplicate notifications.
async function scheduleOneShiftReminder(roster, minutesBefore) {
  await cancelShiftReminder(roster.id);

  const [h, m] = roster.shift.start_time.split(":").map(Number);
  const start = new Date(`${roster.date}T00:00:00`);
  start.setHours(h, m, 0, 0);
  const trigger = new Date(start.getTime() - minutesBefore * 60000);

  if (trigger.getTime() <= Date.now()) return;

  try {
    if (Platform.OS === "android") {
      // A scheduled local notification needs a channel to actually show on
      // Android 8+ — this is idempotent (a no-op if it already exists, e.g.
      // from push.js's registerForPushNotifications), so safe to call here
      // too without assuming that's already run this session.
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Your shift starts soon",
        body: `${roster.shift.name || "Your shift"} starts at ${roster.shift.start_time.slice(0, 5)} — scan in when you arrive.`,
        data: { rosterId: roster.id, type: "shift_reminder_local" },
        // Explicit, not left to platform default — this notification must
        // always play a tone even when the app's Silent mode is on (see
        // lib/push.js's handler, which exempts type: "shift_reminder_local"
        // from silentMode for the foreground case; this covers background
        // /killed-app delivery, which reads the content's own sound field
        // rather than going through that handler at all).
        sound: true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger, channelId: "default" },
    });
    await SecureStore.setItemAsync(`${SCHEDULED_ID_PREFIX}${roster.id}`, id);
  } catch {
    // Best-effort — a missed local reminder shouldn't break the caller's load.
  }
}

// `roster` is a Roster row with a nested `shift` ({ name, start_time: "HH:MM:SS" }),
// or null/undefined if there's no shift today. `alreadyCheckedIn` lets the
// caller (Today.tsx) pass its own attendance check rather than this module
// needing to know anything about Attendance.
export async function syncShiftReminder(roster, alreadyCheckedIn) {
  if (!roster) return;
  await cancelShiftReminder(roster.id);
  if (alreadyCheckedIn || !roster.shift?.start_time) return;

  const { enabled, minutesBefore } = await getShiftReminderPreference();
  if (!enabled) return;

  await scheduleOneShiftReminder(roster, minutesBefore);
}

// Books reminders for every FUTURE (strictly after `todayISO`) shift in
// `rosters` in one pass. Called from Shifts.tsx ("My Shifts") so that
// opening that tab — which already loads the whole week's roster — pre-books
// alarms for the rest of the week, not just today. Deliberately skips
// today's own row: Today.tsx already owns that one and knows whether the
// employee has checked in, which this function has no way to know.
export async function syncUpcomingShiftReminders(rosters, todayISO) {
  if (!Array.isArray(rosters)) return;
  const { enabled, minutesBefore } = await getShiftReminderPreference();

  for (const roster of rosters) {
    if (!roster?.id || !roster.shift?.start_time || !roster.date || roster.date <= todayISO) continue;
    if (!enabled) {
      await cancelShiftReminder(roster.id);
      continue;
    }
    await scheduleOneShiftReminder(roster, minutesBefore);
  }
}

// Called the moment "Remind me before my shift" is switched back on, so it
// takes effect immediately instead of waiting for the next time Today or
// My Shifts happens to load. Fetches the same roster + attendance data
// those screens already fetch and schedules every eligible shift in one
// pass — today (if not already checked in) and every day after it.
export async function refreshAllShiftReminders(userId) {
  try {
    const [att, rosterRes] = await Promise.all([
      api.get(endpoints.today()),
      api.get(endpoints.rosterByEmployee(userId, "?size=100")),
    ]);
    const rosters = rosterRes.rosters || [];
    const today = todayISO();
    const todayRoster = rosters.find((r) => r.date === today) || null;
    if (todayRoster) await syncShiftReminder(todayRoster, !!att?.check_in_time);
    await syncUpcomingShiftReminders(rosters, today);
  } catch {
    // Best-effort — worst case reminders pick up next time Today/Shifts loads.
  }
}

// Called the moment the toggle switches off — cancels every currently-booked
// shift reminder in one go by asking the OS for everything this app has
// scheduled, rather than needing to already know every affected roster id.
export async function cancelAllShiftReminders() {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((n) => n.content?.data?.type === "shift_reminder_local")
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
    );
  } catch {
    // Best-effort.
  }
}

export async function cancelShiftReminder(rosterId) {
  const key = `${SCHEDULED_ID_PREFIX}${rosterId}`;
  const id = await SecureStore.getItemAsync(key);
  if (!id) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or already cancelled — fine either way.
  }
  await SecureStore.deleteItemAsync(key);
}
