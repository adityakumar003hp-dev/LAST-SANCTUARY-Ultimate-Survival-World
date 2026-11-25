import * as THREE from 'three';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { soundEngine } from '../../utils/audio';
import { ApartmentTurrets } from './ApartmentTurrets';
import type { HostileFactionTurretTarget, TurretSaveRecord } from './ApartmentTurrets';
import type { CompoundSecuritySaveData } from '../../types/game';
import { BasementControlRoom } from './BasementControlRoom';
import { CommandCenterScreens } from './CommandCenterScreens';
import { getTerrainHeight } from '../Terrain';
import { ZombieManager } from '../ZombieManager';
import { WildlifeManager } from '../WildlifeManager';
import { ApartmentObjectBinding } from './ApartmentObjectBinding';
import { ApartmentObjectAnimator, type ApartmentInteractableOptions, type ApartmentObjectAction } from './ApartmentObjectAnimator';
import {
  getBrickPBR,
  getBrushedMetalPBR,
  getConcretePBR,
  getMarbleTilePBR,
  getSandstonePBR,
  getStonePBR,
  getWaterRippleNormalMap,
  getWoodPBR,
} from '../../utils/proceduralTextures';

export interface ApartmentState {
  tvOn: boolean;
  tvChannel: number;
  fanOn: boolean;
  fanSpeed: number;
  acOn: boolean;
  lightsOn: boolean;
  doorOpen: boolean;
  fridgeOpen: boolean;
  fridgeItems: string[];
}

export class ApartmentBuilding {
  public group: THREE.Group;
  /** Runtime dependency bindings for movable roots across every apartment level. */
  private readonly apartmentObjectBindings = new Map<string, ApartmentObjectBinding>();
  /** Central animation/state owner for all explicitly registered apartment interactables. */
  public readonly objectAnimator = new ApartmentObjectAnimator();
  public state: ApartmentState;
  public turrets: ApartmentTurrets;
  public basementRoom: BasementControlRoom;
  public commandScreens!: CommandCenterScreens;

  // Floor groups for camera-aware cutaways
  public floor1Group: THREE.Group;
  public floor2Group: THREE.Group;
  public floor3Group: THREE.Group;
  public floor4Group: THREE.Group;
  public floor5Group: THREE.Group;
  public basementGroup: THREE.Group;
  public exteriorWalls: THREE.Group;
  public staircaseGroup: THREE.Group;

  // Dynamic meshes
  private tvMesh!: THREE.Mesh;
  private tvScreenMat: THREE.MeshBasicMaterial;
  private tvCanvas: HTMLCanvasElement;
  private tvContext: CanvasRenderingContext2D | null;
  private tvTexture: THREE.CanvasTexture;
  private fanBlades!: THREE.Group;
  private acMesh!: THREE.Mesh;
  private acLedMat!: THREE.MeshBasicMaterial;
  private fridgeDoor!: THREE.Group;
  private frontDoorMesh!: THREE.Group;
  private frontDoorLeftLeaf!: THREE.Group;
  private frontDoorRightLeaf!: THREE.Group;
  private compoundGateLeftLeaf!: THREE.Group;
  private compoundGateRightLeaf!: THREE.Group;
  private compoundGateGroup!: THREE.Group;
  private compoundPedestrianDoorLeft!: THREE.Group;
  private compoundPedestrianDoorRight!: THREE.Group;
  public compoundPedestrianDoorsOpen = [false, false];
  public poolWaterMesh!: THREE.Mesh;
  public backyardPoolWaterMesh!: THREE.Mesh;
  private floorLights: THREE.PointLight[] = [];
  public compoundGateOpen = false;
  public vehicleGateOpen = false;
  public vehicleGateGroup!: THREE.Group;
  public vehicleGate2Open = false;
  private vehicleGate2Group!: THREE.Group;
  public garageShutterOpen = true;
  private garageShutterGroup!: THREE.Group;
  private commandElevatorPlatform: THREE.Mesh | null = null;
  private commandElevatorFloor = 0;
  private aptElevatorPlatform: THREE.Group | null = null;
  private aptElevatorFloor = 0;
  public patioDoorOpen = true;
  private patioDoorMesh!: THREE.Group;
  private patioDoorLeftLeaf!: THREE.Mesh;
  private patioDoorRightLeaf!: THREE.Mesh;
  public securityScreenCanvas!: HTMLCanvasElement;
  public securityScreenCtx!: CanvasRenderingContext2D | null;
  public securityScreenTexture!: THREE.CanvasTexture;
  public securityScreenMesh!: THREE.Mesh;
  public commandConsoleGroup!: THREE.Group;
  public basementTvCanvas!: HTMLCanvasElement;
  public basementTvCtx!: CanvasRenderingContext2D | null;
  public basementTvTexture!: THREE.CanvasTexture;
  public basementTvMesh!: THREE.Mesh;
  public basementTvOn = true;
  private radarSweepTimer = 0;

  public get westPedestrianDoorOpen(): boolean {
    return this.compoundPedestrianDoorsOpen[0];
  }
  public get eastPedestrianDoorOpen(): boolean {
    return this.compoundPedestrianDoorsOpen[1];
  }
  public toggleWestPedestrianDoor(): boolean {
    return this.toggleCompoundPedestrianDoor('left');
  }
  public toggleEastPedestrianDoor(): boolean {
    return this.toggleCompoundPedestrianDoor('right');
  }

  // --- Complete Bathroom System State & Meshes ---
  public bathroomDoorOpen = false;
  public bathroomDoorGroup!: THREE.Group;
  public bathroomDoorLeaf!: THREE.Mesh;
  public bathroomLightOn = true;
  public bathroomLight!: THREE.PointLight;
  public bathroomTapRunning = false;
  public bathroomTapMesh!: THREE.Group;
  public bathroomTapWaterMesh!: THREE.Mesh;
  public bathroomShowerRunning = false;
  public bathroomShowerWaterGroup!: THREE.Group;
  public bathroomShowerSteamMesh!: THREE.Mesh;
  public bathroomCabinetOpen = false;
  public bathroomCabinetDoor!: THREE.Group;
  public bathtubWaterMesh!: THREE.Mesh;
  public toiletWaterMesh!: THREE.Mesh;
  public toiletFlushing = false;
  public toiletFlushTimer = 0;

  // --- Additional House Interactive Systems ---
  public kitchenStoveOn = false;
  public kitchenStoveBurners: THREE.Mesh[] = [];
  public kitchenTapRunning = false;
  public kitchenTapWaterMesh!: THREE.Mesh;
  public wardrobeOpen = false;
  public wardrobeLeftDoor!: THREE.Group;
  public wardrobeRightDoor!: THREE.Group;
  public bedsideLampOn = true;
  public bedsideLampLight!: THREE.PointLight;

  // Real-time wall clock and personal computer canvases
  public wallClockCanvas!: HTMLCanvasElement;
  public wallClockCtx!: CanvasRenderingContext2D | null;
  public wallClockTexture!: THREE.CanvasTexture;
  public computerScreenCanvas!: HTMLCanvasElement;
  public computerScreenCtx!: CanvasRenderingContext2D | null;
  public computerScreenTexture!: THREE.CanvasTexture;
  public computerScreenMesh!: THREE.Mesh;

  // Reusable PBR materials
  private whiteWallMat: THREE.MeshStandardMaterial;
  private greyWallMat: THREE.MeshStandardMaterial;
  private armoryWallMat: THREE.MeshStandardMaterial;
  private brickFacadeMat: THREE.MeshStandardMaterial;
  private floorTileMat: THREE.MeshStandardMaterial;
  private woodFloorMat: THREE.MeshStandardMaterial;
  private glassMat: THREE.MeshStandardMaterial;
  private metalTrimMat: THREE.MeshStandardMaterial;
  private waterMat: THREE.MeshStandardMaterial;
  private warmLimestoneMat!: THREE.MeshStandardMaterial;
  private travertineStoneMat!: THREE.MeshStandardMaterial;
  private charcoalBronzeMat!: THREE.MeshStandardMaterial;
  private curtainGlassMat!: THREE.MeshStandardMaterial;
  private walnutAccentMat!: THREE.MeshStandardMaterial;
  private warmSconceMat!: THREE.MeshStandardMaterial;

  // Exterior wall sub-groups for directional camera cutaways
  private southWallMesh!: THREE.Group;
  private northWallMesh!: THREE.Group;
  private eastWallMesh!: THREE.Group;
  private westWallMesh!: THREE.Group;

  // Base building location
  public readonly origin = new THREE.Vector3(-26, 0, 38);

  // Pool water volume bounding box in world coordinates
  public readonly backyardPoolBounds = {
    minX: 9999, maxX: 10000, minY: 0.15, maxY: 1.5,
    minZ: 9999, maxZ: 10000,
  };

  public readonly poolWaterBounds = {
    minX: -31.5, maxX: -25.5,
    minY: 11.2, maxY: 14.0,
    minZ: 34.5, maxZ: 41.5,
  };

  constructor(parent: THREE.Scene | THREE.Group) {
    this.group = new THREE.Group();
    this.group.name = 'last_sanctuary_rebirth_player_compound';
    this.group.position.copy(this.origin);
    parent.add(this.group);

    this.state = {
      tvOn: false,
      tvChannel: 1,
      fanOn: true,
      fanSpeed: 4.5,
      acOn: true,
      lightsOn: true,
      doorOpen: true,
      fridgeOpen: false,
      fridgeItems: ['clean_water', 'canned_beans', 'fresh_oj', 'breakfast_sandwich', 'bandage'],
    };

    // Shared high-grade PBR materials with seamless procedural normals & roughness
    const whiteConcrete = getConcretePBR(0xf5f5f5);
    const greyConcrete = getConcretePBR(0x787c82);
    const armoryMetal = getBrushedMetalPBR(0x282e38);
    const brickPBR = getBrickPBR(0x8a4234);
    const tilePBR = getMarbleTilePBR(0xdad6d0);
    const woodPBR = getWoodPBR();
    const trimMetal = getBrushedMetalPBR(0x2c323b);
    const waterNormal = getWaterRippleNormalMap();

    this.whiteWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: whiteConcrete.albedo,
      normalMap: whiteConcrete.normal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: whiteConcrete.roughness,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    this.greyWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: greyConcrete.albedo,
      normalMap: greyConcrete.normal,
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughnessMap: greyConcrete.roughness,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    this.armoryWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: armoryMetal.albedo,
      normalMap: armoryMetal.normal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: armoryMetal.roughness,
      roughness: 0.42,
      metalness: 0.72,
      side: THREE.DoubleSide,
    });
    this.brickFacadeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brickPBR.albedo,
      normalMap: brickPBR.normal,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: brickPBR.roughness,
      roughness: 0.92,
    });
    this.floorTileMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: tilePBR.albedo,
      normalMap: tilePBR.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: tilePBR.roughness,
      roughness: 0.42,
    });
    this.woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0xb98a5e,
      map: woodPBR.albedo,
      normalMap: woodPBR.normal,
      normalScale: new THREE.Vector2(0.7, 0.7),
      roughnessMap: woodPBR.roughness,
      roughness: 0.72,
    });
    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0xa2d6e8,
      roughness: 0.08,
      metalness: 0.14,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.38,
    });
    this.metalTrimMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: trimMetal.albedo,
      normalMap: trimMetal.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: trimMetal.roughness,
      metalness: 0.82,
      roughness: 0.34,
    });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a8eb2,
      roughness: 0.08,
      metalness: 0.18,
      envMapIntensity: 1.6,
      normalMap: waterNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      transparent: true,
      opacity: 0.78,
    });

    const limestonePBR = getConcretePBR(0xe2ded5);
    const travertinePBR = getSandstonePBR(0xb8ae9c);
    const darkStonePBR = getStonePBR(0x2a2f36);
    this.warmLimestoneMat = new THREE.MeshStandardMaterial({
      color: 0xf4f1ea,
      map: limestonePBR.albedo,
      normalMap: limestonePBR.normal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: limestonePBR.roughness,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    this.travertineStoneMat = new THREE.MeshStandardMaterial({
      color: 0xd6cbb8,
      map: travertinePBR.albedo,
      normalMap: travertinePBR.normal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: travertinePBR.roughness,
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    this.charcoalBronzeMat = new THREE.MeshStandardMaterial({
      color: 0x262930,
      map: darkStonePBR.albedo,
      normalMap: darkStonePBR.normal,
      roughnessMap: darkStonePBR.roughness,
      metalness: 0.78,
      roughness: 0.34,
    });
    this.curtainGlassMat = new THREE.MeshStandardMaterial({
      color: 0xaad8e6,
      roughness: 0.06,
      metalness: 0.16,
      envMapIntensity: 1.65,
      transparent: true,
      opacity: 0.30,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.walnutAccentMat = new THREE.MeshStandardMaterial({
      color: 0x70492e,
      map: woodPBR.albedo,
      normalMap: woodPBR.normal,
      roughnessMap: woodPBR.roughness,
      roughness: 0.58,
    });
    this.warmSconceMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b5,
      emissive: 0xffb85c,
      emissiveIntensity: 0.85,
      roughness: 0.3,
    });

    // Procedural TV screen canvas
    this.tvCanvas = document.createElement('canvas');
    this.tvCanvas.width = 512;
    this.tvCanvas.height = 288;
    this.tvContext = this.tvCanvas.getContext('2d');
    this.updateTVScreenContent(false);
    this.tvTexture = new THREE.CanvasTexture(this.tvCanvas);
    this.tvTexture.colorSpace = THREE.SRGBColorSpace;
    this.tvScreenMat = new THREE.MeshBasicMaterial({ map: this.tvTexture });

    // Procedural Security Command Center 5km Radar Screen (1024x576)
    this.securityScreenCanvas = document.createElement('canvas');
    this.securityScreenCanvas.width = 1024;
    this.securityScreenCanvas.height = 576;
    this.securityScreenCtx = this.securityScreenCanvas.getContext('2d');
    this.securityScreenTexture = new THREE.CanvasTexture(this.securityScreenCanvas);
    this.securityScreenTexture.colorSpace = THREE.SRGBColorSpace;
    this.renderSecurityScreenContent();

    // Procedural Basement Operations & Lounge TV Screen (512x288)
    this.basementTvCanvas = document.createElement('canvas');
    this.basementTvCanvas.width = 512;
    this.basementTvCanvas.height = 288;
    this.basementTvCtx = this.basementTvCanvas.getContext('2d');
    this.basementTvTexture = new THREE.CanvasTexture(this.basementTvCanvas);
    this.basementTvTexture.colorSpace = THREE.SRGBColorSpace;
    this.renderBasementTvContent();

    // Procedural Living Room Wall Clock (256x256)
    this.wallClockCanvas = document.createElement('canvas');
    this.wallClockCanvas.width = 256;
    this.wallClockCanvas.height = 256;
    this.wallClockCtx = this.wallClockCanvas.getContext('2d');
    this.wallClockTexture = new THREE.CanvasTexture(this.wallClockCanvas);
    this.wallClockTexture.colorSpace = THREE.SRGBColorSpace;
    this.renderWallClockContent(360, 1);

    // Procedural Study Computer Screen (512x288)
    this.computerScreenCanvas = document.createElement('canvas');
    this.computerScreenCanvas.width = 512;
    this.computerScreenCanvas.height = 288;
    this.computerScreenCtx = this.computerScreenCanvas.getContext('2d');
    this.computerScreenTexture = new THREE.CanvasTexture(this.computerScreenCanvas);
    this.computerScreenTexture.colorSpace = THREE.SRGBColorSpace;
    this.renderComputerScreenContent();

    this.floor1Group = new THREE.Group();
    this.floor1Group.name = 'floor_0_luxury_living';
    this.floor2Group = new THREE.Group();
    this.floor2Group.name = 'floor_1_private_residence';
    this.floor3Group = new THREE.Group();
    this.floor3Group.name = 'floor_2_medical_and_survival';
    this.floor4Group = new THREE.Group();
    this.floor4Group.name = 'floor_3_self_sufficiency';
    this.floor5Group = new THREE.Group();
    this.floor5Group.name = 'floor_4_rooftop_infinity_recreation';
    this.basementGroup = new THREE.Group();
    this.basementGroup.name = 'retained_basement_operations_room';
    this.exteriorWalls = new THREE.Group();
    this.exteriorWalls.name = 'exterior_cutaway_facade';
    this.staircaseGroup = new THREE.Group();
    this.staircaseGroup.name = 'continuous_staircase';

    this.group.add(
      this.floor1Group,
      this.floor2Group,
      this.floor3Group,
      this.floor4Group,
      this.floor5Group,
      this.basementGroup,
      this.exteriorWalls,
      this.staircaseGroup
    );

    // Build building architecture
    this.buildFloor1();
    this.buildFloor2();
    this.buildFloor3();
    this.buildFloor4Survival();
    this.buildFloor5Pool();
    this.buildBasement();
    this.buildContinuousStaircase();
    this.buildExteriorFacade();
    this.buildEnclosedProperty();
    this.buildIndependentCompoundBuildings();
    // Security defaults: all compound entrances begin closed.
    // Access is granted only through the two explicit gate interactions.

    // Physics colliders are registered once by TownLifeManager after the full town is created.

    // Keep the existing security and basement operations systems connected to the expanded building.
    this.turrets = new ApartmentTurrets(this.group, this.origin);
    this.basementRoom = new BasementControlRoom(this.group, this.origin);
    this.initializeApartmentObjectBindings();
  }

  /** Adds the independent command centre, medical annex, four-bay garage and self-sufficiency facilities. */

  /** Builds the two detached facilities; the existing five-level apartment remains Building 1. */
  /** Builds Option A Neo-Tactical structures: explorable 4-floor Mansion Wings, 8-floor 25-screen Command Center, and 3-level Vertical Garage. */
  private buildIndependentCompoundBuildings() {
    const campus = new THREE.Group();
    campus.name = 'rebirth_option_a_neo_tactical_compound_structures';
    this.group.add(campus);

    const graphite = new THREE.MeshStandardMaterial({ color: 0x161f29, roughness: 0.36, metalness: 0.8 });
    const slate = new THREE.MeshStandardMaterial({ color: 0x333c48, roughness: 0.72, metalness: 0.32 });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x56bddc,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const cyan = new THREE.MeshStandardMaterial({ color: 0x6ce8ff, emissive: 0x0891b2, emissiveIntensity: 1.15 });
    const amber = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.9 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.76, metalness: 0.25 });
    const woodAccent = new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.68 });
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });

    // =========================================================================
    // BUILDING 1 EXTENSION: MODERN GLASS LUXURY FORTRESS WINGS (4 FLOORS)
    // =========================================================================
    const mansionWings = new THREE.Group();
    mansionWings.name = 'building_1_player_mansion_attached_wings';
    mansionWings.userData = {
      buildingNumber: 1,
      style: 'Modern Glass Luxury Fortress',
      floors: 4,
      rooftopTerrace: true,
      basement: true,
      targetFootprint: [30, 24],
      attachedToExistingMansion: true,
    };
    campus.add(mansionWings);

    const creamFabricMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd3, roughness: 0.88 });
    const charcoalUpholsteryMat = new THREE.MeshStandardMaterial({ color: 0x2c3038, roughness: 0.85 });
    const brassHardwareMat = new THREE.MeshStandardMaterial({ color: 0xc8a45d, metalness: 0.85, roughness: 0.25 });
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f6, roughness: 0.16, metalness: 0.08 });
    const shelterSteelMat = new THREE.MeshStandardMaterial({ color: 0x373e47, metalness: 0.78, roughness: 0.36 });
    const lushFoliageMat = new THREE.MeshStandardMaterial({ color: 0x2f7d44, roughness: 0.88 });

    const floorGroups = [this.floor1Group, this.floor2Group, this.floor3Group, this.floor4Group];
    for (const side of [-1, 1] as const) {
      const wingCenterX = side * 11.5;
      const outerX = side * 14.92;
      const wingShell = new THREE.Group();
      wingShell.name = side < 0 ? 'mansion_west_wing_shell' : 'mansion_east_wing_shell';
      mansionWings.add(wingShell);

      // Honed travertine plinth foundation
      const basePad = new THREE.Mesh(new THREE.BoxGeometry(7.0, 0.25, 24.0), this.travertineStoneMat);
      basePad.position.set(wingCenterX, 0.12, 0);
      basePad.receiveShadow = true;
      wingShell.add(basePad);

      // Architectural travertine & bronze structural piers (full 13m height)
      for (const z of [-11.85, -6.0, 0, 6.0, 11.85]) {
        const pier = new THREE.Mesh(new THREE.BoxGeometry(0.42, 13.0, 0.56), this.travertineStoneMat);
        pier.position.set(outerX, 6.5, z);
        pier.castShadow = true;
        pier.receiveShadow = true;
        const bronzeMullion = new THREE.Mesh(new THREE.BoxGeometry(0.46, 13.0, 0.14), this.charcoalBronzeMat);
        bronzeMullion.position.set(outerX, 6.5, z);
        wingShell.add(pier, bronzeMullion);
      }

      // Per-floor panoramic curtain glass, limestone slab edges & warm architectural lighting
      for (let fl = 0; fl < 4; fl++) {
        const fy = fl * 3.2;
        const fg = floorGroups[fl];

        // Walkable interior slabs (preserve East stairwell opening at X in [12.3, 14.5], Z in [-3.8, +1.8])
        if (fl > 0) {
          if (side > 0) {
            const slabW = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.22, 23.6), this.warmLimestoneMat);
            slabW.position.set(10.15, fy + 0.11, 0);
            slabW.receiveShadow = true;
            const slabN = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 10.0), this.warmLimestoneMat);
            slabN.position.set(13.65, fy + 0.11, 6.8);
            slabN.receiveShadow = true;
            const slabS = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.22, 8.0), this.warmLimestoneMat);
            slabS.position.set(13.65, fy + 0.11, -7.8);
            slabS.receiveShadow = true;
            fg.add(slabW, slabN, slabS);
          } else {
            const slab = new THREE.Mesh(new THREE.BoxGeometry(6.9, 0.22, 23.6), this.warmLimestoneMat);
            slab.position.set(wingCenterX, fy + 0.11, 0);
            slab.receiveShadow = true;
            fg.add(slab);
          }
        }

        // Exterior limestone spandrel + floor-to-ceiling low-E curtain glazing + bronze transom
        const lowerSpandrel = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 23.8), this.warmLimestoneMat);
        lowerSpandrel.position.set(outerX, fy + 0.22, 0);
        const outerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.58, 23.4), this.curtainGlassMat);
        outerGlass.position.set(outerX, fy + 1.68, 0);
        const slabFascia = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 24.1), this.charcoalBronzeMat);
        slabFascia.position.set(outerX + side * 0.06, fy + 3.1, 0);
        const warmUnderGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 23.4), this.warmSconceMat);
        warmUnderGlow.position.set(outerX + side * 0.14, fy + 2.98, 0);
        wingShell.add(lowerSpandrel, outerGlass, slabFascia, warmUnderGlow);

        // North wing end wall: stone plinth + full-height panoramic glass
        const northLower = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 0.26), this.travertineStoneMat);
        northLower.position.set(wingCenterX, fy + 0.21, 11.86);
        const northGlass = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.52, 0.06), this.curtainGlassMat);
        northGlass.position.set(wingCenterX, fy + 1.68, 11.86);
        const northHeader = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 0.28), this.charcoalBronzeMat);
        northHeader.position.set(wingCenterX, fy + 3.06, 11.86);
        wingShell.add(northLower, northGlass, northHeader);

        // South wing front wall (ground floor has double architectural entry; upper floors have curtain glass)
        if (fl === 0) {
          for (const dx of [-2.35, 2.35]) {
            const sStone = new THREE.Mesh(new THREE.BoxGeometry(2.1, 3.1, 0.28), this.travertineStoneMat);
            sStone.position.set(wingCenterX + dx, fy + 1.55, -11.86);
            wingShell.add(sStone);
          }
          const canopy = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.16, 1.6), this.charcoalBronzeMat);
          canopy.position.set(wingCenterX, 3.12, -12.55);
          const canopyWarmWash = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.04, 0.08), this.warmSconceMat);
          canopyWarmWash.position.set(wingCenterX, 3.02, -13.15);
          const accessPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.06), brassHardwareMat);
          accessPad.position.set(wingCenterX + 1.25, 1.35, -12.02);
          wingShell.add(canopy, canopyWarmWash, accessPad);
        } else {
          const southLower = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.42, 0.26), this.travertineStoneMat);
          southLower.position.set(wingCenterX, fy + 0.21, -11.86);
          const southGlass = new THREE.Mesh(new THREE.BoxGeometry(6.2, 2.52, 0.06), this.curtainGlassMat);
          southGlass.position.set(wingCenterX, fy + 1.68, -11.86);
          const southHeader = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.22, 0.28), this.charcoalBronzeMat);
          southHeader.position.set(wingCenterX, fy + 3.06, -11.86);
          wingShell.add(southLower, southGlass, southHeader);
        }

        // Warm 3000K architectural interior lighting
        const light = new THREE.PointLight(fl === 2 ? 0xf0f6ff : 0xffe9cc, 1.15, 14, 1.4);
        light.position.set(wingCenterX, fy + 2.75, 0);
        this.floorLights.push(light);
        fg.add(light);

        if (side < 0) {
          if (fl === 0) {
            // Ground Floor West Wing: Private Cinema & Travertine Hearth Lounge
            const lSofaMain = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.72, 1.05), creamFabricMat);
            lSofaMain.position.set(-12.2, fy + 0.48, 3.8);
            const lSofaChaise = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 1.8), creamFabricMat);
            lSofaChaise.position.set(-13.1, fy + 0.48, 2.6);
            const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.36, 0.95), this.walnutAccentMat);
            coffeeTable.position.set(-11.8, fy + 0.30, 1.8);
            const cinemaWall = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.2, 0.25), this.travertineStoneMat);
            cinemaWall.position.set(-12.2, fy + 1.25, 7.6);
            const cinemaScreen = new THREE.Mesh(
              new THREE.BoxGeometry(2.4, 1.25, 0.06),
              new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.18, metalness: 0.5 })
            );
            cinemaScreen.position.set(-12.2, fy + 1.48, 7.42);
            const hearth = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 0.45), this.charcoalBronzeMat);
            hearth.position.set(-12.2, fy + 0.32, 7.35);
            const emberGlow = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.16), this.warmSconceMat);
            emberGlow.position.set(-12.2, fy + 0.54, 7.35);
            const readingChair = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.75, 1.0), charcoalUpholsteryMat);
            readingChair.position.set(-12.4, fy + 0.48, -7.0);
            fg.add(lSofaMain, lSofaChaise, coffeeTable, cinemaWall, cinemaScreen, hearth, emberGlow, readingChair);
          } else if (fl === 1) {
            // First Floor West Wing: Master Luxury Spa Bathroom & Dressing Lounge
            const soakingTub = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.65, 2.1), porcelainMat);
            soakingTub.position.set(-12.8, fy + 0.45, 5.2);
            const tubWater = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.8), this.waterMat);
            tubWater.rotation.x = -Math.PI / 2;
            tubWater.position.set(-12.8, fy + 0.78, 5.2);
            const doubleVanity = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.68), this.walnutAccentMat);
            doubleVanity.position.set(-11.8, fy + 0.54, -2.5);
            const marbleTop = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.06, 0.72), this.travertineStoneMat);
            marbleTop.position.set(-11.8, fy + 0.99, -2.5);
            const rainShowerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.35, 2.1), this.curtainGlassMat);
            rainShowerGlass.position.set(-12.4, fy + 1.35, -7.2);
            const dressingOttoman = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.44, 16), creamFabricMat);
            dressingOttoman.position.set(-11.8, fy + 0.34, 1.2);
            fg.add(soakingTub, tubWater, doubleVanity, marbleTop, rainShowerGlass, dressingOttoman);
          } else if (fl === 2) {
            // Second Floor West Wing: Emergency Treatment Room & Trauma Recovery
            for (const bz of [-6.0, 2.5, 7.2]) {
              const pod = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.52, 1.02), porcelainMat);
              pod.position.set(-12.6, fy + 0.4, bz);
              const mon = new THREE.Mesh(
                new THREE.BoxGeometry(0.68, 0.48, 0.08),
                new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
              );
              mon.position.set(-13.85, fy + 1.35, bz);
              const surgLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.08, 16), this.warmSconceMat);
              surgLamp.position.set(-12.6, fy + 2.65, bz);
              fg.add(pod, mon, surgLamp);
            }
          } else {
            // Third Floor West Wing: Vertical Hydroponics & Cold Food Storage
            for (const gz of [-6.5, -1.5, 3.5, 7.8]) {
              const rack = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.85, 1.05), this.charcoalBronzeMat);
              rack.position.set(-12.4, fy + 1.02, gz);
              const foliage = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.88), lushFoliageMat);
              foliage.position.set(-12.4, fy + 1.22, gz);
              const growStrip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.2), this.warmSconceMat);
              growStrip.position.set(-12.4, fy + 1.9, gz);
              fg.add(rack, foliage, growStrip);
            }
          }
        } else {
          if (fl === 0) {
            // Ground Floor East Wing: Reception Vestibule & Formal Gallery Lounge
            const desk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.96, 0.88), this.travertineStoneMat);
            desk.position.set(10.6, fy + 0.58, -6.5);
            const walnutTrim = new THREE.Mesh(new THREE.BoxGeometry(2.54, 0.1, 0.92), this.walnutAccentMat);
            walnutTrim.position.set(10.6, fy + 1.08, -6.5);
            const lounge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.68, 1.0), creamFabricMat);
            lounge.position.set(10.8, fy + 0.45, 5.8);
            fg.add(desk, walnutTrim, lounge);
          } else if (fl === 1) {
            // First Floor East Wing: Private Guest Bedroom Suite
            const guestBed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 2.3), this.walnutAccentMat);
            guestBed.position.set(10.6, fy + 0.38, 6.2);
            const guestMattress = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.28, 2.1), creamFabricMat);
            guestMattress.position.set(10.6, fy + 0.68, 6.2);
            const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.65), charcoalUpholsteryMat);
            bench.position.set(10.6, fy + 0.36, -7.2);
            fg.add(guestBed, guestMattress, bench);
          } else if (fl === 2) {
            // Second Floor East Wing: Secure Reinforced Survival Shelter & Vault
            for (const az of [-7.5, 5.2, 8.2]) {
              const shelterLocker = new THREE.Mesh(new THREE.BoxGeometry(1.65, 2.2, 0.95), shelterSteelMat);
              shelterLocker.position.set(10.4, fy + 1.2, az);
              const blastSeal = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.8, 0.65), brassHardwareMat);
              blastSeal.position.set(9.56, fy + 1.2, az);
              fg.add(shelterLocker, blastSeal);
            }
          } else {
            // Third Floor East Wing: Lithium Inverter Vault & Maintenance Workshop
            for (const pz of [-7.5, 5.2, 8.2]) {
              const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.75, 2.15, 1.05), this.charcoalBronzeMat);
              cabinet.position.set(10.4, fy + 1.18, pz);
              const statusBar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.1, 0.08), this.warmSconceMat);
              statusBar.position.set(9.5, fy + 1.35, pz);
              fg.add(cabinet, statusBar);
            }
          }
        }
      }

      // Wing Rooftop Lounge Terrace (y = 12.92) with travertine deck & frameless glass parapet
      const wingRoof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.28, 24.2), this.travertineStoneMat);
      wingRoof.position.set(wingCenterX, 12.92, 0);
      wingRoof.receiveShadow = true;
      const wingRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.08, 24.0), this.curtainGlassMat);
      wingRail.position.set(outerX, 13.56, 0);
      const wingCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 24.1), this.charcoalBronzeMat);
      wingCap.position.set(outerX, 14.12, 0);
      wingShell.add(wingRoof, wingRail, wingCap);
    }

    // East Wing Architectural Steel & Walnut Staircase (X = 13.4, Z: -3.5 -> +1.5)
    const eastWingStairs = new THREE.Group();
    eastWingStairs.name = 'east_wing_four_floor_staircase';
    for (let fl = 0; fl < 3; fl++) {
      const baseH = fl * 3.2;
      for (let s = 0; s < 14; s++) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.42), this.walnutAccentMat);
        tread.position.set(13.4, baseH + (s + 1) * (3.2 / 14), -3.5 + ((s + 0.5) / 14) * 5.0);
        tread.castShadow = true;
        eastWingStairs.add(tread);
      }
    }
    mansionWings.add(eastWingStairs);

    // =========================================================================
    // BUILDING 2: NEO-TACTICAL 8-FLOOR RAILWAY COMMAND CENTER (25 LIVE SCREENS)
    // Positioned cleanly in NW quadrant at local (-48, 0, +24) -> World (-74, 0, +62)
    // =========================================================================
    const command = new THREE.Group();
    command.name = 'building_2_independent_railway_command_centre';
    command.position.set(-48, 0, 24);
    command.userData = {
      buildingNumber: 2,
      style: 'Option A Neo-Tactical Glass & Graphite',
      floors: 8,
      screenCount: 25,
      basement: true,
      roofHelipadDeck: true,
      targetFootprint: [22, 18],
      dispatchesExistingTrains: 6,
    };
    campus.add(command);

    const cmdBase = new THREE.Mesh(new THREE.BoxGeometry(22.8, 0.55, 18.8), graphite);
    cmdBase.position.y = 0.28;
    command.add(cmdBase);

    const wallT = 0.32;
    const floorH = 3.45;
    for (let f = 0; f < 8; f++) {
      const floorY = 0.65 + f * floorH;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(22.4, 0.22, 18.4), graphite);
      slab.position.y = floorY;
      slab.receiveShadow = true;
      command.add(slab);

      // Exterior Cyan Floor Perimeter Strip
      const ledStripS = new THREE.Mesh(new THREE.BoxGeometry(22.5, 0.07, 0.08), cyan);
      ledStripS.position.set(0, floorY + 3.28, -9.05);
      const ledStripW = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.07, 18.5), cyan);
      ledStripW.position.set(-11.1, floorY + 3.28, 0);
      const ledStripE = ledStripW.clone();
      ledStripE.position.x = 11.1;
      command.add(ledStripS, ledStripW, ledStripE);

      // East & West Curtain Walls
      for (const side of [-1, 1]) {
        const x = side * 10.92;
        const lower = new THREE.Mesh(new THREE.BoxGeometry(wallT, 0.65, 18), slate);
        lower.position.set(x, floorY + 0.42, 0);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(wallT, 0.52, 18), graphite);
        upper.position.set(x, floorY + 3.12, 0);
        const glazing = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.0, 15.8), glass);
        glazing.position.set(x, floorY + 1.82, 0);
        command.add(lower, upper, glazing);
        for (const z of [-8.65, 0, 8.65]) {
          const pier = new THREE.Mesh(new THREE.BoxGeometry(0.46, 3.3, 0.68), graphite);
          pier.position.set(x, floorY + 1.7, z);
          pier.castShadow = true;
          command.add(pier);
        }
      }

      // North Solid Video-Wall Structural Backing
      const backWall = new THREE.Mesh(new THREE.BoxGeometry(22, 3.28, wallT), slate);
      backWall.position.set(0, floorY + 1.72, 8.82);
      command.add(backWall);

      // South Front Wall (Ground floor has wide open entrance, upper floors have panoramic glass)
      if (f === 0) {
        for (const x of [-6.6, 6.6]) {
          const front = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.28, wallT), slate);
          front.position.set(x, floorY + 1.72, -8.82);
          command.add(front);
        }
        const header = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.58, wallT), graphite);
        header.position.set(0, floorY + 3.04, -8.82);
        const entryCanopy = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.2, 2.2), graphite);
        entryCanopy.position.set(0, floorY + 3.2, -10.0);
        const canopyLed = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.08, 0.08), cyan);
        canopyLed.position.set(0, floorY + 3.2, -11.1);
        command.add(header, entryCanopy, canopyLed);
      } else {
        const frontLower = new THREE.Mesh(new THREE.BoxGeometry(22, 0.72, wallT), slate);
        frontLower.position.set(0, floorY + 0.45, -8.82);
        const frontUpper = new THREE.Mesh(new THREE.BoxGeometry(22, 0.52, wallT), graphite);
        frontUpper.position.set(0, floorY + 3.12, -8.82);
        const glazing = new THREE.Mesh(new THREE.BoxGeometry(19.6, 1.98, 0.1), glass);
        glazing.position.set(0, floorY + 1.82, -8.82);
        command.add(frontLower, frontUpper, glazing);
      }

      // Interior Floor Lighting + Elevator Call Panel
      const flLight = new THREE.PointLight(f === 2 ? 0x67e8f9 : 0xe0f2fe, 1.25, 22, 1.3);
      flLight.position.set(-1.0, floorY + 2.75, 0);
      command.add(flLight);

      const callPanel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.78, 0.1), cyan);
      callPanel.name = `command_elevator_call_panel_f${f + 1}`;
      callPanel.position.set(-5.8, floorY + 1.25, -1.2);
      command.add(callPanel);

      // Floor-specific furnishings & operator consoles
      if (f === 0) {
        const reception = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 0.95), graphite);
        reception.position.set(-0.8, floorY + 0.58, 2.25);
        command.add(reception);
      } else if (f <= 2) {
        for (const dx of [-4.0, -0.8, 2.4]) {
          if (f === 2 && dx > 0) continue;
          const desk = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.85, 0.9), graphite);
          desk.position.set(dx, floorY + 0.52, 2.25);
          command.add(desk);
        }
      } else if (f <= 5) {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.95), graphite);
        desk.position.set(-0.8, floorY + 0.52, 2.25);
        command.add(desk);
        for (const rx of [-7.5, -5.5]) {
          const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.9), graphite);
          rack.position.set(rx, floorY + 1.25, 5.2);
          command.add(rack);
        }
      } else if (f === 6) {
        // Floor 7: Command Briefing Holo-Table & Officer Bunks
        const holoTable = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.88, 2.0), graphite);
        holoTable.position.set(-2.0, floorY + 0.54, 1.5);
        const holoPlate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 1.5), cyan);
        holoPlate.position.set(-2.0, floorY + 1.0, 1.5);
        const bunk1 = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.55, 1.05), slate);
        bunk1.position.set(-7.6, floorY + 0.42, 4.8);
        command.add(holoTable, holoPlate, bunk1);
      } else if (f === 7) {
        // Floor 8: Executive Observatory Desk & Central Server Racks
        const execDesk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.88, 1.1), graphite);
        execDesk.position.set(-2.0, floorY + 0.54, 1.5);
        for (let sr = 0; sr < 4; sr++) {
          const srv = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.4, 0.9), graphite);
          srv.position.set(-7.8 + sr * 1.4, floorY + 1.3, 5.8);
          command.add(srv);
        }
        command.add(execDesk);
      }
    }

    // Roof Deck (y = 0.65 + 8 * 3.45 = 28.25) with East stairwell hatch cutout (X in [6.2, 9.2], Z in [-5.4, +6.2])
    const roofY = 0.65 + 8 * floorH;
    const roofWest = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.38, 18.7), graphite);
    roofWest.position.set(-2.65, roofY, 0);
    const roofEastFar = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.38, 18.7), graphite);
    roofEastFar.position.set(10.3, roofY, 0);
    const roofStairN = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.38, 3.15), graphite);
    roofStairN.position.set(7.65, roofY, 7.78);
    const roofStairS = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.38, 3.95), graphite);
    roofStairS.position.set(7.65, roofY, -7.38);
    command.add(roofWest, roofEastFar, roofStairN, roofStairS);

    // Rooftop Helipad + Glass Safety Railings + Comms Spires
    const helipad = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.14, 32), slate);
    helipad.position.set(-2.2, roofY + 0.25, 0);
    const heliRing = new THREE.Mesh(new THREE.RingGeometry(3.6, 4.0, 32), amber);
    heliRing.rotation.x = -Math.PI / 2;
    heliRing.position.set(-2.2, roofY + 0.33, 0);
    const heliHBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 2.8), amber);
    heliHBar1.position.set(-3.1, roofY + 0.33, 0);
    const heliHBar2 = heliHBar1.clone();
    heliHBar2.position.x = -1.3;
    const heliHCross = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.45), amber);
    heliHCross.position.set(-2.2, roofY + 0.33, 0);
    command.add(helipad, heliRing, heliHBar1, heliHBar2, heliHCross);

    for (const [rx, rz, rw, rd] of [
      [0, -9.15, 22.4, 0.1],
      [0, 9.15, 22.4, 0.1],
      [-11.15, 0, 0.1, 18.4],
      [11.15, 0, 0.1, 18.4],
    ] as const) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.05, rd), glass);
      rail.position.set(rx, roofY + 0.72, rz);
      command.add(rail);
    }
    for (let i = 0; i < 3; i++) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 4.2, 8), graphite);
      ant.position.set(-7.5 + i * 3.8, roofY + 2.2, 7.2);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), cyan);
      beacon.position.set(-7.5 + i * 3.8, roofY + 4.35, 7.2);
      command.add(ant, beacon);
    }

    // 8-Stop High-Speed Glass Elevator Shaft on West (-7.2, -1.2)
    const basementWell = new THREE.Mesh(new THREE.BoxGeometry(18, 2.6, 14), graphite);
    basementWell.position.set(0, -1.35, 0);
    command.add(basementWell);
    const liftShaft = new THREE.Group();
    liftShaft.name = 'railway_command_elevator_shaft';
    liftShaft.position.set(-7.2, 0, -1.2);
    command.add(liftShaft);
    for (const [x, z] of [[-1.05, -1.05], [1.05, -1.05], [-1.05, 1.05], [1.05, 1.05]] as const) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 27.6, 0.12), graphite);
      post.position.set(x, 14.0, z);
      liftShaft.add(post);
    }
    const liftPlatform = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.18, 1.9), cyan);
    liftPlatform.name = 'command_elevator_platform';
    liftPlatform.position.y = 0.78;
    liftShaft.add(liftPlatform);
    this.commandElevatorPlatform = liftPlatform;
    liftShaft.userData = { stops: [0, 1, 2, 3, 4, 5, 6, 7], platform: liftPlatform.name, requiresPlayerInteraction: true };

    // Continuous 8-Floor Staircase on East (X = 7.65, connecting F1..F8 + Roof Deck)
    const stairGroup = new THREE.Group();
    stairGroup.name = 'railway_command_eight_floor_staircase';
    command.add(stairGroup);
    for (let floor = 0; floor < 8; floor++) {
      const baseY = 0.76 + floor * floorH;
      for (let step = 0; step < 16; step++) {
        const tread = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.56), graphite);
        tread.position.set(7.65, baseY + (step + 1) * (floorH / 16), -5.0 + step * 0.62);
        tread.castShadow = true;
        stairGroup.add(tread);
      }
      const landing = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.18, 2.2), graphite);
      landing.position.set(7.65, baseY + floorH, 5.15);
      stairGroup.add(landing);
    }

    // 25 Live Interactive Telemetry Screens distributed across all 8 floors
    this.commandScreens = new CommandCenterScreens(command);
    command.userData.dispatchDisplays = ['25_live_screens', 'six_train_telemetry', 'network_map', '5km_radar', 'alerts'];
    command.userData.controlsConnectedTo = 'AITrainManager';
    command.userData.explorableRooms = [
      'f1_grand_dispatch_lobby',
      'f2_train_dispatch_hall',
      'f3_security_surveillance',
      'f4_signal_interlocking',
      'f5_communications_center',
      'f6_traction_engineering',
      'f7_briefing_quarters',
      'f8_executive_observatory',
      'roof_helipad_deck',
    ];
    command.userData.navigation = { stairs: true, elevator: true, floors: 8 };

    const doorFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.1, 0.36), graphite);
    doorFrameLeft.position.set(-2.25, 1.55, -8.82);
    const doorFrameRight = doorFrameLeft.clone();
    doorFrameRight.position.x = 2.25;
    const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(4.7, 0.24, 0.36), graphite);
    doorHeader.position.set(0, 3.1, -8.82);
    command.add(doorFrameLeft, doorFrameRight, doorHeader);

    // =========================================================================
    // BUILDING 3: OPTION A 3-LEVEL VERTICAL SECURITY GARAGE (4 BAY VEHICLES)
    // Positioned in SW quadrant at local (-48, 0, -32) -> World (-74, 0, +6)
    // Contains: Bay 1 Armed SUV, Bay 2 Bike, Bay 3 Cycle, Bay 4 Military Vehicle
    // =========================================================================
    const garage = new THREE.Group();
    garage.name = 'building_3_vertical_security_garage';
    garage.position.set(-48, 0, -32);
    campus.add(garage);
    garage.userData = {
      buildingNumber: 3,
      style: 'Option A Neo-Tactical Vertical Garage',
      levels: 3,
      targetFootprint: [20, 14],
      vehicleBays: ['armed_suv', 'bike', 'cycle', 'military_enforcement_armed_armoured'],
      doorCount: 4,
    };

    const garageBase = new THREE.Mesh(new THREE.BoxGeometry(20.6, 0.35, 14.6), graphite);
    garageBase.position.y = 0.18;
    garageBase.receiveShadow = true;
    garage.add(garageBase);

    // Level 1 Ground Hangar + Level 2 Mezzanine Workshop (y=4.55) + Level 3 Drone Roof Pad (y=9.0)
    const gBackWall = new THREE.Mesh(new THREE.BoxGeometry(20.0, 9.0, 0.35), slate);
    gBackWall.position.set(0, 4.55, 6.82);
    garage.add(gBackWall);

    for (const side of [-1, 1]) {
      const sLower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 4.5, 14.0), slate);
      sLower.position.set(side * 9.82, 2.3, 0);
      const sUpperLower = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 14.0), slate);
      sUpperLower.position.set(side * 9.82, 4.95, 0);
      const sGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.9, 13.4), glass);
      sGlass.position.set(side * 9.82, 6.85, 0);
      const sUpperTop = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.65, 14.0), graphite);
      sUpperTop.position.set(side * 9.82, 8.65, 0);
      const sLed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 14.2), cyan);
      sLed.position.set(side * 10.02, 4.58, 0);
      garage.add(sLower, sUpperLower, sGlass, sUpperTop, sLed);
    }

    // Front Facade: 4 Drive-In Bay Piers on Level 1 + Panoramic Glass Loft on Level 2
    const garageFrontZ = -6.82;
    for (const x of [-9.7, -4.9, 0, 4.9, 9.7]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(x === -9.7 || x === 9.7 ? 0.6 : 0.8, 3.3, 0.35), graphite);
      pier.position.set(x, 1.85, garageFrontZ);
      const bayLight = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.4, 0.08), cyan);
      bayLight.position.set(x, 1.9, garageFrontZ - 0.2);
      garage.add(pier, bayLight);
    }
    const garageLintel = new THREE.Mesh(new THREE.BoxGeometry(20.0, 1.15, 0.35), graphite);
    garageLintel.position.set(0, 4.02, garageFrontZ);
    const frontLed = new THREE.Mesh(new THREE.BoxGeometry(20.2, 0.08, 0.1), cyan);
    frontLed.position.set(0, 4.6, garageFrontZ - 0.22);
    const frontUpperLower = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.75, 0.32), slate);
    frontUpperLower.position.set(0, 4.95, garageFrontZ);
    const frontUpperGlass = new THREE.Mesh(new THREE.BoxGeometry(18.6, 2.9, 0.1), glass);
    frontUpperGlass.position.set(0, 6.85, garageFrontZ);
    const frontUpperTop = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.65, 0.35), graphite);
    frontUpperTop.position.set(0, 8.65, garageFrontZ);
    garage.add(garageLintel, frontLed, frontUpperLower, frontUpperGlass, frontUpperTop);

    // 4 Coordinated Motorized Shutters + Bay Markings + EV/Fuel Pedestals
    this.garageShutterGroup = new THREE.Group();
    this.garageShutterGroup.name = 'four_independent_automatic_garage_shutters';
    this.garageShutterGroup.position.set(0, this.garageShutterOpen ? 2.65 : 0, -7.08);
    garage.add(this.garageShutterGroup);
    for (let i = 0; i < 4; i++) {
      const x = -7.35 + i * 4.9;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(4.35, 3.55, 0.22), graphite);
      frame.position.set(x, 1.8, -7.12);
      const door = new THREE.Mesh(new THREE.BoxGeometry(4.1, 3.3, 0.12), cyan);
      door.position.set(x, 1.65, 0);
      this.garageShutterGroup.add(door);
      const bayMark = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 5.8), floorMat);
      bayMark.position.set(x, 0.25, 0);
      garage.add(frame, bayMark);
      if (i < 3) {
        const charger = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.45, 0.38), graphite);
        charger.position.set(x + 2.45, 0.9, -2.5);
        const chargerLed = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.35, 0.4), cyan);
        chargerLed.position.set(x + 2.45, 1.35, -2.5);
        garage.add(charger, chargerLed);
      }
    }

    // Overhead Gantry Bridge Crane inside Hangar + Ground Workshop Corner
    const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(18.6, 0.28, 0.42), amber);
    gantryBeam.position.set(0, 3.92, 0.4);
    const hoist = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.45, 0.95), graphite);
    hoist.position.set(7.2, 3.62, 0.4);
    const workshop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.2, 3.2), graphite);
    workshop.position.set(7.2, 1.2, 5.0);
    garage.add(gantryBeam, hoist, workshop);

    // Level 1 -> Level 2 Rear Staircase (Z = 5.4, X: -8.6 -> -1.2, clear of vehicle bays & workshop)
    for (let s = 0; s < 14; s++) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 1.5), graphite);
      tread.position.set(-8.4 + s * 0.54, 0.36 + (s + 1) * (4.24 / 14), 5.4);
      garage.add(tread);
    }

    // Level 2 Mezzanine Floor Slab (y = 4.55) with stairwell opening (X in [-8.8, -0.8], Z in [4.4, 6.4])
    const l2Main = new THREE.Mesh(new THREE.BoxGeometry(19.6, 0.24, 11.0), floorMat);
    l2Main.position.set(0, 4.55, -1.1);
    l2Main.receiveShadow = true;
    const l2EastRear = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.24, 2.6), floorMat);
    l2EastRear.position.set(4.5, 4.55, 5.5);
    garage.add(l2Main, l2EastRear);

    // Level 2 Mezzanine Furnishings: Armor/Weapon Tuning Bench, Diagnostic Terminal, Parts Racks
    const tuneBench = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.92, 1.1), graphite);
    tuneBench.position.set(4.2, 5.1, -3.2);
    const diagScreen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.1), cyan);
    diagScreen.position.set(4.2, 5.95, -3.45);
    const partsRack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 3.2), slate);
    partsRack.position.set(-7.6, 5.8, -2.5);
    const l2Light = new THREE.PointLight(0x9be7ff, 1.35, 22, 1.3);
    l2Light.position.set(0, 8.1, 0);
    garage.add(tuneBench, diagScreen, partsRack, l2Light);

    // Level 2 -> Level 3 Roof Staircase (Z = 5.4, X: -0.4 -> +6.8, climbing up to Roof y = 9.0)
    for (let s = 0; s < 14; s++) {
      const tread = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 1.5), graphite);
      tread.position.set(-0.4 + s * 0.52, 4.65 + (s + 1) * (4.35 / 14), 5.4);
      garage.add(tread);
    }

    // Level 3 Roof Deck (y = 9.0) with stairwell cutout (X in [-0.6, +7.2], Z in [4.4, 6.4])
    const l3Main = new THREE.Mesh(new THREE.BoxGeometry(20.4, 0.3, 11.4), graphite);
    l3Main.position.set(0, 9.0, -1.3);
    const l3WestRear = new THREE.Mesh(new THREE.BoxGeometry(9.4, 0.3, 3.0), graphite);
    l3WestRear.position.set(-5.3, 9.0, 5.7);
    const l3EastRear = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.3, 3.0), graphite);
    l3EastRear.position.set(8.6, 9.0, 5.7);
    garage.add(l3Main, l3WestRear, l3EastRear);

    // Level 3 Roof Drone Resupply Pad, Solar Bank & Glass Safety Railings
    const dronePad = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.12, 24), slate);
    dronePad.position.set(-3.2, 9.2, -1.2);
    const droneRing = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.75, 24), cyan);
    droneRing.rotation.x = -Math.PI / 2;
    droneRing.position.set(-3.2, 9.27, -1.2);
    const solarBank = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.1, 1.6), graphite);
    solarBank.position.set(4.8, 9.65, -3.5);
    garage.add(dronePad, droneRing, solarBank);

    for (const [rx, rz, rw, rd] of [
      [0, -7.1, 20.2, 0.1],
      [0, 7.1, 20.2, 0.1],
      [-10.1, 0, 0.1, 14.2],
      [10.1, 0, 0.1, 14.2],
    ] as const) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.0, rd), glass);
      rail.position.set(rx, 9.65, rz);
      garage.add(rail);
    }

    garage.userData.facilities = [
      'four_armored_vehicle_bays',
      'overhead_gantry_crane',
      'mezzanine_armor_tuning_deck',
      'vehicle_diagnostic_terminal',
      'roof_drone_resupply_pad',
      'solar_battery_bank',
    ];
    garage.userData.vehicleBayLabels = [
      'ARMED SUV',
      'MOTORBIKE',
      'EXPEDITION BICYCLE',
      'MILITARY ENFORCEMENT VEHICLE (ARMED + ARMOURED)',
    ];
  }

  // ==========================================
  // FLOOR SLAB WITH STAIR OPENING HELPER
  // ==========================================
  private createSlabWithStairwell(mat: THREE.Material, thickness: number, yPos: number): THREE.Group {
    const g = new THREE.Group();
    // West main section: X = -8.0 to +2.6 (width 10.6, depth 14, center X = -2.7)
    const westSlab = new THREE.Mesh(new THREE.BoxGeometry(10.6, thickness, 14), mat);
    westSlab.position.set(-2.7, yPos, 0);
    westSlab.receiveShadow = true;

    // Elevator corridor strip North of shaft: X = 2.6 to 4.5, Z = -4.4 to +7.0
    const elevNorth = new THREE.Mesh(new THREE.BoxGeometry(1.9, thickness, 11.4), mat);
    elevNorth.position.set(3.55, yPos, 1.3);
    elevNorth.receiveShadow = true;

    // Elevator corridor strip South of shaft: X = 2.6 to 4.5, Z = -7.0 to -6.4
    const elevSouth = new THREE.Mesh(new THREE.BoxGeometry(1.9, thickness, 0.6), mat);
    elevSouth.position.set(3.55, yPos, -6.7);
    elevSouth.receiveShadow = true;

    // East North section: covers X = 4.5 to 8.0, Z = 2.0 to 7.0
    const eastNorth = new THREE.Mesh(new THREE.BoxGeometry(3.5, thickness, 5.0), mat);
    eastNorth.position.set(6.25, yPos, 4.5);
    eastNorth.receiveShadow = true;

    // East South section: covers X = 4.5 to 8.0, Z = -7.0 to -4.5
    const eastSouth = new THREE.Mesh(new THREE.BoxGeometry(3.5, thickness, 2.5), mat);
    eastSouth.position.set(6.25, yPos, -5.75);
    eastSouth.receiveShadow = true;

    g.add(westSlab, elevNorth, elevSouth, eastNorth, eastSouth);
    return g;
  }

  // ==========================================
  // GROUND FLOOR (LEVEL 0): LUXURY LIVING & GRAND LOBBY
  // ==========================================
  private buildFloor1() {
    const f1 = this.floor1Group;
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8a45d, metalness: 0.85, roughness: 0.25 });
    const boucleMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d7, roughness: 0.9 });
    const slateUpholsteryMat = new THREE.MeshStandardMaterial({ color: 0x2b303a, roughness: 0.85 });
    const marbleIslandMat = new THREE.MeshStandardMaterial({ color: 0xf4f1eb, roughness: 0.22, metalness: 0.08 });

    // Ground Floor Honed Travertine Base + Walnut Living/Bedroom Inlay
    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 14), this.travertineStoneMat);
    floorSlab.position.set(0, 0.12, 0);
    floorSlab.receiveShadow = true;
    const walnutInlay = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.02, 9.6), this.walnutAccentMat);
    walnutInlay.position.set(-2.6, 0.25, 1.8);
    walnutInlay.receiveShadow = true;
    f1.add(floorSlab, walnutInlay);

    // Ceiling with stairwell cutout + Elevator shaft opening at X in [2.6, 4.6], Z in [-6.4, -4.4]
    const ceiling = this.createSlabWithStairwell(this.warmLimestoneMat, 0.2, 3.1);
    f1.add(ceiling);

    // Architectural Dividing Walls (Limestone + Walnut Acoustic Slats)
    const bedDivider = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.9, 7.5), this.warmLimestoneMat);
    bedDivider.position.set(-2.5, 1.6, 2.8);
    const kitchenDivider = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.9, 5.0), this.warmLimestoneMat);
    kitchenDivider.position.set(2.5, 1.6, 4.0);
    for (let s = 0; s < 5; s++) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.7, 0.14), this.walnutAccentMat);
      slat.position.set(-2.36, 1.55, 0.5 + s * 0.45);
      f1.add(slat);
    }
    f1.add(bedDivider, kitchenDivider);

    // Warm 3000K Architectural Ceiling & Chandelier Lighting
    const lamp1 = new THREE.PointLight(0xffe6c4, 1.8, 14, 1.3);
    lamp1.position.set(-4.5, 2.75, 2.5);
    const lamp2 = new THREE.PointLight(0xffe9cc, 2.1, 16, 1.3);
    lamp2.position.set(0, 2.75, -0.5);
    const lobbyLight = new THREE.PointLight(0xffebd2, 1.4, 12, 1.4);
    lobbyLight.position.set(2.2, 2.75, -4.6);
    this.floorLights.push(lamp1, lamp2, lobbyLight);
    f1.add(lamp1, lamp2, lobbyLight);

    // Sculptural Brass Ring Chandelier over Living Salon
    const chandelier = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.035, 10, 32), brassMat);
    chandelier.rotation.x = Math.PI / 2;
    chandelier.position.set(0, 2.68, -0.4);
    const chGlow = new THREE.Mesh(new THREE.TorusGeometry(0.73, 0.02, 8, 32), this.warmSconceMat);
    chGlow.rotation.x = Math.PI / 2;
    chGlow.position.set(0, 2.65, -0.4);
    f1.add(chandelier, chGlow);

    // --- 1. GROUND FLOOR GUEST BEDROOM SUITE ---
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 2.8), this.walnutAccentMat);
    bedFrame.position.set(-5.5, 0.35, 3.8);
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.55, 0.18), this.walnutAccentMat);
    headboard.position.set(-5.5, 0.96, 5.18);
    headboard.castShadow = true;
    headboard.receiveShadow = true;
    const headboardPad = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.05, 0.08), boucleMat);
    headboardPad.position.set(-5.5, 0.98, 5.06);

    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.35, 2.5),
      new THREE.MeshStandardMaterial({ color: 0xfbfaf7, roughness: 0.92 })
    );
    mattress.position.set(-5.5, 0.65, 3.8);
    mattress.castShadow = true;
    mattress.receiveShadow = true;

    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(2.22, 0.38, 1.7),
      slateUpholsteryMat
    );
    blanket.position.set(-5.5, 0.66, 3.3);
    blanket.castShadow = true;

    const pillow1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.16, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xf5f4f0, roughness: 0.95 })
    );
    pillow1.position.set(-6.1, 0.85, 4.6);
    pillow1.castShadow = true;
    const pillow2 = pillow1.clone();
    pillow2.position.x = -4.9;

    // Nightstand & Bedside Warm Brass Lamp
    const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.65, 0.72), this.walnutAccentMat);
    nightstand.position.set(-7.2, 0.45, 4.8);
    nightstand.castShadow = true;
    nightstand.receiveShadow = true;

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.08, 12), brassMat);
    lampBase.position.set(-7.2, 0.81, 4.8);
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), brassMat);
    lampStem.position.set(-7.2, 1.0, 4.8);
    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.22, 0.28, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff1dc, roughness: 0.6, transparent: true, opacity: 0.92 })
    );
    lampShade.position.set(-7.2, 1.15, 4.8);
    this.bedsideLampLight = new THREE.PointLight(0xffecd0, 1.4, 6.0, 1.5);
    this.bedsideLampLight.position.set(-7.2, 1.15, 4.8);

    // Walnut Wardrobe at (-7.2, 1.4) with double hinged doors
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(-7.2, 0, 1.4);
    const wardrobeBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.3, 1.6), this.walnutAccentMat);
    wardrobeBody.position.set(0, 1.25, 0);
    wardrobeBody.castShadow = true;
    wardrobeBody.receiveShadow = true;
    wardrobeGroup.add(wardrobeBody);

    this.wardrobeLeftDoor = new THREE.Group();
    this.wardrobeLeftDoor.position.set(0.43, 1.25, -0.76);
    const wDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.22, 0.76), this.walnutAccentMat);
    wDoorL.position.set(0, 0, 0.38);
    const wHandleL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), brassMat);
    wHandleL.position.set(0.04, 0, 0.7);
    this.wardrobeLeftDoor.add(wDoorL, wHandleL);

    this.wardrobeRightDoor = new THREE.Group();
    this.wardrobeRightDoor.position.set(0.43, 1.25, 0.76);
    const wDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.22, 0.76), this.walnutAccentMat);
    wDoorR.position.set(0, 0, -0.38);
    const wHandleR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), brassMat);
    wHandleR.position.set(0.04, 0, -0.7);
    this.wardrobeRightDoor.add(wDoorR, wHandleR);
    wardrobeGroup.add(this.wardrobeLeftDoor, this.wardrobeRightDoor);

    // Study & Personal Computer Desk at (-3.5, 0.6)
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-3.5, 0, 0.6);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.85), this.walnutAccentMat);
    deskTop.position.set(0, 0.75, 0);
    deskTop.castShadow = true;
    const deskLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), this.charcoalBronzeMat);
    deskLeg1.position.set(-0.72, 0.36, -0.36);
    const deskLeg2 = deskLeg1.clone(); deskLeg2.position.set(0.72, 0.36, -0.36);
    const deskLeg3 = deskLeg1.clone(); deskLeg3.position.set(-0.72, 0.36, 0.36);
    const deskLeg4 = deskLeg1.clone(); deskLeg4.position.set(0.72, 0.36, 0.36);

    const monitorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.25, 10), this.charcoalBronzeMat);
    monitorStand.position.set(0, 0.9, 0.25);
    const monitorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.62, 0.05), this.charcoalBronzeMat);
    monitorFrame.position.set(0, 1.25, 0.25);
    this.computerScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.58),
      new THREE.MeshBasicMaterial({ map: this.computerScreenTexture })
    );
    this.computerScreenMesh.rotation.y = Math.PI;
    this.computerScreenMesh.position.set(0, 1.25, 0.22);

    const deskKb = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.02, 0.16), this.charcoalBronzeMat);
    deskKb.position.set(0, 0.79, -0.05);
    const deskMouse = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.12), this.charcoalBronzeMat);
    deskMouse.position.set(0.35, 0.79, -0.05);

    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.52), slateUpholsteryMat);
    chairSeat.position.set(0, 0.48, -0.42);
    chairSeat.castShadow = true;
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 0.06), slateUpholsteryMat);
    chairBack.position.set(0, 0.78, -0.66);
    const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8), this.charcoalBronzeMat);
    chairStem.position.set(0, 0.22, -0.42);
    deskGroup.add(deskTop, deskLeg1, deskLeg2, deskLeg3, deskLeg4, monitorStand, monitorFrame, this.computerScreenMesh, deskKb, deskMouse, chairSeat, chairBack, chairStem);

    f1.add(bedFrame, headboard, headboardPad, mattress, blanket, pillow1, pillow2, nightstand, lampBase, lampStem, lampShade, this.bedsideLampLight, wardrobeGroup, deskGroup);

    // --- 2. WORKING TELEVISION WITH BROADCAST SCREEN ---
    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.6), this.walnutAccentMat);
    tvStand.position.set(-5.5, 0.45, 0.0);
    tvStand.castShadow = true;
    tvStand.receiveShadow = true;

    const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.25, 0.1), this.charcoalBronzeMat);
    tvFrame.position.set(-5.5, 1.55, 0.0);
    tvFrame.rotation.x = -0.06;

    this.tvMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.15), this.tvScreenMat);
    this.tvMesh.rotation.y = 0;
    this.tvMesh.rotation.x = -0.06;
    this.tvMesh.position.set(-5.5, 1.55, 0.06);
    f1.add(tvStand, tvFrame, this.tvMesh);

    // --- 2B. GRAND LOBBY BIOMETRIC ACCESS CONTROL, SECURITY CAMERA & PANORAMIC GLASS ELEVATOR ---
    // Biometric Access Control Wall Console beside front double doors
    const accessPillar = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.8, 0.28), this.travertineStoneMat);
    accessPillar.position.set(1.65, 1.52, -6.35);
    const biometricPad = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.38, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.75, roughness: 0.3 })
    );
    biometricPad.position.set(1.65, 1.38, -6.18);
    const biometricLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.04, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    biometricLed.position.set(1.65, 1.5, -6.14);
    // Discreet Interior Lobby Ceiling Security Dome Camera
    const camMount = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 16), this.charcoalBronzeMat);
    camMount.position.set(-1.8, 2.94, -5.8);
    const camDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.15, metalness: 0.6 })
    );
    camDome.position.set(-1.8, 2.88, -5.8);
    // Sculptural Lobby Console Table
    const lobbyConsole = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.86, 0.52), this.travertineStoneMat);
    lobbyConsole.position.set(-0.2, 0.55, -4.6);
    lobbyConsole.castShadow = true;
    const lobbyVase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.42, 14), brassMat);
    lobbyVase.position.set(-0.2, 1.19, -4.6);
    f1.add(accessPillar, biometricPad, biometricLed, camMount, camDome, lobbyConsole, lobbyVase);

    // Panoramic Glass Residential Elevator Shaft (X = 3.6, Z = -5.4, spanning Ground -> Rooftop)
    const aptLiftShaft = new THREE.Group();
    aptLiftShaft.name = 'apartment_panoramic_glass_elevator_shaft';
    aptLiftShaft.position.set(3.6, 0, -5.4);
    for (const [px, pz] of [[-0.92, -0.92], [0.92, -0.92], [-0.92, 0.92], [0.92, 0.92]] as const) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 13.8, 0.1), this.charcoalBronzeMat);
      post.position.set(px, 7.0, pz);
      aptLiftShaft.add(post);
    }
    const shaftGlassBack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 13.4, 0.05), this.curtainGlassMat);
    shaftGlassBack.position.set(0, 6.8, -0.92);
    const shaftGlassSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 13.4, 1.8), this.curtainGlassMat);
    shaftGlassSide.position.set(0.92, 6.8, 0);
    aptLiftShaft.add(shaftGlassBack, shaftGlassSide);

    const aptCabGroup = new THREE.Group();
    aptCabGroup.name = 'apartment_elevator_platform';
    aptCabGroup.position.y = 0.25;
    const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.12, 1.76), this.travertineStoneMat);
    const cabTrim = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 1.82), brassMat);
    cabTrim.position.y = 0.05;
    const cabBackGlass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.2, 0.05), this.curtainGlassMat);
    cabBackGlass.position.set(0, 1.16, -0.84);
    const cabLight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 1.2), this.warmSconceMat);
    cabLight.position.set(0, 2.26, 0);
    aptCabGroup.add(cabFloor, cabTrim, cabBackGlass, cabLight);
    aptLiftShaft.add(aptCabGroup);
    this.aptElevatorPlatform = aptCabGroup;
    this.group.add(aptLiftShaft);

    // Elevator floor call pads on Ground..Rooftop
    for (let fl = 0; fl < 5; fl++) {
      const callPad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.05), brassMat);
      callPad.position.set(2.55, fl * 3.2 + 1.35, -5.4);
      this.group.add(callPad);
    }

    // --- 3. LUXURY INTEGRATED REFRIGERATOR ---
    const fridgeBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x3b4048, metalness: 0.72, roughness: 0.28 })
    );
    fridgeBody.position.set(4.5, 1.22, 5.8);
    fridgeBody.castShadow = true;
    fridgeBody.receiveShadow = true;

    this.fridgeDoor = new THREE.Group();
    this.fridgeDoor.position.set(4.5, 1.22, 5.3);
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.18, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x454b54, metalness: 0.75, roughness: 0.26 })
    );
    const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.85, 0.06), brassMat);
    doorHandle.position.set(0.48, 0, -0.08);
    this.fridgeDoor.add(doorPanel, doorHandle);
    f1.add(fridgeBody, this.fridgeDoor);

    // --- 4. MODERN CHEF'S MARBLE KITCHEN COUNTER, SINK & INDUCTION STOVE ---
    const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.1), this.walnutAccentMat);
    kitchenCounter.position.set(5.8, 0.57, 3.2);
    kitchenCounter.castShadow = true;
    kitchenCounter.receiveShadow = true;
    const counterMarbleTop = new THREE.Mesh(new THREE.BoxGeometry(3.66, 0.08, 1.16), marbleIslandMat);
    counterMarbleTop.position.set(5.8, 1.05, 3.2);

    const kitchenSink = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.38, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.88, roughness: 0.24 })
    );
    kitchenSink.position.set(5.8, 0.9, 2.5);

    const kitchenFaucet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), brassMat);
    kitchenFaucet.position.set(5.8, 1.2, 2.85);

    this.kitchenTapWaterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.025, 0.32, 6),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, roughness: 0.1 })
    );
    this.kitchenTapWaterMesh.position.set(5.8, 0.98, 2.75);
    this.kitchenTapWaterMesh.visible = false;

    const stoveBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.92, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1b1f26, metalness: 0.8, roughness: 0.25 })
    );
    stoveBody.position.set(5.8, 0.58, 4.6);
    stoveBody.castShadow = true;
    stoveBody.receiveShadow = true;

    this.kitchenStoveBurners = [];
    const burnerOffsets = [
      [-0.25, -0.25],
      [0.25, -0.25],
      [-0.25, 0.25],
      [0.25, 0.25],
    ];
    for (const [bx, bz] of burnerOffsets) {
      const burner = new THREE.Mesh(
        new THREE.TorusGeometry(0.12, 0.025, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 })
      );
      burner.rotation.x = Math.PI / 2;
      burner.position.set(5.8 + bx, 1.05, 4.6 + bz);
      this.kitchenStoveBurners.push(burner);
      f1.add(burner);
    }
    f1.add(kitchenCounter, counterMarbleTop, kitchenSink, kitchenFaucet, this.kitchenTapWaterMesh, stoveBody);

    // --- 4B. FORMAL DINING ROOM (Travertine & Walnut Table + 4 Designer Chairs) at (2.2, 1.2) ---
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 1.2), marbleIslandMat);
    diningTable.position.set(2.2, 0.88, 1.2);
    diningTable.castShadow = true;
    diningTable.receiveShadow = true;
    const diningPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.74, 0.55), this.walnutAccentMat);
    diningPedestal.position.set(2.2, 0.48, 1.2);
    diningPedestal.castShadow = true;

    const chairOffsets = [
      [-0.6, -0.75, 0],
      [0.6, -0.75, 0],
      [-0.6, 0.75, Math.PI],
      [0.6, 0.75, Math.PI],
    ];
    for (let i = 0; i < chairOffsets.length; i++) {
      const [cx, cz, crot] = chairOffsets[i];
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.85, 0.44), boucleMat);
      chair.name = `dining_chair_${i}`;
      chair.position.set(2.2 + cx, 0.45, 1.2 + cz);
      chair.rotation.y = crot;
      chair.castShadow = true;
      chair.receiveShadow = true;
      f1.add(chair);
    }
    f1.add(diningTable, diningPedestal);

    // --- 5. SPACIOUS LUXURY LIVING ROOM SOFA, COFFEE TABLE & REAL-TIME WALL CLOCK ---
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.82, 1.2), boucleMat);
    sofa.position.set(0, 0.54, 0.5);
    sofa.castShadow = true;
    sofa.receiveShadow = true;

    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.42, 0.92), marbleIslandMat);
    coffeeTable.position.set(0, 0.34, -1.2);
    coffeeTable.castShadow = true;
    coffeeTable.receiveShadow = true;

    const phoneMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
    );
    phoneMesh.position.set(0.3, 0.57, -1.2);
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x00d2d3 })
    );
    phoneScreen.rotation.x = -Math.PI / 2;
    phoneScreen.position.set(0.3, 0.585, -1.2);

    const wallClockMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24),
      brassMat
    );
    wallClockMesh.rotation.x = Math.PI / 2;
    wallClockMesh.position.set(-1.2, 2.3, -1.8);
    const clockFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.76),
      new THREE.MeshBasicMaterial({ map: this.wallClockTexture, transparent: true })
    );
    clockFace.position.set(-1.2, 2.3, -1.76);
    f1.add(sofa, coffeeTable, phoneMesh, phoneScreen, wallClockMesh, clockFace);

    // --- 6. ARCHITECTURAL WALNUT & BRASS CEILING FAN ---
    const fanHub = new THREE.Group();
    fanHub.position.set(0, 2.95, 0.5);
    const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), this.charcoalBronzeMat);
    fanStem.position.y = -0.15;
    const fanMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 10), brassMat);
    fanMotor.position.y = -0.3;

    this.fanBlades = new THREE.Group();
    this.fanBlades.position.y = -0.32;
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.16), this.walnutAccentMat);
      blade.rotation.y = (i * Math.PI) / 2;
      blade.position.set(Math.cos(blade.rotation.y) * 0.55, 0, Math.sin(blade.rotation.y) * 0.55);
      this.fanBlades.add(blade);
    }
    fanHub.add(fanStem, fanMotor, this.fanBlades);
    f1.add(fanHub);

    // --- 7. SLEEK CLIMATE CONTROL UNIT ---
    this.acMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.48, 0.36), this.charcoalBronzeMat);
    this.acMesh.position.set(-2.5, 2.5, -6.6);

    this.acLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const acLed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), this.acLedMat);
    acLed.position.set(-1.8, 2.4, -6.38);
    f1.add(this.acMesh, acLed);

    // --- 8. REINFORCED ARCHITECTURAL BRONZE & WALNUT FRONT ENTRANCE DOUBLE DOORS ---
    this.frontDoorMesh = new THREE.Group();
    this.frontDoorMesh.name = 'apartment_double_front_doors';
    const doorHeight = 2.42;
    const doorLeafWidth = 0.99;
    const doorThickness = 0.15;
    this.frontDoorMesh.position.set(0, 1.4, -6.9);

    const doorMaterial = this.walnutAccentMat;
    const handleMaterial = brassMat;

    this.frontDoorLeftLeaf = new THREE.Group();
    this.frontDoorLeftLeaf.name = 'frontDoorLeftLeaf';
    this.frontDoorLeftLeaf.position.x = -0.98;
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, doorHeight, doorThickness), doorMaterial);
    leftPanel.position.set(doorLeafWidth / 2, 0, 0);
    leftPanel.castShadow = true;
    leftPanel.receiveShadow = true;
    const leftBronzeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorHeight, doorThickness + 0.02), this.charcoalBronzeMat);
    leftBronzeTrim.position.set(doorLeafWidth - 0.04, 0, 0);
    const leftHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10), handleMaterial);
    leftHandle.position.set(doorLeafWidth - 0.14, 0, 0.11);
    this.frontDoorLeftLeaf.add(leftPanel, leftBronzeTrim, leftHandle);

    this.frontDoorRightLeaf = new THREE.Group();
    this.frontDoorRightLeaf.name = 'frontDoorRightLeaf';
    this.frontDoorRightLeaf.position.x = 0.98;
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, doorHeight, doorThickness), doorMaterial);
    rightPanel.position.set(-doorLeafWidth / 2, 0, 0);
    rightPanel.castShadow = true;
    rightPanel.receiveShadow = true;
    const rightBronzeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, doorHeight, doorThickness + 0.02), this.charcoalBronzeMat);
    rightBronzeTrim.position.set(-doorLeafWidth + 0.04, 0, 0);
    const rightHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10), handleMaterial);
    rightHandle.position.set(-doorLeafWidth + 0.14, 0, 0.11);
    this.frontDoorRightLeaf.add(rightPanel, rightBronzeTrim, rightHandle);

    this.frontDoorMesh.add(this.frontDoorLeftLeaf, this.frontDoorRightLeaf);
    f1.add(this.frontDoorMesh);

    // --- REAR SLIDING PATIO GLASS DOUBLE DOORS (X = 0, Z = 6.8) ---
    this.patioDoorMesh = new THREE.Group();
    this.patioDoorMesh.name = 'rear_patio_sliding_doors';
    this.patioDoorMesh.position.set(0, 1.4, 6.8);

    const patioFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.6, 0.12), this.charcoalBronzeMat);
    this.patioDoorMesh.add(patioFrame);

    const patioLeafW = 1.15;
    this.patioDoorLeftLeaf = new THREE.Mesh(new THREE.BoxGeometry(patioLeafW, 2.45, 0.06), this.curtainGlassMat);
    this.patioDoorLeftLeaf.position.set(this.patioDoorOpen ? -1.15 : -0.58, 0, 0.02);
    this.patioDoorLeftLeaf.castShadow = true;

    this.patioDoorRightLeaf = new THREE.Mesh(new THREE.BoxGeometry(patioLeafW, 2.45, 0.06), this.curtainGlassMat);
    this.patioDoorRightLeaf.position.set(this.patioDoorOpen ? 1.15 : 0.58, 0, -0.02);
    this.patioDoorRightLeaf.castShadow = true;

    this.patioDoorMesh.add(this.patioDoorLeftLeaf, this.patioDoorRightLeaf);
    f1.add(this.patioDoorMesh);

    // ==============================================================
    // GUEST LUXURY SPA BATHROOM SUITE (Southwest: X = -7.4 to -3.5, Z = -6.6 to -3.2)
    // ==============================================================
    const bathGroup = new THREE.Group();
    bathGroup.name = 'ground_floor_luxury_bathroom_suite';

    const ceramicTileMat = this.travertineStoneMat;
    const bathFloor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 3.4), ceramicTileMat);
    bathFloor.position.set(-5.45, 0.16, -4.9);
    bathFloor.receiveShadow = true;

    const bathWallMat = this.warmLimestoneMat;
    const bathNorthWall = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.8, 0.18), bathWallMat);
    bathNorthWall.position.set(-5.45, 1.55, -3.2);
    bathNorthWall.castShadow = true;
    bathNorthWall.receiveShadow = true;

    const bathEastWallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.8, 1.8), bathWallMat);
    bathEastWallSouth.position.set(-3.5, 1.55, -5.7);
    bathEastWallSouth.castShadow = true;

    // East partition wall Header above doorway (Z = -4.8 to -3.2, Y = 2.4 to 2.95)
    const bathDoorLintel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.6, 1.6), bathWallMat);
    bathDoorLintel.position.set(-3.5, 2.65, -4.0);

    // 3. Hinged Wooden Bathroom Door at (-3.5, 1.35, -4.0) with brass handle
    this.bathroomDoorGroup = new THREE.Group();
    this.bathroomDoorGroup.name = 'bathroom_hinged_door';
    this.bathroomDoorGroup.position.set(-3.5, 1.35, -3.4); // Hinge position on north side of opening

    this.bathroomDoorLeaf = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2.3, 0.95),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 })
    );
    this.bathroomDoorLeaf.position.set(0, 0, -0.475);
    this.bathroomDoorLeaf.castShadow = true;
    this.bathroomDoorLeaf.receiveShadow = true;

    const bathDoorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), handleMaterial);
    bathDoorHandle.position.set(0.06, 0, -0.85);
    this.bathroomDoorGroup.add(this.bathroomDoorLeaf, bathDoorHandle);

    // 4. Dedicated Bathroom Ceiling Light & Wall Switch
    this.bathroomLight = new THREE.PointLight(0xfff7ed, 1.6, 9.0, 1.2);
    this.bathroomLight.position.set(-5.4, 2.85, -4.9);
    this.bathroomLight.castShadow = true;

    const bathLightFixture = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    bathLightFixture.position.set(-5.4, 2.92, -4.9);

    const bathSwitch = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.12, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 })
    );
    bathSwitch.position.set(-3.58, 1.35, -3.6);

    // 5. Modern Vanity Unit with Ceramic Washbasin Bowl at (-4.5, -3.45)
    const vanityCabinet = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.82, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    );
    vanityCabinet.position.set(-4.5, 0.56, -3.55);
    vanityCabinet.castShadow = true;
    vanityCabinet.receiveShadow = true;

    const ceramicWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.1 });
    const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.52), ceramicWhiteMat);
    sinkBasin.position.set(-4.5, 0.98, -3.55);
    sinkBasin.castShadow = true;

    // Chrome Faucet & Animated Water Stream
    this.bathroomTapMesh = new THREE.Group();
    this.bathroomTapMesh.position.set(-4.5, 1.12, -3.35);
    const tapStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
    );
    tapStem.position.y = 0.1;
    const tapSpout = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
    );
    tapSpout.rotation.x = Math.PI / 3;
    tapSpout.position.set(0, 0.18, -0.08);
    const tapHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.02, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.1 })
    );
    tapHandle.position.set(0, 0.22, 0);
    this.bathroomTapMesh.add(tapStem, tapSpout, tapHandle);

    this.bathroomTapWaterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.02, 0.28, 6),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, roughness: 0.05 })
    );
    this.bathroomTapWaterMesh.position.set(-4.5, 1.0, -3.48);
    this.bathroomTapWaterMesh.visible = false;

    // 6. Large Framed Bathroom Mirror above Sink
    const mirrorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.85, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 })
    );
    mirrorFrame.position.set(-4.5, 1.82, -3.31);
    const mirrorSurface = new THREE.Mesh(
      new THREE.PlaneGeometry(1.02, 0.77),
      new THREE.MeshStandardMaterial({
        color: 0xccddee,
        metalness: 0.98,
        roughness: 0.04,
      })
    );
    mirrorSurface.rotation.y = Math.PI; // Faces -Z into bathroom
    mirrorSurface.position.set(-4.5, 1.82, -3.28);

    // 7. Medicine Cabinet with Opening Mirror Door at (-5.6, 1.82, -3.31)
    const cabinetBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.85, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    );
    cabinetBody.position.set(-5.6, 1.82, -3.4);
    cabinetBody.castShadow = true;

    // Inside shelves
    const shelf1 = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.02, 0.14), this.metalTrimMat);
    shelf1.position.set(-5.6, 1.7, -3.4);
    const shelf2 = shelf1.clone(); shelf2.position.y = 1.95;

    // Supplies on shelves (Antiseptic bottle & Bandage roll)
    const antisepticBottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, roughness: 0.3 })
    );
    antisepticBottle.position.set(-5.75, 1.77, -3.4);
    const soapBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 })
    );
    soapBar.position.set(-5.5, 1.73, -3.4);

    this.bathroomCabinetDoor = new THREE.Group();
    this.bathroomCabinetDoor.position.set(-5.95, 1.82, -3.31); // Hinge on left
    const cDoorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.85, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.9, roughness: 0.1 })
    );
    cDoorPanel.position.set(0.35, 0, 0);
    this.bathroomCabinetDoor.add(cDoorPanel);

    // 8. Glass Shower Stall at Northwest corner (X = -7.4 to -6.2, Z = -4.6 to -3.3)
    const showerTray = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.12, 1.3),
      ceramicWhiteMat
    );
    showerTray.position.set(-6.75, 0.22, -3.95);
    showerTray.receiveShadow = true;

    // Tempered Frameless Glass Enclosure
    const showerGlassMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.05,
      metalness: 0.3,
      transparent: true,
      opacity: 0.35,
    });
    const showerGlassEast = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.3, 1.3), showerGlassMat);
    showerGlassEast.position.set(-6.1, 1.35, -3.95);
    showerGlassEast.castShadow = true;

    const showerGlassSouth = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.3, 0.04), showerGlassMat);
    showerGlassSouth.position.set(-6.48, 1.35, -4.6);
    showerGlassSouth.castShadow = true;

    // Chrome Shower Column & Rain Showerhead
    const showerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.1, 8), this.metalTrimMat);
    showerColumn.position.set(-7.3, 1.4, -3.95);
    const showerArm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.03, 0.03), this.metalTrimMat);
    showerArm.position.set(-7.12, 2.45, -3.95);
    const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16), this.metalTrimMat);
    showerHead.position.set(-6.95, 2.43, -3.95);

    // Shower falling water spray particle group
    this.bathroomShowerWaterGroup = new THREE.Group();
    this.bathroomShowerWaterGroup.position.set(-6.95, 2.4, -3.95);
    for (let i = 0; i < 8; i++) {
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.015, 1.9, 4),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 })
      );
      const angle = (i * Math.PI) / 4;
      drop.position.set(Math.cos(angle) * 0.08, -0.95, Math.sin(angle) * 0.08);
      this.bathroomShowerWaterGroup.add(drop);
    }
    this.bathroomShowerWaterGroup.visible = false;

    // Shower Steam Mist
    this.bathroomShowerSteamMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.28 })
    );
    this.bathroomShowerSteamMesh.position.set(-6.75, 1.4, -3.95);
    this.bathroomShowerSteamMesh.visible = false;

    // 9. Freestanding Porcelain Bathtub at (-6.5, 0.65, -5.7)
    const tubGroup = new THREE.Group();
    tubGroup.position.set(-6.5, 0, -5.7);

    const tubBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.68, 1.8),
      ceramicWhiteMat
    );
    tubBody.position.set(0, 0.5, 0);
    tubBody.castShadow = true;
    tubBody.receiveShadow = true;

    // Bathtub Warm Water with Animated Ripple Rings
    this.bathtubWaterMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 1.56),
      new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.08,
        metalness: 0.4,
        transparent: true,
        opacity: 0.8,
      })
    );
    this.bathtubWaterMesh.rotation.x = -Math.PI / 2;
    this.bathtubWaterMesh.position.set(0, 0.72, 0);

    const tubFaucet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 8), this.metalTrimMat);
    tubFaucet.position.set(-0.55, 0.95, 0);
    tubGroup.add(tubBody, this.bathtubWaterMesh, tubFaucet);

    // 10. Modern Ceramic Toilet at (-4.4, 0.52, -6.0)
    const toiletGroup = new THREE.Group();
    toiletGroup.position.set(-4.4, 0, -6.0);

    const toiletBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.46, 16), ceramicWhiteMat);
    toiletBase.position.set(0, 0.39, 0);
    toiletBase.castShadow = true;

    const toiletBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.16, 16), ceramicWhiteMat);
    toiletBowl.position.set(0, 0.64, 0);

    const toiletSeat = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.045, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
    );
    toiletSeat.rotation.x = Math.PI / 2;
    toiletSeat.position.set(0, 0.72, 0);

    const toiletCistern = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.62, 0.28),
      ceramicWhiteMat
    );
    toiletCistern.position.set(0, 0.98, -0.32);
    toiletCistern.castShadow = true;

    const flushButton = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10),
      this.metalTrimMat
    );
    flushButton.position.set(0, 1.3, -0.32);

    this.toiletWaterMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    this.toiletWaterMesh.rotation.x = -Math.PI / 2;
    this.toiletWaterMesh.position.set(0, 0.61, 0);
    toiletGroup.add(toiletBase, toiletBowl, toiletSeat, toiletCistern, flushButton, this.toiletWaterMesh);

    // 11. Chrome Towel Rack & Hanging Plush Bath Towels at (-3.6, 1.35, -5.2)
    const towelRackGroup = new THREE.Group();
    towelRackGroup.position.set(-3.6, 1.35, -5.2);
    const towelBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.85), this.metalTrimMat);
    const towel1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.65, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.95 })
    );
    towel1.position.set(0.02, -0.28, -0.18);
    const towel2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.55, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.95 })
    );
    towel2.position.set(0.02, -0.23, 0.18);
    towelRackGroup.add(towelBar, towel1, towel2);

    bathGroup.add(
      bathFloor,
      bathNorthWall,
      bathEastWallSouth,
      bathDoorLintel,
      this.bathroomDoorGroup,
      this.bathroomLight,
      bathLightFixture,
      bathSwitch,
      vanityCabinet,
      sinkBasin,
      this.bathroomTapMesh,
      this.bathroomTapWaterMesh,
      mirrorFrame,
      mirrorSurface,
      cabinetBody,
      shelf1,
      shelf2,
      antisepticBottle,
      soapBar,
      this.bathroomCabinetDoor,
      showerTray,
      showerGlassEast,
      showerGlassSouth,
      showerColumn,
      showerArm,
      showerHead,
      this.bathroomShowerWaterGroup,
      this.bathroomShowerSteamMesh,
      tubGroup,
      toiletGroup,
      towelRackGroup
    );

    f1.add(bathGroup);
  }

  // ==========================================
  // FIRST FLOOR (LEVEL 1): PRIVATE RESIDENCE
  // ==========================================
  private buildFloor2() {
    const f2 = this.floor2Group;
    const yOff = 3.2;
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8a45d, metalness: 0.85, roughness: 0.25 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xede7dc, roughness: 0.88 });
    const taupeMat = new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 0.85 });
    const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf8f8f6, roughness: 0.16, metalness: 0.08 });

    // Walnut & Travertine Floor + Limestone Ceiling
    f2.add(this.createSlabWithStairwell(this.walnutAccentMat, 0.25, yOff + 0.12));
    f2.add(this.createSlabWithStairwell(this.warmLimestoneMat, 0.2, yOff + 3.1));

    // Interior Architectural Partition Walls (leaving Z in [-2.8, -0.8] open for West Wing & X=0 open for balconies)
    const loungePartition = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 5.2), this.warmLimestoneMat);
    loungePartition.position.set(-1.9, yOff + 1.55, 3.6);
    const guestSuiteWall = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.8, 0.18), this.warmLimestoneMat);
    guestSuiteWall.position.set(1.2, yOff + 1.55, 2.2);
    const masterBathWall = new THREE.Mesh(new THREE.BoxGeometry(4.0, 2.8, 0.18), this.travertineStoneMat);
    masterBathWall.position.set(-5.6, yOff + 1.55, -2.9);
    f2.add(loungePartition, guestSuiteWall, masterBathWall);

    // --- MASTER BEDROOM SUITE (Northwest Core: X in [-7.6, -2.0], Z in [0.2, 6.5]) ---
    const masterFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.45, 2.9), this.walnutAccentMat);
    masterFrame.position.set(-4.8, yOff + 0.36, 3.6);
    masterFrame.castShadow = true;
    const masterHeadboard = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.65, 0.18), this.walnutAccentMat);
    masterHeadboard.position.set(-4.8, yOff + 0.98, 5.2);
    const masterMattress = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.34, 2.6), porcelainMat);
    masterMattress.position.set(-4.8, yOff + 0.68, 3.6);
    const masterDuvet = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.36, 1.75), taupeMat);
    masterDuvet.position.set(-4.8, yOff + 0.70, 3.1);
    for (const px of [-5.45, -4.15]) {
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.56), creamMat);
      pillow.position.set(px, yOff + 0.9, 4.6);
      f2.add(pillow);
    }
    for (const nx of [-6.45, -3.15]) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.58, 0.62), this.walnutAccentMat);
      stand.position.set(nx, yOff + 0.42, 4.8);
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.28, 12), this.warmSconceMat);
      sconce.position.set(nx, yOff + 0.95, 4.8);
      f2.add(stand, sconce);
    }
    // Master Walk-in Wardrobe
    const masterWardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.35, 2.4), this.walnutAccentMat);
    masterWardrobe.position.set(-7.1, yOff + 1.32, 1.6);
    const wardrobeTrim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.1, 0.08), brassMat);
    wardrobeTrim.position.set(-6.64, yOff + 1.32, 1.6);
    f2.add(masterFrame, masterHeadboard, masterMattress, masterDuvet, masterWardrobe, wardrobeTrim);

    // --- ATTACHED MASTER LUXURY BATHROOM (Southwest Core: X in [-7.6, -3.4], Z in [-6.5, -3.0]) ---
    const spaFloor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 3.4), this.travertineStoneMat);
    spaFloor.position.set(-5.5, yOff + 0.25, -4.8);
    const spaTub = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.65, 1.95), porcelainMat);
    spaTub.position.set(-6.4, yOff + 0.58, -5.2);
    const spaTubWater = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7), this.waterMat);
    spaTubWater.rotation.x = -Math.PI / 2;
    spaTubWater.position.set(-6.4, yOff + 0.92, -5.2);
    const spaVanity = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 0.68), this.walnutAccentMat);
    spaVanity.position.set(-4.5, yOff + 0.65, -3.4);
    const spaMirror = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.95, 0.04), brassMat);
    spaMirror.position.set(-4.5, yOff + 1.78, -3.08);
    f2.add(spaFloor, spaTub, spaTubWater, spaVanity, spaMirror);

    // --- ADDITIONAL BEDROOM (Northeast Core: X in [-1.0, 4.0], Z in [2.5, 6.5]) ---
    const addBed = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.45, 2.4), this.walnutAccentMat);
    addBed.position.set(1.5, yOff + 0.36, 4.8);
    const addMattress = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.3, 2.2), creamMat);
    addMattress.position.set(1.5, yOff + 0.66, 4.8);
    const addWardrobe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 1.8), this.walnutAccentMat);
    addWardrobe.position.set(3.6, yOff + 1.25, 4.8);
    f2.add(addBed, addMattress, addWardrobe);

    // --- FAMILY LOUNGE (Central Core: X in [-1.5, 3.8], Z in [-4.0, +1.8]) ---
    const familySofa = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.8, 1.15), creamMat);
    familySofa.position.set(0.4, yOff + 0.54, -1.2);
    const familyTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.85), this.travertineStoneMat);
    familyTable.position.set(0.4, yOff + 0.34, -2.7);
    const mediaUnit = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 2.2), this.walnutAccentMat);
    mediaUnit.position.set(-1.55, yOff + 0.46, -1.2);
    const loungeTv = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 1.85), this.charcoalBronzeMat);
    loungeTv.position.set(-1.72, yOff + 1.45, -1.2);
    f2.add(familySofa, familyTable, mediaUnit, loungeTv);

    // --- CANTILEVERED PANORAMIC BALCONIES (South Z = -8.1 & North Z = +8.1) ---
    for (const bz of [-8.1, 8.1]) {
      const balcSlab = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.24, 2.2), this.travertineStoneMat);
      balcSlab.position.set(0, yOff + 0.12, bz);
      balcSlab.receiveShadow = true;
      const outerZ = bz < 0 ? -9.15 : 9.15;
      const railGlass = new THREE.Mesh(new THREE.BoxGeometry(15.6, 1.05, 0.06), this.curtainGlassMat);
      railGlass.position.set(0, yOff + 0.72, outerZ);
      const railCap = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.06, 0.1), this.charcoalBronzeMat);
      railCap.position.set(0, yOff + 1.26, outerZ);
      for (const lx of [-4.5, 4.5]) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.65, 0.95), creamMat);
        chair.position.set(lx, yOff + 0.48, bz);
        f2.add(chair);
      }
      f2.add(balcSlab, railGlass, railCap);
    }

    const light = new THREE.PointLight(0xffe9cc, 1.9, 18, 1.3);
    light.position.set(-0.5, yOff + 2.7, 0);
    this.floorLights.push(light);
    f2.add(light);
  }

  // ==========================================
  // SECOND FLOOR (LEVEL 2): MEDICAL & SURVIVAL
  // ==========================================
  private buildFloor3() {
    const f3 = this.floor3Group;
    const yOff = 6.4;
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc8a45d, metalness: 0.85, roughness: 0.25 });
    const bedMat = new THREE.MeshStandardMaterial({ color: 0xf1f4f5, roughness: 0.78 });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.65, roughness: 0.35 });
    const shelterMat = new THREE.MeshStandardMaterial({ color: 0x2a313b, metalness: 0.82, roughness: 0.32 });

    // Clean Terrazzo/Limestone Floor + Ceiling
    f3.add(this.createSlabWithStairwell(this.warmLimestoneMat, 0.25, yOff + 0.12));
    f3.add(this.createSlabWithStairwell(this.warmLimestoneMat, 0.2, yOff + 3.1));

    // Glass & Bronze Divider separating Medical Wing (West) from Survival Vault & Command (East)
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.85, 6.2), this.charcoalBronzeMat);
    divider.position.set(-1.5, yOff + 1.55, 2.9);
    const dividerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.2, 5.8), this.curtainGlassMat);
    dividerGlass.position.set(-1.5, yOff + 1.6, 2.9);
    f3.add(divider, dividerGlass);

    // --- 1. MEDICAL CENTRE RECEPTION & TRIAGE (West-South: -2.8, -5.2) ---
    const reception = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.05, 0.88), this.travertineStoneMat);
    reception.position.set(-2.8, yOff + 0.62, -5.2);
    const receptionScreen = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.55, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x37c9d8 })
    );
    receptionScreen.position.set(-2.8, yOff + 1.38, -5.05);
    f3.add(reception, receptionScreen);

    // --- 2. FOUR HOSPITAL PATIENT BAYS (West Wall, leaving Z = -1.8 open for West Wing Trauma Annex) ---
    const bayPositions: Array<[number, number]> = [
      [-6.0, -4.2],
      [-6.0, 0.8],
      [-6.0, 3.4],
      [-6.0, 5.8],
    ];
    for (const [bx, bz] of bayPositions) {
      const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.22, 1.0), bedMat);
      bed.position.set(bx, yOff + 0.55, bz);
      const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(1.92, 0.18, 0.88),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
      );
      mattress.position.set(bx, yOff + 0.74, bz);
      const monitor = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.52, 0.16),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x063e46 })
      );
      monitor.position.set(bx - 1.15, yOff + 1.5, bz);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.3), new THREE.MeshBasicMaterial({ color: 0x39e0a0 }));
      screen.rotation.y = Math.PI / 2;
      screen.position.set(bx - 1.06, yOff + 1.5, bz);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.65, 8), frameMat);
      pole.position.set(bx + 0.95, yOff + 1.15, bz - 0.55);
      const oxygen = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 1.02, 12),
        new THREE.MeshStandardMaterial({ color: 0x4c9f77, metalness: 0.55 })
      );
      oxygen.position.set(bx - 1.2, yOff + 0.75, bz + 0.52);
      f3.add(bed, mattress, monitor, screen, pole, oxygen);
    }

    // Emergency Treatment / Operating Station & Medical Supply Cabinets
    const examTable = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.72, 0.95), bedMat);
    examTable.position.set(-3.1, yOff + 0.5, 3.6);
    const surgLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.65, 0.12, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0x38bdf8, emissiveIntensity: 0.35 })
    );
    surgLamp.position.set(-3.1, yOff + 2.65, 3.6);
    f3.add(examTable, surgLamp);

    for (let i = 0; i < 3; i++) {
      const medCab = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 2.0, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xdce3e8, metalness: 0.25 })
      );
      medCab.position.set(-5.8 + i * 1.4, yOff + 1.15, 6.2);
      f3.add(medCab);
    }

    // --- 3. SECURITY MONITORING & 5KM RADAR COMMAND STATION (Relocated from Ground Lobby) ---
    this.commandConsoleGroup = new THREE.Group();
    this.commandConsoleGroup.name = 'floor2_security_monitoring_centre';
    this.commandConsoleGroup.position.set(0.3, yOff, -4.2);

    const cmdDesk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.85, 0.95), this.charcoalBronzeMat);
    cmdDesk.position.set(0, 0.45, 0);
    cmdDesk.castShadow = true;

    const cmdKeyboard = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.04, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 })
    );
    cmdKeyboard.position.set(0, 0.89, 0.18);
    for (let i = 0; i < 4; i++) {
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 8, 8),
        new THREE.MeshBasicMaterial({ color: [0x10b981, 0x06b6d4, 0xf59e0b, 0xef4444][i] })
      );
      led.position.set(-0.6 + i * 0.4, 0.92, 0.22);
      this.commandConsoleGroup.add(led);
    }

    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.65, 0.08), this.charcoalBronzeMat);
    screenFrame.position.set(0, 1.75, -0.38);
    const screenMat = new THREE.MeshBasicMaterial({ map: this.securityScreenTexture });
    this.securityScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.56), screenMat);
    this.securityScreenMesh.position.set(0, 1.75, -0.33);

    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.55, 12), this.charcoalBronzeMat);
    stool.position.set(0, 0.28, 0.85);
    this.commandConsoleGroup.add(cmdDesk, cmdKeyboard, screenFrame, this.securityScreenMesh, stool);
    f3.add(this.commandConsoleGroup);

    // --- 4. SURVIVAL EQUIPMENT, ARMORY VAULT & SECURE SURVIVAL SHELTER (East Core) ---
    // Reinforced Biometric Vault & Emergency Rations/Supply Lockers along North Wall
    const vault = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.65, 1.1), shelterMat);
    vault.position.set(0.2, yOff + 1.45, 5.8);
    const vaultDial = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), brassMat);
    vaultDial.rotation.x = Math.PI / 2;
    vaultDial.position.set(0.2, yOff + 1.5, 5.22);
    f3.add(vault, vaultDial);

    for (let x = 2.4; x <= 6.4; x += 2.0) {
      const locker = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, 0.95), shelterMat);
      locker.position.set(x, yOff + 1.3, 5.8);
      const rackGun = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.28, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x5e81ac, metalness: 0.8 })
      );
      rackGun.position.set(x, yOff + 1.45, 5.25);
      f3.add(locker, rackGun);
    }

    // Emergency Supply Crates & Tactical Armor Stands
    for (let i = 0; i < 3; i++) {
      const armorTorso = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.92, 0.36),
        new THREE.MeshStandardMaterial({ color: 0x4c5a45, metalness: 0.25, roughness: 0.8 })
      );
      armorTorso.position.set(2.2 + i * 1.55, yOff + 1.15, 3.8);
      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x56614c, metalness: 0.35 })
      );
      helmet.position.set(2.2 + i * 1.55, yOff + 1.88, 3.8);
      f3.add(armorTorso, helmet);
    }
    for (let i = 0; i < 3; i++) {
      const supplyCrate = new THREE.Mesh(
        new THREE.BoxGeometry(1.0, 0.85, 0.95),
        new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.55, roughness: 0.45 })
      );
      supplyCrate.position.set(5.8, yOff + 0.58, -5.8 + i * 1.2);
      f3.add(supplyCrate);
    }

    // Interactive Armory Master Terminal (Center East: X = 2.0, Z = 0.0)
    const consolePedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 1.1, 8), this.charcoalBronzeMat);
    consolePedestal.position.set(2.0, yOff + 0.65, 0.0);
    const consoleScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    consoleScreen.rotation.x = -Math.PI / 4;
    consoleScreen.position.set(2.0, yOff + 1.45, 0.0);
    f3.add(consolePedestal, consoleScreen);

    // Cantilevered South & North Balconies on Floor 2
    for (const bz of [-8.1, 8.1]) {
      const balcSlab = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.24, 2.2), this.warmLimestoneMat);
      balcSlab.position.set(0, yOff + 0.12, bz);
      const outerZ = bz < 0 ? -9.15 : 9.15;
      const railGlass = new THREE.Mesh(new THREE.BoxGeometry(15.6, 1.05, 0.06), this.curtainGlassMat);
      railGlass.position.set(0, yOff + 0.72, outerZ);
      const railCap = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.06, 0.1), this.charcoalBronzeMat);
      railCap.position.set(0, yOff + 1.26, outerZ);
      f3.add(balcSlab, railGlass, railCap);
    }

    const medLight = new THREE.PointLight(0xeef7ff, 2.0, 16, 1.3);
    medLight.position.set(-4.2, yOff + 2.7, 0);
    const survLight = new THREE.PointLight(0xffe9cc, 1.8, 16, 1.3);
    survLight.position.set(2.2, yOff + 2.7, 0);
    this.floorLights.push(medLight, survLight);
    f3.add(medLight, survLight);
  }

  // ==========================================
  // ==========================================
  // FLOOR 4: EMERGENCY SURVIVAL FARM AND UTILITIES
  private buildFloor4Survival() {
    const f = this.floor4Group;
    const y = 9.6;
    f.add(this.createSlabWithStairwell(this.floorTileMat, 0.28, y + 0.14));
    f.add(this.createSlabWithStairwell(this.whiteWallMat, 0.18, y + 3.1));

    const soil = new THREE.MeshStandardMaterial({ color: 0x59432d, roughness: 1.0 });
    const cropGreen = new THREE.MeshStandardMaterial({ color: 0x3b8f48, roughness: 0.9 });
    const cropLeaf = new THREE.MeshStandardMaterial({ color: 0x4e9d42, roughness: 0.95 });

    // Nine raised crop beds. The soil beds are substantial solid planters;
    // the crops remain decorative foliage so they do not snag the player.
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const x = -5.7 + c * 2.2;
        const z = -4.7 + r * 2.1;
        const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.42, 1.55), soil);
        bed.name = `farm_raised_crop_bed_${r}_${c}`;
        bed.position.set(x, y + 0.48, z);
        bed.castShadow = true;
        bed.receiveShadow = true;
        f.add(bed);
        for (let k = 0; k < 4; k++) {
          const px = x - 0.55 + (k % 2) * 0.7;
          const pz = z - 0.35 + Math.floor(k / 2) * 0.65;
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.52, 8), cropGreen);
          stem.position.set(px, y + 0.88, pz);
          stem.castShadow = true;
          f.add(stem);
          const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.23, 8, 7), cropLeaf);
          leaves.position.set(px, y + 1.12, pz);
          leaves.castShadow = true;
          f.add(leaves);
        }
      }
    }

    // LARGE RAW-WATER / CLEAN-WATER STORAGE: two industrial steel tanks.
    // Each tank is 2.1m diameter x 2.65m tall, with a solid base, domed cap,
    // access hatch, ladder and visible inlet/outlet pipework.
    const tankSteel = new THREE.MeshStandardMaterial({ color: 0x547f8c, metalness: 0.72, roughness: 0.32 });
    const tankDark = new THREE.MeshStandardMaterial({ color: 0x293940, metalness: 0.78, roughness: 0.38 });
    const pipeSteel = new THREE.MeshStandardMaterial({ color: 0x8a969b, metalness: 0.82, roughness: 0.28 });
    const tankPositions = [
      { x: 5.25, z: -5.65, name: 'raw_water' },
      { x: 5.25, z: 5.55, name: 'treated_water' },
    ];
    tankPositions.forEach((tp, index) => {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.22, 0.22, 20), tankDark);
      base.position.set(tp.x, y + 0.18, tp.z);
      base.castShadow = true;
      base.receiveShadow = true;
      f.add(base);

      const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 2.55, 24), tankSteel);
      tank.name = `large_${tp.name}_storage_tank`;
      tank.position.set(tp.x, y + 1.56, tp.z);
      tank.castShadow = true;
      tank.receiveShadow = true;
      f.add(tank);

      const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 1.02, 0.22, 24), tankDark);
      roof.position.set(tp.x, y + 2.86, tp.z);
      roof.castShadow = true;
      f.add(roof);
      const hatch = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16), pipeSteel);
      hatch.position.set(tp.x, y + 2.99, tp.z);
      f.add(hatch);

      // Reinforcing hoops make the tank read as heavy industrial equipment.
      for (let band = 0; band < 3; band++) {
        const hoop = new THREE.Mesh(new THREE.TorusGeometry(1.035, 0.045, 8, 24), tankDark);
        hoop.rotation.x = Math.PI / 2;
        hoop.position.set(tp.x, y + 0.78 + band * 0.78, tp.z);
        f.add(hoop);
      }

      // Front inspection gauge and valve assembly.
      const gauge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.09, 16), pipeSteel);
      gauge.rotation.x = Math.PI / 2;
      gauge.position.set(tp.x, y + 2.12, tp.z + 1.04);
      f.add(gauge);
      const valvePipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 12), pipeSteel);
      valvePipe.rotation.x = Math.PI / 2;
      valvePipe.position.set(tp.x, y + 0.55, tp.z + 1.12);
      f.add(valvePipe);
      const valveWheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 8, 16), tankDark);
      valveWheel.position.set(tp.x, y + 0.55, tp.z + 1.5);
      f.add(valveWheel);

      // A fixed access ladder attached to the tank shell.
      const ladderX = tp.x + 0.72;
      for (let side = 0; side < 2; side++) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.25, 8), tankDark);
        rail.position.set(ladderX + side * 0.28, y + 1.55, tp.z + 1.0);
        f.add(rail);
      }
      for (let rung = 0; rung < 8; rung++) {
        const step = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 8), pipeSteel);
        step.rotation.z = Math.PI / 2;
        step.position.set(ladderX + 0.14, y + 0.58 + rung * 0.27, tp.z + 1.0);
        f.add(step);
      }
      if (index === 0) {
        const labelPlate = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.28, 0.06), tankDark);
        labelPlate.position.set(tp.x, y + 2.45, tp.z + 1.04);
        f.add(labelPlate);
      }
    });

    // LARGE WATER-TREATMENT PLANT: a complete skid-mounted treatment train,
    // not a small placeholder box. It includes sediment and carbon vessels,
    // membrane housings, pump motors, control cabinet, pipe manifolds and valves.
    const plantGroup = new THREE.Group();
    plantGroup.name = 'large_water_treatment_plant';
    plantGroup.position.set(-4.35, y, 1.95); // Keep the water-treatment plant clear of the stair flight and landing.
    f.add(plantGroup);
    const skidMat = new THREE.MeshStandardMaterial({ color: 0x38434a, metalness: 0.72, roughness: 0.42 });
    const whitePlant = new THREE.MeshStandardMaterial({ color: 0xcbd4d7, metalness: 0.48, roughness: 0.38 });
    const bluePlant = new THREE.MeshStandardMaterial({ color: 0x286b91, metalness: 0.55, roughness: 0.34 });
    const plantBase = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.28, 2.45), skidMat);
    plantBase.position.set(0, 0.16, 0);
    plantBase.castShadow = true;
    plantBase.receiveShadow = true;
    plantGroup.add(plantBase);

    // Four full-height treatment vessels.
    for (let i = 0; i < 4; i++) {
      const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 1.72, 18), i < 2 ? whitePlant : bluePlant);
      vessel.position.set(-1.65 + i * 0.95, 1.18, -0.42);
      vessel.castShadow = true;
      vessel.receiveShadow = true;
      plantGroup.add(vessel);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 18), skidMat);
      cap.position.set(-1.65 + i * 0.95, 2.08, -0.42);
      plantGroup.add(cap);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 18), skidMat);
      foot.position.set(-1.65 + i * 0.95, 0.32, -0.42);
      plantGroup.add(foot);
    }

    // Three horizontal membrane filter housings on the front of the skid.
    for (let i = 0; i < 3; i++) {
      const membrane = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.25, 16), whitePlant);
      membrane.rotation.z = Math.PI / 2;
      membrane.position.set(0.0, 0.72 + i * 0.43, 0.62);
      membrane.castShadow = true;
      plantGroup.add(membrane);
      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16), bluePlant);
      endCap.rotation.z = Math.PI / 2;
      endCap.position.set(0.66, 0.72 + i * 0.43, 0.62);
      plantGroup.add(endCap);
    }

    // Pump motors and the treatment control cabinet.
    for (let i = 0; i < 2; i++) {
      const pump = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.62, 0.78), bluePlant);
      pump.position.set(-1.35 + i * 2.7, 0.62, 0.82);
      pump.castShadow = true;
      plantGroup.add(pump);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 12), skidMat);
      motor.rotation.z = Math.PI / 2;
      motor.position.set(-1.35 + i * 2.7, 0.66, 1.28);
      plantGroup.add(motor);
    }
    const plantCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.45, 0.42), skidMat);
    plantCabinet.position.set(2.05, 1.0, 0.72);
    plantCabinet.castShadow = true;
    plantGroup.add(plantCabinet);
    const plantScreen = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.035), new THREE.MeshStandardMaterial({ color: 0x123d49, emissive: 0x06232b, roughness: 0.35 }));
    plantScreen.position.set(2.05, 1.28, 0.5);
    plantGroup.add(plantScreen);

    // Solid pipe manifolds between tanks and treatment equipment.
    const makePipe = (a: THREE.Vector3, b: THREE.Vector3, radius = 0.075) => {
      const delta = new THREE.Vector3().subVectors(b, a);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 10), pipeSteel);
      pipe.position.copy(a).add(b).multiplyScalar(0.5);
      pipe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
      pipe.castShadow = true;
      plantGroup.add(pipe);
    };
    makePipe(new THREE.Vector3(-2.25, 1.05, -0.95), new THREE.Vector3(-1.65, 1.05, -0.42));
    makePipe(new THREE.Vector3(1.2, 1.55, -0.42), new THREE.Vector3(2.0, 1.55, -0.42));
    makePipe(new THREE.Vector3(-2.2, 0.55, 0.9), new THREE.Vector3(2.0, 0.55, 0.9));

    // LARGE BACKUP GENERATOR: sound-insulated industrial enclosure with
    // radiator, exhaust stack, service panel and visible ventilation grilles.
    const generatorGroup = new THREE.Group();
    generatorGroup.name = 'large_emergency_backup_generator';
    generatorGroup.position.set(1.65, y, 5.05);
    f.add(generatorGroup);
    const genBodyMat = new THREE.MeshStandardMaterial({ color: 0x48545a, metalness: 0.72, roughness: 0.42 });
    const genAccentMat = new THREE.MeshStandardMaterial({ color: 0xd0a23a, metalness: 0.5, roughness: 0.48 });
    const genBody = new THREE.Mesh(new THREE.BoxGeometry(3.25, 1.72, 1.95), genBodyMat);
    genBody.position.set(0, 1.05, 0);
    genBody.castShadow = true;
    genBody.receiveShadow = true;
    generatorGroup.add(genBody);
    const genBase = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.24, 2.15), skidMat);
    genBase.position.set(0, 0.16, 0);
    genBase.castShadow = true;
    generatorGroup.add(genBase);
    const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.2, 1.45), skidMat);
    radiator.position.set(-1.98, 1.0, 0);
    radiator.castShadow = true;
    generatorGroup.add(radiator);
    for (let i = 0; i < 8; i++) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.82, 1.2), genAccentMat);
      vent.position.set(1.64, 1.0, -0.56 + i * 0.16);
      generatorGroup.add(vent);
    }
    const servicePanel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.08), skidMat);
    servicePanel.position.set(0.78, 1.12, 1.02);
    generatorGroup.add(servicePanel);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.35, 12), skidMat);
    exhaust.position.set(-1.0, 2.35, -0.55);
    generatorGroup.add(exhaust);
    const exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 12), genAccentMat);
    exhaustCap.position.set(-1.0, 2.83, -0.55);
    generatorGroup.add(exhaustCap);

    // Large day-tank fuel reservoir beside the generator, with a visible gauge.
    const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 1.95, 20), genAccentMat);
    fuelTank.name = 'large_generator_fuel_reservoir';
    fuelTank.position.set(5.65, y + 1.12, 5.05);
    fuelTank.castShadow = true;
    fuelTank.receiveShadow = true;
    f.add(fuelTank);
    const fuelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.14, 20), skidMat);
    fuelTop.position.set(5.65, y + 2.16, 5.05);
    f.add(fuelTop);
    const fuelGauge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.12), whitePlant);
    fuelGauge.position.set(6.38, y + 1.2, 5.05);
    f.add(fuelGauge);

    // Electrical distribution cabinet, warning lights and robust storage crates.
    const electricalCabinet = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.05, 0.62), skidMat);
    electricalCabinet.name = 'farm_electrical_distribution_cabinet';
    electricalCabinet.position.set(7.05, y + 1.18, 3.35); // Clear of the stairwell corridor.
    electricalCabinet.castShadow = true;
    f.add(electricalCabinet);
    const panelFace = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.15, 0.045), genBodyMat);
    panelFace.position.set(7.05, y + 1.25, 3.68);
    f.add(panelFace);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: [0x25d07d, 0xf0c43c, 0x25a8df, 0xe34a4a][i], emissive: [0x0b542c, 0x5a4208, 0x073d58, 0x5a1010][i] }));
      light.position.set(6.78 + i * 0.18, y + 1.72, 3.69);
      f.add(light);
    }
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x59664b, roughness: 0.92 });
    for (let i = 0; i < 3; i++) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.9, 0.9), crateMat);
      crate.name = `farm_supply_crate_${i}`;
      crate.position.set(-1.0 + i * 1.1, y + 0.58, 5.35);
      crate.castShadow = true;
      crate.receiveShadow = true;
      f.add(crate);
    }

    // Consistent hard-surface rendering: every machine and structural prop casts
    // and receives shadows. Only actual water surfaces retain transparency.
    f.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
    const utilityLight = new THREE.PointLight(0xd9f3df, 1.8, 18, 1.2);
    utilityLight.position.set(0, y + 2.7, 0);
    this.floorLights.push(utilityLight);
    f.add(utilityLight);
  }

  // RETAINED BASEMENT: secure building operations and emergency stores.
  private buildBasement() {
    const b=this.basementGroup; const floor=new THREE.Mesh(new THREE.BoxGeometry(16,0.25,14),this.metalTrimMat);floor.position.set(0,-3.08,0);b.add(floor);
    const wallMat=new THREE.MeshStandardMaterial({color:0x303941,roughness:0.8,side:THREE.DoubleSide});
    for(const [x,z,w,d] of [[0,6.8,16,0.25],[0,-6.8,16,0.25],[-7.8,0,0.25,14],[7.8,0,0.25,14]] as number[][]){const wall=new THREE.Mesh(new THREE.BoxGeometry(w,3.0,d),wallMat);wall.position.set(x,-1.55,z);b.add(wall);}
    const consoleMat=new THREE.MeshStandardMaterial({color:0x1d2b34,metalness:0.65});
    for(let i=0;i<4;i++){const rack=new THREE.Mesh(new THREE.BoxGeometry(1.25,2.25,0.8),consoleMat);rack.position.set(-5.8+i*2.0,-1.75,5.6);b.add(rack);}
    const desk=new THREE.Mesh(new THREE.BoxGeometry(4.5,0.85,1.4),this.metalTrimMat);desk.position.set(0,-2.55,0.8);b.add(desk);
    for(let i=0;i<3;i++){const screen=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.72,0.08),new THREE.MeshBasicMaterial({color:0x16bcd0}));screen.position.set(-1.2+i*1.2,-1.85,0.05);b.add(screen);}
    for(let i=0;i<4;i++){const crate=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.9,0.9),new THREE.MeshStandardMaterial({color:0x6a7552}));crate.position.set(5.4,-2.55,-4.5+i*1.7);b.add(crate);}

    // Comfortable Leather Armchairs / Seating Area (facing South toward TV)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.75 });
    for (const cx of [-1.1, 1.1]) {
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.75, 0.9), chairMat);
      chair.position.set(cx, -2.55, -2.8);
      chair.rotation.y = 0; // Facing South toward TV
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.8), new THREE.MeshStandardMaterial({ color: 0x334155 }));
      cushion.position.set(cx, -2.3, -2.8);
      b.add(chair, cushion);
    }
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.38, 0.8), this.metalTrimMat);
    coffeeTable.position.set(0, -2.75, -4.2);
    b.add(coffeeTable);

    // BASEMENT TV: Mounted directly opposite sitting chairs on South wall at seated eye level (-1.65m), facing chairs
    const bTvStand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 0.4), this.metalTrimMat);
    bTvStand.position.set(0, -2.6, -6.4);
    const bTvFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 0.08), new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85 }));
    bTvFrame.position.set(0, -1.65, -6.6);

    const bTvMat = new THREE.MeshBasicMaterial({ map: this.basementTvTexture });
    this.basementTvMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.2), bTvMat);
    this.basementTvMesh.rotation.y = 0; // Directly facing North towards the chairs
    this.basementTvMesh.position.set(0, -1.65, -6.55);
    b.add(bTvStand, bTvFrame, this.basementTvMesh);
    const lamp=new THREE.PointLight(0x8bd9e8,1.5,18,1.3);lamp.position.set(0,-0.6,0);b.add(lamp);
  }

  private buildFloor5Pool() {
    const f4 = this.floor5Group;
    const yOff = 12.8;
    const deck = this.createSlabWithStairwell(this.floorTileMat, 0.3, yOff + 0.15);
    f4.add(deck);

    // Raised rooftop swimming pool: the surrounding deck remains dry and walkable.
    const poolGroup = new THREE.Group();
    poolGroup.name = 'rooftop_swimming_pool_with_exit_steps';
    poolGroup.position.set(-2.5, 0, 0);
    f4.add(poolGroup);
    const poolOuterMat = new THREE.MeshStandardMaterial({ color: 0x315a68, roughness: 0.42 });
    const poolTileMat = new THREE.MeshStandardMaterial({ color: 0x8ed4df, roughness: 0.28 });
    const poolWaterMat = new THREE.MeshStandardMaterial({
      color: 0x08a9d0, roughness: 0.08, metalness: 0.12,
      transparent: true, opacity: 0.76, side: THREE.DoubleSide
    });
    const poolBottom = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.28, 6.0), poolOuterMat);
    poolBottom.position.set(0, yOff - 1.25, 0);
    poolBottom.receiveShadow = true;
    poolGroup.add(poolBottom);
    // Four raised basin walls; a stair opening is left on the south/east side.
    const poolWalls = [
      [0, yOff - 0.60, -2.92, 6.0, 1.9, 0.22],
      [-2.92, yOff - 0.60, 0, 0.22, 1.9, 6.0],
      [2.92, yOff - 0.60, 0, 0.22, 1.9, 6.0],
      [-1.15, yOff - 0.60, 2.92, 3.7, 1.9, 0.22],
      [2.35, yOff - 0.60, 2.92, 1.15, 1.9, 0.22]
    ];
    for (const [x,y,z,w,h,d] of poolWalls) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), poolTileMat);
      wall.position.set(x,y,z); wall.castShadow = true; wall.receiveShadow = true;
      poolGroup.add(wall);
    }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(5.55, 5.55), poolWaterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, yOff + 0.02, 0);
    poolGroup.add(water);
    this.poolWaterMesh = water;
    // Three broad submerged steps provide a visible, climbable entry/exit.
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.62), poolTileMat);
      step.position.set(1.2, yOff - 1.02 + i * 0.28, 2.25 - i * 0.58);
      step.receiveShadow = true;
      poolGroup.add(step);
    }

    const glassRailMat = new THREE.MeshStandardMaterial({ color: 0xb9e7f2, roughness: 0.10, metalness: 0.16, envMapIntensity: 1.45, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false });
    const railFrameMat = new THREE.MeshStandardMaterial({ color: 0x59636d, metalness: 0.78, roughness: 0.28 });
    const railSegments = [[0,6.85,16,0.12],[0,-6.85,16,0.12],[-7.85,0,0.12,13.7],[7.85,0,0.12,13.7]] as number[][];
    for (const [x,z,w,d] of railSegments) {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(w,1.05,d), glassRailMat);
      glass.position.set(x,yOff+0.68,z); glass.castShadow = true; glass.receiveShadow = true; f4.add(glass);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w,0.07,d+0.04), railFrameMat);
      cap.position.set(x,yOff+1.22,z); f4.add(cap);
      const postCount = Math.max(2, Math.floor(Math.max(w,d)/2.5)+1);
      for (let i=0;i<postCount;i++) {
        const t=i/(postCount-1)-0.5;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.09,1.28,0.09),railFrameMat);
        post.position.set(x+(w>d?t*w:0),yOff+0.64,z+(d>=w?t*d:0)); f4.add(post);
      }
    }
    const pergolaMat = new THREE.MeshStandardMaterial({ color: 0x343b42, metalness: 0.55, roughness: 0.45 });
    // Keep pergola frame over pool lounge deck on the west, completely clear of the east stairwell opening (X >= 3.5).
    for (const x of [-0.2, 1.8]) for (const z of [-2.4, 2.4]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.4, 0.16), pergolaMat);
      post.position.set(x, yOff + 1.35, z);
      f4.add(post);
    }
    for (let i = 0; i < 5; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 0.14), pergolaMat);
      beam.position.set(0.8, yOff + 2.55, -2.4 + i * 1.2);
      f4.add(beam);
    }
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7b573c, roughness: 0.8 });
    for (const z of [-5.2, 5.2]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.22, 0.65), benchMat);
      bench.position.set(1.2, yOff + 0.45, z);
      f4.add(bench);
    }
    // Small garden planters, outdoor lights and sun loungers sit outside the pool
    // footprint and remain completely clear of the stairwell landing and corridor.
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x626a55, roughness: 0.88 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3d7b45, roughness: 0.9 });
    for (const z of [-3.7, 3.7]) {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 1.0), planterMat);
      planter.position.set(-6.55, yOff + 0.42, z);
      planter.castShadow = true;
      planter.receiveShadow = true;
      f4.add(planter);
      for (let i = 0; i < 3; i++) {
        const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 7), foliageMat);
        shrub.position.set(-6.9 + i * 0.35, yOff + 0.9, z);
        shrub.castShadow = true;
        f4.add(shrub);
      }
    }
    const loungerMat = new THREE.MeshStandardMaterial({ color: 0xd8e0e5, roughness: 0.72 });
    // Lounger 1: North-East corner deck, facing south toward pool (far north of the stair landing)
    const loungerNE = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.78), loungerMat);
    loungerNE.position.set(5.6, yOff + 0.34, 5.0);
    loungerNE.rotation.y = Math.PI / 2;
    loungerNE.castShadow = true;
    f4.add(loungerNE);
    const backNE = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.78), loungerMat);
    backNE.position.set(5.6, yOff + 0.58, 5.55);
    backNE.rotation.x = -0.35;
    f4.add(backNE);

    // Lounger 2: Spacious West deck, facing east toward pool
    const loungerW = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.78), loungerMat);
    loungerW.position.set(-5.8, yOff + 0.34, 0.0);
    loungerW.castShadow = true;
    f4.add(loungerW);
    const backW = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 0.78), loungerMat);
    backW.position.set(-6.35, yOff + 0.58, 0.0);
    backW.rotation.z = 0.35;
    f4.add(backW);

    for (const [x, z] of [[-6.8, 0], [0.8, -5.6], [0.8, 5.6]] as number[][]) {
      const lamp = new THREE.PointLight(0xffdfad, 0.55, 7, 1.6);
      lamp.position.set(x, yOff + 2.1, z);
      f4.add(lamp);
    }

    // Compact solar backup array supports the apartment emergency-power storyline.
    const solarMat = new THREE.MeshStandardMaterial({ color: 0x123b5b, metalness:0.65, roughness:0.25 });
    for (let i=0;i<3;i++) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.08,1.15),solarMat);
      panel.position.set(-5.7+i*1.7,yOff+0.55,-4.5); panel.rotation.x=-0.12; f4.add(panel);
    }
  }

  // ==========================================
  // CONTINUOUS 5-FLOOR STAIRCASE
  // ==========================================
  private buildContinuousStaircase() {
    const sc = this.staircaseGroup;
    // Switchback/U-turn staircase: first flight left-to-right landing,
    // alternating flights connect all five above-ground levels.
    // All four ascending flights stay inside the existing stairwell opening.
    const stairMat = new THREE.MeshStandardMaterial({ color: 0x3d4147, metalness: 0.5, roughness: 0.6 });
    const handrailMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.3 });
    const flightZ0 = -3.5;
    const flightZ1 = 0.7;
    const flightDepth = flightZ1 - flightZ0;
    const numSteps = 16;
    const stepH = 3.2 / numSteps;
    const stepD = flightDepth / numSteps;
    const lanes = [5.25, 6.75, 5.25, 6.75];
    // Short descending access flight from Floor 1 into the retained basement.
    const basementFlight = new THREE.Group(); basementFlight.name = 'basement_access_stair_flight';
    for (let i=0;i<numSteps;i++) {
      const t=(i+0.5)/numSteps;
      const step=new THREE.Mesh(new THREE.BoxGeometry(1.18,stepH,stepD+0.04),stairMat);
      step.position.set(6.75,-(i+0.5)*stepH,flightZ0+t*flightDepth); step.castShadow=true; basementFlight.add(step);
    }
    sc.add(basementFlight);

    for (let floorIdx = 0; floorIdx < 4; floorIdx++) {
      const baseH = floorIdx * 3.2;
      const laneX = lanes[floorIdx];
      const reverse = floorIdx % 2 === 1;
      const flightGroup = new THREE.Group();
      flightGroup.name = `stair_flight_${floorIdx + 1}_switchback`;
      for (let stepIndex = 0; stepIndex < numSteps; stepIndex++) {
        const t = (stepIndex + 0.5) / numSteps;
        const z = reverse ? flightZ1 - t * flightDepth : flightZ0 + t * flightDepth;
        const step = new THREE.Mesh(new THREE.BoxGeometry(1.18, stepH, stepD + 0.04), stairMat);
        step.position.set(laneX, baseH + (stepIndex + 0.5) * stepH, z);
        step.castShadow = true;
        step.receiveShadow = true;
        flightGroup.add(step);
      }

      // Parallel handrails and balusters on both sides of each flight.
      for (const sideX of [laneX - 0.66, laneX + 0.66]) {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, Math.hypot(3.2, flightDepth), 8), handrailMat);
        rail.rotation.x = Math.PI / 2 - Math.atan2(3.2, flightDepth) * (reverse ? -1 : 1);
        rail.position.set(sideX, baseH + 1.75, (flightZ0 + flightZ1) / 2);
        flightGroup.add(rail);
        for (let b = 0; b <= 8; b++) {
          const t = b / 8;
          const baluster = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.9, 6), handrailMat);
          baluster.position.set(sideX, baseH + 0.5 + t * 2.7, reverse ? flightZ1 - t * flightDepth : flightZ0 + t * flightDepth);
          flightGroup.add(baluster);
        }
      }
      sc.add(flightGroup);

      // Full-width alternating landings join the ends of successive flights.
      const landingZ = reverse ? flightZ0 : flightZ1;
      const landing = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.25, 1.15), this.floorTileMat);
      landing.position.set(6.0, baseH + 3.2 + 0.12, landingZ);
      landing.receiveShadow = true;
      sc.add(landing);
    }
  }

  // ==========================================
  // OPTION A: NEO-TACTICAL GLASS & GRAPHITE EXTERIOR FACADE
  // ==========================================
  private buildExteriorFacade() {
    const ext = this.exteriorWalls;
    // Luxury fortress envelope: keep the reinforced frame opaque, while the
    // infill panels become low-iron panoramic glazing. The physics perimeter
    // remains registered separately, so this visual-only material change does
    // not open holes in the apartment or alter player collision.
    const neoPanelMat = new THREE.MeshPhysicalMaterial({
      color: 0x8fc8d8,
      roughness: 0.12,
      metalness: 0.18,
      transmission: 0.18,
      transparent: true,
      opacity: 0.24,
      thickness: 0.18,
      ior: 1.46,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.35,
    });
    const cyanAccentMat = new THREE.MeshBasicMaterial({ color: 0x5be7ff });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x151e28, metalness: 0.8, roughness: 0.3 });
    const windowGlassMat = new THREE.MeshStandardMaterial({
      color: 0x5cc4df,
      metalness: 0.25,
      roughness: 0.12,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });

    // Corner Pillars & Neo-Tactical Cyan Cornices for 4 enclosed floors
    for (const [cx, cz] of [[-7.9, -6.9], [7.9, -6.9], [-7.9, 6.9], [7.9, 6.9]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 13.0, 0.8), this.metalTrimMat);
      pillar.position.set(cx, 6.5, cz);
      pillar.castShadow = true;
      ext.add(pillar);
    }

    for (let f = 1; f <= 4; f++) {
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(16.4, 0.28, 14.4), this.metalTrimMat);
      cornice.position.set(0, f * 3.2, 0);
      const ledN = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.06, 0.08), cyanAccentMat);
      ledN.position.set(0, f * 3.2, 7.22);
      const ledS = ledN.clone();
      ledS.position.z = -7.22;
      ext.add(cornice, ledN, ledS);
    }

    // 1. North Wall (Back) with 2.4m central doorway for rear sliding patio doors
    this.northWallMesh = new THREE.Group();
    const northWallF1Left = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.2, 0.5), neoPanelMat);
    northWallF1Left.position.set(-4.6, 1.6, 6.8);
    northWallF1Left.castShadow = true;
    const northWallF1Right = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.2, 0.5), neoPanelMat);
    northWallF1Right.position.set(4.6, 1.6, 6.8);
    northWallF1Right.castShadow = true;
    const northWallF1Lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.5), neoPanelMat);
    northWallF1Lintel.position.set(0, 2.9, 6.8);
    const northWallUpper = new THREE.Mesh(new THREE.BoxGeometry(16.0, 9.6, 0.5), neoPanelMat);
    northWallUpper.position.set(0, 8.0, 6.8);
    northWallUpper.castShadow = true;
    this.northWallMesh.add(northWallF1Left, northWallF1Right, northWallF1Lintel, northWallUpper);
    ext.add(this.northWallMesh);

    // 2. East Wall (Stairwell Bay)
    this.eastWallMesh = new THREE.Group();
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12.8, 14.0), neoPanelMat);
    eastWall.position.set(7.8, 6.4, 0);
    eastWall.castShadow = true;
    this.eastWallMesh.add(eastWall);
    ext.add(this.eastWallMesh);

    // 3. West Wall — cut a 2.0 m wide Neo-Tactical passage at Z = -1.8 (Z in [-2.8, -0.8]) on Floors 1..4 into West Wing
    this.westWallMesh = new THREE.Group();
    const westWallSouth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12.8, 4.2), neoPanelMat);
    westWallSouth.position.set(-7.8, 6.4, -4.9);
    westWallSouth.castShadow = true;
    const westWallNorth = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12.8, 7.8), neoPanelMat);
    westWallNorth.position.set(-7.8, 6.4, 3.1);
    westWallNorth.castShadow = true;
    this.westWallMesh.add(westWallSouth, westWallNorth);
    for (let fl = 0; fl < 4; fl++) {
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 2.0), windowFrameMat);
      lintel.position.set(-7.8, fl * 3.2 + 2.88, -1.8);
      this.westWallMesh.add(lintel);
    }
    ext.add(this.westWallMesh);

    // 4. South Wall (Front Entrance Facade with Neo-Tactical Canopy)
    this.southWallMesh = new THREE.Group();
    const southWallLeft = new THREE.Mesh(new THREE.BoxGeometry(7.0, 12.8, 0.5), neoPanelMat);
    southWallLeft.position.set(-4.5, 6.4, -6.8);
    southWallLeft.castShadow = true;
    const southWallRight = new THREE.Mesh(new THREE.BoxGeometry(7.0, 12.8, 0.5), neoPanelMat);
    southWallRight.position.set(4.5, 6.4, -6.8);
    southWallRight.castShadow = true;
    const southWallTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 9.6, 0.5), neoPanelMat);
    southWallTop.position.set(0, 8.0, -6.8);
    const frontCanopy = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.18, 1.5), windowFrameMat);
    frontCanopy.position.set(0, 3.08, -7.65);
    const frontCanopyLed = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.06, 0.08), cyanAccentMat);
    frontCanopyLed.position.set(0, 3.08, -8.4);
    this.southWallMesh.add(southWallLeft, southWallRight, southWallTop, frontCanopy, frontCanopyLed);
    ext.add(this.southWallMesh);

    // Continuous dark-metal curtain-wall mullions visually tie the individual
    // panes into a floor-to-ceiling glass facade while retaining the existing
    // structural concrete/metal corner frame and all original room geometry.
    const curtainMullionMat = new THREE.MeshStandardMaterial({ color: 0x202a34, metalness: 0.86, roughness: 0.24 });
    for (let level = 0; level < 4; level++) {
      const y = level * 3.2 + 1.75;
      for (const x of [-4.5, 4.5]) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.65, 0.07), windowGlassMat);
        pane.position.set(x, y, -7.075);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.58, 1.82, 0.12), windowFrameMat);
        frame.position.set(x, y, -7.12);
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.65, 0.14), windowFrameMat);
        mullion.position.set(x, y, -7.13);
        this.southWallMesh.add(frame, pane, mullion);
      }
      for (const z of [-4.2, 0, 4.2]) {
        const paneN = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.55, 0.07), windowGlassMat);
        paneN.position.set(z, y, 7.075);
        const frameN = new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.72, 0.12), windowFrameMat);
        frameN.position.set(z, y, 7.12);
        this.northWallMesh.add(frameN, paneN);
      }
      // Fine vertical mullions at each bay edge create a premium curtain-wall rhythm.
      for (const x of [-7.45, -5.3, -2.65, 0, 2.65, 5.3, 7.45]) {
        const southMullion = new THREE.Mesh(new THREE.BoxGeometry(0.075, 2.75, 0.16), curtainMullionMat);
        southMullion.position.set(x, level * 3.2 + 1.6, -7.13);
        const northMullion = southMullion.clone();
        northMullion.position.z = 7.13;
        this.southWallMesh.add(southMullion);
        this.northWallMesh.add(northMullion);
      }
    }

    // Premium residential finish package. These are facade-only visual details:
    // they sit outside the existing envelope and do not replace rooms, doors,
    // stairs, interactive objects, or the established physics perimeter.
    const stoneCladdingMat = new THREE.MeshStandardMaterial({
      color: 0xd7cbbb,
      roughness: 0.72,
      metalness: 0.04,
    });
    const bronzeFinMat = new THREE.MeshStandardMaterial({
      color: 0x34343a,
      roughness: 0.3,
      metalness: 0.82,
    });
    const planterMat = new THREE.MeshStandardMaterial({ color: 0x343b3d, roughness: 0.78 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x47764b, roughness: 0.92 });
    const warmLightMat = new THREE.MeshStandardMaterial({
      color: 0xffe4b8,
      emissive: 0xffb65d,
      emissiveIntensity: 1.15,
      roughness: 0.3,
    });

    // Travertine feature piers and recessed bronze fins give the glass facade
    // a clear structural rhythm without changing the building footprint.
    for (const x of [-7.35, 7.35]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.42, 12.55, 0.22), stoneCladdingMat);
      pier.position.set(x, 6.38, -7.17);
      pier.castShadow = true;
      pier.receiveShadow = true;
      this.southWallMesh.add(pier);
      for (let fin = 0; fin < 4; fin++) {
        const verticalFin = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.55, 0.18), bronzeFinMat);
        verticalFin.position.set(x + (x < 0 ? 0.34 : -0.34), 1.6 + fin * 3.2, -7.23);
        this.southWallMesh.add(verticalFin);
      }
    }

    // Slim planted facade ledges on upper levels. They are kept above the
    // ground-floor entrance and clear of the pre-existing balcony decks.
    for (const level of [2, 3]) {
      const y = level * 3.2 - 0.22;
      for (const z of [-7.58, 7.58]) {
        const trough = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.38, 0.62), planterMat);
        trough.position.set(0, y, z);
        trough.castShadow = true;
        trough.receiveShadow = true;
        ext.add(trough);
        for (let plant = 0; plant < 5; plant++) {
          const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.22, 9, 7), foliageMat);
          shrub.position.set(-1.65 + plant * 0.82, y + 0.34, z);
          shrub.scale.set(1.15, 0.8, 0.9);
          shrub.castShadow = true;
          ext.add(shrub);
        }
      }
    }

    // Warm architectural sconces at the front corners and discreet security
    // cameras under the upper overhangs reinforce the luxury-fortress theme.
    for (const x of [-7.35, -2.2, 2.2, 7.35]) {
      for (const level of [0, 1, 2, 3]) {
        const y = level * 3.2 + 2.55;
        const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.12), warmLightMat);
        sconce.position.set(x, y, -7.34);
        this.southWallMesh.add(sconce);
        if (level === 0 || level === 2) {
          const glow = new THREE.PointLight(0xffc987, 0.32, 4.2, 2);
          glow.position.set(x, y - 0.18, -7.55);
          this.southWallMesh.add(glow);
        }
      }
    }
    for (const x of [-7.0, 7.0]) {
      const cameraHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.28), bronzeFinMat);
      cameraHousing.position.set(x, 12.35, -7.42);
      cameraHousing.rotation.x = -0.18;
      this.southWallMesh.add(cameraHousing);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), cyanAccentMat);
      lens.position.set(x, 12.31, -7.56);
      this.southWallMesh.add(lens);
    }

    // A restrained stone portal frames the existing front door without
    // narrowing its opening or moving the original entrance interaction.
    for (const x of [-1.55, 1.55]) {
      const portal = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.05, 0.34), stoneCladdingMat);
      portal.position.set(x, 1.55, -7.2);
      portal.castShadow = true;
      this.southWallMesh.add(portal);
    }
    const portalHeader = new THREE.Mesh(new THREE.BoxGeometry(3.34, 0.22, 0.42), stoneCladdingMat);
    portalHeader.position.set(0, 3.08, -7.2);
    this.southWallMesh.add(portalHeader);
  }

  // ==========================================
  // ENCLOSED RESIDENTIAL PROPERTY + BACKYARD POOL
  // ==========================================

  private buildEnclosedProperty() {
    const property = new THREE.Group();
    property.name = 'last_sanctuary_rebirth_expanded_compound';
    this.group.add(property);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x252d36, roughness: 0.72, metalness: 0.42 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x9aa8b5, roughness: 0.38, metalness: 0.75 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x111923, roughness: 0.3, metalness: 0.82 });
    const cyanMat = new THREE.MeshStandardMaterial({ color: 0x7de8ff, emissive: 0x087da8, emissiveIntensity: 1.0 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x466c3e, roughness: 1 });
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x252b31, roughness: 0.96 });
    const pathMat = new THREE.MeshStandardMaterial({ color: 0x7b858d, roughness: 0.86 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x62b8d2, roughness: 0.15, metalness: 0.18, transparent: true, opacity: 0.42 });
    // Former enclosure: 44 x 57.5 m (2,530 m²).
    // Expanded 5x enclosure: 100 x 126.5 m (12,650 m² exact) in World X: [-108, -8], Z: [-37.5, 89.0].
    // Local bounds relative to Building 1 origin (-26, 0, 38): X in [-82, +18], Z in [-75.5, +51.0].
    const minX = -82, maxX = 18, southZ = -75.5, northZ = 51.0, wallH = 6, wallT = 0.9;
    const addWall = (name: string, x: number, z: number, w: number, d: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat); wall.name = name; wall.position.set(x, wallH / 2, z); wall.castShadow = true; wall.receiveShadow = true; property.add(wall);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.22, d + 0.16), trimMat); cap.position.set(x, wallH + 0.1, z); property.add(cap);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.15, w * 0.94), 0.08, Math.max(0.15, d * 0.94)), cyanMat); strip.position.set(x, wallH - 0.45, z); property.add(strip);
    };
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(99, 125.5), grassMat); lawn.rotation.x = -Math.PI / 2; lawn.position.set(-32, 0.02, -12.25); lawn.receiveShadow = true; property.add(lawn);
    // Exactly five gate openings: one 12 m main gate, two 2 m pedestrian gates and two 8 m vehicle gates.
    addWall('rebirth_wall_west_south', minX, -38.25, wallT, 74.5); addWall('rebirth_wall_west_north', minX, 26.0, wallT, 50.0);
    addWall('rebirth_wall_east_south', maxX, -50.25, wallT, 50.5); addWall('rebirth_wall_east_north', maxX, 14.0, wallT, 74.0);
    addWall('rebirth_wall_north_west', -55.0, northZ, 54.0, wallT); addWall('rebirth_wall_north_east', -1.0, northZ, 38.0, wallT);
    addWall('rebirth_wall_south_west', -67.0, southZ, 30.0, wallT); addWall('rebirth_wall_south_middle', -25.0, southZ, 38.0, wallT); addWall('rebirth_wall_south_east', 12.0, southZ, 12.0, wallT);
    const tower = (x: number, z: number, side: 'left' | 'right', index: number, h = 8) => {
      const towerGroup = new THREE.Group(); towerGroup.name = `perimeter_security_tower_${side}_${String(index + 1).padStart(2, '0')}`; towerGroup.position.set(x, 0, z);
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.55, 2.5), darkMat); base.position.set(0, 0.28, 0); towerGroup.add(base);
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.15, h, 2.15), trimMat); body.position.set(0, h / 2 + 0.55, 0); body.castShadow = true; body.receiveShadow = true; towerGroup.add(body);
      const beacon = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.22, 0.85), cyanMat); beacon.position.set(0, h + 0.68, 0); towerGroup.add(beacon);
      const cam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.55), darkMat); cam.position.set(side === 'left' ? 0.25 : -0.25, h - 0.15, side === 'left' ? 1.15 : -1.15); towerGroup.add(cam);
      const searchlight = new THREE.SpotLight(0x9bdcff, 1.35, 34, Math.PI / 5, 0.5, 1.5); searchlight.position.set(0, h - 0.2, 0); searchlight.target.position.set(side === 'left' ? 8 : -8, 0, 0); towerGroup.add(searchlight, searchlight.target);
      towerGroup.userData = { side, index: index + 1, systems: ['armed_turret_mount', 'cctv', 'searchlight', 'motion_sensor', 'alarm_beacon'] }; property.add(towerGroup);
    };
    // Exactly twenty perimeter security towers: ten along the West wall and ten along the East wall.
    const westTowerZ = [-69, -56, -43, -30, -17, -6, 6, 20, 34, 46];
    const eastTowerZ = [-69, -56, -43, -30, -18, -6, 6, 20, 34, 46];
    westTowerZ.forEach((z, i) => tower(minX, z, 'left', i));
    eastTowerZ.forEach((z, i) => tower(maxX, z, 'right', i));
    // Gate 1: 12 m motorized main entrance (South Wall center local X=0 -> World X=-26).
    this.compoundGateGroup = new THREE.Group(); this.compoundGateGroup.name = 'gate_1_main_motorized_12m'; this.compoundGateGroup.position.set(0, 0, southZ);
    this.compoundGateLeftLeaf = new THREE.Group(); this.compoundGateLeftLeaf.position.x = -3; this.compoundGateRightLeaf = new THREE.Group(); this.compoundGateRightLeaf.position.x = 3;
    for (const [pivot, sign] of [[this.compoundGateLeftLeaf, 1], [this.compoundGateRightLeaf, -1]] as const) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(6, 4.8, 0.28), darkMat); panel.position.set(sign * 3, 2.4, 0); pivot.add(panel);
      for (let i = 0; i < 9; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.8, 0.34), trimMat); rib.position.set(sign * (0.4 + i * 0.65), 2.4, 0); pivot.add(rib); }
      const led = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.1, 0.36), cyanMat); led.position.set(sign * 3, 4.4, 0); pivot.add(led);
    }
    this.compoundGateGroup.add(this.compoundGateLeftLeaf, this.compoundGateRightLeaf); property.add(this.compoundGateGroup);
    // Gates 2 and 3: independent pedestrian access on West (-82, 0) and East (+18, -24) walls.
    const makePed = (x: number, z: number, side: 'left' | 'right', rotation: number) => {
      const hinge = new THREE.Group(); hinge.name = side === 'left' ? 'gate_2_west_pedestrian_2m' : 'gate_3_east_emergency_pedestrian_2m'; hinge.position.set(x, 0, z); hinge.rotation.y = rotation;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(2, 3.4, 0.2), darkMat); leaf.position.set(1, 1.7, 0); hinge.add(leaf);
      const reader = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.22), cyanMat); reader.position.set(0.35, 1.2, 0.18); hinge.add(reader); property.add(hinge); return hinge;
    };
    this.compoundPedestrianDoorLeft = makePed(minX, 0, 'left', Math.PI / 2);
    this.compoundPedestrianDoorRight = makePed(maxX, -24, 'right', -Math.PI / 2);
    // Gate 4: independent 8 m South vehicle entrance straight into Garage road (local X = -48).
    this.vehicleGateGroup = new THREE.Group(); this.vehicleGateGroup.name = 'gate_4_independent_vehicle_8m'; this.vehicleGateGroup.position.set(-48, this.vehicleGateOpen ? 5.0 : 0, southZ);
    const vehicleLeaf = new THREE.Mesh(new THREE.BoxGeometry(8, 4.8, 0.28), darkMat); vehicleLeaf.position.y = 2.4; this.vehicleGateGroup.add(vehicleLeaf);
    for (let i = 0; i < 11; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.8, 0.34), trimMat); rib.position.set(-3.7 + i * 0.74, 2.4, 0); this.vehicleGateGroup.add(rib); } property.add(this.vehicleGateGroup);
    // Gate 5: independent 8 m North vehicle entrance (local X = -24, cleanly clear of Railway Station at Z=94).
    this.vehicleGate2Group = new THREE.Group(); this.vehicleGate2Group.name = 'gate_5_north_vehicle_8m'; this.vehicleGate2Group.position.set(-24, this.vehicleGate2Open ? 5.0 : 0, northZ);
    const vehicleLeaf2 = new THREE.Mesh(new THREE.BoxGeometry(8, 4.8, 0.28), darkMat); vehicleLeaf2.position.y = 2.4; this.vehicleGate2Group.add(vehicleLeaf2);
    for (let i = 0; i < 11; i++) { const rib = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.8, 0.34), trimMat); rib.position.set(-3.7 + i * 0.74, 2.4, 0); this.vehicleGate2Group.add(rib); } property.add(this.vehicleGate2Group);
    // Internal paved vehicle avenues, garage/gate connectors, pedestrian walkways, and courtyard plaza.
    const road = (name: string, x: number, z: number, w: number, d: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), roadMat); m.name = name; m.position.set(x, 0.08, z); m.receiveShadow = true; property.add(m);
    };
    road('main_gate_to_mansion_road', 0, -43.75, 7, 63.5);
    road('vehicle_gate_to_garage_road', -48, -57.25, 10, 36.5);
    road('garage_access_connector', -24, -46, 48, 7);
    road('north_vehicle_gate_access_road', -24, 26.5, 8, 49);
    road('command_centre_south_plaza', -48, 8, 16, 14);
    road('west_service_boulevard', -68, 2, 7, 52);
    // Sidewalk paths connecting West Gate 2 (-82, 0), East Gate 3 (+18, -24), Courtyard, and all 3 buildings.
    const westGatePath = new THREE.Mesh(new THREE.BoxGeometry(44, 0.08, 2.8), pathMat); westGatePath.position.set(-60, 0.08, 0); property.add(westGatePath);
    const eastGatePath = new THREE.Mesh(new THREE.BoxGeometry(18, 0.08, 2.8), pathMat); eastGatePath.position.set(9, 0.08, -24); property.add(eastGatePath);
    const eastGateApron = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 2.8), pathMat); eastGateApron.position.set(19, 0.08, -24); property.add(eastGateApron);
    const courtyardToMansionPath = new THREE.Mesh(new THREE.BoxGeometry(10, 0.08, 3.2), pathMat); courtyardToMansionPath.position.set(-19, 0.08, -2); property.add(courtyardToMansionPath);
    const patioDeck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 10), pathMat); patioDeck.position.set(0, 0.09, 12.2); patioDeck.receiveShadow = true; property.add(patioDeck);
    // Compound Outdoor Vehicle Parking Pad (Vanguard Sedan & Quad ATV)
    const outdoorParkPad = new THREE.Mesh(new THREE.BoxGeometry(12, 0.1, 8), roadMat); outdoorParkPad.position.set(-27.5, 0.09, -48); outdoorParkPad.receiveShadow = true; property.add(outdoorParkPad);
    // Central landscaped courtyard centered cleanly at local (-30, 0, -2) between Mansion, Command Centre, and Garage.
    const courtyard = new THREE.Group(); courtyard.name = 'central_landscaped_courtyard'; courtyard.position.set(-30, 0, -2); property.add(courtyard);
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 8.5, 0.22, 40), pathMat); plaza.position.y = 0.12; courtyard.add(plaza);
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.42, 32), trimMat); basin.position.y = 0.35; courtyard.add(basin);
    const fountain = new THREE.Mesh(new THREE.CircleGeometry(2.75, 32), glassMat); fountain.rotation.x = -Math.PI / 2; fountain.position.y = 0.58; courtyard.add(fountain);
    const monument = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 6), trimMat); monument.position.y = 2.8; courtyard.add(monument);
    // Low ornamental planters provide green landscaping around the courtyard plaza.
    for (const [x, z] of [[-10, -8], [10, -8], [-10, 8], [10, 8]] as const) {
      const planter = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.45, 2.4), trimMat); planter.position.set(x, 0.28, z); courtyard.add(planter);
      const planting = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.42, 2.0), grassMat); planting.position.set(x, 0.68, z); courtyard.add(planting);
    }
    for (const [x, z] of [[-78, -68], [-78, -32], [-78, 12], [-78, 45], [14, -68], [14, -32], [14, 18], [14, 45], [-55, 48], [-24, 48], [6, 48]] as const) {
      const lamp = new THREE.PointLight(0x8bdfff, 1, 18, 1.7); lamp.position.set(x, 4.5, z); property.add(lamp);
    }
    for (const [x, z, w, d] of [[0, -69, 16, 10], [-48, -69, 12, 10], [-75, 0, 10, 8], [12, -24, 10, 8]] as const) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, d), pathMat); pad.position.set(x, 0.06, z); property.add(pad);
    }
  }

  public updateTVScreenContent(isOn: boolean, isEmergency: boolean = false) {
    if (!this.tvContext) return;
    const ctx = this.tvContext;
    const w = this.tvCanvas.width;
    const h = this.tvCanvas.height;

    if (!isOn) {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    if (isEmergency) {
      // Day 2 Emergency Alert System Broadcast
      ctx.fillStyle = '#1c0505';
      ctx.fillRect(0, 0, w, h);

      // Red Alert Header Banner
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, w, 55);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('EMERGENCY ALERT SYSTEM (EAS) · ACTIVE BROADCAST', 16, 36);

      // Flashing Alert Ticker
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, h - 50, w, 50);
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('CRITICAL: HIGH-DENSITY BOLIDE IMPACT CORRIDOR — SECTOR 4 RIDGE', 16, h - 20);

      // Emergency Body Text
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 16px monospace';
      ctx.fillText('WARNING: ATMOSPHERIC TRAJECTORY DETECTED OVER VALLEY', 24, 95);
      ctx.fillText('CIVILIAN ADVISORY: PREPARE FOR SEISMIC SHOCKWAVES', 24, 125);
      ctx.fillText('POWER GRID: FLUCTUATIONS REPORTED ACROSS SECTOR 1-4', 24, 155);
      ctx.fillText('ALL RESIDENTS: AVOID WINDOWS & ASSEMBLE EMERGENCY SUPPLIES', 24, 185);
    } else {
      // Day 1 Peaceful Channel 4 News
      ctx.fillStyle = '#061626';
      ctx.fillRect(0, 0, w, h);

      // Blue header banner
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, w, 50);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('OAKRIDGE CHANNEL 4 NEWS · LIVE', 20, 35);

      // Ticker bar
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(0, h - 45, w, 45);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('SCIENCE UPDATE: UNIDENTIFIED CELESTIAL OBJECT DETECTED IN DEEP SPACE', 20, h - 16);

      // News content
      ctx.fillStyle = '#38bdf8';
      ctx.font = '16px monospace';
      ctx.fillText('ASTRONOMY: OBJECT ON UNUSUAL TRAJECTORY PAST INNER SYSTEM', 30, 95);
      ctx.fillText('SCIENTISTS: MONITORING DATA · NO IMMEDIATE THREAT EXPECTED', 30, 125);
      ctx.fillText('WEATHER: 72°F · PLEASANT WARM SUMMER AFTERNOON IN OAKRIDGE', 30, 155);
      ctx.fillText('MUNICIPAL: ANNUAL VALLEY RIDGE PARK FESTIVAL THIS WEEKEND', 30, 185);
    }

    // Broadcast icon
    ctx.strokeStyle = isEmergency ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w - 70, 130, 32, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ==========================================
    /**
   * Bind independently addressable roots across the basement, four floors, rooftop,
   * exterior wall assembly and stair/elevator assembly. Existing objects are not
   * re-parented, so their authored transforms and animation hierarchies remain intact.
   */
  private initializeApartmentObjectBindings(): void {
    const levels: Array<[string, THREE.Object3D | undefined]> = [
      ['basement', this.basementGroup], ['floor1', this.floor1Group],
      ['floor2', this.floor2Group], ['floor3', this.floor3Group],
      ['floor4', this.floor4Group], ['rooftop', this.floor5Group],
      ['exterior-walls', this.exteriorWalls], ['stairs-elevator', this.staircaseGroup],
    ];
    for (const [levelId, level] of levels) {
      if (!level) continue;
      level.children.slice().forEach((root, index) => {
        if (root.userData.apartmentBindingId) return;
        const name = (root.name || `object-${index}`).replace(/[^a-zA-Z0-9_-]/g, '-');
        const id = `${levelId}:${name}:${index}`;
        root.userData.apartmentBindingId = id;
        this.apartmentObjectBindings.set(id, new ApartmentObjectBinding({ id, root }));
      });
    }
  }

  /** Register an authored object with the centralized hinge/slide/rotation interaction system. */
  public registerInteractable(options: ApartmentInteractableOptions): void {
    this.objectAnimator.register(options);
    const binding = this.apartmentObjectBindings.get(options.id);
    if (!binding) this.bindApartmentObject(options.id, options.root);
  }

  /** Route a named object action through the central apartment animation owner. */
  public interactWithObject(id: string, action: ApartmentObjectAction = 'toggle'): boolean {
    return this.objectAnimator.applyAction(id, action);
  }

  /** Snapshot/restore movable object states with the rest of the apartment save data. */
  public saveObjectInteractionStates(): Record<string, boolean> {
    return this.objectAnimator.save();
  }

  public loadObjectInteractionStates(states: Record<string, boolean>): void {
    this.objectAnimator.load(states);
  }

  /** Access the transform binding for a level object and attach dependent systems to it. */
  public getObjectBinding(id: string): ApartmentObjectBinding | undefined {
    return this.apartmentObjectBindings.get(id);
  }

  /** Register a runtime-created or replacement apartment object. */
  public bindApartmentObject(id: string, root: THREE.Object3D): ApartmentObjectBinding {
    this.unbindApartmentObject(id);
    const binding = new ApartmentObjectBinding({ id, root });
    root.userData.apartmentBindingId = id;
    this.apartmentObjectBindings.set(id, binding);
    return binding;
  }

  /** Dispose dependency anchors when an apartment object is permanently removed. */
  public unbindApartmentObject(id: string): void {
    const binding = this.apartmentObjectBindings.get(id);
    if (!binding) return;
    binding.dispose();
    this.apartmentObjectBindings.delete(id);
  }

// UPDATE LOOP & CAMERA-AWARE VISIBILITY
  // ==========================================
  public update(
    delta: number,
    playerPos: THREE.Vector3 = this.origin,
    cameraPos: THREE.Vector3 = this.origin,
    zombieMgr?: ZombieManager | null,
    wildlifeMgr?: WildlifeManager | null,
    aiTrainMgr?: any
  ) {
    this.objectAnimator.update(delta);
    for (const binding of this.apartmentObjectBindings.values()) binding.sync();
    this.turrets?.update(delta, zombieMgr || null, wildlifeMgr || null, playerPos);
    this.basementRoom?.update(delta, aiTrainMgr || null);
    this.commandScreens?.update(delta, aiTrainMgr || null, {
      mainGateOpen: this.compoundGateOpen,
      vehicleGate1Open: this.vehicleGateOpen,
      vehicleGate2Open: this.vehicleGate2Open,
      westPedOpen: this.compoundPedestrianDoorsOpen[0],
      eastPedOpen: this.compoundPedestrianDoorsOpen[1],
      garageShutterOpen: this.garageShutterOpen,
      turretCount: 20,
      activeThreats: zombieMgr ? Math.min(99, zombieMgr.zombies.filter((z) => z.state !== 'dead').length) : 0,
    });
    // 1. Ceiling Fan Rotation
    if (this.state.fanOn && this.fanBlades) {
      this.fanBlades.rotation.y += this.state.fanSpeed * delta;
    }

    // 2. Dynamic House & Bathroom Animations
    // 2A. Pool Water Wave Ripple Animation
    if (this.poolWaterMesh) {
      const t = performance.now() * 0.002;
      this.poolWaterMesh.position.y = 12.82 + Math.sin(t) * 0.025;
      if (this.backyardPoolWaterMesh) this.backyardPoolWaterMesh.position.y = 0.48 + Math.sin(t * 0.8) * 0.018;
    }

    // 2B. Bathroom Door Hinge Smooth Swing
    if (this.bathroomDoorGroup) {
      const targetAngle = this.bathroomDoorOpen ? -Math.PI / 2 : 0;
      this.bathroomDoorGroup.rotation.y = THREE.MathUtils.damp(this.bathroomDoorGroup.rotation.y, targetAngle, 8, delta);
    }

    // 2C. Wardrobe Doors Hinge Smooth Swing
    if (this.wardrobeLeftDoor && this.wardrobeRightDoor) {
      const targetL = this.wardrobeOpen ? -1.5 : 0;
      const targetR = this.wardrobeOpen ? 1.5 : 0;
      this.wardrobeLeftDoor.rotation.y = THREE.MathUtils.damp(this.wardrobeLeftDoor.rotation.y, targetL, 8, delta);
      this.wardrobeRightDoor.rotation.y = THREE.MathUtils.damp(this.wardrobeRightDoor.rotation.y, targetR, 8, delta);
    }

    // 2D. Medicine Cabinet Mirror Door Hinge Smooth Swing
    if (this.bathroomCabinetDoor) {
      const targetC = this.bathroomCabinetOpen ? -1.4 : 0;
      this.bathroomCabinetDoor.rotation.y = THREE.MathUtils.damp(this.bathroomCabinetDoor.rotation.y, targetC, 8, delta);
    }

    // 2E. Bathroom Shower Falling Spray & Steam
    if (this.bathroomShowerRunning && this.bathroomShowerWaterGroup) {
      this.bathroomShowerWaterGroup.children.forEach((drop, idx) => {
        drop.position.y = -0.95 + Math.sin(performance.now() * 0.02 + idx) * 0.15;
      });
      if (this.bathroomShowerSteamMesh) {
        const mat = this.bathroomShowerSteamMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + Math.sin(performance.now() * 0.003) * 0.08;
      }
    }

    // 2F. Bathtub Warm Water Ripples
    if (this.bathtubWaterMesh) {
      this.bathtubWaterMesh.position.y = 0.72 + Math.sin(performance.now() * 0.0025) * 0.012;
    }

    // 2G. Toilet Flush Swirl Effect
    if (this.toiletFlushing && this.toiletWaterMesh) {
      this.toiletFlushTimer -= delta;
      this.toiletWaterMesh.rotation.z += delta * 15.0;
      const t = Math.max(0, this.toiletFlushTimer / 3.2);
      this.toiletWaterMesh.scale.setScalar(0.3 + 0.7 * Math.sin(t * Math.PI));
      if (this.toiletFlushTimer <= 0) {
        this.toiletFlushing = false;
        this.toiletWaterMesh.scale.setScalar(1.0);
        this.toiletWaterMesh.rotation.z = 0;
      }
    }

    // 2H. Kitchen Stove Burner Flame Flicker
    if (this.kitchenStoveOn && this.kitchenStoveBurners.length > 0) {
      const flicker = 1.0 + Math.sin(performance.now() * 0.01) * 0.25;
      this.kitchenStoveBurners.forEach((burner) => {
        const mat = burner.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = flicker;
      });
    }

    // 3. Camera-Aware Cutaway Architecture:
    const relX = playerPos.x - this.origin.x;
    const relY = playerPos.y - this.origin.y;
    const relZ = playerPos.z - this.origin.z;

    const isInsideBuilding = Math.abs(relX) < 15.2 && Math.abs(relZ) < 12.2 && relY >= -3.5 && relY <= 17.0;

    if (isInsideBuilding) {
      // In 3rd person mode, hide the wall between camera and player so the interior is NEVER obstructed
      const camRelZ = cameraPos.z - this.origin.z;
      const camRelX = cameraPos.x - this.origin.x;

      this.southWallMesh.visible = !(camRelZ < relZ - 0.5);
      this.northWallMesh.visible = !(camRelZ > relZ + 0.5);
      this.westWallMesh.visible = !(camRelX < relX - 0.5);
      this.eastWallMesh.visible = !(camRelX > relX + 0.5);

      // Basement cutaway and exact floor-aware visibility.
      this.basementGroup.visible = relY < 0;
      const activeFloor = relY < 3.2 ? 1
        : relY < 6.4 ? 2
        : relY < 9.6 ? 3
        : relY < 12.8 ? 4 : 5;
      this.floor1Group.visible = activeFloor === 1;
      this.floor2Group.visible = activeFloor === 2;
      this.floor3Group.visible = activeFloor === 3;
      this.floor4Group.visible = activeFloor === 4;
      this.floor5Group.visible = activeFloor === 5;
    } else {
      // Player is outside: all exterior walls and floors visible
      this.southWallMesh.visible = true;
      this.northWallMesh.visible = true;
      this.westWallMesh.visible = true;
      this.eastWallMesh.visible = true;
      this.floor1Group.visible = true;
      this.floor2Group.visible = true;
      this.floor3Group.visible = true;
      this.floor4Group.visible = true;
      this.floor5Group.visible = true;
      this.basementGroup.visible = true;
    }
  }

  // ==========================================
  // INTERACTION SYSTEM & DISCOVERY HOOKS
  // ==========================================
  public getInteraction(pos: THREE.Vector3): {
    id:
      | 'bed'
      | 'phone'
      | 'fridge'
      | 'tv'
      | 'fan'
      | 'ac'
      | 'armory'
      | 'pool'
      | 'backyardPool'
      | 'door'
      | 'compoundGate'
      | 'vehicleGate'
      | 'vehicleGate2'
      | 'commandElevator'
      | 'compoundDoorLeft'
      | 'compoundDoorRight'
      | 'garageDoor'
      | 'turret'
      | 'railwayOperations'
      | 'medicalClinic'
      | 'apartmentStatus'
      | 'patioDoor'
      | 'securityCommandCenter'
      | 'medicalBed'
      | 'basementTV'
      | 'washSink'
      | 'mirrorLook'
      | 'shower'
      | 'toilet'
      | 'bathtub'
      | 'towel'
      | 'bathroomCabinet'
      | 'bathroomTap'
      | 'bathroomLight'
      | 'bathroomDoor'
      | 'sofa'
      | 'diningChair'
      | 'diningTable'
      | 'kitchenStove'
      | 'kitchenSink'
      | 'wardrobe'
      | 'computer'
      | 'wallClock'
      | 'bedsideLamp';
    label: string;
    prompt: string;
  } | null {
    if (this.basementRoom) {
      const basementInteraction = this.basementRoom.getInteraction(pos);
      if (basementInteraction) return basementInteraction;
    }
    if (this.turrets) {
      const turretInteraction = this.turrets.getInteraction(pos);
      if (turretInteraction) return turretInteraction;
    }
    const relX = pos.x - this.origin.x;
    const relY = pos.y - this.origin.y;
    const relZ = pos.z - this.origin.z;

    // Five-gate access, 4-bay garage (at local -48, -32), and Command Centre (at local -48, +24).
    if (Math.abs(relX) < 7.0 && Math.abs(relZ + 75.5) < 2.8 && relY < 5.0) {
      return { id: 'compoundGate', label: 'Main 12 m Compound Gate', prompt: `Press [E] to ${this.compoundGateOpen ? 'Close' : 'Open'} Main Security Gate` };
    }
    if (Math.abs(relX + 48) < 10.5 && Math.abs(relZ + 39.1) < 3.2 && relY < 3.5) {
      return { id: 'garageDoor', label: 'Four-Bay Vehicle Garage', prompt: `Press [E] to ${this.garageShutterOpen ? 'Close' : 'Open'} All Garage Bay Doors` };
    }
    if (Math.abs(relX + 82) < 3.0 && Math.abs(relZ) < 3.0 && relY < 3.5) {
      return { id: 'compoundDoorLeft', label: 'Gate 2 — West Pedestrian Access', prompt: `Press [E] to ${this.compoundPedestrianDoorsOpen[0] ? 'Close' : 'Open'} West Pedestrian Gate` };
    }
    if (Math.abs(relX - 18) < 3.0 && Math.abs(relZ + 24) < 3.0 && relY < 3.5) {
      return { id: 'compoundDoorRight', label: 'Gate 3 — East Emergency Exit', prompt: `Press [E] to ${this.compoundPedestrianDoorsOpen[1] ? 'Close' : 'Open'} East Emergency Gate` };
    }
    if (Math.abs(relX + 48) < 5.0 && Math.abs(relZ + 75.5) < 3.0 && relY < 5.0) {
      return { id: 'vehicleGate', label: 'Gate 4 — Independent Vehicle Entrance', prompt: `Press [E] to ${this.vehicleGateOpen ? 'Close' : 'Open'} Vehicle Gate` };
    }
    if (Math.abs(relX + 24) < 5.0 && Math.abs(relZ - 51.0) < 3.0 && relY < 5.0) {
      return { id: 'vehicleGate2', label: 'Gate 5 — North Vehicle Entrance', prompt: `Press [E] to ${this.vehicleGate2Open ? 'Close' : 'Open'} North Vehicle Gate` };
    }
    if (
      (Math.hypot(relX + 53.8, relZ - 22.8) < 2.2 && relY < 29.0) ||
      (Math.hypot(relX + 55.2, relZ - 22.8) < 2.2 && relY < 29.0)
    ) {
      return { id: 'commandElevator', label: 'Railway Command Elevator (8 Floors)', prompt: `Press [E] to travel to the next command-centre floor (current ${this.commandElevatorFloor + 1}/8)` };
    }
    // Floor 3 West Surveillance Desk opens 5km Security Radar; all other Command Center consoles & video walls open Railway Operations
    if (relX >= -56.0 && relX <= -50.2 && Math.abs(relZ - 26.25) < 2.6 && relY >= 7.0 && relY <= 10.8) {
      return { id: 'securityCommandCenter', label: 'Perimeter Security & 20-Turret Console', prompt: 'Press [E] to Access 5km Security Radar & Compound Controls' };
    }
    if (relX >= -56.5 && relX <= -41.5 && (Math.abs(relZ - 26.25) < 2.6 || Math.abs(relZ - 32.0) < 2.6) && relY >= 0.4 && relY <= 28.2) {
      return { id: 'railwayOperations', label: 'Railway Command 25-Screen Terminal', prompt: 'Press [E] to access live 6-train dispatch, telemetry and schedules' };
    }
    // Level 2 Vertical Garage Diagnostic Workbench
    if (Math.abs(relX + 43.8) < 3.0 && Math.abs(relZ + 35.2) < 2.4 && relY >= 4.2 && relY <= 7.8) {
      return { id: 'garageDoor', label: 'Vertical Garage Bay & Armor Terminal', prompt: `Press [E] to ${this.garageShutterOpen ? 'Lower' : 'Raise'} All 4 Garage Bay Shutters` };
    }

    // --- BASEMENT INTERACTIONS ---
    if (relY < -1.0) {
      if (Math.hypot(relX - 0, relZ - (-5.2)) < 3.2) {
        return {
          id: 'basementTV',
          label: 'Basement Media Television',
          prompt: `Press [E] to Turn ${this.basementTvOn ? 'OFF' : 'ON'} Basement Screen`,
        };
      }
    }

    // Apartment interactions are limited to the building footprint.
    if (Math.abs(relX) > 11 || Math.abs(relZ) > 10) return null;

    // --- FLOOR 1 INTERACTIONS ---
    if (relY < 3.0) {
      // Rear sliding glass patio doors at (0, 6.8)
      if (Math.hypot(relX - 0, relZ - 6.8) < 2.6) {
        return {
          id: 'patioDoor',
          label: 'Rear Patio Sliding Doors',
          prompt: `Press [E] to ${this.patioDoorOpen ? 'Close' : 'Open'} Rear Patio Doors`,
        };
      }

      // Security Command Center Screen at (2.38, -0.5)
      if (Math.hypot(relX - 2.38, relZ - (-0.5)) < 2.8) {
        return {
          id: 'securityCommandCenter',
          label: 'Autonomous Security Command Center',
          prompt: 'Press [E] to Access 5km Security Radar & Command Center',
        };
      }

      // 1. Double Bed at (-5.5, 3.8)
      if (Math.hypot(relX - (-5.5), relZ - 3.8) < 2.5) {
        return { id: 'bed', label: 'Apartment Bed', prompt: 'Press [E] to Sleep in Bed' };
      }

      // 2. Bedside Lamp at (-7.2, 4.8)
      if (Math.hypot(relX - (-7.2), relZ - 4.8) < 1.8) {
        return {
          id: 'bedsideLamp',
          label: 'Bedside Night Lamp',
          prompt: `Press [E] to ${this.bedsideLampOn ? 'Turn OFF' : 'Turn ON'} Night Lamp`,
        };
      }

      // 3. Bedroom Wardrobe at (-7.2, 1.4)
      if (Math.hypot(relX - (-7.2), relZ - 1.4) < 2.2) {
        return {
          id: 'wardrobe',
          label: 'Bedroom Wardrobe',
          prompt: `Press [E] to ${this.wardrobeOpen ? 'Close' : 'Open'} Wardrobe Doors`,
        };
      }

      // 4. Study Computer Desk at (-3.5, 0.6)
      if (Math.hypot(relX - (-3.5), relZ - 0.6) < 2.0) {
        return { id: 'computer', label: 'Personal Computer', prompt: 'Press [E] to Sit & Use Computer Terminal' };
      }

      // 5. Smart TV at (-5.5, 0.0)
      if (Math.hypot(relX - (-5.5), relZ - 0.0) < 2.5) {
        return {
          id: 'tv',
          label: 'Smart Television',
          prompt: `Press [E] to Turn ${this.state.tvOn ? 'OFF' : 'ON'} News Television`,
        };
      }

      // 6. Living Room Sofa at (0, 0.5)
      if (Math.hypot(relX - 0, relZ - 0.5) < 2.2) {
        return { id: 'sofa', label: 'Living Room Sofa', prompt: 'Press [E] to Sit on Living Room Sofa' };
      }

      // 7. Smartphone on Coffee Table at (0.3, -1.2)
      if (Math.hypot(relX - 0.3, relZ - (-1.2)) < 1.8) {
        return { id: 'phone', label: 'Smartphone', prompt: 'Press [E] to Check In-Game Phone Messages' };
      }

      // 8. Living Room Wall Clock at (-1.2, -1.8)
      if (Math.hypot(relX - (-1.2), relZ - (-1.8)) < 2.2) {
        return { id: 'wallClock', label: 'Living Room Wall Clock', prompt: 'Press [E] to Check Wall Clock Time' };
      }

      // 9. Dining Table & Chairs at (2.2, 1.2)
      if (Math.hypot(relX - 2.2, relZ - 1.2) < 2.4) {
        return { id: 'diningChair', label: 'Dining Area', prompt: 'Press [E] to Sit at Dining Table' };
      }

      // 10. Kitchen Stove at (5.8, 4.6)
      if (Math.hypot(relX - 5.8, relZ - 4.6) < 2.0) {
        return {
          id: 'kitchenStove',
          label: 'Kitchen Electric Stove',
          prompt: `Press [E] to ${this.kitchenStoveOn ? 'Turn OFF' : 'Ignite'} Stove Burners`,
        };
      }

      // 11. Kitchen Sink at (5.8, 2.5)
      if (Math.hypot(relX - 5.8, relZ - 2.5) < 2.0) {
        return { id: 'kitchenSink', label: 'Kitchen Sink', prompt: 'Press [E] to Wash Dishes & Drink Water' };
      }

      // 12. Refrigerator at (4.5, 5.8)
      if (Math.hypot(relX - 4.5, relZ - 5.8) < 2.2) {
        return { id: 'fridge', label: 'Apartment Refrigerator', prompt: 'Press [E] to Open Refrigerator Food Storage' };
      }

      // 13. Relocated First-Aid Medical Bed at (3.6, -5.2)
      if (Math.hypot(relX - 3.6, relZ - (-5.2)) < 2.2) {
        return {
          id: 'medicalBed',
          label: 'First-Aid Medical Bed',
          prompt: 'Press [E] to Rest on First-Aid Bed & Heal',
        };
      }

      // ==============================================================
      // BATHROOM SUITE INTERACTIONS (West Wing: X in [-7.5, -3.2], Z in [-6.6, -3.2])
      // ==============================================================
      // Bathroom Door at (-3.5, -4.1)
      if (Math.hypot(relX - (-3.5), relZ - (-4.1)) < 2.0) {
        return {
          id: 'bathroomDoor',
          label: 'Bathroom Door',
          prompt: `Press [E] to ${this.bathroomDoorOpen ? 'Close' : 'Open'} Bathroom Door`,
        };
      }

      // Bathroom Light Switch at (-3.6, -3.7)
      if (Math.hypot(relX - (-3.6), relZ - (-3.7)) < 1.8) {
        return {
          id: 'bathroomLight',
          label: 'Bathroom Light Switch',
          prompt: `Press [E] to ${this.bathroomLightOn ? 'Turn OFF' : 'Turn ON'} Bathroom Light`,
        };
      }

      // Medicine Cabinet at (-5.6, -3.4)
      if (Math.hypot(relX - (-5.6), relZ - (-3.4)) < 2.0) {
        return {
          id: 'bathroomCabinet',
          label: 'Medicine Cabinet',
          prompt: `Press [E] to ${this.bathroomCabinetOpen ? 'Close' : 'Open'} Medicine Cabinet`,
        };
      }

      // Vanity Sink & Tap at (-4.5, -3.45)
      if (Math.hypot(relX - (-4.5), relZ - (-3.45)) < 2.0) {
        if (Math.hypot(relX - (-4.5), relZ - (-3.45)) < 1.3) {
          return {
            id: 'bathroomTap',
            label: 'Washbasin Faucet',
            prompt: `Press [E] to ${this.bathroomTapRunning ? 'Turn OFF' : 'Turn ON'} Sink Tap`,
          };
        }
        return { id: 'washSink', label: 'Bathroom Washbasin', prompt: 'Press [E] to Wash Hands & Face at Sink' };
      }

      // Bathroom Mirror at (-4.5, -3.32)
      if (Math.hypot(relX - (-4.5), relZ - (-3.32)) < 2.2) {
        return { id: 'mirrorLook', label: 'Bathroom Mirror', prompt: 'Press [E] to Look in Bathroom Mirror' };
      }

      // Towel Rack at (-3.6, -5.2)
      if (Math.hypot(relX - (-3.6), relZ - (-5.2)) < 1.8) {
        return { id: 'towel', label: 'Bath Towel Rack', prompt: 'Press [E] to Dry Hands with Clean Towel' };
      }

      // Glass Shower Stall at (-6.75, -3.95)
      if (Math.hypot(relX - (-6.75), relZ - (-3.95)) < 2.2) {
        return { id: 'shower', label: 'Shower Stall', prompt: 'Press [E] to Take Refreshing Warm Shower' };
      }

      // Freestanding Porcelain Bathtub at (-6.5, -5.7)
      if (Math.hypot(relX - (-6.5), relZ - (-5.7)) < 2.2) {
        return { id: 'bathtub', label: 'Porcelain Bathtub', prompt: 'Press [E] to Relax in Warm Bathtub' };
      }

      // Modern Ceramic Toilet at (-4.4, -6.0)
      if (Math.hypot(relX - (-4.4), relZ - (-6.0)) < 2.0) {
        return { id: 'toilet', label: 'Ceramic Toilet', prompt: 'Press [E] to Use Toilet & Flush' };
      }

      // 14. Ceiling fan switch
      if (Math.hypot(relX - 0, relZ - 0.5) < 2.2) {
        return {
          id: 'fan',
          label: 'Ceiling Fan',
          prompt: `Press [E] to ${this.state.fanOn ? 'Stop' : 'Start'} Ceiling Fan`,
        };
      }

      // 15. Air conditioner switch at (-2.5, -6.6)
      if (Math.hypot(relX - (-2.5), relZ - (-6.6)) < 2.2) {
        return {
          id: 'ac',
          label: 'Air Conditioner',
          prompt: `Press [E] to ${this.state.acOn ? 'Turn OFF' : 'Turn ON'} Air Conditioner`,
        };
      }

      // 16. Front entrance door at (0, -6.9)
      if (Math.hypot(relX - 0, relZ - (-6.9)) < 2.2) {
        return {
          id: 'door',
          label: 'Apartment Front Door',
          prompt: `Press [E] to ${this.state.doorOpen ? 'Close' : 'Open'} Entrance Door`,
        };
      }
    }

    // --- FLOOR 2 (MEDICAL CENTRE) INTERACTION ---
    if (relY >= 3.0 && relY < 6.2) {
      if (Math.hypot(relX - 2.6, relZ - (-4.8)) < 3.4) {
        return { id: 'medicalClinic', label: 'Medical Centre Reception', prompt: 'Press [E] to Access Medical Centre' };
      }
      // Four patient beds on Floor 2
      if (
        Math.hypot(relX - (-5.7), relZ - (-3.5)) < 2.0 ||
        Math.hypot(relX - (-2.7), relZ - (-3.5)) < 2.0 ||
        Math.hypot(relX - (-5.7), relZ - 1.5) < 2.0 ||
        Math.hypot(relX - (-2.7), relZ - 1.5) < 2.0
      ) {
        return { id: 'medicalBed', label: 'Hospital Patient Bed', prompt: 'Press [E] to Rest on Hospital Bed & Heal' };
      }
    }

    // --- FLOOR 3 (ARMORY) INTERACTIONS ---
    if (relY >= 6.0 && relY < 9.4) {
      if (Math.hypot(relX - 2.0, relZ - 0.0) < 3.2 || Math.hypot(relX - (-5.0), relZ - 0.0) < 4.0) {
        return {
          id: 'armory',
          label: 'Sector Armory & Weapon Vault',
          prompt: 'Press [E] to Access 100-Item Fictional Armory Vault',
        };
      }
    }

    // --- FLOOR 4 (SURVIVAL FARM / UTILITIES) ---
    if (relY >= 9.2 && relY < 12.6 && Math.abs(relX) < 7.5 && Math.abs(relZ) < 6.8) {
      return { id: 'apartmentStatus', label: 'Survival Farm Utility Controls', prompt: 'Press [E] to Inspect Farm, Water and Power Controls' };
    }

    // --- FLOOR 5 (ROOFTOP POOL) INTERACTIONS ---
    if (relY >= 12.4) {
      if (Math.hypot(relX - (-2.5), relZ - 0.0) < 5.0) {
        return {
          id: 'pool',
          label: 'Rooftop Swimming Pool',
          prompt: 'Press [E] to Dive into Rooftop Swimming Pool',
        };
      }
    }

    return null;
  }

  public togglePatioDoor(): boolean {
    this.patioDoorOpen = !this.patioDoorOpen;
    if (this.patioDoorLeftLeaf && this.patioDoorRightLeaf) {
      this.patioDoorLeftLeaf.position.x = this.patioDoorOpen ? -1.15 : -0.58;
      this.patioDoorRightLeaf.position.x = this.patioDoorOpen ? 1.15 : 0.58;
    }
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_patio_door', this.patioDoorOpen);
    soundEngine.playGateToggle(this.patioDoorOpen);
    return this.patioDoorOpen;
  }

  public toggleBasementTV(forceState?: boolean): boolean {
    this.basementTvOn = forceState !== undefined ? forceState : !this.basementTvOn;
    this.renderBasementTvContent();
    this.basementTvTexture.needsUpdate = true;
    soundEngine.playUIClick();
    return this.basementTvOn;
  }

  // --- Complete Bathroom Toggles ---
  public toggleBathroomDoor(forceState?: boolean): boolean {
    this.bathroomDoorOpen = forceState !== undefined ? forceState : !this.bathroomDoorOpen;
    if (this.bathroomDoorGroup) {
      this.bathroomDoorGroup.rotation.y = this.bathroomDoorOpen ? -Math.PI / 2 : 0;
    }
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_bath_door', this.bathroomDoorOpen);
    soundEngine.playDoorOpenClose(this.bathroomDoorOpen);
    return this.bathroomDoorOpen;
  }

  public toggleBathroomLight(forceState?: boolean): boolean {
    this.bathroomLightOn = forceState !== undefined ? forceState : !this.bathroomLightOn;
    if (this.bathroomLight) {
      this.bathroomLight.intensity = this.bathroomLightOn ? 1.6 : 0.05;
    }
    soundEngine.playSwitchClick();
    return this.bathroomLightOn;
  }

  public toggleBathroomTap(forceState?: boolean): boolean {
    this.bathroomTapRunning = forceState !== undefined ? forceState : !this.bathroomTapRunning;
    if (this.bathroomTapWaterMesh) {
      this.bathroomTapWaterMesh.visible = this.bathroomTapRunning;
    }
    if (this.bathroomTapMesh) {
      this.bathroomTapMesh.rotation.y = this.bathroomTapRunning ? 0.6 : 0;
    }
    if (this.bathroomTapRunning) {
      soundEngine.playWaterRunning(3.0);
    }
    return this.bathroomTapRunning;
  }

  public toggleBathroomShower(forceState?: boolean): boolean {
    this.bathroomShowerRunning = forceState !== undefined ? forceState : !this.bathroomShowerRunning;
    if (this.bathroomShowerWaterGroup) {
      this.bathroomShowerWaterGroup.visible = this.bathroomShowerRunning;
    }
    if (this.bathroomShowerSteamMesh) {
      this.bathroomShowerSteamMesh.visible = this.bathroomShowerRunning;
    }
    if (this.bathroomShowerRunning) {
      soundEngine.playWaterRunning(4.0);
    }
    return this.bathroomShowerRunning;
  }

  public toggleBathroomCabinet(forceState?: boolean): boolean {
    this.bathroomCabinetOpen = forceState !== undefined ? forceState : !this.bathroomCabinetOpen;
    if (this.bathroomCabinetDoor) {
      this.bathroomCabinetDoor.rotation.y = this.bathroomCabinetOpen ? -1.4 : 0;
    }
    soundEngine.playCabinetOpenClose(this.bathroomCabinetOpen);
    return this.bathroomCabinetOpen;
  }

  public triggerToiletFlush(): void {
    this.toiletFlushing = true;
    this.toiletFlushTimer = 3.2;
    soundEngine.playToiletFlush();
  }

  // --- House Furniture Toggles ---
  public toggleKitchenStove(forceState?: boolean): boolean {
    this.kitchenStoveOn = forceState !== undefined ? forceState : !this.kitchenStoveOn;
    this.kitchenStoveBurners.forEach((burner) => {
      const mat = burner.material as THREE.MeshStandardMaterial;
      if (this.kitchenStoveOn) {
        mat.color.setHex(0xff3300);
        mat.emissive.setHex(0xff2200);
        mat.emissiveIntensity = 1.2;
      } else {
        mat.color.setHex(0x222222);
        mat.emissive.setHex(0x000000);
        mat.emissiveIntensity = 0;
      }
    });
    if (this.kitchenStoveOn) {
      soundEngine.playStoveIgnite();
    } else {
      soundEngine.playSwitchClick();
    }
    return this.kitchenStoveOn;
  }

  public toggleKitchenTap(forceState?: boolean): boolean {
    this.kitchenTapRunning = forceState !== undefined ? forceState : !this.kitchenTapRunning;
    if (this.kitchenTapWaterMesh) {
      this.kitchenTapWaterMesh.visible = this.kitchenTapRunning;
    }
    if (this.kitchenTapRunning) {
      soundEngine.playWaterRunning(2.5);
    }
    return this.kitchenTapRunning;
  }

  public toggleWardrobe(forceState?: boolean): boolean {
    this.wardrobeOpen = forceState !== undefined ? forceState : !this.wardrobeOpen;
    if (this.wardrobeLeftDoor) {
      this.wardrobeLeftDoor.rotation.y = this.wardrobeOpen ? -1.5 : 0;
    }
    if (this.wardrobeRightDoor) {
      this.wardrobeRightDoor.rotation.y = this.wardrobeOpen ? 1.5 : 0;
    }
    soundEngine.playCabinetOpenClose(this.wardrobeOpen);
    return this.wardrobeOpen;
  }

  public toggleBedsideLamp(forceState?: boolean): boolean {
    this.bedsideLampOn = forceState !== undefined ? forceState : !this.bedsideLampOn;
    if (this.bedsideLampLight) {
      this.bedsideLampLight.intensity = this.bedsideLampOn ? 1.4 : 0;
    }
    soundEngine.playSwitchClick();
    return this.bedsideLampOn;
  }

  public renderWallClockContent(timeMinutes: number = 360, dayCount: number = 1) {
    if (!this.wallClockCtx) return;
    const ctx = this.wallClockCtx;
    const w = this.wallClockCanvas.width;
    const h = this.wallClockCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const r = w / 2 - 12;

    ctx.clearRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const x1 = cx + Math.sin(angle) * (r - 18);
      const y1 = cy - Math.cos(angle) * (r - 18);
      const x2 = cx + Math.sin(angle) * (r - 6);
      const y2 = cy - Math.cos(angle) * (r - 6);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = i % 3 === 0 ? 5 : 2;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
    }

    const hours = (timeMinutes / 60) % 24;
    const mins = timeMinutes % 60;
    const hourAngle = ((hours % 12) + mins / 60) * (Math.PI / 6);
    const minAngle = (mins / 60) * (Math.PI * 2);

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(hourAngle) * (r * 0.52), cy - Math.cos(hourAngle) * (r * 0.52));
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0f172a';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(minAngle) * (r * 0.76), cy - Math.cos(minAngle) * (r * 0.76));
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#2563eb';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#dc2626';
    ctx.fill();

    const hh = Math.floor(hours).toString().padStart(2, '0');
    const mm = Math.floor(mins).toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${hh}:${mm} ${ampm}`, cx, cy + 45);
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`DAY ${dayCount}`, cx, cy + 62);

    if (this.wallClockTexture) this.wallClockTexture.needsUpdate = true;
  }

  public renderComputerScreenContent(stats?: any, day?: number, timeMinutes?: number) {
    if (!this.computerScreenCtx) return;
    const ctx = this.computerScreenCtx;
    const w = this.computerScreenCanvas.width;
    const h = this.computerScreenCanvas.height;

    ctx.fillStyle = '#0a0f1d';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 32);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 14px monospace';
    const dayStr = day !== undefined ? ` · DAY ${day}` : '';
    ctx.fillText(`SURVIVOR TERMINAL · OAKRIDGE OS${dayStr}`, 12, 22);

    ctx.fillStyle = '#10b981';
    ctx.fillRect(w - 24, 10, 12, 12);

    ctx.font = '13px monospace';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('$ systemctl status sanctuary-mesh', 14, 58);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('● status: OPTIMAL · 5 Floors + Sub-Basement Online', 14, 80);
    const hpStr = stats?.health !== undefined ? `HP: ${Math.round(stats.health)}/${stats.maxHealth}` : 'HEALTH: NOMINAL';
    const stamStr = stats?.stamina !== undefined ? `STA: ${Math.round(stats.stamina)}` : 'STA: 100';
    ctx.fillText(`● survivor_vitals: ${hpStr} | ${stamStr}`, 14, 102);
    ctx.fillText('● water_purification: 99.4% purity nominal', 14, 124);
    ctx.fillText('● hydro_grid: 240V steady · generator standby', 14, 146);
    ctx.fillText('● perimeter_defense: Turret Sentries Armed', 14, 168);
    ctx.fillText('● railway_telem: 6 Services Telemetry Linked', 14, 190);

    ctx.fillStyle = '#38bdf8';
    ctx.fillText('$ ready for operational diagnostics > _', 14, 230);

    if (this.computerScreenTexture) this.computerScreenTexture.needsUpdate = true;
  }

  public renderBasementTvContent() {
    if (!this.basementTvCtx) return;
    const ctx = this.basementTvCtx;
    const w = this.basementTvCanvas.width;
    const h = this.basementTvCanvas.height;

    if (!this.basementTvOn) {
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);
      return;
    }

    ctx.fillStyle = '#071626';
    ctx.fillRect(0, 0, w, h);

    // Header
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(0, 0, w, 46);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SUB-LEVEL 1 OPERATIONS · RECREATION FEED', 16, 30);

    // Status items
    ctx.fillStyle = '#38bdf8';
    ctx.font = '15px monospace';
    ctx.fillText('● RAILWAY DISPATCH: ACTIVE [TRACKS F1-B3 ONLINE]', 20, 80);
    ctx.fillText('● UTILITY WATER RESERVES: 12,500 L NOMINAL', 20, 115);
    ctx.fillText('● DIESEL BACKUP GENERATOR: STANDBY READY', 20, 150);
    ctx.fillText('● DEFENSE SENTRIES: 20 ARMED · HOSTILE ONLY', 20, 185);

    // Ticker
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, h - 38, w, 38);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('OAKRIDGE EMERGENCY DEFENSE NETWORK · SECURE FREQUENCY', 16, h - 14);
  }

  public renderSecurityScreenContent(entities: Array<{ x: number; z: number; type: 'zombie' | 'creature' }> = [], playerRelPos?: { x: number; z: number }) {
    if (!this.securityScreenCtx) return;
    const ctx = this.securityScreenCtx;
    const w = this.securityScreenCanvas.width;
    const h = this.securityScreenCanvas.height;

    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, w, h);

    // Top Header Bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = '#0891b2';
    ctx.fillRect(0, 52, w, 2);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('OAKRIDGE SANCTUARY DEFENSE · 5 KM TACTICAL COMMAND RADAR', 24, 35);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('● RADAR ONLINE • 5000M SWEEP', w - 310, 35);

    // Left Panel: House Vitals
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(16, 68, 250, 410);

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('HOUSE VITALS & UTILITY', 28, 96);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px monospace';
    ctx.fillText('Structural Integrity: 100%', 28, 130);
    ctx.fillText('Perimeter Walls: SECURE', 28, 160);
    ctx.fillText('Primary Grid: 240V 15.0kW', 28, 190);
    ctx.fillText('Backup Generator: STANDBY', 28, 220);
    ctx.fillText('Day-Tank Fuel: 420 L (93%)', 28, 250);
    ctx.fillText('Potable Water: 12,500 L', 28, 280);
    ctx.fillText('Filtration Plant: 4.2 BAR', 28, 310);
    ctx.fillText('Garage Vehicles: 4 READY', 28, 340);
    ctx.fillText('  - Aegis Armored SUV', 28, 370);
    ctx.fillText('  - Phantom Enduro Motorcycle', 28, 395);
    ctx.fillText('  - RidgeLine Mountain Bicycle', 28, 420);
    ctx.fillText('  - Military Enforcement Vehicle', 28, 445);

    // Right Panel: Turret Telemetry
    ctx.strokeRect(w - 266, 68, 250, 410);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('DEFENSIVE TURRETS', w - 254, 96);

    const telemetry = this.turrets?.getTurretsTelemetry() || [];
    const totalAmmo = telemetry.reduce((sum,t)=>sum+t.ammo,0);
    const maxAmmo = telemetry.reduce((sum,t)=>sum+t.maxAmmo,0);
    const totalKills = telemetry.reduce((sum,t)=>sum+t.killsCount,0);
    const locked = telemetry.filter(t=>t.isLockedOn).length;
    const operational = telemetry.filter(t=>t.health>0).length;

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px monospace';
    ctx.fillText(`Armed Sentries: ${operational}/20 ONLINE`, w - 254, 130);
    ctx.fillText(`  Ammunition: ${totalAmmo}/${maxAmmo}`, w - 254, 155);
    ctx.fillText(`  Confirmed Neutralizations: ${totalKills}`, w - 254, 180);
    ctx.fillText(`  Active Hostile Locks: ${locked}`, w - 254, 205);
    ctx.fillText('Target Policy: HOSTILE ONLY', w - 254, 230);
    ctx.fillText('Player / Friendly / Neutral: SAFE', w - 254, 255);

    ctx.fillText('Five-Gate Status:', w - 254, 300);
    ctx.fillText(`  Main: ${this.compoundGateOpen ? 'OPEN' : 'CLOSED'}`, w - 254, 325);
    ctx.fillText(`  West Ped: ${this.compoundPedestrianDoorsOpen[0] ? 'OPEN' : 'CLOSED'}`, w - 254, 350);
    ctx.fillText(`  East Ped: ${this.compoundPedestrianDoorsOpen[1] ? 'OPEN' : 'CLOSED'}`, w - 254, 375);
    ctx.fillText(`  South Vehicle: ${this.vehicleGateOpen ? 'OPEN' : 'CLOSED'}`, w - 254, 400);
    ctx.fillText(`  North Vehicle: ${this.vehicleGate2Open ? 'OPEN' : 'CLOSED'}`, w - 254, 425);
    ctx.fillText(`  Garage Shutters: ${this.garageShutterOpen ? 'RAISED' : 'LOWERED'}`, w - 254, 450);

    // Centre 5km Radar Display (Radius 180px)
    const rcx = w / 2;
    const rcy = 270;
    const rRadius = 180;

    ctx.strokeStyle = '#0e3a47';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(rcx, rcy, rRadius, 0, Math.PI * 2);
    ctx.arc(rcx, rcy, rRadius * 0.5, 0, Math.PI * 2);
    ctx.arc(rcx, rcy, rRadius * 0.2, 0, Math.PI * 2);
    ctx.stroke();

    // Crosshairs
    ctx.strokeStyle = '#0c4a6e';
    ctx.beginPath();
    ctx.moveTo(rcx - rRadius, rcy);
    ctx.lineTo(rcx + rRadius, rcy);
    ctx.moveTo(rcx, rcy - rRadius);
    ctx.lineTo(rcx, rcy + rRadius);
    ctx.stroke();

    // Range markers
    ctx.fillStyle = '#0ea5e9';
    ctx.font = '11px monospace';
    ctx.fillText('5000m', rcx + 6, rcy - rRadius + 14);
    ctx.fillText('2500m', rcx + 6, rcy - rRadius * 0.5 + 14);
    ctx.fillText('1000m', rcx + 6, rcy - rRadius * 0.2 + 14);

    // Sweeping Radar Line
    this.radarSweepTimer += 0.05;
    const sweepX = rcx + Math.cos(this.radarSweepTimer) * rRadius;
    const sweepY = rcy + Math.sin(this.radarSweepTimer) * rRadius;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rcx, rcy);
    ctx.lineTo(sweepX, sweepY);
    ctx.stroke();

    // Center Sanctuary Marker (Green Diamond)
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(rcx, rcy - 6);
    ctx.lineTo(rcx + 6, rcy);
    ctx.lineTo(rcx, rcy + 6);
    ctx.lineTo(rcx - 6, rcy);
    ctx.closePath();
    ctx.fill();

    // Player Cyan Blip
    if (playerRelPos) {
      const px = rcx + (playerRelPos.x / 5000) * rRadius;
      const py = rcy + (playerRelPos.z / 5000) * rRadius;
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hostile Entity Blips (Red for zombies, Amber for creatures)
    for (const ent of entities) {
      const ex = rcx + (ent.x / 5000) * rRadius;
      const ey = rcy + (ent.z / 5000) * rRadius;
      if (Math.hypot(ex - rcx, ey - rcy) <= rRadius) {
        ctx.fillStyle = ent.type === 'zombie' ? '#ef4444' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bottom Panel: Danger Alerts Log
    ctx.strokeRect(16, 490, w - 32, 70);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(17, 491, w - 34, 68);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ACTIVE THREAT ALERTS & EVENT LOG', 28, 510);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.fillText('[08:32:00] 20 Armed Perimeter Sentries ONLINE. ROE: HOSTILE NPC / ENEMY FACTION ONLY.', 28, 530);
    ctx.fillText('[08:34:15] Potable water filtration manifolds pressurised at 4.2 bar. 4 garage bays & 2 pad vehicles operational.', 28, 548);
  }

  public toggleTV(forceState?: boolean, isEmergency: boolean = false): boolean {
    this.state.tvOn = forceState !== undefined ? forceState : !this.state.tvOn;
    this.updateTVScreenContent(this.state.tvOn, isEmergency);
    this.tvTexture.needsUpdate = true;
    soundEngine.playUIClick();
    return this.state.tvOn;
  }

  public toggleFan(): boolean {
    this.state.fanOn = !this.state.fanOn;
    soundEngine.playUIClick();
    return this.state.fanOn;
  }

  public toggleAC(): boolean {
    this.state.acOn = !this.state.acOn;
    this.acLedMat.color.setHex(this.state.acOn ? 0x00ff88 : 0x441111);
    soundEngine.playUIClick();
    return this.state.acOn;
  }

  public toggleDoor(): boolean {
    this.state.doorOpen = !this.state.doorOpen;
    if (this.frontDoorLeftLeaf && this.frontDoorRightLeaf) {
      // Both leaves swing away from the centre and stay synchronized.
      this.frontDoorLeftLeaf.rotation.y = this.state.doorOpen ? -Math.PI / 2 : 0;
      this.frontDoorRightLeaf.rotation.y = this.state.doorOpen ? Math.PI / 2 : 0;
    }
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_front_door', this.state.doorOpen);
    soundEngine.playGateToggle(this.state.doorOpen);
    return this.state.doorOpen;
  }

  public toggleCompoundGate(): boolean {
    this.compoundGateOpen = !this.compoundGateOpen;
    if (this.compoundGateLeftLeaf && this.compoundGateRightLeaf) {
      this.compoundGateLeftLeaf.rotation.y = this.compoundGateOpen ? -Math.PI / 2 : 0;
      this.compoundGateRightLeaf.rotation.y = this.compoundGateOpen ? Math.PI / 2 : 0;
    }
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_compound_gate', this.compoundGateOpen);
    soundEngine.playGateToggle(this.compoundGateOpen);
    return this.compoundGateOpen;
  }

  public toggleCompoundPedestrianDoor(side: 'left' | 'right'): boolean {
    const index = side === 'left' ? 0 : 1;
    this.compoundPedestrianDoorsOpen[index] = !this.compoundPedestrianDoorsOpen[index];
    const hinge = side === 'left' ? this.compoundPedestrianDoorLeft : this.compoundPedestrianDoorRight;
    if (hinge) hinge.rotation.y = this.compoundPedestrianDoorsOpen[index]
      ? (side === 'left' ? 0 : 0)
      : (side === 'left' ? Math.PI / 2 : -Math.PI / 2);
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState(`apt_compound_door_${side}`, this.compoundPedestrianDoorsOpen[index]);
    soundEngine.playGateToggle(this.compoundPedestrianDoorsOpen[index]);
    return this.compoundPedestrianDoorsOpen[index];
  }

  /** Access points used by companion navigation. A closed access point is never selected. */
  public getOpenCompoundAccessPoints(): THREE.Vector3[] {
    const ox = this.origin.x;
    const oz = this.origin.z;
    const points: THREE.Vector3[] = [];
    if (this.compoundGateOpen) points.push(new THREE.Vector3(ox, 0, oz - 75.5));
    if (this.compoundPedestrianDoorsOpen[0]) points.push(new THREE.Vector3(ox - 82, 0, oz));
    if (this.compoundPedestrianDoorsOpen[1]) points.push(new THREE.Vector3(ox + 18, 0, oz - 24));
    if (this.vehicleGateOpen) points.push(new THREE.Vector3(ox - 48, 0, oz - 75.5));
    if (this.vehicleGate2Open) points.push(new THREE.Vector3(ox - 24, 0, oz + 51.0));
    return points;
  }

  /** Floor support for companion NPCs on the apartment's five-floor switchback stairs. */
  public getCompanionSurfaceHeight(position: THREE.Vector3, currentY: number, targetY: number): number {
    const relX = position.x - this.origin.x;
    const relZ = position.z - this.origin.z;
    const inBuilding = relX >= -7.8 && relX <= 7.8 && relZ >= -6.8 && relZ <= 6.8;
    if (!inBuilding) return getTerrainHeight(position.x, position.z);
    const stairwell = relX >= 4.5 && relX <= 7.5 && relZ >= -3.8 && relZ <= 1.0;
    const currentFloor = THREE.MathUtils.clamp(Math.floor(Math.max(0,currentY-0.245)/3.2),0,4);
    const targetFloor = THREE.MathUtils.clamp(Math.round(Math.max(0,targetY-0.245)/3.2),0,4);
    if (stairwell && currentFloor < 4 && targetFloor > currentFloor) {
      const flight=currentFloor, laneX=[5.25,6.75,5.25,6.75][flight];
      if (Math.abs(relX-laneX)<1.25) { const p=THREE.MathUtils.clamp((relZ+3.5)/4.2,0,1); const progress=flight%2===0?p:1-p; return 0.245+flight*3.2+progress*3.2; }
    }
    if (stairwell && currentFloor > 0 && targetFloor < currentFloor) {
      const flight=currentFloor-1, laneX=[5.25,6.75,5.25,6.75][flight];
      if (Math.abs(relX-laneX)<1.25) { const p=THREE.MathUtils.clamp((relZ+3.5)/4.2,0,1); const progress=flight%2===1?p:1-p; return 0.245+(flight+1)*3.2-progress*3.2; }
    }
    return 0.245+currentFloor*3.2;
  }

  /**
   * Return a legal doorway waypoint when a companion and its destination are
   * on opposite sides of the mansion or compound boundary. Closed access points
   * are deliberately excluded, so the companion remains blocked by the wall.
   */
  public getCompanionNavigationWaypoint(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 | null {
    const ox = this.origin.x;
    const oz = this.origin.z;
    const buildingFrontZ = oz - 6.9;
    const insideBuilding = (p: THREE.Vector3) => p.x > ox - 8.2 && p.x < ox + 8.2 && p.z > buildingFrontZ && p.z < oz + 7.2;
    const fromInBuilding = insideBuilding(from);
    const toInBuilding = insideBuilding(to);

    // Follow the actual switchback staircase when player and companion occupy different floors.
    if (fromInBuilding && toInBuilding && Math.abs(from.y-to.y)>1.6) {
      const currentFloor=THREE.MathUtils.clamp(Math.floor(Math.max(0,from.y-0.245)/3.2),0,4);
      const targetFloor=THREE.MathUtils.clamp(Math.round(Math.max(0,to.y-0.245)/3.2),0,4);
      if (currentFloor!==targetFloor) {
        const ascending=targetFloor>currentFloor, flight=ascending?currentFloor:currentFloor-1;
        if (flight>=0 && flight<=3) {
          const reverse=flight%2===1, laneX=[5.25,6.75,5.25,6.75][flight];
          const startZ=ascending?(reverse?0.7:-3.5):(reverse?-3.5:0.7);
          const endZ=ascending?(reverse?-3.5:0.7):(reverse?0.7:-3.5);
          const inFlight=Math.abs((from.x-ox)-laneX)<1.25 && from.z>=oz-3.9 && from.z<=oz+1.1;
          return new THREE.Vector3(ox+laneX,from.y,oz+(inFlight?endZ:startZ));
        }
      }
    }

    // Mansion front entrance: both leaves must be open for traversal.
    if (fromInBuilding !== toInBuilding && this.state.doorOpen) {
      const insideZ = buildingFrontZ + 1.15;
      const outsideZ = buildingFrontZ - 1.15;
      return new THREE.Vector3(ox, Math.max(0, getTerrainHeight(ox, fromInBuilding ? outsideZ : insideZ)), fromInBuilding ? outsideZ : insideZ);
    }

    const isInsideCompound = (p: THREE.Vector3) =>
      p.x > ox - 82 && p.x < ox + 18 && p.z > oz - 75.5 && p.z < oz + 51.0;
    const fromInsideCompound = isInsideCompound(from);
    const toInsideCompound = isInsideCompound(to);
    if (fromInsideCompound !== toInsideCompound) {
      const openPoints = this.getOpenCompoundAccessPoints();
      if (openPoints.length === 0) return null;
      openPoints.sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
      const access = openPoints[0];
      // Route through whichever of the five open gates is nearest, including the north vehicle gate.
      let outwardX = 0, outwardZ = 0;
      if (Math.abs(access.x - (ox - 82)) < 1.5) outwardX = -1;
      else if (Math.abs(access.x - (ox + 18)) < 1.5) outwardX = 1;
      else if (Math.abs(access.z - (oz - 75.5)) < 1.5) outwardZ = -1;
      else outwardZ = 1;
      const direction = fromInsideCompound ? 1 : -1;
      const crossX = access.x + outwardX * 1.1 * direction;
      const crossZ = access.z + outwardZ * 1.1 * direction;
      return new THREE.Vector3(crossX, getTerrainHeight(crossX, crossZ), crossZ);
    }
    return null;
  }

  /** Operates the 8-floor command-centre lift and returns the player's destination. */
  public cycleCommandElevator(): THREE.Vector3 {
    this.commandElevatorFloor = (this.commandElevatorFloor + 1) % 8;
    const localY = 0.78 + this.commandElevatorFloor * 3.45;
    if (this.commandElevatorPlatform) this.commandElevatorPlatform.position.y = localY;
    UnifiedPhysicsManager.getInstance()?.updateColliderPosition(
      'rebirth_command_elevator_platform',
      [this.origin.x - 55.2, localY, this.origin.z + 22.8]
    );
    return new THREE.Vector3(this.origin.x - 55.2, 1.05 + this.commandElevatorFloor * 3.45, this.origin.z + 22.8);
  }

  public toggleGarageShutter(): boolean {
    this.garageShutterOpen = !this.garageShutterOpen;
    if (this.garageShutterGroup) this.garageShutterGroup.position.y = this.garageShutterOpen ? 2.65 : 0;
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_garage_shutter', this.garageShutterOpen);
    soundEngine.playGateToggle(this.garageShutterOpen);
    return this.garageShutterOpen;
  }

  public toggleVehicleGate(): boolean {
    this.vehicleGateOpen = !this.vehicleGateOpen;
    if (this.vehicleGateGroup) this.vehicleGateGroup.position.y = this.vehicleGateOpen ? 5.0 : 0;
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_vehicle_gate', this.vehicleGateOpen);
    soundEngine.playGateToggle(this.vehicleGateOpen);
    return this.vehicleGateOpen;
  }

  public toggleSecondVehicleGate(): boolean {
    this.vehicleGate2Open = !this.vehicleGate2Open;
    if (this.vehicleGate2Group) this.vehicleGate2Group.position.y = this.vehicleGate2Open ? 5.0 : 0;
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_vehicle_gate_2', this.vehicleGate2Open);
    soundEngine.playGateToggle(this.vehicleGate2Open);
    return this.vehicleGate2Open;
  }

  /** Enemy-faction NPC systems register only explicitly hostile, living actors here. */
  public registerHostileFactionTarget(target: HostileFactionTurretTarget): boolean {
    return this.turrets?.registerHostileFactionTarget(target) ?? false;
  }

  public unregisterFactionTarget(id: string): void {
    this.turrets?.unregisterFactionTarget(id);
  }

  public exportCompoundState(): CompoundSecuritySaveData {
    return {
      version: 1,
      mainGateOpen: this.compoundGateOpen,
      pedestrianGatesOpen: [this.compoundPedestrianDoorsOpen[0], this.compoundPedestrianDoorsOpen[1]],
      vehicleGatesOpen: [this.vehicleGateOpen, this.vehicleGate2Open],
      garageShutterOpen: this.garageShutterOpen,
      turrets: this.turrets?.exportSaveData() ?? [],
    };
  }

  public restoreCompoundState(saved?: CompoundSecuritySaveData): void {
    if (!saved || saved.version !== 1) return;
    this.compoundGateOpen = !!saved.mainGateOpen;
    this.compoundPedestrianDoorsOpen = [!!saved.pedestrianGatesOpen?.[0], !!saved.pedestrianGatesOpen?.[1]];
    this.vehicleGateOpen = !!saved.vehicleGatesOpen?.[0];
    this.vehicleGate2Open = !!saved.vehicleGatesOpen?.[1];
    this.garageShutterOpen = !!saved.garageShutterOpen;

    if (this.compoundGateLeftLeaf && this.compoundGateRightLeaf) {
      this.compoundGateLeftLeaf.rotation.y = this.compoundGateOpen ? -Math.PI / 2 : 0;
      this.compoundGateRightLeaf.rotation.y = this.compoundGateOpen ? Math.PI / 2 : 0;
    }
    if (this.compoundPedestrianDoorLeft) this.compoundPedestrianDoorLeft.rotation.y = this.compoundPedestrianDoorsOpen[0] ? 0 : Math.PI / 2;
    if (this.compoundPedestrianDoorRight) this.compoundPedestrianDoorRight.rotation.y = this.compoundPedestrianDoorsOpen[1] ? 0 : -Math.PI / 2;
    if (this.vehicleGateGroup) this.vehicleGateGroup.position.y = this.vehicleGateOpen ? 5.0 : 0;
    if (this.vehicleGate2Group) this.vehicleGate2Group.position.y = this.vehicleGate2Open ? 5.0 : 0;
    if (this.garageShutterGroup) this.garageShutterGroup.position.y = this.garageShutterOpen ? 2.65 : 0;

    const physics = UnifiedPhysicsManager.getInstance();
    physics?.setDoorOpenState('apt_compound_gate', this.compoundGateOpen);
    physics?.setDoorOpenState('apt_compound_door_left', this.compoundPedestrianDoorsOpen[0]);
    physics?.setDoorOpenState('apt_compound_door_right', this.compoundPedestrianDoorsOpen[1]);
    physics?.setDoorOpenState('apt_vehicle_gate', this.vehicleGateOpen);
    physics?.setDoorOpenState('apt_vehicle_gate_2', this.vehicleGate2Open);
    physics?.setDoorOpenState('apt_garage_shutter', this.garageShutterOpen);
    this.turrets?.importSaveData(saved.turrets as TurretSaveRecord[] | undefined);
  }

  public isCompoundGateOpen(): boolean { return this.compoundGateOpen; }
  public isFrontDoorOpen(): boolean { return this.state.doorOpen; }

  public checkPlayerInPool(playerPos: THREE.Vector3): boolean {
    // The redesigned compound uses the rooftop infinity pool; the former backyard pool is removed.
    return playerPos.x >= this.origin.x - 5.5 && playerPos.x <= this.origin.x + 0.5 &&
      playerPos.z >= this.origin.z - 2.8 && playerPos.z <= this.origin.z + 2.8 &&
      playerPos.y >= 11.2 && playerPos.y <= 14.0;
  }

  // ==========================================
  // UNIFIED PHYSICS COLLIDER REGISTRATION
  // ==========================================
  public registerColliders(physMgr: UnifiedPhysicsManager) {
    const ox = this.origin.x;
    const oz = this.origin.z;

    // IMPORTANT: floor slabs and stair flights are walkable surfaces, not walls.
    // PlayerController computes the five floor heights and staircase
    // support. Registering these slabs as ordinary solid boxes made the movement
    // resolver push the player out through the nearest exterior wall.

    // 1. Exterior perimeter walls.
    // North wall has 2.4m central doorway with sliding glass patio doors to the backyard
    physMgr.registerBoxCollider('apt_wall_north_l', 'wall', [ox - 4.6, 1.6, oz + 6.8], 6.8, 3.2, 0.6);
    physMgr.registerBoxCollider('apt_wall_north_r', 'wall', [ox + 4.6, 1.6, oz + 6.8], 6.8, 3.2, 0.6);
    physMgr.registerBoxCollider('apt_wall_north_upper', 'wall', [ox, 8.0, oz + 6.8], 16.0, 9.6, 0.6);
    physMgr.registerBoxCollider(
      'apt_patio_door',
      'wall',
      [ox, 1.4, oz + 6.8],
      2.4,
      2.6,
      0.2,
      0,
      this.patioDoorOpen
    );
    physMgr.registerBoxCollider('apt_wall_east', 'wall', [ox + 7.8, 6.4, oz], 0.6, 12.8, 14.0);
    // West wall split at Z=-1.8 so Floors 1-4 connect openly into the explorable West Wing
    physMgr.registerBoxCollider('apt_wall_west_s', 'wall', [ox - 7.8, 6.4, oz - 4.9], 0.6, 12.8, 4.2);
    physMgr.registerBoxCollider('apt_wall_west_n', 'wall', [ox - 7.8, 6.4, oz + 3.1], 0.6, 12.8, 7.8);
    physMgr.registerBoxCollider('apt_wall_south_l', 'wall', [ox - 4.5, 6.4, oz - 6.8], 7.0, 12.8, 0.6);
    physMgr.registerBoxCollider('apt_wall_south_r', 'wall', [ox + 4.5, 6.4, oz - 6.8], 7.0, 12.8, 0.6);

    // Front double entrance door
    physMgr.registerBoxCollider(
      'apt_front_door',
      'wall',
      [ox, 1.4, oz - 6.9],
      1.96,
      2.38,
      0.22,
      0,
      this.state.doorOpen
    );
    // 2. Rooftop pool basin walls. The water surface is a swim zone;
    // the dry deck remains supported at y=9.9 by PlayerController.
    physMgr.registerBoxCollider('apt_pool_rim_n', 'wall', [ox - 2.5, 12.2, oz - 2.92], 6.0, 1.9, 0.22);
    physMgr.registerBoxCollider('apt_pool_rim_w', 'wall', [ox - 5.42, 12.2, oz], 0.22, 1.9, 6.0);
    physMgr.registerBoxCollider('apt_pool_rim_e', 'wall', [ox + 0.42, 12.2, oz], 0.22, 1.9, 6.0);
    physMgr.registerBoxCollider('apt_pool_rim_s_l', 'wall', [ox - 3.65, 12.2, oz + 2.92], 3.7, 1.9, 0.22);
    physMgr.registerBoxCollider('apt_pool_rim_s_r', 'wall', [ox - 0.15, 12.2, oz + 2.92], 1.15, 1.9, 0.22);

    physMgr.registerBoxCollider('apt_roof_glass_rail_n', 'wall', [ox, 13.48, oz + 6.85], 16.0, 1.05, 0.12);
    physMgr.registerBoxCollider('apt_roof_glass_rail_s', 'wall', [ox, 13.48, oz - 6.85], 16.0, 1.05, 0.12);
    physMgr.registerBoxCollider('apt_roof_glass_rail_w', 'wall', [ox - 7.85, 13.48, oz], 0.12, 1.05, 13.7);
    physMgr.registerBoxCollider('apt_roof_glass_rail_e', 'wall', [ox + 7.85, 13.48, oz], 0.12, 1.05, 13.7);
    for (let i=0;i<4;i++) physMgr.registerBoxCollider(`apt_roof_pool_step_${i}`, 'prop', [ox - 1.3, 11.78+i*0.28, oz + 2.25-i*0.58], 1.35, 0.16, 0.62);
    for (const z of [-5.2, 5.2]) physMgr.registerBoxCollider(`apt_roof_bench_${z}`, 'prop', [ox + 1.2, 13.25, oz + z], 2.2, 0.22, 0.65);
    for (const x of [-0.2, 1.8]) for (const z of [-2.4, 2.4]) physMgr.registerBoxCollider(`apt_roof_pergola_post_${x}_${z}`, 'prop', [ox + x, 14.15, oz + z], 0.16, 2.4, 0.16);
    for (let i = 0; i < 5; i++) physMgr.registerBoxCollider(`apt_roof_pergola_beam_${i}`, 'prop', [ox + 0.8, 15.35, oz - 2.4 + i * 1.2], 3.6, 0.12, 0.14);
    for (let i = 0; i < 3; i++) physMgr.registerBoxCollider(`apt_roof_solar_panel_${i}`, 'prop', [ox - 5.7 + i * 1.7, 13.35, oz - 4.5], 1.8, 0.08, 1.15);
    for (const z of [-3.7, 3.7]) physMgr.registerBoxCollider(`apt_roof_planter_${z}`, 'prop', [ox - 6.55, 13.22, oz + z], 1.2, 0.55, 1.0);
    // Rooftop loungers placed safely away from stair landing opening (X in [3.5, 8.0], Z in [-5.5, 2.5])
    physMgr.registerBoxCollider('apt_roof_lounger_ne', 'prop', [ox + 5.6, 13.14, oz + 5.0], 0.78, 0.22, 1.8);
    physMgr.registerBoxCollider('apt_roof_lounger_w', 'prop', [ox - 5.8, 13.14, oz], 1.8, 0.22, 0.78);

    // Four-bay garage shutter collision (Building 3 at local -48, -32); one command controls the four coordinated bay panels.
    physMgr.registerBoxCollider('apt_garage_shutter', 'wall', [ox - 48, 1.65, oz - 39.08], 20, 3.3, 0.18, 0, this.garageShutterOpen);

    // Expanded five-times-area compound: 100 x 126.5 m (12,650 m2), 6 m walls and exactly five gates.
    // Local bounds: X in [-82, +18], Z in [-75.5, +51.0] (World X: [-108, -8], Z: [-37.5, +89.0]).
    const perimeterWalls: Array<[string, number, number, number, number]> = [
      ['rebirth_west_south', -82, -38.25, 0.9, 74.5], ['rebirth_west_north', -82, 26.0, 0.9, 50.0],
      ['rebirth_east_south', 18, -50.25, 0.9, 50.5], ['rebirth_east_north', 18, 14.0, 0.9, 74.0],
      ['rebirth_north_west', -55.0, 51.0, 54.0, 0.9], ['rebirth_north_east', -1.0, 51.0, 38.0, 0.9],
      ['rebirth_south_west', -67.0, -75.5, 30.0, 0.9], ['rebirth_south_middle', -25.0, -75.5, 38.0, 0.9],
      ['rebirth_south_east', 12.0, -75.5, 12.0, 0.9],
    ];
    for (const [id, x, z, w, d] of perimeterWalls) physMgr.registerBoxCollider(`apt_${id}`, 'wall', [ox + x, 3.0, oz + z], w, 6, d);
    const westTowerZ = [-69, -56, -43, -30, -17, -6, 6, 20, 34, 46];
    const eastTowerZ = [-69, -56, -43, -30, -18, -6, 6, 20, 34, 46];
    westTowerZ.forEach((z, i) => physMgr.registerBoxCollider(`rebirth_tower_left_${i + 1}`, 'wall', [ox - 82, 4.55, oz + z], 2.15, 8, 2.15));
    eastTowerZ.forEach((z, i) => physMgr.registerBoxCollider(`rebirth_tower_right_${i + 1}`, 'wall', [ox + 18, 4.55, oz + z], 2.15, 8, 2.15));
    physMgr.registerBoxCollider('apt_compound_gate', 'wall', [ox, 2.4, oz - 75.5], 12, 4.8, 0.3, 0, this.compoundGateOpen);
    physMgr.registerBoxCollider('apt_compound_door_left', 'wall', [ox - 82, 1.7, oz], 2, 3.4, 0.2, Math.PI / 2, this.compoundPedestrianDoorsOpen[0]);
    physMgr.registerBoxCollider('apt_compound_door_right', 'wall', [ox + 18, 1.7, oz - 24], 2, 3.4, 0.2, -Math.PI / 2, this.compoundPedestrianDoorsOpen[1]);
    physMgr.registerBoxCollider('apt_vehicle_gate', 'wall', [ox - 48, 2.4, oz - 75.5], 8, 4.8, 0.3, 0, this.vehicleGateOpen);
    physMgr.registerBoxCollider('apt_vehicle_gate_2', 'wall', [ox - 24, 2.4, oz + 51.0], 8, 4.8, 0.3, 0, this.vehicleGate2Open);
    // Explorable Mansion West & East Wings (perimeter-only walls with open South glass doors)
    for (const side of [-1, 1] as const) {
      const tag = side < 0 ? 'west' : 'east';
      const wx = ox + side * 11.5;
      physMgr.registerBoxCollider(`rebirth_wing_${tag}_outer`, 'wall', [ox + side * 14.92, 6.5, oz], 0.36, 13.0, 24.0);
      physMgr.registerBoxCollider(`rebirth_wing_${tag}_north`, 'wall', [wx, 6.5, oz + 11.86], 7.0, 13.0, 0.3);
      physMgr.registerBoxCollider(`rebirth_wing_${tag}_south_l`, 'wall', [wx - 2.35, 6.5, oz - 11.86], 2.1, 13.0, 0.3);
      physMgr.registerBoxCollider(`rebirth_wing_${tag}_south_r`, 'wall', [wx + 2.35, 6.5, oz - 11.86], 2.1, 13.0, 0.3);
      physMgr.registerBoxCollider(`rebirth_wing_${tag}_south_upper`, 'wall', [wx, 8.0, oz - 11.86], 2.6, 9.6, 0.3);
    }

    // Building 2: 8-storey Neo-Tactical Railway Command Centre at local (-48, 0, 24)
    physMgr.registerBoxCollider('rebirth_command_west_wall', 'wall', [ox - 58.92, 14.2, oz + 24], 0.36, 28.4, 18);
    physMgr.registerBoxCollider('rebirth_command_east_wall', 'wall', [ox - 37.08, 14.2, oz + 24], 0.36, 28.4, 18);
    physMgr.registerBoxCollider('rebirth_command_north_wall', 'wall', [ox - 48, 14.2, oz + 32.82], 22, 28.4, 0.36);
    physMgr.registerBoxCollider('rebirth_command_south_wall_left', 'wall', [ox - 54.6, 14.2, oz + 15.18], 8.8, 28.4, 0.36);
    physMgr.registerBoxCollider('rebirth_command_south_wall_right', 'wall', [ox - 41.4, 14.2, oz + 15.18], 8.8, 28.4, 0.36);
    for (let f = 1; f < 8; f++) {
      physMgr.registerBoxCollider(`rebirth_command_south_upper_${f}`, 'wall', [ox - 48, 0.65 + f * 3.45 + 1.72, oz + 15.18], 22, 3.28, 0.36);
    }
    for (let f = 0; f < 8; f++) {
      const fy = 0.65 + f * 3.45;
      if (f === 0) {
        physMgr.registerBoxCollider('rebirth_command_f1_desk', 'prop', [ox - 48.8, fy + 0.58, oz + 26.25], 3.4, 0.95, 0.95);
      } else if (f <= 2) {
        for (const dx of [-4.0, -0.8, 2.4]) {
          if (f === 2 && dx > 0) continue;
          physMgr.registerBoxCollider(`rebirth_command_desk_${f}_${dx}`, 'prop', [ox - 48 + dx, fy + 0.52, oz + 26.25], 2.35, 0.85, 0.9);
        }
      } else if (f <= 5) {
        physMgr.registerBoxCollider(`rebirth_command_desk_${f}`, 'prop', [ox - 48.8, fy + 0.52, oz + 26.25], 2.8, 0.85, 0.95);
      } else if (f === 6) {
        physMgr.registerBoxCollider('rebirth_command_holo_table', 'prop', [ox - 50.0, fy + 0.54, oz + 25.5], 4.2, 0.88, 2.0);
      } else {
        physMgr.registerBoxCollider('rebirth_command_exec_desk', 'prop', [ox - 50.0, fy + 0.54, oz + 25.5], 3.4, 0.88, 1.1);
      }
    }

    // Building 3: 3-level Neo-Tactical Vertical Security Garage at local (-48, 0, -32)
    physMgr.registerBoxCollider('rebirth_garage_back_wall', 'wall', [ox - 48, 4.55, oz - 25.18], 20, 9.0, 0.35);
    physMgr.registerBoxCollider('rebirth_garage_west_wall', 'wall', [ox - 57.82, 4.55, oz - 32], 0.35, 9.0, 14);
    physMgr.registerBoxCollider('rebirth_garage_east_wall', 'wall', [ox - 38.18, 4.55, oz - 32], 0.35, 9.0, 14);
    physMgr.registerBoxCollider('rebirth_garage_front_upper', 'wall', [ox - 48, 6.75, oz - 38.82], 20, 4.4, 0.35);
    for (const [i, x] of [-9.7, -4.9, 0, 4.9, 9.7].entries()) {
      physMgr.registerBoxCollider(`rebirth_garage_front_pier_${i}`, 'wall', [ox - 48 + x, 1.85, oz - 38.82], x === -9.7 || x === 9.7 ? 0.6 : 0.8, 3.3, 0.35);
    }
    physMgr.registerBoxCollider('rebirth_garage_workshop', 'prop', [ox - 40.8, 1.2, oz - 27.0], 5.0, 2.2, 3.2);
    physMgr.registerBoxCollider('rebirth_garage_l2_bench', 'prop', [ox - 43.8, 5.1, oz - 35.2], 3.6, 0.92, 1.1);
    physMgr.registerBoxCollider('rebirth_garage_l2_rack', 'prop', [ox - 55.6, 5.8, oz - 34.5], 1.1, 2.3, 3.2);

    // 3. Solid interior furniture and bathroom suite on Floor 1.
    physMgr.registerBoxCollider('apt_bed', 'prop', [ox - 5.5, 0.45, oz + 3.8], 2.4, 0.9, 2.8);
    physMgr.registerBoxCollider('apt_nightstand', 'prop', [ox - 7.2, 0.45, oz + 4.8], 0.75, 0.7, 0.75);
    physMgr.registerBoxCollider('apt_wardrobe', 'prop', [ox - 7.2, 1.15, oz + 1.4], 0.9, 2.3, 1.65);
    physMgr.registerBoxCollider('apt_computer_desk', 'prop', [ox - 3.5, 0.55, oz + 0.6], 1.65, 0.9, 0.9);
    physMgr.registerBoxCollider('apt_computer_chair', 'prop', [ox - 3.5, 0.45, oz + 0.18], 0.55, 0.8, 0.55);
    physMgr.registerBoxCollider('apt_sofa', 'prop', [ox, 0.55, oz + 0.5], 2.8, 0.85, 1.2);
    physMgr.registerBoxCollider('apt_coffee_table', 'prop', [ox, 0.35, oz - 1.2], 1.85, 0.5, 0.95);
    physMgr.registerBoxCollider('apt_tvstand', 'prop', [ox - 5.5, 0.45, oz], 2.4, 0.65, 0.6);
    physMgr.registerBoxCollider('apt_dining_table', 'prop', [ox + 2.2, 0.55, oz + 1.2], 1.85, 0.85, 1.25);
    physMgr.registerBoxCollider('apt_dining_chair_0', 'prop', [ox + 1.6, 0.45, oz + 0.45], 0.46, 0.85, 0.46);
    physMgr.registerBoxCollider('apt_dining_chair_1', 'prop', [ox + 2.8, 0.45, oz + 0.45], 0.46, 0.85, 0.46);
    physMgr.registerBoxCollider('apt_dining_chair_2', 'prop', [ox + 1.6, 0.45, oz + 1.95], 0.46, 0.85, 0.46);
    physMgr.registerBoxCollider('apt_dining_chair_3', 'prop', [ox + 2.8, 0.45, oz + 1.95], 0.46, 0.85, 0.46);
    physMgr.registerBoxCollider('apt_kitchen', 'prop', [ox + 5.8, 0.55, oz + 3.2], 3.6, 0.9, 1.1);
    physMgr.registerBoxCollider('apt_kitchen_stove', 'prop', [ox + 5.8, 0.55, oz + 4.6], 1.15, 0.95, 1.15);
    physMgr.registerBoxCollider('apt_fridge', 'prop', [ox + 4.5, 1.2, oz + 5.8], 1.25, 2.2, 1.05);
    physMgr.registerBoxCollider('apt_f1_medical_bed', 'prop', [ox + 3.6, 0.45, oz - 5.2], 2.25, 0.85, 1.15);
    physMgr.registerBoxCollider('apt_f1_security_desk', 'prop', [ox + 2.38, 0.55, oz - 0.5], 1.0, 0.9, 3.4);

    // Bathroom Enclosing Walls and Solid Fixtures
    physMgr.registerBoxCollider('apt_bath_wall_n', 'wall', [ox - 5.45, 1.55, oz - 3.2], 3.9, 2.8, 0.22);
    physMgr.registerBoxCollider('apt_bath_wall_e', 'wall', [ox - 3.5, 1.55, oz - 5.7], 0.22, 2.8, 1.85);
    physMgr.registerBoxCollider('apt_bath_door', 'wall', [ox - 3.5, 1.35, oz - 4.1], 0.22, 2.3, 0.95, 0, this.bathroomDoorOpen);
    physMgr.registerBoxCollider('apt_bath_vanity', 'prop', [ox - 4.5, 0.6, oz - 3.55], 1.25, 0.9, 0.7);
    physMgr.registerBoxCollider('apt_bath_toilet', 'prop', [ox - 4.4, 0.55, oz - 6.0], 0.7, 1.1, 0.8);
    physMgr.registerBoxCollider('apt_bath_tub', 'prop', [ox - 6.5, 0.55, oz - 5.7], 1.25, 0.75, 1.85);
    physMgr.registerBoxCollider('apt_bath_shower_tray', 'prop', [ox - 6.75, 0.22, oz - 3.95], 1.35, 0.25, 1.35);
    physMgr.registerBoxCollider('apt_bath_shower_glass', 'wall', [ox - 6.1, 1.35, oz - 3.95], 0.08, 2.3, 1.35);

    // Floor 2 medical centre: beds, treatment stations, cabinets and equipment
    // are solid props, while the small monitor screens remain visual surfaces.
    const medicalY = 3.2;
    physMgr.registerBoxCollider('apt_medical_reception', 'prop', [ox + 2.6, medicalY + 0.62, oz - 4.8], 3.4, 1.05, 0.9);
    for (let i = 0; i < 4; i++) {
      const x = -5.7 + (i % 2) * 3.0;
      const z = -3.5 + Math.floor(i / 2) * 5.0;
      physMgr.registerBoxCollider(`apt_medical_patient_bed_${i}`, 'prop', [ox + x, medicalY + 0.65, oz + z], 2.15, 0.72, 1.0);
      physMgr.registerCylinderCollider(`apt_medical_oxygen_${i}`, 'prop', [ox + x + 1.25, medicalY + 0.225, oz + z + 0.55], 0.2, 1.05);
    }
    for (let i = 0; i < 3; i++) {
      const z = [-5.8, 4.2, 5.8][i];
      physMgr.registerBoxCollider(`apt_medical_exam_table_${i}`, 'prop', [ox + 5.6, medicalY + 0.55, oz + z], 1.8, 0.82, 0.85);
      physMgr.registerBoxCollider(`apt_medical_exam_cabinet_${i}`, 'prop', [ox + 7.0, medicalY + 0.9, oz + z], 0.8, 1.6, 0.65);
    }
    for (let i = 0; i < 5; i++) {
      physMgr.registerBoxCollider(`apt_medical_supply_cabinet_${i}`, 'prop', [ox - 5.8 + i * 2.6, medicalY + 1.15, oz + 6.0], 1.05, 2.0, 0.55);
    }
    physMgr.registerBoxCollider('apt_medical_operating_table', 'prop', [ox + 5.5, medicalY + 0.72, oz + 2.0], 2.0, 0.55, 1.0);
    physMgr.registerBoxCollider('apt_medical_diagnostic_machine', 'prop', [ox + 2.2, medicalY + 0.95, oz - 1.0], 1.0, 1.35, 0.8);
    physMgr.registerBoxCollider('apt_medical_emergency_box', 'prop', [ox, medicalY + 0.55, oz - 5.4], 1.5, 0.8, 0.7);

    // Floor 3 armory: lockers, ammunition crates, equipment cabinets, vault and
    // master terminal physically block movement rather than behaving as decals.
    const armoryY = 6.4;
    let lockerIndex = 0;
    for (let z = -4.5; z <= 4.5; z += 2.2) {
      physMgr.registerBoxCollider(`apt_armory_locker_${lockerIndex++}`, 'prop', [ox - 6.5, armoryY + 1.35, oz + z], 1.2, 2.4, 1.8);
    }
    let ammoIndex = 0;
    for (let x = -4.5; x <= 2.5; x += 2.4) {
      physMgr.registerBoxCollider(`apt_armory_ammo_crate_${ammoIndex++}`, 'prop', [ox + x, armoryY + 0.6, oz + 5.8], 1.6, 0.9, 1.1);
    }
    for (let i = 0; i < 4; i++) {
      physMgr.registerBoxCollider(`apt_armory_equipment_cabinet_${i}`, 'prop', [ox + 1.0 + i * 1.45, armoryY + 1.3, oz - 5.8], 1.0, 2.35, 0.85);
    }
    physMgr.registerBoxCollider('apt_armory_secure_vault', 'prop', [ox - 3.8, armoryY + 1.45, oz - 5.7], 2.0, 2.65, 1.1);
    physMgr.registerCylinderCollider('apt_armory_master_terminal', 'prop', [ox + 2.0, armoryY + 0.10, oz], 0.62, 1.1);

    // Basement operations room: server racks, command desk and emergency crates.
    physMgr.registerBoxCollider('apt_basement_command_desk', 'prop', [ox, -2.55, oz + 0.8], 4.5, 0.85, 1.4);
    for (let i = 0; i < 4; i++) {
      physMgr.registerBoxCollider(`apt_basement_server_rack_${i}`, 'prop', [ox - 5.8 + i * 2.0, -1.75, oz + 5.6], 1.25, 2.25, 0.8);
    }
    for (let i = 0; i < 4; i++) {
      physMgr.registerBoxCollider(`apt_basement_emergency_crate_${i}`, 'prop', [ox + 5.4, -2.55, oz - 4.5 + i * 1.7], 1.0, 0.9, 0.9);
    }

    // Floor 4: every large farm/utility installation is a real blocking prop.
    // These world-space colliders match the visible tank, plant, generator and storage meshes.
    const farmY = 9.6;
    const farmBedXs = [-5.7, -3.5, -1.3];
    const farmBedZs = [-4.7, -2.6, -0.5];
    for (let r = 0; r < farmBedZs.length; r++) {
      for (let c = 0; c < farmBedXs.length; c++) {
        physMgr.registerBoxCollider(
          `apt_farm_crop_bed_${r}_${c}`, 'prop',
          [ox + farmBedXs[c], farmY + 0.48, oz + farmBedZs[r]], 1.8, 0.84, 1.55
        );
      }
    }
    physMgr.registerCylinderCollider('apt_raw_water_tank_large', 'prop', [ox + 5.25, farmY + 1.56, oz - 5.65], 1.08, 2.75);
    physMgr.registerCylinderCollider('apt_treated_water_tank_large', 'prop', [ox + 5.25, farmY + 1.56, oz + 5.55], 1.08, 2.75);
    // The visible plant is on the west side; the previous collider sat in the east stairwell.
    physMgr.registerBoxCollider('apt_large_water_treatment_plant', 'prop', [ox - 4.35, farmY + 1.2, oz + 1.95], 4.9, 2.4, 2.45);
    physMgr.registerBoxCollider('apt_large_backup_generator', 'prop', [ox + 1.28, farmY + 1.05, oz + 5.05], 4.0, 1.96, 2.15);
    physMgr.registerCylinderCollider('apt_generator_fuel_reservoir', 'prop', [ox + 5.65, farmY + 0.145, oz + 5.05], 0.76, 1.95);
    physMgr.registerBoxCollider('apt_farm_electrical_cabinet', 'prop', [ox + 7.05, farmY + 1.18, oz + 3.35], 1.1, 2.05, 0.62);
    for (let i = 0; i < 3; i++) {
      physMgr.registerBoxCollider(`apt_farm_supply_crate_${i}`, 'prop', [ox - 1.0 + i * 1.1, farmY + 0.58, oz + 5.35], 0.95, 0.9, 0.9);
    }
  }

  public dispose() {
    this.turrets?.dispose();
    this.basementRoom?.dispose();
    this.commandScreens?.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material.dispose();
      }
    });
    this.floorLights = [];
  }
}
