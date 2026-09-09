import { useRouter } from "expo-router";
import { MagnifyingGlass } from "phosphor-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { TestRecord, useTests } from "@/src/api";
import { Header } from "@/src/components/Header";
import { HistoryCard } from "@/src/components/HistoryCard";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Filter = "all" | "pass" | "fail";
const FILTERS: { label: string; value: Filter }[] = [
  { label: "All", value: "all" },
  { label: "Pass", value: "pass" },
  { label: "Fail", value: "fail" },
];

export default function History() {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading, refetch, isRefetching } = useTests(q);

  const rows = useMemo(() => {
    const list = data ?? [];
    if (filter === "all") return list;
    return list.filter((t) => t.status.toUpperCase() === (filter === "pass" ? "PASS" : "FAIL"));
  }, [data, filter]);

  return (
    <View style={styles.screen}>
      <Header title="History & Data" subtitle="Test records" showSettings />

      {/* sticky search + chips */}
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <MagnifyingGlass size={16} color={colors.muted} />
          <TextInput
            testID="history-search"
            value={q}
            onChangeText={setQ}
            placeholder="Search sample, oil, batch, operator"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Pressable
                key={f.value}
                testID={`filter-chip-${f.value}`}
                onPress={() => setFilter(f.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList<TestRecord>
          data={rows}
          keyExtractor={(t) => t.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.brandPrimary} />
          }
          renderItem={({ item }) => (
            <HistoryCard test={item} onPress={() => router.push(`/result/${item.id}`)} />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.dim}>No records found.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  toolbar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    backgroundColor: c.surface,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: { flex: 1, fontFamily: fonts.mono, fontSize: 13, color: c.onSurface, paddingVertical: 0 },
  chipScroll: { marginTop: spacing.md },
  chipRow: { gap: spacing.sm, paddingRight: spacing.lg },
  chip: {
    height: 36,
    flexShrink: 0,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: c.surfaceTertiary,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  chipText: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurfaceTertiary },
  chipTextActive: { color: c.onBrandPrimary, fontFamily: fonts.monoBold },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxl },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxxl, gap: spacing.md },
  dim: { fontFamily: fonts.mono, fontSize: 12, color: c.muted },
}));
