import * as THREE from 'three';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { soundEngine } from '../../utils/audio';
import { ApartmentTurrets } from './ApartmentTurrets';
import type { HostileFactionTurretTarget, TurretSaveRecord } from './ApartmentTurrets';
import type { CompoundSecuritySaveData } from '../../types/game';
import { BasementControlRoom } from './BasementControlRoom';
import { NexusCoordinator, type NexusInteractionResult } from '../nexus/NexusCoordinator';
import { registerNexusStructure2Colliders } from '../nexus/NexusColliders';
import type { NexusLiveContext, NexusSaveState } from '../nexus/NexusSystems';
import type { NexusElevatorId, NexusFloorNumber } from '../nexus/NexusConfig';
import { getTerrainHeight } from '../Terrain';
import { ZombieManager } from '../ZombieManager';
import { WildlifeManager } from '../WildlifeManager';
import { ApartmentObjectBinding } from './ApartmentObjectBinding';
import { ApartmentObjectAnimator, type ApartmentInteractableOptions, type ApartmentObjectAction } from './ApartmentObjectAnimator';
import { AurelionCoordinator, type AurelionInteractionResult } from '../aurelion/AurelionCoordinator';
import {
  AURELION_F6_INDOOR_POOL,
  AURELION_LEVEL_ORDER,
  AURELION_LEVELS,
  AURELION_ROOFTOP_INFINITY_POOL,
  AURELION_STAIR_VOID,
  AurelionLevelId,
  getLevelForLocalY,
} from '../aurelion/AurelionConfig';
import { registerAurelionStructure1Colliders } from '../aurelion/AurelionColliders';
import type { AurelionDashboardSnapshot, AurelionSaveState, ElevatorId } from '../aurelion/AurelionSystems';
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
  public nexus!: NexusCoordinator;
  public aurelion!: AurelionCoordinator;
  private currentGameTimeMinutes = 480;
  private currentWeatherType = 'clear';

  // Floor groups for camera-aware cutaways & object bindings
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
  private floorLights: THREE.PointLight[] = [];
  public compoundGateOpen = false;
  public vehicleGateOpen = false;
  public vehicleGateGroup!: THREE.Group;
  public vehicleGate2Open = false;
  private vehicleGate2Group!: THREE.Group;
  public garageShutterOpen = true;
  private garageShutterGroup!: THREE.Group;
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
    minX: -26 + AURELION_ROOFTOP_INFINITY_POOL.localMinX,
    maxX: -26 + AURELION_ROOFTOP_INFINITY_POOL.localMaxX,
    minY: AURELION_ROOFTOP_INFINITY_POOL.basinBottomY,
    maxY: AURELION_ROOFTOP_INFINITY_POOL.deckY + 1.2,
    minZ: 38 + AURELION_ROOFTOP_INFINITY_POOL.localMinZ,
    maxZ: 38 + AURELION_ROOFTOP_INFINITY_POOL.localMaxZ,
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
    const darkStonePBR = getStonePBR();
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

    // Instantiate THE AURELION (9-level Mega Estate: B2, B1, F1-F7) strictly inside Structure 1 bounds
    this.aurelion = new AurelionCoordinator(
      this.group,
      {
        tvScreenMat: this.tvScreenMat,
        securityScreenTex: this.securityScreenTexture,
        wallClockTex: this.wallClockTexture,
        computerScreenTex: this.computerScreenTexture,
      },
      this.state.doorOpen,
      this.patioDoorOpen
    );
    this.aurelion.rootGroup.name = 'building_1_player_mansion_attached_wings';
    this.aurelion.rootGroup.userData = {
      buildingNumber: 1,
      estateName: 'THE AURELION',
      style: 'Ultra-Luxury Private Billionaire Mega Estate',
      basements: 2,
      aboveGroundFloors: 7,
      totalLevels: 9,
      elevators: 3,
      targetFootprint: [30, 24],
    };

    // Map public floor/cutaway/interactive handles onto THE AURELION meshes
    this.floor1Group = this.aurelion.lower.f1Group;
    this.floor2Group = this.aurelion.lower.f2Group;
    this.floor3Group = this.aurelion.upper.f3Group;
    this.floor4Group = this.aurelion.upper.f4Group;
    this.floor5Group = this.aurelion.crown.f7Group;
    this.basementGroup = this.aurelion.basements.b1RingGroup;
    this.exteriorWalls =
      (this.aurelion.rootGroup.getObjectByName('the_aurelion_monumental_exterior') as THREE.Group) ||
      new THREE.Group();
    this.staircaseGroup =
      (this.aurelion.rootGroup.getObjectByName('aurelion_continuous_nine_level_staircase') as THREE.Group) ||
      new THREE.Group();

    this.southWallMesh = this.aurelion.arch.southWallMesh;
    this.northWallMesh = this.aurelion.arch.northWallMesh;
    this.eastWallMesh = this.aurelion.arch.eastWallMesh;
    this.westWallMesh = this.aurelion.arch.westWallMesh;
    this.frontDoorLeftLeaf = this.aurelion.arch.frontDoorLeftLeaf;
    this.frontDoorRightLeaf = this.aurelion.arch.frontDoorRightLeaf;
    this.patioDoorLeftLeaf = this.aurelion.arch.patioDoorLeftLeaf;
    this.patioDoorRightLeaf = this.aurelion.arch.patioDoorRightLeaf;

    this.poolWaterMesh = this.aurelion.crown.f7PoolWaterMesh;
    this.fanBlades = this.aurelion.lower.fanBlades;
    this.acLedMat = this.aurelion.lower.acLedMat;
    this.tvMesh = this.aurelion.lower.tvScreenMesh;
    this.securityScreenMesh = this.aurelion.lower.securityScreenMesh;
    this.computerScreenMesh = this.aurelion.lower.computerScreenMesh;

    this.bathroomDoorGroup = this.aurelion.lower.bathroomDoorGroup;
    this.bathroomLight = this.aurelion.lower.bathroomLight;
    this.bathroomTapMesh = this.aurelion.lower.bathroomTapMesh;
    this.bathroomTapWaterMesh = this.aurelion.lower.bathroomTapWaterMesh;
    this.bathroomShowerWaterGroup = this.aurelion.lower.bathroomShowerWaterGroup;
    this.bathroomShowerSteamMesh = this.aurelion.lower.bathroomShowerSteamMesh;
    this.bathroomCabinetDoor = this.aurelion.lower.bathroomCabinetDoor;
    this.bathtubWaterMesh = this.aurelion.lower.bathtubWaterMesh;
    this.toiletWaterMesh = this.aurelion.lower.toiletWaterMesh;
    this.kitchenStoveBurners = this.aurelion.lower.kitchenStoveBurners;
    this.kitchenTapWaterMesh = this.aurelion.lower.kitchenTapWaterMesh;
    this.wardrobeLeftDoor = this.aurelion.lower.wardrobeLeftDoor;
    this.wardrobeRightDoor = this.aurelion.lower.wardrobeRightDoor;
    this.bedsideLampLight = this.aurelion.lower.bedsideLampLight;

    this.buildEnclosedProperty();
    this.buildIndependentCompoundBuildings();

    // Keep the existing security and basement operations systems connected to THE AURELION.
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

    // Building 1 is constructed by THE AURELION coordinator above. Building 2 & Building 3 remain preserved below.

    // =========================================================================
    // BUILDING 2: THE NEXUS — 8-FLOOR GRAND RAILWAY INTELLIGENCE HEADQUARTERS
    // Positioned cleanly in NW quadrant at local (-48, 0, +24) -> World (-74, 0, +62)
    // =========================================================================
    this.nexus = new NexusCoordinator(campus);

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
  public setEnvironmentState(gameTimeMinutes: number, weatherType: string): void {
    this.currentGameTimeMinutes = gameTimeMinutes;
    this.currentWeatherType = weatherType;
  }

  public getAurelionSnapshot(): AurelionDashboardSnapshot | null {
    if (!this.aurelion) return null;
    const telemetry = this.turrets?.getTurretsTelemetry() || [];
    const turretsOnline = telemetry.filter((t) => t.health > 0).length;
    const turretKills = telemetry.reduce((sum, t) => sum + t.killsCount, 0);
    const gatesOpenCount =
      (this.compoundGateOpen ? 1 : 0) +
      (this.compoundPedestrianDoorsOpen[0] ? 1 : 0) +
      (this.compoundPedestrianDoorsOpen[1] ? 1 : 0) +
      (this.vehicleGateOpen ? 1 : 0) +
      (this.vehicleGate2Open ? 1 : 0);
    return this.aurelion.systems.getSnapshot({
      turretsOnline,
      turretKills,
      gatesOpenCount,
      doorsSecured: !this.state.doorOpen && !this.patioDoorOpen,
    });
  }

  public exportAurelionState(): AurelionSaveState | undefined {
    return this.aurelion?.systems.exportState();
  }

  public restoreAurelionState(saved?: AurelionSaveState | null): void {
    this.aurelion?.systems.restoreState(saved);
  }

  public exportNexusState(): NexusSaveState | undefined {
    return this.nexus?.systems.exportState();
  }

  public restoreNexusState(saved?: NexusSaveState | null): void {
    this.nexus?.systems.restoreState(saved);
    if (this.nexus) {
      UnifiedPhysicsManager.getInstance()?.setDoorOpenState(
        'nexus_f1_restricted_gate',
        this.nexus.systems.restrictedRoomsUnlocked
      );
    }
  }

  public getLocationSummary(playerPos: THREE.Vector3): { level: string; roomName: string } | null {
    const rel = new THREE.Vector3(
      playerPos.x - this.origin.x,
      playerPos.y - this.origin.y,
      playerPos.z - this.origin.z
    );
    const nexusRel = new THREE.Vector3(rel.x + 48, rel.y, rel.z - 24);
    const nexusLoc = this.nexus?.getLocationSummary(nexusRel);
    if (nexusLoc) {
      return { level: nexusLoc.level, roomName: nexusLoc.roomName };
    }
    if (!this.aurelion) return null;
    return this.aurelion.getLocationSummary(rel);
  }

  public nexusLiveProvider?: () => NexusLiveContext;

  private readonly _tmpPlayerRelNexus = new THREE.Vector3();
  private readonly _tmpCamRelNexus = new THREE.Vector3();
  private readonly _tmpPlayerRelAur = new THREE.Vector3();
  private readonly _tmpCamRelAur = new THREE.Vector3();

  public update(
    delta: number,
    playerPos: THREE.Vector3 = this.origin,
    cameraPos: THREE.Vector3 = this.origin,
    zombieMgr?: ZombieManager | null,
    wildlifeMgr?: WildlifeManager | null,
    aiTrainMgr?: any,
    nexusLiveCtx?: NexusLiveContext
  ) {
    this.objectAnimator.update(delta);
    for (const binding of this.apartmentObjectBindings.values()) binding.sync();
    this.turrets?.update(delta, zombieMgr || null, wildlifeMgr || null, playerPos);
    this.basementRoom?.update(delta, aiTrainMgr || null, playerPos);
    if (this.nexus) {
      const playerRelNexus = this._tmpPlayerRelNexus.set(
        playerPos.x - this.origin.x + 48,
        playerPos.y - this.origin.y,
        playerPos.z - this.origin.z - 24
      );
      const camRelNexus = this._tmpCamRelNexus.set(
        cameraPos.x - this.origin.x + 48,
        cameraPos.y - this.origin.y,
        cameraPos.z - this.origin.z - 24
      );
      const resolvedCtx = nexusLiveCtx || this.nexusLiveProvider?.();
      const fallbackLive: NexusLiveContext = resolvedCtx || {
        gameTimeMinutes: this.currentGameTimeMinutes,
        dayCount: 1,
        isNight: false,
        isDusk: false,
        trains: aiTrainMgr?.getDispatchTelemetry?.() || [],
        stationSnapshot: aiTrainMgr?.getStationOperationsSnapshot?.() || null,
        compound: {
          mainGateOpen: this.compoundGateOpen,
          westPedOpen: this.compoundPedestrianDoorsOpen[0],
          eastPedOpen: this.compoundPedestrianDoorsOpen[1],
          vehicleGate1Open: this.vehicleGateOpen,
          vehicleGate2Open: this.vehicleGate2Open,
          garageShutterOpen: this.garageShutterOpen,
          turrets: this.turrets?.getTurretsTelemetry() || [],
          aurelionSnapshot: this.getAurelionSnapshot(),
          vehicles: [],
        },
        player: {
          position: [playerPos.x, playerPos.y, playerPos.z],
          yaw: 0,
          health: 100,
          maxHealth: 100,
          infection: 0,
          radiation: 0,
        },
        npcs: [],
        outbreak: {
          isLocalOutbreakActive: false,
          globalMetrics: {
            apocalypticSeverity: 0,
            powerGridStability: 1,
            totalHealthy: 0,
            totalTransforming: 0,
            totalInfected: 0,
            totalEvacuated: 0,
            overrunCitiesCount: 0,
            activeLocalPedestrians: 0,
          },
          cities: [],
          activeZombies: [],
          wildlifeCount: wildlifeMgr?.creatures?.length ?? 0,
          territorialWildlifeCount: 0,
          weather: {
            weather: (this.currentWeatherType as any) || 'clear',
            intensity: 0,
            visibilityPercent: 100,
            temperatureDelta: 0,
            fogDensityMultiplier: 1,
            rainCatchmentBonus: 0,
            isHazardousToxic: false,
            lightningFlash: 0,
            overcast: 0,
            windStrength: 0,
            rainIntensity: 0,
          },
          supplyDrop: null,
          extraction: { active: false, beaconUid: null, remainingSeconds: 0, totalSeconds: 90, completed: false },
          discoveredChunksCount: 0,
          exploredBounds: null,
          baseAlarmArmed: false,
          baseResearchUnlockedCount: 0,
          baseResearchTotalCount: 0,
          baseLevel: 2,
        },
      };
      this.nexus.update(delta, playerRelNexus, camRelNexus, fallbackLive, { x: this.origin.x, z: this.origin.z }, (unlocked) => {
        UnifiedPhysicsManager.getInstance()?.setDoorOpenState('nexus_f1_restricted_gate', unlocked);
      });
    }

    // 1. Ceiling Fan Rotation
    if (this.state.fanOn && this.fanBlades) {
      this.fanBlades.rotation.y += this.state.fanSpeed * delta;
    }

    // 2. Dynamic House & Bathroom Animations
    if (this.bathroomDoorGroup) {
      const targetAngle = this.bathroomDoorOpen ? -Math.PI / 2 : 0;
      this.bathroomDoorGroup.rotation.y = THREE.MathUtils.damp(this.bathroomDoorGroup.rotation.y, targetAngle, 8, delta);
    }

    if (this.wardrobeLeftDoor && this.wardrobeRightDoor) {
      const targetL = this.wardrobeOpen ? -1.5 : 0;
      const targetR = this.wardrobeOpen ? 1.5 : 0;
      this.wardrobeLeftDoor.rotation.y = THREE.MathUtils.damp(this.wardrobeLeftDoor.rotation.y, targetL, 8, delta);
      this.wardrobeRightDoor.rotation.y = THREE.MathUtils.damp(this.wardrobeRightDoor.rotation.y, targetR, 8, delta);
    }

    if (this.bathroomCabinetDoor) {
      const targetC = this.bathroomCabinetOpen ? -1.4 : 0;
      this.bathroomCabinetDoor.rotation.y = THREE.MathUtils.damp(this.bathroomCabinetDoor.rotation.y, targetC, 8, delta);
    }

    if (this.bathroomShowerRunning && this.bathroomShowerWaterGroup) {
      this.bathroomShowerWaterGroup.children.forEach((drop, idx) => {
        drop.position.y = -0.95 + Math.sin(performance.now() * 0.02 + idx) * 0.15;
      });
      if (this.bathroomShowerSteamMesh) {
        const mat = this.bathroomShowerSteamMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.25 + Math.sin(performance.now() * 0.003) * 0.08;
      }
    }

    if (this.bathtubWaterMesh) {
      this.bathtubWaterMesh.position.y = 0.72 + Math.sin(performance.now() * 0.0025) * 0.012;
    }

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

    if (this.kitchenStoveOn && this.kitchenStoveBurners.length > 0) {
      const flicker = 1.0 + Math.sin(performance.now() * 0.01) * 0.25;
      this.kitchenStoveBurners.forEach((burner) => {
        const mat = burner.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = flicker;
      });
    }

    // 3. THE AURELION 9-Level Simulation, Elevators, Hydroponics & Camera-Aware Cutaway
    const playerRelPos = this._tmpPlayerRelAur.set(
      playerPos.x - this.origin.x,
      playerPos.y - this.origin.y,
      playerPos.z - this.origin.z
    );
    const cameraRelPos = this._tmpCamRelAur.set(
      cameraPos.x - this.origin.x,
      cameraPos.y - this.origin.y,
      cameraPos.z - this.origin.z
    );
    this.aurelion.update(delta, playerRelPos, cameraRelPos, this.currentGameTimeMinutes, this.currentWeatherType, {
      tapsActive: (this.bathroomTapRunning ? 1 : 0) + (this.kitchenTapRunning ? 1 : 0),
      showerActive: this.bathroomShowerRunning,
      stoveOn: this.kitchenStoveOn,
      acOn: this.state.acOn,
      basementTvOn: this.basementTvOn,
    });
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
      | 'bedsideLamp'
      | 'aurelionElevator'
      | 'aurelionGenerator'
      | 'aurelionRefuel'
      | 'aurelionWaterPump'
      | 'aurelionWaterPurifier'
      | 'aurelionMaintenance'
      | 'aurelionHydroBed'
      | 'aurelionB2FarmBed'
      | 'aurelionCinema'
      | 'aurelionGym'
      | 'aurelionRefreshment'
      | 'aurelionWeather'
      | 'aurelionDocument'
      | 'nexusElevator'
      | 'nexusFloor1Terminal'
      | 'nexusCompoundRadar'
      | 'nexusOutbreakRadar'
      | 'nexusScreen'
      | 'nexusStaff';
    label: string;
    prompt: string;
    elevatorId?: ElevatorId;
    nexusElevatorId?: NexusElevatorId;
    nexusFloor?: NexusFloorNumber;
    nexusScreenId?: string;
    nexusFloor1Tab?: 'visitor' | 'staff' | 'directory' | 'building' | 'security';
    staffBriefing?: string;
    hydroBedId?: number;
    b2FarmBedId?: number;
    documentId?: string;
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
    // Structure 2: THE NEXUS (8-Floor Intelligence Tower at local -48, +24)
    const nexusHit: NexusInteractionResult | null = this.nexus?.getInteraction(relX + 48, relY, relZ - 24) ?? null;
    if (nexusHit) {
      return {
        id: nexusHit.id,
        label: nexusHit.label,
        prompt: nexusHit.prompt,
        nexusElevatorId: nexusHit.elevatorId,
        nexusFloor: nexusHit.floor,
        nexusScreenId: nexusHit.screenId,
        nexusFloor1Tab: nexusHit.floor1Tab,
        staffBriefing: nexusHit.staffBriefing,
      };
    }
    // Level 2 Vertical Garage Diagnostic Workbench
    if (Math.abs(relX + 43.8) < 3.0 && Math.abs(relZ + 35.2) < 2.4 && relY >= 4.2 && relY <= 7.8) {
      return { id: 'garageDoor', label: 'Vertical Garage Bay & Armor Terminal', prompt: `Press [E] to ${this.garageShutterOpen ? 'Lower' : 'Raise'} All 4 Garage Bay Shutters` };
    }

    // THE AURELION bounds check (Structure 1: 30x24m)
    if (Math.abs(relX) > 15.8 || Math.abs(relZ) > 13.2) return null;

    // Elevators & multi-level Aurelion interactions checked first (so elevator calls work on every served floor including F1)
    const aurHit = this.aurelion?.getInteraction(relX, relY, relZ) as AurelionInteractionResult | null;
    if (aurHit && (aurHit.id === 'aurelionElevator' || relY < -1.8 || relY >= 3.0)) {
      return aurHit as any;
    }

    // --- PRESERVED FLOOR 1 RESIDENTIAL & BATHROOM INTERACTIONS (y ~ 0.245) ---
    if (relY >= -1.8 && relY < 3.4) {
      // Security Command Center Screen at (2.38, -0.5)
      if (Math.hypot(relX - 2.38, relZ - (-0.5)) < 2.8) {
        return {
          id: 'securityCommandCenter',
          label: 'Autonomous Security Command Center',
          prompt: 'Press [E] to Access 5km Security Radar & Command Center',
        };
      }
      if (Math.hypot(relX - (-5.5), relZ - 3.8) < 2.5) {
        return { id: 'bed', label: 'Apartment Bed', prompt: 'Press [E] to Sleep in Bed' };
      }
      if (Math.hypot(relX - (-7.2), relZ - 4.8) < 1.8) {
        return {
          id: 'bedsideLamp',
          label: 'Bedside Night Lamp',
          prompt: `Press [E] to ${this.bedsideLampOn ? 'Turn OFF' : 'Turn ON'} Night Lamp`,
        };
      }
      if (Math.hypot(relX - (-7.2), relZ - 1.4) < 2.2) {
        return {
          id: 'wardrobe',
          label: 'Bedroom Wardrobe',
          prompt: `Press [E] to ${this.wardrobeOpen ? 'Close' : 'Open'} Wardrobe Doors`,
        };
      }
      if (Math.hypot(relX - (-3.5), relZ - 0.6) < 2.0) {
        return { id: 'computer', label: 'Personal Computer', prompt: 'Press [E] to Sit & Use Computer Terminal' };
      }
      if (Math.hypot(relX - (-5.5), relZ - 0.0) < 2.5) {
        return {
          id: 'tv',
          label: 'Smart Television',
          prompt: `Press [E] to Turn ${this.state.tvOn ? 'OFF' : 'ON'} News Television`,
        };
      }
      if (Math.hypot(relX - 0, relZ - 0.5) < 2.2) {
        return { id: 'sofa', label: 'Living Room Sofa', prompt: 'Press [E] to Sit on Living Room Sofa' };
      }
      if (Math.hypot(relX - 0.3, relZ - (-1.2)) < 1.8) {
        return { id: 'phone', label: 'Smartphone', prompt: 'Press [E] to Check In-Game Phone Messages' };
      }
      if (Math.hypot(relX - (-1.2), relZ - (-1.8)) < 2.2) {
        return { id: 'wallClock', label: 'Living Room Wall Clock', prompt: 'Press [E] to Check Wall Clock Time' };
      }
      if (Math.hypot(relX - 2.2, relZ - 1.2) < 2.4) {
        return { id: 'diningChair', label: 'Dining Area', prompt: 'Press [E] to Sit at Dining Table' };
      }
      if (Math.hypot(relX - 5.8, relZ - 4.6) < 2.0) {
        return {
          id: 'kitchenStove',
          label: 'Kitchen Electric Stove',
          prompt: `Press [E] to ${this.kitchenStoveOn ? 'Turn OFF' : 'Ignite'} Stove Burners`,
        };
      }
      if (Math.hypot(relX - 5.8, relZ - 2.5) < 2.0) {
        return { id: 'kitchenSink', label: 'Kitchen Sink', prompt: 'Press [E] to Wash Dishes & Drink Water' };
      }
      if (Math.hypot(relX - 4.5, relZ - 5.8) < 2.2) {
        return { id: 'fridge', label: 'Apartment Refrigerator', prompt: 'Press [E] to Open Refrigerator Food Storage' };
      }
      if (Math.hypot(relX - 3.6, relZ - (-5.2)) < 2.2) {
        return {
          id: 'medicalBed',
          label: 'First-Aid Medical Bed',
          prompt: 'Press [E] to Rest on First-Aid Bed & Heal',
        };
      }
      if (Math.hypot(relX - (-3.5), relZ - (-4.1)) < 2.0) {
        return {
          id: 'bathroomDoor',
          label: 'Bathroom Door',
          prompt: `Press [E] to ${this.bathroomDoorOpen ? 'Close' : 'Open'} Bathroom Door`,
        };
      }
      if (Math.hypot(relX - (-3.6), relZ - (-3.7)) < 1.8) {
        return {
          id: 'bathroomLight',
          label: 'Bathroom Light Switch',
          prompt: `Press [E] to ${this.bathroomLightOn ? 'Turn OFF' : 'Turn ON'} Bathroom Light`,
        };
      }
      if (Math.hypot(relX - (-5.6), relZ - (-3.4)) < 2.0) {
        return {
          id: 'bathroomCabinet',
          label: 'Medicine Cabinet',
          prompt: `Press [E] to ${this.bathroomCabinetOpen ? 'Close' : 'Open'} Medicine Cabinet`,
        };
      }
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
      if (Math.hypot(relX - (-4.5), relZ - (-3.32)) < 2.2) {
        return { id: 'mirrorLook', label: 'Bathroom Mirror', prompt: 'Press [E] to Look in Bathroom Mirror' };
      }
      if (Math.hypot(relX - (-3.6), relZ - (-5.2)) < 1.8) {
        return { id: 'towel', label: 'Bath Towel Rack', prompt: 'Press [E] to Dry Hands with Clean Towel' };
      }
      if (Math.hypot(relX - (-6.75), relZ - (-3.95)) < 2.2) {
        return { id: 'shower', label: 'Shower Stall', prompt: 'Press [E] to Take Refreshing Warm Shower' };
      }
      if (Math.hypot(relX - (-6.5), relZ - (-5.7)) < 2.2) {
        return { id: 'bathtub', label: 'Porcelain Bathtub', prompt: 'Press [E] to Relax in Warm Bathtub' };
      }
      if (Math.hypot(relX - (-4.4), relZ - (-6.0)) < 2.0) {
        return { id: 'toilet', label: 'Ceramic Toilet', prompt: 'Press [E] to Use Toilet & Flush' };
      }
      if (Math.hypot(relX - 0, relZ - 0.5) < 2.2) {
        return {
          id: 'fan',
          label: 'Ceiling Fan',
          prompt: `Press [E] to ${this.state.fanOn ? 'Stop' : 'Start'} Ceiling Fan`,
        };
      }
      if (Math.hypot(relX - (-2.5), relZ - (-6.6)) < 2.2) {
        return {
          id: 'ac',
          label: 'Air Conditioner',
          prompt: `Press [E] to ${this.state.acOn ? 'Turn OFF' : 'Turn ON'} Air Conditioner`,
        };
      }
    }

    // Fallback to Aurelion coordinator (F1 grand entrance / patio doors / concierge desk)
    return aurHit as any;
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

  /** Floor support for companion NPCs across THE AURELION's 9 levels and switchback staircase. */
  public getCompanionSurfaceHeight(position: THREE.Vector3, currentY: number, targetY: number): number {
    const relX = position.x - this.origin.x;
    const relZ = position.z - this.origin.z;
    const inBuilding = relX >= -15.2 && relX <= 15.2 && relZ >= -12.2 && relZ <= 12.2;
    if (!inBuilding) return getTerrainHeight(position.x, position.z);

    const curSpec = getLevelForLocalY(currentY);
    const tgtSpec = getLevelForLocalY(targetY);
    const stairwell =
      relX >= AURELION_STAIR_VOID.minX - 0.3 &&
      relX <= AURELION_STAIR_VOID.maxX + 0.3 &&
      relZ >= AURELION_STAIR_VOID.minZ - 0.6 &&
      relZ <= AURELION_STAIR_VOID.maxZ + 0.6;

    if (stairwell && curSpec.index !== tgtSpec.index) {
      const ascending = tgtSpec.index > curSpec.index;
      const flightIdx = ascending ? curSpec.index : curSpec.index - 1;
      if (flightIdx >= 0 && flightIdx < AURELION_LEVEL_ORDER.length - 1) {
        const fromLvl = AURELION_LEVELS[AURELION_LEVEL_ORDER[flightIdx]];
        const toLvl = AURELION_LEVELS[AURELION_LEVEL_ORDER[flightIdx + 1]];
        const p = THREE.MathUtils.clamp(
          (relZ - AURELION_STAIR_VOID.zStart) / (AURELION_STAIR_VOID.zEnd - AURELION_STAIR_VOID.zStart),
          0,
          1
        );
        const progress = flightIdx % 2 === 0 ? p : 1 - p;
        return fromLvl.floorY + progress * (toLvl.floorY - fromLvl.floorY);
      }
    }

    return curSpec.floorY;
  }

  /**
   * Return a legal doorway waypoint when a companion and its destination are
   * on opposite sides of THE AURELION or compound boundary. Closed access points
   * are deliberately excluded, so the companion remains blocked by the wall.
   */
  public getCompanionNavigationWaypoint(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 | null {
    const ox = this.origin.x;
    const oz = this.origin.z;
    const buildingFrontZ = oz - 11.9;
    const insideBuilding = (p: THREE.Vector3) =>
      p.x > ox - 15.2 && p.x < ox + 15.2 && p.z > buildingFrontZ && p.z < oz + 12.2;
    const fromInBuilding = insideBuilding(from);
    const toInBuilding = insideBuilding(to);

    // Follow the actual 9-level switchback staircase when player and companion occupy different floors.
    if (fromInBuilding && toInBuilding && Math.abs(from.y - to.y) > 1.8) {
      const curSpec = getLevelForLocalY(from.y);
      const tgtSpec = getLevelForLocalY(to.y);
      if (curSpec.index !== tgtSpec.index) {
        const ascending = tgtSpec.index > curSpec.index;
        const flightIdx = ascending ? curSpec.index : curSpec.index - 1;
        if (flightIdx >= 0 && flightIdx < AURELION_LEVEL_ORDER.length - 1) {
          const reverse = flightIdx % 2 === 1;
          const laneX = flightIdx % 2 === 0 ? AURELION_STAIR_VOID.eastLaneX : AURELION_STAIR_VOID.westLaneX;
          const zS = AURELION_STAIR_VOID.zStart;
          const zE = AURELION_STAIR_VOID.zEnd;
          const startZ = ascending ? (reverse ? zE : zS) : (reverse ? zS : zE);
          const endZ = ascending ? (reverse ? zS : zE) : (reverse ? zE : zS);
          const inFlight =
            Math.abs((from.x - ox) - laneX) < 1.1 &&
            from.z >= oz + zS - 0.5 &&
            from.z <= oz + zE + 0.5;
          return new THREE.Vector3(ox + laneX, from.y, oz + (inFlight ? endZ : startZ));
        }
      }
    }

    // THE AURELION Grand Front Entrance (South Portal at oz - 11.9): both leaves must be open.
    if (fromInBuilding !== toInBuilding && this.state.doorOpen) {
      const insideZ = buildingFrontZ + 1.35;
      const outsideZ = buildingFrontZ - 1.35;
      return new THREE.Vector3(
        ox,
        Math.max(0, getTerrainHeight(ox, fromInBuilding ? outsideZ : insideZ)),
        fromInBuilding ? outsideZ : insideZ
      );
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

  /** Operates THE NEXUS dual-lift system cleanly. */

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
    const rx = playerPos.x - this.origin.x;
    const rz = playerPos.z - this.origin.z;
    const ry = playerPos.y - this.origin.y;
    const inF7Pool =
      rx >= AURELION_ROOFTOP_INFINITY_POOL.localMinX &&
      rx <= AURELION_ROOFTOP_INFINITY_POOL.localMaxX &&
      rz >= AURELION_ROOFTOP_INFINITY_POOL.localMinZ &&
      rz <= AURELION_ROOFTOP_INFINITY_POOL.localMaxZ &&
      ry >= AURELION_ROOFTOP_INFINITY_POOL.basinBottomY - 0.1 &&
      ry <= AURELION_ROOFTOP_INFINITY_POOL.deckY + 1.2;
    const inF6Pool =
      rx >= AURELION_F6_INDOOR_POOL.localMinX &&
      rx <= AURELION_F6_INDOOR_POOL.localMaxX &&
      rz >= AURELION_F6_INDOOR_POOL.localMinZ &&
      rz <= AURELION_F6_INDOOR_POOL.localMaxZ &&
      ry >= AURELION_F6_INDOOR_POOL.basinBottomY - 0.1 &&
      ry <= AURELION_F6_INDOOR_POOL.deckY + 1.2;
    return inF7Pool || inF6Pool;
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

    // 1. Register THE AURELION Structure 1 colliders (9 levels: B2, B1, F1..F7, shafts, atrium, pools, furniture)
    registerAurelionStructure1Colliders(physMgr, this.origin, {
      doorOpen: this.state.doorOpen,
      patioDoorOpen: this.patioDoorOpen,
      bathroomDoorOpen: this.bathroomDoorOpen,
    });

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
    // (Building 1 colliders handled above by registerAurelionStructure1Colliders)

    // Building 2: THE NEXUS 8-Floor Grand Railway Intelligence Headquarters at local (-48, 0, 24)
    registerNexusStructure2Colliders(physMgr, this.origin, this.nexus?.systems.restrictedRoomsUnlocked ?? false);

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

  }

  public dispose() {
    this.aurelion?.dispose();
    this.turrets?.dispose();
    this.basementRoom?.dispose();
    this.nexus?.dispose();
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
