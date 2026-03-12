import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, LayoutChangeEvent, Pressable, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { speakEnglishSequence, speakEnglishWord, stopSpeaking } from "../utils/speech";
import { BrandColors } from "../theme/colors";

function normalizeChoice(text: string): string {
  return (text ?? "").trim();
}

function isSameChoice(a: string, b: string): boolean {
  return normalizeChoice(a).toLowerCase() === normalizeChoice(b).toLowerCase();
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickSynonymWheelOptions(params: {
  correct: string;
  pool: string[];
  count: number;
}): string[] {
  const correct = normalizeChoice(params.correct);
  if (!correct) return [];

  const byKey = new Map<string, string>();
  for (const raw of params.pool) {
    const cleaned = normalizeChoice(raw);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, cleaned);
  }

  byKey.delete(correct.toLowerCase());

  const candidates = shuffle(Array.from(byKey.values()));
  const picked = [correct, ...candidates.slice(0, Math.max(0, params.count - 1))];
  return shuffle(picked);
}

function withAlpha(color: string, alpha01: number): string {
  const alpha = Math.max(0, Math.min(1, alpha01));
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return `rgba(0,0,0,${alpha})`;

  const hex = m[1];
  const full =
    hex.length === 3 ? `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}` : hex;

  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function WordFlashcard(props: {
  word: string;
  synonym: string;
  sentence: string;
  isRevealed: boolean;
  onToggleReveal: () => void;
  wheelEnabled?: boolean;
  synonymWheelPool?: string[];
  synonymWheelCount?: number;
  onSynonymWheelAnswer?: (params: { selectedSynonym: string; isCorrect: boolean }) => void;
  onSynonymWheelVisibleChange?: (visible: boolean) => void;
}) {
  const theme = useTheme();
  const wheelEnabled = props.wheelEnabled ?? true;

  const suppressNextTapRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelAnim = useRef(new Animated.Value(0)).current;
  const wheelFinalizedRef = useRef(false);
  const wheelStartPointRef = useRef<{ x: number; y: number } | null>(null);

  const [cardSize, setCardSize] = useState({ width: 0, height: 0 });
  const [wheel, setWheel] = useState<{
    isVisible: boolean;
    options: string[];
    selectedIndex: number | null;
  }>({ isVisible: false, options: [], selectedIndex: null });
  const selectedIndexRef = useRef<number | null>(null);
  const wheelVisibleRef = useRef(false);

  const [feedback, setFeedback] = useState<{ tone: "success" | "danger"; text: string } | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      wheelAnim.stopAnimation();
      props.onSynonymWheelVisibleChange?.(false);
    };
  }, [wheelAnim]);

  useEffect(() => {
    wheelVisibleRef.current = wheel.isVisible;
  }, [wheel.isVisible]);

  const wheelOverlayBg = useMemo(() => withAlpha(theme.colors.background, 0.94), [theme.colors.background]);
  const wheelAccentSoft = useMemo(() => withAlpha(theme.colors.primary, 0.14), [theme.colors.primary]);
  const wheelAccentBorder = useMemo(() => withAlpha(theme.colors.primary, 0.28), [theme.colors.primary]);
  const wheelOverlayPadding = 14;
  const wheelPressRetentionOffset = useMemo(
    () => ({ top: 220, bottom: 220, left: 220, right: 220 }),
    []
  );

  const wheelOverlayScale = useMemo(
    () =>
      wheelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.985, 1],
      }),
    [wheelAnim]
  );

  const cardScale = useMemo(
    () =>
      wheelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.07],
      }),
    [wheelAnim]
  );

  function clearFeedbackLater() {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
    }, 750);
  }

  function setSelectedIndex(next: number | null) {
    if (selectedIndexRef.current === next) return;
    selectedIndexRef.current = next;
    setWheel((w) => ({ ...w, selectedIndex: next }));
  }

  function closeWheelAnimated() {
    if (!wheelVisibleRef.current) return;

    wheelAnim.stopAnimation();
    Animated.timing(wheelAnim, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setWheel({ isVisible: false, options: [], selectedIndex: null });
      wheelStartPointRef.current = null;
      props.onSynonymWheelVisibleChange?.(false);
    });

    selectedIndexRef.current = null;
  }

  function openWheel(startPoint: { x: number; y: number } | null) {
    if (!wheelEnabled) return;
    if (wheelVisibleRef.current) return;
    const correct = normalizeChoice(props.synonym);
    if (!correct) return;

    const pool = props.synonymWheelPool ?? [];
    const count = Math.max(3, Math.min(8, Math.round(props.synonymWheelCount ?? 6)));
    const options = pickSynonymWheelOptions({ correct, pool, count });
    if (options.length < 2) return;

    suppressNextTapRef.current = true;
    wheelFinalizedRef.current = false;
    wheelStartPointRef.current = startPoint;

    // Don't auto-select on open; only commit a choice after the user drags + releases.
    selectedIndexRef.current = null;
    setWheel({ isVisible: true, options, selectedIndex: null });
    props.onSynonymWheelVisibleChange?.(true);

    wheelAnim.stopAnimation();
    wheelAnim.setValue(0);
    Animated.timing(wheelAnim, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  function finalizeWheelSelection() {
    if (!wheel.isVisible) return;
    if (wheelFinalizedRef.current) return;
    wheelFinalizedRef.current = true;
    const idx = wheel.selectedIndex;
    const selectedSynonym = typeof idx === "number" ? wheel.options[idx] : "";
    const isCorrect = Boolean(selectedSynonym) && isSameChoice(selectedSynonym, props.synonym);

    closeWheelAnimated();

    if (selectedSynonym) {
      props.onSynonymWheelAnswer?.({ selectedSynonym, isCorrect });
      setFeedback({
        tone: isCorrect ? "success" : "danger",
        text: isCorrect ? "Correct" : "Try again",
      });
      clearFeedbackLater();
    }

    // Prevent the long-press interaction from also triggering the normal tap reveal.
    setTimeout(() => {
      suppressNextTapRef.current = false;
    }, 250);
  }

  function handleCardLayout(e: LayoutChangeEvent) {
    const { width, height } = e.nativeEvent.layout;
    setCardSize((prev) => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }

  function handleWheelMove(params: { x: number; y: number }) {
    if (!wheel.isVisible) return;
    if (wheel.options.length === 0) return;
    if (cardSize.width <= 0) return;

    const bottomZoneHeight = 120;
    if (cardSize.height > 0) {
      const selectionZoneTop = Math.max(wheelOverlayPadding, cardSize.height - bottomZoneHeight);
      if (params.y < selectionZoneTop) {
        setSelectedIndex(null);
        return;
      }
    }

    const start = wheelStartPointRef.current;
    if (start) {
      const dx = params.x - start.x;
      const dy = params.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Small "dead zone" to avoid accidental selection from tiny jitter.
      if (dist < 14) {
        setSelectedIndex(null);
        return;
      }
    }

    const n = Math.max(1, wheel.options.length);
    const rowX = wheelOverlayPadding;
    const rowW = Math.max(1, cardSize.width - wheelOverlayPadding * 2);
    const clampedX = Math.max(rowX, Math.min(params.x, rowX + rowW));
    const segmentW = rowW / n;
    const raw = Math.floor((clampedX - rowX) / Math.max(1, segmentW));
    const idx = Math.max(0, Math.min(raw, n - 1));
    setSelectedIndex(idx);
  }

  const feedbackToneColor =
    feedback?.tone === "success"
      ? BrandColors.success
      : feedback?.tone === "danger"
        ? BrandColors.danger
        : theme.colors.border;

  return (
    <Animated.View style={{ transform: [{ scale: cardScale }] }}>
      <View
        style={{
          backgroundColor: theme.colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: feedbackToneColor,
          minHeight: 260,
          overflow: "hidden",
        }}
      >
        <Pressable
          onLayout={handleCardLayout}
          delayLongPress={380}
          pressRetentionOffset={wheelPressRetentionOffset}
          onLongPress={(e) => openWheel({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })}
          onPress={() => {
            if (wheel.isVisible) return;
            if (suppressNextTapRef.current) return;
            props.onToggleReveal();
          }}
          onTouchEnd={() => {
            if (!wheel.isVisible) return;
            finalizeWheelSelection();
          }}
          onTouchCancel={() => {
            if (!wheel.isVisible) return;
            wheelFinalizedRef.current = true;
            closeWheelAnimated();
            setTimeout(() => {
              suppressNextTapRef.current = false;
            }, 250);
          }}
          onTouchMove={(e) => {
            if (!wheel.isVisible) return;
            handleWheelMove({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
          }}
          style={({ pressed }) => [
            {
              minHeight: 260,
              justifyContent: "center",
              opacity: wheel.isVisible ? 1 : pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={{ padding: 18, minHeight: 260, justifyContent: "center" }}>
            <View style={{ alignItems: "center", gap: 10 }}>
              <ThemedText variant="title" style={{ textTransform: "lowercase" }}>
                {props.word}
              </ThemedText>

              {props.isRevealed ? (
                <View style={{ gap: 10 }}>
                  <ThemedText variant="subtitle" style={{ textAlign: "center" }}>
                    {props.synonym}
                  </ThemedText>
                  <ThemedText variant="muted" style={{ textAlign: "center", lineHeight: 20 }}>
                    {props.sentence}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText variant="muted" style={{ textAlign: "center" }}>
                  Tap to reveal meaning + sentence
                </ThemedText>
              )}
            </View>
          </View>

          {/* Synonym wheel overlay (long-press + drag) */}
          {wheel.isVisible ? (
            <Animated.View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: wheelOverlayBg,
                padding: wheelOverlayPadding,
                opacity: wheelAnim,
                transform: [{ scale: wheelOverlayScale }],
              }}
            >
              <View style={{ flex: 1, justifyContent: "space-between" }}>
                <View style={{ alignItems: "center", marginTop: 4 }}>
                  <ThemedText variant="subtitle" style={{ textTransform: "lowercase", textAlign: "center" }}>
                    {props.word}
                  </ThemedText>

                  <View
                    style={{
                      marginTop: 10,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 16,
                      backgroundColor: withAlpha(theme.colors.primary, 0.06),
                      borderWidth: 1.5,
                      borderColor: wheelAccentBorder,
                    }}
                  >
                    <ThemedText variant="caption" style={{ textAlign: "center" }}>
                      Sentence
                    </ThemedText>
                    <ThemedText
                      variant="body"
                      style={{ textAlign: "center", lineHeight: 22, marginTop: 6 }}
                      numberOfLines={4}
                    >
                      {normalizeChoice(props.sentence) ? props.sentence : "No sentence available."}
                    </ThemedText>
                  </View>

                  <ThemedText variant="caption" style={{ textAlign: "center", marginTop: 10, opacity: 0.9 }}>
                    Hold, then slide • Release to select
                  </ThemedText>
                </View>

                <View style={{ alignItems: "center" }}>
                  <View
                    style={{
                      marginBottom: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      backgroundColor:
                        wheel.selectedIndex === null ? theme.colors.card : withAlpha(theme.colors.primary, 0.15),
                      borderWidth: 1,
                      borderColor: wheelAccentBorder,
                      shadowColor: "#000",
                      shadowOpacity: 0.18,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 3,
                    }}
                  >
                    <ThemedText variant="caption" style={{ textAlign: "center", fontWeight: "900" }}>
                      {wheel.selectedIndex === null ? "Slide left/right to pick" : wheel.options[wheel.selectedIndex]}
                    </ThemedText>
                  </View>

                  <View
                    style={{
                      width: "100%",
                      flexDirection: "row",
                      borderRadius: 16,
                      overflow: "hidden",
                      borderWidth: 1,
                      borderColor: wheelAccentBorder,
                      backgroundColor: theme.colors.card,
                    }}
                  >
                    {wheel.options.map((opt, i) => {
                      const isSelected = wheel.selectedIndex === i;
                      return (
                        <View
                          key={`${opt}-${i}`}
                          style={{
                            flex: 1,
                            minHeight: 62,
                            alignItems: "center",
                            justifyContent: "center",
                            paddingHorizontal: 8,
                            backgroundColor: isSelected ? theme.colors.primary : wheelAccentSoft,
                            borderLeftWidth: i === 0 ? 0 : 1,
                            borderLeftColor: wheelAccentBorder,
                          }}
                        >
                          <ThemedText
                            variant="caption"
                            style={{
                              textAlign: "center",
                              color: isSelected ? "#FFFFFF" : theme.colors.text,
                              fontWeight: isSelected ? "900" : "700",
                            }}
                            numberOfLines={2}
                          >
                            {opt}
                          </ThemedText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </Animated.View>
          ) : null}

          {feedback ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 12,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: theme.colors.background,
                  borderWidth: 1,
                  borderColor: feedbackToneColor,
                }}
              >
                <ThemedText variant="caption" style={{ color: feedbackToneColor, fontWeight: "900" }}>
                  {feedback.text}
                </ThemedText>
              </View>
            </View>
          ) : null}
        </Pressable>

        {/* Pronounce button */}
        <Pressable
          pointerEvents={wheel.isVisible ? "none" : "auto"}
          onPress={() => {
            if (props.isRevealed) {
              speakEnglishSequence({
                texts: [props.word, props.synonym, props.sentence],
                interrupt: true,
              });
            } else {
              speakEnglishWord({ text: props.word });
            }
          }}
          onLongPress={() => stopSpeaking()}
          style={({ pressed }) => ({
            position: "absolute",
            top: 12,
            right: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.background,
            borderWidth: 1,
            borderColor: theme.colors.border,
            opacity: wheel.isVisible ? 0 : pressed ? 0.85 : 1,
          })}
        >
          <Ionicons name="volume-high" size={20} color={theme.colors.text} />
        </Pressable>
      </View>
    </Animated.View>
  );
}
