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
