import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, radius, spacing, useTheme } from "@/src/theme";

type ToastType = "success" | "error" | "info";
type ToastState = { message: string; type: ToastType } | null;

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, type: ToastType = "info") => {
      setToast({ message, type });
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setToast(null));
      }, 2800);
    },
    [opacity],
  );

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const accent =
    toast?.type === "success" ? colors.success : toast?.type === "error" ? colors.error : colors.brandPrimary;

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[styles.wrap, { top: insets.top + spacing.md, opacity }]}
          testID="app-toast"
        >
          <View style={[styles.toast, { backgroundColor: colors.surfaceTertiary, borderColor: accent }]}>
            <View style={[styles.dot, { backgroundColor: accent }]} />
            <Text style={[styles.text, { color: colors.onSurface }]}>{toast.message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center", zIndex: 9999 },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    maxWidth: 520,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontFamily: fonts.monoMedium, fontSize: 13, flexShrink: 1 },
});
