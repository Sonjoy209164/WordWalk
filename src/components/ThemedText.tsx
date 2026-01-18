import React from "react";
import { Text, TextStyle } from "react-native";
import { useTheme } from "@react-navigation/native";

import { DarkPalette, LightPalette } from "../theme/colors";
import { useIsDarkMode } from "../theme/useResolvedNavigationTheme";

type Variant = "title" | "subtitle" | "body" | "muted" | "caption";

const variantStyles: Record<Variant, TextStyle> = {
  title: { fontSize: 28, fontWeight: "800" },
  subtitle: { fontSize: 18, fontWeight: "700" },
  body: { fontSize: 16, fontWeight: "500" },
  muted: { fontSize: 14, fontWeight: "500" },
  caption: { fontSize: 12, fontWeight: "500" },
};

export function ThemedText(props: {
  children: React.ReactNode;
  variant?: Variant;
  style?: TextStyle;
  numberOfLines?: number;
}) {
  const theme = useTheme();
  const isDarkMode = useIsDarkMode();
  const palette = isDarkMode ? DarkPalette : LightPalette;

  const variant = props.variant ?? "body";
  const baseColor = variant === "muted" || variant === "caption" ? palette.mutedText : theme.colors.text;

  return (
    <Text
      numberOfLines={props.numberOfLines}
      style={[{ color: baseColor }, variantStyles[variant], props.style]}
    >
      {props.children}
    </Text>
  );
}
