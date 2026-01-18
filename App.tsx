import "react-native-gesture-handler";

import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useResolvedNavigationTheme, useIsDarkMode } from "./src/theme/useResolvedNavigationTheme";
import { useAppStore } from "./src/store/useAppStore";

const seedData = require("./src/data/words.json");

export default function App() {
  const bootstrapFromSeed = useAppStore((s) => s.bootstrapFromSeed);
  const isBootstrapped = useAppStore((s) => s.isBootstrapped);
  // If AsyncStorage ended up in a stale state (e.g., isBootstrapped=true but wordsById is empty),
  // force-seed again so Review/Test screens always have data.
  const wordsCount = useAppStore((s) => Object.keys(s.wordsById).length);
  const navigationTheme = useResolvedNavigationTheme();
  const isDarkMode = useIsDarkMode();

  useEffect(() => {
    if (!isBootstrapped || wordsCount === 0) bootstrapFromSeed(seedData);
  }, [bootstrapFromSeed, isBootstrapped, wordsCount]);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
    </SafeAreaProvider>
  );
}
