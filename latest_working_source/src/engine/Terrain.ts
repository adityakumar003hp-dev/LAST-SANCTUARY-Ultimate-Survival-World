import * as THREE from 'three';
import { HarvestableResource } from '../types/game';
import { 
  getTerrainTexture, 
  getWoodPlankTexture, 
  getStoneTexture, 
  getMetalScrapTexture,
  getBarkPBR,
  getRockPBR,
  getWaterRippleNormalMap
} from '../utils/proceduralTextures';

import { TerrainGenerator } from './world/TerrainGenerator';
import { isProtectedSpawnZone } from './world/ProtectedSpawnZones';

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

    // 1. Generate Terrain Mesh (240x240m world, 90x90 segments)
    const size = 260;
    const segments = 90;
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

    const terrainTex = getTerrainTexture();
    terrainTex.repeat.set(24, 24);

    const material = new THREE.MeshStandardMaterial({
      map: terrainTex,
      roughness: 0.88,
      metalness: 0.08,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    // 2. Winding River Water Plane with Realistic Ripple Normal Map
    const waterGeo = new THREE.PlaneGeometry(35, size);
    waterGeo.rotateX(-Math.PI / 2);
    const waterRipple = getWaterRippleNormalMap();
    waterRipple.wrapS = THREE.RepeatWrapping;
    waterRipple.wrapT = THREE.RepeatWrapping;
    waterRipple.repeat.set(4, 18);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1b4965,
      roughness: 0.08,
      metalness: 0.25,
      envMapIntensity: 1.4,
      normalMap: waterRipple,
      normalScale: new THREE.Vector2(0.85, 0.85),
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
      // Skip river and protected compounds (apartment building and military base)
      if (Math.abs(x - 50) < 16 || isProtectedSpawnZone(x, z)) continue;
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
      if (Math.abs(x - 50) < 16 || isProtectedSpawnZone(x, z)) continue;
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
      if (isProtectedSpawnZone(x, z)) continue;
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
      if (isProtectedSpawnZone(x, z)) continue;
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

  // Reusable Shared Geometries & Materials Pools for Zero Duplicate Allocations
  private static sharedTrunkGeo: THREE.CylinderGeometry | null = null;
  private static sharedF1Geo: THREE.ConeGeometry | null = null;
  private static sharedF2Geo: THREE.ConeGeometry | null = null;
  private static sharedF3Geo: THREE.ConeGeometry | null = null;
  private static sharedTrunkMat: THREE.MeshStandardMaterial | null = null;
  private static sharedLeafMat: THREE.MeshStandardMaterial | null = null;

  private static sharedRock1Geo: THREE.DodecahedronGeometry | null = null;
  private static sharedRock2Geo: THREE.DodecahedronGeometry | null = null;
  private static sharedRock3Geo: THREE.DodecahedronGeometry | null = null;
  private static sharedRockMat: THREE.MeshStandardMaterial | null = null;

  private static sharedChassisGeo: THREE.BoxGeometry | null = null;
  private static sharedHoodGeo: THREE.BoxGeometry | null = null;
  private static sharedWheelGeo: THREE.CylinderGeometry | null = null;
  private static sharedMetalMat: THREE.MeshStandardMaterial | null = null;
  private static sharedHubMat: THREE.MeshStandardMaterial | null = null;

  private createTreeMesh(res: HarvestableResource) {
    const group = new THREE.Group();
    group.position.set(res.position[0], res.position[1], res.position[2]);

    if (!WorldTerrain.sharedTrunkMat) {
      const barkPBR = getBarkPBR();
      WorldTerrain.sharedTrunkMat = new THREE.MeshStandardMaterial({
        map: barkPBR.albedo,
        normalMap: barkPBR.normal,
        roughnessMap: barkPBR.roughness,
        roughness: 0.88,
        metalness: 0.05,
      });
      WorldTerrain.sharedLeafMat = new THREE.MeshStandardMaterial({
        color: 0x244a24,
        roughness: 0.75,
        metalness: 0.05,
        flatShading: true,
      });

      WorldTerrain.sharedTrunkGeo = new THREE.CylinderGeometry(0.28, 0.42, 3.2, 7);
      WorldTerrain.sharedTrunkGeo.translate(0, 1.6, 0);

      WorldTerrain.sharedF1Geo = new THREE.ConeGeometry(2.4, 2.6, 7);
      WorldTerrain.sharedF1Geo.translate(0, 3.2, 0);

      WorldTerrain.sharedF2Geo = new THREE.ConeGeometry(1.9, 2.3, 7);
      WorldTerrain.sharedF2Geo.translate(0, 4.4, 0);

      WorldTerrain.sharedF3Geo = new THREE.ConeGeometry(1.3, 2.0, 7);
      WorldTerrain.sharedF3Geo.translate(0, 5.5, 0);
    }

    const trunk = new THREE.Mesh(WorldTerrain.sharedTrunkGeo!, WorldTerrain.sharedTrunkMat!);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const f1 = new THREE.Mesh(WorldTerrain.sharedF1Geo!, WorldTerrain.sharedLeafMat!);
    f1.castShadow = true;
    group.add(f1);

    const f2 = new THREE.Mesh(WorldTerrain.sharedF2Geo!, WorldTerrain.sharedLeafMat!);
    f2.castShadow = true;
    group.add(f2);

    const f3 = new THREE.Mesh(WorldTerrain.sharedF3Geo!, WorldTerrain.sharedLeafMat!);
    f3.castShadow = true;
    group.add(f3);

    const scale = 0.85 + Math.random() * 0.35;
    group.scale.set(scale, scale, scale);
    group.rotation.y = Math.random() * Math.PI * 2;

    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createRockMesh(res: HarvestableResource) {
    const group = new THREE.Group();
    group.position.set(res.position[0], res.position[1], res.position[2]);

    if (!WorldTerrain.sharedRockMat) {
      const rockPBR = getRockPBR();
      WorldTerrain.sharedRockMat = new THREE.MeshStandardMaterial({
        map: rockPBR.albedo,
        normalMap: rockPBR.normal,
        roughnessMap: rockPBR.roughness,
        roughness: 0.85,
        metalness: 0.12,
        flatShading: true,
      });

      WorldTerrain.sharedRock1Geo = new THREE.DodecahedronGeometry(1.3, 1);
      WorldTerrain.sharedRock1Geo.translate(0, 0.9, 0);

      WorldTerrain.sharedRock2Geo = new THREE.DodecahedronGeometry(0.7, 0);
      WorldTerrain.sharedRock2Geo.translate(0.9, 0.5, 0.4);

      WorldTerrain.sharedRock3Geo = new THREE.DodecahedronGeometry(0.5, 0);
      WorldTerrain.sharedRock3Geo.translate(-0.8, 0.35, -0.5);
    }

    const main = new THREE.Mesh(WorldTerrain.sharedRock1Geo!, WorldTerrain.sharedRockMat!);
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    const r2 = new THREE.Mesh(WorldTerrain.sharedRock2Geo!, WorldTerrain.sharedRockMat!);
    r2.castShadow = true;
    group.add(r2);

    const r3 = new THREE.Mesh(WorldTerrain.sharedRock3Geo!, WorldTerrain.sharedRockMat!);
    r3.castShadow = true;
    group.add(r3);

    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createMetalWreckMesh(res: HarvestableResource) {
    const group = new THREE.Group();
    group.position.set(res.position[0], res.position[1], res.position[2]);

    if (!WorldTerrain.sharedMetalMat) {
      const metalTex = getMetalScrapTexture();
      WorldTerrain.sharedMetalMat = new THREE.MeshStandardMaterial({
        map: metalTex,
        roughness: 0.7,
        metalness: 0.55,
      });
      WorldTerrain.sharedHubMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });

      WorldTerrain.sharedChassisGeo = new THREE.BoxGeometry(2.4, 0.8, 1.3);
      WorldTerrain.sharedHoodGeo = new THREE.BoxGeometry(1.1, 0.12, 1.2);
      WorldTerrain.sharedWheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 8);
    }

    const chassis = new THREE.Mesh(WorldTerrain.sharedChassisGeo!, WorldTerrain.sharedMetalMat!);
    chassis.position.set(0, 0.4, 0);
    chassis.rotation.z = 0.1;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    const hood = new THREE.Mesh(WorldTerrain.sharedHoodGeo!, WorldTerrain.sharedMetalMat!);
    hood.position.set(0.6, 0.9, 0);
    hood.rotation.z = -0.25;
    hood.castShadow = true;
    group.add(hood);

    const wheel = new THREE.Mesh(WorldTerrain.sharedWheelGeo!, WorldTerrain.sharedHubMat!);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-0.8, 0.4, 0.7);
    group.add(wheel);

    group.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createBerryBushMesh(res: HarvestableResource) {
    const group = new THREE.Group();
    group.position.set(res.position[0], res.position[1], res.position[2]);

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x336622,
      roughness: 0.75,
      flatShading: true,
    });
    const berryMat = new THREE.MeshStandardMaterial({
      color: 0x991133,
      roughness: 0.3,
      metalness: 0.2,
    });

    // Bush foliage clumps
    const clump1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), leafMat);
    clump1.position.set(0, 0.5, 0);
    clump1.castShadow = true;
    group.add(clump1);

    const clump2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 1), leafMat);
    clump2.position.set(0.35, 0.4, 0.2);
    group.add(clump2);

    // Berry dots
    for (let b = 0; b < 6; b++) {
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), berryMat);
      const theta = (b / 6) * Math.PI * 2;
      berry.position.set(Math.cos(theta) * 0.45, 0.5 + (b % 2) * 0.15, Math.sin(theta) * 0.45);
      group.add(berry);
    }

    this.scene.add(group);
    this.resourceMeshes.set(res.id, group);
  }

  private createAbandonedRuin(cx: number, cz: number) {
    // Ruined shelter pillars near origin
    const stoneTex = getStoneTexture();
    const pillarMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.9,
      metalness: 0.1,
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

    const crateGroup = new THREE.Group();
    crateGroup.position.set(cx - 2, crateY, cz - 2);
    const crateMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.8, 0.9),
      new THREE.MeshStandardMaterial({ map: getWoodPlankTexture(), roughness: 0.8 })
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
