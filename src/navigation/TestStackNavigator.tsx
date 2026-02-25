import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import type { TestStackParamList } from "./types";

import { TestSetupScreen } from "../screens/TestSetupScreen";
import { PracticeChaptersScreen } from "../screens/PracticeChaptersScreen";
import { PracticeSetupScreen } from "../screens/PracticeSetupScreen";
import { PracticeTakeScreen } from "../screens/PracticeTakeScreen";
import { PracticeResultScreen } from "../screens/PracticeResultScreen";
import { PracticeTimerScreen } from "../screens/PracticeTimerScreen";
import { TakeTestScreen } from "../screens/TakeTestScreen";
import { TestResultScreen } from "../screens/TestResultScreen";

const Stack = createNativeStackNavigator<TestStackParamList>();

export function TestStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TestSetup" component={TestSetupScreen} options={{ title: "Test" }} />
      <Stack.Screen name="PracticeChapters" component={PracticeChaptersScreen} options={{ title: "Timed Practice" }} />
      <Stack.Screen name="PracticeSetup" component={PracticeSetupScreen} options={{ title: "Setup" }} />
      <Stack.Screen name="PracticeTake" component={PracticeTakeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PracticeResult" component={PracticeResultScreen} options={{ title: "Results" }} />
      <Stack.Screen name="PracticeTimer" component={PracticeTimerScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TakeTest" component={TakeTestScreen} options={{ headerShown: false }} />
      <Stack.Screen name="TestResult" component={TestResultScreen} options={{ title: "Results" }} />
    </Stack.Navigator>
  );
}
