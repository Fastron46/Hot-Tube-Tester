import { Text, View } from "react-native";

import { Parameters } from "@/src/api";
import { fonts, makeStyles, spacing } from "@/src/theme";

type Row = { label: string; value: string };

export function paramRows(p: Parameters): Row[] {
  return [
    { label: "Deposit Area", value: `${p.deposit_area_pct.toFixed(1)} %` },
    { label: "Deposit Length", value: `${p.deposit_length_mm.toFixed(0)} mm` },
    { label: "Deposit Coverage", value: `${p.deposit_coverage_pct.toFixed(1)} %` },
    { label: "Average Intensity (L*)", value: p.avg_intensity_l.toFixed(1) },
    { label: "Average Color (a*)", value: p.avg_color_a.toFixed(1) },
    { label: "Average Color (b*)", value: p.avg_color_b.toFixed(1) },
    { label: "Max Intensity", value: p.max_intensity.toFixed(0) },
    { label: "Deposit Thickness Index", value: `${p.thickness_index_mm.toFixed(2)} mm` },
  ];
}

export function ParameterTable({ parameters }: { parameters: Parameters }) {
  const styles = useStyles();
  const rows = paramRows(parameters);
  return (
    <View testID="parameter-table">
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
          <Text style={styles.label}>{r.label}</Text>
          <Text style={styles.value}>{r.value}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  label: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurfaceTertiary },
  value: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onSurface },
}));
