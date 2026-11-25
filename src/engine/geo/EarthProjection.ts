/**
 * WGS-84 & Web Mercator Geodesic Projection Utility
 * Converts between 3D world meters (x, z) and real Earth latitude / longitude,
 * slippy-map tile indices (z/x/y), and geodesic distances.
 */

export const EARTH_RADIUS_M = 6378137.0;
export const EARTH_CIRCUMFERENCE_M = 2 * Math.PI * EARTH_RADIUS_M;
export const METERS_PER_DEG_LAT = 111319.49079327358;
export const MAX_MERCATOR_LAT = 85.05112878;

export interface EarthOrigin {
  id: string;
  name: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
}

export interface LatLon {
  lat: number;
  lon: number;
}

export interface GeoTileCoord {
  zoom: number;
  tx: number;
  ty: number;
  key: string;
}

export const REAL_WORLD_START_REGIONS: readonly EarthOrigin[] = [
  {
    id: 'pacific_northwest',
    name: 'Columbia Valley — Oakridge Sector',
    country: 'United States',
    continent: 'North America',
    lat: 45.5152,
    lon: -122.6784,
  },
  {
    id: 'new_delhi',
    name: 'New Delhi — Yamuna Corridor',
    country: 'India',
    continent: 'Asia',
    lat: 28.6139,
    lon: 77.209,
  },
  {
    id: 'mumbai',
    name: 'Mumbai — Arabian Sea Coast',
    country: 'India',
    continent: 'Asia',
    lat: 19.076,
    lon: 72.8777,
  },
  {
    id: 'london',
    name: 'London — Thames Basin',
    country: 'United Kingdom',
    continent: 'Europe',
    lat: 51.5072,
    lon: -0.1276,
  },
  {
    id: 'new_york',
    name: 'New York — Hudson Estuary',
    country: 'United States',
    continent: 'North America',
    lat: 40.7128,
    lon: -74.006,
  },
  {
    id: 'tokyo',
    name: 'Tokyo — Kanto Plain',
    country: 'Japan',
    continent: 'Asia',
    lat: 35.6762,
    lon: 139.6503,
  },
  {
    id: 'cairo',
    name: 'Cairo — Nile Delta',
    country: 'Egypt',
    continent: 'Africa',
    lat: 30.0444,
    lon: 31.2357,
  },
  {
    id: 'rio',
    name: 'Rio de Janeiro — Guanabara Bay',
    country: 'Brazil',
    continent: 'South America',
    lat: -22.9068,
    lon: -43.1729,
  },
  {
    id: 'sydney',
    name: 'Sydney — Tasman Coast',
    country: 'Australia',
    continent: 'Australia & Oceania',
    lat: -33.8688,
    lon: 151.2093,
  },
  {
    id: 'jaipur',
    name: 'Jaipur — Aravalli Pink City',
    country: 'India',
    continent: 'Asia',
    lat: 26.9124,
    lon: 75.7873,
  },
  {
    id: 'dubai',
    name: 'Dubai — Arabian Gulf Coast',
    country: 'United Arab Emirates',
    continent: 'Asia',
    lat: 25.2048,
    lon: 55.2708,
  },
  {
    id: 'kathmandu',
    name: 'Kathmandu — Himalayan Foothills',
    country: 'Nepal',
    continent: 'Asia',
    lat: 27.7172,
    lon: 85.324,
  },
];

export const DEFAULT_EARTH_ORIGIN: EarthOrigin = REAL_WORLD_START_REGIONS[0];

export function normalizeLon(lon: number): number {
  let wrapped = ((lon + 180) % 360 + 360) % 360 - 180;
  if (wrapped === -180 && lon > 0) wrapped = 180;
  return wrapped;
}

export function clampLat(lat: number): number {
  return Math.max(-MAX_MERCATOR_LAT, Math.min(MAX_MERCATOR_LAT, lat));
}

export class EarthProjection {
  /**
   * Converts world meters (x = East+, z = South+) relative to origin (lat, lon)
   * into real-world WGS-84 coordinates.
   * Note: Three.js +X is East, -Z is North, +Z is South.
   */
  public static worldToLatLon(
    x: number,
    z: number,
    origin: { lat: number; lon: number } = DEFAULT_EARTH_ORIGIN
  ): LatLon {
    const dLat = -z / METERS_PER_DEG_LAT;
    const lat = clampLat(origin.lat + dLat);
    const cosLat = Math.max(0.12, Math.cos((lat * Math.PI) / 180));
    const dLon = x / (METERS_PER_DEG_LAT * cosLat);
    const lon = normalizeLon(origin.lon + dLon);
    return { lat, lon };
  }

  /**
   * Converts real-world WGS-84 (lat, lon) into local 3D world meters [x, z]
   * relative to the active Earth origin anchor.
   */
  public static latLonToWorld(
    lat: number,
    lon: number,
    origin: { lat: number; lon: number } = DEFAULT_EARTH_ORIGIN
  ): [number, number] {
    const clampedLat = clampLat(lat);
    const dLat = clampedLat - origin.lat;
    const z = -dLat * METERS_PER_DEG_LAT;

    let dLon = normalizeLon(lon - origin.lon);
    const midLatRad = (((clampedLat + origin.lat) * 0.5) * Math.PI) / 180;
    const cosLat = Math.max(0.12, Math.cos(midLatRad));
    const x = dLon * METERS_PER_DEG_LAT * cosLat;
    return [x, z];
  }

  /**
   * Standard OpenStreetMap / WMTS Slippy Map Tile coordinates (z/tx/ty)
   */
  public static latLonToSlippyTile(lat: number, lon: number, zoom: number = 14): GeoTileCoord {
    const clampedLat = clampLat(lat);
    const n = Math.pow(2, zoom);
    const tx = Math.max(0, Math.min(n - 1, Math.floor(((normalizeLon(lon) + 180) / 360) * n)));
    const latRad = (clampedLat * Math.PI) / 180;
    const ty = Math.max(
      0,
      Math.min(
        n - 1,
        Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
      )
    );
    return {
      zoom,
      tx,
      ty,
      key: `${zoom}/${tx}/${ty}`,
    };
  }

  /**
   * Converts Slippy Map Tile (z/tx/ty) center back to WGS-84 Lat/Lon
   */
  public static slippyTileCenterToLatLon(zoom: number, tx: number, ty: number): LatLon {
    const n = Math.pow(2, zoom);
    const lon = normalizeLon(((tx + 0.5) / n) * 360 - 180);
    const mercN = Math.PI - (2 * Math.PI * (ty + 0.5)) / n;
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(mercN) - Math.exp(-mercN)));
    return { lat, lon };
  }

  /**
   * SRTM / Copernicus DEM 1-degree x 1-degree tile identifier (e.g. N45W123)
   */
  public static getSrtmTileId(lat: number, lon: number): string {
    const latFloor = Math.floor(lat);
    const lonFloor = Math.floor(normalizeLon(lon));
    const latPrefix = latFloor >= 0 ? 'N' : 'S';
    const lonPrefix = lonFloor >= 0 ? 'E' : 'W';
    const latStr = Math.abs(latFloor).toString().padStart(2, '0');
    const lonStr = Math.abs(lonFloor).toString().padStart(3, '0');
    return `${latPrefix}${latStr}${lonPrefix}${lonStr}`;
  }

  /**
   * Great-circle distance in kilometers between two WGS-84 coordinates
   */
  public static haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = Math.PI / 180;
    const dLat = (lat2 - lat1) * toRad;
    const dLon = (lon2 - lon1) * toRad;
    const a =
      Math.sin(dLat * 0.5) * Math.sin(dLat * 0.5) +
      Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon * 0.5) * Math.sin(dLon * 0.5);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
    return (EARTH_RADIUS_M * c) / 1000;
  }

  /**
   * Human-readable formatted coordinates (e.g. "45.5152° N, 122.6784° W")
   */
  public static formatLatLon(lat: number, lon: number): string {
    const nLon = normalizeLon(lon);
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = nLon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(nLon).toFixed(4)}° ${lonDir}`;
  }
}
