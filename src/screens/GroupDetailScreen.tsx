import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, TextInput, View } from "react-native";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppStore } from "../store/useAppStore";
import { speakEnglishSequence, speakEnglishWord, stopSpeaking } from "../utils/speech";

type RouteParams = { groupId: number };

export function GroupDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params as RouteParams;

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const wordsById = useAppStore((s) => s.wordsById);
  const toggleStar = useAppStore((s) => s.toggleStar);
  const addWordToGroup = useAppStore((s) => s.addWordToGroup);

  const [query, setQuery] = useState("");
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [wordDraft, setWordDraft] = useState("");
  const [synonymDraft, setSynonymDraft] = useState("");
  const [sentenceDraft, setSentenceDraft] = useState("");
  const filteredWords = useMemo(() => {
    if (!group) return [];
    const normalizedQuery = query.trim().toLowerCase();
    const words = group.wordIds
      .map((id) => wordsById[id])
      .filter(Boolean)
      .sort((a, b) => a.word.localeCompare(b.word));

    const score = (w: any) =>
      (w.stats?.timesReviewed ?? 0) * 1_000_000 +
      (w.sentence?.trim() ? 1_000 : 0) +
      (w.synonym?.trim() ? 200 : 0) +
      (w.isStarred ? 50 : 0);

    // Hide duplicates (same word, different synonym/sentence) and keep best candidate.
    const bestByKey = new Map<string, any>();
    for (const w of words) {
      const key = (w.word ?? "").trim().toLowerCase();
      if (!key) continue;
      const prev = bestByKey.get(key);
      if (!prev || score(w) > score(prev)) bestByKey.set(key, w);
    }

    const uniqueWords = Array.from(bestByKey.values()).sort((a, b) => a.word.localeCompare(b.word));

    if (!normalizedQuery) return uniqueWords;

    return uniqueWords.filter((w) =>
      `${w.word} ${w.synonym} ${w.sentence}`.toLowerCase().includes(normalizedQuery)
    );
  }, [group, wordsById, query]);

  if (!group) {
    return (
      <ScreenContainer>
        <ThemedText variant="title">Set not found</ThemedText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["left", "right", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <ThemedText variant="title">{group.name}</ThemedText>
        <Pressable onPress={() => setIsAddWordOpen(true)} hitSlop={10}>
          <Ionicons name="add-circle-outline" size={26} color={theme.colors.primary} />
        </Pressable>
      </View>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Tap a word for details. Star the ones you keep forgetting.
      </ThemedText>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search in this set"
        placeholderTextColor={theme.colors.border}
        style={{
          marginTop: 12,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: theme.colors.text,
          backgroundColor: theme.colors.card,
        }}
      />

      <FlatList
        style={{ marginTop: 12 }}
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        data={filteredWords}
        keyExtractor={(item) => item.id}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const statusLabel = item.srs.isNew ? "New" : `Due ${item.srs.dueDateISO}`;

          return (
            <Pressable
              onPress={() => navigation.navigate("WordDetail", { wordId: item.id })}
              style={({ pressed }) => [
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: 16,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="subtitle" style={{ textTransform: "lowercase" }}>
                    {item.word}
                  </ThemedText>
                  <ThemedText variant="muted" style={{ marginTop: 3 }} numberOfLines={1}>
                    {item.synonym} • {statusLabel}
                  </ThemedText>
                </View>

                <Pressable
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation();
                    speakEnglishWord({ text: item.word });
                  }}
                  onLongPress={(e) => {
                    e.stopPropagation();
                    speakEnglishSequence({ texts: [item.word, item.synonym, item.sentence], interrupt: true });
                  }}
                  style={{ paddingHorizontal: 8, paddingVertical: 6 }}
                >
                  <Ionicons name="volume-high" size={20} color={theme.colors.text} />
                </Pressable>

                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleStar(item.id);
                  }}
                  hitSlop={10}
                >
                  <Ionicons
                    name={item.isStarred ? "star" : "star-outline"}
                    size={22}
                    color={item.isStarred ? theme.colors.primary : theme.colors.text}
                  />
                </Pressable>

                <Pressable
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation();
                    stopSpeaking();
                  }}
                  style={{ paddingHorizontal: 6, paddingVertical: 6 }}
                >
                  <Ionicons name="stop-circle-outline" size={20} color={theme.colors.text} />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={isAddWordOpen} transparent animationType="fade" onRequestClose={() => setIsAddWordOpen(false)}>
        <Pressable
          onPress={() => setIsAddWordOpen(false)}
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", padding: 16, justifyContent: "center" }}
        >
          <Pressable
            onPress={() => null}
            style={{ backgroundColor: theme.colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}
          >
            <ThemedText variant="subtitle">Add a word</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 6 }}>
              No duplicates across sets. A sentence is required for GRE-style tests.
            </ThemedText>

            <ThemedCard style={{ marginTop: 12, padding: 12 }}>
              <TextInput
                value={wordDraft}
                onChangeText={setWordDraft}
                placeholder="Word"
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
              <TextInput
                value={synonymDraft}
                onChangeText={setSynonymDraft}
                placeholder="Synonym (optional)"
                placeholderTextColor={theme.colors.border}
                style={{
                  marginTop: 10,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                }}
              />
              <TextInput
                value={sentenceDraft}
                onChangeText={setSentenceDraft}
                placeholder="Sentence (required)"
                placeholderTextColor={theme.colors.border}
                multiline
                style={{
                  marginTop: 10,
                  minHeight: 90,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                  textAlignVertical: "top",
                }}
              />
            </ThemedCard>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setIsAddWordOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton
                label="Add"
                onPress={() => {
                  const res = addWordToGroup({
                    groupId,
                    word: wordDraft,
                    synonym: synonymDraft,
                    sentence: sentenceDraft,
                  });
                  if (!res.ok) {
                    Alert.alert("Could not add word", res.error);
                    return;
                  }
                  setWordDraft("");
                  setSynonymDraft("");
                  setSentenceDraft("");
                  setIsAddWordOpen(false);
                }}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
