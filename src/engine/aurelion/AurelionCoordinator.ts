import * as THREE from 'three';
import {
  AURELION_DOCUMENTS,
  AURELION_ELEVATOR_CONFIGS,
  AURELION_LEVELS,
  AurelionDocument,
  getLevelForLocalY,
  getNearestRoomAtLocalPos,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';
import { AurelionMansionSystems, ElevatorId } from './AurelionSystems';
import {
  AurelionArchitectureHandles,
  buildAurelionArchitecture,
  syncAurelionElevatorsVisual,
} from './AurelionArchitecture';
import {
  AurelionBasementHandles,
  B2_FARM_BED_COORDS,
  B2_WATER_PUMP_POS,
  buildAurelionBasements,
  updateAurelionBasementVisuals,
} from './AurelionBasements';
import {
  AurelionLowerFloorHandles,
  buildAurelionLowerFloors,
} from './AurelionLowerFloors';
import {
  AurelionUpperFloorHandles,
  buildAurelionUpperFloors,
  syncAurelionHydroponicsVisual,
} from './AurelionUpperFloors';
import {
  AurelionCrownFloorHandles,
  buildAurelionCrownFloors,
  setAurelionCinemaVideo,
  updateAurelionCrownVisuals,
} from './AurelionCrownFloors';

export type AurelionInteractionResult = {
  id: string;
  label: string;
  prompt: string;
  elevatorId?: ElevatorId;
  hydroBedId?: number;
  b2FarmBedId?: number;
  documentId?: string;
};

export class AurelionCoordinator {
  public readonly rootGroup: THREE.Group;
  public readonly mats: AurelionMaterials;
  public readonly systems: AurelionMansionSystems;

  public readonly arch: AurelionArchitectureHandles;
  public readonly basements: AurelionBasementHandles;
  public readonly lower: AurelionLowerFloorHandles;
  public readonly upper: AurelionUpperFloorHandles;
  public readonly crown: AurelionCrownFloorHandles;

  constructor(
    parentGroup: THREE.Group,
    screenMaterials: {
      tvScreenMat: THREE.MeshBasicMaterial;
      securityScreenTex: THREE.CanvasTexture;
      wallClockTex: THREE.CanvasTexture;
      computerScreenTex: THREE.CanvasTexture;
    },
    initialDoorOpen = true,
    initialPatioOpen = true
  ) {
    this.rootGroup = new THREE.Group();
    this.rootGroup.name = 'building_1_the_aurelion_mega_estate';
    parentGroup.add(this.rootGroup);

    this.mats = new AurelionMaterials();
    this.systems = new AurelionMansionSystems();

    this.arch = buildAurelionArchitecture(this.rootGroup, this.mats, initialDoorOpen, initialPatioOpen);
    this.basements = buildAurelionBasements(this.rootGroup, this.mats);
    this.lower = buildAurelionLowerFloors(this.rootGroup, this.mats, screenMaterials);
    this.upper = buildAurelionUpperFloors(this.rootGroup, this.mats);
    this.crown = buildAurelionCrownFloors(this.rootGroup, this.mats);

    syncAurelionElevatorsVisual(this.arch, this.systems);
    syncAurelionHydroponicsVisual(this.upper, this.systems);
  }

  public update(
    delta: number,
    playerRelPos: THREE.Vector3,
    cameraRelPos: THREE.Vector3,
    gameTimeMinutes: number,
    weatherType: string,
    extraUsage: { tapsActive: number; showerActive: boolean; stoveOn: boolean; acOn: boolean; basementTvOn: boolean }
  ) {
    // Camera-aware 9-Level Cutaway Visibility (determined BEFORE floor visual/texture updates)
    const isInside =
      Math.abs(playerRelPos.x) < 15.6 &&
      Math.abs(playerRelPos.z) < 12.8 &&
      playerRelPos.y >= -8.0 &&
      playerRelPos.y <= 26.2;

    if (isInside) {
      this.arch.southWallMesh.visible = !(cameraRelPos.z < playerRelPos.z - 0.5);
      this.arch.northWallMesh.visible = !(cameraRelPos.z > playerRelPos.z + 0.5);
      this.arch.westWallMesh.visible = !(cameraRelPos.x < playerRelPos.x - 0.5);
      this.arch.eastWallMesh.visible = !(cameraRelPos.x > playerRelPos.x + 0.5);
      this.arch.chandelierGroup.visible = true;

      const lvl = getLevelForLocalY(playerRelPos.y).id;
      this.basements.b2Group.visible = lvl === 'B2';
      this.basements.b1RingGroup.visible = lvl === 'B1';
      this.lower.f1Group.visible = lvl === 'F1';
      this.lower.f2Group.visible = lvl === 'F2' || lvl === 'F1'; // Preserve atrium ceiling view from F1
      this.upper.f3Group.visible = lvl === 'F3' || lvl === 'F2' || lvl === 'F1';
      this.upper.f4Group.visible = lvl === 'F4' || lvl === 'F3' || lvl === 'F2' || lvl === 'F1';
      this.upper.f5Group.visible = lvl === 'F5';
      this.crown.f6Group.visible = lvl === 'F6';
      this.crown.f7Group.visible = lvl === 'F7';
    } else {
      this.arch.southWallMesh.visible = true;
      this.arch.northWallMesh.visible = true;
      this.arch.westWallMesh.visible = true;
      this.arch.eastWallMesh.visible = true;

      // Hide occluded enclosed interior floors when outside so interiors remain private
      // and off-screen interior rooms/furniture do not burn GPU draw calls.
      const nearGroundPortal =
        Math.abs(playerRelPos.x) < 18.5 &&
        Math.abs(playerRelPos.z) < 17.5 &&
        playerRelPos.y >= -1.5 &&
        playerRelPos.y <= 5.5;
      const nearRooftopCam =
        Math.abs(cameraRelPos.x) < 95 &&
        Math.abs(cameraRelPos.z) < 95;
      this.basements.b2Group.visible = false;
      this.basements.b1RingGroup.visible = false;
      this.lower.f1Group.visible = nearGroundPortal;
      this.lower.f2Group.visible = false;
      this.upper.f3Group.visible = false;
      this.upper.f4Group.visible = false;
      this.upper.f5Group.visible = false;
      this.crown.f6Group.visible = false;
      this.crown.f7Group.visible = nearRooftopCam; // Open-air rooftop Sky Palace stays visible when within compound view
      this.arch.chandelierGroup.visible = nearGroundPortal;
    }

    this.systems.update(delta, gameTimeMinutes, weatherType, extraUsage);
    syncAurelionElevatorsVisual(this.arch, this.systems);
    if (this.upper.f5Group.visible) {
      syncAurelionHydroponicsVisual(this.upper, this.systems);
    }
    updateAurelionBasementVisuals(this.basements, this.systems, delta, extraUsage.basementTvOn);
    updateAurelionCrownVisuals(this.crown, this.systems, delta);

    // Sync Room Light Switches per floor + Tier Load Shedding
    const t2 = this.systems.tier2StandardPowered;
    const rl = this.systems.roomLights;
    this.basements.b2Lights.forEach((l) => (l.intensity = rl.b2 && t2 ? 1.3 : 0.08));
    this.basements.b1Lights.forEach((l) => (l.intensity = rl.b1 ? 1.25 : 0.12));
    this.lower.f1Lights.forEach((l) => (l.intensity = rl.f1 && t2 ? 1.35 : 0.08));
    this.lower.f2Lights.forEach((l) => (l.intensity = rl.f2 && t2 ? 1.25 : 0.08));
    this.upper.f3Lights.forEach((l) => (l.intensity = rl.f3 ? 1.45 : 0.25)); // Tier 1 Critical Medical stays illuminated
    this.upper.f4Lights.forEach((l) => (l.intensity = rl.f4 && t2 ? 1.3 : 0.08));
    this.upper.f5Lights.forEach((l) => (l.intensity = rl.f5 && t2 ? 1.35 : 0.08));
    this.crown.f6Lights.forEach((l) => (l.intensity = rl.f6 && this.systems.tier3LuxuryPowered ? 1.25 : 0.06));
    this.crown.f7Lights.forEach((l) => (l.intensity = rl.f7 && this.systems.tier3LuxuryPowered ? 1.2 : 0.06));

    // Gentle Chandelier Shimmer (only when visible)
    if (this.arch.chandelierGroup.visible) {
      this.arch.chandelierGroup.rotation.y += delta * 0.08;
    }
  }

  public getLocationSummary(relPos: THREE.Vector3): { level: string; roomName: string } | null {
    if (Math.abs(relPos.x) > 15.6 || Math.abs(relPos.z) > 12.8 || relPos.y < -8.2 || relPos.y > 26.5) {
      return null;
    }
    const lvl = getLevelForLocalY(relPos.y);
    const room = getNearestRoomAtLocalPos(relPos.x, relPos.y, relPos.z);
    return {
      level: `${lvl.title} · ${lvl.subtitle}`,
      roomName: room ? `${room.code} ${room.name}` : lvl.subtitle,
    };
  }

  public getDocumentById(docId: string): AurelionDocument | undefined {
    return AURELION_DOCUMENTS.find((d) => d.id === docId);
  }

  public getInteraction(relX: number, relY: number, relZ: number): AurelionInteractionResult | null {
    if (Math.abs(relX) > 15.6 || Math.abs(relZ) > 13.0) return null;
    const lvl = getLevelForLocalY(relY).id;

    // 1. Check Three Elevator Call Panels & Cabs on every served floor
    for (const id of ['main', 'service', 'private'] as ElevatorId[]) {
      const cfg = AURELION_ELEVATOR_CONFIGS[id];
      if (!cfg.stops.includes(lvl)) continue;
      if (Math.hypot(relX - cfg.localX, relZ - cfg.localZ) < 2.2) {
        const st = this.systems.elevators[id];
        return {
          id: 'aurelionElevator',
          elevatorId: id,
          label: `${cfg.name} (${st.currentFloor})`,
          prompt: st.lockedByLoadShedding
            ? `[E] ${cfg.name} — POWER SHED (Switch Power Priority or Start Generator)`
            : `[E] ${cfg.name} (At ${st.currentFloor}) · Select Destination Floor`,
        };
      }
    }

    // 2. B2 Infrastructure Kingdom Interactions (y ~ -7.6)
    if (lvl === 'B2') {
      if (Math.hypot(relX - (-10.0), relZ - (-7.2)) < 3.4) {
        return {
          id: 'aurelionGenerator',
          label: 'B2 Main Power-Generation Hall',
          prompt: `[E] ${this.systems.generatorRunning ? 'Stop' : 'Start'} Twin Diesel Generators (Fuel: ${Math.round(this.systems.fuelLiters)} L)`,
        };
      }
      if (Math.hypot(relX - (-4.0), relZ - (-8.8)) < 2.8) {
        return {
          id: 'aurelionRefuel',
          label: 'B2 Fuel Management Tank',
          prompt: `[E] Top Off Generator Day-Tank (+120 L Fuel Reserve · Now ${Math.round(this.systems.fuelLiters)} L)`,
        };
      }
      if (Math.hypot(relX - (-11.0), relZ - 7.5) < 3.2) {
        return {
          id: 'apartmentStatus',
          label: 'B2 Electrical Distribution & Load Shedding',
          prompt: `[E] Open Estate Power & Load-Shedding Console (${this.systems.powerPriorityMode.toUpperCase()})`,
        };
      }
      if (Math.hypot(relX - B2_WATER_PUMP_POS.x, relZ - (B2_WATER_PUMP_POS.z - 0.8)) < 2.2) {
        const running = this.systems.waterPumpActive && this.systems.tier2StandardPowered;
        return {
          id: 'aurelionWaterPump',
          label: 'B2 Centrifugal Booster Water Pump Station',
          prompt: `[E] ${this.systems.waterPumpActive ? 'Stop' : 'Start'} Booster Water Pump (${running ? `${this.systems.waterPressureBar.toFixed(1)} BAR` : 'STANDBY'})`,
        };
      }
      if (Math.hypot(relX - 3.0, relZ - 8.1) < 2.5) {
        return {
          id: 'aurelionWaterPurifier',
          label: 'B2 RO/UV Water Filtration Centre',
          prompt: `[E] Toggle Purifier (${this.systems.purifierActive ? 'ACTIVE' : 'PAUSED'}) & Fill Clean Water Canteen`,
        };
      }
      for (const bedCfg of B2_FARM_BED_COORDS) {
        if (Math.hypot(relX - bedCfg.x, relZ - bedCfg.z) < 1.85) {
          const bed = this.systems.b2FarmBeds[bedCfg.id];
          if (bed) {
            const actionText =
              bed.stage === 0
                ? `Plant ${bed.cropType.toUpperCase()} Seeds`
                : bed.stage === 3
                  ? `Harvest Ripe ${bed.cropType.toUpperCase()}`
                  : `Growing (${Math.round(bed.growthProgress * 100)}%) — Check Irrigation`;
            return {
              id: 'aurelionB2FarmBed',
              b2FarmBedId: bedCfg.id,
              label: bed.label,
              prompt: `[E] ${bed.label}: ${actionText}`,
            };
          }
        }
      }
      if (Math.hypot(relX - 11.2, relZ - (-5.0)) < 3.4) {
        return {
          id: 'aurelionMaintenance',
          label: 'B2 Mechanical Maintenance Workshop',
          prompt: `[E] Run Estate Maintenance Calibration (Integrity: ${Math.round(this.systems.maintenanceIntegrity)}%)`,
        };
      }
    }

    // 3. B1 Private Operations & Railway Ring Interactions (y ~ -4.0)
    if (lvl === 'B1') {
      if (Math.hypot(relX - 0.0, relZ - (-9.5)) < 3.2) {
        return {
          id: 'basementTV',
          label: 'B1 Staff Lounge Telemetry Display',
          prompt: '[E] Toggle B1 Lounge Telemetry Screen',
        };
      }
      if (Math.hypot(relX - 11.5, relZ - (-7.8)) < 3.0) {
        return {
          id: 'securityCommandCenter',
          label: 'B1 Compound Security Monitoring Room',
          prompt: '[E] Open 5km Security Radar & Compound Gate Matrix',
        };
      }
      if (Math.hypot(relX - (-11.4), relZ - 0.0) < 3.2) {
        return {
          id: 'railwayOperations',
          label: 'B1 Route Monitoring Console',
          prompt: '[E] Open Live 6-Train Railway Operations Center',
        };
      }
    }

    // 4. Floor 1 Expanded Portal & New Wing Stations
    if (lvl === 'F1') {
      if (Math.hypot(relX - 0.0, relZ - (-11.9)) < 2.6) {
        return {
          id: 'door',
          label: 'The Aurelion Grand Front Entrance',
          prompt: '[E] Open / Close Grand Entrance Double Doors',
        };
      }
      if (Math.hypot(relX - 0.0, relZ - 11.9) < 2.6) {
        return {
          id: 'patioDoor',
          label: 'North Garden Patio Sliding Doors',
          prompt: '[E] Open / Close North Patio Doors',
        };
      }
      if (Math.hypot(relX - 11.2, relZ - (-7.5)) < 2.8) {
        return {
          id: 'apartmentStatus',
          label: 'Estate Concierge & Management Desk',
          prompt: '[E] Open THE AURELION Estate Management Console',
        };
      }
    }

    // 5. Floor 2 Private Residential Palace
    if (lvl === 'F2') {
      if (Math.hypot(relX - (-11.5), relZ - 6.2) < 3.0) {
        return {
          id: 'bed',
          label: 'Master Principal Suite Bed',
          prompt: '[E] Sleep / Rest in Master Principal Suite',
        };
      }
      if (Math.hypot(relX - 12.2, relZ - (-7.6)) < 2.6 || Math.hypot(relX - 12.2, relZ - (-1.0)) < 2.6 || Math.hypot(relX - 12.2, relZ - 8.2) < 2.6) {
        return {
          id: 'bed',
          label: 'Companion Guest Suite Bed',
          prompt: '[E] Rest in Guest Suite Bed',
        };
      }
      if (Math.hypot(relX - 0.0, relZ - 8.2) < 2.6) {
        return {
          id: 'aurelionDocument',
          documentId: 'aurelion_charter',
          label: 'Executive Library Charter',
          prompt: '[E] Read THE AURELION Structural & Continuity Dossier',
        };
      }
      if (Math.hypot(relX - (-5.8), relZ - (-8.2)) < 2.6) {
        return {
          id: 'aurelionDocument',
          documentId: 'survivor_field_log',
          label: 'Private Study Logistics Log',
          prompt: '[E] Read Oakridge Compound & Companion Assignment Log',
        };
      }
    }

    // 6. Floor 3 Private Medical & Wellness Centre
    if (lvl === 'F3') {
      if (Math.hypot(relX - 1.5, relZ - (-8.2)) < 3.0) {
        return {
          id: 'medicalClinic',
          label: 'Floor 3 Medical Centre Reception',
          prompt: '[E] Open Medical Clinic & Diagnostic Care',
        };
      }
      if (
        Math.hypot(relX - (-11.2), relZ - 6.2) < 2.6 ||
        Math.hypot(relX - (-11.2), relZ - (-1.0)) < 2.6 ||
        Math.hypot(relX - (-5.8), relZ - 7.6) < 2.6 ||
        Math.hypot(relX - 0.0, relZ - 7.6) < 2.6 ||
        Math.hypot(relX - 11.2, relZ - 7.8) < 2.6
      ) {
        return {
          id: 'medicalBed',
          label: 'Floor 3 Medical Recovery Bed',
          prompt: '[E] Rest in Medical Suite & Regenerate Health',
        };
      }
      if (Math.hypot(relX - (-11.2), relZ - (-7.8)) < 2.8) {
        return {
          id: 'medicalClinic',
          label: 'Diagnostic MRI & Vitals Scanner',
          prompt: '[E] Run Full Medical Vitals Diagnostic',
        };
      }
    }

    // 7. Floor 4 Equipment, Storage & Maintenance
    if (lvl === 'F4') {
      if (Math.hypot(relX - (-11.2), relZ - 0.0) < 3.4) {
        return {
          id: 'armory',
          label: 'Biometric Armory & Equipment Vault',
          prompt: '[E] Access 100-Item Tactical Equipment & Armory Vault',
        };
      }
      if (Math.hypot(relX - 11.2, relZ - (-7.8)) < 3.0) {
        return {
          id: 'aurelionMaintenance',
          label: 'Floor 4 Precision Maintenance Workshop',
          prompt: `[E] Inspect & Service Estate Gear (Integrity ${Math.round(this.systems.maintenanceIntegrity)}%)`,
        };
      }
      if (Math.hypot(relX - 0.0, relZ - (-8.2)) < 2.8) {
        return {
          id: 'apartmentStatus',
          label: 'Quartermaster Estate Status Terminal',
          prompt: '[E] Open Estate Systems & Inventory Console',
        };
      }
    }

    // 8. Floor 5 Agricultural & Food Production Garden
    if (lvl === 'F5') {
      for (let i = 0; i < 12; i++) {
        const col = Math.floor(i / 4);
        const row = i % 4;
        const hx = -9.6 + col * 3.1;
        const hz = -4.2 + row * 2.8;
        if (Math.hypot(relX - hx, relZ - hz) < 2.1) {
          const bed = this.systems.hydroBeds[i];
          const actionText =
            bed.stage === 0
              ? `Plant ${bed.cropType.toUpperCase()} Seeds`
              : bed.stage === 3
                ? `Harvest Ripe ${bed.cropType.toUpperCase()}`
                : `Growing (${Math.round(bed.growthProgress * 100)}%) — Open Hydro Console`;
          return {
            id: 'aurelionHydroBed',
            hydroBedId: i,
            label: bed.label,
            prompt: `[E] ${bed.label}: ${actionText}`,
          };
        }
      }
      if (Math.hypot(relX - 5.5, relZ - 7.8) < 2.8) {
        return {
          id: 'fridge',
          label: 'Floor 5 Chilled Harvest Storage',
          prompt: '[E] Open Harvest Cold Storage & Food Pantry',
        };
      }
      if (Math.hypot(relX - (-2.5), relZ - (-7.6)) < 2.8) {
        return {
          id: 'apartmentStatus',
          label: 'Floor 5 Irrigation & Sky Garden Controls',
          prompt: '[E] Open Estate Water & Hydroponics Dashboard',
        };
      }
    }

    // 9. Floor 6 Private Resort, Cinema, Aquarium & Indoor Pool
    if (lvl === 'F6') {
      if (Math.hypot(relX - 8.8, relZ - (-6.2)) < 3.2) {
        return {
          id: 'aurelionCinema',
          label: 'Android TV 4K Smart Cinema',
          prompt: '[E] Open Android TV 4K Smart Cinema (YouTube · 3D Media · Channels)',
        };
      }
      if (Math.hypot(relX - 9.4, relZ - 0.0) < 2.8) {
        return {
          id: 'aurelionGym',
          label: 'Luxury Athletic Fitness Centre',
          prompt: '[E] Train on Athletic Equipment (+Stamina & +15 XP)',
        };
      }
      if (Math.hypot(relX - 3.2, relZ - 6.8) < 2.6) {
        return {
          id: 'aurelionRefreshment',
          label: 'Non-Alcoholic Juice & Espresso Bar',
          prompt: '[E] Prepare Fresh Hydrating Beverage (+25 Thirst & Stamina)',
        };
      }
      if (Math.hypot(relX - (-7.0), relZ - 5.0) < 3.0) {
        return {
          id: 'aurelionDocument',
          documentId: 'aquarium_ecological_note',
          label: 'Panoramic Aquarium Lounge',
          prompt: '[E] Inspect Marine Biome Aquarium & Technical Spec',
        };
      }
      if (Math.hypot(relX - (-7.3), relZ - (-0.4)) < 3.6) {
        return {
          id: 'pool',
          label: 'Floor 6 Indoor Leisure Pool',
          prompt: '[E] Enter / Exit Indoor Leisure Pool',
        };
      }
    }

    // 10. Floor 7 Crown Level: Sky Palace
    if (lvl === 'F7') {
      if (Math.hypot(relX - (-6.0), relZ - (-0.2)) < 4.4) {
        return {
          id: 'pool',
          label: 'Crown Rooftop Infinity Swimming Pool',
          prompt: '[E] Swim in Crown Infinity Pool',
        };
      }
      if (Math.hypot(relX - 9.4, relZ - (-2.5)) < 2.8) {
        return {
          id: 'apartmentStatus',
          label: 'F7 Solar Inverter & Crown Dashboard',
          prompt: `[E] Inspect F7 Solar Array (+${this.systems.solarKw.toFixed(1)} kW) & Mansion Controls`,
        };
      }
      if (Math.hypot(relX - (-9.8), relZ - 7.5) < 2.8) {
        return {
          id: 'aurelionWeather',
          label: 'Crown Meteorological Weather Station',
          prompt: '[E] Read Live Rooftop Weather & Atmospheric Telemetry',
        };
      }
    }

    return null;
  }

  public setCinemaMedia(
    videoEl: HTMLVideoElement | null,
    appLabel = 'ANDROID TV OS',
    title = 'YOUTUBE · MEDIA PROJECTOR · ESTATE TV'
  ) {
    setAurelionCinemaVideo(this.crown, videoEl, appLabel, title);
  }

  public dispose() {
    setAurelionCinemaVideo(this.crown, null);
    this.mats.dispose();
  }
}
