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
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger, channelId: "default" },
    });
    await SecureStore.setItemAsync(`${SCHEDULED_ID_PREFIX}${roster.id}`, id);
  } catch {
    // Best-effort — a missed local reminder shouldn't break Today.tsx's load.
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
