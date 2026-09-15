// Deepened from the original bright teal/navy pairing toward a richer,
// more considered version of the same hue family (see the approved
// palette-refresh proposal) — same brand, more premium depth. onAccent
// mirrors mobile's theme.js token of the same name/spirit: a mint-tinted
// near-white rather than pure #fff, so text/icons on a solid accent fill
// (buttons, active nav, chat bubbles) read a touch softer.
export const T = {
  ink: "#0F1E2B",
  paper: "#F6F8FA",
  card: "#FFFFFF",
  line: "#D7E1E8",
  line2: "#EAF0F4",
  muted: "#54697A",
  faint: "#8798A5",
  teal: "#0C8F82",
  tealDeep: "#086158",
  tealBg: "#E3F5F2",
  navy: "#1B4A73",
  navyDeep: "#0F2E4A",
  navyBg: "#E7EEF5",
  amber: "#AD7A1E",
  amberBg: "#F8EFDC",
  coral: "#B14934",
  coralBg: "#F8E7E3",
  onAccent: "#EAF8F4",
  // Modal/overlay backdrop — was hardcoded as rgba(22,35,58,0.55) in 7
  // separate files; same idea, now ink-derived and defined once.
  overlay: "rgba(15, 30, 43, 0.6)",
  // RGB triple (not a full color) so callers compose layered shadows via
  // `rgba(${T.shadow}, <alpha>)` at whatever opacity/stop they need — see
  // Card.jsx for the standard 3-stop elevation built from this.
  shadow: "15, 30, 43",
};

export const fontDisplay = "'Space Grotesk', 'Inter', sans-serif";
export const fontBody = "'Inter', sans-serif";
export const fontMono = "'IBM Plex Mono', monospace";
