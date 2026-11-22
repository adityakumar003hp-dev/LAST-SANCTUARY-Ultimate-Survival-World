import * as THREE from 'three';
import {
  getSkinPBR,
  getFabricPBR,
  getZombieFleshPBR,
  getBrushedMetalPBR,
} from '../../utils/proceduralTextures';

export type HumanoidHairStyle =
  | 'short'
  | 'parted'
  | 'ponytail'
  | 'bun'
  | 'long'
  | 'beanie'
  | 'station_master_cap'
  | 'conductor_cap'
  | 'beret'
  | 'fedora'
  | 'turban'
  | 'bandana'
  | 'none';

export interface HumanoidBuildOptions {
  facing?: '-Z' | '+Z';
  skinColor?: number;
  jacketColor?: number;
  shirtColor?: number;
  pantsColor?: number;
  bootColor?: number;
  hairColor?: number;
  accentColor?: number;
  eyeColor?: number;
  fabricStyle?: 'tactical' | 'denim' | 'wool' | 'leather' | 'uniform';
  genderPresentation?: 'masculine' | 'feminine' | 'neutral';
  hairStyle?: HumanoidHairStyle;
  hasBackpack?: boolean;
  packColor?: number;
  hasBandana?: boolean;
  bandanaColor?: number;
  hasBeard?: boolean;
  hasStethoscope?: boolean;
  hasHeadset?: boolean;
  hasHolster?: boolean;
  hasMedicArmband?: boolean;
  hasBelt?: boolean;
  armAliasStyle?: 'full' | 'short'; // full = leftArm/rightArm, short = lArm/rArm
  initialRightArmPitch?: number;
  castShadow?: boolean;
  name?: string;
}

export interface RealisticHumanoidRig {
  group: THREE.Group;
  torsoMesh: THREE.Mesh;
  headMesh: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

// ============================================================================
// MODULE-CACHED SHARED ANATOMICAL GEOMETRIES & POOLED MATERIALS
// ============================================================================

interface SharedHumanoidGeometries {
  neck: THREE.LatheGeometry;
  torsoMasc: THREE.LatheGeometry;
  torsoFem: THREE.LatheGeometry;
  pelvis: THREE.LatheGeometry;
  shoulderCap: THREE.SphereGeometry;
  armUpper: THREE.LatheGeometry;
  armFore: THREE.LatheGeometry;
  legThigh: THREE.LatheGeometry;
  legShin: THREE.LatheGeometry;
  cranium: THREE.SphereGeometry;
  jaw: THREE.SphereGeometry;
  noseBridge: THREE.ConeGeometry;
  ear: THREE.SphereGeometry;
  eyeSclera: THREE.SphereGeometry;
  eyeIris: THREE.SphereGeometry;
  eyePupil: THREE.SphereGeometry;
  lip: THREE.CapsuleGeometry;
  brow: THREE.BoxGeometry;
  palm: THREE.BoxGeometry;
  finger: THREE.CapsuleGeometry;
  bootUpper: THREE.LatheGeometry;
  bootToe: THREE.SphereGeometry;
  bootSole: THREE.BoxGeometry;
  hairCap: THREE.SphereGeometry;
  belt: THREE.CylinderGeometry;
  buckle: THREE.BoxGeometry;
  collarWing: THREE.BoxGeometry;
  pocket: THREE.BoxGeometry;
  button: THREE.CylinderGeometry;
  packMain: THREE.BoxGeometry;
  packRoll: THREE.CylinderGeometry;
  packStrap: THREE.BoxGeometry;
}

let cachedGeos: SharedHumanoidGeometries | null = null;
const matCache = new Map<string, THREE.Material>();

function createLatheProfile(points: Array<[number, number]>, segments = 14): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(Math.max(0.002, r), y));
  const geo = new THREE.LatheGeometry(vecs, segments);
  geo.computeVertexNormals();
  return geo;
}

function getSharedGeos(): SharedHumanoidGeometries {
  if (cachedGeos) return cachedGeos;

  // 1. Sculpted anatomical torso (base at y = -0.32, shoulders at y = +0.30, normalized for 1.8m frame)
  const torsoMasc = createLatheProfile([
    [0.005, -0.34],
    [0.185, -0.32], // hips/belt
    [0.175, -0.14], // waist taper
    [0.215, 0.06],  // lower ribcage
    [0.245, 0.21],  // broad pectoral chest
    [0.205, 0.30],  // trapezius slope
    [0.075, 0.33],  // collarbone opening
  ], 16);
  torsoMasc.scale(1.16, 1.0, 0.72); // wider across chest/shoulders, natural chest depth

  const torsoFem = createLatheProfile([
    [0.005, -0.34],
    [0.195, -0.32], // sculpted hip flare
    [0.152, -0.11], // narrower waist
    [0.195, 0.09],  // chest contour
    [0.208, 0.21],  // upper chest
    [0.175, 0.30],
    [0.068, 0.33],
  ], 16);
  torsoFem.scale(1.08, 1.0, 0.72);

  const pelvis = createLatheProfile([
    [0.005, -0.12],
    [0.14, -0.10],
    [0.185, 0.0],
    [0.178, 0.11],
    [0.005, 0.12],
  ], 14);
  pelvis.scale(1.15, 1.0, 0.76);

  const neck = createLatheProfile([
    [0.088, -0.06],
    [0.068, 0.0],
    [0.064, 0.08],
    [0.068, 0.13],
  ], 12);

  // 2. Sculpted upper arm & forearm (pivot at shoulder y=0, total length ~0.64m downward)
  const armUpper = createLatheProfile([
    [0.072, -0.02], // deltoid
    [0.068, -0.12], // bicep swell
    [0.056, -0.26], // elbow taper
    [0.050, -0.32],
  ], 12);
  const armFore = createLatheProfile([
    [0.056, -0.30], // upper forearm
    [0.058, -0.38], // brachioradialis
    [0.044, -0.54], // wrist taper
    [0.038, -0.58],
  ], 12);

  // 3. Sculpted thigh & calf/shin (pivot at hip y=0, ankle at y=-0.65m)
  const legThigh = createLatheProfile([
    [0.098, 0.02],  // hip socket
    [0.096, -0.12], // quadriceps
    [0.084, -0.28], // lower thigh
    [0.072, -0.36], // knee
  ], 12);
  const legShin = createLatheProfile([
    [0.074, -0.34], // knee cap
    [0.078, -0.44], // calf muscle swell
    [0.060, -0.58], // lower shin
    [0.054, -0.65], // ankle
  ], 12);

  // 4. Anatomical boots
  const bootUpper = createLatheProfile([
    [0.066, 0.0],
    [0.068, 0.07],
    [0.072, 0.14],
    [0.066, 0.16],
  ], 12);
  bootUpper.scale(1.0, 1.0, 1.25);

  const cranium = new THREE.SphereGeometry(0.148, 18, 14);
  cranium.scale(0.92, 1.08, 1.0);

  const jaw = new THREE.SphereGeometry(0.118, 14, 10);
  jaw.scale(0.84, 0.85, 0.96);

  const finger = new THREE.CapsuleGeometry(0.011, 0.042, 3, 6);
  const packMain = new THREE.BoxGeometry(0.36, 0.44, 0.17);
  const bootToe = new THREE.SphereGeometry(0.076, 12, 8);
  bootToe.scale(0.95, 0.65, 1.45);

  cachedGeos = {
    neck,
    torsoMasc,
    torsoFem,
    pelvis,
    shoulderCap: new THREE.SphereGeometry(0.086, 12, 10),
    armUpper,
    armFore,
    legThigh,
    legShin,
    cranium,
    jaw,
    noseBridge: new THREE.ConeGeometry(0.024, 0.064, 6),
    ear: new THREE.SphereGeometry(0.032, 8, 8),
    eyeSclera: new THREE.SphereGeometry(0.024, 10, 8),
    eyeIris: new THREE.SphereGeometry(0.014, 8, 8),
    eyePupil: new THREE.SphereGeometry(0.008, 6, 6),
    lip: new THREE.CapsuleGeometry(0.011, 0.038, 3, 8),
    brow: new THREE.BoxGeometry(0.058, 0.015, 0.018),
    palm: new THREE.BoxGeometry(0.062, 0.072, 0.038),
    finger,
    bootUpper,
    bootToe,
    bootSole: new THREE.BoxGeometry(0.145, 0.032, 0.255),
    hairCap: new THREE.SphereGeometry(0.156, 16, 12),
    belt: new THREE.CylinderGeometry(0.215, 0.215, 0.062, 16),
    buckle: new THREE.BoxGeometry(0.065, 0.072, 0.022),
    collarWing: new THREE.BoxGeometry(0.10, 0.13, 0.026),
    pocket: new THREE.BoxGeometry(0.105, 0.10, 0.022),
    button: new THREE.CylinderGeometry(0.011, 0.011, 0.012, 8),
    packMain,
    packRoll: new THREE.CylinderGeometry(0.062, 0.062, 0.34, 10),
    packStrap: new THREE.BoxGeometry(0.048, 0.42, 0.032),
  };

  cachedGeos.ear.scale(0.45, 1.0, 0.65);
  cachedGeos.eyeSclera.scale(1.15, 0.78, 0.55);
  cachedGeos.eyeIris.scale(1.0, 1.0, 0.45);
  cachedGeos.eyePupil.scale(1.0, 1.0, 0.4);
  cachedGeos.belt.scale(1.12, 1.0, 0.72);
  cachedGeos.packRoll.rotateZ(Math.PI / 2);

  Object.values(cachedGeos).forEach((geo) => {
    (geo as THREE.BufferGeometry).userData.__sharedResource = true;
  });

  return cachedGeos;
}

function getPooledSkinMat(hex: number): THREE.MeshStandardMaterial {
  const k = `skin_${hex}`;
  const existing = matCache.get(k);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const pbr = getSkinPBR(hex);
  const m = new THREE.MeshStandardMaterial({
    map: pbr.albedo,
    normalMap: pbr.normal,
    roughnessMap: pbr.roughness,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.62,
    metalness: 0.0,
    envMapIntensity: 0.95,
  });
  m.userData.__sharedResource = true;
  matCache.set(k, m);
  return m;
}

function getPooledFabricMat(
  hex: number,
  style: 'tactical' | 'denim' | 'wool' | 'leather' | 'uniform'
): THREE.MeshStandardMaterial {
  const k = `fab_${hex}_${style}`;
  const existing = matCache.get(k);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const pbr = getFabricPBR(hex, style);
  pbr.albedo.repeat.set(2, 2);
  pbr.normal.repeat.set(2, 2);
  pbr.roughness.repeat.set(2, 2);
  const m = new THREE.MeshStandardMaterial({
    map: pbr.albedo,
    normalMap: pbr.normal,
    roughnessMap: pbr.roughness,
    normalScale: new THREE.Vector2(style === 'leather' ? 1.0 : 0.85, style === 'leather' ? 1.0 : 0.85),
    roughness: style === 'leather' ? 0.48 : 0.85,
    metalness: style === 'leather' ? 0.06 : 0.02,
    envMapIntensity: style === 'leather' ? 1.15 : 0.85,
  });
  m.userData.__sharedResource = true;
  matCache.set(k, m);
  return m;
}

function getPooledSimpleMat(key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  const existing = matCache.get(key);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial(params);
  m.userData.__sharedResource = true;
  matCache.set(key, m);
  return m;
}

function getPooledEyeCorneaMat(hex: number): THREE.MeshStandardMaterial {
  const k = `iris_${hex}`;
  const existing = matCache.get(k);
  if (existing) return existing as THREE.MeshStandardMaterial;
  const m = new THREE.MeshStandardMaterial({
    color: hex,
    roughness: 0.1,
    metalness: 0.05,
    envMapIntensity: 1.4,
  });
  m.userData.__sharedResource = true;
  matCache.set(k, m);
  return m;
}

// ============================================================================
// MAIN UNIFIED HUMANOID BUILDER
// ============================================================================

export function buildRealisticHumanoid(opts: HumanoidBuildOptions = {}): RealisticHumanoidRig {
  const g = getSharedGeos();
  const dir = opts.facing === '+Z' ? 1 : -1; // -1 = -Z forward (Player/Companion/RailwayNPC), +1 = +Z forward (Town/Zombie)
  const castShadow = opts.castShadow ?? true;
  const armUseFull = (opts.armAliasStyle ?? 'full') === 'full';

  const skinColor = opts.skinColor ?? 0xd8a882;
  const jacketColor = opts.jacketColor ?? 0x3b443b;
  const shirtColor = opts.shirtColor ?? 0x262c33;
  const pantsColor = opts.pantsColor ?? 0x232b38;
  const bootColor = opts.bootColor ?? 0x1a1715;
  const hairColor = opts.hairColor ?? 0x241a14;
  const accentColor = opts.accentColor ?? 0xb88c42;
  const eyeColor = opts.eyeColor ?? 0x3b5868;
  const fabricStyle = opts.fabricStyle ?? 'tactical';

  const skinMat = getPooledSkinMat(skinColor);
  const jacketMat = getPooledFabricMat(jacketColor, fabricStyle);
  const shirtMat = getPooledFabricMat(shirtColor, 'uniform');
  const pantsMat = getPooledFabricMat(pantsColor, 'denim');
  const bootMat = getPooledFabricMat(bootColor, 'leather');
  const hairMat = getPooledSimpleMat(`hair_${hairColor}`, { color: hairColor, roughness: 0.86, metalness: 0.04 });
  const soleMat = getPooledSimpleMat('boot_sole', { color: 0x111214, roughness: 0.94 });
  const eyeWhiteMat = getPooledSimpleMat('eye_sclera', { color: 0xf4f2ec, roughness: 0.22 });
  const irisMat = getPooledEyeCorneaMat(eyeColor);
  const pupilMat = getPooledSimpleMat('eye_pupil', { color: 0x0b0b0e, roughness: 0.08 });
  const lipMat = getPooledSimpleMat(`lip_${skinColor}`, {
    color: new THREE.Color(skinColor).lerp(new THREE.Color(0x884244), 0.45),
    roughness: 0.55,
  });
  const metalTrim = getPooledSimpleMat(`metal_${accentColor}`, {
    color: accentColor,
    metalness: 0.82,
    roughness: 0.26,
  });

  const root = new THREE.Group();
  if (opts.name) root.name = opts.name;

  // --- 1. TORSO, PELVIS & COLLAR ---
  const torsoGeo = opts.genderPresentation === 'feminine' ? g.torsoFem : g.torsoMasc;
  const torsoMesh = new THREE.Mesh(torsoGeo, jacketMat);
  torsoMesh.name = 'torso';
  torsoMesh.position.set(0, 1.13, 0);
  torsoMesh.castShadow = castShadow;
  torsoMesh.receiveShadow = true;
  root.add(torsoMesh);

  const pelvisMesh = new THREE.Mesh(g.pelvis, pantsMat);
  pelvisMesh.position.set(0, 0.80, 0);
  pelvisMesh.castShadow = castShadow;
  root.add(pelvisMesh);

  // Sculpted neck & inner shirt V
  const neckMesh = new THREE.Mesh(g.neck, skinMat);
  neckMesh.position.set(0, 1.46, 0);
  neckMesh.castShadow = castShadow;
  root.add(neckMesh);

  const innerShirt = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.11, 0.14, 10), shirtMat);
  innerShirt.position.set(0, 1.42, dir * 0.045);
  root.add(innerShirt);

  // Tailored Jacket Lapels, Placket & Chest Pockets
  for (const side of [-1, 1]) {
    const collar = new THREE.Mesh(g.collarWing, jacketMat);
    collar.position.set(side * 0.085, 1.44, dir * 0.145);
    collar.rotation.z = side * (dir < 0 ? 0.25 : -0.25);
    collar.rotation.y = dir * side * 0.18;
    root.add(collar);

    const pocket = new THREE.Mesh(g.pocket, jacketMat);
    pocket.position.set(side * 0.135, 1.24, dir * 0.165);
    root.add(pocket);

    const pBtn = new THREE.Mesh(g.button, metalTrim);
    pBtn.rotation.x = Math.PI / 2;
    pBtn.position.set(side * 0.135, 1.27, dir * 0.178);
    root.add(pBtn);
  }
  const placket = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.56, 0.018), shirtMat);
  placket.position.set(0, 1.13, dir * 0.172);
  root.add(placket);

  // Leather Utility Belt + Metallic Buckle
  if (opts.hasBelt !== false) {
    const beltMesh = new THREE.Mesh(g.belt, bootMat);
    beltMesh.position.set(0, 0.83, 0);
    root.add(beltMesh);

    const buckleMesh = new THREE.Mesh(g.buckle, metalTrim);
    buckleMesh.position.set(0, 0.83, dir * 0.16);
    root.add(buckleMesh);
  }

  // Optional Tactical Backpack
  if (opts.hasBackpack) {
    const pMat = getPooledFabricMat(opts.packColor ?? 0x2b3226, 'tactical');
    const pack = new THREE.Mesh(g.packMain, pMat);
    pack.name = 'backpack';
    pack.position.set(0, 1.18, -dir * 0.21);
    pack.castShadow = castShadow;
    root.add(pack);

    const roll = new THREE.Mesh(g.packRoll, getPooledFabricMat(0x504637, 'wool'));
    roll.position.set(0, 1.44, -dir * 0.21);
    root.add(roll);

    for (const side of [-0.145, 0.145]) {
      const strap = new THREE.Mesh(g.packStrap, pMat);
      strap.position.set(side, 1.22, -dir * 0.05);
      root.add(strap);
    }
  }

  // Companion/Role specific accents
  if (opts.hasHolster) {
    const holster = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.18, 0.11), bootMat);
    holster.position.set(0.22, 0.72, dir * 0.04);
    root.add(holster);
  }
  if (opts.hasMedicArmband) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.088, 0.11, 10),
      getPooledSimpleMat('medic_red', { color: 0xd92626, roughness: 0.45 })
    );
    band.position.set(-0.28, 1.28, 0);
    root.add(band);
  }
  if (opts.hasStethoscope) {
    const tube = new THREE.Mesh(
      new THREE.TorusGeometry(0.115, 0.014, 6, 14, Math.PI * 1.2),
      getPooledSimpleMat('steth_tube', { color: 0x181c22, roughness: 0.4 })
    );
    tube.rotation.x = Math.PI / 2 - 0.35;
    tube.rotation.z = dir < 0 ? Math.PI : 0;
    tube.position.set(0, 1.44, dir * 0.04);
    root.add(tube);
  }

  // --- 2. ANATOMICAL HEAD GROUP ---
  const headMesh = new THREE.Group();
  headMesh.name = 'head';
  headMesh.position.set(0, 1.71, 0);
  root.add(headMesh);

  const cranium = new THREE.Mesh(g.cranium, skinMat);
  cranium.castShadow = castShadow;
  headMesh.add(cranium);

  const jaw = new THREE.Mesh(g.jaw, skinMat);
  jaw.position.set(0, -0.055, dir * 0.025);
  jaw.castShadow = castShadow;
  headMesh.add(jaw);

  // Ears
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(g.ear, skinMat);
    ear.position.set(side * 0.138, -0.005, -dir * 0.005);
    headMesh.add(ear);
  }

  // Nose bridge & tip
  const nose = new THREE.Mesh(g.noseBridge, skinMat);
  nose.rotation.x = dir * (Math.PI / 2.6);
  nose.position.set(0, -0.005, dir * 0.145);
  headMesh.add(nose);

  // Almond Eyes with sclera, colored iris, dark pupil & specular glint + eyebrows
  for (const side of [-1, 1]) {
    const sclera = new THREE.Mesh(g.eyeSclera, eyeWhiteMat);
    sclera.position.set(side * 0.055, 0.026, dir * 0.131);
    headMesh.add(sclera);

    const iris = new THREE.Mesh(g.eyeIris, irisMat);
    iris.position.set(side * 0.055, 0.026, dir * 0.141);
    headMesh.add(iris);

    const pupil = new THREE.Mesh(g.eyePupil, pupilMat);
    pupil.position.set(side * 0.055, 0.026, dir * 0.145);
    headMesh.add(pupil);

    const brow = new THREE.Mesh(g.brow, hairMat);
    brow.position.set(side * 0.055, 0.062, dir * 0.134);
    brow.rotation.z = side * (dir < 0 ? 0.07 : -0.07);
    headMesh.add(brow);
  }

  // Sculpted Mouth / Lips
  const lips = new THREE.Mesh(g.lip, lipMat);
  lips.rotation.z = Math.PI / 2;
  lips.position.set(0, -0.068, dir * 0.128);
  headMesh.add(lips);

  if (opts.hasBeard) {
    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 8), hairMat);
    beard.scale.set(0.88, 0.65, 0.96);
    beard.position.set(0, -0.088, dir * 0.032);
    headMesh.add(beard);
  }

  // Headwear / Hair Styles
  const hStyle: HumanoidHairStyle = opts.hairStyle ?? 'short';
  if (hStyle !== 'none') {
    const topCap = new THREE.Mesh(g.hairCap, hairMat);
    topCap.scale.set(1.02, 0.72, 1.03);
    topCap.position.set(0, 0.055, -dir * 0.012);
    headMesh.add(topCap);

    // Back occipital hair volume
    const backHair = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), hairMat);
    backHair.scale.set(0.92, 0.92, 0.72);
    backHair.position.set(0, 0.0, -dir * 0.055);
    headMesh.add(backHair);

    if (hStyle === 'parted') {
      const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.055, 0.11), hairMat);
      fringe.position.set(0.02, 0.115, dir * 0.075);
      fringe.rotation.z = -0.14;
      headMesh.add(fringe);
    } else if (hStyle === 'ponytail') {
      const tail1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.18, 4, 8), hairMat);
      tail1.position.set(0, -0.02, -dir * 0.165);
      tail1.rotation.x = dir * 0.35;
      headMesh.add(tail1);
    } else if (hStyle === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), hairMat);
      bun.position.set(0, 0.09, -dir * 0.155);
      headMesh.add(bun);
    } else if (hStyle === 'long') {
      const drape = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.24, 12), hairMat);
      drape.position.set(0, -0.08, -dir * 0.045);
      headMesh.add(drape);
    } else if (hStyle === 'beanie') {
      const knit = getPooledFabricMat(0x2e3b48, 'wool');
      const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.164, 14, 10), knit);
      beanie.scale.set(1.0, 0.78, 1.02);
      beanie.position.set(0, 0.075, -dir * 0.005);
      headMesh.add(beanie);
    } else if (hStyle === 'station_master_cap' || hStyle === 'conductor_cap') {
      const cColor = hStyle === 'station_master_cap' ? 0x1e3a5f : 0x111827;
      const capMat = getPooledFabricMat(cColor, 'uniform');
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.142, 0.088, 16), capMat);
      crown.position.set(0, 0.145, 0);
      headMesh.add(crown);
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.018, 14, 1, false, 0, Math.PI), soleMat);
      visor.rotation.y = dir < 0 ? -Math.PI / 2 : Math.PI / 2;
      visor.position.set(0, 0.105, dir * 0.065);
      headMesh.add(visor);
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.015, 10), metalTrim);
      badge.rotation.x = Math.PI / 2;
      badge.position.set(0, 0.145, dir * 0.152);
      headMesh.add(badge);
    } else if (hStyle === 'beret') {
      const beret = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), getPooledFabricMat(0x5b1d28, 'wool'));
      beret.scale.set(1.08, 0.42, 1.05);
      beret.position.set(0.03, 0.125, -dir * 0.01);
      beret.rotation.z = -0.18;
      headMesh.add(beret);
    } else if (hStyle === 'fedora') {
      const hatMat = getPooledFabricMat(0x3a322d, 'wool');
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.148, 0.11, 14), hatMat);
      crown.position.set(0, 0.15, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.016, 18), hatMat);
      brim.position.set(0, 0.095, 0);
      headMesh.add(crown, brim);
    } else if (hStyle === 'turban') {
      const turbMat = getPooledFabricMat(opts.accentColor ?? 0xb83828, 'uniform');
      const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.142, 0.055, 8, 16), turbMat);
      wrap.rotation.x = Math.PI / 2 - 0.12;
      wrap.position.set(0, 0.095, 0);
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), turbMat);
      crown.scale.set(1.0, 0.72, 1.04);
      crown.position.set(0, 0.115, 0);
      headMesh.add(wrap, crown);
    }
  }

  // Bandana headband + rear tail knot
  if (opts.hasBandana || hStyle === 'bandana') {
    const bMat = getPooledFabricMat(opts.bandanaColor ?? 0xa83232, 'uniform');
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.154, 0.152, 0.058, 16), bMat);
    band.position.set(0, 0.088, 0);
    headMesh.add(band);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), bMat);
    knot.position.set(0, 0.088, -dir * 0.16);
    headMesh.add(knot);
  }

  // Optional Comms Headset
  if (opts.hasHeadset) {
    const hsMat = getPooledSimpleMat('headset_blk', { color: 0x1a1e24, metalness: 0.78, roughness: 0.25 });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.015, 6, 14, Math.PI), hsMat);
    arc.position.set(0, 0.02, 0);
    const mic = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.11), hsMat);
    mic.position.set(0.14, -0.04, dir * 0.07);
    headMesh.add(arc, mic);
  }

  // --- 3. ARTICULATED SCULPTED ARMS (Preserving shoulder pivot y=1.44, x=±0.295) ---
  const buildArm = (side: -1 | 1, pivotName: string): THREE.Group => {
    const arm = new THREE.Group();
    arm.name = pivotName;
    arm.position.set(side * 0.295, 1.43, 0);

    const shoulder = new THREE.Mesh(g.shoulderCap, jacketMat);
    shoulder.castShadow = castShadow;
    arm.add(shoulder);

    const upper = new THREE.Mesh(g.armUpper, jacketMat);
    upper.castShadow = castShadow;
    arm.add(upper);

    const fore = new THREE.Mesh(g.armFore, jacketMat);
    fore.castShadow = castShadow;
    arm.add(fore);

    const palm = new THREE.Mesh(g.palm, skinMat);
    palm.position.set(0, -0.61, 0);
    arm.add(palm);

    const thumb = new THREE.Mesh(g.finger, skinMat);
    thumb.position.set(-side * 0.036, -0.61, dir * 0.02);
    thumb.rotation.z = side * 0.5;
    arm.add(thumb);

    for (let f = 0; f < 4; f++) {
      const finger = new THREE.Mesh(g.finger, skinMat);
      finger.position.set((f - 1.5) * 0.016, -0.665, dir * 0.006);
      arm.add(finger);
    }

    root.add(arm);
    return arm;
  };

  const leftArm = buildArm(-1, armUseFull ? 'leftArm' : 'lArm');
  const rightArm = buildArm(1, armUseFull ? 'rightArm' : 'rArm');
  if (opts.initialRightArmPitch !== undefined) {
    rightArm.rotation.x = opts.initialRightArmPitch;
  }

  // --- 4. ARTICULATED SCULPTED LEGS & LACED BOOTS (Hip pivot y=0.76, x=±0.145) ---
  const buildLeg = (side: -1 | 1, pivotName: string): THREE.Group => {
    const leg = new THREE.Group();
    leg.name = pivotName;
    leg.position.set(side * 0.145, 0.76, 0);

    const thigh = new THREE.Mesh(g.legThigh, pantsMat);
    thigh.castShadow = castShadow;
    leg.add(thigh);

    const shin = new THREE.Mesh(g.legShin, pantsMat);
    shin.castShadow = castShadow;
    leg.add(shin);

    const bootShaft = new THREE.Mesh(g.bootUpper, bootMat);
    bootShaft.position.set(0, -0.73, 0);
    bootShaft.castShadow = castShadow;
    leg.add(bootShaft);

    const bootToe = new THREE.Mesh(g.bootToe, bootMat);
    bootToe.position.set(0, -0.70, dir * 0.065);
    bootToe.castShadow = castShadow;
    leg.add(bootToe);

    const bootSole = new THREE.Mesh(g.bootSole, soleMat);
    bootSole.position.set(0, -0.744, dir * 0.042);
    leg.add(bootSole);

    root.add(leg);
    return leg;
  };

  const leftLeg = buildLeg(-1, armUseFull ? 'leftLeg' : 'lLeg');
  const rightLeg = buildLeg(1, armUseFull ? 'rightLeg' : 'rLeg');

  return {
    group: root,
    torsoMesh,
    headMesh,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };
}

// ============================================================================
// ANATOMICAL ZOMBIE HORROR RIG (With Safe Multi-Material Flash Support)
// ============================================================================

export function buildRealisticZombie(
  type: 'walker' | 'runner' | 'brute' | 'screamer' | 'crawler',
  scale: number
): THREE.Group {
  const g = getSharedGeos();
  const isBrute = type === 'brute';
  const dir = 1; // ZombieManager faces +Z

  const fleshPBR = getZombieFleshPBR(isBrute);
  const fleshMat = getPooledSimpleMat(`zombie_flesh_${isBrute ? 'b' : 'n'}`, {
    map: fleshPBR.albedo,
    normalMap: fleshPBR.normal,
    roughnessMap: fleshPBR.roughness,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.76,
    metalness: 0.04,
  });

  const clothHex =
    type === 'brute' ? 0x2c2e28 : type === 'runner' ? 0x3b2826 : type === 'screamer' ? 0x352b3b : 0x282b2e;
  const clothMat = getPooledFabricMat(clothHex, 'tactical');
  const pantsMat = getPooledFabricMat(0x1b1e22, 'denim');
  const boneMat = getPooledSimpleMat('zombie_bone', { color: 0xd6ccb4, roughness: 0.55 });
  const bloodMat = getPooledSimpleMat('zombie_blood', { color: 0x5c0c10, roughness: 0.25, metalness: 0.1 });
  const eyeGlowMat = getPooledSimpleMat('zombie_eye_glow', {
    color: 0xff2233,
    emissive: 0xff1122,
    emissiveIntensity: 1.65,
    roughness: 0.15,
  });

  const root = new THREE.Group();
  root.scale.setScalar(scale);

  // Hunched spine / emaciated chest
  const torso = new THREE.Mesh(isBrute ? g.torsoMasc : g.torsoFem, clothMat);
  torso.position.set(0, 1.12, 0.04);
  torso.rotation.x = type === 'crawler' ? 0.55 : 0.18;
  torso.castShadow = true;
  root.add(torso);

  // Exposed necrotic wound & ribs across torn chest
  const wound = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bloodMat);
  wound.scale.set(1.1, 1.35, 0.45);
  wound.position.set(0.05, 1.18, 0.155);
  root.add(wound);
  for (let r = 0; r < 3; r++) {
    const rib = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.11, 3, 6), boneMat);
    rib.rotation.z = Math.PI / 2 - 0.12;
    rib.position.set(0.04, 1.24 - r * 0.05, 0.175);
    root.add(rib);
  }

  const pelvis = new THREE.Mesh(g.pelvis, pantsMat);
  pelvis.position.set(0, 0.79, 0);
  root.add(pelvis);

  const neck = new THREE.Mesh(g.neck, fleshMat);
  neck.position.set(0, 1.43, 0.07);
  neck.rotation.x = 0.25;
  root.add(neck);

  // Gaunt Skull Head + Open Jagged Jaw + Glowing Sunken Eyes
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 1.66, 0.11);
  head.rotation.x = 0.14;
  head.rotation.z = (type === 'screamer' ? -0.18 : 0.08);
  root.add(head);

  const cranium = new THREE.Mesh(g.cranium, fleshMat);
  cranium.scale.set(0.95, 1.06, 1.02);
  cranium.castShadow = true;
  head.add(cranium);

  const jaw = new THREE.Mesh(g.jaw, fleshMat);
  jaw.position.set(0, -0.085, 0.035);
  jaw.rotation.x = type === 'screamer' ? 0.35 : 0.18;
  head.add(jaw);

  // Jagged Teeth
  for (let t = -2; t <= 2; t++) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.009, 0.025, 4), boneMat);
    tooth.rotation.x = Math.PI;
    tooth.position.set(t * 0.016, -0.055, 0.13);
    head.add(tooth);
  }

  for (const side of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), bloodMat);
    socket.scale.set(1.1, 0.85, 0.45);
    socket.position.set(side * 0.055, 0.026, dir * 0.13);
    head.add(socket);

    const eye = new THREE.Mesh(g.eyeIris, eyeGlowMat);
    eye.position.set(side * 0.055, 0.026, dir * 0.14);
    head.add(eye);
  }

  // Reached Zombie Arms with Tattered Sleeves + Pale Clawed Forearms
  const buildZombieArm = (side: -1 | 1, name: string, reachRot: number) => {
    const arm = new THREE.Group();
    arm.name = name;
    arm.position.set(side * 0.295, 1.40, 0.06);
    arm.rotation.x = reachRot;

    const shoulder = new THREE.Mesh(g.shoulderCap, clothMat);
    const upper = new THREE.Mesh(g.armUpper, clothMat);
    const fore = new THREE.Mesh(g.armFore, fleshMat);
    const palm = new THREE.Mesh(g.palm, fleshMat);
    palm.position.set(0, -0.61, 0);
    arm.add(shoulder, upper, fore, palm);

    for (let f = 0; f < 4; f++) {
      const claw = new THREE.Mesh(g.finger, bloodMat);
      claw.position.set((f - 1.5) * 0.017, -0.67, 0.015);
      claw.rotation.x = 0.45;
      arm.add(claw);
    }
    root.add(arm);
  };
  buildZombieArm(-1, 'leftArm', -Math.PI / 2.8);
  buildZombieArm(1, 'rightArm', -Math.PI / 2.6);

  // Shambling Legs
  const buildZombieLeg = (side: -1 | 1, name: string) => {
    const leg = new THREE.Group();
    leg.name = name;
    leg.position.set(side * 0.145, 0.75, 0);
    const thigh = new THREE.Mesh(g.legThigh, pantsMat);
    const shin = new THREE.Mesh(g.legShin, side > 0 ? fleshMat : pantsMat); // torn pant leg on right calf
    const boot = new THREE.Mesh(g.bootToe, bloodMat);
    boot.position.set(0, -0.71, 0.055);
    thigh.castShadow = true;
    leg.add(thigh, shin, boot);
    root.add(leg);
  };
  buildZombieLeg(-1, 'leftLeg');
  buildZombieLeg(1, 'rightLeg');

  // Record original per-mesh material for damage flash restoration
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.origMaterial = obj.material;
    }
  });

  return root;
}
