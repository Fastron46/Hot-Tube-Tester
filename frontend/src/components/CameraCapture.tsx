import { CameraView, useCameraPermissions } from "expo-camera";
import { ArrowsClockwise, Lightning, LightningSlash, X } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Linking, Modal, PanResponder, Pressable, Text, View } from "react-native";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type CapturedAsset = { uri: string; width?: number; height?: number };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export function CameraCapture({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (asset: CapturedAsset) => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [zoom, setZoom] = useState(0);
  const [busy, setBusy] = useState(false);
  const zoomRef = useRef(0);
  const baseZoom = useRef(0);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const setZ = (v: number) => {
    zoomRef.current = v;
    setZoom(v);
  };

  const onPinch = (e: { nativeEvent: { scale: number } }) => {
    const scale = e.nativeEvent.scale;
    setZ(clamp(baseZoom.current + (scale - 1) * 0.35, 0, 1));
  };
  const onPinchState = (e: { nativeEvent: { state: number } }) => {
    if (e.nativeEvent.state === State.BEGAN) baseZoom.current = zoomRef.current;
    if (e.nativeEvent.state === State.END || e.nativeEvent.state === State.CANCELLED) {
      baseZoom.current = zoomRef.current;
    }
  };

  // simple double-tap-free step zoom buttons fallback (also drives the bar)
  const barResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: () => false,
    }),
  ).current;

  async function capture() {
    if (!cameraRef.current || busy) return;
    setBusy(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (photo?.uri) onCapture({ uri: photo.uri, width: photo.width, height: photo.height });
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  const denied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.screen}>
        {!permission ? (
          <View style={styles.centerMsg}>
            <Text style={styles.msg}>Preparing camera…</Text>
          </View>
        ) : !permission.granted ? (
          <View style={[styles.centerMsg, { paddingTop: insets.top }]}>
            <Text style={styles.msgTitle}>Camera access needed</Text>
            <Text style={styles.msg}>Allow camera to capture hot tube photos for AI rating.</Text>
            {denied ? (
              <Pressable style={styles.permBtn} onPress={() => Linking.openSettings?.()} testID="camera-open-settings">
                <Text style={styles.permBtnText}>OPEN SETTINGS</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.permBtn} onPress={() => requestPermission()} testID="camera-allow">
                <Text style={styles.permBtnText}>ALLOW CAMERA</Text>
              </Pressable>
            )}
            <Pressable style={styles.permCancel} onPress={onClose} testID="camera-close-perm">
              <Text style={styles.permCancelText}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <PinchGestureHandler onGestureEvent={onPinch} onHandlerStateChange={onPinchState}>
              <View style={styles.cameraWrap}>
                <CameraView ref={cameraRef} style={styles.camera} facing={facing} zoom={zoom} flash={flash} />
              </View>
            </PinchGestureHandler>

            {/* top bar */}
            <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
              <Pressable style={styles.circleBtn} onPress={onClose} testID="camera-close">
                <X size={22} color="#FFFFFF" weight="bold" />
              </Pressable>
              <View style={styles.hint}>
                <Text style={styles.hintText}>Pinch to zoom · frame the tube</Text>
              </View>
              <Pressable
                style={styles.circleBtn}
                onPress={() => setFlash((f) => (f === "off" ? "on" : "off"))}
                testID="camera-flash"
              >
                {flash === "off" ? (
                  <LightningSlash size={20} color="#FFFFFF" />
                ) : (
                  <Lightning size={20} color={colors.brandSecondary} weight="fill" />
                )}
              </Pressable>
            </View>

            {/* zoom control */}
            <View style={styles.zoomRow} {...barResponder.panHandlers}>
              <Pressable style={styles.zoomStep} onPress={() => setZ(clamp(zoomRef.current - 0.1, 0, 1))} testID="zoom-out">
                <Text style={styles.zoomStepText}>−</Text>
              </Pressable>
              <View style={styles.zoomTrack}>
                <View style={[styles.zoomFill, { width: `${zoom * 100}%` }]} />
                <Text style={styles.zoomLabel}>{(1 + zoom * 4).toFixed(1)}x</Text>
              </View>
              <Pressable style={styles.zoomStep} onPress={() => setZ(clamp(zoomRef.current + 0.1, 0, 1))} testID="zoom-in">
                <Text style={styles.zoomStepText}>+</Text>
              </Pressable>
            </View>

            {/* bottom controls */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
              <View style={styles.sideSlot} />
              <Pressable style={styles.shutter} onPress={capture} disabled={busy} testID="camera-shutter">
                <View style={[styles.shutterInner, busy && { opacity: 0.4 }]} />
              </Pressable>
              <View style={styles.sideSlot}>
                <Pressable
                  style={styles.circleBtn}
                  onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
                  testID="camera-flip"
                >
                  <ArrowsClockwise size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const useStyles = makeStyles((c) => ({
  screen: { flex: 1, backgroundColor: "#000000" },
  cameraWrap: { flex: 1 },
  camera: { flex: 1 },
  centerMsg: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md, backgroundColor: c.surface },
  msgTitle: { fontFamily: fonts.displaySemi, fontSize: 20, color: c.onSurface },
  msg: { fontFamily: fonts.mono, fontSize: 13, color: c.muted, textAlign: "center" },
  permBtn: { backgroundColor: c.brandPrimary, paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: radius.md, marginTop: spacing.md },
  permBtnText: { fontFamily: fonts.monoBold, fontSize: 13, color: c.onBrandPrimary, letterSpacing: 1 },
  permCancel: { paddingVertical: spacing.md },
  permCancelText: { fontFamily: fonts.mono, fontSize: 12, color: c.muted },

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: { backgroundColor: "rgba(0,0,0,0.45)", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  hintText: { fontFamily: fonts.mono, fontSize: 10, color: "#FFFFFF", letterSpacing: 0.5 },

  zoomRow: {
    position: "absolute",
    bottom: 150,
    left: spacing.xl,
    right: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  zoomStep: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomStepText: { fontFamily: fonts.displaySemi, fontSize: 24, color: "#FFFFFF", lineHeight: 26 },
  zoomTrack: {
    flex: 1,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    overflow: "hidden",
  },
  zoomFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(0,210,211,0.4)" },
  zoomLabel: { alignSelf: "center", fontFamily: fonts.monoBold, fontSize: 12, color: "#FFFFFF" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sideSlot: { width: 60, alignItems: "center" },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#FFFFFF" },
}));
