import * as THREE from 'three';
import {
  AURELION_LEVELS,
  AURELION_ROOMS,
  buildAurelionSlabWithOpenings,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';
import { AurelionMansionSystems } from './AurelionSystems';

export interface AurelionUpperFloorHandles {
  f3Group: THREE.Group;
  f4Group: THREE.Group;
  f5Group: THREE.Group;
  hydroPlantMeshes: THREE.Mesh[];
  f3Lights: THREE.PointLight[];
  f4Lights: THREE.PointLight[];
  f5Lights: THREE.PointLight[];
}

export function buildAurelionUpperFloors(
  parent: THREE.Group,
  mats: AurelionMaterials
): AurelionUpperFloorHandles {
  const f3Group = new THREE.Group();
  f3Group.name = 'floor_2_medical_and_survival';
  const f4Group = new THREE.Group();
  f4Group.name = 'floor_3_self_sufficiency';
  const f5Group = new THREE.Group();
  f5Group.name = 'floor_4_agricultural_sky_garden';
  parent.add(f3Group, f4Group, f5Group);

  const f3Lights: THREE.PointLight[] = [];
  const f4Lights: THREE.PointLight[] = [];
  const f5Lights: THREE.PointLight[] = [];

  // =========================================================================
  // FLOOR 3 — PRIVATE MEDICAL & WELLNESS CENTRE (y = 7.60, 12 Rooms)
  // =========================================================================
  const f3Y = AURELION_LEVELS.F3.floorY;
  f3Group.add(buildAurelionSlabWithOpenings(AURELION_LEVELS.F3, mats.medicalWhite, 0.24));

  AURELION_ROOMS.filter((r) => r.level === 'F3').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.44),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#10b981')
    );
    plaque.position.set(r.center[0], f3Y + 2.65, r.center[1]);
    f3Group.add(plaque);
  });

  // Medical Reception Desk (1.5, -8.2)
  const medDesk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.02, 0.9), mats.medicalWhite);
  medDesk.position.set(1.5, f3Y + 0.51, -8.2);
  const medCross = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.08), mats.medicalAccent);
  medCross.position.set(1.5, f3Y + 0.65, -8.68);
  f3Group.add(medDesk, medCross);

  // Surgical OR Suite (-11.2, 6.2) & Emergency Care Bay (-11.2, -1.0)
  for (const [bx, bz] of [
    [-11.2, 6.2],
    [-11.2, -1.0],
    [-5.8, 7.6],
    [0.0, 7.6],
    [11.2, 7.8],
  ] as const) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.62, 1.05), mats.medicalWhite);
    bed.position.set(bx, f3Y + 0.31, bz);
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.08), mats.cyanTelemetry);
    monitor.position.set(bx - 1.15, f3Y + 1.35, bz);
    const o2Tank = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.05, 10), mats.medicalAccent);
    o2Tank.position.set(bx + 1.15, f3Y + 0.52, bz + 0.45);
    f3Group.add(bed, monitor, o2Tank);
  }

  // Diagnostic MRI Scanner Ring (-11.2, -7.8)
  const mriGantry = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.32, 14, 28), mats.medicalWhite);
  mriGantry.position.set(-11.2, f3Y + 1.25, -7.8);
  const mriTable = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.72, 2.2), mats.silverTitanium);
  mriTable.position.set(-11.2, f3Y + 0.36, -7.2);
  f3Group.add(mriGantry, mriTable);

  // Pharmacy & Supply Cabinets (11.2, -7.8..-1.5) + Rehab Treadmill (-5.8, -8.2)
  for (let i = 0; i < 4; i++) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.2, 1.3), mats.silverTitanium);
    cab.position.set(13.2, f3Y + 1.1, -8.6 + i * 2.2);
    f3Group.add(cab);
  }
  const rehabBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.98, 1.1), mats.industrialSteel);
  rehabBar.position.set(-5.8, f3Y + 0.49, -8.2);
  f3Group.add(rehabBar);

  for (const [lx, lz] of [
    [-11, 4],
    [-11, -6],
    [0, 8],
    [11, 0],
  ] as const) {
    const l = new THREE.PointLight(0xecfeff, 1.45, 18, 1.3);
    l.position.set(lx, f3Y + 2.95, lz);
    f3Lights.push(l);
    f3Group.add(l);
  }

  // =========================================================================
  // FLOOR 4 — EQUIPMENT, STORAGE & MAINTENANCE (y = 11.20, 12 Rooms)
  // =========================================================================
  const f4Y = AURELION_LEVELS.F4.floorY;
  f4Group.add(buildAurelionSlabWithOpenings(AURELION_LEVELS.F4, mats.graphiteStone, 0.24));

  AURELION_ROOMS.filter((r) => r.level === 'F4').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.44),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#f59e0b')
    );
    plaque.position.set(r.center[0], f4Y + 2.65, r.center[1]);
    f4Group.add(plaque);
  });

  // Biometric Armory Vault (-11.2, 0.0) & Protective Gear Lockers (-11.2, -7.8 / 7.8)
  const vaultDoor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.55, 0.45), mats.industrialSteel);
  vaultDoor.position.set(-9.0, f4Y + 1.28, 0.0);
  const vaultLock = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.52, 16), mats.champagneGold);
  vaultLock.rotation.z = Math.PI / 2;
  vaultLock.position.set(-9.0, f4Y + 1.3, 0.0);
  const armoryTerminal = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 1.08, 16), mats.charcoalTitanium);
  armoryTerminal.position.set(-11.2, f4Y + 0.54, 0.0);
  const armoryHolo = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.08), mats.cyanTelemetry);
  armoryHolo.position.set(-11.2, f4Y + 1.4, 0.0);
  f4Group.add(vaultDoor, vaultLock, armoryTerminal, armoryHolo);

  const lockerMatrices: THREE.Matrix4[] = [];
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Matrix4().makeTranslation(-13.6, f4Y + 1.15, -9.8 + i * 1.75);
    m.scale(new THREE.Vector3(1.1, 2.3, 1.35));
    lockerMatrices.push(m);
  }
  const lockerInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.industrialSteel, lockerMatrices.length);
  lockerMatrices.forEach((m, i) => lockerInst.setMatrixAt(i, m));
  lockerInst.instanceMatrix.needsUpdate = true;
  lockerInst.computeBoundingSphere();
  f4Group.add(lockerInst);

  // Maintenance Workshop & Issue Counter (11.2, -7.8..-1.2 & 0, -8.2)
  const f4Bench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 1.05), mats.walnutWood);
  f4Bench.position.set(11.6, f4Y + 0.46, -7.8);
  const issueCounter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.02, 0.95), mats.charcoalTitanium);
  issueCounter.position.set(0.0, f4Y + 0.51, -8.2);
  f4Group.add(f4Bench, issueCounter);

  for (const [lx, lz] of [
    [-11, 0],
    [0, 8],
    [0, -8],
    [11, 0],
  ] as const) {
    const l = new THREE.PointLight(0xfef3c7, 1.3, 17, 1.3);
    l.position.set(lx, f4Y + 2.95, lz);
    f4Lights.push(l);
    f4Group.add(l);
  }

  // =========================================================================
  // FLOOR 5 — AGRICULTURAL & FOOD PRODUCTION GARDEN (y = 14.80, 12 Rooms)
  // Indoor Envelope: 24.8 x 20.4m + Stepped Sky Garden Perimeter Terraces
  // =========================================================================
  const f5Y = AURELION_LEVELS.F5.floorY;
  f5Group.add(buildAurelionSlabWithOpenings(AURELION_LEVELS.F5, mats.honedTravertine, 0.24));

  // Stepped Outer Sky Garden Terrace Deck Wings surrounding F5 Core (X in [-15..-12.4] & [12.4..15], Z in [-12..12])
  for (const [tx, tz, tw, td] of [
    [-13.7, 0, 2.6, 24.0],
    [13.7, 0, 2.6, 24.0],
    [0, -11.1, 24.8, 1.8],
    [0, 11.1, 24.8, 1.8],
  ] as const) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(tw, 0.22, td), mats.honedTravertine);
    deck.position.set(tx, f5Y - 0.11, tz);
    deck.receiveShadow = true;
    f5Group.add(deck);
  }

  // Stepped Sky Garden Trees & Planters along West/East Outer Terraces
  for (const side of [-1, 1]) {
    for (const tz of [-8.0, -2.5, 3.0, 8.2]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.55, 2.2), mats.graphiteStone);
      box.position.set(side * 13.7, f5Y + 0.28, tz);
      const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 8), mats.lushFoliage);
      canopy.position.set(side * 13.7, f5Y + 1.2, tz);
      f5Group.add(box, canopy);
    }
  }

  AURELION_ROOMS.filter((r) => r.level === 'F5').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.44),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#22c55e')
    );
    plaque.position.set(r.center[0], f5Y + 2.65, r.center[1]);
    f5Group.add(plaque);
  });

  // 12 Interactive Vertical Hydroponic Grow Towers (West & Center Conservatory)
  const hydroPlantMeshes: THREE.Mesh[] = [];
  for (let i = 0; i < 12; i++) {
    const col = Math.floor(i / 4);
    const row = i % 4;
    const hx = -9.6 + col * 3.1;
    const hz = -4.2 + row * 2.8;

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.95, 0.95), mats.charcoalTitanium);
    frame.position.set(hx, f5Y + 0.98, hz);
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 0.8), mats.industrialSteel);
    trough.position.set(hx, f5Y + 0.85, hz);
    const growLight = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.06, 0.25), mats.hydroGrowStrip);
    growLight.position.set(hx, f5Y + 1.9, hz);

    const plantMat = mats.trackCustomMaterial(
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.78 })
    );
    const plantMesh = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.48, 0.7), plantMat);
    plantMesh.position.set(hx, f5Y + 1.2, hz);
    hydroPlantMeshes.push(plantMesh);

    f5Group.add(frame, trough, growLight, plantMesh);
  }

  // Cold Storage Walk-In Unit (5.5, 7.2) & Nutrient Manifold (-2.5, -7.2)
  const coldRoom = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 1.6), mats.silverTitanium);
  coldRoom.position.set(5.5, f5Y + 1.2, 7.8);
  const nutrientSkid = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.0), mats.cyanTelemetry);
  nutrientSkid.position.set(-2.5, f5Y + 0.7, -7.6);
  f5Group.add(coldRoom, nutrientSkid);

  for (const [lx, lz] of [
    [-8, 0],
    [0, 0],
    [8, 0],
    [0, 7],
  ] as const) {
    const l = new THREE.PointLight(0xf3e8ff, 1.35, 16, 1.3);
    l.position.set(lx, f5Y + 2.95, lz);
    f5Lights.push(l);
    f5Group.add(l);
  }

  return {
    f3Group,
    f4Group,
    f5Group,
    hydroPlantMeshes,
    f3Lights,
    f4Lights,
    f5Lights,
  };
}

export function syncAurelionHydroponicsVisual(
  handles: AurelionUpperFloorHandles,
  systems: AurelionMansionSystems
) {
  systems.hydroBeds.forEach((bed, idx) => {
    const mesh = handles.hydroPlantMeshes[idx];
    if (!mesh) return;
    const mat = mesh.material as THREE.MeshStandardMaterial;
    if (bed.stage === 0) {
      mesh.scale.set(1.0, 0.25, 1.0);
      mat.color.setHex(0x4b382a); // Tilled dark substrate
      mat.emissive.setHex(0x000000);
    } else if (bed.stage === 1) {
      mesh.scale.set(0.8, 0.45, 0.8);
      mat.color.setHex(0x65a30d);
      mat.emissive.setHex(0x000000);
    } else if (bed.stage === 2) {
      mesh.scale.set(0.95, 0.85, 0.95);
      mat.color.setHex(0x22c55e);
      mat.emissive.setHex(0x000000);
    } else {
      mesh.scale.set(1.05, 1.22, 1.05);
      mat.color.setHex(bed.cropType === 'berries' ? 0xa855f7 : bed.cropType === 'herbs' ? 0x10b981 : 0x4ade80);
      mat.emissive.setHex(0x166534);
      mat.emissiveIntensity = 0.35;
    }
  });
}
