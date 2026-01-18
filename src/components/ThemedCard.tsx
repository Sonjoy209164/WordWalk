import React from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";

export function ThemedCard(props: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.card,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}
