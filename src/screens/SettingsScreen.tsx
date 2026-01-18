import React, { useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";

import { useAppStore } from "../store/useAppStore";

export function SettingsScreen() {
  const theme = useTheme();
  const dailyGoal = useAppStore((s) => s.settings.dailyGoal);
  const themeMode = useAppStore((s) => s.settings.themeMode);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const resetAll = useAppStore((s) => s.resetAll);

  const [goalDraft, setGoalDraft] = useState(String(dailyGoal));

  return (
    <ScreenContainer>
      <ThemedText variant="title">Settings</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Tune difficulty. Everything else is execution.
      </ThemedText>

      <ThemedCard style={{ marginTop: 16 }}>
        <ThemedText variant="subtitle">Daily goal</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Streak updates only when you hit this number each day.
        </ThemedText>

        <TextInput
          value={goalDraft}
          onChangeText={setGoalDraft}
          keyboardType="number-pad"
          placeholder="e.g., 20"
          placeholderTextColor={theme.colors.border}
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
          }}
        />

        <PrimaryButton
          label="Save goal"
          onPress={() => setDailyGoal(Number(goalDraft))}
          style={{ marginTop: 10 }}
        />
      </ThemedCard>

      <ThemedCard style={{ marginTop: 14 }}>
        <ThemedText variant="subtitle">Theme</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Use system, or force light/dark.
        </ThemedText>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <PrimaryButton
            label="System"
            variant={themeMode === "system" ? "primary" : "outline"}
            onPress={() => setThemeMode("system")}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Light"
            variant={themeMode === "light" ? "primary" : "outline"}
            onPress={() => setThemeMode("light")}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Dark"
            variant={themeMode === "dark" ? "primary" : "outline"}
            onPress={() => setThemeMode("dark")}
            style={{ flex: 1 }}
          />
        </View>
      </ThemedCard>

      <ThemedCard style={{ marginTop: 14 }}>
        <ThemedText variant="subtitle">Danger zone</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Reset clears streak, progress, and coins.
        </ThemedText>

        <PrimaryButton
          label="Reset all data"
          variant="outline"
          onPress={() =>
            Alert.alert(
              "Reset everything?",
              "This will clear your streak, progress, and todos.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Reset",
                  style: "destructive",
                  onPress: () => resetAll(),
                },
              ]
            )
          }
          style={{ marginTop: 10 }}
        />
      </ThemedCard>
    </ScreenContainer>
  );
}
