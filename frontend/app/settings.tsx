import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Header } from "@/src/components/Header";
import { KHTScaleDetail } from "@/src/components/KHTScale";
import { fonts, makeStyles, radius, spacing } from "@/src/theme";

export default function Settings() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Header title="Settings" subtitle="Configuration & calibration" showBack />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.cardLabel}>DEFAULT TEST CONDITION</Text>
          <Row k="Temperature" v="320 °C" />
          <Row k="Duration" v="16 Hours" />
          <Row k="Air Flow" v="10 mL/min" />
          <Row k="Oil Flow" v="0.31 mL/min" last />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>AI VISION MODEL</Text>
          <Row k="Engine" v="KHT-AI-V2" />
          <Row k="Provider" v="Gemini 3.1 Pro Vision" />
          <Row k="Training set" v="8,450 images" />
          <Row k="Last Calibration" v="25 Jul 2026" last />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>KHT STANDARD RATING REFERENCE (KES)</Text>
          <View style={{ marginTop: spacing.sm }}>
            <KHTScaleDetail />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>ABOUT</Text>
          <Text style={styles.about}>
            KHT AI VISION rates carbon and lacquer deposits on Komatsu Hot Tube Tester glass tubes using an automated
            AI vision model, producing a 0–10 KHT rating and a full parameter report for each sample.
          </Text>
          <Text style={styles.copyright}>© 2026 KHT AI Vision System</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({ k, v, last }: { k: string; v: string; last?: boolean }) {
  const styles = useStyles();
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.k}>{k}</Text>
      <Text style={styles.v}>{v}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.lg,
  },
  cardLabel: { fontFamily: fonts.mono, fontSize: 11, color: c.brandPrimary, letterSpacing: 1.5, marginBottom: spacing.xs },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  k: { fontFamily: fonts.mono, fontSize: 13, color: c.onSurfaceTertiary },
  v: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface },
  about: { fontFamily: fonts.mono, fontSize: 12, color: c.onSurfaceSecondary, lineHeight: 20, marginTop: spacing.sm },
  copyright: { fontFamily: fonts.mono, fontSize: 10, color: c.muted, marginTop: spacing.md },
}));
