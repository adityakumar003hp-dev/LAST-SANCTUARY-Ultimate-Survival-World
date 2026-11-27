import * as THREE from 'three';
import {
  AURELION_F6_INDOOR_POOL,
  AURELION_LEVELS,
  AURELION_ROOFTOP_INFINITY_POOL,
  AURELION_ROOMS,
  buildAurelionSlabWithOpenings,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';
import { AurelionMansionSystems } from './AurelionSystems';

export interface AquariumFish {
  mesh: THREE.Mesh;
  baseX: number;
  baseY: number;
  baseZ: number;
  speed: number;
  phase: number;
  ampX: number;
}

export interface AurelionCrownFloorHandles {
  f6Group: THREE.Group;
  f7Group: THREE.Group;
  cinemaScreenCtx: CanvasRenderingContext2D | null;
  cinemaScreenTex: THREE.CanvasTexture;
  cinemaScreenMesh: THREE.Mesh;
  cinemaCanvasMat: THREE.MeshBasicMaterial;
  cinemaVideoTex: THREE.VideoTexture | null;
  cinemaVideoMat: THREE.MeshBasicMaterial | null;
  cinemaAppLabel: string;
  cinemaTitle: string;
  aquariumFish: AquariumFish[];
  f6PoolWaterMesh: THREE.Mesh;
  f7PoolWaterMesh: THREE.Mesh;
  anemometerSpinGroup: THREE.Group;
  solarMonitorCtx: CanvasRenderingContext2D | null;
  solarMonitorTex: THREE.CanvasTexture;
  f6Lights: THREE.PointLight[];
  f7Lights: THREE.PointLight[];
  cinemaTimer?: number;
  solarTimer?: number;
}

export function buildAurelionCrownFloors(
  parent: THREE.Group,
  mats: AurelionMaterials
): AurelionCrownFloorHandles {
  const f6Group = new THREE.Group();
  f6Group.name = 'floor_5_private_resort_aquarium';
  const f7Group = new THREE.Group();
  f7Group.name = 'floor_6_crown_sky_palace';
  parent.add(f6Group, f7Group);

  const f6Lights: THREE.PointLight[] = [];
  const f7Lights: THREE.PointLight[] = [];

  // =========================================================================
  // FLOOR 6 — PRIVATE RESORT, CINEMA, AQUARIUM LOUNGE & INDOOR POOL (y = 18.40)
  // =========================================================================
  const f6Y = AURELION_LEVELS.F6.floorY;
  f6Group.add(buildAurelionSlabWithOpenings(AURELION_LEVELS.F6, mats.walnutWood, 0.24));

  AURELION_ROOMS.filter((r) => r.level === 'F6').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.42),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#a855f7')
    );
    plaque.position.set(r.center[0], f6Y + 2.65, r.center[1]);
    f6Group.add(plaque);
  });

  // 1. Private 4K Screening Cinema (8.8, -6.2) — Android TV OS + VideoTexture Wall Projector
  const cinemaScreenCanvas = document.createElement('canvas');
  cinemaScreenCanvas.width = 512;
  cinemaScreenCanvas.height = 288;
  const cinemaScreenCtx = cinemaScreenCanvas.getContext('2d');
  const cinemaScreenTex = mats.trackCustomTexture(new THREE.CanvasTexture(cinemaScreenCanvas));
  cinemaScreenTex.colorSpace = THREE.SRGBColorSpace;
  const cinemaMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: cinemaScreenTex }));
  const cFrame = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.0, 0.12), mats.charcoalTitanium);
  cFrame.position.set(8.8, f6Y + 1.65, -8.8);
  const cScreen = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.82), cinemaMat);
  cScreen.position.set(8.8, f6Y + 1.65, -8.72);
  f6Group.add(cFrame, cScreen);

  for (const rz of [-6.4, -4.8]) {
    const row = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 0.85), mats.cinemaVelvet);
    row.position.set(8.8, f6Y + 0.36, rz);
    f6Group.add(row);
  }

  // 2. Luxury Athletic Fitness Centre (9.2, 0.0): Treadmills & Power Rack
  for (const tz of [-1.2, 0.4]) {
    const treadDeck = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.22, 0.75), mats.charcoalTitanium);
    treadDeck.position.set(9.4, f6Y + 0.11, tz);
    const treadConsole = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.15, 0.72), mats.silverTitanium);
    treadConsole.position.set(10.1, f6Y + 0.68, tz);
    f6Group.add(treadDeck, treadConsole);
  }

  // 3. Billiards & Recreation Hall (0.0, 0.0) & Grand Piano Music Room (0.0, 6.8)
  const poolTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.82, 1.35), mats.walnutWood);
  poolTable.position.set(0.0, f6Y + 0.41, 0.0);
  const felt = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.04, 1.08), mats.lushFoliage);
  felt.position.set(0.0, f6Y + 0.84, 0.0);
  const pianoBody = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.92, 1.45), mats.charcoalTitanium);
  pianoBody.position.set(0.0, f6Y + 0.46, 6.8);
  const pianoKeys = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.32), mats.porcelain);
  pianoKeys.position.set(0.0, f6Y + 0.76, 6.02);
  f6Group.add(poolTable, felt, pianoBody, pianoKeys);

  // 4. Artisan Non-Alcoholic Juice & Espresso Bar (3.2, 6.8)
  const juiceCounter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.02, 0.85), mats.whiteMarble);
  juiceCounter.position.set(3.2, f6Y + 0.51, 6.8);
  const espressoMach = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.44), mats.champagneGold);
  espressoMach.position.set(3.2, f6Y + 1.26, 6.8);
  f6Group.add(juiceCounter, espressoMach);

  // 5. SIGNATURE FEATURE 5: PANORAMIC AQUARIUM LOUNGE & F6 INDOOR LEISURE POOL
  // Aquarium tank positioned at North-West Gallery (X in [-10.0..-4.0], Z in [4.8..7.8])
  const aqBase = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.52, 2.2), mats.graphiteStone);
  aqBase.position.set(-7.0, f6Y + 0.26, 6.4);
  const aqBack = new THREE.Mesh(
    new THREE.BoxGeometry(5.9, 2.35, 0.14),
    mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ color: 0x064e6e }))
  );
  aqBack.position.set(-7.0, f6Y + 1.65, 7.45);
  const aqFrontGlass = new THREE.Mesh(new THREE.BoxGeometry(5.9, 2.35, 0.08), mats.aquariumGlass);
  aqFrontGlass.position.set(-7.0, f6Y + 1.65, 5.32);
  const aqTopRim = new THREE.Mesh(new THREE.BoxGeometry(6.1, 0.18, 2.3), mats.champagneGold);
  aqTopRim.position.set(-7.0, f6Y + 2.86, 6.4);
  f6Group.add(aqBase, aqBack, aqFrontGlass, aqTopRim);

  const aqLight = new THREE.PointLight(0x38bdf8, 1.8, 12, 1.4);
  aqLight.position.set(-7.0, f6Y + 2.4, 6.4);
  f6Lights.push(aqLight);
  f6Group.add(aqLight);

  const aquariumFish: AquariumFish[] = [];
  const fishColors = [0xf59e0b, 0x38bdf8, 0xf43f5e, 0xa855f7, 0x2dd4bf];
  for (let i = 0; i < 14; i++) {
    const fMat = mats.trackCustomMaterial(
      new THREE.MeshStandardMaterial({
        color: fishColors[i % fishColors.length],
        emissive: fishColors[i % fishColors.length],
        emissiveIntensity: 0.35,
        roughness: 0.3,
      })
    );
    const fishMesh = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 6), fMat);
    fishMesh.rotation.z = Math.PI / 2;
    const baseX = -9.2 + (i % 7) * 0.72;
    const baseY = f6Y + 0.9 + (i % 4) * 0.42;
    const baseZ = 5.65 + (i % 3) * 0.55;
    fishMesh.position.set(baseX, baseY, baseZ);
    f6Group.add(fishMesh);
    aquariumFish.push({
      mesh: fishMesh,
      baseX,
      baseY,
      baseZ,
      speed: 0.9 + (i % 5) * 0.25,
      phase: i * 0.7,
      ampX: 0.7 + (i % 3) * 0.25,
    });
  }

  // F6 Indoor Plunge Leisure Pool (raised flush on F6 slab so zero intrusion into F5)
  const p6 = AURELION_F6_INDOOR_POOL;
  const p6CX = (p6.localMinX + p6.localMaxX) * 0.5;
  const p6CZ = (p6.localMinZ + p6.localMaxZ) * 0.5;
  const p6W = p6.localMaxX - p6.localMinX;
  const p6D = p6.localMaxZ - p6.localMinZ;
  const f6PoolRimN = new THREE.Mesh(new THREE.BoxGeometry(p6W + 0.5, 0.95, 0.25), mats.whiteMarble);
  f6PoolRimN.position.set(p6CX, f6Y + 0.47, p6.localMaxZ + 0.12);
  const f6PoolRimS = f6PoolRimN.clone();
  f6PoolRimS.position.z = p6.localMinZ - 0.12;
  const f6PoolRimW = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.95, p6D), mats.whiteMarble);
  f6PoolRimW.position.set(p6.localMinX - 0.12, f6Y + 0.47, p6CZ);
  const f6PoolRimE = f6PoolRimW.clone();
  f6PoolRimE.position.x = p6.localMaxX + 0.12;
  const f6PoolWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(p6W, p6D), mats.poolWater);
  f6PoolWaterMesh.rotation.x = -Math.PI / 2;
  f6PoolWaterMesh.position.set(p6CX, p6.waterSurfaceY, p6CZ);
  f6Group.add(f6PoolRimN, f6PoolRimS, f6PoolRimW, f6PoolRimE, f6PoolWaterMesh);

  for (let s = 0; s < 3; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 1.6), mats.honedTravertine);
    step.position.set(p6.localMaxX + 0.45 + (2 - s) * 0.42, f6Y + 0.16 + s * 0.28, p6CZ);
    f6Group.add(step);
  }

  for (const [lx, lz] of [
    [-7, 0],
    [0, 0],
    [8, -6],
    [8, 4],
  ] as const) {
    const l = new THREE.PointLight(0xffe9c8, 1.25, 16, 1.3);
    l.position.set(lx, f6Y + 2.95, lz);
    f6Lights.push(l);
    f6Group.add(l);
  }

  // =========================================================================
  // FLOOR 7 — CROWN LEVEL: SKY PALACE (y = 22.00, 12 Zones + Infinity Pool)
  // =========================================================================
  const f7Y = AURELION_LEVELS.F7.floorY;
  f7Group.add(buildAurelionSlabWithOpenings(AURELION_LEVELS.F7, mats.honedTravertine, 0.26));

  // Perimeter Frameless Glass Observation Parapets around entire F7 Crown
  for (const [rx, rz, rw, rd] of [
    [0, -9.55, 23.1, 0.08],
    [0, 9.55, 23.1, 0.08],
    [-11.55, 0, 0.08, 19.1],
    [11.55, 0, 0.08, 19.1],
  ] as const) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.1, rd), mats.clearBalustradeGlass);
    rail.position.set(rx, f7Y + 0.56, rz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.05, 0.06, rd + 0.05), mats.champagneGold);
    cap.position.set(rx, f7Y + 1.12, rz);
    f7Group.add(rail, cap);
  }

  AURELION_ROOMS.filter((r) => r.level === 'F7').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 0.4),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#f59e0b')
    );
    plaque.position.set(r.center[0], f7Y + 2.3, r.center[1]);
    f7Group.add(plaque);
  });

  // 1. Rooftop Infinity Swimming Pool (elevated deck 23.15, waterSurface 22.98, zero intrusion into F6!)
  const p7 = AURELION_ROOFTOP_INFINITY_POOL;
  const p7CX = (p7.localMinX + p7.localMaxX) * 0.5;
  const p7CZ = (p7.localMinZ + p7.localMaxZ) * 0.5;
  const p7W = p7.localMaxX - p7.localMinX;
  const p7D = p7.localMaxZ - p7.localMinZ;

  // Infinity Basin Perimeter Walls (West glass infinity overflow edge!)
  const weirWest = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.02, p7D + 0.4), mats.aquariumGlass);
  weirWest.position.set(p7.localMinX - 0.08, f7Y + 0.51, p7CZ);
  const rimN = new THREE.Mesh(new THREE.BoxGeometry(p7W + 0.5, 1.15, 0.35), mats.honedTravertine);
  rimN.position.set(p7CX, f7Y + 0.58, p7.localMaxZ + 0.18);
  const rimS = rimN.clone();
  rimS.position.z = p7.localMinZ - 0.18;
  const rimE = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, p7D + 0.4), mats.honedTravertine);
  rimE.position.set(p7.localMaxX + 0.42, f7Y + 0.58, p7CZ);

  const f7PoolWaterMesh = new THREE.Mesh(new THREE.PlaneGeometry(p7W, p7D), mats.poolWater);
  f7PoolWaterMesh.rotation.x = -Math.PI / 2;
  f7PoolWaterMesh.position.set(p7CX, p7.waterSurfaceY, p7CZ);
  f7Group.add(weirWest, rimN, rimS, rimE, f7PoolWaterMesh);

  // Built-in Broad Travertine Pool Access Steps on East Rim
  for (let s = 0; s < 4; s++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.28, 2.2), mats.honedTravertine);
    step.position.set(p7.localMaxX + 0.95 + (3 - s) * 0.48, f7Y + 0.16 + s * 0.28, p7CZ);
    f7Group.add(step);
  }

  // Cabana Poolside Loungers (-6.0, -6.8)
  for (const lx of [-8.2, -5.8, -3.4]) {
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.32, 1.95), mats.creamBoucle);
    lounger.position.set(lx, f7Y + 0.18, -6.8);
    f7Group.add(lounger);
  }

  // 2. Crown Sky Palace Glass Pavilion (5.5, -6.0) & Outdoor Dining Pergola (1.5, 5.8)
  const pavRoof = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.18, 5.2), mats.charcoalTitanium);
  pavRoof.position.set(5.5, f7Y + 3.45, -6.0);
  const pavGold = new THREE.Mesh(new THREE.BoxGeometry(7.35, 0.08, 5.35), mats.champagneGold);
  pavGold.position.set(5.5, f7Y + 3.35, -6.0);
  f7Group.add(pavRoof, pavGold);
  for (const [px, pz] of [
    [2.1, -8.4],
    [8.9, -8.4],
    [2.1, -3.6],
    [8.9, -3.6],
  ] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 3.4, 12), mats.champagneGold);
    post.position.set(px, f7Y + 1.7, pz);
    f7Group.add(post);
  }

  const diningTableF7 = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.78, 1.35), mats.honedTravertine);
  diningTableF7.position.set(1.5, f7Y + 0.39, 5.8);
  f7Group.add(diningTableF7);

  // 3. F7 Photovoltaic Solar Canopy Array (InstancedMesh, East-North Quadrant)
  const solarMatrices: THREE.Matrix4[] = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 5; col++) {
      const m = new THREE.Matrix4().makeTranslation(2.4 + col * 1.85, f7Y + 2.65, 5.2 + row * 2.2);
      const rot = new THREE.Matrix4().makeRotationX(0.32);
      const scale = new THREE.Matrix4().makeScale(1.65, 0.06, 1.75);
      m.multiply(rot).multiply(scale);
      solarMatrices.push(m);
    }
  }
  const solarInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.solarCellMat, solarMatrices.length);
  solarMatrices.forEach((m, i) => solarInst.setMatrixAt(i, m));
  solarInst.instanceMatrix.needsUpdate = true;
  solarInst.computeBoundingSphere();
  f7Group.add(solarInst);

  // Solar Telemetry Kiosk (9.4, -2.5)
  const solarMonitorCanvas = document.createElement('canvas');
  solarMonitorCanvas.width = 512;
  solarMonitorCanvas.height = 256;
  const solarMonitorCtx = solarMonitorCanvas.getContext('2d');
  const solarMonitorTex = mats.trackCustomTexture(new THREE.CanvasTexture(solarMonitorCanvas));
  solarMonitorTex.colorSpace = THREE.SRGBColorSpace;
  const smMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: solarMonitorTex }));
  const smKiosk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.5, 0.45), mats.charcoalTitanium);
  smKiosk.position.set(9.4, f7Y + 0.75, -2.5);
  const smScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.55), smMat);
  smScreen.position.set(9.4, f7Y + 1.15, -2.74);
  smScreen.rotation.y = Math.PI;
  f7Group.add(smKiosk, smScreen);

  // 4. Weather Observation Station (-9.8, 7.5) with Spinning Cup Anemometer
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.2, 10), mats.silverTitanium);
  mast.position.set(-9.8, f7Y + 1.6, 7.5);
  const anemometerSpinGroup = new THREE.Group();
  anemometerSpinGroup.position.set(-9.8, f7Y + 3.2, 7.5);
  for (let a = 0; a < 3; a++) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.04, 0.04), mats.champagneGold);
    arm.rotation.y = (a * Math.PI * 2) / 3;
    anemometerSpinGroup.add(arm);
  }
  const wxDome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mats.porcelain);
  wxDome.position.set(-9.8, f7Y + 2.4, 7.5);
  f7Group.add(mast, anemometerSpinGroup, wxDome);

  for (const [lx, lz] of [
    [-6, 0],
    [5, -6],
    [5, 6],
  ] as const) {
    const l = new THREE.PointLight(0xffdfb0, 1.2, 16, 1.3);
    l.position.set(lx, f7Y + 2.8, lz);
    f7Lights.push(l);
    f7Group.add(l);
  }

  return {
    f6Group,
    f7Group,
    cinemaScreenCtx,
    cinemaScreenTex,
    cinemaScreenMesh: cScreen,
    cinemaCanvasMat: cinemaMat,
    cinemaVideoTex: null,
    cinemaVideoMat: null,
    cinemaAppLabel: 'ANDROID TV OS',
    cinemaTitle: 'YOUTUBE · MEDIA PROJECTOR · ESTATE TV',
    aquariumFish,
    f6PoolWaterMesh,
    f7PoolWaterMesh,
    anemometerSpinGroup,
    solarMonitorCtx,
    solarMonitorTex,
    f6Lights,
    f7Lights,
  };
}

export function setAurelionCinemaVideo(
  handles: AurelionCrownFloorHandles,
  videoEl: HTMLVideoElement | null,
  appLabel = 'ANDROID TV OS',
  title = 'YOUTUBE · MEDIA PROJECTOR · ESTATE TV'
) {
  handles.cinemaAppLabel = appLabel;
  handles.cinemaTitle = title;

  if (handles.cinemaVideoTex) {
    handles.cinemaVideoTex.dispose();
    handles.cinemaVideoTex = null;
  }
  if (handles.cinemaVideoMat) {
    handles.cinemaVideoMat.dispose();
    handles.cinemaVideoMat = null;
  }

  if (videoEl) {
    const vTex = new THREE.VideoTexture(videoEl);
    vTex.colorSpace = THREE.SRGBColorSpace;
    vTex.minFilter = THREE.LinearFilter;
    vTex.magFilter = THREE.LinearFilter;
    const vMat = new THREE.MeshBasicMaterial({ map: vTex });
    handles.cinemaVideoTex = vTex;
    handles.cinemaVideoMat = vMat;
    handles.cinemaScreenMesh.material = vMat;
  } else {
    handles.cinemaScreenMesh.material = handles.cinemaCanvasMat;
  }
}

export function updateAurelionCrownVisuals(
  handles: AurelionCrownFloorHandles,
  systems: AurelionMansionSystems,
  delta: number
) {
  const t = performance.now() * 0.0015;
  const f6Visible = handles.f6Group.visible;
  const f7Visible = handles.f7Group.visible;

  if (f6Visible) {
    // Animate Floor 6 Aquarium Fish smoothly inside glass tank
    handles.aquariumFish.forEach((f) => {
      const phase = t * f.speed + f.phase;
      f.mesh.position.x = f.baseX + Math.sin(phase) * f.ampX;
      f.mesh.position.y = f.baseY + Math.sin(phase * 1.4) * 0.14;
      f.mesh.rotation.y = Math.cos(phase) >= 0 ? 0 : Math.PI;
    });

    // Animate F6 Pool Water Ripples
    handles.f6PoolWaterMesh.position.y = AURELION_F6_INDOOR_POOL.waterSurfaceY + Math.sin(t * 1.8) * 0.015;

    // Update Cinema 4K Android TV Screen (Canvas OS or live VideoTexture)
    const isOn = systems.cinemaOn && systems.tier3LuxuryPowered;
    if (isOn && handles.cinemaVideoMat && handles.cinemaVideoTex) {
      if (handles.cinemaScreenMesh.material !== handles.cinemaVideoMat) {
        handles.cinemaScreenMesh.material = handles.cinemaVideoMat;
      }
      handles.cinemaVideoTex.needsUpdate = true;
    } else {
      if (handles.cinemaScreenMesh.material !== handles.cinemaCanvasMat) {
        handles.cinemaScreenMesh.material = handles.cinemaCanvasMat;
      }
      handles.cinemaTimer = (handles.cinemaTimer ?? 0.25) + delta;
      if (handles.cinemaScreenCtx && handles.cinemaTimer >= 0.16) {
        handles.cinemaTimer = 0;
        const ctx = handles.cinemaScreenCtx;
        if (!isOn) {
          ctx.fillStyle = '#07090e';
          ctx.fillRect(0, 0, 512, 288);
          ctx.fillStyle = '#64748b';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(
            systems.tier3LuxuryPowered
              ? 'AURELION ANDROID TV · STANDBY [E]'
              : 'TIER 3 POWER SHED · START B2 GENERATOR',
            256,
            148
          );
        } else {
          const grad = ctx.createLinearGradient(0, 0, 512, 288);
          grad.addColorStop(0, '#090d1a');
          grad.addColorStop(1, '#171128');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 512, 288);

          // Top Android TV status bar
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(0, 0, 512, 42);
          ctx.textAlign = 'left';
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 15px monospace';
          ctx.fillText(`● ${handles.cinemaAppLabel}`, 18, 26);
          ctx.textAlign = 'right';
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText('4K HDR · 1.4 kW', 494, 26);

          // Center Now Playing card
          ctx.textAlign = 'center';
          ctx.fillStyle = '#d4b26a';
          ctx.font = 'bold 22px sans-serif';
          ctx.fillText('THE AURELION SMART CINEMA', 256, 112);

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 17px monospace';
          ctx.fillText(handles.cinemaTitle.slice(0, 42), 256, 152);

          // Animated audio equalizer bars
          for (let b = 0; b < 14; b++) {
            const bh = 8 + Math.abs(Math.sin(t * 4.5 + b * 0.65)) * 28;
            ctx.fillStyle = b % 2 === 0 ? '#38bdf8' : '#f43f5e';
            ctx.fillRect(148 + b * 16, 224 - bh, 10, bh);
          }

          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px monospace';
          ctx.fillText('PRESS [E] TO OPEN YOUTUBE, MEDIA & CHANNELS', 256, 262);
        }
        handles.cinemaScreenTex.needsUpdate = true;
      }
    }
  } else {
    handles.cinemaTimer = 0.25;
  }

  if (f7Visible) {
    handles.f7PoolWaterMesh.position.y = AURELION_ROOFTOP_INFINITY_POOL.waterSurfaceY + Math.sin(t * 2.1) * 0.02;
    handles.anemometerSpinGroup.rotation.y += delta * 3.8;

    // Update F7 Solar Monitor Kiosk (throttled to ~2 Hz)
    handles.solarTimer = (handles.solarTimer ?? 0.6) + delta;
    if (handles.solarMonitorCtx && handles.solarTimer >= 0.5) {
      handles.solarTimer = 0;
      const ctx = handles.solarMonitorCtx;
      ctx.fillStyle = '#07111e';
      ctx.fillRect(0, 0, 512, 256);
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 22px monospace';
      ctx.fillText('F7 SOLAR ARRAY TELEMETRY', 20, 42);
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 34px monospace';
      ctx.fillText(`+${systems.solarKw.toFixed(2)} kW`, 20, 105);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '18px monospace';
      ctx.fillText(`BATTERY: ${systems.batteryKwh.toFixed(1)}/${systems.batteryCapacityKwh} kWh`, 20, 162);
      ctx.fillText(`PRIORITY: ${systems.powerPriorityMode.toUpperCase()}`, 20, 202);
      handles.solarMonitorTex.needsUpdate = true;
    }
  } else {
    handles.solarTimer = 0.6;
  }
}
