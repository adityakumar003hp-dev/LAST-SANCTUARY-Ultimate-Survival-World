/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChunkModificationData, MapWaypoint, PlacedStructure } from '../../types/game';
import { WorldCoordinates } from './WorldCoordinates';

export class WorldPersistence {
  public destroyedResourceIds: Set<string> = new Set();
  public openedPoiIds: Set<string> = new Set();
  public discoveredChunks: Set<string> = new Set();
  public waypoints: MapWaypoint[] = [];
  public chunkModifications: Map<string, ChunkModificationData> = new Map();

  constructor() {
    // Sanctuary Base starts discovered
    this.discoveredChunks.add('0_0');
    this.waypoints.push({
      id: 'wp_sanctuary',
      name: 'Sanctuary Estate',
      position: [0, 0, 0],
      icon: 'Shield',
      color: '#10b981',
      isCustom: false,
    });
  }

  public markResourceDestroyed(id: string, wx: number, wz: number) {
    this.destroyedResourceIds.add(id);
    const coord = WorldCoordinates.worldToChunk(wx, wz);
    const key = WorldCoordinates.chunkKey(coord.cx, coord.cz);
    let mod = this.chunkModifications.get(key);
    if (!mod) {
      mod = { destroyedResourceIds: [], openedPoiIds: [], placedStructures: [] };
      this.chunkModifications.set(key, mod);
    }
    if (!mod.destroyedResourceIds.includes(id)) {
      mod.destroyedResourceIds.push(id);
    }
  }

  public markPoiOpened(id: string, wx: number, wz: number) {
    this.openedPoiIds.add(id);
    const coord = WorldCoordinates.worldToChunk(wx, wz);
    const key = WorldCoordinates.chunkKey(coord.cx, coord.cz);
    let mod = this.chunkModifications.get(key);
    if (!mod) {
      mod = { destroyedResourceIds: [], openedPoiIds: [], placedStructures: [] };
      this.chunkModifications.set(key, mod);
    }
    if (!mod.openedPoiIds.includes(id)) {
      mod.openedPoiIds.push(id);
    }
  }

  public markChunkDiscovered(cx: number, cz: number) {
    this.discoveredChunks.add(WorldCoordinates.chunkKey(cx, cz));
  }

  public isChunkDiscovered(cx: number, cz: number): boolean {
    return this.discoveredChunks.has(WorldCoordinates.chunkKey(cx, cz));
  }

  public addWaypoint(wp: MapWaypoint) {
    this.waypoints.push(wp);
  }

  public removeWaypoint(id: string) {
    this.waypoints = this.waypoints.filter((w) => w.id !== id);
  }

  public exportSaveData() {
    const modsObj: Record<string, ChunkModificationData> = {};
    this.chunkModifications.forEach((val, key) => {
      modsObj[key] = val;
    });

    return {
      discoveredChunks: Array.from(this.discoveredChunks),
      waypoints: this.waypoints,
      chunkModifications: modsObj,
    };
  }

  public importSaveData(data?: {
    discoveredChunks?: string[];
    waypoints?: MapWaypoint[];
    chunkModifications?: Record<string, ChunkModificationData>;
  }) {
    if (!data) return;

    if (data.discoveredChunks) {
      data.discoveredChunks.forEach((k) => this.discoveredChunks.add(k));
    }
    if (data.waypoints && data.waypoints.length > 0) {
      this.waypoints = data.waypoints;
    }
    if (data.chunkModifications) {
      Object.entries(data.chunkModifications).forEach(([k, mod]) => {
        this.chunkModifications.set(k, mod);
        mod.destroyedResourceIds.forEach((id) => this.destroyedResourceIds.add(id));
        mod.openedPoiIds.forEach((id) => this.openedPoiIds.add(id));
      });
    }
  }
}
