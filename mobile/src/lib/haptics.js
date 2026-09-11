// Thin wrapper around expo-haptics — every call is fire-and-forget and
// swallows errors, since haptics are pure polish (unsupported hardware,
// muted "system haptics" setting, web/simulator) and must never be able
// to break the action they're attached to.
import * as Haptics from "expo-haptics";

export function tapLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function tapSelection() {
  Haptics.selectionAsync().catch(() => {});
}

export function tapSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

export function tapWarning() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
