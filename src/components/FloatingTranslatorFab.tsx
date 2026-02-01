import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, useWindowDimensions, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { TranslatorModal } from "./TranslatorModal";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function FloatingTranslatorFab() {
  const { colors, dark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(false);
  const [fabSize, setFabSize] = useState({ width: 54, height: 54 });
  const [hasInitialPosition, setHasInitialPosition] = useState(false);

  const fabBackgroundColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const panValueRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const id = pan.addListener((v) => {
      panValueRef.current = { x: v.x, y: v.y };
    });
    return () => {
      pan.removeListener(id);
    };
  }, [pan]);

  const bounds = useMemo(() => {
    const padding = 12;
    const minX = insets.left + padding;
    const minY = insets.top + padding;
    const maxX = Math.max(minX, screenWidth - insets.right - padding - fabSize.width);
    const maxY = Math.max(minY, screenHeight - insets.bottom - padding - fabSize.height);
    return { minX, minY, maxX, maxY };
  }, [fabSize.height, fabSize.width, insets.bottom, insets.left, insets.right, insets.top, screenHeight, screenWidth]);

  useEffect(() => {
    if (!Number.isFinite(screenWidth) || !Number.isFinite(screenHeight) || screenWidth <= 0 || screenHeight <= 0)
      return;

    if (!hasInitialPosition) {
      const initial = {
        x: bounds.maxX,
        y: clamp(bounds.minY + 16, bounds.minY, bounds.maxY),
      };
      pan.setValue(initial);
      setHasInitialPosition(true);
      return;
    }

    const current = (pan as any).__getValue?.() ?? panValueRef.current;
    const clamped = {
      x: clamp(current.x, bounds.minX, bounds.maxX),
      y: clamp(current.y, bounds.minY, bounds.maxY),
    };
    pan.setValue(clamped);
  }, [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, hasInitialPosition, pan, screenHeight, screenWidth]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          const current = (pan as any).__getValue?.() ?? panValueRef.current;
          pan.setOffset({ x: current.x, y: current.y });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          const next = (pan as any).__getValue?.() ?? panValueRef.current;
          const clamped = {
            x: clamp(next.x, bounds.minX, bounds.maxX),
            y: clamp(next.y, bounds.minY, bounds.maxY),
          };
          Animated.spring(pan, { toValue: clamped, useNativeDriver: false }).start();
        },
        onPanResponderTerminate: () => {
          pan.flattenOffset();
          const next = (pan as any).__getValue?.() ?? panValueRef.current;
          const clamped = {
            x: clamp(next.x, bounds.minX, bounds.maxX),
            y: clamp(next.y, bounds.minY, bounds.maxY),
          };
          Animated.spring(pan, { toValue: clamped, useNativeDriver: false }).start();
        },
      }),
    [bounds.maxX, bounds.maxY, bounds.minX, bounds.minY, pan]
  );

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <Animated.View
        {...panResponder.panHandlers}
        style={{
          position: "absolute",
          zIndex: 9999,
          elevation: 14,
          transform: pan.getTranslateTransform(),
        }}
      >
        <Pressable
          onPress={() => setIsTranslatorOpen(true)}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) setFabSize({ width, height });
          }}
          style={({ pressed }) => ({
            width: 54,
            height: 54,
            borderRadius: 27,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            opacity: pressed ? 0.88 : 1,
          })}
        >
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: fabBackgroundColor,
            }}
          >
            <Ionicons name="language" size={22} color={colors.text} />
          </View>
        </Pressable>
      </Animated.View>

      <TranslatorModal isVisible={isTranslatorOpen} onClose={() => setIsTranslatorOpen(false)} />
    </View>
  );
}
