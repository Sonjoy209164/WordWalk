import React, { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";
import { ProgressBar } from "../components/ProgressBar";

import { useAppStore } from "../store/useAppStore";

const CHOICE_LABELS = ["A", "B", "C", "D", "E"];

function countAnswered(answersByQuestionId: Record<string, number>): number {
  return Object.keys(answersByQuestionId).length;
}

export function TakeTestScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();

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
  const progress = total === 0 ? 0 : answeredCount / total;

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
      <ScreenContainer>
        <ThemedText variant="title">Take Test</ThemedText>
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="muted">No active test session. Start from the Test tab.</ThemedText>
        </ThemedCard>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenContainer>
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

  return (
    <ScreenContainer>
      <ThemedText variant="title">Test: {session.groupName}</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Question {currentIndex + 1} / {total} • Answered {answeredCount}/{total}
      </ThemedText>

      <View style={{ marginTop: 12 }}>
        <ProgressBar progress={progress} />
      </View>

      {/* Question palette (jump navigation) */}
      <ThemedCard style={{ marginTop: 14 }}>
        <ThemedText variant="subtitle">Question Navigator</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {session.questions.map((q, idx) => {
              const answered = typeof session.answersByQuestionId[q.id] === "number";
              const marked = Boolean(session.markedByQuestionId[q.id]);
              const isCurrent = idx === currentIndex;

              const borderColor = isCurrent
                ? theme.colors.primary
                : answered
                ? theme.colors.primary
                : theme.colors.border;

              const backgroundColor = isCurrent
                ? theme.colors.primary
                : theme.colors.card;

              const textColor = isCurrent ? theme.colors.background : theme.colors.text;

              return (
                <Pressable
                  key={q.id}
                  onPress={() => goToTestQuestion(idx)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor,
                    position: "relative",
                  }}
                >
                  <ThemedText style={{ fontWeight: "900", color: textColor }}>{idx + 1}</ThemedText>
                  {marked ? (
                    <View
                      style={{
                        position: "absolute",
                        top: 6,
                        right: 6,
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

        <ThemedText variant="muted" style={{ marginTop: 10 }}>
          Tip: answered questions are outlined. Marked questions show a dot.
        </ThemedText>
      </ThemedCard>

      <ThemedCard style={{ marginTop: 14 }}>
        <ThemedText variant="subtitle">Question {currentIndex + 1}</ThemedText>
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
              ? theme.colors.border
              : isSelected
              ? theme.colors.primary
              : theme.colors.border;

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
                  backgroundColor: theme.colors.card,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <ThemedText style={{ fontWeight: "900" }}>
                  {CHOICE_LABELS[idx]}) {choice}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* GRE-style controls */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
          <PrimaryButton
            label={isMarked ? "Unmark" : "Mark"}
            variant="outline"
            onPress={toggleMarkCurrentTestQuestion}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Clear"
            variant="outline"
            disabled={isSubmitted || !isAnswered}
            onPress={clearCurrentTestAnswer}
            style={{ width: 110 }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <PrimaryButton
            label="Prev"
            variant="outline"
            disabled={currentIndex === 0}
            onPress={goToPrevTestQuestion}
            style={{ width: 110 }}
          />
          <PrimaryButton
            label="Next"
            variant="outline"
            disabled={currentIndex === total - 1}
            onPress={goToNextTestQuestion}
            style={{ width: 110 }}
          />
          <PrimaryButton
            label={isSubmitted ? "View Results" : "Submit Test"}
            onPress={() => {
              if (!isSubmitted) submitActiveTest();
              navigation.navigate("TestResult");
            }}
            style={{ flex: 1 }}
          />
        </View>

        {/* After submission: show correctness + explanation toggle */}
        {isSubmitted ? (
          <View style={{ marginTop: 14, gap: 10 }}>
            <ThemedText variant="muted">
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
    </ScreenContainer>
  );
}
