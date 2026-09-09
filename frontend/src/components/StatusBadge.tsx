import { Text, View } from "react-native";

import { fonts, radius, spacing, useTheme } from "@/src/theme";

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const { colors } = useTheme();
  const pass = status?.toUpperCase() === "PASS";
  const bg = pass ? colors.success : colors.error;
  const pad = size === "sm" ? { pv: spacing.xs, ph: spacing.sm, fs: 11 } : { pv: 6, ph: spacing.md, fs: 13 };
  return (
    <View
      testID={`status-badge-${pass ? "pass" : "fail"}`}
      style={{
        backgroundColor: bg,
        paddingVertical: pad.pv,
        paddingHorizontal: pad.ph,
        borderRadius: radius.sm,
        alignSelf: "flex-start",
      }}
    >
      <Text style={{ color: "#FFFFFF", fontFamily: fonts.monoBold, fontSize: pad.fs, letterSpacing: 1 }}>
        {pass ? "PASS" : "FAIL"}
      </Text>
    </View>
  );
}
