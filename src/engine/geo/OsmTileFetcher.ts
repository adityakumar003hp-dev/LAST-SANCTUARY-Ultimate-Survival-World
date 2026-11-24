/**
 * Optional read-only OpenStreetMap Overpass sector metadata cache.
 * Offline-first: never blocks chunk streaming and silently degrades to
 * embedded RealEarthDataset + RealWorldCities data if offline or throttled.
 */

export interface OsmSectorSummary {
  key: string;
  lat: number;
  lon: number;
  roadCount: number;
  buildingCount: number;
  namedPlaces: string[];
  fetchedAt: number;
}

const MEMORY_CACHE = new Map<string, OsmSectorSummary>();
const IN_FLIGHT = new Set<string>();
const STORAGE_PREFIX = 'lsr_osm_sector_';

export class OsmTileFetcher {
  public static getCachedSector(lat: number, lon: number): OsmSectorSummary | null {
    const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const mem = MEMORY_CACHE.get(key);
    if (mem) return mem;

    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      if (raw) {
        const parsed = JSON.parse(raw) as OsmSectorSummary;
        MEMORY_CACHE.set(key, parsed);
        return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  }

  public static async prefetchSectorIfOnline(lat: number, lon: number): Promise<OsmSectorSummary | null> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    if (typeof fetch === 'undefined') return null;

    const key = `${lat.toFixed(2)}_${lon.toFixed(2)}`;
    const cached = OsmTileFetcher.getCachedSector(lat, lon);
    if (cached) return cached;
    if (IN_FLIGHT.has(key)) return null;

    IN_FLIGHT.add(key);
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 1800) : null;

    try {
      const d = 0.008;
      const query = `[out:json][timeout:2];(way["highway"](${(lat - d).toFixed(4)},${(lon - d).toFixed(4)},${(lat + d).toFixed(4)},${(lon + d).toFixed(4)});way["building"](${(lat - d).toFixed(4)},${(lon - d).toFixed(4)},${(lat + d).toFixed(4)},${(lon + d).toFixed(4)}););out tags 40;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query,
        signal: controller?.signal,
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { elements?: Array<{ tags?: Record<string, string> }> };
      const elements = Array.isArray(json?.elements) ? json.elements : [];
      let roadCount = 0;
      let buildingCount = 0;
      const places = new Set<string>();
      for (const el of elements) {
        if (el.tags?.highway) roadCount++;
        if (el.tags?.building) buildingCount++;
        if (el.tags?.name && places.size < 6) places.add(el.tags.name);
      }
      const summary: OsmSectorSummary = {
        key,
        lat,
        lon,
        roadCount,
        buildingCount,
        namedPlaces: Array.from(places),
        fetchedAt: Date.now(),
      };
      MEMORY_CACHE.set(key, summary);
      try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(summary));
      } catch {
        // ignore quota limits
      }
      return summary;
    } catch {
      return null;
    } finally {
      if (timeoutId !== null) clearTimeout(timeoutId);
      IN_FLIGHT.delete(key);
    }
  }
}
