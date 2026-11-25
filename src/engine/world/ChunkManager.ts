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
import { BiomeGenerator } from './BiomeGenerator';
import { TerrainWorkerClient } from '../geo/TerrainWorkerClient';
import { OsmTileFetcher } from '../geo/OsmTileFetcher';
import { EnterableBuildingDef } from './RealEarthBuildings';

export class ChunkManager {
  private static readonly _frustum = new THREE.Frustum();
  private static readonly _projScreenMatrix = new THREE.Matrix4();
  private static readonly _chunkBox = new THREE.Box3();
  private static readonly _chunkMin = new THREE.Vector3();
  private static readonly _chunkMax = new THREE.Vector3();

  public scene: THREE.Scene;
  public worldSeed: number;
  public quality: GraphicsQuality;
  public persistence: WorldPersistence;

  public activeChunks: Map<string, GeneratedChunk> = new Map();
  public currentCenterCoord: ChunkCoord = { cx: 0, cz: 0 };
  public apocalypticSeverity: number = 0;

  private isUpdating: boolean = false;
  private lastCheckedPos: THREE.Vector3 = new THREE.Vector3(-99999, -99999, -99999);
  private frameThrottle: number = 0;
  private customRadius: number | null = null;
  private activeAnisotropy: number = 4;
  private workerClient: TerrainWorkerClient = new TerrainWorkerClient();
  private prefetchedKeys: Set<string> = new Set();
  private lastOsmPrefetchKey: string = '';
  private pendingOsmRefreshKeys: Set<string> = new Set();
  private unsubscribeOsm: (() => void) | null = null;

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
    this.unsubscribeOsm = OsmTileFetcher.onSectorReady((sector) => {
      if (!sector.isGeometryReady || (sector.buildings.length === 0 && sector.roads.length === 0)) return;
      this.activeChunks.forEach((chunk, key) => {
        if (chunk.data.coord.cx === 0 && chunk.data.coord.cz === 0) return;
        const [cX, cZ] = WorldCoordinates.chunkToWorldCenter(chunk.data.coord.cx, chunk.data.coord.cz);
        const geo = WorldCoordinates.worldToLatLon(cX, cZ);
        if (Math.abs(geo.lat - sector.lat) <= 0.014 && Math.abs(geo.lon - sector.lon) <= 0.014) {
          this.pendingOsmRefreshKeys.add(key);
        }
      });
    });
  }

  public setStreamingRadius(radius: number | null) {
    if (this.customRadius === radius) return;
    this.customRadius = radius;
    this.lastCheckedPos.set(-99999, -99999, -99999);
  }

  public setTextureAnisotropy(anisotropy: number) {
    this.activeAnisotropy = Math.max(1, anisotropy);
  }

  public setQuality(quality: GraphicsQuality, resetRadius = false) {
    if (this.quality === quality && !resetRadius) return;
    this.quality = quality;
    if (resetRadius) {
      this.customRadius = null;
    }
    this.lastCheckedPos.set(-99999, -99999, -99999);
  }

  public setApocalypticSeverity(severity: number) {
    const clamped = Math.max(0, Math.min(1, severity));
    if (Math.abs(clamped - this.apocalypticSeverity) < 0.05) return;
    this.apocalypticSeverity = clamped;
  }

  /**
   * Unloads all streamed chunks (used on region fast-travel or origin shift).
   */
  public clearLoadedChunks() {
    this.activeChunks.forEach((chunk) => {
      this.scene.remove(chunk.group);
      chunk.dispose();
    });
    this.activeChunks.clear();
    this.prefetchedKeys.clear();
    this.pendingOsmRefreshKeys.clear();
    this.lastCheckedPos.set(-99999, -99999, -99999);
  }

  /**
   * Unloads any chunks beyond `maxKeepRadius` from playerPos to immediately reclaim GPU memory.
   */
  public trimDistantChunks(maxKeepRadius: number, playerPos: THREE.Vector3): number {
    const playerCoord = WorldCoordinates.worldToChunk(playerPos.x, playerPos.z);
    const toRemove: string[] = [];
    this.activeChunks.forEach((chunk, key) => {
      const dist = Math.max(
        Math.abs(chunk.data.coord.cx - playerCoord.cx),
        Math.abs(chunk.data.coord.cz - playerCoord.cz)
      );
      if (dist > maxKeepRadius) {
        toRemove.push(key);
      }
    });
    for (let i = 0; i < toRemove.length; i++) {
      const key = toRemove[i];
      const chunk = this.activeChunks.get(key);
      if (chunk) {
        this.scene.remove(chunk.group);
        chunk.dispose();
        this.activeChunks.delete(key);
      }
    }
    if (this.prefetchedKeys.size > 32) {
      this.prefetchedKeys.clear();
    }
    this.lastCheckedPos.set(-99999, -99999, -99999);
    return toRemove.length;
  }

  /**
   * Updates camera-frustum visibility of chunk groups and throttles far props to keep GPU draw calls lean.
   */
  public updateFrustumCulling(camera: THREE.Camera, playerPos: THREE.Vector3) {
    ChunkManager._projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    ChunkManager._frustum.setFromProjectionMatrix(ChunkManager._projScreenMatrix);
    const propCullDistSq = this.quality === 'low' ? 180 * 180 : 340 * 340;

    this.activeChunks.forEach((chunk) => {
      const [minX, minZ] = WorldCoordinates.chunkToWorldOrigin(chunk.data.coord.cx, chunk.data.coord.cz);
      const [centerX, centerZ] = WorldCoordinates.chunkToWorldCenter(chunk.data.coord.cx, chunk.data.coord.cz);
      const distSq = (centerX - playerPos.x) ** 2 + (centerZ - playerPos.z) ** 2;

      if (distSq < 190 * 190) {
        chunk.group.visible = true;
      } else {
        ChunkManager._chunkMin.set(minX - 12, chunk.data.minElevation - 25, minZ - 12);
        ChunkManager._chunkMax.set(minX + 268, Math.max(chunk.data.maxElevation + 60, 80), minZ + 268);
        ChunkManager._chunkBox.set(ChunkManager._chunkMin, ChunkManager._chunkMax);
        chunk.group.visible = ChunkManager._frustum.intersectsBox(ChunkManager._chunkBox);
      }

      if (chunk.group.visible) {
        const showDetailedProps = distSq <= propCullDistSq;
        chunk.resourceMeshes.forEach((m) => {
          m.visible = showDetailedProps;
        });
      }
    });
  }

  /**
   * Updates streaming around player position.
   * Loads newly entered chunks, unloads far chunks, triggers background worker prefetching, and updates LODs.
   */
  public updatePlayerPosition(playerPos: THREE.Vector3, force: boolean = false, allowChunkBuild: boolean = true) {
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

    // Optional offline-safe Overpass city/sector tag prefetch
    const geo = WorldCoordinates.worldToLatLon(playerPos.x, playerPos.z);
    const osmKey = `${geo.lat.toFixed(2)}_${geo.lon.toFixed(2)}`;
    if (osmKey !== this.lastOsmPrefetchKey) {
      this.lastOsmPrefetchKey = osmKey;
      void OsmTileFetcher.prefetchSectorIfOnline(geo.lat, geo.lon);
    }

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
    this.activeChunks.forEach((_chunk, key) => {
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

    // Limit loads per tick (max 1 chunk per frame, or 0 during spike cooldown frames) to prevent micro-stutters
    const batchCount = !allowChunkBuild && !force ? 0 : Math.min(chunksToLoad.length, force ? 4 : 1);
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
        this.persistence.openedPoiIds,
        this.apocalypticSeverity
      );

      // Apply current GraphicsManager texture anisotropy to streamed chunk materials
      if (this.activeAnisotropy > 1) {
        generated.group.traverse((obj) => {
          const m = (obj as THREE.Mesh).material as any;
          if (!m) return;
          const mats = Array.isArray(m) ? m : [m];
          for (let mi = 0; mi < mats.length; mi++) {
            const mat = mats[mi];
            if (!mat) continue;
            for (const tk of ['map', 'normalMap', 'roughnessMap', 'metalnessMap'] as const) {
              const tex = mat[tk] as THREE.Texture | undefined;
              if (tex && tex.anisotropy !== this.activeAnisotropy) {
                tex.anisotropy = this.activeAnisotropy;
                tex.needsUpdate = true;
              }
            }
          }
        });
      }

      this.scene.add(generated.group);
      this.activeChunks.set(key, generated);
      this.persistence.markChunkDiscovered(coord.cx, coord.cz);
    }

    // Smoothly upgrade 1 active chunk per eligible frame if live Overpass OSM geometry arrived
    if (allowChunkBuild && batchCount === 0 && this.pendingOsmRefreshKeys.size > 0) {
      const nextKey = this.pendingOsmRefreshKeys.values().next().value as string | undefined;
      if (nextKey) {
        this.pendingOsmRefreshKeys.delete(nextKey);
        const existing = this.activeChunks.get(nextKey);
        if (existing) {
          const coord = existing.data.coord;
          const lod = LODManager.getLODLevel(playerCoord.cx, playerCoord.cz, coord.cx, coord.cz, this.quality);
          this.scene.remove(existing.group);
          existing.dispose();
          const rebuilt = ChunkGenerator.createChunk(
            coord,
            this.worldSeed,
            lod,
            this.quality,
            this.persistence.destroyedResourceIds,
            this.persistence.openedPoiIds,
            this.apocalypticSeverity
          );
          this.scene.add(rebuilt.group);
          this.activeChunks.set(nextKey, rebuilt);
        }
      }
    }

    if (chunksToLoad.length > batchCount || this.pendingOsmRefreshKeys.size > 0) {
      // Allow immediate continuation on next eligible frame instead of waiting for 5m movement
      this.lastCheckedPos.set(-99999, -99999, -99999);
    }

    // Schedule asynchronous Web Worker height prefetch for next queued chunk
    if (chunksToLoad.length > batchCount && this.workerClient.isAvailable()) {
      const nextCoord = chunksToLoad[batchCount].coord;
      const prefetchKey = WorldCoordinates.chunkKey(nextCoord.cx, nextCoord.cz);
      if (!this.prefetchedKeys.has(prefetchKey)) {
        this.prefetchedKeys.add(prefetchKey);
        const [minX, minZ] = WorldCoordinates.chunkToWorldOrigin(nextCoord.cx, nextCoord.cz);
        const origin = WorldCoordinates.getWorldOrigin();
        void this.workerClient
          .computeChunkHeightsAsync({
            minX,
            minZ,
            chunkSize: 256,
            segments: 16,
            worldSeed: this.worldSeed,
            originLat: origin.lat,
            originLon: origin.lon,
          })
          ?.catch(() => {});
      }
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
   * Returns all enterable building definitions from currently streamed chunks.
   */
  public getActiveEnterableBuildings(): EnterableBuildingDef[] {
    const out: EnterableBuildingDef[] = [];
    this.activeChunks.forEach((chunk) => {
      if (chunk.enterableBuildings && chunk.enterableBuildings.length > 0) {
        for (let i = 0; i < chunk.enterableBuildings.length; i++) {
          out.push(chunk.enterableBuildings[i]);
        }
      }
    });
    return out;
  }

  /**
   * Dispose all loaded chunks & worker upon game reset/exit
   */
  public dispose() {
    if (this.unsubscribeOsm) {
      this.unsubscribeOsm();
      this.unsubscribeOsm = null;
    }
    this.pendingOsmRefreshKeys.clear();
    this.workerClient.dispose();
    this.activeChunks.forEach((chunk) => {
      this.scene.remove(chunk.group);
      chunk.dispose();
    });
    this.activeChunks.clear();
  }
}

