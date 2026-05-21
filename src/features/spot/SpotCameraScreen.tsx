import { useEffect, useRef, useState } from "react";
import { Alert, ImageBackground, Platform, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { SpotPhotoEditorModal } from "@/components/SpotPhotoEditorModal";
import { formatGeocodedPlace } from "@/lib/spotLocationLabel";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { TabParamList } from "@/core/navigation/types";

type PendingCapture = {
  photoUri: string;
  locationLat: number | null;
  locationLng: number | null;
  locationLabel: string | null;
};

type Props = BottomTabScreenProps<TabParamList, "SpotTab">;

const ZOOM_STEP = 0.05;
const ZOOM_MAX = 1;

export function SpotCameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [zoom, setZoom] = useState(0);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const captureRef = useRef<() => Promise<void>>(async () => {});
  const lastVolumeRef = useRef<number | null>(null);
  const volumeTriggerLockRef = useRef(false);
  const hasAutoRequestedRef = useRef(false);
  const setSpotDraft = useSpotterStore((state) => state.setSpotDraft);

  /**
   * Auto-prompt the OS for camera access the first time we land on this screen with an
   * undetermined permission state. The OS / browser persists the user's choice, so they
   * only see the dialog once. We only re-prompt automatically if the OS still allows asking.
   */
  useEffect(() => {
    if (!permission) return;
    if (permission.granted) return;
    if (hasAutoRequestedRef.current) return;
    if (permission.canAskAgain === false) return;
    hasAutoRequestedRef.current = true;
    void requestPermission();
  }, [permission, requestPermission]);

  const flipCamera = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  const adjustZoom = (delta: number) => {
    setZoom((current) => Math.min(ZOOM_MAX, Math.max(0, Number((current + delta).toFixed(2)))));
  };

  const capture = async () => {
    if (isCapturing) return;
    try {
      setIsCapturing(true);
      const [cameraResult, locationResult] = await Promise.all([
        cameraRef.current?.takePictureAsync({ quality: 0.7 }),
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null),
      ]);

      const photoUri =
        cameraResult?.uri ??
        "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1000&q=80";

      const lat = locationResult?.coords.latitude ?? null;
      const lng = locationResult?.coords.longitude ?? null;
      let locationLabel: string | null = null;
      if (lat != null && lng != null) {
        try {
          const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
          const line = places[0] ? formatGeocodedPlace(places[0]) : "";
          if (line) locationLabel = line;
        } catch {
          /* no network / platform geocoder */
        }
      }

      setPending({
        photoUri,
        locationLat: lat,
        locationLng: lng,
        locationLabel,
      });
    } catch (error) {
      Alert.alert("Camera error", error instanceof Error ? error.message : "Could not capture the photo.");
    } finally {
      setIsCapturing(false);
    }
  };

  const commitPending = (finalPhotoUri: string) => {
    if (!pending) return;
    setSpotDraft({
      photoUri: finalPhotoUri,
      locationLat: pending.locationLat,
      locationLng: pending.locationLng,
      locationLabel: pending.locationLabel,
      coatColourId: null,
      coatColourNote: null,
      spotComment: null,
      isPrivate: false,
    });
    setPending(null);
    navigation.getParent()?.navigate("BreedSelector");
  };
  captureRef.current = capture;

  useEffect(() => {
    if (Platform.OS === "web") return;

    let mounted = true;
    let sub: { remove: () => void } | null = null;

    (async () => {
      try {
        const volumeModule = await import("react-native-volume-manager");
        const { VolumeManager } = volumeModule;
        const initial = await VolumeManager.getVolume();
        if (mounted) {
          lastVolumeRef.current = initial.volume;
        }
        sub = VolumeManager.addVolumeListener(({ volume }) => {
          const prev = lastVolumeRef.current;
          lastVolumeRef.current = volume;
          if (prev == null) return;

          // Volume-down press lowers the level; trigger one capture per press.
          if (volume < prev && !volumeTriggerLockRef.current) {
            volumeTriggerLockRef.current = true;
            void captureRef.current();
            setTimeout(() => {
              volumeTriggerLockRef.current = false;
            }, 350);
          }
        });
      } catch {
        // Native volume hook unavailable (e.g. Expo Go); keep shutter button behavior.
      }
    })();

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);

  if (!permission) {
    return <View className="flex-1 bg-white dark:bg-ink" />;
  }

  /** Still waiting for the auto-prompt answer — show a clean loading state, not the gate. */
  if (!permission.granted && hasAutoRequestedRef.current && permission.canAskAgain) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    const isBlocked = permission.canAskAgain === false;
    return (
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1000&q=80" }}
        className="flex-1 justify-end bg-white px-6 pb-20 dark:bg-ink"
      >
        <Text className="text-4xl font-bold text-white">Spot a dog</Text>
        <Text className="mt-3 text-base leading-6 text-white/85">
          {isBlocked
            ? "Camera access is blocked. Enable it in your device or browser settings, then come back. You can still use a sample image for now."
            : "Camera access powers the capture-first flow. Allow access to start spotting, or use a sample image to explore."}
        </Text>
        <Pressable
          onPress={() => {
            hasAutoRequestedRef.current = true;
            void requestPermission();
          }}
          className="mt-6 rounded-2xl bg-amber px-4 py-4"
        >
          <Text className="text-center font-semibold text-white">
            {isBlocked ? "Try again" : "Grant camera access"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setSpotDraft({
              photoUri:
                "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=1000&q=80",
              locationLat: null,
              locationLng: null,
              locationLabel: null,
              coatColourId: null,
              coatColourNote: null,
              spotComment: null,
              isPrivate: false,
            });
            navigation.getParent()?.navigate("BreedSelector");
          }}
          className="mt-3 rounded-2xl border border-white/30 px-4 py-4"
        >
          <Text className="text-center font-semibold text-white">Use demo photo</Text>
        </Pressable>
      </ImageBackground>
    );
  }

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < ZOOM_MAX;
  const canZoomOut = zoom > 0;

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} zoom={zoom}>
        <View className="flex-1 justify-between bg-black/30 px-6 pb-12 pt-16">
          <View>
            <Text className="text-sm uppercase tracking-[1.5px] text-white/80">Spot</Text>
            <Text className="mt-2 text-3xl font-bold text-white">Frame the dog and capture</Text>
          </View>

          <View
            pointerEvents="box-none"
            className="absolute right-6 top-1/2 -translate-y-1/2 items-center gap-2"
          >
            <Pressable
              onPress={() => adjustZoom(ZOOM_STEP)}
              disabled={!canZoomIn}
              className={`h-11 w-11 items-center justify-center rounded-full bg-black/45 ${canZoomIn ? "" : "opacity-40"}`}
              accessibilityRole="button"
              accessibilityLabel="Zoom in"
            >
              <MaterialCommunityIcons name="plus" size={22} color="#ffffff" />
            </Pressable>
            <View className="rounded-full bg-black/45 px-2 py-1">
              <Text className="text-[11px] font-semibold text-white">{zoomPercent}%</Text>
            </View>
            <Pressable
              onPress={() => adjustZoom(-ZOOM_STEP)}
              disabled={!canZoomOut}
              className={`h-11 w-11 items-center justify-center rounded-full bg-black/45 ${canZoomOut ? "" : "opacity-40"}`}
              accessibilityRole="button"
              accessibilityLabel="Zoom out"
            >
              <MaterialCommunityIcons name="minus" size={22} color="#ffffff" />
            </Pressable>
          </View>

          <View className="items-center">
            <Pressable
              onPress={flipCamera}
              className="absolute bottom-2 left-0 h-11 w-11 items-center justify-center rounded-full bg-black/35"
              accessibilityRole="button"
              accessibilityLabel="Flip camera"
            >
              <MaterialCommunityIcons name="camera-flip-outline" size={20} color="#ffffff" />
            </Pressable>
            <Pressable
              onPress={capture}
              disabled={isCapturing}
              className="h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-amber"
            >
              <View className="h-16 w-16 rounded-full bg-white" />
            </Pressable>
            <Text className="mt-4 text-sm text-white/80">
              {isCapturing ? "Saving..." : Platform.OS === "web" ? "Tap to snap" : "Tap to snap or press volume down"}
            </Text>
          </View>
        </View>
      </CameraView>

      <SpotPhotoEditorModal
        visible={pending !== null}
        imageUri={pending?.photoUri ?? null}
        onClose={() => setPending(null)}
        onSave={async (uri) => {
          commitPending(uri);
        }}
      />
    </View>
  );
}
