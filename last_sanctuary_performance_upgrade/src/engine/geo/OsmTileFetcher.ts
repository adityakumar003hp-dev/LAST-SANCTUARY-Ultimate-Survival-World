/**
 * Real OpenStreetMap Overpass Vector Geometry & Sector Cache.
 *
 * Streams live building footprints, street polylines, waterways, and parks using Overpass `out body geom;`,
 * caches parsed geometry in memory + bounded localStorage LRU, and notifies ChunkManager on arrival.
 * Gracefully degrades to offline regional procedural city/town reconstruction if offline or throttled.
 */

export interface OsmBuildingFootprint {
  id: number;
  name?: string;
  kind: string;
  amenity?: string;
  shop?: string;
  levels: number;
  heightM: number;
  centerLat: number;
  centerLon: number;
  /** Simplified outer polygon ring in [lat, lon] order */
  polygon: Array<[number, number]>;
}

export interface OsmRoadWay {
  id: number;
  name?: string;
  highway: string;
  widthM: number;
  points: Array<[number, number]>;
}

export interface OsmGreenArea {
  id: number;
  name?: string;
  kind: 'park' | 'water';
  centerLat: number;
  centerLon: number;
  radiusM: number;
}

export interface OsmSectorSummary {
  key: string;
  lat: number;
  lon: number;
  roadCount: number;
  buildingCount: number;
  namedPlaces: string[];
  buildings: OsmBuildingFootprint[];
  roads: OsmRoadWay[];
  greens: OsmGreenArea[];
  isGeometryReady: boolean;
  fetchedAt: number;
}

type OverpassElement = {
  id: number;
  type: string;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
};

const MEMORY_CACHE = new Map<string, OsmSectorSummary>();
const IN_FLIGHT = new Set<string>();
const FAILED_RETRY_AFTER = new Map<string, number>();
const LISTENERS = new Set<(sector: OsmSectorSummary) => void>();

const STORAGE_PREFIX = 'lsr_osm_geom_v2_';
const STORAGE_INDEX_KEY = 'lsr_osm_geom_index_v2';
const MAX_LOCAL_STORAGE_SECTORS = 10;
const SECTOR_STEP_DEG = 0.01; // ~1.11km sector grid aligned with toFixed(2)

const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

function sectorKey(lat: number, lon: number): { key: string; sLat: number; sLon: number } {
  const sLat = Math.round(lat / SECTOR_STEP_DEG) * SECTOR_STEP_DEG;
  const sLon = Math.round(lon / SECTOR_STEP_DEG) * SECTOR_STEP_DEG;
  return {
    key: `${sLat.toFixed(2)}_${sLon.toFixed(2)}`,
    sLat,
    sLon,
  };
}

function estimateRoadWidth(highway: string): number {
  switch (highway) {
    case 'motorway':
    case 'trunk':
      return 11.5;
    case 'primary':
      return 9.0;
    case 'secondary':
      return 7.6;
    case 'tertiary':
      return 6.4;
    case 'residential':
    case 'unclassified':
      return 5.4;
    case 'pedestrian':
    case 'living_street':
      return 4.2;
    default:
      return 3.8;
  }
}

function parseLevels(tags: Record<string, string>): { levels: number; heightM: number } {
  const rawH = parseFloat(tags.height || '');
  const rawL = parseInt(tags['building:levels'] || '', 10);
  if (Number.isFinite(rawH) && rawH >= 2.5 && rawH <= 260) {
    const levels = Math.max(1, Math.min(60, Math.round(rawH / 3.4)));
    return { levels, heightM: rawH };
  }
  if (Number.isFinite(rawL) && rawL >= 1 && rawL <= 60) {
    return { levels: rawL, heightM: rawL * 3.4 };
  }
  const b = (tags.building || '').toLowerCase();
  if (b === 'house' || b === 'detached' || b === 'bungalow' || b === 'cabin') {
    return { levels: 1, heightM: 4.2 };
  }
  if (b === 'apartments' || b === 'residential' || b === 'hotel') {
    return { levels: 4, heightM: 13.6 };
  }
  if (b === 'commercial' || b === 'office') {
    return { levels: 5, heightM: 17.5 };
  }
  if (b === 'hospital' || b === 'university') {
    return { levels: 4, heightM: 15.0 };
  }
  if (b === 'industrial' || b === 'warehouse') {
    return { levels: 2, heightM: 7.5 };
  }
  return { levels: 2, heightM: 7.2 };
}

function simplifyPolyline(pts: Array<{ lat: number; lon: number }>, maxPts: number): Array<[number, number]> {
  if (pts.length <= maxPts) {
    return pts.map((p) => [Number(p.lat.toFixed(5)), Number(p.lon.toFixed(5))]);
  }
  const out: Array<[number, number]> = [];
  const step = (pts.length - 1) / (maxPts - 1);
  for (let i = 0; i < maxPts; i++) {
    const p = pts[Math.min(pts.length - 1, Math.round(i * step))];
    out.push([Number(p.lat.toFixed(5)), Number(p.lon.toFixed(5))]);
  }
  return out;
}

function saveSectorToStorage(sector: OsmSectorSummary): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const rawIdx = localStorage.getItem(STORAGE_INDEX_KEY);
    const index: string[] = rawIdx ? JSON.parse(rawIdx) : [];
    const filtered = index.filter((k) => k !== sector.key);
    filtered.push(sector.key);
    while (filtered.length > MAX_LOCAL_STORAGE_SECTORS) {
      const oldest = filtered.shift();
      if (oldest) localStorage.removeItem(STORAGE_PREFIX + oldest);
    }
    localStorage.setItem(STORAGE_PREFIX + sector.key, JSON.stringify(sector));
    localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(filtered));
  } catch {
    // Ignore storage quota issues cleanly
  }
}

export class OsmTileFetcher {
  public static onSectorReady(listener: (sector: OsmSectorSummary) => void): () => void {
    LISTENERS.add(listener);
    return () => {
      LISTENERS.delete(listener);
    };
  }

  public static getCachedSector(lat: number, lon: number): OsmSectorSummary | null {
    const { key } = sectorKey(lat, lon);
    const mem = MEMORY_CACHE.get(key);
    if (mem) return mem;

    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        if (raw) {
          const parsed = JSON.parse(raw) as OsmSectorSummary;
          if (parsed && Array.isArray(parsed.buildings) && Array.isArray(parsed.roads)) {
            MEMORY_CACHE.set(key, parsed);
            return parsed;
          }
        }
      }
    } catch {
      // ignore storage corruption
    }
    return null;
  }

  /**
   * Queries all cached OSM sectors intersecting or bordering a target [lat, lon] window.
   */
  public static getCachedGeometryNear(lat: number, lon: number): {
    buildings: OsmBuildingFootprint[];
    roads: OsmRoadWay[];
    greens: OsmGreenArea[];
    namedPlaces: string[];
  } {
    const buildings: OsmBuildingFootprint[] = [];
    const roads: OsmRoadWay[] = [];
    const greens: OsmGreenArea[] = [];
    const names = new Set<string>();
    const seenBuildings = new Set<number>();
    const seenRoads = new Set<number>();

    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        const sector = OsmTileFetcher.getCachedSector(
          lat + dLat * SECTOR_STEP_DEG,
          lon + dLon * SECTOR_STEP_DEG
        );
        if (!sector || !sector.isGeometryReady) continue;
        for (const b of sector.buildings) {
          if (!seenBuildings.has(b.id)) {
            seenBuildings.add(b.id);
            buildings.push(b);
          }
        }
        for (const r of sector.roads) {
          if (!seenRoads.has(r.id)) {
            seenRoads.add(r.id);
            roads.push(r);
          }
        }
        for (const g of sector.greens) {
          greens.push(g);
        }
        for (const np of sector.namedPlaces) {
          if (names.size < 16) names.add(np);
        }
      }
    }

    return {
      buildings,
      roads,
      greens,
      namedPlaces: Array.from(names),
    };
  }

  public static async prefetchSectorIfOnline(lat: number, lon: number): Promise<OsmSectorSummary | null> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    if (typeof fetch === 'undefined') return null;

    const { key, sLat, sLon } = sectorKey(lat, lon);
    const cached = OsmTileFetcher.getCachedSector(sLat, sLon);
    if (cached) return cached;
    if (IN_FLIGHT.has(key)) return null;

    const retryAt = FAILED_RETRY_AFTER.get(key);
    if (retryAt && Date.now() < retryAt) return null;

    IN_FLIGHT.add(key);

    try {
      const halfSpan = 0.0052; // ~580m half-extent covering full sector with smooth overlap
      const south = (sLat - halfSpan).toFixed(5);
      const west = (sLon - halfSpan).toFixed(5);
      const north = (sLat + halfSpan).toFixed(5);
      const east = (sLon + halfSpan).toFixed(5);
      const bbox = `${south},${west},${north},${east}`;

      const query = `[out:json][timeout:4];(way["building"](${bbox});way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|unclassified|service|pedestrian)$"](${bbox});way["leisure"="park"](${bbox});way["waterway"](${bbox}););out body geom 260;`;

      let elements: OverpassElement[] | null = null;
      for (const endpoint of OVERPASS_MIRRORS) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 3600) : null;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: query,
            signal: controller?.signal,
          });
          if (!res.ok) continue;
          const json = (await res.json()) as { elements?: OverpassElement[] };
          if (Array.isArray(json?.elements)) {
            elements = json.elements;
            break;
          }
        } catch {
          // Try next Overpass mirror
        } finally {
          if (timeoutId !== null) clearTimeout(timeoutId);
        }
      }

      if (!elements) {
        FAILED_RETRY_AFTER.set(key, Date.now() + 90_000);
        return null;
      }

      const buildings: OsmBuildingFootprint[] = [];
      const roads: OsmRoadWay[] = [];
      const greens: OsmGreenArea[] = [];
      const places = new Set<string>();

      for (const el of elements) {
        const tags = el.tags;
        const geom = el.geometry;
        if (!tags || !Array.isArray(geom) || geom.length < 2) continue;

        if (tags.name && places.size < 12) {
          places.add(tags.name);
        }

        if (tags.building && geom.length >= 3 && buildings.length < 140) {
          const poly = simplifyPolyline(geom, 10);
          let sumLat = 0;
          let sumLon = 0;
          for (let i = 0; i < poly.length; i++) {
            sumLat += poly[i][0];
            sumLon += poly[i][1];
          }
          const { levels, heightM } = parseLevels(tags);
          buildings.push({
            id: el.id,
            name: tags.name,
            kind: tags.building,
            amenity: tags.amenity,
            shop: tags.shop,
            levels,
            heightM,
            centerLat: sumLat / poly.length,
            centerLon: sumLon / poly.length,
            polygon: poly,
          });
        } else if (tags.highway && roads.length < 95) {
          roads.push({
            id: el.id,
            name: tags.name,
            highway: tags.highway,
            widthM: estimateRoadWidth(tags.highway),
            points: simplifyPolyline(geom, 14),
          });
        } else if ((tags.leisure === 'park' || tags.waterway) && greens.length < 25) {
          let sumLat = 0;
          let sumLon = 0;
          for (let i = 0; i < geom.length; i++) {
            sumLat += geom[i].lat;
            sumLon += geom[i].lon;
          }
          greens.push({
            id: el.id,
            name: tags.name,
            kind: tags.waterway ? 'water' : 'park',
            centerLat: sumLat / geom.length,
            centerLon: sumLon / geom.length,
            radiusM: tags.waterway ? 14 : 28,
          });
        }
      }

      const summary: OsmSectorSummary = {
        key,
        lat: sLat,
        lon: sLon,
        roadCount: roads.length,
        buildingCount: buildings.length,
        namedPlaces: Array.from(places),
        buildings,
        roads,
        greens,
        isGeometryReady: true,
        fetchedAt: Date.now(),
      };

      MEMORY_CACHE.set(key, summary);
      if (MEMORY_CACHE.size > 48) {
        const firstKey = MEMORY_CACHE.keys().next().value;
        if (firstKey) MEMORY_CACHE.delete(firstKey);
      }
      saveSectorToStorage(summary);

      LISTENERS.forEach((cb) => {
        try {
          cb(summary);
        } catch {
          // isolate callback failures
        }
      });

      return summary;
    } catch {
      FAILED_RETRY_AFTER.set(key, Date.now() + 90_000);
      return null;
    } finally {
      IN_FLIGHT.delete(key);
    }
  }
}
