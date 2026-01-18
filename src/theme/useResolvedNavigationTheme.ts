import { useColorScheme } from "react-native";
import { DarkTheme, DefaultTheme, Theme } from "@react-navigation/native";

import { useAppStore } from "../store/useAppStore";
import { BrandColors, DarkPalette, LightPalette } from "./colors";

export function useResolvedNavigationTheme(): Theme {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.settings.themeMode);

  const shouldUseDark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");

  const baseTheme = shouldUseDark ? DarkTheme : DefaultTheme;
  const palette = shouldUseDark ? DarkPalette : LightPalette;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: palette.background,
      card: palette.card,
      text: palette.text,
      border: palette.border,
      primary: BrandColors.primary,
      notification: BrandColors.primary,
    },
  };
}

export function useIsDarkMode(): boolean {
  const systemColorScheme = useColorScheme();
  const themeMode = useAppStore((s) => s.settings.themeMode);
  return themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
}
