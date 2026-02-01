import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedCard } from "../components/ThemedCard";
import { ThemedText } from "../components/ThemedText";
import { PrimaryButton } from "../components/PrimaryButton";

import { useAppStore } from "../store/useAppStore";

export function TestSetupScreen() {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const tabBarHeight = useBottomTabBarHeight();

  const groupList = useAppStore((s) => s.groups);
  const wordMapById = useAppStore((s) => s.wordsById);
  const startHardTestForGroup = useAppStore((s) => s.startHardTestForGroup);

  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(10);

  // If groups load after bootstrap, auto-select first once.
  useEffect(() => {
    if (selectedGroupId === null && groupList.length > 0) {
      setSelectedGroupId(groupList[0].id);
    }
  }, [groupList, selectedGroupId]);

  const selectedGroup = useMemo(() => {
    return groupList.find((g) => g.id === selectedGroupId) ?? null;
  }, [groupList, selectedGroupId]);

  const availableCount = useMemo(() => {
    if (!selectedGroup) return 0;
    return selectedGroup.wordIds.reduce((count, wordId) => {
      const w = wordMapById[wordId];
      // GRE-style questions need a real sentence context. Seeded sets 4–19 from message.txt
      // are word-only until you provide sentences.
      return w && w.sentence.trim().length > 0 ? count + 1 : count;
    }, 0);
  }, [selectedGroup, wordMapById]);

  const safeQuestionCount =
    availableCount === 0 ? 0 : Math.min(questionCount, availableCount);

  const bottomPadding = 16 + tabBarHeight; // keep content above tab bar

  const selectedAccentBg = theme.dark
    ? "rgba(255,255,255,0.06)"
    : "rgba(0,0,0,0.04)";

  return (
    <ScreenContainer style={{ padding: 0 }} edges={["left", "right", "bottom"]}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText variant="title">GRE-Style Test</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          Pick a set. You’ll get hard, 5-choice questions with explanations.
        </ThemedText>

        {/* Debug-visible selection indicator */}
        <ThemedText variant="muted" style={{ marginTop: 10 }}>
          Selected: {selectedGroup ? selectedGroup.name : "None"}
        </ThemedText>

        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="subtitle">Choose a Set</ThemedText>

          <View style={{ marginTop: 10 }}>
            {groupList.map((groupItem, index) => {
              const isSelected = groupItem.id === selectedGroupId;

              return (
                <Pressable
                  key={groupItem.id}
                  onPress={() => setSelectedGroupId(groupItem.id)}
                  android_ripple={{ color: theme.colors.border }}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    padding: 12,
                    borderRadius: 14,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: isSelected
                      ? selectedAccentBg
                      : theme.colors.card,
                    opacity: pressed ? 0.9 : 1,
                    marginBottom: index === groupList.length - 1 ? 0 : 10,
                  })}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <ThemedText style={{ fontWeight: "800" }}>
                      {groupItem.name}
                    </ThemedText>

                    {isSelected ? (
                      <ThemedText style={{ fontWeight: "900" }}>✓</ThemedText>
                    ) : null}
                  </View>

                  <ThemedText variant="muted" style={{ marginTop: 4 }}>
                    Words: {groupItem.wordIds.length}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </ThemedCard>

        <ThemedCard style={{ marginTop: 14 }}>
          <ThemedText variant="subtitle">Questions</ThemedText>

          <View style={{ flexDirection: "row", marginTop: 10 }}>
            {[10, 20, 30].map((n, idx) => {
              const isActive = questionCount === n;

              return (
                <Pressable
                  key={n}
                  onPress={() => setQuestionCount(n)}
                  android_ripple={{ color: theme.colors.border }}
                  hitSlop={10}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 14,
                    alignItems: "center",
                    borderWidth: isActive ? 2 : 1,
                    borderColor: isActive
                      ? theme.colors.primary
                      : theme.colors.border,
                    backgroundColor: isActive
                      ? selectedAccentBg
                      : theme.colors.card,
                    opacity: pressed ? 0.9 : 1,
                    marginRight: idx === 2 ? 0 : 10,
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
        </ThemedCard>

        <View style={{ marginTop: 14 }}>
          <PrimaryButton
            label="Start Test"
            disabled={!selectedGroup || safeQuestionCount <= 0}
            onPress={() => {
              if (!selectedGroup) return;
              startHardTestForGroup(selectedGroup.id, safeQuestionCount);
              navigation.navigate("TakeTest");
            }}
          />
        </View>

        {selectedGroup && availableCount === 0 ? (
          <ThemedText variant="muted" style={{ marginTop: 10 }}>
            This set doesn’t have example sentences yet, so GRE-style tests are disabled. Add
            words with sentences in the Set screen, or import a richer dataset (word + synonym +
            sentence).
          </ThemedText>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
