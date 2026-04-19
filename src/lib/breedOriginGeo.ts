/**
 * Resolves breed `origin` strings to a rough country/region outline for map display.
 * Coordinates are simplified bounding polygons (not survey-accurate).
 */

export type OriginLatLng = { latitude: number; longitude: number };

export type OriginMapData = {
  /** Primary label shown if we cannot map (fallback). */
  displayLabel: string;
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  outline: OriginLatLng[];
};

const KEY = {
  AU: "AU",
  CA: "CA",
  GB: "GB",
  FR: "FR",
  DE: "DE",
  MT: "MT",
  CN: "CN",
  US: "US",
  MX: "MX",
  HR: "HR",
  JP: "JP",
  CH: "CH",
  ZA_WIDE: "ZA_WIDE",
  SIBERIA: "SIBERIA",
  MEDITERRANEAN: "MEDITERRANEAN",
  DE_PL: "DE_PL",
  HU: "HU",
  IT: "IT",
  IE: "IE",
} as const;

// Rough rectangles / quads per territory (clockwise)
const OUTLINES: Record<string, OriginLatLng[]> = {
  [KEY.AU]: [
    { latitude: -44, longitude: 112 },
    { latitude: -44, longitude: 154 },
    { latitude: -10, longitude: 154 },
    { latitude: -10, longitude: 112 },
  ],
  [KEY.CA]: [
    { latitude: 42, longitude: -141 },
    { latitude: 42, longitude: -52 },
    { latitude: 83, longitude: -52 },
    { latitude: 83, longitude: -141 },
  ],
  [KEY.GB]: [
    { latitude: 49.8, longitude: -8.6 },
    { latitude: 49.8, longitude: 2.1 },
    { latitude: 61, longitude: 2.1 },
    { latitude: 61, longitude: -8.6 },
  ],
  [KEY.FR]: [
    { latitude: 41.3, longitude: -5.2 },
    { latitude: 41.3, longitude: 9.6 },
    { latitude: 51.5, longitude: 9.6 },
    { latitude: 51.5, longitude: -5.2 },
  ],
  [KEY.DE]: [
    { latitude: 47.2, longitude: 5.8 },
    { latitude: 47.2, longitude: 15.1 },
    { latitude: 55.1, longitude: 15.1 },
    { latitude: 55.1, longitude: 5.8 },
  ],
  [KEY.MT]: [
    { latitude: 35.8, longitude: 14.2 },
    { latitude: 35.8, longitude: 14.6 },
    { latitude: 36.1, longitude: 14.6 },
    { latitude: 36.1, longitude: 14.2 },
  ],
  [KEY.CN]: [
    { latitude: 18, longitude: 73 },
    { latitude: 18, longitude: 135 },
    { latitude: 54, longitude: 135 },
    { latitude: 54, longitude: 73 },
  ],
  [KEY.US]: [
    { latitude: 24.5, longitude: -125 },
    { latitude: 24.5, longitude: -66 },
    { latitude: 49.5, longitude: -66 },
    { latitude: 49.5, longitude: -125 },
  ],
  [KEY.MX]: [
    { latitude: 14.5, longitude: -118 },
    { latitude: 14.5, longitude: -86 },
    { latitude: 32.8, longitude: -86 },
    { latitude: 32.8, longitude: -118 },
  ],
  [KEY.HR]: [
    { latitude: 42.2, longitude: 13.5 },
    { latitude: 42.2, longitude: 19.5 },
    { latitude: 46.6, longitude: 19.5 },
    { latitude: 46.6, longitude: 13.5 },
  ],
  [KEY.JP]: [
    { latitude: 24, longitude: 122 },
    { latitude: 24, longitude: 146 },
    { latitude: 46, longitude: 146 },
    { latitude: 46, longitude: 122 },
  ],
  [KEY.CH]: [
    { latitude: 45.8, longitude: 5.9 },
    { latitude: 45.8, longitude: 10.5 },
    { latitude: 47.8, longitude: 10.5 },
    { latitude: 47.8, longitude: 5.9 },
  ],
  [KEY.ZA_WIDE]: [
    { latitude: -35, longitude: 16 },
    { latitude: -35, longitude: 33 },
    { latitude: -22, longitude: 33 },
    { latitude: -22, longitude: 16 },
  ],
  [KEY.SIBERIA]: [
    { latitude: 50, longitude: 60 },
    { latitude: 50, longitude: 180 },
    { latitude: 75, longitude: 180 },
    { latitude: 75, longitude: 60 },
  ],
  [KEY.MEDITERRANEAN]: [
    { latitude: 30, longitude: -6 },
    { latitude: 30, longitude: 36 },
    { latitude: 46, longitude: 36 },
    { latitude: 46, longitude: -6 },
  ],
  [KEY.DE_PL]: [
    { latitude: 47, longitude: 5 },
    { latitude: 47, longitude: 24.5 },
    { latitude: 55.5, longitude: 24.5 },
    { latitude: 55.5, longitude: 5 },
  ],
  [KEY.HU]: [
    { latitude: 45.7, longitude: 16.1 },
    { latitude: 45.7, longitude: 22.9 },
    { latitude: 48.6, longitude: 22.9 },
    { latitude: 48.6, longitude: 16.1 },
  ],
  [KEY.IT]: [
    { latitude: 36.6, longitude: 6.6 },
    { latitude: 36.6, longitude: 18.5 },
    { latitude: 47.1, longitude: 18.5 },
    { latitude: 47.1, longitude: 6.6 },
  ],
  [KEY.IE]: [
    { latitude: 51.2, longitude: -10.5 },
    { latitude: 51.2, longitude: -5.9 },
    { latitude: 55.4, longitude: -5.9 },
    { latitude: 55.4, longitude: -10.5 },
  ],
};

/** Padded bounds for schematic map projection (aligned with web SVG padding). */
export function getPaddedOutlineBounds(outline: OriginLatLng[]) {
  const lats = outline.map((p) => p.latitude);
  const lons = outline.map((p) => p.longitude);
  let minLat = Math.min(...lats);
  let maxLat = Math.max(...lats);
  let minLon = Math.min(...lons);
  let maxLon = Math.max(...lons);
  const dLat = Math.max(maxLat - minLat, 0.35);
  const dLon = Math.max(maxLon - minLon, 0.35);
  const pad = 0.14;
  minLat -= dLat * pad;
  maxLat += dLat * pad;
  minLon -= dLon * pad;
  maxLon += dLon * pad;
  return {
    minLat,
    maxLat,
    minLon,
    maxLon,
    spanLat: maxLat - minLat,
    spanLon: maxLon - minLon,
  };
}

export function projectLatLngToSvg(
  bounds: ReturnType<typeof getPaddedOutlineBounds>,
  lat: number,
  lng: number,
  vbW: number,
  vbH: number,
) {
  const x = ((lng - bounds.minLon) / bounds.spanLon) * vbW;
  const y = ((bounds.maxLat - lat) / bounds.spanLat) * vbH;
  return { x, y };
}

/**
 * Plate carrée (equirectangular) projection in WGS84 — same frame Natural Earth / our land GeoJSON uses,
 * so outlines align with the vector land layer (not an arbitrary raster crop).
 */
export const WORLD_MAP_BOUNDS = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

/** ViewBox aspect 2:1 — matches standard equirectangular world maps. */
export const WORLD_MAP_VIEWBOX = { w: 360, h: 180 } as const;

export function projectLatLngToWorldSvg(lat: number, lng: number, vbW: number, vbH: number) {
  const b = WORLD_MAP_BOUNDS;
  const x = ((lng - b.minLon) / (b.maxLon - b.minLon)) * vbW;
  const y = ((b.maxLat - lat) / (b.maxLat - b.minLat)) * vbH;
  return { x, y };
}

export function outlineToWorldPolygonPoints(outline: OriginLatLng[], vbW: number, vbH: number) {
  return outline
    .map((p) => {
      const { x, y } = projectLatLngToWorldSvg(p.latitude, p.longitude, vbW, vbH);
      return `${x},${y}`;
    })
    .join(" ");
}

/** Ring radius in viewBox units for accent circle around origin. */
export function originHighlightRingRadiusVb(
  region: OriginMapData["region"],
  vbW: number,
  vbH: number,
) {
  const b = WORLD_MAP_BOUNDS;
  const spanLat = b.maxLat - b.minLat;
  const spanLon = b.maxLon - b.minLon;
  const rLat = ((region.latitudeDelta / 2) / spanLat) * vbH;
  const rLon = ((region.longitudeDelta / 2) / spanLon) * vbW;
  const raw = Math.max(rLat, rLon) * 1.2;
  return Math.max(1.6, Math.min(raw, 28));
}

/** Native map circle radius: ~20% of lat span, clamped for tiny vs huge regions. */
export function originHighlightRadiusMeters(latitudeDelta: number): number {
  const latM = Math.max(latitudeDelta * 111_000, 8_000);
  return Math.max(18_000, Math.min(latM * 0.2, 850_000));
}

function regionFromOutline(outline: OriginLatLng[], pad = 1.25): OriginMapData["region"] {
  const lats = outline.map((p) => p.latitude);
  const lngs = outline.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latD = Math.max((maxLat - minLat) * pad, 0.8);
  const lngD = Math.max((maxLng - minLng) * pad, 0.8);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latD,
    longitudeDelta: lngD,
  };
}

function firstSegment(origin: string): string {
  return origin.split("/")[0].split(",")[0].trim();
}

/**
 * Map free-text origin to internal territory key.
 */
export function resolveOriginTerritoryKey(origin: string): string | null {
  const o = origin.toLowerCase().trim();

  if (o.includes("united kingdom") || o === "england" || o === "scotland" || o === "wales") return KEY.GB;
  if (o.includes("ireland") && !o.includes("northern")) return KEY.IE;
  if (o.includes("egypt") && o.includes("united kingdom")) return KEY.GB;
  if (o.includes("southern africa")) return KEY.ZA_WIDE;
  if (o.includes("siberia")) return KEY.SIBERIA;
  if (o.includes("mediterranean")) return KEY.MEDITERRANEAN;
  if (o.includes("germany/poland") || (o.includes("germany") && o.includes("poland"))) return KEY.DE_PL;

  const head = firstSegment(origin).toLowerCase();

  const direct: Record<string, string> = {
    australia: KEY.AU,
    canada: KEY.CA,
    france: KEY.FR,
    germany: KEY.DE,
    malta: KEY.MT,
    china: KEY.CN,
    "united states": KEY.US,
    mexico: KEY.MX,
    croatia: KEY.HR,
    japan: KEY.JP,
    switzerland: KEY.CH,
    hungary: KEY.HU,
    italy: KEY.IT,
    ireland: KEY.IE,
    england: KEY.GB,
    scotland: KEY.GB,
    wales: KEY.GB,
  };

  return direct[head] ?? null;
}

export function getOriginMapData(origin: string): OriginMapData | null {
  const displayLabel = firstSegment(origin);
  const key = resolveOriginTerritoryKey(origin);
  if (!key || !OUTLINES[key]) return null;

  const outline = OUTLINES[key];
  return {
    displayLabel,
    region: regionFromOutline(outline),
    outline,
  };
}
