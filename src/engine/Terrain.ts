import * as THREE from 'three';
import { HarvestableResource } from '../types/game';
import {
  getTerrainPBR,
  getWoodPBR,
  getStonePBR,
  getWaterRippleNormalMap,
} from '../utils/proceduralTextures';
import {
  buildRealisticTree,
  buildRealisticRock,
  buildRealisticBerryBush,
  buildRealisticScrapWreck,
} from './rendering/RealisticFloraBuilder';

import { TerrainGenerator } from './world/TerrainGenerator';
import { isProtectedSpawnZone } from './world/ProtectedSpawnZones';
import { RailwayNetworkGenerator } from './world/RailwayNetworkGenerator';

// Continuous height generator across the unlimited open world
export function getTerrainHeight(x: number, z: number, seed: number = 42): number {
  return TerrainGenerator.getHeight(x, z, seed);
}

export class WorldTerrain {
  public mesh: THREE.Mesh;
  public waterMesh: THREE.Mesh;
  public resources: HarvestableResource[] = [];
  public resourceMeshes: Map<string, THREE.Group> = new Map();
  public scene: THREE.Scene;
  public seed: number;

  constructor(scene: THREE.Scene, seed: number = 42) {
    this.scene = scene;
    this.seed = seed;

    // 1. Generate Terrain Mesh (260x260m starter region with slope rock & shoreline silt blending)
    const size = 260;
    const segments = 96;
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainHeight(x, z, seed);
      pos.setY(i, y);
    }
    geometry.computeVertexNormals();

    const normals = geometry.attributes.normal;
    const colors = new Float32Array(pos.count * 3);
    const grassTint = new THREE.Color(0x88a468);
    const cliffTint = new THREE.Color(0x63676b);
    const siltTint = new THREE.Color(0x7c6d4e);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = pos.getY(i);
      const ny = normals.getY(i);
      const micro = 0.90 + (Math.sin(x * 0.08) * Math.cos(z * 0.08) + 1.0) * 0.1;
      const col = grassTint.clone().multiplyScalar(micro);
      if (ny < 0.85) col.lerp(cliffTint, Math.min(1.0, (0.85 - ny) / 0.32) * 0.85);
      if (y < 0.45) col.lerp(siltTint, Math.min(1.0, (0.45 - y) / 1.1) * 0.7);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const terrainPBR = getTerrainPBR();
    terrainPBR.albedo.repeat.set(24, 24);
    terrainPBR.normal.repeat.set(24, 24);
    terrainPBR.roughness.repeat.set(24, 24);

    const material = new THREE.MeshStandardMaterial({
      map: terrainPBR.albedo,
      normalMap: terrainPBR.normal,
      roughnessMap: terrainPBR.roughness,
      normalScale: new THREE.Vector2(1.25, 1.25),
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.04,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // 2. Winding River Water Plane with Clearcoat Optical Sheen & Ripple Normals
    const waterGeo = new THREE.PlaneGeometry(35, size);
    waterGeo.rotateX(-Math.PI / 2);
    const waterRipple = getWaterRippleNormalMap();
    waterRipple.wrapS = THREE.RepeatWrapping;
    waterRipple.wrapT = THREE.RepeatWrapping;
    waterRipple.repeat.set(4, 18);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x164a66,
      roughness: 0.08,
      metalness: 0.18,
      envMapIntensity: 1.5,
      normalMap: waterRipple,
      normalScale: new THREE.Vector2(0.95, 0.95),
      transparent: true,
      opacity: 0.86,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.position.set(50, -0.6, 0);
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // 3. Populate Harvestable Resources
    this.generateHarvestables();
  }

  private generateHarvestables() {
    let idCounter = 1;

    // Helper: random seeded float
    let s = this.seed;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };

    // A. Forest Pine Trees (composite 5-part model)
    const treeCount = 75;
    for (let i = 0; i < treeCount; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 16 + rnd() * 105;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      // Skip river, railway/station zones, and protected compounds
      if (Math.abs(x - 50) < 16 || isProtectedSpawnZone(x, z) || RailwayNetworkGenerator.isProtectedRailwayZone(x, z)) continue;
      const y = getTerrainHeight(x, z, this.seed);

      const resId = `res_tree_${idCounter++}`;
      const res: HarvestableResource = {
        id: resId,
        type: 'tree',
        position: [x, y, z],
        health: 100,
        maxHealth: 100,
        yieldItem: 'wood',
        yieldAmount: 4,
        requiredTool: 'axe',
      };
      this.resources.push(res);
      this.createTreeMesh(res);
    }

    // B. Granite Rock Boulders (composite 4-part model)
    const rockCount = 45;
    for (let i = 0; i < rockCount; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 14 + rnd() * 100;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.abs(x - 50) < 16 || isProtectedSpawnZone(x, z) || RailwayNetworkGenerator.isProtectedRailwayZone(x, z)) continue;
      const y = getTerrainHeight(x, z, this.seed);

      const resId = `res_rock_${idCounter++}`;
      const res: HarvestableResource = {
        id: resId,
        type: 'rock',
        position: [x, y, z],
        health: 120,
        maxHealth: 120,
        yieldItem: 'stone',
        yieldAmount: 3,
        requiredTool: 'pickaxe',
      };
      this.resources.push(res);
      this.createRockMesh(res);
    }

    // C. Salvaged Metal Wreckages (3-part vehicle/industrial debris)
    const metalCount = 30;
    for (let i = 0; i < metalCount; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 20 + rnd() * 95;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (isProtectedSpawnZone(x, z) || RailwayNetworkGenerator.isProtectedRailwayZone(x, z)) continue;
      const y = getTerrainHeight(x, z, this.seed);

      const resId = `res_metal_${idCounter++}`;
      const res: HarvestableResource = {
        id: resId,
        type: 'metal_scrap',
        position: [x, y, z],
        health: 140,
        maxHealth: 140,
        yieldItem: 'metal_scrap',
        yieldAmount: 3,
        requiredTool: 'pickaxe',
      };
      this.resources.push(res);
      this.createMetalWreckMesh(res);
    }

    // D. Wild Berry Bushes
    const bushCount = 25;
    for (let i = 0; i < bushCount; i++) {
      const angle = rnd() * Math.PI * 2;
      const dist = 10 + rnd() * 80;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (isProtectedSpawnZone(x, z) || RailwayNetworkGenerator.isProtectedRailwayZone(x, z)) continue;
      const y = getTerrainHeight(x, z, this.seed);

      const resId = `res_bush_${idCounter++}`;
      const res: HarvestableResource = {
        id: resId,
        type: 'berry_bush',
        position: [x, y, z],
        health: 40,
        maxHealth: 40,
        yieldItem: 'wild_berries',
        yieldAmount: 3,
        requiredTool: 'none',
      };
      this.resources.push(res);
      this.createBerryBushMesh(res);
    }

    // E. Abandoned Outpost Ruin & Supply Caches
    this.createAbandonedRuin(0, 0);
  }

  private createTreeMesh(res: HarvestableResource) {
    const seed = Math.abs(Math.round(res.position[0] * 17 + res.position[2] * 31));
    const group = buildRealisticTree('dense_forest', seed);
    group.position.set(res.position[0], res.position[1], res.position[2]);
    const scale = 0.85 + Math.random() * 0.35;
    group.scale.set(scale, scale, scale);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createRockMesh(res: HarvestableResource) {
    const group = buildRealisticRock();
    group.position.set(res.position[0], res.position[1], res.position[2]);
    const scale = 0.85 + Math.random() * 0.4;
    group.scale.setScalar(scale);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createMetalWreckMesh(res: HarvestableResource) {
    const group = buildRealisticScrapWreck();
    group.position.set(res.position[0], res.position[1], res.position[2]);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createBerryBushMesh(res: HarvestableResource) {
    const group = buildRealisticBerryBush();
    group.position.set(res.position[0], res.position[1], res.position[2]);
    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createAbandonedRuin(cx: number, cz: number) {
    // Ruined shelter pillars near origin with Sobel granite PBR
    const stonePBR = getStonePBR();
    const pillarMat = new THREE.MeshStandardMaterial({
      map: stonePBR.albedo,
      normalMap: stonePBR.normal,
      roughnessMap: stonePBR.roughness,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughness: 0.9,
      metalness: 0.08,
    });

    const pillarPositions: [number, number][] = [
      [cx - 5, cz - 5],
      [cx + 5, cz - 5],
      [cx - 5, cz + 5],
      [cx + 5, cz + 5],
    ];

    pillarPositions.forEach(([px, pz]) => {
      const py = getTerrainHeight(px, pz, this.seed);
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), pillarMat);
      pillar.position.set(px, py + 1.6, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      this.scene.add(pillar);
    });

    // Abandoned initial starter crate
    const crateY = getTerrainHeight(cx - 2, cz - 2, this.seed);
    const crateRes: HarvestableResource = {
      id: 'res_starter_crate',
      type: 'supply_crate',
      position: [cx - 2, crateY, cz - 2],
      health: 50,
      maxHealth: 50,
      yieldItem: 'canned_beans',
      yieldAmount: 2,
      requiredTool: 'none',
    };
    this.resources.push(crateRes);

    const woodPBR = getWoodPBR();
    const crateGroup = new THREE.Group();
    crateGroup.position.set(cx - 2, crateY, cz - 2);
    const crateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.8, 0.9),
      new THREE.MeshStandardMaterial({
        map: woodPBR.albedo,
        normalMap: woodPBR.normal,
        roughnessMap: woodPBR.roughness,
        roughness: 0.82,
      })
    );
    crateMesh.position.y = 0.4;
    crateMesh.castShadow = true;
    crateGroup.add(crateMesh);
    this.scene.add(crateGroup);
    this.resourceMeshes.set(crateRes.id, crateGroup);
  }

  public damageResource(resourceId: string, amount: number): HarvestableResource | null {
    const res = this.resources.find((r) => r.id === resourceId);
    if (!res) return null;

    res.health = Math.max(0, res.health - amount);
    const mesh = this.resourceMeshes.get(resourceId);

    if (mesh) {
      // Impact shake
      mesh.rotation.z += (Math.random() - 0.5) * 0.15;
      setTimeout(() => {
        if (mesh) mesh.rotation.z = 0;
      }, 100);

      // Depleted
      if (res.health <= 0) {
        this.scene.remove(mesh);
        this.resourceMeshes.delete(resourceId);
        this.resources = this.resources.filter((r) => r.id !== resourceId);
      }
    }

    return res;
  }

  public dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.waterMesh);
    this.mesh.geometry.dispose();
    this.waterMesh.geometry.dispose();

    this.resourceMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.resourceMeshes.clear();
  }
}
