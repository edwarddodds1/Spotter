import { Platform } from "react-native";
import * as Location from "expo-location";
import type { LocationGeocodedAddress } from "expo-location";

/** Build a short place line (city / area + country) from expo reverse-geocode. */
export function formatGeocodedPlace(a: LocationGeocodedAddress): string {
  const city = a.city || a.district || a.subregion || a.name;
  const region = a.region;
  const country = a.country;
  const parts: string[] = [];
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country && country !== parts[parts.length - 1]) parts.push(country);
  return parts.join(", ");
}

/**
 * BigDataCloud free reverse-geocoding response (no API key required for the
 * client endpoint). Only the fields we actually read are typed.
 */
type BigDataCloudResponse = {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  principalSubdivisionCode?: string;
  countryName?: string;
  countryCode?: string;
};

async function reverseGeocodeWeb(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as BigDataCloudResponse;
    const city = data.city || data.locality;
    const region = data.principalSubdivision;
    const country = data.countryName;
    const parts: string[] = [];
    if (city) parts.push(city);
    if (region && region !== city) parts.push(region);
    if (country && country !== parts[parts.length - 1]) parts.push(country);
    return parts.length ? parts.join(", ") : null;
  } catch {
    return null;
  }
}

/**
 * Cross-platform reverse geocoding. Uses expo-location on native (where the
 * OS provides it), and falls back to the BigDataCloud client API on web
 * because expo's reverseGeocodeAsync is a no-op in the browser.
 */
export async function reverseGeocodeForSpot(lat: number, lng: number): Promise<string | null> {
  if (Platform.OS === "web") {
    return reverseGeocodeWeb(lat, lng);
  }
  try {
    const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (places[0]) {
      const line = formatGeocodedPlace(places[0]);
      if (line) return line;
    }
  } catch {
    /* native geocoder failed; fall through to web fallback */
  }
  // Last-resort fallback so users still get a city even when the native
  // geocoder returns nothing (some Android devices without Google services).
  return reverseGeocodeWeb(lat, lng);
}
