import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, TextInput, View } from "react-native";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";

type RouteParams = { title?: string; initialDurationSec?: number };

const MINUTES_PRESETS = [5, 10, 20, 35] as const;

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function safeParseMinutes(input: string): number | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;
  return n;
}

export function PracticeTimerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

  const { title, initialDurationSec } = (route.params ?? {}) as RouteParams;
  const initialSec = Number.isFinite(initialDurationSec) ? Math.max(60, Math.floor(initialDurationSec!)) : 10 * 60;

  const [baseDurationSec, setBaseDurationSec] = useState<number>(initialSec);
  const [remainingSec, setRemainingSec] = useState<number>(initialSec);
  const [minutesDraft, setMinutesDraft] = useState<string>(() => String(Math.round(initialSec / 60)));
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const endsAtMsRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      const endsAtMs = endsAtMsRef.current;
      if (!endsAtMs) return;
      const next = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
      setRemainingSec(next);
      if (next <= 0) {
        endsAtMsRef.current = null;
        setIsRunning(false);
        Alert.alert("Time!", "Timer finished.");
      }
    }, 250);
    return () => clearInterval(id);
  }, [isRunning]);

  const timeLabel = useMemo(() => formatTime(remainingSec), [remainingSec]);
  const progress = baseDurationSec <= 0 ? 0 : Math.max(0, Math.min(1, 1 - remainingSec / baseDurationSec));

  function applyMinutes(minutes: number) {
    const nextBase = Math.max(60, Math.floor(minutes * 60));
    setBaseDurationSec(nextBase);
    setRemainingSec(nextBase);
    setMinutesDraft(String(minutes));
  }

  function onStartPause() {
    if (isRunning) {
      const endsAtMs = endsAtMsRef.current;
      if (endsAtMs) {
        const next = Math.max(0, Math.ceil((endsAtMs - Date.now()) / 1000));
        setRemainingSec(next);
      }
      endsAtMsRef.current = null;
      setIsRunning(false);
      return;
    }

    if (remainingSec <= 0) {
      setRemainingSec(baseDurationSec);
    }
    endsAtMsRef.current = Date.now() + Math.max(0, remainingSec) * 1000;
    setIsRunning(true);
  }

  function onReset() {
    endsAtMsRef.current = null;
    setIsRunning(false);
    setRemainingSec(baseDurationSec);
  }

  function adjustBy(seconds: number) {
    if (isRunning) return;
    const next = Math.max(60, baseDurationSec + seconds);
    setBaseDurationSec(next);
    setRemainingSec(next);
    setMinutesDraft(String(Math.round(next / 60)));
  }

  const headerTitle = title?.trim() ? title.trim() : "Timer";

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <Pressable
            hitSlop={10}
            onPress={() => {
              if (!isRunning) {
                navigation.goBack();
                return;
              }
              Alert.alert("Exit timer?", "The timer is running.", [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Exit",
                  style: "destructive",
                  onPress: () => navigation.goBack(),
                },
              ]);
            }}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 6 })}
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: "900" }} numberOfLines={1}>
              {headerTitle}
            </ThemedText>
            <ThemedText variant="caption" style={{ marginTop: 2 }}>
              Timer only
            </ThemedText>
          </View>

          <View
            style={{
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.card,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="time-outline" size={16} color={theme.colors.text} />
              <ThemedText variant="caption" style={{ fontWeight: "900" }}>
                {timeLabel}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <ProgressBar progress={progress} height={8} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 + tabBarHeight }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedCard style={{ alignItems: "center" }}>
          <ThemedText style={{ fontSize: 62, fontWeight: "900", letterSpacing: 1, marginTop: 6 }}>
            {timeLabel}
          </ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            {isRunning ? "Running…" : "Paused"}
          </ThemedText>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <PrimaryButton
              label={isRunning ? "Pause" : "Start"}
              onPress={onStartPause}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Reset"
              variant="outline"
              onPress={onReset}
              disabled={isRunning}
              style={{ width: 120 }}
            />
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <PrimaryButton
              label="-1 min"
              variant="outline"
              onPress={() => adjustBy(-60)}
              disabled={isRunning}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="+1 min"
              variant="outline"
              onPress={() => adjustBy(60)}
              disabled={isRunning}
              style={{ flex: 1 }}
            />
          </View>
        </ThemedCard>

        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="subtitle">Set duration</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 6, lineHeight: 20 }}>
            Change duration while paused.
          </ThemedText>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            {MINUTES_PRESETS.map((m) => {
              const active = Math.round(baseDurationSec / 60) === m;
              return (
                <Pressable
                  key={m}
                  disabled={isRunning}
                  onPress={() => applyMinutes(m)}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.card,
                    opacity: isRunning ? 0.5 : pressed ? 0.85 : 1,
                  })}
                >
                  <ThemedText style={{ fontWeight: "900" }}>{m} min</ThemedText>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: 12 }}>
            <ThemedText variant="body" style={{ fontWeight: "800" }}>
              Custom minutes
            </ThemedText>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 10, alignItems: "center" }}>
              <TextInput
                value={minutesDraft}
                onChangeText={setMinutesDraft}
                editable={!isRunning}
                keyboardType="numeric"
                placeholder="10"
                placeholderTextColor={theme.colors.border}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  opacity: isRunning ? 0.6 : 1,
                }}
              />
              <PrimaryButton
                label="Apply"
                variant="outline"
                disabled={isRunning}
                onPress={() => {
                  const minutes = safeParseMinutes(minutesDraft);
                  if (!minutes) {
                    Alert.alert("Invalid minutes", "Enter a number like 10.");
                    return;
                  }
                  applyMinutes(Math.min(180, minutes));
                }}
                style={{ width: 110 }}
              />
            </View>
            <ThemedText variant="caption" style={{ marginTop: 8 }}>
              Max: 180 minutes.
            </ThemedText>
          </View>
        </ThemedCard>
      </ScrollView>
    </ScreenContainer>
  );
}

