// Thin wrapper around expo-haptics — every call is fire-and-forget and
// swallows errors, since haptics are pure polish (unsupported hardware,
// muted "system haptics" setting, web/simulator) and must never be able
// to break the action they're attached to.
import * as Haptics from "expo-haptics";
import * as SecureStore from "expo-secure-store";

const HAPTICS_ENABLED_KEY = "haptics_enabled";

// Read by every tap*() call below — kept as a plain module variable (like
// push.js's alertsEnabled) since these are called from bare event handlers
// all over the app, not React components that could hold state directly.
let hapticsEnabled = true;

export async function getHapticsEnabled() {
  const stored = await SecureStore.getItemAsync(HAPTICS_ENABLED_KEY);
  hapticsEnabled = stored !== "false";
  return hapticsEnabled;
}

export async function setHapticsEnabled(enabled) {
  hapticsEnabled = enabled;
  await SecureStore.setItemAsync(HAPTICS_ENABLED_KEY, enabled ? "true" : "false");
}

export function tapLight() {
  if (!hapticsEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapSelection() {
  if (!hapticsEnabled) return;
  Haptics.selectionAsync().catch(() => {});
}

export function tapSuccess() {
  if (!hapticsEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function tapWarning() {
  if (!hapticsEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
