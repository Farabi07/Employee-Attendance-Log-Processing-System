// Ported from frontend/src/theme.js — colors are copied verbatim (same
// hex values, same token names) so the mobile app stays visually
// consistent with the web app. Fonts differ from the web version: CSS can
// pick a weight variant from one @font-face family name automatically,
// but React Native needs the exact per-weight font-family string that
// @expo-google-fonts registers via useFonts() (see lib/useAppFonts.js) —
// so `fonts` below maps semantic name + weight to that exact string,
// instead of the web's single font-family-with-fallbacks strings.
//
// Dark mode note: `teal`, `navy`, `amber`, `coral` (the brand accent
// colors, always used as solid button/pill/icon fills) and `onAccent`
// (always-light text/icon color for on top of those fills) stay constant
// across both themes — they're already vivid enough to read on a dark
// page. Everything else here is a "neutral scaffolding" token (page
// background, card surface, borders, body text, tinted pill
// backgrounds) that genuinely flips between light and dark — see
// lib/ThemeContext.tsx, which is what screens actually consume via
// useTheme() instead of importing a palette directly.

export const lightColors = {
  ink: "#132A38",
  paper: "#EAF8F4",
  card: "#FFFFFF",
  line: "#C6D8E3",
  line2: "#EBF2F6",
  muted: "#5C7686",
  faint: "#93A8B4",
  teal: "#0EC0B4",
  tealDeep: "#0A8478",
  tealBg: "#DFF7F3",
  navy: "#2369A5",
  navyDeep: "#154A78",
  navyBg: "#E4EFF8",
  amber: "#C98A2C",
  amberBg: "#FBF0DF",
  coral: "#C4503B",
  coralBg: "#FBEAE6",
  onAccent: "#EAF8F4",
  shadow: "#0F2B24",
};

export const darkColors = {
  ink: "#EDF6F6",
  paper: "#0B1317",
  card: "#151F24",
  line: "#2C3D45",
  line2: "#1C282D",
  muted: "#93A9B2",
  faint: "#647880",
  teal: "#0EC0B4",
  tealDeep: "#7BEEE0",
  tealBg: "#10322E",
  navy: "#2369A5",
  navyDeep: "#BFE3FB",
  navyBg: "#132B3D",
  amber: "#E3A94A",
  amberBg: "#3A2A13",
  coral: "#E2695A",
  coralBg: "#3B1D18",
  onAccent: "#EAF8F4",
  shadow: "#000000",
};

export const fonts = {
  display: {
    medium: "SpaceGrotesk_500Medium",
    semibold: "SpaceGrotesk_600SemiBold",
    bold: "SpaceGrotesk_700Bold",
  },
  body: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
  },
  mono: {
    regular: "IBMPlexMono_400Regular",
    medium: "IBMPlexMono_500Medium",
  },
};
