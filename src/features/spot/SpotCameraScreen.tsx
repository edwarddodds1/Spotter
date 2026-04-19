import { useRef, useState } from "react";
import { Alert, ImageBackground, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { formatGeocodedPlace } from "@/lib/spotLocationLabel";
import { useSpotterStore } from "@/store/useSpotterStore";
import type { TabParamList } from "@/core/navigation/types";

type Props = BottomTabScreenProps<TabParamList, "SpotTab">;

export function SpotCameraScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const setSpotDraft = useSpotterStore((state) => state.setSpotDraft);

  const capture = async () => {
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

      setSpotDraft({
        photoUri,
        locationLat: lat,
        locationLng: lng,
        locationLabel,
        coatColourId: null,
        coatColourNote: null,
        spotComment: null,
        isPrivate: false,
      });

      navigation.getParent()?.navigate("BreedSelector");
    } catch (error) {
      Alert.alert("Camera error", error instanceof Error ? error.message : "Could not capture the photo.");
    } finally {
      setIsCapturing(false);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-white dark:bg-ink" />;
  }

  if (!permission.granted) {
    return (
      <ImageBackground
        source={{ uri: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1000&q=80" }}
        className="flex-1 justify-end bg-white px-6 pb-20 dark:bg-ink"
      >
        <Text className="text-4xl font-bold text-white">Spot a dog</Text>
        <Text className="mt-3 text-base leading-6 text-white/85">
          Camera access powers the capture-first flow. On simulators or before permissions are granted, you can still continue using a sample image.
        </Text>
        <Pressable onPress={requestPermission} className="mt-6 rounded-2xl bg-amber px-4 py-4">
          <Text className="text-center font-semibold text-white">Grant camera access</Text>
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

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
        <View className="flex-1 justify-between bg-black/30 px-6 pb-12 pt-16">
          <View>
            <Text className="text-sm uppercase tracking-[1.5px] text-white/80">Spot</Text>
            <Text className="mt-2 text-3xl font-bold text-white">Frame the dog and capture</Text>
          </View>

          <View className="items-center">
            <Pressable
              onPress={capture}
              disabled={isCapturing}
              className="h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-amber"
            >
              <View className="h-16 w-16 rounded-full bg-white" />
            </Pressable>
            <Text className="mt-4 text-sm text-white/80">{isCapturing ? "Saving..." : "Tap to snap"}</Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}
