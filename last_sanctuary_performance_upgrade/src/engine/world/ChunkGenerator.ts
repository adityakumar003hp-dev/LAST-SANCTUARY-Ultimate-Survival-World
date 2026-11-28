/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ChunkCoord, ChunkData, HarvestableResource, POIStructure, GraphicsQuality } from '../../types/game';
import { CHUNK_SIZE, WorldCoordinates } from './WorldCoordinates';
import { BiomeGenerator, BIOMES } from './BiomeGenerator';
import { TerrainGenerator } from './TerrainGenerator';
import { RoadGenerator } from './RoadGenerator';
import { POIGenerator } from './POIGenerator';
import { RailwayNetworkGenerator } from './RailwayNetworkGenerator';
import { VegetationGenerator } from './VegetationGenerator';
import { isProtectedSpawnZone } from './ProtectedSpawnZones';
import { LODManager } from './LODManager';
import { RealEarthBuildings, EnterableBuildingDef } from './RealEarthBuildings';
import {
  getGrassPBR,
  getGrassTuftAlphaTexture,
} from '../rendering/ProceduralTextures';
import {
  enhanceTerrainMaterialWithRealism,
  createRealisticWaterMaterial,
  applyFoliageWindShader,
} from '../shaders/RealismShaders';

let sharedCrossGrassGeo: THREE.BufferGeometry | null = null;
function getCrossGrassGeometry(): THREE.BufferGeometry {
  if (sharedCrossGrassGeo) return sharedCrossGrassGeo;
  const w = 0.44;
  const h = 0.68;
  // Two intersecting vertical quads (X-pattern) with upright normals & UVs
  const pos = new Float32Array([
    // Plane 1 (along X)
    -w, 0, 0,   w, 0, 0,   w, h, 0,
    -w, 0, 0,   w, h, 0,  -w, h, 0,
    // Plane 2 (along Z)
    0, 0, -w,   0, 0, w,   0, h, w,
    0, 0, -w,   0, h, w,   0, h, -w,
  ]);
  const uv = new Float32Array([
    0, 0, 1, 0, 1, 1,   0, 0, 1, 1, 0, 1,
    0, 0, 1, 0, 1, 1,   0, 0, 1, 1, 0, 1,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  geo.userData.__sharedResource = true;
  sharedCrossGrassGeo = geo;
  return geo;
}

export interface GeneratedChunk {
  data: ChunkData;
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  waterMesh: THREE.Mesh | null;
  roadMesh: THREE.Mesh | null;
  resourceMeshes: Map<string, THREE.Group>;
  poiMeshes: Map<string, THREE.Group>;
  enterableBuildings: EnterableBuildingDef[];
  dispose: () => void;
}

export class ChunkGenerator {
  /**
   * Builds an entire 256x256 chunk with terrain, water, roads, harvestables, and POIs
   */
  public static createChunk(
    coord: ChunkCoord,
    worldSeed: number,
    lodLevel: number,
    quality: GraphicsQuality = 'medium',
    destroyedResourceIds: Set<string> = new Set(),
    lootedPoiIds: Set<string> = new Set(),
    apocalypticSeverity: number = 0
  ): GeneratedChunk {
    const key = WorldCoordinates.chunkKey(coord.cx, coord.cz);
    const [minX, minZ] = WorldCoordinates.chunkToWorldOrigin(coord.cx, coord.cz);
    const [centerX, centerZ] = WorldCoordinates.chunkToWorldCenter(coord.cx, coord.cz);

    const biomeDef = BiomeGenerator.getBiomeAt(centerX, centerZ, worldSeed);
    const earthInfo = TerrainGenerator.getEarthInfo(centerX, centerZ);
    const group = new THREE.Group();
    group.name = `chunk_${key}`;

    // 1. Terrain Mesh
    const segments = LODManager.getSegmentsForLOD(lodLevel, quality);
    const geometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    let minElevation = 9999;
    let maxElevation = -9999;

    const pos = geometry.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const baseColor = new THREE.Color(biomeDef.groundColor);
    const cliffColor = new THREE.Color(0x60656a); // Granite cliff rock
    const sandColor = new THREE.Color(0x7a6b4a);  // Lowland alluvial silt

    for (let i = 0; i < pos.count; i++) {
      // Local plane geometry is centered at 0, offset by world origin + half size
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = minX + CHUNK_SIZE * 0.5 + lx;
      const wz = minZ + CHUNK_SIZE * 0.5 + lz;

      const y = TerrainGenerator.getHeight(wx, wz, worldSeed);
      pos.setY(i, y);

      if (y < minElevation) minElevation = y;
      if (y > maxElevation) maxElevation = y;
    }

    // Recompute normals for accurate slope angle detection
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;

    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const lz = pos.getZ(i);
      const wx = minX + CHUNK_SIZE * 0.5 + lx;
      const wz = minZ + CHUNK_SIZE * 0.5 + lz;
      const y = pos.getY(i);
      const ny = normals.getY(i); // Upward vertical component of surface normal

      // Natural vertex color variation based on biome and micro-noise
      const tintFactor = 0.88 + (Math.sin(wx * 0.08) * Math.cos(wz * 0.08) + 1.0) * 0.12;
      let finalColor = baseColor.clone().multiplyScalar(tintFactor);

      // Natural slope exposure: If slope > 28 degrees (ny < 0.85), blend toward exposed rock cliff!
      if (ny < 0.85) {
        const cliffBlend = Math.min(1.0, (0.85 - ny) / 0.35);
        finalColor.lerp(cliffColor, cliffBlend * 0.85);
      }

      // Shoreline / riverbed moist silt (y < 0.4)
      if (y < 0.4) {
        const siltBlend = Math.min(1.0, (0.4 - y) / 1.2);
        finalColor.lerp(sandColor, siltBlend * 0.7);
      }

      colors[i * 3 + 0] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Realistic PBR Grass & Soil with Anti-Tiling & Rain Puddle Wetness
    const grassPBR = getGrassPBR(biomeDef.groundColor);
    grassPBR.albedo.repeat.set(14, 14);
    grassPBR.normal.repeat.set(14, 14);
    grassPBR.roughness.repeat.set(14, 14);

    const terrainMat = enhanceTerrainMaterialWithRealism(
      new THREE.MeshStandardMaterial({
        map: grassPBR.albedo,
        normalMap: grassPBR.normal,
        roughnessMap: grassPBR.roughness,
        normalScale: new THREE.Vector2(1.4, 1.4),
        vertexColors: true,
        roughness: biomeDef.roughness,
        metalness: 0.05,
        flatShading: lodLevel === 2,
      })
    );

    const terrainMesh = new THREE.Mesh(geometry, terrainMat);
    terrainMesh.position.set(minX + CHUNK_SIZE * 0.5, 0, minZ + CHUNK_SIZE * 0.5);
    terrainMesh.receiveShadow = quality !== 'low';
    group.add(terrainMesh);

    // 1b. Volumetric Alpha-Tested Wind-Animated 3D Grass Blade Clumps for Near LOD (LOD 0)
    if (lodLevel === 0 && quality !== 'low') {
      const tuftCount = 920;
      const bladeGeo = getCrossGrassGeometry();
      const grassAlphaTex = getGrassTuftAlphaTexture();

      const bladeMat = applyFoliageWindShader(
        new THREE.MeshStandardMaterial({
          map: grassAlphaTex,
          color: new THREE.Color(biomeDef.groundColor).lerp(new THREE.Color(0xffffff), 0.35),
          alphaTest: 0.42,
          roughness: 0.84,
          metalness: 0.02,
          side: THREE.DoubleSide,
        }),
        0.22,
        true
      );

      const instancedTufts = new THREE.InstancedMesh(bladeGeo, bladeMat, tuftCount);
      const dummy = new THREE.Object3D();

      let placed = 0;
      let s = (coord.cx * 82739) ^ (coord.cz * 48271) ^ worldSeed;
      const prng = () => {
        s = (s * 1664525 + 1013904223) % 4294967296;
        return Math.abs(s / 4294967296);
      };

      for (let t = 0; t < tuftCount; t++) {
        const rx = minX + 8 + prng() * 240;
        const rz = minZ + 8 + prng() * 240;
        if (RailwayNetworkGenerator.isProtectedRailwayZone(rx, rz) || isProtectedSpawnZone(rx, rz)) continue;
        if (RoadGenerator.isRoad(rx, rz).isRoad) continue;

        const ry = TerrainGenerator.getHeight(rx, rz, worldSeed);
        if (ry < -0.2) continue;

        dummy.position.set(rx, ry - 0.03, rz);
        dummy.rotation.y = prng() * Math.PI * 2;
        const sc = 0.8 + prng() * 0.55;
        dummy.scale.set(sc, sc * (0.85 + prng() * 0.4), sc);
        dummy.updateMatrix();

        instancedTufts.setMatrixAt(placed++, dummy.matrix);
      }
      instancedTufts.count = placed;
      instancedTufts.instanceMatrix.needsUpdate = true;
      instancedTufts.computeBoundingSphere();
      instancedTufts.receiveShadow = true;
      group.add(instancedTufts);
    }

    // 2. Realistic Dynamic Gerstner Water Plane (oceans, seas, major rivers, lakes, submerged coasts)
    let waterMesh: THREE.Mesh | null = null;
    const riverWave = Math.sin(centerZ * 0.004) * 45;
    const riverDist = Math.abs(centerX - 50 - riverWave);

    if (
      riverDist < 120 ||
      biomeDef.waterColor ||
      !earthInfo.isLand ||
      earthInfo.isLake ||
      earthInfo.riverProximity > 0.3 ||
      minElevation < -0.58
    ) {
      const waterColor = biomeDef.waterColor || (!earthInfo.isLand ? 0x0e4f6e : 0x165270);
      const waterGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE, 24, 24);
      waterGeo.rotateX(-Math.PI / 2);

      const waterMat = createRealisticWaterMaterial(waterColor, false);
      if (waterMat.normalMap) {
        waterMat.normalMap.repeat.set(16, 16);
      }

      waterMesh = new THREE.Mesh(waterGeo, waterMat);
      waterMesh.position.set(minX + CHUNK_SIZE * 0.5, -0.55, minZ + CHUNK_SIZE * 0.5);
      group.add(waterMesh);
    }

    // 3. Roads & Pathways
    const roadMesh = RoadGenerator.generateChunkRoadMesh(minX, minZ, CHUNK_SIZE, worldSeed);
    if (roadMesh) {
      group.add(roadMesh);
    }

    // 3b. Infinite six-track railway corridor and deterministic station branches
    const railwayMesh = RailwayNetworkGenerator.createChunk(
      coord.cx,
      coord.cz,
      worldSeed,
      POIGenerator.getPOIsForChunk(coord.cx, coord.cz, worldSeed)
    );
    group.add(railwayMesh);

    // 3c. Persistent Apocalyptic Debris & Abandoned Highway Wrecks when outbreak severity > 0.2
    if (apocalypticSeverity > 0.2 && lodLevel <= 1 && earthInfo.isLand && !isProtectedSpawnZone(centerX, centerZ)) {
      const wreckCount = Math.min(3, Math.floor(apocalypticSeverity * 3.5));
      const rustMat = new THREE.MeshStandardMaterial({ color: 0x4b382f, roughness: 0.88, metalness: 0.45 });
      const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x46484a, roughness: 0.94, metalness: 0.05 });
      let s = ((coord.cx * 49157) ^ (coord.cz * 98317) ^ worldSeed) >>> 0;
      const rand = () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
      };
      for (let wIdx = 0; wIdx < wreckCount; wIdx++) {
        const rx = minX + 24 + rand() * (CHUNK_SIZE - 48);
        const rz = minZ + 24 + rand() * (CHUNK_SIZE - 48);
        if (isProtectedSpawnZone(rx, rz) || RailwayNetworkGenerator.isProtectedRailwayZone(rx, rz)) continue;
        const ry = TerrainGenerator.getHeight(rx, rz, worldSeed);
        if (ry < -0.2) continue;

        if (RoadGenerator.isRoad(rx, rz).isRoad || rand() > 0.45) {
          // Abandoned rusted vehicle hull / road barricade
          const wreckGroup = new THREE.Group();
          const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.95, 4.1), rustMat);
          body.position.y = 0.55;
          const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 1.9), rustMat);
          cabin.position.set(0, 1.32, -0.2);
          wreckGroup.add(body, cabin);
          wreckGroup.position.set(rx, ry, rz);
          wreckGroup.rotation.y = rand() * Math.PI * 2;
          wreckGroup.rotation.z = (rand() - 0.5) * 0.14;
          group.add(wreckGroup);
        } else {
          // Concrete rubble pile / overgrown debris
          const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 + rand() * 0.9, 0), rubbleMat);
          rubble.scale.set(1.3, 0.55, 1.1);
          rubble.position.set(rx, ry + 0.35, rz);
          rubble.rotation.y = rand() * Math.PI;
          group.add(rubble);
        }
      }
    }

    // 4. Harvestable Resources (avoid destroyed)
    const rawResources = VegetationGenerator.generateResourcesForChunk(coord.cx, coord.cz, biomeDef.id, worldSeed);
    const resources: HarvestableResource[] = [];
    const resourceMeshes: Map<string, THREE.Group> = new Map();

    for (let i = 0; i < rawResources.length; i++) {
      const r = rawResources[i];
      if (destroyedResourceIds.has(r.id) || isProtectedSpawnZone(r.position[0], r.position[2]) || RailwayNetworkGenerator.isProtectedRailwayZone(r.position[0], r.position[2])) continue;

      resources.push(r);
      // Only instantiate 3D resource models if LOD <= 1 to conserve GPU memory
      if (lodLevel <= 1) {
        const rMesh = VegetationGenerator.createResourceMesh(r, biomeDef.id);
        resourceMeshes.set(r.id, rMesh);
        group.add(rMesh);
      }
    }

    // 5. Procedural POIs
    const rawPOIs = POIGenerator.getPOIsForChunk(coord.cx, coord.cz, worldSeed);
    const pois: POIStructure[] = [];
    const poiMeshes: Map<string, THREE.Group> = new Map();

    for (let i = 0; i < rawPOIs.length; i++) {
      const p = rawPOIs[i];
      if (isProtectedSpawnZone(p.position[0], p.position[2]) || RailwayNetworkGenerator.isProtectedRailwayZone(p.position[0], p.position[2])) continue;
      if (lootedPoiIds.has(p.id)) {
        p.isLooted = true;
      }
      pois.push(p);

      const pMesh = POIGenerator.createPOIMesh(p, apocalypticSeverity);
      poiMeshes.set(p.id, pMesh);
      group.add(pMesh);
    }

    // 5b. High-Density Real Earth Neighborhoods, OSM Geometry & Enterable Buildings
    const district = RealEarthBuildings.buildChunkDistrict(
      coord.cx,
      coord.cz,
      worldSeed,
      biomeDef.id,
      quality,
      lootedPoiIds,
      apocalypticSeverity,
      pois
    );
    if (district.group.children.length > 0) {
      group.add(district.group);
    }

    const chunkData: ChunkData = {
      coord,
      key,
      seed: worldSeed,
      biome: biomeDef.id,
      resources,
      pois,
      isLoaded: true,
      lodLevel,
      minElevation,
      maxElevation,
    };

    // Comprehensive cleanup disposal callback to prevent mobile memory leaks
    const dispose = () => {
      geometry.dispose();
      terrainMat.dispose();
      if (waterMesh) {
        waterMesh.geometry.dispose();
        if (Array.isArray(waterMesh.material)) {
          waterMesh.material.forEach((m) => m.dispose());
        } else {
          waterMesh.material.dispose();
        }
      }
      if (roadMesh) {
        roadMesh.geometry.dispose();
        if (Array.isArray(roadMesh.material)) {
          roadMesh.material.forEach((m: THREE.Material) => m.dispose());
        } else {
          roadMesh.material.dispose();
        }
      }
      group.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
          if (child.geometry && !child.geometry.userData?.__sharedResource) {
            child.geometry.dispose();
          }
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => { if (!m.userData?.__sharedResource) m.dispose(); });
          } else if (child.material && !child.material.userData?.__sharedResource) {
            child.material.dispose();
          }
        }
      });
      resourceMeshes.clear();
      poiMeshes.clear();
    };

    return {
      data: chunkData,
      group,
      terrainMesh,
      waterMesh,
      roadMesh,
      resourceMeshes,
      poiMeshes,
      enterableBuildings: district.enterableBuildings,
      dispose,
    };
  }
}
