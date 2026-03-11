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
}) {
  const theme = useTheme();
  const wheelEnabled = props.wheelEnabled ?? true;

  const suppressNextTapRef = useRef(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelAnim = useRef(new Animated.Value(0)).current;

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
    };
  }, [wheelAnim]);

  useEffect(() => {
    wheelVisibleRef.current = wheel.isVisible;
  }, [wheel.isVisible]);

  const center = useMemo(
    () => ({ x: cardSize.width / 2, y: cardSize.height / 2 }),
    [cardSize.height, cardSize.width]
  );
  const radius = useMemo(() => {
    const base = Math.max(1, Math.min(cardSize.width, cardSize.height));
    return Math.max(64, Math.min(112, base * 0.36));
  }, [cardSize.height, cardSize.width]);
  const deadZone = useMemo(() => Math.max(26, Math.min(44, radius * 0.45)), [radius]);
  const wheelOverlayBg = useMemo(() => withAlpha(theme.colors.background, 0.94), [theme.colors.background]);
  const wheelAccentSoft = useMemo(() => withAlpha(theme.colors.primary, 0.14), [theme.colors.primary]);
  const wheelAccentBorder = useMemo(() => withAlpha(theme.colors.primary, 0.28), [theme.colors.primary]);
  const wheelPressRetentionOffset = useMemo(() => {
    const pad = Math.ceil(radius + 90);
    return { top: pad, bottom: pad, left: pad, right: pad };
  }, [radius]);

  const wheelOverlayScale = useMemo(
    () =>
      wheelAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.985, 1],
      }),
    [wheelAnim]
  );

  function computeOptionCenters(count: number): { x: number; y: number }[] {
    const n = Math.max(1, count);
    const step = (2 * Math.PI) / n;
    const centers: { x: number; y: number }[] = [];
    for (let i = 0; i < n; i++) {
      const angle = -Math.PI / 2 + i * step;
      centers.push({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
    }
    return centers;
  }

  const optionCenters = useMemo(() => {
    if (!wheel.isVisible) return [];
    if (wheel.options.length === 0) return [];
    if (cardSize.width <= 0 || cardSize.height <= 0) return [];
    return computeOptionCenters(wheel.options.length);
  }, [cardSize.height, cardSize.width, center.x, center.y, radius, wheel.isVisible, wheel.options.length]);

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
    });

    selectedIndexRef.current = null;
  }

  function openWheel(startPoint?: { x: number; y: number }) {
    if (!wheelEnabled) return;
    if (wheelVisibleRef.current) return;
    const correct = normalizeChoice(props.synonym);
    if (!correct) return;

    const pool = props.synonymWheelPool ?? [];
    const count = Math.max(3, Math.min(8, Math.round(props.synonymWheelCount ?? 6)));
    const options = pickSynonymWheelOptions({ correct, pool, count });
    if (options.length < 2) return;

    suppressNextTapRef.current = true;

    const initialIndex = (() => {
      if (!startPoint) return null;
      if (cardSize.width <= 0 || cardSize.height <= 0) return null;

      const dx = startPoint.x - center.x;
      const dy = startPoint.y - center.y;
      const dist = Math.hypot(dx, dy);
      if (dist < deadZone) return null;

      const centers = computeOptionCenters(options.length);
      let bestIndex = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < centers.length; i++) {
        const d = Math.hypot(startPoint.x - centers[i].x, startPoint.y - centers[i].y);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      }
      return bestIndex;
    })();

    selectedIndexRef.current = initialIndex;
    setWheel({ isVisible: true, options, selectedIndex: initialIndex });

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
    if (cardSize.width <= 0 || cardSize.height <= 0) return;

    const dx = params.x - center.x;
    const dy = params.y - center.y;
    const dist = Math.hypot(dx, dy);
    if (dist < deadZone) {
      setSelectedIndex(null);
      return;
    }

    if (optionCenters.length === 0) return;

    let bestIndex = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < optionCenters.length; i++) {
      const d = Math.hypot(params.x - optionCenters[i].x, params.y - optionCenters[i].y);
      if (d < bestDist) {
        bestDist = d;
        bestIndex = i;
      }
    }

    const current = selectedIndexRef.current;
    if (typeof current === "number" && optionCenters[current]) {
      const currentDist = Math.hypot(params.x - optionCenters[current].x, params.y - optionCenters[current].y);
      const hysteresisPx = Math.max(10, Math.min(20, radius * 0.12));
      if (currentDist - bestDist < hysteresisPx) {
        setSelectedIndex(current);
        return;
      }
    }

    setSelectedIndex(bestIndex);
  }

  const feedbackToneColor =
    feedback?.tone === "success"
      ? BrandColors.success
      : feedback?.tone === "danger"
        ? BrandColors.danger
        : theme.colors.border;

  return (
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
        onLongPress={(e) =>
          openWheel({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY })
        }
        onPress={() => {
          if (wheel.isVisible) return;
          if (suppressNextTapRef.current) return;
          props.onToggleReveal();
        }}
        onPressOut={() => {
          if (!wheel.isVisible) return;
          finalizeWheelSelection();
        }}
        onTouchMove={(e) => {
          if (!wheel.isVisible) return;
          handleWheelMove({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });
        }}
        style={({ pressed }) => [
          {
            padding: 18,
            minHeight: 260,
            justifyContent: "center",
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
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
              padding: 14,
              opacity: wheelAnim,
              transform: [{ scale: wheelOverlayScale }],
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 10,
                left: 14,
                right: 14,
                alignItems: "center",
              }}
            >
              <ThemedText variant="subtitle" style={{ textTransform: "lowercase", textAlign: "center" }}>
                {props.word}
              </ThemedText>
            </View>

            <View
              style={{
                position: "absolute",
                left: center.x - deadZone,
                top: center.y - deadZone,
                width: deadZone * 2,
                height: deadZone * 2,
                borderRadius: deadZone,
                borderWidth: 1,
                borderColor: wheelAccentBorder,
                backgroundColor: wheelAccentSoft,
              }}
            />

            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <View
                style={{
                  maxWidth: 260,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 14,
                  backgroundColor: theme.colors.card,
                  borderWidth: 1.5,
                  borderColor: wheelAccentBorder,
                }}
              >
                <ThemedText variant="caption" style={{ textAlign: "center" }}>
                  Sentence
                </ThemedText>
                <ThemedText
                  variant="muted"
                  style={{ textAlign: "center", lineHeight: 20, marginTop: 6 }}
                  numberOfLines={4}
                >
                  {normalizeChoice(props.sentence) ? props.sentence : "No sentence available."}
                </ThemedText>
              </View>

              <ThemedText variant="caption" style={{ textAlign: "center", marginTop: 12 }}>
                Long press, then drag to choose
              </ThemedText>
            </View>

            {wheel.options.map((opt, i) => {
              const pos = optionCenters[i] ?? { x: center.x, y: center.y };
              const x = pos.x;
              const y = pos.y;

              const n = Math.max(1, wheel.options.length);
              const baseW = Math.max(96, Math.min(132, cardSize.width * 0.32));
              const w = Math.max(88, Math.round(baseW - Math.max(0, n - 6) * 6));
              const h = 44;
              const isSelected = wheel.selectedIndex === i;

              return (
                <View
                  key={`${opt}-${i}`}
                  style={{
                    position: "absolute",
                    left: x - w / 2,
                    top: y - h / 2,
                    width: w,
                    height: h,
                    borderRadius: 999,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 10,
                    backgroundColor: isSelected ? theme.colors.primary : wheelAccentSoft,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? theme.colors.primary : wheelAccentBorder,
                    transform: [{ scale: isSelected ? 1.06 : 1 }],
                    shadowColor: "#000000",
                    shadowOpacity: isSelected ? 0.22 : 0.12,
                    shadowRadius: isSelected ? 12 : 8,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: isSelected ? 6 : 3,
                  }}
                >
                  <ThemedText
                    variant="caption"
                    style={{ textAlign: "center", color: isSelected ? "#FFFFFF" : theme.colors.text }}
                    numberOfLines={2}
                  >
                    {opt}
                  </ThemedText>
                </View>
              );
            })}
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
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="volume-high" size={20} color={theme.colors.text} />
      </Pressable>
    </View>
  );
}
