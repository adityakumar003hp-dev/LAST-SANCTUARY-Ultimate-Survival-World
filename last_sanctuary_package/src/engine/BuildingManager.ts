import * as THREE from 'three';
import { PlacedStructure, StructureDefinition } from '../types/game';
import { STRUCTURES } from '../data/structures';
import { ITEMS } from '../data/items';
import { getWoodPlankTexture, getStoneTexture, getMetalScrapTexture, getHazardStripeTexture } from '../utils/proceduralTextures';
import { getTerrainHeight } from './Terrain';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';

export class BuildingManager {
  public scene: THREE.Scene;
  public structures: PlacedStructure[] = [];
  public structureMeshes: Map<string, THREE.Group> = new Map();
  public previewGroup: THREE.Group | null = null;
  public previewMatValid: THREE.MeshBasicMaterial;
  public previewMatInvalid: THREE.MeshBasicMaterial;
  public activeDef: StructureDefinition | null = null;
  public activeRotationY: number = 0;
  public safeZoneRadius: number = 15;
  public safeZoneCenter: THREE.Vector3 = new THREE.Vector3(954, 0, 22);

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.previewMatValid = new THREE.MeshBasicMaterial({
      color: 0x22ee66,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });
    this.previewMatInvalid = new THREE.MeshBasicMaterial({
      color: 0xee2233,
      transparent: true,
      opacity: 0.5,
      wireframe: false,
    });
  }

  // --- Preview & Placement ---

  public setBuildingMode(typeId: string | null) {
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      this.previewGroup = null;
    }

    if (!typeId || !STRUCTURES[typeId]) {
      this.activeDef = null;
      return;
    }

    this.activeDef = STRUCTURES[typeId];
    this.previewGroup = this.createStructureMesh(this.activeDef, true);
    this.scene.add(this.previewGroup);
  }

  public rotatePreview() {
    this.activeRotationY = (this.activeRotationY + Math.PI / 4) % (Math.PI * 2);
  }

  public cancelBuilding() {
    this.setBuildingMode(null);
  }

  public updatePreview(targetPos: THREE.Vector3, isValid: boolean) {
    if (!this.previewGroup || !this.activeDef) return;

    // Grid snapping to 1.0m intervals
    const snapX = Math.round(targetPos.x * 2) / 2;
    const snapZ = Math.round(targetPos.z * 2) / 2;
    const groundY = getTerrainHeight(snapX, snapZ);

    this.previewGroup.position.set(snapX, groundY, snapZ);
    this.previewGroup.rotation.y = this.activeRotationY;

    // Update ghost material
    const targetMat = isValid ? this.previewMatValid : this.previewMatInvalid;
    this.previewGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = targetMat;
      }
    });
  }

  public placeActiveStructure(targetPos: THREE.Vector3): PlacedStructure | null {
    if (!this.activeDef) return null;

    const snapX = Math.round(targetPos.x * 2) / 2;
    const snapZ = Math.round(targetPos.z * 2) / 2;
    const groundY = getTerrainHeight(snapX, snapZ);

    const uid = `struct_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const placed: PlacedStructure = {
      uid,
      typeId: this.activeDef.id,
      position: [snapX, groundY, snapZ],
      rotationY: this.activeRotationY,
      currentHealth: this.activeDef.maxHealth,
      maxHealth: this.activeDef.maxHealth,
      isOpen: false,
      storageItems: this.activeDef.isStorage ? new Array(16).fill(null) : undefined,
    };

    this.structures.push(placed);
    this.instantiatePlacedMesh(placed);
    this.updateSafeZone();

    return placed;
  }

  public loadSavedStructures(savedList: PlacedStructure[]) {
    // Clear existing
    this.structures.forEach((s) => {
      const mesh = this.structureMeshes.get(s.uid);
      if (mesh) this.scene.remove(mesh);
    });
    this.structures = [];
    this.structureMeshes.clear();

    savedList.forEach((s) => {
      this.structures.push(s);
      this.instantiatePlacedMesh(s);
    });
    this.updateSafeZone();
  }

  private updateSafeZone() {
    if (this.structures.length === 0) {
      this.safeZoneRadius = 15;
      this.safeZoneCenter.set(954, getTerrainHeight(954, 22), 22);
      return;
    }

    let sumX = 0;
    let sumZ = 0;
    let maxDist = 12;

    this.structures.forEach((s) => {
      sumX += s.position[0];
      sumZ += s.position[2];
      const def = STRUCTURES[s.typeId];
      if (def?.safeZoneContribution) {
        maxDist += def.safeZoneContribution * 0.4;
      }
    });

    const avgX = sumX / this.structures.length;
    const avgZ = sumZ / this.structures.length;
    this.safeZoneCenter.set(avgX, getTerrainHeight(avgX, avgZ), avgZ);
    this.safeZoneRadius = Math.min(65, Math.max(18, maxDist));
  }

  // --- Mesh Creation (Composite 3-12 parts) ---

  private instantiatePlacedMesh(placed: PlacedStructure) {
    const def = STRUCTURES[placed.typeId];
    if (!def) return;

    const group = this.createStructureMesh(def, false);
    group.position.set(placed.position[0], placed.position[1], placed.position[2]);
    group.rotation.y = placed.rotationY;

    if (placed.isOpen && def.isDoor) {
      // Find door leaf child
      const doorLeaf = group.getObjectByName('doorLeaf');
      if (doorLeaf) doorLeaf.rotation.y = -Math.PI / 2;
    }

    this.scene.add(group);
    this.structureMeshes.set(placed.uid, group);

    const physMgr = UnifiedPhysicsManager.getInstance();
    if (physMgr && (def.category === 'defense' || def.category === 'structure' || def.category === 'utility')) {
      physMgr.registerBoxCollider(
        placed.uid,
        def.isDoor ? 'door' : 'building',
        placed.position,
        def.width,
        def.height,
        def.depth,
        placed.rotationY,
        placed.isOpen
      );
    }
  }

  public initStarterBase(originX: number = 954, originZ: number = 22) {
    if (this.structures.length > 0) return;

    const addPreset = (
      typeId: string,
      relX: number,
      relZ: number,
      rotY: number = 0,
      extraProps?: Partial<PlacedStructure>
    ) => {
      const def = STRUCTURES[typeId];
      if (!def) return;
      const x = originX + relX;
      const z = originZ + relZ;
      const y = getTerrainHeight(x, z);
      const s: PlacedStructure = {
        uid: `starter_${typeId}_${Math.floor(Math.random() * 10000)}`,
        typeId,
        position: [x, y, z],
        rotationY: rotY,
        currentHealth: def.maxHealth,
        maxHealth: def.maxHealth,
        isOpen: false,
        storageItems: def.isStorage ? new Array(16).fill(null) : undefined,
        ...extraProps,
      };
      this.structures.push(s);
      this.instantiatePlacedMesh(s);
    };

    // 1. Starter Ranger Cabin at center clearing
    addPreset('starter_cabin', 0, -6, 0);

    // 2. Survivor Bed inside cabin (left room)
    addPreset('survivor_bed', -1.8, -7.5, 0);

    // 3. Storage Chest inside cabin pre-filled with essential starter survival items
    const starterLoot = new Array(16).fill(null);
    starterLoot[0] = { item: ITEMS['canned_beans'], count: 4 };
    starterLoot[1] = { item: ITEMS['clean_water'], count: 3 };
    starterLoot[2] = { item: ITEMS['bandage'], count: 3 };
    starterLoot[3] = { item: ITEMS['wood'], count: 24 };
    starterLoot[4] = { item: ITEMS['stone'], count: 12 };
    starterLoot[5] = { item: ITEMS['nails_bolts'], count: 16 };
    starterLoot[6] = { item: ITEMS['crop_seeds'], count: 6 };
    starterLoot[7] = { item: ITEMS['crossbow_bolts'], count: 16 };
    addPreset('storage_chest', 1.8, -7.5, 0, { storageItems: starterLoot });

    // 4. Artisan Workbench under front porch
    addPreset('workbench', -2.4, -2.6, 0);

    // 5. Compound Notice Board near front door
    addPreset('notice_board', 2.2, -2.6, 0);

    // 6. Campfire & cooking pit in yard
    addPreset('campfire', 0, 4.0, 0);

    // 7. Rainwater Cistern Barrel
    addPreset('water_collector', 5.2, -2.2, 0);

    // 8. Tilled Farm Plot with growing berry sprouts
    addPreset('farm_plot', -6.0, 2.5, 0, { farmStage: 1, farmCrop: 'wild_berries' });

    // 9. Elevated Watchtower for perimeter lookout
    addPreset('watchtower', 9.5, 8.0, 0);

    // 10. Complete Fortified Palisade Perimeter Enclosure (Zero Gaps, Exactly 1 Entrance Gate)
    // --- Front Wall (Z = +12.0) with ONE Center Gate ---
    addPreset('wooden_gate', 0, 12.0, 0); // Single fortified entry gate
    addPreset('wooden_wall', -2.8, 12.0, 0);
    addPreset('wooden_wall', -5.8, 12.0, 0);
    addPreset('wooden_wall', -8.8, 12.0, 0);
    addPreset('wooden_wall', -11.8, 12.0, 0);
    addPreset('wooden_wall', 2.8, 12.0, 0);
    addPreset('wooden_wall', 5.8, 12.0, 0);
    addPreset('wooden_wall', 8.8, 12.0, 0);
    addPreset('wooden_wall', 11.8, 12.0, 0);

    // --- Back Wall (Z = -12.0) Continuous Solid Palisade ---
    addPreset('wooden_wall', -12.0, -12.0, 0);
    addPreset('wooden_wall', -9.0, -12.0, 0);
    addPreset('wooden_wall', -6.0, -12.0, 0);
    addPreset('wooden_wall', -3.0, -12.0, 0);
    addPreset('wooden_wall', 0, -12.0, 0);
    addPreset('wooden_wall', 3.0, -12.0, 0);
    addPreset('wooden_wall', 6.0, -12.0, 0);
    addPreset('wooden_wall', 9.0, -12.0, 0);
    addPreset('wooden_wall', 12.0, -12.0, 0);

    // --- Left Wall (X = -13.5) Continuous Palisade ---
    addPreset('wooden_wall', -13.5, -9.0, Math.PI / 2);
    addPreset('wooden_wall', -13.5, -6.0, Math.PI / 2);
    addPreset('wooden_wall', -13.5, -3.0, Math.PI / 2);
    addPreset('wooden_wall', -13.5, 0, Math.PI / 2);
    addPreset('wooden_wall', -13.5, 3.0, Math.PI / 2);
    addPreset('wooden_wall', -13.5, 6.0, Math.PI / 2);
    addPreset('wooden_wall', -13.5, 9.0, Math.PI / 2);

    // --- Right Wall (X = +13.5) Continuous Palisade ---
    addPreset('wooden_wall', 13.5, -9.0, Math.PI / 2);
    addPreset('wooden_wall', 13.5, -6.0, Math.PI / 2);
    addPreset('wooden_wall', 13.5, -3.0, Math.PI / 2);
    addPreset('wooden_wall', 13.5, 0, Math.PI / 2);
    addPreset('wooden_wall', 13.5, 3.0, Math.PI / 2);
    addPreset('wooden_wall', 13.5, 6.0, Math.PI / 2);
    addPreset('wooden_wall', 13.5, 9.0, Math.PI / 2);

    // 11. Perimeter Torches Along Enclosure, Bastion Corners, and Gate
    // Gate entrance illumination
    addPreset('perimeter_torch', -1.8, 12.6, 0);
    addPreset('perimeter_torch', 1.8, 12.6, 0);
    // 4 Corner bastion braziers
    addPreset('perimeter_torch', -13.0, 11.5, 0);
    addPreset('perimeter_torch', 13.0, 11.5, 0);
    addPreset('perimeter_torch', -13.0, -11.5, 0);
    addPreset('perimeter_torch', 13.0, -11.5, 0);
    // Mid-wall perimeter torches
    addPreset('perimeter_torch', -7.3, 12.5, 0);
    addPreset('perimeter_torch', 7.3, 12.5, 0);
    addPreset('perimeter_torch', -6.0, -11.4, 0);
    addPreset('perimeter_torch', 0, -11.4, 0);
    addPreset('perimeter_torch', 6.0, -11.4, 0);
    addPreset('perimeter_torch', -12.8, -4.5, 0);
    addPreset('perimeter_torch', -12.8, 4.5, 0);
    addPreset('perimeter_torch', 12.8, -4.5, 0);
    addPreset('perimeter_torch', 12.8, 4.5, 0);
    // Compound courtyard beacons
    addPreset('perimeter_torch', 8.2, 7.5, 0); // Near watchtower ladder
    addPreset('perimeter_torch', 0, 2.0, 0);   // Courtyard path

    // 12. Modern survivor-base upgrades safely enclosed in courtyard
    addPreset('solar_panel', -1.6, -7.1, 0);
    const roofSolar = this.structures[this.structures.length - 1];
    if (roofSolar?.typeId === 'solar_panel') {
      roofSolar.position[1] += 3.55;
      this.refreshStructureMesh(roofSolar);
    }
    addPreset('solar_battery', 4.2, -6.3, 0);
    addPreset('modern_fridge', 2.0, -6.2, 0, { storageItems: new Array(16).fill(null) });
    addPreset('modern_couch', 0.0, -4.7, 0);
    addPreset('modern_desk', -2.0, -5.2, 0);
    addPreset('pool', 7.5, -2.5, 0); // Positioned inside protected east courtyard
    addPreset('modern_lamp', 6.0, -0.6, 0);
    addPreset('modern_lamp', -6.0, 6.0, 0);

    this.updateSafeZone();
  }

  public refreshStructureMesh(placed: PlacedStructure) {
    const oldGroup = this.structureMeshes.get(placed.uid);
    if (oldGroup) this.scene.remove(oldGroup);
    this.instantiatePlacedMesh(placed);
  }

  public tendFarmPlot(uid: string, hasSeeds: boolean): { action: 'planted' | 'harvested' | 'empty' | 'growing'; yieldAmount?: number } {
    const struct = this.structures.find((s) => s.uid === uid);
    if (!struct || struct.typeId !== 'farm_plot') return { action: 'empty' };

    const stage = struct.farmStage || 0;
    if (stage === 0) {
      if (hasSeeds) {
        struct.farmStage = 1;
        struct.farmCrop = 'wild_berries';
        this.refreshStructureMesh(struct);
        return { action: 'planted' };
      }
      return { action: 'empty' };
    } else if (stage === 1) {
      return { action: 'growing' };
    } else {
      // Stage 2: Harvest crops
      struct.farmStage = 0;
      this.refreshStructureMesh(struct);
      return { action: 'harvested', yieldAmount: 4 };
    }
  }

  public advanceFarmCrops() {
    this.structures.forEach((s) => {
      if (s.typeId === 'farm_plot' && s.farmStage === 1) {
        s.farmStage = 2; // becomes mature and harvestable
        this.refreshStructureMesh(s);
      }
    });
  }

  public toggleDoor(uid: string): boolean {
    const struct = this.structures.find((s) => s.uid === uid);
    if (!struct) return false;
    const def = STRUCTURES[struct.typeId];
    if (!def || (!def.isDoor && struct.typeId !== 'starter_cabin')) return false;

    struct.isOpen = !struct.isOpen;
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState(uid, struct.isOpen);

    const group = this.structureMeshes.get(uid);
    if (group) {
      const doorLeaf = group.getObjectByName('doorLeaf');
      if (doorLeaf) {
        doorLeaf.rotation.y = struct.isOpen ? -Math.PI / 2 : 0;
      }
    }
    return struct.isOpen;
  }

  public damageStructure(uid: string, damage: number): boolean {
    const struct = this.structures.find((s) => s.uid === uid);
    if (!struct) return false;

    struct.currentHealth = Math.max(0, struct.currentHealth - damage);
    const group = this.structureMeshes.get(uid);

    if (group) {
      // Impact shake
      group.position.y += 0.08;
      setTimeout(() => {
        if (group) group.position.y = struct.position[1];
      }, 80);

      // Destroyed
      if (struct.currentHealth <= 0) {
        this.scene.remove(group);
        this.structureMeshes.delete(uid);
        this.structures = this.structures.filter((s) => s.uid !== uid);
        UnifiedPhysicsManager.getInstance()?.unregisterCollider(uid);
        this.updateSafeZone();
        return true;
      }
    }
    return false;
  }

  public repairStructure(uid: string, repairAmount: number = 250): boolean {
    const struct = this.structures.find((s) => s.uid === uid);
    if (!struct || struct.currentHealth >= struct.maxHealth) return false;
    struct.currentHealth = Math.min(struct.maxHealth, struct.currentHealth + repairAmount);
    return true;
  }

  public dismantleStructure(uid: string): PlacedStructure | null {
    const idx = this.structures.findIndex((s) => s.uid === uid);
    if (idx === -1) return null;
    const removed = this.structures[idx];
    const group = this.structureMeshes.get(uid);
    if (group) {
      this.scene.remove(group);
      this.structureMeshes.delete(uid);
    }
    this.structures.splice(idx, 1);
    UnifiedPhysicsManager.getInstance()?.unregisterCollider(uid);
    this.updateSafeZone();
    return removed;
  }

  private createStructureMesh(def: StructureDefinition, isPreview: boolean): THREE.Group {
    const group = new THREE.Group();

    // Textures & materials
    const woodMat = isPreview
      ? this.previewMatValid
      : new THREE.MeshStandardMaterial({
          map: getWoodPlankTexture(),
          roughness: 0.85,
          metalness: 0.1,
        });

    const metalMat = isPreview
      ? this.previewMatValid
      : new THREE.MeshStandardMaterial({
          map: getMetalScrapTexture(),
          roughness: 0.65,
          metalness: 0.6,
        });

    const stoneMat = isPreview
      ? this.previewMatValid
      : new THREE.MeshStandardMaterial({
          map: getStoneTexture(),
          roughness: 0.9,
          metalness: 0.1,
        });

    const hazardMat = isPreview
      ? this.previewMatValid
      : new THREE.MeshStandardMaterial({
          map: getHazardStripeTexture(),
          roughness: 0.7,
        });

    switch (def.id) {
      case 'wooden_foundation': {
        // Interlocking timber platform
        const floor = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.28, def.depth), woodMat);
        floor.position.y = 0.14;
        floor.castShadow = !isPreview;
        floor.receiveShadow = !isPreview;
        group.add(floor);

        // 4 corner metal caps
        const capGeo = new THREE.BoxGeometry(0.35, 0.35, 0.35);
        const offsets = [
          [-def.width / 2, -def.depth / 2],
          [def.width / 2, -def.depth / 2],
          [-def.width / 2, def.depth / 2],
          [def.width / 2, def.depth / 2],
        ];
        offsets.forEach(([cx, cz]) => {
          const cap = new THREE.Mesh(capGeo, metalMat);
          cap.position.set(cx, 0.15, cz);
          group.add(cap);
        });
        break;
      }

      case 'wooden_wall': {
        // Main palisade wall
        const wall = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), woodMat);
        wall.position.y = def.height / 2;
        wall.castShadow = !isPreview;
        wall.receiveShadow = !isPreview;
        group.add(wall);

        // 2 horizontal cross-bracing beams
        const beamGeo = new THREE.BoxGeometry(def.width + 0.1, 0.2, def.depth + 0.1);
        const b1 = new THREE.Mesh(beamGeo, woodMat);
        b1.position.y = 0.6;
        const b2 = new THREE.Mesh(beamGeo, woodMat);
        b2.position.y = def.height - 0.5;
        group.add(b1, b2);

        // Metal support band
        const strap = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.95, 0.1, def.depth + 0.15), metalMat);
        strap.position.y = def.height / 2;
        group.add(strap);
        break;
      }

      case 'reinforced_barricade': {
        // Heavy timber with bolted metal plating
        const base = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), woodMat);
        base.position.y = def.height / 2;
        base.castShadow = !isPreview;
        group.add(base);

        // Steel armor plates
        const plate = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.9, def.height * 0.7, def.depth + 0.15), metalMat);
        plate.position.y = def.height * 0.45;
        plate.castShadow = !isPreview;
        group.add(plate);

        // Hazard warning trim
        const trim = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.25, def.depth + 0.18), hazardMat);
        trim.position.y = def.height - 0.2;
        group.add(trim);

        // Barbed wire coils on top
        const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, def.width, 8), metalMat);
        wire.rotation.z = Math.PI / 2;
        wire.position.y = def.height + 0.18;
        group.add(wire);
        break;
      }

      case 'metal_fence': {
        // Steel posts
        const postGeo = new THREE.CylinderGeometry(0.08, 0.08, def.height, 8);
        const p1 = new THREE.Mesh(postGeo, metalMat);
        p1.position.set(-def.width / 2 + 0.1, def.height / 2, 0);
        const p2 = new THREE.Mesh(postGeo, metalMat);
        p2.position.set(def.width / 2 - 0.1, def.height / 2, 0);
        group.add(p1, p2);

        // Mesh screen
        const screenMat = isPreview
          ? this.previewMatValid
          : new THREE.MeshStandardMaterial({
              color: 0x8899aa,
              wireframe: true,
              roughness: 0.5,
              metalness: 0.7,
            });
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(def.width - 0.2, def.height - 0.2, 10, 8), screenMat);
        screen.position.y = def.height / 2;
        group.add(screen);

        // Top rail
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, def.width, 8), metalMat);
        rail.rotation.z = Math.PI / 2;
        rail.position.y = def.height - 0.05;
        group.add(rail);
        break;
      }

      case 'wooden_gate': {
        // Doorframe
        const frameL = new THREE.Mesh(new THREE.BoxGeometry(0.25, def.height, def.depth), woodMat);
        frameL.position.set(-def.width / 2 + 0.12, def.height / 2, 0);
        const frameR = new THREE.Mesh(new THREE.BoxGeometry(0.25, def.height, def.depth), woodMat);
        frameR.position.set(def.width / 2 - 0.12, def.height / 2, 0);
        const frameT = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.25, def.depth), woodMat);
        frameT.position.set(0, def.height - 0.12, 0);
        group.add(frameL, frameR, frameT);

        // Hinged door leaf (pivots on left)
        const doorLeaf = new THREE.Group();
        doorLeaf.name = 'doorLeaf';
        doorLeaf.position.set(-def.width / 2 + 0.25, 0, 0);

        const leafWidth = def.width - 0.5;
        const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, def.height - 0.3, 0.18), woodMat);
        leafMesh.position.set(leafWidth / 2, def.height / 2, 0);
        leafMesh.castShadow = !isPreview;
        doorLeaf.add(leafMesh);

        // Metal sliding latch handle
        const latch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 0.25), metalMat);
        latch.position.set(leafWidth - 0.3, 1.2, 0);
        doorLeaf.add(latch);

        group.add(doorLeaf);
        break;
      }

      case 'defense_spikes': {
        // Base timber log
        const baseLog = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.3, 0.4), woodMat);
        baseLog.position.y = 0.15;
        group.add(baseLog);

        // 6 sharpened stakes angled forward
        const stakeGeo = new THREE.ConeGeometry(0.12, 1.1, 6);
        stakeGeo.translate(0, 0.55, 0);
        for (let i = 0; i < 6; i++) {
          const stake = new THREE.Mesh(stakeGeo, woodMat);
          stake.position.x = -def.width / 2 + 0.25 + i * (def.width / 6);
          stake.position.y = 0.2;
          stake.rotation.x = Math.PI / 4; // Angled outward
          stake.castShadow = !isPreview;
          group.add(stake);
        }
        break;
      }

      case 'watchtower': {
        // 4 corner timber pylons
        const pylonGeo = new THREE.CylinderGeometry(0.2, 0.3, def.height, 8);
        pylonGeo.translate(0, def.height / 2, 0);
        const halfW = def.width / 2 - 0.3;
        const halfD = def.depth / 2 - 0.3;

        const p1 = new THREE.Mesh(pylonGeo, woodMat);
        p1.position.set(-halfW, 0, -halfD);
        const p2 = new THREE.Mesh(pylonGeo, woodMat);
        p2.position.set(halfW, 0, -halfD);
        const p3 = new THREE.Mesh(pylonGeo, woodMat);
        p3.position.set(-halfW, 0, halfD);
        const p4 = new THREE.Mesh(pylonGeo, woodMat);
        p4.position.set(halfW, 0, halfD);
        group.add(p1, p2, p3, p4);

        // Observation platform deck
        const deck = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.35, def.depth), woodMat);
        deck.position.y = def.height - 1.2;
        deck.castShadow = !isPreview;
        deck.receiveShadow = !isPreview;
        group.add(deck);

        // Protective railings
        const railT = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.9, 0.1), woodMat);
        railT.position.set(0, def.height - 0.7, -halfD);
        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, def.depth), woodMat);
        railL.position.set(-halfW, def.height - 0.7, 0);
        const railR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, def.depth), woodMat);
        railR.position.set(halfW, def.height - 0.7, 0);
        group.add(railT, railL, railR);

        // Climbing ladder
        const ladderGeo = new THREE.BoxGeometry(0.6, def.height - 1.2, 0.1);
        const ladder = new THREE.Mesh(ladderGeo, metalMat);
        ladder.position.set(0, (def.height - 1.2) / 2, halfD + 0.1);
        group.add(ladder);
        break;
      }

      case 'perimeter_torch': {
        // Steel tripod stand
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, def.height, 8), metalMat);
        pole.position.y = def.height / 2;
        group.add(pole);

        // Brazier bowl
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.15, 0.25, 8), metalMat);
        bowl.position.y = def.height - 0.15;
        group.add(bowl);

        // Ember flame mesh
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), flameMat);
        flame.position.y = def.height;
        group.add(flame);

        if (!isPreview) {
          const torchLight = new THREE.PointLight(0xff9933, 1.8, 16);
          torchLight.position.y = def.height + 0.2;
          torchLight.castShadow = false;
          group.add(torchLight);
        }
        break;
      }

      case 'workbench': {
        // Heavy joinery bench top
        const top = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.2, def.depth), woodMat);
        top.position.y = 0.9;
        top.castShadow = !isPreview;
        group.add(top);

        // 4 legs
        const legGeo = new THREE.BoxGeometry(0.15, 0.9, 0.15);
        legGeo.translate(0, 0.45, 0);
        const l1 = new THREE.Mesh(legGeo, woodMat);
        l1.position.set(-def.width / 2 + 0.15, 0, -def.depth / 2 + 0.15);
        const l2 = new THREE.Mesh(legGeo, woodMat);
        l2.position.set(def.width / 2 - 0.15, 0, -def.depth / 2 + 0.15);
        const l3 = new THREE.Mesh(legGeo, woodMat);
        l3.position.set(-def.width / 2 + 0.15, 0, def.depth / 2 - 0.15);
        const l4 = new THREE.Mesh(legGeo, woodMat);
        l4.position.set(def.width / 2 - 0.15, 0, def.depth / 2 - 0.15);
        group.add(l1, l2, l3, l4);

        // Tabletop vise
        const vise = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.2), metalMat);
        vise.position.set(-def.width / 2 + 0.3, 1.1, def.depth / 2 - 0.2);
        group.add(vise);
        break;
      }

      case 'campfire': {
        // Stone ring
        const stoneRing = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.18, 6, 12), stoneMat);
        stoneRing.rotation.x = Math.PI / 2;
        stoneRing.position.y = 0.15;
        group.add(stoneRing);

        // Cross logs
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), woodMat);
        log.rotation.z = Math.PI / 4;
        log.position.y = 0.2;
        const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 6), woodMat);
        log2.rotation.z = -Math.PI / 4;
        log2.position.y = 0.2;
        group.add(log, log2);

        // Embers
        const ember = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff6600 }));
        ember.position.y = 0.25;
        group.add(ember);

        if (!isPreview) {
          const fireLight = new THREE.PointLight(0xff7722, 2.0, 14);
          fireLight.position.y = 0.5;
          group.add(fireLight);
        }
        break;
      }

      case 'water_collector': {
        // Oak barrel base
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.42, 1.1, 12), woodMat);
        barrel.position.y = 0.55;
        barrel.castShadow = !isPreview;
        group.add(barrel);

        // Overhead tarp canopy
        const tarp = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 8), metalMat);
        tarp.rotation.x = Math.PI;
        tarp.position.y = 1.6;
        group.add(tarp);
        break;
      }

      case 'storage_chest': {
        // Main chest body
        const chest = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.6, def.depth), woodMat);
        chest.position.y = 0.3;
        chest.castShadow = !isPreview;
        group.add(chest);

        // Beveled lid
        const lid = new THREE.Mesh(new THREE.BoxGeometry(def.width + 0.05, 0.2, def.depth + 0.05), metalMat);
        lid.position.y = 0.7;
        group.add(lid);

        // Front brass lock hasp
        const lock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.08), metalMat);
        lock.position.set(0, 0.55, def.depth / 2 + 0.04);
        group.add(lock);
        break;
      }

      case 'solar_spotlight': {
        // Mast pole
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, def.height, 8), metalMat);
        mast.position.y = def.height / 2;
        group.add(mast);

        // Solar panel angled
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.8), metalMat);
        panel.position.set(0, def.height + 0.2, 0);
        panel.rotation.x = 0.4;
        group.add(panel);

        // Searchlight housing
        const housing = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.5, 8), metalMat);
        housing.rotation.x = Math.PI / 3;
        housing.position.set(0, def.height - 0.3, 0.3);
        group.add(housing);

        if (!isPreview) {
          const spot = new THREE.SpotLight(0xfff5dd, 4.0, 35, Math.PI / 4, 0.4, 1.2);
          spot.position.set(0, def.height - 0.2, 0.3);
          spot.target.position.set(0, 0, 15);
          group.add(spot);
          group.add(spot.target);
        }
        break;
      }

      case 'starter_cabin': {
        // --- 1. Raised Timber Foundation Floor ---
        const floor = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.3, 5.6), woodMat);
        floor.position.y = 0.15;
        floor.castShadow = !isPreview;
        floor.receiveShadow = !isPreview;
        group.add(floor);

        // --- 2. Solid Back Wall ---
        const backWall = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.7, 0.3), woodMat);
        backWall.position.set(0, 1.65, -2.65);
        backWall.castShadow = !isPreview;
        backWall.receiveShadow = !isPreview;
        group.add(backWall);

        // --- 3. Left Wall with Framed Window ---
        const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.7, 5.6), woodMat);
        leftWall.position.set(-3.05, 1.65, 0);
        leftWall.castShadow = !isPreview;
        leftWall.receiveShadow = !isPreview;
        group.add(leftWall);

        const winFrameL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 1.4), metalMat);
        winFrameL.position.set(-3.05, 1.6, 0);
        group.add(winFrameL);

        // --- 4. Right Wall with Framed Window ---
        const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.7, 5.6), woodMat);
        rightWall.position.set(3.05, 1.65, 0);
        rightWall.castShadow = !isPreview;
        rightWall.receiveShadow = !isPreview;
        group.add(rightWall);

        const winFrameR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 1.4), metalMat);
        winFrameR.position.set(3.05, 1.6, 0);
        group.add(winFrameR);

        // --- 5. Front Wall with 2.0m Doorway Opening ---
        const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.7, 0.3), woodMat);
        frontWallL.position.set(-2.1, 1.65, 2.65);
        frontWallL.castShadow = !isPreview;
        group.add(frontWallL);

        const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.7, 0.3), woodMat);
        frontWallR.position.set(2.1, 1.65, 2.65);
        frontWallR.castShadow = !isPreview;
        group.add(frontWallR);

        // Door Lintel Beam above entrance
        const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.6, 0.3), woodMat);
        lintel.position.set(0, 2.7, 2.65);
        group.add(lintel);

        // Hinged Front Door Leaf
        const doorLeaf = new THREE.Group();
        doorLeaf.name = 'doorLeaf';
        doorLeaf.position.set(-0.95, 0, 2.65);
        const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(1.9, 2.1, 0.12), woodMat);
        doorPanel.position.set(0.95, 1.2, 0);
        doorPanel.castShadow = !isPreview;
        doorLeaf.add(doorPanel);
        const doorLatch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.2), metalMat);
        doorLatch.position.set(1.7, 1.2, 0);
        doorLeaf.add(doorLatch);
        group.add(doorLeaf);

        // --- 6. Gabled Pitched Timber Roof ---
        const roofL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 6.0), woodMat);
        roofL.position.set(-1.5, 3.45, 0);
        roofL.rotation.z = 0.42;
        roofL.castShadow = !isPreview;
        group.add(roofL);

        const roofR = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.18, 6.0), woodMat);
        roofR.position.set(1.5, 3.45, 0);
        roofR.rotation.z = -0.42;
        roofR.castShadow = !isPreview;
        group.add(roofR);

        // --- 7. Interior Furniture (Table & Chairs) ---
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 0.9), woodMat);
        table.position.set(0, 0.85, -1.2);
        const tableLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), woodMat);
        tableLeg1.position.set(-0.7, 0.4, -1.5);
        const tableLeg2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), woodMat);
        tableLeg2.position.set(0.7, 0.4, -1.5);
        const tableLeg3 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), woodMat);
        tableLeg3.position.set(-0.7, 0.4, -0.9);
        const tableLeg4 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), woodMat);
        tableLeg4.position.set(0.7, 0.4, -0.9);
        group.add(table, tableLeg1, tableLeg2, tableLeg3, tableLeg4);

        // Warm Interior Lantern Light
        if (!isPreview) {
          const indoorLight = new THREE.PointLight(0xffe2aa, 1.8, 14);
          indoorLight.position.set(0, 2.7, 0);
          group.add(indoorLight);
        }
        break;
      }

      case 'survivor_bed': {
        // Timber Bed Frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.35, def.depth), woodMat);
        frame.position.y = 0.2;
        frame.castShadow = !isPreview;
        group.add(frame);

        // Soft Canvas Mattress
        const mattressMat = isPreview
          ? this.previewMatValid
          : new THREE.MeshStandardMaterial({ color: 0xded8cf, roughness: 0.9 });
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.1, 0.25, def.depth - 0.15), mattressMat);
        mattress.position.y = 0.45;
        group.add(mattress);

        // Woolen Blanket
        const blanketMat = isPreview
          ? this.previewMatValid
          : new THREE.MeshStandardMaterial({ color: 0x992b2b, roughness: 0.85 });
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.08, 0.1, def.depth * 0.65), blanketMat);
        blanket.position.set(0, 0.52, 0.3);
        group.add(blanket);

        // Fluffy Pillow
        const pillow = new THREE.Mesh(new THREE.BoxGeometry(def.width * 0.7, 0.12, 0.45), mattressMat);
        pillow.position.set(0, 0.54, -def.depth / 2 + 0.35);
        group.add(pillow);

        // Headboard
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(def.width + 0.05, 0.85, 0.12), woodMat);
        headboard.position.set(0, 0.5, -def.depth / 2);
        group.add(headboard);
        break;
      }

      case 'farm_plot': {
        // Raised Timber Border
        const border = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), woodMat);
        border.position.y = def.height / 2;
        group.add(border);

        // Rich Tilled Soil Bed
        const soilMat = isPreview
          ? this.previewMatValid
          : new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.95 });
        const soil = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.2, def.height, def.depth - 0.2), soilMat);
        soil.position.y = def.height / 2 + 0.02;
        soil.receiveShadow = !isPreview;
        group.add(soil);

        // Growing Crop Sprouts
        const cropMat = new THREE.MeshStandardMaterial({ color: 0x44aa33, roughness: 0.6 });
        const berryMat = new THREE.MeshStandardMaterial({ color: 0xcc2233, roughness: 0.3 });
        for (let row = -1; row <= 1; row++) {
          for (let col = -1; col <= 1; col++) {
            const sprout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), cropMat);
            sprout.position.set(row * 0.6, def.height + 0.1, col * 0.6);
            group.add(sprout);

            // Mature berries
            const berry = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), berryMat);
            berry.position.set(row * 0.6, def.height + 0.2, col * 0.6);
            group.add(berry);
          }
        }
        break;
      }

      case 'notice_board': {
        // Twin Wooden Posts
        const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, def.height, 8), woodMat);
        postL.position.set(-0.45, def.height / 2, 0);
        const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, def.height, 8), woodMat);
        postR.position.set(0.45, def.height / 2, 0);
        group.add(postL, postR);

        // Message Placard
        const board = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.85, 0.08), woodMat);
        board.position.set(0, def.height - 0.5, 0);
        group.add(board);

        // Parchment Sheets pinned
        const paperMat = new THREE.MeshBasicMaterial({ color: 0xf5eedc });
        const note1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.45), paperMat);
        note1.position.set(-0.25, def.height - 0.5, 0.05);
        const note2 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.45), paperMat);
        note2.position.set(0.25, def.height - 0.5, 0.05);
        group.add(note1, note2);

        // Shingle Cap Overhang
        const cap = new THREE.Mesh(new THREE.BoxGeometry(def.width + 0.15, 0.06, 0.35), woodMat);
        cap.position.set(0, def.height + 0.02, 0);
        cap.rotation.x = 0.2;
        group.add(cap);
        break;
      }

      case 'solar_panel': {
        const frame = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.12, def.depth), metalMat);
        frame.position.y = 0.12;
        group.add(frame);
        const panelMat = isPreview ? this.previewMatValid : new THREE.MeshStandardMaterial({ color: 0x17365d, metalness: 0.75, roughness: 0.22 });
        const panel = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.12, 0.06, def.depth - 0.12), panelMat);
        panel.position.y = 0.22;
        group.add(panel);
        for (let i = -2; i <= 2; i++) {
          const line = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.012, def.depth - 0.15), isPreview ? this.previewMatValid : new THREE.MeshStandardMaterial({ color: 0x9bc4df, metalness: 0.7 }));
          line.position.set(i * 0.43, 0.26, 0);
          group.add(line);
        }
        break;
      }
      case 'solar_battery': {
        const casing = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), metalMat);
        casing.position.y = def.height / 2;
        const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.025), isPreview ? this.previewMatValid : new THREE.MeshBasicMaterial({ color: 0x39e28a }));
        indicator.position.set(0, 0.62, def.depth / 2 + 0.015);
        group.add(casing, indicator);
        break;
      }
      case 'modern_fridge': {
        const bodyMat = isPreview ? this.previewMatValid : new THREE.MeshStandardMaterial({ color: 0xb9c3ca, metalness: 0.55, roughness: 0.32 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), bodyMat);
        body.position.y = def.height / 2;
        group.add(body);
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.65, 0.05), metalMat);
        handle.position.set(0.36, 1.05, 0.48);
        group.add(handle);
        break;
      }
      case 'modern_couch': {
        const fabric = isPreview ? this.previewMatValid : new THREE.MeshStandardMaterial({ color: 0x52616b, roughness: 0.92 });
        const seat = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.28, 0.72), fabric);
        seat.position.y = 0.42;
        const back = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.55, 0.18), fabric);
        back.position.set(0, 0.72, -0.35);
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.82), fabric);
        armL.position.set(-0.9, 0.55, 0);
        const armR = armL.clone(); armR.position.x = 0.9;
        group.add(seat, back, armL, armR);
        break;
      }
      case 'modern_desk': {
        const top = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.12, def.depth), woodMat);
        top.position.y = 0.82;
        const legGeo = new THREE.BoxGeometry(0.1, 0.8, 0.1);
        for (const x of [-0.78, 0.78]) for (const z of [-0.28, 0.28]) {
          const leg = new THREE.Mesh(legGeo, metalMat); leg.position.set(x, 0.4, z); group.add(leg);
        }
        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.07), metalMat);
        monitor.position.set(0, 1.18, -0.22);
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.38), isPreview ? this.previewMatValid : new THREE.MeshBasicMaterial({ color: 0x2b91a8 }));
        screen.position.set(0, 1.18, -0.175);
        group.add(top, monitor, screen);
        break;
      }
      case 'light_barricade': {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), woodMat);
        beam.position.y = def.height / 2;
        const stripeMat = isPreview ? this.previewMatValid : new THREE.MeshStandardMaterial({ color: 0xd6b34b, roughness: 0.65 });
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.15, 0.16, def.depth + 0.02), stripeMat);
        stripe.position.y = def.height * 0.68;
        group.add(beam, stripe);
        break;
      }
      case 'pool': {
        const rim = new THREE.Mesh(new THREE.BoxGeometry(def.width, 0.45, def.depth), stoneMat);
        rim.position.y = 0.22;
        const waterMat = isPreview ? this.previewMatValid : new THREE.MeshPhysicalMaterial({ color: 0x2c9cba, roughness: 0.16, metalness: 0.12, transparent: true, opacity: 0.78 });
        const water = new THREE.Mesh(new THREE.BoxGeometry(def.width - 0.35, 0.12, def.depth - 0.35), waterMat);
        water.position.y = 0.34;
        group.add(rim, water);
        break;
      }
      case 'modern_lamp': {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, def.height, 8), metalMat);
        pole.position.y = def.height / 2;
        const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.16, 0.3), isPreview ? this.previewMatValid : new THREE.MeshStandardMaterial({ color: 0xffe6a1, emissive: 0xffc45c, emissiveIntensity: 0.8 }));
        lamp.position.y = def.height - 0.08;
        group.add(pole, lamp);
        break;
      }
      default: {
        const fallback = new THREE.Mesh(new THREE.BoxGeometry(def.width, def.height, def.depth), woodMat);
        fallback.position.y = def.height / 2;
        group.add(fallback);
      }
    }

    return group;
  }

  public dispose() {
    if (this.previewGroup) {
      this.scene.remove(this.previewGroup);
      this.previewGroup = null;
    }
    this.structureMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.structureMeshes.clear();
  }
}
