/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ChunkCoord, GraphicsQuality, HarvestableResource } from '../../types/game';
import { WorldCoordinates } from './WorldCoordinates';
import { ChunkGenerator, GeneratedChunk } from './ChunkGenerator';
import { LODManager } from './LODManager';
import { WorldPersistence } from './WorldPersistence';
import { TerrainGenerator } from './TerrainGenerator';
import { BiomeGenerator, BIOMES } from './BiomeGenerator';

export class ChunkManager {
  public scene: THREE.Scene;
  public worldSeed: number;
  public quality: GraphicsQuality;
  public persistence: WorldPersistence;

  public activeChunks: Map<string, GeneratedChunk> = new Map();
  public currentCenterCoord: ChunkCoord = { cx: 0, cz: 0 };
  private isUpdating: boolean = false;
  private lastCheckedPos: THREE.Vector3 = new THREE.Vector3(-99999, -99999, -99999);
  private frameThrottle: number = 0;
  private customRadius: number | null = null;

  constructor(
    scene: THREE.Scene,
    worldSeed: number = 42,
    quality: GraphicsQuality = 'medium',
    persistence: WorldPersistence
  ) {
    this.scene = scene;
    this.worldSeed = worldSeed;
    this.quality = quality;
    this.persistence = persistence;
  }

  public setStreamingRadius(radius: number | null) {
    this.customRadius = radius;
  }

  /**
   * Updates streaming around player position.
   * Loads newly entered chunks, unloads far chunks, and updates LODs.
   */
  public updatePlayerPosition(playerPos: THREE.Vector3, force: boolean = false) {
    if (this.isUpdating) return;

    if (!force) {
      this.frameThrottle++;
      if (this.frameThrottle % 6 !== 0) return;
      if (playerPos.distanceToSquared(this.lastCheckedPos) < 25) {
        return;
      }
    }
    this.lastCheckedPos.copy(playerPos);
    this.isUpdating = true;

    const playerCoord = WorldCoordinates.worldToChunk(playerPos.x, playerPos.z);
    this.persistence.markChunkDiscovered(playerCoord.cx, playerCoord.cz);

    const radius = this.customRadius ?? LODManager.getActiveRadius(this.quality);
    const requiredKeys = new Set<string>();
    const chunksToLoad: { coord: ChunkCoord; dist: number }[] = [];

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const cx = playerCoord.cx + dx;
        const cz = playerCoord.cz + dz;
        const key = WorldCoordinates.chunkKey(cx, cz);
        requiredKeys.add(key);

        if (!this.activeChunks.has(key)) {
          chunksToLoad.push({
            coord: { cx, cz },
            dist: Math.max(Math.abs(dx), Math.abs(dz)),
          });
        }
      }
    }

    // Unload chunks outside active streaming radius
    const toUnload: string[] = [];
    this.activeChunks.forEach((chunk, key) => {
      if (!requiredKeys.has(key)) {
        toUnload.push(key);
      }
    });

    for (let i = 0; i < toUnload.length; i++) {
      const key = toUnload[i];
      const chunk = this.activeChunks.get(key);
      if (chunk) {
        this.scene.remove(chunk.group);
        chunk.dispose();
        this.activeChunks.delete(key);
      }
    }

    // Sort chunks to load by distance so closest load first
    chunksToLoad.sort((a, b) => a.dist - b.dist);

    // Limit loads per tick (max 1 chunk per frame) to prevent micro-stutters
    const batchCount = Math.min(chunksToLoad.length, 1);
    for (let i = 0; i < batchCount; i++) {
      const { coord } = chunksToLoad[i];
      const key = WorldCoordinates.chunkKey(coord.cx, coord.cz);
      const lod = LODManager.getLODLevel(playerCoord.cx, playerCoord.cz, coord.cx, coord.cz, this.quality);

      const generated = ChunkGenerator.createChunk(
        coord,
        this.worldSeed,
        lod,
        this.quality,
        this.persistence.destroyedResourceIds,
        this.persistence.openedPoiIds
      );

      this.scene.add(generated.group);
      this.activeChunks.set(key, generated);
      this.persistence.markChunkDiscovered(coord.cx, coord.cz);
    }

    this.currentCenterCoord = playerCoord;
    this.isUpdating = false;
  }

  /**
   * Collects all active harvestable resources across all currently loaded chunks
   */
  public getAllActiveResources(): HarvestableResource[] {
    const list: HarvestableResource[] = [];
    this.activeChunks.forEach((chunk) => {
      list.push(...chunk.data.resources);
    });
    return list;
  }

  /**
   * Damages a resource and handles visual mesh removal & persistence
   */
  public damageResource(resourceId: string, damage: number): { health: number; yieldItem: string; yieldAmount: number } | null {
    for (const chunk of this.activeChunks.values()) {
      const res = chunk.data.resources.find((r) => r.id === resourceId);
      if (res) {
        res.health -= damage;
        const mesh = chunk.resourceMeshes.get(resourceId);

        if (mesh) {
          // Visual wobble impact
          mesh.rotation.z += 0.08;
          setTimeout(() => {
            if (mesh) mesh.rotation.z = 0;
          }, 80);
        }

        if (res.health <= 0) {
          if (mesh) {
            chunk.group.remove(mesh);
            chunk.resourceMeshes.delete(resourceId);
          }
          // Remove from chunk resources array
          chunk.data.resources = chunk.data.resources.filter((r) => r.id !== resourceId);
          // Persist destruction
          this.persistence.markResourceDestroyed(resourceId, res.position[0], res.position[2]);
        }

        return { health: res.health, yieldItem: res.yieldItem, yieldAmount: res.yieldAmount };
      }
    }
    return null;
  }

  /**
   * Returns current biome definition for player position
   */
  public getCurrentBiome(x: number, z: number) {
    return BiomeGenerator.getBiomeAt(x, z, this.worldSeed);
  }

  /**
   * Direct height query from continuous mathematical terrain generator
   */
  public getHeight(x: number, z: number): number {
    return TerrainGenerator.getHeight(x, z, this.worldSeed);
  }

  /**
   * Dispose all loaded chunks upon game reset/exit
   */
  public dispose() {
    this.activeChunks.forEach((chunk) => {
      this.scene.remove(chunk.group);
      chunk.dispose();
    });
    this.activeChunks.clear();
  }
}
