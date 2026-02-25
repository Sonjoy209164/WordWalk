import React, { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";

import { getPracticeChapterById } from "../data/practiceChapters";
import { SAMPLE_PRACTICE_QUESTIONS_BY_CHAPTER_ID } from "../data/samplePracticeQuestions";
import { useAppStore } from "../store/useAppStore";
import { toISODate } from "../utils/date";
import { parsePracticeImportText } from "../utils/practiceImport";

type RouteParams = { chapterId: string };

const QUESTION_COUNT_PRESETS = [5, 10, 20, 30] as const;
const MINUTES_PRESETS = [5, 10, 20, 35] as const;

export function PracticeSetupScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const tabBarHeight = useBottomTabBarHeight();

  const { chapterId } = route.params as RouteParams;
  const chapter = useMemo(() => getPracticeChapterById(chapterId), [chapterId]);

  const questionsByChapterId = useAppStore((s) => s.practiceQuestionsByChapterId);
  const addPracticeQuestion = useAppStore((s) => s.addPracticeQuestion);
  const deletePracticeQuestion = useAppStore((s) => s.deletePracticeQuestion);
  const startTimedPracticeForChapter = useAppStore((s) => s.startTimedPracticeForChapter);

  const questions = questionsByChapterId[chapterId] ?? [];
  const availableCount = questions.length;
  const sampleSeeds = SAMPLE_PRACTICE_QUESTIONS_BY_CHAPTER_ID[chapterId] ?? [];

  const [questionCount, setQuestionCount] = useState<number>(10);
  const [minutes, setMinutes] = useState<number>(10);

  useEffect(() => {
    if (availableCount <= 0) return;
    setQuestionCount((n) => {
      const next = Math.min(Math.max(1, n), availableCount);
      return next;
    });
  }, [availableCount]);

  const safeQuestionCount = availableCount === 0 ? 0 : Math.min(questionCount, availableCount);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importMode, setImportMode] = useState<"text" | "json">("text");
  const [importDraft, setImportDraft] = useState("");
  const [promptDraft, setPromptDraft] = useState("");
  const [choiceCountDraft, setChoiceCountDraft] = useState<4 | 5>(5);
  const [choiceDrafts, setChoiceDrafts] = useState<string[]>(["", "", "", "", ""]);
  const [correctIndexDraft, setCorrectIndexDraft] = useState<number>(0);
  const [explanationDraft, setExplanationDraft] = useState("");

  useEffect(() => {
    setCorrectIndexDraft((idx) => Math.max(0, Math.min(idx, choiceCountDraft - 1)));
  }, [choiceCountDraft]);

  function resetDraft() {
    setPromptDraft("");
    setChoiceCountDraft(5);
    setChoiceDrafts(["", "", "", "", ""]);
    setCorrectIndexDraft(0);
    setExplanationDraft("");
  }

  function confirmAddSamples() {
    Alert.alert(
      "Add sample questions?",
      "These are original sample questions (not copied from any book). They’ll be added to this chapter.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          onPress: () => {
            const todayISO = toISODate(new Date());
            for (const seed of sampleSeeds) {
              const res = addPracticeQuestion({
                chapterId,
                prompt: seed.prompt,
                choices: seed.choices,
                correctIndex: seed.correctIndex,
                explanation: seed.explanation,
                todayISO,
              });
              if (!res.ok) {
                Alert.alert("Could not add sample question", res.error);
                return;
              }
            }
          },
        },
      ]
    );
  }

  function parseImportJson(text: string):
    | {
        ok: true;
        items: Array<{ prompt: string; choices: string[]; correctIndex: number; explanation: string }>;
        skipped: Array<{ number: number; reason: string }>;
      }
    | { ok: false; error: string } {
    const raw = text.trim();
    if (!raw) return { ok: false, error: "Paste JSON first." };

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "Invalid JSON. Paste an array of questions." };
    }

    if (!Array.isArray(parsed)) return { ok: false, error: "JSON must be an array." };

    const items: Array<{ prompt: string; choices: string[]; correctIndex: number; explanation: string }> = [];

    for (let i = 0; i < parsed.length; i++) {
      const q = parsed[i];
      if (!q || typeof q !== "object") return { ok: false, error: `Item ${i + 1} is not an object.` };

      const prompt = String(q.prompt ?? q.question ?? q.stem ?? "").trim();
      if (!prompt) return { ok: false, error: `Item ${i + 1} is missing prompt.` };

      const rawChoices = q.choices ?? q.options ?? q.answers;
      if (!Array.isArray(rawChoices) || !(rawChoices.length === 4 || rawChoices.length === 5)) {
        return { ok: false, error: `Item ${i + 1} must have 4 or 5 choices.` };
      }
      const choices = rawChoices.map((c: any) => String(c ?? "").trim());
      if (choices.some((c: string) => !c)) return { ok: false, error: `Item ${i + 1} has an empty choice.` };

      let correctIndex: number | undefined =
        typeof q.correctIndex === "number" ? Math.floor(q.correctIndex) : undefined;

      const correctLetter = String(q.correctLetter ?? q.correct ?? "").trim().toUpperCase();
      if (typeof correctIndex !== "number" && /^[A-E]$/.test(correctLetter)) {
        correctIndex = correctLetter.charCodeAt(0) - 65;
      }

      const maxIndex = choices.length - 1;
      if (typeof correctIndex !== "number" || correctIndex < 0 || correctIndex > maxIndex) {
        return {
          ok: false,
          error: `Item ${i + 1} needs correctIndex (0-${maxIndex}) or correctLetter (A-${String.fromCharCode(65 + maxIndex)}).`,
        };
      }

      const explanation = String(q.explanation ?? q.solution ?? "").trim();

      items.push({ prompt, choices, correctIndex, explanation });
    }

    return { ok: true, items, skipped: [] };
  }

  if (!chapter) {
    return (
      <ScreenContainer>
        <ThemedText variant="title">Chapter not found</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          This topic id doesn’t exist.
        </ThemedText>
      </ScreenContainer>
    );
  }

  const titleLabel = chapter.section === "Appendix" ? `Appendix ${chapter.label}` : `Chapter ${chapter.label}`;

  return (
    <ScreenContainer style={{ padding: 0 }} edges={["left", "right", "bottom"]}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <ThemedText variant="title">{titleLabel}</ThemedText>
        <ThemedText variant="subtitle" style={{ marginTop: 6 }}>
          {chapter.title}
        </ThemedText>

        <ThemedCard style={{ marginTop: 12, padding: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <ThemedText style={{ fontWeight: "900" }}>Ready</ThemedText>
              <ThemedText variant="muted" style={{ marginTop: 4 }}>
                {safeQuestionCount} question(s) • {minutes} min • {availableCount} available
              </ThemedText>
            </View>

            <PrimaryButton
              label="Start"
              disabled={safeQuestionCount <= 0}
              onPress={() => {
                const durationSec = Math.max(60, Math.floor(minutes * 60));
                startTimedPracticeForChapter({
                  chapterId,
                  chapterTitle: `${titleLabel}: ${chapter.title}`,
                  questionCount: safeQuestionCount,
                  durationSec,
                  todayISO: toISODate(new Date()),
                });
                navigation.navigate("PracticeTake");
              }}
              style={{ width: 120 }}
            />
          </View>
        </ThemedCard>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 12, paddingBottom: 16 + tabBarHeight }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedCard>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <ThemedText variant="subtitle">Questions</ThemedText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {sampleSeeds.length > 0 ? (
                <Pressable hitSlop={10} onPress={confirmAddSamples} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="sparkles-outline" size={20} color={theme.colors.text} />
                </Pressable>
              ) : null}

              <Pressable hitSlop={10} onPress={() => setIsImportOpen(true)} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name="download-outline" size={20} color={theme.colors.text} />
              </Pressable>

              <Pressable hitSlop={10} onPress={() => setIsAddOpen(true)}>
                <Ionicons name="add-circle-outline" size={22} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>

          <ThemedText variant="muted" style={{ marginTop: 6, lineHeight: 20 }}>
            Add your own questions and solutions. (Avoid pasting copyrighted questions you don’t have rights to.)
          </ThemedText>

          {availableCount === 0 ? (
            <ThemedCard style={{ marginTop: 12, backgroundColor: theme.colors.background }}>
              <ThemedText variant="muted">No questions yet.</ThemedText>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                {sampleSeeds.length > 0 ? (
                  <PrimaryButton label="Add samples" variant="outline" onPress={confirmAddSamples} style={{ flex: 1 }} />
                ) : null}
                <PrimaryButton label="Add question" onPress={() => setIsAddOpen(true)} style={{ flex: 1 }} />
              </View>
            </ThemedCard>
          ) : (
            <View style={{ marginTop: 12, gap: 10 }}>
              {questions.slice(0, 6).map((q) => (
                <ThemedCard key={q.id} style={{ padding: 12, backgroundColor: theme.colors.background }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <ThemedText style={{ fontWeight: "800", flex: 1 }} numberOfLines={2}>
                      {q.prompt}
                    </ThemedText>
                    <Pressable
                      hitSlop={10}
                      onPress={() =>
                        Alert.alert("Delete question?", "This can’t be undone.", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => deletePracticeQuestion({ chapterId, questionId: q.id }),
                          },
                        ])
                      }
                      style={{ padding: 6 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={theme.colors.text} />
                    </Pressable>
                  </View>
                  <ThemedText variant="muted" style={{ marginTop: 6 }}>
                    Correct: {String.fromCharCode(65 + Math.max(0, Math.min(q.choices.length - 1, q.correctIndex)))}
                  </ThemedText>
                </ThemedCard>
              ))}
              {availableCount > 6 ? (
                <ThemedText variant="caption" style={{ marginTop: 2 }}>
                  Showing 6 of {availableCount}. (All are used for practice.)
                </ThemedText>
              ) : null}
            </View>
          )}
        </ThemedCard>

        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="subtitle">Practice settings</ThemedText>

          <ThemedText variant="body" style={{ marginTop: 12, fontWeight: "800" }}>
            Question count
          </ThemedText>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {QUESTION_COUNT_PRESETS.map((n) => {
              const isActive = questionCount === n;
              const isDisabled = availableCount === 0;
              return (
                <Pressable
                  key={n}
                  disabled={isDisabled}
                  onPress={() => setQuestionCount(n)}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.card,
                    opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
                  })}
                >
                  <ThemedText style={{ fontWeight: "800" }}>{n}</ThemedText>
                </Pressable>
              );
            })}
          </View>

          <ThemedText variant="muted" style={{ marginTop: 10 }}>
            Available: {availableCount} • You’ll take: {safeQuestionCount}
          </ThemedText>

          <ThemedText variant="body" style={{ marginTop: 14, fontWeight: "800" }}>
            Time limit
          </ThemedText>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            {MINUTES_PRESETS.map((m) => {
              const isActive = minutes === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMinutes(m)}
                  style={({ pressed }) => ({
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.card,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <ThemedText style={{ fontWeight: "800" }}>{m} min</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedCard>
      </ScrollView>

      <Modal visible={isAddOpen} transparent animationType="fade" onRequestClose={() => setIsAddOpen(false)}>
        <Pressable
          onPress={() => setIsAddOpen(false)}
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
              maxHeight: "85%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <ThemedText variant="subtitle">Add question</ThemedText>
              <Pressable hitSlop={10} onPress={() => setIsAddOpen(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput
                value={promptDraft}
                onChangeText={setPromptDraft}
                placeholder="Question prompt"
                placeholderTextColor={theme.colors.border}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  minHeight: 90,
                }}
              />

              <ThemedText variant="body" style={{ marginTop: 12, fontWeight: "800" }}>
                Choices
              </ThemedText>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                {([
                  { count: 4 as const, label: "4 (QC)" },
                  { count: 5 as const, label: "5 (MC)" },
                ] as const).map((opt) => {
                  const active = choiceCountDraft === opt.count;
                  return (
                    <Pressable
                      key={opt.count}
                      onPress={() => setChoiceCountDraft(opt.count)}
                      style={({ pressed }) => ({
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                        backgroundColor: theme.colors.card,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <ThemedText style={{ fontWeight: "900" }}>{opt.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <View style={{ marginTop: 10, gap: 10 }}>
                {choiceDrafts.slice(0, choiceCountDraft).map((value, idx) => {
                  const label = String.fromCharCode(65 + idx);
                  return (
                    <TextInput
                      key={label}
                      value={value}
                      onChangeText={(t) =>
                        setChoiceDrafts((prev) => prev.map((p, i) => (i === idx ? t : p)))
                      }
                      placeholder={`${label})`}
                      placeholderTextColor={theme.colors.border}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        color: theme.colors.text,
                        backgroundColor: theme.colors.background,
                      }}
                    />
                  );
                })}
              </View>

              <ThemedText variant="body" style={{ marginTop: 12, fontWeight: "800" }}>
                Correct answer
              </ThemedText>
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                {Array.from({ length: choiceCountDraft }, (_, idx) => idx).map((idx) => {
                  const label = String.fromCharCode(65 + idx);
                  const isActive = correctIndexDraft === idx;
                  return (
                    <Pressable
                      key={label}
                      onPress={() => setCorrectIndexDraft(idx)}
                      style={({ pressed }) => ({
                        flex: 1,
                        paddingVertical: 10,
                        borderRadius: 14,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: isActive ? theme.colors.primary : theme.colors.border,
                        backgroundColor: theme.colors.card,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <ThemedText style={{ fontWeight: "900" }}>{label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={explanationDraft}
                onChangeText={setExplanationDraft}
                placeholder="Explanation (optional but recommended)"
                placeholderTextColor={theme.colors.border}
                multiline
                style={{
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  minHeight: 90,
                }}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  onPress={() => {
                    resetDraft();
                    setIsAddOpen(false);
                  }}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label="Save"
                  onPress={() => {
                    const res = addPracticeQuestion({
                      chapterId,
                      prompt: promptDraft,
                      choices: choiceDrafts.slice(0, choiceCountDraft),
                      correctIndex: correctIndexDraft,
                      explanation: explanationDraft,
                      todayISO: toISODate(new Date()),
                    });
                    if (!res.ok) {
                      Alert.alert("Could not save", res.error);
                      return;
                    }
                    resetDraft();
                    setIsAddOpen(false);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={isImportOpen} transparent animationType="fade" onRequestClose={() => setIsImportOpen(false)}>
        <Pressable
          onPress={() => setIsImportOpen(false)}
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
              maxHeight: "85%",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <ThemedText variant="subtitle">Import questions</ThemedText>
              <Pressable hitSlop={10} onPress={() => setIsImportOpen(false)} style={{ padding: 6 }}>
                <Ionicons name="close" size={20} color={theme.colors.text} />
              </Pressable>
            </View>

            <ThemedText variant="muted" style={{ marginTop: 8, lineHeight: 20 }}>
              Import from either plain text or JSON. Only import content you own rights to use.
            </ThemedText>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
              {([
                { key: "text" as const, label: "Text" },
                { key: "json" as const, label: "JSON" },
              ] as const).map((opt) => {
                const active = importMode === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    onPress={() => setImportMode(opt.key)}
                    style={({ pressed }) => ({
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? theme.colors.primary : theme.colors.border,
                      backgroundColor: theme.colors.card,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <ThemedText style={{ fontWeight: "900" }}>{opt.label}</ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedText variant="muted" style={{ marginTop: 10, lineHeight: 20 }}>
              {importMode === "json"
                ? `JSON format: [{"prompt":"…","choices":["A","B","C","D","E"],"correctIndex":2,"explanation":"…"}] (choices can be 4 or 5).`
                : `Text format: paste numbered questions plus an “Answers” section. QC + MC import automatically; numeric answers are converted into 5-choice questions. Select-all questions are skipped.`}
            </ThemedText>

            <ScrollView style={{ marginTop: 12 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <TextInput
                value={importDraft}
                onChangeText={setImportDraft}
                placeholder={
                  importMode === "json"
                    ? '[{"prompt":"...","choices":["A","B","C","D","E"],"correctIndex":0,"explanation":"..."}]'
                    : "1.\nQuantity A\n...\nQuantity B\n...\n\nAnswers\n1. (A). ..."
                }
                placeholderTextColor={theme.colors.border}
                multiline
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  minHeight: 160,
                }}
              />

              <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
                <PrimaryButton
                  label="Cancel"
                  variant="outline"
                  onPress={() => setIsImportOpen(false)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  label="Import"
                  onPress={() => {
                    const parsed =
                      importMode === "json"
                        ? parseImportJson(importDraft)
                        : (() => {
                            const res = parsePracticeImportText(importDraft);
                            if (!res.ok) return res;
                            return {
                              ok: true as const,
                              items: res.items.map((q) => ({
                                prompt: q.prompt,
                                choices: q.choices,
                                correctIndex: q.correctIndex,
                                explanation: q.explanation,
                              })),
                              skipped: res.skipped,
                            };
                          })();
                    if (!parsed.ok) {
                      Alert.alert("Import failed", parsed.error);
                      return;
                    }

                    const todayISO = toISODate(new Date());
                    for (const item of parsed.items) {
                      const res = addPracticeQuestion({
                        chapterId,
                        prompt: item.prompt,
                        choices: item.choices,
                        correctIndex: item.correctIndex,
                        explanation: item.explanation,
                        todayISO,
                      });
                      if (!res.ok) {
                        Alert.alert("Import failed", res.error);
                        return;
                      }
                    }

                    const skippedCount = parsed.skipped.length;
                    const skippedPreview =
                      skippedCount === 0
                        ? ""
                        : parsed.skipped
                            .slice(0, 3)
                            .map((s) => `#${s.number}: ${s.reason}`)
                            .join("\n");
                    const skippedMore = skippedCount > 3 ? `\n…and ${skippedCount - 3} more.` : "";
                    Alert.alert(
                      "Imported",
                      `${parsed.items.length} question(s) added.${skippedCount ? `\n\nSkipped ${skippedCount}:\n${skippedPreview}${skippedMore}` : ""}`
                    );
                    setImportDraft("");
                    setIsImportOpen(false);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
