/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BiomeGenerator } from './BiomeGenerator';

export class TerrainGenerator {
  /**
   * Deterministic continuous height function across the unlimited 2D open world plane.
   * Produces smooth, continuous heights with zero seams across arbitrary chunk boundaries.
   */
  public static getHeight(x: number, z: number, seed: number = 42): number {
    // 1. Sanctuary clearing at (0, 0): level plateau covering the full town and starter compound (80m radius)
    const distFromOrigin = Math.hypot(x, z);
    const clearingFactor = Math.min(1.0, Math.max(0.0, (distFromOrigin - 80) / 40));

    // 2. Sample biome characteristics
    const biome = BiomeGenerator.getBiomeAt(x, z, seed);
    const elevMult = biome.elevationMultiplier;

    // 3. Multi-octave continuous fractal noise
    // Octave 1: Macro continental swells (frequency: ~0.002)
    const o1 = Math.sin((x + seed * 13.7) * 0.0025) * Math.cos((z + seed * 7.1) * 0.0025) * 16.0;

    // Octave 2: Regional hills & ridges (frequency: ~0.01)
    const o2 = Math.sin((x * 0.012) + (z * 0.008) + seed) * 7.0;

    // Octave 3: Local slope & knolls (frequency: ~0.035)
    const o3 = Math.sin((x * 0.035) - (z * 0.028)) * 2.5;

    // Octave 4: Surface micro-roughness (frequency: ~0.09)
    const o4 = Math.sin((x * 0.09) + (z * 0.075)) * (0.8 * biome.roughness);

    // Combine base terrain height
    let height = (o1 + o2 + o3 + o4) * elevMult * clearingFactor;

    // 4. Mountain range peak sharpening (power curve for rugged jagged peaks)
    if (biome.id === 'mountain_range' || biome.id === 'snow_peaks') {
      const ridgeNoise = Math.abs(Math.sin(x * 0.008 + z * 0.006));
      height += (Math.pow(ridgeNoise, 1.8) * 28.0) * clearingFactor;
    } else if (biome.id === 'rocky_canyon') {
      // Stepped terraced canyon layers
      const canyonCut = Math.sin(x * 0.015 + z * 0.012);
      const terrace = Math.floor(canyonCut * 4.0) * 3.5;
      height += terrace * clearingFactor;
    } else if (biome.id === 'sand_dunes') {
      // Smooth transverse sand dune ripples
      const duneWave = Math.sin(x * 0.02 + Math.cos(z * 0.01) * 1.5) * 6.5;
      height += duneWave * clearingFactor;
    } else if (biome.id === 'glacier_field') {
      // Broad glacial ice shelf plateau with crevasses
      const crevasse = Math.abs(Math.sin(x * 0.025 + z * 0.015));
      height += (18.0 - (crevasse < 0.1 ? 12.0 : 0)) * clearingFactor;
    } else if (biome.id === 'waterfall_valley') {
      // Basin with dramatic rim cliffs
      const basinDist = Math.hypot(x % 600 - 300, z % 600 - 300);
      if (basinDist < 140) {
        height -= Math.cos((basinDist / 140) * Math.PI * 0.5) * 12.0;
      }
    } else if (biome.id === 'dinosaur_valley') {
      // Sunken primeval amphitheater bordered by crags
      const caldera = Math.sin(x * 0.007) * Math.cos(z * 0.007);
      height += (caldera * 6.0 + 3.0) * clearingFactor;
    }

    // 5. River tributary carving
    // Continuous river path snaking across the world outside the settlement
    const riverWave = Math.sin(z * 0.004) * 45;
    const riverDist = Math.abs(x - 50 - riverWave);
    if (riverDist < 18) {
      const riverDepth = Math.cos((riverDist / 18) * Math.PI * 0.5) * 4.2;
      height -= riverDepth * clearingFactor;
    }

    // 6. Lake basin depression
    if (biome.id === 'lake_district' || biome.id === 'waterfall_valley') {
      const lakeDist = Math.hypot(x % 800 - 400, z % 800 - 400);
      if (lakeDist < 120) {
        height -= Math.cos((lakeDist / 120) * Math.PI * 0.5) * 5.5;
      }
    }

    // 7. Coastline shelf & Deep Swamp
    if (biome.id === 'coastline' || biome.id === 'island' || biome.id === 'coral_coast') {
      height = Math.max(-4.0, Math.min(height, 2.5));
    } else if (biome.id === 'deep_swamp') {
      height = Math.max(-0.6, Math.min(height, 1.8));
    }

    return height;
  }

  /**
   * Calculates surface normal at (x, z) using finite differences
   */
  public static getNormal(x: number, z: number, seed: number = 42): THREE.Vector3 {
    const eps = 0.5;
    const hL = this.getHeight(x - eps, z, seed);
    const hR = this.getHeight(x + eps, z, seed);
    const hD = this.getHeight(x, z - eps, seed);
    const hU = this.getHeight(x, z + eps, seed);

    const normal = new THREE.Vector3(hL - hR, 2 * eps, hD - hU);
    return normal.normalize();
  }
}
