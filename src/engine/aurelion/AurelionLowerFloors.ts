import * as THREE from 'three';
import {
  AURELION_LEVELS,
  AURELION_ROOMS,
  buildAurelionSlabWithOpenings,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';

export interface AurelionLowerFloorHandles {
  f1Group: THREE.Group;
  f2Group: THREE.Group;
  fanBlades: THREE.Group;
  acLedMat: THREE.MeshBasicMaterial;
  bathroomDoorGroup: THREE.Group;
  bathroomLight: THREE.PointLight;
  bathroomTapMesh: THREE.Group;
  bathroomTapWaterMesh: THREE.Mesh;
  bathroomShowerWaterGroup: THREE.Group;
  bathroomShowerSteamMesh: THREE.Mesh;
  bathroomCabinetDoor: THREE.Group;
  bathtubWaterMesh: THREE.Mesh;
  toiletWaterMesh: THREE.Mesh;
  kitchenStoveBurners: THREE.Mesh[];
  kitchenTapWaterMesh: THREE.Mesh;
  wardrobeLeftDoor: THREE.Group;
  wardrobeRightDoor: THREE.Group;
  bedsideLampLight: THREE.PointLight;
  tvScreenMesh: THREE.Mesh;
  securityScreenMesh: THREE.Mesh;
  wallClockMesh: THREE.Mesh;
  computerScreenMesh: THREE.Mesh;
  f1Lights: THREE.PointLight[];
  f2Lights: THREE.PointLight[];
}

export function buildAurelionLowerFloors(
  parent: THREE.Group,
  mats: AurelionMaterials,
  screenMaterials: {
    tvScreenMat: THREE.MeshBasicMaterial;
    securityScreenTex: THREE.CanvasTexture;
    wallClockTex: THREE.CanvasTexture;
    computerScreenTex: THREE.CanvasTexture;
  }
): AurelionLowerFloorHandles {
  const f1Group = new THREE.Group();
  f1Group.name = 'floor_0_luxury_living';
  const f2Group = new THREE.Group();
  f2Group.name = 'floor_1_private_residence';
  parent.add(f1Group, f2Group);

  const f1Lights: THREE.PointLight[] = [];
  const f2Lights: THREE.PointLight[] = [];

  // =========================================================================
  // FLOOR 1 — GRAND PALACE & RESIDENTIAL RECEPTION (y = 0.245, 15 Rooms)
  // Preserves all original Floor 1 interactive coordinates cleanly!
  // =========================================================================
  const f1Y = AURELION_LEVELS.F1.floorY;
  const f1Slab = buildAurelionSlabWithOpenings(AURELION_LEVELS.F1, mats.honedTravertine, 0.24);
  f1Group.add(f1Slab);

  // Room Plaques for all 15 F1 Rooms
  AURELION_ROOMS.filter((r) => r.level === 'F1').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.44),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#d4b26a')
    );
    plaque.position.set(r.center[0], f1Y + 2.65, r.center[1]);
    f1Group.add(plaque);
  });

  // Warm Walnut Hardwood Zone Inlay in Living/Bedroom Suite
  const walnutInlay = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.02, 9.6), mats.walnutWood);
  walnutInlay.position.set(-2.6, f1Y + 0.01, 1.8);
  walnutInlay.receiveShadow = true;
  f1Group.add(walnutInlay);

  // Architectural Partition Walls (leaving generous 1.8m+ walk openings)
  for (const [px, pz, pw, pd] of [
    [-3.8, 3.2, 0.22, 6.4],   // Bedroom/Living divider
    [-9.2, -3.5, 0.22, 12.0], // West Wing transition divider (open arch at Z=+2..+5)
    [8.2, -5.5, 0.22, 9.0],   // East Wing formal lounge divider
  ] as const) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(pw, 3.3, pd), mats.warmLimestone);
    part.position.set(px, f1Y + 1.65, pz);
    f1Group.add(part);
  }

  // 1. Primary Residential Bedroom Suite at (-5.5, 3.8) (Preserved Prologue spawn & sleep coords)
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.35, 2.6), mats.walnutWood);
  bedFrame.position.set(-5.5, f1Y + 0.18, 3.8);
  const bedMattress = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 2.3), mats.creamBoucle);
  bedMattress.position.set(-5.5, f1Y + 0.46, 3.8);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.25, 0.16), mats.charcoalVelvet);
  headboard.position.set(-5.5, f1Y + 0.85, 5.05);
  f1Group.add(bedFrame, bedMattress, headboard);

  // Bedside Nightstand & Lamp (-7.2, 4.8)
  const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.56, 0.68), mats.walnutWood);
  nightstand.position.set(-7.2, f1Y + 0.28, 4.8);
  const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.28, 16), mats.warmSconce);
  lampShade.position.set(-7.2, f1Y + 0.88, 4.8);
  const bedsideLampLight = new THREE.PointLight(0xffd296, 1.4, 7, 1.6);
  bedsideLampLight.position.set(-7.2, f1Y + 1.15, 4.8);
  f1Lights.push(bedsideLampLight);
  f1Group.add(nightstand, lampShade, bedsideLampLight);

  // Animated Double Wardrobe (-7.2, 1.4)
  const wardrobeGroup = new THREE.Group();
  wardrobeGroup.position.set(-7.2, f1Y, 1.4);
  const wBody = new THREE.Mesh(new THREE.BoxGeometry(0.85, 2.25, 1.55), mats.walnutWood);
  wBody.position.y = 1.125;
  const wardrobeLeftDoor = new THREE.Group();
  wardrobeLeftDoor.position.set(0.43, 1.125, -0.76);
  const wDoorLMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.15, 0.74), mats.oakWood);
  wDoorLMesh.position.z = 0.37;
  wardrobeLeftDoor.add(wDoorLMesh);
  const wardrobeRightDoor = new THREE.Group();
  wardrobeRightDoor.position.set(0.43, 1.125, 0.76);
  const wDoorRMesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.15, 0.74), mats.oakWood);
  wDoorRMesh.position.z = -0.37;
  wardrobeRightDoor.add(wDoorRMesh);
  wardrobeGroup.add(wBody, wardrobeLeftDoor, wardrobeRightDoor);
  f1Group.add(wardrobeGroup);

  // Study Computer Desk (-3.5, 0.6)
  const compDesk = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.76, 0.82), mats.walnutWood);
  compDesk.position.set(-3.5, f1Y + 0.38, 0.6);
  const compMon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.54, 0.06), mats.charcoalTitanium);
  compMon.position.set(-3.5, f1Y + 1.08, 0.88);
  const compScreenMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: screenMaterials.computerScreenTex }));
  const computerScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.48), compScreenMat);
  computerScreenMesh.position.set(-3.5, f1Y + 1.08, 0.845);
  computerScreenMesh.rotation.y = Math.PI;
  f1Group.add(compDesk, compMon, computerScreenMesh);

  // 2. Main Luxury Living Room: Sofa (0, 0.5), Coffee Table + Phone (0.3, -1.2), Smart TV (-5.5, 0), Clock (-1.2, -1.8)
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.52, 1.08), mats.creamBoucle);
  sofaBase.position.set(0, f1Y + 0.26, 0.5);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.48, 0.24), mats.creamBoucle);
  sofaBack.position.set(0, f1Y + 0.68, 0.94);
  const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.38, 0.92), mats.whiteMarble);
  coffeeTable.position.set(0, f1Y + 0.19, -1.2);
  const phoneMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 0.24), mats.charcoalTitanium);
  phoneMesh.position.set(0.3, f1Y + 0.4, -1.2);
  f1Group.add(sofaBase, sofaBack, coffeeTable, phoneMesh);

  const tvCredenza = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.55, 0.56), mats.walnutWood);
  tvCredenza.position.set(-5.5, f1Y + 0.275, 0.0);
  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(2.15, 1.24, 0.08), mats.charcoalTitanium);
  tvBezel.position.set(-5.5, f1Y + 1.38, 0.0);
  const tvScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.04, 1.14), screenMaterials.tvScreenMat);
  tvScreenMesh.position.set(-5.5, f1Y + 1.38, -0.045);
  tvScreenMesh.rotation.y = Math.PI;
  f1Group.add(tvCredenza, tvBezel, tvScreenMesh);

  const wallClockMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: screenMaterials.wallClockTex }));
  const wallClockMesh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), wallClockMat);
  wallClockMesh.position.set(-1.2, f1Y + 2.1, -1.8);
  f1Group.add(wallClockMesh);

  // Ceiling Fan + AC Unit
  const fanGroup = new THREE.Group();
  fanGroup.position.set(0, f1Y + 3.18, 0.5);
  const fanHub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.24, 12), mats.champagneGold);
  const fanBlades = new THREE.Group();
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.03, 0.16), mats.walnutWood);
    blade.rotation.y = (b * Math.PI) / 2;
    blade.position.set(Math.cos((b * Math.PI) / 2) * 0.55, -0.08, Math.sin((b * Math.PI) / 2) * 0.55);
    fanBlades.add(blade);
  }
  fanGroup.add(fanHub, fanBlades);
  f1Group.add(fanGroup);

  const acBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.28), mats.porcelain);
  acBody.position.set(-2.5, f1Y + 2.65, -6.5);
  const acLedMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ color: 0x00ff88 }));
  const acLed = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), acLedMat);
  acLed.position.set(-1.95, f1Y + 2.55, -6.34);
  f1Group.add(acBody, acLed);

  // 3. Security Desk (2.38, -0.5) & First-Aid Medical Bed (3.6, -5.2)
  const secDeskF1 = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.92, 3.2), mats.charcoalTitanium);
  secDeskF1.position.set(2.38, f1Y + 0.46, -0.5);
  const secScreenMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: screenMaterials.securityScreenTex }));
  const securityScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.45), secScreenMat);
  securityScreenMesh.position.set(2.38, f1Y + 1.65, -0.5);
  securityScreenMesh.rotation.y = -Math.PI / 2;
  const f1MedBed = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.6, 1.05), mats.medicalWhite);
  f1MedBed.position.set(3.6, f1Y + 0.3, -5.2);
  f1Group.add(secDeskF1, securityScreenMesh, f1MedBed);

  // 4. Grand Dining Hall (2.2, 1.2) + Kitchen Counter (5.8, 3.2) + Stove (5.8, 4.6) + Fridge (4.5, 5.8)
  const diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.78, 1.2), mats.whiteMarble);
  diningTable.position.set(2.2, f1Y + 0.39, 1.2);
  f1Group.add(diningTable);
  for (const [cx, cz] of [
    [1.6, 0.45],
    [2.8, 0.45],
    [1.6, 1.95],
    [2.8, 1.95],
  ] as const) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.82, 0.44), mats.creamBoucle);
    ch.position.set(cx, f1Y + 0.41, cz);
    f1Group.add(ch);
  }

  const kCounter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 1.0), mats.whiteMarble);
  kCounter.position.set(5.8, f1Y + 0.45, 3.2);
  const kitchenTapWaterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 0.32, 8), mats.poolWater);
  kitchenTapWaterMesh.position.set(5.8, f1Y + 1.05, 2.75);
  kitchenTapWaterMesh.visible = false;
  const stoveBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.92, 1.1), mats.charcoalTitanium);
  stoveBody.position.set(5.8, f1Y + 0.46, 4.6);
  const kitchenStoveBurners: THREE.Mesh[] = [];
  for (const [bx, bz] of [
    [-0.26, -0.26],
    [0.26, -0.26],
    [-0.26, 0.26],
    [0.26, 0.26],
  ] as const) {
    const burner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.03, 14),
      mats.trackCustomMaterial(new THREE.MeshStandardMaterial({ color: 0x222222 }))
    );
    burner.position.set(5.8 + bx, f1Y + 0.94, 4.6 + bz);
    kitchenStoveBurners.push(burner);
    f1Group.add(burner);
  }
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.15, 2.15, 0.98), mats.silverTitanium);
  fridge.position.set(4.5, f1Y + 1.08, 5.8);
  f1Group.add(kCounter, kitchenTapWaterMesh, stoveBody, fridge);

  // 5. Complete 10-Fixture Guest Bathroom (-7.5..-3.2, -6.6..-3.2)
  const bWallN = new THREE.Mesh(new THREE.BoxGeometry(3.9, 2.8, 0.2), mats.warmLimestone);
  bWallN.position.set(-5.45, f1Y + 1.4, -3.2);
  const bWallE = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.8, 1.8), mats.warmLimestone);
  bWallE.position.set(-3.5, f1Y + 1.4, -5.7);
  const bathroomDoorGroup = new THREE.Group();
  bathroomDoorGroup.position.set(-3.5, f1Y, -3.62);
  const bathDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.25, 0.92), mats.walnutWood);
  bathDoorLeaf.position.set(0, 1.125, -0.46);
  bathroomDoorGroup.add(bathDoorLeaf);
  const bathroomLight = new THREE.PointLight(0xfff5e4, 1.6, 8, 1.5);
  bathroomLight.position.set(-5.2, f1Y + 2.45, -4.8);
  f1Lights.push(bathroomLight);

  const vanity = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.88, 0.65), mats.walnutWood);
  vanity.position.set(-4.5, f1Y + 0.44, -3.55);
  const bathroomTapMesh = new THREE.Group();
  bathroomTapMesh.position.set(-4.5, f1Y + 0.95, -3.45);
  const faucetSpout = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.16), mats.silverTitanium);
  bathroomTapMesh.add(faucetSpout);
  const bathroomTapWaterMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.24, 8), mats.poolWater);
  bathroomTapWaterMesh.position.set(-4.5, f1Y + 0.82, -3.52);
  bathroomTapWaterMesh.visible = false;

  const bathroomCabinetDoor = new THREE.Group();
  bathroomCabinetDoor.position.set(-5.6, f1Y + 1.55, -3.35);
  const cabDoorLeaf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.06), mats.silverTitanium);
  cabDoorLeaf.position.x = 0.35;
  bathroomCabinetDoor.add(cabDoorLeaf);

  const bathtub = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.65, 1.8), mats.porcelain);
  bathtub.position.set(-6.5, f1Y + 0.325, -5.7);
  const bathtubWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.55), mats.poolWater);
  bathtubWaterMesh.rotation.x = -Math.PI / 2;
  bathtubWaterMesh.position.set(-6.5, f1Y + 0.62, -5.7);

  const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.25, 1.3), mats.clearBalustradeGlass);
  showerGlass.position.set(-6.1, f1Y + 1.15, -3.95);
  const bathroomShowerWaterGroup = new THREE.Group();
  bathroomShowerWaterGroup.position.set(-6.75, f1Y + 2.1, -3.95);
  for (let d = 0; d < 6; d++) {
    const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), mats.poolWater);
    drop.position.set(((d % 3) - 1) * 0.18, -0.8, (Math.floor(d / 3) - 0.5) * 0.22);
    bathroomShowerWaterGroup.add(drop);
  }
  bathroomShowerWaterGroup.visible = false;
  const bathroomShowerSteamMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.58, 12, 10),
    mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 }))
  );
  bathroomShowerSteamMesh.position.set(-6.75, f1Y + 1.4, -3.95);
  bathroomShowerSteamMesh.visible = false;

  const toilet = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.85, 0.72), mats.porcelain);
  toilet.position.set(-4.4, f1Y + 0.425, -6.0);
  const toiletWaterMesh = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), mats.poolWater);
  toiletWaterMesh.rotation.x = -Math.PI / 2;
  toiletWaterMesh.position.set(-4.4, f1Y + 0.48, -5.85);

  f1Group.add(
    bWallN,
    bWallE,
    bathroomDoorGroup,
    bathroomLight,
    vanity,
    bathroomTapMesh,
    bathroomTapWaterMesh,
    bathroomCabinetDoor,
    bathtub,
    bathtubWaterMesh,
    showerGlass,
    bathroomShowerWaterGroup,
    bathroomShowerSteamMesh,
    toilet,
    toiletWaterMesh
  );

  // 6. Expanded F1 Wings: Botanical Conservatory (-11.5, 7.5), West Family Lounge (-11.5, -2.5), East Reception (11.2, -7.5)
  for (const bz of [5.5, 9.2]) {
    const planter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.55, 1.3), mats.honedTravertine);
    planter.position.set(-11.8, f1Y + 0.28, bz);
    const bush = new THREE.Mesh(new THREE.SphereGeometry(0.75, 12, 10), mats.lushFoliage);
    bush.position.set(-11.8, f1Y + 0.95, bz);
    f1Group.add(planter, bush);
  }
  const westLoungeSofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 1.15), mats.charcoalVelvet);
  westLoungeSofa.position.set(-12.2, f1Y + 0.36, -2.5);
  const conciergeDesk = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.05, 0.95), mats.honedTravertine);
  conciergeDesk.position.set(11.2, f1Y + 0.52, -7.5);
  f1Group.add(westLoungeSofa, conciergeDesk);

  for (const [lx, lz] of [
    [-11, 0],
    [0, -6],
    [0, 6],
    [11, 0],
  ] as const) {
    const l = new THREE.PointLight(0xffe9c8, 1.35, 18, 1.3);
    l.position.set(lx, f1Y + 3.1, lz);
    f1Lights.push(l);
    f1Group.add(l);
  }

  // =========================================================================
  // FLOOR 2 — PRIVATE RESIDENTIAL PALACE (y = 4.00, 14 Rooms)
  // =========================================================================
  const f2Y = AURELION_LEVELS.F2.floorY;
  const f2Slab = buildAurelionSlabWithOpenings(AURELION_LEVELS.F2, mats.walnutWood, 0.24);
  f2Group.add(f2Slab);

  AURELION_ROOMS.filter((r) => r.level === 'F2').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.45, 0.44),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#e9c77b')
    );
    plaque.position.set(r.center[0], f2Y + 2.65, r.center[1]);
    f2Group.add(plaque);
  });

  // Master Principal Bedroom (-11.2, 6.2) with King Canopy Bed
  const masterBed = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 2.8), mats.walnutWood);
  masterBed.position.set(-11.5, f2Y + 0.28, 6.2);
  const masterMattress = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 2.55), mats.creamBoucle);
  masterMattress.position.set(-11.5, f2Y + 0.62, 6.2);
  f2Group.add(masterBed, masterMattress);

  // Master Spa Bath (-11.2, -1.5): Soaking Tub + Double Vanity
  const mTub = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.66, 2.2), mats.porcelain);
  mTub.position.set(-12.2, f2Y + 0.33, -1.5);
  const mTubWater = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.9), mats.poolWater);
  mTubWater.rotation.x = -Math.PI / 2;
  mTubWater.position.set(-12.2, f2Y + 0.67, -1.5);
  f2Group.add(mTub, mTubWater);

  // Walk-In Wardrobe (-11.2, -7.8)
  for (const wz of [-9.4, -6.2]) {
    const closet = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.3, 0.75), mats.walnutWood);
    closet.position.set(-11.5, f2Y + 1.15, wz);
    f2Group.add(closet);
  }

  // Three Assigned Companion Suites (Marcus, Chloe, Maya) along East Wing
  for (const [sz, accent] of [
    [-7.6, mats.champagneGold],
    [-1.0, mats.cyanTelemetry],
    [8.2, mats.medicalAccent],
  ] as const) {
    const cBed = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.5, 2.2), mats.oakWood);
    cBed.position.set(12.2, f2Y + 0.25, sz);
    const cMat = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.25, 2.0), mats.creamBoucle);
    cMat.position.set(12.2, f2Y + 0.58, sz);
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 1.2), accent);
    badge.position.set(10.2, f2Y + 1.5, sz);
    f2Group.add(cBed, cMat, badge);
  }

  // Executive Reading Library (0, 8.2) & Private Study (-5.8, -8.2)
  for (const lx of [-1.8, 0, 1.8]) {
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.4, 0.55), mats.walnutWood);
    shelf.position.set(lx, f2Y + 1.2, 10.6);
    f2Group.add(shelf);
  }
  const studyDesk = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.78, 0.95), mats.walnutWood);
  studyDesk.position.set(-5.8, f2Y + 0.39, -8.2);
  const studyScreen = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.55, 0.06), mats.cyanTelemetry);
  studyScreen.position.set(-5.8, f2Y + 1.08, -8.45);
  const libLectern = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.05, 0.7), mats.honedTravertine);
  libLectern.position.set(0, f2Y + 0.52, 8.2);
  f2Group.add(studyDesk, studyScreen, libLectern);

  for (const [lx, lz] of [
    [-11, 4],
    [-11, -6],
    [0, 8],
    [11, 0],
  ] as const) {
    const l = new THREE.PointLight(0xffe9c8, 1.25, 17, 1.3);
    l.position.set(lx, f2Y + 2.9, lz);
    f2Lights.push(l);
    f2Group.add(l);
  }

  return {
    f1Group,
    f2Group,
    fanBlades,
    acLedMat,
    bathroomDoorGroup,
    bathroomLight,
    bathroomTapMesh,
    bathroomTapWaterMesh,
    bathroomShowerWaterGroup,
    bathroomShowerSteamMesh,
    bathroomCabinetDoor,
    bathtubWaterMesh,
    toiletWaterMesh,
    kitchenStoveBurners,
    kitchenTapWaterMesh,
    wardrobeLeftDoor,
    wardrobeRightDoor,
    bedsideLampLight,
    tvScreenMesh,
    securityScreenMesh,
    wallClockMesh,
    computerScreenMesh,
    f1Lights,
    f2Lights,
  };
}
