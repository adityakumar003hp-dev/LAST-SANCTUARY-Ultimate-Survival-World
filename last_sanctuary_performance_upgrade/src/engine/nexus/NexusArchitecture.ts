import * as THREE from 'three';
import {
  NEXUS_ELEVATORS,
  NEXUS_FLOOR_ORDER,
  NEXUS_FLOORS,
  NEXUS_STAIRWELL,
  NexusElevatorId,
  NexusFloorNumber,
} from './NexusConfig';
import { NexusMaterials } from './NexusMaterials';
import type { NexusSystems } from './NexusSystems';

export interface NexusElevatorMeshHandle {
  cabGroup: THREE.Group;
  doorLeft: THREE.Mesh;
  doorRight: THREE.Mesh;
  indicatorLightsByFloor: THREE.Mesh[];
  floorReadoutMats: THREE.MeshBasicMaterial[];
}

export interface NexusArchitectureHandles {
  southExteriorGroup: THREE.Group;
  northExteriorGroup: THREE.Group;
  westExteriorGroup: THREE.Group;
  eastExteriorGroup: THREE.Group;
  crownGroup: THREE.Group;
  crownRing: THREE.Mesh;
  elevators: Record<NexusElevatorId, NexusElevatorMeshHandle>;
  restrictedGateGroup: THREE.Group;
  entranceDoorLeft: THREE.Mesh;
  entranceDoorRight: THREE.Mesh;
  entranceDoorOpenFactor: number;
  geometries: THREE.BufferGeometry[];
}

function trackGeo<T extends THREE.BufferGeometry>(list: THREE.BufferGeometry[], g: T): T {
  list.push(g);
  return g;
}

/**
 * Builds the 8-floor unified facade, structural slab plates with shaft & stair openings,
 * dramatic South entrance portico, illuminated rooftop crown, 8-floor staircase,
 * and Lift A + Lift B animated cabs & call stations.
 */
export function buildNexusArchitecture(
  root: THREE.Group,
  mats: NexusMaterials
): NexusArchitectureHandles {
  const geometries: THREE.BufferGeometry[] = [];

  // Monumental Basalt/Graphite Plinth
  const plinth = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.8, 0.56, 18.8)), mats.darkGraphite);
  plinth.position.y = 0.28;
  plinth.receiveShadow = true;
  root.add(plinth);

  const plinthGoldTrim = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(23.0, 0.08, 19.0)), mats.champagneGold);
  plinthGoldTrim.position.y = 0.57;
  root.add(plinthGoldTrim);

  // Exterior Wall Cutaway Groups (for interior camera clarity)
  const southExteriorGroup = new THREE.Group();
  southExteriorGroup.name = 'nexus_exterior_south';
  const northExteriorGroup = new THREE.Group();
  northExteriorGroup.name = 'nexus_exterior_north';
  const westExteriorGroup = new THREE.Group();
  westExteriorGroup.name = 'nexus_exterior_west';
  const eastExteriorGroup = new THREE.Group();
  eastExteriorGroup.name = 'nexus_exterior_east';
  root.add(southExteriorGroup, northExteriorGroup, westExteriorGroup, eastExteriorGroup);

  const roofTopY = NEXUS_FLOORS[8].floorY + NEXUS_FLOORS[8].ceilingHeight; // 31.05m

  // Continuous Architectural Champagne-Gold Fins & Silver Titanium Mullions along the 8-floor height
  const totalFacadeH = roofTopY - 0.65;
  const facadeMidY = 0.65 + totalFacadeH * 0.5;
  for (const fx of [-10.9, -7.2, -3.6, 3.6, 7.2, 10.9]) {
    for (const fz of [-9.08, 9.08]) {
      const fin = new THREE.Mesh(
        trackGeo(geometries, new THREE.BoxGeometry(0.28, totalFacadeH + 0.5, 0.36)),
        Math.abs(fx) > 10 ? mats.champagneGold : mats.silverTitanium
      );
      fin.position.set(fx, facadeMidY, fz);
      fin.castShadow = true;
      (fz < 0 ? southExteriorGroup : northExteriorGroup).add(fin);
    }
  }
  for (const fz of [-8.8, -4.4, 0, 4.4, 8.8]) {
    for (const fx of [-11.08, 11.08]) {
      const fin = new THREE.Mesh(
        trackGeo(geometries, new THREE.BoxGeometry(0.36, totalFacadeH + 0.4, 0.26)),
        Math.abs(fz) > 8 ? mats.champagneGold : mats.silverTitanium
      );
      fin.position.set(fx, facadeMidY, fz);
      fin.castShadow = true;
      (fx < 0 ? westExteriorGroup : eastExteriorGroup).add(fin);
    }
  }

  // Build Floor Slabs & Per-Floor Facade Spans (F1..F8)
  for (const fl of NEXUS_FLOOR_ORDER) {
    const spec = NEXUS_FLOORS[fl];
    const fy = spec.floorY;
    const h = spec.ceilingHeight;
    const surfaceMat = mats.getFloorSurfaceMaterial(fl);
    const accentLed = mats.getFloorAccentLed(fl);

    if (fl === 1) {
      // Solid Ground Atrium Slab
      const slab = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.2, 0.22, 18.2)), surfaceMat);
      slab.position.set(0, fy - 0.11, 0);
      slab.receiveShadow = true;
      root.add(slab);
    } else {
      // Upper Slabs (F2..F8) with clean open voids for Lift A, Lift B, and East Stairwell
      const mainPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(12.85, 0.22, 18.0)), surfaceMat);
      mainPlate.position.set(-0.025, fy - 0.11, 0);
      mainPlate.receiveShadow = true;
      root.add(mainPlate);

      const westSouthPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.45, 0.22, 5.9)), surfaceMat);
      westSouthPlate.position.set(-8.675, fy - 0.11, -6.05);
      const westMidPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.45, 0.22, 1.8)), surfaceMat);
      westMidPlate.position.set(-8.675, fy - 0.11, 0);
      const westNorthPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.45, 0.22, 5.9)), surfaceMat);
      westNorthPlate.position.set(-8.675, fy - 0.11, 6.05);
      const westBackPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(2.15, 0.22, 6.2)), surfaceMat);
      westBackPlate.position.set(-9.825, fy - 0.11, 0);

      const stairSouthPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.5, 0.22, 3.8)), surfaceMat);
      stairSouthPlate.position.set(8.65, fy - 0.11, -7.1);
      const stairNorthPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(4.5, 0.22, 3.0)), surfaceMat);
      stairNorthPlate.position.set(8.65, fy - 0.11, 7.5);
      const stairEastPlate = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(1.3, 0.22, 11.2)), surfaceMat);
      stairEastPlate.position.set(10.25, fy - 0.11, 0.4);

      [westSouthPlate, westMidPlate, westNorthPlate, westBackPlate, stairSouthPlate, stairNorthPlate, stairEastPlate].forEach((m) => {
        m.receiveShadow = true;
        root.add(m);
      });
    }

    // Exterior Spandrel Bands + Bronze Smart Glass Curtain Walls
    for (const side of [-1, 1] as const) {
      const x = side * 10.95;
      const spandrel = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.26, 0.72, 18.0)), mats.darkGraphite);
      spandrel.position.set(x, fy + 0.36, 0);
      const header = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.28, 0.56, 18.0)), mats.charcoalCore);
      header.position.set(x, fy + h - 0.28, 0);
      const glassPane = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.08, h - 1.28, 17.6)), mats.bronzeSmartGlass);
      glassPane.position.set(x, fy + 0.72 + (h - 1.28) * 0.5, 0);
      const ledBand = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.06, 0.06, 18.05)), accentLed);
      ledBand.position.set(x + side * 0.14, fy + h - 0.05, 0);
      (side < 0 ? westExteriorGroup : eastExteriorGroup).add(spandrel, header, glassPane, ledBand);
    }

    // North Facade (Solid Structural Video-Wall Backing + Glass Flanking Ribbons)
    const northBacking = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(15.6, h - 0.15, 0.26)), mats.charcoalCore);
    northBacking.position.set(-0.2, fy + h * 0.5, 8.92);
    const northGlassL = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.2, h - 0.6, 0.1)), mats.bronzeSmartGlass);
    northGlassL.position.set(-9.4, fy + h * 0.5, 8.92);
    const northGlassR = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.2, h - 0.6, 0.1)), mats.bronzeSmartGlass);
    northGlassR.position.set(9.4, fy + h * 0.5, 8.92);
    const northLed = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.1, 0.06, 0.06)), accentLed);
    northLed.position.set(0, fy + h - 0.05, 9.06);
    northExteriorGroup.add(northBacking, northGlassL, northGlassR, northLed);

    // South Facade (Grand Central Portico on F1, Panoramic Bronze Smart Glass on F2..F8)
    if (fl === 1) {
      for (const sx of [-6.9, 6.9]) {
        const southLower = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(8.2, 0.9, 0.28)), mats.darkGraphite);
        southLower.position.set(sx, fy + 0.45, -8.92);
        const southGlass = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(8.0, h - 1.5, 0.1)), mats.bronzeSmartGlass);
        southGlass.position.set(sx, fy + 0.9 + (h - 1.5) * 0.5, -8.92);
        const southTop = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(8.2, 0.6, 0.28)), mats.darkGraphite);
        southTop.position.set(sx, fy + h - 0.3, -8.92);
        southExteriorGroup.add(southLower, southGlass, southTop);
      }
      // Dramatic Central Entrance Arch & Cantilevered Canopy (facing South plaza)
      const portalFrameL = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.45, h, 0.56)), mats.champagneGold);
      portalFrameL.position.set(-2.65, fy + h * 0.5, -8.95);
      const portalFrameR = portalFrameL.clone();
      portalFrameR.position.x = 2.65;
      const portalLint = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(5.8, 0.72, 0.65)), mats.darkGraphite);
      portalLint.position.set(0, fy + h - 0.36, -8.95);
      const grandCanopy = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(7.2, 0.24, 2.4)), mats.darkGraphite);
      grandCanopy.position.set(0, fy + 3.65, -10.1);
      const canopyGoldEdge = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(7.35, 0.09, 2.48)), mats.champagneGold);
      canopyGoldEdge.position.set(0, fy + 3.79, -10.1);
      const canopyLed = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(7.1, 0.06, 0.06)), mats.goldLed);
      canopyLed.position.set(0, fy + 3.54, -11.25);
      southExteriorGroup.add(portalFrameL, portalFrameR, portalLint, grandCanopy, canopyGoldEdge, canopyLed);
    } else {
      const southLow = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.0, 0.72, 0.24)), mats.darkGraphite);
      southLow.position.set(0, fy + 0.36, -8.92);
      const southTop = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.0, 0.54, 0.24)), mats.charcoalCore);
      southTop.position.set(0, fy + h - 0.27, -8.92);
      const southGlass = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(21.4, h - 1.26, 0.08)), mats.bronzeSmartGlass);
      southGlass.position.set(0, fy + 0.72 + (h - 1.26) * 0.5, -8.92);
      const southLed = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.1, 0.06, 0.06)), accentLed);
      southLed.position.set(0, fy + h - 0.05, -9.06);
      southExteriorGroup.add(southLow, southTop, southGlass, southLed);
    }
  }

  // Roof Slab + Illuminated Luxury Crown above Floor 8 (within footprint)
  const crownGroup = new THREE.Group();
  crownGroup.name = 'nexus_illuminated_crown';
  crownGroup.position.y = roofTopY;
  root.add(crownGroup);

  const roofDeck = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(22.4, 0.38, 18.4)), mats.darkGraphite);
  roofDeck.position.y = 0.19;
  crownGroup.add(roofDeck);

  const crownTier1 = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(20.6, 1.35, 16.6)), mats.charcoalCore);
  crownTier1.position.y = 1.05;
  const crownTier1Glass = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(20.8, 0.72, 16.8)), mats.bronzeSmartGlass);
  crownTier1Glass.position.y = 1.1;
  const crownGoldHalo = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(21.1, 0.18, 17.1)), mats.crownGlowMat);
  crownGoldHalo.position.y = 1.8;

  const crownTier2 = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(14.8, 1.45, 11.4)), mats.darkGraphite);
  crownTier2.position.y = 2.6;
  const crownRing = new THREE.Mesh(trackGeo(geometries, new THREE.TorusGeometry(4.4, 0.14, 12, 48)), mats.crownGlowMat);
  crownRing.rotation.x = Math.PI / 2;
  crownRing.position.y = 3.55;

  // Dual Telemetry Antenna Spires atop the Crown
  for (const ax of [-4.6, 4.6]) {
    const spire = new THREE.Mesh(trackGeo(geometries, new THREE.CylinderGeometry(0.08, 0.22, 4.2, 10)), mats.silverTitanium);
    spire.position.set(ax, 5.2, 2.2);
    const beacon = new THREE.Mesh(trackGeo(geometries, new THREE.SphereGeometry(0.18, 10, 10)), mats.crimsonLed);
    beacon.position.set(ax, 7.35, 2.2);
    crownGroup.add(spire, beacon);
  }
  crownGroup.add(crownTier1, crownTier1Glass, crownGoldHalo, crownTier2, crownRing);

  // Continuous 8-Floor Staircase (East Stairwell: X = 8.2, Z = -4.0..+4.2)
  const stairGroup = new THREE.Group();
  stairGroup.name = 'nexus_eight_floor_staircase';
  root.add(stairGroup);
  for (let i = 0; i < 7; i++) {
    const flStart = NEXUS_FLOORS[(i + 1) as NexusFloorNumber].floorY;
    const flEnd = NEXUS_FLOORS[(i + 2) as NexusFloorNumber].floorY;
    const rise = flEnd - flStart;
    const steps = 16;
    const runLen = NEXUS_STAIRWELL.zEnd - NEXUS_STAIRWELL.zStart;
    for (let s = 0; s < steps; s++) {
      const tread = new THREE.Mesh(
        trackGeo(geometries, new THREE.BoxGeometry(NEXUS_STAIRWELL.width, 0.14, (runLen / steps) + 0.08)),
        mats.charcoalCore
      );
      tread.position.set(
        NEXUS_STAIRWELL.laneX,
        flStart + ((s + 0.7) / steps) * rise,
        NEXUS_STAIRWELL.zStart + ((s + 0.5) / steps) * runLen
      );
      tread.castShadow = true;
      stairGroup.add(tread);

      const nosing = new THREE.Mesh(
        trackGeo(geometries, new THREE.BoxGeometry(NEXUS_STAIRWELL.width - 0.1, 0.03, 0.05)),
        mats.champagneGold
      );
      nosing.position.set(tread.position.x, tread.position.y + 0.075, tread.position.z - 0.18);
      stairGroup.add(nosing);
    }
    // North landing & South landing tie
    const landingN = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(3.2, 0.18, 1.6)), mats.darkGraphite);
    landingN.position.set(NEXUS_STAIRWELL.laneX, flEnd - 0.09, NEXUS_STAIRWELL.zEnd + 0.9);
    stairGroup.add(landingN);

    // Glass & Gold Stair Railings
    for (const rx of [NEXUS_STAIRWELL.laneX - 1.35, NEXUS_STAIRWELL.laneX + 1.35]) {
      const rail = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.06, 0.9, runLen)), mats.bronzeSmartGlass);
      rail.position.set(rx, flStart + rise * 0.5 + 0.55, (NEXUS_STAIRWELL.zStart + NEXUS_STAIRWELL.zEnd) * 0.5);
      rail.rotation.x = -Math.atan2(rise, runLen);
      stairGroup.add(rail);
    }
  }

  // Strictly TWO Independent Functional Passenger Elevators (Lift A & Lift B)
  const buildElevatorShaftAndCab = (elevId: NexusElevatorId): NexusElevatorMeshHandle => {
    const cfg = NEXUS_ELEVATORS[elevId];
    const isLuxury = cfg.theme === 'luxury_glass';
    const shaftGroup = new THREE.Group();
    shaftGroup.name = `nexus_${elevId}_shaft`;
    shaftGroup.position.set(cfg.localX, 0, cfg.localZ);
    root.add(shaftGroup);

    const frameMat = isLuxury ? mats.champagneGold : mats.silverTitanium;
    const wallMat = isLuxury ? mats.bronzeSmartGlass : mats.darkGraphite;
    const ledMat = isLuxury ? mats.goldLed : mats.cyanLed;

    // 4 Corner Guide Rails spanning Floors 1..8
    const shaftH = roofTopY - 0.4;
    const postHalfW = cfg.cabW * 0.5 + 0.14;
    const postHalfD = cfg.cabD * 0.5 + 0.14;
    for (const [px, pz] of [
      [-postHalfW, -postHalfD],
      [postHalfW, -postHalfD],
      [-postHalfW, postHalfD],
      [postHalfW, postHalfD],
    ] as const) {
      const post = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.14, shaftH, 0.14)), frameMat);
      post.position.set(px, 0.4 + shaftH * 0.5, pz);
      shaftGroup.add(post);
    }

    // Back / Side Shaft Cladding
    const backPanel = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.08, shaftH, cfg.cabD + 0.18)), wallMat);
    backPanel.position.set(-postHalfW, 0.4 + shaftH * 0.5, 0);
    shaftGroup.add(backPanel);

    // Call Button & Floor Indicator on every floor (F1..F8) facing East lobby
    const indicatorLightsByFloor: THREE.Mesh[] = [];
    const floorReadoutMats: THREE.MeshBasicMaterial[] = [];
    for (const fl of NEXUS_FLOOR_ORDER) {
      const fy = NEXUS_FLOORS[fl].floorY;
      const callConsole = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.18, 0.9, 0.34)), mats.darkGraphite);
      callConsole.position.set(cfg.callButtonLocalX - cfg.localX, fy + 1.15, 0.85);
      const callButton = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.06, 0.22, 0.16)), ledMat);
      callButton.position.set(cfg.callButtonLocalX - cfg.localX + 0.1, fy + 1.25, 0.85);
      const indMat = new THREE.MeshBasicMaterial({ color: fl === 1 ? 0x22c55e : 0x334155 });
      floorReadoutMats.push(indMat);
      const indMesh = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.08, 0.14, 0.48)), indMat);
      indMesh.position.set(postHalfW + 0.05, fy + 2.45, 0);
      indicatorLightsByFloor.push(indMesh);
      shaftGroup.add(callConsole, callButton, indMesh);
    }

    // Moving Elevator Cab
    const cabGroup = new THREE.Group();
    cabGroup.name = `nexus_${elevId}_cab`;
    cabGroup.position.set(0, NEXUS_FLOORS[1].floorY, 0);
    shaftGroup.add(cabGroup);

    const cabFloor = new THREE.Mesh(
      trackGeo(geometries, new THREE.BoxGeometry(cfg.cabW, 0.14, cfg.cabD)),
      isLuxury ? mats.f1TravertineMarble : mats.titaniumCabInterior
    );
    cabFloor.position.y = -0.06;
    const cabCeiling = new THREE.Mesh(
      trackGeo(geometries, new THREE.BoxGeometry(cfg.cabW, 0.14, cfg.cabD)),
      isLuxury ? mats.champagneGold : mats.darkGraphite
    );
    cabCeiling.position.y = cfg.cabH;
    const cabLightStrip = new THREE.Mesh(
      trackGeo(geometries, new THREE.BoxGeometry(cfg.cabW * 0.72, 0.04, cfg.cabD * 0.72)),
      ledMat
    );
    cabLightStrip.position.y = cfg.cabH - 0.08;

    const cabBack = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.08, cfg.cabH, cfg.cabD)), wallMat);
    cabBack.position.set(-cfg.cabW * 0.5 + 0.04, cfg.cabH * 0.5, 0);
    const cabSideN = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(cfg.cabW, cfg.cabH, 0.07)), wallMat);
    cabSideN.position.set(0, cfg.cabH * 0.5, cfg.cabD * 0.5 - 0.035);
    const cabSideS = cabSideN.clone();
    cabSideS.position.z = -cfg.cabD * 0.5 + 0.035;

    // Animated East-facing Sliding Doors
    const doorHalfD = cfg.cabD * 0.48;
    const doorLeft = new THREE.Mesh(
      trackGeo(geometries, new THREE.BoxGeometry(0.06, cfg.cabH - 0.12, doorHalfD)),
      isLuxury ? mats.clearPanoramaGlass : mats.silverTitanium
    );
    doorLeft.position.set(cfg.cabW * 0.5 - 0.04, cfg.cabH * 0.5, -doorHalfD * 0.5);
    const doorRight = new THREE.Mesh(
      trackGeo(geometries, new THREE.BoxGeometry(0.06, cfg.cabH - 0.12, doorHalfD)),
      isLuxury ? mats.clearPanoramaGlass : mats.silverTitanium
    );
    doorRight.position.set(cfg.cabW * 0.5 - 0.04, cfg.cabH * 0.5, doorHalfD * 0.5);

    cabGroup.add(cabFloor, cabCeiling, cabLightStrip, cabBack, cabSideN, cabSideS, doorLeft, doorRight);

    return { cabGroup, doorLeft, doorRight, indicatorLightsByFloor, floorReadoutMats };
  };

  const elevators: Record<NexusElevatorId, NexusElevatorMeshHandle> = {
    liftA: buildElevatorShaftAndCab('liftA'),
    liftB: buildElevatorShaftAndCab('liftB'),
  };

  // Floor 1 Restricted Staff Access Turnstile/Gate Indicator (W-North Staff Reception Office at X = -5.2, Z = 4.2..9.0)
  const restrictedGateGroup = new THREE.Group();
  restrictedGateGroup.name = 'nexus_f1_restricted_access_barrier';
  const gateLeaf = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.12, 1.35, 1.9)), mats.bronzeSmartGlass);
  gateLeaf.position.set(-5.2, NEXUS_FLOORS[1].floorY + 0.72, 6.2);
  const gateBar = new THREE.Mesh(trackGeo(geometries, new THREE.BoxGeometry(0.16, 0.08, 1.92)), mats.crimsonLed);
  gateBar.position.set(-5.2, NEXUS_FLOORS[1].floorY + 1.35, 6.2);
  restrictedGateGroup.add(gateLeaf, gateBar);
  root.add(restrictedGateGroup);

  // Automated Bronze-Glass Sliding Grand Entrance Doors (South Portal Z = -8.92)
  const entranceDoorLeft = new THREE.Mesh(
    trackGeo(geometries, new THREE.BoxGeometry(2.35, 3.6, 0.1)),
    mats.bronzeSmartGlass
  );
  entranceDoorLeft.position.set(-1.18, NEXUS_FLOORS[1].floorY + 1.8, -8.92);
  const entranceDoorRight = new THREE.Mesh(
    trackGeo(geometries, new THREE.BoxGeometry(2.35, 3.6, 0.1)),
    mats.bronzeSmartGlass
  );
  entranceDoorRight.position.set(1.18, NEXUS_FLOORS[1].floorY + 1.8, -8.92);
  root.add(entranceDoorLeft, entranceDoorRight);

  return {
    southExteriorGroup,
    northExteriorGroup,
    westExteriorGroup,
    eastExteriorGroup,
    crownGroup,
    crownRing,
    elevators,
    restrictedGateGroup,
    entranceDoorLeft,
    entranceDoorRight,
    entranceDoorOpenFactor: 0,
    geometries,
  };
}

export function syncNexusArchitectureVisuals(
  handles: NexusArchitectureHandles,
  systems: NexusSystems,
  delta: number,
  entranceDesiredOpen = false
): void {
  handles.crownRing.rotation.z += delta * 0.25;

  // Smooth Grand Entrance Sliding Glass Doors
  const targetDoor = entranceDesiredOpen ? 1 : 0;
  handles.entranceDoorOpenFactor = THREE.MathUtils.damp(handles.entranceDoorOpenFactor, targetDoor, 7.5, delta);
  const doorSlide = handles.entranceDoorOpenFactor * 2.15;
  handles.entranceDoorLeft.position.x = -1.18 - doorSlide;
  handles.entranceDoorRight.position.x = 1.18 + doorSlide;

  (['liftA', 'liftB'] as NexusElevatorId[]).forEach((elevId) => {
    const h = handles.elevators[elevId];
    const st = systems.elevators[elevId];
    const cfg = NEXUS_ELEVATORS[elevId];

    h.cabGroup.position.y = st.currentY;
    const doorHalfD = cfg.cabD * 0.48;
    const openSlide = st.doorOpenFactor * (doorHalfD * 0.88);
    h.doorLeft.position.z = -doorHalfD * 0.5 - openSlide;
    h.doorRight.position.z = doorHalfD * 0.5 + openSlide;

    h.floorReadoutMats.forEach((mat, idx) => {
      const fl = idx + 1;
      if (st.maintenanceHold) {
        mat.color.setHex(0xef4444);
      } else if (fl === st.currentFloor) {
        mat.color.setHex(0x22c55e);
      } else if (fl === st.targetFloor && st.moving) {
        mat.color.setHex(0xf59e0b);
      } else {
        mat.color.setHex(0x1e293b);
      }
    });
  });

  // Restricted Room Barrier Slide on F1
  const targetBarrierY = systems.restrictedRoomsUnlocked ? 2.4 : 0;
  handles.restrictedGateGroup.position.y = THREE.MathUtils.damp(
    handles.restrictedGateGroup.position.y,
    targetBarrierY,
    8,
    delta
  );
}
