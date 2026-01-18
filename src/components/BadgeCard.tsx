import React from "react";
import { View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";

export function BadgeCard(props: {
  title: string;
  description: string;
  isUnlocked: boolean;
}) {
  const theme = useTheme();
  const iconName = props.isUnlocked ? "ribbon" : "ribbon-outline";

  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        flexDirection: "row",
        gap: 12,
        alignItems: "center",
        opacity: props.isUnlocked ? 1 : 0.55,
      }}
    >
      <Ionicons name={iconName} size={26} color={props.isUnlocked ? theme.colors.primary : theme.colors.text} />
      <View style={{ flex: 1 }}>
        <ThemedText variant="subtitle">{props.title}</ThemedText>
        <ThemedText variant="muted" style={{ marginTop: 2 }}>
          {props.description}
        </ThemedText>
      </View>
    </View>
  );
}
