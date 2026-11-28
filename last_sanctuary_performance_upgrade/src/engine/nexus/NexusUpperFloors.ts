import * as THREE from 'three';
import { NEXUS_FLOORS } from './NexusConfig';
import { NexusMaterials } from './NexusMaterials';
import type { NexusLiveContext, NexusSystems } from './NexusSystems';

export interface NexusUpperFloorHandles {
  f5Group: THREE.Group;
  f6Group: THREE.Group;
  f7Group: THREE.Group;
  f8Group: THREE.Group;
  f7SweepArm: THREE.Mesh;
  f7PlayerPin: THREE.Mesh;
  f7TurretPins: THREE.Mesh[];
  f8GlobeGroup: THREE.Group;
  f8OrbitRing: THREE.Mesh;
  floorLights: THREE.PointLight[];
  geometries: THREE.BufferGeometry[];
}

function trackGeo<T extends THREE.BufferGeometry>(list: THREE.BufferGeometry[], g: T): T {
  list.push(g);
  return g;
}

export function buildNexusUpperFloors(
  root: THREE.Group,
  mats: NexusMaterials
): NexusUpperFloorHandles {
  const geometries: THREE.BufferGeometry[] = [];
  const floorLights: THREE.PointLight[] = [];

  // =========================================================================
  // FLOOR 5: TECH & COMMS DIVISION (Server Galleries + Comms Center + Sim Lab)
  // =========================================================================
  const f5Group = new THREE.Group();
  f5Group.name = 'nexus_floor_5_tech_comms';
  root.add(f5Group);
  const y5 = NEXUS_FLOORS[5].floorY;

  const f5Light = new THREE.PointLight(0xa5b4fc, 1.4, 24, 1.3);
  f5Light.position.set(0.2, y5 + 3.1, 0);
  f5Group.add(f5Light);
  floorLights.push(f5Light);

  // Server Rack Galleries (NW Wing: 6 Illuminated Blade Cabinets)
  for (let i = 0; i < 6; i++) {
    const rx = -9.8 + (i % 3) * 1.9;
    const rz = i < 3 ? 5.3 : 7.3;
    const rack = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.95, 2.45, 0.85)), mats.darkGraphite);
    rack.position.set(rx, y5 + 1.225, rz);
    const bladeStrip = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.08, 2.0, 0.05)), mats.indigoLed);
    bladeStrip.position.set(rx + 0.45, y5 + 1.225, rz);
    f5Group.add(rack, bladeStrip);
  }

  // Comms Operator Central Pod
  const commsDesk = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(2.1, 2.3, 0.86, 20)), mats.charcoalCore);
  commsDesk.position.set(0.3, y5 + 0.43, 0);
  const commsTop = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(2.05, 0.05, 8, 32)), mats.indigoLed);
  commsTop.rotation.x = Math.PI / 2;
  commsTop.position.set(0.3, y5 + 0.88, 0);
  f5Group.add(commsDesk, commsTop);

  // Tech Research Lab Bench (SW)
  const techBench = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.2, 0.84, 1.1)), mats.darkGraphite);
  techBench.position.set(-7.6, y5 + 0.42, -6.5);
  f5Group.add(techBench);

  // =========================================================================
  // FLOOR 6: EXECUTIVE SKY COMMAND (Smoked Walnut & Champagne-Gold Suite)
  // =========================================================================
  const f6Group = new THREE.Group();
  f6Group.name = 'nexus_floor_6_executive_sky_command';
  root.add(f6Group);
  const y6 = NEXUS_FLOORS[6].floorY;

  const f6Light = new THREE.PointLight(0xfef08a, 1.45, 24, 1.25);
  f6Light.position.set(0.2, y6 + 3.1, 0);
  f6Group.add(f6Light);
  floorLights.push(f6Light);

  // Strategic Overview Table (Centerpiece in Smoked Walnut & Champagne Gold)
  const stratTable = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.4, 0.85, 2.2)), mats.f6SmokedWalnut);
  stratTable.position.set(0.3, y6 + 0.425, 0);
  const stratRim = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.52, 0.06, 2.32)), mats.champagneGold);
  stratRim.position.set(0.3, y6 + 0.85, 0);
  const stratGlass = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.7, 0.04, 1.6)), mats.holoCyanGlass);
  stratGlass.position.set(0.3, y6 + 0.9, 0);
  f6Group.add(stratTable, stratRim, stratGlass);

  // Director Executive Office (NW) + Executive Reception Lounge (SW)
  const execOfficeGlass = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(5.2, 3.1, 0.1)), mats.bronzeSmartGlass);
  execOfficeGlass.position.set(-7.8, y6 + 1.55, 4.2);
  const execDesk = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.8, 0.82, 1.15)), mats.f6SmokedWalnut);
  execDesk.position.set(-7.8, y6 + 0.41, 6.8);
  const execLoungeSofa = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.2, 0.56, 0.95)), mats.darkLeather);
  execLoungeSofa.position.set(-7.8, y6 + 0.28, -6.5);
  f6Group.add(execOfficeGlass, execDesk, execLoungeSofa);

  // =========================================================================
  // FLOOR 7: PLAYER COMPOUND INTELLIGENCE & RADAR (3D Compound Scale Table)
  // =========================================================================
  const f7Group = new THREE.Group();
  f7Group.name = 'nexus_floor_7_compound_radar';
  root.add(f7Group);
  const y7 = NEXUS_FLOORS[7].floorY;

  const f7Light = new THREE.PointLight(0x22d3ee, 1.5, 25, 1.2);
  f7Light.position.set(0.3, y7 + 3.2, 0);
  f7Group.add(f7Light);
  floorLights.push(f7Light);

  // Elevated Circular 3D Compound Radar Table (Center: 0.3, Z: 0)
  const f7Base = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(2.95, 3.3, 0.88, 36)), mats.darkGraphite);
  f7Base.position.set(0.3, y7 + 0.44, 0);
  const f7Plate = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(2.82, 2.82, 0.08, 36)), mats.holoCyanGlass);
  f7Plate.position.set(0.3, y7 + 0.91, 0);
  const f7Rim = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(2.9, 0.06, 10, 48)), mats.cyanLed);
  f7Rim.rotation.x = Math.PI / 2;
  f7Rim.position.set(0.3, y7 + 0.92, 0);
  f7Group.add(f7Base, f7Plate, f7Rim);

  // Miniature 3D Compound Model atop F7 Radar Table (scale ~ 1:35)
  // Compound spans local X[-82..+18] (center -32), Z[-75.5..+51] (center -12.25)
  const scaleCoord = (relX: number, relZ: number): [number, number] => [
    0.3 + ((relX + 32) / 100) * 3.4,
    ((relZ + 12.25) / 126.5) * 4.2,
  ];

  // 3 Miniature Compound Structures
  const [m1x, m1z] = scaleCoord(0, 0);
  const mAurelion = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.95, 0.65, 0.78)), mats.champagneGold);
  mAurelion.position.set(m1x, y7 + 1.28, m1z);

  const [m2x, m2z] = scaleCoord(-48, 24);
  const mNexus = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.75, 0.92, 0.62)), mats.cyanLed);
  mNexus.position.set(m2x, y7 + 1.42, m2z);

  const [m3x, m3z] = scaleCoord(-48, -32);
  const mGarage = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.68, 0.34, 0.48)), mats.silverTitanium);
  mGarage.position.set(m3x, y7 + 1.12, m3z);
  f7Group.add(mAurelion, mNexus, mGarage);

  // 20 Miniature Sentry Tower Beacons along miniature perimeter
  const f7TurretPins: THREE.Mesh[] = [];
  const towerZ = [-69, -56, -43, -30, -17, -6, 6, 20, 34, 46];
  towerZ.forEach((tz) => {
    for (const tx of [-82, 18]) {
      const [px, pz] = scaleCoord(tx, tz);
      const pin = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(0.035, 0.035, 0.24, 6)), mats.amberLed);
      pin.position.set(px, y7 + 1.07, pz);
      f7Group.add(pin);
      f7TurretPins.push(pin);
    }
  });

  // Rotating Holographic Radar Sweep Beam + Live Player Transponder Pin
  const f7SweepArm = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.7, 0.03, 0.06)), mats.cyanLed);
  f7SweepArm.position.set(0.3, y7 + 0.99, 0);
  const f7PlayerPin = new THREE.Mesh(trackGeo(geometries, new THREE.ConeGeometry(0.08, 0.28, 8)), mats.goldLed);
  f7PlayerPin.rotation.x = Math.PI;
  f7PlayerPin.position.set(m2x, y7 + 1.35, m2z);
  f7Group.add(f7SweepArm, f7PlayerPin);

  // =========================================================================
  // FLOOR 8: ZOMBIE OUTBREAK INTELLIGENCE & RADAR (Crown Sky Observatory)
  // =========================================================================
  const f8Group = new THREE.Group();
  f8Group.name = 'nexus_floor_8_outbreak_radar';
  root.add(f8Group);
  const y8 = NEXUS_FLOORS[8].floorY;

  const f8Light = new THREE.PointLight(0xfb7185, 1.45, 25, 1.2);
  f8Light.position.set(0.3, y8 + 3.4, 0);
  f8Group.add(f8Light);
  floorLights.push(f8Light);

  // Central Global Outbreak Globe / Radar Table
  const f8Table = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(2.8, 3.15, 0.88, 36)), mats.darkGraphite);
  f8Table.position.set(0.3, y8 + 0.44, 0);
  const f8Rim = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(2.85, 0.06, 10, 48)), mats.crimsonLed);
  f8Rim.rotation.x = Math.PI / 2;
  f8Rim.position.set(0.3, y8 + 0.9, 0);
  f8Group.add(f8Table, f8Rim);

  const f8GlobeGroup = new THREE.Group();
  f8GlobeGroup.position.set(0.3, y8 + 1.85, 0);
  const globeCore = new THREE.Mesh(trackGeo(geometries, new THREE.SphereGeometry(0.86, 20, 16)), mats.darkGraphite);
  const globeWire = new THREE.Mesh(trackGeo(geometries, new THREE.SphereGeometry(0.92, 16, 12)), mats.holoCrimsonGlass);
  globeWire.material = mats.holoCrimsonGlass;
  const globeEquator = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(1.12, 0.03, 8, 36)), mats.cyanLed);
  globeEquator.rotation.x = Math.PI / 2;
  const f8OrbitRing = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(1.28, 0.03, 8, 40)), mats.amberLed);
  f8OrbitRing.rotation.x = Math.PI / 3;
  f8GlobeGroup.add(globeCore, globeWire, globeEquator, f8OrbitRing);
  f8Group.add(f8GlobeGroup);

  // Scientific Bio-Analysis Stations (SW & SE)
  const bioBenchW = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.8, 0.88, 1.05)), mats.charcoalCore);
  bioBenchW.position.set(-7.6, y8 + 0.44, -6.5);
  const bioPod = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(0.28, 0.32, 0.85, 16)), mats.holoCyanGlass);
  bioPod.position.set(-7.6, y8 + 1.3, -6.5);
  f8Group.add(bioBenchW, bioPod);

  return {
    f5Group,
    f6Group,
    f7Group,
    f8Group,
    f7SweepArm,
    f7PlayerPin,
    f7TurretPins,
    f8GlobeGroup,
    f8OrbitRing,
    floorLights,
    geometries,
  };
}

export function updateNexusUpperFloorVisuals(
  handles: NexusUpperFloorHandles,
  systems: NexusSystems,
  live: NexusLiveContext,
  apartmentOrigin: { x: number; z: number },
  delta: number
): void {
  handles.f7SweepArm.rotation.y = -systems.radarSweepAngle;
  handles.f8GlobeGroup.rotation.y += delta * 0.35;
  handles.f8OrbitRing.rotation.z -= delta * 0.55;

  // Map live player position cleanly onto miniature 3D compound table on Floor 7
  const relX = live.player.position[0] - apartmentOrigin.x;
  const relZ = live.player.position[2] - apartmentOrigin.z;
  const clampedX = Math.max(-85, Math.min(20, relX));
  const clampedZ = Math.max(-78, Math.min(54, relZ));
  handles.f7PlayerPin.position.x = 0.3 + ((clampedX + 32) / 100) * 3.4;
  handles.f7PlayerPin.position.z = ((clampedZ + 12.25) / 126.5) * 4.2;
}
