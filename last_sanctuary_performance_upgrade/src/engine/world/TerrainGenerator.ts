/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BiomeGenerator } from './BiomeGenerator';
import { WorldCoordinates } from './WorldCoordinates';
import { RealEarthDataset, EarthGeoSample } from '../geo/RealEarthDataset';
import { isProtectedSpawnZone } from './ProtectedSpawnZones';

export class TerrainGenerator {
  /**
   * Samples full real-Earth geospatial metadata at world position (x, z).
   */
  public static getEarthInfo(x: number, z: number): EarthGeoSample {
    const { lat, lon } = WorldCoordinates.worldToLatLon(x, z);
    return RealEarthDataset.sampleEarthGeography(lat, lon);
  }

  /**
   * Deterministic continuous height function across the Earth-scale open world.
   * Blends authentic continental/oceanic elevation with smooth FBM local detail while
   * keeping Oakridge Town, Sanctuary Compound, Outpost 7, and Railway stations level.
   */
  public static getHeight(x: number, z: number, seed: number = 42): number {
    // 1. Sanctuary clearing at (0, 0) & protected story premises stay level and walkable
    const distFromOrigin = Math.hypot(x, z);
    const clearingFactor = Math.min(1.0, Math.max(0.0, (distFromOrigin - 80) / 40));

    // Keep Outpost 7 military starter compound at (954, 22) stable
    const distFromMilitary = Math.hypot(x - 954, z - 22);
    const militaryFlatten = Math.min(1.0, Math.max(0.0, (distFromMilitary - 45) / 35));

    // 2. Sample Earth GIS geography & biome characteristics
    const earth = TerrainGenerator.getEarthInfo(x, z);
    const biome = BiomeGenerator.getBiomeAt(x, z, seed);
    const elevMult = biome.elevationMultiplier;

    // 3. Multi-octave continuous fractal noise for local micro-relief
    const o1 = Math.sin((x + seed * 13.7) * 0.0025) * Math.cos((z + seed * 7.1) * 0.0025) * 9.5;
    const o2 = Math.sin((x * 0.012) + (z * 0.008) + seed) * 4.5;
    const o3 = Math.sin((x * 0.035) - (z * 0.028)) * 1.9;
    const o4 = Math.sin((x * 0.09) + (z * 0.075)) * (0.65 * biome.roughness);

    const earthMacroBlend = Math.min(1.0, Math.max(0.0, (distFromOrigin - 150) / 160));
    let height =
      (o1 + o2 + o3 + o4) * elevMult * clearingFactor +
      earth.gameTerrainY * earthMacroBlend;

    // 4. Biome geomorphology refinements
    if (biome.id === 'mountain_range' || biome.id === 'snow_peaks') {
      const ridgeNoise = Math.abs(Math.sin(x * 0.008 + z * 0.006));
      height += Math.pow(ridgeNoise, 1.8) * 18.0 * clearingFactor;
    } else if (biome.id === 'rocky_canyon') {
      const canyonCut = Math.sin(x * 0.015 + z * 0.012);
      const terrace = Math.floor(canyonCut * 4.0) * 3.0;
      height += terrace * clearingFactor;
    } else if (biome.id === 'sand_dunes') {
      const duneWave = Math.sin(x * 0.02 + Math.cos(z * 0.01) * 1.5) * 5.2;
      height += duneWave * clearingFactor;
    } else if (biome.id === 'glacier_field') {
      const crevasse = Math.abs(Math.sin(x * 0.025 + z * 0.015));
      height += (12.0 - (crevasse < 0.1 ? 9.0 : 0)) * clearingFactor;
    } else if (biome.id === 'waterfall_valley') {
      const basinDist = Math.hypot((x % 600) - 300, (z % 600) - 300);
      if (basinDist < 140) {
        height -= Math.cos((basinDist / 140) * Math.PI * 0.5) * 10.0;
      }
    } else if (biome.id === 'dinosaur_valley') {
      const caldera = Math.sin(x * 0.007) * Math.cos(z * 0.007);
      height += (caldera * 6.0 + 3.0) * clearingFactor;
    }

    // 5. Local starter river tributary carving near Oakridge
    const riverWave = Math.sin(z * 0.004) * 45;
    const riverDist = Math.abs(x - 50 - riverWave);
    if (riverDist < 18) {
      const riverDepth = Math.cos((riverDist / 18) * Math.PI * 0.5) * 4.2;
      height -= riverDepth * clearingFactor;
    }

    // 6. Lake basin depression
    if (biome.id === 'lake_district' || biome.id === 'waterfall_valley') {
      const lakeDist = Math.hypot((x % 800) - 400, (z % 800) - 400);
      if (lakeDist < 120) {
        height -= Math.cos((lakeDist / 120) * Math.PI * 0.5) * 5.0;
      }
    }

    // 7. Coastline shelf & Deep Swamp
    if (!earth.isLand) {
      height = Math.min(height, -0.8);
    } else if (biome.id === 'coastline' || biome.id === 'island' || biome.id === 'coral_coast') {
      height = Math.max(-4.0, Math.min(height, 2.8));
    } else if (biome.id === 'deep_swamp') {
      height = Math.max(-0.6, Math.min(height, 1.8));
    }

    // Smooth rectangular clearing blend for the expanded 5x Compound and Oakridge Town
    const compoundEdgeDist = Math.max(
      -110 - x, x - (-6),
      -39 - z, z - 91,
      0
    );
    const townEdgeDist = Math.max(
      -50 - x, x - 48,
      -68 - z, z - 60,
      0
    );
    const urbanClearBlend = Math.min(1.0, Math.min(compoundEdgeDist, townEdgeDist) / 16);

    if (isProtectedSpawnZone(x, z)) {
      return 0;
    }
    return height * (0.2 + 0.8 * militaryFlatten) * urbanClearBlend;
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
