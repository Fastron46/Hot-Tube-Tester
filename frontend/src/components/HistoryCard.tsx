import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { fileUrl, TestRecord } from "@/src/api";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, ratingColor, spacing } from "@/src/theme";
import { fmtDate } from "@/src/utils/format";

export function HistoryCard({ test, onPress }: { test: TestRecord; onPress: () => void }) {
  const styles = useStyles();
  const color = ratingColor(test.rating);
  return (
    <Pressable style={styles.row} onPress={onPress} testID={`history-card-${test.id}`}>
      <Image source={{ uri: fileUrl(test.image_path) }} style={styles.thumb} contentFit="cover" transition={200} />
      <View style={styles.mid}>
        <Text style={styles.sample} numberOfLines={1}>
          {test.meta.sample_id || "—"}
        </Text>
        <Text style={styles.oil} numberOfLines={1}>
          {test.meta.oil_type || "Unknown oil"}
        </Text>
        <Text style={styles.date}>{fmtDate(test.created_at)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.rating, { color }]}>{test.rating.toFixed(1)}</Text>
        <StatusBadge status={test.status} size="sm" />
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: spacing.md,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: c.surfaceTertiary },
  mid: { flex: 1 },
  sample: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  oil: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },
  date: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  rating: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
}));
