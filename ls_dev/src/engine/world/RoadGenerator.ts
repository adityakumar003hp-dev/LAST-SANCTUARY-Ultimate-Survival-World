/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';

export interface RoadSegment {
  points: THREE.Vector3[];
  width: number;
  type: 'highway' | 'rural_road' | 'trail';
}

export class RoadGenerator {
  /**
   * Evaluates if a given world coordinate (x, z) lies on a major highway or rural path.
   * Highways run on grid intervals (e.g. every 768m) with slight meandering curves.
   */
  public static isRoad(x: number, z: number): { isRoad: boolean; roadType?: 'highway' | 'rural_road' | 'trail'; roadDist?: number } {
    const highwaySpacing = 768;

    // East-West highway
    const ewGrid = Math.round(z / highwaySpacing) * highwaySpacing;
    const ewCurve = Math.sin(x * 0.003) * 22;
    const distToEw = Math.abs(z - (ewGrid + ewCurve));

    if (distToEw < 4.5) {
      return { isRoad: true, roadType: 'highway', roadDist: distToEw };
    }

    // North-South highway
    const nsGrid = Math.round(x / highwaySpacing) * highwaySpacing;
    const nsCurve = Math.cos(z * 0.003) * 22;
    const distToNs = Math.abs(x - (nsGrid + nsCurve));

    if (distToNs < 4.5) {
      return { isRoad: true, roadType: 'highway', roadDist: distToNs };
    }

    // Rural connector paths (diagonal / meandering)
    const trailCurve = Math.sin(x * 0.006 + z * 0.004) * 35;
    const distToTrail = Math.abs((x - z * 0.8) % 450 - trailCurve);
    if (distToTrail < 2.5) {
      return { isRoad: true, roadType: 'rural_road', roadDist: distToTrail };
    }

    return { isRoad: false };
  }

  /**
   * Generates a road mesh for a chunk if any highway or path crosses it
   */
  public static generateChunkRoadMesh(
    minX: number,
    minZ: number,
    size: number,
    seed: number = 42
  ): THREE.Mesh | null {
    const roadPoints: THREE.Vector3[] = [];
    const step = 8;

    // Sample along road trajectories in chunk
    for (let x = minX; x <= minX + size; x += step) {
      for (let z = minZ; z <= minZ + size; z += step) {
        const check = this.isRoad(x, z);
        if (check.isRoad) {
          const y = TerrainGenerator.getHeight(x, z, seed) + 0.04; // Slightly above terrain to prevent z-fighting
          roadPoints.push(new THREE.Vector3(x, y, z));
        }
      }
    }

    if (roadPoints.length < 4) return null;

    // Build ribbon road geometry
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < roadPoints.length; i++) {
      const p = roadPoints[i];
      const check = this.isRoad(p.x, p.z);
      const w = check.roadType === 'highway' ? 4.0 : 2.5;

      positions.push(p.x - w * 0.5, p.y, p.z - w * 0.5);
      positions.push(p.x + w * 0.5, p.y, p.z + w * 0.5);
      positions.push(p.x - w * 0.5, p.y, p.z + w * 0.5);

      positions.push(p.x - w * 0.5, p.y, p.z - w * 0.5);
      positions.push(p.x + w * 0.5, p.y, p.z - w * 0.5);
      positions.push(p.x + w * 0.5, p.y, p.z + w * 0.5);

      const colorVal = check.roadType === 'highway' ? 0.18 : 0.42;
      for (let k = 0; k < 6; k++) {
        colors.push(colorVal, colorVal * 0.95, colorVal * 0.85);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    return mesh;
  }
}
