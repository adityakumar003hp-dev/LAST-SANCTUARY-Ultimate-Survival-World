/** Deterministic, chunk-streamed six-track railway network. */
import * as THREE from 'three';
import { POIStructure } from '../../types/game';
import { CHUNK_SIZE } from './WorldCoordinates';
import { TerrainGenerator } from './TerrainGenerator';

export type RailwayTrackId = 'F1' | 'F2' | 'F3' | 'B1' | 'B2' | 'B3';
export const RAILWAY_TRACKS: ReadonlyArray<{ id: RailwayTrackId; direction: 'forward' | 'backward'; playerDrivable: boolean; zOffset: number }> = [
  { id: 'F1', direction: 'forward', playerDrivable: false, zOffset: 150 },
  { id: 'F2', direction: 'forward', playerDrivable: false, zOffset: 162 },
  { id: 'F3', direction: 'forward', playerDrivable: false, zOffset: 174 },
  { id: 'B3', direction: 'backward', playerDrivable: false, zOffset: 186 },
  { id: 'B2', direction: 'backward', playerDrivable: false, zOffset: 198 },
  { id: 'B1', direction: 'backward', playerDrivable: false, zOffset: 210 },
];

const railMat = new THREE.MeshStandardMaterial({ color: 0x68727a, metalness: 0.82, roughness: 0.32 });
const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x493b2d, roughness: 0.92 });
const ballastMat = new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 1 });
const mastMat = new THREE.MeshStandardMaterial({ color: 0x59636b, metalness: 0.82, roughness: 0.34 });
const wireMat = new THREE.MeshStandardMaterial({ color: 0x252b30, metalness: 0.9, roughness: 0.25 });
const insulatorMat = new THREE.MeshStandardMaterial({ color: 0x8b7650, roughness: 0.55 });
[railMat, sleeperMat, ballastMat, mastMat, wireMat, insulatorMat].forEach((m) => {
  m.userData.__sharedResource = true;
});

const gradeSegment = 16;
const ballastChunkGeo = new THREE.BoxGeometry(gradeSegment + 0.04, 0.18, 5.6);
const railChunkGeo = new THREE.BoxGeometry(gradeSegment + 0.04, 0.14, 0.14);
const sleeperChunkGeo = new THREE.BoxGeometry(2.8, 0.16, 3.6);
const mastGeo = new THREE.BoxGeometry(0.34, 9.5, 0.34);
const crossArmGeo = new THREE.BoxGeometry(0.34, 0.22, 88);
const insulatorGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.55, 8);
const contactWireGeo = new THREE.CylinderGeometry(0.025, 0.025, CHUNK_SIZE, 6);
[ballastChunkGeo, railChunkGeo, sleeperChunkGeo, mastGeo, crossArmGeo, insulatorGeo, contactWireGeo].forEach((g) => {
  g.userData.__sharedResource = true;
});

const STATION_SPACING = 1200;

/** Flat surveyed grade through the central station platform and throat. */
function railwayGrade(x: number, z: number, seed: number): number {
  const stationX = Math.round(x / STATION_SPACING) * STATION_SPACING;
  if (Math.abs(x - stationX) <= 84 && z >= 132 && z <= 228) {
    return TerrainGenerator.getHeight(stationX, z, seed);
  }
  return TerrainGenerator.getHeight(x, z, seed);
}

function hash01(x: number, z: number, seed: number, salt: number): number {
  const n = Math.sin(x * 127.1 + z * 311.7 + seed * 0.017 + salt * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function addRailSegment(group: THREE.Group, a: THREE.Vector3, b: THREE.Vector3, material: THREE.Material, radius = 0.075) {
  const delta = new THREE.Vector3().subVectors(b, a);
  const length = delta.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 6), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  group.add(mesh);
}

export class RailwayNetworkGenerator {
  /** Full station perimeter & radius protection (platforms, skywalks, terminal, forecourt plaza, gatehouses). */
  public static isProtectedRailwayStationArea(x: number, z: number): boolean {
    const nearestStationX = Math.round(x / STATION_SPACING) * STATION_SPACING;
    const dx = x - nearestStationX;
    const absDx = Math.abs(dx);
    // Rectangular terminal envelope: skywalks Z=108..268, platforms X=-90..+90,
    // main concourse Z=239..291, forecourt & checkpoints Z=291..346 (+ generous buffer).
    if (absDx <= 124 && z >= 94 && z <= 366) {
      return true;
    }
    // Radial perimeter guard (150m radius centered on station terminal/plaza midpoint Z=236).
    const dz = z - 236;
    if (dx * dx + dz * dz <= 150 * 150) {
      return true;
    }
    return false;
  }

  /** Railway right-of-way and station premises: excludes foreign trees, rocks, POIs and wildlife. */
  public static isProtectedRailwayZone(x: number, z: number): boolean {
    // Six parallel tracks occupy z=150..210; reserve a wider safety corridor
    // for ballast shoulders, overhead equipment, and the entire railway station premises.
    if (z >= 134 && z <= 226) return true;
    return RailwayNetworkGenerator.isProtectedRailwayStationArea(x, z);
  }

  public static isTrackZone(x: number, z: number): boolean {
    return z >= 142 && z <= 218;
  }
  /** Every chunk uses the same world-aligned six-track corridor, so boundaries join exactly. */
  public static createChunk(cx: number, cz: number, seed: number, pois: POIStructure[]): THREE.Group {
    const group = new THREE.Group();
    group.name = `railway_chunk_${cx}_${cz}`;
    group.userData.trackCount = 6;
    group.userData.trackIds = RAILWAY_TRACKS.map(t => t.id);
    group.userData.playerDrivableTracks = [];
    group.userData.aiControlledTracks = ['F1', 'F2', 'F3', 'B1', 'B2', 'B3'];
    // One deterministic east-west railway corridor, kept well clear of the apartment town.
    // Each track is owned by its deterministic z-chunk row; x-chunks join seamlessly.
    const minX = cx * CHUNK_SIZE;
    const centerX = minX + CHUNK_SIZE * 0.5;
    for (const track of RAILWAY_TRACKS) {
      if (Math.floor(track.zOffset / CHUNK_SIZE) !== cz) continue;
      const z = track.zOffset;
      // Match the train's 16m rail-grade sampling grid so rolling stock stays seated
      // on the rail crown even when the procedural terrain rises or falls.
      for (let offset = 0; offset < CHUNK_SIZE; offset += gradeSegment) {
        const segmentX = minX + offset + gradeSegment * 0.5;
        const ground = railwayGrade(segmentX, z, seed);
        const ballast = new THREE.Mesh(ballastChunkGeo, ballastMat);
        ballast.position.set(segmentX, ground + 0.02, z);
        group.add(ballast);
        for (const side of [-1, 1]) {
          const rail = new THREE.Mesh(railChunkGeo, railMat);
          rail.position.set(segmentX, ground + 0.36, z + side * 0.88);
          group.add(rail);
        }
      }
      const count = Math.floor(CHUNK_SIZE / 3.2);
      const sleepers = new THREE.InstancedMesh(sleeperChunkGeo, sleeperMat, count);
      const matrix = new THREE.Matrix4();
      for (let i = 0; i < count; i++) {
        const x = minX + i * 3.2 + 1.6;
        matrix.makeTranslation(x, railwayGrade(x, z, seed) + 0.12, z);
        sleepers.setMatrixAt(i, matrix);
      }
      sleepers.instanceMatrix.needsUpdate = true;
      group.add(sleepers);
      group.userData[track.id] = { direction: track.direction, playerDrivable: track.playerDrivable, z };
    }

    // Realistic 25 kV-style overhead catenary: steel masts, cantilevers,
    // messenger/contact wires and insulators. Geometry is chunk-aligned.
    for (let x = minX + 32; x < minX + CHUNK_SIZE; x += 64) {
      const mastZ = 132;
      const mastY = railwayGrade(x, 180, seed);
      const mast = new THREE.Mesh(mastGeo, mastMat);
      mast.position.set(x, mastY + 4.75, mastZ);
      mast.castShadow = false;
      group.add(mast);
      const cross = new THREE.Mesh(crossArmGeo, mastMat);
      cross.position.set(x, mastY + 9.1, 176);
      group.add(cross);
      for (const track of RAILWAY_TRACKS) {
        const wireY = railwayGrade(x, track.zOffset, seed) + 8.2;
        const insulator = new THREE.Mesh(insulatorGeo, insulatorMat);
        insulator.position.set(x, wireY + 0.32, track.zOffset);
        group.add(insulator);
        const contactWire = new THREE.Mesh(contactWireGeo, wireMat);
        contactWire.rotation.z = Math.PI / 2;
        contactWire.position.set(centerX, wireY, track.zOffset);
        group.add(contactWire);
      }
    }
    // Chunk-edge continuity is exact because every track uses the same world-aligned x grid.
    group.userData.worldAligned = true;
    group.userData.apartmentExclusionRadius = 115;
    return group;
  }
}
