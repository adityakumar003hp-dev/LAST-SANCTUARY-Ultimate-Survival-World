/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChunkCoord } from '../../types/game';
import {
  DEFAULT_EARTH_ORIGIN,
  EarthOrigin,
  EarthProjection,
  GeoTileCoord,
  LatLon,
} from '../geo/EarthProjection';

export const CHUNK_SIZE = 256; // 256 x 256 real-world meters per chunk

let activeEarthOrigin: EarthOrigin = DEFAULT_EARTH_ORIGIN;

export class WorldCoordinates {
  public static setWorldOrigin(origin: EarthOrigin): void {
    activeEarthOrigin = origin;
  }

  public static getWorldOrigin(): EarthOrigin {
    return activeEarthOrigin;
  }

  /**
   * Converts world coordinates (x, z) to chunk coordinate (cx, cz)
   */
  public static worldToChunk(x: number, z: number): ChunkCoord {
    return {
      cx: Math.floor(x / CHUNK_SIZE),
      cz: Math.floor(z / CHUNK_SIZE),
    };
  }

  /**
   * Converts world meters (x, z) to WGS-84 (lat, lon) using active Earth origin
   */
  public static worldToLatLon(x: number, z: number): LatLon {
    return EarthProjection.worldToLatLon(x, z, activeEarthOrigin);
  }

  /**
   * Converts WGS-84 (lat, lon) to world meters [x, z] using active Earth origin
   */
  public static latLonToWorld(lat: number, lon: number): [number, number] {
    return EarthProjection.latLonToWorld(lat, lon, activeEarthOrigin);
  }

  /**
   * Returns OSM/WMTS slippy-map tile coordinates for world (x, z)
   */
  public static worldToGeoTile(x: number, z: number, zoom: number = 14): GeoTileCoord {
    const { lat, lon } = WorldCoordinates.worldToLatLon(x, z);
    return EarthProjection.latLonToSlippyTile(lat, lon, zoom);
  }

  /**
   * Returns SRTM 1x1 degree tile identifier for world (x, z)
   */
  public static worldToSrtmTile(x: number, z: number): string {
    const { lat, lon } = WorldCoordinates.worldToLatLon(x, z);
    return EarthProjection.getSrtmTileId(lat, lon);
  }

  /**
   * Returns world origin coordinates [minX, minZ] for a given chunk
   */
  public static chunkToWorldOrigin(cx: number, cz: number): [number, number] {
    return [cx * CHUNK_SIZE, cz * CHUNK_SIZE];
  }

  /**
   * Returns center coordinates [centerX, centerZ] for a given chunk
   */
  public static chunkToWorldCenter(cx: number, cz: number): [number, number] {
    return [(cx + 0.5) * CHUNK_SIZE, (cz + 0.5) * CHUNK_SIZE];
  }

  /**
   * Converts world coordinate to relative position [0..CHUNK_SIZE] inside chunk
   */
  public static worldToLocalChunk(x: number, z: number): [number, number] {
    const cx = Math.floor(x / CHUNK_SIZE);
    const cz = Math.floor(z / CHUNK_SIZE);
    return [x - cx * CHUNK_SIZE, z - cz * CHUNK_SIZE];
  }

  /**
   * Unique string key for chunk caching and lookup
   */
  public static chunkKey(cx: number, cz: number): string {
    return `${cx}_${cz}`;
  }

  /**
   * Parse chunk key back to { cx, cz }
   */
  public static parseChunkKey(key: string): ChunkCoord {
    const parts = key.split('_');
    return {
      cx: parseInt(parts[0], 10),
      cz: parseInt(parts[1], 10),
    };
  }

  /**
   * Chebyshev distance in chunk grid units
   */
  public static chunkDistance(c1: ChunkCoord, c2: ChunkCoord): number {
    return Math.max(Math.abs(c1.cx - c2.cx), Math.abs(c1.cz - c2.cz));
  }
}
