import React from "react";
import { Pressable, View } from "react-native";
import { useTheme } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "./ThemedText";

export function TodoRow(props: {
  title: string;
  isCompleted: boolean;
  onToggle: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const iconName = props.isCompleted ? "checkmark-circle" : "ellipse-outline";

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 }}>
      <Pressable onPress={props.onToggle} hitSlop={10}>
        <Ionicons
          name={iconName}
          size={22}
          color={props.isCompleted ? theme.colors.primary : theme.colors.border}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <ThemedText
          variant="body"
          style={{
            textDecorationLine: props.isCompleted ? "line-through" : "none",
            opacity: props.isCompleted ? 0.6 : 1,
          }}
          numberOfLines={2}
        >
          {props.title}
        </ThemedText>
      </View>

      {props.onDelete ? (
        <Pressable onPress={props.onDelete} hitSlop={10}>
          <Ionicons name="trash-outline" size={20} color={theme.colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}
