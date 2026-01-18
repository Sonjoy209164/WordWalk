import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";
import { WordFlashcard } from "../components/WordFlashcard";

import { useAppStore } from "../store/useAppStore";
import { toISODate } from "../utils/date";
import type { ReviewRating } from "../utils/sm2";

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
  const todayISO = toISODate(new Date());

  const dailyGoal = useAppStore((s) => s.settings.dailyGoal);
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

  const isDone = currentIndex >= reviewQueue.length;
  const currentWordId = isDone ? undefined : reviewQueue[currentIndex];
  const currentWord = currentWordId ? wordsById[currentWordId] : undefined;

  const sessionProgress = reviewQueue.length === 0 ? 0 : currentIndex / reviewQueue.length;
  const totalProgress = Math.min(1, todayActivity.reviewedCount / dailyGoal);

  function handleRating(rating: ReviewRating) {
    if (!currentWordId) return;
    recordReview(currentWordId, rating, todayISO);
    setCurrentIndex((i) => i + 1);
    setIsRevealed(false);
  }

  return (
    <ScreenContainer>
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
            <ThemedText variant="muted">Queue progress: {Math.round(sessionProgress * 100)}%</ThemedText>
          </View>

          <View style={{ marginTop: 10 }}>
            {currentWord ? (
              <WordFlashcard
                word={currentWord.word}
                synonym={currentWord.synonym}
                sentence={currentWord.sentence}
                isRevealed={isRevealed}
                onToggleReveal={() => setIsRevealed((v) => !v)}
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
              style={{ flex: 1, minWidth: 120 }}
              variant="outline"
            />
            <PrimaryButton label="Easy" onPress={() => handleRating("easy")} style={{ flex: 1, minWidth: 120 }} />
          </View>

          <ThemedText variant="caption" style={{ marginTop: 10, textAlign: "center" }}>
            Tip: tap the card to reveal. Be honest—streaks hate self‑deception.
          </ThemedText>
        </View>
      )}
    </ScreenContainer>
  );
}
