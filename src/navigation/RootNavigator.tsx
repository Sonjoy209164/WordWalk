import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@react-navigation/native";

import type { RootStackParamList, TabsParamList } from "./types";

import { HomeScreen } from "../screens/HomeScreen";
import { ReviewScreen } from "../screens/ReviewScreen";
import { TestStackNavigator } from "./TestStackNavigator";
import { GroupsScreen } from "../screens/GroupsScreen";
import { TodoScreen } from "../screens/TodoScreen";
import { RewardsScreen } from "../screens/RewardsScreen";
import { GroupDetailScreen } from "../screens/GroupDetailScreen";
import { WordDetailScreen } from "../screens/WordDetailScreen";
import { SettingsScreen } from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<TabsParamList>();

function TabsNavigator() {
  const theme = useTheme();

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
        },
        tabBarIcon: ({ color, size }) => {
          let name: keyof typeof Ionicons.glyphMap = "home";
          if (route.name === "Home") name = "home";
          if (route.name === "Review") name = "sparkles";
          if (route.name === "Test") name = "school";
          if (route.name === "Groups") name = "albums";
          if (route.name === "Todo") name = "checkmark-done";
          if (route.name === "Rewards") name = "trophy";
          return <Ionicons name={name} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Review" component={ReviewScreen} />
      <Tabs.Screen name="Test" component={TestStackNavigator} />
      <Tabs.Screen name="Groups" component={GroupsScreen} />
      <Tabs.Screen name="Todo" component={TodoScreen} />
      <Tabs.Screen name="Rewards" component={RewardsScreen} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={({ route }) => ({ title: `Set ${route.params.groupId}` })}
      />
      <Stack.Screen name="WordDetail" component={WordDetailScreen} options={{ title: "Word" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Stack.Navigator>
  );
}
