import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { useAppStore } from "../store/useAppStore";

export function GroupsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  const groups = useAppStore((s) => s.groups);
  const wordsById = useAppStore((s) => s.wordsById);

  return (
    <ScreenContainer>
      <ThemedText variant="title">Sets</ThemedText>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Your word banks. Don’t binge—compounding wins.
      </ThemedText>

      <FlatList
        style={{ marginTop: 16 }}
        data={groups}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const groupWords = item.wordIds.map((id) => wordsById[id]).filter(Boolean);
          const learnedCount = groupWords.filter((w) => !w.srs.isNew).length;
          const totalCount = groupWords.length;
          const progress = totalCount === 0 ? 0 : Math.round((learnedCount / totalCount) * 100);

          return (
            <Pressable
              onPress={() => navigation.navigate("GroupDetail", { groupId: item.id })}
              style={({ pressed }) => [
                {
                  backgroundColor: theme.colors.card,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <ThemedText variant="subtitle">{item.name}</ThemedText>
                  <ThemedText variant="muted" style={{ marginTop: 4 }}>
                    {learnedCount} learned • {totalCount} total • {progress}%
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
              </View>
            </Pressable>
          );
        }}
      />
    </ScreenContainer>
  );
}
