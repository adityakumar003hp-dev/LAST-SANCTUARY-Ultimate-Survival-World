import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { soundEngine } from '../../utils/audio';
import { TrainSaveState } from '../../types/game';
import { RailwayNPCManager } from './RailwayNPCManager';
import { stationAnnouncementSystem } from './MultilingualAnnouncementSystem';
import {
  LiveStationScheduleRow,
  MegaStationArchitecture,
  MegaStationInstance,
  StationActionResult,
  StationNearbyFacilityAction,
} from './MegaStationArchitecture';
import { stationPlacementValidator } from './StationPlacementValidator';

/**
 * Six-Track Civilian Railway Transportation System — Ultimate Railway Network.
 * 
 * Exactly SIX primary operational trains:
 * Forward Direction (+X):
 * - Train 01: Line F1, Sanctuary Express (Express Intercity)
 * - Train 02: Line F2, Pine Valley Commuter (Rapid Transit)
 * - Train 03: Line F3, Highland Regional (Regional Passenger)
 * 
 * Backward Direction (-X):
 * - Train 04: Line B3, Sanctuary Metro Loop (Suburban Metro)
 * - Train 05: Line B2, Redwood Valley Crossway (Intercity Rail)
 * - Train 06: Line B1, Sunset Coastline Flyer (Express Flyer)
 * 
 * 100% Strict AI Autonomous Control (Player never drives; enters locomotive cab as observer in pilot seat).
 * 5 Specialized Compartments:
 * 1. Locomotive Cab (Pilot observer seat, console, animated AI driver)
 * 2. Passenger Coach (Standard seating rows, luggage racks, civilian NPCs)
 * 3. Dining Carriage (Dining tables, chairs, food counter, NPC attendant)
 * 4. Sleeping Carriage (Private sleeping berths/bunks, curtains, NPCs)
 * 5. Observation Lounge (Panoramic windows, viewing armchairs)
 * 
 * Dynamic randomized departure and arrival stopwatch countdowns strictly below 300 seconds (< 300s).
 */

export type RailwayTrackLine = 'F1' | 'F2' | 'F3' | 'B1' | 'B2' | 'B3';
export type TrainCameraMode = 'interior_1st' | 'interior_3rd' | 'cab' | 'chase' | 'rear';

export interface RouteStationStop {
  index: number;
  name: string;
  shortName: string;
  status: 'passed' | 'departed' | 'arrived' | 'arriving' | 'upcoming';
}

export interface RailwayServiceTelemetry {
  slot: number; // 1 to 6
  trainId: string;
  trainNumber: string; // 'Train 01' .. 'Train 06'
  line: RailwayTrackLine;
  serviceId: string;
  serviceName: string;
  name: string;
  serviceType: string;
  from: string;
  to: string;
  next: string;
  stop: string;
  directionLabel: string;
  direction: 1 | -1;
  x: number;
  z: number;
  speed: number;
  speedKmh: number;
  speedMph: number;
  currentStation: string;
  nextStation: string;
  arrivedStation: string;
  departedStation: string;
  arrivingStation: string;
  departingStation: string;
  isAtStation: boolean;
  distToNextMeters: number;
  distTravelledKm: number;
  distRemainingKm: number;
  legDistanceCoveredM: number;
  legDistanceLeftM: number;
  legDistanceCoveredKm: number;
  legDistanceLeftKm: number;
  routeDistanceCoveredKm: number;
  routeDistanceLeftKm: number;
  routeTotalKm: number;
  totalDistanceCoveredKm: number;
  routeProgressPct: number;
  routeStations: RouteStationStop[];
  distance: number;
  remaining: number;
  arrival: string;
  departure: string;
  arrivalTime: string;
  departureTime: string;
  currentTimeText: string;
  dayCount: number;
  scheduledArrival: string;
  estimatedArrival: string;
  departureCountdownSeconds: number; // strictly < 300
  arrivalCountdownSeconds: number; // strictly < 300
  departureCountdownText: string;
  arrivalCountdownText: string;
  delaySeconds: number;
  onTimeStatus: 'ON TIME' | 'MINOR DELAY' | 'HELD AT STATION' | 'HOLD PENDING' | 'DWELLING';
  stationStatus: 'running' | 'doors_open' | 'doors_closing';
  status: 'RUNNING' | 'DWELLING' | 'DOORS_OPEN' | 'HELD';
  dwellSeconds: number;
  condition: string;
  conditionDetail: string;
  doorsOpen: boolean;
  holdOrdered: boolean;
  tractionMotorTempC: number;
  brakePressureBar: number;
  pantographVoltageKv: number;
  conditionPct: number;
  blockId: string;
  signalAspect: 'green' | 'yellow' | 'red';
  warningMessage: string | null;
  warningAcknowledged: boolean;
}

export interface TrainSeat {
  carriage: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  seatId: string;
  name: string;
  localPos: THREE.Vector3;
  isOccupied: boolean;
}

export interface AITrain {
  id: string;
  trainNumber: string; // 'Train 01' .. 'Train 06'
  serviceId: string;
  serviceName: string;
  serviceType: string;
  line: RailwayTrackLine;
  direction: 1 | -1;
  directionLabel: string;
  group: THREE.Group;
  x: number;
  z: number;
  speed: number;
  targetSpeed: number;
  throttle: number; // strictly controlled by AI (0 to 1)
  manualDriving: boolean; // strictly FALSE — AI only
  dwellRemaining: number;
  departureCountdownSeconds: number; // strictly < 300
  arrivalCountdownSeconds: number; // strictly < 300
  currentStationIndex: number | null;
  lastArrivedStationIndex: number;
  lastDepartedStationIndex: number;
  lastArrivedGameMinutes: number;
  lastDepartedGameMinutes: number;
  totalDistanceCoveredM: number;
  doors: THREE.Mesh[];
  doorsOpen: boolean;
  stationStatus: 'running' | 'doors_open' | 'doors_closing';
  isOccupied: boolean;
  headlightsOn: boolean;
  spotlights: THREE.SpotLight[];
  cabinLight?: THREE.PointLight;
  tailLights: THREE.Mesh[];
  interiorLights: THREE.PointLight[];
  wheels: THREE.Object3D[];
  couplingRods: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number }>;
  wheelAngle: number;
  brakeSfxPlayed: boolean;
  seats: TrainSeat[];
  animatedDriverArm?: THREE.Mesh;
  driverArmPhase: number;
  lastAnnouncedStationIndex: number | null;
  holdOrdered: boolean;
  warningMessage: string | null;
  warningAcknowledged: boolean;
  telemetryTimer: number;
  tractionMotorTempC: number;
  brakePressureBar: number;
  pantographVoltageKv: number;
  conditionPct: number;
}

export interface TrainHUDData {
  trainNumber: string; // 'Train 01' .. 'Train 06'
  line: string;
  serviceName: string;
  direction: string;
  directionLabel: string;
  speedKmh: number;
  speedMph: number;
  currentStation: string;
  nextStation: string;
  upcomingStations: string[];
  distToNextMeters: number;
  distTravelledKm: number;
  distRemainingKm: number;
  doorsOpen: boolean;
  announcement: string;
  isDriving: boolean; // always false (AI driven)
  isPilotSeated: boolean; // true if seated in locomotive observer seat
  isSeated: boolean;
  seatedLocationName?: string;
  departureCountdownSeconds: number; // strictly < 300
  arrivalCountdownSeconds: number; // strictly < 300
  departureCountdownText: string; // 'MM:SS'
  arrivalCountdownText: string; // 'MM:SS'
  isDwelling: boolean;
  aiStatus: string;
  throttlePct: number;
  brakePressureBar: number;
  motorTempC: number;
  pantographVoltageKv: number;
  signalAspect: 'green' | 'yellow' | 'red';
  carriageIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  carriageName: string;
  cameraMode: TrainCameraMode;
  headlightsOn: boolean;
  canTakeControls: boolean; // Sit in pilot observer seat
  canSit: boolean;
  canExit: boolean;
}

const CHUNK_LENGTH = 128;
const STATION_SPACING = 1200;
const AI_CRUISE_SPEED = 18; // ~65 km/h cruise speed
const MAX_TRAIN_SPEED = 28; // ~100 km/h top speed
const WHEEL_RADIUS = 0.62;

export const STATION_NAMES = [
  'Sanctuary Central Terminal',
  'Pine Valley Junction',
  'Highland Ridge Station',
  'Riverbend Depot',
  'Redwood Foothills Station',
  'Canyon Pass Freight Depot',
  'Sunset Coastway Station',
  'Northern Apex Research Stop',
];

const STATION_SHORT_NAMES = [
  'Central',
  'Pine Valley',
  'Highland',
  'Riverbend',
  'Redwood',
  'Canyon Pass',
  'Sunset Coast',
  'North Apex',
];

function posMod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function formatGameClockHM(gameMinutes: number): string {
  const wrapped = ((Math.floor(gameMinutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function formatGameClockHMS(gameMinutes: number): string {
  const totalSec = ((Math.round(gameMinutes * 60) % 86400) + 86400) % 86400;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export type TrainLiveryStyle = 'rajdhani' | 'vandebharat' | 'mail' | 'intercity' | 'metro' | 'shield';

const TRACK_CONFIG: Array<{
  slot: number;
  id: RailwayTrackLine;
  trainNumber: string;
  serviceId: string;
  name: string;
  type: string;
  z: number;
  direction: 1 | -1;
  startX: number;
  isRedLivery: boolean;
  liveryStyle: TrainLiveryStyle;
}> = [
  { slot: 1, id: 'F1', trainNumber: 'Train 01', serviceId: 'LS-101', name: 'Sanctuary Rajdhani Express', type: 'Superfast Express', z: 150, direction: 1, startX: 12, isRedLivery: true, liveryStyle: 'rajdhani' },
  { slot: 2, id: 'F2', trainNumber: 'Train 02', serviceId: 'LS-102', name: 'Sanctuary Vande Bharat', type: 'Semi-High-Speed Express', z: 162, direction: 1, startX: -340, isRedLivery: false, liveryStyle: 'vandebharat' },
  { slot: 3, id: 'F3', trainNumber: 'Train 03', serviceId: 'LS-103', name: 'Highland Express Mail', type: 'Superfast Sleeper Mail', z: 174, direction: 1, startX: -760, isRedLivery: false, liveryStyle: 'mail' },
  { slot: 4, id: 'B3', trainNumber: 'Train 04', serviceId: 'LS-201', name: 'Redwood Crossway Intercity', type: 'Intercity Express', z: 186, direction: -1, startX: 340, isRedLivery: false, liveryStyle: 'intercity' },
  { slot: 5, id: 'B2', trainNumber: 'Train 05', serviceId: 'LS-202', name: 'Sanctuary Metro Commuter', type: 'Suburban Metro', z: 198, direction: -1, startX: 760, isRedLivery: false, liveryStyle: 'metro' },
  { slot: 6, id: 'B1', trainNumber: 'Train 06', serviceId: 'LS-203', name: 'Northern Apex Shield Express', type: 'Tactical / Medical Transport', z: 210, direction: -1, startX: -12, isRedLivery: true, liveryStyle: 'shield' },
];


function formatTime(totalSec: number): string {
  const clamped = Math.max(0, Math.min(299, Math.round(totalSec)));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export class AITrainManager {
  private scene: THREE.Scene;
  private worldSeed: number;
  private stationLiveRowsCache: LiveStationScheduleRow[] = [];
  private stationFallbackPlayerPos = new THREE.Vector3(0, 0, 0);
  private currentGameTimeMinutes = 480;
  private currentDayCount = 1;

  public trains: AITrain[] = [];
  public activePassengerTrain: AITrain | null = null;
  public activeDrivableTrain: AITrain | null = null;
  public npcManager: RailwayNPCManager;

  // Local coordinates of player inside the active train consist
  public playerLocalPos = new THREE.Vector3(14.0, 1.52, 0); // default in locomotive cab
  public seatedSeatId: string | null = null;
  public isPilotSeated = false;
  public cameraMode: TrainCameraMode = 'interior_1st';
  public passengerCameraYaw = 0;
  public passengerCameraPitch = 0;

  private railChunks = new Map<string, THREE.Group>();
  private stationGroups = new Map<string, THREE.Group>();
  private megaStationInstances = new Map<string, MegaStationInstance>();

  // Shared Procedural Railway Materials
  private readonly railMaterial = new THREE.MeshStandardMaterial({ color: 0x76828c, metalness: 0.88, roughness: 0.25 });
  private readonly sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x3d352b, roughness: 0.94 });
  private readonly platformMaterial = new THREE.MeshStandardMaterial({ color: 0x82868a, roughness: 0.88 });
  private readonly ballastMaterial = new THREE.MeshStandardMaterial({ color: 0x4f4d49, roughness: 1.0 });
  private readonly trainBodyBlue = new THREE.MeshStandardMaterial({ color: 0x1e3a52, metalness: 0.72, roughness: 0.3 });
  private readonly trainBodyRed = new THREE.MeshStandardMaterial({ color: 0x8b251e, metalness: 0.75, roughness: 0.28 });
  private readonly windowMaterial = new THREE.MeshStandardMaterial({
    color: 0x9be0f0,
    metalness: 0.25,
    roughness: 0.08,
    envMapIntensity: 1.4,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  private readonly wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x1b1f24, metalness: 0.88, roughness: 0.38 });
  private readonly doorMaterial = new THREE.MeshStandardMaterial({ color: 0xc4cbd1, metalness: 0.65, roughness: 0.3 });
  private readonly gangwayBellowsMat = new THREE.MeshStandardMaterial({ color: 0x15181b, roughness: 0.95 });
  private readonly floorMat = new THREE.MeshStandardMaterial({ color: 0x2b333a, roughness: 0.85 });
  private readonly seatFabricMat = new THREE.MeshStandardMaterial({ color: 0x274d6b, roughness: 0.9 });
  private readonly seatDiningMat = new THREE.MeshStandardMaterial({ color: 0x7b2cbf, roughness: 0.85 });
  private readonly seatLoungeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.8 });
  private readonly chromeMat = new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.9, roughness: 0.2 });
  private readonly woodMat = new THREE.MeshStandardMaterial({ color: 0x603813, roughness: 0.75 });
  private readonly tailLightMat = new THREE.MeshStandardMaterial({ color: 0xff1111, emissive: 0xee0000, emissiveIntensity: 3.0 });
  private readonly headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffea99, emissiveIntensity: 3.5 });

  // Reusable geometries & caches to prevent GC churn
  private readonly sharedBallastGeo = new THREE.BoxGeometry(16.05, 0.22, 5.8);
  private readonly sharedRailGeo = new THREE.BoxGeometry(16.05, 0.16, 0.16);
  private readonly sharedSleeperGeo = new THREE.BoxGeometry(2.8, 0.16, 3.6);
  private readonly trainCollisionBoxesCache: Array<{ box: THREE.Box3 }> = [];
  private readonly stationCollisionBoxesCache: Array<{ box: THREE.Box3 }> = [];
  private worldGeomTimer = 1.0;

  private wheelAudioTimer = 0;

  constructor(scene: THREE.Scene, worldSeed = 42) {
    this.scene = scene;
    this.worldSeed = worldSeed;

    [
      this.railMaterial, this.sleeperMaterial, this.platformMaterial, this.ballastMaterial,
      this.trainBodyBlue, this.trainBodyRed, this.windowMaterial, this.wheelMaterial,
      this.doorMaterial, this.gangwayBellowsMat, this.floorMat, this.seatFabricMat,
      this.seatDiningMat, this.seatLoungeMat, this.chromeMat, this.woodMat,
      this.tailLightMat, this.headlightMat,
    ].forEach((m) => { m.userData.__sharedResource = true; });
    this.sharedBallastGeo.userData.__sharedResource = true;
    this.sharedRailGeo.userData.__sharedResource = true;
    this.sharedSleeperGeo.userData.__sharedResource = true;

    for (const track of TRACK_CONFIG) {
      const { group, wheels, couplingRods, seats, doors, spotlights, cabinLight, tailLights, interiorLights, animatedDriverArm } =
        this.createFiveCarriageTrainMesh(track.id, track.isRedLivery, track.trainNumber);
      this.scene.add(group);

      // Initial station history & mileage seeded deterministically per track
      const initPrevIdx = track.direction === 1
        ? Math.floor(track.startX / STATION_SPACING)
        : Math.ceil(track.startX / STATION_SPACING);
      const initLegDone = track.direction === 1
        ? Math.max(0, track.startX - initPrevIdx * STATION_SPACING)
        : Math.max(0, initPrevIdx * STATION_SPACING - track.startX);
      const initLegLeft = Math.max(0, STATION_SPACING - initLegDone);
      const arrivalSec = Math.min(299, Math.max(5, Math.round(initLegLeft / AI_CRUISE_SPEED)));
      const departureSec = 0;

      const train: AITrain = {
        id: `ai_train_${track.id.toLowerCase()}`,
        trainNumber: track.trainNumber,
        serviceId: track.serviceId,
        serviceName: track.name,
        serviceType: track.type,
        line: track.id,
        direction: track.direction,
        directionLabel: track.direction === 1 ? 'FORWARD (+X)' : 'BACKWARD (-X)',
        group,
        x: track.startX,
        z: track.z,
        speed: AI_CRUISE_SPEED,
        targetSpeed: AI_CRUISE_SPEED,
        throttle: 0.65,
        manualDriving: false, // strictly AI operated
        dwellRemaining: 0,
        departureCountdownSeconds: departureSec,
        arrivalCountdownSeconds: arrivalSec,
        currentStationIndex: null,
        lastArrivedStationIndex: initPrevIdx,
        lastDepartedStationIndex: initPrevIdx,
        lastArrivedGameMinutes: Math.max(0, 480 - 4 - track.slot),
        lastDepartedGameMinutes: Math.max(0, 480 - 2 - track.slot),
        totalDistanceCoveredM: 12000 + track.slot * 4250 + initLegDone,
        doors,
        doorsOpen: false,
        stationStatus: 'running',
        isOccupied: false,
        headlightsOn: true,
        spotlights,
        cabinLight,
        tailLights,
        interiorLights,
        wheels,
        couplingRods,
        wheelAngle: 0,
        brakeSfxPlayed: false,
        seats,
        animatedDriverArm,
        driverArmPhase: Math.random() * Math.PI * 2,
        lastAnnouncedStationIndex: null,
        holdOrdered: false,
        warningMessage: null,
        warningAcknowledged: false,
        telemetryTimer: 0,
        tractionMotorTempC: 63 + track.slot * 2,
        brakePressureBar: 5.0,
        pantographVoltageKv: 25.0,
        conditionPct: 99 - (track.slot % 3),
      };

      this.trains.push(train);
    }

    this.npcManager = new RailwayNPCManager(this.scene, this.worldSeed);
  }

  public trackSurfaceY(x: number, z: number): number {
    const spacing = 128;
    const x0 = Math.floor(x / spacing) * spacing;
    const x1 = x0 + spacing;
    const t = THREE.MathUtils.smoothstep((x - x0) / spacing, 0, 1);
    const terrainGrade = THREE.MathUtils.lerp(
      getTerrainHeight(x0, z, this.worldSeed),
      getTerrainHeight(x1, z, this.worldSeed),
      t
    );

    // Keep the complete station throat and platform stopping zone on one level,
    // surveyed rail grade. This prevents terrain noise from making rails look
    // kinked or causing a train to bob vertically while it is at the platform.
    const stationIndex = Math.round(x / STATION_SPACING);
    const stationCenterX = stationIndex * STATION_SPACING;
    const stationDistance = Math.abs(x - stationCenterX);
    if (stationDistance <= 84 && z >= 132 && z <= 228) {
      return getTerrainHeight(stationCenterX, z, this.worldSeed) + 0.37;
    }

    return terrainGrade + 0.37;
  }

  // --- 3D Mesh Construction for Full Consist (5 Compartments) ---
  private createFiveCarriageTrainMesh(
    line: RailwayTrackLine,
    isRedLivery: boolean,
    trainNumber: string
  ): {
    group: THREE.Group;
    wheels: THREE.Object3D[];
    couplingRods: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number }>;
    seats: TrainSeat[];
    doors: THREE.Mesh[];
    spotlights: THREE.SpotLight[];
    cabinLight?: THREE.PointLight;
    tailLights: THREE.Mesh[];
    interiorLights: THREE.PointLight[];
    animatedDriverArm?: THREE.Mesh;
  } {
    const root = new THREE.Group();
    root.name = `TRAIN_CONSIST_${trainNumber.replace(/\s+/g, '_')}_${line}`;
    root.userData = {
      lineId: line,
      trainNumber,
      physicalMesh: true,
      collisionProxy: new THREE.Box3(),
      boundingSize: new THREE.Vector3(175.5, 6.2, 4.8),
    };

    const bodyMat = isRedLivery ? this.trainBodyRed : this.trainBodyBlue;
    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: isRedLivery ? 0x482420 : 0x223644,
      roughness: 0.7,
      metalness: 0.2,
    });
    const wheelRimMarkMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45, metalness: 0.2 });
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.5, roughness: 0.4 });

    const wheels: THREE.Object3D[] = [];
    const couplingRods: Array<{ mesh: THREE.Mesh; baseX: number; baseY: number }> = [];
    const seats: TrainSeat[] = [];
    const doors: THREE.Mesh[] = [];
    const spotlights: THREE.SpotLight[] = [];
    const tailLights: THREE.Mesh[] = [];
    const interiorLights: THREE.PointLight[] = [];
    let animatedDriverArm: THREE.Mesh | undefined;

    // Helper: Add realistic rail-aligned bogie assembly with gimbal-free wheelsets,
    // track flanges, radial spokes, brake discs, axleboxes, springs & coupling rods
    const addBogie = (parent: THREE.Group, bogieCenterX: number, carriageIdx: 1 | 2 | 3 | 4 | 5 | 6 | 7) => {
      const wheelCenterY = WHEEL_RADIUS + 0.09; // Bottom sits flush on rail top (+0.09m above trackSurfaceY)
      const railGaugeZ = 0.88; // Exact rail center offset from buildRailChunk

      // Narrow central bogie bolster clear of wheel faces
      const bolster = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.34, 1.48), this.wheelMaterial);
      bolster.position.set(bogieCenterX, 1.18, 0);
      bolster.castShadow = true;
      parent.add(bolster);

      // Exterior bogie side beams & air brake reservoir
      for (const side of [-1, 1]) {
        const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.22, 0.18), this.wheelMaterial);
        sideBeam.position.set(bogieCenterX, 0.96, side * 1.24);
        sideBeam.castShadow = true;
        parent.add(sideBeam);
      }

      const reservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.35, 10), this.chromeMat);
      reservoir.rotation.z = Math.PI / 2;
      reservoir.position.set(bogieCenterX, 0.78, 0);
      parent.add(reservoir);

      for (const wx of [-1.45, 1.45]) {
        const axleX = bogieCenterX + wx;

        // Gimbal-free Wheelset Pivot (rotates strictly around Z axle)
        const wheelsetPivot = new THREE.Group();
        wheelsetPivot.position.set(axleX, wheelCenterY, 0);
        wheelsetPivot.userData.isTrainWheel = true;
        wheelsetPivot.userData.carriage = carriageIdx;

        // Steel cross-axle linking left & right wheels
        const axleShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 2.52, 10), this.railMaterial);
        axleShaft.rotation.x = Math.PI / 2;
        wheelsetPivot.add(axleShaft);

        for (const side of [-1, 1]) {
          const wz = side * railGaugeZ;

          // Machined steel wheel tread riding dead-center on the railhead
          const tread = new THREE.Mesh(
            new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.2, 24),
            this.railMaterial
          );
          tread.rotation.x = Math.PI / 2;
          tread.position.z = wz;
          tread.castShadow = true;
          wheelsetPivot.add(tread);

          // Inner steel rail flange riding inside rail gauge
          const flange = new THREE.Mesh(
            new THREE.CylinderGeometry(WHEEL_RADIUS + 0.055, WHEEL_RADIUS + 0.055, 0.045, 24),
            this.chromeMat
          );
          flange.rotation.x = Math.PI / 2;
          flange.position.z = side * (railGaugeZ - 0.11);
          wheelsetPivot.add(flange);

          // Recessed wheel web + vented brake rotor
          const web = new THREE.Mesh(
            new THREE.CylinderGeometry(WHEEL_RADIUS * 0.78, WHEEL_RADIUS * 0.78, 0.215, 20),
            this.wheelMaterial
          );
          web.rotation.x = Math.PI / 2;
          web.position.z = wz;
          wheelsetPivot.add(web);

          const brakeDisc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.34, 0.23, 16),
            this.chromeMat
          );
          brakeDisc.rotation.x = Math.PI / 2;
          brakeDisc.position.z = wz;
          wheelsetPivot.add(brakeDisc);

          // 6 crisp rotating radial spokes / ribs so spinning motion is unmistakable
          for (let sp = 0; sp < 3; sp++) {
            const spoke = new THREE.Mesh(
              new THREE.BoxGeometry(WHEEL_RADIUS * 1.48, 0.075, 0.24),
              this.chromeMat
            );
            spoke.position.z = wz;
            spoke.rotation.z = (sp * Math.PI) / 3;
            wheelsetPivot.add(spoke);
          }

          // High-contrast alignment stud near rim
          const rimMark = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.14, 0.245),
            wheelRimMarkMat
          );
          rimMark.position.set(WHEEL_RADIUS * 0.7, 0, wz);
          wheelsetPivot.add(rimMark);

          // Chrome axle journal cap
          const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.34, 12), this.chromeMat);
          hubcap.rotation.x = Math.PI / 2;
          hubcap.position.z = side * 1.12;
          wheelsetPivot.add(hubcap);

          // Non-rotating exterior axlebox housing, coil spring & brake caliper on side beam
          const axleBox = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.34, 0.22), this.wheelMaterial);
          axleBox.position.set(axleX, wheelCenterY, side * 1.24);
          parent.add(axleBox);

          const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.32, 10), this.chromeMat);
          spring.position.set(axleX, wheelCenterY + 0.28, side * 1.24);
          parent.add(spring);

          const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.26), caliperMat);
          caliper.position.set(axleX - Math.sign(wx) * 0.44, wheelCenterY + 0.06, wz);
          parent.add(caliper);
        }

        parent.add(wheelsetPivot);
        wheels.push(wheelsetPivot);
      }

      // Locomotive side coupling rods driven synchronously with wheel crank phase
      if (carriageIdx === 1) {
        for (const side of [-1, 1]) {
          const rod = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.1, 0.08), this.chromeMat);
          rod.position.set(bogieCenterX, wheelCenterY, side * 1.06);
          parent.add(rod);
          couplingRods.push({ mesh: rod, baseX: bogieCenterX, baseY: wheelCenterY });
        }
      }
    };

    // Helper: Shell builder for carriages
    const buildShell = (
      parent: THREE.Group,
      centerX: number,
      length: number,
      hasEntranceDoors: boolean
    ) => {
      const underframe = new THREE.Mesh(new THREE.BoxGeometry(length, 0.68, 3.55), bodyMat);
      underframe.position.set(centerX, 0.82, 0);
      underframe.castShadow = true;
      underframe.receiveShadow = true;
      parent.add(underframe);

      const floor = new THREE.Mesh(new THREE.BoxGeometry(length - 0.2, 0.14, 3.15), this.floorMat);
      floor.position.set(centerX, 1.48, 0);
      floor.receiveShadow = true;
      parent.add(floor);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(length, 0.45, 3.65), new THREE.MeshStandardMaterial({ color: 0x161a1f, metalness: 0.6, roughness: 0.4 }));
      roof.position.set(centerX, 5.35, 0);
      roof.castShadow = true;
      parent.add(roof);

      // HVAC
      for (const hx of [centerX - length * 0.25, centerX + length * 0.25]) {
        const hvac = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 2.2), new THREE.MeshStandardMaterial({ color: 0x303841, metalness: 0.5, roughness: 0.5 }));
        hvac.position.set(hx, 5.75, 0);
        parent.add(hvac);
      }

      // Walls & Windows
      for (const side of [-1, 1]) {
        const lowerWall = new THREE.Mesh(new THREE.BoxGeometry(length, 0.95, 0.16), interiorWallMat);
        lowerWall.position.set(centerX, 2.1, side * 1.82);
        parent.add(lowerWall);

        const upperWall = new THREE.Mesh(new THREE.BoxGeometry(length, 0.48, 0.16), interiorWallMat);
        upperWall.position.set(centerX, 4.8, side * 1.82);
        parent.add(upperWall);

        // Windows
        for (let wx = centerX - (length / 2 - 2.5); wx <= centerX + (length / 2 - 2.5); wx += 3.2) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.22, 0.08), this.windowMaterial);
          win.position.set(wx, 3.8, side * 1.91);
          parent.add(win);
        }

        // Sliding doors if requested
        if (hasEntranceDoors) {
          for (const dx of [centerX - length * 0.25, centerX + length * 0.25]) {
            const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.45, 0.12), this.doorMaterial);
            door.position.set(dx, 2.65, side * 1.93);
            door.userData.closedX = dx;
            door.userData.side = side;
            door.castShadow = true;
            parent.add(door);
            doors.push(door);

            const grabPole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8), this.chromeMat);
            grabPole.position.set(dx, 3.2, side * 1.25);
            parent.add(grabPole);
          }
        }
      }

      // Warm Ceiling Lights (emissive fixtures only — avoids 21 shader PointLights per train)
      for (const lx of [centerX - length * 0.3, centerX, centerX + length * 0.3]) {
        const fixture = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4), new THREE.MeshBasicMaterial({ color: 0xfffae6 }));
        fixture.position.set(lx, 5.12, 0);
        parent.add(fixture);
      }
    };

    // Helper: Build gangway connector
    const addGangway = (parent: THREE.Group, startX: number, endX: number) => {
      const midX = (startX + endX) * 0.5;
      const len = Math.abs(startX - endX);
      for (const side of [-1, 1]) {
        const bellows = new THREE.Mesh(new THREE.BoxGeometry(len, 3.0, 0.22), this.gangwayBellowsMat);
        bellows.position.set(midX, 3.0, side * 1.35);
        parent.add(bellows);
      }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 2.7), this.gangwayBellowsMat);
      roof.position.set(midX, 4.5, 0);
      parent.add(roof);

      const bridge = new THREE.Mesh(new THREE.BoxGeometry(len, 0.16, 2.35), new THREE.MeshStandardMaterial({ color: 0x333b42, metalness: 0.7, roughness: 0.5 }));
      bridge.position.set(midX, 1.48, 0);
      bridge.receiveShadow = true;
      parent.add(bridge);

      const coupler = new THREE.Mesh(new THREE.BoxGeometry(len, 0.35, 0.45), this.wheelMaterial);
      coupler.position.set(midX, 0.75, 0);
      parent.add(coupler);
    };

    // Helper: Seated NPC Survivor avatar
    const addCivilianNPC = (parent: THREE.Group, px: number, pz: number, jacketColor: number, roleName: string) => {
      const npcGroup = new THREE.Group();
      npcGroup.position.set(px, 1.85, pz);
      npcGroup.name = `NPC_${roleName}`;

      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.4), new THREE.MeshStandardMaterial({ color: jacketColor, roughness: 0.8 }));
      torso.position.set(0, 0.42, 0);
      npcGroup.add(torso);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.7 }));
      head.position.set(0, 0.85, 0);
      npcGroup.add(head);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: 0x222222 }));
      cap.position.set(0, 0.95, 0);
      npcGroup.add(cap);

      const legs = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.5), new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 }));
      legs.position.set(0.15, 0.05, 0);
      npcGroup.add(legs);

      parent.add(npcGroup);
    };

    // =========================================================================
    // 1. COMPARTMENT 1: LOCOMOTIVE CAB (X: +18.0 to +1.0, Center: +9.5, Len: 17m)
    // =========================================================================
    const cabGroup = new THREE.Group();
    cabGroup.name = 'COMPARTMENT_1_LOCOMOTIVE_CAB';
    buildShell(cabGroup, 9.5, 17.0, true);

    // Aerodynamic Nose & Cowcatcher at X = +18.0
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 3.6), bodyMat);
    nose.position.set(18.0, 2.65, 0);
    nose.castShadow = true;
    cabGroup.add(nose);

    const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.8, 4), new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.85, roughness: 0.3 }));
    cowcatcher.rotation.z = -Math.PI / 2;
    cowcatcher.rotation.y = Math.PI / 4;
    cowcatcher.position.set(19.6, 1.1, 0);
    cowcatcher.castShadow = true;
    cabGroup.add(cowcatcher);

    // Windshield looking forward
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 3.2), this.windowMaterial);
    windshield.position.set(19.15, 3.75, 0);
    cabGroup.add(windshield);

    // Main Master Driver Console
    const consoleMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 2.6), new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.8 }));
    consoleMesh.position.set(18.0, 3.1, 0);
    cabGroup.add(consoleMesh);

    // Speedometer & Telemetry Digital Dials
    const dialSpeed = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.22), new THREE.MeshBasicMaterial({ color: 0x38ef7d }));
    dialSpeed.position.set(17.9, 3.65, -0.5);
    dialSpeed.rotation.y = -Math.PI / 2;
    cabGroup.add(dialSpeed);

    const dialPanto = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.22), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    dialPanto.position.set(17.9, 3.65, 0.5);
    dialPanto.rotation.y = -Math.PI / 2;
    cabGroup.add(dialPanto);

    // Animated Control Throttle Lever
    const leverBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.1), this.chromeMat);
    leverBase.position.set(17.7, 3.6, -0.2);
    cabGroup.add(leverBase);

    const driverArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 6), this.chromeMat);
    driverArm.position.set(17.7, 3.75, -0.2);
    cabGroup.add(driverArm);
    animatedDriverArm = driverArm;

    // AI Driver NPC (Seated on left side at main controls)
    const driverNpc = new THREE.Group();
    driverNpc.position.set(16.8, 1.85, -0.65);
    driverNpc.name = 'AI_DRIVER_NPC';
    const driverTorso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.4), new THREE.MeshStandardMaterial({ color: 0x1e3a5f }));
    driverTorso.position.set(0, 0.42, 0);
    driverNpc.add(driverTorso);
    const driverHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd4a373 }));
    driverHead.position.set(0, 0.85, 0);
    driverNpc.add(driverHead);
    const driverCap = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.42), new THREE.MeshStandardMaterial({ color: 0x0f172a }));
    driverCap.position.set(0.04, 0.95, 0);
    driverNpc.add(driverCap);
    const driverSeat = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.85, 0.75), new THREE.MeshStandardMaterial({ color: 0x111827 }));
    driverSeat.position.set(-0.05, 0.1, 0);
    driverNpc.add(driverSeat);
    cabGroup.add(driverNpc);

    // PILOT OBSERVER SEAT for Player (Right side, facing forward looking out windshield)
    const pilotObserverSeatMesh = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.85), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.6 }));
    pilotObserverSeatMesh.position.set(16.8, 2.2, 0.65);
    pilotObserverSeatMesh.castShadow = true;
    cabGroup.add(pilotObserverSeatMesh);

    seats.push({
      carriage: 1,
      seatId: 'pilot_observer_seat',
      name: 'Pilot Observer Seat · Cab Windshield View',
      localPos: new THREE.Vector3(16.8, 1.55, 0.65),
      isOccupied: false,
    });

    // Dual Forward Halogen Headlights + Spotlights
    const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), this.headlightMat);
    lampL.position.set(19.1, 2.4, -0.95);
    const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), this.headlightMat);
    lampR.position.set(19.1, 2.4, 0.95);
    cabGroup.add(lampL, lampR);

    const spotL = new THREE.SpotLight(0xffeedd, 6.0, 140, Math.PI / 5.5, 0.45, 1.2);
    spotL.position.set(19.3, 2.4, -0.95);
    spotL.target.position.set(80, 1.5, -0.95);
    spotL.visible = false;
    cabGroup.add(spotL);
    cabGroup.add(spotL.target);
    spotlights.push(spotL);

    const spotR = new THREE.SpotLight(0xffeedd, 6.0, 140, Math.PI / 5.5, 0.45, 1.2);
    spotR.position.set(19.3, 2.4, 0.95);
    spotR.target.position.set(80, 1.5, 0.95);
    spotR.visible = false;
    cabGroup.add(spotR);
    cabGroup.add(spotR.target);
    spotlights.push(spotR);

    const cabinLight = new THREE.PointLight(0xffc266, 1.8, 10);
    cabinLight.position.set(16.5, 4.2, 0);
    cabinLight.visible = false;
    cabGroup.add(cabinLight);

    // Roof Pantograph
    const pantographBase = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 2.2), this.chromeMat);
    pantographBase.position.set(8.0, 5.65, 0);
    cabGroup.add(pantographBase);
    const armLower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), this.chromeMat);
    armLower.position.set(7.4, 6.6, 0);
    armLower.rotation.z = Math.PI / 4;
    cabGroup.add(armLower);
    const armUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), this.chromeMat);
    armUpper.position.set(8.6, 7.6, 0);
    armUpper.rotation.z = -Math.PI / 4;
    cabGroup.add(armUpper);
    const contactStrip = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 2.6), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9 }));
    contactStrip.position.set(8.0, 8.2, 0);
    cabGroup.add(contactStrip);

    addBogie(cabGroup, 14.5, 1);
    addBogie(cabGroup, 4.5, 1);
    root.add(cabGroup);

    // Gangway 1-2 (Vestibule: X = +1.0 to -1.0)
    addGangway(root, 1.0, -1.0);

    // =========================================================================
    // 2. COMPARTMENT 2: STANDARD PASSENGER COACH (X: -1.0 to -25.0, Center: -13.0)
    // =========================================================================
    const coachGroup = new THREE.Group();
    coachGroup.name = 'COMPARTMENT_2_PASSENGER_COACH';
    buildShell(coachGroup, -13.0, 24.0, true);

    // Seating rows & Luggage racks
    let seatNum = 1;
    for (let sx = -4.0; sx >= -22.0; sx -= 3.2) {
      for (const side of [-1, 1]) {
        const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.85), this.seatFabricMat);
        seatBase.position.set(sx, 1.9, side * 1.05);
        seatBase.castShadow = true;
        coachGroup.add(seatBase);

        const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.16), this.seatFabricMat);
        seatBack.position.set(sx - 0.42, 2.5, side * 1.05);
        coachGroup.add(seatBack);

        const seatId = `c2_seat_${seatNum++}_${side > 0 ? 'R' : 'L'}`;
        seats.push({
          carriage: 2,
          seatId,
          name: `Passenger Coach Seat ${seatNum}`,
          localPos: new THREE.Vector3(sx, 1.55, side * 1.05),
          isOccupied: false,
        });

        const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.75), this.chromeMat);
        rack.position.set(sx, 4.4, side * 1.35);
        coachGroup.add(rack);
      }
    }

    addCivilianNPC(coachGroup, -7.2, 1.05, 0x2563eb, 'Commuter_Blue');
    addCivilianNPC(coachGroup, -16.8, -1.05, 0x16a34a, 'Commuter_Green');

    addBogie(coachGroup, -5.0, 2);
    addBogie(coachGroup, -21.0, 2);
    root.add(coachGroup);

    // Gangway 2-3 (Vestibule: X = -25.0 to -27.0)
    addGangway(root, -25.0, -27.0);

    // =========================================================================
    // 3. COMPARTMENT 3: DINING CARRIAGE (X: -27.0 to -51.0, Center: -39.0)
    // =========================================================================
    const diningGroup = new THREE.Group();
    diningGroup.name = 'COMPARTMENT_3_DINING_CARRIAGE';
    buildShell(diningGroup, -39.0, 24.0, false);

    // Food Service Counter / Bar (Right side: Z = 0.95, X: -31.0 to -37.0)
    const barCounter = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.05, 0.8), this.woodMat);
    barCounter.position.set(-34.0, 2.0, 0.95);
    barCounter.castShadow = true;
    diningGroup.add(barCounter);

    const coffeeMaker = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.4), this.chromeMat);
    coffeeMaker.position.set(-35.5, 2.75, 0.95);
    diningGroup.add(coffeeMaker);

    // Dining Attendant NPC
    addCivilianNPC(diningGroup, -34.0, 1.45, 0xd97706, 'Dining_Attendant');

    // Dining Booths & Tables (Left side: Z = -1.0)
    for (let dx = -31.0; dx >= -47.0; dx -= 4.5) {
      // Dining Table
      const table = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.85, 1.0), this.woodMat);
      table.position.set(dx, 1.9, -1.0);
      diningGroup.add(table);

      // Shaded Tabletop Lamp
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      lamp.position.set(dx, 2.45, -1.0);
      diningGroup.add(lamp);

      // Dining Chairs
      for (const chairOffset of [-0.65, 0.65]) {
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.7), this.seatDiningMat);
        chair.position.set(dx + chairOffset, 1.9, -1.0);
        diningGroup.add(chair);

        const seatId = `c3_dining_${dx}_${chairOffset > 0 ? 'F' : 'B'}`;
        seats.push({
          carriage: 3,
          seatId,
          name: 'Dining Carriage Table Seat',
          localPos: new THREE.Vector3(dx + chairOffset, 1.55, -1.0),
          isOccupied: false,
        });
      }
    }

    addCivilianNPC(diningGroup, -40.0, -1.0, 0xd946ef, 'Diner_Guest');

    addBogie(diningGroup, -31.0, 3);
    addBogie(diningGroup, -47.0, 3);
    root.add(diningGroup);

    // Gangway 3-4 (Vestibule: X = -51.0 to -53.0)
    addGangway(root, -51.0, -53.0);

    // =========================================================================
    // 4. COMPARTMENT 4: SLEEPING CARRIAGE (X: -53.0 to -77.0, Center: -65.0)
    // =========================================================================
    const sleeperGroup = new THREE.Group();
    sleeperGroup.name = 'COMPARTMENT_4_SLEEPING_CARRIAGE';
    buildShell(sleeperGroup, -65.0, 24.0, false);

    // Private Berths with Bunk Beds along one side
    for (let bx = -56.0; bx >= -74.0; bx -= 4.2) {
      // Partition wall
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 1.6), interiorWallMat);
      wall.position.set(bx, 3.1, -1.0);
      sleeperGroup.add(wall);

      // Lower bunk
      const bunkLower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 1.1), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      bunkLower.position.set(bx - 1.0, 1.8, -1.1);
      sleeperGroup.add(bunkLower);

      // Upper bunk
      const bunkUpper = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 1.1), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      bunkUpper.position.set(bx - 1.0, 3.4, -1.1);
      sleeperGroup.add(bunkUpper);

      // Pillow & Blanket
      const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.7), new THREE.MeshStandardMaterial({ color: 0xf1f5f9 }));
      pillow.position.set(bx - 0.25, 2.1, -1.1);
      sleeperGroup.add(pillow);

      const seatId = `c4_sleeper_bunk_${bx}`;
      seats.push({
        carriage: 4,
        seatId,
        name: 'Sleeping Carriage Private Berth',
        localPos: new THREE.Vector3(bx - 1.0, 1.55, -1.1),
        isOccupied: false,
      });
    }

    addCivilianNPC(sleeperGroup, -65.0, -1.1, 0x0284c7, 'Resting_Passenger');

    addBogie(sleeperGroup, -57.0, 4);
    addBogie(sleeperGroup, -73.0, 4);
    root.add(sleeperGroup);

    // Gangway 4-5 (Vestibule: X = -77.0 to -79.0)
    addGangway(root, -77.0, -79.0);

    // =========================================================================
    // 5. COMPARTMENT 5: AC CHAIR CAR / EXECUTIVE CLASS (X: -79.0 to -103.0, Center: -91.0)
    // =========================================================================
    const chairCarGroup = new THREE.Group();
    chairCarGroup.name = 'COMPARTMENT_5_AC_CHAIR_CAR';
    buildShell(chairCarGroup, -91.0, 24.0, true);

    // 2x2 Reclining Executive Seats with tray tables
    let ccSeatNum = 1;
    for (let cx = -82.0; cx >= -100.0; cx -= 3.2) {
      for (const side of [-1, 1]) {
        const seatBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.9), this.seatFabricMat);
        seatBase.position.set(cx, 1.9, side * 1.05);
        seatBase.castShadow = true;
        chairCarGroup.add(seatBase);

        const seatBack = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.92, 0.18), this.seatFabricMat);
        seatBack.position.set(cx - 0.42, 2.5, side * 1.05);
        chairCarGroup.add(seatBack);

        const tray = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.45), this.chromeMat);
        tray.position.set(cx + 0.4, 2.1, side * 1.05);
        chairCarGroup.add(tray);

        const seatId = `c5_cc_seat_${ccSeatNum++}_${side > 0 ? 'R' : 'L'}`;
        seats.push({
          carriage: 5,
          seatId,
          name: `AC Chair Car Recliner ${ccSeatNum}`,
          localPos: new THREE.Vector3(cx, 1.55, side * 1.05),
          isOccupied: false,
        });

        const overheadRack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.8), this.chromeMat);
        overheadRack.position.set(cx, 4.4, side * 1.35);
        chairCarGroup.add(overheadRack);
      }
    }

    addCivilianNPC(chairCarGroup, -85.2, 1.05, 0x0284c7, 'Executive_Passenger');
    addCivilianNPC(chairCarGroup, -94.8, -1.05, 0x059669, 'Business_Traveler');

    addBogie(chairCarGroup, -83.0, 5);
    addBogie(chairCarGroup, -99.0, 5);
    root.add(chairCarGroup);

    // Gangway 5-6 (Vestibule: X = -103.0 to -105.0)
    addGangway(root, -103.0, -105.0);

    // =========================================================================
    // 6. COMPARTMENT 6: SLEEPER / GENERAL SECOND CLASS (X: -105.0 to -129.0, Center: -117.0)
    // =========================================================================
    const generalGroup = new THREE.Group();
    generalGroup.name = 'COMPARTMENT_6_GENERAL_SLEEPER';
    buildShell(generalGroup, -117.0, 24.0, true);

    // Transverse cushioned bench bays and open upper luggage bunks
    let genSeatNum = 1;
    for (let gx = -108.0; gx >= -126.0; gx -= 4.0) {
      for (const side of [-1, 1]) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.95), this.seatDiningMat);
        bench.position.set(gx, 1.9, side * 1.05);
        bench.castShadow = true;
        generalGroup.add(bench);

        const upperLuggageBunk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.95), new THREE.MeshStandardMaterial({ color: 0x334155 }));
        upperLuggageBunk.position.set(gx, 3.8, side * 1.05);
        generalGroup.add(upperLuggageBunk);

        const seatId = `c6_gen_${genSeatNum++}_${side > 0 ? 'R' : 'L'}`;
        seats.push({
          carriage: 6,
          seatId,
          name: `General Second Class Berth ${genSeatNum}`,
          localPos: new THREE.Vector3(gx, 1.55, side * 1.05),
          isOccupied: false,
        });
      }
    }

    addCivilianNPC(generalGroup, -112.0, 1.05, 0x9333ea, 'General_Commuter_1');
    addCivilianNPC(generalGroup, -120.0, -1.05, 0xd97706, 'General_Commuter_2');

    addBogie(generalGroup, -109.0, 6);
    addBogie(generalGroup, -125.0, 6);
    root.add(generalGroup);

    // Gangway 6-7 (Vestibule: X = -129.0 to -131.0)
    addGangway(root, -129.0, -131.0);

    // =========================================================================
    // 7. COMPARTMENT 7: OBSERVATION LOUNGE & LUXURY TAIL (X: -131.0 to -155.0, Center: -143.0)
    // =========================================================================
    const loungeGroup = new THREE.Group();
    loungeGroup.name = 'COMPARTMENT_7_OBSERVATION_LOUNGE';
    buildShell(loungeGroup, -143.0, 24.0, false);

    // Giant Panoramic Rear Aerodynamic Window
    const rearWindow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.2, 3.2), this.windowMaterial);
    rearWindow.position.set(-154.95, 3.65, 0);
    loungeGroup.add(rearWindow);

    // Luxurious swivel armchairs facing panoramic rear and side vistas
    for (const rz of [-1.0, 1.0]) {
      for (const lx of [-135.0, -141.0, -147.0, -153.0]) {
        const armchair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.95), this.seatLoungeMat);
        armchair.position.set(lx, 2.05, rz);
        loungeGroup.add(armchair);

        const seatId = `c7_lounge_${lx}_${rz > 0 ? 'R' : 'L'}`;
        seats.push({
          carriage: 7,
          seatId,
          name: 'Observation Lounge Panoramic Armchair',
          localPos: new THREE.Vector3(lx, 1.55, rz),
          isOccupied: false,
        });
      }
    }

    // Rear Ruby Red Dual LED Tail Lights (emissive meshes only — no per-train PointLight flood)
    for (const side of [-1, 1]) {
      const tailLight = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), this.tailLightMat);
      tailLight.position.set(-155.0, 2.5, side * 1.1);
      loungeGroup.add(tailLight);
      tailLights.push(tailLight);
    }

    addCivilianNPC(loungeGroup, -150.0, 1.0, 0xca8a04, 'Sightseer_Gold');

    addBogie(loungeGroup, -135.0, 7);
    addBogie(loungeGroup, -151.0, 7);
    root.add(loungeGroup);

    return {
      group: root,
      wheels,
      couplingRods,
      seats,
      doors,
      spotlights,
      cabinLight,
      tailLights,
      interiorLights,
      animatedDriverArm,
    };
  }

  // --- Dynamic Procedural Stations along the Line ---
  private buildStation(lineId: RailwayTrackLine, z: number, stationIndex: number): void {
    const key = `station:${stationIndex}`;
    if (this.stationGroups.has(key)) return;

    const x = stationIndex * STATION_SPACING;
    const stationTrackZs = [138, 150, 162, 174, 186, 198, 210, 222];
    const hallZ = 265;
    const y = this.trackSurfaceY(x, hallZ) - 0.37;

    const instance = MegaStationArchitecture.build({
      stationIndex,
      stationX: x,
      hallZ,
      baseY: y,
      platformTrackZs: stationTrackZs,
      trackSurfaceY: (px, pz) => this.trackSurfaceY(px, pz),
      railMaterial: this.railMaterial,
      chromeMat: this.chromeMat,
      floorMat: this.floorMat,
      doorMaterial: this.doorMaterial,
      windowMaterial: this.windowMaterial,
      wheelMaterial: this.wheelMaterial,
      ballastMaterial: this.ballastMaterial,
      seatFabricMat: this.seatFabricMat,
      seatDiningMat: this.seatDiningMat,
      seatLoungeMat: this.seatLoungeMat,
    });

    this.megaStationInstances.set(key, instance);
    this.stationGroups.set(key, instance.group);
    this.scene.add(instance.group);
  }

  private buildRailChunk(lineId: RailwayTrackLine, z: number, chunkX: number): void {
    const key = `${lineId}:${chunkX}`;
    if (this.railChunks.has(key)) return;

    const group = new THREE.Group();
    group.name = `RAIL_CHUNK_${key}`;
    const minX = chunkX * CHUNK_LENGTH;
    const maxX = minX + CHUNK_LENGTH;
    const ballastMat = this.ballastMaterial;

    for (let x = minX; x < maxX; x += 16) {
      const segX = x + 8;
      const ground = this.trackSurfaceY(segX, z) - 0.37;

      const ballast = new THREE.Mesh(this.sharedBallastGeo, ballastMat);
      ballast.position.set(segX, ground + 0.08, z);
      ballast.receiveShadow = true;
      group.add(ballast);

      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(this.sharedRailGeo, this.railMaterial);
        rail.position.set(segX, ground + 0.38, z + side * 0.88);
        group.add(rail);
      }
    }

    const sleeperCount = Math.floor(CHUNK_LENGTH / 2.8);
    const sleepers = new THREE.InstancedMesh(this.sharedSleeperGeo, this.sleeperMaterial, sleeperCount);
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < sleeperCount; i++) {
      const sx = minX + i * 2.8 + 1.4;
      const ground = this.trackSurfaceY(sx, z) - 0.37;
      matrix.makeTranslation(sx, ground + 0.15, z);
      sleepers.setMatrixAt(i, matrix);
    }
    sleepers.instanceMatrix.needsUpdate = true;
    group.add(sleepers);

    this.scene.add(group);
    this.railChunks.set(key, group);
  }

  private ensureWorldGeometry(x: number, z: number, lineId: RailwayTrackLine): void {
    const chunkIdx = Math.floor(x / CHUNK_LENGTH);
    for (let c = chunkIdx - 2; c <= chunkIdx + 2; c++) {
      this.buildRailChunk(lineId, z, c);
    }
    const stationIdx = Math.round(x / STATION_SPACING);
    if (Math.abs(x - stationIdx * STATION_SPACING) < 700) {
      this.buildStation(lineId, z, stationIdx);
    }
  }

  /** Animates station automation without requiring every facility to run a full AI tick. */
  private updateStationSystems(delta: number, playerPosition?: THREE.Vector3): void {
    const pPos = playerPosition ?? this.stationFallbackPlayerPos;
    const count = Math.min(5, this.trains.length);
    for (let i = 0; i < count; i++) {
      const t = this.trains[i];
      if (!this.stationLiveRowsCache[i]) {
        this.stationLiveRowsCache[i] = { number: '', name: '', platform: '', eta: '', status: '', color: '#22c55e' };
      }
      const row = this.stationLiveRowsCache[i];
      row.number = t.serviceId || t.trainNumber;
      row.name = t.serviceName.toUpperCase();
      row.platform = `PF-${i + 1}`;
      const isAtStation = t.dwellRemaining > 0;
      row.eta = formatTime(isAtStation ? t.departureCountdownSeconds : t.arrivalCountdownSeconds);
      if (t.holdOrdered) {
        row.status = 'HELD';
        row.color = '#ef4444';
      } else if (isAtStation) {
        row.status = t.doorsOpen ? 'BOARDING' : 'DEPARTING';
        row.color = '#38bdf8';
      } else if (t.arrivalCountdownSeconds <= 45) {
        row.status = 'ARRIVING';
        row.color = '#facc15';
      } else {
        row.status = 'ON TIME';
        row.color = '#22c55e';
      }
    }
    this.stationLiveRowsCache.length = count;

    for (const instance of this.megaStationInstances.values()) {
      instance.update(delta, pPos, this.stationLiveRowsCache);
    }
  }

  // --- Frame Loop: Pure AI Autonomous Navigation & Stopwatch Countdowns ---
  public update(delta: number, playerPosition: THREE.Vector3, gameTimeMinutes?: number, dayCount?: number): void {
    if (typeof gameTimeMinutes === 'number' && Number.isFinite(gameTimeMinutes)) {
      this.currentGameTimeMinutes = gameTimeMinutes;
    }
    if (typeof dayCount === 'number' && Number.isFinite(dayCount)) {
      this.currentDayCount = dayCount;
    }
    const clampedDelta = Math.min(delta, 0.1);
    this.updateStationSystems(clampedDelta, playerPosition);

    this.worldGeomTimer += clampedDelta;
    const shouldCheckWorldGeom = this.worldGeomTimer >= 0.35;
    if (shouldCheckWorldGeom) {
      this.worldGeomTimer = 0;
    }

    for (const train of this.trains) {
      if (shouldCheckWorldGeom) {
        this.ensureWorldGeometry(playerPosition.x, train.z, train.line);
        this.ensureWorldGeometry(train.x, train.z, train.line);
      }

      const nearestStation = Math.round(train.x / STATION_SPACING);
      const distToStation = Math.abs(train.x - nearestStation * STATION_SPACING);

      // Release the previous station marker only after the train has cleared its
      // platform/station throat. This makes the next station eligible for arrival.
      if (train.currentStationIndex !== null && nearestStation !== train.currentStationIndex && distToStation > 160) {
        train.currentStationIndex = null;
      }

      // Animate AI Driver Arm slightly on the throttle lever
      if (train.animatedDriverArm) {
        train.driverArmPhase += clampedDelta * 1.5;
        train.animatedDriverArm.rotation.x = Math.sin(train.driverArmPhase) * 0.18;
      }

      // 1. Pure AI Autonomous Schedule & Station Handling
      if (train.dwellRemaining > 0) {
        // Dwell at the platform. Keep currentStationIndex set after departure
        // so the same platform is not mistaken for a fresh arrival on the next tick.
        train.dwellRemaining = Math.max(0, train.dwellRemaining - clampedDelta);
        train.departureCountdownSeconds = Math.max(0, Math.min(299, Math.ceil(train.dwellRemaining)));
        train.arrivalCountdownSeconds = 0;
        train.speed = 0;

        if (train.dwellRemaining <= 6 && train.stationStatus === 'doors_open') {
          train.stationStatus = 'doors_closing';
          soundEngine.playStationChime();
        }
        if (train.dwellRemaining <= 0) {
          train.stationStatus = 'running';
          train.doorsOpen = false;
          // Record exact departure station & clock time
          if (train.currentStationIndex !== null) {
            train.lastDepartedStationIndex = train.currentStationIndex;
          } else {
            train.lastDepartedStationIndex = nearestStation;
          }
          train.lastDepartedGameMinutes = this.currentGameTimeMinutes;
          train.targetSpeed = AI_CRUISE_SPEED;
          train.arrivalCountdownSeconds = Math.min(299, Math.round(STATION_SPACING / AI_CRUISE_SPEED));
        }
      } else if (train.holdOrdered) {
        // Dispatcher emergency hold
        train.speed = THREE.MathUtils.damp(train.speed, 0, 5.0, clampedDelta);
      } else if (distToStation < 140 && train.currentStationIndex !== nearestStation) {
        // Smooth deceleration into station
        train.targetSpeed = Math.max(0, (distToStation / 140) * AI_CRUISE_SPEED);
        train.speed = THREE.MathUtils.damp(train.speed, train.targetSpeed, 4.2, clampedDelta);

        // Arrival countdown decreases smoothly as station approaches
        const estSec = Math.max(1, Math.round(distToStation / Math.max(train.speed, 4.0)));
        train.arrivalCountdownSeconds = Math.min(299, estSec);

        if (distToStation < 1.8 && Math.abs(train.speed) < 0.8) {
          // Arrived! Generate randomized dwell strictly < 300s (45s to 219s)
          const randomDwell = Math.floor(Math.random() * 175) + 45;
          train.speed = 0;
          train.dwellRemaining = randomDwell;
          train.departureCountdownSeconds = randomDwell;
          train.arrivalCountdownSeconds = 0;
          train.currentStationIndex = nearestStation;
          train.lastArrivedStationIndex = nearestStation;
          train.lastArrivedGameMinutes = this.currentGameTimeMinutes;
          train.stationStatus = 'doors_open';
          train.doorsOpen = true;
          soundEngine.playStationChime();
          try {
            const originStation = train.direction === 1 ? STATION_NAMES[0] : STATION_NAMES[STATION_NAMES.length - 1];
            const destStation = train.direction === 1 ? STATION_NAMES[STATION_NAMES.length - 1] : STATION_NAMES[0];
            const platNum = parseInt(train.trainNumber.replace(/\D/g, '') || '1', 10);
            stationAnnouncementSystem.announceTrainArrival(
              train.trainNumber,
              train.serviceName,
              originStation,
              destStation,
              platNum
            );
          } catch {}
        }
      } else {
        // Cruise on open line
        train.stationStatus = 'running';
        train.doorsOpen = false;
        train.targetSpeed = AI_CRUISE_SPEED;
        train.speed = THREE.MathUtils.damp(train.speed, train.targetSpeed, 2.2, clampedDelta);

        // Next station in actual travel direction
        const legOriginIdx = train.direction === 1
          ? Math.floor(train.x / STATION_SPACING)
          : Math.ceil(train.x / STATION_SPACING);
        const nextStationIdx = legOriginIdx + train.direction;
        const distToNext = Math.abs(nextStationIdx * STATION_SPACING - train.x);
        const calcSec = Math.round(distToNext / Math.max(train.speed, 5));
        train.arrivalCountdownSeconds = Math.min(299, Math.max(1, calcSec));
        train.departureCountdownSeconds = 0;
        train.brakeSfxPlayed = false;
      }

      // Play pneumatic brake hiss once when decelerating below 10 m/s into station
      if (train.dwellRemaining <= 0 && !train.brakeSfxPlayed && distToStation < 140 && train.speed < 10.5 && train.speed > 2.0 && train.currentStationIndex !== nearestStation) {
        train.brakeSfxPlayed = true;
        if (Math.hypot(train.x - playerPosition.x, train.z - playerPosition.z) < 90) {
          soundEngine.playTrainBrakes();
        }
      }

      // 2. Animate Sliding Doors
      const targetDoorZ = train.doorsOpen ? 2.55 : 1.93;
      for (const door of train.doors) {
        const side = Number(door.userData.side);
        door.position.z = THREE.MathUtils.damp(door.position.z, side * targetDoorZ, 8, clampedDelta);
      }

      // 3. Move Train Along Track + Track Cumulative Distance + Align Consist Pitch to Rail Grade
      const stepDx = train.direction * train.speed * clampedDelta;
      train.x += stepDx;
      train.totalDistanceCoveredM += Math.abs(stepDx);
      const groundY = this.trackSurfaceY(train.x, train.z);
      const frontGradeY = this.trackSurfaceY(train.x + train.direction * 18, train.z);
      const rearGradeY = this.trackSurfaceY(train.x - train.direction * 130, train.z);
      const trackPitch = THREE.MathUtils.clamp(Math.atan2(frontGradeY - rearGradeY, 148), -0.075, 0.075);

      train.group.position.set(train.x, groundY, train.z);
      train.group.rotation.y = train.direction === 1 ? 0 : Math.PI;
      train.group.rotation.z = trackPitch;

      // 4. Gimbal-Free True Axle Wheel Rolling & Locomotive Coupling Rod Kinematics
      if (Math.abs(train.speed) > 0.01) {
        const wheelAngularStep = (train.speed * clampedDelta) / WHEEL_RADIUS;
        train.wheelAngle -= wheelAngularStep;
        for (const wheel of train.wheels) {
          wheel.rotation.z = train.wheelAngle;
        }
        const crankX = Math.cos(train.wheelAngle) * 0.24;
        const crankY = Math.sin(train.wheelAngle) * 0.24;
        for (const rod of train.couplingRods) {
          rod.mesh.position.x = rod.baseX + crankX;
          rod.mesh.position.y = rod.baseY + crankY;
        }
      }

      const isBoarded = train === this.activePassengerTrain;
      if (isBoarded) {
        train.group.updateMatrixWorld(true);
      }

      // 5. Cab & Headlight lighting strictly bounded to boarded / nearest active train
      const distToPlayer = Math.hypot(train.x - playerPosition.x, train.z - playerPosition.z);
      if (train.cabinLight) {
        train.cabinLight.visible = isBoarded;
      }
      const enableHeadlightSpot = train.headlightsOn && (isBoarded || distToPlayer < 160);
      const fwd = train.direction;
      for (let sIdx = 0; sIdx < train.spotlights.length; sIdx++) {
        const spot = train.spotlights[sIdx];
        spot.visible = enableHeadlightSpot && sIdx === 0;
        if (spot.visible) {
          spot.target.position.set(train.x + fwd * 70, groundY + 1.5, train.z);
          spot.target.updateMatrixWorld();
        }
      }

      // 6. Telemetry dynamics
      train.telemetryTimer += clampedDelta;
      if (train.telemetryTimer > 0.8) {
        train.telemetryTimer = 0;
        const isStationary = Math.abs(train.speed) < 0.5;
        const targetTemp = isStationary ? 52 + Math.floor(Math.sin(train.x * 0.002) * 4) : 68 + Math.floor(Math.sin(train.x * 0.005) * 6);
        train.tractionMotorTempC = Math.round(THREE.MathUtils.damp(train.tractionMotorTempC, targetTemp, 0.4, 0.8));
        train.brakePressureBar = isStationary ? 4.2 : 5.0;
        train.pantographVoltageKv = Math.round((24.8 + Math.sin(train.x * 0.01) * 0.35) * 10) / 10;
      }
    }

    // Track audio: authentic dual-bogie rail-joint clack synced with rolling speed
    const movingTrain = this.activePassengerTrain || this.trains.find((t) => Math.hypot(t.x - playerPosition.x, t.z - playerPosition.z) < 70);
    if (movingTrain && Math.abs(movingTrain.speed) > 1.0) {
      this.wheelAudioTimer += clampedDelta;
      const interval = Math.max(0.32, 1.05 - (Math.abs(movingTrain.speed) / MAX_TRAIN_SPEED) * 0.65);
      if (this.wheelAudioTimer > interval) {
        this.wheelAudioTimer = 0;
        soundEngine.playRailJointClack();
      }
    }

    if (shouldCheckWorldGeom) {
      const keep = new Set<string>();
      const pc = Math.floor(playerPosition.x / CHUNK_LENGTH);
      for (const t of this.trains) {
        const c = Math.floor(t.x / CHUNK_LENGTH);
        for (let i = c - 2; i <= c + 2; i++) keep.add(`${t.line}:${i}`);
        for (let i = pc - 2; i <= pc + 2; i++) keep.add(`${t.line}:${i}`);
      }

      for (const [key, group] of this.railChunks) {
        if (!keep.has(key)) {
          this.scene.remove(group);
          group.traverse((obj) => {
            if (obj instanceof THREE.Mesh && !obj.geometry.userData?.__sharedResource) {
              obj.geometry.dispose();
            }
          });
          this.railChunks.delete(key);
        }
      }
    }

    // Station hubs stream around the player and all six moving services. This
    // prevents distant eight-platform terminals from accumulating in memory.
    for (const [key, group] of this.stationGroups) {
      const stationIndex = Number(group.userData.stationIndex) || 0;
      const stationX = stationIndex * STATION_SPACING;
      const nearPlayer = Math.abs(playerPosition.x - stationX) < 850;
      const nearTrain = this.trains.some((train) => Math.abs(train.x - stationX) < 850);
      if (!nearPlayer && !nearTrain) {
        this.scene.remove(group);
        this.disposeStationGroup(group);
        this.stationGroups.delete(key);
      }
    }

    // 9. Update Player-Quality Human NPCs Across Stations and Moving Trains
    const nearestStationIdx = Math.round(playerPosition.x / STATION_SPACING);
    this.npcManager.update(
      clampedDelta,
      playerPosition,
      this.trains,
      nearestStationIdx * STATION_SPACING,
      150
    );
  }

  // --- Player Inter-Carriage Navigation & Train Relative Movement ---
  public getNearbyBoardableTrain(playerPos: THREE.Vector3, maxDist = 9.0): AITrain | null {
    let best: AITrain | null = null;
    let bestDist = maxDist;
    for (const train of this.trains) {
      const localX = (playerPos.x - train.x) * train.direction;
      const clampedX = THREE.MathUtils.clamp(localX, -155.0, 20.0);
      const nearestWorldX = train.x + clampedX * train.direction;
      const dx = Math.abs(playerPos.x - nearestWorldX);
      const dz = Math.max(0, Math.abs(train.z - playerPos.z) - 2.4);
      const d = Math.hypot(dx, dz);
      if (d <= bestDist) {
        bestDist = d;
        best = train;
      }
    }
    return best;
  }

  public boardTrain(train: AITrain, playerPos?: THREE.Vector3): void {
    train.isOccupied = true;
    this.activePassengerTrain = train;
    this.activeDrivableTrain = null; // No driving, observer only
    if (playerPos) {
      const localX = THREE.MathUtils.clamp((playerPos.x - train.x) * train.direction, -154.0, 17.0);
      this.playerLocalPos.set(localX, 1.52, 0);
    } else {
      this.playerLocalPos.set(13.0, 1.52, 0); // Default in Locomotive Cab area
    }
    this.seatedSeatId = null;
    this.isPilotSeated = false;
    this.cameraMode = 'interior_1st';
    soundEngine.playGateToggle(true);
  }

  public exitTrain(playerPosOut: THREE.Vector3): void {
    const train = this.activePassengerTrain;
    if (!train) return;
    train.isOccupied = false;
    this.seatedSeatId = null;
    this.isPilotSeated = false;
    // Step safely out onto the platform adjacent to the player's current carriage
    const exitWorldX = train.x + train.direction * this.playerLocalPos.x;
    const exitGroundY = this.trackSurfaceY(exitWorldX, train.z + 4.2);
    playerPosOut.set(exitWorldX, exitGroundY + 0.65, train.z + 4.2);
    this.activePassengerTrain = null;
    this.activeDrivableTrain = null;
    soundEngine.playGateToggle(false);
  }

  // Seamless walking across all 5 specialized compartments
  public movePlayerInsideTrain(
    input: { forward: boolean; backward: boolean; left: boolean; right: boolean; sprint?: boolean },
    delta: number
  ): void {
    if (!this.activePassengerTrain) return;

    if (this.seatedSeatId || this.isPilotSeated) {
      // Player is seated peacefully (either in pilot seat or passenger/dining/lounge seat)
      return;
    }

    const moveSpeed = (input.sprint ? 4.5 : 2.6) * delta;
    let dx = 0;
    let dz = 0;

    if (input.forward) dx += moveSpeed;
    if (input.backward) dx -= moveSpeed;
    if (input.right) dz += moveSpeed;
    if (input.left) dz -= moveSpeed;

    this.playerLocalPos.x += dx;
    this.playerLocalPos.z += dz;

    // Walkable range: Locomotive Cab (X = +17.5) down to Observation Lounge (X = -154.5)
    this.playerLocalPos.x = THREE.MathUtils.clamp(this.playerLocalPos.x, -154.5, 17.5);

    // Lateral aisle clamping: Gangways are narrower than main compartments
    const x = this.playerLocalPos.x;
    const isGangway =
      (x < 1.0 && x > -1.0) ||
      (x < -25.0 && x > -27.0) ||
      (x < -51.0 && x > -53.0) ||
      (x < -77.0 && x > -79.0) ||
      (x < -103.0 && x > -105.0) ||
      (x < -129.0 && x > -131.0);

    if (isGangway) {
      this.playerLocalPos.z = THREE.MathUtils.clamp(this.playerLocalPos.z, -0.7, 0.7);
    } else {
      this.playerLocalPos.z = THREE.MathUtils.clamp(this.playerLocalPos.z, -1.15, 1.15);
    }

    this.playerLocalPos.y = 1.52; // Constant floor plane
  }

  public getCurrentCarriageIndex(): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
    if (!this.activePassengerTrain) return 1;
    const x = this.playerLocalPos.x;
    if (x >= 0.0) return 1; // Locomotive Cab
    if (x >= -26.0) return 2; // AC First Class (1A)
    if (x >= -52.0) return 3; // AC 2-Tier / 3-Tier Sleeper
    if (x >= -78.0) return 4; // Dining & Food Service Lounge
    if (x >= -104.0) return 5; // AC Chair Car (CC) / Executive
    if (x >= -130.0) return 6; // Sleeper / General Second Class
    return 7; // Panoramic Observation Lounge
  }

  public getCurrentCarriageName(): string {
    const idx = this.getCurrentCarriageIndex();
    switch (idx) {
      case 1:
        return 'Carriage 1 · Locomotive Cab & Pilot Console';
      case 2:
        return 'Carriage 2 · AC First Class (1A) Executive Suite';
      case 3:
        return 'Carriage 3 · AC 2-Tier / 3-Tier Sleeper Coach';
      case 4:
        return 'Carriage 4 · Dining & Food Service Lounge';
      case 5:
        return 'Carriage 5 · AC Chair Car (CC) / Executive Class';
      case 6:
        return 'Carriage 6 · Sleeper Class (SL) / General Second Class';
      case 7:
        return 'Carriage 7 · Panoramic Observation Lounge';
    }
  }

  // Sit down / Stand up on any seat
  public toggleSitOnSeat(): boolean {
    if (!this.activePassengerTrain) return false;
    if (this.seatedSeatId) {
      // Stand up
      this.seatedSeatId = null;
      this.isPilotSeated = false;
      this.playerLocalPos.y = 1.52;
      soundEngine.playUIClick();
      return true;
    }

    // Find nearby empty seat
    for (const seat of this.activePassengerTrain.seats) {
      const dist = this.playerLocalPos.distanceTo(seat.localPos);
      if (dist < 1.8 && !seat.isOccupied) {
        this.seatedSeatId = seat.seatId;
        this.isPilotSeated = seat.seatId === 'pilot_observer_seat';
        this.playerLocalPos.copy(seat.localPos);
        if (this.isPilotSeated) {
          this.cameraMode = 'cab'; // switch to cab windshield view
        }
        soundEngine.playUIClick();
        return true;
      }
    }
    return false;
  }

  // Toggle Pilot Observer Seat in locomotive cab
  public toggleDriverSeat(): boolean {
    const train = this.activePassengerTrain;
    if (!train) return false;

    if (this.isPilotSeated) {
      // Leave pilot seat
      this.isPilotSeated = false;
      this.seatedSeatId = null;
      this.playerLocalPos.set(15.2, 1.52, 0);
      this.cameraMode = 'interior_1st';
      soundEngine.playUIClick();
      return true;
    }

    // If near front cab (X >= 14.5), sit in pilot observer seat
    if (this.playerLocalPos.x >= 14.5) {
      this.isPilotSeated = true;
      this.seatedSeatId = 'pilot_observer_seat';
      this.playerLocalPos.set(16.8, 1.55, 0.65);
      this.cameraMode = 'cab';
      soundEngine.playSwitchClick();
      return true;
    }
    return false;
  }

  public cycleCameraMode(): TrainCameraMode {
    const modes: TrainCameraMode[] = ['interior_1st', 'interior_3rd', 'cab', 'chase', 'rear'];
    const curIdx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(curIdx + 1) % modes.length];
    soundEngine.playUIClick();
    return this.cameraMode;
  }

  public honkHorn(): void {
    soundEngine.playTrainHorn();
  }

  public toggleHeadlights(): boolean {
    if (!this.activePassengerTrain) return false;
    this.activePassengerTrain.headlightsOn = !this.activePassengerTrain.headlightsOn;
    for (const spot of this.activePassengerTrain.spotlights) {
      spot.intensity = this.activePassengerTrain.headlightsOn ? 6.0 : 0.0;
    }
    soundEngine.playSwitchClick();
    return this.activePassengerTrain.headlightsOn;
  }

  public toggleDoors(): boolean {
    if (!this.activePassengerTrain) return false;
    this.activePassengerTrain.doorsOpen = !this.activePassengerTrain.doorsOpen;
    soundEngine.playDoorOpenClose(this.activePassengerTrain.doorsOpen);
    return this.activePassengerTrain.doorsOpen;
  }

  // --- Telemetry Data for TrainHUD ---
  public getTrainHUDData(): TrainHUDData | null {
    const train = this.activePassengerTrain;
    if (!train) return null;

    const isAtStation = train.dwellRemaining > 0;
    const legOriginIdx = train.direction === 1
      ? Math.floor(train.x / STATION_SPACING)
      : Math.ceil(train.x / STATION_SPACING);
    const activeStationIdx = isAtStation ? Math.round(train.x / STATION_SPACING) : legOriginIdx;
    const nextIdx = activeStationIdx + train.direction;

    const curStation = STATION_NAMES[posMod(activeStationIdx, STATION_NAMES.length)];
    const nextStation = STATION_NAMES[posMod(nextIdx, STATION_NAMES.length)];
    const upcomingStations = [
      STATION_NAMES[posMod(nextIdx + train.direction, STATION_NAMES.length)],
      STATION_NAMES[posMod(nextIdx + train.direction * 2, STATION_NAMES.length)],
    ];
    const distToNextMeters = Math.round(Math.abs(nextIdx * STATION_SPACING - train.x));

    let announcement = `Attention passengers: Approaching ${nextStation}.`;
    if (train.doorsOpen) {
      announcement = `Welcome to ${curStation}. Doors are open on the platform side.`;
    } else if (train.stationStatus === 'doors_closing') {
      announcement = `Doors closing. Stand clear of sliding doors.`;
    }

    const canTakeControls = this.playerLocalPos.x >= 14.5;
    const canSit = !this.isPilotSeated && train.seats.some((s) => this.playerLocalPos.distanceTo(s.localPos) < 1.8);
    const canExit = train.doorsOpen || Math.abs(train.speed) < 1.0;

    let aiStatus = 'ACTIVE · CRUISING';
    if (train.holdOrdered) {
      aiStatus = 'DISPATCH HOLD';
    } else if (train.dwellRemaining > 0) {
      aiStatus = 'DWELLING AT PLATFORM';
    } else if (distToNextMeters < 140) {
      aiStatus = 'APPROACHING PLATFORM';
    }

    return {
      trainNumber: train.trainNumber,
      line: train.line,
      serviceName: train.serviceName,
      direction: train.direction === 1 ? 'EASTBOUND' : 'WESTBOUND',
      directionLabel: train.directionLabel,
      speedKmh: Math.round(Math.abs(train.speed) * 3.6),
      speedMph: Math.round(Math.abs(train.speed) * 2.237),
      currentStation: curStation,
      nextStation: nextStation,
      upcomingStations,
      distToNextMeters,
      distTravelledKm: Math.round((train.totalDistanceCoveredM / 1000) * 10) / 10,
      distRemainingKm: Math.round((distToNextMeters / 1000) * 10) / 10,
      doorsOpen: train.doorsOpen,
      announcement,
      isDriving: false, // always false — AI only
      isPilotSeated: this.isPilotSeated,
      isSeated: !!this.seatedSeatId,
      departureCountdownSeconds: train.departureCountdownSeconds,
      arrivalCountdownSeconds: train.arrivalCountdownSeconds,
      departureCountdownText: formatTime(train.departureCountdownSeconds),
      arrivalCountdownText: formatTime(train.arrivalCountdownSeconds),
      isDwelling: train.dwellRemaining > 0,
      aiStatus,
      throttlePct: Math.round(train.throttle * 100),
      brakePressureBar: train.brakePressureBar,
      motorTempC: train.tractionMotorTempC,
      pantographVoltageKv: train.pantographVoltageKv,
      signalAspect: train.holdOrdered ? 'red' : Math.abs(train.speed) < 5 ? 'yellow' : 'green',
      carriageIndex: this.getCurrentCarriageIndex(),
      carriageName: this.getCurrentCarriageName(),
      cameraMode: this.cameraMode,
      headlightsOn: train.headlightsOn,
      canTakeControls,
      canSit,
      canExit,
    };
  }

  // --- Underground Control Center Dispatch Telemetry ---
  public getDispatchTelemetry(): RailwayServiceTelemetry[] {
    const stationCount = STATION_NAMES.length;
    const routeTotalKm = Math.round(((stationCount * STATION_SPACING) / 1000) * 10) / 10; // 9.6 km cycle
    const currentTimeText = formatGameClockHMS(this.currentGameTimeMinutes);

    return this.trains.map((train, idx) => {
      const isAtStation = train.dwellRemaining > 0;
      const nearestIdx = Math.round(train.x / STATION_SPACING);
      const legOriginRaw = train.direction === 1
        ? Math.floor(train.x / STATION_SPACING)
        : Math.ceil(train.x / STATION_SPACING);
      const activeStationRaw = isAtStation ? nearestIdx : legOriginRaw;
      const nextStationRaw = activeStationRaw + train.direction;

      // Explicit Arrived / Departed / Arriving / Departing stations
      const arrivedIdx = isAtStation ? activeStationRaw : train.lastArrivedStationIndex;
      const departedIdx = train.lastDepartedStationIndex;
      const departingIdx = activeStationRaw;
      const arrivingIdx = nextStationRaw;

      const arrivedStation = STATION_NAMES[posMod(arrivedIdx, stationCount)];
      const departedStation = STATION_NAMES[posMod(departedIdx, stationCount)];
      const departingStation = STATION_NAMES[posMod(departingIdx, stationCount)];
      const arrivingStation = STATION_NAMES[posMod(arrivingIdx, stationCount)];

      // Active leg covered & left (in meters and km)
      const rawLegCoveredM = isAtStation
        ? STATION_SPACING
        : train.direction === 1
        ? Math.max(0, train.x - legOriginRaw * STATION_SPACING)
        : Math.max(0, legOriginRaw * STATION_SPACING - train.x);
      const legDistanceCoveredM = Math.min(STATION_SPACING, Math.round(rawLegCoveredM));
      const legDistanceLeftM = isAtStation
        ? 0
        : Math.max(0, Math.round(STATION_SPACING - legDistanceCoveredM));
      const distToNextMeters = Math.round(Math.abs(arrivingIdx * STATION_SPACING - train.x));

      const legDistanceCoveredKm = Math.round((legDistanceCoveredM / 1000) * 100) / 100;
      const legDistanceLeftKm = Math.round((legDistanceLeftM / 1000) * 100) / 100;

      // Full 8-station corridor route progress
      const orderedIndices = train.direction === 1
        ? [0, 1, 2, 3, 4, 5, 6, 7]
        : [7, 6, 5, 4, 3, 2, 1, 0];
      const departingMod = posMod(departingIdx, stationCount);
      const arrivingMod = posMod(arrivingIdx, stationCount);
      const departedOrderPos = orderedIndices.indexOf(departingMod);

      const routeCoveredM = isAtStation
        ? (departedOrderPos + 1) * STATION_SPACING
        : departedOrderPos * STATION_SPACING + legDistanceCoveredM;
      const routeTotalM = stationCount * STATION_SPACING;
      const clampedRouteCoveredM = Math.max(0, Math.min(routeTotalM, routeCoveredM));
      const routeDistanceCoveredKm = Math.round((clampedRouteCoveredM / 1000) * 100) / 100;
      const routeDistanceLeftKm = Math.round(((routeTotalM - clampedRouteCoveredM) / 1000) * 100) / 100;
      const routeProgressPct = Math.round((clampedRouteCoveredM / routeTotalM) * 100);
      const totalDistanceCoveredKm = Math.round((train.totalDistanceCoveredM / 1000) * 10) / 10;

      const routeStations: RouteStationStop[] = orderedIndices.map((sIdx, orderIdx) => {
        let stopStatus: RouteStationStop['status'] = 'upcoming';
        if (isAtStation && sIdx === departingMod) {
          stopStatus = 'arrived';
        } else if (!isAtStation && sIdx === departingMod) {
          stopStatus = 'departed';
        } else if (sIdx === arrivingMod) {
          stopStatus = 'arriving';
        } else if (orderIdx < departedOrderPos) {
          stopStatus = 'passed';
        }
        return {
          index: sIdx,
          name: STATION_NAMES[sIdx],
          shortName: STATION_SHORT_NAMES[sIdx],
          status: stopStatus,
        };
      });

      const status: 'RUNNING' | 'DWELLING' | 'DOORS_OPEN' | 'HELD' = train.holdOrdered
        ? 'HELD'
        : train.stationStatus === 'doors_open'
        ? 'DOORS_OPEN'
        : train.dwellRemaining > 0
        ? 'DWELLING'
        : 'RUNNING';

      const speedVal = Math.round(Math.abs(train.speed) * 3.6);
      const fromStation = STATION_NAMES[orderedIndices[0]];
      const toStation = STATION_NAMES[orderedIndices[orderedIndices.length - 1]];

      // Synchronized arrival & departure clock times (1 real min = 2 game mins)
      const arrivalClockMinutes = isAtStation
        ? train.lastArrivedGameMinutes
        : this.currentGameTimeMinutes + (train.arrivalCountdownSeconds * 2) / 60;
      const departureClockMinutes = isAtStation
        ? this.currentGameTimeMinutes + (train.departureCountdownSeconds * 2) / 60
        : train.lastDepartedGameMinutes;

      const arrivalTime = formatGameClockHM(arrivalClockMinutes);
      const departureTime = formatGameClockHM(departureClockMinutes);

      // Dynamic condition assessment from live telemetry
      let condition = 'OPTIMAL';
      let conditionDetail = 'Traction & brakes nominal';
      if (train.holdOrdered) {
        condition = 'DISPATCH HOLD';
        conditionDetail = 'Held on interlocking red block';
      } else if (train.tractionMotorTempC >= 82 || train.conditionPct < 85) {
        condition = 'THERMAL WATCH';
        conditionDetail = `Motor ${train.tractionMotorTempC}°C elevated`;
      } else if (train.brakePressureBar < 4.5 && !isAtStation) {
        condition = 'BRAKE CHECK';
        conditionDetail = `Pipe ${train.brakePressureBar.toFixed(1)} BAR`;
      } else if (isAtStation) {
        condition = train.doorsOpen ? 'BOARDING' : 'DOORS LOCKING';
        conditionDetail = `Platform dwell ${Math.ceil(train.dwellRemaining)}s`;
      } else if (train.conditionPct < 94) {
        condition = 'GOOD';
        conditionDetail = 'Scheduled inspection nominal';
      }

      const arrivalCountdownText = formatTime(train.arrivalCountdownSeconds);
      const departureCountdownText = formatTime(train.departureCountdownSeconds);

      return {
        slot: idx + 1,
        trainId: train.id,
        trainNumber: train.trainNumber,
        line: train.line,
        serviceId: train.serviceId,
        serviceName: train.serviceName,
        name: train.serviceName,
        serviceType: train.serviceType,
        from: fromStation,
        to: toStation,
        next: arrivingStation,
        stop: isAtStation ? arrivedStation : departingStation,
        directionLabel: train.directionLabel,
        direction: train.direction,
        x: Math.round(train.x),
        z: train.z,
        speed: speedVal,
        speedKmh: speedVal,
        speedMph: Math.round(Math.abs(train.speed) * 2.237),
        currentStation: isAtStation ? arrivedStation : departingStation,
        nextStation: arrivingStation,
        arrivedStation,
        departedStation,
        arrivingStation,
        departingStation,
        isAtStation,
        distToNextMeters,
        distance: routeDistanceCoveredKm,
        remaining: routeDistanceLeftKm,
        distTravelledKm: routeDistanceCoveredKm,
        distRemainingKm: routeDistanceLeftKm,
        legDistanceCoveredM,
        legDistanceLeftM,
        legDistanceCoveredKm,
        legDistanceLeftKm,
        routeDistanceCoveredKm,
        routeDistanceLeftKm,
        routeTotalKm,
        totalDistanceCoveredKm,
        routeProgressPct,
        routeStations,
        arrival: isAtStation ? `ARR ${arrivalTime}` : `${arrivalCountdownText}`,
        departure: isAtStation ? `${departureCountdownText}` : `DEP ${departureTime}`,
        arrivalTime,
        departureTime,
        currentTimeText,
        dayCount: this.currentDayCount,
        scheduledArrival: arrivalTime,
        estimatedArrival: isAtStation ? `AT PLATFORM (${arrivalTime})` : `${arrivalTime} (${arrivalCountdownText})`,
        departureCountdownSeconds: train.departureCountdownSeconds,
        arrivalCountdownSeconds: train.arrivalCountdownSeconds,
        departureCountdownText,
        arrivalCountdownText,
        condition,
        conditionDetail,
        status,
        dwellSeconds: Math.round(train.dwellRemaining),
        delaySeconds: train.holdOrdered ? 120 : 0,
        onTimeStatus: train.holdOrdered ? 'HELD AT STATION' : train.dwellRemaining > 0 ? 'DWELLING' : 'ON TIME',
        stationStatus: train.stationStatus,
        doorsOpen: train.doorsOpen,
        holdOrdered: train.holdOrdered,
        tractionMotorTempC: train.tractionMotorTempC,
        brakePressureBar: train.brakePressureBar,
        pantographVoltageKv: train.pantographVoltageKv,
        conditionPct: train.conditionPct,
        blockId: `BLK-${train.line}-S${posMod(departingIdx, stationCount) + 1}`,
        signalAspect: train.holdOrdered ? 'red' : (distToNextMeters < 140 || isAtStation) ? 'yellow' : 'green',
        warningMessage: train.warningMessage,
        warningAcknowledged: train.warningAcknowledged,
      };
    });
  }

  public getOperationsTelemetry(): RailwayServiceTelemetry[] {
    return this.getDispatchTelemetry();
  }

  /** Live station/passenger/facility status for the apartment basement dispatch room. */
  public getStationOperationsSnapshot() {
    return this.npcManager.getOperationsSnapshot(this.trains);
  }

  /** Find one of the four real station lift call panels near the player. */
  public getNearbyStationLift(playerPosition: THREE.Vector3, maxDistance = 3.8): {
    stationIndex: number; liftIndex: number; x: number; z: number; baseY: number; distance: number;
  } | null {
    const stationIndex = Math.round(playerPosition.x / STATION_SPACING);
    const stationX = stationIndex * STATION_SPACING;
    const group = this.stationGroups.get(`station:${stationIndex}`);
    if (!group) return null;
    const hallZ = Number(group.userData.hallZ ?? 265);
    const locations = [
      { x: stationX - 48, z: hallZ - 14 }, { x: stationX - 48, z: hallZ + 14 },
      { x: stationX + 48, z: hallZ - 14 }, { x: stationX + 48, z: hallZ + 14 },
    ];
    let nearest: { stationIndex: number; liftIndex: number; x: number; z: number; baseY: number; distance: number } | null = null;
    locations.forEach((lift, index) => {
      const distance = Math.hypot(playerPosition.x - (lift.x + 2.0), playerPosition.z - (lift.z + 1.0));
      if (distance <= maxDistance && (!nearest || distance < nearest.distance)) {
        nearest = { stationIndex, liftIndex: index + 1, x: lift.x, z: lift.z, baseY: Number(group.userData.baseY ?? (this.trackSurfaceY(stationX, hallZ) - 0.37)), distance };
      }
    });
    return nearest;
  }

  /** Dispatch a lift cabin to a selected terminal floor and hold its doors open on arrival. */
  public requestStationLiftFloor(stationIndex: number, liftIndex: number, floor: 0 | 1 | 2): boolean {
    const key = `station:${stationIndex}`;
    const instance = this.megaStationInstances.get(key);
    if (instance) {
      return instance.requestLiftFloor(liftIndex, floor);
    }
    return false;
  }

  /** Get current live vertical elevation of a station lift cabin for physical player collision. */
  public getStationLiftCabinY(stationIndex: number, liftIndex: number): number | null {
    const key = `station:${stationIndex}`;
    const instance = this.megaStationInstances.get(key);
    if (instance) {
      return instance.getLiftCabinY(liftIndex);
    }
    return null;
  }

  /** Check if player is standing near an interactive TVM machine or ticket booking counter. */
  public getNearbyTVMOrTicketCounter(playerPosition: THREE.Vector3, maxDistance = 3.8): {
    isNear: boolean;
    type: 'tvm' | 'counter';
    label: string;
  } | null {
    const stationIndex = Math.round(playerPosition.x / STATION_SPACING);
    const stationX = stationIndex * STATION_SPACING;
    const group = this.stationGroups.get(`station:${stationIndex}`);
    if (!group) return null;
    const hallZ = Number(group.userData.hallZ ?? 265);
    const baseY = Number(group.userData.baseY ?? (this.trackSurfaceY(stationX, hallZ) - 0.37));
    if (Math.abs(playerPosition.y - (baseY + 0.27)) > 2.5) return null;

    // 4 Smart TVM kiosks are positioned at stationX + 20 + i*4.8, hallZ + 4
    for (let tvm = 0; tvm < 4; tvm++) {
      const distTVM = Math.hypot(playerPosition.x - (stationX + 20 + tvm * 4.8), playerPosition.z - (hallZ + 4));
      if (distTVM <= maxDistance) {
        return { isNear: true, type: 'tvm', label: `Automatic Ticket Vending Machine (ATVM ${tvm + 1})` };
      }
    }

    // 6 Staffed ticket booking counters are along stationX + 18 + i*5.2, hallZ + 12
    if (playerPosition.x >= stationX + 15 && playerPosition.x <= stationX + 47 && Math.abs(playerPosition.z - (hallZ + 12)) <= maxDistance) {
      return { isNear: true, type: 'counter', label: 'Ticket Booking & Reservation Counter' };
    }

    return null;
  }

  /** Detect nearby interactive station amenities (drinking water, flush, first-aid clinic, food stalls, helipad console, lockers, gates, etc.). */
  public getNearbyStationInteractiveAction(playerPosition: THREE.Vector3, maxDistance = 3.2): StationNearbyFacilityAction | null {
    const stationIndex = Math.round(playerPosition.x / STATION_SPACING);
    const instance = this.megaStationInstances.get(`station:${stationIndex}`);
    if (!instance) return null;
    return instance.getNearbyInteractiveAction(playerPosition, maxDistance);
  }

  public executeStationInteractiveAction(
    playerPosition: THREE.Vector3,
    type: StationNearbyFacilityAction['type']
  ): StationActionResult {
    const stationIndex = Math.round(playerPosition.x / STATION_SPACING);
    const instance = this.megaStationInstances.get(`station:${stationIndex}`);
    if (!instance) return { handled: false };
    return instance.executeInteractiveAction(playerPosition, type);
  }

  public triggerStationWaterTap(playerPosition: THREE.Vector3): boolean {
    const stationIndex = Math.round(playerPosition.x / STATION_SPACING);
    return this.megaStationInstances.get(`station:${stationIndex}`)?.triggerWaterTap(playerPosition) ?? false;
  }

  public triggerStationToiletFlush(playerPosition: THREE.Vector3): boolean {
    const stationIndex = Math.round(playerPosition.x / STATION_SPACING);
    return this.megaStationInstances.get(`station:${stationIndex}`)?.triggerToiletFlush(playerPosition) ?? false;
  }

  public toggleServiceHold(line: RailwayTrackLine): boolean {
    const train = this.trains.find((t) => t.line === line);
    if (!train) return false;
    train.holdOrdered = !train.holdOrdered;
    return train.holdOrdered;
  }

  // --- Save / Load Serialization ---
  public getTrainSaveState(): TrainSaveState | undefined {
    if (!this.activePassengerTrain) return undefined;
    return {
      inTrain: true,
      trainId: this.activePassengerTrain.id,
      line: this.activePassengerTrain.line,
      carriageIndex: this.getCurrentCarriageIndex(),
      localTrainPos: [this.playerLocalPos.x, this.playerLocalPos.y, this.playerLocalPos.z],
      isDriving: false,
      trainSpeed: this.activePassengerTrain.speed,
      cameraMode: this.cameraMode,
    };
  }

  public restoreFromSaveState(state: TrainSaveState): void {
    if (!state.inTrain) return;
    const train = this.trains.find((t) => t.id === state.trainId || t.line === state.line);
    if (!train) return;

    this.activePassengerTrain = train;
    this.activeDrivableTrain = null;
    train.isOccupied = true;
    train.speed = state.trainSpeed || AI_CRUISE_SPEED;
    this.playerLocalPos.set(...state.localTrainPos);
    if (state.cameraMode) this.cameraMode = state.cameraMode;
    if (state.localTrainPos[0] >= 16.0) {
      this.isPilotSeated = true;
      this.seatedSeatId = 'pilot_observer_seat';
    }
  }

  public requestTrainHold(trainId: string): { success: boolean; message: string } {
    const train = this.trains.find((t) => t.id === trainId || t.serviceId === trainId || t.line === trainId || t.trainNumber === trainId);
    if (!train) return { success: false, message: 'Invalid train service ID specified.' };
    if (train.holdOrdered) return { success: false, message: `${train.trainNumber} (${train.serviceId}) is already under dispatcher hold order.` };

    train.holdOrdered = true;
    train.warningMessage = `DISPATCH HOLD ACTIVE: Service held by Central Operations`;
    train.warningAcknowledged = false;
    return {
      success: true,
      message: `HOLD CONFIRMED: ${train.trainNumber} (${train.serviceName}) held at signal block. Signal set to RED.`,
    };
  }

  public releaseTrainHold(trainId: string): { success: boolean; message: string } {
    const train = this.trains.find((t) => t.id === trainId || t.serviceId === trainId || t.line === trainId || t.trainNumber === trainId);
    if (!train) return { success: false, message: 'Invalid train service ID specified.' };
    if (!train.holdOrdered) return { success: false, message: `${train.trainNumber} is not currently held.` };

    train.holdOrdered = false;
    train.warningMessage = null;
    train.warningAcknowledged = true;
    if (train.dwellRemaining > 0) {
      train.dwellRemaining = Math.min(train.dwellRemaining, 8);
    }
    return {
      success: true,
      message: `DISPATCH AUTHORIZED: Signal aspect cleared to GREEN. ${train.trainNumber} cleared for departure.`,
    };
  }

  public acknowledgeWarning(trainId: string): { success: boolean; message: string } {
    const train = this.trains.find((t) => t.id === trainId || t.serviceId === trainId || t.line === trainId || t.trainNumber === trainId);
    if (!train) return { success: false, message: 'Invalid train service ID specified.' };
    train.warningAcknowledged = true;
    return {
      success: true,
      message: `WARNING ACKNOWLEDGED: Operational alarm silenced for ${train.trainNumber}. Telemetry verified.`,
    };
  }

  public getTrainCollisionBoxes(): Array<{ box: THREE.Box3 }> {
    while (this.trainCollisionBoxesCache.length < this.trains.length) {
      this.trainCollisionBoxesCache.push({ box: new THREE.Box3() });
    }
    this.trainCollisionBoxesCache.length = this.trains.length;
    for (let i = 0; i < this.trains.length; i++) {
      const train = this.trains[i];
      const fwd = train.direction;
      const x1 = train.x + fwd * 20.5;
      const x2 = train.x - fwd * 155.5;
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const y = train.group.position.y;
      const box = this.trainCollisionBoxesCache[i].box;
      box.min.set(minX, y, train.z - 2.1);
      box.max.set(maxX, y + 6.2, train.z + 2.1);
    }
    return this.trainCollisionBoxesCache;
  }

  public getStationCollisionBoxes(): Array<{ box: THREE.Box3 }> {
    const raw = stationPlacementValidator.getSolidCollisionBoxes();
    while (this.stationCollisionBoxesCache.length < raw.length) {
      this.stationCollisionBoxesCache.push({ box: raw[this.stationCollisionBoxesCache.length] });
    }
    this.stationCollisionBoxesCache.length = raw.length;
    for (let i = 0; i < raw.length; i++) {
      this.stationCollisionBoxesCache[i].box = raw[i];
    }
    return this.stationCollisionBoxesCache;
  }

  private disposeStationGroup(group: THREE.Group): void {
    const key = group.userData?.stationId as string | undefined;
    if (key && this.megaStationInstances.has(key)) {
      this.megaStationInstances.get(key)?.dispose();
      this.megaStationInstances.delete(key);
    }
    const sharedMaterials = new Set<THREE.Material>([
      this.railMaterial, this.sleeperMaterial, this.platformMaterial, this.ballastMaterial,
      this.trainBodyBlue, this.trainBodyRed, this.windowMaterial, this.wheelMaterial,
      this.doorMaterial, this.gangwayBellowsMat, this.floorMat, this.seatFabricMat,
      this.seatDiningMat, this.seatLoungeMat, this.chromeMat, this.woodMat,
      this.tailLightMat, this.headlightMat,
    ]);
    const disposedMaterials = new Set<THREE.Material>();
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.geometry && !obj.geometry.userData?.__sharedResource) {
        obj.geometry.dispose();
      }
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        if (!material || sharedMaterials.has(material) || material.userData?.__sharedResource || disposedMaterials.has(material)) continue;
        disposedMaterials.add(material);
        material.dispose();
      }
    });
  }

  /** Look up spatial coordinates for a station facility for waypoint guidance. */
  public getFacilityCoordinates(stationIndex: number, facilityType: string): THREE.Vector3 | null {
    const key = `station:${stationIndex}`;
    const instance = this.megaStationInstances.get(key);
    if (instance) {
      return instance.getFacilityCoordinates(facilityType);
    }
    const stationX = stationIndex * STATION_SPACING;
    const hallZ = 265;
    const baseY = this.trackSurfaceY(stationX, hallZ) - 0.37;
    return new THREE.Vector3(stationX, baseY + 0.27, hallZ);
  }

  /** Retrieve live train banner information for station HUD pill. */
  public getLiveStationTrainBanner(stationIndex: number): {
    trainNumber: string;
    trainName: string;
    route: string;
    status: string;
    platform: number;
    countdownSeconds?: number;
  } | null {
    const stationX = stationIndex * STATION_SPACING;
    let bestTrain = this.trains.find((t) => t.currentStationIndex === stationIndex && t.doorsOpen);
    if (!bestTrain) {
      let minDist = 999999;
      for (const t of this.trains) {
        const d = Math.abs(t.x - stationX);
        if (d < minDist) {
          minDist = d;
          bestTrain = t;
        }
      }
    }
    if (!bestTrain) return null;
    const isAtStation = Math.abs(bestTrain.x - stationX) < 15.0;
    const platNum = parseInt(bestTrain.trainNumber.replace(/\D/g, '') || '1', 10);
    const originStation = bestTrain.direction === 1 ? STATION_NAMES[0] : STATION_NAMES[STATION_NAMES.length - 1];
    const destStation = bestTrain.direction === 1 ? STATION_NAMES[STATION_NAMES.length - 1] : STATION_NAMES[0];
    const status = isAtStation
      ? (bestTrain.doorsOpen ? `At Platform ${platNum} (Doors Open)` : `Departing Platform ${platNum}`)
      : `Approaching (Platform ${platNum})`;
    return {
      trainNumber: bestTrain.trainNumber,
      trainName: bestTrain.serviceName,
      route: `${originStation} ➔ ${destStation}`,
      status,
      platform: platNum,
      countdownSeconds: isAtStation ? bestTrain.departureCountdownSeconds : bestTrain.arrivalCountdownSeconds,
    };
  }

  public dispose(): void {
    for (const train of this.trains) {
      this.scene.remove(train.group);
    }
    for (const group of this.railChunks.values()) {
      this.scene.remove(group);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && !obj.geometry.userData?.__sharedResource) obj.geometry.dispose();
      });
    }
    for (const group of this.stationGroups.values()) {
      this.scene.remove(group);
      this.disposeStationGroup(group);
    }
    this.sharedBallastGeo.dispose();
    this.sharedRailGeo.dispose();
    this.sharedSleeperGeo.dispose();
    this.railChunks.clear();
    this.stationGroups.clear();
    this.trains = [];
    this.activePassengerTrain = null;
    this.activeDrivableTrain = null;
    this.npcManager.dispose();
  }
}
