// Ported from the getLocation() helper in frontend/src/pages/employee/Today.jsx
// (navigator.geolocation.getCurrentPosition) — same shape (resolves
// {lat, lon} or rejects with a user-facing message), expo-location instead
// of the browser API. Foreground/"When In Use" only, matching the web
// version's on-demand, one-shot usage (never watched/background).
import * as Location from "expo-location";

export async function getLocation() {
  const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error(
      canAskAgain
        ? "Location access was denied. Allow it to check in."
        : "Location access was denied. Enable it in your device Settings and try again."
    );
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    throw new Error("Couldn't get your location. Move to an open area and try again.");
  }
}
