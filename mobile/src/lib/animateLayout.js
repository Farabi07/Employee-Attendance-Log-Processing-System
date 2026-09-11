// Call right before a state update that swaps which screen/section is
// rendered (see components/AccountMenu.tsx, screens/settings/*.tsx) so the
// swap crossfades instead of hard-cutting. Opacity-only, not the default
// scale+opacity preset — a full-screen swap growing in from a point looks
// like a glitch, a plain crossfade doesn't.
import { LayoutAnimation, Platform, UIManager } from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function animateLayout() {
  LayoutAnimation.configureNext(
    LayoutAnimation.create(220, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
  );
}
