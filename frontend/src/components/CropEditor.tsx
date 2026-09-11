import { Image as ExpoImage } from "expo-image";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { Crop, X } from "phosphor-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image as RNImage,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const MIN = 48;
const HANDLE = 30;

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

type Rect = { x: number; y: number; w: number; h: number };

export function CropEditor({
  visible,
  uri,
  originalWidth,
  originalHeight,
  onCancel,
  onDone,
}: {
  visible: boolean;
  uri: string | null;
  originalWidth?: number;
  originalHeight?: number;
  onCancel: () => void;
  onDone: (uri: string) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [orig, setOrig] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null); // container area
  const [rect, setRect] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  const [busy, setBusy] = useState(false);

  const rectRef = useRef(rect);
  const startRef = useRef(rect);
  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  // resolve original image dimensions
  useEffect(() => {
    if (!visible || !uri) return;
    if (originalWidth && originalHeight) {
      setOrig({ w: originalWidth, h: originalHeight });
      return;
    }
    RNImage.getSize(
      uri,
      (w, h) => setOrig({ w, h }),
      () => setOrig({ w: 1000, h: 1000 }),
    );
  }, [visible, uri, originalWidth, originalHeight]);

  // displayed image size (contain) within box
  const disp = useMemo(() => {
    if (!orig || !box) return null;
    const ar = orig.w / orig.h;
    let dw = box.w;
    let dh = box.w / ar;
    if (dh > box.h) {
      dh = box.h;
      dw = box.h * ar;
    }
    return { w: dw, h: dh, offX: (box.w - dw) / 2, offY: (box.h - dh) / 2 };
  }, [orig, box]);

  // initialise crop rect to ~78% centered when display size known
  useEffect(() => {
    if (!disp) return;
    const w = disp.w * 0.78;
    const h = disp.h * 0.5;
    setRect({ x: (disp.w - w) / 2, y: (disp.h - h) / 2, w, h });
  }, [disp]);

  const responders = useMemo(() => {
    if (!disp) return null;
    const dw = disp.w;
    const dh = disp.h;
    const make = (mode: "move" | "tl" | "tr" | "bl" | "br") =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startRef.current = rectRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const s = startRef.current;
          let { x, y, w, h } = s;
          const dx = g.dx;
          const dy = g.dy;
          if (mode === "move") {
            x = clamp(s.x + dx, 0, dw - s.w);
            y = clamp(s.y + dy, 0, dh - s.h);
          } else if (mode === "tl") {
            x = clamp(s.x + dx, 0, s.x + s.w - MIN);
            y = clamp(s.y + dy, 0, s.y + s.h - MIN);
            w = s.w - (x - s.x);
            h = s.h - (y - s.y);
          } else if (mode === "tr") {
            y = clamp(s.y + dy, 0, s.y + s.h - MIN);
            w = clamp(s.w + dx, MIN, dw - s.x);
            h = s.h - (y - s.y);
          } else if (mode === "bl") {
            x = clamp(s.x + dx, 0, s.x + s.w - MIN);
            w = s.w - (x - s.x);
            h = clamp(s.h + dy, MIN, dh - s.y);
          } else {
            w = clamp(s.w + dx, MIN, dw - s.x);
            h = clamp(s.h + dy, MIN, dh - s.y);
          }
          setRect({ x, y, w, h });
        },
      });
    return {
      move: make("move"),
      tl: make("tl"),
      tr: make("tr"),
      bl: make("bl"),
      br: make("br"),
    };
  }, [disp]);

  const onBoxLayout = (e: LayoutChangeEvent) =>
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  async function applyCrop() {
    if (!disp || !orig || !uri) return;
    setBusy(true);
    try {
      const scale = orig.w / disp.w;
      const originX = clamp(Math.round(rect.x * scale), 0, orig.w - 1);
      const originY = clamp(Math.round(rect.y * scale), 0, orig.h - 1);
      const width = clamp(Math.round(rect.w * scale), 1, orig.w - originX);
      const height = clamp(Math.round(rect.h * scale), 1, orig.h - originY);
      const result = await manipulateAsync(uri, [{ crop: { originX, originY, width, height } }], {
        compress: 0.95,
        format: SaveFormat.JPEG,
      });
      onDone(result.uri);
    } catch {
      // fall back to original if crop fails
      onDone(uri);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.hBtn} onPress={onCancel} testID="crop-cancel">
            <X size={22} color={colors.onSurface} weight="bold" />
          </Pressable>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title}>Crop Sample Tube</Text>
            <Text style={styles.sub}>Frame only the tube · ignore glare & background</Text>
          </View>
          <View style={styles.hBtn} />
        </View>

        <View style={styles.body} onLayout={onBoxLayout}>
          {!disp || !responders ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : (
            <View style={{ width: disp.w, height: disp.h }}>
              {uri && <ExpoImage source={{ uri }} style={{ width: disp.w, height: disp.h }} contentFit="fill" />}

              {/* dim mask */}
              <View style={[styles.mask, { left: 0, top: 0, width: disp.w, height: rect.y }]} pointerEvents="none" />
              <View
                style={[styles.mask, { left: 0, top: rect.y + rect.h, width: disp.w, height: disp.h - rect.y - rect.h }]}
                pointerEvents="none"
              />
              <View style={[styles.mask, { left: 0, top: rect.y, width: rect.x, height: rect.h }]} pointerEvents="none" />
              <View
                style={[styles.mask, { left: rect.x + rect.w, top: rect.y, width: disp.w - rect.x - rect.w, height: rect.h }]}
                pointerEvents="none"
              />

              {/* crop frame (draggable) */}
              <View
                {...responders.move.panHandlers}
                style={[styles.frame, { left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderColor: colors.brandPrimary }]}
                testID="crop-frame"
              >
                <View style={[styles.gridV, { left: rect.w / 3 }]} />
                <View style={[styles.gridV, { left: (rect.w / 3) * 2 }]} />
                <View style={[styles.gridH, { top: rect.h / 3 }]} />
                <View style={[styles.gridH, { top: (rect.h / 3) * 2 }]} />
              </View>

              {/* corner handles */}
              <View
                {...responders.tl.panHandlers}
                style={[styles.handle, { left: rect.x - HANDLE / 2, top: rect.y - HANDLE / 2, borderColor: colors.brandPrimary }]}
                testID="crop-handle-tl"
              />
              <View
                {...responders.tr.panHandlers}
                style={[styles.handle, { left: rect.x + rect.w - HANDLE / 2, top: rect.y - HANDLE / 2, borderColor: colors.brandPrimary }]}
                testID="crop-handle-tr"
              />
              <View
                {...responders.bl.panHandlers}
                style={[styles.handle, { left: rect.x - HANDLE / 2, top: rect.y + rect.h - HANDLE / 2, borderColor: colors.brandPrimary }]}
                testID="crop-handle-bl"
              />
              <View
                {...responders.br.panHandlers}
                style={[styles.handle, { left: rect.x + rect.w - HANDLE / 2, top: rect.y + rect.h - HANDLE / 2, borderColor: colors.brandPrimary }]}
                testID="crop-handle-br"
              />
            </View>
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable style={styles.fullBtn} onPress={() => uri && onDone(uri)} testID="crop-use-full">
            <Text style={styles.fullText}>USE FULL IMAGE</Text>
          </Pressable>
          <Pressable style={styles.doneBtn} onPress={applyCrop} disabled={busy} testID="crop-done">
            {busy ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Crop size={18} color={colors.onBrandPrimary} weight="bold" />
                <Text style={styles.doneText}>USE CROP</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  hBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displaySemi, fontSize: 18, color: c.onSurface, letterSpacing: 0.5 },
  sub: { fontFamily: fonts.mono, fontSize: 10, color: c.brandPrimary, marginTop: 1 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg, backgroundColor: "#050B12" },
  mask: { position: "absolute", backgroundColor: "rgba(5,11,18,0.66)" },
  frame: { position: "absolute", borderWidth: 2, backgroundColor: "transparent" },
  gridV: { position: "absolute", top: 0, bottom: 0, width: 1, backgroundColor: "rgba(255,255,255,0.35)" },
  gridH: { position: "absolute", left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.35)" },
  handle: {
    position: "absolute",
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    borderWidth: 3,
    backgroundColor: "rgba(0,210,211,0.25)",
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.border,
    backgroundColor: c.surfaceSecondary,
  },
  fullBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  fullText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onSurface, letterSpacing: 1 },
  doneBtn: {
    flex: 1.4,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: c.brandPrimary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  doneText: { fontFamily: fonts.monoBold, fontSize: 14, color: c.onBrandPrimary, letterSpacing: 1 },
}));
