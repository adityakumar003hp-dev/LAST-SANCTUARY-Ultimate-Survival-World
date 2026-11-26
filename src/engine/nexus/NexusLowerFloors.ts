import * as THREE from 'three';
import { NEXUS_FLOORS } from './NexusConfig';
import { NexusMaterials } from './NexusMaterials';
import type { NexusLiveContext } from './NexusSystems';

export interface NexusLowerFloorHandles {
  f1Group: THREE.Group;
  f2Group: THREE.Group;
  f3Group: THREE.Group;
  f4Group: THREE.Group;
  atriumSpire: THREE.Group;
  f2TrainMarkers: THREE.Mesh[];
  f4TestBogie: THREE.Group;
  floorLights: THREE.PointLight[];
  geometries: THREE.BufferGeometry[];
}

function trackGeo<T extends THREE.BufferGeometry>(list: THREE.BufferGeometry[], g: T): T {
  list.push(g);
  return g;
}

export function buildNexusLowerFloors(
  root: THREE.Group,
  mats: NexusMaterials
): NexusLowerFloorHandles {
  const geometries: THREE.BufferGeometry[] = [];
  const floorLights: THREE.PointLight[] = [];

  // =========================================================================
  // FLOOR 1: GRAND TERMINAL ATRIUM (15 Zones + Sculpture + Glass Bays + Portals)
  // =========================================================================
  const f1Group = new THREE.Group();
  f1Group.name = 'nexus_floor_1_grand_atrium';
  root.add(f1Group);
  const y1 = NEXUS_FLOORS[1].floorY;

  const f1LightMain = new THREE.PointLight(0xfff1d6, 1.55, 24, 1.2);
  f1LightMain.position.set(0, y1 + 3.9, 0);
  const f1LightSouth = new THREE.PointLight(0xfde68a, 1.1, 18, 1.3);
  f1LightSouth.position.set(0, y1 + 3.6, -6.5);
  f1Group.add(f1LightMain, f1LightSouth);
  floorLights.push(f1LightMain, f1LightSouth);

  // Main Reception Curved Island (Grand Entrance -> Main Reception)
  const receptionDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.4, 1.05, 1.15)), mats.darkGraphite);
  receptionDesk.position.set(0, y1 + 0.525, -3.8);
  const receptionTop = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.55, 0.08, 1.25)), mats.champagneGold);
  receptionTop.position.set(0, y1 + 1.08, -3.8);
  const receptionMonitor = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(1.5, 0.55, 0.06)), mats.cyanLed);
  receptionMonitor.position.set(0, y1 + 1.42, -3.55);
  f1Group.add(receptionDesk, receptionTop, receptionMonitor);

  // Atrium Gallery Sculptural Core + Information Centre Kiosk
  const atriumSpire = new THREE.Group();
  atriumSpire.position.set(0.2, y1, 3.8);
  const spirePlinth = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(1.55, 1.75, 0.55, 24)), mats.darkGraphite);
  spirePlinth.position.y = 0.275;
  const spireRing = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(1.2, 0.07, 10, 32)), mats.champagneGold);
  spireRing.rotation.x = Math.PI / 2;
  spireRing.position.y = 1.65;
  const spireCore = new THREE.Mesh(trackGeo(geometries, new THREE.OctahedronGeometry(0.45, 0)), mats.goldLed);
  spireCore.position.y = 2.05;
  atriumSpire.add(spirePlinth, spireRing, spireCore);
  f1Group.add(atriumSpire);

  // Security Access Turnstile Portals + Security Info Desk (Z = -0.4)
  for (const tx of [-2.4, -0.8, 0.8, 2.4]) {
    const stanchion = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.18, 1.1, 1.0)), mats.silverTitanium);
    stanchion.position.set(tx, y1 + 0.55, -0.4);
    const scannerLed = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.2, 0.06, 0.3)), mats.goldLed);
    scannerLed.position.set(tx, y1 + 1.12, -0.4);
    f1Group.add(stanchion, scannerLed);
  }
  const secInfoDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.1, 0.98, 0.95)), mats.charcoalCore);
  secInfoDesk.position.set(3.8, y1 + 0.49, -0.2);
  f1Group.add(secInfoDesk);

  // Visitor Registration Room (SW Glass Bay) & Staff ID Desk (SE Glass Bay)
  const visDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.0, 0.95, 0.9)), mats.darkGraphite);
  visDesk.position.set(-7.6, y1 + 0.475, -6.6);
  const visGlassPartition = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.1, 3.6, 3.8)), mats.bronzeSmartGlass);
  visGlassPartition.position.set(-4.8, y1 + 1.8, -6.8);
  const staffIdDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.0, 0.95, 0.9)), mats.darkGraphite);
  staffIdDesk.position.set(7.6, y1 + 0.475, -6.6);
  const staffGlassPartition = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.1, 3.6, 3.8)), mats.bronzeSmartGlass);
  staffGlassPartition.position.set(4.8, y1 + 1.8, -6.8);
  f1Group.add(visDesk, visGlassPartition, staffIdDesk, staffGlassPartition);

  // Visitor Waiting Lounge Banquettes (West-South corridor)
  for (const lz of [-3.6, -2.5]) {
    const sofa = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.2, 0.52, 0.82)), mats.darkLeather);
    sofa.position.set(-4.0, y1 + 0.26, lz);
    f1Group.add(sofa);
  }

  // Staff Reception Office Glass Enclosure (NW Restricted Suite)
  const staffOfficeWallS = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(5.6, 3.8, 0.12)), mats.bronzeSmartGlass);
  staffOfficeWallS.position.set(-8.0, y1 + 1.9, 4.2);
  const staffOfficeDoorFrame = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.16, 3.8, 2.2)), mats.champagneGold);
  staffOfficeDoorFrame.position.set(-5.2, y1 + 1.9, 8.0);
  const staffOfficeTable = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.4, 0.82, 1.0)), mats.f6SmokedWalnut);
  staffOfficeTable.position.set(-8.2, y1 + 0.41, 6.8);
  f1Group.add(staffOfficeWallS, staffOfficeDoorFrame, staffOfficeTable);

  // Conference Reception Lounge (NE) + Railway Info Gallery Displays (East corridor)
  const confTable = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(1.15, 1.15, 0.78, 18)), mats.f6SmokedWalnut);
  confTable.position.set(7.6, y1 + 0.39, 7.2);
  const railGalleryTotem = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.32, 2.4, 3.4)), mats.darkGraphite);
  railGalleryTotem.position.set(5.3, y1 + 1.2, 1.8);
  f1Group.add(confTable, railGalleryTotem);

  // =========================================================================
  // FLOOR 2: RAILWAY NETWORK INTELLIGENCE OBSERVATORY (3D Network Table)
  // =========================================================================
  const f2Group = new THREE.Group();
  f2Group.name = 'nexus_floor_2_network_observatory';
  root.add(f2Group);
  const y2 = NEXUS_FLOORS[2].floorY;

  const f2Light = new THREE.PointLight(0x7dd3fc, 1.45, 24, 1.3);
  f2Light.position.set(0.2, y2 + 3.1, 0);
  f2Group.add(f2Light);
  floorLights.push(f2Light);

  // Central Elevated 3D Railway Network Map Table
  const mapPedestal = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(2.7, 3.0, 0.86, 32)), mats.darkGraphite);
  mapPedestal.position.set(0.3, y2 + 0.43, 0);
  const mapBevelRing = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(2.75, 0.06, 10, 40)), mats.cyanLed);
  mapBevelRing.rotation.x = Math.PI / 2;
  mapBevelRing.position.set(0.3, y2 + 0.88, 0);
  const mapSurface = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(2.6, 2.6, 0.08, 32)), mats.f2SlateObservatory);
  mapSurface.position.set(0.3, y2 + 0.88, 0);
  f2Group.add(mapPedestal, mapBevelRing, mapSurface);

  // 6 Miniature Glowing Rail Lines & 8 Station Nodes on the 3D Network Table
  const f2TrainMarkers: THREE.Mesh[] = [];
  for (let lineIdx = 0; lineIdx < 6; lineIdx++) {
    const lz = -0.8 + lineIdx * 0.32;
    const railStrip = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.4, 0.025, 0.035)), mats.silverTitanium);
    railStrip.position.set(0.3, y2 + 0.94, lz);
    f2Group.add(railStrip);

    const marker = new THREE.Mesh(
      trackGeo(geometries, new THREE.BoxGeometry(0.22, 0.09, 0.1)),
      lineIdx < 3 ? mats.cyanLed : mats.goldLed
    );
    marker.position.set(0.3, y2 + 0.99, lz);
    f2Group.add(marker);
    f2TrainMarkers.push(marker);
  }
  for (let st = 0; st < 8; st++) {
    const sx = -1.7 + st * 0.56;
    const node = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(0.08, 0.08, 0.12, 10)), mats.champagneGold);
    node.position.set(sx, y2 + 0.96, 0);
    f2Group.add(node);
  }

  // Regional Map Alcove Desk (SW) & Route Analysis Table (NW) & Archive Cabinets (SE)
  const f2AlcoveDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.6, 0.82, 1.0)), mats.charcoalCore);
  f2AlcoveDesk.position.set(-7.6, y2 + 0.41, -6.4);
  const f2RouteTable = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.8, 0.82, 1.1)), mats.charcoalCore);
  f2RouteTable.position.set(-7.6, y2 + 0.41, 6.4);
  const f2ArchiveRack = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(1.1, 2.2, 2.6)), mats.darkGraphite);
  f2ArchiveRack.position.set(8.6, y2 + 1.1, -6.8);
  f2Group.add(f2AlcoveDesk, f2RouteTable, f2ArchiveRack);

  // =========================================================================
  // FLOOR 3: TRAIN OPERATIONS ARENA (Tiered Horseshoe Consoles + Supervisor)
  // =========================================================================
  const f3Group = new THREE.Group();
  f3Group.name = 'nexus_floor_3_train_ops_arena';
  root.add(f3Group);
  const y3 = NEXUS_FLOORS[3].floorY;

  const f3Light = new THREE.PointLight(0x22d3ee, 1.4, 24, 1.3);
  f3Light.position.set(0.3, y3 + 3.1, 0);
  f3Group.add(f3Light);
  floorLights.push(f3Light);

  // Raised Arena Command Dais + 6 Horseshoe Operator Consoles
  const arenaDais = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(4.2, 4.45, 0.24, 32)), mats.darkGraphite);
  arenaDais.position.set(0.3, y3 + 0.12, 0);
  const arenaGlowRim = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(4.25, 0.04, 8, 40)), mats.cyanLed);
  arenaGlowRim.rotation.x = Math.PI / 2;
  arenaGlowRim.position.set(0.3, y3 + 0.24, 0);
  f3Group.add(arenaDais, arenaGlowRim);

  for (let i = 0; i < 6; i++) {
    const angle = (-Math.PI * 0.58) + (i / 5) * (Math.PI * 1.16);
    const r = 2.6;
    const desk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(1.45, 0.85, 0.72)), mats.charcoalCore);
    desk.position.set(0.3 + Math.sin(angle) * r, y3 + 0.66, Math.cos(angle) * r);
    desk.rotation.y = Math.atan2(0.3 - desk.position.x, -desk.position.z);
    const deskTrim = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(1.48, 0.05, 0.05)), mats.cyanLed);
    deskTrim.position.set(desk.position.x, y3 + 1.09, desk.position.z);
    deskTrim.rotation.y = desk.rotation.y;
    f3Group.add(desk, deskTrim);
  }

  // Supervisor Glass Office (NW) & Crew Briefing Table (SW)
  const supGlass = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(5.2, 3.1, 0.1)), mats.bronzeSmartGlass);
  supGlass.position.set(-7.8, y3 + 1.55, 4.2);
  const supDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.2, 0.82, 0.95)), mats.f6SmokedWalnut);
  supDesk.position.set(-7.8, y3 + 0.41, 6.6);
  const briefTable = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.8, 0.78, 1.3)), mats.charcoalCore);
  briefTable.position.set(-7.8, y3 + 0.39, -6.5);
  f3Group.add(supGlass, supDesk, briefTable);

  // =========================================================================
  // FLOOR 4: INFRASTRUCTURE ENGINEERING LAB (Track Model Bench & Stress Rigs)
  // =========================================================================
  const f4Group = new THREE.Group();
  f4Group.name = 'nexus_floor_4_engineering_lab';
  root.add(f4Group);
  const y4 = NEXUS_FLOORS[4].floorY;

  const f4Light = new THREE.PointLight(0xfbbf24, 1.35, 24, 1.3);
  f4Light.position.set(0.2, y4 + 3.1, 0);
  f4Group.add(f4Light);
  floorLights.push(f4Light);

  // Central Track Test Model Bench + Rolling Test Bogie Rig
  const testBench = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(6.8, 0.88, 2.2)), mats.charcoalCore);
  testBench.position.set(0.2, y4 + 0.44, 0);
  const benchRailN = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(6.4, 0.08, 0.08)), mats.silverTitanium);
  benchRailN.position.set(0.2, y4 + 0.92, 0.42);
  const benchRailS = benchRailN.clone();
  benchRailS.position.z = -0.42;
  const f4TestBogie = new THREE.Group();
  f4TestBogie.position.set(0.2, y4 + 1.05, 0);
  const bogieFrame = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(1.4, 0.24, 1.1)), mats.amberLed);
  f4TestBogie.add(bogieFrame);
  f4Group.add(testBench, benchRailN, benchRailS, f4TestBogie);

  // Bridge Truss Stress Rig (NW) & Civil Meeting Table (SW)
  const bridgeModel = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.8, 1.25, 1.1)), mats.silverTitanium);
  bridgeModel.position.set(-7.6, y4 + 0.625, 6.4);
  const engMeetTable = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.0, 0.8, 1.3)), mats.darkGraphite);
  engMeetTable.position.set(-7.6, y4 + 0.4, -6.4);
  f4Group.add(bridgeModel, engMeetTable);

  return {
    f1Group,
    f2Group,
    f3Group,
    f4Group,
    atriumSpire,
    f2TrainMarkers,
    f4TestBogie,
    floorLights,
    geometries,
  };
}

export function updateNexusLowerFloorVisuals(
  handles: NexusLowerFloorHandles,
  live: NexusLiveContext,
  delta: number
): void {
  handles.atriumSpire.rotation.y += delta * 0.35;
  handles.f4TestBogie.position.x = 0.2 + Math.sin(performance.now() * 0.0014) * 2.1;

  handles.f2TrainMarkers.forEach((marker, idx) => {
    const train = live.trains[idx];
    if (train) {
      const norm = (train.x + 4800) / 9600;
      marker.position.x = -1.9 + Math.max(0, Math.min(1, norm)) * 4.4;
    }
  });
}
