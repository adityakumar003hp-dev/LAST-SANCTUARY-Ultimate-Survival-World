import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { soundEngine } from '../../utils/audio';

/**
 * Six-Track Railway and Train Simulation System.
 * 
 * Tracks:
 * - F1: Forward (+X), AI controlled & Explorable
 * - F2: Forward (+X), AI Express, 120s station dwell, animated doors
 * - F3: Forward (+X), AI Commuter, 120s station dwell, animated doors
 * - B3: Backward (-X), AI Metro, 120s station dwell, animated doors
 * - B2: Backward (-X), AI Intercity, 120s station dwell, animated doors
 * - B1: Backward (-X), AI controlled & Explorable
 */
export type RailwayTrackLine = 'F1' | 'F2' | 'F3' | 'B1' | 'B2' | 'B3';

export interface RailwayServiceTelemetry {
  slot: number; // 1 to 6
  trainId: string;
  line: RailwayTrackLine;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  directionLabel: string;
  direction: 1 | -1;
  x: number;
  z: number;
  speedKmh: number;
  speedMph: number;
  currentStation: string;
  nextStation: string;
  distToNextMeters: number;
  distTravelledKm: number;
  distRemainingKm: number;
  scheduledArrival: string;
  estimatedArrival: string;
  delaySeconds: number;
  onTimeStatus: 'ON TIME' | 'MINOR DELAY' | 'HELD AT STATION' | 'HOLD PENDING' | 'DWELLING';
  stationStatus: 'running' | 'doors_open' | 'doors_closing';
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

export interface AITrain {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  line: RailwayTrackLine;
  direction: 1 | -1;
  group: THREE.Group;
  x: number;
  z: number;
  speed: number;
  dwellRemaining: number;
  currentStationIndex: number | null;
  doors: THREE.Mesh[];
  stationStatus: 'running' | 'doors_open' | 'doors_closing';
  isOccupied: boolean;
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

export interface DrivableTrain {
  id: string;
  line: 'F1' | 'B1';
  direction: 1 | -1;
  group: THREE.Group;
  x: number;
  z: number;
  speed: number;
  targetSpeed: number;
  throttle: number; // -1.0 (full brake/reverse) to +1.0 (full throttle)
  doors: THREE.Mesh[];
  doorsOpen: boolean;
  headlightsOn: boolean;
  spotlightL: THREE.SpotLight;
  spotlightR: THREE.SpotLight;
  cabinLight: THREE.PointLight;
  cabCameraActive: boolean;
  isOccupied: boolean;
}

const CHUNK_LENGTH = 128;
const TRACK_SEGMENT_LENGTH = 16;
const STATION_SPACING = 1200;
const DWELL_SECONDS = 120;
const AI_TRAIN_SPEED = 14;
const MAX_PLAYER_TRAIN_SPEED = 28; // ~100 km/h

const ALL_TRACKS: Array<{ id: RailwayTrackLine; z: number; direction: 1 | -1; isPlayerDrivable: boolean; startX: number }> = [
  { id: 'F1', z: 150, direction: 1, isPlayerDrivable: false, startX: 12 },
  { id: 'F2', z: 162, direction: 1, isPlayerDrivable: false, startX: -260 },
  { id: 'F3', z: 174, direction: 1, isPlayerDrivable: false, startX: -760 },
  { id: 'B3', z: 186, direction: -1, isPlayerDrivable: false, startX: 260 },
  { id: 'B2', z: 198, direction: -1, isPlayerDrivable: false, startX: 760 },
  { id: 'B1', z: 210, direction: -1, isPlayerDrivable: false, startX: -12 },
];

export class AITrainManager {
  private scene: THREE.Scene;
  private worldSeed: number;

  public trains: AITrain[] = [];
  public drivableTrains: DrivableTrain[] = [];
  public activeDrivableTrain: DrivableTrain | null = null;
  public activePassengerTrain: AITrain | null = null;
  public passengerSeatLocalPosition: THREE.Vector3 | null = null;

  private railChunks = new Map<string, THREE.Group>();
  private stationGroups = new Map<string, THREE.Group>();

  // Shared Procedural Railway Materials
  private readonly railMaterial = new THREE.MeshStandardMaterial({ color: 0x717b84, metalness: 0.85, roughness: 0.28 });
  private readonly sleeperMaterial = new THREE.MeshStandardMaterial({ color: 0x3d352b, roughness: 0.94 });
  private readonly platformMaterial = new THREE.MeshStandardMaterial({ color: 0x82868a, roughness: 0.88 });
  private readonly ballastMaterial = new THREE.MeshStandardMaterial({ color: 0x4f4d49, roughness: 1.0 });
  private readonly aiTrainBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x244259, metalness: 0.65, roughness: 0.32 });
  private readonly playerTrainBodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b251e, metalness: 0.72, roughness: 0.28 }); // Distinct red/gold locomotive
  private readonly windowMaterial = new THREE.MeshPhysicalMaterial({ color: 0x9be0f0, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.75, depthWrite: false });
  private readonly wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x16181b, metalness: 0.8, roughness: 0.45 });
  private readonly doorMaterial = new THREE.MeshStandardMaterial({ color: 0xabb8bf, metalness: 0.6, roughness: 0.35 });

  // Wheel clatter audio timer
  private wheelAudioTimer = 0;

  constructor(scene: THREE.Scene, worldSeed = 42) {
    this.scene = scene;
    this.worldSeed = worldSeed;

    // All six railway lines are now operated by AI; players can board and explore them.
    const serviceMeta: Record<RailwayTrackLine, { serviceId: string; name: string; type: string }> = {
      F1: { serviceId: 'LS-101', name: 'Sanctuary Express', type: 'Express Intercity' },
      F2: { serviceId: 'LS-102', name: 'Pine Valley Commuter', type: 'Rapid Transit' },
      F3: { serviceId: 'LS-103', name: 'Highland Regional', type: 'Regional Passenger' },
      B3: { serviceId: 'LS-201', name: 'Sanctuary Metro Loop', type: 'Suburban Metro' },
      B2: { serviceId: 'LS-202', name: 'Redwood Valley Crossway', type: 'Intercity Rail' },
      B1: { serviceId: 'LS-203', name: 'Sunset Coastline Flyer', type: 'Express Flyer' },
    };

    const aiConfigs = ALL_TRACKS;
    for (const line of aiConfigs) {
      const group = this.createTrainMesh(line.id, false);
      this.scene.add(group);
      const meta = serviceMeta[line.id];
      this.trains.push({
        id: `ai_train_${line.id.toLowerCase()}`,
        serviceId: meta.serviceId,
        serviceName: meta.name,
        serviceType: meta.type,
        line: line.id,
        direction: line.direction,
        group,
        x: line.startX,
        z: line.z,
        speed: AI_TRAIN_SPEED,
        dwellRemaining: 0,
        currentStationIndex: null,
        doors: group.userData.doors as THREE.Mesh[],
        stationStatus: 'running',
        isOccupied: false,
        lastAnnouncedStationIndex: null,
        holdOrdered: false,
        warningMessage: null,
        warningAcknowledged: false,
        telemetryTimer: 0,
        tractionMotorTempC: 62 + Math.floor(Math.random() * 8),
        brakePressureBar: 5.0,
        pantographVoltageKv: 25.0,
        conditionPct: 98,
      });
    }

    // Legacy drivable-train list intentionally remains empty: all six lines are AI-operated.
    /* 2. Legacy player-drivable locomotives disabled.

    const drivableConfigs = ALL_TRACKS.filter(t => t.isPlayerDrivable);
    for (const line of drivableConfigs) {
      const group = this.createTrainMesh(line.id, true);
      this.scene.add(group);

      const spotL = group.userData.spotlightL as THREE.SpotLight;
      const spotR = group.userData.spotlightR as THREE.SpotLight;
      const cabLight = group.userData.cabinLight as THREE.PointLight;
      // Both parked player locomotives start with their side doors visibly open for boarding.
      for (const door of (group.userData.doors as THREE.Mesh[])) {
        door.position.z = Number(door.userData.side) * 2.58;
      }

      this.drivableTrains.push({
        id: `player_train_${line.id.toLowerCase()}`,
        line: line.id as 'F1' | 'B1',
        direction: line.direction,
        group,
        x: line.startX,
        z: line.z,
        speed: 0,
        targetSpeed: 0,
        throttle: 0,
        doors: group.userData.doors as THREE.Mesh[],
        doorsOpen: true, // parked player locomotives are boardable at spawn
        headlightsOn: true,
        spotlightL: spotL,
        spotlightR: spotR,
        cabinLight: cabLight,
        cabCameraActive: false,
        isOccupied: false,
      });
    }
    */
  }

  /** Height of the rail-running surface, sampled on the same 16m world grid as the rails. */
  private trackSurfaceY(x: number, z: number): number {
    const segmentCenter = Math.floor(x / TRACK_SEGMENT_LENGTH) * TRACK_SEGMENT_LENGTH + TRACK_SEGMENT_LENGTH * 0.5;
    // Rail top is 0.43m above the sampled terrain; wheel bottoms sit 0.06m below the train origin.
    return getTerrainHeight(segmentCenter, z, this.worldSeed) + 0.37;
  }

  private terrainY(x: number, z: number): number {
    return this.trackSurfaceY(x, z);
  }

  // --- Physical 3D Train Mesh Construction ---
  private createTrainMesh(line: RailwayTrackLine, isPlayerDrivable: boolean): THREE.Group {
    const root = new THREE.Group();
    root.name = isPlayerDrivable ? `DRIVABLE_TRAIN_${line}` : `PHYSICAL_AI_TRAIN_${line}`;
    root.userData = {
      lineId: line,
      physicalMesh: true,
      playerDrivable: isPlayerDrivable,
      collisionProxy: new THREE.Box3(),
    };

    const bodyMat = isPlayerDrivable ? this.playerTrainBodyMaterial : this.aiTrainBodyMaterial;

    // 1. Locomotive underframe and open passenger shell.
    // Do NOT use a single solid body box here: it visually seals the interior.
    // The floor, side-wall bands, end bulkheads and roof form a walkable enclosed carriage.
    const underframe = new THREE.Mesh(new THREE.BoxGeometry(25.6, 0.72, 3.55), bodyMat);
    underframe.position.set(0, 0.78, 0);
    underframe.castShadow = true;
    underframe.receiveShadow = true;
    root.add(underframe);

    const interiorWallMat = new THREE.MeshStandardMaterial({
      color: isPlayerDrivable ? 0x632d26 : 0x203b4b,
      metalness: 0.38,
      roughness: 0.72,
    });
    // Solid lower and upper side-wall bands leave the glazed window strip visible.
    for (const side of [-1, 1]) {
      // Split the lower wall into sections around the two sliding-door apertures.
      for (const [segmentStart, segmentEnd] of [[-12.5, -6.8], [-5.2, 4.7], [6.3, 12.5]]) {
        const lowerWall = new THREE.Mesh(
          new THREE.BoxGeometry(segmentEnd - segmentStart, 0.72, 0.16),
          interiorWallMat
        );
        lowerWall.position.set((segmentStart + segmentEnd) * 0.5, 2.05, side * 1.82);
        lowerWall.castShadow = true;
        root.add(lowerWall);
      }
      const upperWall = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.48, 0.16), interiorWallMat);
      upperWall.position.set(-0.1, 4.78, side * 1.82);
      upperWall.castShadow = true;
      root.add(upperWall);
      // Structural mullions make the side walls continuous around the window openings.
      for (let wx = -11.8; wx <= 11.8; wx += 3.1) {
        if (Math.abs(wx + 6.0) < 1.0 || Math.abs(wx - 5.5) < 1.0) continue;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.15, 0.2), interiorWallMat);
        post.position.set(wx, 3.55, side * 1.82);
        root.add(post);
      }
    }
    // End bulkheads are split around the central gangway so passengers can walk between cars.
    for (const endX of [-12.45, 12.45]) for (const sideZ of [-1.25, 1.25]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 1.05), interiorWallMat);
      panel.position.set(endX, 3.0, sideZ); root.add(panel);
    }

    // Visible passenger interior: floor, aisle, seats and grab rails. The roof remains
    // solid for exterior realism; boarding uses a dedicated interior camera position.
    const interiorFloor = new THREE.Mesh(new THREE.BoxGeometry(23.5, 0.12, 3.15), new THREE.MeshStandardMaterial({ color: 0x343b42, roughness: 0.82 }));
    interiorFloor.position.set(-0.2, 1.45, 0);
    root.add(interiorFloor);
    const seatMat = new THREE.MeshStandardMaterial({ color: isPlayerDrivable ? 0x7b3428 : 0x31566a, roughness: 0.9 });
    for (const sx of [-8, -3, 3, 8]) {
      for (const side of [-1, 1]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.82), seatMat);
        seat.position.set(sx, 2.05, side * 1.0);
        seat.userData.isPassengerSeat = true;
        root.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.95, 0.16), seatMat);
        back.position.set(sx - 0.55, 2.5, side * 1.0);
        root.add(back);
      }
    }
    const aisleMat = new THREE.MeshStandardMaterial({ color: 0x9aa3aa, metalness: 0.65, roughness: 0.35 });
    for (const ax of [-9, -3, 3, 9]) {
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 8), aisleMat);
      rail.position.set(ax, 3.25, 0);
      root.add(rail);
    }

    // 2. Streamlined Aerodynamic Cab Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(25.2, 0.45, 3.65),
      new THREE.MeshStandardMaterial({ color: 0x141a21, metalness: 0.6, roughness: 0.4 })
    );
    roof.position.set(0, 5.4, 0);
    roof.castShadow = true;
    root.add(roof);

    // 3. Driver's Cabin Front Nose & Heavy Cowcatcher / Pilot Grill
    const noseGeo = new THREE.BoxGeometry(2.4, 3.2, 3.6);
    const nose = new THREE.Mesh(noseGeo, bodyMat);
    nose.position.set(13.2, 2.65, 0);
    nose.castShadow = true;
    root.add(nose);

    // V-shaped heavy steel cowcatcher grill
    const cowcatcherMat = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.85, roughness: 0.3 });
    const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.8, 4), cowcatcherMat);
    cowcatcher.rotation.z = -Math.PI / 2;
    cowcatcher.rotation.y = Math.PI / 4;
    cowcatcher.position.set(14.8, 1.1, 0);
    cowcatcher.castShadow = true;
    root.add(cowcatcher);

    // 4. Driver's Windshield & Side Windows
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.45, 3.2), this.windowMaterial);
    windshield.position.set(14.35, 3.75, 0);
    root.add(windshield);

    // Passenger / Cabin Side Windows
    for (let i = 0; i < 7; i++) {
      const x = -9.8 + i * 3.1;
      for (const side of [-1, 1]) {
        const window = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.25, 0.08), this.windowMaterial);
        window.position.set(x, 3.85, side * 1.92);
        root.add(window);
      }
    }

    // 5. Sliding Passenger & Crew Doors
    const doors: THREE.Mesh[] = [];
    for (const x of [-6.0, 5.5]) {
      for (const side of [-1, 1]) {
        const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.45, 0.12), this.doorMaterial);
        door.position.set(x, 2.65, side * 1.93);
        door.userData.closedX = x;
        door.userData.side = side;
        door.castShadow = true;
        root.add(door);
        doors.push(door);
      }
    }
    root.userData.doors = doors;

    // 6. Realistic Bogies, Axles, Suspension & Dual Flanged Steel Wheels
    for (const bx of [-8.5, 8.5]) {
      const bogieFrame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.65, 2.8), this.wheelMaterial);
      bogieFrame.position.set(bx, 1.05, 0);
      root.add(bogieFrame);

      for (const wx of [-1.45, 1.45]) {
        for (const side of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.32, 18), this.wheelMaterial);
          wheel.rotation.x = Math.PI / 2;
          wheel.userData.isTrainWheel = true;
          wheel.position.set(bx + wx, 0.68, side * 1.42);
          wheel.castShadow = true;
          root.add(wheel);

          // Wheel hubcap bolt detail
          const hubcap = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.36, 10), this.railMaterial);
          hubcap.rotation.x = Math.PI / 2;
          hubcap.position.set(bx + wx, 0.68, side * 1.43);
          root.add(hubcap);
        }
      }
    }

    // 7. Dual Heavy Halogen Forward Headlights + Spotlights
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffdf88,
      emissiveIntensity: 2.5,
    });

    const lampL = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), lampMat);
    lampL.position.set(14.3, 2.4, -0.95);
    const lampR = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), lampMat);
    lampR.position.set(14.3, 2.4, 0.95);
    root.add(lampL, lampR);

    // Forward long-range projection spotlights
    const spotL = new THREE.SpotLight(0xffeedd, 6.0, 120, Math.PI / 6, 0.45, 1.2);
    spotL.position.set(14.5, 2.4, -0.95);
    spotL.target.position.set(60, 1.5, -0.95);
    root.add(spotL);
    root.add(spotL.target);

    const spotR = new THREE.SpotLight(0xffeedd, 6.0, 120, Math.PI / 6, 0.45, 1.2);
    spotR.position.set(14.5, 2.4, 0.95);
    spotR.target.position.set(60, 1.5, 0.95);
    root.add(spotR);
    root.add(spotR.target);

    root.userData.spotlightL = spotL;
    root.userData.spotlightR = spotR;

    // 8. Driver's Cabin Interior & Ambient Glow
    const cabinLight = new THREE.PointLight(0xffc266, 1.8, 10);
    cabinLight.position.set(12.0, 4.2, 0);
    root.add(cabinLight);
    root.userData.cabinLight = cabinLight;

    // Driver control console inside cab
    const consoleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 0.9, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x1f2429, roughness: 0.8 })
    );
    consoleMesh.position.set(13.2, 3.1, 0);
    root.add(consoleMesh);

    // Illuminated dashboard dials
    const dialMat = new THREE.MeshBasicMaterial({ color: 0x38ef7d });
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.18), dialMat);
    dial.position.set(13.1, 3.65, 0);
    dial.rotation.y = -Math.PI / 2;
    root.add(dial);

    // 9. Line Identifier Plaque
    const linePlate = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.65, 0.08),
      new THREE.MeshStandardMaterial({
        color: isPlayerDrivable ? 0xf59e0b : 0xe5e7eb,
        emissive: isPlayerDrivable ? 0x92400e : 0x17202a,
        emissiveIntensity: 0.8,
      })
    );
    linePlate.position.set(0, 4.95, 1.93);
    root.add(linePlate);

    // 10. Two additional fully modelled passenger carriages (3 vehicles total:
    // one powered lead car plus two coaches). Every coach has a solid floor,
    // side walls, end walls, roof, windows, seats and bogies.
    const coachFloorMat = new THREE.MeshStandardMaterial({ color: 0x303941, roughness: 0.84 });
    const coachWallMat = new THREE.MeshStandardMaterial({ color: isPlayerDrivable ? 0x632d26 : 0x203b4b, metalness: 0.32, roughness: 0.72 });
    const coachRoofMat = new THREE.MeshStandardMaterial({ color: 0x141a21, metalness: 0.58, roughness: 0.42 });
    const coachSeatMat = new THREE.MeshStandardMaterial({ color: isPlayerDrivable ? 0x7b3428 : 0x31566a, roughness: 0.9 });
    for (let coachIndex = 1; coachIndex <= 2; coachIndex++) {
      const coach = new THREE.Group();
      coach.name = `PASSENGER_COACH_${coachIndex}`;
      coach.userData.physicalMesh = true;
      coach.userData.carriageIndex = coachIndex + 1;
      coach.position.x = -27.0 - (coachIndex - 1) * 27.0;
      const coachLength = 25.2;
      const floor = new THREE.Mesh(new THREE.BoxGeometry(coachLength, 0.18, 3.55), coachFloorMat);
      floor.position.y = 1.48; floor.receiveShadow = true; coach.add(floor);
      const under = new THREE.Mesh(new THREE.BoxGeometry(coachLength, 0.62, 3.6), bodyMat);
      under.position.y = 0.92; coach.add(under);
      for (const side of [-1, 1]) {
        for (const [a, b] of [[-12.5, -7.0], [-5.0, 4.8], [6.5, 12.5]]) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(b - a, 1.0, 0.16), coachWallMat);
          wall.position.set((a + b) / 2, 2.05, side * 1.82); coach.add(wall);
        }
        const upper = new THREE.Mesh(new THREE.BoxGeometry(coachLength, 0.48, 0.16), coachWallMat);
        upper.position.set(0, 4.78, side * 1.82); coach.add(upper);
        for (let wx = -10.5; wx <= 10.5; wx += 3.5) {
          const window = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 0.07), this.windowMaterial);
          window.position.set(wx, 3.65, side * 1.91); coach.add(window);
        }
        for (const dx of [-6.0, 5.5]) {
          const door = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.45, 0.12), this.doorMaterial);
          door.position.set(dx, 2.65, side * 1.93);
          door.userData.side = side; door.userData.closedX = dx;
          coach.add(door); doors.push(door);
        }
      }
      for (const endX of [-12.5, 12.5]) for (const sideZ of [-1.25, 1.25]) {
        const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.0, 1.05), coachWallMat);
        endWall.position.set(endX, 3.0, sideZ); coach.add(endWall);
      }
      const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(coachLength, 0.45, 3.65), coachRoofMat);
      roofMesh.position.y = 5.4; coach.add(roofMesh);
      for (const sx of [-8, -3, 3, 8]) for (const side of [-1, 1]) {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.9, 0.82), coachSeatMat);
        seat.position.set(sx, 2.05, side * 1.0); seat.userData.isPassengerSeat = true; coach.add(seat);
      }
      for (const bx of [-8.5, 8.5]) {
        const bogie = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.65, 2.8), this.wheelMaterial);
        bogie.position.set(bx, 1.05, 0); coach.add(bogie);
        for (const wx of [-1.45, 1.45]) for (const side of [-1, 1]) {
          const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.32, 18), this.wheelMaterial);
          wheel.rotation.x = Math.PI / 2; wheel.userData.isTrainWheel = true; wheel.position.set(bx + wx, 0.68, side * 1.42); coach.add(wheel);
        }
      }
      root.add(coach);
    }
    // Short flexible gangway bridges keep the walking surface continuous between all cars.
    const gangwayMat = new THREE.MeshStandardMaterial({ color: 0x252b31, metalness: 0.25, roughness: 0.9 });
    for (const gx of [-13.5, -40.5]) {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 2.35), gangwayMat);
      bridge.position.set(gx, 1.48, 0); bridge.receiveShadow = true; root.add(bridge);
    }
    root.userData.carriageCount = 3;
    root.userData.boundingSize = new THREE.Vector3(81.0, 6.2, 4.8);
    return root;
  }

  // --- Continuous Ballast & Rail Segment Generator ---
  private buildRailChunk(lineId: RailwayTrackLine, z: number, chunkX: number): void {
    const key = `${lineId}:${chunkX}`;
    if (this.railChunks.has(key)) return;

    const group = new THREE.Group();
    group.name = `PHYSICAL_RAIL_${key}`;
    const start = chunkX * CHUNK_LENGTH;

    // Ballast and rails are built in short world-aligned grade segments. The train
    // samples this exact grid, preventing it from floating above or cutting through rails.
    for (let x = 0; x < CHUNK_LENGTH; x += TRACK_SEGMENT_LENGTH) {
      const segmentX = start + x + TRACK_SEGMENT_LENGTH * 0.5;
      const ground = getTerrainHeight(segmentX, z, this.worldSeed);
      const ballast = new THREE.Mesh(
        new THREE.BoxGeometry(TRACK_SEGMENT_LENGTH + 0.04, 0.38, 5.6),
        this.ballastMaterial
      );
      ballast.position.set(segmentX, ground + 0.02, z);
      ballast.receiveShadow = true;
      group.add(ballast);

      for (const side of [-1, 1]) {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(TRACK_SEGMENT_LENGTH + 0.04, 0.26, 0.24),
          this.railMaterial
        );
        rail.position.set(segmentX, ground + 0.30, z + side * 0.88);
        rail.castShadow = true;
        rail.receiveShadow = true;
        group.add(rail);
      }
    }

    // Heavy treated timber/concrete sleepers, following the same sampled rail grade.
    const sleeperSpacing = 2.4;
    for (let x = 0; x < CHUNK_LENGTH; x += sleeperSpacing) {
      const sleeperX = start + x + sleeperSpacing * 0.5;
      const ground = getTerrainHeight(sleeperX, z, this.worldSeed);
      const sleeper = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 0.2, 3.6),
        this.sleeperMaterial
      );
      sleeper.position.set(sleeperX, ground + 0.12, z);
      sleeper.castShadow = true;
      sleeper.receiveShadow = true;
      group.add(sleeper);
    }

    // Overhead catenary electrification masts (every 32m)
    for (let x = 0; x < CHUNK_LENGTH; x += 32) {
      const mastX = start + x;
      const mastY = getTerrainHeight(mastX, z, this.worldSeed);
      const mastMat = new THREE.MeshStandardMaterial({ color: 0x3d434a, metalness: 0.7, roughness: 0.4 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8), mastMat);
      pole.position.set(mastX, mastY + 3.75, z + 3.4);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 3.8), mastMat);
      arm.position.set(mastX, mastY + 7.2, z + 1.6);
      group.add(pole, arm);
    }

    group.userData = { lineId, chunkX, physicalTrack: true };
    this.scene.add(group);
    this.railChunks.set(key, group);
  }

  // --- Railway Station Generator (1200m interval) ---
  private buildStation(lineId: RailwayTrackLine, z: number, stationIndex: number): void {
    const key = `${lineId}:station:${stationIndex}`;
    if (this.stationGroups.has(key)) return;

    const x = stationIndex * STATION_SPACING;
    const y = getTerrainHeight(x, z, this.worldSeed);
    const group = new THREE.Group();
    group.name = `PHYSICAL_STATION_${key}`;
    group.userData = { stationId: key, lineId, stationIndex, dwellSeconds: DWELL_SECONDS };

    const stationNames = [
      'Sanctuary Central Terminal',
      'Pine Valley Junction',
      'Highland Ridge Station',
      'Riverbend Depot',
      'Redwood Foothills Station',
      'Canyon Pass Freight Depot',
      'Sunset Coastway Station',
      'Northern Apex Research Stop',
    ];
    const stationName = stationNames[Math.abs(stationIndex) % stationNames.length];

    // 1. Raised Concrete Passenger Platform with Yellow Tactile Warning Edge
    const platform = new THREE.Mesh(new THREE.BoxGeometry(84, 0.75, 7.8), this.platformMaterial);
    // Platform top is level with the sampled ground plane so the existing player
    // ground solver can walk across it without floating or sinking.
    platform.position.set(x, y - 0.375, z + 7.0);
    platform.receiveShadow = true;
    platform.castShadow = true;
    group.add(platform);

    const safetyEdgeMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const safetyStripe = new THREE.Mesh(new THREE.BoxGeometry(84, 0.05, 0.35), safetyEdgeMat);
    safetyStripe.position.set(x, y + 0.54, z + 3.25);
    group.add(safetyStripe);

    // 2. Weatherproof Steel Truss Canopy
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x27343f, metalness: 0.5, roughness: 0.5 });
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(48, 0.4, 7.2), canopyMat);
    canopy.position.set(x, y + 4.8, z + 7.0);
    group.add(canopy);

    for (const dx of [-20, -10, 0, 10, 20]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4.6, 0.3), this.railMaterial);
      pillar.position.set(x + dx, y + 2.4, z + 7.0);
      group.add(pillar);

      // Warm platform hanging lights
      const light = new THREE.PointLight(0xffe299, 1.8, 14, 1.5);
      light.position.set(x + dx, y + 4.3, z + 7.0);
      group.add(light);
    }


    // Solid station concourse behind the platform: walkable floor, roof and physical walls.
    const hallCenterZ = z + 18.0;
    const hallWidth = 30;
    const hallDepth = 12;
    const hallWallMat = new THREE.MeshStandardMaterial({ color: 0x35434c, metalness: 0.25, roughness: 0.78 });
    const hallFloor = new THREE.Mesh(new THREE.BoxGeometry(hallWidth, 0.24, hallDepth), this.platformMaterial);
    hallFloor.position.set(x, y - 0.12, hallCenterZ);
    hallFloor.receiveShadow = true;
    group.add(hallFloor);
    const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(hallWidth + 1.2, 0.35, hallDepth + 1.2), canopyMat);
    hallRoof.position.set(x, y + 4.35, hallCenterZ);
    hallRoof.castShadow = true;
    group.add(hallRoof);
    const hallWalls: Array<{ cx: number; cy: number; cz: number; sx: number; sy: number; sz: number }> = [];
    const addHallWall = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), hallWallMat);
      wall.position.set(cx, cy, cz);
      wall.castShadow = true;
      wall.receiveShadow = true;
      group.add(wall);
      hallWalls.push({ cx, cy, cz, sx, sy, sz });
    };
    addHallWall(x - hallWidth / 2, y + 2.1, hallCenterZ, 0.35, 4.2, hallDepth);
    addHallWall(x + hallWidth / 2, y + 2.1, hallCenterZ, 0.35, 4.2, hallDepth);
    addHallWall(x, y + 2.1, hallCenterZ + hallDepth / 2, hallWidth, 4.2, 0.35);
    // Front wall is split into two wings, leaving a broad central entrance.
    addHallWall(x - 11.0, y + 2.1, hallCenterZ - hallDepth / 2, 8.0, 4.2, 0.35);
    addHallWall(x + 11.0, y + 2.1, hallCenterZ - hallDepth / 2, 8.0, 4.2, 0.35);
    const hallDoorHeader = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 0.35), hallWallMat);
    hallDoorHeader.position.set(x, y + 3.9, hallCenterZ - hallDepth / 2);
    group.add(hallDoorHeader);
    hallWalls.push({ cx: x, cy: y + 3.9, cz: hallCenterZ - hallDepth / 2, sx: 14, sy: 0.6, sz: 0.35 });

    // Store exact static wall bounds for player collision in every streamed station.
    group.userData.stationColliders = hallWalls.map(w => new THREE.Box3(
      new THREE.Vector3(w.cx - w.sx / 2, w.cy - w.sy / 2, w.cz - w.sz / 2),
      new THREE.Vector3(w.cx + w.sx / 2, w.cy + w.sy / 2, w.cz + w.sz / 2)
    ));

    // 3. Passenger Waiting Benches
    const woodBenchMat = new THREE.MeshStandardMaterial({ color: 0x6e4726, roughness: 0.8 });
    for (const dx of [-14, 14]) {
      const bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 0.75), woodBenchMat);
      bench.position.set(x + dx, y + 0.8, z + 7.5);
      group.add(bench);
    }

    // 4. Large Station Signboard & Clock
    const signMat = new THREE.MeshStandardMaterial({ color: 0x0f2938, emissive: 0x071923 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 1.35, 0.25), signMat);
    sign.position.set(x, y + 3.4, z + 3.0);
    group.add(sign);

    // 5. Dual Aspect Railway Signals (Green when clear, Red when train is in station)
    const signalMast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 6.2, 8), this.railMaterial);
    signalMast.position.set(x + 36, y + 3.1, z - 2.8);
    const signalHead = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    signalHead.position.set(x + 36, y + 5.2, z - 2.8);

    const greenSignal = new THREE.PointLight(0x22c55e, 2.5, 18);
    greenSignal.position.set(x + 36, y + 5.4, z - 2.5);
    group.add(signalMast, signalHead, greenSignal);

    const stationColliders = group.userData.stationColliders as THREE.Box3[];
    const addStaticCollider = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => {
      stationColliders.push(new THREE.Box3(
        new THREE.Vector3(cx - sx / 2, cy - sy / 2, cz - sz / 2),
        new THREE.Vector3(cx + sx / 2, cy + sy / 2, cz + sz / 2)
      ));
    };
    for (const dx of [-20, -10, 0, 10, 20]) addStaticCollider(x + dx, y + 2.4, z + 7.0, 0.45, 4.6, 0.45);
    for (const dx of [-14, 14]) addStaticCollider(x + dx, y + 0.8, z + 7.5, 3.2, 1.1, 0.75);
    addStaticCollider(x, y + 3.4, z + 3.0, 10, 1.35, 0.25);
    addStaticCollider(x + 36, y + 3.1, z - 2.8, 0.3, 6.2, 0.3);

    group.userData.stationName = stationName;
    this.scene.add(group);
    this.stationGroups.set(key, group);
  }

  private ensureWorldGeometry(x: number, z: number, lineId: RailwayTrackLine): void {
    const centerChunk = Math.floor(x / CHUNK_LENGTH);
    for (let c = centerChunk - 2; c <= centerChunk + 2; c++) {
      this.buildRailChunk(lineId, z, c);
    }
    const stationIndex = Math.round(x / STATION_SPACING);
    for (let s = stationIndex - 1; s <= stationIndex + 1; s++) {
      this.buildStation(lineId, z, s);
    }
  }

  // --- Main Update Loop ---
  update(deltaSeconds: number, playerPosition: THREE.Vector3): void {
    const clampedDelta = Math.min(0.1, deltaSeconds);

    // 1. UPDATE ALL SIX AI TRAINS with scheduled stops, announcements and animated doors
    for (const train of this.trains) {
      this.ensureWorldGeometry(playerPosition.x, train.z, train.line);
      this.ensureWorldGeometry(train.x, train.z, train.line);

      const nearestStation = Math.round(train.x / STATION_SPACING);
      const stationX = nearestStation * STATION_SPACING;

      const distanceToStation = Math.abs(train.x - stationX);
      if (train.lastAnnouncedStationIndex !== nearestStation && distanceToStation <= 300 && distanceToStation > 0.5) {
        train.lastAnnouncedStationIndex = nearestStation;
        if (Math.abs(playerPosition.x - train.x) < 180 && Math.abs(playerPosition.z - train.z) < 6.5) this.announce(`Attention passengers on line ${train.line}. ${this.stationName(nearestStation)} is approaching. Please prepare to alight.`);
      }

      if (train.dwellRemaining > 0) {
        if (!train.holdOrdered) {
          train.dwellRemaining = Math.max(0, train.dwellRemaining - clampedDelta);
        }
        train.stationStatus = (train.dwellRemaining > 0 || train.holdOrdered) ? 'doors_open' : 'doors_closing';

        // Slide doors outward during dwell, close during final 2 seconds (or stay open if hold ordered)
        const opening = (train.holdOrdered || train.dwellRemaining > 2) ? 0.65 : (train.dwellRemaining / 2) * 0.65;
        for (const door of train.doors) {
          const side = Number(door.userData.side);
          door.position.z = side * (1.93 + opening);
        }

        if (train.dwellRemaining === 0 && !train.holdOrdered) {
          train.stationStatus = 'running';
          if (Math.abs(playerPosition.x - train.x) < 220 && Math.abs(playerPosition.z - train.z) < 6.5) this.announce(`This train is departing. Please stand clear of the doors.`);
          soundEngine.playTrainBrakes();
        }
      } else if (
        Math.abs(train.x - stationX) <= train.speed * clampedDelta + 0.4 &&
        train.currentStationIndex !== nearestStation
      ) {
        // Arrived at station -> begin exactly 120s dwell
        train.x = stationX;
        train.dwellRemaining = DWELL_SECONDS;
        train.currentStationIndex = nearestStation;
        train.stationStatus = 'doors_open';
        if (Math.abs(playerPosition.x - train.x) < 220 && Math.abs(playerPosition.z - train.z) < 6.5) this.announce(`Now arriving at ${this.stationName(nearestStation)}. Please mind the gap. Doors are opening.`);
        soundEngine.playStationChime();
        soundEngine.playTrainBrakes();

        for (const door of train.doors) {
          door.position.z = Number(door.userData.side) * 2.58;
        }
      } else {
        train.x += train.direction * train.speed * clampedDelta;
      }

      // Telemetry dynamics simulation
      train.telemetryTimer += clampedDelta;
      if (train.telemetryTimer > 0.8) {
        train.telemetryTimer = 0;
        const isStationary = train.dwellRemaining > 0 || train.holdOrdered;
        const targetTemp = isStationary ? 52 + Math.floor(Math.sin(train.x * 0.002) * 4) : 68 + Math.floor(Math.sin(train.x * 0.005) * 6);
        train.tractionMotorTempC = Math.round(THREE.MathUtils.damp(train.tractionMotorTempC, targetTemp, 0.4, 0.8));
        train.brakePressureBar = isStationary ? 4.2 : 5.0;
        train.pantographVoltageKv = Math.round((24.8 + Math.sin(train.x * 0.01) * 0.35) * 10) / 10;
      }

      const groundY = this.terrainY(train.x, train.z);
      train.group.position.set(train.x, groundY, train.z);
      train.group.rotation.y = train.direction === 1 ? 0 : Math.PI;
      // Wheels rotate only while the train is physically travelling. During a station
      // dwell the train is stationary even though its timetable cruise speed is retained.
      // Apply the line direction so backward services rotate in the opposite direction.
      const wheelTravelDistance = train.dwellRemaining > 0
        ? 0
        : train.speed * train.direction * clampedDelta;
      if (wheelTravelDistance !== 0) {
        const wheelAngularStep = wheelTravelDistance / 0.62;
        train.group.traverse((object) => {
          if (object instanceof THREE.Mesh && object.userData.isTrainWheel) {
            object.rotation.z += wheelAngularStep;
          }
        });
      }
      train.group.updateMatrixWorld(true);

      const size = train.group.userData.boundingSize as THREE.Vector3;
      const box = train.group.userData.collisionProxy as THREE.Box3;
      box.setFromCenterAndSize(
        train.group.position.clone().add(new THREE.Vector3(-train.direction * 25.8, 3.1, 0)), size
      );
      train.group.userData.stationStatus = train.stationStatus;
      train.group.userData.dwellRemainingSeconds = train.dwellRemaining;
      train.group.userData.collisionProxy = box;
    }

    // 2. Legacy player-driven train loop (empty because all six lines are AI-operated)
    for (const dTrain of this.drivableTrains) {
      this.ensureWorldGeometry(playerPosition.x, dTrain.z, dTrain.line);
      this.ensureWorldGeometry(dTrain.x, dTrain.z, dTrain.line);

      // Physics: Acceleration & Braking with momentum
      if (dTrain.isOccupied) {
        // Active throttle responds to user input
        dTrain.targetSpeed = dTrain.throttle * MAX_PLAYER_TRAIN_SPEED;
        const accelRate = dTrain.throttle >= 0 ? 3.5 : 6.0; // Brakes are faster than engine acceleration
        dTrain.speed = THREE.MathUtils.damp(dTrain.speed, dTrain.targetSpeed, accelRate, clampedDelta);
      } else {
        // Unoccupied train gradually coasts to rest with rail friction
        dTrain.speed = THREE.MathUtils.damp(dTrain.speed, 0, 1.2, clampedDelta);
      }

      // Advance train along track corridor
      dTrain.x += dTrain.direction * dTrain.speed * clampedDelta;

      const groundY = this.terrainY(dTrain.x, dTrain.z);
      dTrain.group.position.set(dTrain.x, groundY, dTrain.z);
      dTrain.group.rotation.y = dTrain.direction === 1 ? 0 : Math.PI;
      dTrain.group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData.isTrainWheel) {
          object.rotation.z += (dTrain.speed * clampedDelta) / 0.62;
        }
      });
      dTrain.group.updateMatrixWorld(true);

      // Synchronize spotlights direction
      const spotDir = dTrain.direction;
      dTrain.spotlightL.target.position.set(dTrain.x + spotDir * 50, groundY + 1.2, dTrain.z - 0.95);
      dTrain.spotlightR.target.position.set(dTrain.x + spotDir * 50, groundY + 1.2, dTrain.z + 0.95);
      dTrain.spotlightL.target.updateMatrixWorld();
      dTrain.spotlightR.target.updateMatrixWorld();
    }

    // 3. Audio: Play wheel clatter on tracks when moving
    const movingTrain = this.activeDrivableTrain || this.trains.find(t => Math.hypot(t.x - playerPosition.x, t.z - playerPosition.z) < 60);
    if (movingTrain && Math.abs(movingTrain.speed) > 1.0) {
      this.wheelAudioTimer += clampedDelta;
      if (this.wheelAudioTimer > 0.65) {
        this.wheelAudioTimer = 0;
        // Periodic rail joint thud
        soundEngine.playFootstep();
      }
    }

    // 4. Memory Management: Unload distant rail chunks and stations beyond active window
    const keep = new Set<string>();
    const allTrackMonitors = [...this.trains, ...this.drivableTrains];

    for (const t of allTrackMonitors) {
      const c = Math.floor(t.x / CHUNK_LENGTH);
      for (let i = c - 3; i <= c + 3; i++) keep.add(`${t.line}:${i}`);
      const pc = Math.floor(playerPosition.x / CHUNK_LENGTH);
      for (let i = pc - 2; i <= pc + 2; i++) keep.add(`${t.line}:${i}`);
    }

    for (const [key, group] of this.railChunks) {
      if (!keep.has(key)) {
        this.scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        });
        this.railChunks.delete(key);
      }
    }

    for (const [key, group] of this.stationGroups) {
      const stationX = Number(group.userData.stationIndex) * STATION_SPACING;
      const nearPlayer = Math.abs(stationX - playerPosition.x) <= 600;
      const nearTrain = allTrackMonitors.some((t) => Math.abs(stationX - t.x) <= 600);
      if (!nearPlayer && !nearTrain) {
        this.scene.remove(group);
        group.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        });
        this.stationGroups.delete(key);
      }
    }
  }

  private stationName(index: number): string {
    return [
      'Sanctuary Central Terminal', 'Pine Valley Junction', 'Highland Ridge Station',
      'Riverbend Depot', 'Redwood Foothills Station', 'Canyon Pass Freight Depot',
      'Sunset Coastway Station', 'Northern Apex Research Stop',
    ][Math.abs(index) % 8];
  }

  private announce(message: string): void {
    // Use the browser's built-in speech engine where available; game audio remains the fallback.
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      window.speechSynthesis.cancel();
      const line = new SpeechSynthesisUtterance(message);
      line.rate = 0.92; line.pitch = 0.92; line.volume = 0.85;
      window.speechSynthesis.speak(line);
    } catch { /* Speech is optional; train operation must never depend on it. */ }
  }

  public getNearbyPassengerSeat(playerPos: THREE.Vector3, radius = 2.4): { train: AITrain; localPosition: THREE.Vector3 } | null {
    for (const train of this.trains) {
      train.group.updateMatrixWorld(true);
      const seats: THREE.Mesh[] = [];
      train.group.traverse((object) => {
        if (object instanceof THREE.Mesh && object.userData.isPassengerSeat === true) seats.push(object);
      });
      let nearestPosition: THREE.Vector3 | null = null;
      let nearestDistance = radius;
      for (const seat of seats) {
        const world = seat.getWorldPosition(new THREE.Vector3());
        const distance = world.distanceTo(playerPos);
        if (distance <= nearestDistance) {
          nearestDistance = distance;
          nearestPosition = train.group.worldToLocal(world.clone());
        }
      }
      if (nearestPosition) return { train, localPosition: nearestPosition };
    }
    return null;
  }

  public sitOnNearbyPassengerSeat(playerPos: THREE.Vector3): boolean {
    if (!this.activePassengerTrain || this.passengerSeatLocalPosition) return false;
    const seat = this.getNearbyPassengerSeat(playerPos, 2.8);
    if (!seat || seat.train !== this.activePassengerTrain) return false;
    this.passengerSeatLocalPosition = seat.localPosition.clone().add(new THREE.Vector3(0, 0.35, 0));
    return true;
  }

  public standFromPassengerSeat(): boolean {
    if (!this.passengerSeatLocalPosition) return false;
    this.passengerSeatLocalPosition = null;
    return true;
  }

  public getPassengerSeatWorldPosition(): THREE.Vector3 | null {
    if (!this.activePassengerTrain || !this.passengerSeatLocalPosition) return null;
    this.activePassengerTrain.group.updateMatrixWorld(true);
    return this.activePassengerTrain.group.localToWorld(this.passengerSeatLocalPosition.clone());
  }

  // --- Player Drivable Train Interactions (F1 & B1) ---
  public getNearbyDrivableTrain(_playerPos: THREE.Vector3, _maxDist = 6.0): DrivableTrain | null {
    // Passenger railway policy: no locomotive is ever offered to the player.
    return null;
    /* Legacy player-driving discovery retained only as historical code.
    for (const dTrain of this.drivableTrains) {
      // Cab is located at the front of the locomotive (+13.2m in train coordinate space)
      const d = Math.hypot(dTrain.x - playerPos.x, Math.abs(dTrain.z - playerPos.z) - 2.8);
      if (d <= maxDist && Math.abs(dTrain.speed) < 0.5) {
        return dTrain;
      }
    }
    return null;
    */
  }

  public getNearbyBoardableAITrain(playerPos: THREE.Vector3, maxDist = 7): AITrain | null {
    for (const train of this.trains) {
      if (train.dwellRemaining <= 0 || train.stationStatus !== 'doors_open') continue;
      const d = Math.hypot(train.x - playerPos.x, Math.abs(train.z - playerPos.z) - 2.8);
      if (d <= maxDist) return train;
    }
    return null;
  }

  public boardAITrain(train: AITrain): void {
    if (train.dwellRemaining <= 0 || train.stationStatus !== 'doors_open') return;
    train.isOccupied = true;
    this.activePassengerTrain = train;
    this.passengerSeatLocalPosition = null;
    soundEngine.playGateToggle(true);
  }

  public exitAITrain(playerPosOut: THREE.Vector3): void {
    const train = this.activePassengerTrain;
    if (!train) return;
    train.isOccupied = false;
    this.passengerSeatLocalPosition = null;
    playerPosOut.set(train.x + train.direction * 2, train.group.position.y + 0.3, train.z + train.direction * 2.8);
    this.activePassengerTrain = null;
    soundEngine.playGateToggle(false);
  }

  public boardPlayerTrain(_train: DrivableTrain): void {
    // Intentionally disabled: all six services are AI-operated passenger trains.
    return;
  }

  public exitPlayerTrain(playerPosOut: THREE.Vector3): void {
    if (!this.activeDrivableTrain) return;
    const train = this.activeDrivableTrain;
    train.isOccupied = false;
    train.throttle = 0;

    // Place player safely on the platform side (z offset by 4.2m)
    playerPosOut.set(
      train.x + train.direction * 12.0,
      getTerrainHeight(train.x, train.z + 4.2, this.worldSeed) + 0.3,
      train.z + 4.2
    );

    this.activeDrivableTrain = null;
    soundEngine.playGateToggle(false);
  }

  public updateTrainControls(_input: { forward: boolean; backward: boolean; sprint?: boolean; brake?: boolean }): void {
    // No player throttle/brake input is accepted by the passenger railway.
  }

  public toggleHeadlights(): boolean {
    if (!this.activeDrivableTrain) return false;
    const train = this.activeDrivableTrain;
    train.headlightsOn = !train.headlightsOn;
    train.spotlightL.visible = train.headlightsOn;
    train.spotlightR.visible = train.headlightsOn;
    soundEngine.playUIClick();
    return train.headlightsOn;
  }

  public toggleDoors(): boolean {
    if (!this.activeDrivableTrain) return false;
    const train = this.activeDrivableTrain;
    train.doorsOpen = !train.doorsOpen;
    for (const door of train.doors) {
      const side = Number(door.userData.side);
      door.position.z = side * (train.doorsOpen ? 2.58 : 1.93);
    }
    soundEngine.playGateToggle(train.doorsOpen);
    return train.doorsOpen;
  }

  public toggleCameraView(): boolean {
    if (!this.activeDrivableTrain) return false;
    const train = this.activeDrivableTrain;
    train.cabCameraActive = !train.cabCameraActive;
    soundEngine.playUIClick();
    return train.cabCameraActive;
  }

  public honkHorn(): void {
    soundEngine.playTrainHorn();
  }

  public getTrainHUDData() {
    if (this.activePassengerTrain) {
      const passengerTrain = this.activePassengerTrain;
      const stationIndex = Math.round(passengerTrain.x / STATION_SPACING);
      const stationName = [
        'Sanctuary Central Terminal',
        'Pine Valley Junction',
        'Highland Ridge Station',
        'Riverbend Depot',
        'Redwood Foothills Station',
        'Canyon Pass Freight Depot',
        'Sunset Coastway Station',
        'Northern Apex Research Stop',
      ][Math.abs(stationIndex) % 8];
      const distance = Math.abs(stationIndex * STATION_SPACING - passengerTrain.x);
      return {
        line: passengerTrain.line,
        direction: passengerTrain.direction === 1 ? 'FORWARD (+X)' : 'BACKWARD (-X)',
        speedKmh: Math.round(Math.abs(passengerTrain.speed) * 3.6),
        speedMph: Math.round(Math.abs(passengerTrain.speed) * 2.23694),
        throttle: 0,
        headlightsOn: false,
        doorsOpen: passengerTrain.stationStatus === 'doors_open',
        cabCameraActive: false,
        stationDistance: Math.round(distance),
        nextStation: stationName,
        announcement: passengerTrain.stationStatus === 'doors_open'
          ? `Now arriving at ${stationName}. Doors are opening.`
          : (passengerTrain.stationStatus === 'doors_closing'
            ? 'Doors are closing. This train is departing. Please stand clear.'
            : (distance <= 300
              ? `Attention passengers: ${stationName} is approaching.`
              : 'The train is in motion. Please remain clear of the doors.')),
      };
    }
    if (!this.activeDrivableTrain) return null;
    const train = this.activeDrivableTrain;
    const kmh = Math.round(Math.abs(train.speed) * 3.6);
    const mph = Math.round(kmh * 0.621371);
    const nearestStationIdx = Math.round(train.x / STATION_SPACING);
    const distToStation = Math.abs(nearestStationIdx * STATION_SPACING - train.x);

    return {
      line: train.line,
      direction: train.direction === 1 ? 'FORWARD (+X)' : 'BACKWARD (-X)',
      speedKmh: kmh,
      speedMph: mph,
      throttle: Math.round(train.throttle * 100),
      headlightsOn: train.headlightsOn,
      doorsOpen: train.doorsOpen,
      cabCameraActive: train.cabCameraActive,
      stationDistance: Math.round(distToStation),
      nextStation: [
        'Sanctuary Central Terminal',
        'Pine Valley Junction',
        'Highland Ridge Station',
        'Riverbend Depot',
        'Redwood Foothills Station',
        'Canyon Pass Freight Depot',
        'Sunset Coastway Station',
        'Northern Apex Research Stop',
      ][Math.abs(nearestStationIdx) % 8],
      announcement: train.doorsOpen
        ? 'Doors are open. Please board safely.'
        : (distToStation <= 300
          ? `Attention passengers: ${[
              'Sanctuary Central Terminal',
              'Pine Valley Junction',
              'Highland Ridge Station',
              'Riverbend Depot',
              'Redwood Foothills Station',
              'Canyon Pass Freight Depot',
              'Sunset Coastway Station',
              'Northern Apex Research Stop',
            ][Math.abs(nearestStationIdx) % 8]} is approaching.`
          : (Math.abs(train.speed) > 1.0
            ? 'The train is departing. Please stand clear of the doors.'
            : 'Welcome aboard LAST SANCTUARY rail service.')),
    };
  }

  public getStationCollisionBoxes(): Array<{ id: string; box: THREE.Box3 }> {
    const boxes: Array<{ id: string; box: THREE.Box3 }> = [];
    for (const [id, group] of this.stationGroups) {
      const colliders = group.userData.stationColliders as THREE.Box3[] | undefined;
      if (!colliders) continue;
      for (let i = 0; i < colliders.length; i++) boxes.push({ id: `${id}:wall:${i}`, box: colliders[i] });
    }
    return boxes;
  }

  public getTrainCollisionBoxes(): Array<{ id: string; line: RailwayTrackLine; box: THREE.Box3 }> {
    const list: Array<{ id: string; line: RailwayTrackLine; box: THREE.Box3 }> = [];
    for (const train of this.trains) {
      list.push({ id: train.id, line: train.line, box: (train.group.userData.collisionProxy as THREE.Box3).clone() });
    }
    for (const train of this.drivableTrains) {
      const box = new THREE.Box3().setFromCenterAndSize(
        train.group.position.clone().add(new THREE.Vector3(-train.direction * 20.0, 3.1, 0)),
        train.group.userData.boundingSize as THREE.Vector3
      );
      list.push({ id: train.id, line: train.line, box });
    }
    return list;
  }

  // ==========================================
  // RAILWAY CONTROL CENTRE OPERATIONS METHODS
  // ==========================================
  public getOperationsTelemetry(): RailwayServiceTelemetry[] {
    return this.trains.map((train, idx) => {
      const nearestStation = Math.round(train.x / STATION_SPACING);
      const curStationName = this.stationName(nearestStation);
      const nextIdx = nearestStation + train.direction;
      const nextStationName = this.stationName(nextIdx);
      const nextStationX = nextIdx * STATION_SPACING;
      const distToNextMeters = Math.max(0, Math.round(Math.abs(nextStationX - train.x)));
      const speedKmh = (train.dwellRemaining > 0 || train.holdOrdered && train.dwellRemaining > 0) ? 0 : Math.round(Math.abs(train.speed) * 3.6);
      const speedMph = Math.round(speedKmh * 0.621371);
      const distTravelledKm = Math.round((Math.abs(train.x) / 1000) * 10) / 10;
      const distRemainingKm = Math.round((distToNextMeters / 1000) * 10) / 10;

      // Estimated arrival time based on distance & cruise speed
      const etaSeconds = distToNextMeters > 0 ? Math.round(distToNextMeters / Math.max(1, train.speed)) : 0;
      const mins = Math.floor(etaSeconds / 60);
      const secs = etaSeconds % 60;
      const etaStr = etaSeconds === 0 ? 'ARRIVED' : `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      // Calculate scheduled vs estimated
      const schedSecs = etaSeconds + 35; // nominal timetable schedule
      const schedMins = Math.floor(schedSecs / 60);
      const schedSecsRem = schedSecs % 60;
      const schedStr = `${schedMins.toString().padStart(2, '0')}:${schedSecsRem.toString().padStart(2, '0')}`;

      // Status
      let onTimeStatus: RailwayServiceTelemetry['onTimeStatus'] = 'ON TIME';
      if (train.holdOrdered && train.dwellRemaining > 0) {
        onTimeStatus = 'HELD AT STATION';
      } else if (train.holdOrdered) {
        onTimeStatus = 'HOLD PENDING';
      } else if (train.dwellRemaining > 0) {
        onTimeStatus = 'DWELLING';
      }

      // Block calculation (16 blocks across corridor)
      const blockNum = Math.min(16, Math.max(1, Math.floor((train.x + 6000) / 750) + 1));
      const blockId = `BLK-${train.line}-${blockNum.toString().padStart(2, '0')}`;

      // Signal aspect: if dwelling or held -> red; if approaching station (<250m) -> yellow; otherwise green
      let signalAspect: 'green' | 'yellow' | 'red' = 'green';
      if (train.dwellRemaining > 0 || train.holdOrdered) {
        signalAspect = 'red';
      } else if (distToNextMeters < 250) {
        signalAspect = 'yellow';
      }

      const directionLabel = train.direction === 1 ? 'EASTBOUND (+X)' : 'WESTBOUND (-X)';

      return {
        slot: idx + 1,
        trainId: train.id,
        line: train.line,
        serviceId: train.serviceId,
        serviceName: train.serviceName,
        serviceType: train.serviceType,
        directionLabel,
        direction: train.direction,
        x: Math.round(train.x),
        z: train.z,
        speedKmh,
        speedMph,
        currentStation: curStationName,
        nextStation: nextStationName,
        distToNextMeters,
        distTravelledKm,
        distRemainingKm,
        scheduledArrival: schedStr,
        estimatedArrival: etaStr,
        delaySeconds: train.holdOrdered ? 120 : 0,
        onTimeStatus,
        stationStatus: train.stationStatus,
        doorsOpen: train.stationStatus === 'doors_open',
        holdOrdered: train.holdOrdered,
        tractionMotorTempC: Math.round(train.tractionMotorTempC),
        brakePressureBar: Math.round(train.brakePressureBar * 10) / 10,
        pantographVoltageKv: Math.round(train.pantographVoltageKv * 10) / 10,
        conditionPct: train.conditionPct,
        blockId,
        signalAspect,
        warningMessage: train.warningMessage,
        warningAcknowledged: train.warningAcknowledged,
      };
    });
  }

  public requestTrainHold(trainId: string): { success: boolean; message: string } {
    const train = this.trains.find((t) => t.id === trainId || t.serviceId === trainId);
    if (!train) return { success: false, message: 'Invalid train service ID specified.' };
    if (train.holdOrdered) return { success: false, message: `${train.serviceId} is already under dispatcher hold order.` };

    train.holdOrdered = true;
    train.warningMessage = `DISPATCH HOLD ACTIVE: Service held by Central Operations`;
    train.warningAcknowledged = false;

    if (train.dwellRemaining > 0) {
      soundEngine.playUIClick();
      return {
        success: true,
        message: `HOLD CONFIRMED: ${train.serviceId} (${train.serviceName}) held at ${this.stationName(train.currentStationIndex ?? 0)} platform. Signal set to RED.`,
      };
    } else {
      soundEngine.playUIClick();
      const nextIdx = Math.round(train.x / STATION_SPACING) + train.direction;
      return {
        success: true,
        message: `HOLD ARMED: ${train.serviceId} will halt upon arrival at ${this.stationName(nextIdx)} platform. Interlocking reserved.`,
      };
    }
  }

  public releaseTrainHold(trainId: string): { success: boolean; message: string } {
    const train = this.trains.find((t) => t.id === trainId || t.serviceId === trainId);
    if (!train) return { success: false, message: 'Invalid train service ID specified.' };
    if (!train.holdOrdered) return { success: false, message: `${train.serviceId} is not currently held.` };

    // Railway Safety Validation: Verify minimum track block clearance
    const precedingTrain = this.trains.find(
      (t) => t.id !== train.id && t.line === train.line && (t.x - train.x) * train.direction > 0 && Math.abs(t.x - train.x) < 600
    );
    if (precedingTrain) {
      return {
        success: false,
        message: `SAFETY INTERLOCK REJECTION: Insufficient block clearance (${Math.round(Math.abs(precedingTrain.x - train.x))}m). Preceding service in block ahead.`,
      };
    }

    train.holdOrdered = false;
    train.warningMessage = null;
    train.warningAcknowledged = true;
    if (train.dwellRemaining > 0) {
      train.dwellRemaining = Math.min(train.dwellRemaining, 8); // 8 second door alert before departure
    }
    soundEngine.playStationChime();
    return {
      success: true,
      message: `DISPATCH AUTHORIZED: Signal aspect cleared to GREEN. ${train.serviceId} cleared for departure.`,
    };
  }

  public acknowledgeWarning(trainId: string): { success: boolean; message: string } {
    const train = this.trains.find((t) => t.id === trainId || t.serviceId === trainId);
    if (!train) return { success: false, message: 'Invalid train service ID specified.' };
    train.warningAcknowledged = true;
    soundEngine.playUIClick();
    return {
      success: true,
      message: `WARNING ACKNOWLEDGED: Operational alarm silenced for ${train.serviceId}. Telemetry verified.`,
    };
  }

  dispose(): void {
    for (const train of this.trains) this.scene.remove(train.group);
    for (const train of this.drivableTrains) this.scene.remove(train.group);
    for (const group of this.railChunks.values()) {
      this.scene.remove(group);
      group.traverse((obj) => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
    }
    for (const group of this.stationGroups.values()) {
      this.scene.remove(group);
      group.traverse((obj) => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
    }
    this.railMaterial.dispose();
    this.sleeperMaterial.dispose();
    this.platformMaterial.dispose();
    this.ballastMaterial.dispose();
    this.aiTrainBodyMaterial.dispose();
    this.playerTrainBodyMaterial.dispose();
    this.windowMaterial.dispose();
    this.wheelMaterial.dispose();
    this.doorMaterial.dispose();
    this.trains = [];
    this.drivableTrains = [];
    this.activeDrivableTrain = null;
    this.activePassengerTrain = null;
    this.railChunks.clear();
    this.stationGroups.clear();
  }
}
