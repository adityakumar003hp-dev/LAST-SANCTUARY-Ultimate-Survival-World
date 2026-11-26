import * as THREE from 'three';
import {
  AURELION_LEVELS,
  AURELION_ROOMS,
  buildAurelionSlabWithOpenings,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';
import { AurelionMansionSystems } from './AurelionSystems';

export interface AurelionBasementHandles {
  b2Group: THREE.Group;
  b1RingGroup: THREE.Group;
  scadaCtx: CanvasRenderingContext2D | null;
  scadaTex: THREE.CanvasTexture;
  generatorRotors: THREE.Mesh[];
  basementTvCtx: CanvasRenderingContext2D | null;
  basementTvTex: THREE.CanvasTexture;
  b2Lights: THREE.PointLight[];
  b1Lights: THREE.PointLight[];
}

export function buildAurelionBasements(
  parent: THREE.Group,
  mats: AurelionMaterials
): AurelionBasementHandles {
  const b2Group = new THREE.Group();
  b2Group.name = 'aurelion_b2_infrastructure_kingdom';
  const b1RingGroup = new THREE.Group();
  b1RingGroup.name = 'aurelion_b1_operations_ring';
  parent.add(b2Group, b1RingGroup);

  const b2Lights: THREE.PointLight[] = [];
  const b1Lights: THREE.PointLight[] = [];

  // =========================================================================
  // BASEMENT B2 — INFRASTRUCTURE KINGDOM (y = -7.60, 12 Rooms)
  // =========================================================================
  const b2Y = AURELION_LEVELS.B2.floorY;
  const b2Slab = buildAurelionSlabWithOpenings(AURELION_LEVELS.B2, mats.graphiteStone, 0.28);
  b2Group.add(b2Slab);

  // Outer Concrete & Steel Retaining Walls
  for (const [wx, wz, ww, wd] of [
    [0, -12.0, 30.2, 0.35],
    [0, 12.0, 30.2, 0.35],
    [-15.0, 0, 0.35, 24.2],
    [15.0, 0, 0.35, 24.2],
  ] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, 3.5, wd), mats.graphiteStone);
    wall.position.set(wx, b2Y + 1.75, wz);
    b2Group.add(wall);
  }

  // Room Plaques for all 12 B2 Rooms
  AURELION_ROOMS.filter((r) => r.level === 'B2').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.46),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#38bdf8')
    );
    plaque.position.set(r.center[0], b2Y + 2.55, r.center[1]);
    b2Group.add(plaque);
  });

  // B2-01 Main Power-Generation Hall: Twin 35 kW Diesel Gensets (-11, -7.2)
  const generatorRotors: THREE.Mesh[] = [];
  for (const gx of [-12.6, -9.4]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 3.6), mats.industrialSteel);
    skid.position.set(gx, b2Y + 0.14, -7.2);
    const engineBlock = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 2.8), mats.charcoalTitanium);
    engineBlock.position.set(gx, b2Y + 0.92, -7.2);
    const alternator = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.85, 16), mats.champagneGold);
    alternator.rotation.x = Math.PI / 2;
    alternator.position.set(gx, b2Y + 0.95, -5.5);
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 12), mats.silverTitanium);
    exhaust.position.set(gx, b2Y + 2.4, -7.8);
    generatorRotors.push(alternator);
    b2Group.add(skid, engineBlock, alternator, exhaust);
  }

  // Live B2 SCADA Control Display at (-8.2, -7.2)
  const scadaCanvas = document.createElement('canvas');
  scadaCanvas.width = 768;
  scadaCanvas.height = 384;
  const scadaCtx = scadaCanvas.getContext('2d');
  const scadaTex = mats.trackCustomTexture(new THREE.CanvasTexture(scadaCanvas));
  scadaTex.colorSpace = THREE.SRGBColorSpace;
  const scadaMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: scadaTex }));
  const scadaBoard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.65, 2.9), mats.charcoalTitanium);
  scadaBoard.position.set(-8.0, b2Y + 1.45, -7.2);
  const scadaScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.45), scadaMat);
  scadaScreen.position.set(-7.91, b2Y + 1.45, -7.2);
  scadaScreen.rotation.y = Math.PI / 2;
  b2Group.add(scadaBoard, scadaScreen);

  // B2-02 Battery Storage Room (-11, 0): LiFePO4 250 kWh Racks
  for (let i = 0; i < 4; i++) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.35, 1.3), mats.charcoalTitanium);
    rack.position.set(-13.2 + (i % 2) * 3.2, b2Y + 1.18, -1.6 + Math.floor(i / 2) * 3.2);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.08), mats.cyanTelemetry);
    led.position.set(-13.2 + (i % 2) * 3.2 + 0.56, b2Y + 1.2, -1.6 + Math.floor(i / 2) * 3.2);
    b2Group.add(rack, led);
  }

  // B2-03 Electrical Distribution Room (-11, +7.2): HV Switchgear & ATS Cabinets
  for (let i = 0; i < 3; i++) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.9), mats.industrialSteel);
    sw.position.set(-12.8 + i * 1.9, b2Y + 1.2, 8.8);
    const breakerStripe = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.14, 0.94), mats.champagneGold);
    breakerStripe.position.set(-12.8 + i * 1.9, b2Y + 2.1, 8.8);
    b2Group.add(sw, breakerStripe);
  }

  // B2-04 Fuel Management & Storage (-4, -8.5): Twin Pressurized Day Tanks
  for (const fx of [-5.2, -2.8]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 2.6, 18), mats.industrialSteel);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(fx, b2Y + 1.15, -9.2);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.87, 0.05, 8, 24), mats.champagneGold);
    band.rotation.y = Math.PI / 2;
    band.position.set(fx, b2Y + 1.15, -9.2);
    b2Group.add(tank, band);
  }

  // B2-05 Water Reserve Chamber (-4, 7.8) + B2-06 Water Filtration & Purification (+2.5, 7.8)
  for (const wx of [-5.4, -2.6]) {
    const cistern = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 2.7, 20), mats.silverTitanium);
    cistern.position.set(wx, b2Y + 1.35, 8.8);
    const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.9, 0.12), mats.cyanTelemetry);
    gauge.position.set(wx, b2Y + 1.35, 7.62);
    b2Group.add(cistern, gauge);
  }
  const roSkid = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.45, 1.35), mats.silverTitanium);
  roSkid.position.set(2.5, b2Y + 0.72, 8.6);
  for (let u = 0; u < 3; u++) {
    const roTube = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.4, 12), mats.cyanTelemetry);
    roTube.rotation.z = Math.PI / 2;
    roTube.position.set(2.5, b2Y + 1.65 + u * 0.36, 8.6);
    b2Group.add(roTube);
  }
  b2Group.add(roSkid);

  // B2-07 Mechanical Workshop (11.2, -7.2) + B2-10 Maintenance Office (11.2, -1.5)
  const workBench = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.92, 1.1), mats.walnutWood);
  workBench.position.set(11.6, b2Y + 0.46, -8.5);
  const maintDesk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.78, 1.0), mats.oakWood);
  maintDesk.position.set(11.6, b2Y + 0.39, -1.5);
  b2Group.add(workBench, maintDesk);

  // B2-08 Emergency Warehouse (11.2, 8.2) & B2-09 General Storage (3.2, -8.5)
  for (const [sx, sz] of [
    [12.2, 8.5],
    [10.2, 8.5],
    [3.2, -9.2],
  ] as const) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 2.4), mats.industrialSteel);
    rack.position.set(sx, b2Y + 1.1, sz);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.65, 1.1), mats.oakWood);
    crate.position.set(sx, b2Y + 1.4, sz);
    b2Group.add(rack, crate);
  }

  // B2-11 HVAC Ventilation Room (-2, 0): Air Handling Unit & Overhead Ducts
  const ahu = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.85, 2.0), mats.silverTitanium);
  ahu.position.set(-2.0, b2Y + 0.92, 0.4);
  const ductMain = new THREE.Mesh(new THREE.BoxGeometry(24.0, 0.36, 0.7), mats.industrialSteel);
  ductMain.position.set(0, b2Y + 3.05, 0);
  b2Group.add(ahu, ductMain);

  for (const [lx, lz] of [
    [-10, -7],
    [-10, 7],
    [0, 0],
    [10, -7],
    [10, 7],
  ] as const) {
    const l = new THREE.PointLight(0xdbeafe, 1.3, 18, 1.4);
    l.position.set(lx, b2Y + 2.9, lz);
    b2Lights.push(l);
    b2Group.add(l);
  }

  // =========================================================================
  // BASEMENT B1 — PRIVATE OPERATIONS & RAILWAY RING (y = -4.00)
  // Surrounds BasementControlRoom (X in [-8..+8], Z in [-7..+7]) cleanly!
  // =========================================================================
  const b1Y = AURELION_LEVELS.B1.floorY;

  // Perimeter Ring Floor Slabs around BasementControlRoom's 16x14 core
  for (const [sx, sz, sw, sd] of [
    [-11.5, 0, 7.0, 24.0], // West B1 Wing (X: -15..-8)
    [11.5, 0, 7.0, 24.0],  // East B1 Wing (X: +8..+15)
    [0, -9.5, 16.0, 5.0],  // South B1 Gallery (Z: -12..-7)
    [0, 9.5, 16.0, 5.0],   // North B1 Gallery (Z: +7..+12)
  ] as const) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.24, sd), mats.graphiteStone);
    slab.position.set(sx, b1Y - 0.12, sz);
    slab.receiveShadow = true;
    b1RingGroup.add(slab);
  }

  // B1 Outer Retaining Walls
  for (const [wx, wz, ww, wd] of [
    [0, -12.0, 30.2, 0.35],
    [0, 12.0, 30.2, 0.35],
    [-15.0, 0, 0.35, 24.2],
    [15.0, 0, 0.35, 24.2],
  ] as const) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, 3.85, wd), mats.graphiteStone);
    wall.position.set(wx, b1Y + 1.9, wz);
    b1RingGroup.add(wall);
  }

  // Room Plaques for B1's 12 Rooms
  AURELION_ROOMS.filter((r) => r.level === 'B1').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.46),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#6ce8ff')
    );
    plaque.position.set(r.center[0], b1Y + 2.65, r.center[1]);
    b1RingGroup.add(plaque);
  });

  // West B1 Wing Furnishings (Train Gallery, Route Monitoring, Comms Centre)
  for (let i = 0; i < 4; i++) {
    const srv = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.4, 1.3), mats.charcoalTitanium);
    srv.position.set(-13.4, b1Y + 1.2, -9.5 + i * 2.2);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.0, 0.9), mats.cyanTelemetry);
    led.position.set(-12.92, b1Y + 1.2, -9.5 + i * 2.2);
    b1RingGroup.add(srv, led);
  }
  const routeTable = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.88, 1.8), mats.charcoalTitanium);
  routeTable.position.set(-11.4, b1Y + 0.44, 0.0);
  const routeTop = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.05, 1.5), mats.cyanTelemetry);
  routeTop.position.set(-11.4, b1Y + 0.9, 0.0);
  b1RingGroup.add(routeTable, routeTop);

  // East B1 Wing Furnishings (Compound Security Console, CCTV Observation, Ops Office)
  const secDesk = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.1), mats.charcoalTitanium);
  secDesk.position.set(11.5, b1Y + 0.45, -7.8);
  const secMonitor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.08), mats.cyanTelemetry);
  secMonitor.position.set(11.5, b1Y + 1.45, -8.3);
  const cctvWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 3.8), mats.charcoalTitanium);
  cctvWall.position.set(14.3, b1Y + 1.6, -1.0);
  b1RingGroup.add(secDesk, secMonitor, cctvWall);

  // North B1 Gallery (Operations Meeting Room & Emergency Coordination)
  const meetTable = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.82, 1.6), mats.walnutWood);
  meetTable.position.set(5.5, b1Y + 0.41, 9.6);
  const emergMapTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.86, 1.6), mats.charcoalTitanium);
  emergMapTable.position.set(0.0, b1Y + 0.43, 9.6);
  b1RingGroup.add(meetTable, emergMapTable);

  // South B1 Gallery: Staff Lounge & Interactive Basement TV (local 0, -4.0, -9.8)
  const loungeSofa = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.72, 1.05), mats.charcoalVelvet);
  loungeSofa.position.set(0.0, b1Y + 0.36, -8.4);
  const basementTvCanvas = document.createElement('canvas');
  basementTvCanvas.width = 512;
  basementTvCanvas.height = 288;
  const basementTvCtx = basementTvCanvas.getContext('2d');
  const basementTvTex = mats.trackCustomTexture(new THREE.CanvasTexture(basementTvCanvas));
  basementTvTex.colorSpace = THREE.SRGBColorSpace;
  const tvMat = mats.trackCustomMaterial(new THREE.MeshBasicMaterial({ map: basementTvTex }));
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 0.1), mats.charcoalTitanium);
  tvFrame.position.set(0, b1Y + 1.75, -11.45);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.25), tvMat);
  tvScreen.position.set(0, b1Y + 1.75, -11.38);
  b1RingGroup.add(loungeSofa, tvFrame, tvScreen);

  for (const [lx, lz] of [
    [-11.5, 0],
    [11.5, 0],
    [0, 9.5],
    [0, -9.5],
  ] as const) {
    const l = new THREE.PointLight(0xe0f2fe, 1.25, 16, 1.4);
    l.position.set(lx, b1Y + 3.0, lz);
    b1Lights.push(l);
    b1RingGroup.add(l);
  }

  return {
    b2Group,
    b1RingGroup,
    scadaCtx,
    scadaTex,
    generatorRotors,
    basementTvCtx,
    basementTvTex,
    b2Lights,
    b1Lights,
  };
}

export function updateAurelionBasementVisuals(
  handles: AurelionBasementHandles,
  systems: AurelionMansionSystems,
  delta: number,
  basementTvOn: boolean
) {
  if (systems.generatorRunning) {
    handles.generatorRotors.forEach((r) => {
      r.rotation.y += delta * 14.0;
    });
  }

  if (handles.scadaCtx) {
    const ctx = handles.scadaCtx;
    ctx.fillStyle = '#070e18';
    ctx.fillRect(0, 0, 768, 384);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 768, 52);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('THE AURELION B2 · INFRASTRUCTURE SCADA', 20, 34);

    ctx.font = '18px monospace';
    ctx.fillStyle = systems.generatorRunning ? '#4ade80' : '#f59e0b';
    ctx.fillText(
      `DIESEL GENERATOR: ${systems.generatorRunning ? `RUNNING (+${systems.generatorKw.toFixed(1)} kW)` : 'STANDBY'} · FUEL ${Math.round(systems.fuelLiters)}/${systems.maxFuelLiters} L`,
      24,
      96
    );
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(
      `SOLAR ROOFTOP: +${systems.solarKw.toFixed(1)} kW  |  LOAD: ${systems.totalDemandKw.toFixed(1)} kW`,
      24,
      134
    );
    ctx.fillStyle = '#facc15';
    ctx.fillText(
      `LiFePO4 BATTERY BANK: ${systems.batteryKwh.toFixed(1)} / ${systems.batteryCapacityKwh} kWh (${Math.round((systems.batteryKwh / systems.batteryCapacityKwh) * 100)}%)`,
      24,
      172
    );
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(
      `PRIORITY SHEDDING: ${systems.powerPriorityMode.toUpperCase()}  [T1:${systems.tier1CriticalPowered ? 'ON' : 'OFF'} T2:${systems.tier2StandardPowered ? 'ON' : 'OFF'} T3:${systems.tier3LuxuryPowered ? 'ON' : 'OFF'}]`,
      24,
      210
    );
    ctx.fillStyle = '#34d399';
    ctx.fillText(
      `WATER RESERVE: RAW ${Math.round(systems.rawWaterLiters)} L  ->  POTABLE ${Math.round(systems.treatedWaterLiters)} L`,
      24,
      260
    );
    ctx.fillText(
      `RO/UV FILTRATION: ${systems.purifierActive && systems.tier2StandardPowered ? 'ACTIVE (280 L/h)' : 'PAUSED'}`,
      24,
      298
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '15px monospace';
    ctx.fillText('[E] AT GENERATOR, BREAKER PANEL, OR WATER SKID TO OPERATE', 24, 354);
    handles.scadaTex.needsUpdate = true;
  }

  if (handles.basementTvCtx) {
    const ctx = handles.basementTvCtx;
    if (!basementTvOn) {
      ctx.fillStyle = '#070a10';
      ctx.fillRect(0, 0, 512, 288);
    } else {
      ctx.fillStyle = '#081526';
      ctx.fillRect(0, 0, 512, 288);
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(0, 0, 512, 44);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('AURELION B1 · STAFF LOUNGE TELEMETRY', 16, 28);
      ctx.fillStyle = '#38bdf8';
      ctx.font = '15px monospace';
      ctx.fillText(`● GRID: ${(systems.solarKw + systems.generatorKw).toFixed(1)} kW GEN / ${systems.totalDemandKw.toFixed(1)} kW LOAD`, 18, 86);
      ctx.fillText(`● WATER: ${Math.round(systems.treatedWaterLiters)} L POTABLE RESERVE`, 18, 122);
      ctx.fillText(`● HYDROPONICS: ${systems.hydroBeds.filter((b) => b.stage === 3).length}/12 CROPS RIPE`, 18, 158);
      ctx.fillText(`● ELEVATORS: MAIN(${systems.elevators.main.currentFloor}) SVC(${systems.elevators.service.currentFloor}) VIP(${systems.elevators.private.currentFloor})`, 18, 194);
    }
    handles.basementTvTex.needsUpdate = true;
  }
}
