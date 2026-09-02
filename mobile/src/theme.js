// Ported from frontend/src/theme.js — colors are copied verbatim (same
// hex values, same token names) so the mobile app stays visually
// consistent with the web app. Fonts differ from the web version: CSS can
// pick a weight variant from one @font-face family name automatically,
// but React Native needs the exact per-weight font-family string that
// @expo-google-fonts registers via useFonts() (see lib/useAppFonts.js) —
// so `fonts` below maps semantic name + weight to that exact string,
// instead of the web's single font-family-with-fallbacks strings.

export const T = {
  ink: "#132A38",
  paper: "#F5F9FB",
  card: "#FFFFFF",
  line: "#DCE6ED",
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
