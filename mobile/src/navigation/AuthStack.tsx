import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Login from "../screens/auth/Login";
import Signup from "../screens/auth/Signup";
import ForgotPassword from "../screens/auth/ForgotPassword";
import ResetPasswordConfirm from "../screens/auth/ResetPasswordConfirm";

const Stack = createNativeStackNavigator();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={Login} />
      <Stack.Screen name="Signup" component={Signup} />
      <Stack.Screen name="ForgotPassword" component={ForgotPassword} />
      <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirm} />
    </Stack.Navigator>
  );
}
