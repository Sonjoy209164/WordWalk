import React from "react";
import { View, ViewStyle } from "react-native";
import { useTheme } from "@react-navigation/native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

export function ScreenContainer(props: { children: React.ReactNode; style?: ViewStyle; edges?: Edge[] }) {
  const theme = useTheme();
  return (
    <SafeAreaView
      edges={props.edges}
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    >
      <View
        style={[
          {
            flex: 1,
            padding: 16,
          },
          props.style,
        ]}
      >
        {props.children}
      </View>
    </SafeAreaView>
  );
}
