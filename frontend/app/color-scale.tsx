import { Image } from "expo-image";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorScaleLevel, useColorScale } from "@/src/api";
import { Header } from "@/src/components/Header";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export default function ColorScaleScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch } = useColorScale();

  // Show levels in the same order as the physical board photo (0 at top -> 10).
  const levels: ColorScaleLevel[] = (data?.levels ?? []).slice().sort((a, b) => a.level - b.level);

  return (
    <View style={styles.screen}>
      <Header title="Nikko Color Scale" subtitle="Standard reference 0 – 10" showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brandPrimary} />
            <Text style={styles.dim}>Loading reference…</Text>
          </View>
        ) : isError || !data ? (
          <View style={styles.center}>
            <Text style={styles.dim} onPress={() => refetch()}>
              Failed to load reference. Tap to retry.
            </Text>
          </View>
        ) : (
          <>
            {/* Reference board image (stored in database) */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>NIKKO COLOR SCALE BOARD</Text>
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: data.image }}
                  style={styles.boardImage}
                  contentFit="contain"
                  transition={200}
                />
              </View>
              <Text style={styles.note}>{data.note}</Text>
            </View>

            {/* Level legend */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>REFERENCE LEVELS (0 – 10)</Text>
              <Text style={styles.helper}>
                Bandingkan warna endapan pada tabung sample dengan level di bawah ini saat melakukan analisa visual.
              </Text>
              <View style={{ marginTop: spacing.sm }}>
                {levels.map((lvl, i) => (
                  <LevelRow key={lvl.level} lvl={lvl} last={i === levels.length - 1} />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function LevelRow({ lvl, last }: { lvl: ColorScaleLevel; last?: boolean }) {
  const styles = useStyles();
  const swatchText = lvl.level >= 7 ? "#0A1420" : "#FFFFFF";
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.swatch, { backgroundColor: lvl.color }]}>
        <Text style={[styles.swatchNum, { color: swatchText }]}>{lvl.level}</Text>
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {lvl.name}
          </Text>
          <StatusBadge status={lvl.status} size="sm" />
        </View>
        <Text style={styles.rowCondition}>{lvl.condition}</Text>
        <Text style={styles.rowMeta}>
          Endapan {lvl.deposit_pct} · {lvl.grade}
        </Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted, textAlign: "center" },

  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, letterSpacing: 1.5 },
  helper: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, lineHeight: 17, marginTop: spacing.sm },
  note: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 17, marginTop: spacing.md },

  imageWrap: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: "#0B1119",
  },
  boardImage: { width: "100%", aspectRatio: 1.5, backgroundColor: "#0B1119" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: spacing.md,
  },
  swatch: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  swatchNum: { fontFamily: fonts.display, fontSize: 20 },
  rowBody: { flex: 1, gap: 2 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowName: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface, flex: 1 },
  rowCondition: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceSecondary, lineHeight: 16 },
  rowMeta: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, letterSpacing: 0.5, marginTop: 1 },
}));
