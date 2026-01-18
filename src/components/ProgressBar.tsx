import React from "react";
import { View } from "react-native";
import { useTheme } from "@react-navigation/native";

export function ProgressBar(props: { progress: number; height?: number }) {
  const theme = useTheme();
  const height = props.height ?? 10;
  const clampedProgress = Math.max(0, Math.min(1, props.progress));

  return (
    <View
      style={{
        height,
        borderRadius: height,
        overflow: "hidden",
        backgroundColor: theme.colors.border,
      }}
    >
      <View
        style={{
          height: "100%",
          width: `${Math.round(clampedProgress * 100)}%`,
          backgroundColor: theme.colors.primary,
        }}
      />
    </View>
  );
}
