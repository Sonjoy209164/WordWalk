import React, { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { ThemedCard } from "../components/ThemedCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { useAppStore } from "../store/useAppStore";
import { speakEnglishSequence, stopSpeaking } from "../utils/speech";

type ParsedGroup = {
  id: number;
  name: string;
  words: Array<{ word: string; synonym: string; sentence: string }>;
};

function parseImportText(text: string): { groups: ParsedGroup[]; errors: string[] } {
  const errors: string[] = [];
  const groups: ParsedGroup[] = [];

  const lines = text.replace(/\r/g, "").split("\n");
  let current: ParsedGroup | null = null;

  function flush() {
    if (!current) return;
    if (current.words.length === 0) {
      errors.push(`Set ${current.id} has no words; skipped.`);
    } else {
      groups.push(current);
    }
    current = null;
  }

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const raw = lines[lineNo] ?? "";
    const line = raw.trim();
    if (!line) continue;

    const looksLikeHeader = /^\s*set\s*\d+/i.test(raw) || /^\s*\d+\s*[:\-.]/.test(raw);
    if (looksLikeHeader) {
      const m = raw.match(/^\s*(?:set\s*)?(\d+)\s*(?:[:\-.])?\s*(.*)\s*$/i);
      if (m) {
        const id = Number(m[1]);
        if (!Number.isFinite(id) || id <= 0) {
          errors.push(`Invalid set number on line ${lineNo + 1}.`);
          continue;
        }
        const name = (m[2] ?? "").trim() || `Set ${id}`;
        flush();
        current = { id: Math.floor(id), name, words: [] };
        continue;
      }
    }

    if (!current) {
      errors.push(`Word line found before any set header (line ${lineNo + 1}).`);
      continue;
    }

    const cleaned = raw.replace(/^\s*[-*•]+\s*/, "").trim();
    const split3 = (parts: string[]) => {
      const word = (parts[0] ?? "").trim();
      const synonym = (parts[1] ?? "").trim();
      const sentence = parts.slice(2).join(" ").trim();
      return { word, synonym, sentence };
    };

    let parts: string[] | null = null;
    if (cleaned.includes("|")) parts = cleaned.split("|");
    else if (cleaned.includes("\t")) parts = cleaned.split("\t");
    else if (/\s+[-–—]\s+/.test(cleaned)) parts = cleaned.split(/\s+[-–—]\s+/);

    if (!parts || parts.length < 3) {
      errors.push(`Could not parse word line ${lineNo + 1}. Use: word|synonym|sentence`);
      continue;
    }

    const { word, synonym, sentence } = split3(parts);
    if (!word || !sentence) {
      errors.push(`Missing word or sentence on line ${lineNo + 1}; skipped.`);
      continue;
    }
    current.words.push({ word, synonym, sentence });
  }

  flush();
  return { groups, errors };
}

export function GroupsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const tabBarHeight = useBottomTabBarHeight();

  const groups = useAppStore((s) => s.groups);
  const wordsById = useAppStore((s) => s.wordsById);
  const createGroup = useAppStore((s) => s.createGroup);
  const addWordToGroup = useAppStore((s) => s.addWordToGroup);

  const [isAddSetOpen, setIsAddSetOpen] = useState(false);
  const [setNameDraft, setSetNameDraft] = useState("");

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importDraft, setImportDraft] = useState("");

  const missingSeedSetsHint = useMemo(() => {
    const ids = new Set(groups.map((g) => g.id));
    const missing: number[] = [];
    for (let i = 4; i <= 19; i++) if (!ids.has(i)) missing.push(i);
    return missing.length ? `Missing sets: ${missing.join(", ")}` : "";
  }, [groups]);

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <ThemedText variant="title">Sets</ThemedText>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable onPress={() => setIsImportOpen(true)} hitSlop={10}>
              <Ionicons name="document-text-outline" size={22} color={theme.colors.text} />
            </Pressable>
            <Pressable onPress={() => setIsAddSetOpen(true)} hitSlop={10}>
              <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>
      <ThemedText variant="muted" style={{ marginTop: 6 }}>
        Your word banks. Don’t binge—compounding wins.
      </ThemedText>
      {missingSeedSetsHint ? (
        <ThemedText variant="caption" style={{ marginTop: 6 }}>
          {missingSeedSetsHint}
        </ThemedText>
      ) : null}
      </View>

      <FlatList
        style={{ marginTop: 16, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 16 + tabBarHeight }}
        data={groups}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const groupWords = item.wordIds.map((id) => wordsById[id]).filter(Boolean);
          const learnedCount = groupWords.filter((w) => !w.srs.isNew).length;
          const testReadyCount = groupWords.filter((w) => w.sentence.trim().length > 0).length;
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
                    {learnedCount} learned • {totalCount} total • {testReadyCount} test‑ready • {progress}%
                  </ThemedText>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Pressable
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation();
                      const words = groupWords.map((w) => w.word).filter(Boolean);
                      // Short preview: set name + first 10 words.
                      speakEnglishSequence({
                        texts: [item.name, ...words.slice(0, 10)],
                        interrupt: true,
                      });
                    }}
                    onLongPress={(e) => {
                      e.stopPropagation();
                      const words = groupWords.map((w) => w.word).filter(Boolean);
                      // Full playback (can be long). Long-press again on Stop in Settings or elsewhere.
                      speakEnglishSequence({
                        texts: [item.name, ...words],
                        interrupt: true,
                      });
                    }}
                    style={{ paddingHorizontal: 6, paddingVertical: 6, marginRight: 6 }}
                  >
                    <Ionicons name="volume-high" size={20} color={theme.colors.text} />
                  </Pressable>
                  <Pressable
                    hitSlop={10}
                    onPress={(e) => {
                      e.stopPropagation();
                      stopSpeaking();
                    }}
                    style={{ paddingHorizontal: 6, paddingVertical: 6, marginRight: 2 }}
                  >
                    <Ionicons name="stop-circle-outline" size={20} color={theme.colors.text} />
                  </Pressable>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <Modal visible={isAddSetOpen} transparent animationType="fade" onRequestClose={() => setIsAddSetOpen(false)}>
        <Pressable
          onPress={() => setIsAddSetOpen(false)}
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
            }}
          >
            <ThemedText variant="subtitle">Create a new set</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 6 }}>
              Next available set number will be used (fills missing 4–19 first).
            </ThemedText>
            <TextInput
              value={setNameDraft}
              onChangeText={setSetNameDraft}
              placeholder="Set name (e.g., Set 4)"
              placeholderTextColor={theme.colors.border}
              style={{
                marginTop: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
              }}
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setIsAddSetOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton
                label="Create"
                onPress={() => {
                  const res = createGroup(setNameDraft);
                  if (!res.ok) {
                    Alert.alert("Could not create set", res.error);
                    return;
                  }
                  setIsAddSetOpen(false);
                  setSetNameDraft("");
                  navigation.navigate("GroupDetail", { groupId: res.groupId });
                }}
                style={{ flex: 1 }}
              />
            </View>
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
              maxHeight: "80%",
            }}
          >
            <ThemedText variant="subtitle">Import sets from text</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 6, lineHeight: 20 }}>
              Format (recommended):{"\n"}Set 4: Name{"\n"}word|synonym|sentence
            </ThemedText>

            <ScrollView style={{ marginTop: 12 }} keyboardShouldPersistTaps="handled">
              <TextInput
                value={importDraft}
                onChangeText={setImportDraft}
                multiline
                placeholder={`Set 4: Vocabulary\nabate|lessen|The storm abated overnight.\n\nSet 5: Vocabulary\n...`}
                placeholderTextColor={theme.colors.border}
                style={{
                  minHeight: 200,
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
            </ScrollView>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
              <PrimaryButton label="Cancel" variant="outline" onPress={() => setIsImportOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton
                label="Import"
                onPress={() => {
                  const { groups: parsedGroups, errors } = parseImportText(importDraft);
                  if (parsedGroups.length === 0) {
                    Alert.alert("Nothing to import", errors[0] ?? "Paste your sets text first.");
                    return;
                  }

                  let groupsAdded = 0;
                  let wordsAdded = 0;
                  let duplicatesSkipped = 0;
                  const importErrors: string[] = [...errors];

                  for (const g of parsedGroups) {
                    const created = createGroup(g.name, g.id);
                    if (!created.ok) {
                      importErrors.push(`Set ${g.id}: ${created.error}`);
                      continue;
                    }
                    groupsAdded += 1;

                    for (const w of g.words) {
                      const added = addWordToGroup({ groupId: created.groupId, ...w });
                      if (!added.ok) {
                        if (added.error.toLowerCase().includes("duplicate word")) duplicatesSkipped += 1;
                        else importErrors.push(`Set ${g.id} (${w.word}): ${added.error}`);
                        continue;
                      }
                      wordsAdded += 1;
                    }
                  }

                  setIsImportOpen(false);
                  setImportDraft("");

                  const summary = `Imported: ${groupsAdded} set(s), ${wordsAdded} word(s).` +
                    (duplicatesSkipped ? ` Skipped duplicates: ${duplicatesSkipped}.` : "") +
                    (importErrors.length ? ` Errors: ${importErrors.length}.` : "");

                  Alert.alert("Import complete", summary);
                }}
                style={{ flex: 1 }}
              />
            </View>

            <ThemedCard style={{ marginTop: 12, padding: 12 }}>
              <ThemedText variant="caption" style={{ lineHeight: 18 }}>
                No duplicate words are allowed across all sets (case-insensitive). Lines without a sentence are skipped.
              </ThemedText>
            </ThemedCard>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
