import * as THREE from 'three';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { soundEngine } from '../../utils/audio';
import { ApartmentTurrets } from './ApartmentTurrets';
import { BasementControlRoom } from './BasementControlRoom';
import { getTerrainHeight } from '../Terrain';
import { ZombieManager } from '../ZombieManager';
import { WildlifeManager } from '../WildlifeManager';

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
  public state: ApartmentState;
  public turrets: ApartmentTurrets;
  public basementRoom: BasementControlRoom;

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
  public garageShutterOpen = true;
  private garageShutterGroup!: THREE.Group;
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

  // Exterior wall sub-groups for directional camera cutaways
  private southWallMesh!: THREE.Group;
  private northWallMesh!: THREE.Group;
  private eastWallMesh!: THREE.Group;
  private westWallMesh!: THREE.Group;

  // Base building location
  public readonly origin = new THREE.Vector3(-26, 0, 38);

  // Pool water volume bounding box in world coordinates
  public readonly backyardPoolBounds = {
    minX: -5.0, maxX: 5.0, minY: 0.15, maxY: 1.5,
    minZ: 17.5, maxZ: 25.5,
  };

  public readonly poolWaterBounds = {
    minX: -31.5, maxX: -25.5,
    minY: 11.2, maxY: 14.0,
    minZ: 34.5, maxZ: 41.5,
  };

  constructor(parent: THREE.Scene | THREE.Group) {
    this.group = new THREE.Group();
    this.group.name = 'five_floor_apartment_compound_with_basement';
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

    // Shared high-grade PBR materials
    this.whiteWallMat = new THREE.MeshStandardMaterial({
      color: 0xf5f5f5,
      roughness: 0.88,
      side: THREE.DoubleSide,
    });
    this.greyWallMat = new THREE.MeshStandardMaterial({
      color: 0x787c82, // Visually distinct grey for Floor 2
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    this.armoryWallMat = new THREE.MeshStandardMaterial({
      color: 0x22262d,
      roughness: 0.45,
      metalness: 0.65,
      side: THREE.DoubleSide,
    });
    this.brickFacadeMat = new THREE.MeshStandardMaterial({
      color: 0x8a4234,
      roughness: 0.9,
    });
    this.floorTileMat = new THREE.MeshStandardMaterial({
      color: 0xd2ceca,
      roughness: 0.6,
    });
    this.woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x583d26,
      roughness: 0.7,
    });
    this.glassMat = new THREE.MeshStandardMaterial({
      color: 0x8ec3d8,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.45,
    });
    this.metalTrimMat = new THREE.MeshStandardMaterial({
      color: 0x25282d,
      metalness: 0.8,
      roughness: 0.35,
    });
    this.waterMat = new THREE.MeshStandardMaterial({
      color: 0x0099bb,
      roughness: 0.05,
      metalness: 0.25,
      transparent: true,
      opacity: 0.75,
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
    this.floor1Group.name = 'floor_1_white_living';
    this.floor2Group = new THREE.Group();
    this.floor2Group.name = 'floor_2_full_medical_center';
    this.floor3Group = new THREE.Group();
    this.floor3Group.name = 'floor_3_armory_vault';
    this.floor4Group = new THREE.Group();
    this.floor4Group.name = 'floor_4_survival_farm_utility';
    this.floor5Group = new THREE.Group();
    this.floor5Group.name = 'floor_5_rooftop_pool_terrace';
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
    // Security defaults: all compound entrances begin closed.
    // Access is granted only through the two explicit gate interactions.

    // Physics colliders are registered once by TownLifeManager after the full town is created.

    // Keep the existing security and basement operations systems connected to the expanded building.
    this.turrets = new ApartmentTurrets(this.group, this.origin);
    this.basementRoom = new BasementControlRoom(this.group, this.origin);
  }

  private registerBuildingColliders() {
    const phys = UnifiedPhysicsManager.getInstance();
    if (!phys) return;

    const ox = this.origin.x;
    const oy = this.origin.y;
    const oz = this.origin.z;

    // Exterior Apartment Walls (North wall has 2.4m central doorway with sliding glass patio doors to backyard)
    phys.registerBoxCollider('apt_north_wall_l', 'wall', [ox - 4.6, oy + 1.6, oz + 6.8], 6.8, 3.2, 0.6);
    phys.registerBoxCollider('apt_north_wall_r', 'wall', [ox + 4.6, oy + 1.6, oz + 6.8], 6.8, 3.2, 0.6);
    phys.registerBoxCollider('apt_north_wall_upper', 'wall', [ox, oy + 8.0, oz + 6.8], 16.0, 9.6, 0.6);
    phys.registerBoxCollider('apt_patio_door', 'wall', [ox, oy + 1.4, oz + 6.8], 2.4, 2.6, 0.2, 0, this.patioDoorOpen);
    phys.registerBoxCollider('apt_east_wall', 'wall', [ox + 7.8, oy + 6.4, oz], 0.6, 12.8, 14.0);
    phys.registerBoxCollider('apt_west_wall', 'wall', [ox - 7.8, oy + 6.4, oz], 0.6, 12.8, 14.0);
    phys.registerBoxCollider('apt_south_wall_left', 'wall', [ox - 4.5, oy + 6.4, oz - 6.8], 7.0, 12.8, 0.6);
    phys.registerBoxCollider('apt_south_wall_right', 'wall', [ox + 4.5, oy + 6.4, oz - 6.8], 7.0, 12.8, 0.6);

    // Compound Perimeter Enclosure Walls (Zero gaps, only front double gate at center)
    phys.registerBoxCollider('apt_perim_west', 'wall', [ox - 19.0, oy + 1.7, oz + 2.5], 0.6, 3.4, 49.0);
    phys.registerBoxCollider('apt_perim_east', 'wall', [ox + 19.0, oy + 1.7, oz + 2.5], 0.6, 3.4, 49.0);
    phys.registerBoxCollider('apt_perim_rear', 'wall', [ox, oy + 1.7, oz + 27.0], 38.5, 3.4, 0.6);
    phys.registerBoxCollider('apt_perim_front_left_outer', 'wall', [ox - 15.86, oy + 1.7, oz - 22.0], 6.28, 3.4, 0.6);
    phys.registerBoxCollider('apt_perim_front_left_inner', 'wall', [ox - 6.915, oy + 1.7, oz - 22.0], 8.73, 3.4, 0.6);
    phys.registerBoxCollider('apt_perim_front_right_inner', 'wall', [ox + 6.915, oy + 1.7, oz - 22.0], 8.73, 3.4, 0.6);
    phys.registerBoxCollider('apt_perim_front_right_outer', 'wall', [ox + 15.86, oy + 1.7, oz - 22.0], 6.28, 3.4, 0.6);
  }

  // ==========================================
  // FLOOR SLAB WITH STAIR OPENING HELPER
  // ==========================================
  private createSlabWithStairwell(mat: THREE.Material, thickness: number, yPos: number): THREE.Group {
    const g = new THREE.Group();
    // West section: covers X = -8.0 to +4.5 (width 12.5, depth 14, center X = -1.75)
    const westSlab = new THREE.Mesh(new THREE.BoxGeometry(12.5, thickness, 14), mat);
    westSlab.position.set(-1.75, yPos, 0);
    westSlab.receiveShadow = true;

    // East North section: covers X = 4.5 to 8.0, Z = 2.0 to 7.0 (width 3.5, depth 5, center X = 6.25, Z = 4.5)
    const eastNorth = new THREE.Mesh(new THREE.BoxGeometry(3.5, thickness, 5.0), mat);
    eastNorth.position.set(6.25, yPos, 4.5);
    eastNorth.receiveShadow = true;

    // East South section: covers X = 4.5 to 8.0, Z = -7.0 to -4.5 (width 3.5, depth 2.5, center X = 6.25, Z = -5.75)
    const eastSouth = new THREE.Mesh(new THREE.BoxGeometry(3.5, thickness, 2.5), mat);
    eastSouth.position.set(6.25, yPos, -5.75);
    eastSouth.receiveShadow = true;

    g.add(westSlab, eastNorth, eastSouth);
    return g;
  }

  // ==========================================
  // FLOOR 1: WHITE WALL MAIN LIVING AREA
  // ==========================================
  private buildFloor1() {
    const f1 = this.floor1Group;

    // Ground Floor Solid Base
    const floorSlab = new THREE.Mesh(new THREE.BoxGeometry(16, 0.25, 14), this.woodFloorMat);
    floorSlab.position.set(0, 0.12, 0);
    floorSlab.receiveShadow = true;
    f1.add(floorSlab);

    // Ceiling with stairwell cutout so player head is never blocked
    const ceiling = this.createSlabWithStairwell(this.whiteWallMat, 0.2, 3.1);
    f1.add(ceiling);

    // Interior White Dividing Walls (Dividing Bedroom, Kitchen, Living Room)
    const bedDivider = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.9, 7.5), this.whiteWallMat);
    bedDivider.position.set(-2.5, 1.6, 2.8);
    const kitchenDivider = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.9, 5.0), this.whiteWallMat);
    kitchenDivider.position.set(2.5, 1.6, 4.0);
    f1.add(bedDivider, kitchenDivider);

    // Warm Interior Ceiling Lamps
    const lamp1 = new THREE.PointLight(0xffecd0, 1.8, 14, 1.3);
    lamp1.position.set(-4.5, 2.7, 2.5);
    const lamp2 = new THREE.PointLight(0xffeed0, 2.0, 15, 1.3);
    lamp2.position.set(0, 2.7, 0);
    this.floorLights.push(lamp1, lamp2);
    f1.add(lamp1, lamp2);

    // --- 1. BEDROOM ---
    // Solid Double Bed: Frame (2.4 x 0.5 x 2.8), Headboard, Thick Mattress (2.2 x 0.35 x 2.5), Quilt, Pillows
    const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 2.8), this.metalTrimMat);
    bedFrame.position.set(-5.5, 0.35, 3.8);
    bedFrame.castShadow = true;
    bedFrame.receiveShadow = true;

    const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 0.2), this.woodFloorMat);
    headboard.position.set(-5.5, 0.9, 5.15);
    headboard.castShadow = true;
    headboard.receiveShadow = true;

    // Mattress top finished surface is at Y = 0.35 + 0.35/2 + 0.35 = 0.875m
    const mattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.35, 2.5),
      new THREE.MeshStandardMaterial({ color: 0xfdfdfd, roughness: 0.92 })
    );
    mattress.position.set(-5.5, 0.65, 3.8);
    mattress.castShadow = true;
    mattress.receiveShadow = true;

    const blanket = new THREE.Mesh(
      new THREE.BoxGeometry(2.22, 0.38, 1.7),
      new THREE.MeshStandardMaterial({ color: 0x1f3c5e, roughness: 0.85 })
    );
    blanket.position.set(-5.5, 0.66, 3.3);
    blanket.castShadow = true;

    const pillow1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.16, 0.55),
      new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.95 })
    );
    pillow1.position.set(-6.1, 0.85, 4.6);
    pillow1.castShadow = true;
    const pillow2 = pillow1.clone();
    pillow2.position.x = -4.9;

    // Nightstand & Bedside Lamp with toggleable warm point light
    const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.65, 0.7), this.woodFloorMat);
    nightstand.position.set(-7.2, 0.45, 4.8);
    nightstand.castShadow = true;
    nightstand.receiveShadow = true;

    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.08, 10), this.metalTrimMat);
    lampBase.position.set(-7.2, 0.81, 4.8);
    const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 8), this.metalTrimMat);
    lampStem.position.set(-7.2, 1.0, 4.8);
    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.22, 0.28, 12),
      new THREE.MeshStandardMaterial({ color: 0xffedd5, roughness: 0.6, transparent: true, opacity: 0.9 })
    );
    lampShade.position.set(-7.2, 1.15, 4.8);
    this.bedsideLampLight = new THREE.PointLight(0xffecd0, 1.4, 6.0, 1.5);
    this.bedsideLampLight.position.set(-7.2, 1.15, 4.8);

    // Solid Wardrobe at (-7.2, 1.4) with double hinged doors
    const wardrobeGroup = new THREE.Group();
    wardrobeGroup.position.set(-7.2, 0, 1.4);
    const wardrobeBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 2.3, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.7 })
    );
    wardrobeBody.position.set(0, 1.25, 0);
    wardrobeBody.castShadow = true;
    wardrobeBody.receiveShadow = true;
    wardrobeGroup.add(wardrobeBody);

    // Left and right opening wardrobe doors on hinges
    this.wardrobeLeftDoor = new THREE.Group();
    this.wardrobeLeftDoor.position.set(0.43, 1.25, -0.76);
    const wDoorL = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.22, 0.76),
      new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.65 })
    );
    wDoorL.position.set(0, 0, 0.38);
    const wHandleL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), this.metalTrimMat);
    wHandleL.position.set(0.04, 0, 0.7);
    this.wardrobeLeftDoor.add(wDoorL, wHandleL);

    this.wardrobeRightDoor = new THREE.Group();
    this.wardrobeRightDoor.position.set(0.43, 1.25, 0.76);
    const wDoorR = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 2.22, 0.76),
      new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.65 })
    );
    wDoorR.position.set(0, 0, -0.38);
    const wHandleR = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), this.metalTrimMat);
    wHandleR.position.set(0.04, 0, -0.7);
    this.wardrobeRightDoor.add(wDoorR, wHandleR);
    wardrobeGroup.add(this.wardrobeLeftDoor, this.wardrobeRightDoor);

    // Study & Personal Computer Desk at (-3.5, 0.6)
    const deskGroup = new THREE.Group();
    deskGroup.position.set(-3.5, 0, 0.6);
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.06, 0.85),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.4 })
    );
    deskTop.position.set(0, 0.75, 0);
    deskTop.castShadow = true;
    const deskLeg1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.72, 0.06), this.metalTrimMat);
    deskLeg1.position.set(-0.72, 0.36, -0.36);
    const deskLeg2 = deskLeg1.clone(); deskLeg2.position.set(0.72, 0.36, -0.36);
    const deskLeg3 = deskLeg1.clone(); deskLeg3.position.set(-0.72, 0.36, 0.36);
    const deskLeg4 = deskLeg1.clone(); deskLeg4.position.set(0.72, 0.36, 0.36);

    // Computer Monitor displaying live terminal OS
    const monitorStand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.25, 10), this.metalTrimMat);
    monitorStand.position.set(0, 0.9, 0.25);
    const monitorFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.62, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 })
    );
    monitorFrame.position.set(0, 1.25, 0.25);
    this.computerScreenMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.58),
      new THREE.MeshBasicMaterial({ map: this.computerScreenTexture })
    );
    this.computerScreenMesh.rotation.y = Math.PI; // Faces -Z into bedroom
    this.computerScreenMesh.position.set(0, 1.25, 0.22);

    // Keyboard & Mouse
    const deskKb = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.02, 0.16),
      new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.4 })
    );
    deskKb.position.set(0, 0.79, -0.05);
    const deskMouse = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.025, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.3 })
    );
    deskMouse.position.set(0.35, 0.79, -0.05);

    // Ergonomic Study Chair
    const chairSeat = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.08, 0.52),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    chairSeat.position.set(0, 0.48, -0.42);
    chairSeat.castShadow = true;
    const chairBack = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.55, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    chairBack.position.set(0, 0.78, -0.66);
    const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.44, 8), this.metalTrimMat);
    chairStem.position.set(0, 0.22, -0.42);
    deskGroup.add(deskTop, deskLeg1, deskLeg2, deskLeg3, deskLeg4, monitorStand, monitorFrame, this.computerScreenMesh, deskKb, deskMouse, chairSeat, chairBack, chairStem);

    f1.add(bedFrame, headboard, mattress, blanket, pillow1, pillow2, nightstand, lampBase, lampStem, lampShade, this.bedsideLampLight, wardrobeGroup, deskGroup);

    // --- 2. WORKING TELEVISION WITH BROADCAST SCREEN ---
    const tvStand = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.65, 0.6), this.metalTrimMat);
    tvStand.position.set(-5.5, 0.45, 0.0);
    tvStand.castShadow = true;
    tvStand.receiveShadow = true;

    const tvFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.25, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.85 })
    );
    tvFrame.position.set(-5.5, 1.55, 0.0);
    tvFrame.rotation.x = -0.06;

    this.tvMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.15), this.tvScreenMat);
    this.tvMesh.rotation.y = 0; // Directly faces +Z towards bed
    this.tvMesh.rotation.x = -0.06;
    this.tvMesh.position.set(-5.5, 1.55, 0.06);
    f1.add(tvStand, tvFrame, this.tvMesh);

    // --- 2B. RELOCATED GROUND-FLOOR MEDICAL FIRST-AID STATION (At X = 3.6, Z = -5.2) ---
    const medGroup = new THREE.Group();
    medGroup.name = 'floor1_medical_recovery_station';
    medGroup.position.set(3.6, 0, -5.2);

    const medBedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.45, 1.1), this.metalTrimMat);
    medBedFrame.position.set(0, 0.32, 0);
    medBedFrame.castShadow = true;
    const medMattress = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 0.25, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xecfdf5, roughness: 0.65 })
    );
    medMattress.position.set(0, 0.65, 0);
    const medPillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.14, 0.75),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })
    );
    medPillow.position.set(-0.75, 0.8, 0);

    const ivPole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.85, 8), this.metalTrimMat);
    ivPole.position.set(0.95, 0.95, -0.6);
    const salineBag = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.32, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xd1fae5, transparent: true, opacity: 0.85 })
    );
    salineBag.position.set(0.95, 1.65, -0.6);
    medGroup.add(medBedFrame, medMattress, medPillow, ivPole, salineBag);
    f1.add(medGroup);

    // --- 2C. DEDICATED GROUND-FLOOR SECURITY MONITORING STATION ---
    this.commandConsoleGroup = new THREE.Group();
    this.commandConsoleGroup.name = 'floor1_security_monitoring_centre';
    this.commandConsoleGroup.position.set(2.38, 0, -0.5);

    const cmdDesk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 3.4), this.metalTrimMat);
    cmdDesk.position.set(0, 0.45, 0);
    cmdDesk.castShadow = true;
    cmdDesk.receiveShadow = true;

    const cmdKeyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.04, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4, metalness: 0.7 })
    );
    cmdKeyboard.position.set(-0.2, 0.89, 0);
    cmdKeyboard.rotation.z = 0.08;

    for (let i = 0; i < 4; i++) {
      const led = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 8),
        new THREE.MeshBasicMaterial({ color: [0x10b981, 0x06b6d4, 0xf59e0b, 0xef4444][i] })
      );
      led.position.set(-0.25, 0.92, -0.8 + i * 0.5);
      this.commandConsoleGroup.add(led);
    }

    const screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.9, 3.3),
      new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.3, metalness: 0.9 })
    );
    screenFrame.position.set(0.42, 1.85, 0);

    const screenMat = new THREE.MeshBasicMaterial({ map: this.securityScreenTexture });
    this.securityScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), screenMat);
    this.securityScreenMesh.rotation.y = -Math.PI / 2; // Facing West into main living space
    this.securityScreenMesh.position.set(0.37, 1.85, 0);

    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.55, 12), this.metalTrimMat);
    stool.position.set(-0.85, 0.28, 0);
    stool.castShadow = true;

    this.commandConsoleGroup.add(cmdDesk, cmdKeyboard, screenFrame, this.securityScreenMesh, stool);
    f1.add(this.commandConsoleGroup);

    // --- 3. REFRIGERATOR WITH INTERACTION ---
    const fridgeBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.2, 1.0),
      new THREE.MeshStandardMaterial({ color: 0xd8d8d8, metalness: 0.6, roughness: 0.25 })
    );
    fridgeBody.position.set(4.5, 1.22, 5.8);
    fridgeBody.castShadow = true;
    fridgeBody.receiveShadow = true;

    this.fridgeDoor = new THREE.Group();
    this.fridgeDoor.position.set(4.5, 1.22, 5.3);
    const doorPanel = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 2.18, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xe2e2e2, metalness: 0.65, roughness: 0.25 })
    );
    const doorHandle = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.6, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 })
    );
    doorHandle.position.set(0.48, 0, -0.08);
    this.fridgeDoor.add(doorPanel, doorHandle);
    f1.add(fridgeBody, this.fridgeDoor);

    // --- 4. KITCHENETTE COUNTER, DOUBLE SINK & 4-BURNER STOVE ---
    const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.1), this.metalTrimMat);
    kitchenCounter.position.set(5.8, 0.57, 3.2);
    kitchenCounter.castShadow = true;
    kitchenCounter.receiveShadow = true;

    // Stainless steel kitchen sink
    const kitchenSink = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.38, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.3 })
    );
    kitchenSink.position.set(5.8, 0.85, 2.5);

    const kitchenFaucet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.15 })
    );
    kitchenFaucet.position.set(5.8, 1.15, 2.85);

    // Kitchen running water stream
    this.kitchenTapWaterMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.025, 0.32, 6),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, roughness: 0.1 })
    );
    this.kitchenTapWaterMesh.position.set(5.8, 0.95, 2.75);
    this.kitchenTapWaterMesh.visible = false;

    // 4-Burner Electric Cooking Stove with illuminated burner coils at (5.8, 4.6)
    const stoveBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.92, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x1f242d, metalness: 0.85, roughness: 0.3 })
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
    f1.add(kitchenCounter, kitchenSink, kitchenFaucet, this.kitchenTapWaterMesh, stoveBody);

    // --- 4B. DINING AREA (Table + 4 Chairs) at (2.2, 1.2) ---
    const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 1.2), this.woodFloorMat);
    diningTable.position.set(2.2, 0.52, 1.2);
    diningTable.castShadow = true;
    diningTable.receiveShadow = true;

    const chairOffsets = [
      [-0.6, -0.75, 0],
      [0.6, -0.75, 0],
      [-0.6, 0.75, Math.PI],
      [0.6, 0.75, Math.PI],
    ];
    for (let i = 0; i < chairOffsets.length; i++) {
      const [cx, cz, crot] = chairOffsets[i];
      const chair = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.85, 0.44), this.woodFloorMat);
      chair.name = `dining_chair_${i}`;
      chair.position.set(2.2 + cx, 0.45, 1.2 + cz);
      chair.rotation.y = crot;
      chair.castShadow = true;
      chair.receiveShadow = true;
      f1.add(chair);
    }
    f1.add(diningTable);

    // --- 5. LIVING ROOM SOFA, COFFEE TABLE & REAL-TIME WALL CLOCK ---
    const sofa = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.85, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x2e4033, roughness: 0.85 })
    );
    sofa.position.set(0, 0.55, 0.5);
    sofa.castShadow = true;
    sofa.receiveShadow = true;

    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.9), this.woodFloorMat);
    coffeeTable.position.set(0, 0.35, -1.2);
    coffeeTable.castShadow = true;
    coffeeTable.receiveShadow = true;

    // Smartphone prop on coffee table
    const phoneMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.02, 0.34),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.2 })
    );
    phoneMesh.position.set(0.3, 0.59, -1.2);
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x00d2d3 })
    );
    phoneScreen.rotation.x = -Math.PI / 2;
    phoneScreen.position.set(0.3, 0.605, -1.2);

    // Real-Time Wall Clock mounted on living room dividing wall at (-1.2, 2.4, -1.8)
    const wallClockMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.06, 24),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.7 })
    );
    wallClockMesh.rotation.x = Math.PI / 2;
    wallClockMesh.position.set(-1.2, 2.3, -1.8);
    const clockFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.76),
      new THREE.MeshBasicMaterial({ map: this.wallClockTexture, transparent: true })
    );
    clockFace.position.set(-1.2, 2.3, -1.76);
    f1.add(sofa, coffeeTable, phoneMesh, phoneScreen, wallClockMesh, clockFace);

    // --- 6. WORKING CEILING FAN ---
    const fanHub = new THREE.Group();
    fanHub.position.set(0, 2.95, 0.5);
    const fanStem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 6), this.metalTrimMat);
    fanStem.position.y = -0.15;
    const fanMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.15, 10), this.metalTrimMat);
    fanMotor.position.y = -0.3;

    this.fanBlades = new THREE.Group();
    this.fanBlades.position.y = -0.32;
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.02, 0.16), this.woodFloorMat);
      blade.rotation.y = (i * Math.PI) / 2;
      blade.position.set(Math.cos(blade.rotation.y) * 0.55, 0, Math.sin(blade.rotation.y) * 0.55);
      this.fanBlades.add(blade);
    }
    fanHub.add(fanStem, fanMotor, this.fanBlades);
    f1.add(fanHub);

    // --- 7. WALL-MOUNTED AIR CONDITIONER ---
    this.acMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.4 })
    );
    this.acMesh.position.set(-2.5, 2.5, -6.6);

    this.acLedMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const acLed = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), this.acLedMat);
    acLed.position.set(-1.8, 2.4, -6.38);
    f1.add(this.acMesh, acLed);

    // --- 8. FULL-HEIGHT DOUBLE FRONT ENTRANCE DOORS ---
    this.frontDoorMesh = new THREE.Group();
    this.frontDoorMesh.name = 'apartment_double_front_doors';
    const doorHeight = 2.38;
    const doorLeafWidth = 0.99;
    const doorThickness = 0.14;
    this.frontDoorMesh.position.set(0, 1.4, -6.9);

    const doorMaterial = this.woodFloorMat;
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xdaa520,
      metalness: 0.9,
      roughness: 0.25,
    });

    this.frontDoorLeftLeaf = new THREE.Group();
    this.frontDoorLeftLeaf.name = 'frontDoorLeftLeaf';
    this.frontDoorLeftLeaf.position.x = -0.98;
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, doorHeight, doorThickness), doorMaterial);
    leftPanel.position.set(doorLeafWidth / 2, 0, 0);
    leftPanel.castShadow = true;
    leftPanel.receiveShadow = true;
    const leftHandle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), handleMaterial);
    leftHandle.position.set(doorLeafWidth - 0.13, 0, 0.105);
    this.frontDoorLeftLeaf.add(leftPanel, leftHandle);

    this.frontDoorRightLeaf = new THREE.Group();
    this.frontDoorRightLeaf.name = 'frontDoorRightLeaf';
    this.frontDoorRightLeaf.position.x = 0.98;
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(doorLeafWidth, doorHeight, doorThickness), doorMaterial);
    rightPanel.position.set(-doorLeafWidth / 2, 0, 0);
    rightPanel.castShadow = true;
    rightPanel.receiveShadow = true;
    const rightHandle = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), handleMaterial);
    rightHandle.position.set(-doorLeafWidth + 0.13, 0, 0.105);
    this.frontDoorRightLeaf.add(rightPanel, rightHandle);

    this.frontDoorMesh.add(this.frontDoorLeftLeaf, this.frontDoorRightLeaf);
    f1.add(this.frontDoorMesh);

    // --- REAR SLIDING PATIO DOUBLE DOORS (X = 0, Z = 6.8) ---
    this.patioDoorMesh = new THREE.Group();
    this.patioDoorMesh.name = 'rear_patio_sliding_doors';
    this.patioDoorMesh.position.set(0, 1.4, 6.8);

    const patioFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.6, 0.12), this.metalTrimMat);
    this.patioDoorMesh.add(patioFrame);

    const patioLeafW = 1.15;
    this.patioDoorLeftLeaf = new THREE.Mesh(new THREE.BoxGeometry(patioLeafW, 2.45, 0.06), this.glassMat);
    this.patioDoorLeftLeaf.position.set(this.patioDoorOpen ? -1.15 : -0.58, 0, 0.02);
    this.patioDoorLeftLeaf.castShadow = true;

    this.patioDoorRightLeaf = new THREE.Mesh(new THREE.BoxGeometry(patioLeafW, 2.45, 0.06), this.glassMat);
    this.patioDoorRightLeaf.position.set(this.patioDoorOpen ? 1.15 : 0.58, 0, -0.02);
    this.patioDoorRightLeaf.castShadow = true;

    this.patioDoorMesh.add(this.patioDoorLeftLeaf, this.patioDoorRightLeaf);
    f1.add(this.patioDoorMesh);

    // ==============================================================
    // COMPLETE LUXURY BATHROOM SUITE (Southwest Wing: X = -7.4 to -3.5, Z = -6.6 to -3.2)
    // ==============================================================
    const bathGroup = new THREE.Group();
    bathGroup.name = 'ground_floor_luxury_bathroom_suite';

    // 1. Ceramic Tiled Floor Slab
    const ceramicTileMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.1,
    });
    const bathFloor = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.08, 3.4), ceramicTileMat);
    bathFloor.position.set(-5.45, 0.16, -4.9);
    bathFloor.receiveShadow = true;

    // 2. Interior Bathroom Partition Walls
    const bathWallMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.45,
      side: THREE.DoubleSide,
    });
    // North partition wall with bedroom (X = -7.5 to -3.5, Z = -3.2)
    const bathNorthWall = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.8, 0.18), bathWallMat);
    bathNorthWall.position.set(-5.45, 1.55, -3.2);
    bathNorthWall.castShadow = true;
    bathNorthWall.receiveShadow = true;

    // East partition wall South section (Z = -6.6 to -4.8, length 1.8m)
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
  // FLOOR 2: GREY WALL RESIDENTIAL FLOOR
  // ==========================================
  private buildFloor2() {
    const f2 = this.floor2Group; const yOff = 3.2;
    f2.add(this.createSlabWithStairwell(this.floorTileMat, 0.25, yOff + 0.12));
    f2.add(this.createSlabWithStairwell(this.greyWallMat, 0.2, yOff + 3.1));
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xe7edf0, roughness: 0.8, side: THREE.DoubleSide });
    const partition = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8, 10.5), wallMat); partition.position.set(-1.9,yOff+1.55,0.2); f2.add(partition);
    const bedMat = new THREE.MeshStandardMaterial({color:0xf1f4f5,roughness:0.82});
    const frameMat = new THREE.MeshStandardMaterial({color:0x9aa5ad,metalness:0.65,roughness:0.35});
    // Reception counter and triage station.
    const reception = new THREE.Mesh(new THREE.BoxGeometry(3.4,1.05,0.9), frameMat); reception.position.set(2.6,yOff+0.62,-4.8); f2.add(reception);
    const receptionScreen = new THREE.Mesh(new THREE.BoxGeometry(0.9,0.55,0.08),new THREE.MeshBasicMaterial({color:0x37c9d8})); receptionScreen.position.set(2.6,yOff+1.35,-4.65); f2.add(receptionScreen);
    // Four patient bays: bed, monitor, IV stand, oxygen cylinder per bay.
    for(let i=0;i<4;i++){
      const x=-5.7+(i%2)*3.0, z=-3.5+Math.floor(i/2)*5.0;
      const bed=new THREE.Mesh(new THREE.BoxGeometry(2.15,0.22,1.0),bedMat); bed.position.set(x,yOff+0.55,z); f2.add(bed);
      const mattress=new THREE.Mesh(new THREE.BoxGeometry(1.95,0.18,0.88),new THREE.MeshStandardMaterial({color:0xffffff})); mattress.position.set(x,yOff+0.74,z); f2.add(mattress);
      const monitor=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.58,0.18),new THREE.MeshStandardMaterial({color:0x26343b,emissive:0x063e46})); monitor.position.set(x+0.9,yOff+1.55,z-0.2); f2.add(monitor);
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(0.48,0.32),new THREE.MeshBasicMaterial({color:0x39e0a0})); screen.position.set(x+0.9,yOff+1.55,z-0.305); f2.add(screen);
      const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,1.65,8),frameMat); pole.position.set(x-1.0,yOff+1.15,z); f2.add(pole);
      const bag=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.35,0.16),new THREE.MeshStandardMaterial({color:0xd9f1ed,roughness:0.42,metalness:0.08})); bag.position.set(x-1.0,yOff+1.8,z); f2.add(bag);
      const oxygen=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.18,1.05,12),new THREE.MeshStandardMaterial({color:0x4c9f77,metalness:0.55})); oxygen.position.set(x+1.25,yOff+0.75,z+0.55); f2.add(oxygen);
    }
    // Examination tables and diagnostic equipment.
    for(const z of [-5.8,4.2,5.8]){ // Keep clinical equipment outside the protected stairwell corridor.
      const exam=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.82,0.85),bedMat); exam.position.set(5.6,yOff+0.55,z); f2.add(exam);
      const cabinet=new THREE.Mesh(new THREE.BoxGeometry(0.8,1.6,0.65),frameMat); cabinet.position.set(7.0,yOff+0.9,z); f2.add(cabinet);
    }
    // Medicine and sterile supply cabinets along rear wall.
    for(let i=0;i<5;i++){
      const cab=new THREE.Mesh(new THREE.BoxGeometry(1.05,2.0,0.55),new THREE.MeshStandardMaterial({color:0xdce3e8,metalness:0.25})); cab.position.set(-5.8+i*2.6,yOff+1.15,6.0); f2.add(cab);
      const label=new THREE.Mesh(new THREE.BoxGeometry(0.48,0.12,0.04),new THREE.MeshBasicMaterial({color:0x39b8c8})); label.position.set(-5.8+i*2.6,yOff+1.75,5.7); f2.add(label);
    }
    // Enclosed operating room on the east end with operating table and surgical lights.
    const opWall=new THREE.Mesh(new THREE.BoxGeometry(0.14,2.8,4.8),wallMat); opWall.position.set(3.7,yOff+1.55,2.0); f2.add(opWall);
    const opTable=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.28,1.0),frameMat); opTable.position.set(5.5,yOff+0.72,2.0); f2.add(opTable);
    const lamp=new THREE.Mesh(new THREE.CylinderGeometry(0.55,0.7,0.12,16),new THREE.MeshStandardMaterial({color:0xf5f7f8,emissive:0x344044})); lamp.position.set(5.5,yOff+2.65,2.0); f2.add(lamp);
    const diagnostic=new THREE.Mesh(new THREE.BoxGeometry(1.0,1.35,0.8),frameMat); diagnostic.position.set(2.2,yOff+0.95,-1.0); f2.add(diagnostic); // Relocated west of the stairwell.
    const emergencyBox=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,0.7),new THREE.MeshStandardMaterial({color:0xb52e32})); emergencyBox.position.set(0.0,yOff+0.55,-5.4); f2.add(emergencyBox);
    const light=new THREE.PointLight(0xd8f5ff,2.0,18,1.3); light.position.set(0,yOff+2.65,0); this.floorLights.push(light); f2.add(light);
  }

  // ==========================================
  // FLOOR 3: FICTIONAL 100-ITEM GAME ARMORY
  // ==========================================
  private buildFloor3() {
    const f3 = this.floor3Group;
    const yOff = 6.4;

    // Floor Slab with stairwell cutout
    const floorSlab = this.createSlabWithStairwell(this.metalTrimMat, 0.25, yOff + 0.12);
    f3.add(floorSlab);

    // Ceiling with stairwell cutout
    const ceiling = this.createSlabWithStairwell(this.metalTrimMat, 0.2, yOff + 3.1);
    f3.add(ceiling);

    // High-tech Secure Armory Room Walls (Dark graphite with cyan indicator strips)
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.9, 10.0), this.armoryWallMat);
    divider.position.set(-1.5, yOff + 1.6, 0);
    f3.add(divider);

    // Cyan Neon Accent Lines
    const stripMat = new THREE.MeshBasicMaterial({ color: 0x00d2d3 });
    const strip1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 9.8), stripMat);
    strip1.position.set(-1.35, yOff + 2.2, 0);
    f3.add(strip1);

    // Weapon Storage Lockers along West Wall
    for (let z = -4.5; z <= 4.5; z += 2.2) {
      const locker = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 2.4, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x2e3440, metalness: 0.85, roughness: 0.35 })
      );
      locker.position.set(-6.5, yOff + 1.35, z);
      f3.add(locker);

      // Weapon rack display inside
      const rackGun = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.35, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x5e81ac, metalness: 0.8 })
      );
      rackGun.position.set(-5.8, yOff + 1.4, z);
      f3.add(rackGun);
    }

    // Ammunition Crates & Heavy Ordnance Shelves along North Wall
    for (let x = -4.5; x <= 2.5; x += 2.4) {
      const crate = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.9, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x434c5e, metalness: 0.6, roughness: 0.5 })
      );
      crate.position.set(x, yOff + 0.6, 5.8);
      f3.add(crate);
    }

    // Secure equipment cabinets, armor storage and tactical kit displays.
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x39434d, metalness: 0.7, roughness: 0.38 });
    for (let i=0;i<4;i++) {
      const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.0,2.35,0.85),gearMat);
      cabinet.position.set(1.0+i*1.45,yOff+1.3,-5.8); f3.add(cabinet);
      const latch = new THREE.Mesh(new THREE.BoxGeometry(0.08,0.5,0.05),this.metalTrimMat);
      latch.position.set(1.38+i*1.45,yOff+1.3,-5.34); f3.add(latch);
    }
    for (let i=0;i<3;i++) {
      const armorTorso = new THREE.Mesh(new THREE.BoxGeometry(0.72,0.95,0.38),new THREE.MeshStandardMaterial({color:0x4c5a45,metalness:0.25,roughness:0.8}));
      armorTorso.position.set(2.2+i*1.55,yOff+1.15,4.2); f3.add(armorTorso);
      const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.28,12,8),new THREE.MeshStandardMaterial({color:0x56614c,metalness:0.35}));
      helmet.position.set(2.2+i*1.55,yOff+1.9,4.2); f3.add(helmet);
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.5,0.65,0.28),gearMat); pack.position.set(2.2+i*1.55,yOff+0.95,4.52); f3.add(pack);
    }
    const vault = new THREE.Mesh(new THREE.BoxGeometry(2.0,2.65,1.1),new THREE.MeshStandardMaterial({color:0x171c22,metalness:0.9,roughness:0.28}));
    vault.position.set(-3.8,yOff+1.45,-5.7); f3.add(vault);
    const vaultDial = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.08,16),new THREE.MeshStandardMaterial({color:0xd4af37,metalness:0.9}));
    vaultDial.rotation.x=Math.PI/2; vaultDial.position.set(-3.8,yOff+1.5,-5.1); f3.add(vaultDial);

    // Interactive Armory Console / Master Terminal (Center East)
    const consolePedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.6, 1.1, 8),
      this.metalTrimMat
    );
    consolePedestal.position.set(2.0, yOff + 0.65, 0.0);

    const consoleScreen = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.8, 0.1),
      new THREE.MeshBasicMaterial({ color: 0x00e5ff })
    );
    consoleScreen.rotation.x = -Math.PI / 4;
    consoleScreen.position.set(2.0, yOff + 1.45, 0.0);
    f3.add(consolePedestal, consoleScreen);

    // High-tech Armory Spotlights
    const armoryLight1 = new THREE.PointLight(0x00e5ff, 2.2, 14, 1.4);
    armoryLight1.position.set(-4.0, yOff + 2.7, 0);
    const armoryLight2 = new THREE.PointLight(0xffffff, 1.8, 14, 1.3);
    armoryLight2.position.set(2.0, yOff + 2.7, 0);
    this.floorLights.push(armoryLight1, armoryLight2);
    f3.add(armoryLight1, armoryLight2);

    // Floor 3 Signboard
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.7), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    plaque.position.set(4.4, yOff + 1.8, -3.8);
    plaque.rotation.y = -Math.PI / 2;
    f3.add(plaque);
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
    panelFace.position.set(7.05, y + 1.25, 0.48);
    f.add(panelFace);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshStandardMaterial({ color: [0x25d07d, 0xf0c43c, 0x25a8df, 0xe34a4a][i], emissive: [0x0b542c, 0x5a4208, 0x073d58, 0x5a1010][i] }));
      light.position.set(6.78 + i * 0.18, y + 1.72, 0.52);
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

    const parapetMat = new THREE.MeshStandardMaterial({ color: 0x626b73, roughness: 0.75 });
    // Solid safety parapet around the rooftop terrace.
    for (const [x,z,w,d] of [[0,6.85,16,0.25],[0,-6.85,16,0.25],[-7.85,0,0.25,13.7],[7.85,0,0.25,13.7]] as number[][]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(w,1.05,d), parapetMat);
      rail.position.set(x,yOff+0.68,z); rail.castShadow = true; f4.add(rail);
    }
    const pergolaMat = new THREE.MeshStandardMaterial({ color: 0x343b42, metalness: 0.55, roughness: 0.45 });
    for (const x of [2.5,3.8]) for (const z of [-2.8,2.8]) { // Keep pergola posts west of the stairwell.
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.16,2.4,0.16),pergolaMat);
      post.position.set(x,yOff+1.35,z); f4.add(post);
    }
    for (let i=0;i<5;i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(5.0,0.12,0.14),pergolaMat);
      beam.position.set(1.8,yOff+2.55,-2.8+i*1.4); // Pergola beams do not cross the stairwell headroom.
      f4.add(beam);
    }
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x7b573c, roughness: 0.8 });
    for (const z of [-2.0,2.0]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(2.2,0.22,0.65),benchMat);
      bench.position.set(-3.0,yOff+0.45,z); f4.add(bench);
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
  // EXTERIOR FACADE & DIRECTIONAL CUTAWAY
  // ==========================================
  private buildExteriorFacade() {
    const ext = this.exteriorWalls;

    // Corner Pillars & Cornices for exterior architectural look
    for (const [cx, cz] of [[-7.9, -6.9], [7.9, -6.9], [-7.9, 6.9], [7.9, 6.9]]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 14.2, 0.8), this.metalTrimMat);
      pillar.position.set(cx, 7.1, cz);
      pillar.castShadow = true;
      ext.add(pillar);
    }

    // Floor Decorative Cornices between stories
    for (let f = 1; f <= 4; f++) {
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.35, 14.5), this.metalTrimMat);
      cornice.position.set(0, f * 3.2, 0);
      ext.add(cornice);
    }

    // 1. North Wall (Back) with 2.4m central doorway for rear sliding patio doors
    this.northWallMesh = new THREE.Group();
    // Floor 1 Left wing
    const northWallF1Left = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.2, 0.5), this.brickFacadeMat);
    northWallF1Left.position.set(-4.6, 1.6, 6.8);
    northWallF1Left.castShadow = true;

    // Floor 1 Right wing
    const northWallF1Right = new THREE.Mesh(new THREE.BoxGeometry(6.8, 3.2, 0.5), this.brickFacadeMat);
    northWallF1Right.position.set(4.6, 1.6, 6.8);
    northWallF1Right.castShadow = true;

    // Floor 1 Door Lintel above patio doorway
    const northWallF1Lintel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 0.5), this.brickFacadeMat);
    northWallF1Lintel.position.set(0, 2.9, 6.8);

    // Floors 2-4 Upper North Wall
    const northWallUpper = new THREE.Mesh(new THREE.BoxGeometry(16.0, 9.6, 0.5), this.brickFacadeMat);
    northWallUpper.position.set(0, 8.0, 6.8);
    northWallUpper.castShadow = true;

    this.northWallMesh.add(northWallF1Left, northWallF1Right, northWallF1Lintel, northWallUpper);
    ext.add(this.northWallMesh);

    // 2. East Wall (Stairwell Bay)
    this.eastWallMesh = new THREE.Group();
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12.8, 14.0), this.brickFacadeMat);
    eastWall.position.set(7.8, 6.4, 0);
    eastWall.castShadow = true;
    this.eastWallMesh.add(eastWall);
    ext.add(this.eastWallMesh);

    // 3. West Wall (Bedrooms & Armory Display)
    this.westWallMesh = new THREE.Group();
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 12.8, 14.0), this.brickFacadeMat);
    westWall.position.set(-7.8, 6.4, 0);
    westWall.castShadow = true;
    this.westWallMesh.add(westWall);
    ext.add(this.westWallMesh);

    // 4. South Wall (Front Entrance Facade with door opening)
    this.southWallMesh = new THREE.Group();
    const southWallLeft = new THREE.Mesh(new THREE.BoxGeometry(7.0, 12.8, 0.5), this.brickFacadeMat);
    southWallLeft.position.set(-4.5, 6.4, -6.8);
    southWallLeft.castShadow = true;

    const southWallRight = new THREE.Mesh(new THREE.BoxGeometry(7.0, 12.8, 0.5), this.brickFacadeMat);
    southWallRight.position.set(4.5, 6.4, -6.8);
    southWallRight.castShadow = true;

    const southWallTop = new THREE.Mesh(new THREE.BoxGeometry(2.0, 9.6, 0.5), this.brickFacadeMat);
    southWallTop.position.set(0, 8.0, -6.8);

    this.southWallMesh.add(southWallLeft, southWallRight, southWallTop);
    ext.add(this.southWallMesh);

    // Exterior architecture is intentionally four enclosed storeys plus an
    // unmistakably open fifth-floor rooftop deck. The roof pool/parapet lives
    // in floor5Group at y=12.8; tall facade walls must not hide it from outside.
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x252d34, metalness: 0.65, roughness: 0.35 });
    const windowGlassMat = new THREE.MeshStandardMaterial({ color: 0x8ed8e8, metalness: 0.35, roughness: 0.12, transparent: true, opacity: 0.48, side: THREE.DoubleSide });
    for (let level = 0; level < 4; level++) {
      const y = level * 3.2 + 1.75;
      // Two front-facing window bays per enclosed floor, positioned clear of the entrance.
      for (const x of [-4.5, 4.5]) {
        const pane = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.35, 0.07), windowGlassMat);
        pane.position.set(x, y, -7.075);
        const frame = new THREE.Mesh(new THREE.BoxGeometry(2.18, 1.5, 0.12), windowFrameMat);
        frame.position.set(x, y, -7.12);
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.35, 0.14), windowFrameMat);
        mullion.position.set(x, y, -7.13);
        this.southWallMesh.add(frame, pane, mullion);
      }
      // Repeated side windows make all four enclosed levels readable in silhouette.
      for (const side of [-1, 1]) {
        for (const z of [-4.2, 0, 4.2]) {
          const pane = new THREE.Mesh(new THREE.BoxGeometry(0.07, 1.25, 1.8), windowGlassMat);
          pane.position.set(side * 8.075, y, z);
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.42, 1.94), windowFrameMat);
          frame.position.set(side * 8.12, y, z);
          (side < 0 ? this.westWallMesh : this.eastWallMesh).add(frame, pane);
        }
      }
    }
  }

  // ==========================================
  // ENCLOSED RESIDENTIAL PROPERTY + BACKYARD POOL
  // ==========================================
  private buildEnclosedProperty() {
    const property = new THREE.Group();
    property.name = 'apartment_enclosed_residential_compound';
    this.group.add(property);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x777d82, roughness: 0.88 });
    const capMat = new THREE.MeshStandardMaterial({ color: 0x343a40, roughness: 0.55, metalness: 0.35 });
    const pavingMat = new THREE.MeshStandardMaterial({ color: 0xaaa9a2, roughness: 0.92 });
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x496b3b, roughness: 1 });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x202a32, metalness: 0.78, roughness: 0.32 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x16a9c7, roughness: 0.08, metalness: 0.12, transparent: true, opacity: 0.82 });

    // Yard is a visual surface only; terrain remains the authoritative ground collider.
    const lawn = new THREE.Mesh(new THREE.PlaneGeometry(37, 48), grassMat);
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(0, 0.025, 2.5);
    lawn.receiveShadow = true;
    property.add(lawn);

    const path = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 17), pavingMat);
    path.position.set(0, 0.09, -13.0);
    path.receiveShadow = true;
    property.add(path);

    const wallH = 3.8;
    const wallT = 0.65;
    const wallY = wallH / 2;
    const addWall = (name: string, x: number, z: number, w: number, d: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
      mesh.name = name;
      mesh.position.set(x, wallY, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      property.add(mesh);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.22, d + 0.12), capMat);
      cap.position.set(x, wallH + 0.1, z);
      property.add(cap);
    };

    // Continuous, fortified perimeter guard walls:
    // West & East side walls stretch from Front (Z = -22.0) to Rear (Z = +29.5), total length 51.5m, center Z = 3.75.
    addWall('compound_wall_west', -19.0, 3.75, wallT, 51.5);
    addWall('compound_wall_east', 19.0, 3.75, wallT, 51.5);
    // Rear north guard wall seamlessly connects west and east walls at Z = 29.5, width 38.65m.
    addWall('compound_wall_rear', 0, 29.5, 38.65, wallT);

    // Front perimeter wall boundary with exactly one vehicle main gate + two pedestrian doors.
    addWall('compound_wall_front_left_outer', -15.86, -22.0, 6.28, wallT);
    addWall('compound_wall_front_left_inner', -6.915, -22.0, 8.73, wallT);
    addWall('compound_wall_front_right_inner', 6.915, -22.0, 8.73, wallT);
    addWall('compound_wall_front_right_outer', 15.86, -22.0, 6.28, wallT);

    // Corner security watchtower pillars
    const cornerPositions = [
      [-19.0, -22.0], [19.0, -22.0],
      [-19.0, 29.5], [19.0, 29.5]
    ];
    for (const [cx, cz] of cornerPositions) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.4, 1.1), capMat);
      pillar.position.set(cx, 2.2, cz);
      pillar.castShadow = true;
      property.add(pillar);
      const pLamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.25, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x1d4ed8, emissiveIntensity: 0.6 })
      );
      pLamp.position.set(cx, 4.52, cz);
      property.add(pLamp);
    }

    // Reinforced main gate pillars
    for (const x of [-2.8, 2.8]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.95, 4.4, 0.95), capMat);
      post.position.set(x, 2.2, -22.0);
      post.castShadow = true;
      property.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.25, 0.48), new THREE.MeshStandardMaterial({ color: 0xffd58a, emissive: 0x8a5418, emissiveIntensity: 0.55 }));
      lamp.position.set(x, 4.52, -22.0);
      property.add(lamp);
    }

    // Pedestrian door pillars
    for (const x of [-12.85, -11.15, 11.15, 12.85]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.75, 4.2, 0.8), capMat);
      post.position.set(x, 2.1, -22.0);
      post.castShadow = true;
      property.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.38), new THREE.MeshStandardMaterial({ color: 0x86efac, emissive: 0x15803d, emissiveIntensity: 0.5 }));
      lamp.position.set(x, 4.3, -22.0);
      property.add(lamp);
    }

    this.compoundGateGroup = new THREE.Group();
    this.compoundGateGroup.name = 'compound_double_access_gate';
    this.compoundGateGroup.position.set(0, 1.75, -22.0);
    this.compoundGateLeftLeaf = new THREE.Group();
    this.compoundGateLeftLeaf.position.x = -2.55;
    this.compoundGateRightLeaf = new THREE.Group();
    this.compoundGateRightLeaf.position.x = 2.55;
    const makeLeaf = (pivot: THREE.Group, sign: number) => {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.55, 3.4, 0.22), gateMat);
      panel.position.x = sign * 1.275;
      panel.castShadow = true;
      panel.receiveShadow = true;
      pivot.add(panel);
      for (let i = 0; i < 5; i++) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.45, 0.26), capMat);
        bar.position.x = sign * (0.3 + i * 0.48);
        pivot.add(bar);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.14, 0.28), capMat);
      rail.position.set(sign * 1.275, 0.95, 0);
      pivot.add(rail);
    };
    makeLeaf(this.compoundGateLeftLeaf, 1);
    makeLeaf(this.compoundGateRightLeaf, -1);
    this.compoundGateGroup.add(this.compoundGateLeftLeaf, this.compoundGateRightLeaf);
    property.add(this.compoundGateGroup);

    // Two secure pedestrian access doors. Both start closed and only become
    // traversable when their matching collider is explicitly opened.
    const makePedestrianDoor = (x: number, side: 'left' | 'right') => {
      const hinge = new THREE.Group();
      hinge.name = `compound_pedestrian_door_${side}`;
      hinge.position.set(x - 0.72, 0, -22.0);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.44, 3.2, 0.18), gateMat);
      leaf.position.set(0.72, 1.6, 0);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      hinge.add(leaf);
      for (let y = 0.5; y < 3.0; y += 0.8) {
        const brace = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.24), capMat);
        brace.position.set(0.72, y, 0);
        hinge.add(brace);
      }
      property.add(hinge);
      return hinge;
    };
    this.compoundPedestrianDoorLeft = makePedestrianDoor(-12.0, 'left');
    this.compoundPedestrianDoorRight = makePedestrianDoor(12.0, 'right');

    // Backyard pool sits BEHIND the apartment (positive local Z), at ground level.
    const pool = new THREE.Group();
    pool.name = 'backyard_swimming_pool';
    pool.position.set(0, 0, 21.5);
    property.add(pool);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(15.5, 0.16, 12.5), pavingMat);
    deck.position.y = 0.08;
    deck.receiveShadow = true;
    pool.add(deck);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x315a68, roughness: 0.42 });
    const basin = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.55, 8.8), basinMat);
    basin.position.y = 0.16;
    pool.add(basin);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(9.9, 7.9), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.48;
    water.receiveShadow = true;
    pool.add(water);
    this.backyardPoolWaterMesh = water;

    // Pool coping and shallow steps; open centre remains available for swimming.
    const copingMat = new THREE.MeshStandardMaterial({ color: 0xe2ded4, roughness: 0.7 });
    const coping = [
      [0, 0.48, -4.45, 11.3, 0.35, 0.42], [-3.4, 0.48, 4.45, 4.5, 0.35, 0.42], [3.4, 0.48, 4.45, 4.5, 0.35, 0.42],
      [-5.45, 0.48, 0, 0.42, 0.35, 8.8], [5.45, 0.48, 0, 0.42, 0.35, 8.8],
    ];
    for (const [x,y,z,w,h,d] of coping) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), copingMat);
      edge.position.set(x,y,z);
      edge.castShadow = true;
      pool.add(edge);
    }
    const steps = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.18, 1.2), copingMat);
    steps.position.set(-4.1, 0.28, 3.6);
    pool.add(steps);
    for (let i = 0; i < 3; i++) {
      const entryStep = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.16, 0.55), copingMat);
      entryStep.position.set(0, 0.16 + i * 0.14, 4.9 - i * 0.48);
      pool.add(entryStep);
    }

    // Poolside loungers and low garden lights make the rear yard readable and usable.
    const loungerMat = new THREE.MeshStandardMaterial({ color: 0xf0eee8, roughness: 0.72 });
    for (const x of [-6.1, 6.1]) {
      const lounger = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.22, 2.4), loungerMat);
      lounger.position.set(x, 0.28, 21.5);
      lounger.rotation.y = x < 0 ? 0.12 : -0.12;
      lounger.castShadow = true;
      property.add(lounger);
      const light = new THREE.PointLight(0x8bdfff, 0.75, 9, 1.8);
      light.position.set(x * 1.35, 1.0, 21.5);
      property.add(light);
      this.floorLights.push(light);
    }
      
    // Backyard stone patio and paved walkways connecting rear sliding doors directly to garage & pool
    const backyardPatio = new THREE.Mesh(new THREE.BoxGeometry(22.0, 0.12, 12.0), pavingMat);
    backyardPatio.position.set(-3.5, 0.06, 11.5);
    backyardPatio.receiveShadow = true;
    property.add(backyardPatio);

    const garageDriveway = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.12, 10.0), pavingMat);
    garageDriveway.position.set(-12.5, 0.06, 8.5);
    garageDriveway.receiveShadow = true;
    property.add(garageDriveway);

    // Secure Solid Private Garage in the Backyard (local X = -12.5, Z = 14.5)
    // Houses drivable vehicles (SUV, Sedan, ATV, Motorbike, Bicycle)
    const garage = new THREE.Group();
    garage.name = 'apartment_private_garage';
    garage.position.set(-12.5, 0, 14.5);
    property.add(garage);

    const garageWall = new THREE.MeshStandardMaterial({ color: 0xb8bdc1, roughness: 0.82 });
    const garageDark = new THREE.MeshStandardMaterial({ color: 0x30383f, metalness: 0.55, roughness: 0.4 });
    const garageFloor = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.12, 9.5), pavingMat);
    garageFloor.position.y = 0.06;
    garage.add(garageFloor);

    // Solid concrete perimeter walls: West wall, East wall, North rear wall
    for (const [x, z, w, d] of [
      [-4.2, 0, 0.25, 9.5], // West solid wall
      [4.2, 0, 0.25, 9.5],  // East solid wall
      [0, 4.7, 8.5, 0.25],  // North solid rear wall
      [-3.4, -4.7, 1.7, 0.25], // South wall left pillar
      [3.4, -4.7, 1.7, 0.25],  // South wall right pillar
      [0, -4.7, 5.1, 0.45],    // South wall upper lintel
    ] as [number, number, number, number][]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(w, z === -4.7 && w === 5.1 ? 0.6 : 3.0, d), garageWall);
      wall.position.set(x, z === -4.7 && w === 5.1 ? 2.9 : 1.5, z);
      wall.castShadow = true;
      garage.add(wall);
    }

    // Heavy reinforced garage roof
    const roof = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.25, 9.8), garageDark);
    roof.position.set(0, 3.25, 0);
    garage.add(roof);

    // Large roll-up shutter gate facing South toward the driveway (Z = -4.7)
    this.garageShutterGroup = new THREE.Group();
    this.garageShutterGroup.name = 'interactive_garage_shutter';
    this.garageShutterGroup.position.set(0, this.garageShutterOpen ? 2.65 : 0, -4.7);
    garage.add(this.garageShutterGroup);

    const shutter = new THREE.Mesh(new THREE.BoxGeometry(5.1, 2.55, 0.12), garageDark);
    shutter.position.set(0, 1.35, 0);
    this.garageShutterGroup.add(shutter);

    for (let slat = 0; slat < 12; slat++) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.035, 0.035), capMat);
      line.position.set(0, 0.25 + slat * 0.19, 0.08);
      this.garageShutterGroup.add(line);
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
    this.turrets?.update(delta, zombieMgr || null, wildlifeMgr || null, playerPos);
    this.basementRoom?.update(delta, aiTrainMgr || null);
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

    const isInsideBuilding = Math.abs(relX) < 8.2 && Math.abs(relZ) < 7.2 && relY >= -3.5 && relY <= 17.0;

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

    // Relocated backyard private garage roll-up shutter (local X = -12.5, Z = 9.8)
    if (Math.hypot(relX - (-12.5), relZ - 9.8) < 4.5 && relY < 3.2) {
      return { id: 'garageDoor', label: 'Private Garage Shutter', prompt: `Press [E] to ${this.garageShutterOpen ? 'Lower' : 'Raise'} Garage Shutter Door` };
    }
    // Outer double gate and backyard pool are outside the apartment footprint.
    if (Math.abs(relX) < 4.2 && Math.abs(relZ + 22) < 2.8 && relY < 3.2) {
      return { id: 'compoundGate', label: 'Residential Compound Double Gate', prompt: `Press [E] to ${this.compoundGateOpen ? 'Close' : 'Open'} Property Gate` };
    }
    if (Math.abs(relX + 12.0) < 2.0 && Math.abs(relZ + 22) < 2.2 && relY < 3.0) {
      return { id: 'compoundDoorLeft', label: 'West Perimeter Pedestrian Door', prompt: `Press [E] to ${this.compoundPedestrianDoorsOpen[0] ? 'Close' : 'Open'} Pedestrian Door` };
    }
    if (Math.abs(relX - 12.0) < 2.0 && Math.abs(relZ + 22) < 2.2 && relY < 3.0) {
      return { id: 'compoundDoorRight', label: 'East Perimeter Pedestrian Door', prompt: `Press [E] to ${this.compoundPedestrianDoorsOpen[1] ? 'Close' : 'Open'} Pedestrian Door` };
    }
    if (Math.abs(relX) < 5.8 && relZ > 16.0 && relZ < 27.0 && relY < 2.2) {
      return { id: 'backyardPool', label: 'Backyard Swimming Pool', prompt: 'Press [E] to Enter Backyard Swimming Pool' };
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
    ctx.fillText('● DEFENSE SENTRIES: DUAL 30MM CANNONS ARMED', 20, 185);

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
    ctx.fillText('Garage Vehicles: 5 READY', 28, 340);
    ctx.fillText('  - Aegis Enforcer SUV', 28, 370);
    ctx.fillText('  - Vanguard GT Sedan', 28, 395);
    ctx.fillText('  - Predator Quad ATV', 28, 420);
    ctx.fillText('  - Phantom Enduro 650', 28, 445);

    // Right Panel: Turret Telemetry
    ctx.strokeRect(w - 266, 68, 250, 410);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 16px monospace';
    ctx.fillText('DEFENSIVE TURRETS', w - 254, 96);

    const telemetry = this.turrets?.getTurretsTelemetry() || [];
    const tL = telemetry.find(t => t.id === 'turret_left') || { ammo: 485, maxAmmo: 500, killsCount: 4, isLockedOn: false };
    const tR = telemetry.find(t => t.id === 'turret_right') || { ammo: 492, maxAmmo: 500, killsCount: 7, isLockedOn: false };

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '13px monospace';
    ctx.fillText('Sentry Alpha (West):', w - 254, 130);
    ctx.fillText(`  Ammo: ${tL.ammo}/${tL.maxAmmo}`, w - 254, 155);
    ctx.fillText(`  Kills: ${tL.killsCount}  Lock: ${tL.isLockedOn ? 'YES' : 'NO'}`, w - 254, 180);

    ctx.fillText('Sentry Bravo (East):', w - 254, 220);
    ctx.fillText(`  Ammo: ${tR.ammo}/${tR.maxAmmo}`, w - 254, 245);
    ctx.fillText(`  Kills: ${tR.killsCount}  Lock: ${tR.isLockedOn ? 'YES' : 'NO'}`, w - 254, 270);

    ctx.fillText('Gate Status:', w - 254, 320);
    ctx.fillText(`  Main Gate: ${this.compoundGateOpen ? 'OPEN' : 'CLOSED'}`, w - 254, 345);
    ctx.fillText(`  Garage: ${this.garageShutterOpen ? 'RAISED' : 'LOWERED'}`, w - 254, 370);
    ctx.fillText(`  Front Door: ${this.state.doorOpen ? 'OPEN' : 'CLOSED'}`, w - 254, 395);
    ctx.fillText(`  Rear Patio: ${this.patioDoorOpen ? 'OPEN' : 'CLOSED'}`, w - 254, 420);

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
    ctx.fillText('[08:32:00] Dual 30mm Perimeter Sentries ONLINE. RoE: HOSTILE ENGAGEMENT.', 28, 530);
    ctx.fillText('[08:34:15] Potable water filtration manifolds pressurised at 4.2 bar. All 5 garage vehicles operational.', 28, 548);
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
    if (hinge) hinge.rotation.y = this.compoundPedestrianDoorsOpen[index] ? (side === 'left' ? -Math.PI / 2 : Math.PI / 2) : 0;
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState(`apt_compound_door_${side}`, this.compoundPedestrianDoorsOpen[index]);
    soundEngine.playGateToggle(this.compoundPedestrianDoorsOpen[index]);
    return this.compoundPedestrianDoorsOpen[index];
  }

  /** Access points used by companion navigation. A closed access point is never selected. */
  public getOpenCompoundAccessPoints(): THREE.Vector3[] {
    const ox = this.origin.x;
    const oz = this.origin.z;
    const points: THREE.Vector3[] = [];
    if (this.compoundGateOpen) points.push(new THREE.Vector3(ox, 0, oz - 22));
    if (this.compoundPedestrianDoorsOpen[0]) points.push(new THREE.Vector3(ox - 12, 0, oz - 22));
    if (this.compoundPedestrianDoorsOpen[1]) points.push(new THREE.Vector3(ox + 12, 0, oz - 22));
    return points;
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

    // Mansion front entrance: both leaves must be open for traversal.
    if (fromInBuilding !== toInBuilding && this.state.doorOpen) {
      const insideZ = buildingFrontZ + 1.15;
      const outsideZ = buildingFrontZ - 1.15;
      return new THREE.Vector3(ox, Math.max(0, getTerrainHeight(ox, fromInBuilding ? outsideZ : insideZ)), fromInBuilding ? outsideZ : insideZ);
    }

    const boundaryZ = oz - 22;
    const fromInsideCompound = from.z > boundaryZ;
    const toInsideCompound = to.z > boundaryZ;
    if (fromInsideCompound !== toInsideCompound) {
      const openPoints = this.getOpenCompoundAccessPoints();
      if (openPoints.length === 0) return null;
      openPoints.sort((a, b) => Math.hypot(a.x - from.x, a.z - from.z) - Math.hypot(b.x - from.x, b.z - from.z));
      const access = openPoints[0];
      const crossZ = boundaryZ + (fromInsideCompound ? -1.1 : 1.1);
      return new THREE.Vector3(access.x, getTerrainHeight(access.x, crossZ), crossZ);
    }
    return null;
  }

  public toggleGarageShutter(): boolean {
    this.garageShutterOpen = !this.garageShutterOpen;
    if (this.garageShutterGroup) this.garageShutterGroup.position.y = this.garageShutterOpen ? 2.65 : 0;
    UnifiedPhysicsManager.getInstance()?.setDoorOpenState('apt_garage_shutter', this.garageShutterOpen);
    soundEngine.playGateToggle(this.garageShutterOpen);
    return this.garageShutterOpen;
  }

  public isCompoundGateOpen(): boolean { return this.compoundGateOpen; }
  public isFrontDoorOpen(): boolean { return this.state.doorOpen; }

  public checkPlayerInPool(playerPos: THREE.Vector3): boolean {
    // Rooftop is a solid dry terrace; only the backyard pool is swimmable.
    const inRoofPool = playerPos.x >= this.origin.x - 5.5 && playerPos.x <= this.origin.x + 0.5 && playerPos.z >= this.origin.z - 2.8 && playerPos.z <= this.origin.z + 2.8 && playerPos.y >= 11.2 && playerPos.y <= 14.0;
    const backyard = this.backyardPoolBounds;
    const inBackyardPool = playerPos.x >= this.origin.x + backyard.minX && playerPos.x <= this.origin.x + backyard.maxX &&
      playerPos.z >= this.origin.z + backyard.minZ && playerPos.z <= this.origin.z + backyard.maxZ &&
      playerPos.y >= backyard.minY && playerPos.y <= backyard.maxY + 1.2;
    return inRoofPool || inBackyardPool;
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
    physMgr.registerBoxCollider('apt_wall_west', 'wall', [ox - 7.8, 6.4, oz], 0.6, 12.8, 14.0);
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
    // Backyard private garage solid walls and roll-up shutter
    physMgr.registerBoxCollider('apt_garage_wall_w', 'wall', [ox - 16.7, 1.5, oz + 14.5], 0.25, 3.0, 9.5);
    physMgr.registerBoxCollider('apt_garage_wall_e', 'wall', [ox - 8.3, 1.5, oz + 14.5], 0.25, 3.0, 9.5);
    physMgr.registerBoxCollider('apt_garage_wall_n', 'wall', [ox - 12.5, 1.5, oz + 19.2], 8.5, 3.0, 0.25);
    physMgr.registerBoxCollider(
      'apt_garage_shutter',
      'wall',
      [ox - 12.5, 1.35, oz + 9.8],
      5.1,
      2.55,
      0.18,
      0,
      this.garageShutterOpen
    );

    // 2. Rooftop pool basin walls. The water surface is a swim zone;
    // the dry deck remains supported at y=9.9 by PlayerController.
    physMgr.registerBoxCollider('apt_pool_rim_n', 'wall', [ox - 2.5, 12.2, oz - 2.92], 6.0, 1.9, 0.22);
    physMgr.registerBoxCollider('apt_pool_rim_w', 'wall', [ox - 5.42, 12.2, oz], 0.22, 1.9, 6.0);
    physMgr.registerBoxCollider('apt_pool_rim_e', 'wall', [ox + 0.42, 12.2, oz], 0.22, 1.9, 6.0);
    physMgr.registerBoxCollider('apt_pool_rim_s_l', 'wall', [ox - 3.65, 12.2, oz + 2.92], 3.7, 1.9, 0.22);
    physMgr.registerBoxCollider('apt_pool_rim_s_r', 'wall', [ox - 0.15, 12.2, oz + 2.92], 1.15, 1.9, 0.22);

    // 3. Fully enclosed residential compound. The front wall has a 5.1m double-gate opening.
    physMgr.registerBoxCollider('apt_compound_wall_west', 'wall', [ox - 19.0, 1.9, oz + 5.0], 0.9, 3.8, 54.8);
    physMgr.registerBoxCollider('apt_compound_wall_east', 'wall', [ox + 19.0, 1.9, oz + 5.0], 0.9, 3.8, 54.8);
    physMgr.registerBoxCollider('apt_compound_wall_rear', 'wall', [ox, 1.9, oz + 32.0], 39.2, 3.8, 0.9);
    physMgr.registerBoxCollider('apt_compound_wall_front_left_outer', 'wall', [ox - 15.86, 1.9, oz - 22.0], 6.6, 3.8, 0.9);
    physMgr.registerBoxCollider('apt_compound_wall_front_left_inner', 'wall', [ox - 6.915, 1.9, oz - 22.0], 9.0, 3.8, 0.9);
    physMgr.registerBoxCollider('apt_compound_wall_front_right_inner', 'wall', [ox + 6.915, 1.9, oz - 22.0], 9.0, 3.8, 0.9);
    physMgr.registerBoxCollider('apt_compound_wall_front_right_outer', 'wall', [ox + 15.86, 1.9, oz - 22.0], 6.6, 3.8, 0.9);
    physMgr.registerBoxCollider('apt_compound_gate', 'wall', [ox, 1.65, oz - 22.0], 5.1, 3.15, 0.28, 0, this.compoundGateOpen);
    // Two independently operable pedestrian doors in the same perimeter wall.
    physMgr.registerBoxCollider('apt_compound_door_left', 'wall', [ox - 12.0, 1.55, oz - 22.0], 1.55, 3.0, 0.24, 0, this.compoundPedestrianDoorsOpen[0]);
    physMgr.registerBoxCollider('apt_compound_door_right', 'wall', [ox + 12.0, 1.55, oz - 22.0], 1.55, 3.0, 0.24, 0, this.compoundPedestrianDoorsOpen[1]);

    // Backyard pool edge blockers. The water surface remains open for swimming.
    physMgr.registerBoxCollider('apt_backyard_pool_n', 'wall', [ox, 0.42, oz + 17.05], 11.2, 0.7, 0.45);
    physMgr.registerBoxCollider('apt_backyard_pool_s_l', 'wall', [ox - 3.4, 0.42, oz + 25.95], 4.5, 0.7, 0.45);
    physMgr.registerBoxCollider('apt_backyard_pool_s_r', 'wall', [ox + 3.4, 0.42, oz + 25.95], 4.5, 0.7, 0.45);
    physMgr.registerBoxCollider('apt_backyard_pool_w', 'wall', [ox - 5.55, 0.42, oz + 21.5], 0.45, 0.7, 8.9);
    physMgr.registerBoxCollider('apt_backyard_pool_e', 'wall', [ox + 5.55, 0.42, oz + 21.5], 0.45, 0.7, 8.9);

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
      const z = -4.2 + i * 4.2;
      physMgr.registerBoxCollider(`apt_medical_exam_table_${i}`, 'prop', [ox + 5.6, medicalY + 0.55, oz + z], 1.8, 0.82, 0.85);
      physMgr.registerBoxCollider(`apt_medical_exam_cabinet_${i}`, 'prop', [ox + 7.0, medicalY + 0.9, oz + z], 0.8, 1.6, 0.65);
    }
    for (let i = 0; i < 5; i++) {
      physMgr.registerBoxCollider(`apt_medical_supply_cabinet_${i}`, 'prop', [ox - 5.8 + i * 2.6, medicalY + 1.15, oz + 6.0], 1.05, 2.0, 0.55);
    }
    physMgr.registerBoxCollider('apt_medical_operating_table', 'prop', [ox + 5.5, medicalY + 0.72, oz + 2.0], 2.0, 0.55, 1.0);
    physMgr.registerBoxCollider('apt_medical_diagnostic_machine', 'prop', [ox + 5.9, medicalY + 0.95, oz - 1.0], 1.0, 1.35, 0.8);
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
    physMgr.registerCylinderCollider('apt_raw_water_tank_large', 'prop', [ox + 5.25, farmY + 0.20, oz - 4.05], 1.08, 2.75);
    physMgr.registerCylinderCollider('apt_treated_water_tank_large', 'prop', [ox + 5.25, farmY + 0.20, oz - 1.35], 1.08, 2.75);
    physMgr.registerBoxCollider('apt_large_water_treatment_plant', 'prop', [ox + 3.85, farmY + 1.2, oz + 1.95], 4.9, 2.4, 2.45);
    physMgr.registerBoxCollider('apt_large_backup_generator', 'prop', [ox + 1.28, farmY + 1.05, oz + 5.05], 4.0, 1.96, 2.15);
    physMgr.registerCylinderCollider('apt_generator_fuel_reservoir', 'prop', [ox + 5.65, farmY + 0.145, oz + 5.05], 0.76, 1.95);
    physMgr.registerBoxCollider('apt_farm_electrical_cabinet', 'prop', [ox + 7.05, farmY + 1.18, oz + 0.15], 1.1, 2.05, 0.62);
    for (let i = 0; i < 3; i++) {
      physMgr.registerBoxCollider(`apt_farm_supply_crate_${i}`, 'prop', [ox - 1.0 + i * 1.1, farmY + 0.58, oz + 5.35], 0.95, 0.9, 0.9);
    }
  }

  public dispose() {
    this.turrets?.dispose();
    this.basementRoom?.dispose();
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
