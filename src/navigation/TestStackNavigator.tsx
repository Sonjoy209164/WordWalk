import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { TestStackParamList } from "./types";

import { TestSetupScreen } from "../screens/TestSetupScreen";
import { TakeTestScreen } from "../screens/TakeTestScreen";
import { TestResultScreen } from "../screens/TestResultScreen";

const Stack = createNativeStackNavigator<TestStackParamList>();

export function TestStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TestSetup" component={TestSetupScreen} options={{ title: "Test" }} />
      <Stack.Screen name="TakeTest" component={TakeTestScreen} options={{ title: "Take Test" }} />
      <Stack.Screen name="TestResult" component={TestResultScreen} options={{ title: "Results" }} />
    </Stack.Navigator>
  );
}
