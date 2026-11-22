/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChunkCoord, GraphicsQuality } from '../../types/game';
import { CHUNK_SIZE, WorldCoordinates } from './WorldCoordinates';

export class LODManager {
  /**
   * Returns LOD level (0 = High detail, 1 = Medium, 2 = Low)
   */
  public static getLODLevel(
    playerCx: number,
    playerCz: number,
    chunkCx: number,
    chunkCz: number,
    quality: GraphicsQuality = 'medium'
  ): number {
    const dist = WorldCoordinates.chunkDistance(
      { cx: playerCx, cz: playerCz },
      { cx: chunkCx, cz: chunkCz }
    );

    if (dist <= 1) return 0; // immediate 3x3 surrounding
    if (dist <= 2) {
      return quality === 'ultra' ? 0 : 1;
    }
    return 2;
  }

  /**
   * Returns subdivision segments for terrain mesh based on LOD
   */
  public static getSegmentsForLOD(lod: number, quality: GraphicsQuality = 'medium'): number {
    if (lod === 0) {
      if (quality === 'ultra') return 48;
      if (quality === 'high') return 36;
      if (quality === 'medium') return 28;
      return 20; // low / mobile
    }
    if (lod === 1) return 16;
    return 8; // far horizon
  }

  /**
   * Active streaming radius (in chunks) based on graphics setting
   */
  public static getActiveRadius(quality: GraphicsQuality = 'medium'): number {
    switch (quality) {
      case 'low': return 1;    // 3x3 grid (768x768m)
      case 'medium': return 2; // 5x5 grid (1280x1280m)
      case 'high': return 3;   // 7x7 grid (1792x1792m)
      case 'ultra': return 4;  // 9x9 grid (2304x2304m)
    }
  }
}
