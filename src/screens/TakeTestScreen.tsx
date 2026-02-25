import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";

import { useAppStore } from "../store/useAppStore";
import { BrandColors } from "../theme/colors";

const CHOICE_LABELS = ["A", "B", "C", "D", "E"];

function countAnswered(answersByQuestionId: Record<string, number>): number {
  return Object.keys(answersByQuestionId).length;
}

function hexToRgba(hex: string, alpha: number): string {
  const raw = (hex ?? "").trim().replace("#", "");
  if (raw.length < 6) return `rgba(0,0,0,${alpha})`;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if (![r, g, b].every(Number.isFinite)) return `rgba(0,0,0,${alpha})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function TakeTestScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);

  const session = useAppStore((s) => s.activeTestSession);
  const answerCurrentTestQuestion = useAppStore((s) => s.answerCurrentTestQuestion);
  const clearCurrentTestAnswer = useAppStore((s) => s.clearCurrentTestAnswer);
  const goToNextTestQuestion = useAppStore((s) => s.goToNextTestQuestion);
  const goToPrevTestQuestion = useAppStore((s) => s.goToPrevTestQuestion);
  const goToTestQuestion = useAppStore((s) => s.goToTestQuestion);
  const toggleMarkCurrentTestQuestion = useAppStore((s) => s.toggleMarkCurrentTestQuestion);
  const submitActiveTest = useAppStore((s) => s.submitActiveTest);
  const toggleCurrentExplanation = useAppStore((s) => s.toggleCurrentExplanation);

  const total = session?.questions.length ?? 0;
  const currentIndex = session?.currentIndex ?? 0;
  const currentQuestion = session ? session.questions[currentIndex] : undefined;

  const answeredCount = useMemo(
    () => (session ? countAnswered(session.answersByQuestionId) : 0),
    [session]
  );
  const progress = total === 0 ? 0 : (currentIndex + 1) / total;

  const currentChoiceIndex = useMemo(() => {
    if (!session || !currentQuestion) return undefined;
    return session.answersByQuestionId[currentQuestion.id];
  }, [session, currentQuestion]);

  const isMarked = useMemo(() => {
    if (!session || !currentQuestion) return false;
    return Boolean(session.markedByQuestionId[currentQuestion.id]);
  }, [session, currentQuestion]);

  const isExplanationVisible = useMemo(() => {
    if (!session || !currentQuestion) return false;
    return Boolean(session.isExplanationVisibleByQuestionId[currentQuestion.id]);
  }, [session, currentQuestion]);

  if (!session) {
    return (
      <ScreenContainer edges={["left", "right", "bottom"]}>
        <ThemedText variant="title">Take Test</ThemedText>
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="muted">No active test session. Start from the Test tab.</ThemedText>
        </ThemedCard>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenContainer edges={["left", "right", "bottom"]}>
        <ThemedText variant="title">Test: {session.groupName}</ThemedText>
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="muted">Loading…</ThemedText>
        </ThemedCard>
      </ScreenContainer>
    );
  }

  const isSubmitted = session.isSubmitted;
  const isAnswered = typeof currentChoiceIndex === "number";
  const isCorrect = isSubmitted && isAnswered && currentChoiceIndex === currentQuestion.correctIndex;
  const bottomPadding = 16 + tabBarHeight;

  const primaryTint = hexToRgba(theme.colors.primary, theme.dark ? 0.22 : 0.10);
  const dangerTint = hexToRgba(BrandColors.danger, theme.dark ? 0.18 : 0.08);

  return (
    <ScreenContainer style={{ padding: 0 }}>
      {/* Top header (GRE-ish) */}
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
            onPress={() => navigation.navigate("TestSetup")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 6 })}
          >
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: "900" }} numberOfLines={1}>
              {session.groupName}
            </ThemedText>
            <ThemedText variant="caption" style={{ marginTop: 2 }}>
              Verbal Reasoning • Hard
            </ThemedText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              hitSlop={10}
              onPress={toggleMarkCurrentTestQuestion}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingVertical: 6,
                paddingHorizontal: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons
                  name={isMarked ? "bookmark" : "bookmark-outline"}
                  size={18}
                  color={isMarked ? theme.colors.primary : theme.colors.text}
                />
                <ThemedText variant="caption" style={{ fontWeight: "900" }}>
                  Mark
                </ThemedText>
              </View>
            </Pressable>

            <Pressable
              hitSlop={10}
              onPress={() => setIsNavigatorOpen(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.card,
              })}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="grid-outline" size={18} color={theme.colors.text} />
                <ThemedText variant="caption" style={{ fontWeight: "900" }}>
                  {currentIndex + 1}/{total}
                </ThemedText>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <ProgressBar progress={progress} height={8} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <ThemedText variant="muted">
            Question {currentIndex + 1} of {total}
          </ThemedText>
          <ThemedText variant="muted">
            Answered {answeredCount}/{total}
          </ThemedText>
        </View>
      </View>

      {/* Main content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedCard>
          <ThemedText variant="caption" style={{ fontWeight: "900" }}>
            Select one entry for the blank.
          </ThemedText>

          <ThemedText style={{ marginTop: 10, lineHeight: 22 }}>{currentQuestion.stem}</ThemedText>

          <View style={{ marginTop: 14, gap: 10 }}>
            {currentQuestion.choices.map((choice, idx) => {
              const isSelected = currentChoiceIndex === idx;
              const isTheCorrectChoice = idx === currentQuestion.correctIndex;
              const showCorrect = isSubmitted && isTheCorrectChoice;
              const showWrong = isSubmitted && isSelected && !isTheCorrectChoice;

              const borderColor = showCorrect
                ? theme.colors.primary
                : showWrong
                ? BrandColors.danger
                : isSelected
                ? theme.colors.primary
                : theme.colors.border;

              const backgroundColor = showCorrect
                ? primaryTint
                : showWrong
                ? dangerTint
                : isSelected
                ? primaryTint
                : theme.colors.card;

              const letterBg = isSelected || showCorrect ? borderColor : "transparent";
              const letterTextColor = isSelected || showCorrect ? "white" : theme.colors.text;

              return (
                <Pressable
                  key={`${choice}-${idx}`}
                  disabled={isSubmitted}
                  onPress={() => answerCurrentTestQuestion(idx)}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor,
                    backgroundColor,
                    opacity: pressed ? 0.92 : 1,
                  })}
                >
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor,
                        backgroundColor: letterBg,
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 1,
                      }}
                    >
                      <ThemedText style={{ fontWeight: "900", color: letterTextColor }}>
                        {CHOICE_LABELS[idx]}
                      </ThemedText>
                    </View>

                    <View style={{ flex: 1 }}>
                      <ThemedText style={{ lineHeight: 22 }}>{choice}</ThemedText>
                    </View>

                    {isSubmitted && isTheCorrectChoice ? (
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                    ) : null}
                    {isSubmitted && showWrong ? (
                      <Ionicons name="close-circle" size={20} color={BrandColors.danger} />
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* After submission: show correctness + explanation toggle */}
          {isSubmitted ? (
            <View style={{ marginTop: 14, gap: 10 }}>
              <ThemedText variant="muted" style={{ lineHeight: 20 }}>
                {isAnswered
                  ? isCorrect
                    ? "Correct."
                    : `Incorrect. Correct answer: ${CHOICE_LABELS[currentQuestion.correctIndex]}) ${currentQuestion.choices[currentQuestion.correctIndex]}`
                  : "Unanswered. The question is counted as incorrect."}
              </ThemedText>

              <PrimaryButton
                label={isExplanationVisible ? "Hide answer & explanation" : "Show answer & explanation"}
                variant="outline"
                onPress={toggleCurrentExplanation}
              />

              {isExplanationVisible ? (
                <ThemedCard style={{ marginTop: 6, backgroundColor: theme.colors.background }}>
                  <ThemedText style={{ lineHeight: 22 }}>{currentQuestion.explanation}</ThemedText>
                </ThemedCard>
              ) : null}
            </View>
          ) : null}
        </ThemedCard>
      </ScrollView>

      {/* Bottom control bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: bottomPadding,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          backgroundColor: theme.colors.background,
        }}
      >
        <View style={{ flexDirection: "row", gap: 10 }}>
          <PrimaryButton
            label="Clear"
            variant="outline"
            disabled={isSubmitted || !isAnswered}
            onPress={clearCurrentTestAnswer}
            style={{ width: 120 }}
          />
          <PrimaryButton
            label={isSubmitted ? "Results" : "Submit"}
            onPress={() => {
              if (!isSubmitted) submitActiveTest();
              navigation.navigate("TestResult");
            }}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <PrimaryButton
            label="Prev"
            variant="outline"
            disabled={currentIndex === 0}
            onPress={goToPrevTestQuestion}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Next"
            variant="outline"
            disabled={currentIndex === total - 1}
            onPress={goToNextTestQuestion}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Question navigator modal */}
      <Modal visible={isNavigatorOpen} transparent animationType="fade" onRequestClose={() => setIsNavigatorOpen(false)}>
        <Pressable
          onPress={() => setIsNavigatorOpen(false)}
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
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <ThemedText variant="subtitle">Question Navigator</ThemedText>
              <Pressable hitSlop={10} onPress={() => setIsNavigatorOpen(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <ThemedText variant="muted" style={{ marginTop: 6 }}>
              Answered: {answeredCount}/{total} • Marked:{" "}
              {Object.values(session.markedByQuestionId).filter(Boolean).length}
            </ThemedText>

            <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {session.questions.map((q, idx) => {
                  const answered = typeof session.answersByQuestionId[q.id] === "number";
                  const marked = Boolean(session.markedByQuestionId[q.id]);
                  const isCurrent = idx === currentIndex;

                  const borderColor = isCurrent
                    ? theme.colors.primary
                    : answered
                    ? theme.colors.primary
                    : theme.colors.border;

                  const backgroundColor = isCurrent ? theme.colors.primary : theme.colors.background;
                  const textColor = isCurrent ? "white" : theme.colors.text;

                  return (
                    <Pressable
                      key={q.id}
                      onPress={() => {
                        goToTestQuestion(idx);
                        setIsNavigatorOpen(false);
                      }}
                      style={({ pressed }) => ({
                        width: 46,
                        height: 46,
                        borderRadius: 14,
                        borderWidth: 1,
                        borderColor,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor,
                        opacity: pressed ? 0.85 : 1,
                        position: "relative",
                      })}
                    >
                      <ThemedText style={{ fontWeight: "900", color: textColor }}>{idx + 1}</ThemedText>
                      {marked ? (
                        <View
                          style={{
                            position: "absolute",
                            top: 8,
                            right: 8,
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            backgroundColor: isCurrent ? theme.colors.background : theme.colors.primary,
                          }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
              <PrimaryButton label="Close" variant="outline" onPress={() => setIsNavigatorOpen(false)} style={{ flex: 1 }} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
