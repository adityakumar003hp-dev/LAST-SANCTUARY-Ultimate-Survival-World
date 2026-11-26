import * as THREE from 'three';
import {
  getNexusFloorForLocalY,
  getNexusRoomAtLocalPos,
  NEXUS_ALL_SCREENS,
  NEXUS_ELEVATORS,
  NEXUS_FLOOR_ORDER,
  NEXUS_FLOORS,
  NexusElevatorId,
  NexusFloorNumber,
} from './NexusConfig';
import { NexusMaterials } from './NexusMaterials';
import {
  NexusLiveContext,
  NexusSystems,
} from './NexusSystems';
import {
  buildNexusArchitecture,
  NexusArchitectureHandles,
  syncNexusArchitectureVisuals,
} from './NexusArchitecture';
import {
  buildNexusLowerFloors,
  NexusLowerFloorHandles,
  updateNexusLowerFloorVisuals,
} from './NexusLowerFloors';
import {
  buildNexusUpperFloors,
  NexusUpperFloorHandles,
  updateNexusUpperFloorVisuals,
} from './NexusUpperFloors';
import { NexusScreensRenderer } from './NexusScreensRenderer';
import { NexusStaffManager } from './NexusStaffManager';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';

export type NexusInteractionResult = {
  id: 'nexusElevator' | 'nexusFloor1Terminal' | 'nexusCompoundRadar' | 'nexusOutbreakRadar' | 'nexusScreen' | 'nexusStaff';
  label: string;
  prompt: string;
  elevatorId?: NexusElevatorId;
  floor?: NexusFloorNumber;
  screenId?: string;
  floor1Tab?: 'visitor' | 'staff' | 'directory' | 'building' | 'security';
  staffBriefing?: string;
};

export class NexusCoordinator {
  public readonly rootGroup: THREE.Group;
  public readonly mats: NexusMaterials;
  public readonly systems: NexusSystems;
  public readonly arch: NexusArchitectureHandles;
  public readonly lower: NexusLowerFloorHandles;
  public readonly upper: NexusUpperFloorHandles;
  public readonly screens: NexusScreensRenderer;
  public readonly staff: NexusStaffManager;
  private lastRestrictedUnlocked = false;
  private lastEntranceOpen = false;
  private lastLiveContext: NexusLiveContext | null = null;

  constructor(campusGroup: THREE.Group) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'building_2_independent_railway_command_centre';
    this.rootGroup.position.set(-48, 0, 24);
    this.rootGroup.userData = {
      buildingNumber: 2,
      name: 'THE NEXUS — Grand Railway Intelligence Headquarters',
      style: 'Luxury Futuristic Dark Graphite, Champagne Gold, Silver Titanium & Bronze Smart Glass',
      floors: 8,
      elevators: 2,
      screenCount: NEXUS_ALL_SCREENS.length,
      targetFootprint: [22.4, 18.4],
      explorableRooms: [
        'f1_grand_terminal_atrium_15_zones',
        'f2_railway_network_intelligence_observatory',
        'f3_train_operations_arena',
        'f4_infrastructure_engineering_laboratory',
        'f5_tech_and_comms_division',
        'f6_executive_sky_command',
        'f7_player_compound_intelligence_and_radar',
        'f8_zombie_outbreak_intelligence_and_radar',
      ],
      navigation: { stairs: true, elevators: ['liftA', 'liftB'], floors: 8 },
    };
    campusGroup.add(this.rootGroup);

    this.mats = new NexusMaterials();
    this.systems = new NexusSystems();
    this.arch = buildNexusArchitecture(this.rootGroup, this.mats);
    this.lower = buildNexusLowerFloors(this.rootGroup, this.mats);
    this.upper = buildNexusUpperFloors(this.rootGroup, this.mats);

    const floorGroups: Record<number, THREE.Group> = {
      1: this.lower.f1Group,
      2: this.lower.f2Group,
      3: this.lower.f3Group,
      4: this.lower.f4Group,
      5: this.upper.f5Group,
      6: this.upper.f6Group,
      7: this.upper.f7Group,
      8: this.upper.f8Group,
    };
    this.screens = new NexusScreensRenderer(floorGroups);
    this.staff = new NexusStaffManager(floorGroups);

    syncNexusArchitectureVisuals(this.arch, this.systems, 0.016, false);
  }

  public update(
    delta: number,
    playerRelToNexus: THREE.Vector3,
    cameraRelToNexus: THREE.Vector3,
    live: NexusLiveContext,
    apartmentOrigin: { x: number; z: number },
    onRestrictedStateChange?: (unlocked: boolean) => void
  ): void {
    this.lastLiveContext = live;
    this.systems.update(delta);

    if (this.systems.restrictedRoomsUnlocked !== this.lastRestrictedUnlocked) {
      this.lastRestrictedUnlocked = this.systems.restrictedRoomsUnlocked;
      onRestrictedStateChange?.(this.lastRestrictedUnlocked);
    }

    const nearSouthEntrance =
      Math.abs(playerRelToNexus.x) < 3.6 &&
      Math.abs(playerRelToNexus.z - (-8.92)) < 3.8 &&
      playerRelToNexus.y < 3.5;

    if (nearSouthEntrance !== this.lastEntranceOpen) {
      this.lastEntranceOpen = nearSouthEntrance;
      UnifiedPhysicsManager.getInstance()?.setDoorOpenState('nexus_f1_entrance_door', nearSouthEntrance);
    }

    syncNexusArchitectureVisuals(this.arch, this.systems, delta, nearSouthEntrance);
    updateNexusLowerFloorVisuals(this.lower, live, delta);
    updateNexusUpperFloorVisuals(this.upper, this.systems, live, apartmentOrigin, delta);
    this.screens.update(delta, this.systems, live);
    this.staff.update(delta, playerRelToNexus);

    // Camera-aware exterior cutaway when inside THE NEXUS
    const isInside =
      Math.abs(playerRelToNexus.x) < 11.4 &&
      Math.abs(playerRelToNexus.z) < 9.4 &&
      playerRelToNexus.y >= 0.0 &&
      playerRelToNexus.y <= 32.5;

    if (isInside) {
      this.arch.southExteriorGroup.visible = !(cameraRelToNexus.z < playerRelToNexus.z - 0.5);
      this.arch.northExteriorGroup.visible = !(cameraRelToNexus.z > playerRelToNexus.z + 0.5);
      this.arch.westExteriorGroup.visible = !(cameraRelToNexus.x < playerRelToNexus.x - 0.5);
      this.arch.eastExteriorGroup.visible = !(cameraRelToNexus.x > playerRelToNexus.x + 0.5);

      const currentFloor = getNexusFloorForLocalY(playerRelToNexus.y).floor;
      const floorGroups: Record<NexusFloorNumber, THREE.Group> = {
        1: this.lower.f1Group,
        2: this.lower.f2Group,
        3: this.lower.f3Group,
        4: this.lower.f4Group,
        5: this.upper.f5Group,
        6: this.upper.f6Group,
        7: this.upper.f7Group,
        8: this.upper.f8Group,
      };
      for (const fl of NEXUS_FLOOR_ORDER) {
        floorGroups[fl].visible = Math.abs(fl - currentFloor) <= 1;
      }
      this.arch.crownGroup.visible = currentFloor >= 7;
    } else {
      this.arch.southExteriorGroup.visible = true;
      this.arch.northExteriorGroup.visible = true;
      this.arch.westExteriorGroup.visible = true;
      this.arch.eastExteriorGroup.visible = true;
      this.lower.f1Group.visible = true;
      this.lower.f2Group.visible = true;
      this.lower.f3Group.visible = true;
      this.lower.f4Group.visible = true;
      this.upper.f5Group.visible = true;
      this.upper.f6Group.visible = true;
      this.upper.f7Group.visible = true;
      this.upper.f8Group.visible = true;
      this.arch.crownGroup.visible = true;
    }
  }

  public getLocationSummary(playerRelToNexus: THREE.Vector3): {
    floor: NexusFloorNumber;
    level: string;
    roomName: string;
    department: string;
  } | null {
    if (
      Math.abs(playerRelToNexus.x) > 11.4 ||
      Math.abs(playerRelToNexus.z) > 9.4 ||
      playerRelToNexus.y < 0.0 ||
      playerRelToNexus.y > 33.0
    ) {
      return null;
    }
    const loc = getNexusRoomAtLocalPos(playerRelToNexus.x, playerRelToNexus.y, playerRelToNexus.z);
    return {
      floor: loc.floor.floor,
      level: `THE NEXUS · ${loc.floor.code}`,
      roomName: loc.roomName,
      department: loc.floor.title,
    };
  }

  public getInteraction(relX: number, relY: number, relZ: number): NexusInteractionResult | null {
    if (Math.abs(relX) > 11.4 || Math.abs(relZ) > 9.8 || relY < 0.0 || relY > 33.5) {
      return null;
    }

    const currentFloorSpec = getNexusFloorForLocalY(relY);

    // 1. Check strictly TWO Passenger Elevators (Lift A & Lift B) — inside cab OR lobby call panel
    for (const elevId of ['liftA', 'liftB'] as NexusElevatorId[]) {
      const cfg = NEXUS_ELEVATORS[elevId];
      const st = this.systems.elevators[elevId];
      const insideCab =
        Math.abs(relX - cfg.localX) <= cfg.cabW * 0.6 &&
        Math.abs(relZ - cfg.localZ) <= cfg.cabD * 0.6 &&
        Math.abs(relY - st.currentY) <= 1.8;
      const nearCall =
        Math.hypot(relX - cfg.callButtonLocalX, relZ - cfg.localZ) <= 2.25;

      if (insideCab || nearCall) {
        return {
          id: 'nexusElevator',
          elevatorId: elevId,
          floor: currentFloorSpec.floor,
          label: cfg.name,
          prompt: `Press [E] to operate ${elevId === 'liftA' ? 'Lift A (Grand Luxury)' : 'Lift B (Express)'} · At Floor ${st.currentFloor}/8`,
        };
      }
    }

    // 2. Floor 1 Grand Terminal Atrium Interactive Zones
    if (currentFloorSpec.floor === 1) {
      if (Math.hypot(relX - (-7.6), relZ - (-6.6)) < 2.6) {
        return {
          id: 'nexusFloor1Terminal',
          floor: 1,
          floor1Tab: 'visitor',
          label: 'Visitor Registration Room',
          prompt: 'Press [E] to Register Visitor Pass & Access Clearance',
        };
      }
      if (Math.hypot(relX - 7.6, relZ - (-6.6)) < 2.6) {
        return {
          id: 'nexusFloor1Terminal',
          floor: 1,
          floor1Tab: 'staff',
          label: 'Staff Identification Desk',
          prompt: 'Press [E] to Verify Staff Badge & Unlock Restricted Suites',
        };
      }
      if (Math.hypot(relX - 3.8, relZ - (-0.2)) < 2.4) {
        return {
          id: 'nexusFloor1Terminal',
          floor: 1,
          floor1Tab: 'security',
          label: 'Security Access & Info Desk',
          prompt: 'Press [E] to Inspect Security Access & Building Permissions',
        };
      }
      if (Math.hypot(relX - 0.2, relZ - 8.4) < 3.4) {
        return {
          id: 'nexusFloor1Terminal',
          floor: 1,
          floor1Tab: 'directory',
          label: 'Building Directory Wall',
          prompt: 'Press [E] to Browse 8-Floor NEXUS Directory & Building Info',
        };
      }
      if (Math.hypot(relX, relZ - (-3.8)) < 2.8 || Math.hypot(relX - 0.2, relZ - 3.8) < 2.6) {
        return {
          id: 'nexusFloor1Terminal',
          floor: 1,
          floor1Tab: 'visitor',
          label: 'Main Reception & Information Centre',
          prompt: 'Press [E] to Open THE NEXUS Atrium Reception & Directory',
        };
      }
      return null;
    }

    // 3. Floor 7 Elevated 3D Compound Radar Table
    if (currentFloorSpec.floor === 7 && Math.hypot(relX - 0.3, relZ) < 4.1) {
      return {
        id: 'nexusCompoundRadar',
        floor: 7,
        label: 'Floor 7 · Interactive 3D Compound Radar',
        prompt: 'Press [E] to Open 12-Layer Compound Radar & 20-Tower Inspector',
      };
    }

    // 4. Floor 8 Central Global Outbreak Radar Table
    if (currentFloorSpec.floor === 8 && Math.hypot(relX - 0.3, relZ) < 4.1) {
      return {
        id: 'nexusOutbreakRadar',
        floor: 8,
        label: 'Floor 8 · Global Zombie Outbreak Radar',
        prompt: 'Press [E] to Open 10-Layer Global Outbreak Intelligence Radar',
      };
    }

    // 5. Nearest Unique Interactive Screen on Floors 2..8
    let bestScreen: (typeof NEXUS_ALL_SCREENS)[number] | null = null;
    let bestDist = 3.4;
    for (const sc of NEXUS_ALL_SCREENS) {
      if (sc.floor !== currentFloorSpec.floor) continue;
      const d = Math.hypot(relX - sc.mountPos[0], relZ - sc.mountPos[2]);
      if (d < bestDist) {
        bestDist = d;
        bestScreen = sc;
      }
    }

    if (bestScreen) {
      return {
        id: 'nexusScreen',
        floor: bestScreen.floor,
        screenId: bestScreen.id,
        label: `${bestScreen.code} · ${bestScreen.title}`,
        prompt: `Press [E] to Access ${bestScreen.code}: ${bestScreen.title}`,
      };
    }

    // Fallback department console access when on Floors 2..8 near center tables
    if (currentFloorSpec.floor >= 2 && Math.hypot(relX - 0.3, relZ) < 4.2) {
      return {
        id: 'nexusScreen',
        floor: currentFloorSpec.floor,
        label: `Floor ${currentFloorSpec.floor} · ${currentFloorSpec.title}`,
        prompt: `Press [E] to Open ${currentFloorSpec.title} Terminal`,
      };
    }

    // 6. Nearby Animated NEXUS Staff Specialist
    const staffHit = this.staff.getNearestStaffInteraction(
      relX,
      relY,
      relZ,
      this.systems,
      this.lastLiveContext
    );
    if (staffHit) {
      return {
        id: 'nexusStaff',
        floor: staffHit.staff.floor,
        label: staffHit.staff.name,
        prompt: `Press [E] to Speak with ${staffHit.staff.name} (${staffHit.staff.roleTitle})`,
        staffBriefing: staffHit.briefing,
      };
    }

    return null;
  }

  public dispose(): void {
    this.screens.dispose();
    this.arch.geometries.forEach((g) => g.dispose());
    this.lower.geometries.forEach((g) => g.dispose());
    this.upper.geometries.forEach((g) => g.dispose());
    this.mats.dispose();
  }
}
