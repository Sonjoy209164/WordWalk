import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";

import { useAppStore } from "../store/useAppStore";
import { computeTestScore } from "../utils/greTest";

type FilterKey = "all" | "incorrect" | "unanswered" | "marked";

export function TestResultScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();

  const session = useAppStore((s) => s.activeTestSession);
  const clearTestSession = useAppStore((s) => s.clearTestSession);
  const goToTestQuestion = useAppStore((s) => s.goToTestQuestion);

  const [filter, setFilter] = useState<FilterKey>("all");

  const summary = useMemo(() => {
    if (!session) {
      return { total: 0, answered: 0, unanswered: 0, correct: 0, incorrect: 0, marked: 0, percent: 0 };
    }

    const total = session.questions.length;
    const answered = Object.keys(session.answersByQuestionId).length;
    const unanswered = Math.max(0, total - answered);
    const { correct } = session.isSubmitted ? computeTestScore(session) : { correct: 0, total };
    const incorrect = session.isSubmitted ? Math.max(0, total - unanswered - correct) : 0;
    const marked = Object.values(session.markedByQuestionId).filter(Boolean).length;
    const percent = !session.isSubmitted || total === 0 ? 0 : Math.round((correct / total) * 100);
    return { total, answered, unanswered, correct, incorrect, marked, percent };
  }, [session]);

  const rows = useMemo(() => {
    if (!session) return [] as Array<{ index: number; qid: string; title: string; status: string; isIncorrect: boolean; isUnanswered: boolean; isMarked: boolean }>;

    return session.questions.map((q, index) => {
      const chosen = session.answersByQuestionId[q.id];
      const isAnswered = typeof chosen === "number";
      const isUnanswered = !isAnswered;
      const isIncorrect = session.isSubmitted && isAnswered && chosen !== q.correctIndex;
      const isMarked = Boolean(session.markedByQuestionId[q.id]);

      const status = isUnanswered
        ? "Unanswered"
        : session.isSubmitted
        ? chosen === q.correctIndex
          ? "Correct"
          : "Incorrect"
        : "Answered";

      const title = `Q${index + 1}`;
      return { index, qid: q.id, title, status, isIncorrect, isUnanswered, isMarked };
    });
  }, [session]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "incorrect") return rows.filter((r) => r.isIncorrect);
    if (filter === "unanswered") return rows.filter((r) => r.isUnanswered);
    if (filter === "marked") return rows.filter((r) => r.isMarked);
    return rows;
  }, [rows, filter]);

  if (!session) {
    return (
      <ScreenContainer>
        <ThemedText variant="title">Results</ThemedText>
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="muted">No test session found.</ThemedText>
        </ThemedCard>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ThemedText variant="title">Results</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        {session.groupName} • {session.isSubmitted
          ? `${summary.correct}/${summary.total} (${summary.percent}%)`
          : `In progress • Answered ${summary.answered}/${summary.total}`}
      </ThemedText>

      {!session.isSubmitted ? (
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="subtitle">Not submitted yet</ThemedText>
          <ThemedText variant="muted" style={{ marginTop: 6, lineHeight: 22 }}>
            You can review, mark, and change answers until you submit.
            
            Answered: {summary.answered} • Unanswered: {summary.unanswered} • Marked: {summary.marked}
          </ThemedText>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <PrimaryButton
              label="Continue Test"
              onPress={() => navigation.navigate("TakeTest")}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Back"
              variant="outline"
              onPress={() => navigation.navigate("TestSetup")}
              style={{ width: 110 }}
            />
          </View>
        </ThemedCard>
      ) : (
        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="subtitle">Score breakdown</ThemedText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <ThemedCard style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 }}>
              <ThemedText style={{ fontWeight: "900" }}>Correct</ThemedText>
              <ThemedText variant="muted">{summary.correct}</ThemedText>
            </ThemedCard>
            <ThemedCard style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 }}>
              <ThemedText style={{ fontWeight: "900" }}>Incorrect</ThemedText>
              <ThemedText variant="muted">{summary.incorrect}</ThemedText>
            </ThemedCard>
            <ThemedCard style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 }}>
              <ThemedText style={{ fontWeight: "900" }}>Unanswered</ThemedText>
              <ThemedText variant="muted">{summary.unanswered}</ThemedText>
            </ThemedCard>
            <ThemedCard style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 }}>
              <ThemedText style={{ fontWeight: "900" }}>Marked</ThemedText>
              <ThemedText variant="muted">{summary.marked}</ThemedText>
            </ThemedCard>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <PrimaryButton
              label="Review in Test"
              variant="outline"
              onPress={() => navigation.navigate("TakeTest")}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Done"
              onPress={() => {
                clearTestSession();
                navigation.navigate("TestSetup");
              }}
              style={{ width: 110 }}
            />
          </View>
        </ThemedCard>
      )}

      {/* Filters */}
      <ThemedCard style={{ marginTop: 14 }}>
        <ThemedText variant="subtitle">Review questions</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {([
              { key: "all", label: `All (${rows.length})` },
              { key: "incorrect", label: `Incorrect (${summary.incorrect})` },
              { key: "unanswered", label: `Unanswered (${summary.unanswered})` },
              { key: "marked", label: `Marked (${summary.marked})` },
            ] as Array<{ key: FilterKey; label: string }>).map((pill) => {
              const active = pill.key === filter;
              return (
                <Pressable
                  key={pill.key}
                  onPress={() => setFilter(pill.key)}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: active ? theme.colors.primary : theme.colors.border,
                    backgroundColor: theme.colors.card,
                  }}
                >
                  <ThemedText style={{ fontWeight: "800" }}>{pill.label}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </ThemedCard>

      <View style={{ marginTop: 14, gap: 10 }}>
        {filteredRows.length === 0 ? (
          <ThemedCard>
            <ThemedText variant="muted">No questions in this filter.</ThemedText>
          </ThemedCard>
        ) : (
          filteredRows.map((r) => {
            const borderColor = r.status === "Correct" ? theme.colors.primary : theme.colors.border;
            return (
              <Pressable
                key={r.qid}
                onPress={() => {
                  goToTestQuestion(r.index);
                  navigation.navigate("TakeTest");
                }}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor,
                  backgroundColor: theme.colors.card,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <ThemedText style={{ fontWeight: "900" }}>{r.title}</ThemedText>
                  <ThemedText variant="muted">{r.status}</ThemedText>
                </View>

                <ThemedText variant="muted" style={{ marginTop: 6 }}>
                  Tap to jump to this question.
                  {r.isMarked ? "  • Marked" : ""}
                </ThemedText>
              </Pressable>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
