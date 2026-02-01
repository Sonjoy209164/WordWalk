import React from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";
import { speakEnglishSequence, speakEnglishWord, stopSpeaking } from "../utils/speech";

export function WordFlashcard(props: {
  word: string;
  synonym: string;
  sentence: string;
  isRevealed: boolean;
  onToggleReveal: () => void;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 260,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={props.onToggleReveal}
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
