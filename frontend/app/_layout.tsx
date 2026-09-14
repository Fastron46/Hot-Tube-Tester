import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { LogBox, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { ToastProvider } from "@/src/components/Toast";
import { queryClient } from "@/src/query-client";
import { useTheme } from "@/src/theme";

LogBox.ignoreAllLogs(true);

const FONT_BASE = "https://cdn.jsdelivr.net/gh";

export default function RootLayout() {
  const { colors } = useTheme();
  useFonts({
    "BarlowCondensed-Bold": `${FONT_BASE}/google/fonts@main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf`,
    "BarlowCondensed-SemiBold": `${FONT_BASE}/google/fonts@main/ofl/barlowcondensed/BarlowCondensed-SemiBold.ttf`,
    "JetBrainsMono-Regular": `${FONT_BASE}/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Regular.ttf`,
    "JetBrainsMono-Medium": `${FONT_BASE}/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Medium.ttf`,
    "JetBrainsMono-Bold": `${FONT_BASE}/JetBrains/JetBrainsMono@master/fonts/ttf/JetBrainsMono-Bold.ttf`,
  });

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.surface }}>
          <SafeAreaProvider>
            <KeyboardProvider>
              <ToastProvider>
                <StatusBar style="light" />
                <View style={{ flex: 1, backgroundColor: colors.surface }}>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                      contentStyle: { backgroundColor: colors.surface },
                      animation: "fade",
                    }}
                  >
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="result/[id]" />
                    <Stack.Screen name="color-scale" />
                    <Stack.Screen name="settings" options={{ presentation: "modal" }} />
                  </Stack>
                </View>
              </ToastProvider>
            </KeyboardProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
