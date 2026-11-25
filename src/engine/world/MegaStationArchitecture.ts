import * as THREE from 'three';
import { soundEngine } from '../../utils/audio';
import { stationPlacementValidator, StationMountingType } from './StationPlacementValidator';
import {
  getBrushedMetalPBR,
  getConcretePBR,
  getMarbleTilePBR,
  getSandstonePBR,
  getWaterRippleNormalMap,
  getWoodPBR,
} from '../../utils/proceduralTextures';

export interface MegaStationBuildOptions {
  stationIndex: number;
  stationX: number;
  hallZ: number;
  baseY: number;
  platformTrackZs: number[];
  trackSurfaceY: (x: number, z: number) => number;
  railMaterial: THREE.Material;
  chromeMat: THREE.Material;
  floorMat: THREE.Material;
  doorMaterial: THREE.Material;
  windowMaterial: THREE.Material;
  wheelMaterial: THREE.Material;
  ballastMaterial: THREE.Material;
  seatFabricMat: THREE.Material;
  seatDiningMat: THREE.Material;
  seatLoungeMat: THREE.Material;
}

export interface LiveStationScheduleRow {
  number: string;
  name: string;
  platform: string;
  eta: string;
  status: string;
  color: string;
}

export interface StationNearbyFacilityAction {
  type:
    | 'tvm'
    | 'counter'
    | 'water_tap'
    | 'toilet_flush'
    | 'medical_aid'
    | 'food_stall'
    | 'helipad_console'
    | 'digital_locker'
    | 'charging_totem'
    | 'help_desk'
    | 'rpf_console'
    | 'command_console'
    | 'bookstall'
    | 'lounge_seat'
    | 'cubicle_door'
    | 'security_xray'
    | 'e_gate'
    | 'boom_barrier'
    | 'fountain_refresh'
    | 'transit_hub';
  label: string;
  prompt: string;
  facilityId?: string;
}

export interface StationActionResult {
  handled: boolean;
  message?: string;
  rewardItem?: string;
  rewardQty?: number;
  healthDelta?: number;
  hungerDelta?: number;
  thirstDelta?: number;
  staminaDelta?: number;
  openOperations?: boolean;
  announceLive?: boolean;
}

export interface MegaStationInstance {
  group: THREE.Group;
  update: (delta: number, playerPos: THREE.Vector3, liveScheduleRows?: LiveStationScheduleRow[]) => void;
  getLiftCabinY: (liftIndex: number) => number | null;
  requestLiftFloor: (liftIndex: number, floor: 0 | 1 | 2) => boolean;
  getFacilityCoordinates: (facilityType: string) => THREE.Vector3 | null;
  getNearbyInteractiveAction: (playerPos: THREE.Vector3, maxDistance?: number) => StationNearbyFacilityAction | null;
  executeInteractiveAction: (playerPos: THREE.Vector3, type: StationNearbyFacilityAction['type']) => StationActionResult;
  triggerWaterTap: (pos: THREE.Vector3) => boolean;
  triggerToiletFlush: (pos: THREE.Vector3) => boolean;
  dispose: () => void;
}

/**
 * Combined Ultimate Mega Railway Station Architecture System.
 *
 * Combines:
 * 1. Monumental Indo-Saracenic Heritage & Glass Aerotropolis Hybrid Exterior
 * 2. Full 4-Bay Vaulted Steel-and-Glass Trainshed spanning all 8 Island Platforms
 * 3. Fortified Sanctuary Forecourt Multi-Modal Transport Hub (3-Tier Fountain,
 *    Detailed Auto-Rickshaws, Low-Floor Electric Buses, RPF Security Gatehouse)
 * 4. Walkable 4-Level + Dual Skywalk + Central Over-Track Air-Concourse Bridge
 * 5. Animated Moving Escalators (West & East Cores), Rooftop Helipad & Solar Terrace
 * 6. Usable Washrooms (Men's, Women's, Accessible), Medical Clinic, RPF CCTV Control,
 *    IRCTC Food Court, Retail Mall, Executive AC Lounge, and Command Gallery
 * 7. 100% Geometry & Placement Verification via StationPlacementValidator
 */
export class MegaStationArchitecture {
  public static build(options: MegaStationBuildOptions): MegaStationInstance {
    const {
      stationIndex,
      stationX: x,
      hallZ,
      baseY: y,
      platformTrackZs,
      trackSurfaceY,
      chromeMat,
      floorMat,
      seatDiningMat,
      seatLoungeMat,
    } = options;

    const group = new THREE.Group();
    group.name = `MEGA_STATION_CENTRAL_${stationIndex}`;
    stationPlacementValidator.clear(stationIndex);

    // Deterministic flat architectural floor surface elevations
    const floor0Y = y + 0.27;   // Level 0: Ground Concourse
    const floor1Y = y + 4.70;   // Level 1: Mezzanine Food Court, Retail & VIP Lounge
    const floor3Y = y + 9.80;   // Level 3: Dual Skywalks & Over-Track Air Concourse
    const floor4Y = y + 14.50;  // Level 4: Rooftop Helipad & Solar Sanctuary Terrace

    const floorHeightsMap: Record<number, number> = {
      0: floor0Y,
      1: floor1Y,
      2: floor1Y,
      3: floor3Y,
      4: floor4Y,
    };

    // Shared High-Realism PBR Palette Materials (identical geometry/placements, rich micro-detail)
    const wallConcrete = getConcretePBR(0xcbd5e1);
    const darkConcrete = getConcretePBR(0x1e293b);
    const redSandstone = getSandstonePBR(0x9e382b);
    const buffSandstone = getSandstonePBR(0xd8b58a);
    const jaaliSandstone = getSandstonePBR(0xf1e3cd);
    const brassMetal = getBrushedMetalPBR(0xc9a84c);
    const copperMetal = getBrushedMetalPBR(0x3b8c75);
    const steelBrushed = getBrushedMetalPBR(0x64748b);
    const marbleTile = getMarbleTilePBR(0xf8fafc);
    const woodPBR = getWoodPBR();
    const waterNormal = getWaterRippleNormalMap();

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: wallConcrete.albedo,
      normalMap: wallConcrete.normal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap: wallConcrete.roughness,
      roughness: 0.78,
    });
    const darkWallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkConcrete.albedo,
      normalMap: darkConcrete.normal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: darkConcrete.roughness,
      metalness: 0.34,
      roughness: 0.56,
    });
    const charcoalMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.48, roughness: 0.42 });
    const redSandstoneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: redSandstone.albedo,
      normalMap: redSandstone.normal,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: redSandstone.roughness,
      roughness: 0.84,
    });
    const buffSandstoneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: buffSandstone.albedo,
      normalMap: buffSandstone.normal,
      normalScale: new THREE.Vector2(0.75, 0.75),
      roughnessMap: buffSandstone.roughness,
      roughness: 0.78,
    });
    const jaaliMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: jaaliSandstone.albedo,
      normalMap: jaaliSandstone.normal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: jaaliSandstone.roughness,
      roughness: 0.66,
    });
    const domeBrassMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: brassMetal.albedo,
      normalMap: brassMetal.normal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: brassMetal.roughness,
      metalness: 0.84,
      roughness: 0.26,
    });
    const domeCopperMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: copperMetal.albedo,
      normalMap: copperMetal.normal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: copperMetal.roughness,
      metalness: 0.58,
      roughness: 0.44,
    });
    const blueSignMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.28, emissive: 0x0284c7, emissiveIntensity: 0.85 });
    const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x15803d, emissiveIntensity: 0.45 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0x991b1b, emissiveIntensity: 0.4 });
    const amberMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.55 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa5e3f2,
      metalness: 0.14,
      roughness: 0.08,
      envMapIntensity: 1.5,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    const skylightGlassMat = new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.12,
      roughness: 0.10,
      envMapIntensity: 1.45,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1fb2e6,
      roughness: 0.06,
      metalness: 0.22,
      envMapIntensity: 1.6,
      normalMap: waterNormal,
      normalScale: new THREE.Vector2(0.55, 0.55),
      transparent: true,
      opacity: 0.85,
    });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.65 });
    const tileMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: marbleTile.albedo,
      normalMap: marbleTile.normal,
      normalScale: new THREE.Vector2(0.4, 0.4),
      roughnessMap: marbleTile.roughness,
      roughness: 0.3,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xc89a6e,
      map: woodPBR.albedo,
      normalMap: woodPBR.normal,
      normalScale: new THREE.Vector2(0.65, 0.65),
      roughnessMap: woodPBR.roughness,
      roughness: 0.78,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: steelBrushed.albedo,
      normalMap: steelBrushed.normal,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: steelBrushed.roughness,
      metalness: 0.88,
      roughness: 0.24,
    });
    const solarPanelMat = new THREE.MeshStandardMaterial({
      color: 0x172554,
      metalness: 0.78,
      roughness: 0.16,
      envMapIntensity: 1.4,
    });
    const warmLightMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });
    const rubberMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const sandbagMat = new THREE.MeshStandardMaterial({ color: 0x8c7b5b, roughness: 0.92 });
    const mirrorMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.96, roughness: 0.04, envMapIntensity: 1.6 });

    const externalSharedMats = new Set<THREE.Material>([chromeMat, floorMat, seatDiningMat, seatLoungeMat]);

    let boxCounter = 0;

    // Builder Helper with Automatic Placement Validator Registration
    const addBox = (
      name: string,
      w: number,
      h: number,
      d: number,
      px: number,
      py: number,
      pz: number,
      material: THREE.Material,
      zone: string = 'General',
      floorLevel: 0 | 1 | 2 | 3 | 4 = 0,
      category: 'structural' | 'furniture' | 'amenity' | 'plumbing' | 'security' | 'signage' | 'door' | 'transit' = 'structural',
      isSolid: boolean = true,
      castShadow: boolean = true,
      mounting?: StationMountingType
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
      mesh.name = name;
      mesh.position.set(px, py, pz);
      mesh.castShadow = castShadow && (category === 'structural' || category === 'transit');
      mesh.receiveShadow = true;
      group.add(mesh);

      const expFloorY = floorHeightsMap[floorLevel] ?? floor0Y;
      const bottomY = py - h * 0.5;
      const determinedMounting: StationMountingType =
        mounting ??
        (Math.abs(bottomY - expFloorY) <= 0.09
          ? 'floor'
          : category === 'signage'
            ? 'wall'
            : 'surface');

      boxCounter++;
      stationPlacementValidator.registerObject(
        `${name}_${stationIndex}_${boxCounter}`,
        name,
        zone,
        floorLevel,
        new THREE.Vector3(px, py, pz),
        new THREE.Vector3(w, h, d),
        category,
        isSolid,
        determinedMounting,
        stationIndex
      );

      return mesh;
    };

    const addTextBoard = (
      label: string,
      px: number,
      py: number,
      pz: number,
      w = 5.2,
      h = 0.95,
      zone = 'Signage',
      floorLevel: 0 | 1 | 2 | 3 | 4 = 0,
      opts?: { bg?: string; border?: string; fg?: string; rotY?: number }
    ) => {
      let mat: THREE.Material;
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(1024, Math.max(256, Math.round(w * 80)));
        canvas.height = Math.min(256, Math.max(64, Math.round(h * 80)));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = opts?.bg ?? '#075985';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = opts?.border ?? '#38bdf8';
          ctx.lineWidth = 6;
          ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
          ctx.font = `bold ${Math.round(canvas.height * 0.44)}px monospace`;
          ctx.fillStyle = opts?.fg ?? '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, canvas.width / 2, canvas.height / 2);
        }
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.3,
          emissive: 0x0369a1,
          emissiveIntensity: 0.38,
        });
      } else {
        mat = new THREE.MeshStandardMaterial({
          color: 0x075985,
          roughness: 0.3,
          emissive: 0x0369a1,
          emissiveIntensity: 0.38,
        });
      }
      const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.14), mat);
      board.name = `SIGN_${label.replace(/\s+/g, '_')}`;
      board.position.set(px, py, pz);
      if (opts?.rotY) board.rotation.y = opts.rotY;
      group.add(board);

      boxCounter++;
      stationPlacementValidator.registerObject(
        `sign_${stationIndex}_${boxCounter}`,
        `Sign ${label}`,
        zone,
        floorLevel,
        new THREE.Vector3(px, py, pz),
        new THREE.Vector3(w, h, 0.14),
        'signage',
        false,
        'wall',
        stationIndex
      );
      return board;
    };

    const defaultScheduleRows: LiveStationScheduleRow[] = [
      { number: '12301', name: 'SANCTUARY EXPRESS', platform: 'PF-1', eta: 'ON TRACK', status: 'ON TIME', color: '#22c55e' },
      { number: '22436', name: 'PINE VALLEY COMMUTER', platform: 'PF-2', eta: '01:20', status: 'BOARDING', color: '#38bdf8' },
      { number: '12951', name: 'HIGHLAND REGIONAL', platform: 'PF-3', eta: '02:05', status: 'ARRIVING', color: '#facc15' },
      { number: '90105', name: 'SANCTUARY METRO LOOP', platform: 'PF-4', eta: '00:45', status: 'BOARDING', color: '#38bdf8' },
      { number: '12002', name: 'REDWOOD CROSSWAY', platform: 'PF-5', eta: '03:10', status: 'ON TIME', color: '#22c55e' },
    ];

    const pisCanvasTargets: Array<{
      canvas: HTMLCanvasElement;
      ctx: CanvasRenderingContext2D;
      texture: THREE.CanvasTexture;
    }> = [];

    const drawPISCanvas = (
      ctx: CanvasRenderingContext2D,
      rows: LiveStationScheduleRow[],
      clockLabel: string,
      blinkOn: boolean
    ) => {
      ctx.fillStyle = '#09111e';
      ctx.fillRect(0, 0, 1024, 384);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 1024, 62);
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('INDIAN RAILWAYS · LIVE TRAIN SCHEDULE · सैंक्चुअरी सेंट्रल', 24, 42);
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'right';
      ctx.fillText(clockLabel, 1000, 42);
      ctx.textAlign = 'left';

      const activeRows = rows.length > 0 ? rows.slice(0, 5) : defaultScheduleRows;
      ctx.font = 'bold 25px monospace';
      activeRows.forEach((row, rIdx) => {
        const ry = 105 + rIdx * 54;
        ctx.fillStyle = rIdx % 2 === 0 ? '#0f172a' : '#132036';
        ctx.fillRect(16, ry - 32, 992, 46);
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(row.number.slice(0, 7), 28, ry);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(row.name.slice(0, 22), 145, ry);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(row.platform.slice(0, 6), 540, ry);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(row.eta.slice(0, 8), 665, ry);
        const isHotStatus = row.status === 'BOARDING' || row.status === 'ARRIVING';
        ctx.fillStyle = isHotStatus && !blinkOn ? '#ffffff' : row.color;
        ctx.fillText(row.status.slice(0, 10), 815, ry);
      });
    };

    const addSchedulePISBoard = (px: number, py: number, pz: number, rotY = 0) => {
      let mat: THREE.Material;
      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 384;
        const ctx = canvas.getContext('2d');
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        if (ctx) {
          drawPISCanvas(ctx, defaultScheduleRows, '12:00:00', true);
          tex.needsUpdate = true;
          pisCanvasTargets.push({ canvas, ctx, texture: tex });
        }
        mat = new THREE.MeshStandardMaterial({ map: tex, emissive: 0x0f172a, emissiveIntensity: 0.48, roughness: 0.25 });
      } else {
        mat = darkWallMat;
      }
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.7, 0.12), mat);
      mesh.position.set(px, py, pz);
      mesh.rotation.y = rotY;
      group.add(mesh);
    };

    // Interactive & animated subsystem registries
    const waterTapStates: Array<{ x: number; y: number; z: number; stream: THREE.Mesh; timer: number }> = [];
    const flushValveStates: Array<{ x: number; y: number; z: number; swirl: THREE.Mesh; lever: THREE.Mesh; baseLeverZ: number; timer: number }> = [];
    const interactiveFoodCounters: Array<{ x: number; y: number; z: number; name: string; led: THREE.Mesh }> = [];
    const digitalLockers: Array<{ id: number; x: number; y: number; z: number; doorPivot: THREE.Group; ledMat: THREE.MeshStandardMaterial; isOpen: boolean; looted: boolean }> = [];
    const chargingTotems: Array<{ x: number; y: number; z: number; ring: THREE.Mesh }> = [];
    const cubicleDoors: Array<{ x: number; y: number; z: number; pivot: THREE.Group; ledMat: THREE.MeshStandardMaterial; isOpen: boolean; restRot: number; openRot: number }> = [];
    const eGateUnits: Array<{ x: number; y: number; z: number; leftPivot: THREE.Group; rightPivot: THREE.Group; lightMat: THREE.MeshStandardMaterial; manualTimer: number; beepCooldown: number }> = [];
    const dfmdUnits: Array<{ x: number; y: number; z: number; ledMat: THREE.MeshStandardMaterial; beepCooldown: number }> = [];
    const boomBarriers: Array<{ x: number; y: number; z: number; pivot: THREE.Group; beaconMat: THREE.MeshStandardMaterial; openSign: number; manualOpen: boolean; overrideTimer: number }> = [];
    const xrayParcels: Array<{ mesh: THREE.Mesh; phase: number; speedOffset: number }> = [];
    const ceilingFans: THREE.Group[] = [];
    const busAcFans: THREE.Group[] = [];
    const transitBeacons: THREE.MeshStandardMaterial[] = [];
    const cctvDomes: Array<{ panGroup: THREE.Group; phase: number; irMat: THREE.MeshStandardMaterial }> = [];
    const solarInverterMats: THREE.MeshStandardMaterial[] = [];
    const fountainRipples: Array<{ mesh: THREE.Mesh; baseY: number; phase: number; maxRadius: number }> = [];

    let cctvScreenTarget: { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } | null = null;
    let commandScreenTarget: { ctx: CanvasRenderingContext2D; tex: THREE.CanvasTexture } | null = null;
    let cctvModeIndex = 0;

    const medicalClinicPos = new THREE.Vector3(x - 52, floor0Y, hallZ + 14);
    const helipadConsolePos = new THREE.Vector3(x + 12, floor4Y, hallZ + 10);
    const helpDeskPos = new THREE.Vector3(x, floor0Y + 1.0, hallZ + 14);
    const rpfDeskPos = new THREE.Vector3(x - 51, floor0Y + 1.0, hallZ - 8);
    const commandDeskPos = new THREE.Vector3(x, floor1Y + 1.0, hallZ - 16);
    const xrayCenterPos = new THREE.Vector3(x - 28, floor0Y + 1.0, hallZ + 20);
    const bookstallPositions = [
      { pos: new THREE.Vector3(x + 38, floor1Y + 1.0, hallZ + 10.5), label: 'A.H. Wheeler & Co. Bookstall' },
      { pos: new THREE.Vector3(x + 28, floor1Y + 1.0, hallZ + 18.8), label: 'Bharat Handloom & Travel Gear' },
    ];
    const loungeRestSpots = [
      new THREE.Vector3(x - 38, floor1Y + 0.5, hallZ + 12),
      new THREE.Vector3(x, floor3Y + 0.5, 190),
      new THREE.Vector3(x, floor0Y + 0.5, hallZ - 12),
    ];

    // Cooldown & overdrive timers
    let xrayBoostTimer = 0;
    let radarBoostTimer = 0;
    let fountainSurgeTimer = 0;
    let chargeBoostTimer = 0;
    let transitPulseTimer = 0;
    let helpDeskPulseTimer = 0;
    let bookstallCooldown = 0;
    let clinicSupplyCooldown = 0;
    let pisUpdateTimer = 0;
    let screenUpdateTimer = 0;
    let clockTowerHourOffset = 0;

    // =========================================================================
    // 1. PRIMARY MULTI-LEVEL STRUCTURE, ATRIUM CUTOUTS & OPEN ARCH PORTALS
    // =========================================================================
    const hallW = 120;
    const hallD = 52;

    // Ground Floor Slab (Top at floor0Y = y + 0.27)
    addBox('MAIN_CONCOURSE_GROUND_SLAB', hallW, 0.3, hallD, x, y + 0.12, hallZ, floorMat, 'Structure', 0, 'structural', true, false, 'surface');

    // Level 1 Mezzanine Slabs (Top at floor1Y = y + 4.70) — open central atrium [-14, +14]
    addBox('LEVEL_1_MEZZANINE_SLAB_LEFT', 46, 0.3, hallD, x - 37, y + 4.55, hallZ, floorMat, 'Structure', 1, 'structural', true, false, 'surface');
    addBox('LEVEL_1_MEZZANINE_SLAB_RIGHT', 46, 0.3, hallD, x + 37, y + 4.55, hallZ, floorMat, 'Structure', 1, 'structural', true, false, 'surface');
    addBox('LEVEL_1_REAR_LINK_SLAB', 28, 0.3, 14, x, y + 4.55, hallZ + 19, floorMat, 'Structure', 1, 'structural', true, false, 'surface');
    addBox('LEVEL_1_NORTH_BALCONY_SLAB', 28, 0.3, 14, x, y + 4.55, hallZ - 19, floorMat, 'Structure', 1, 'structural', true, false, 'surface');

    // Level 1 Atrium Perimeter Glass & Steel Balustrades (leaving escalator landing Z = hallZ + 9 open)
    addBox('L1_ATRIUM_RAIL_WEST', 0.16, 1.05, 16, x - 14.0, floor1Y + 0.525, hallZ - 4, glassMat, 'Atrium', 1, 'structural', true);
    addBox('L1_ATRIUM_RAIL_EAST', 0.16, 1.05, 16, x + 14.0, floor1Y + 0.525, hallZ - 4, glassMat, 'Atrium', 1, 'structural', true);
    addBox('L1_ATRIUM_RAIL_SOUTH', 28.0, 1.05, 0.16, x, floor1Y + 0.525, hallZ + 12.0, glassMat, 'Atrium', 1, 'structural', true);
    addBox('L1_ATRIUM_RAIL_NORTH', 28.0, 1.05, 0.16, x, floor1Y + 0.525, hallZ - 12.0, glassMat, 'Atrium', 1, 'structural', true);

    // Level 3 Gallery & Skywalk Link Slabs (Top at floor3Y = y + 9.80)
    addBox('LEVEL_3_GALLERY_SLAB_LEFT', 46, 0.3, hallD, x - 37, y + 9.65, hallZ, floorMat, 'Structure', 3, 'structural', true, false, 'surface');
    addBox('LEVEL_3_GALLERY_SLAB_RIGHT', 46, 0.3, hallD, x + 37, y + 9.65, hallZ, floorMat, 'Structure', 3, 'structural', true, false, 'surface');
    addBox('LEVEL_3_REAR_LINK_SLAB', 28, 0.3, 14, x, y + 9.65, hallZ + 19, floorMat, 'Structure', 3, 'structural', true, false, 'surface');
    addBox('LEVEL_3_NORTH_AIR_LINK_SLAB', 28, 0.3, 14, x, y + 9.65, hallZ - 19, floorMat, 'Structure', 3, 'structural', true, false, 'surface');

    // Level 3 Atrium Balustrades
    addBox('L3_ATRIUM_RAIL_WEST', 0.16, 1.05, 16, x - 14.0, floor3Y + 0.525, hallZ - 4, glassMat, 'Atrium', 3, 'structural', true);
    addBox('L3_ATRIUM_RAIL_EAST', 0.16, 1.05, 16, x + 14.0, floor3Y + 0.525, hallZ - 4, glassMat, 'Atrium', 3, 'structural', true);
    addBox('L3_ATRIUM_RAIL_SOUTH', 28.0, 1.05, 0.16, x, floor3Y + 0.525, hallZ + 12.0, glassMat, 'Atrium', 3, 'structural', true);
    addBox('L3_ATRIUM_RAIL_NORTH', 28.0, 1.05, 0.16, x, floor3Y + 0.525, hallZ - 12.0, glassMat, 'Atrium', 3, 'structural', true);

    // Level 4 Rooftop Helipad & Solar Terrace Slabs (Top at floor4Y = y + 14.50)
    addBox('LEVEL_4_ROOF_TERRACE_WEST', 46, 0.4, 46, x - 29, floor4Y - 0.2, hallZ, floorMat, 'Rooftop', 4, 'structural', true, false, 'surface');
    addBox('LEVEL_4_ROOF_TERRACE_EAST', 46, 0.4, 46, x + 29, floor4Y - 0.2, hallZ, floorMat, 'Rooftop', 4, 'structural', true, false, 'surface');
    addBox('LEVEL_4_ROOF_BRIDGE_N', 12, 0.4, 14, x, floor4Y - 0.2, hallZ - 16, floorMat, 'Rooftop', 4, 'structural', true, false, 'surface');

    // Structural Monumental Columns (Placed clear of escalators and doorways)
    for (const colX of [-42, -16, 16, 42]) {
      for (const colZ of [hallZ - 20, hallZ, hallZ + 20]) {
        // Leave center aisle clear around stairs & escalators
        if (Math.abs(colX) === 16 && colZ === hallZ) continue;
        addBox('STRUCTURAL_COLUMN', 1.5, 14.5, 1.5, x + colX, y + 7.45, colZ, buffSandstoneMat, 'Columns', 0, 'structural', true, true, 'surface');
        addBox('COLUMN_BASE', 2.0, 0.9, 2.0, x + colX, floor0Y + 0.45, colZ, redSandstoneMat, 'Columns', 0, 'structural', true);
        addBox('COLUMN_CAPITAL', 2.0, 0.7, 2.0, x + colX, floor4Y - 0.5, colZ, redSandstoneMat, 'Columns', 4, 'structural', true, true, 'surface');
      }
    }

    // Exterior Perimeter Walls WITH Open Walkable Portals for Skywalks, North Platform Exits & South Entrance
    // West Exterior Wall (x - 60): open 10m portal at Z = hallZ on Level 3 for West Skywalk
    addBox('WEST_WALL_LOWER', 0.5, 9.6, hallD, x - 60, y + 4.8, hallZ, redSandstoneMat, 'Exterior', 0, 'structural', true, true, 'surface');
    addBox('WEST_WALL_UPPER_N', 0.5, 5.2, 20.5, x - 60, y + 12.2, hallZ - 15.75, redSandstoneMat, 'Exterior', 3, 'structural', true, true, 'surface');
    addBox('WEST_WALL_UPPER_S', 0.5, 5.2, 20.5, x - 60, y + 12.2, hallZ + 15.75, redSandstoneMat, 'Exterior', 3, 'structural', true, true, 'surface');

    // East Exterior Wall (x + 60): open 10m portal at Z = hallZ on Level 3 for East Skywalk
    addBox('EAST_WALL_LOWER', 0.5, 9.6, hallD, x + 60, y + 4.8, hallZ, redSandstoneMat, 'Exterior', 0, 'structural', true, true, 'surface');
    addBox('EAST_WALL_UPPER_N', 0.5, 5.2, 20.5, x + 60, y + 12.2, hallZ - 15.75, redSandstoneMat, 'Exterior', 3, 'structural', true, true, 'surface');
    addBox('EAST_WALL_UPPER_S', 0.5, 5.2, 20.5, x + 60, y + 12.2, hallZ + 15.75, redSandstoneMat, 'Exterior', 3, 'structural', true, true, 'surface');

    // North Trackside Wall (Z = hallZ - 26 = 239): THREE wide 10m Archway Exits onto Platforms at X = -32, 0, +32 + Level 3 Central Air-Concourse Bridge Exit!
    addBox('NORTH_WALL_LOWER_1', 23, 4.4, 0.5, x - 48.5, floor0Y + 2.2, hallZ - 26, redSandstoneMat, 'Exterior', 0, 'structural', true);
    addBox('NORTH_WALL_LOWER_2', 20, 4.4, 0.5, x - 16.0, floor0Y + 2.2, hallZ - 26, redSandstoneMat, 'Exterior', 0, 'structural', true);
    addBox('NORTH_WALL_LOWER_3', 20, 4.4, 0.5, x + 16.0, floor0Y + 2.2, hallZ - 26, redSandstoneMat, 'Exterior', 0, 'structural', true);
    addBox('NORTH_WALL_LOWER_4', 23, 4.4, 0.5, x + 48.5, floor0Y + 2.2, hallZ - 26, redSandstoneMat, 'Exterior', 0, 'structural', true);
    // Mid-level North wall (Level 1 Food Court back wall) + Level 3 open portal at X ∈ [-10, +10] for Central Air-Concourse!
    addBox('NORTH_WALL_LEVEL1_FULL', hallW, 5.0, 0.5, x, floor1Y + 2.5, hallZ - 26, redSandstoneMat, 'Exterior', 1, 'structural', true);
    addBox('NORTH_WALL_LEVEL3_W', 50, 5.0, 0.5, x - 35, floor3Y + 2.5, hallZ - 26, redSandstoneMat, 'Exterior', 3, 'structural', true);
    addBox('NORTH_WALL_LEVEL3_E', 50, 5.0, 0.5, x + 35, floor3Y + 2.5, hallZ - 26, redSandstoneMat, 'Exterior', 3, 'structural', true);

    // South Facade Walls (Z = hallZ + 26 = 291) leaving 24m Central Monumental Portal open
    addBox('SOUTH_FACADE_WALL_L', 48, 14.8, 0.6, x - 36, y + 7.4, hallZ + 26, redSandstoneMat, 'Exterior', 0, 'structural', true, true, 'surface');
    addBox('SOUTH_FACADE_WALL_R', 48, 14.8, 0.6, x + 36, y + 7.4, hallZ + 26, redSandstoneMat, 'Exterior', 0, 'structural', true, true, 'surface');

    // =========================================================================
    // 2. MONUMENTAL INDO-SARACENIC + GLASS AEROTROPOLIS FACADE & CLOCK TOWER
    // =========================================================================
    // Central Barrel-Vaulted Steel-and-Glass Portico Canopy + Diagrid Ribs
    const archCanopy = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 24, 32, 1, false, 0, Math.PI), glassMat);
    archCanopy.rotation.z = Math.PI / 2;
    archCanopy.position.set(x, y + 11.8, hallZ + 32);
    group.add(archCanopy);

    for (let rib = -10; rib <= 10; rib += 5) {
      const archRib = new THREE.Mesh(new THREE.TorusGeometry(22.1, 0.25, 8, 28, Math.PI), steelMat);
      archRib.position.set(x, y + 11.8, hallZ + 32 + rib);
      group.add(archRib);
    }

    // Symmetrical Heritage Octagonal Corner Chhatris with Copper Domes
    for (const cx of [-52, 52]) {
      for (const px of [-1.8, 1.8]) {
        for (const pz of [-1.8, 1.8]) {
          addBox('CHHATRI_PILLAR', 0.45, 4.2, 0.45, x + cx + px, floor4Y + 2.1, hallZ + 24 + pz, buffSandstoneMat, 'Chhatri', 4, 'structural', true);
        }
      }
      addBox('CHHATRI_CORNICE', 4.8, 0.45, 4.8, x + cx, floor4Y + 4.35, hallZ + 24, redSandstoneMat, 'Chhatri', 4, 'structural', true, true, 'surface');
      const chhatriDome = new THREE.Mesh(new THREE.SphereGeometry(2.5, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), domeCopperMat);
      chhatriDome.position.set(x + cx, floor4Y + 4.55, hallZ + 24);
      group.add(chhatriDome);
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 8), domeBrassMat);
      finial.position.set(x + cx, floor4Y + 7.5, hallZ + 24);
      group.add(finial);
    }

    // Decorative Jharokha Jaali Balconies on Upper South Wings
    for (const jx of [-26, 26]) {
      addBox('JHAROKHA_CORBEL', 6.0, 0.8, 2.2, x + jx, y + 7.2, hallZ + 27.1, redSandstoneMat, 'Facade', 0, 'structural', false, true, 'surface');
      addBox('JHAROKHA_JAALI_SCREEN', 5.4, 3.6, 0.3, x + jx, y + 9.4, hallZ + 27.9, jaaliMat, 'Facade', 0, 'structural', false, true, 'surface');
      addBox('JHAROKHA_EAVE', 6.4, 0.45, 2.4, x + jx, y + 11.4, hallZ + 27.2, domeCopperMat, 'Facade', 0, 'structural', false, true, 'surface');
    }

    // Indian Railways Crest Emblem & Bilingual Facade Marquee
    const crestEmblem = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 0.32, 24), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.35 }));
    crestEmblem.rotation.x = Math.PI / 2;
    crestEmblem.position.set(x, y + 21.8, hallZ + 33.4);
    group.add(crestEmblem);
    const crestRing = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.16, 8, 24), domeBrassMat);
    crestRing.position.set(x, y + 21.8, hallZ + 33.5);
    group.add(crestRing);

    addTextBoard('भारतीय रेल', x, y + 19.0, hallZ + 33.4, 24, 1.8, 'Facade', 0, { bg: '#0f172a', border: '#f59e0b', fg: '#fde047' });
    addTextBoard('INDIAN RAILWAYS', x, y + 16.5, hallZ + 33.4, 28, 1.6, 'Facade', 0, { bg: '#0f172a', border: '#f59e0b', fg: '#ffffff' });
    addBox('CENTRAL_BLUE_MARQUEE', 42, 2.8, 0.45, x, y + 13.6, hallZ + 33.2, blueSignMat, 'Facade', 0, 'signage', false);
    addTextBoard('LAST SANCTUARY CENTRAL', x, y + 13.6, hallZ + 33.5, 40, 2.0, 'Facade', 0);

    // Grand Central Clock Tower with Real-Time Rotating Hands + Waving Tiranga
    addBox('CLOCK_TOWER_BASE', 7.2, 11.0, 7.2, x, y + 20.5, hallZ + 25, redSandstoneMat, 'Tower', 0, 'structural', true, true, 'surface');
    const towerDome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), domeCopperMat);
    towerDome.position.set(x, y + 26.0, hallZ + 25);
    group.add(towerDome);

    const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 9.0, 10), chromeMat);
    flagpole.position.set(x, y + 34.0, hallZ + 25);
    group.add(flagpole);

    const flagPivot = new THREE.Group();
    flagPivot.position.set(x, y + 36.6, hallZ + 25);
    const flagMeshGroup = new THREE.Group();
    flagMeshGroup.position.x = 1.9;
    const saffron = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.76, 0.05), new THREE.MeshStandardMaterial({ color: 0xff9933 }));
    saffron.position.y = 0.76; flagMeshGroup.add(saffron);
    const white = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.76, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    white.position.y = 0; flagMeshGroup.add(white);
    const green = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.76, 0.05), new THREE.MeshStandardMaterial({ color: 0x138808 }));
    green.position.y = -0.76; flagMeshGroup.add(green);
    const chakra = new THREE.Mesh(new THREE.CircleGeometry(0.3, 18), new THREE.MeshBasicMaterial({ color: 0x000080 }));
    chakra.position.set(0, 0, 0.04); flagMeshGroup.add(chakra);
    flagPivot.add(flagMeshGroup);
    group.add(flagPivot);

    // 4-Sided Animated Analog Clock Hands
    const clockHourHands: THREE.Object3D[] = [];
    const clockMinuteHands: THREE.Object3D[] = [];
    for (const [rotY, cdx, cdz] of [[0, 0, 3.62], [Math.PI, 0, -3.62], [Math.PI / 2, 3.62, 0], [-Math.PI / 2, -3.62, 0]] as Array<[number, number, number]>) {
      const clockGroup = new THREE.Group();
      clockGroup.position.set(x + cdx, y + 21.5, hallZ + 25 + cdz);
      clockGroup.rotation.y = rotY;
      const dial = new THREE.Mesh(new THREE.CircleGeometry(1.75, 28), new THREE.MeshBasicMaterial({ color: 0xfffbeb }));
      clockGroup.add(dial);
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 28), domeBrassMat);
      clockGroup.add(bezel);

      const hPivot = new THREE.Group();
      hPivot.position.z = 0.04;
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.04), charcoalMat);
      hBar.position.y = 0.42;
      hPivot.add(hBar);
      clockGroup.add(hPivot);
      clockHourHands.push(hPivot);

      const mPivot = new THREE.Group();
      mPivot.position.z = 0.06;
      const mBar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.38, 0.04), redMat);
      mBar.position.y = 0.62;
      mPivot.add(mBar);
      clockGroup.add(mPivot);
      clockMinuteHands.push(mPivot);

      group.add(clockGroup);
    }

    const waterStreamMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.78,
    });
    const flushSwirlMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });

    const addWaterStreamEffect = (tx: number, ty: number, tz: number, streamHeight = 0.24) => {
      const stream = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.032, streamHeight, 8), waterStreamMat);
      stream.position.set(tx, ty - streamHeight * 0.5, tz);
      stream.visible = false;
      group.add(stream);
      waterTapStates.push({ x: tx, y: ty, z: tz, stream, timer: 0 });
    };

    const addToiletSwirlEffect = (vx: number, vy: number, vz: number, bowlZ: number, lever: THREE.Mesh) => {
      const swirl = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.2, 16), flushSwirlMat);
      swirl.rotation.x = -Math.PI / 2;
      swirl.position.set(vx, vy - 0.2, bowlZ);
      swirl.visible = false;
      group.add(swirl);
      flushValveStates.push({ x: vx, y: vy, z: vz, swirl, lever, baseLeverZ: lever.position.z, timer: 0 });
    };

    const addCubicleDoorHinge = (
      doorX: number,
      floorSurfaceY: number,
      hingeZ: number,
      restRot: number,
      openRot: number,
      ledX: number,
      ledZ: number,
      occupiedInit: boolean
    ) => {
      const pivot = new THREE.Group();
      pivot.position.set(doorX, floorSurfaceY + 1.15, hingeZ);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.3, 1.35), buffSandstoneMat);
      leaf.position.z = 0.675;
      pivot.add(leaf);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.08), chromeMat);
      handle.position.set(0, -0.05, 1.2);
      pivot.add(handle);
      pivot.rotation.y = restRot;
      group.add(pivot);

      const ledMat = new THREE.MeshStandardMaterial({
        color: occupiedInit ? 0xb91c1c : 0x16a34a,
        emissive: occupiedInit ? 0x991b1b : 0x15803d,
        emissiveIntensity: 0.75,
      });
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), ledMat);
      led.position.set(ledX, floorSurfaceY + 2.1, ledZ);
      group.add(led);

      cubicleDoors.push({
        x: doorX,
        y: floorSurfaceY + 1.15,
        z: hingeZ + 0.65,
        pivot,
        ledMat,
        isOpen: false,
        restRot,
        openRot,
      });
    };

    // Automatic Sliding Glass Entrance Doors (non-blocking Bounds so doors slide freely without invisible wall glitches)
    const slidingDoors: THREE.Mesh[] = [];
    for (const [doorIdx, side] of [-1, 1].entries()) {
      const entryDoor = addBox(`MAIN_ENTRANCE_SLIDING_DOOR_${doorIdx + 1}`, 4.8, 3.8, 0.14, x + side * 4.0, floor0Y + 1.9, hallZ + 26.0, glassMat, 'Entrance', 0, 'door', false, false);
      entryDoor.userData.isStationSlidingDoor = true;
      entryDoor.userData.baseX = x + side * 4.0;
      entryDoor.userData.slideOffset = side * 4.0;
      slidingDoors.push(entryDoor);
    }

    // =========================================================================
    // 3. MULTI-MODAL FORECOURT TRANSPORT HUB (FOUNTAIN, AUTOS, BUSES, GATE)
    // =========================================================================
    const forecourtY = trackSurfaceY(x, hallZ + 55) - 0.37;
    // Paved Forecourt Esplanade Deck
    addBox('FORECOURT_PLAZA_APRON', 132, 0.25, 52, x, forecourtY + 0.12, hallZ + 54, charcoalMat, 'Forecourt', 0, 'structural', false, false, 'platform');

    // Heritage Boulevard Cast-Iron Streetlamps
    for (const lx of [-48, -24, -12, 12, 24, 48]) {
      const lampY = trackSurfaceY(x + lx, hallZ + 38) - 0.37;
      addBox(`PLAZA_LAMP_POST_${lx}`, 0.24, 5.2, 0.24, x + lx, lampY + 2.6, hallZ + 38, charcoalMat, 'Forecourt', 0, 'structural', true, true, 'platform');
      const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), warmLightMat);
      lampBulb.position.set(x + lx, lampY + 5.3, hallZ + 38);
      group.add(lampBulb);
    }

    // 3-Tiered Cascading Roundabout Fountain + Animated Expanding Water Ripples
    const fountainY = trackSurfaceY(x, hallZ + 56) - 0.37;
    const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 12.2, 0.9, 32), buffSandstoneMat);
    fountainBase.position.set(x, fountainY + 0.45, hallZ + 56); group.add(fountainBase);
    const waterSurface1 = new THREE.Mesh(new THREE.CylinderGeometry(11.1, 11.1, 0.12, 32), waterMat);
    waterSurface1.position.set(x, fountainY + 0.9, hallZ + 56); group.add(waterSurface1);

    const fountainMid = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 7.2, 0.85, 24), redSandstoneMat);
    fountainMid.position.set(x, fountainY + 1.35, hallZ + 56); group.add(fountainMid);
    const waterSurface2 = new THREE.Mesh(new THREE.CylinderGeometry(6.1, 6.1, 0.12, 24), waterMat);
    waterSurface2.position.set(x, fountainY + 1.78, hallZ + 56); group.add(waterSurface2);

    const fountainTop = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.75, 16), buffSandstoneMat);
    fountainTop.position.set(x, fountainY + 2.25, hallZ + 56); group.add(fountainTop);
    const fountainJet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.95, 6.8, 14),
      new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.88 })
    );
    fountainJet.position.set(x, fountainY + 5.6, hallZ + 56);
    group.add(fountainJet);

    for (let rp = 0; rp < 3; rp++) {
      const ripple = new THREE.Mesh(
        new THREE.RingGeometry(0.85, 1.0, 28),
        new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
      );
      ripple.rotation.x = -Math.PI / 2;
      const baseRY = rp === 2 ? fountainY + 1.86 : fountainY + 0.98;
      ripple.position.set(x, baseRY, hallZ + 56);
      group.add(ripple);
      fountainRipples.push({ mesh: ripple, baseY: baseRY, phase: rp * 0.35, maxRadius: rp === 2 ? 5.6 : 10.4 });
    }

    // 4 Detailed 3-Wheeler Green & Yellow Auto-Rickshaws (West Forecourt) + Headlights/Beacons
    for (let a = 0; a < 4; a++) {
      const ax = x - 44 + a * 6.5;
      const az = hallZ + 48;
      const ay = trackSurfaceY(ax, az) - 0.37;
      addBox(`AUTO_BODY_${a + 1}`, 2.6, 0.85, 1.45, ax, ay + 0.65, az, greenMat, 'Transport', 0, 'transit', true, true, 'platform');
      addBox(`AUTO_CANOPY_${a + 1}`, 2.4, 0.78, 1.4, ax - 0.1, ay + 1.46, az, yellowMat, 'Transport', 0, 'transit', true, true, 'platform');
      addBox(`AUTO_WINDSHIELD_${a + 1}`, 0.08, 0.65, 1.25, ax + 1.15, ay + 1.35, az, glassMat, 'Transport', 0, 'transit', false, false, 'platform');
      const autoHeadlampMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.75 });
      transitBeacons.push(autoHeadlampMat);
      const headLamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), autoHeadlampMat);
      headLamp.position.set(ax + 1.32, ay + 0.72, az);
      group.add(headLamp);
      for (const [wx, wz] of [[-0.9, -0.65], [-0.9, 0.65], [1.05, 0]] as Array<[number, number]>) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 14), rubberMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(ax + wx, ay + 0.26, az + wz);
        group.add(wheel);
      }
    }
    addTextBoard('PREPAID AUTO STAND  ·  ऑटो स्टैंड', x - 34, forecourtY + 2.8, hallZ + 44, 12, 0.75, 'Transport', 0);

    // 2 Modern Low-Floor Electric City Buses & Covered Bus Shelter (East Forecourt) + AC Fans & Hazard Beacons
    addBox('BUS_SHELTER_ROOF', 18.0, 0.25, 4.0, x + 34, forecourtY + 3.2, hallZ + 48, steelMat, 'Transport', 0, 'structural', false, true, 'platform');
    addTextBoard('CITY ELECTRIC BUS TERMINAL  ·  बस टर्मिनल', x + 34, forecourtY + 3.6, hallZ + 46, 15, 0.75, 'Transport', 0);
    for (let b = 0; b < 2; b++) {
      const bx = x + 26 + b * 16;
      const bz = hallZ + 56;
      const by = trackSurfaceY(bx, bz) - 0.37;
      addBox(`CITY_BUS_CHASSIS_${b + 1}`, 11.2, 2.55, 2.85, bx, by + 1.65, bz, blueSignMat, 'Transport', 0, 'transit', true, true, 'platform');
      addBox(`CITY_BUS_ROOF_AC_${b + 1}`, 6.5, 0.35, 1.8, bx, by + 3.1, bz, tileMat, 'Transport', 0, 'transit', false, true, 'platform');
      addBox(`CITY_BUS_GLASS_WINDSHIELD_${b + 1}`, 0.1, 1.5, 2.55, bx - 5.62, by + 1.9, bz, glassMat, 'Transport', 0, 'transit', false, false, 'platform');
      // Bus Headlights + Roof Hazard Beacons + Rotating AC Condenser Fans
      const busBeaconMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.9 });
      transitBeacons.push(busBeaconMat);
      for (const lz of [-0.95, 0.95]) {
        const hl = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.34), warmLightMat);
        hl.position.set(bx - 5.63, by + 0.85, bz + lz);
        group.add(hl);
        const hBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), busBeaconMat);
        hBeacon.position.set(bx + (lz > 0 ? 4.8 : -4.8), by + 3.05, bz);
        group.add(hBeacon);
      }
      for (const fOff of [-1.6, 1.6]) {
        const fanPivot = new THREE.Group();
        fanPivot.position.set(bx + fOff, by + 3.3, bz);
        const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.04, 0.14), charcoalMat);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.95), charcoalMat);
        fanPivot.add(b1, b2);
        group.add(fanPivot);
        busAcFans.push(fanPivot);
      }
      for (const wx of [-3.6, 3.6]) {
        for (const wz of [-1.35, 1.35]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 16), rubberMat);
          wheel.rotation.x = Math.PI / 2;
          wheel.position.set(bx + wx, by + 0.45, bz + wz);
          group.add(wheel);
        }
      }
    }

    // Fortified Sanctuary Security Checkpoint & Hinged Automatic Boom Gatehouses
    for (const side of [-1, 1]) {
      const gx = x + side * 52;
      const gz = hallZ + 68;
      const gy = trackSurfaceY(gx, gz) - 0.37;
      addBox(`CHECKPOINT_BOOTH_${side}`, 4.2, 3.2, 3.8, gx, gy + 1.6, gz, darkWallMat, 'Checkpoint', 0, 'security', true, true, 'platform');
      addBox(`CHECKPOINT_SANDBAG_WALL_${side}`, 6.2, 0.95, 1.2, gx - side * 5.2, gy + 0.475, gz, sandbagMat, 'Checkpoint', 0, 'security', true, true, 'platform');
      const pivotX = gx - side * 2.50; // Keep the pedestal clear of the checkpoint booth collider.
      addBox(`BOOM_PEDESTAL_${side}`, 0.45, 1.25, 0.45, pivotX, gy + 0.625, gz - 1.5, steelMat, 'Checkpoint', 0, 'security', true, true, 'platform');
      const beaconMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.85 });
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), beaconMat);
      beacon.position.set(pivotX, gy + 1.36, gz - 1.5);
      group.add(beacon);

      const boomPivot = new THREE.Group();
      boomPivot.position.set(pivotX, gy + 1.15, gz - 1.5);
      const boomArm = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.16, 0.16), yellowMat);
      boomArm.position.x = -side * 2.75;
      boomPivot.add(boomArm);
      group.add(boomPivot);
      boomBarriers.push({
        x: pivotX - side * 2.5,
        y: gy + 1.15,
        z: gz - 1.5,
        pivot: boomPivot,
        beaconMat,
        openSign: side,
        manualOpen: false,
        overrideTimer: 0,
      });
    }

    // =========================================================================
    // 4. LEVEL 0: GRAND GROUND CONCOURSE (TICKETS, SECURITY, WASHROOMS, CLINIC)
    // =========================================================================
    // Central Reception & Sahayata Island Desk
    addBox('RECEPTION_ISLAND_COUNTER', 10.0, 1.15, 2.4, x, floor0Y + 0.575, hallZ + 14, darkWallMat, 'Reception', 0, 'furniture', true);
    addBox('RECEPTION_TOP_SURFACE', 10.4, 0.08, 2.6, x, floor0Y + 1.19, hallZ + 14, buffSandstoneMat, 'Reception', 0, 'furniture', true);
    const helpMonitorMat1 = new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.7 });
    const helpMonitorMat2 = helpMonitorMat1.clone();
    addBox('HELP_DESK_MONITOR_1', 0.8, 0.6, 0.1, x - 2.5, floor0Y + 1.55, hallZ + 14, helpMonitorMat1, 'Reception', 0, 'furniture', false);
    addBox('HELP_DESK_MONITOR_2', 0.8, 0.6, 0.1, x + 2.5, floor0Y + 1.55, hallZ + 14, helpMonitorMat2, 'Reception', 0, 'furniture', false);
    addTextBoard('HELP DESK / सहायता केन्द्र', x, floor0Y + 2.5, hallZ + 14.5, 8.0, 0.8, 'Reception', 0);

    // Fortified Security Screening Zone (4 Interactive DFMD Arches + Moving Baggage X-Ray Scanners)
    for (let dfmd = 0; dfmd < 4; dfmd++) {
      const dx = x - 18 + dfmd * 4.2;
      addBox(`DFMD_FRAME_L_${dfmd + 1}`, 0.14, 2.4, 0.7, dx - 0.6, floor0Y + 1.2, hallZ + 20, darkWallMat, 'Security', 0, 'security', true);
      addBox(`DFMD_FRAME_R_${dfmd + 1}`, 0.14, 2.4, 0.7, dx + 0.6, floor0Y + 1.2, hallZ + 20, darkWallMat, 'Security', 0, 'security', true);
      addBox(`DFMD_FRAME_TOP_${dfmd + 1}`, 1.34, 0.25, 0.7, dx, floor0Y + 2.525, hallZ + 20, darkWallMat, 'Security', 0, 'security', true);
      const dfmdLedMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.7 });
      const dfmdLed = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.74), dfmdLedMat);
      dfmdLed.position.set(dx, floor0Y + 2.66, hallZ + 20);
      group.add(dfmdLed);
      dfmdUnits.push({ x: dx, y: floor0Y + 1.2, z: hallZ + 20, ledMat: dfmdLedMat, beepCooldown: 0 });
    }
    addBox('BAGGAGE_XRAY_CONVEYOR', 7.5, 0.75, 1.2, x - 28, floor0Y + 0.375, hallZ + 20, steelMat, 'Security', 0, 'security', true, false);
    addBox('BAGGAGE_XRAY_TUNNEL', 4.2, 1.3, 1.5, x - 28, floor0Y + 1.4, hallZ + 20, darkWallMat, 'Security', 0, 'security', true);
    const xrayScanCurtainMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 });
    const xrayCurtainL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.15, 1.28), xrayScanCurtainMat);
    xrayCurtainL.position.set(x - 30.08, floor0Y + 1.38, hallZ + 20);
    const xrayCurtainR = xrayCurtainL.clone();
    xrayCurtainR.position.x = x - 25.92;
    group.add(xrayCurtainL, xrayCurtainR);
    for (let pkg = 0; pkg < 3; pkg++) {
      const parcelColor = [0x92400e, 0x1e3a8a, 0x374151][pkg];
      const parcel = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.45, 0.62),
        new THREE.MeshStandardMaterial({ color: parcelColor, roughness: 0.65 })
      );
      parcel.position.set(x - 31.2 + pkg * 2.4, floor0Y + 0.98, hallZ + 20);
      group.add(parcel);
      xrayParcels.push({ mesh: parcel, phase: pkg / 3, speedOffset: 0.16 });
    }
    addTextBoard('SECURITY SCREENING', x - 12, floor0Y + 3.2, hallZ + 20.5, 10, 0.8, 'Security', 0);

    // Ticketing Hall: 6 Staffed Booking Counters & 4 Smart Interactive TVMs
    for (let tc = 0; tc < 6; tc++) {
      const tcx = x + 18 + tc * 5.2;
      addBox(`TICKET_COUNTER_BASE_${tc + 1}`, 4.6, 1.15, 1.8, tcx, floor0Y + 0.575, hallZ + 12, darkWallMat, 'Ticketing', 0, 'furniture', true);
      addBox(`TICKET_COUNTER_GLASS_${tc + 1}`, 4.6, 1.2, 0.1, tcx, floor0Y + 1.75, hallZ + 11.2, glassMat, 'Ticketing', 0, 'furniture', false);
      addBox(`TICKET_COUNTER_SCREEN_${tc + 1}`, 1.2, 0.8, 0.08, tcx, floor0Y + 1.8, hallZ + 11.15, darkWallMat, 'Ticketing', 0, 'furniture', false);
      addTextBoard(`CTR ${tc + 1}`, tcx, floor0Y + 2.55, hallZ + 11.2, 2.2, 0.45, 'Ticketing', 0);
    }
    addTextBoard('TICKETING & RESERVATION COUNTERS', x + 31, floor0Y + 3.25, hallZ + 11.1, 16, 0.85, 'Ticketing', 0);

    for (let tvm = 0; tvm < 4; tvm++) {
      const tvmx = x + 20 + tvm * 4.8;
      const tvmMesh = addBox(`SMART_TVM_KIOSK_${tvm + 1}`, 1.4, 2.2, 0.8, tvmx, floor0Y + 1.1, hallZ + 4, darkWallMat, 'Ticketing', 0, 'amenity', true);
      tvmMesh.userData.isTVM = true;
      addBox(`SMART_TVM_SCREEN_${tvm + 1}`, 1.1, 0.8, 0.06, tvmx, floor0Y + 1.5, hallZ + 3.55, blueSignMat, 'Ticketing', 0, 'amenity', false);
      addTextBoard(`ATVM ${tvm + 1}`, tvmx, floor0Y + 2.45, hallZ + 3.55, 1.8, 0.45, 'Ticketing', 0);
    }

    // Biometric Departure & Arrival E-Gates with Hinged Flaps & RFID Reader LEDs
    addTextBoard('DEPARTURES  →', x - 12, floor0Y + 3.2, hallZ + 0.2, 10, 0.85, 'Concourse', 0);
    addTextBoard('←  ARRIVALS', x + 12, floor0Y + 3.2, hallZ + 0.2, 10, 0.85, 'Concourse', 0);
    for (const lane of [-18, -14, -10, -6, 6, 10, 14, 18]) {
      const isDep = lane < 0;
      addBox(isDep ? 'DEPARTURE_TURNSTILE_POD' : 'ARRIVAL_TURNSTILE_POD', 0.45, 1.15, 1.4, x + lane, floor0Y + 0.575, hallZ, steelMat, 'Gates', 0, 'transit', true);
      const rfidMat = new THREE.MeshStandardMaterial({
        color: isDep ? 0x16a34a : 0xf59e0b,
        emissive: isDep ? 0x15803d : 0xd97706,
        emissiveIntensity: 0.75,
      });
      const rfidPad = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.32), rfidMat);
      rfidPad.position.set(x + lane, floor0Y + 1.18, hallZ + 0.42);
      group.add(rfidPad);

      const flapMat = isDep ? glassMat : redMat;
      const leftPivot = new THREE.Group();
      leftPivot.position.set(x + lane - 0.25, floor0Y + 0.88, hallZ);
      const flapL = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.78, 0.06), flapMat);
      flapL.position.x = -0.375;
      leftPivot.add(flapL);
      group.add(leftPivot);

      const rightPivot = new THREE.Group();
      rightPivot.position.set(x + lane + 0.25, floor0Y + 0.88, hallZ);
      const flapR = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.78, 0.06), flapMat);
      flapR.position.x = 0.375;
      rightPivot.add(flapR);
      group.add(rightPivot);

      eGateUnits.push({ x: x + lane, y: floor0Y + 0.88, z: hallZ, leftPivot, rightPivot, lightMat: rfidMat, manualTimer: 0, beepCooldown: 0 });
    }

    // Grand Central Waiting Benches + Interactive USB Charging Totems
    for (let r = 0; r < 3; r++) {
      const bz = hallZ - 7 - r * 5.0;
      for (const c of [-24, -12, 12, 24]) {
        const bx = x + c;
        addBox(`WAITING_BENCH_${r}_${c}`, 4.6, 0.5, 0.9, bx, floor0Y + 0.25, bz, steelMat, 'Waiting Area', 0, 'furniture', true);
        addBox(`WAITING_BENCH_BACK_${r}_${c}`, 4.6, 0.55, 0.12, bx, floor0Y + 0.725, bz - 0.39, blueSignMat, 'Waiting Area', 0, 'furniture', true);
      }
    }
    for (const cx of [-6, 6]) {
      addBox(`USB_CHARGING_TOTEM_${cx}`, 0.55, 2.0, 0.55, x + cx, floor0Y + 1.0, hallZ - 12, darkWallMat, 'Waiting Area', 0, 'amenity', true);
      addBox(`USB_CHARGING_LED_${cx}`, 0.57, 0.15, 0.57, x + cx, floor0Y + 1.85, hallZ - 12, greenMat, 'Waiting Area', 0, 'amenity', false);
      const cRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.04, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.78 })
      );
      cRing.rotation.x = Math.PI / 2;
      cRing.position.set(x + cx, floor0Y + 1.25, hallZ - 12);
      group.add(cRing);
      chargingTotems.push({ x: x + cx, y: floor0Y + 1.0, z: hallZ - 12, ring: cRing });
    }

    // Central Master 4-Sided Live Train Schedule Totem
    addBox('MASTER_PIS_COLUMN', 1.2, 5.0, 1.2, x, floor0Y + 2.5, hallZ - 12, steelMat, 'Concourse', 0, 'structural', true);
    addBox('MASTER_PIS_ENCLOSURE', 7.5, 2.9, 1.6, x, floor0Y + 3.85, hallZ - 12, darkWallMat, 'Concourse', 0, 'amenity', false);
    addSchedulePISBoard(x, floor0Y + 3.85, hallZ - 11.15, 0);
    addSchedulePISBoard(x, floor0Y + 3.85, hallZ - 12.85, Math.PI);

    // Jal Seva Pure RO Drinking Water Kiosk (Concourse West) + Running Water Streams
    addBox('JAL_SEVA_BASE', 4.5, 0.8, 1.4, x - 32, floor0Y + 0.4, hallZ - 12, buffSandstoneMat, 'Water', 0, 'plumbing', true);
    addBox('JAL_SEVA_TROUGH', 4.2, 0.28, 0.9, x - 32, floor0Y + 0.94, hallZ - 12, steelMat, 'Water', 0, 'plumbing', false);
    for (let tap = -1.5; tap <= 1.5; tap += 1.0) {
      addBox('WATER_TAP', 0.08, 0.35, 0.35, x - 32 + tap, floor0Y + 1.25, hallZ - 12.35, chromeMat, 'Water', 0, 'plumbing', false);
      addWaterStreamEffect(x - 32 + tap, floor0Y + 1.2, hallZ - 12.22, 0.22);
    }
    addTextBoard('JAL SEVA · शीतल जल (RO WATER)', x - 32, floor0Y + 2.0, hallZ - 12.8, 5.2, 0.7, 'Water', 0);

    // =========================================================================
    // 5. USABLE WASHROOM COMPLEXES (MEN'S, WOMEN'S & ACCESSIBLE WITH DOORWAYS)
    // =========================================================================
    // Men's Washroom (Z: hallZ - 20 to -4) — clear 2.8m wide corridor doorway at Z = hallZ - 6
    addBox('MENS_WASHROOM_WALL_A', 0.22, 3.8, 9.0, x + 44, floor0Y + 1.9, hallZ - 16.5, wallMat, 'Toilets', 0, 'structural', true);
    addBox('MENS_WASHROOM_WALL_B', 0.22, 3.8, 3.5, x + 44, floor0Y + 1.9, hallZ - 6.0, wallMat, 'Toilets', 0, 'structural', true);
    addTextBoard('MEN TOILETS · पुरुष', x + 51, floor0Y + 3.2, hallZ - 4.4, 6.2, 0.75, 'Toilets', 0);
    for (let cub = 0; cub < 4; cub++) {
      const cz = hallZ - 19 + cub * 3.2;
      addBox(`MEN_CUBICLE_WALL_${cub + 1}`, 3.2, 2.6, 0.08, x + 53, floor0Y + 1.3, cz - 1.5, darkWallMat, 'Toilets', 0, 'plumbing', true);
      addCubicleDoorHinge(x + 51.4, floor0Y, cz - 1.32, 0, -1.48, x + 51.3, cz, cub % 2 === 0);
      addBox(`MEN_TOILET_COMMODE_${cub + 1}`, 0.6, 0.48, 0.8, x + 56, floor0Y + 0.24, cz, tileMat, 'Toilets', 0, 'plumbing', true);
      const mValve = addBox(`MEN_FLUSH_VALVE_${cub + 1}`, 0.16, 0.42, 0.16, x + 56, floor0Y + 0.7, cz - 0.38, chromeMat, 'Toilets', 0, 'plumbing', false);
      addToiletSwirlEffect(x + 56, floor0Y + 0.7, cz - 0.38, cz + 0.05, mValve);
    }
    addBox('MEN_VANITY_COUNTER', 5.5, 0.88, 0.8, x + 47.5, floor0Y + 0.44, hallZ - 8, darkWallMat, 'Toilets', 0, 'plumbing', true);
    addBox('MEN_VANITY_MIRROR', 5.2, 1.1, 0.06, x + 47.5, floor0Y + 1.65, hallZ - 8.38, mirrorMat, 'Toilets', 0, 'amenity', false);
    for (let bas = -1.8; bas <= 1.8; bas += 1.8) {
      addBox('MEN_WASHBASIN_SINK', 0.9, 0.18, 0.55, x + 47.5 + bas, floor0Y + 0.97, hallZ - 8, tileMat, 'Toilets', 0, 'plumbing', false);
      addBox('MEN_BASIN_TAP', 0.08, 0.34, 0.2, x + 47.5 + bas, floor0Y + 1.2, hallZ - 8.2, chromeMat, 'Toilets', 0, 'plumbing', false);
      addWaterStreamEffect(x + 47.5 + bas, floor0Y + 1.18, hallZ - 8.08, 0.2);
    }

    // Women's Washroom (Z: hallZ - 2 to +12) — Open doorway at Z = hallZ + 3
    addBox('WOMENS_WASHROOM_WALL_A', 0.22, 3.8, 5.0, x + 44, floor0Y + 1.9, hallZ - 1.5, wallMat, 'Toilets', 0, 'structural', true);
    addBox('WOMENS_WASHROOM_WALL_B', 0.22, 3.8, 6.0, x + 44, floor0Y + 1.9, hallZ + 9.0, wallMat, 'Toilets', 0, 'structural', true);
    addTextBoard('WOMEN TOILETS · महिला', x + 51, floor0Y + 3.2, hallZ + 11.4, 6.4, 0.75, 'Toilets', 0);
    for (let cub = 0; cub < 3; cub++) {
      const cz = hallZ + 1 + cub * 3.2;
      addBox(`WOMEN_CUBICLE_WALL_${cub + 1}`, 3.2, 2.6, 0.08, x + 53, floor0Y + 1.3, cz - 1.5, darkWallMat, 'Toilets', 0, 'plumbing', true);
      addCubicleDoorHinge(x + 51.4, floor0Y, cz - 1.32, 0, -1.48, x + 51.3, cz, cub === 1);
      addBox(`WOMEN_TOILET_COMMODE_${cub + 1}`, 0.6, 0.48, 0.8, x + 56, floor0Y + 0.24, cz, tileMat, 'Toilets', 0, 'plumbing', true);
      const wValve = addBox(`WOMEN_FLUSH_VALVE_${cub + 1}`, 0.16, 0.42, 0.16, x + 56, floor0Y + 0.7, cz - 0.38, chromeMat, 'Toilets', 0, 'plumbing', false);
      addToiletSwirlEffect(x + 56, floor0Y + 0.7, cz - 0.38, cz + 0.05, wValve);
    }
    addBox('WOMEN_VANITY_COUNTER', 5.0, 0.88, 0.8, x + 47.5, floor0Y + 0.44, hallZ + 6, darkWallMat, 'Toilets', 0, 'plumbing', true);
    for (let bas = -1.6; bas <= 1.6; bas += 1.6) {
      addBox('WOMEN_WASHBASIN_SINK', 0.9, 0.18, 0.55, x + 47.5 + bas, floor0Y + 0.97, hallZ + 6, tileMat, 'Toilets', 0, 'plumbing', false);
      addBox('WOMEN_BASIN_TAP', 0.08, 0.34, 0.2, x + 47.5 + bas, floor0Y + 1.2, hallZ + 5.8, chromeMat, 'Toilets', 0, 'plumbing', false);
      addWaterStreamEffect(x + 47.5 + bas, floor0Y + 1.18, hallZ + 5.92, 0.2);
    }

    // Accessible (Divyangjan) Toilet Wing
    addTextBoard('ACCESSIBLE TOILET · दिव्यांग', x + 51, floor0Y + 3.2, hallZ + 18.2, 6.8, 0.75, 'Toilets', 0);
    addCubicleDoorHinge(x + 51.4, floor0Y, hallZ + 15.8, 0, -1.48, x + 51.3, hallZ + 17, false);
    addBox('ACC_TOILET_COMMODE', 0.7, 0.52, 0.85, x + 55, floor0Y + 0.26, hallZ + 17, tileMat, 'Toilets', 0, 'plumbing', true);
    addBox('ACC_GRAB_BAR', 0.08, 0.08, 1.2, x + 54.2, floor0Y + 0.82, hallZ + 17, chromeMat, 'Toilets', 0, 'plumbing', false);
    const accValve = addBox('ACC_FLUSH_VALVE', 0.16, 0.42, 0.16, x + 55, floor0Y + 0.7, hallZ + 16.58, chromeMat, 'Toilets', 0, 'plumbing', false);
    addToiletSwirlEffect(x + 55, floor0Y + 0.7, hallZ + 16.58, hallZ + 17.05, accValve);

    // =========================================================================
    // 6. RPF POLICE THANA, CCTV COMMAND & MEDICAL FIRST-AID CLINIC (WEST WING)
    // =========================================================================
    // RPF Police Station & CCTV Room (Open doorway between Z = hallZ - 6 and -3)
    addBox('RPF_POLICE_WALL_N', 0.22, 3.8, 10.0, x - 44, floor0Y + 1.9, hallZ - 14.0, wallMat, 'Police', 0, 'structural', true);
    addBox('RPF_POLICE_WALL_S', 0.22, 3.8, 4.0, x - 44, floor0Y + 1.9, hallZ - 1.5, wallMat, 'Police', 0, 'structural', true);
    addBox('RPF_DUTY_DESK', 4.5, 1.1, 1.4, x - 51, floor0Y + 0.55, hallZ - 8, darkWallMat, 'Police', 0, 'furniture', true);
    addTextBoard('RAILWAY PROTECTION FORCE (RPF)', x - 51, floor0Y + 3.2, hallZ - 1.2, 9.5, 0.8, 'Police', 0);

    let cctvSharedMat: THREE.Material = blueSignMat;
    if (typeof document !== 'undefined') {
      const cCanvas = document.createElement('canvas');
      cCanvas.width = 512;
      cCanvas.height = 256;
      const cCtx = cCanvas.getContext('2d');
      const cTex = new THREE.CanvasTexture(cCanvas);
      cTex.colorSpace = THREE.SRGBColorSpace;
      if (cCtx) {
        cctvScreenTarget = { ctx: cCtx, tex: cTex };
      }
      cctvSharedMat = new THREE.MeshStandardMaterial({ map: cTex, emissive: 0x064e3b, emissiveIntensity: 0.45, roughness: 0.25 });
    }
    for (let mon = 0; mon < 8; mon++) {
      const mx = x - 56 + (mon % 4) * 2.5;
      const my = floor0Y + 1.8 + Math.floor(mon / 4) * 1.2;
      addBox(`CCTV_SCREEN_${mon + 1}`, 1.8, 1.0, 0.08, mx, my, hallZ - 18.8, cctvSharedMat, 'CCTV', 0, 'security', false);
    }

    // 6 Articulated Panning Overhead Security Dome Cameras
    for (const [camX, camY, camZ] of [
      [x, floor0Y + 4.0, hallZ + 22],
      [x - 28, floor0Y + 4.0, hallZ + 16],
      [x + 28, floor0Y + 4.0, hallZ + 12],
      [x - 36, floor1Y + 4.2, hallZ],
      [x - 64, floor3Y + 3.4, 210],
      [x + 64, floor3Y + 3.4, 210],
    ] as Array<[number, number, number]>) {
      const camMount = new THREE.Group();
      camMount.position.set(camX, camY, camZ);
      const baseStem = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.35, 10), charcoalMat);
      camMount.add(baseStem);
      const panGroup = new THREE.Group();
      panGroup.position.y = -0.22;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.42), steelMat);
      panGroup.add(head);
      const irMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 0.9 });
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), irMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.22;
      panGroup.add(lens);
      camMount.add(panGroup);
      group.add(camMount);
      cctvDomes.push({ panGroup, phase: camX * 0.17 + camZ * 0.11, irMat });
    }

    // Emergency First-Aid Medical Clinic (Open doorway at Z = hallZ + 7..+10)
    addBox('CLINIC_WALL_S', 0.22, 3.8, 9.0, x - 44, floor0Y + 1.9, hallZ + 15.5, wallMat, 'Medical', 0, 'structural', true);
    addBox('CLINIC_TRIAGE_BED_1', 2.2, 0.7, 1.0, x - 52, floor0Y + 0.35, hallZ + 13, tileMat, 'Medical', 0, 'furniture', true);
    addBox('CLINIC_TRIAGE_BED_2', 2.2, 0.7, 1.0, x - 52, floor0Y + 0.35, hallZ + 17, tileMat, 'Medical', 0, 'furniture', true);
    addBox('CLINIC_MEDICINE_CABINET', 1.8, 2.2, 0.6, x - 57, floor0Y + 1.1, hallZ + 15, darkWallMat, 'Medical', 0, 'furniture', true);
    addBox('CLINIC_RED_CROSS_SIGN', 1.2, 1.2, 0.14, x - 43.8, floor0Y + 3.2, hallZ + 14, redMat, 'Medical', 0, 'signage', false);
    addTextBoard('FIRST-AID CLINIC · चिकित्सा केंद्र', x - 51, floor0Y + 3.2, hallZ + 7.2, 8.2, 0.8, 'Medical', 0);

    // Cloakroom & Automated Interactive Digital Lockers with Hinged Doors & Keypads
    addBox('CLOAKROOM_COUNTER', 5.5, 1.1, 1.4, x - 32, floor0Y + 0.55, hallZ + 14, darkWallMat, 'Luggage', 0, 'furniture', true);
    for (let l = 0; l < 6; l++) {
      const lx = x - 35 + l * 1.25;
      addBox(`DIGITAL_LOCKER_${l + 1}`, 1.1, 2.1, 0.7, lx, floor0Y + 1.05, hallZ + 18.5, steelMat, 'Luggage', 0, 'amenity', true);
      const lDoorPivot = new THREE.Group();
      lDoorPivot.position.set(lx - 0.52, floor0Y + 1.05, hallZ + 18.14);
      const lDoor = new THREE.Mesh(new THREE.BoxGeometry(1.04, 1.96, 0.05), darkWallMat);
      lDoor.position.x = 0.52;
      lDoorPivot.add(lDoor);
      const lLedMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.75 });
      const lKeypad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.06), lLedMat);
      lKeypad.position.set(0.86, 0.12, -0.02);
      lDoorPivot.add(lKeypad);
      group.add(lDoorPivot);
      digitalLockers.push({
        id: l + 1,
        x: lx,
        y: floor0Y + 1.05,
        z: hallZ + 18.1,
        doorPivot: lDoorPivot,
        ledMat: lLedMat,
        isOpen: false,
        looted: false,
      });
    }
    addTextBoard('CLOAKROOM / DIGITAL LOCKERS', x - 32, floor0Y + 2.6, hallZ + 14.8, 7.8, 0.75, 'Luggage', 0);

    // =========================================================================
    // 7. ANIMATED ESCALATOR CORES (WEST & EAST) + ROOFTOP ACCESS STAIRCASE
    // =========================================================================
    const escalatorSteps: Array<{ mesh: THREE.Mesh; startX: number; endX: number; startY: number; endY: number; phase: number }> = [];

    const buildEscalatorFlight = (
      idPrefix: string,
      startX: number,
      endX: number,
      startY: number,
      endY: number,
      zPos: number,
      dirSign: 1 | -1
    ) => {
      const len = Math.abs(endX - startX);
      const height = endY - startY;
      const midX = (startX + endX) * 0.5;
      const midY = (startY + endY) * 0.5;
      const slopeAngle = Math.atan2(height, len) * (endX > startX ? 1 : -1);

      // Balustrade glass side walls & steel trusses (visual & clean)
      for (const side of [-1, 1]) {
        const glassRail = addBox(`${idPrefix}_BALUSTRADE_${side}`, len + 0.5, 1.05, 0.12, midX, midY + 0.55, zPos + side * 1.25, glassMat, 'Escalators', 0, 'structural', false, false, 'surface');
        glassRail.rotation.z = slopeAngle;
        const handRail = addBox(`${idPrefix}_HANDRAIL_${side}`, len + 0.6, 0.12, 0.16, midX, midY + 1.1, zPos + side * 1.25, charcoalMat, 'Escalators', 0, 'structural', false, false, 'surface');
        handRail.rotation.z = slopeAngle;
      }

      // Solid inclined deck base underneath steps
      const inclineRamp = addBox(`${idPrefix}_TRUSS_DECK`, len + 0.4, 0.32, 2.35, midX, midY - 0.18, zPos, steelMat, 'Escalators', 0, 'transit', false, false, 'surface');
      inclineRamp.rotation.z = slopeAngle;

      // 14 Animated Moving Metal Steps
      const numSteps = 14;
      for (let s = 0; s < numSteps; s++) {
        const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(len / numSteps + 0.08, 0.16, 2.2), charcoalMat);
        const prog = s / numSteps;
        stepMesh.position.set(
          THREE.MathUtils.lerp(startX, endX, prog),
          THREE.MathUtils.lerp(startY, endY, prog) - 0.05,
          zPos
        );
        group.add(stepMesh);
        escalatorSteps.push({
          mesh: stepMesh,
          startX,
          endX,
          startY,
          endY,
          phase: prog * dirSign,
        });
      }
    };

    // West Core Escalators (aligns exactly with PlayerController stair bounds X ∈ [-24, -14])
    buildEscalatorFlight('ESC_WEST_L0_L1', x - 24, x - 14, floor0Y, floor1Y, hallZ + 9, 1);
    buildEscalatorFlight('ESC_WEST_L1_L3', x - 24, x - 14, floor1Y, floor3Y, hallZ + 17, 1);

    // East Mirror Escalators (aligns with East core X ∈ [+14, +24])
    buildEscalatorFlight('ESC_EAST_L0_L1', x + 24, x + 14, floor0Y, floor1Y, hallZ + 9, 1);
    buildEscalatorFlight('ESC_EAST_L1_L3', x + 24, x + 14, floor1Y, floor3Y, hallZ + 17, 1);

    // Rooftop Access Escalator/Stair from Level 3 West Terrace up to Level 4 Helipad (X ∈ [-42, -30], Z = hallZ + 17)
    buildEscalatorFlight('STAIR_ROOF_L3_L4', x - 42, x - 30, floor3Y, floor4Y, hallZ + 17, 1);

    // =========================================================================
    // 8. LEVEL 1 MEZZANINE: IRCTC FOOD COURT, RETAIL MALL, VIP LOUNGE & CONTROL
    // =========================================================================
    const foodStalls = ['JAN AAHAAR', 'SOUTH INDIAN TIFFIN', 'ROYAL THALI', 'CHAI & SAMOSA', 'BAKERY & CAFE'];
    for (let s = 0; s < foodStalls.length; s++) {
      const sx = x - 32 + s * 16;
      addBox(`FOOD_STALL_COUNTER_${s + 1}`, 12.0, 1.15, 2.2, sx, floor1Y + 0.575, hallZ - 23, darkWallMat, 'Food Court', 1, 'furniture', true);
      addBox(`FOOD_STALL_KITCHEN_${s + 1}`, 11.0, 2.4, 0.8, sx, floor1Y + 1.2, hallZ - 25.0, buffSandstoneMat, 'Food Court', 1, 'furniture', true);
      addTextBoard(foodStalls[s], sx, floor1Y + 2.65, hallZ - 21.8, 10.5, 0.8, 'Food Court', 1);
      const grillLed = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.16, 0.25),
        new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.9 })
      );
      grillLed.position.set(sx, floor1Y + 1.25, hallZ - 22.3);
      group.add(grillLed);
      interactiveFoodCounters.push({ x: sx, y: floor1Y, z: hallZ - 21.5, name: foodStalls[s], led: grillLed });
    }

    // 6 Spinning Overhead Level 1 Ceiling Fans (Food Court + VIP Lounge)
    for (const [fx, fz] of [
      [x - 36, hallZ - 10],
      [x - 24, hallZ - 10],
      [x + 24, hallZ - 10],
      [x + 36, hallZ - 10],
      [x - 38, hallZ + 12],
      [x + 34, hallZ + 14],
    ] as Array<[number, number]>) {
      const fanDrop = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.85, 8), steelMat);
      fanDrop.position.set(fx, floor3Y - 0.55, fz);
      group.add(fanDrop);
      const fanRotor = new THREE.Group();
      fanRotor.position.set(fx, floor3Y - 0.96, fz);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.16, 12), darkWallMat);
      fanRotor.add(hub);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.03, 0.22), steelMat);
        blade.rotation.y = (b * Math.PI) / 2;
        blade.position.set(Math.cos((b * Math.PI) / 2) * 0.72, 0, -Math.sin((b * Math.PI) / 2) * 0.72);
        fanRotor.add(blade);
      }
      group.add(fanRotor);
      ceilingFans.push(fanRotor);
    }

    addBox('FOOD_COURT_HEADER_MARQUEE', 22.0, 2.2, 0.4, x - 28, floor1Y + 3.6, hallZ - 21.4, redMat, 'Food Court', 1, 'signage', false);
    addTextBoard('FOOD COURT  ·  भोजनालय', x - 28, floor1Y + 3.6, hallZ - 21.15, 20.0, 1.5, 'Food Court', 1, { bg: '#7f1d1d', border: '#fbbf24' });

    addBox('SHOPPING_HEADER_MARQUEE', 22.0, 2.2, 0.4, x + 28, floor1Y + 3.6, hallZ - 21.4, blueSignMat, 'Retail', 1, 'signage', false);
    addTextBoard('SHOPPING  ·  रेलवे बाज़ार', x + 28, floor1Y + 3.6, hallZ - 21.15, 20.0, 1.5, 'Retail', 1);

    // 12 Neatly Spaced Dining Tables & Seating (Zero overlap, positioned cleanly on West & East mezzanine slabs!)
    for (let r = 0; r < 3; r++) {
      const tz = hallZ - 14 + r * 5.5;
      for (const txOff of [-36, -24, 24, 36]) {
        const tx = x + txOff;
        addBox(`DINING_TABLE_${r}_${txOff}`, 2.4, 0.82, 1.35, tx, floor1Y + 0.41, tz, woodMat, 'Food Court', 1, 'furniture', true);
        for (const side of [-1, 1]) {
          addBox(`DINING_CHAIR_${r}_${txOff}_${side}`, 2.0, 0.46, 0.48, tx, floor1Y + 0.23, tz + side * 1.05, seatDiningMat, 'Food Court', 1, 'furniture', true);
        }
      }
    }

    // Retail Shops on East Mezzanine (A.H. Wheeler Bookstall + Pharmacy & Handloom Kiosk)
    addBox('AH_WHEELER_RETAIL_KIOSK', 8.5, 2.6, 3.2, x + 38, floor1Y + 1.3, hallZ + 12, redSandstoneMat, 'Retail', 1, 'furniture', true);
    addBox('BOOKSTALL_RACK', 7.5, 1.6, 0.5, x + 38, floor1Y + 0.8, hallZ + 10.1, woodMat, 'Retail', 1, 'furniture', true);
    addTextBoard('A.H. WHEELER & CO. (1877)', x + 38, floor1Y + 2.85, hallZ + 10.2, 8.2, 0.8, 'Retail', 1);

    addBox('HANDLOOM_EMPORIUM_KIOSK', 7.5, 2.4, 2.8, x + 28, floor1Y + 1.2, hallZ + 20, buffSandstoneMat, 'Retail', 1, 'furniture', true);
    addTextBoard('BHARAT HANDLOOM & TRAVEL GEAR', x + 28, floor1Y + 2.6, hallZ + 18.5, 7.2, 0.7, 'Retail', 1);

    // Executive AC VIP Lounge (West Mezzanine)
    addTextBoard('AC EXECUTIVE VIP LOUNGE', x - 38, floor1Y + 3.2, hallZ + 6.4, 11.0, 0.8, 'Lounge', 1);
    for (let lx = -46; lx <= -30; lx += 8) {
      for (const lz of [hallZ + 8, hallZ + 16]) {
        addBox('EXECUTIVE_ARMCHAIR', 1.4, 0.95, 1.4, x + lx, floor1Y + 0.475, lz, seatLoungeMat, 'Lounge', 1, 'furniture', true);
        addBox('COFFEE_TABLE', 1.5, 0.45, 0.85, x + lx, floor1Y + 0.225, lz + 1.7, woodMat, 'Lounge', 1, 'furniture', true);
      }
    }

    // Railway Traffic Command & Control Balcony (Level 1 North Link) with Dynamic Live Canvas Screen
    addBox('CONTROL_GAL_DESK', 12.0, 1.0, 1.2, x, floor1Y + 0.5, hallZ - 16, darkWallMat, 'Command', 1, 'furniture', true);
    let commandScreenMat: THREE.Material = blueSignMat;
    if (typeof document !== 'undefined') {
      const cmdCanvas = document.createElement('canvas');
      cmdCanvas.width = 1024;
      cmdCanvas.height = 256;
      const cmdCtx = cmdCanvas.getContext('2d');
      const cmdTex = new THREE.CanvasTexture(cmdCanvas);
      cmdTex.colorSpace = THREE.SRGBColorSpace;
      if (cmdCtx) {
        commandScreenTarget = { ctx: cmdCtx, tex: cmdTex };
      }
      commandScreenMat = new THREE.MeshStandardMaterial({ map: cmdTex, emissive: 0x075985, emissiveIntensity: 0.45, roughness: 0.25 });
    }
    addBox('CONTROL_GAL_SCREEN', 10.0, 1.4, 0.12, x, floor1Y + 1.75, hallZ - 16.5, commandScreenMat, 'Command', 1, 'amenity', false);
    addTextBoard('RAILWAY TRAFFIC CONTROL BALCONY', x, floor1Y + 3.0, hallZ - 16.5, 12.0, 0.75, 'Command', 1);

    // =========================================================================
    // 9. LEVEL 3: DUAL ENCLOSED SKYWALKS + OVER-TRACK AIR CONCOURSE BRIDGE
    // =========================================================================
    const skywalkSpanZ = 160;
    const skywalkCenterZ = 188;

    // 9A. West Departure Skywalk (X = x - 64) + Connector + 8 Platform Stairs
    addBox('WEST_SKYWALK_DECK', 9.5, 0.6, skywalkSpanZ, x - 64, floor3Y - 0.3, skywalkCenterZ, floorMat, 'Skywalk', 3, 'structural', true, false, 'surface');
    addBox('WEST_SKYWALK_CONNECTOR', 18, 0.6, 10.0, x - 55, floor3Y - 0.3, hallZ, floorMat, 'Skywalk', 3, 'structural', true, false, 'surface');
    for (const side of [-1, 1]) {
      addBox(`WEST_SKYWALK_GLASS_${side}`, 0.12, 3.6, skywalkSpanZ, x - 64 + side * 4.75, floor3Y + 1.8, skywalkCenterZ, glassMat, 'Skywalk', 3, 'structural', false, false, 'surface');
    }
    const westSkywalkRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, skywalkSpanZ, 16, 1, false, 0, Math.PI), skylightGlassMat);
    westSkywalkRoof.rotation.x = Math.PI / 2;
    westSkywalkRoof.position.set(x - 64, floor3Y + 3.6, skywalkCenterZ);
    group.add(westSkywalkRoof);
    addTextBoard('PLATFORMS 1-8  ·  WEST DEPARTURE SKYWALK', x - 64, floor3Y + 2.8, hallZ - 6, 8.4, 0.75, 'Skywalk', 3);

    // 9B. East Arrival Skywalk (X = x + 64) + Connector + 8 Platform Stairs
    addBox('EAST_SKYWALK_DECK', 9.5, 0.6, skywalkSpanZ, x + 64, floor3Y - 0.3, skywalkCenterZ, floorMat, 'Skywalk', 3, 'structural', true, false, 'surface');
    addBox('EAST_SKYWALK_CONNECTOR', 18, 0.6, 10.0, x + 55, floor3Y - 0.3, hallZ, floorMat, 'Skywalk', 3, 'structural', true, false, 'surface');
    for (const side of [-1, 1]) {
      addBox(`EAST_SKYWALK_GLASS_${side}`, 0.12, 3.6, skywalkSpanZ, x + 64 + side * 4.75, floor3Y + 1.8, skywalkCenterZ, glassMat, 'Skywalk', 3, 'structural', false, false, 'surface');
    }
    const eastSkywalkRoof = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.1, skywalkSpanZ, 16, 1, false, 0, Math.PI), skylightGlassMat);
    eastSkywalkRoof.rotation.x = Math.PI / 2;
    eastSkywalkRoof.position.set(x + 64, floor3Y + 3.6, skywalkCenterZ);
    group.add(eastSkywalkRoof);
    addTextBoard('PLATFORMS 1-8  ·  EAST ARRIVAL SKYWALK', x + 64, floor3Y + 2.8, hallZ - 6, 8.4, 0.75, 'Skywalk', 3);

    // 9C. Central Over-Track Air-Concourse Observation Promenade (X ∈ [-10, +10], Z ∈ [138, 240]) + Lateral Cross-Bridge at Z = 186
    addBox('AIR_CONCOURSE_MAIN_DECK', 20.0, 0.6, 108.0, x, floor3Y - 0.3, 190, floorMat, 'AirConcourse', 3, 'structural', true, false, 'surface');
    addBox('AIR_CONCOURSE_CROSS_LINK_W', 54.0, 0.6, 9.0, x - 37, floor3Y - 0.3, 186, floorMat, 'AirConcourse', 3, 'structural', true, false, 'surface');
    addBox('AIR_CONCOURSE_CROSS_LINK_E', 54.0, 0.6, 9.0, x + 37, floor3Y - 0.3, 186, floorMat, 'AirConcourse', 3, 'structural', true, false, 'surface');
    for (const side of [-1, 1]) {
      addBox(`AIR_CONCOURSE_GLASS_WALL_${side}`, 0.14, 3.6, 106, x + side * 9.9, floor3Y + 1.8, 190, glassMat, 'AirConcourse', 3, 'structural', true, false, 'surface');
    }
    const airConcourseVault = new THREE.Mesh(new THREE.CylinderGeometry(10.5, 10.5, 106, 20, 1, false, 0, Math.PI), skylightGlassMat);
    airConcourseVault.rotation.x = Math.PI / 2;
    airConcourseVault.position.set(x, floor3Y + 3.6, 190);
    group.add(airConcourseVault);

    // Air-Concourse Waiting Lounge Pods (Neatly centered)
    for (const acz of [154, 172, 204, 224]) {
      addBox(`AIR_CONCOURSE_BENCH_${acz}`, 5.2, 0.5, 1.2, x, floor3Y + 0.25, acz, steelMat, 'AirConcourse', 3, 'furniture', true);
    }
    addTextBoard('CENTRAL AIR-CONCOURSE OVERLOOK  ·  वातानुकूलित आकाश मार्ग', x, floor3Y + 3.1, 236, 15.0, 0.8, 'AirConcourse', 3);

    // Direct Staircases from BOTH West & East Skywalks down onto EVERY ONE of the 8 Island Platforms!
    for (let pIdx = 0; pIdx < platformTrackZs.length; pIdx++) {
      const trackZ = platformTrackZs[pIdx];
      const platformZ = trackZ + 6.0;
      const platformSurfaceY = trackSurfaceY(x, trackZ) + 0.95;
      const stairLen = 18.0;
      const stepsCount = 18;

      // West Skywalk Staircase (X = -64 down to X = -82)
      for (let s = 0; s < stepsCount; s++) {
        const prog = (s + 0.5) / stepsCount;
        const stepX = THREE.MathUtils.lerp(x - 64, x - 82, prog);
        const stepY = THREE.MathUtils.lerp(floor3Y, platformSurfaceY, prog);
        addBox(`PLAT_${pIdx + 1}_WEST_STEP_${s + 1}`, 1.15, 0.22, 2.4, stepX, stepY - 0.11, platformZ - 1.4, floorMat, 'Stairs', 0, 'transit', false, false, 'platform');
      }
      for (const hSide of [-1, 1]) {
        const wRail = addBox(`PLAT_${pIdx + 1}_WEST_RAIL_${hSide}`, stairLen, 0.1, 0.12, x - 73, (floor3Y + platformSurfaceY) / 2 + 0.85, platformZ - 1.4 + hSide * 1.2, steelMat, 'Stairs', 0, 'structural', false, false, 'platform');
        wRail.rotation.z = Math.atan((floor3Y - platformSurfaceY) / stairLen);
      }

      // East Skywalk Staircase (X = +64 down to X = +82)
      for (let s = 0; s < stepsCount; s++) {
        const prog = (s + 0.5) / stepsCount;
        const stepX = THREE.MathUtils.lerp(x + 64, x + 82, prog);
        const stepY = THREE.MathUtils.lerp(floor3Y, platformSurfaceY, prog);
        addBox(`PLAT_${pIdx + 1}_EAST_STEP_${s + 1}`, 1.15, 0.22, 2.4, stepX, stepY - 0.11, platformZ + 1.4, floorMat, 'Stairs', 0, 'transit', false, false, 'platform');
      }
      for (const hSide of [-1, 1]) {
        const eRail = addBox(`PLAT_${pIdx + 1}_EAST_RAIL_${hSide}`, stairLen, 0.1, 0.12, x + 73, (floor3Y + platformSurfaceY) / 2 + 0.85, platformZ + 1.4 + hSide * 1.2, steelMat, 'Stairs', 0, 'structural', false, false, 'platform');
        eRail.rotation.z = -Math.atan((floor3Y - platformSurfaceY) / stairLen);
      }
    }

    // =========================================================================
    // 10. LEVEL 4: ROOFTOP HELIPAD, SOLAR SANCTUARY ARRAY & WATCHTOWERS
    // =========================================================================
    // Perimeter Glass Parapet around Roof Terrace
    addBox('ROOF_PARAPET_N_W', 46, 1.1, 0.18, x - 29, floor4Y + 0.55, hallZ - 22.8, glassMat, 'Rooftop', 4, 'structural', true);
    addBox('ROOF_PARAPET_N_E', 46, 1.1, 0.18, x + 29, floor4Y + 0.55, hallZ - 22.8, glassMat, 'Rooftop', 4, 'structural', true);
    addBox('ROOF_PARAPET_S_W', 46, 1.1, 0.18, x - 29, floor4Y + 0.55, hallZ + 22.8, glassMat, 'Rooftop', 4, 'structural', true);
    addBox('ROOF_PARAPET_S_E', 46, 1.1, 0.18, x + 29, floor4Y + 0.55, hallZ + 22.8, glassMat, 'Rooftop', 4, 'structural', true);

    // Emergency Helipad Landing Circle (East Terrace X = +29, Z = hallZ)
    const helipadCircle = new THREE.Mesh(new THREE.CylinderGeometry(11.5, 11.5, 0.1, 32), charcoalMat);
    helipadCircle.position.set(x + 29, floor4Y + 0.05, hallZ);
    group.add(helipadCircle);
    const helipadRing = new THREE.Mesh(new THREE.RingGeometry(9.6, 10.4, 32), yellowMat);
    helipadRing.rotation.x = -Math.PI / 2;
    helipadRing.position.set(x + 29, floor4Y + 0.12, hallZ);
    group.add(helipadRing);
    // Giant "H" marking
    addBox('HELIPAD_H_LEFT', 1.2, 0.06, 7.6, x + 26.2, floor4Y + 0.12, hallZ, tileMat, 'Rooftop', 4, 'signage', false);
    addBox('HELIPAD_H_RIGHT', 1.2, 0.06, 7.6, x + 31.8, floor4Y + 0.12, hallZ, tileMat, 'Rooftop', 4, 'signage', false);
    addBox('HELIPAD_H_BAR', 4.4, 0.06, 1.2, x + 29.0, floor4Y + 0.12, hallZ, tileMat, 'Rooftop', 4, 'signage', false);

    // Helipad Perimeter Aviation Beacons
    const helipadBeacons: THREE.Mesh[] = [];
    for (let b = 0; b < 8; b++) {
      const ang = (b / 8) * Math.PI * 2;
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), b % 2 === 0 ? amberMat : greenMat);
      beacon.position.set(x + 29 + Math.cos(ang) * 11.0, floor4Y + 0.28, hallZ + Math.sin(ang) * 11.0);
      group.add(beacon);
      helipadBeacons.push(beacon);
    }

    // Helipad Telemetry & Aviation Console + Rotating Radar Dish + Fluttering Wind Sock
    addBox('HELIPAD_RADAR_CONSOLE', 2.2, 1.15, 0.9, helipadConsolePos.x, floor4Y + 0.575, helipadConsolePos.z, darkWallMat, 'Rooftop', 4, 'amenity', true);
    addTextBoard('SANCTUARY HELIPAD · SOLAR GRID', x + 15, floor4Y + 2.2, hallZ + 12, 7.5, 0.75, 'Rooftop', 4);

    const radarMast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 2.8, 12), steelMat);
    radarMast.position.set(helipadConsolePos.x - 1.8, floor4Y + 1.4, helipadConsolePos.z);
    group.add(radarMast);
    const radarDishPivot = new THREE.Group();
    radarDishPivot.position.set(helipadConsolePos.x - 1.8, floor4Y + 2.95, helipadConsolePos.z);
    const radarBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.36, 0.22), tileMat);
    const radarFeed = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, 0.55), redMat);
    radarFeed.position.z = 0.25;
    radarDishPivot.add(radarBar, radarFeed);
    group.add(radarDishPivot);

    const windsockMast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 10), chromeMat);
    windsockMast.position.set(x + 41.5, floor4Y + 2.1, hallZ - 11.5);
    group.add(windsockMast);
    const windsockPivot = new THREE.Group();
    windsockPivot.position.set(x + 41.5, floor4Y + 4.1, hallZ - 11.5);
    const sockMatOrange = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.7 });
    const sockMatWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    for (let ws = 0; ws < 3; ws++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28 - ws * 0.05, 0.23 - ws * 0.05, 0.55, 12),
        ws % 2 === 0 ? sockMatOrange : sockMatWhite
      );
      seg.rotation.z = Math.PI / 2;
      seg.position.x = 0.3 + ws * 0.52;
      windsockPivot.add(seg);
    }
    group.add(windsockPivot);

    // Clean-Energy Photovoltaic Solar Canopy Array (West Terrace X = -30) with Pulsing Inverter LEDs
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 5; col++) {
        const spx = x - 44 + col * 6.5;
        const spz = hallZ - 14 + row * 7.0;
        addBox(`SOLAR_MOUNT_${row}_${col}`, 0.3, 0.85, 0.3, spx, floor4Y + 0.425, spz, steelMat, 'Solar', 4, 'amenity', true);
        const panel = addBox(`SOLAR_PANEL_${row}_${col}`, 5.2, 0.1, 3.0, spx, floor4Y + 1.05, spz, solarPanelMat, 'Solar', 4, 'amenity', false, true, 'surface');
        panel.rotation.x = 0.25;
        const invMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a, emissiveIntensity: 0.75 });
        const invLed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), invMat);
        invLed.position.set(spx, floor4Y + 0.75, spz + 0.2);
        group.add(invLed);
        solarInverterMats.push(invMat);
      }
    }

    // =========================================================================
    // 11. FOUR MODERN TRANSPARENT GLASS ELEVATORS (GROUND -> L1 -> L3)
    // =========================================================================
    const liftShafts = [
      { lx: x - 48, lz: hallZ - 14, label: 'LIFT 1 (Left)', liftIdx: 1 },
      { lx: x - 48, lz: hallZ + 14, label: 'LIFT 2 (Left)', liftIdx: 2 },
      { lx: x + 48, lz: hallZ - 14, label: 'LIFT 3 (Right)', liftIdx: 3 },
      { lx: x + 48, lz: hallZ + 14, label: 'LIFT 4 (Right)', liftIdx: 4 },
    ];
    const liftCabins: THREE.Group[] = [];

    liftShafts.forEach((lift, index) => {
      addBox(`LIFT_${lift.liftIdx}_SHAFT_REAR`, 3.4, 13.5, 0.18, lift.lx, y + 6.75, lift.lz - 1.7, glassMat, 'Elevators', 0, 'structural', true, false, 'surface');
      addBox(`LIFT_${lift.liftIdx}_SHAFT_LEFT`, 0.18, 13.5, 3.4, lift.lx - 1.7, y + 6.75, lift.lz, glassMat, 'Elevators', 0, 'structural', true, false, 'surface');
      addBox(`LIFT_${lift.liftIdx}_SHAFT_RIGHT`, 0.18, 13.5, 3.4, lift.lx + 1.7, y + 6.75, lift.lz, glassMat, 'Elevators', 0, 'structural', true, false, 'surface');

      for (const cx of [-1.7, 1.7]) {
        for (const cz of [-1.7, 1.7]) {
          addBox(`LIFT_${lift.liftIdx}_POST`, 0.18, 13.5, 0.18, lift.lx + cx, y + 6.75, lift.lz + cz, steelMat, 'Elevators', 0, 'structural', false, false, 'surface');
        }
      }

      const cabin = new THREE.Group();
      cabin.name = `MEGA_LIFT_CABIN_${lift.liftIdx}`;
      cabin.position.set(lift.lx, floor0Y, lift.lz);
      cabin.userData = {
        liftCabin: true,
        liftIndex: lift.liftIdx,
        baseY: floor0Y,
        currentY: floor0Y,
        targetY: floor0Y,
        phase: index * 1.5,
        manualHoldTimer: 0,
        doorsOpen: false,
      };

      const cFloor = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 2.6), floorMat);
      cabin.add(cFloor);
      const cRoof = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 2.6), darkWallMat);
      cRoof.position.y = 2.85;
      cabin.add(cRoof);
      const cBack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 0.12), steelMat);
      cBack.position.set(0, 1.4, -1.25); cabin.add(cBack);
      const cSideL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 2.5), glassMat);
      cSideL.position.set(-1.25, 1.4, 0); cabin.add(cSideL);
      const cSideR = cSideL.clone();
      cSideR.position.x = 1.25; cabin.add(cSideR);

      const cDoorL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.08), glassMat);
      cDoorL.position.set(-0.3, 1.3, 1.25); cDoorL.userData.doorSide = -1; cabin.add(cDoorL);
      const cDoorR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.6, 0.08), glassMat);
      cDoorR.position.set(0.3, 1.3, 1.25); cDoorR.userData.doorSide = 1; cabin.add(cDoorR);

      const cabinLed = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 1.6), warmLightMat);
      cabinLed.position.set(0, 2.74, 0);
      cabin.add(cabinLed);

      group.add(cabin);
      liftCabins.push(cabin);

      // Headers and Call Panels at all 3 stops
      for (const [fIdx, fy] of [[0, floor0Y], [1, floor1Y], [3, floor3Y]] as Array<[0 | 1 | 3, number]>) {
        addBox(`LIFT_${lift.liftIdx}_HEADER_${fIdx}`, 3.8, 0.8, 0.3, lift.lx, fy + 3.6, lift.lz + 1.6, blueSignMat, 'Elevators', fIdx, 'signage', false);
        addTextBoard(lift.label, lift.lx, fy + 3.6, lift.lz + 1.8, 3.6, 0.55, 'Elevators', fIdx);
        const callPanel = addBox(`LIFT_${lift.liftIdx}_CALL_${fIdx}`, 0.28, 0.9, 0.14, lift.lx + 2.05, fy + 1.2, lift.lz + 1.4, darkWallMat, 'Elevators', fIdx, 'amenity', false, false, 'wall');
        callPanel.userData.isLiftCallPanel = true;
        callPanel.userData.liftIndex = lift.liftIdx;
      }

      // Potted Indoor Palms flanking Ground entrance
      for (const pSide of [-2.3, 2.3]) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.8, 12), darkWallMat);
        pot.position.set(lift.lx + pSide, floor0Y + 0.4, lift.lz + 1.4);
        group.add(pot);
        const palm = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 8), new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 }));
        palm.position.set(lift.lx + pSide, floor0Y + 1.2, lift.lz + 1.4);
        group.add(palm);
      }
    });

    // =========================================================================
    // 12. EIGHT ISLAND PLATFORMS + GRAND VAULTED STEEL & GLASS TRAINSHED
    // =========================================================================
    // Giant 4-Bay Arched Vaulted Trainshed spanning all 8 Tracks (Z: 132 to 234)
    const trainshedSpanZ = [144, 168, 192, 216];
    const trainshedWidthX = 176;
    for (const bayZ of trainshedSpanZ) {
      const shedCenterY = trackSurfaceY(x, bayZ) + 7.2;
      const shedVault = new THREE.Mesh(
        new THREE.CylinderGeometry(12.2, 12.2, trainshedWidthX, 24, 1, true, 0, Math.PI),
        skylightGlassMat
      );
      shedVault.rotation.z = Math.PI / 2;
      shedVault.position.set(x, shedCenterY, bayZ);
      group.add(shedVault);

      // Heavy Steel Arched Roof Trusses every 32m along X
      for (const rx of [-72, -36, 0, 36, 72]) {
        const truss = new THREE.Mesh(new THREE.TorusGeometry(12.2, 0.22, 6, 22, Math.PI), steelMat);
        truss.rotation.y = Math.PI / 2;
        truss.position.set(x + rx, shedCenterY, bayZ);
        group.add(truss);
      }
    }

    for (let i = 0; i < platformTrackZs.length; i++) {
      const trackZ = platformTrackZs[i];
      const platformZ = trackZ + 6.0;
      const platformSurfaceY = trackSurfaceY(x, trackZ) + 0.95;
      const platLen = 176.0;
      const platWidth = 6.2;

      // Flush Granite Platform Deck (Exact alignment with PlayerController)
      addBox(`ISLAND_PLATFORM_DECK_${i + 1}`, platLen, 0.95, platWidth, x, platformSurfaceY - 0.475, platformZ, buffSandstoneMat, `Platform ${i + 1}`, 0, 'structural', true, false, 'platform');

      // Dual Yellow Tactile Warning Safety Borders
      for (const eSide of [-1, 1]) {
        addBox(`TACTILE_YELLOW_STRIP_${i + 1}_${eSide}`, platLen, 0.04, 0.42, x, platformSurfaceY + 0.02, platformZ + eSide * (platWidth / 2 - 0.24), yellowMat, `Platform ${i + 1}`, 0, 'transit', false, false, 'platform');
      }

      // Heavy Steel Platform Support Pillars
      for (const colX of [-72, -36, 0, 36, 72]) {
        addBox(`PLATFORM_COLUMN_${i + 1}_${colX}`, 0.36, 5.2, 0.36, x + colX, platformSurfaceY + 2.6, platformZ, steelMat, `Platform ${i + 1}`, 0, 'structural', true, true, 'platform');
      }

      // Suspended Platform Luminaires
      for (const lx of [-54, -18, 18, 54]) {
        addBox(`PLAT_LIGHT_FIXTURE_${i + 1}_${lx}`, 3.8, 0.14, 0.36, x + lx, platformSurfaceY + 5.1, platformZ, warmLightMat, `Platform ${i + 1}`, 0, 'amenity', false, false, 'platform');
      }

      // Luminous Blue Indian Railways Platform Indicator Cube (1 to 8)
      addBox(`PLATFORM_NUMBER_CUBE_${i + 1}`, 2.0, 2.0, 2.0, x, platformSurfaceY + 5.8, platformZ, blueSignMat, `Platform ${i + 1}`, 0, 'signage', false, false, 'platform');
      addTextBoard(`${i + 1}`, x, platformSurfaceY + 5.8, platformZ + 1.05, 1.6, 1.6, `Platform ${i + 1}`, 0);

      // Electronic 7-Coach Guidance LED Board
      addBox(`COACH_GUIDANCE_DISPLAY_${i + 1}`, 22.0, 0.72, 0.22, x, platformSurfaceY + 4.1, platformZ, darkWallMat, `Platform ${i + 1}`, 0, 'signage', false, false, 'platform');
      addTextBoard('ENG | H1 | A1 | A2 | B1 | B2 | S1 | GS', x, platformSurfaceY + 4.1, platformZ + 0.13, 21.5, 0.55, `Platform ${i + 1}`, 0);

      // Platform Benches (offset neatly clear of pillars)
      for (const bx of [-48, -16, 16, 48]) {
        addBox(`PLATFORM_BENCH_${i + 1}_${bx}`, 4.4, 0.5, 0.85, x + bx, platformSurfaceY + 0.25, platformZ, steelMat, `Platform ${i + 1}`, 0, 'furniture', true, true, 'platform');
      }

      // Dual-Faced Platform Clock with Live Rotating Analog Hands
      const pClock = new THREE.Mesh(new THREE.CircleGeometry(0.65, 24), new THREE.MeshBasicMaterial({ color: 0xf8fafc }));
      pClock.position.set(x - 28, platformSurfaceY + 4.0, platformZ + 0.2); group.add(pClock);
      const pRim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 8, 24), chromeMat);
      pRim.position.copy(pClock.position); group.add(pRim);

      const pHPivot = new THREE.Group();
      pHPivot.position.set(x - 28, platformSurfaceY + 4.0, platformZ + 0.22);
      const pHBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.02), charcoalMat);
      pHBar.position.y = 0.15;
      pHPivot.add(pHBar);
      group.add(pHPivot);
      clockHourHands.push(pHPivot);

      const pMPivot = new THREE.Group();
      pMPivot.position.set(x - 28, platformSurfaceY + 4.0, platformZ + 0.235);
      const pMBar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), redMat);
      pMBar.position.y = 0.22;
      pMPivot.add(pMBar);
      group.add(pMPivot);
      clockMinuteHands.push(pMPivot);

      // Platform Jal Seva Drinking Water Tap Station + Animated Stream
      addBox(`PLATFORM_WATER_${i + 1}`, 2.4, 0.95, 0.8, x + 28, platformSurfaceY + 0.475, platformZ, buffSandstoneMat, `Platform ${i + 1}`, 0, 'plumbing', true, true, 'platform');
      addBox(`PLATFORM_TAP_${i + 1}`, 0.08, 0.34, 0.2, x + 28, platformSurfaceY + 1.12, platformZ - 0.35, chromeMat, `Platform ${i + 1}`, 0, 'plumbing', false, false, 'platform');
      addWaterStreamEffect(x + 28, platformSurfaceY + 1.08, platformZ - 0.24, 0.18);
    }

    // =========================================================================
    // 13. EXECUTE AUTOMATIC PLACEMENT VALIDATION AUDIT
    // =========================================================================
    stationPlacementValidator.runAudit(floorHeightsMap, stationIndex);

    // =========================================================================
    // 14. REAL-TIME ANIMATION LOOP (ALL STATION MECHANISMS ZERO-ALLOCATION)
    // =========================================================================
    let timeElapsed = 0;

    const update = (delta: number, playerPos: THREE.Vector3, liveScheduleRows?: LiveStationScheduleRow[]) => {
      timeElapsed += delta;
      if (bookstallCooldown > 0) bookstallCooldown = Math.max(0, bookstallCooldown - delta);
      if (clinicSupplyCooldown > 0) clinicSupplyCooldown = Math.max(0, clinicSupplyCooldown - delta);
      if (xrayBoostTimer > 0) xrayBoostTimer = Math.max(0, xrayBoostTimer - delta);
      if (radarBoostTimer > 0) radarBoostTimer = Math.max(0, radarBoostTimer - delta);
      if (fountainSurgeTimer > 0) fountainSurgeTimer = Math.max(0, fountainSurgeTimer - delta);
      if (chargeBoostTimer > 0) chargeBoostTimer = Math.max(0, chargeBoostTimer - delta);
      if (transitPulseTimer > 0) transitPulseTimer = Math.max(0, transitPulseTimer - delta);
      if (helpDeskPulseTimer > 0) helpDeskPulseTimer = Math.max(0, helpDeskPulseTimer - delta);

      const distStationSq = (playerPos.x - x) * (playerPos.x - x) + (playerPos.z - hallZ) * (playerPos.z - hallZ);
      if (distStationSq > 78400) return; // Distance-cull station animation ticks beyond 280m

      // 1. Proximity Sliding Entrance Doors
      for (const door of slidingDoors) {
        const dist = Math.hypot(
          playerPos.x - door.position.x,
          playerPos.y - door.position.y,
          playerPos.z - door.position.z
        );
        const isOpen = dist < 5.2;
        const targetX = isOpen ? door.userData.baseX + door.userData.slideOffset : door.userData.baseX;
        door.position.x = THREE.MathUtils.damp(door.position.x, targetX, 5.5, delta);
      }

      // 2. Smooth Glass Elevators Cycle + Manual Override
      for (const cabin of liftCabins) {
        if (cabin.userData.manualHoldTimer > 0) {
          cabin.userData.manualHoldTimer = Math.max(0, cabin.userData.manualHoldTimer - delta);
        } else {
          const cycleTime = 18.0;
          const phase = (timeElapsed + cabin.userData.phase) % cycleTime;
          let targetFloorY = floor0Y;
          if (phase > 12.0) targetFloorY = floor3Y;
          else if (phase > 6.0) targetFloorY = floor1Y;
          cabin.userData.targetY = targetFloorY;
        }

        cabin.position.y = THREE.MathUtils.damp(cabin.position.y, cabin.userData.targetY, 2.4, delta);
        cabin.userData.currentY = cabin.position.y;

        const isArrived = Math.abs(cabin.position.y - cabin.userData.targetY) < 0.09;
        const doorTargetOffset = isArrived ? 0.56 : 0.0;
        cabin.traverse((child) => {
          if (child.userData.doorSide) {
            const side = child.userData.doorSide;
            const closedX = side * 0.3;
            child.position.x = THREE.MathUtils.damp(child.position.x, closedX + side * doorTargetOffset, 4.5, delta);
          }
        });
      }

      // 3. Animated Moving Escalator Steps
      for (const step of escalatorSteps) {
        step.phase = (step.phase + delta * 0.16) % 1.0;
        if (step.phase < 0) step.phase += 1.0;
        step.mesh.position.x = THREE.MathUtils.lerp(step.startX, step.endX, step.phase);
        step.mesh.position.y = THREE.MathUtils.lerp(step.startY, step.endY, step.phase) - 0.05;
      }

      // 4. Live Ticking Clock Hands (Tower + All 8 Platforms) & Waving Tiranga Flag
      const now = new Date();
      const secTotal = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() + timeElapsed + clockTowerHourOffset;
      const minAngle = -((secTotal % 3600) / 3600) * Math.PI * 2;
      const hourAngle = -((secTotal % 43200) / 43200) * Math.PI * 2;
      for (const h of clockHourHands) h.rotation.z = hourAngle;
      for (const m of clockMinuteHands) m.rotation.z = minAngle;

      flagPivot.rotation.y = Math.sin(timeElapsed * 2.4) * 0.18;
      flagMeshGroup.rotation.z = Math.sin(timeElapsed * 3.1) * 0.04;

      // 5. Pulsing Fountain Jet, Expanding Ripples & Helipad Beacons
      const surgeAmp = fountainSurgeTimer > 0 ? 1.32 : 1.0;
      const pulse = 0.94 + Math.sin(timeElapsed * 4.5) * 0.06;
      fountainJet.scale.set(pulse * surgeAmp, (0.96 + Math.sin(timeElapsed * 3.2) * 0.04) * surgeAmp, pulse * surgeAmp);
      for (const rp of fountainRipples) {
        rp.phase = (rp.phase + delta * (fountainSurgeTimer > 0 ? 0.55 : 0.28)) % 1.0;
        const rScale = 0.8 + rp.phase * rp.maxRadius;
        rp.mesh.scale.set(rScale, rScale, 1);
        const rpMat = rp.mesh.material as THREE.MeshBasicMaterial;
        rpMat.opacity = Math.max(0.02, (1.0 - rp.phase) * (fountainSurgeTimer > 0 ? 0.72 : 0.48));
      }

      const beaconRate = radarBoostTimer > 0 ? 6.0 : 2.0;
      const beaconOn = Math.floor(timeElapsed * beaconRate) % 2 === 0;
      helipadBeacons.forEach((b, idx) => {
        b.visible = (idx % 2 === 0) ? beaconOn : !beaconOn;
      });

      // 6. Rooftop Aviation Radar Dish, Wind Sock & Solar Inverter LEDs
      radarDishPivot.rotation.y += delta * (radarBoostTimer > 0 ? 3.8 : 1.15);
      windsockPivot.rotation.y = Math.sin(timeElapsed * 1.4) * 0.22;
      windsockPivot.rotation.z = Math.sin(timeElapsed * 4.2) * 0.08 - 0.12;
      const invIntensity = 0.45 + Math.sin(timeElapsed * 3.0) * 0.35;
      for (const im of solarInverterMats) im.emissiveIntensity = invIntensity;

      // 7. Forecourt Checkpoint Boom Barriers
      for (const boom of boomBarriers) {
        if (boom.overrideTimer > 0) boom.overrideTimer = Math.max(0, boom.overrideTimer - delta);
        const dist = Math.hypot(playerPos.x - boom.x, playerPos.z - boom.z);
        const shouldOpen = boom.overrideTimer > 0 ? boom.manualOpen : dist < 11.0;
        const targetRot = shouldOpen ? boom.openSign * 1.32 : 0;
        boom.pivot.rotation.z = THREE.MathUtils.damp(boom.pivot.rotation.z, targetRot, 5.0, delta);
        if (shouldOpen) {
          boom.beaconMat.color.setHex(0x22c55e);
          boom.beaconMat.emissive.setHex(0x16a34a);
        } else {
          boom.beaconMat.color.setHex(0xef4444);
          boom.beaconMat.emissive.setHex(0xb91c1c);
        }
      }

      // 8. Auto-Rickshaws & Electric Bus AC Fans + Hazard Beacons
      for (const fan of busAcFans) {
        fan.rotation.y += delta * 14.0;
      }
      const hazardPulse = transitPulseTimer > 0
        ? (Math.sin(timeElapsed * 14.0) > 0 ? 1.5 : 0.2)
        : (Math.sin(timeElapsed * 4.0) > 0 ? 0.95 : 0.25);
      for (const tb of transitBeacons) tb.emissiveIntensity = hazardPulse;

      // 9. Baggage X-Ray Conveyor Loop & DFMD Walk-Through Security Arches
      const xraySpeed = xrayBoostTimer > 0 ? 0.38 : 0.16;
      for (const xp of xrayParcels) {
        xp.phase = (xp.phase + delta * xraySpeed) % 1.0;
        xp.mesh.position.x = x - 31.4 + xp.phase * 6.8;
      }
      xrayScanCurtainMat.opacity = (xrayBoostTimer > 0 ? 0.72 : 0.42) + Math.sin(timeElapsed * 9.0) * 0.14;

      for (const arch of dfmdUnits) {
        if (arch.beepCooldown > 0) arch.beepCooldown = Math.max(0, arch.beepCooldown - delta);
        const inArch =
          Math.abs(playerPos.x - arch.x) < 0.72 &&
          Math.abs(playerPos.z - arch.z) < 0.72 &&
          Math.abs(playerPos.y - floor0Y) < 2.2;
        if (inArch && arch.beepCooldown <= 0) {
          arch.beepCooldown = 2.4;
          soundEngine.playSecurityBeep();
        }
        const activeBeep = arch.beepCooldown > 1.75;
        arch.ledMat.color.setHex(activeBeep ? 0x38bdf8 : 0x22c55e);
        arch.ledMat.emissive.setHex(activeBeep ? 0x0ea5e9 : 0x16a34a);
        arch.ledMat.emissiveIntensity = activeBeep ? 1.5 : 0.65;
      }

      // 10. Biometric Departure & Arrival E-Gates
      for (const gate of eGateUnits) {
        if (gate.manualTimer > 0) gate.manualTimer = Math.max(0, gate.manualTimer - delta);
        if (gate.beepCooldown > 0) gate.beepCooldown = Math.max(0, gate.beepCooldown - delta);
        const nearGate =
          Math.abs(playerPos.x - gate.x) < 2.1 &&
          Math.abs(playerPos.z - gate.z) < 2.2 &&
          Math.abs(playerPos.y - floor0Y) < 2.2;
        if (nearGate && gate.beepCooldown <= 0) {
          gate.beepCooldown = 3.2;
          soundEngine.playSecurityBeep();
        }
        const isGateOpen = nearGate || gate.manualTimer > 0;
        const targetFlap = isGateOpen ? 1.38 : 0;
        gate.leftPivot.rotation.y = THREE.MathUtils.damp(gate.leftPivot.rotation.y, targetFlap, 8.0, delta);
        gate.rightPivot.rotation.y = THREE.MathUtils.damp(gate.rightPivot.rotation.y, -targetFlap, 8.0, delta);
        gate.lightMat.emissiveIntensity = isGateOpen ? 1.45 : 0.65;
      }

      // 11. USB Charging Totems & Reception Help Monitors
      for (const ct of chargingTotems) {
        const ringScale = chargeBoostTimer > 0 ? 1.28 + Math.sin(timeElapsed * 10.0) * 0.1 : 1.0 + Math.sin(timeElapsed * 4.0) * 0.06;
        ct.ring.scale.set(ringScale, ringScale, 1);
      }
      const helpGlow = helpDeskPulseTimer > 0 ? 1.4 + Math.sin(timeElapsed * 12) * 0.3 : 0.65;
      helpMonitorMat1.emissiveIntensity = helpGlow;
      helpMonitorMat2.emissiveIntensity = helpGlow;

      // 12. Water Streams, Flush Swirls, Cubicle Doors, Locker Doors
      for (const tap of waterTapStates) {
        if (tap.timer > 0) {
          tap.timer = Math.max(0, tap.timer - delta);
          tap.stream.visible = true;
          tap.stream.scale.set(0.85 + Math.sin(timeElapsed * 24) * 0.15, 1, 0.85 + Math.cos(timeElapsed * 24) * 0.15);
        } else {
          tap.stream.visible = false;
        }
      }
      for (const fl of flushValveStates) {
        if (fl.timer > 0) {
          fl.timer = Math.max(0, fl.timer - delta);
          fl.swirl.visible = true;
          fl.swirl.rotation.z += delta * 9.5;
          const s = 0.75 + Math.sin(timeElapsed * 14) * 0.2;
          fl.swirl.scale.set(s, s, 1);
          fl.lever.position.z = fl.baseLeverZ + 0.04;
        } else {
          fl.swirl.visible = false;
          fl.lever.position.z = THREE.MathUtils.damp(fl.lever.position.z, fl.baseLeverZ, 8, delta);
        }
      }
      for (const cd of cubicleDoors) {
        const target = cd.isOpen ? cd.openRot : cd.restRot;
        cd.pivot.rotation.y = THREE.MathUtils.damp(cd.pivot.rotation.y, target, 7.0, delta);
      }
      for (const lk of digitalLockers) {
        const target = lk.isOpen ? -1.42 : 0;
        lk.doorPivot.rotation.y = THREE.MathUtils.damp(lk.doorPivot.rotation.y, target, 7.5, delta);
      }

      // 13. Overhead Panning CCTV Cameras & Level 1 Food Court Ceiling Fans
      for (const fan of ceilingFans) {
        fan.rotation.y += delta * 7.8;
      }
      const irPulse = Math.floor(timeElapsed * 2.5) % 2 === 0 ? 1.15 : 0.35;
      for (const cam of cctvDomes) {
        cam.panGroup.rotation.y = Math.sin(timeElapsed * 0.75 + cam.phase) * 0.72;
        cam.irMat.emissiveIntensity = irPulse;
      }

      // 14. Throttled Live PIS Boards & Security / Traffic Command Canvas Telemetry
      if (distStationSq < 19600) {
        pisUpdateTimer += delta;
        if (pisUpdateTimer >= 1.15 && pisCanvasTargets.length > 0) {
          pisUpdateTimer = 0;
          const clockStr = now.toLocaleTimeString('en-IN', { hour12: false });
          const blink = Math.floor(timeElapsed * 2.0) % 2 === 0;
          const rows = liveScheduleRows && liveScheduleRows.length > 0 ? liveScheduleRows : defaultScheduleRows;
          for (const target of pisCanvasTargets) {
            drawPISCanvas(target.ctx, rows, clockStr, blink);
            target.texture.needsUpdate = true;
          }
        }

        screenUpdateTimer += delta;
        if (screenUpdateTimer >= 0.85) {
          screenUpdateTimer = 0;
          if (cctvScreenTarget) {
            const { ctx, tex } = cctvScreenTarget;
            ctx.fillStyle = '#03120c';
            ctx.fillRect(0, 0, 512, 256);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.strokeRect(8, 8, 496, 240);
            ctx.fillStyle = '#34d399';
            ctx.font = 'bold 20px monospace';
            const feedNames = ['CAM-01 CONCOURSE', 'CAM-02 PLATFORMS 1-4', 'CAM-03 PLATFORMS 5-8', 'CAM-04 SKYWALK & HELIPAD'];
            ctx.fillText(`RPF SURVEILLANCE · ${feedNames[cctvModeIndex % feedNames.length]}`, 20, 38);
            ctx.fillStyle = '#f87171';
            ctx.fillText('● REC', 430, 38);
            // Animated radar/sector grid lines
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
            ctx.lineWidth = 1;
            for (let gx = 40; gx < 480; gx += 48) {
              ctx.beginPath(); ctx.moveTo(gx, 56); ctx.lineTo(gx, 232); ctx.stroke();
            }
            const scanY = 64 + ((timeElapsed * 42) % 160);
            ctx.strokeStyle = '#6ee7b7';
            ctx.beginPath(); ctx.moveTo(20, scanY); ctx.lineTo(492, scanY); ctx.stroke();
            ctx.fillStyle = '#a7f3d0';
            ctx.font = '16px monospace';
            ctx.fillText(`ACTIVE SCREENS: 8/8  ·  DFMD ARCHES: ONLINE  ·  CLOCK: ${now.toLocaleTimeString('en-IN', { hour12: false })}`, 20, 230);
            tex.needsUpdate = true;
          }
          if (commandScreenTarget) {
            const { ctx, tex } = commandScreenTarget;
            ctx.fillStyle = '#07111f';
            ctx.fillRect(0, 0, 1024, 256);
            ctx.fillStyle = '#0ea5e9';
            ctx.fillRect(0, 0, 1024, 44);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px monospace';
            ctx.fillText('CENTRAL TRAFFIC CONTROL BALCONY · 6 ACTIVE AI CORRIDORS · TELEMETRY ONLINE', 22, 30);
            const rows = liveScheduleRows && liveScheduleRows.length > 0 ? liveScheduleRows : defaultScheduleRows;
            ctx.font = 'bold 20px monospace';
            rows.slice(0, 4).forEach((row, idx) => {
              const ry = 84 + idx * 42;
              ctx.fillStyle = '#0f2036';
              ctx.fillRect(18, ry - 24, 988, 34);
              ctx.fillStyle = '#fde047';
              ctx.fillText(row.number, 28, ry);
              ctx.fillStyle = '#e2e8f0';
              ctx.fillText(row.name, 140, ry);
              ctx.fillStyle = '#38bdf8';
              ctx.fillText(row.platform, 520, ry);
              ctx.fillStyle = row.color;
              ctx.fillText(`${row.status} (${row.eta})`, 660, ry);
            });
            tex.needsUpdate = true;
          }
        }
      }
    };

    const getLiftCabinY = (liftIndex: number): number | null => {
      const cabin = liftCabins.find((c) => c.userData.liftIndex === liftIndex);
      return cabin ? cabin.position.y : null;
    };

    const requestLiftFloor = (liftIndex: number, floor: 0 | 1 | 2): boolean => {
      const cabin = liftCabins.find((c) => c.userData.liftIndex === liftIndex);
      if (!cabin) return false;
      const targetY = floor === 2 ? floor3Y : floor === 1 ? floor1Y : floor0Y;
      cabin.userData.targetY = targetY;
      cabin.userData.manualHoldTimer = 10.0;
      soundEngine.playUIClick();
      return true;
    };

    const getFacilityCoordinates = (facilityType: string): THREE.Vector3 | null => {
      switch (facilityType) {
        case 'restaurant':
          return new THREE.Vector3(x - 28, floor1Y, hallZ - 20);
        case 'shops':
          return new THREE.Vector3(x + 38, floor1Y, hallZ + 8);
        case 'medical':
          return new THREE.Vector3(x - 50, floor0Y, hallZ + 12);
        case 'police':
          return new THREE.Vector3(x - 48, floor0Y, hallZ - 8);
        case 'toilets':
          return new THREE.Vector3(x + 47, floor0Y, hallZ - 6);
        case 'lifts':
          return new THREE.Vector3(x - 48, floor0Y, hallZ - 11);
        case 'escalators':
          return new THREE.Vector3(x - 24, floor0Y, hallZ + 9);
        default:
          return new THREE.Vector3(x, floor0Y, hallZ);
      }
    };

    const getNearbyInteractiveAction = (playerPos: THREE.Vector3, maxDistance = 3.2): StationNearbyFacilityAction | null => {
      // 1. Jal Seva & Vanity Water Taps
      for (const tap of waterTapStates) {
        if (Math.hypot(playerPos.x - tap.x, playerPos.y - tap.y, playerPos.z - tap.z) <= maxDistance) {
          return {
            type: 'water_tap',
            label: 'Jal Seva RO Water Tap / Washbasin',
            prompt: '[E] Drink Pure RO Water & Wash Hands (+15 Health, +20 Stamina)',
          };
        }
      }

      // 2. Washroom Flush Valves
      for (const valve of flushValveStates) {
        if (Math.hypot(playerPos.x - valve.x, playerPos.y - valve.y, playerPos.z - valve.z) <= maxDistance) {
          return {
            type: 'toilet_flush',
            label: 'Washroom Commode',
            prompt: '[E] Flush Toilet',
          };
        }
      }

      // 3. Washroom Cubicle Hinged Doors
      for (const door of cubicleDoors) {
        if (Math.hypot(playerPos.x - door.x, playerPos.y - door.y, playerPos.z - door.z) <= 2.3) {
          return {
            type: 'cubicle_door',
            label: 'Washroom Cubicle Door',
            prompt: door.isOpen ? '[E] Close Cubicle Door' : '[E] Open Cubicle Door',
          };
        }
      }

      // 4. First-Aid Clinic
      if (playerPos.distanceTo(medicalClinicPos) <= 4.5) {
        return {
          type: 'medical_aid',
          label: 'Sanctuary First-Aid Clinic',
          prompt: '[E] Receive Emergency Medical Aid (+40 Health)',
        };
      }

      // 5. Cloakroom Digital Lockers
      for (const lk of digitalLockers) {
        if (Math.hypot(playerPos.x - lk.x, playerPos.y - lk.y, playerPos.z - lk.z) <= 2.4) {
          return {
            type: 'digital_locker',
            label: `Digital Cloakroom Locker #${lk.id}`,
            prompt: lk.isOpen
              ? `[E] Lock Digital Locker #${lk.id}`
              : `[E] Unlock Digital Locker #${lk.id}${lk.looted ? '' : ' (Collect Stored Ration)'}`,
          };
        }
      }

      // 6. USB Charging Totems
      for (const ct of chargingTotems) {
        if (Math.hypot(playerPos.x - ct.x, playerPos.y - ct.y, playerPos.z - ct.z) <= 2.8) {
          return {
            type: 'charging_totem',
            label: 'USB Fast-Charging Totem',
            prompt: '[E] Fast-Charge Gear & Recover (+45 Stamina)',
          };
        }
      }

      // 7. Central Reception Help Desk
      if (playerPos.distanceTo(helpDeskPos) <= 4.6) {
        return {
          type: 'help_desk',
          label: 'Sahayata Help Desk',
          prompt: '[E] Consult Reception Help Desk (Broadcast Station Info)',
        };
      }

      // 8. RPF Police Desk & CCTV Room
      if (playerPos.distanceTo(rpfDeskPos) <= 4.6) {
        return {
          type: 'rpf_console',
          label: 'RPF Police Desk & CCTV Command',
          prompt: '[E] Inspect RPF CCTV Wall & Open Railway Operations',
        };
      }

      // 9. Baggage X-Ray & DFMD Security Screening
      if (playerPos.distanceTo(xrayCenterPos) <= 4.5) {
        return {
          type: 'security_xray',
          label: 'Baggage X-Ray Scanner & DFMD Gate',
          prompt: '[E] Boost Baggage X-Ray Belt & Run Security Check',
        };
      }

      // 10. Biometric E-Gates (manual gate override)
      for (const gate of eGateUnits) {
        if (Math.hypot(playerPos.x - gate.x, playerPos.y - gate.y, playerPos.z - gate.z) <= 2.4) {
          return {
            type: 'e_gate',
            label: 'Biometric E-Gate Turnstile',
            prompt: '[E] Scan Boarding Pass & Open E-Gate Flaps',
          };
        }
      }

      // 11. Level 1 Traffic Control Balcony Console
      if (playerPos.distanceTo(commandDeskPos) <= 4.8) {
        return {
          type: 'command_console',
          label: 'Railway Traffic Control Balcony',
          prompt: '[E] Open Central Train Dispatch & Signal Telemetry',
        };
      }

      // 12. Food Court Stalls (Level 1)
      for (const stall of interactiveFoodCounters) {
        if (Math.hypot(playerPos.x - stall.x, playerPos.y - stall.y, playerPos.z - stall.z) <= 4.5) {
          return {
            type: 'food_stall',
            label: stall.name,
            prompt: `[E] ${stall.name}: Order Hot Chai & Thali Meal (+25 Health, +35 Stamina)`,
          };
        }
      }

      // 13. Retail Bookstalls (Level 1)
      for (const shop of bookstallPositions) {
        if (playerPos.distanceTo(shop.pos) <= 4.0) {
          return {
            type: 'bookstall',
            label: shop.label,
            prompt: `[E] Browse ${shop.label} (Pick Up Travel Provision)`,
          };
        }
      }

      // 14. Executive VIP Lounge & Air Concourse Seating
      for (const spot of loungeRestSpots) {
        if (playerPos.distanceTo(spot) <= 3.2) {
          return {
            type: 'lounge_seat',
            label: 'Sanctuary Passenger Lounge',
            prompt: '[E] Rest at Passenger Lounge Seating (+10 Health, +30 Stamina)',
          };
        }
      }

      // 15. Forecourt Boom Checkpoints
      for (const boom of boomBarriers) {
        if (Math.hypot(playerPos.x - boom.x, playerPos.y - boom.y, playerPos.z - boom.z) <= 4.5) {
          return {
            type: 'boom_barrier',
            label: 'Checkpoint Boom Gatehouse',
            prompt: '[E] Toggle Sanctuary Checkpoint Boom Barrier',
          };
        }
      }

      // 16. Forecourt 3-Tier Fountain
      if (Math.hypot(playerPos.x - x, playerPos.z - (hallZ + 56)) <= 13.5 && Math.abs(playerPos.y - fountainY) < 3.5) {
        return {
          type: 'fountain_refresh',
          label: 'Sanctuary Forecourt Fountain',
          prompt: '[E] Surge Fountain Jets & Cool Off (+10 Health, +25 Hydration)',
        };
      }

      // 17. Auto Stand & Electric Bus Terminal
      const nearAutoStand = Math.hypot(playerPos.x - (x - 34), playerPos.z - (hallZ + 48)) <= 9.0;
      const nearBusTerm = Math.hypot(playerPos.x - (x + 34), playerPos.z - (hallZ + 52)) <= 12.0;
      if ((nearAutoStand || nearBusTerm) && Math.abs(playerPos.y - forecourtY) < 3.5) {
        return {
          type: 'transit_hub',
          label: nearAutoStand ? 'Prepaid Auto-Rickshaw Stand' : 'City Electric Bus Terminal',
          prompt: nearAutoStand ? '[E] Signal Auto-Rickshaw Convoy' : '[E] Inspect Electric City Bus Telemetry',
        };
      }

      // 18. Rooftop Helipad Telemetry Console (Level 4)
      if (playerPos.distanceTo(helipadConsolePos) <= 4.0) {
        return {
          type: 'helipad_console',
          label: 'Sanctuary Helipad & Solar Control',
          prompt: '[E] Activate Aviation Radar Overdrive & Solar Grid Check',
        };
      }

      return null;
    };

    const triggerWaterTap = (pos: THREE.Vector3): boolean => {
      let bestTap: (typeof waterTapStates)[number] | null = null;
      let bestDist = Infinity;
      for (const tap of waterTapStates) {
        const d = Math.hypot(pos.x - tap.x, pos.y - tap.y, pos.z - tap.z);
        if (d < bestDist) {
          bestDist = d;
          bestTap = tap;
        }
      }
      if (bestTap && bestDist <= 5.0) {
        bestTap.timer = 2.4;
      }
      soundEngine.playWaterRunning(2.0);
      return true;
    };

    const triggerToiletFlush = (pos: THREE.Vector3): boolean => {
      let bestFlush: (typeof flushValveStates)[number] | null = null;
      let bestDist = Infinity;
      for (const fl of flushValveStates) {
        const d = Math.hypot(pos.x - fl.x, pos.y - fl.y, pos.z - fl.z);
        if (d < bestDist) {
          bestDist = d;
          bestFlush = fl;
        }
      }
      if (bestFlush && bestDist <= 5.0) {
        bestFlush.timer = 2.8;
      }
      soundEngine.playToiletFlush();
      return true;
    };

    const executeInteractiveAction = (
      playerPos: THREE.Vector3,
      type: StationNearbyFacilityAction['type']
    ): StationActionResult => {
      switch (type) {
        case 'water_tap': {
          triggerWaterTap(playerPos);
          return {
            handled: true,
            healthDelta: 15,
            thirstDelta: 35,
            staminaDelta: 20,
            message: 'Jal Seva Tap: Running purified chilled RO water (+15 Health, +35 Hydration, +20 Stamina).',
          };
        }
        case 'toilet_flush': {
          triggerToiletFlush(playerPos);
          return { handled: true, message: 'Washroom commode flushed cleanly with pressurized vortex.' };
        }
        case 'cubicle_door': {
          let bestDoor: (typeof cubicleDoors)[number] | null = null;
          let bestDist = Infinity;
          for (const cd of cubicleDoors) {
            const d = Math.hypot(playerPos.x - cd.x, playerPos.y - cd.y, playerPos.z - cd.z);
            if (d < bestDist) { bestDist = d; bestDoor = cd; }
          }
          if (bestDoor) {
            bestDoor.isOpen = !bestDoor.isOpen;
            bestDoor.ledMat.color.setHex(bestDoor.isOpen ? 0x16a34a : 0xb91c1c);
            bestDoor.ledMat.emissive.setHex(bestDoor.isOpen ? 0x15803d : 0x991b1b);
            soundEngine.playDoorOpenClose(bestDoor.isOpen);
            return { handled: true, message: bestDoor.isOpen ? 'Cubicle door opened (Vacant indicator GREEN).' : 'Cubicle door latched shut (Occupied indicator RED).' };
          }
          return { handled: false };
        }
        case 'medical_aid': {
          soundEngine.playUIClick();
          const grantKit = clinicSupplyCooldown <= 0;
          if (grantKit) clinicSupplyCooldown = 45;
          return {
            handled: true,
            healthDelta: 40,
            rewardItem: grantKit ? 'bandage' : undefined,
            rewardQty: grantKit ? 1 : undefined,
            message: grantKit
              ? 'Sanctuary First-Aid Clinic: Triage complete (+40 Health) & received Medical Bandage.'
              : 'Sanctuary First-Aid Clinic: Emergency triage administered (+40 Health).',
          };
        }
        case 'food_stall': {
          soundEngine.playStoveIgnite();
          return {
            handled: true,
            healthDelta: 25,
            hungerDelta: 45,
            thirstDelta: 20,
            staminaDelta: 35,
            message: 'IRCTC Food Court: Served hot Masala Chai & Fresh Thali (+25 Health, +45 Hunger, +35 Stamina).',
          };
        }
        case 'digital_locker': {
          let bestLocker: (typeof digitalLockers)[number] | null = null;
          let bestDist = Infinity;
          for (const lk of digitalLockers) {
            const d = Math.hypot(playerPos.x - lk.x, playerPos.y - lk.y, playerPos.z - lk.z);
            if (d < bestDist) { bestDist = d; bestLocker = lk; }
          }
          if (bestLocker) {
            bestLocker.isOpen = !bestLocker.isOpen;
            bestLocker.ledMat.color.setHex(bestLocker.isOpen ? 0x22c55e : 0x38bdf8);
            bestLocker.ledMat.emissive.setHex(bestLocker.isOpen ? 0x16a34a : 0x0284c7);
            soundEngine.playLockerLatch(bestLocker.isOpen);
            if (bestLocker.isOpen && !bestLocker.looted) {
              bestLocker.looted = true;
              const items = ['clean_water', 'bandage', 'energy_bar'];
              const itemId = items[(bestLocker.id - 1) % items.length];
              return {
                handled: true,
                rewardItem: itemId,
                rewardQty: 1,
                message: `Digital Locker #${bestLocker.id} Unlocked: Retrieved stored traveler supply (${itemId.replace('_', ' ')}).`,
              };
            }
            return { handled: true, message: `Digital Locker #${bestLocker.id} ${bestLocker.isOpen ? 'unlocked open' : 'locked securely'}.` };
          }
          return { handled: false };
        }
        case 'charging_totem': {
          chargeBoostTimer = 3.0;
          soundEngine.playChargingHum();
          return {
            handled: true,
            staminaDelta: 45,
            message: 'USB Fast-Charging Totem: Capacitor bank synced — Field gear recharged (+45 Stamina).',
          };
        }
        case 'help_desk': {
          helpDeskPulseTimer = 3.0;
          soundEngine.playStationChime();
          return {
            handled: true,
            announceLive: true,
            message: 'Sahayata Help Desk: All 8 Platforms, Dual Skywalks, Lifts 1-4 & Escalators Operational. Broadcasting platform alert.',
          };
        }
        case 'rpf_console': {
          cctvModeIndex = (cctvModeIndex + 1) % 4;
          screenUpdateTimer = 1.0; // trigger immediate redraw
          soundEngine.playSecurityBeep();
          return {
            handled: true,
            openOperations: true,
            message: 'RPF CCTV Command: Switched surveillance feed & opened Railway Operations Center.',
          };
        }
        case 'command_console': {
          soundEngine.playStationChime();
          return {
            handled: true,
            openOperations: true,
            message: 'Traffic Control Balcony: Central Dispatch & Live Corridor Matrix opened.',
          };
        }
        case 'security_xray': {
          xrayBoostTimer = 4.0;
          soundEngine.playSecurityBeep();
          return {
            handled: true,
            message: 'Baggage X-Ray & DFMD Screening: High-speed conveyor sweep complete — Sector Clear.',
          };
        }
        case 'e_gate': {
          let bestGate: (typeof eGateUnits)[number] | null = null;
          let bestDist = Infinity;
          for (const g of eGateUnits) {
            const d = Math.hypot(playerPos.x - g.x, playerPos.y - g.y, playerPos.z - g.z);
            if (d < bestDist) { bestDist = d; bestGate = g; }
          }
          if (bestGate) {
            bestGate.manualTimer = 4.5;
            soundEngine.playSecurityBeep();
            return { handled: true, message: 'Biometric E-Gate: Boarding pass verified — Passage cleared.' };
          }
          return { handled: false };
        }
        case 'boom_barrier': {
          let bestBoom: (typeof boomBarriers)[number] | null = null;
          let bestDist = Infinity;
          for (const b of boomBarriers) {
            const d = Math.hypot(playerPos.x - b.x, playerPos.y - b.y, playerPos.z - b.z);
            if (d < bestDist) { bestDist = d; bestBoom = b; }
          }
          if (bestBoom) {
            bestBoom.manualOpen = !bestBoom.manualOpen;
            bestBoom.overrideTimer = 8.0;
            soundEngine.playGateToggle(bestBoom.manualOpen);
            return {
              handled: true,
              message: bestBoom.manualOpen ? 'Checkpoint Boom Gatehouse: Barrier raised OPEN (Green Clearance).' : 'Checkpoint Boom Gatehouse: Barrier lowered LOCKED.',
            };
          }
          return { handled: false };
        }
        case 'fountain_refresh': {
          fountainSurgeTimer = 3.5;
          soundEngine.playWaterRunning(1.5);
          return {
            handled: true,
            healthDelta: 10,
            thirstDelta: 25,
            staminaDelta: 15,
            message: 'Sanctuary Forecourt Fountain: Cascading jets boosted (+10 Health, +25 Hydration, +15 Stamina).',
          };
        }
        case 'transit_hub': {
          transitPulseTimer = 4.0;
          soundEngine.playStationChime();
          return {
            handled: true,
            message: 'Forecourt Multi-Modal Hub: Prepaid Auto-Rickshaws & Low-Floor Electric Buses standing by on Sanctuary Route.',
          };
        }
        case 'bookstall': {
          soundEngine.playCabinetOpenClose(true);
          if (bookstallCooldown <= 0) {
            bookstallCooldown = 45;
            return {
              handled: true,
              rewardItem: 'energy_bar',
              rewardQty: 1,
              message: 'A.H. Wheeler & Bharat Handloom: Collected packed Travel Energy Bar & Sanctuary Rail Map.',
            };
          }
          return {
            handled: true,
            message: 'A.H. Wheeler & Bharat Handloom: Fresh newspapers, regional guides, and travel essentials stocked.',
          };
        }
        case 'lounge_seat': {
          soundEngine.playSwitchClick();
          return {
            handled: true,
            healthDelta: 10,
            staminaDelta: 30,
            message: 'Sanctuary Executive Lounge: Rested comfortably (+10 Health, +30 Stamina).',
          };
        }
        case 'helipad_console': {
          radarBoostTimer = 6.0;
          clockTowerHourOffset += 0;
          soundEngine.playRadarPing();
          return {
            handled: true,
            message: 'Sanctuary Rooftop Aviation & Solar Telemetry: Radar sweep overdrive active · 15 Arrays Online (240 kW) · Helipad H-01 Clear.',
          };
        }
        default:
          return { handled: false };
      }
    };

    const dispose = () => {
      for (const t of pisCanvasTargets) t.texture.dispose();
      if (cctvScreenTarget) cctvScreenTarget.tex.dispose();
      if (commandScreenTarget) commandScreenTarget.tex.dispose();
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (!obj.geometry?.userData?.__sharedResource) {
            obj.geometry?.dispose();
          }
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => {
              if (m && !m.userData?.__sharedResource && !externalSharedMats.has(m)) m.dispose();
            });
          } else if (obj.material && !obj.material.userData?.__sharedResource && !externalSharedMats.has(obj.material)) {
            obj.material.dispose();
          }
        }
      });
      group.clear();
      stationPlacementValidator.clear(stationIndex);
    };

    return {
      group,
      update,
      getLiftCabinY,
      requestLiftFloor,
      getFacilityCoordinates,
      getNearbyInteractiveAction,
      executeInteractiveAction,
      triggerWaterTap,
      triggerToiletFlush,
      dispose,
    };
  }
}
