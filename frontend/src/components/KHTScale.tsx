import { Text, View } from "react-native";

import { fonts, RATING_BANDS, spacing, useTheme } from "@/src/theme";

// Compact segmented colorbar for the KHT standard rating reference (10 -> 0).
export function KHTScale({ current }: { current?: number }) {
  const { colors } = useTheme();

  // marker position: rating 10 at left, 0 at right across 10 bands
  const markerIndex =
    current === undefined ? -1 : Math.min(RATING_BANDS.length - 1, Math.max(0, Math.round(10 - current)));

  return (
    <View testID="kht-scale">
      <View style={{ flexDirection: "row", borderRadius: 4, overflow: "hidden" }}>
        {RATING_BANDS.map((b, i) => {
          const active = i === markerIndex;
          return (
            <View
              key={b.score}
              style={{
                flex: 1,
                backgroundColor: b.color,
                paddingVertical: spacing.sm,
                alignItems: "center",
                borderWidth: active ? 2 : 0,
                borderColor: "#FFFFFF",
              }}
            >
              <Text style={{ fontFamily: fonts.display, fontSize: 15, color: "#FFFFFF" }}>{b.score}</Text>
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: "row", marginTop: spacing.xs }}>
        <Text style={{ flex: 1, textAlign: "left", fontFamily: fonts.mono, fontSize: 10, color: colors.success }}>
          10 · EXCELLENT
        </Text>
        <Text style={{ flex: 1, textAlign: "right", fontFamily: fonts.mono, fontSize: 10, color: colors.error }}>
          FAILED · 0
        </Text>
      </View>
    </View>
  );
}

// Full detail reference: each band as a row (score, %, grade)
export function KHTScaleDetail() {
  const { colors } = useTheme();
  return (
    <View testID="kht-scale-detail">
      {RATING_BANDS.map((b) => (
        <View
          key={b.score}
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: spacing.md,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              backgroundColor: b.color,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontFamily: fonts.display, fontSize: 18, color: "#FFFFFF" }}>{b.score}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ fontFamily: fonts.monoBold, fontSize: 13, color: colors.onSurface }}>
              {b.pct} · {b.sub}
            </Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 2 }}>{b.grade}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}
