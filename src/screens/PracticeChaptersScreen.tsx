import React, { useMemo } from "react";
import { FlatList, Pressable, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PRACTICE_CHAPTERS, type PracticeChapter, type PracticeChapterSection } from "../data/practiceChapters";
import { useAppStore } from "../store/useAppStore";

type Row =
  | { kind: "section"; id: string; section: PracticeChapterSection; title: string }
  | { kind: "chapter"; id: string; chapter: PracticeChapter };

const SECTION_TITLES: Record<PracticeChapterSection, string> = {
  Quant: "Quantitative Reasoning",
  Verbal: "Verbal Reasoning",
  Writing: "Analytical Writing",
  Appendix: "Appendix / Reference",
};

export function PracticeChaptersScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();

  const questionsByChapterId = useAppStore((s) => s.practiceQuestionsByChapterId);

  const rows = useMemo(() => {
    const bySection = new Map<PracticeChapterSection, PracticeChapter[]>();
    for (const c of PRACTICE_CHAPTERS) {
      const list = bySection.get(c.section) ?? [];
      list.push(c);
      bySection.set(c.section, list);
    }

    const sections: PracticeChapterSection[] = ["Quant", "Verbal", "Writing", "Appendix"];
    const flat: Row[] = [];
    for (const section of sections) {
      const list = (bySection.get(section) ?? []).slice().sort((a, b) => a.order - b.order);
      if (list.length === 0) continue;
      flat.push({
        kind: "section",
        id: `section-${section}`,
        section,
        title: SECTION_TITLES[section],
      });
      for (const chapter of list) {
        flat.push({ kind: "chapter", id: chapter.id, chapter });
      }
    }
    return flat;
  }, []);

  return (
    <ScreenContainer style={{ padding: 0 }} edges={["left", "right", "bottom"]}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <ThemedText variant="title">Timed Practice</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Pick a topic and run a timer. Add your own questions.
        </ThemedText>
      </View>

      <FlatList
        style={{ marginTop: 14, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 16 + tabBarHeight }}
        data={rows}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          if (item.kind === "section") {
            return (
              <ThemedText variant="caption" style={{ fontWeight: "900", letterSpacing: 0.4, marginTop: 6 }}>
                {item.title.toUpperCase()}
              </ThemedText>
            );
          }

          const chapter = item.chapter;
          const count = questionsByChapterId[chapter.id]?.length ?? 0;
          const label = chapter.section === "Appendix" ? `Appendix ${chapter.label}` : `Chapter ${chapter.label}`;

          return (
            <Pressable
              onPress={() => navigation.navigate("PracticeSetup", { chapterId: chapter.id })}
              style={({ pressed }) => ({
                opacity: pressed ? 0.92 : 1,
              })}
            >
              <ThemedCard style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={{ fontWeight: "900" }}>
                      {label}: {chapter.title}
                    </ThemedText>
                    <ThemedText variant="muted" style={{ marginTop: 4 }}>
                      {count} question(s)
                    </ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </View>
              </ThemedCard>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}

