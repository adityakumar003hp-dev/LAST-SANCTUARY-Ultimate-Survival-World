import * as THREE from 'three';
import {
  AURELION_ATRIUM_VOID,
  AURELION_ELEVATOR_CONFIGS,
  AURELION_LEVEL_ORDER,
  AURELION_LEVELS,
  AURELION_STAIR_VOID,
  AurelionLevelId,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';
import { AurelionMansionSystems, ElevatorId } from './AurelionSystems';

export interface AurelionArchitectureHandles {
  southWallMesh: THREE.Group;
  northWallMesh: THREE.Group;
  eastWallMesh: THREE.Group;
  westWallMesh: THREE.Group;
  frontDoorLeftLeaf: THREE.Group;
  frontDoorRightLeaf: THREE.Group;
  patioDoorLeftLeaf: THREE.Mesh;
  patioDoorRightLeaf: THREE.Mesh;
  chandelierGroup: THREE.Group;
  elevRoot: THREE.Group;
  floorLights: THREE.PointLight[];
  elevatorVisuals: Record<
    ElevatorId,
    {
      shaftGroup: THREE.Group;
      cabGroup: THREE.Group;
      doorLeft: THREE.Mesh;
      doorRight: THREE.Mesh;
      indicatorCtx: CanvasRenderingContext2D | null;
      indicatorTex: THREE.CanvasTexture;
      indicatorCanvas: HTMLCanvasElement;
      lastIndicatorState?: string;
    }
  >;
}

export function buildAurelionArchitecture(
  parent: THREE.Group,
  mats: AurelionMaterials,
  initialDoorOpen = true,
  initialPatioOpen = true
): AurelionArchitectureHandles {
  const extGroup = new THREE.Group();
  extGroup.name = 'the_aurelion_monumental_exterior';
  parent.add(extGroup);

  const southWallMesh = new THREE.Group();
  southWallMesh.name = 'aurelion_south_facade';
  const northWallMesh = new THREE.Group();
  northWallMesh.name = 'aurelion_north_facade';
  const eastWallMesh = new THREE.Group();
  eastWallMesh.name = 'aurelion_east_facade';
  const westWallMesh = new THREE.Group();
  westWallMesh.name = 'aurelion_west_facade';
  extGroup.add(southWallMesh, northWallMesh, eastWallMesh, westWallMesh);

  const floorLights: THREE.PointLight[] = [];

  // Monumental Honed Travertine Plinth Base
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(31.2, 0.36, 25.2), mats.graphiteStone);
  plinth.position.set(0, 0.06, 0);
  plinth.receiveShadow = true;
  extGroup.add(plinth);

  // Grand South Portico Canopy + Aurelion Estate Crest Signboard
  const porticoRoof = new THREE.Mesh(new THREE.BoxGeometry(10.8, 0.34, 3.6), mats.charcoalTitanium);
  porticoRoof.position.set(0, 4.15, -13.6);
  porticoRoof.castShadow = true;
  const porticoTrim = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.09, 3.7), mats.champagneGold);
  porticoTrim.position.set(0, 3.96, -13.6);
  extGroup.add(porticoRoof, porticoTrim);

  for (const px of [-4.6, -2.4, 2.4, 4.6]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 3.9, 16), mats.honedTravertine);
    col.position.set(px, 2.05, -14.8);
    col.castShadow = true;
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16), mats.champagneGold);
    baseRing.position.set(px, 0.22, -14.8);
    extGroup.add(col, baseRing);
  }

  const entrySign = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.92, 0.12),
    mats.createSignboardMaterial('THE AURELION', 'PRIVATE MEGA ESTATE · SANCTUARY I')
  );
  entrySign.position.set(0, 4.78, -12.15);
  southWallMesh.add(entrySign);

  // Animated Double Front Entrance Doors at South Portal (local X = 0, Z = -11.9)
  const frontDoorGroup = new THREE.Group();
  frontDoorGroup.name = 'aurelion_front_double_doors';
  frontDoorGroup.position.set(0, 0.245, -11.9);
  const frontDoorLeftLeaf = new THREE.Group();
  frontDoorLeftLeaf.position.x = -1.3;
  const frontDoorRightLeaf = new THREE.Group();
  frontDoorRightLeaf.position.x = 1.3;

  // Helper: constructs a solid opaque architectural wall span with framed privacy-glass window apertures
  // so interior rooms are never revealed from outside while preserving modern luxury fortress proportions.
  const addSolidWindowedFacadeSpan = (
    targetGroup: THREE.Group,
    axis: 'x' | 'z',
    fixedCoord: number,
    spanStart: number,
    spanEnd: number,
    floorY: number,
    ceilingY: number,
    bayCount: number,
    includeGoldCrownBand: boolean
  ) => {
    const h = ceilingY - floorY;
    const totalLen = spanEnd - spanStart;
    if (totalLen <= 0.4) return;
    const centerCoord = (spanStart + spanEnd) * 0.5;
    const wallT = 0.32;
    const sillH = 1.05;
    const headerH = 0.55;
    const winH = Math.max(0.6, h - sillH - headerH);
    const winMidY = floorY + sillH + winH * 0.5;

    const placeBox = (alongCenter: number, y: number, lenAlong: number, height: number, thick: number, mat: THREE.Material, shadow = true) => {
      const geo =
        axis === 'z'
          ? new THREE.BoxGeometry(lenAlong, height, thick)
          : new THREE.BoxGeometry(thick, height, lenAlong);
      const mesh = new THREE.Mesh(geo, mat);
      if (axis === 'z') mesh.position.set(alongCenter, y, fixedCoord);
      else mesh.position.set(fixedCoord, y, alongCenter);
      mesh.castShadow = shadow;
      mesh.receiveShadow = true;
      targetGroup.add(mesh);
    };

    // Solid opaque lower stone spandrel + upper travertine lintel + titanium fascia
    placeBox(centerCoord, floorY + sillH * 0.5, totalLen, sillH, wallT, mats.graphiteStone);
    placeBox(centerCoord, ceilingY - headerH * 0.5, totalLen, headerH, wallT, mats.honedTravertine);
    placeBox(centerCoord, ceilingY - 0.1, totalLen + 0.32, 0.24, wallT + 0.14, mats.charcoalTitanium);
    if (includeGoldCrownBand) {
      placeBox(centerCoord, ceilingY + 0.04, totalLen + 0.38, 0.08, wallT + 0.18, mats.champagneGold, false);
    }

    // Divide mid-section into solid stone piers + framed opaque privacy-glass window bays
    const safeBays = Math.max(1, bayCount);
    const cornerPierW = Math.min(2.6, Math.max(1.2, totalLen * 0.11));
    const midPierW = safeBays > 1 ? Math.min(1.85, Math.max(0.9, totalLen * 0.075)) : 0;
    const usableWinTotal = Math.max(0.8, totalLen - cornerPierW * 2 - midPierW * (safeBays - 1));
    const winW = usableWinTotal / safeBays;

    // Left & Right solid corner bastion walls
    placeBox(spanStart + cornerPierW * 0.5, winMidY, cornerPierW, winH, wallT, mats.honedTravertine);
    placeBox(spanEnd - cornerPierW * 0.5, winMidY, cornerPierW, winH, wallT, mats.honedTravertine);

    let cursor = spanStart + cornerPierW;
    for (let b = 0; b < safeBays; b++) {
      const winCenter = cursor + winW * 0.5;
      // Dark titanium window frame + recessed opaque privacy-reflective glazing
      placeBox(winCenter, winMidY, winW, winH, 0.22, mats.charcoalTitanium, false);
      placeBox(winCenter, winMidY, Math.max(0.3, winW - 0.18), Math.max(0.3, winH - 0.18), 0.14, mats.exteriorPrivacyGlass, false);
      // Solid interior travertine wall backing behind exterior glazing margins for airtight depth
      cursor += winW;
      if (b < safeBays - 1) {
        placeBox(cursor + midPierW * 0.5, winMidY, midPierW, winH, wallT, mats.honedTravertine);
        cursor += midPierW;
      }
    }
  };

  for (const [leaf, sign] of [
    [frontDoorLeftLeaf, 1],
    [frontDoorRightLeaf, -1],
  ] as const) {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.26, 2.85, 0.1), mats.charcoalTitanium);
    frame.position.set(sign * 0.63, 1.44, 0);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(1.06, 2.55, 0.05), mats.exteriorPrivacyGlass);
    pane.position.set(sign * 0.63, 1.44, 0);
    const pull = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10), mats.champagneGold);
    pull.position.set(sign * 1.12, 1.3, -0.09);
    leaf.add(frame, pane, pull);
    leaf.rotation.y = initialDoorOpen ? (sign > 0 ? -Math.PI / 2 : Math.PI / 2) : 0;
  }
  frontDoorGroup.add(frontDoorLeftLeaf, frontDoorRightLeaf);
  southWallMesh.add(frontDoorGroup);

  // Rear North Sliding Patio Privacy Glass Doors at (0, 0.245, +11.9)
  const patioDoorGroup = new THREE.Group();
  patioDoorGroup.position.set(0, 0.245, 11.9);
  const patioDoorLeftLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.8, 0.08), mats.exteriorPrivacyGlass);
  patioDoorLeftLeaf.position.set(initialPatioOpen ? -1.45 : -0.68, 1.42, 0);
  const patioDoorRightLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.8, 0.08), mats.exteriorPrivacyGlass);
  patioDoorRightLeaf.position.set(initialPatioOpen ? 1.45 : 0.68, 1.42, 0);
  patioDoorGroup.add(patioDoorLeftLeaf, patioDoorRightLeaf);
  northWallMesh.add(patioDoorGroup);

  // Exterior Stepped Facade Shell (F1..F6 solid opaque walls + framed privacy window bays)
  const aboveGroundIds: AurelionLevelId[] = ['F1', 'F2', 'F3', 'F4', 'F5', 'F6'];
  const mullionPositions: THREE.Matrix4[] = [];
  const sconcePositions: THREE.Matrix4[] = [];

  for (const id of aboveGroundIds) {
    const spec = AURELION_LEVELS[id];
    const h = spec.ceilingY - spec.floorY;
    const midY = spec.floorY + h * 0.5;
    const hw = spec.halfWidth;
    const hd = spec.halfDepth;

    // South Facade (F1 has wide 2.7m centered grand doorway)
    if (id === 'F1') {
      addSolidWindowedFacadeSpan(southWallMesh, 'z', -hd, -hw, -1.35, spec.floorY, spec.ceilingY, 2, false);
      addSolidWindowedFacadeSpan(southWallMesh, 'z', -hd, 1.35, hw, spec.floorY, spec.ceilingY, 2, false);
      const header = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.72, 0.36), mats.honedTravertine);
      header.position.set(0, spec.ceilingY - 0.36, -hd);
      header.castShadow = true;
      const goldHeader = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.14, 0.4), mats.champagneGold);
      goldHeader.position.set(0, spec.floorY + 2.95, -hd);
      southWallMesh.add(header, goldHeader);
    } else {
      addSolidWindowedFacadeSpan(southWallMesh, 'z', -hd, -hw, hw, spec.floorY, spec.ceilingY, 4, true);
    }

    // North Facade (F1 has rear patio opening)
    if (id === 'F1') {
      addSolidWindowedFacadeSpan(northWallMesh, 'z', hd, -hw, -1.45, spec.floorY, spec.ceilingY, 2, false);
      addSolidWindowedFacadeSpan(northWallMesh, 'z', hd, 1.45, hw, spec.floorY, spec.ceilingY, 2, false);
      const nHeader = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.72, 0.36), mats.honedTravertine);
      nHeader.position.set(0, spec.ceilingY - 0.36, hd);
      nHeader.castShadow = true;
      northWallMesh.add(nHeader);
    } else {
      addSolidWindowedFacadeSpan(northWallMesh, 'z', hd, -hw, hw, spec.floorY, spec.ceilingY, 4, true);
    }

    // West & East Facades — solid opaque fortress walls with framed privacy window bays
    addSolidWindowedFacadeSpan(westWallMesh, 'x', -hw, -hd, hd, spec.floorY, spec.ceilingY, 3, true);
    addSolidWindowedFacadeSpan(eastWallMesh, 'x', hw, -hd, hd, spec.floorY, spec.ceilingY, 3, true);

    // Collect instanced silver-titanium vertical mullions & warm exterior sconces
    for (let mx = -hw + 2.5; mx <= hw - 2.5; mx += 3.2) {
      for (const zSign of [-1, 1]) {
        if (id === 'F1' && Math.abs(mx) < 1.8) continue;
        const m = new THREE.Matrix4().makeTranslation(mx, midY, zSign * (hd + 0.12));
        m.scale(new THREE.Vector3(0.14, h, 0.22));
        mullionPositions.push(m);
        const s = new THREE.Matrix4().makeTranslation(mx, spec.floorY + h - 0.55, zSign * (hd + 0.22));
        s.scale(new THREE.Vector3(0.1, 0.42, 0.08));
        sconcePositions.push(s);
      }
    }
    for (let mz = -hd + 2.5; mz <= hd - 2.5; mz += 3.2) {
      for (const xSign of [-1, 1]) {
        const m = new THREE.Matrix4().makeTranslation(xSign * (hw + 0.12), midY, mz);
        m.scale(new THREE.Vector3(0.22, h, 0.14));
        mullionPositions.push(m);
      }
    }
  }

  // Instanced Exterior Titanium Mullions
  if (mullionPositions.length > 0) {
    const mullionInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.silverTitanium, mullionPositions.length);
    mullionPositions.forEach((m, i) => mullionInst.setMatrixAt(i, m));
    mullionInst.instanceMatrix.needsUpdate = true;
    mullionInst.computeBoundingSphere();
    extGroup.add(mullionInst);
  }

  // Instanced Warm Architectural Sconces
  if (sconcePositions.length > 0) {
    const sconceInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.warmSconce, sconcePositions.length);
    sconcePositions.forEach((m, i) => sconceInst.setMatrixAt(i, m));
    sconceInst.instanceMatrix.needsUpdate = true;
    sconceInst.computeBoundingSphere();
    extGroup.add(sconceInst);
  }

  // Stepped Terrace Balustrades at Floor 5 Perimeter (X: +-12.4..+-14.95, Z: +-10.2..+-11.95)
  const f5Y = AURELION_LEVELS.F5.floorY;
  for (const [rx, rz, rw, rd] of [
    [0, -11.95, 29.9, 0.08],
    [0, 11.95, 29.9, 0.08],
    [-14.95, 0, 0.08, 23.9],
    [14.95, 0, 0.08, 23.9],
  ] as const) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(rw, 1.05, rd), mats.clearBalustradeGlass);
    rail.position.set(rx, f5Y + 0.55, rz);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(rw + 0.04, 0.06, rd + 0.04), mats.champagneGold);
    cap.position.set(rx, f5Y + 1.08, rz);
    extGroup.add(rail, cap);
  }

  // Panoramic Floor 2 South & North Cantilevered Balconies
  for (const zSign of [-1, 1]) {
    const bZ = zSign * 12.6;
    const deck = new THREE.Mesh(new THREE.BoxGeometry(10.0, 0.18, 1.4), mats.honedTravertine);
    deck.position.set(0, AURELION_LEVELS.F2.floorY - 0.09, bZ);
    const glassRail = new THREE.Mesh(new THREE.BoxGeometry(10.0, 1.02, 0.06), mats.clearBalustradeGlass);
    glassRail.position.set(0, AURELION_LEVELS.F2.floorY + 0.52, bZ + zSign * 0.68);
    extGroup.add(deck, glassRail);
  }

  // =========================================================================
  // SIGNATURE FEATURE 1: GRAND CENTRAL ATRIUM & SUSPENDED CHANDELIER (F1-F4)
  // =========================================================================
  const atriumGroup = new THREE.Group();
  atriumGroup.name = 'aurelion_grand_central_atrium';
  parent.add(atriumGroup);

  // F1 Marble Compass Medallion directly under the Atrium Void
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 0.03, 36), mats.whiteMarble);
  medallion.position.set(0, AURELION_LEVELS.F1.floorY + 0.02, 0);
  const goldRing = new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.04, 10, 48), mats.champagneGold);
  goldRing.rotation.x = Math.PI / 2;
  goldRing.position.set(0, AURELION_LEVELS.F1.floorY + 0.04, 0);
  atriumGroup.add(medallion, goldRing);

  // 4 Monumental Travertine & Champagne-Gold Atrium Piers (F1 -> F4 ceiling)
  for (const [cx, cz] of [
    [AURELION_ATRIUM_VOID.minX - 0.2, AURELION_ATRIUM_VOID.minZ - 0.2],
    [AURELION_ATRIUM_VOID.maxX + 0.2, AURELION_ATRIUM_VOID.minZ - 0.2],
    [AURELION_ATRIUM_VOID.minX - 0.2, AURELION_ATRIUM_VOID.maxZ + 0.2],
    [AURELION_ATRIUM_VOID.maxX + 0.2, AURELION_ATRIUM_VOID.maxZ + 0.2],
  ] as const) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 14.3, 18), mats.honedTravertine);
    col.position.set(cx, 7.4, cz);
    col.castShadow = false;
    atriumGroup.add(col);
  }

  // Glass Atrium Balustrades on F2, F3, F4
  for (const lvlId of ['F2', 'F3', 'F4'] as AurelionLevelId[]) {
    const y = AURELION_LEVELS[lvlId].floorY;
    for (const [bx, bz, bw, bd] of [
      [0, AURELION_ATRIUM_VOID.minZ, 6.4, 0.06],
      [0, AURELION_ATRIUM_VOID.maxZ, 6.4, 0.06],
      [AURELION_ATRIUM_VOID.minX, 0, 0.06, 5.6],
      [AURELION_ATRIUM_VOID.maxX, 0, 0.06, 5.6],
    ] as const) {
      const glassRail = new THREE.Mesh(new THREE.BoxGeometry(bw, 1.0, bd), mats.clearBalustradeGlass);
      glassRail.position.set(bx, y + 0.52, bz);
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.04, 0.05, bd + 0.04), mats.champagneGold);
      topCap.position.set(bx, y + 1.03, bz);
      atriumGroup.add(glassRail, topCap);
    }
  }

  // Suspended 4-Tier Crystal & Champagne-Gold Chandelier (Hanging from F4 Ceiling at y=14.4 down to y=6.5)
  const chandelierGroup = new THREE.Group();
  chandelierGroup.name = 'aurelion_atrium_chandelier';
  chandelierGroup.position.set(0, 14.4, 0);
  atriumGroup.add(chandelierGroup);

  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 7.6, 8), mats.champagneGold);
  cable.position.y = -3.8;
  chandelierGroup.add(cable);

  const crystalMatrices: THREE.Matrix4[] = [];
  const tierRadii = [1.85, 1.4, 0.95, 0.55];
  const tierDrops = [-1.4, -3.1, -4.8, -6.4];
  tierRadii.forEach((radius, ti) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.045, 10, 36), mats.champagneGold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = tierDrops[ti];
    chandelierGroup.add(ring);

    const crystalCount = 24 - ti * 4;
    for (let c = 0; c < crystalCount; c++) {
      const a = (c / crystalCount) * Math.PI * 2;
      const m = new THREE.Matrix4().makeTranslation(Math.cos(a) * radius, tierDrops[ti] - 0.36, Math.sin(a) * radius);
      m.scale(new THREE.Vector3(0.08, 0.58, 0.08));
      crystalMatrices.push(m);
    }
  });
  const crystalInst = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.75, 0), mats.warmSconce, crystalMatrices.length);
  crystalMatrices.forEach((m, i) => crystalInst.setMatrixAt(i, m));
  crystalInst.instanceMatrix.needsUpdate = true;
  crystalInst.computeBoundingSphere();
  chandelierGroup.add(crystalInst);

  const atriumLight = new THREE.PointLight(0xffe7bd, 2.2, 24, 1.3);
  atriumLight.castShadow = false;
  atriumLight.position.set(0, -4.6, 0);
  chandelierGroup.add(atriumLight);
  floorLights.push(atriumLight);

  // =========================================================================
  // SIGNATURE FEATURE 3: CONTINUOUS 9-LEVEL GRAND STAIRCASE (B2 -> F7)
  // Aligned identically to eastLaneX=6.65, westLaneX=5.35, Z=-3.5..+0.7
  // =========================================================================
  const stairGroup = new THREE.Group();
  stairGroup.name = 'aurelion_continuous_nine_level_staircase';
  parent.add(stairGroup);

  const treadMatrices: THREE.Matrix4[] = [];
  const nosingMatrices: THREE.Matrix4[] = [];
  const postMatrices: THREE.Matrix4[] = [];

  for (let i = 0; i < AURELION_LEVEL_ORDER.length - 1; i++) {
    const lowerSpec = AURELION_LEVELS[AURELION_LEVEL_ORDER[i]];
    const upperSpec = AURELION_LEVELS[AURELION_LEVEL_ORDER[i + 1]];

    // BasementControlRoom already builds physical steel flights for B1 (-4.0) <-> F1 (0.245) at identical coords
    if (lowerSpec.id === 'B1' && upperSpec.id === 'F1') {
      continue;
    }

    const numSteps = 14;
    const totalRise = upperSpec.floorY - lowerSpec.floorY;
    const stepH = totalRise / numSteps;
    const z0 = AURELION_STAIR_VOID.zStart;
    const z1 = AURELION_STAIR_VOID.zEnd;
    const dz = z1 - z0;
    const stepD = dz / numSteps;
    const reverse = i % 2 === 1;
    const useWestLane = i >= 2 ? !reverse : reverse;
    const laneX = useWestLane ? AURELION_STAIR_VOID.westLaneX : AURELION_STAIR_VOID.eastLaneX;

    for (let s = 0; s < numSteps; s++) {
      const p = (s + 0.5) / numSteps;
      const z = reverse ? z1 - p * dz : z0 + p * dz;
      const y = lowerSpec.floorY + (s + 0.5) * stepH;

      const tm = new THREE.Matrix4().makeTranslation(laneX, y, z);
      tm.scale(new THREE.Vector3(1.18, stepH, stepD + 0.04));
      treadMatrices.push(tm);

      const nm = new THREE.Matrix4().makeTranslation(laneX, y + stepH * 0.5 + 0.012, z + (reverse ? -stepD * 0.45 : stepD * 0.45));
      nm.scale(new THREE.Vector3(1.18, 0.025, 0.05));
      nosingMatrices.push(nm);

      if (s % 2 === 0) {
        for (const sx of [laneX - 0.58, laneX + 0.58]) {
          const pm = new THREE.Matrix4().makeTranslation(sx, y + 0.48, z);
          pm.scale(new THREE.Vector3(0.035, 0.92, 0.035));
          postMatrices.push(pm);
        }
      }
    }

    // Sloped Gold Handrails
    for (const sx of [laneX - 0.58, laneX + 0.58]) {
      const len = Math.hypot(totalRise, dz);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, len, 8), mats.champagneGold);
      rail.position.set(sx, lowerSpec.floorY + totalRise * 0.5 + 0.92, (z0 + z1) * 0.5);
      rail.rotation.x = Math.PI / 2 + (reverse ? Math.atan2(totalRise, dz) : -Math.atan2(totalRise, dz));
      stairGroup.add(rail);
    }

    // Top landing bridge strip connecting laneX cleanly back to slab
    const landZ = reverse ? z0 - 0.6 : z1 + 0.6;
    const landing = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.18, 1.25), mats.honedTravertine);
    landing.position.set(6.0, upperSpec.floorY - 0.09, landZ);
    landing.receiveShadow = true;
    stairGroup.add(landing);
  }

  if (treadMatrices.length > 0) {
    const treadInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.walnutWood, treadMatrices.length);
    treadMatrices.forEach((m, idx) => treadInst.setMatrixAt(idx, m));
    treadInst.instanceMatrix.needsUpdate = true;
    treadInst.computeBoundingSphere();
    stairGroup.add(treadInst);
  }
  if (nosingMatrices.length > 0) {
    const nosingInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.champagneGold, nosingMatrices.length);
    nosingMatrices.forEach((m, idx) => nosingInst.setMatrixAt(idx, m));
    nosingInst.instanceMatrix.needsUpdate = true;
    nosingInst.computeBoundingSphere();
    stairGroup.add(nosingInst);
  }
  if (postMatrices.length > 0) {
    const postInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), mats.silverTitanium, postMatrices.length);
    postMatrices.forEach((m, idx) => postInst.setMatrixAt(idx, m));
    postInst.instanceMatrix.needsUpdate = true;
    postInst.computeBoundingSphere();
    stairGroup.add(postInst);
  }

  // Stairwell glass perimeter safety railings on F1..F7 so player doesn't accidentally drop down stairwell
  for (const lvlId of ['B1', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] as AurelionLevelId[]) {
    const y = AURELION_LEVELS[lvlId].floorY;
    // Guard west side of stairwell; keep North/South entry ends open for stairs
    const guardW = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 4.4), mats.clearBalustradeGlass);
    guardW.position.set(AURELION_STAIR_VOID.minX, y + 0.5, -1.4);
    const guardE = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.98, 4.4), mats.clearBalustradeGlass);
    guardE.position.set(AURELION_STAIR_VOID.maxX, y + 0.5, -1.4);
    stairGroup.add(guardW, guardE);
  }

  // =========================================================================
  // SIGNATURE FEATURE 2: THREE WORKING ELEVATORS (MAIN, SERVICE, PRIVATE VIP)
  // =========================================================================
  const elevRoot = new THREE.Group();
  elevRoot.name = 'aurelion_three_elevator_system';
  parent.add(elevRoot);

  const elevatorVisuals = {} as AurelionArchitectureHandles['elevatorVisuals'];

  (['main', 'service', 'private'] as ElevatorId[]).forEach((id) => {
    const cfg = AURELION_ELEVATOR_CONFIGS[id];
    const minY = AURELION_LEVELS[cfg.stops[0]].floorY;
    const maxY = AURELION_LEVELS[cfg.stops[cfg.stops.length - 1]].ceilingY;
    const shaftH = maxY - minY;
    const midY = (minY + maxY) * 0.5;

    const shaftGroup = new THREE.Group();
    shaftGroup.name = `aurelion_elevator_shaft_${id}`;
    shaftGroup.position.set(cfg.localX, 0, cfg.localZ);
    elevRoot.add(shaftGroup);

    const frameMat = id === 'service' ? mats.industrialSteel : id === 'private' ? mats.champagneGold : mats.silverTitanium;
    const halfC = cfg.cabW * 0.5 + 0.08;

    // Corner Structural Guide Rails
    for (const [cx, cz] of [
      [-halfC, -halfC],
      [halfC, -halfC],
      [-halfC, halfC],
      [halfC, halfC],
    ] as const) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.11, shaftH, 0.11), frameMat);
      rail.position.set(cx, midY, cz);
      shaftGroup.add(rail);
    }

    // Glazed Side Panels of Shaft
    const sideGlassW = new THREE.Mesh(new THREE.BoxGeometry(0.05, shaftH, cfg.cabD), mats.bronzeSmartGlass);
    sideGlassW.position.set(-halfC, midY, 0);
    const sideGlassE = sideGlassW.clone();
    sideGlassE.position.x = halfC;
    const backGlass = new THREE.Mesh(new THREE.BoxGeometry(cfg.cabW, shaftH, 0.05), mats.bronzeSmartGlass);
    backGlass.position.set(0, midY, halfC);
    shaftGroup.add(sideGlassW, sideGlassE, backGlass);

    // Per-Floor Landing Call Buttons & Plaque
    for (const stopId of cfg.stops) {
      const fy = AURELION_LEVELS[stopId].floorY;
      const callPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.34, 0.08), frameMat);
      callPedestal.position.set(halfC + 0.16, fy + 1.25, -halfC);
      const callButton = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.09), mats.cyanTelemetry);
      callButton.position.set(halfC + 0.16, fy + 1.28, -halfC - 0.02);
      shaftGroup.add(callPedestal, callButton);
    }

    // Moving Elevator Cab
    const cabGroup = new THREE.Group();
    cabGroup.name = `aurelion_elevator_cab_${id}`;
    cabGroup.position.y = AURELION_LEVELS.F1.floorY;
    shaftGroup.add(cabGroup);

    const cabFloor = new THREE.Mesh(
      new THREE.BoxGeometry(cfg.cabW, 0.12, cfg.cabD),
      id === 'service' ? mats.industrialSteel : mats.whiteMarble
    );
    cabFloor.position.y = -0.05;
    cabFloor.receiveShadow = true;

    const cabCeiling = new THREE.Mesh(new THREE.BoxGeometry(cfg.cabW, 0.1, cfg.cabD), frameMat);
    cabCeiling.position.y = 2.52;
    const cabLightStrip = new THREE.Mesh(new THREE.BoxGeometry(cfg.cabW * 0.7, 0.04, cfg.cabD * 0.7), mats.warmSconce);
    cabLightStrip.position.y = 2.45;

    const cabWallBack = new THREE.Mesh(new THREE.BoxGeometry(cfg.cabW, 2.45, 0.06), id === 'service' ? mats.industrialSteel : mats.walnutWood);
    cabWallBack.position.set(0, 1.24, cfg.cabD * 0.5 - 0.03);
    const cabWallL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.45, cfg.cabD - 0.12), mats.bronzeSmartGlass);
    cabWallL.position.set(-cfg.cabW * 0.5 + 0.03, 1.24, 0);
    const cabWallR = cabWallL.clone();
    cabWallR.position.x = cfg.cabW * 0.5 - 0.03;

    // Animated Sliding Cab Doors (Front -Z face)
    const doorMat = id === 'service' ? mats.industrialSteel : mats.champagneGold;
    const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(cfg.cabW * 0.46, 2.32, 0.05), doorMat);
    doorLeft.position.set(-cfg.cabW * 0.44, 1.2, -cfg.cabD * 0.5 + 0.03);
    const doorRight = new THREE.Mesh(new THREE.BoxGeometry(cfg.cabW * 0.46, 2.32, 0.05), doorMat);
    doorRight.position.set(cfg.cabW * 0.44, 1.2, -cfg.cabD * 0.5 + 0.03);

    // Live Floor Indicator Screen inside Cab
    const indCanvas = document.createElement('canvas');
    indCanvas.width = 256;
    indCanvas.height = 128;
    const indCtx = indCanvas.getContext('2d');
    const indTex = mats.trackCustomTexture(new THREE.CanvasTexture(indCanvas));
    indTex.colorSpace = THREE.SRGBColorSpace;
    const indMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: indTex }));
    const indScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.42), indMat);
    indScreen.position.set(0, 2.1, cfg.cabD * 0.5 - 0.08);
    indScreen.rotation.y = Math.PI;

    cabGroup.add(cabFloor, cabCeiling, cabLightStrip, cabWallBack, cabWallL, cabWallR, doorLeft, doorRight, indScreen);

    elevatorVisuals[id] = {
      shaftGroup,
      cabGroup,
      doorLeft,
      doorRight,
      indicatorCtx: indCtx,
      indicatorTex: indTex,
      indicatorCanvas: indCanvas,
    };
  });

  return {
    southWallMesh,
    northWallMesh,
    eastWallMesh,
    westWallMesh,
    frontDoorLeftLeaf,
    frontDoorRightLeaf,
    patioDoorLeftLeaf,
    patioDoorRightLeaf,
    chandelierGroup,
    elevRoot,
    floorLights,
    elevatorVisuals,
  };
}

export function syncAurelionElevatorsVisual(
  handles: AurelionArchitectureHandles,
  systems: AurelionMansionSystems
) {
  (['main', 'service', 'private'] as ElevatorId[]).forEach((id) => {
    const st = systems.elevators[id];
    const vis = handles.elevatorVisuals[id];
    const cfg = AURELION_ELEVATOR_CONFIGS[id];
    if (!vis) return;

    vis.cabGroup.position.y = st.currentY;
    const slideOffset = THREE.MathUtils.lerp(cfg.cabW * 0.23, cfg.cabW * 0.47, st.doorOpenFactor);
    vis.doorLeft.position.x = -slideOffset;
    vis.doorRight.position.x = slideOffset;

    if (vis.indicatorCtx) {
      const stateKey = `${st.currentFloor}|${st.moving ? 1 : 0}|${st.targetFloor}|${st.lockedByLoadShedding ? 1 : 0}`;
      if (vis.lastIndicatorState !== stateKey) {
        vis.lastIndicatorState = stateKey;
        const ctx = vis.indicatorCtx;
        ctx.fillStyle = '#0a0f18';
        ctx.fillRect(0, 0, 256, 128);
        ctx.strokeStyle = st.lockedByLoadShedding ? '#ef4444' : '#d4b26a';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, 248, 120);
        ctx.fillStyle = st.lockedByLoadShedding ? '#f87171' : '#f4d58d';
        ctx.font = 'bold 42px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(st.currentFloor, 128, 62);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '18px monospace';
        ctx.fillText(
          st.lockedByLoadShedding
            ? 'POWER SHED'
            : st.moving
              ? `MOVING -> ${st.targetFloor}`
              : '[E] SELECT FLOOR',
          128,
          102
        );
        vis.indicatorTex.needsUpdate = true;
      }
    }
  });
}
