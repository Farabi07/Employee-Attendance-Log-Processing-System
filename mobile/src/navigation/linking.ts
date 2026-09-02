import type { LinkingOptions } from "@react-navigation/native";

// Password-reset deep link: the emailed link is
// timetap://password/reset/confirm/:uid/:token — React Navigation parses
// uid/token straight into route.params, which is simpler than the web
// app's manual window.location.pathname regex (see App.jsx there).
//
// Each of the 4 Stripe redirect flows gets its own return path here too
// (Phase 3), added once expo-web-browser's openAuthSessionAsync wiring
// lands — see the plan's "Navigation" section for the exact path list.
export const linking: LinkingOptions<any> = {
  prefixes: ["timetap://"],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: "login",
          Signup: "signup",
          ForgotPassword: "forgot-password",
          ResetPasswordConfirm: "password/reset/confirm/:uid/:token",
        },
      },
    },
  },
};
