/**
 * Streaming Enterable Building Interior & Exterior Collision Engine.
 *
 * Makes every building across Earth (real OpenStreetMap footprints, regional city blocks,
 * and rural POIs) physically solid from the outside and cleanly enterable [E] with a
 * deterministic, regionally-styled, furnished, multi-room & multi-floor 3D interior.
 *
 * Memory-bounded: only registers exterior colliders within 42m and instantiates at most
 * 1 active interior stage at Y = -64m (preserving exact world X/Z lat/lon telemetry),
 * disposing cleanly on exit.
 */

import * as THREE from 'three';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { WorldPersistence } from './WorldPersistence';
import { TerrainGenerator } from './TerrainGenerator';
import { BuildingArchetype, EnterableBuildingDef } from './RealEarthBuildings';

export const INTERIOR_BASE_Y = -64.0;

interface LootNode {
  id: string;
  label: string;
  localPos: [number, number, number];
  worldPos: THREE.Vector3;
  looted: boolean;
  mesh: THREE.Object3D;
  items: Array<{ id: string; qty: number }>;
}

interface ActiveInteriorSession {
  def: EnterableBuildingDef;
  group: THREE.Group;
  width: number;
  depth: number;
  floors: number;
  floorHeight: number;
  returnPos: THREE.Vector3;
  exitLocalPos: THREE.Vector3;
  exitWorldPos: THREE.Vector3;
  colliderIds: string[];
  lootNodes: LootNode[];
  restSpotWorldPos: THREE.Vector3 | null;
  lights: THREE.PointLight[];
}

export interface InteriorInteractResult {
  handled: boolean;
  message?: string;
  enteredBuilding?: boolean;
  exitedBuilding?: boolean;
  teleportTarget?: THREE.Vector3;
  teleportYaw?: number;
  collectedItems?: Array<{ id: string; qty: number }>;
  rested?: boolean;
}

const SHARED_INT_MATS = new Map<string, THREE.Material>();
function getIntMat(key: string, create: () => THREE.Material): THREE.Material {
  let m = SHARED_INT_MATS.get(key);
  if (!m) {
    m = create();
    m.userData.__sharedResource = true;
    SHARED_INT_MATS.set(key, m);
  }
  return m;
}

function hashId(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class InteriorStreamingManager {
  private scene: THREE.Scene;
  private physics: UnifiedPhysicsManager;
  private persistence: WorldPersistence;

  private knownBuildings: EnterableBuildingDef[] = [];
  private activeExtColliderIds: Set<string> = new Set();
  private activeSession: ActiveInteriorSession | null = null;
  private colliderSyncTimer = 0;

  constructor(
    scene: THREE.Scene,
    physics: UnifiedPhysicsManager,
    persistence: WorldPersistence
  ) {
    this.scene = scene;
    this.physics = physics;
    this.persistence = persistence;
  }

  public isInsideInterior(playerY: number): boolean {
    return Boolean(this.activeSession) && playerY <= -35.0;
  }

  public getActiveBuildingDef(): EnterableBuildingDef | null {
    return this.activeSession ? this.activeSession.def : null;
  }

  /**
   * Updates nearby exterior building colliders (within 42m) so outdoor city walls are solid
   * while bounding total registered colliders cleanly.
   */
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    buildings: EnterableBuildingDef[],
    powerGridStability: number = 1.0,
    maxLocalLights: number = 4
  ): void {
    this.knownBuildings = buildings;

    if (this.activeSession) {
      const dimMult = powerGridStability < 0.4 ? 0.45 : 1.0;
      const allowLights = Math.min(maxLocalLights, this.activeSession.lights.length);
      for (let i = 0; i < this.activeSession.lights.length; i++) {
        const l = this.activeSession.lights[i];
        l.visible = i < allowLights;
        l.intensity = (i === 0 ? 1.8 : 1.3) * dimMult;
      }
      return;
    }

    this.colliderSyncTimer += delta;
    if (this.colliderSyncTimer < 0.25) return;
    this.colliderSyncTimer = 0;

    // Collect up to 14 closest buildings within 42m for crisp outdoor wall collisions
    const nearby: Array<{ b: EnterableBuildingDef; dSq: number }> = [];
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const dx = b.worldX - playerPos.x;
      const dz = b.worldZ - playerPos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq <= 44 * 44) {
        nearby.push({ b, dSq });
      }
    }
    nearby.sort((a, b) => a.dSq - b.dSq);
    const keepIds = new Set<string>();
    const limit = Math.min(14, nearby.length);
    for (let i = 0; i < limit; i++) {
      const b = nearby[i].b;
      const colId = `ext_bld_${b.id}`;
      keepIds.add(colId);
      if (!this.activeExtColliderIds.has(colId)) {
        this.physics.registerBoxCollider(
          colId,
          'building',
          [b.worldX, b.baseY + b.height * 0.5, b.worldZ],
          Math.max(2, b.width - 0.35),
          b.height,
          Math.max(2, b.depth - 0.35),
          b.rotationY,
          false
        );
        this.activeExtColliderIds.add(colId);
      }
    }

    // Prune out-of-range exterior colliders
    this.activeExtColliderIds.forEach((colId) => {
      if (!keepIds.has(colId)) {
        this.physics.unregisterCollider(colId);
        this.activeExtColliderIds.delete(colId);
      }
    });
  }

  /**
   * Returns floor/stair elevation while inside a streamed building interior.
   */
  public getFloorElevationAt(x: number, y: number, z: number): number | null {
    const sess = this.activeSession;
    if (!sess || y > -35.0) return null;

    const lx = x - sess.def.worldX;
    const lz = z - sess.def.worldZ;
    const hw = sess.width * 0.5;
    const hd = sess.depth * 0.5;
    if (Math.abs(lx) > hw + 1.0 || Math.abs(lz) > hd + 1.0) {
      return INTERIOR_BASE_Y + 0.1;
    }

    if (sess.floors >= 2) {
      // Staircase corridor along right wall: X in [hw - 2.3, hw - 0.35], Z in [-hd * 0.35, hd * 0.35]
      const stairSpanZ = Math.max(3.6, sess.depth * 0.52);
      const stairMinZ = -stairSpanZ * 0.5;
      const stairMaxZ = stairSpanZ * 0.5;
      if (lx >= hw - 2.35 && lx <= hw - 0.2 && lz >= stairMinZ - 0.35 && lz <= stairMaxZ + 0.35) {
        const t = THREE.MathUtils.clamp((stairMaxZ - lz) / stairSpanZ, 0, 1);
        return INTERIOR_BASE_Y + 0.1 + t * sess.floorHeight;
      }

      // Upper mezzanine floor covers rear half + left landing (opening over stairs & foyer)
      const onUpperLanding =
        lz <= -0.3 ||
        (lx <= 0 && lz <= hd * 0.45);
      if (onUpperLanding && y >= INTERIOR_BASE_Y + sess.floorHeight - 0.85) {
        return INTERIOR_BASE_Y + 0.1 + sess.floorHeight;
      }
    }

    return INTERIOR_BASE_Y + 0.1;
  }

  public getInteriorCeilingY(): number {
    if (!this.activeSession) return 0;
    return INTERIOR_BASE_Y + this.activeSession.floors * this.activeSession.floorHeight;
  }

  /**
   * Returns nearest interactive prompt for exterior doorways OR inside an active interior.
   */
  public getNearbyPrompt(playerPos: THREE.Vector3): string | null {
    const sess = this.activeSession;
    if (sess && playerPos.y <= -35.0) {
      const distExit = Math.hypot(
        playerPos.x - sess.exitWorldPos.x,
        playerPos.z - sess.exitWorldPos.z
      );
      if (distExit < 2.9) {
        return `[E] Exit ${sess.def.name} to Street`;
      }
      for (const node of sess.lootNodes) {
        if (node.looted) continue;
        const d = Math.hypot(playerPos.x - node.worldPos.x, playerPos.z - node.worldPos.z);
        if (d < 2.6 && Math.abs(playerPos.y - node.worldPos.y) < 1.9) {
          return `[E] Search ${node.label}`;
        }
      }
      if (sess.restSpotWorldPos) {
        const dRest = Math.hypot(playerPos.x - sess.restSpotWorldPos.x, playerPos.z - sess.restSpotWorldPos.z);
        if (dRest < 2.5 && Math.abs(playerPos.y - sess.restSpotWorldPos.y) < 1.8) {
          return '[E] Rest & Recover Stamina';
        }
      }
      return null;
    }

    const nearest = this.findNearestDoorway(playerPos, 3.6);
    if (nearest) {
      const floorTag = nearest.floors > 1 ? `${nearest.floors}F` : '1F';
      return `[E] Enter ${nearest.name} (${nearest.archetype.toUpperCase()} · ${floorTag})`;
    }
    return null;
  }

  public handleInteract(playerPos: THREE.Vector3): InteriorInteractResult {
    const sess = this.activeSession;
    if (sess && playerPos.y <= -35.0) {
      const distExit = Math.hypot(
        playerPos.x - sess.exitWorldPos.x,
        playerPos.z - sess.exitWorldPos.z
      );
      if (distExit < 3.0) {
        const exitTarget = sess.returnPos.clone();
        const bName = sess.def.name;
        this.disposeActiveSession();
        return {
          handled: true,
          exitedBuilding: true,
          teleportTarget: exitTarget,
          message: `Stepped outside ${bName}.`,
        };
      }

      for (const node of sess.lootNodes) {
        if (node.looted) continue;
        const d = Math.hypot(playerPos.x - node.worldPos.x, playerPos.z - node.worldPos.z);
        if (d < 2.7 && Math.abs(playerPos.y - node.worldPos.y) < 2.0) {
          node.looted = true;
          node.mesh.visible = false;
          sess.def.isLooted = sess.lootNodes.every((n) => n.looted);
          if (sess.def.isLooted) {
            this.persistence.markPoiOpened(sess.def.id, sess.def.worldX, sess.def.worldZ);
          }
          return {
            handled: true,
            collectedItems: node.items,
            message: `Searched ${node.label}: gathered supplies!`,
          };
        }
      }

      if (sess.restSpotWorldPos) {
        const dRest = Math.hypot(playerPos.x - sess.restSpotWorldPos.x, playerPos.z - sess.restSpotWorldPos.z);
        if (dRest < 2.6 && Math.abs(playerPos.y - sess.restSpotWorldPos.y) < 1.9) {
          return {
            handled: true,
            rested: true,
            message: `Rested inside ${sess.def.name} (+30 Stamina & +15 Health).`,
          };
        }
      }

      return { handled: false };
    }

    const nearest = this.findNearestDoorway(playerPos, 3.8);
    if (!nearest) return { handled: false };

    return this.enterBuilding(nearest, playerPos);
  }

  private findNearestDoorway(playerPos: THREE.Vector3, maxDist: number): EnterableBuildingDef | null {
    let best: EnterableBuildingDef | null = null;
    let bestDist = maxDist;
    for (let i = 0; i < this.knownBuildings.length; i++) {
      const b = this.knownBuildings[i];
      if (Math.abs(playerPos.y - b.baseY) > 4.5) continue;
      const d = Math.hypot(playerPos.x - b.doorWorldX, playerPos.z - b.doorWorldZ);
      if (d < bestDist) {
        bestDist = d;
        best = b;
      }
    }
    return best;
  }

  public enterBuilding(def: EnterableBuildingDef, currentPos: THREE.Vector3): InteriorInteractResult {
    this.disposeActiveSession();

    const width = THREE.MathUtils.clamp(def.width, 9.0, 18.0);
    const depth = THREE.MathUtils.clamp(def.depth, 8.5, 16.0);
    const floors = Math.min(2, Math.max(1, def.floors));
    const floorHeight = 3.5;
    const totalHeight = floors * floorHeight;

    const group = new THREE.Group();
    group.name = `interior_stage_${def.id}`;
    group.position.set(def.worldX, INTERIOR_BASE_Y, def.worldZ);

    const colliderIds: string[] = [];
    const registerIntCollider = (suffix: string, lx: number, ly: number, lz: number, w: number, h: number, d: number) => {
      const id = `int_${def.id}_${suffix}`;
      colliderIds.push(id);
      this.physics.registerBoxCollider(
        id,
        'wall',
        [def.worldX + lx, INTERIOR_BASE_Y + ly, def.worldZ + lz],
        w,
        h,
        d,
        0,
        false
      );
    };

    const pal = def.palette;
    const wallMat = getIntMat(`int_wall_${pal.wallPrimary.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({ color: pal.wallPrimary, roughness: 0.85, side: THREE.DoubleSide })
    );
    const floorColor = def.archetype === 'hospital' ? 0xdbe4ea : def.archetype === 'warehouse' ? 0x64686d : 0x7c5c44;
    const floorMat = getIntMat(`int_floor_${floorColor.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.72 })
    );
    const trimMat = getIntMat(`int_trim_${pal.trimHex.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({ color: pal.trimHex, roughness: 0.55 })
    );
    const woodMat = getIntMat('int_wood', () =>
      new THREE.MeshStandardMaterial({ color: 0x6f4a31, roughness: 0.78 })
    );
    const metalMat = getIntMat('int_metal', () =>
      new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.42, metalness: 0.65 })
    );
    const fabricMat = getIntMat(`int_fabric_${pal.accentHex.toString(16)}`, () =>
      new THREE.MeshStandardMaterial({ color: pal.accentHex, roughness: 0.9 })
    );
    const exitMat = getIntMat('int_exit_door', () =>
      new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x059669, emissiveIntensity: 0.65, roughness: 0.4 })
    );
    const crateMat = getIntMat('int_crate', () =>
      new THREE.MeshStandardMaterial({ color: 0xc28e3c, roughness: 0.68 })
    );
    const windowMat = getIntMat('int_glow_window', () =>
      new THREE.MeshStandardMaterial({ color: 0x8cc8e8, emissive: 0x264b61, emissiveIntensity: 0.45, roughness: 0.15 })
    );

    const hw = width * 0.5;
    const hd = depth * 0.5;

    // 1. Solid Ground Floor, Ceiling, and Outer Enclosure Walls
    const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.2, depth + 0.4), floorMat);
    floorMesh.position.y = 0.0;
    const ceilingMesh = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.25, depth + 0.4), trimMat);
    ceilingMesh.position.y = totalHeight;
    group.add(floorMesh, ceilingMesh);

    const wallThick = 0.35;
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(width, totalHeight, wallThick), wallMat);
    northWall.position.set(0, totalHeight * 0.5, -hd);
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(width, totalHeight, wallThick), wallMat);
    southWall.position.set(0, totalHeight * 0.5, hd);
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, totalHeight, depth), wallMat);
    westWall.position.set(-hw, totalHeight * 0.5, 0);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, totalHeight, depth), wallMat);
    eastWall.position.set(hw, totalHeight * 0.5, 0);
    group.add(northWall, southWall, westWall, eastWall);

    registerIntCollider('north', 0, totalHeight * 0.5, -hd, width, totalHeight, wallThick);
    registerIntCollider('south', 0, totalHeight * 0.5, hd, width, totalHeight, wallThick);
    registerIntCollider('west', -hw, totalHeight * 0.5, 0, wallThick, totalHeight, depth);
    registerIntCollider('east', hw, totalHeight * 0.5, 0, wallThick, totalHeight, depth);

    // Interior backlit windows on East/West walls
    for (const sideX of [-hw + 0.2, hw - 0.2]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.35, depth * 0.45), windowMat);
      win.position.set(sideX, 1.85, 0);
      group.add(win);
    }

    // Exit door mounted cleanly at front (+Z) center
    const exitLocalPos = new THREE.Vector3(0, 0.1, hd - 0.9);
    const exitDoor = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.5, 0.16), exitMat);
    exitDoor.position.set(0, 1.35, hd - 0.22);
    const exitFrame = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.75, 0.22), trimMat);
    exitFrame.position.set(0, 1.4, hd - 0.24);
    group.add(exitFrame, exitDoor);

    // 2. Interior Partition Wall (creating a front lobby/room and rear room with central open doorway)
    const partLeftW = Math.max(1.5, hw - 1.35);
    const partLeft = new THREE.Mesh(new THREE.BoxGeometry(partLeftW, 3.3, 0.22), wallMat);
    partLeft.position.set(-hw + partLeftW * 0.5, 1.65, -0.4);
    const partRightW = Math.max(1.5, hw - 2.9);
    const partRight = new THREE.Mesh(new THREE.BoxGeometry(partRightW, 3.3, 0.22), wallMat);
    partRight.position.set(hw - 2.35 - partRightW * 0.5, 1.65, -0.4);
    group.add(partLeft, partRight);
    registerIntCollider('partL', -hw + partLeftW * 0.5, 1.65, -0.4, partLeftW, 3.3, 0.22);
    if (partRightW > 0.6) {
      registerIntCollider('partR', hw - 2.35 - partRightW * 0.5, 1.65, -0.4, partRightW, 3.3, 0.22);
    }

    // 3. Optional 2nd Floor Mezzanine + Solid Walkable Interior Staircase
    if (floors >= 2) {
      const stairSpanZ = Math.max(3.6, depth * 0.52);
      const stairStartZ = stairSpanZ * 0.5;
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const stepMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.75, 0.24, stairSpanZ / steps + 0.08),
          woodMat
        );
        stepMesh.position.set(hw - 1.25, 0.12 + t * floorHeight, stairStartZ - t * stairSpanZ);
        group.add(stepMesh);
      }

      // Upper floor slabs (rear full half + front-left landing)
      const upperRear = new THREE.Mesh(new THREE.BoxGeometry(width - 0.4, 0.22, hd - 0.3), floorMat);
      upperRear.position.set(0, floorHeight + 0.02, -hd * 0.5 - 0.15);
      const upperFrontLeft = new THREE.Mesh(new THREE.BoxGeometry(hw - 0.4, 0.22, hd * 0.5), floorMat);
      upperFrontLeft.position.set(-hw * 0.5, floorHeight + 0.02, hd * 0.22);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.95, hd * 0.5), metalMat);
      rail.position.set(-0.2, floorHeight + 0.55, hd * 0.22);
      group.add(upperRear, upperFrontLeft, rail);
    }

    // 4. Archetype-Specific Furnishing & Deterministic Loot Nodes
    const seed = hashId(def.id);
    const lootNodes: LootNode[] = [];
    let restSpotWorldPos: THREE.Vector3 | null = null;
    const isAlreadyLooted = def.isLooted || this.persistence.openedPoiIds.has(def.id);

    const addProp = (mesh: THREE.Object3D, lx: number, ly: number, lz: number, solidW?: number, solidH?: number, solidD?: number, colTag?: string) => {
      mesh.position.set(lx, ly, lz);
      group.add(mesh);
      if (solidW && solidH && solidD && colTag) {
        registerIntCollider(colTag, lx, ly + solidH * 0.5, lz, solidW, solidH, solidD);
      }
    };

    const buildLootItems = (arch: BuildingArchetype, idx: number): Array<{ id: string; qty: number }> => {
      if (arch === 'hospital') return [{ id: 'medkit', qty: 1 }, { id: 'medical_bandage', qty: 2 }];
      if (arch === 'police') return [{ id: 'crossbow_bolts', qty: 10 }, { id: 'metal_scrap', qty: 4 }];
      if (arch === 'shop' || arch === 'cafe') return [{ id: 'canned_beans', qty: 2 }, { id: 'clean_water', qty: 2 }];
      if (arch === 'office' || arch === 'school' || arch === 'media') return [{ id: 'electronic_parts', qty: 4 }, { id: 'wood', qty: 2 }];
      if (arch === 'warehouse') return [{ id: 'metal_scrap', qty: 5 }, { id: 'nails_bolts', qty: 6 }];
      return idx % 2 === 0
        ? [{ id: 'canned_beans', qty: 1 }, { id: 'clean_water', qty: 1 }]
        : [{ id: 'wood', qty: 3 }, { id: 'medical_bandage', qty: 1 }];
    };

    const addLootCrate = (idx: number, label: string, lx: number, ly: number, lz: number) => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.72, 0.9), crateMat);
      box.position.set(lx, ly + 0.36, lz);
      box.visible = !isAlreadyLooted;
      group.add(box);
      lootNodes.push({
        id: `${def.id}_loot_${idx}`,
        label,
        localPos: [lx, ly, lz],
        worldPos: new THREE.Vector3(def.worldX + lx, INTERIOR_BASE_Y + ly, def.worldZ + lz),
        looted: isAlreadyLooted,
        mesh: box,
        items: buildLootItems(def.archetype, idx),
      });
    };

    if (def.archetype === 'hospital') {
      // Reception desk + medical exam beds
      addProp(new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.05, 0.9), trimMat), -2.2, 0.55, 1.6, 3.4, 1.1, 0.9, 'desk');
      for (let i = 0; i < 2; i++) {
        const bx = -hw + 2.2 + i * 3.1;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 2.3), trimMat);
        addProp(bed, bx, 0.35, -hd + 2.0, 1.3, 0.7, 2.3, `medbed_${i}`);
      }
      restSpotWorldPos = new THREE.Vector3(def.worldX - hw + 2.2, INTERIOR_BASE_Y + 0.1, def.worldZ - hd + 2.0);
      addLootCrate(0, 'Emergency Medicine Cabinet', -hw + 1.4, 0.1, 1.0);
      addLootCrate(1, 'Surgical Supply Locker', 0.4, floors >= 2 ? floorHeight + 0.1 : 0.1, -hd + 1.5);
    } else if (def.archetype === 'shop' || def.archetype === 'cafe') {
      // Counter + retail shelves or bistro tables
      addProp(new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.05, 0.9), woodMat), -2.4, 0.55, 1.4, 3.6, 1.1, 0.9, 'counter');
      for (let i = 0; i < 2; i++) {
        const sx = -hw + 2.0 + i * 2.8;
        const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.0, 2.6), metalMat);
        addProp(shelf, sx, 1.0, -hd + 2.0, 0.8, 2.0, 2.6, `shelf_${i}`);
      }
      addLootCrate(0, 'Store Provisions Crate', -hw + 1.5, 0.1, -1.6);
      addLootCrate(1, 'Stockroom Pantry Box', 0.2, floors >= 2 ? floorHeight + 0.1 : 0.1, -hd + 1.6);
    } else if (def.archetype === 'police' || def.archetype === 'office' || def.archetype === 'school' || def.archetype === 'media') {
      // Duty desks + server/locker/broadcast cabinets
      for (let i = 0; i < 2; i++) {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.8, 1.0), woodMat);
        addProp(desk, -hw + 2.2 + i * 3.0, 0.45, 1.5, 2.1, 0.8, 1.0, `office_desk_${i}`);
      }
      const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 0.75), metalMat);
      addProp(rack, -1.5, 1.1, -hd + 1.2, 2.6, 2.1, 0.75, 'locker_rack');
      if (def.archetype === 'media') {
        const studioWall = new THREE.Mesh(
          new THREE.BoxGeometry(3.4, 1.8, 0.25),
          new THREE.MeshBasicMaterial({ color: 0x0284c7 })
        );
        addProp(studioWall, 0.8, 1.35, -hd + 1.15, 3.4, 1.8, 0.25, 'media_monitor_wall');
      }
      addLootCrate(
        0,
        def.archetype === 'police' ? 'Armory Locker' : def.archetype === 'media' ? 'Broadcast Uplink Case' : 'Electronics Cabinet',
        -hw + 1.4,
        0.1,
        -hd + 1.6
      );
      if (floors >= 2) {
        addLootCrate(1, def.archetype === 'media' ? 'ENG Camera & Transmitter Locker' : 'Upper Archive Case', -1.8, floorHeight + 0.1, -hd + 1.8);
      }
    } else if (def.archetype === 'warehouse') {
      // Tall industrial storage racks + forklift pallets
      for (let i = 0; i < 2; i++) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.5, 4.2), metalMat);
        addProp(rack, -hw + 2.2 + i * 3.4, 1.3, -1.4, 1.3, 2.5, 4.2, `wh_rack_${i}`);
      }
      addLootCrate(0, 'Freight Supply Pallet', -0.4, 0.1, -hd + 1.8);
      addLootCrate(1, 'Maintenance Toolbox', -hw + 1.6, 0.1, 1.8);
    } else {
      // Residential / Apartment / Cabin: Sofa, table, kitchen counter, and bed
      addProp(new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.82, 0.95), fabricMat), -hw + 2.1, 0.46, 1.4, 2.5, 0.85, 0.95, 'sofa');
      addProp(new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.78, 1.05), woodMat), 0.2, 0.44, 1.6, 1.7, 0.8, 1.05, 'dining_table');

      const bedY = floors >= 2 ? floorHeight + 0.1 : 0.1;
      const bedX = -hw + 2.1;
      const bedZ = -hd + 1.8;
      addProp(new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.58, 2.2), fabricMat), bedX, bedY + 0.29, bedZ, 1.75, 0.6, 2.2, 'bed');
      restSpotWorldPos = new THREE.Vector3(def.worldX + bedX, INTERIOR_BASE_Y + bedY, def.worldZ + bedZ);

      addLootCrate(0, 'Kitchen Pantry', 0.4, 0.1, -hd + 1.4);
      addLootCrate(1, 'Bedroom Footlocker', -hw + 3.8, bedY, -hd + 1.6);
    }

    // 5. Interior Ceiling Fixture & Budgeted Lighting
    const lights: THREE.PointLight[] = [];
    const lightPositions: Array<[number, number, number]> = [[0, floorHeight - 0.35, 0.4]];
    if (floors >= 2) {
      lightPositions.push([-1.2, floorHeight * 2 - 0.35, -1.2]);
    }
    for (let i = 0; i < lightPositions.length; i++) {
      const [lx, ly, lz] = lightPositions[i];
      const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.35), windowMat);
      fixture.position.set(lx, ly + 0.12, lz);
      group.add(fixture);

      const pt = new THREE.PointLight(0xffe8c2, 1.8, 22, 1.4);
      pt.position.set(lx, ly - 0.25, lz);
      group.add(pt);
      lights.push(pt);
    }

    this.scene.add(group);

    // Preserve exact surface position for clean return outdoors
    const surfaceY = TerrainGenerator.getHeight(currentPos.x, currentPos.z);
    const returnPos = new THREE.Vector3(def.doorWorldX, Math.max(surfaceY, def.baseY) + 0.15, def.doorWorldZ);
    const entryPlayerPos = new THREE.Vector3(def.worldX, INTERIOR_BASE_Y + 0.25, def.worldZ + hd - 1.6);

    this.activeSession = {
      def,
      group,
      width,
      depth,
      floors,
      floorHeight,
      returnPos,
      exitLocalPos,
      exitWorldPos: new THREE.Vector3(def.worldX + exitLocalPos.x, INTERIOR_BASE_Y + 0.1, def.worldZ + exitLocalPos.z),
      colliderIds,
      lootNodes,
      restSpotWorldPos,
      lights,
    };

    void seed;
    return {
      handled: true,
      enteredBuilding: true,
      teleportTarget: entryPlayerPos,
      teleportYaw: 0, // Facing -Z into building interior
      message: `Entered ${def.name} (${floors}F Interior). Explore rooms or [E] at green exit door to leave.`,
    };
  }

  public disposeActiveSession(): void {
    if (!this.activeSession) return;
    const sess = this.activeSession;
    for (const id of sess.colliderIds) {
      this.physics.unregisterCollider(id);
    }
    this.scene.remove(sess.group);
    sess.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => { if (!m.userData?.__sharedResource) m.dispose(); });
        } else if (obj.material && !obj.material.userData?.__sharedResource) {
          obj.material.dispose();
        }
      }
    });
    this.activeSession = null;
  }

  public dispose(): void {
    this.disposeActiveSession();
    this.activeExtColliderIds.forEach((id) => {
      this.physics.unregisterCollider(id);
    });
    this.activeExtColliderIds.clear();
  }
}
