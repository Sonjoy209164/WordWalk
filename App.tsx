import "react-native-gesture-handler";

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useResolvedNavigationTheme, useIsDarkMode } from "./src/theme/useResolvedNavigationTheme";
import { useAppStore } from "./src/store/useAppStore";
import { View } from "react-native";
import { FloatingTranslatorFab } from "./src/components/FloatingTranslatorFab";

const seedData = require("./src/data/words.json");
const practiceSeedData = require("./src/data/practiceQuestions.json");

export default function App() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const bootstrapFromSeed = useAppStore((s) => s.bootstrapFromSeed);
  const bootstrapPracticeQuestionsFromSeed = useAppStore((s) => s.bootstrapPracticeQuestionsFromSeed);
  const isBootstrapped = useAppStore((s) => s.isBootstrapped);
  // If AsyncStorage ended up in a stale state (e.g., isBootstrapped=true but wordsById is empty),
  // force-seed again so Review/Test screens always have data.
  const wordsCount = useAppStore((s) => Object.keys(s.wordsById).length);
  const groupsCount = useAppStore((s) => s.groups.length);
  const navigationTheme = useResolvedNavigationTheme();
  const isDarkMode = useIsDarkMode();
  const seedGroupsCount = seedData.groups?.length ?? 0;
  const seedChaptersCount = practiceSeedData.chapters?.length ?? 0;

  useEffect(() => {
    if (!hasHydrated) return;
    // Always attempt to reconcile seed data (cheap when up-to-date).
    // This allows shipping new seed sets (e.g., Set 4–19) and running maintenance (like de-duping).
    bootstrapFromSeed(seedData);
    bootstrapPracticeQuestionsFromSeed(practiceSeedData);
  }, [
    bootstrapFromSeed,
    bootstrapPracticeQuestionsFromSeed,
    groupsCount,
    hasHydrated,
    isBootstrapped,
    seedChaptersCount,
    seedGroupsCount,
    wordsCount,
  ]);

  if (!hasHydrated) return null;

  return (
    <SafeAreaProvider>
    <NavigationContainer theme={navigationTheme}>
      <View style={{ flex: 1 }}>
        <RootNavigator />
        <FloatingTranslatorFab />
      </View>
    </NavigationContainer>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </SafeAreaProvider>
  );
}
