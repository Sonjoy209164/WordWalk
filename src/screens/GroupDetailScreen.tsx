import React, { useMemo, useState } from "react";
import { FlatList, Pressable, TextInput, View } from "react-native";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { useAppStore } from "../store/useAppStore";

type RouteParams = { groupId: number };

export function GroupDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId } = route.params as RouteParams;

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const wordsById = useAppStore((s) => s.wordsById);
  const toggleStar = useAppStore((s) => s.toggleStar);

  const [query, setQuery] = useState("");
  const filteredWords = useMemo(() => {
    if (!group) return [];
    const normalizedQuery = query.trim().toLowerCase();
    const words = group.wordIds
      .map((id) => wordsById[id])
      .filter(Boolean)
      .sort((a, b) => a.word.localeCompare(b.word));

    if (!normalizedQuery) return words;

    return words.filter((w) =>
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
    <ScreenContainer>
      <ThemedText variant="title">{group.name}</ThemedText>
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

                <Pressable onPress={() => toggleStar(item.id)} hitSlop={10}>
                  <Ionicons
                    name={item.isStarred ? "star" : "star-outline"}
                    size={22}
                    color={item.isStarred ? theme.colors.primary : theme.colors.text}
                  />
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}
