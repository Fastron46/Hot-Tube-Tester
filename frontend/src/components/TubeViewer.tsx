import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { LayoutChangeEvent, Text, View } from "react-native";

import { fileUrl, Parameters } from "@/src/api";
import { fonts, spacing, useTheme } from "@/src/theme";

const TUBE_LEN_MM = 300;
const TICKS = [0, 50, 100, 150, 200, 250, 300];

export function TubeViewer({
  imagePath,
  parameters,
  mode,
  height = 150,
}: {
  imagePath: string;
  parameters: Parameters;
  mode: "original" | "heatmap";
  height?: number;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const start = Math.max(0, Math.min(TUBE_LEN_MM, parameters.deposit_start_mm));
  const end = Math.max(start, Math.min(TUBE_LEN_MM, parameters.deposit_end_mm));
  const leftPct = start / TUBE_LEN_MM;
  const widthPct = Math.max(0.02, (end - start) / TUBE_LEN_MM);
  const depLen = (end - start).toFixed(0);

  return (
    <View testID="tube-viewer">
      {/* ruler */}
      <View style={{ height: 16, marginBottom: spacing.xs }} onLayout={onLayout}>
        {w > 0 &&
          TICKS.map((t) => {
            const x = (t / TUBE_LEN_MM) * w;
            const left = Math.min(Math.max(x - 12, 0), w - 24);
            return (
              <Text
                key={t}
                style={{
                  position: "absolute",
                  left,
                  fontFamily: fonts.mono,
                  fontSize: 9,
                  color: colors.muted,
                  width: 24,
                  textAlign: "center",
                }}
              >
                {t}
              </Text>
            );
          })}
      </View>

      <View
        style={{
          height,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "#050B12",
          borderWidth: 1,
          borderColor: mode === "heatmap" ? colors.brandPrimary : colors.border,
        }}
      >
        <Image source={{ uri: fileUrl(imagePath) }} style={{ width: "100%", height: "100%" }} contentFit="cover" />

        {mode === "heatmap" && (
          <>
            <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "#000", opacity: 0.35 }} />
            <View
              style={{
                position: "absolute",
                top: height * 0.22,
                bottom: height * 0.22,
                left: `${leftPct * 100}%`,
                width: `${widthPct * 100}%`,
              }}
            >
              <LinearGradient
                colors={["#10B981", "#EAB308", "#EF4444", "#EAB308", "#10B981"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1, borderRadius: 6, opacity: 0.82 }}
              />
            </View>
            <View
              style={{
                position: "absolute",
                top: 6,
                left: `${leftPct * 100}%`,
                width: `${widthPct * 100}%`,
                alignItems: "center",
              }}
            >
              <Text style={{ fontFamily: fonts.monoBold, fontSize: 11, color: colors.brandPrimary }}>{depLen} mm</Text>
            </View>
          </>
        )}

        {mode === "original" && (
          <View
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              backgroundColor: "rgba(10,20,32,0.75)",
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}
          >
            <Text style={{ fontFamily: fonts.mono, fontSize: 10, color: colors.brandPrimary }}>ORIGINAL</Text>
          </View>
        )}
      </View>

      {mode === "heatmap" && (
        <View style={{ marginTop: spacing.sm }}>
          <LinearGradient
            colors={["#10B981", "#EAB308", "#EF4444"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 8, borderRadius: 4 }}
          />
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>Low deposit</Text>
            <Text style={{ fontFamily: fonts.mono, fontSize: 9, color: colors.muted }}>High deposit</Text>
          </View>
        </View>
      )}
    </View>
  );
}
