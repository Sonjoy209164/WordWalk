import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, useWindowDimensions, View } from "react-native";
import { useNavigation, useRoute, useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ScreenContainer } from "../components/ScreenContainer";
import { ThemedText } from "../components/ThemedText";
import { WordFlashcard } from "../components/WordFlashcard";
import { useAppStore } from "../store/useAppStore";
import { speakEnglishSequence, stopSpeaking } from "../utils/speech";

type RouteParams = { groupId: number; startWordId?: string };

export function WordPlayerScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { groupId, startWordId } = route.params as RouteParams;

  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<any> | null>(null);

  const group = useAppStore((s) => s.groups.find((g) => g.id === groupId));
  const wordsById = useAppStore((s) => s.wordsById);
  const toggleStar = useAppStore((s) => s.toggleStar);

  const synonymWheelPool = useMemo(() => {
    return Object.values(wordsById)
      .map((w) => (w.synonym ?? "").trim())
      .filter(Boolean);
  }, [wordsById]);

  const words = useMemo(() => {
    if (!group) return [];

    const rawWords = group.wordIds
      .map((id) => wordsById[id])
      .filter(Boolean)
      .sort((a, b) => a.word.localeCompare(b.word));

    const score = (w: any) =>
      (w.stats?.timesReviewed ?? 0) * 1_000_000 +
      (w.sentence?.trim() ? 1_000 : 0) +
      (w.synonym?.trim() ? 200 : 0) +
      (w.isStarred ? 50 : 0);

    const bestByKey = new Map<string, any>();
    for (const w of rawWords) {
      const key = (w.word ?? "").trim().toLowerCase();
      if (!key) continue;
      const prev = bestByKey.get(key);
      if (!prev || score(w) > score(prev)) bestByKey.set(key, w);
    }

    return Array.from(bestByKey.values()).sort((a, b) => a.word.localeCompare(b.word));
  }, [group, wordsById]);

  const initialIndex = useMemo(() => {
    if (!startWordId) return 0;
    const i = words.findIndex((w) => w.id === startWordId);
    return i >= 0 ? i : 0;
  }, [startWordId, words]);

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentIndexRef = useRef(currentIndex);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const [isRevealed, setIsRevealed] = useState(false);
  const [isPlayModeOn, setIsPlayModeOn] = useState(false);
  const isPlayModeOnRef = useRef(isPlayModeOn);
  useEffect(() => {
    isPlayModeOnRef.current = isPlayModeOn;
  }, [isPlayModeOn]);

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function stopAll() {
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    playTimerRef.current = null;
    stopSpeaking();
  }

  useEffect(() => {
    return () => stopAll();
  }, []);

  useEffect(() => {
    if (width <= 0) return;
    listRef.current?.scrollToOffset({
      offset: width * currentIndexRef.current,
      animated: false,
    });
  }, [width]);

  const currentWord = words[currentIndex];

  function scrollToIndex(index: number, animated = true) {
    if (words.length === 0) return;
    const clamped = Math.max(0, Math.min(index, words.length - 1));
    stopAll();
    setIsRevealed(false);
    setCurrentIndex(clamped);
    listRef.current?.scrollToOffset({ offset: width * clamped, animated });
  }

  function goPrev() {
    scrollToIndex(currentIndexRef.current - 1, true);
  }

  function goNext() {
    scrollToIndex(currentIndexRef.current + 1, true);
  }

  useEffect(() => {
    if (!isPlayModeOn) return;
    if (!currentWord) return;

    if (playTimerRef.current) clearTimeout(playTimerRef.current);
    setIsRevealed(true);

    speakEnglishSequence({
      texts: [currentWord.word, currentWord.synonym, currentWord.sentence],
      interrupt: true,
      onDone: () => {
        if (!isPlayModeOnRef.current) return;

        const nextIndex = currentIndexRef.current + 1;
        if (nextIndex >= words.length) {
          setIsPlayModeOn(false);
          return;
        }

        playTimerRef.current = setTimeout(() => {
          scrollToIndex(nextIndex, true);
        }, 450);
      },
    });
  }, [currentWord?.id, currentWord?.sentence, currentWord?.synonym, currentWord?.word, isPlayModeOn, words.length]);

  if (!group) {
    return (
      <ScreenContainer>
        <ThemedText variant="title">Set not found</ThemedText>
      </ScreenContainer>
    );
  }

  if (words.length === 0) {
    return (
      <ScreenContainer>
        <ThemedText variant="title">{group.name}</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 6 }}>
          No words in this set yet.
        </ThemedText>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{ padding: 0 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <ThemedText variant="subtitle">{group.name}</ThemedText>
            <ThemedText variant="muted" style={{ marginTop: 4 }}>
              {currentIndex + 1} / {words.length} • Swipe left/right
            </ThemedText>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Pressable
              hitSlop={10}
              onPress={() => {
                if (!currentWord) return;
                toggleStar(currentWord.id);
              }}
            >
              <Ionicons
                name={currentWord?.isStarred ? "star" : "star-outline"}
                size={22}
                color={currentWord?.isStarred ? theme.colors.primary : theme.colors.text}
              />
            </Pressable>

            <Pressable
              hitSlop={10}
              onPress={() => {
                setIsPlayModeOn(false);
                stopAll();
              }}
            >
              <Ionicons name="stop-circle-outline" size={22} color={theme.colors.text} />
            </Pressable>

            <Pressable hitSlop={10} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>
      </View>

      <View style={{ flex: 1, marginTop: 10 }}>
        <FlatList
          ref={(r) => {
            listRef.current = r;
          }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={words}
          keyExtractor={(item) => item.id}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => {
            const nextIndex = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
            if (nextIndex === currentIndexRef.current) return;
            stopAll();
            setIsRevealed(false);
            setCurrentIndex(nextIndex);
          }}
          renderItem={({ item }) => (
            <View style={{ width, paddingHorizontal: 16, paddingVertical: 14, justifyContent: "center" }}>
              <WordFlashcard
                word={item.word}
                synonym={item.synonym}
                sentence={item.sentence}
                isRevealed={isRevealed && item.id === currentWord?.id}
                wheelEnabled={!isPlayModeOn}
                synonymWheelPool={synonymWheelPool}
                onSynonymWheelAnswer={({ isCorrect }) => {
                  if (isPlayModeOnRef.current) return;
                  if (item.id !== currentWord?.id) return;
                  if (isCorrect) setIsRevealed(true);
                }}
                onToggleReveal={() => {
                  if (isPlayModeOnRef.current) return;
                  if (item.id !== currentWord?.id) return;
                  setIsRevealed((v) => !v);
                }}
              />
            </View>
          )}
        />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <Pressable
            hitSlop={10}
            onPress={goPrev}
            disabled={currentIndex === 0}
            style={({ pressed }) => ({ opacity: currentIndex === 0 ? 0.3 : pressed ? 0.7 : 1 })}
          >
            <Ionicons name="play-skip-back" size={26} color={theme.colors.text} />
          </Pressable>

          <Pressable
            hitSlop={10}
            onPress={() => {
              if (isPlayModeOnRef.current) {
                setIsPlayModeOn(false);
                stopAll();
              } else {
                setIsPlayModeOn(true);
              }
            }}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name={isPlayModeOn ? "pause" : "play"} size={22} color={theme.colors.text} />
          </Pressable>

          <Pressable
            hitSlop={10}
            onPress={goNext}
            disabled={currentIndex >= words.length - 1}
            style={({ pressed }) => ({
              opacity: currentIndex >= words.length - 1 ? 0.3 : pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="play-skip-forward" size={26} color={theme.colors.text} />
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
