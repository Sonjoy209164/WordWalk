import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline";
}) {
  const theme = useTheme();
  const variant = props.variant ?? "primary";
  const isOutline = variant === "outline";

  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          paddingVertical: 12,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isOutline ? "transparent" : theme.colors.primary,
          borderWidth: 1,
          borderColor: theme.colors.primary,
          opacity: props.disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        props.style,
      ]}
    >
      <Text
        style={{
          color: isOutline ? theme.colors.primary : "white",
          fontSize: 16,
          fontWeight: "700",
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}
