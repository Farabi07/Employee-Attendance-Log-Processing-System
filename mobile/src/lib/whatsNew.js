// Bump WHATS_NEW_VERSION and replace WHATS_NEW_ITEMS whenever there's a
// user-facing change worth calling out — components/WhatsNewModal.tsx
// compares this against the last version SecureStore has recorded and
// shows once per bump, not on every launch. Keep the list short (3-4
// items) — this is a highlight reel, not a changelog.
export const WHATS_NEW_VERSION = "2026-09-account-menu";

export const WHATS_NEW_ITEMS = [
  {
    title: "A new account menu",
    body: "Tap your profile picture for Profile, Settings, Privacy policy, Help center, and Logout — all in one place.",
  },
  {
    title: "Notifications, your way",
    body: "Turn push notifications on or off anytime from Settings, and browse your full notification history there too.",
  },
  {
    title: "Night mode",
    body: "Switch between Light and Night mode from Settings, independent of your phone's system theme.",
  },
];
