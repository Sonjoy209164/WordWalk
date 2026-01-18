import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { TranslatorModal } from "./TranslatorModal";

export function FloatingTranslatorFab() {
  const { colors, dark } = useTheme();
  const [isTranslatorOpen, setIsTranslatorOpen] = useState(false);

  const fabBackgroundColor = dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          right: 3,
          bottom: 920,
          zIndex: 9999,
          elevation: 14,
        }}
      >
        <Pressable
          onPress={() => setIsTranslatorOpen(true)}
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
      </View>

      <TranslatorModal isVisible={isTranslatorOpen} onClose={() => setIsTranslatorOpen(false)} />
    </View>
  );
}
