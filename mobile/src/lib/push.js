// New — the web app has no push infrastructure to port from (its
// NotificationBell just polls every 20s). Registers this device for real
// push via Expo's push service and hands the resulting token to the
// backend's new /account/api/v1/push_token/ endpoint (see
// authentication/views/account_views.py's registerPushToken).
//
// Requires an EAS project id to actually mint a token (getExpoPushTokenAsync
// needs one) — reads it from app.json's extra.eas.projectId, which only
// exists after running `eas init` once. Until then this fails silently and
// the app falls back to NotificationBell's polling as the only channel —
// push is progressive enhancement, never a hard requirement to use the app.
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { api } from "./api";
import { endpoints } from "./endpoints";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications() {
  try {
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
