import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useTheme } from "@react-navigation/native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, View } from "react-native";

import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";
import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { WordFlashcard } from "../components/WordFlashcard";

import { useAppStore } from "../store/useAppStore";
import { toISODate } from "../utils/date";
import type { ReviewRating } from "../utils/sm2";
import { speakEnglishSequence, stopSpeaking } from "../utils/speech";

function buildReviewQueue(params: {
  dueIds: string[];
  newIds: string[];
  dailyGoal: number;
}): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();
  for (const id of params.dueIds) {
    if (merged.length >= params.dailyGoal) break;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  for (const id of params.newIds) {
    if (merged.length >= params.dailyGoal) break;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

export function ReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();
  const todayISO = toISODate(new Date());

  const dailyGoal = useAppStore((s) => s.settings.dailyGoal);
  const speechRate = useAppStore((s) => s.settings.speech.rate);
  const todayActivity = useAppStore((s) => s.getTodayActivity(todayISO));
  const dueIds = useAppStore((s) => s.getDueWordIds(todayISO));
  const newIds = useAppStore((s) => s.getNewWordIds());
  const wordsById = useAppStore((s) => s.wordsById);
  const recordReview = useAppStore((s) => s.recordReview);

  const reviewQueue = useMemo(
    () => buildReviewQueue({ dueIds, newIds, dailyGoal }),
    [dueIds, newIds, dailyGoal]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [isWalkModeOn, setIsWalkModeOn] = useState(false);
  const [isSpeedPickerOpen, setIsSpeedPickerOpen] = useState(false);

  const speedOptions = useMemo(
    () =>
      [
        { key: "slow", label: "Slow", rateMultiplier: 0.9, gapMs: 900 },
        { key: "normal", label: "Normal", rateMultiplier: 1.0, gapMs: 600 },
        { key: "fast", label: "Fast", rateMultiplier: 1.1, gapMs: 350 },
      ] as const,
    []
  );
  const [speedKey, setSpeedKey] = useState<(typeof speedOptions)[number]["key"]>("normal");
  const speed = useMemo(
    () => speedOptions.find((p) => p.key === speedKey) ?? speedOptions[1],
    [speedKey, speedOptions]
  );

  const walkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isWalkModeOnRef = useRef(false);
  useEffect(() => {
    isWalkModeOnRef.current = isWalkModeOn;
  }, [isWalkModeOn]);

  useEffect(() => {
    return () => {
      if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
      stopSpeaking();
    };
  }, []);

  const isDone = currentIndex >= reviewQueue.length;
  const currentWordId = isDone ? undefined : reviewQueue[currentIndex];
  const currentWord = currentWordId ? wordsById[currentWordId] : undefined;

  const sessionProgress = reviewQueue.length === 0 ? 0 : currentIndex / reviewQueue.length;
  const totalProgress = Math.min(1, todayActivity.reviewedCount / dailyGoal);

  function handleRating(rating: ReviewRating) {
    if (!currentWordId) return;
    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
    stopSpeaking();
    recordReview(currentWordId, rating, todayISO);
    setCurrentIndex((i) => i + 1);
    setIsRevealed(false);
  }

  useEffect(() => {
    if (!isWalkModeOn) return;
    if (!currentWord) return;
    if (isDone) return;

    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
    setIsRevealed(true);

    const rate = Math.max(0.5, Math.min(1.2, (speechRate ?? 0.95) * speed.rateMultiplier));
    speakEnglishSequence({
      texts: [currentWord.word, currentWord.synonym, currentWord.sentence],
      rate,
      interrupt: true,
      onDone: () => {
        if (!isWalkModeOnRef.current) return;
        walkTimerRef.current = setTimeout(() => {
          setCurrentIndex((i) => i + 1);
          setIsRevealed(false);
        }, speed.gapMs);
      },
    });
  }, [currentWord, isDone, isWalkModeOn, speechRate, speed.gapMs, speed.rateMultiplier]);

  return (
    <ScreenContainer style={{ paddingBottom: 16 + tabBarHeight }}>
      <ThemedText variant="title">Review</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Daily goal: {dailyGoal} • Done today: {todayActivity.reviewedCount}
      </ThemedText>

      <View style={{ marginTop: 12 }}>
        <ProgressBar progress={totalProgress} />
      </View>

      {reviewQueue.length === 0 ? (
        <ThemedCard style={{ marginTop: 18 }}>
          <ThemedText variant="subtitle">Nothing due right now.</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            You can increase your daily goal in Settings if you want more volume.
          </ThemedText>
        </ThemedCard>
      ) : isDone ? (
        <ThemedCard style={{ marginTop: 18 }}>
          <ThemedText variant="subtitle">Session complete.</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            If you hit your daily goal, your streak will update automatically.
          </ThemedText>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <PrimaryButton
              label="Start another"
              onPress={() => {
                if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
                stopSpeaking();
                setIsWalkModeOn(false);
                setCurrentIndex(0);
                setIsRevealed(false);
              }}
              style={{ flex: 1 }}
            />
            <PrimaryButton label="Go Home" variant="outline" onPress={() => navigation.navigate("Home")} style={{ width: 120 }} />
          </View>
        </ThemedCard>
      ) : (
        <View style={{ marginTop: 18, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <ThemedText variant="muted">
              Card {currentIndex + 1} / {reviewQueue.length}
            </ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Pressable
                onPress={() => setIsSpeedPickerOpen(true)}
                hitSlop={10}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                }}
              >
                <ThemedText variant="caption" style={{ fontWeight: "900" }}>
                  {speed.label}
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={() => {
                  if (isWalkModeOn) {
                    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
                    stopSpeaking();
                    setIsWalkModeOn(false);
                  } else {
                    setIsWalkModeOn(true);
                  }
                }}
                hitSlop={10}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.card,
                }}
              >
                <Ionicons name={isWalkModeOn ? "pause" : "play"} size={18} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>

          <ThemedText variant="muted" style={{ marginTop: 6 }}>
            Queue progress: {Math.round(sessionProgress * 100)}%
          </ThemedText>

          <View style={{ marginTop: 10 }}>
            {currentWord ? (
              <WordFlashcard
                word={currentWord.word}
                synonym={currentWord.synonym}
                sentence={currentWord.sentence}
                isRevealed={isRevealed}
                onToggleReveal={() => {
                  if (isWalkModeOn) return;
                  setIsRevealed((v) => !v);
                }}
              />
            ) : (
              <ThemedCard>
                <ThemedText variant="muted">Loading…</ThemedText>
              </ThemedCard>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <PrimaryButton
              label="Again"
              onPress={() => handleRating("again")}
              style={{ flex: 1, minWidth: 120 }}
              variant="outline"
            />
            <PrimaryButton
              label="Hard"
              onPress={() => handleRating("hard")}
              style={{ flex: 1, minWidth: 120 }}
              variant="outline"
            />
            <PrimaryButton
              label="Good"
              onPress={() => handleRating("good")}
              style={{ flex: 1, minWidth: 80 }}
              variant="outline"
            />
            <PrimaryButton
              label="Memorized"
              onPress={() => handleRating("easy")}
              style={{ flex: 1, minWidth: 120 }}
              tone="success"
            />
          </View>

          <Modal
            visible={isSpeedPickerOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsSpeedPickerOpen(false)}
          >
            <Pressable
              onPress={() => setIsSpeedPickerOpen(false)}
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
                }}
              >
                <ThemedText variant="subtitle">Walk mode speed</ThemedText>
                <ThemedText variant="muted" style={{ marginTop: 6 }}>
                  Pick how fast cards are spoken and advanced.
                </ThemedText>

                <View style={{ gap: 10, marginTop: 12 }}>
                  {speedOptions.map((p) => {
                    const active = p.key === speedKey;
                    return (
                      <Pressable
                        key={p.key}
                        onPress={() => {
                          setSpeedKey(p.key);
                          setIsSpeedPickerOpen(false);
                        }}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 12,
                          borderRadius: 14,
                          borderWidth: active ? 2 : 1,
                          borderColor: active ? theme.colors.primary : theme.colors.border,
                          backgroundColor: theme.colors.background,
                        }}
                      >
                        <ThemedText style={{ fontWeight: "900" }}>{p.label}</ThemedText>
                        <ThemedText variant="muted" style={{ marginTop: 4 }}>
                          Speech: {Math.round(p.rateMultiplier * 100)}% • Gap: {Math.round(p.gapMs / 100) / 10}s
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <PrimaryButton
                  label="Close"
                  variant="outline"
                  onPress={() => setIsSpeedPickerOpen(false)}
                  style={{ marginTop: 12 }}
                />
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      )}
    </ScreenContainer>
  );
}
