/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BiomeType, HarvestableResource } from '../../types/game';
import { TerrainGenerator } from './TerrainGenerator';
import { RoadGenerator } from './RoadGenerator';
import { RailwayNetworkGenerator } from './RailwayNetworkGenerator';
import { isProtectedSpawnZone } from './ProtectedSpawnZones';
import {
  buildRealisticTree,
  buildRealisticRock,
  buildRealisticBerryBush,
  buildRealisticScrapWreck,
} from '../rendering/RealisticFloraBuilder';

export class VegetationGenerator {
  /**
   * Generates harvestable resources for a given chunk
   */
  public static generateResourcesForChunk(
    cx: number,
    cz: number,
    biome: BiomeType,
    worldSeed: number = 42
  ): HarvestableResource[] {
    const resources: HarvestableResource[] = [];
    const minX = cx * 256;
    const minZ = cz * 256;

    // Deterministic pseudo-random based on chunk coordinates
    let s = (cx * 73856093) ^ (cz * 19349663) ^ worldSeed;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return Math.abs(s / 4294967296);
    };

    // Calculate count based on biome
    let treeCount = Math.floor(25 + rnd() * 30);
    let rockCount = Math.floor(15 + rnd() * 20);
    let scrapCount = Math.floor(10 + rnd() * 15);
    let berryCount = Math.floor(6 + rnd() * 10);

    if (biome === 'dense_forest') {
      treeCount = Math.floor(65 + rnd() * 25);
    } else if (biome === 'desert') {
      treeCount = Math.floor(2 + rnd() * 4);
      rockCount = Math.floor(35 + rnd() * 20);
    } else if (biome === 'mountain_range' || biome === 'snow_peaks') {
      rockCount = Math.floor(55 + rnd() * 25);
      treeCount = Math.floor(15 + rnd() * 15);
    } else if (biome === 'industrial_zone' || biome === 'abandoned_city') {
      scrapCount = Math.floor(40 + rnd() * 20);
      treeCount = Math.floor(6 + rnd() * 8);
    } else if (biome === 'tropical_jungle' || biome === 'ancient_forest' || biome === 'bamboo_forest') {
      treeCount = Math.floor(70 + rnd() * 28);
      berryCount = Math.floor(14 + rnd() * 14);
    } else if (biome === 'taiga') {
      treeCount = Math.floor(42 + rnd() * 24);
    } else if (biome === 'savannah') {
      treeCount = Math.floor(8 + rnd() * 8);
      berryCount = Math.floor(4 + rnd() * 6);
    } else if (biome === 'tundra' || biome === 'volcanic_wastes' || biome === 'badlands' || biome === 'coral_coast') {
      treeCount = Math.floor(1 + rnd() * 5);
      rockCount = Math.floor(38 + rnd() * 28);
    } else if (biome === 'mangrove_delta') {
      treeCount = Math.floor(30 + rnd() * 18);
      berryCount = Math.floor(10 + rnd() * 10);
    } else if (biome === 'alpine_meadow') {
      treeCount = Math.floor(10 + rnd() * 12);
      rockCount = Math.floor(35 + rnd() * 20);
    } else if (biome === 'crystal_cavern') {
      treeCount = 0;
      rockCount = Math.floor(55 + rnd() * 30);
      berryCount = 0;
    } else if (biome === 'dinosaur_valley') {
      treeCount = Math.floor(60 + rnd() * 30);
      rockCount = Math.floor(25 + rnd() * 15);
      berryCount = Math.floor(15 + rnd() * 12);
    } else if (biome === 'waterfall_valley') {
      treeCount = Math.floor(55 + rnd() * 25);
      rockCount = Math.floor(30 + rnd() * 20);
      berryCount = Math.floor(18 + rnd() * 12);
    } else if (biome === 'deep_swamp') {
      treeCount = Math.floor(50 + rnd() * 20);
      rockCount = Math.floor(10 + rnd() * 10);
      berryCount = Math.floor(16 + rnd() * 10);
    } else if (biome === 'rocky_canyon' || biome === 'ashlands') {
      treeCount = Math.floor(3 + rnd() * 6);
      rockCount = Math.floor(65 + rnd() * 35);
      scrapCount = Math.floor(15 + rnd() * 15);
    } else if (biome === 'sand_dunes' || biome === 'glacier_field') {
      treeCount = Math.floor(1 + rnd() * 3);
      rockCount = Math.floor(20 + rnd() * 15);
      berryCount = 0;
    }

    let idCounter = 1;

    // Helper to add resource safely avoiding roads & riverbeds
    const tryAddResource = (
      type: HarvestableResource['type'],
      yieldItem: string,
      yieldAmount: number,
      reqTool: HarvestableResource['requiredTool']
    ) => {
      const rx = minX + 12 + rnd() * 232;
      const rz = minZ + 12 + rnd() * 232;

      // Railway right-of-way is kept completely clear: no trees, rocks, scrap or bushes.
      if (RailwayNetworkGenerator.isProtectedRailwayZone(rx, rz)) return;
      // No procedural vegetation/resources inside either story-authored compound.
      if (isProtectedSpawnZone(rx, rz)) return;

      // Don't place on roads
      if (RoadGenerator.isRoad(rx, rz).isRoad) return;

      // Don't place underwater in river
      const riverDist = Math.abs(rx - 50 - Math.sin(rz * 0.004) * 45);
      if (riverDist < 14) return;

      // Don't place inside Starter Sanctuary clearing at (0, 0)
      if (cx === 0 && cz === 0 && Math.hypot(rx, rz) < 26) return;

      const y = TerrainGenerator.getHeight(rx, rz, worldSeed);

      resources.push({
        id: `c_${cx}_${cz}_${type}_${idCounter++}`,
        type,
        position: [rx, y, rz],
        health: type === 'tree' ? 100 : type === 'rock' ? 120 : type === 'metal_scrap' ? 80 : 40,
        maxHealth: type === 'tree' ? 100 : type === 'rock' ? 120 : type === 'metal_scrap' ? 80 : 40,
        yieldItem,
        yieldAmount,
        requiredTool: reqTool,
      });
    };

    // 1. Trees
    for (let i = 0; i < treeCount; i++) {
      tryAddResource('tree', 'wood', 4, 'axe');
    }

    // 2. Granite Rocks
    for (let i = 0; i < rockCount; i++) {
      tryAddResource('rock', 'stone', 3, 'pickaxe');
    }

    // 3. Scrap Metal
    for (let i = 0; i < scrapCount; i++) {
      tryAddResource('metal_scrap', 'metal_scrap', 3, 'pickaxe');
    }

    // 4. Berry Bushes
    for (let i = 0; i < berryCount; i++) {
      tryAddResource('berry_bush', 'wild_berries', 3, 'none');
    }

    return resources;
  }

  /**
   * Instantiates the organic displaced PBR 3D model for a harvestable resource
   */
  public static createResourceMesh(res: HarvestableResource, biomeId?: string): THREE.Group {
    const seed = Math.abs(Math.round(res.position[0] * 13 + res.position[2] * 29));
    let group: THREE.Group;

    if (res.type === 'tree') {
      group = buildRealisticTree(biomeId, seed);
      const scale = 0.88 + ((seed % 7) * 0.05);
      group.scale.setScalar(scale);
    } else if (res.type === 'rock') {
      group = buildRealisticRock();
      const scale = 0.85 + ((seed % 6) * 0.06);
      group.scale.setScalar(scale);
    } else if (res.type === 'metal_scrap') {
      group = buildRealisticScrapWreck();
    } else if (res.type === 'berry_bush') {
      group = buildRealisticBerryBush();
    } else {
      group = new THREE.Group();
    }

    group.name = res.id;
    group.position.set(res.position[0], res.position[1], res.position[2]);
    group.rotation.y = (seed % 360) * (Math.PI / 180);
    return group;
  }
}
