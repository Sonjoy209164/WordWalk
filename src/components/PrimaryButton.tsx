import React from "react";
import { Pressable, Text, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";
import { BrandColors } from "../theme/colors";

export function PrimaryButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: "primary" | "outline";
  tone?: "primary" | "success" | "warning" | "danger";
}) {
  const theme = useTheme();
  const variant = props.variant ?? "primary";
  const isOutline = variant === "outline";
  const tone = props.tone ?? "primary";
  const toneColor = BrandColors[tone];

  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isOutline ? "transparent" : toneColor,
          borderWidth: 1,
          borderColor: toneColor,
          opacity: props.disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        props.style,
      ]}
    >
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          color: isOutline ? toneColor : "white",
          fontSize: 16,
          fontWeight: "700",
          textAlign: "center",
          flexShrink: 1,
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}
