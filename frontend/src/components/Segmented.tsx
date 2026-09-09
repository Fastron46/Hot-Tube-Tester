import { Pressable, Text, View } from "react-native";

import { fonts, makeStyles, radius, spacing } from "@/src/theme";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testID,
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  testID?: string;
}) {
  const styles = useStyles();
  return (
    <View style={styles.wrap} testID={testID}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={`${testID ?? "seg"}-${o.value}`}
            onPress={() => onChange(o.value)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  wrap: {
    flexDirection: "row",
    backgroundColor: c.surfaceTertiary,
    borderRadius: radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: c.border,
  },
  item: { flex: 1, paddingVertical: spacing.sm, alignItems: "center", borderRadius: radius.sm },
  itemActive: { backgroundColor: c.brandPrimary },
  label: { fontFamily: fonts.monoMedium, fontSize: 12, color: c.onSurfaceTertiary },
  labelActive: { color: c.onBrandPrimary, fontFamily: fonts.monoBold },
}));
