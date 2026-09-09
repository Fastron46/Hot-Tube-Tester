import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { fonts, ratingColor, spacing, useTheme } from "@/src/theme";

export function RatingGauge({
  rating,
  performance,
  confidence,
  size = 168,
}: {
  rating: number;
  performance: string;
  confidence: number;
  size?: number;
}) {
  const { colors } = useTheme();
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, rating / 10));
  const arc = circ * pct;
  const color = ratingColor(rating);

  return (
    <View style={{ alignItems: "center" }} testID="rating-gauge">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <Circle cx={cx} cy={cx} r={r} stroke={colors.surfaceTertiary} strokeWidth={stroke} fill="none" />
          <Circle
            cx={cx}
            cy={cx}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circ}`}
            transform={`rotate(-90 ${cx} ${cx})`}
          />
        </Svg>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
          <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 56, color: colors.onSurface, lineHeight: 60 }}>
              {rating.toFixed(1)}
            </Text>
            <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color: colors.muted, marginBottom: 8 }}>
              /10
            </Text>
          </View>
          <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.muted, letterSpacing: 1 }}>
            KHT RATING (AI)
          </Text>
        </View>
      </View>
      <Text style={{ fontFamily: fonts.displaySemi, fontSize: 20, color, marginTop: spacing.sm, letterSpacing: 1 }}>
        {performance || "—"}
      </Text>
      <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: colors.muted, marginTop: 2 }}>
        CONFIDENCE {confidence.toFixed(1)}%
      </Text>
    </View>
  );
}
