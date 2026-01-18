import React from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";

export function ScreenContainer(props: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: 16,
        },
        props.style,
      ]}
    >
      {props.children}
    </View>
  );
}
