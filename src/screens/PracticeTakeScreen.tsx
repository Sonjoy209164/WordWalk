import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
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

function splitQcPrompt(prompt: string): { stem: string; quantityA: string; quantityB: string } | null {
  const safe = (prompt ?? "").trim();
  if (!safe) return null;

  const m = safe.match(/^([\s\S]*?)(?:\n\n)?Quantity A\n([\s\S]*?)\n\nQuantity B\n([\s\S]*)$/);
  if (!m) return null;

  const stem = (m[1] ?? "").trim();
  const quantityA = (m[2] ?? "").trim();
  const quantityB = (m[3] ?? "").trim();
  if (!quantityA || !quantityB) return null;

  return { stem, quantityA, quantityB };
}

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
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

export function PracticeTakeScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false);

  const session = useAppStore((s) => s.activePracticeSession);
  const answerCurrentPracticeQuestion = useAppStore((s) => s.answerCurrentPracticeQuestion);
  const clearCurrentPracticeAnswer = useAppStore((s) => s.clearCurrentPracticeAnswer);
  const goToNextPracticeQuestion = useAppStore((s) => s.goToNextPracticeQuestion);
  const goToPrevPracticeQuestion = useAppStore((s) => s.goToPrevPracticeQuestion);
  const goToPracticeQuestion = useAppStore((s) => s.goToPracticeQuestion);
  const toggleMarkCurrentPracticeQuestion = useAppStore((s) => s.toggleMarkCurrentPracticeQuestion);
  const submitActivePractice = useAppStore((s) => s.submitActivePractice);
  const togglePracticeExplanation = useAppStore((s) => s.togglePracticeExplanation);
  const clearPracticeSession = useAppStore((s) => s.clearPracticeSession);

  const total = session?.questions.length ?? 0;
  const currentIndex = session?.currentIndex ?? 0;
  const currentQuestion = session ? session.questions[currentIndex] : undefined;

  const answeredCount = useMemo(() => (session ? countAnswered(session.answersByQuestionId) : 0), [session]);
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

  const [nowMs, setNowMs] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const remainingSec = session ? Math.max(0, Math.ceil((session.endsAtMs - nowMs) / 1000)) : 0;
  const timeLabel = useMemo(() => formatTime(remainingSec), [remainingSec]);
  const isLowTime = remainingSec <= 60;
  const timeBorderColor = isLowTime ? BrandColors.danger : theme.colors.border;
  const timeTextColor = isLowTime ? BrandColors.danger : theme.colors.text;

  const autoSubmitRef = useRef(false);
  useEffect(() => {
    autoSubmitRef.current = false;
  }, [session?.id]);

  useEffect(() => {
    if (!session) return;
    if (session.isSubmitted) return;
    if (remainingSec > 0) return;
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    submitActivePractice();
    navigation.navigate("PracticeResult");
  }, [navigation, remainingSec, session, submitActivePractice]);

  if (!session) {
    return (
      <ScreenContainer edges={["left", "right", "bottom"]}>
        <ThemedText variant="title">Timed Practice</ThemedText>
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="muted">No active practice session. Start from Chapters.</ThemedText>
          <PrimaryButton
            label="Open Chapters"
            onPress={() => navigation.navigate("PracticeChapters")}
            style={{ marginTop: 12 }}
          />
        </ThemedCard>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenContainer edges={["left", "right", "bottom"]}>
        <ThemedText variant="title">{session.chapterTitle}</ThemedText>
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

  const isQcQuestion =
    currentQuestion.choices.length === 4 &&
    currentQuestion.choices[0]?.trim().toLowerCase().startsWith("quantity a");
  const qcPrompt = isQcQuestion ? splitQcPrompt(currentQuestion.prompt) : null;

  const primaryTint = hexToRgba(theme.colors.primary, theme.dark ? 0.22 : 0.10);
  const dangerTint = hexToRgba(BrandColors.danger, theme.dark ? 0.18 : 0.08);

  const sessionChapterId = session.chapterId;

  function onClosePress() {
    if (isSubmitted) {
      clearPracticeSession();
      navigation.navigate("PracticeSetup", { chapterId: sessionChapterId });
      return;
    }

    Alert.alert("End practice?", "Submit to view results, or exit without submitting.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Exit",
        style: "destructive",
        onPress: () => {
          clearPracticeSession();
          navigation.navigate("PracticeSetup", { chapterId: sessionChapterId });
        },
      },
      {
        text: "Submit",
        onPress: () => {
          submitActivePractice();
          navigation.navigate("PracticeResult");
        },
      },
    ]);
  }

  return (
    <ScreenContainer style={{ padding: 0 }}>
      {/* Top header */}
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
          <Pressable hitSlop={10} onPress={onClosePress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, padding: 6 })}>
            <Ionicons name="close" size={22} color={theme.colors.text} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <ThemedText style={{ fontWeight: "900" }} numberOfLines={1}>
              {session.chapterTitle}
            </ThemedText>
            <ThemedText variant="caption" style={{ marginTop: 2 }}>
              Timed practice • Multiple choice
            </ThemedText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: timeBorderColor,
                backgroundColor: theme.colors.card,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={timeTextColor} />
                <ThemedText variant="caption" style={{ fontWeight: "900", color: timeTextColor }}>
                  {timeLabel}
                </ThemedText>
              </View>
            </View>

            <Pressable
              hitSlop={10}
              onPress={toggleMarkCurrentPracticeQuestion}
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
            {isQcQuestion ? "Quant Comparison — select one answer choice." : "Select one answer choice."}
          </ThemedText>

          {isQcQuestion && qcPrompt ? (
            <View style={{ marginTop: 10, gap: 10 }}>
              {qcPrompt.stem ? (
                <ThemedText style={{ lineHeight: 22 }}>{qcPrompt.stem}</ThemedText>
              ) : null}

              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" style={{ fontWeight: "900" }}>
                    Quantity A
                  </ThemedText>
                  <View
                    style={{
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                      minHeight: 80,
                    }}
                  >
                    <ThemedText style={{ lineHeight: 22 }}>{qcPrompt.quantityA}</ThemedText>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <ThemedText variant="caption" style={{ fontWeight: "900" }}>
                    Quantity B
                  </ThemedText>
                  <View
                    style={{
                      marginTop: 6,
                      padding: 12,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      backgroundColor: theme.colors.background,
                      minHeight: 80,
                    }}
                  >
                    <ThemedText style={{ lineHeight: 22 }}>{qcPrompt.quantityB}</ThemedText>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            <ThemedText style={{ marginTop: 10, lineHeight: 22 }}>{currentQuestion.prompt}</ThemedText>
          )}

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
                  onPress={() => answerCurrentPracticeQuestion(idx)}
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
                label={isExplanationVisible ? "Hide explanation" : "Show explanation"}
                variant="outline"
                onPress={togglePracticeExplanation}
              />

              {isExplanationVisible ? (
                <ThemedCard style={{ marginTop: 6, backgroundColor: theme.colors.background }}>
                  <ThemedText style={{ lineHeight: 22 }}>
                    {currentQuestion.explanation?.trim() ? currentQuestion.explanation : "No explanation provided."}
                  </ThemedText>
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
            onPress={clearCurrentPracticeAnswer}
            style={{ width: 120 }}
          />
          <PrimaryButton
            label={isSubmitted ? "Results" : "Submit"}
            onPress={() => {
              if (!isSubmitted) submitActivePractice();
              navigation.navigate("PracticeResult");
            }}
            style={{ flex: 1 }}
          />
        </View>

        <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
          <PrimaryButton
            label="Prev"
            variant="outline"
            disabled={currentIndex === 0}
            onPress={goToPrevPracticeQuestion}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Next"
            variant="outline"
            disabled={currentIndex === total - 1}
            onPress={goToNextPracticeQuestion}
            style={{ flex: 1 }}
          />
        </View>
      </View>

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
              Answered: {answeredCount}/{total} • Marked: {Object.values(session.markedByQuestionId).filter(Boolean).length}
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
                        goToPracticeQuestion(idx);
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
