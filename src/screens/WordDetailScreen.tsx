import React from "react";
import { View } from "react-native";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";

import { useAppStore } from "../store/useAppStore";
import { toISODate } from "../utils/date";
import type { ReviewRating } from "../utils/sm2";

type RouteParams = { wordId: string };

export function WordDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { wordId } = route.params as RouteParams;

  const word = useAppStore((s) => s.wordsById[wordId]);
  const toggleStar = useAppStore((s) => s.toggleStar);
  const recordReview = useAppStore((s) => s.recordReview);

  if (!word) {
    return (
      <ScreenContainer>
        <ThemedText variant="title">Word not found</ThemedText>
      </ScreenContainer>
    );
  }

  const todayISO = toISODate(new Date());

  function quickReview(rating: ReviewRating) {
    recordReview(wordId, rating, todayISO);
    navigation.navigate("Review");
  }

  return (
    <ScreenContainer>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText variant="title" style={{ textTransform: "lowercase" }}>
          {word.word}
        </ThemedText>
        <Ionicons
          name={word.isStarred ? "star" : "star-outline"}
          size={24}
          color={word.isStarred ? theme.colors.primary : theme.colors.text}
          onPress={() => toggleStar(wordId)}
        />
      </View>

      <ThemedText variant="subtitle" style={{ marginTop: 8 }}>
        {word.synonym}
      </ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 8, lineHeight: 20 }}>
        {word.sentence}
      </ThemedText>

      <ThemedCard style={{ marginTop: 16 }}>
        <ThemedText variant="subtitle">Spaced repetition</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Status: {word.srs.isNew ? "New" : "Learning"}
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 4 }}>
          Next due: {word.srs.dueDateISO}
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 4 }}>
          Interval: {word.srs.intervalDays} day(s) • Ease: {word.srs.easeFactor.toFixed(2)}
        </ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 4 }}>
          Times reviewed: {word.stats.timesReviewed}
        </ThemedText>
      </ThemedCard>

      <ThemedCard style={{ marginTop: 14 }}>
        <ThemedText variant="subtitle">Quick review (counts toward streak)</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Be honest about recall quality.
        </ThemedText>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <PrimaryButton label="Again" variant="outline" onPress={() => quickReview("again")} style={{ flex: 1, minWidth: 120 }} />
          <PrimaryButton label="Hard" variant="outline" onPress={() => quickReview("hard")} style={{ flex: 1, minWidth: 120 }} />
          <PrimaryButton label="Good" variant="outline" onPress={() => quickReview("good")} style={{ flex: 1, minWidth: 120 }} />
          <PrimaryButton label="Easy" onPress={() => quickReview("easy")} style={{ flex: 1, minWidth: 120 }} />
        </View>
      </ThemedCard>

      <PrimaryButton
        label="Back to set"
        variant="outline"
        onPress={() => navigation.goBack()}
        style={{ marginTop: 14 }}
      />
    </ScreenContainer>
  );
}
