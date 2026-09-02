import React from "react";
import PlaceholderScreen from "../components/PlaceholderScreen";

// Later phase (Stripe subscription checkout via expo-web-browser) — ported
// from frontend/src/components/SubscribeGate.jsx. Shown when
// billing.has_active_access is false, same as the web gate in App.jsx.
export default function SubscribeGateScreen() {
  return <PlaceholderScreen title="Subscribe" />;
}
