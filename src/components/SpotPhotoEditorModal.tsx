import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Image as RNImage,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { clamp, runOnJS, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImageManipulator from "expo-image-manipulator";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const OUTPUT_SIZE = 1080;

type Props = {
  visible: boolean;
  imageUri: string | null;
  imageWidth?: number;
  imageHeight?: number;
  onClose: () => void;
  onSave: (croppedFileUri: string) => Promise<void>;
};

function computeCropRect(
  viewport: number,
  iw: number,
  ih: number,
  zoom: number,
  panX: number,
  panY: number,
): { originX: number; originY: number; width: number; height: number } {
  const baseScale = Math.max(viewport / iw, viewport / ih);
  const s = baseScale * zoom;
  const w = iw * s;
  const h = ih * s;
  const left = viewport / 2 - w / 2 + panX;
  const top = viewport / 2 - h / 2 + panY;

  const ix0 = (0 - left) / w;
  const iy0 = (0 - top) / h;
  const ix1 = (viewport - left) / w;
  const iy1 = (viewport - top) / h;

  let ox = Math.floor(ix0 * iw);
  let oy = Math.floor(iy0 * ih);
  let cw = Math.ceil((ix1 - ix0) * iw);
  let ch = Math.ceil((iy1 - iy0) * ih);

  ox = Math.min(Math.max(ox, 0), Math.max(0, iw - 1));
  oy = Math.min(Math.max(oy, 0), Math.max(0, ih - 1));
  cw = Math.min(Math.max(cw, 1), iw - ox);
  ch = Math.min(Math.max(ch, 1), ih - oy);

  const side = Math.min(cw, ch);
  const cx = ox + cw / 2;
  const cy = oy + ch / 2;
  let fx = Math.floor(cx - side / 2);
  let fy = Math.floor(cy - side / 2);
  fx = Math.min(Math.max(fx, 0), iw - side);
  fy = Math.min(Math.max(fy, 0), ih - side);
  const finalSide = Math.min(side, iw - fx, ih - fy);

  return { originX: fx, originY: fy, width: finalSide, height: finalSide };
}

function loadNaturalImageSize(uri: string): Promise<{ width: number; height: number }> {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () =>
        resolve({
          width: img.naturalWidth || img.width || 1000,
          height: img.naturalHeight || img.height || 1000,
        });
      img.onerror = () => resolve({ width: 1000, height: 1000 });
      img.src = uri;
    });
  }
  return new Promise((resolve) => {
    RNImage.getSize(
      uri,
      (w, h) => resolve({ width: w, height: h }),
      () => resolve({ width: 1000, height: 1000 }),
    );
  });
}

export function SpotPhotoEditorModal({
  visible,
  imageUri,
  imageWidth = 0,
  imageHeight = 0,
  onClose,
  onSave,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const viewport = Math.min(360, Math.max(280, Math.min(winW, winH) * 0.78));

  const [resolvedW, setResolvedW] = useState(imageWidth);
  const [resolvedH, setResolvedH] = useState(imageHeight);
  const [busy, setBusy] = useState(false);

  const dimensionsReady = resolvedW > 0 && resolvedH > 0;
  const iw = dimensionsReady ? resolvedW : 1;
  const ih = dimensionsReady ? resolvedH : 1;

  const zoom = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const pinchStartZoom = useSharedValue(1);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  const baseScale = useMemo(() => Math.max(viewport / iw, viewport / ih), [viewport, iw, ih]);

  const latestRef = useRef({ zoom: 1, panX: 0, panY: 0 });

  const syncLatest = useCallback((z: number, px: number, py: number) => {
    latestRef.current = { zoom: z, panX: px, panY: py };
  }, []);

  const clampPanWorklet = useCallback(() => {
    "worklet";
    const s = baseScale * zoom.value;
    const w = iw * s;
    const h = ih * s;
    const minPX = viewport / 2 - w / 2;
    const maxPX = w / 2 - viewport / 2;
    const minPY = viewport / 2 - h / 2;
    const maxPY = h / 2 - viewport / 2;
    panX.value = clamp(panX.value, minPX, maxPX);
    panY.value = clamp(panY.value, minPY, maxPY);
    runOnJS(syncLatest)(zoom.value, panX.value, panY.value);
  }, [baseScale, ih, iw, panX, panY, syncLatest, viewport, zoom]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    let cancelled = false;

    if (imageWidth > 0 && imageHeight > 0) {
      setResolvedW(imageWidth);
      setResolvedH(imageHeight);
      return () => {
        cancelled = true;
      };
    }

    setResolvedW(0);
    setResolvedH(0);
    void loadNaturalImageSize(imageUri).then(({ width, height }) => {
      if (!cancelled) {
        setResolvedW(width > 0 ? width : 1000);
        setResolvedH(height > 0 ? height : 1000);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, imageUri, imageWidth, imageHeight]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
    pinchStartZoom.value = 1;
    panStartX.value = 0;
    panStartY.value = 0;
    latestRef.current = { zoom: 1, panX: 0, panY: 0 };
  }, [visible, imageUri, panStartX, panStartY, panX, panY, pinchStartZoom, zoom]);

  useEffect(() => {
    if (!visible || !dimensionsReady) return;
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
    pinchStartZoom.value = 1;
    latestRef.current = { zoom: 1, panX: 0, panY: 0 };
  }, [visible, dimensionsReady, resolvedW, resolvedH, panX, panY, pinchStartZoom, zoom]);

  const animatedImageBox = useAnimatedStyle(() => {
    const s = baseScale * zoom.value;
    const w = iw * s;
    const h = ih * s;
    return {
      position: "absolute" as const,
      width: w,
      height: h,
      left: viewport / 2 - w / 2 + panX.value,
      top: viewport / 2 - h / 2 + panY.value,
    };
  }, [baseScale, iw, ih, viewport]);

  const composedGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .onBegin(() => {
        panStartX.value = panX.value;
        panStartY.value = panY.value;
      })
      .onUpdate((e) => {
        panX.value = panStartX.value + e.translationX;
        panY.value = panStartY.value + e.translationY;
      })
      .onEnd(() => {
        clampPanWorklet();
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        pinchStartZoom.value = zoom.value;
      })
      .onUpdate((e) => {
        zoom.value = clamp(pinchStartZoom.value * e.scale, MIN_ZOOM, MAX_ZOOM);
      })
      .onEnd(() => {
        clampPanWorklet();
      });

    return Gesture.Simultaneous(pan, pinch);
  }, [clampPanWorklet, panStartX, panStartY, panX, panY, pinchStartZoom, zoom]);

  const bumpZoom = (delta: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((zoom.value + delta).toFixed(2))));
    zoom.value = next;
    clampPanWorklet();
  };

  const resetTransform = () => {
    zoom.value = 1;
    panX.value = 0;
    panY.value = 0;
    latestRef.current = { zoom: 1, panX: 0, panY: 0 };
  };

  const handleSave = async () => {
    if (!imageUri || busy || !dimensionsReady) return;
    const z = latestRef.current.zoom;
    const px = latestRef.current.panX;
    const py = latestRef.current.panY;
    setBusy(true);
    try {
      const { originX, originY, width, height } = computeCropRect(viewport, iw, ih, z, px, py);
      const manipulated = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          { crop: { originX, originY, width, height } },
          { resize: { width: OUTPUT_SIZE, height: OUTPUT_SIZE } },
        ],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
      );
      await onSave(manipulated.uri);
    } catch (e) {
      Alert.alert("Could not save photo", e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  };

  const handleUseOriginal = async () => {
    if (!imageUri || busy) return;
    setBusy(true);
    try {
      await onSave(imageUri);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "fullScreen" : undefined}
      onRequestClose={onClose}
    >
      <GestureHandlerRootView
        className="flex-1 bg-zinc-950"
        style={[
          { flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom },
          Platform.OS === "web" ? ({ minHeight: winH, width: "100%" } as ViewStyle) : undefined,
        ]}
      >
        <View className="flex-row items-center justify-between border-b border-zinc-800 px-4 py-3">
          <Pressable onPress={onClose} hitSlop={12} disabled={busy} className="flex-row items-center gap-1 py-2">
            <MaterialCommunityIcons name="close" size={22} color="#fafafa" />
            <Text className="text-base font-semibold text-white">Cancel</Text>
          </Pressable>
          <Text className="text-center text-base font-bold text-white">Adjust your spot</Text>
          <Pressable
            onPress={() => void handleSave()}
            disabled={busy || !dimensionsReady}
            className="min-w-[72px] flex-row items-center justify-end gap-1 py-2"
            hitSlop={12}
          >
            {busy ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <>
                <Text className="text-base font-bold text-amber">Save</Text>
                <MaterialCommunityIcons name="check" size={22} color="#f59e0b" />
              </>
            )}
          </Pressable>
        </View>

        <View className="flex-1 items-center justify-center px-4">
          <Text className="mb-4 text-center text-sm text-zinc-400">
            Pinch / use buttons to zoom · Drag to reposition
          </Text>

          {!dimensionsReady ? (
            <View
              style={{ width: viewport, height: viewport }}
              className="items-center justify-center rounded-3xl bg-zinc-900"
            >
              <ActivityIndicator color="#a1a1aa" />
            </View>
          ) : (
            <GestureDetector gesture={composedGesture}>
              <View
                style={{
                  width: viewport,
                  height: viewport,
                  borderRadius: 24,
                  overflow: "hidden",
                  backgroundColor: "#18181b",
                }}
              >
                <Animated.View style={animatedImageBox}>
                  <Image
                    source={{ uri: imageUri as string }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </Animated.View>
              </View>
            </GestureDetector>
          )}

          <View className="mt-5 flex-row items-center gap-3">
            <Pressable
              onPress={() => bumpZoom(-ZOOM_STEP)}
              disabled={busy || !dimensionsReady}
              className="h-11 w-11 items-center justify-center rounded-full bg-zinc-800"
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <MaterialCommunityIcons name="minus" size={22} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={resetTransform}
              disabled={busy || !dimensionsReady}
              className="h-11 px-4 items-center justify-center rounded-full bg-zinc-800"
              accessibilityRole="button"
              accessibilityLabel="Reset adjustments"
            >
              <Text className="text-sm font-semibold text-white">Reset</Text>
            </Pressable>
            <Pressable
              onPress={() => bumpZoom(ZOOM_STEP)}
              disabled={busy || !dimensionsReady}
              className="h-11 w-11 items-center justify-center rounded-full bg-zinc-800"
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <MaterialCommunityIcons name="plus" size={22} color="#ffffff" />
            </Pressable>
          </View>

          <Pressable
            onPress={() => void handleUseOriginal()}
            disabled={busy || !imageUri}
            className="mt-5 py-2"
            hitSlop={12}
          >
            <Text className="text-sm font-medium text-zinc-400 underline">Use original (no crop)</Text>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
