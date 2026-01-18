import React, { useMemo, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";

import { ThemedText } from "./ThemedText";

type TranslatorModalProps = {
  isVisible: boolean;
  onClose: () => void;
};

function buildGoogleTranslateUrl(params: { sourceLang: string; targetLang: string; text: string }) {
  const encodedText = encodeURIComponent(params.text);
  // Web translate URL with text prefilled
  return `https://translate.google.com/?sl=${params.sourceLang}&tl=${params.targetLang}&text=${encodedText}&op=translate`;
}

export function TranslatorModal(props: TranslatorModalProps) {
  const { colors, dark } = useTheme();

  const [sourceLangCode, setSourceLangCode] = useState("en");
  const [targetLangCode, setTargetLangCode] = useState("bn");
  const [inputTextValue, setInputTextValue] = useState("");

  const translateUrl = useMemo(() => {
    return buildGoogleTranslateUrl({
      sourceLang: sourceLangCode,
      targetLang: targetLangCode,
      text: inputTextValue.trim() || " ",
    });
  }, [sourceLangCode, targetLangCode, inputTextValue]);

  const modalBackdropColor = dark ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.45)";
  const panelBackgroundColor = colors.card;

  return (
    <Modal visible={props.isVisible} transparent animationType="slide" onRequestClose={props.onClose}>
      <View style={{ flex: 1, backgroundColor: modalBackdropColor }}>
        <Pressable style={{ flex: 1 }} onPress={props.onClose} />

        <View
          style={{
            height: "78%",
            backgroundColor: panelBackgroundColor,
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <View
            style={{
              paddingHorizontal: 14,
              paddingTop: 12,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Ionicons name="language" size={18} color={colors.text} />
              <ThemedText style={{ fontWeight: "800" }}>Translator</ThemedText>
              <ThemedText variant="muted">
                {sourceLangCode.toUpperCase()} → {targetLangCode.toUpperCase()}
              </ThemedText>
            </View>

            <Pressable
              onPress={props.onClose}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {/* Controls */}
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="muted">Source</ThemedText>
                <TextInput
                  value={sourceLangCode}
                  onChangeText={setSourceLangCode}
                  placeholder="en"
                  placeholderTextColor={colors.border}
                  autoCapitalize="none"
                  style={{
                    marginTop: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText variant="muted">Target</ThemedText>
                <TextInput
                  value={targetLangCode}
                  onChangeText={setTargetLangCode}
                  placeholder="bn"
                  placeholderTextColor={colors.border}
                  autoCapitalize="none"
                  style={{
                    marginTop: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                  }}
                />
              </View>
            </View>

            <View>
              <ThemedText variant="muted">Text</ThemedText>
              <TextInput
                value={inputTextValue}
                onChangeText={setInputTextValue}
                placeholder="Paste a word/sentence…"
                placeholderTextColor={colors.border}
                multiline
                style={{
                  marginTop: 6,
                  minHeight: 52,
                  maxHeight: 120,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                }}
              />
            </View>
          </View>

          {/* WebView */}
          <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.border }}>
            <WebView
              source={{ uri: translateUrl }}
              startInLoadingState
              style={{ flex: 1, backgroundColor: panelBackgroundColor }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
