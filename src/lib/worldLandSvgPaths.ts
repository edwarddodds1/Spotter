/**
 * Land silhouettes from Natural Earth 110m (public domain), bundled as GeoJSON.
 * Projected with the same equirectangular math as `projectLatLngToWorldSvg` in breedOriginGeo.
 */
import ne110Land from "../../assets/ne_110m_land.json";

import { projectLatLngToWorldSvg, WORLD_MAP_VIEWBOX } from "@/lib/breedOriginGeo";

type LngLat = [number, number];

function ringToD(ring: LngLat[], vbW: number, vbH: number): string {
  if (ring.length === 0) return "";
  const pts =
    ring.length > 2 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return pts
    .map((ll, i) => {
      const [lng, lat] = ll;
      const { x, y } = projectLatLngToWorldSvg(lat, lng, vbW, vbH);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ") + " Z";
}

function polygonRingsToD(rings: LngLat[][], vbW: number, vbH: number): string {
  return rings.map((r) => ringToD(r, vbW, vbH)).join(" ");
}

const vbW = WORLD_MAP_VIEWBOX.w;
const vbH = WORLD_MAP_VIEWBOX.h;

function pathsFromGeometry(geom: {
  type: string;
  coordinates: unknown;
}): string[] {
  if (geom.type === "Polygon") {
    return [polygonRingsToD(geom.coordinates as LngLat[][], vbW, vbH)];
  }
  if (geom.type === "MultiPolygon") {
    return (geom.coordinates as LngLat[][][]).map((poly) => polygonRingsToD(poly, vbW, vbH));
  }
  return [];
}

const fc = ne110Land as { features?: { geometry: { type: string; coordinates: unknown } }[] };

export const WORLD_LAND_PATH_DS: string[] = [];
for (const f of fc.features ?? []) {
  WORLD_LAND_PATH_DS.push(...pathsFromGeometry(f.geometry));
}
