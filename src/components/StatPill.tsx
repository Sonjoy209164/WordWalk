import React from "react";
import { View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { ThemedText } from "./ThemedText";

export function StatPill(props: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
        minWidth: 110,
      }}
    >
      <ThemedText variant="caption" style={{ marginBottom: 2 }}>
        {props.label}
      </ThemedText>
      <ThemedText variant="subtitle">{props.value}</ThemedText>
    </View>
  );
}
