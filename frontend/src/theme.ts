// KHT AI VISION design tokens. Dark-first industrial utility theme.
// Values mirror the "color" block of /app/design_guidelines.json. The dark
// palette is stored under `light` so the app always renders dark regardless of
// the device setting.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  surface: "#0A1420",
  onSurface: "#FFFFFF",
  surfaceSecondary: "#112033",
  onSurfaceSecondary: "#E2E8F0",
  surfaceTertiary: "#1A2B40",
  onSurfaceTertiary: "#CBD5E1",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#0A1420",
  muted: "#64748B",

  brand: "#00D2D3",
  onBrand: "#0A1420",
  brandPrimary: "#00D2D3",
  onBrandPrimary: "#0A1420",
  brandSecondary: "#F59E0B",
  onBrandSecondary: "#0A1420",
  brandTertiary: "#0E3342",
  onBrandTertiary: "#00D2D3",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F59E0B",
  onWarning: "#0A1420",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#3B82F6",
  onInfo: "#FFFFFF",

  border: "#1E3A5F",
  borderStrong: "#2B5080",
  divider: "#1E3A5F",
};

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}

// Spacing / radius tokens from design_guidelines.json
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 4, md: 8, lg: 12, pill: 999 };

// Fonts (loaded remotely in app/_layout.tsx)
export const fonts = {
  display: "BarlowCondensed-Bold",
  displaySemi: "BarlowCondensed-SemiBold",
  mono: "JetBrainsMono-Regular",
  monoMedium: "JetBrainsMono-Medium",
  monoBold: "JetBrainsMono-Bold",
};

// KHT reference scale: rating band -> color + labels
export const RATING_BANDS = [
  { score: "10", color: "#166534", pct: "0%", sub: "None", grade: "EXCELLENT" },
  { score: "9", color: "#15803D", pct: "< 5%", sub: "Very Slight", grade: "EXCELLENT" },
  { score: "8", color: "#22A85B", pct: "5 – 15%", sub: "Slight", grade: "VERY GOOD" },
  { score: "7", color: "#2563A8", pct: "15 – 30%", sub: "Light", grade: "GOOD" },
  { score: "6", color: "#D9A106", pct: "30 – 45%", sub: "Moderate", grade: "FAIR" },
  { score: "5", color: "#E08A0B", pct: "45 – 60%", sub: "Moderate Heavy", grade: "FAIR" },
  { score: "4", color: "#E5620E", pct: "60 – 75%", sub: "Heavy", grade: "POOR" },
  { score: "3", color: "#D9370E", pct: "75 – 90%", sub: "Very Heavy", grade: "POOR" },
  { score: "2", color: "#C1220E", pct: "90 – 100%", sub: "Extremely Heavy", grade: "VERY POOR" },
  { score: "0-1", color: "#991B1B", pct: "100%", sub: "Plugged", grade: "FAILED" },
];

// Rating value (0-10) -> band color for gauges/badges
export function ratingColor(rating: number): string {
  if (rating >= 9) return "#15803D";
  if (rating >= 8) return "#22A85B";
  if (rating >= 7) return "#2563A8";
  if (rating >= 5) return "#E08A0B";
  if (rating >= 3) return "#E5620E";
  return "#C1220E";
}
