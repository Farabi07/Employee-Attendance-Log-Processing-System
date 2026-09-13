// New — the web app has no push infrastructure to port from (its
// NotificationBell just polls every 20s). Registers this device for real
// push via Expo's push service and hands the resulting token to the
// backend's /account/api/v1/push_token/ endpoint (see
// authentication/views/account_views.py's registerPushToken, on the
// backend branch — POST registers/overwrites the token, DELETE clears it).
//
// Requires an EAS project id to actually mint a token (getExpoPushTokenAsync
// needs one) — reads it from app.json's extra.eas.projectId, which only
// exists after running `eas init` once. Until then this fails silently and
// the app falls back to NotificationBell's polling as the only channel —
// push is progressive enhancement, never a hard requirement to use the app.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { api } from "./api";
import { endpoints } from "./endpoints";

const NOTIFICATIONS_ENABLED_KEY = "notifications_enabled";
const SILENT_MODE_KEY = "notifications_silent_mode";

// Read by the notification handler below on every incoming push — kept as
// plain module variables (not React state) since expo-notifications'
// handler is a bare callback outside the component tree. NotificationSettings
// is the only thing that ever calls the setters below, which keep these in
// sync with the persisted preference.
let alertsEnabled = true;
// Silent mode mutes the *sound* only (alerts/banners still show) for normal
// notifications — shift reminders are exempt on purpose (see isReminder
// below) since a reminder that can be silently missed defeats its own
// point. This only governs how the app plays notifications while it's
// actually running/foregrounded; a background/killed-app push's sound is
// decided server-side at send time using this same preference (synced via
// setSilentModeEnabled), and a scheduled local shift reminder always sets
// its own sound explicitly (see lib/shiftReminder.js), independent of this
// flag entirely.
let silentMode = false;

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isReminder = notification.request?.content?.data?.type === "shift_reminder_local";
    return {
      shouldShowAlert: alertsEnabled,
      shouldPlaySound: alertsEnabled && (isReminder || !silentMode),
      shouldSetBadge: false,
      shouldShowBanner: alertsEnabled,
      shouldShowList: alertsEnabled,
    };
  },
});

// Defaults to enabled — matches the app's original always-on behavior for
// anyone who never touches the new Settings toggle.
export async function getNotificationsEnabled() {
  const stored = await SecureStore.getItemAsync(NOTIFICATIONS_ENABLED_KEY);
  return stored !== "false";
}

// Called from Settings.tsx's toggle. Persists the choice, then either
// (re)registers for push or clears the server-side token so the backend
// stops sending altogether — not just a local mute — plus flips the
// in-app alertsEnabled flag immediately either way.
export async function setNotificationsEnabled(enabled) {
  await SecureStore.setItemAsync(NOTIFICATIONS_ENABLED_KEY, enabled ? "true" : "false");
  alertsEnabled = enabled;
  if (enabled) {
    await registerForPushNotifications();
  } else {
    await unregisterPushNotifications();
  }
}

export async function registerForPushNotifications() {
  try {
    if (!(await getNotificationsEnabled())) {
      alertsEnabled = false;
      return;
    }
    alertsEnabled = true;

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    if (token) {
      await api.post(endpoints.registerPushToken(), { expo_push_token: token });
    }
  } catch {
    // Progressive enhancement only — NotificationBell's polling still works
    // regardless of whether push registration succeeds.
  }
}

// Clears the token server-side (DELETE on the same endpoint) so the
// backend's send_expo_push_for_notification finds nothing to push to —
// this is what actually stops notifications from arriving, not just the
// local alertsEnabled flag above (which only covers the case where a push
// slips through while the DELETE hasn't landed yet, e.g. offline).
export async function unregisterPushNotifications() {
  try {
    await api.del(endpoints.registerPushToken());
  } catch {
    // Best-effort — if this fails (offline, etc.) the local mute above
    // still applies for the rest of this session.
  }
}

// Defaults to off — most people expect sound on by default.
export async function getSilentModeEnabled() {
  const stored = await SecureStore.getItemAsync(SILENT_MODE_KEY);
  silentMode = stored === "true";
  return silentMode;
}

// Persists locally AND pushes to the backend (best-effort), since a
// background/killed-app push's sound is chosen server-side at send time —
// only a foregrounded app can have its own JS override that. See the
// handler above for why shift reminders ignore this either way.
export async function setSilentModeEnabled(enabled) {
  silentMode = enabled;
  await SecureStore.setItemAsync(SILENT_MODE_KEY, enabled ? "true" : "false");
  try {
    await api.put(endpoints.notificationPreferences(), { silent_mode: enabled });
  } catch {
    // Offline, etc. — foreground behavior still respects the local flag;
    // worst case a background push plays sound until this syncs.
  }
}
