/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChunkCoord } from '../../types/game';

export const CHUNK_SIZE = 256; // 256 x 256 world units per chunk

export class WorldCoordinates {
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
