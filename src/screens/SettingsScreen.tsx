import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import * as Speech from "expo-speech";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";

import { useAppStore } from "../store/useAppStore";
import { speakEnglishWord, stopSpeaking } from "../utils/speech";

export function SettingsScreen() {
  const theme = useTheme();
  const dailyGoal = useAppStore((s) => s.settings.dailyGoal);
  const themeMode = useAppStore((s) => s.settings.themeMode);
  const speechSettings = useAppStore((s) => s.settings.speech);
  const setDailyGoal = useAppStore((s) => s.setDailyGoal);
  const setThemeMode = useAppStore((s) => s.setThemeMode);
  const setSpeechLanguage = useAppStore((s) => s.setSpeechLanguage);
  const setSpeechVoiceId = useAppStore((s) => s.setSpeechVoiceId);
  const resetAll = useAppStore((s) => s.resetAll);

  const [goalDraft, setGoalDraft] = useState(String(dailyGoal));
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [isVoicePickerOpen, setIsVoicePickerOpen] = useState(false);

  useEffect(() => {
    let isActive = true;
    Speech.getAvailableVoicesAsync()
      .then((v) => {
        if (!isActive) return;
        setVoices(v ?? []);
      })
      .catch(() => {
        if (!isActive) return;
        setVoices([]);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const englishVoices = useMemo(
    () => voices.filter((v) => (v.language ?? "").toLowerCase().startsWith("en")),
    [voices]
  );

  const filteredVoices = useMemo(() => {
    if (speechSettings.language === "system") return englishVoices;
    return englishVoices.filter((v) => v.language === speechSettings.language);
  }, [englishVoices, speechSettings.language]);

  const selectedVoice = useMemo(() => {
    if (!speechSettings.voiceId) return undefined;
    return voices.find((v) => v.identifier === speechSettings.voiceId);
  }, [speechSettings.voiceId, voices]);

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
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
        <ThemedText variant="subtitle">Voice</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Choose accent and voice. “Male/Female” depends on installed system voices—pick the one you like.
        </ThemedText>

        <ThemedText variant="body" style={{ marginTop: 12, fontWeight: "800" }}>
          Accent
        </ThemedText>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <PrimaryButton
            label="System"
            variant={speechSettings.language === "system" ? "primary" : "outline"}
            onPress={() => setSpeechLanguage("system")}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="American"
            variant={speechSettings.language === "en-US" ? "primary" : "outline"}
            onPress={() => setSpeechLanguage("en-US")}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="British"
            variant={speechSettings.language === "en-GB" ? "primary" : "outline"}
            onPress={() => setSpeechLanguage("en-GB")}
            style={{ flex: 1 }}
          />
        </View>

        <ThemedText variant="body" style={{ marginTop: 12, fontWeight: "800" }}>
          Selected voice
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          {selectedVoice ? `${selectedVoice.name} (${selectedVoice.language})` : "Default"}
        </ThemedText>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
          <PrimaryButton
            label="Choose voice"
            variant="outline"
            onPress={() => setIsVoicePickerOpen(true)}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Test"
            onPress={() => speakEnglishWord({ text: "Hello. This is your selected voice." })}
            style={{ width: 110 }}
          />
        </View>

        <PrimaryButton
          label="Stop"
          variant="outline"
          onPress={() => stopSpeaking()}
          style={{ marginTop: 10 }}
        />
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

      <Modal visible={isVoicePickerOpen} transparent animationType="fade" onRequestClose={() => setIsVoicePickerOpen(false)}>
        <Pressable
          onPress={() => setIsVoicePickerOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", padding: 16, justifyContent: "center" }}
        >
          <Pressable
            onPress={() => null}
            style={{
              backgroundColor: theme.colors.card,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: theme.colors.border,
              maxHeight: "80%",
            }}
          >
            <ThemedText variant="subtitle">Choose a voice</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 6 }}>
              Showing {filteredVoices.length} English voice(s).
            </ThemedText>

            <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ gap: 10 }}>
                <Pressable
                  onPress={() => {
                    setSpeechVoiceId(undefined);
                    setIsVoicePickerOpen(false);
                  }}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.background,
                  }}
                >
                  <ThemedText style={{ fontWeight: "900" }}>Default</ThemedText>
                  <ThemedText variant="muted" style={{ marginTop: 4 }}>
                    Use system default for your device.
                  </ThemedText>
                </Pressable>

                {filteredVoices.map((v) => {
                  const isSelected = v.identifier === speechSettings.voiceId;
                  return (
                    <Pressable
                      key={v.identifier}
                      onPress={() => {
                        setSpeechVoiceId(v.identifier);
                        setIsVoicePickerOpen(false);
                        speakEnglishWord({ text: "Hello. This is the selected voice." });
                      }}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        backgroundColor: theme.colors.background,
                      }}
                    >
                      <ThemedText style={{ fontWeight: "900" }}>{v.name}</ThemedText>
                      <ThemedText variant="muted" style={{ marginTop: 4 }}>
                        {v.language} • {v.quality}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <PrimaryButton label="Close" variant="outline" onPress={() => setIsVoicePickerOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton
                label="Stop"
                variant="outline"
                onPress={() => stopSpeaking()}
                style={{ width: 110 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
