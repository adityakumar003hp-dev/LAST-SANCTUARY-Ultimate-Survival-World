import * as THREE from 'three';
import { getBarkPBR, getRockPBR, getFoliageTexture, getMetalPBR } from '../../utils/proceduralTextures';

interface FloraGeoCache {
  trunk: THREE.LatheGeometry;
  branch: THREE.CylinderGeometry;
  pineBough1: THREE.LatheGeometry;
  pineBough2: THREE.LatheGeometry;
  pineBough3: THREE.LatheGeometry;
  broadClump: THREE.IcosahedronGeometry;
  rockMain: THREE.IcosahedronGeometry;
  rockSub: THREE.IcosahedronGeometry;
  bushClump: THREE.IcosahedronGeometry;
  berry: THREE.SphereGeometry;
  cactusCol: THREE.CylinderGeometry;
}

let floraCache: FloraGeoCache | null = null;
const matPool = new Map<string, THREE.MeshStandardMaterial>();

function displaceGeometryNoise(geo: THREE.BufferGeometry, amp: number, seed: number) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 3.7 + y * 2.9 + seed) * Math.cos(z * 3.3 - y * 1.7 + seed * 0.5) * 0.65 +
      Math.sin(x * 7.1 - z * 6.3 + seed * 1.9) * 0.35;
    const factor = 1.0 + n * amp;
    pos.setXYZ(i, x * factor, y * (1 + n * amp * 0.65), z * factor);
  }
  geo.computeVertexNormals();
}

function getFloraGeos(): FloraGeoCache {
  if (floraCache) return floraCache;

  // Root-flared tapered natural tree trunk
  const trunk = new THREE.LatheGeometry([
    new THREE.Vector2(0.56, 0.0),   // root flare
    new THREE.Vector2(0.38, 0.45),  // trunk base
    new THREE.Vector2(0.28, 1.8),   // mid trunk
    new THREE.Vector2(0.21, 3.2),   // upper trunk
    new THREE.Vector2(0.09, 4.4),   // spire tip
  ], 10);
  trunk.computeVertexNormals();

  const branch = new THREE.CylinderGeometry(0.06, 0.11, 1.45, 7);
  branch.translate(0, 0.72, 0);

  // Scalloped organic pine bough tiers instead of harsh flat 7-sided cones
  const pineBough1 = new THREE.LatheGeometry([
    new THREE.Vector2(0.05, 0.0),
    new THREE.Vector2(2.35, 0.2),
    new THREE.Vector2(2.05, 0.75),
    new THREE.Vector2(1.45, 1.55),
    new THREE.Vector2(0.55, 2.35),
    new THREE.Vector2(0.02, 2.6),
  ], 11);
  displaceGeometryNoise(pineBough1, 0.14, 1.1);

  const pineBough2 = new THREE.LatheGeometry([
    new THREE.Vector2(0.05, 0.0),
    new THREE.Vector2(1.85, 0.2),
    new THREE.Vector2(1.55, 0.7),
    new THREE.Vector2(0.95, 1.5),
    new THREE.Vector2(0.02, 2.2),
  ], 11);
  displaceGeometryNoise(pineBough2, 0.15, 2.7);

  const pineBough3 = new THREE.LatheGeometry([
    new THREE.Vector2(0.04, 0.0),
    new THREE.Vector2(1.25, 0.15),
    new THREE.Vector2(0.92, 0.7),
    new THREE.Vector2(0.02, 1.85),
  ], 10);
  displaceGeometryNoise(pineBough3, 0.16, 4.3);

  const broadClump = new THREE.IcosahedronGeometry(1.15, 1);
  displaceGeometryNoise(broadClump, 0.22, 5.5);

  const rockMain = new THREE.IcosahedronGeometry(1.22, 1);
  displaceGeometryNoise(rockMain, 0.28, 7.7);
  rockMain.scale(1.15, 0.78, 1.0);
  rockMain.translate(0, 0.68, 0);

  const rockSub = new THREE.IcosahedronGeometry(0.68, 1);
  displaceGeometryNoise(rockSub, 0.26, 9.9);
  rockSub.scale(1.1, 0.72, 1.0);
  rockSub.translate(0, 0.34, 0);

  const bushClump = new THREE.IcosahedronGeometry(0.56, 1);
  displaceGeometryNoise(bushClump, 0.24, 12.1);

  const cactusCol = new THREE.CylinderGeometry(0.24, 0.28, 3.2, 10);
  cactusCol.translate(0, 1.6, 0);

  floraCache = {
    trunk,
    branch,
    pineBough1,
    pineBough2,
    pineBough3,
    broadClump,
    rockMain,
    rockSub,
    bushClump,
    berry: new THREE.SphereGeometry(0.075, 7, 6),
    cactusCol,
  };
  Object.values(floraCache).forEach((geo) => {
    (geo as THREE.BufferGeometry).userData.__sharedResource = true;
  });
  return floraCache;
}

function getPooledBarkMat(): THREE.MeshStandardMaterial {
  const k = 'flora_bark_pbr';
  if (matPool.has(k)) return matPool.get(k)!;
  const pbr = getBarkPBR();
  const m = new THREE.MeshStandardMaterial({
    map: pbr.albedo,
    normalMap: pbr.normal,
    roughnessMap: pbr.roughness,
    normalScale: new THREE.Vector2(1.3, 1.3),
    roughness: 0.9,
    metalness: 0.02,
  });
  m.userData.__sharedResource = true;
  matPool.set(k, m);
  return m;
}

function getPooledLeafMat(hex: number): THREE.MeshStandardMaterial {
  const k = `flora_leaf_${hex.toString(16)}`;
  if (matPool.has(k)) return matPool.get(k)!;
  const tex = getFoliageTexture(hex);
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.82,
    metalness: 0.03,
  });
  m.userData.__sharedResource = true;
  matPool.set(k, m);
  return m;
}

function getPooledRockMat(): THREE.MeshStandardMaterial {
  const k = 'flora_rock_pbr';
  if (matPool.has(k)) return matPool.get(k)!;
  const pbr = getRockPBR();
  const m = new THREE.MeshStandardMaterial({
    map: pbr.albedo,
    normalMap: pbr.normal,
    roughnessMap: pbr.roughness,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.86,
    metalness: 0.08,
  });
  m.userData.__sharedResource = true;
  matPool.set(k, m);
  return m;
}

function getPooledScrapMat(): THREE.MeshStandardMaterial {
  const k = 'flora_scrap_pbr';
  if (matPool.has(k)) return matPool.get(k)!;
  const pbr = getMetalPBR();
  const m = new THREE.MeshStandardMaterial({
    map: pbr.albedo,
    normalMap: pbr.normal,
    roughnessMap: pbr.roughness,
    roughness: 0.65,
    metalness: 0.65,
  });
  m.userData.__sharedResource = true;
  matPool.set(k, m);
  return m;
}

export function buildRealisticTree(biomeId?: string, variationSeed = 1): THREE.Group {
  const geos = getFloraGeos();
  const group = new THREE.Group();
  const barkMat = getPooledBarkMat();

  // Select canopy tint & species silhouette based on biome
  const isSnowy = biomeId === 'snow_peaks' || biomeId === 'taiga' || biomeId === 'glacier_field' || biomeId === 'tundra';
  const isDesert = biomeId === 'desert' || biomeId === 'sand_dunes';
  const isTropical = biomeId === 'tropical_jungle' || biomeId === 'dinosaur_valley' || biomeId === 'mangrove_delta';
  const isBroadleaf = !isSnowy && !isDesert && (variationSeed % 3 === 0 || biomeId === 'savannah' || biomeId === 'autumn_woods');

  if (isDesert) {
    // Saguaro desert cactus
    const cMat = getPooledLeafMat(0x4b7740);
    const body = new THREE.Mesh(geos.cactusCol, cMat);
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(geos.branch, cMat);
      arm.scale.set(1.6, 0.85, 1.6);
      arm.position.set(side * 0.2, 1.5 + (side > 0 ? 0.3 : 0), 0);
      arm.rotation.z = -side * 1.15;
      arm.castShadow = true;
      group.add(arm);
    }
    return group;
  }

  const trunk = new THREE.Mesh(geos.trunk, barkMat);
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Angled side limbs near base of crown
  for (let b = 0; b < 3; b++) {
    const br = new THREE.Mesh(geos.branch, barkMat);
    const angle = (b / 3) * Math.PI * 2 + variationSeed;
    br.position.set(0, 1.85 + b * 0.45, 0);
    br.rotation.y = angle;
    br.rotation.z = 0.72;
    group.add(br);
  }

  const foliageColor = isSnowy
    ? 0x1c3d2c
    : isTropical
      ? 0x265c28
      : isBroadleaf
        ? 0x356429
        : 0x224924;
  const leafMat = getPooledLeafMat(foliageColor);

  if (isBroadleaf) {
    // Lush multi-cluster deciduous oak/maple crown
    const clusterPositions: Array<[number, number, number, number]> = [
      [0, 4.35, 0, 1.25],
      [0.95, 3.65, 0.45, 0.92],
      [-0.9, 3.75, -0.45, 0.95],
      [0.35, 3.85, -0.95, 0.88],
      [-0.45, 3.55, 0.9, 0.86],
    ];
    clusterPositions.forEach(([cx, cy, cz, sc]) => {
      const clump = new THREE.Mesh(geos.broadClump, leafMat);
      clump.position.set(cx, cy, cz);
      clump.scale.setScalar(sc);
      clump.castShadow = true;
      clump.receiveShadow = true;
      group.add(clump);
    });
  } else {
    // Tiered organic spruce / pine boughs
    const b1 = new THREE.Mesh(geos.pineBough1, leafMat);
    b1.position.y = 2.15;
    b1.castShadow = true;
    b1.receiveShadow = true;

    const b2 = new THREE.Mesh(geos.pineBough2, leafMat);
    b2.position.y = 3.55;
    b2.rotation.y = 0.8;
    b2.castShadow = true;

    const b3 = new THREE.Mesh(geos.pineBough3, leafMat);
    b3.position.y = 4.85;
    b3.rotation.y = 1.7;
    b3.castShadow = true;

    group.add(b1, b2, b3);

    if (isSnowy) {
      const snowMat = getPooledLeafMat(0xdce6ee);
      const cap = new THREE.Mesh(geos.pineBough3, snowMat);
      cap.position.y = 4.98;
      cap.scale.set(0.88, 0.72, 0.88);
      group.add(cap);
    }
  }

  return group;
}

export function buildRealisticRock(): THREE.Group {
  const geos = getFloraGeos();
  const mat = getPooledRockMat();
  const group = new THREE.Group();

  const main = new THREE.Mesh(geos.rockMain, mat);
  main.castShadow = true;
  main.receiveShadow = true;

  const sub1 = new THREE.Mesh(geos.rockSub, mat);
  sub1.position.set(0.82, 0, 0.36);
  sub1.rotation.y = 1.1;
  sub1.castShadow = true;

  const sub2 = new THREE.Mesh(geos.rockSub, mat);
  sub2.position.set(-0.75, 0, -0.42);
  sub2.scale.setScalar(0.75);
  sub2.rotation.y = 2.4;

  group.add(main, sub1, sub2);
  return group;
}

export function buildRealisticBerryBush(): THREE.Group {
  const geos = getFloraGeos();
  const leafMat = getPooledLeafMat(0x2f5e28);
  const berryMat = getPooledLeafMat(0xb81a2c);
  berryMat.roughness = 0.25;

  const group = new THREE.Group();
  const c1 = new THREE.Mesh(geos.bushClump, leafMat);
  c1.position.set(0, 0.45, 0);
  c1.castShadow = true;
  const c2 = new THREE.Mesh(geos.bushClump, leafMat);
  c2.position.set(0.34, 0.35, 0.22);
  c2.scale.setScalar(0.72);
  const c3 = new THREE.Mesh(geos.bushClump, leafMat);
  c3.position.set(-0.3, 0.34, -0.2);
  c3.scale.setScalar(0.68);
  group.add(c1, c2, c3);

  for (let b = 0; b < 7; b++) {
    const theta = (b / 7) * Math.PI * 2;
    const berry = new THREE.Mesh(geos.berry, berryMat);
    berry.position.set(Math.cos(theta) * 0.44, 0.46 + (b % 2) * 0.14, Math.sin(theta) * 0.44);
    group.add(berry);
  }
  return group;
}

export function buildRealisticScrapWreck(): THREE.Group {
  const scrapMat = getPooledScrapMat();
  const darkMat = getPooledRockMat();
  const group = new THREE.Group();

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.62, 1.25), scrapMat);
  chassis.position.set(0, 0.34, 0);
  chassis.rotation.z = 0.08;
  chassis.castShadow = true;
  chassis.receiveShadow = true;

  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.1, 1.16), scrapMat);
  hood.position.set(0.62, 0.78, 0);
  hood.rotation.z = -0.24;
  hood.castShadow = true;

  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12), darkMat);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(-0.75, 0.36, 0.68);

  const girder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.5, 0.14), scrapMat);
  girder.position.set(0.3, 0.72, -0.35);
  girder.rotation.x = 0.35;

  group.add(chassis, hood, wheel, girder);
  return group;
}
