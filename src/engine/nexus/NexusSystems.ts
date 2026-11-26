import {
  NEXUS_COMPOUND_RADAR_LAYERS,
  NEXUS_ELEVATORS,
  NEXUS_FLOORS,
  NEXUS_OUTBREAK_RADAR_LAYERS,
  NexusClearanceLevel,
  NexusElevatorId,
  NexusFloorNumber,
} from './NexusConfig';
import type { RailwayServiceTelemetry } from '../world/AITrainManager';
import type { RailwayStationOperationsSnapshot } from '../world/RailwayNPCManager';
import type { CityOutbreakTelemetry, GlobalOutbreakMetrics } from '../world/GlobalOutbreakSimulator';
import type { SentryTurretState } from '../prologue/ApartmentTurrets';
import type { WeatherTelemetry } from '../weather/WeatherManager';
import type { ExtractionState } from '../world/WorldEventsManager';
import type { SupplyDropState } from '../../types/game';
import type { AurelionDashboardSnapshot } from '../aurelion/AurelionSystems';

export interface NexusElevatorRuntime {
  id: NexusElevatorId;
  currentFloor: NexusFloorNumber;
  targetFloor: NexusFloorNumber;
  currentY: number;
  moving: boolean;
  doorOpenFactor: number; // 0 = closed, 1 = open
  doorTimer: number;
  maintenanceHold: boolean;
  queue: NexusFloorNumber[];
  tripsCompleted: number;
}

export interface NexusEngineeringOrder {
  id: string;
  title: string;
  sector: string;
  status: 'open' | 'verified';
  updatedAtMin: number;
}

export interface NexusCommsEntry {
  id: string;
  channel: string;
  message: string;
  timestampMin: number;
}

export interface NexusRadarPreferences {
  compoundRotationDeg: number;
  compoundZoom: number;
  outbreakLonOffset: number;
  outbreakZoom: number;
  outbreakContinentFilter: string;
}

export interface NexusSaveState {
  version: 1;
  visitorName: string;
  visitorPurpose: string;
  visitorRegistered: boolean;
  staffBadgeId: string;
  staffVerified: boolean;
  clearanceLevel: NexusClearanceLevel;
  restrictedRoomsUnlocked: boolean;
  liftAFloors: { currentFloor: NexusFloorNumber; targetFloor: NexusFloorNumber; currentY: number; maintenanceHold: boolean };
  liftBFloors: { currentFloor: NexusFloorNumber; targetFloor: NexusFloorNumber; currentY: number; maintenanceHold: boolean };
  compoundLayers: Record<string, boolean>;
  outbreakLayers: Record<string, boolean>;
  pinnedAlertNotes: string[];
  engineeringOrders: NexusEngineeringOrder[];
  commsLog: NexusCommsEntry[];
  selectedScreenByFloor?: Record<number, string>;
  radarPreferences?: NexusRadarPreferences;
  outbreakIntelRecords?: string[];
}

export interface NexusLiveVehicleInfo {
  id: string;
  name: string;
  type: string;
  fuelType: string;
  position: [number, number, number];
  batteryPercent: number;
  odometerKm: number;
  isOccupied: boolean;
  isLocked: boolean;
  headlightsOn: boolean;
  gear: string;
  speedKmh: number;
}

export interface NexusLiveNpcMarker {
  id: string;
  name: string;
  role: string;
  kind: 'companion' | 'settlement' | 'rescued';
  position: [number, number, number];
  health: number;
  maxHealth: number;
}

export interface NexusLiveContext {
  gameTimeMinutes: number;
  dayCount: number;
  isNight: boolean;
  isDusk: boolean;
  trains: RailwayServiceTelemetry[];
  stationSnapshot: RailwayStationOperationsSnapshot | null;
  compound: {
    mainGateOpen: boolean;
    westPedOpen: boolean;
    eastPedOpen: boolean;
    vehicleGate1Open: boolean;
    vehicleGate2Open: boolean;
    garageShutterOpen: boolean;
    turrets: SentryTurretState[];
    aurelionSnapshot: AurelionDashboardSnapshot | null;
    vehicles: NexusLiveVehicleInfo[];
  };
  player: {
    position: [number, number, number];
    yaw: number;
    health: number;
    maxHealth: number;
    infection: number;
    radiation: number;
    countryName?: string;
    continentOrOcean?: string;
    nearestCityName?: string;
    latitude?: number;
    longitude?: number;
  };
  npcs: NexusLiveNpcMarker[];
  outbreak: {
    isLocalOutbreakActive: boolean;
    globalMetrics: GlobalOutbreakMetrics;
    cities: CityOutbreakTelemetry[];
    activeZombies: Array<{ id: string; type: string; position: [number, number, number]; health: number; isBoss?: boolean; state: string }>;
    wildlifeCount: number;
    territorialWildlifeCount: number;
    weather: WeatherTelemetry;
    supplyDrop: SupplyDropState | null;
    extraction: ExtractionState;
    discoveredChunksCount: number;
    exploredBounds: { minCx: number; maxCx: number; minCz: number; maxCz: number } | null;
    baseAlarmArmed: boolean;
    baseResearchUnlockedCount: number;
    baseResearchTotalCount: number;
    baseLevel: number;
  };
}

export interface NexusDashboardSnapshot {
  systems: {
    visitorName: string;
    visitorPurpose: string;
    visitorRegistered: boolean;
    staffBadgeId: string;
    staffVerified: boolean;
    clearanceLevel: NexusClearanceLevel;
    restrictedRoomsUnlocked: boolean;
    elevators: Record<NexusElevatorId, NexusElevatorRuntime>;
    compoundLayers: Record<string, boolean>;
    outbreakLayers: Record<string, boolean>;
    pinnedAlertNotes: string[];
    engineeringOrders: NexusEngineeringOrder[];
    commsLog: NexusCommsEntry[];
    selectedScreenByFloor: Record<number, string>;
    radarPreferences: NexusRadarPreferences;
    outbreakIntelRecords: string[];
    radarSweepAngle: number;
  };
  live: NexusLiveContext;
}

const CLEARANCE_RANK: Record<NexusClearanceLevel, number> = {
  visitor: 1,
  staff: 2,
  security: 3,
  executive: 4,
};

export function hasNexusClearance(current: NexusClearanceLevel, required: NexusClearanceLevel): boolean {
  return CLEARANCE_RANK[current] >= CLEARANCE_RANK[required];
}

export class NexusSystems {
  public visitorName = 'Guest Inspector';
  public visitorPurpose = 'Compound & Railway Inspection';
  public visitorRegistered = false;
  public staffBadgeId = 'NX-CMD-001';
  public staffVerified = false;
  public clearanceLevel: NexusClearanceLevel = 'visitor';
  public restrictedRoomsUnlocked = false;
  public radarSweepAngle = 0;

  public elevators: Record<NexusElevatorId, NexusElevatorRuntime> = {
    liftA: {
      id: 'liftA',
      currentFloor: 1,
      targetFloor: 1,
      currentY: NEXUS_FLOORS[1].floorY,
      moving: false,
      doorOpenFactor: 1,
      doorTimer: 0,
      maintenanceHold: false,
      queue: [],
      tripsCompleted: 0,
    },
    liftB: {
      id: 'liftB',
      currentFloor: 1,
      targetFloor: 1,
      currentY: NEXUS_FLOORS[1].floorY,
      moving: false,
      doorOpenFactor: 1,
      doorTimer: 0,
      maintenanceHold: false,
      queue: [],
      tripsCompleted: 0,
    },
  };

  public compoundLayers: Record<string, boolean> = Object.fromEntries(
    NEXUS_COMPOUND_RADAR_LAYERS.map((l) => [l.id, l.defaultEnabled])
  );
  public outbreakLayers: Record<string, boolean> = Object.fromEntries(
    NEXUS_OUTBREAK_RADAR_LAYERS.map((l) => [l.id, l.defaultEnabled])
  );

  public pinnedAlertNotes: string[] = [];
  public engineeringOrders: NexusEngineeringOrder[] = [
    { id: 'WO-1676-A', title: 'Track F1–B3 Catenary Tension Verification (25kV)', sector: 'Track Corridor', status: 'open', updatedAtMin: 480 },
    { id: 'WO-204-B', title: 'Sanctuary Bridge Pier Strain Gauge Calibration', sector: 'East Bridge Span', status: 'open', updatedAtMin: 480 },
    { id: 'WO-LIFT-AB', title: 'Lift A & Lift B Dual-Shaft Interlock Inspection', sector: 'THE NEXUS Core', status: 'verified', updatedAtMin: 480 },
  ];
  public commsLog: NexusCommsEntry[] = [
    { id: 'LOG-01', channel: 'NEXUS-CORE', message: 'Grand Terminal Atrium operational across 8 floors.', timestampMin: 480 },
    { id: 'LOG-02', channel: 'RAIL-VHF', message: '6-Train continuous corridor telemetry link synchronized.', timestampMin: 480 },
  ];
  public selectedScreenByFloor: Record<number, string> = {};
  public radarPreferences: NexusRadarPreferences = {
    compoundRotationDeg: 0,
    compoundZoom: 1.0,
    outbreakLonOffset: 0,
    outbreakZoom: 1.0,
    outbreakContinentFilter: 'All',
  };
  public outbreakIntelRecords: string[] = [];

  public update(delta: number): void {
    this.radarSweepAngle = (this.radarSweepAngle + delta * 0.95) % (Math.PI * 2);

    (['liftA', 'liftB'] as NexusElevatorId[]).forEach((elevId) => {
      const st = this.elevators[elevId];
      const cfg = NEXUS_ELEVATORS[elevId];
      const targetY = NEXUS_FLOORS[st.targetFloor].floorY;

      if (st.maintenanceHold) {
        st.moving = false;
        st.doorOpenFactor = Math.max(0, st.doorOpenFactor - delta * 2.5);
        return;
      }

      if (Math.abs(st.currentY - targetY) > 0.025) {
        // Close doors first before traveling vertically
        if (st.doorOpenFactor > 0.04) {
          st.doorOpenFactor = Math.max(0, st.doorOpenFactor - delta * 3.0);
          st.moving = true;
          return;
        }
        st.moving = true;
        const dir = targetY > st.currentY ? 1 : -1;
        const step = cfg.speedMetersPerSec * delta;
        if (Math.abs(targetY - st.currentY) <= step) {
          st.currentY = targetY;
          st.currentFloor = st.targetFloor;
          st.moving = false;
          st.doorTimer = 3.2;
          st.tripsCompleted += 1;
        } else {
          st.currentY += dir * step;
          // Update closest passing floor number cleanly
          let bestFloor: NexusFloorNumber = st.currentFloor;
          let bestDist = Infinity;
          ([1, 2, 3, 4, 5, 6, 7, 8] as NexusFloorNumber[]).forEach((fl) => {
            const d = Math.abs(st.currentY - NEXUS_FLOORS[fl].floorY);
            if (d < bestDist) {
              bestDist = d;
              bestFloor = fl;
            }
          });
          st.currentFloor = bestFloor;
        }
      } else {
        st.currentY = targetY;
        st.currentFloor = st.targetFloor;
        st.moving = false;
        st.doorOpenFactor = Math.min(1, st.doorOpenFactor + delta * 2.6);
        if (st.doorTimer > 0) {
          st.doorTimer = Math.max(0, st.doorTimer - delta);
        } else if (st.queue.length > 0 && st.doorOpenFactor > 0.95) {
          const next = st.queue.shift()!;
          if (next !== st.currentFloor) {
            st.targetFloor = next;
          }
        }
      }
    });
  }

  public callElevator(elevatorId: NexusElevatorId, targetFloor: NexusFloorNumber): { accepted: boolean; reason?: string } {
    const st = this.elevators[elevatorId];
    if (!st) return { accepted: false, reason: 'Invalid elevator ID.' };
    if (st.maintenanceHold) {
      return { accepted: false, reason: `${NEXUS_ELEVATORS[elevatorId].name} is currently under maintenance hold.` };
    }
    if (st.targetFloor === targetFloor && !st.moving) {
      st.doorTimer = 2.0;
      return { accepted: true, reason: `Car already at Floor ${targetFloor}. Doors open.` };
    }
    if (st.moving) {
      if (!st.queue.includes(targetFloor)) st.queue.push(targetFloor);
      return { accepted: true, reason: `Queued Floor ${targetFloor} on ${elevatorId === 'liftA' ? 'Lift A' : 'Lift B'}.` };
    }
    st.targetFloor = targetFloor;
    return { accepted: true };
  }

  public toggleElevatorMaintenance(elevatorId: NexusElevatorId): boolean {
    const st = this.elevators[elevatorId];
    st.maintenanceHold = !st.maintenanceHold;
    return st.maintenanceHold;
  }

  public registerVisitor(name: string, purpose: string): void {
    this.visitorName = name.trim() || 'Authorized Visitor';
    this.visitorPurpose = purpose.trim() || 'Observatory Tour';
    this.visitorRegistered = true;
    this.recordComms('RECEPTION', `Visitor registered: ${this.visitorName} (${this.visitorPurpose})`);
  }

  public verifyStaffId(badgeId: string, requestedLevel: NexusClearanceLevel = 'executive'): boolean {
    const clean = badgeId.trim().toUpperCase();
    if (!clean) return false;
    this.staffBadgeId = clean;
    this.staffVerified = true;
    this.clearanceLevel = requestedLevel;
    this.restrictedRoomsUnlocked = CLEARANCE_RANK[requestedLevel] >= CLEARANCE_RANK.staff;
    this.recordComms('SECURITY', `Staff badge ${clean} verified · Clearance: ${requestedLevel.toUpperCase()}`);
    return true;
  }

  public setClearanceLevel(level: NexusClearanceLevel): void {
    this.clearanceLevel = level;
    this.restrictedRoomsUnlocked = CLEARANCE_RANK[level] >= CLEARANCE_RANK.staff;
    this.recordComms('SECURITY', `Terminal clearance set to ${level.toUpperCase()}.`);
  }

  public toggleCompoundLayer(layerId: string): boolean {
    const next = !(this.compoundLayers[layerId] ?? false);
    this.compoundLayers[layerId] = next;
    return next;
  }

  public toggleOutbreakLayer(layerId: string): boolean {
    const next = !(this.outbreakLayers[layerId] ?? false);
    this.outbreakLayers[layerId] = next;
    return next;
  }

  public toggleWorkOrderStatus(orderId: string, currentTimeMinutes: number): void {
    const item = this.engineeringOrders.find((o) => o.id === orderId);
    if (item) {
      item.status = item.status === 'open' ? 'verified' : 'open';
      item.updatedAtMin = Math.round(currentTimeMinutes);
    }
  }

  public recordComms(channel: string, message: string, timestampMin = 480): void {
    const clean = message.trim();
    if (!clean) return;
    this.commsLog = [
      { id: `LOG-${Date.now().toString(36).slice(-5).toUpperCase()}`, channel, message: clean, timestampMin: Math.round(timestampMin) },
      ...this.commsLog.slice(0, 19),
    ];
  }

  public pinAlertNote(note: string): void {
    const clean = note.trim();
    if (!clean) return;
    this.pinnedAlertNotes = [clean, ...this.pinnedAlertNotes.filter((n) => n !== clean)].slice(0, 10);
  }

  public removeAlertNote(idx: number): void {
    this.pinnedAlertNotes.splice(idx, 1);
  }

  public setSelectedScreen(floor: NexusFloorNumber, screenId: string): void {
    this.selectedScreenByFloor[floor] = screenId;
  }

  public updateCompoundRadarPrefs(compoundRotationDeg: number, compoundZoom: number): void {
    this.radarPreferences.compoundRotationDeg = compoundRotationDeg;
    this.radarPreferences.compoundZoom = compoundZoom;
  }

  public updateOutbreakRadarPrefs(
    outbreakLonOffset: number,
    outbreakZoom: number,
    outbreakContinentFilter: string
  ): void {
    this.radarPreferences.outbreakLonOffset = outbreakLonOffset;
    this.radarPreferences.outbreakZoom = outbreakZoom;
    this.radarPreferences.outbreakContinentFilter = outbreakContinentFilter;
  }

  public recordOutbreakIntel(record: string): void {
    const clean = record.trim();
    if (!clean) return;
    this.outbreakIntelRecords = [clean, ...this.outbreakIntelRecords.filter((r) => r !== clean)].slice(0, 16);
    this.pinAlertNote(clean);
  }

  public getSnapshot(live: NexusLiveContext): NexusDashboardSnapshot {
    return {
      systems: {
        visitorName: this.visitorName,
        visitorPurpose: this.visitorPurpose,
        visitorRegistered: this.visitorRegistered,
        staffBadgeId: this.staffBadgeId,
        staffVerified: this.staffVerified,
        clearanceLevel: this.clearanceLevel,
        restrictedRoomsUnlocked: this.restrictedRoomsUnlocked,
        elevators: {
          liftA: { ...this.elevators.liftA, queue: [...this.elevators.liftA.queue] },
          liftB: { ...this.elevators.liftB, queue: [...this.elevators.liftB.queue] },
        },
        compoundLayers: { ...this.compoundLayers },
        outbreakLayers: { ...this.outbreakLayers },
        pinnedAlertNotes: [...this.pinnedAlertNotes],
        engineeringOrders: this.engineeringOrders.map((o) => ({ ...o })),
        commsLog: this.commsLog.map((c) => ({ ...c })),
        selectedScreenByFloor: { ...this.selectedScreenByFloor },
        radarPreferences: { ...this.radarPreferences },
        outbreakIntelRecords: [...this.outbreakIntelRecords],
        radarSweepAngle: this.radarSweepAngle,
      },
      live,
    };
  }

  public exportState(): NexusSaveState {
    return {
      version: 1,
      visitorName: this.visitorName,
      visitorPurpose: this.visitorPurpose,
      visitorRegistered: this.visitorRegistered,
      staffBadgeId: this.staffBadgeId,
      staffVerified: this.staffVerified,
      clearanceLevel: this.clearanceLevel,
      restrictedRoomsUnlocked: this.restrictedRoomsUnlocked,
      liftAFloors: {
        currentFloor: this.elevators.liftA.currentFloor,
        targetFloor: this.elevators.liftA.targetFloor,
        currentY: this.elevators.liftA.currentY,
        maintenanceHold: this.elevators.liftA.maintenanceHold,
      },
      liftBFloors: {
        currentFloor: this.elevators.liftB.currentFloor,
        targetFloor: this.elevators.liftB.targetFloor,
        currentY: this.elevators.liftB.currentY,
        maintenanceHold: this.elevators.liftB.maintenanceHold,
      },
      compoundLayers: { ...this.compoundLayers },
      outbreakLayers: { ...this.outbreakLayers },
      pinnedAlertNotes: [...this.pinnedAlertNotes],
      engineeringOrders: this.engineeringOrders.map((o) => ({ ...o })),
      commsLog: this.commsLog.map((c) => ({ ...c })),
      selectedScreenByFloor: { ...this.selectedScreenByFloor },
      radarPreferences: { ...this.radarPreferences },
      outbreakIntelRecords: [...this.outbreakIntelRecords],
    };
  }

  public restoreState(saved?: NexusSaveState | null): void {
    if (!saved || saved.version !== 1) return;
    this.visitorName = saved.visitorName || this.visitorName;
    this.visitorPurpose = saved.visitorPurpose || this.visitorPurpose;
    this.visitorRegistered = !!saved.visitorRegistered;
    this.staffBadgeId = saved.staffBadgeId || this.staffBadgeId;
    this.staffVerified = !!saved.staffVerified;
    this.clearanceLevel = saved.clearanceLevel || 'visitor';
    this.restrictedRoomsUnlocked = !!saved.restrictedRoomsUnlocked;

    if (saved.liftAFloors) {
      this.elevators.liftA.currentFloor = saved.liftAFloors.currentFloor;
      this.elevators.liftA.targetFloor = saved.liftAFloors.targetFloor;
      this.elevators.liftA.currentY = saved.liftAFloors.currentY;
      this.elevators.liftA.maintenanceHold = !!saved.liftAFloors.maintenanceHold;
    }
    if (saved.liftBFloors) {
      this.elevators.liftB.currentFloor = saved.liftBFloors.currentFloor;
      this.elevators.liftB.targetFloor = saved.liftBFloors.targetFloor;
      this.elevators.liftB.currentY = saved.liftBFloors.currentY;
      this.elevators.liftB.maintenanceHold = !!saved.liftBFloors.maintenanceHold;
    }
    if (saved.compoundLayers) {
      this.compoundLayers = { ...this.compoundLayers, ...saved.compoundLayers };
    }
    if (saved.outbreakLayers) {
      this.outbreakLayers = { ...this.outbreakLayers, ...saved.outbreakLayers };
    }
    if (Array.isArray(saved.pinnedAlertNotes)) {
      this.pinnedAlertNotes = [...saved.pinnedAlertNotes];
    }
    if (Array.isArray(saved.engineeringOrders) && saved.engineeringOrders.length > 0) {
      this.engineeringOrders = saved.engineeringOrders.map((o) => ({ ...o }));
    }
    if (Array.isArray(saved.commsLog) && saved.commsLog.length > 0) {
      this.commsLog = saved.commsLog.map((c) => ({ ...c }));
    }
    if (saved.selectedScreenByFloor) {
      this.selectedScreenByFloor = { ...saved.selectedScreenByFloor };
    }
    if (saved.radarPreferences) {
      this.radarPreferences = { ...this.radarPreferences, ...saved.radarPreferences };
    }
    if (Array.isArray(saved.outbreakIntelRecords)) {
      this.outbreakIntelRecords = [...saved.outbreakIntelRecords];
    }
  }
}
