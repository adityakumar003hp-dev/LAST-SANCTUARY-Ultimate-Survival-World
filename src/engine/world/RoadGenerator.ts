/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { TerrainGenerator } from './TerrainGenerator';
import { getAsphaltPBR } from '../../utils/proceduralTextures';

export interface RoadSegment {
  points: THREE.Vector3[];
  width: number;
  type: 'highway' | 'rural_road' | 'trail';
}

let cachedHighwayTex: THREE.CanvasTexture | null = null;
function getHighwayMarkingTexture(): THREE.CanvasTexture {
  if (cachedHighwayTex) return cachedHighwayTex;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Dark weathered asphalt aggregate base
  ctx.fillStyle = '#25282e';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 32 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Subtle gravel shoulders at outer 8% edges (u ~ 0 and u ~ 1)
  const leftGrad = ctx.createLinearGradient(0, 0, size * 0.1, 0);
  leftGrad.addColorStop(0, '#4b453b');
  leftGrad.addColorStop(1, 'rgba(75,69,59,0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(0, 0, size * 0.1, size);

  const rightGrad = ctx.createLinearGradient(size * 0.9, 0, size, 0);
  rightGrad.addColorStop(0, 'rgba(75,69,59,0)');
  rightGrad.addColorStop(1, '#4b453b');
  ctx.fillStyle = rightGrad;
  ctx.fillRect(size * 0.9, 0, size * 0.1, size);

  // Crisp edge lines
  ctx.fillStyle = 'rgba(225, 226, 222, 0.72)';
  ctx.fillRect(size * 0.085, 0, 5, size);
  ctx.fillRect(size * 0.915 - 5, 0, 5, size);

  // Dashed yellow centerline
  ctx.fillStyle = 'rgba(232, 185, 48, 0.85)';
  ctx.fillRect(size * 0.5 - 3, 18, 6, 92);
  ctx.fillRect(size * 0.5 - 3, 146, 6, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  cachedHighwayTex = tex;
  return tex;
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
   * Generates a continuous connected road ribbon mesh for a chunk if any highway crosses it.
   */
  public static generateChunkRoadMesh(
    minX: number,
    minZ: number,
    size: number,
    seed: number = 42
  ): THREE.Mesh | null {
    const highwaySpacing = 768;
    const positions: number[] = [];
    const uvs: number[] = [];
    const step = 4;
    const halfWidth = 4.4;

    const emitStrip = (pts: Array<{ lx: number; ly: number; lz: number; rx: number; ry: number; rz: number }>) => {
      if (pts.length < 2) return;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const v0 = i * 0.45;
        const v1 = (i + 1) * 0.45;

        positions.push(a.lx, a.ly, a.lz, b.lx, b.ly, b.lz, a.rx, a.ry, a.rz);
        uvs.push(0, v0, 0, v1, 1, v0);

        positions.push(a.rx, a.ry, a.rz, b.lx, b.ly, b.lz, b.rx, b.ry, b.rz);
        uvs.push(1, v0, 0, v1, 1, v1);
      }
    };

    // 1. East-West Highways intersecting this chunk
    const ewStart = Math.floor((minZ - 32) / highwaySpacing);
    const ewEnd = Math.ceil((minZ + size + 32) / highwaySpacing);
    for (let g = ewStart; g <= ewEnd; g++) {
      const ewGrid = g * highwaySpacing;
      const pts: Array<{ lx: number; ly: number; lz: number; rx: number; ry: number; rz: number }> = [];
      let anyInside = false;
      for (let x = minX; x <= minX + size; x += step) {
        const cz = ewGrid + Math.sin(x * 0.003) * 22;
        if (cz >= minZ - 8 && cz <= minZ + size + 8) anyInside = true;
        const slope = Math.cos(x * 0.003) * 22 * 0.003;
        const len = Math.hypot(1, slope);
        const nx = -slope / len;
        const nz = 1 / len;
        const lx = x - nx * halfWidth;
        const lz = cz - nz * halfWidth;
        const rx = x + nx * halfWidth;
        const rz = cz + nz * halfWidth;
        const ly = Math.max(TerrainGenerator.getHeight(lx, lz, seed) + 0.07, 1.35);
        const ry = Math.max(TerrainGenerator.getHeight(rx, rz, seed) + 0.07, 1.35);
        pts.push({ lx, ly, lz, rx, ry, rz });
      }
      if (anyInside) emitStrip(pts);
    }

    // 2. North-South Highways intersecting this chunk
    const nsStart = Math.floor((minX - 32) / highwaySpacing);
    const nsEnd = Math.ceil((minX + size + 32) / highwaySpacing);
    for (let g = nsStart; g <= nsEnd; g++) {
      const nsGrid = g * highwaySpacing;
      const pts: Array<{ lx: number; ly: number; lz: number; rx: number; ry: number; rz: number }> = [];
      let anyInside = false;
      for (let z = minZ; z <= minZ + size; z += step) {
        const cx = nsGrid + Math.cos(z * 0.003) * 22;
        if (cx >= minX - 8 && cx <= minX + size + 8) anyInside = true;
        const slope = -Math.sin(z * 0.003) * 22 * 0.003;
        const len = Math.hypot(slope, 1);
        const nx = 1 / len;
        const nz = -slope / len;
        const lx = cx - nx * halfWidth;
        const lz = z - nz * halfWidth;
        const rx = cx + nx * halfWidth;
        const rz = z + nz * halfWidth;
        const ly = Math.max(TerrainGenerator.getHeight(lx, lz, seed) + 0.075, 1.35);
        const ry = Math.max(TerrainGenerator.getHeight(rx, rz, seed) + 0.075, 1.35);
        pts.push({ lx, ly, lz, rx, ry, rz });
      }
      if (anyInside) emitStrip(pts);
    }

    if (positions.length === 0) return null;

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.computeVertexNormals();

    const asphaltPBR = getAsphaltPBR();
    const mat = new THREE.MeshStandardMaterial({
      map: getHighwayMarkingTexture(),
      normalMap: asphaltPBR.normal,
      roughnessMap: asphaltPBR.roughness,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughness: 0.86,
      metalness: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const mesh = new THREE.Mesh(geom, mat);
    mesh.receiveShadow = true;
    return mesh;
  }
}
