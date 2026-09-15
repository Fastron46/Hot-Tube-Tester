import { Image } from "expo-image";
import { Check } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";

import { fileUrl, TestRecord } from "@/src/api";
import { StatusBadge } from "@/src/components/StatusBadge";
import { fonts, makeStyles, radius, ratingColor, spacing, useTheme } from "@/src/theme";
import { fmtDate } from "@/src/utils/format";

export function HistoryCard({
  test,
  onPress,
  selectionMode,
  selected,
  onToggleSelect,
  onLongPress,
}: {
  test: TestRecord;
  onPress: () => void;
  selectionMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onLongPress?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = ratingColor(test.rating);

  const handlePress = () => {
    if (selectionMode) {
      onToggleSelect?.();
    } else {
      onPress();
    }
  };

  return (
    <Pressable
      style={[styles.row, selectionMode && selected && styles.rowSelected]}
      onPress={handlePress}
      onLongPress={onLongPress}
      delayLongPress={280}
      testID={`history-card-${test.id}`}
    >
      <Pressable
        onPress={onToggleSelect}
        hitSlop={12}
        style={[styles.checkbox, selected && styles.checkboxOn]}
        testID={`history-check-${test.id}`}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!selected }}
      >
        {selected ? <Check size={14} color={colors.onBrandPrimary} weight="bold" /> : null}
      </Pressable>
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
    paddingHorizontal: spacing.sm,
    marginHorizontal: -spacing.sm,
    borderRadius: radius.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
    gap: spacing.md,
  },
  rowSelected: {
    backgroundColor: c.brandTertiary,
    borderBottomColor: c.brandPrimary,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: c.borderStrong,
    backgroundColor: c.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: {
    backgroundColor: c.brandPrimary,
    borderColor: c.brandPrimary,
  },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: c.surfaceTertiary },
  mid: { flex: 1 },
  sample: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  oil: { fontFamily: fonts.mono, fontSize: 11, color: c.onSurfaceTertiary, marginTop: 2 },
  date: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: 2 },
  right: { alignItems: "flex-end", gap: 4 },
  rating: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30 },
}));
