import * as THREE from 'three';
import {
  AURELION_LEVELS,
  AURELION_ROOMS,
  buildAurelionSlabWithOpenings,
} from './AurelionConfig';
import { AurelionMaterials } from './AurelionMaterials';
import { AurelionMansionSystems, HydroCropType } from './AurelionSystems';

export interface B2FarmBedVisual {
  id: number;
  cropType: HydroCropType;
  sproutGroup: THREE.Group;
  growingGroup: THREE.Group;
  ripeGroup: THREE.Group;
  growLightMat: THREE.MeshStandardMaterial;
  dripEmissiveMat: THREE.MeshStandardMaterial;
}

export interface AurelionBasementHandles {
  b2Group: THREE.Group;
  b1RingGroup: THREE.Group;
  scadaCtx: CanvasRenderingContext2D | null;
  scadaTex: THREE.CanvasTexture;
  generatorRotors: THREE.Object3D[];
  generatorFans: THREE.Object3D[];
  generatorLedMats: THREE.MeshStandardMaterial[];
  pumpRotors: THREE.Object3D[];
  pumpLedMat: THREE.MeshStandardMaterial;
  purifierUvMat: THREE.MeshStandardMaterial;
  cisternLevelBars: THREE.Mesh[];
  b2FarmBedVisuals: B2FarmBedVisual[];
  basementTvCtx: CanvasRenderingContext2D | null;
  basementTvTex: THREE.CanvasTexture;
  b2Lights: THREE.PointLight[];
  b1Lights: THREE.PointLight[];
  scadaTimer?: number;
  tvTimer?: number;
  lastTvOn?: boolean;
}

export const B2_FARM_BED_COORDS: ReadonlyArray<{ id: number; x: number; z: number; cropType: HydroCropType }> = [
  { id: 0, x: 0.35, z: 2.65, cropType: 'vegetables' },
  { id: 1, x: 3.65, z: 2.65, cropType: 'herbs' },
  { id: 2, x: 0.35, z: 5.05, cropType: 'berries' },
  { id: 3, x: 3.65, z: 5.05, cropType: 'vegetables' },
];

export const B2_WATER_PUMP_POS = { x: -0.25, z: 8.9 } as const;

function createSoilCanvasTexture(mats: AurelionMaterials): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2d1e14';
    ctx.fillRect(0, 0, 512, 256);

    // Subtle damp furrow striping along X
    for (let row = 0; row < 4; row++) {
      const y = 32 + row * 64;
      const grad = ctx.createLinearGradient(0, y - 24, 0, y + 24);
      grad.addColorStop(0, '#1f140d');
      grad.addColorStop(0.5, '#3b2719');
      grad.addColorStop(1, '#1f140d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, y - 24, 512, 48);
    }

    // Organic loam speckles & perlite mineral flecks (deterministic pseudo-random)
    let seed = 4219;
    const nextRand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 2600; i++) {
      const px = nextRand() * 512;
      const py = nextRand() * 256;
      const r = 0.8 + nextRand() * 2.2;
      const pick = nextRand();
      ctx.fillStyle =
        pick > 0.94
          ? '#d6d3cd' // perlite mineral fleck
          : pick > 0.65
            ? '#473020'
            : '#1a1009';
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = mats.trackCustomTexture(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createPressureGaugeTexture(mats: AurelionMaterials): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Green normal zone & red over-pressure zone arc
    ctx.beginPath();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#22c55e';
    ctx.arc(128, 128, 92, Math.PI * 0.78, Math.PI * 1.9);
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.arc(128, 128, 92, Math.PI * 1.9, Math.PI * 2.22);
    ctx.stroke();

    // Tick marks 0..6 BAR
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 6; i++) {
      const a = Math.PI * 0.78 + (i / 6) * (Math.PI * 1.44);
      const x1 = 128 + Math.cos(a) * 84;
      const y1 = 128 + Math.sin(a) * 84;
      const x2 = 128 + Math.cos(a) * 102;
      const y2 = 128 + Math.sin(a) * 102;
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#0f172a';
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillText(String(i), 128 + Math.cos(a) * 64, 128 + Math.sin(a) * 64);
    }

    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('BAR', 128, 182);

    // Needle pointing at ~3.8 BAR
    const needleAngle = Math.PI * 0.78 + (3.85 / 6) * (Math.PI * 1.44);
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#dc2626';
    ctx.moveTo(128, 128);
    ctx.lineTo(128 + Math.cos(needleAngle) * 78, 128 + Math.sin(needleAngle) * 78);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(128, 128, 10, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = mats.trackCustomTexture(new THREE.CanvasTexture(canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPipeBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  radius: number,
  mat: THREE.Material,
  radialSegments = 10
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = Math.max(0.01, dir.length());
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, len, radialSegments),
    mat
  );
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
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

  // Shared mechanical & agricultural PBR materials (tracked on AurelionMaterials for cleanup)
  const safetyYellowMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xd99b16, roughness: 0.34, metalness: 0.35 })
  );
  const motorBlueMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x1d4e78, roughness: 0.38, metalness: 0.52 })
  );
  const copperMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xb8622a, roughness: 0.24, metalness: 0.9 })
  );
  const brassMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xd4a23a, roughness: 0.22, metalness: 0.88 })
  );
  const valveRedMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xc8232c, roughness: 0.36, metalness: 0.22 })
  );
  const rubberMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x16191e, roughness: 0.88, metalness: 0.04 })
  );
  const galvanizedMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x9aa6b2, roughness: 0.38, metalness: 0.78 })
  );
  const pvcWhiteMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xeef3f8, roughness: 0.36, metalness: 0.06 })
  );
  const potableBluePipeMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.34, metalness: 0.14 })
  );
  const clearFilterGlassMat = mats.trackCustomMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0xbfe7f7,
      roughness: 0.08,
      metalness: 0.06,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
  );
  const frpVesselMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.24, metalness: 0.22 })
  );
  const concretePlinthMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.88, metalness: 0.06 })
  );

  const gaugeTex = createPressureGaugeTexture(mats);
  const gaugeFaceMat = mats.trackCustomMaterial(
    new THREE.MeshBasicMaterial({ map: gaugeTex })
  );

  const soilTex = createSoilCanvasTexture(mats);
  soilTex.repeat.set(2, 1);
  const soilMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({
      map: soilTex,
      roughness: 0.94,
      metalness: 0.02,
    })
  );

  const leafDarkMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x246b35, roughness: 0.76, metalness: 0.04 })
  );
  const leafFreshMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.7, metalness: 0.04 })
  );
  const stemMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x558b2f, roughness: 0.82 })
  );
  const tomatoFruitMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.26, metalness: 0.06 })
  );
  const berryFruitMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xd81b60, roughness: 0.32, metalness: 0.04 })
  );
  const herbBlossomMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0xe9d5ff, roughness: 0.65 })
  );

  // =========================================================================
  // BASEMENT B2 — INFRASTRUCTURE KINGDOM (y = -7.60, 13 Rooms)
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

  // Room Plaques for all B2 Rooms
  AURELION_ROOMS.filter((r) => r.level === 'B2').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.46),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#38bdf8')
    );
    plaque.position.set(r.center[0], b2Y + 2.55, r.center[1]);
    b2Group.add(plaque);
  });

  // =========================================================================
  // B2-01 MAIN POWER-GENERATION HALL: TWIN REALISTIC 35 kW DIESEL GENSETS
  // =========================================================================
  const generatorRotors: THREE.Object3D[] = [];
  const generatorFans: THREE.Object3D[] = [];
  const generatorLedMats: THREE.MeshStandardMaterial[] = [];

  for (const gx of [-12.6, -9.4]) {
    const genGroup = new THREE.Group();
    genGroup.position.set(gx, b2Y, -7.2);

    // Concrete inertia pad + rubber anti-vibration isolators + steel I-beam skid
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.1, 3.76), concretePlinthMat);
    pad.position.set(0, 0.05, 0);
    const skidBase = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.16, 3.52), mats.industrialSteel);
    skidBase.position.set(0, 0.22, 0);
    genGroup.add(pad, skidBase);

    for (const ix of [-0.74, 0.74]) {
      for (const iz of [-1.45, 0, 1.45]) {
        const vibPad = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.08, 12), rubberMat);
        vibPad.position.set(ix, 0.12, iz);
        genGroup.add(vibPad);
      }
    }

    // Cast-iron V8 diesel engine crankcase & oil sump
    const oilSump = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.24, 1.65), mats.charcoalTitanium);
    oilSump.position.set(0, 0.44, -0.15);
    const crankCase = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.56, 1.72), safetyYellowMat);
    crankCase.position.set(0, 0.84, -0.15);
    genGroup.add(oilSump, crankCase);

    // Twin angled V8 cylinder banks + ribbed rocker valve covers
    for (const bankSign of [-1, 1]) {
      const bank = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 1.56), mats.industrialSteel);
      bank.position.set(bankSign * 0.36, 1.22, -0.15);
      bank.rotation.z = -bankSign * 0.36;
      const valveCover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 1.48), mats.charcoalTitanium);
      valveCover.position.set(bankSign * 0.44, 1.4, -0.15);
      valveCover.rotation.z = -bankSign * 0.36;
      genGroup.add(bank, valveCover);

      // 4 fuel injector bosses / manifold ports per bank
      for (let cyl = 0; cyl < 4; cyl++) {
        const cz = -0.68 + cyl * 0.36;
        const port = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.24, 10), galvanizedMat);
        port.rotation.z = bankSign * 0.9;
        port.position.set(bankSign * 0.62, 1.2, cz);
        genGroup.add(port);
      }
    }

    // Dual spin-on oil & diesel fuel filter canisters + primary fuel rail
    for (const fz of [-0.55, -0.25]) {
      const filterCan = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.28, 12), frpVesselMat);
      filterCan.position.set(0.62, 0.72, fz);
      genGroup.add(filterCan);
    }

    // Heavy-duty cylindrical air intake cleaner canister
    const airFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 16), mats.charcoalTitanium);
    airFilter.rotation.z = Math.PI / 2;
    airFilter.position.set(-0.32, 1.56, 0.48);
    const intakePipe = createPipeBetween(
      new THREE.Vector3(-0.1, 1.56, 0.48),
      new THREE.Vector3(0.0, 1.38, 0.1),
      0.08,
      rubberMat
    );
    genGroup.add(airFilter, intakePipe);

    // Front louvered radiator housing + protective shroud + spinning cooling fan
    const radFrame = new THREE.Mesh(new THREE.BoxGeometry(1.42, 1.36, 0.34), safetyYellowMat);
    radFrame.position.set(0, 1.0, -1.42);
    const radCore = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.08, 0.38), mats.charcoalTitanium);
    radCore.position.set(0, 1.0, -1.42);
    const fanShroud = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 10, 24), mats.industrialSteel);
    fanShroud.position.set(0, 1.0, -1.22);
    genGroup.add(radFrame, radCore, fanShroud);

    const fanHub = new THREE.Group();
    fanHub.position.set(0, 1.0, -1.2);
    const centerBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 14), galvanizedMat);
    centerBoss.rotation.x = Math.PI / 2;
    fanHub.add(centerBoss);
    for (let b = 0; b < 6; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.36, 0.025), safetyYellowMat);
      const a = (b / 6) * Math.PI * 2;
      blade.position.set(Math.cos(a) * 0.23, Math.sin(a) * 0.23, 0);
      blade.rotation.z = a + Math.PI / 2;
      blade.rotation.x = 0.35;
      fanHub.add(blade);
    }
    generatorFans.push(fanHub);
    genGroup.add(fanHub);

    // Rear Alternator Housing with visible copper stator windings & spinning rotor shaft
    const altHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.56, 0.88, 20), mats.industrialSteel);
    altHousing.rotation.x = Math.PI / 2;
    altHousing.position.set(0, 0.88, 1.16);
    const copperCoilBand = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.52, 20), copperMat);
    copperCoilBand.rotation.x = Math.PI / 2;
    copperCoilBand.position.set(0, 0.88, 1.16);
    const terminalBox = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.44), safetyYellowMat);
    terminalBox.position.set(0, 1.54, 1.16);
    const rearRotor = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.14, 12), brassMat);
    rearRotor.rotation.x = Math.PI / 2;
    rearRotor.position.set(0, 0.88, 1.64);
    generatorRotors.push(rearRotor);
    genGroup.add(altHousing, copperCoilBand, terminalBox, rearRotor);

    // Turbocharger, overhead insulated acoustic muffler & ceiling exhaust stack
    const turbo = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.06, 10, 18), galvanizedMat);
    turbo.position.set(0, 1.58, -0.45);
    const exhaustFlex = createPipeBetween(
      new THREE.Vector3(0, 1.68, -0.45),
      new THREE.Vector3(0, 2.28, -0.55),
      0.095,
      mats.silverTitanium
    );
    const muffler = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.35, 16), mats.silverTitanium);
    muffler.rotation.x = Math.PI / 2;
    muffler.position.set(0, 2.46, -0.55);
    const stackPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.15, 12), mats.industrialSteel);
    stackPipe.position.set(0, 2.95, -1.05);
    genGroup.add(turbo, exhaustFlex, muffler, stackPipe);

    // Side Generator Control Cabinet with E-Stop & live operational LED
    const ctrlBox = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.62), mats.charcoalTitanium);
    ctrlBox.position.set(0.84, 1.18, 0.95);
    const eStop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), valveRedMat);
    eStop.rotation.z = Math.PI / 2;
    eStop.position.set(0.98, 1.02, 0.82);
    const genLedMat = mats.trackCustomMaterial(
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xf59e0b, emissiveIntensity: 1.0 })
    );
    generatorLedMats.push(genLedMat);
    const genLed = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), genLedMat);
    genLed.position.set(0.98, 1.44, 1.12);
    genGroup.add(ctrlBox, eStop, genLed);

    b2Group.add(genGroup);
  }

  // Diesel fuel feed & return copper pipes connecting B2-04 Day Tanks (-5.2/-2.8, -9.2) to Gensets
  b2Group.add(
    createPipeBetween(
      new THREE.Vector3(-5.2, b2Y + 0.42, -8.5),
      new THREE.Vector3(-9.4, b2Y + 0.42, -8.5),
      0.035,
      copperMat
    ),
    createPipeBetween(
      new THREE.Vector3(-9.4, b2Y + 0.42, -8.5),
      new THREE.Vector3(-12.6, b2Y + 0.42, -8.5),
      0.035,
      copperMat
    )
  );

  // Live B2 SCADA Control Display at (-8.0, -7.2)
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

  // B2-04 Fuel Management & Storage (-4, -8.5): Twin Pressurized Day Tanks on Cradles + Spill Bund
  const fuelBund = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.12, 2.4), concretePlinthMat);
  fuelBund.position.set(-4.0, b2Y + 0.06, -9.2);
  b2Group.add(fuelBund);
  for (const fx of [-5.2, -2.8]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 2.5, 20), mats.industrialSteel);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(fx, b2Y + 1.12, -9.2);
    for (const cx of [-0.75, 0.75]) {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.6, 1.2), mats.charcoalTitanium);
      saddle.position.set(fx + cx, b2Y + 0.42, -9.2);
      b2Group.add(saddle);
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.045, 8, 24), safetyYellowMat);
    band.rotation.y = Math.PI / 2;
    band.position.set(fx, b2Y + 1.12, -9.2);
    const fillNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 12), brassMat);
    fillNeck.position.set(fx + 0.55, b2Y + 1.95, -9.2);
    b2Group.add(tank, band, fillNeck);
  }

  // =========================================================================
  // B2-05 WATER RESERVE CISTERNS (-5.4 & -2.6, +9.0) — REALISTIC STAINLESS TANKS
  // =========================================================================
  const cisternLevelBars: THREE.Mesh[] = [];
  for (const wx of [-5.4, -2.6]) {
    const tankGrp = new THREE.Group();
    tankGrp.position.set(wx, b2Y, 9.0);

    const baseSkirt = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.2, 0.22, 24), concretePlinthMat);
    baseSkirt.position.y = 0.11;
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.12, 2.25, 24), mats.silverTitanium);
    shell.position.y = 1.34;
    const domeTop = new THREE.Mesh(
      new THREE.SphereGeometry(1.12, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
      mats.silverTitanium
    );
    domeTop.scale.y = 0.38;
    domeTop.position.y = 2.42;
    const manway = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.16, 16), galvanizedMat);
    manway.position.set(0.32, 2.78, 0.18);

    // Reinforcement girth rings
    for (const ry of [0.55, 1.35, 2.15]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.13, 0.025, 8, 28), galvanizedMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = ry;
      tankGrp.add(ring);
    }

    // Clear exterior level sight-tube + live water level bar + brass isolation valve
    const sightGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.9, 10), clearFilterGlassMat);
    sightGlass.position.set(0, 1.35, -1.18);
    const levelBar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.82, 10), potableBluePipeMat);
    levelBar.position.set(0, 1.35, -1.18);
    cisternLevelBars.push(levelBar);

    const outValve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.35, 10), brassMat);
    outValve.rotation.x = Math.PI / 2;
    outValve.position.set(0.45, 0.42, -1.15);

    tankGrp.add(baseSkirt, shell, domeTop, manway, sightGlass, levelBar, outValve);
    b2Group.add(tankGrp);
  }

  // Suction header linking twin cisterns directly into the Water Pump Station
  b2Group.add(
    createPipeBetween(
      new THREE.Vector3(-5.4, b2Y + 0.42, 7.82),
      new THREE.Vector3(-0.25, b2Y + 0.42, 7.82),
      0.065,
      galvanizedMat
    )
  );

  // =========================================================================
  // B2 PHYSICAL BOOSTER WATER PUMP STATION (-0.25, +8.9)
  // =========================================================================
  const pumpRotors: THREE.Object3D[] = [];
  const pumpGroup = new THREE.Group();
  pumpGroup.position.set(B2_WATER_PUMP_POS.x, b2Y, B2_WATER_PUMP_POS.z);

  const pumpPlinth = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.18, 1.65), concretePlinthMat);
  pumpPlinth.position.set(-0.2, 0.09, 0.1);
  pumpGroup.add(pumpPlinth);

  // Hydro-pneumatic vertical blue expansion/pressure tank on the left of plinth
  const expLegs = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.16, 12), mats.industrialSteel);
  expLegs.position.set(-1.05, 0.26, 0.38);
  const expBody = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 1.05, 20), motorBlueMat);
  expBody.position.set(-1.05, 0.86, 0.38);
  const expDome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), motorBlueMat);
  expDome.position.set(-1.05, 1.38, 0.38);
  const expNipple = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10), brassMat);
  expNipple.position.set(-1.05, 1.78, 0.38);
  pumpGroup.add(expLegs, expBody, expDome, expNipple);

  // Twin parallel industrial centrifugal booster pumps (Duty + Standby)
  for (const offsetX of [-0.36, 0.46]) {
    const unit = new THREE.Group();
    unit.position.set(offsetX, 0.18, 0.08);

    // Steel mounting baseplate
    const subFrame = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.08, 1.15), mats.industrialSteel);
    subFrame.position.set(0, 0.04, 0);
    unit.add(subFrame);

    // Finned TEFC electric drive motor (rear +Z)
    const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.48, 18), motorBlueMat);
    motorBody.rotation.x = Math.PI / 2;
    motorBody.position.set(0, 0.32, 0.28);
    const fanCowl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.14, 18), mats.charcoalTitanium);
    fanCowl.rotation.x = Math.PI / 2;
    fanCowl.position.set(0, 0.32, 0.54);
    const conduitBox = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.16), mats.charcoalTitanium);
    conduitBox.position.set(0, 0.54, 0.28);
    unit.add(motorBody, fanCowl, conduitBox);

    // Cooling ribs along motor barrel
    for (let r = 0; r < 8; r++) {
      const a = (r / 8) * Math.PI * 2;
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.42), motorBlueMat);
      fin.position.set(Math.cos(a) * 0.195, 0.32 + Math.sin(a) * 0.195, 0.28);
      fin.rotation.z = a;
      unit.add(fin);
    }

    // Open-slotted yellow coupling guard + spinning stainless coupling rotor inside
    const guardArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.22, 12, 1, true, 0, Math.PI),
      safetyYellowMat
    );
    guardArch.rotation.z = Math.PI / 2;
    guardArch.rotation.y = Math.PI / 2;
    guardArch.position.set(0, 0.32, -0.04);

    const rotorGrp = new THREE.Group();
    rotorGrp.position.set(0, 0.32, -0.04);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.24, 12), mats.silverTitanium);
    shaft.rotation.x = Math.PI / 2;
    const couplingFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.06, 8), brassMat);
    couplingFlange.rotation.x = Math.PI / 2;
    const keyMarker = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.028, 0.03), valveRedMat);
    rotorGrp.add(shaft, couplingFlange, keyMarker);
    pumpRotors.push(rotorGrp);
    unit.add(guardArch, rotorGrp);

    // Spiral cast-iron centrifugal volute casing + front suction flange + top discharge riser
    const volute = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 18), galvanizedMat);
    volute.rotation.x = Math.PI / 2;
    volute.position.set(0, 0.32, -0.25);
    const suctionNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.28, 12), galvanizedMat);
    suctionNeck.rotation.x = Math.PI / 2;
    suctionNeck.position.set(0, 0.32, -0.44);
    const suctionFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 12), brassMat);
    suctionFlange.rotation.x = Math.PI / 2;
    suctionFlange.position.set(0, 0.32, -0.56);

    const dischargeRiser = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.92, 12), galvanizedMat);
    dischargeRiser.position.set(0, 0.84, -0.25);
    const checkValve = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.16, 12), brassMat);
    checkValve.position.set(0, 0.64, -0.25);

    // Red Gate Valve Handwheel + Analog 0-6 BAR Pressure Gauge
    const valveStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), brassMat);
    valveStem.rotation.x = Math.PI / 2;
    valveStem.position.set(0, 0.94, -0.32);
    const handWheel = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 18), valveRedMat);
    handWheel.position.set(0, 0.94, -0.4);
    const wheelSpoke = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.018, 0.018), valveRedMat);
    wheelSpoke.position.set(0, 0.94, -0.4);

    const gaugeCasing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.05, 16), brassMat);
    gaugeCasing.rotation.x = Math.PI / 2;
    gaugeCasing.position.set(0, 1.18, -0.31);
    const gaugeFace = new THREE.Mesh(new THREE.CircleGeometry(0.075, 16), gaugeFaceMat);
    gaugeFace.rotation.y = Math.PI;
    gaugeFace.position.set(0, 1.18, -0.338);

    unit.add(
      volute,
      suctionNeck,
      suctionFlange,
      dischargeRiser,
      checkValve,
      valveStem,
      handWheel,
      wheelSpoke,
      gaugeCasing,
      gaugeFace
    );
    pumpGroup.add(unit);
  }

  // Overhead pump discharge manifold tying both pumps + pressure tank to the RO/UV Purifier
  pumpGroup.add(
    createPipeBetween(new THREE.Vector3(-1.05, 1.48, 0.38), new THREE.Vector3(0.46, 1.48, -0.17), 0.055, galvanizedMat),
    createPipeBetween(new THREE.Vector3(-0.36, 1.48, -0.17), new THREE.Vector3(1.85, 1.48, -0.17), 0.055, potableBluePipeMat)
  );

  // Pump Station Start/Stop Control Pedestal (front facing -Z)
  const pedestalPost = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), mats.industrialSteel);
  pedestalPost.position.set(0.05, 0.55, -0.95);
  const pumpBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.48, 0.22), mats.charcoalTitanium);
  pumpBox.position.set(0.05, 1.18, -0.95);
  const pumpLedMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.15 })
  );
  const pumpLed = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pumpLedMat);
  pumpLed.position.set(0.05, 1.32, -1.07);
  pumpGroup.add(pedestalPost, pumpBox, pumpLed);

  b2Group.add(pumpGroup);

  // =========================================================================
  // B2-06 COMMERCIAL MULTI-STAGE RO / UV WATER PURIFIER SKID (x = 3.0, z = 8.8)
  // =========================================================================
  const roGroup = new THREE.Group();
  roGroup.position.set(3.0, b2Y, 8.8);

  // Welded stainless skid frame + floor drip tray
  const roPan = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.36), galvanizedMat);
  roPan.position.set(0, 0.04, 0);
  const roShelf = new THREE.Mesh(new THREE.BoxGeometry(3.08, 0.06, 1.24), mats.silverTitanium);
  roShelf.position.set(0, 0.86, 0);
  roGroup.add(roPan, roShelf);

  // Skid tubular corner uprights & top frame rails
  for (const sx of [-1.52, -0.45, 0.45, 1.52]) {
    for (const sz of [-0.6, 0.6]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.82, 8), mats.silverTitanium);
      post.position.set(sx, 0.91, sz);
      roGroup.add(post);
    }
  }
  roGroup.add(
    createPipeBetween(new THREE.Vector3(-1.52, 1.82, -0.6), new THREE.Vector3(1.52, 1.82, -0.6), 0.028, mats.silverTitanium, 8),
    createPipeBetween(new THREE.Vector3(-1.52, 1.82, 0.6), new THREE.Vector3(1.52, 1.82, 0.6), 0.028, mats.silverTitanium, 8)
  );

  // Stage 1-3 Vertical Pre-Filter Housings (Clear polycarbonate sumps showing sediment & carbon cartridges!)
  const cartridgeColors = [0xf8fafc, 0x334155, 0x1e293b];
  for (let p = 0; p < 3; p++) {
    const fx = -1.2 + p * 0.36;
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.1, 0.62, 16), clearFilterGlassMat);
    bowl.position.set(fx, 0.44, -0.25);
    const coreMat = mats.trackCustomMaterial(
      new THREE.MeshStandardMaterial({ color: cartridgeColors[p], roughness: 0.72 })
    );
    const innerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.52, 14), coreMat);
    innerCore.position.set(fx, 0.44, -0.25);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 16), mats.charcoalTitanium);
    cap.position.set(fx, 0.78, -0.25);
    roGroup.add(innerCore, bowl, cap);
  }

  // Vertical multi-stage high-pressure stainless RO feed pump
  const hpMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.42, 14), motorBlueMat);
  hpMotor.position.set(-0.1, 0.62, 0.25);
  const hpChamber = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.34, 14), mats.silverTitanium);
  hpChamber.position.set(-0.1, 0.24, 0.25);
  roGroup.add(hpMotor, hpChamber);

  // Stage 4: Three Horizontal FRP Reverse Osmosis Membrane Vessels + end caps & clamps
  for (let u = 0; u < 3; u++) {
    const vy = 1.12 + u * 0.32;
    const vz = 0.22 - (u === 1 ? 0.16 : 0);
    const vessel = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 2.15, 18), frpVesselMat);
    vessel.rotation.z = Math.PI / 2;
    vessel.position.set(0.38, vy, vz);
    for (const capX of [-0.7, 1.46]) {
      const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.08, 16), mats.charcoalTitanium);
      endCap.rotation.z = Math.PI / 2;
      endCap.position.set(capX, vy, vz);
      roGroup.add(endCap);
    }
    roGroup.add(vessel);
  }

  // Stage 5: Horizontal Stainless UV-C Quartz Sterilizer with glowing cyan quartz sight-window
  const uvBody = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.25, 16), mats.silverTitanium);
  uvBody.rotation.z = Math.PI / 2;
  uvBody.position.set(0.55, 1.56, -0.35);
  const purifierUvMat = mats.trackCustomMaterial(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.4,
      roughness: 0.15,
    })
  );
  const uvSight = new THREE.Mesh(new THREE.CylinderGeometry(0.114, 0.114, 0.22, 16), purifierUvMat);
  uvSight.rotation.z = Math.PI / 2;
  uvSight.position.set(0.55, 1.56, -0.35);
  roGroup.add(uvBody, uvSight);

  // Dual Vertical Acrylic Flow-Meter Rotameters & TDS Controller Screen + Stainless Bottle-Fill Spigot
  for (let fm = 0; fm < 2; fm++) {
    const meterTube = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.42, 10), clearFilterGlassMat);
    meterTube.position.set(-0.98 + fm * 0.14, 1.38, -0.58);
    const floatBob = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), valveRedMat);
    floatBob.position.set(-0.98 + fm * 0.14, 1.44, -0.58);
    roGroup.add(meterTube, floatBob);
  }
  const tdsBox = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.12), mats.charcoalTitanium);
  tdsBox.position.set(-0.2, 1.38, -0.58);
  const tdsFace = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.22), mats.cyanTelemetry);
  tdsFace.rotation.y = Math.PI;
  tdsFace.position.set(-0.2, 1.38, -0.642);

  // Front Stainless Bottle-Fill Tap & Basin
  const tapPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.85, 0.34), mats.silverTitanium);
  tapPedestal.position.set(-1.12, 0.425, -0.78);
  const gooseneck = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 14, Math.PI), mats.silverTitanium);
  gooseneck.position.set(-1.12, 0.96, -0.82);
  gooseneck.rotation.y = Math.PI / 2;
  roGroup.add(tdsBox, tdsFace, tapPedestal, gooseneck);

  b2Group.add(roGroup);

  // Physical PVC/Blue potable distribution header from RO/Purifier -> Booster Pump -> B2 Farm Beds!
  b2Group.add(
    createPipeBetween(
      new THREE.Vector3(1.6, b2Y + 0.18, 8.2),
      new THREE.Vector3(1.6, b2Y + 0.18, 5.55),
      0.042,
      potableBluePipeMat
    ),
    createPipeBetween(
      new THREE.Vector3(0.35, b2Y + 0.18, 5.55),
      new THREE.Vector3(3.65, b2Y + 0.18, 5.55),
      0.036,
      pvcWhiteMat
    )
  );

  // =========================================================================
  // B2-13 REALISTIC PHYSICAL RAISED FARM BEDS (4 BEDS IN CLEAN 2x2 GROW BAY)
  // =========================================================================
  const b2FarmBedVisuals: B2FarmBedVisual[] = [];

  for (const cfg of B2_FARM_BED_COORDS) {
    const bedGrp = new THREE.Group();
    bedGrp.position.set(cfg.x, b2Y, cfg.z);

    // 1. Galvanized waterproof floor drainage catch pan (seated flush on B2 slab)
    const dripTray = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.045, 1.22), galvanizedMat);
    dripTray.position.set(0, 0.0225, 0);
    bedGrp.add(dripTray);

    // 2. Corner steel posts + Walnut/Cedar timber raised planter box walls
    for (const px of [-1.06, 1.06]) {
      for (const pz of [-0.54, 0.54]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.64, 0.08), mats.charcoalTitanium);
        leg.position.set(px, 0.34, pz);
        bedGrp.add(leg);
      }
    }
    const plankF = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.56, 0.06), mats.walnutWood);
    plankF.position.set(0, 0.32, -0.54);
    const plankB = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.56, 0.06), mats.walnutWood);
    plankB.position.set(0, 0.32, 0.54);
    const plankL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 1.06), mats.walnutWood);
    plankL.position.set(-1.06, 0.32, 0);
    const plankR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 1.06), mats.walnutWood);
    plankR.position.set(1.06, 0.32, 0);
    const rimCapF = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.045, 0.1), mats.oakWood);
    rimCapF.position.set(0, 0.61, -0.54);
    const rimCapB = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.045, 0.1), mats.oakWood);
    rimCapB.position.set(0, 0.61, 0.54);
    bedGrp.add(plankF, plankB, plankL, plankR, rimCapF, rimCapB);

    // 3. Organic damp textured soil bed + 2 mounded planting furrow ridges
    const soilBlock = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.42, 1.02), soilMat);
    soilBlock.position.set(0, 0.33, 0);
    bedGrp.add(soilBlock);
    for (const rowZ of [-0.24, 0.24]) {
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.94, 8), soilMat);
      ridge.rotation.z = Math.PI / 2;
      ridge.scale.set(0.45, 1, 1);
      ridge.position.set(0, 0.53, rowZ);
      bedGrp.add(ridge);
    }

    // 4. PVC Drip Irrigation Riser + Red Ball Valve + 2 LDPE Drip Tubes with micro-emitters
    const riserPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.64, 8), pvcWhiteMat);
    riserPipe.position.set(-0.96, 0.32, 0.42);
    const ballValve = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.024, 0.03), valveRedMat);
    ballValve.position.set(-0.96, 0.65, 0.42);
    bedGrp.add(riserPipe, ballValve);

    const dripEmissiveMat = mats.trackCustomMaterial(
      new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.7 })
    );
    const moistureBox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.08), mats.charcoalTitanium);
    moistureBox.position.set(0.84, 0.62, -0.52);
    const moistureLed = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), dripEmissiveMat);
    moistureLed.position.set(0.84, 0.64, -0.565);
    bedGrp.add(moistureBox, moistureLed);

    for (const rowZ of [-0.24, 0.24]) {
      const dripLine = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.88, 6), rubberMat);
      dripLine.rotation.z = Math.PI / 2;
      dripLine.position.set(0, 0.59, rowZ);
      bedGrp.add(dripLine);
      for (let em = -0.72; em <= 0.72; em += 0.36) {
        const emitter = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.01, 0.04, 6), brassMat);
        emitter.position.set(em, 0.585, rowZ);
        bedGrp.add(emitter);
      }
    }

    // 5. Suspended Full-Spectrum LED Grow Light Gantry on steel posts + suspension wires
    for (const gx of [-1.06, 1.06]) {
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 1.32, 8), galvanizedMat);
      upright.position.set(gx, 1.24, 0);
      bedGrp.add(upright);
    }
    const crossBar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 2.16, 8), galvanizedMat);
    crossBar.rotation.z = Math.PI / 2;
    crossBar.position.set(0, 1.88, 0);
    const lampHood = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.06, 0.36), mats.charcoalTitanium);
    lampHood.position.set(0, 1.68, 0);
    const growLightMat = mats.trackCustomMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xfce7f3,
        emissive: 0xe879f9,
        emissiveIntensity: 0.95,
        roughness: 0.22,
      })
    );
    const lampLens = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.02, 0.28), growLightMat);
    lampLens.position.set(0, 1.645, 0);
    for (const cx of [-0.72, 0.72]) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 4), mats.silverTitanium);
      wire.position.set(cx, 1.78, 0);
      bedGrp.add(wire);
    }
    bedGrp.add(crossBar, lampHood, lampLens);

    // 6. Stage-Driven Realistic Multi-Part 3D Crops (Stage 1: Sprouts, Stage 2: Foliage, Stage 3: Ripe Produce)
    const sproutGroup = new THREE.Group();
    const growingGroup = new THREE.Group();
    const ripeGroup = new THREE.Group();

    const slotXs = [-0.75, -0.37, 0.0, 0.37, 0.75];
    const slotZs = [-0.24, 0.24];

    for (const sx of slotXs) {
      for (const sz of slotZs) {
        // Stage 1: Tender dicot cotyledon seedlings
        const stem1 = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.14, 6), stemMat);
        stem1.position.set(sx, 0.62, sz);
        const leafA = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), leafFreshMat);
        leafA.scale.set(1.3, 0.35, 0.8);
        leafA.position.set(sx - 0.035, 0.69, sz);
        const leafB = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), leafFreshMat);
        leafB.scale.set(1.3, 0.35, 0.8);
        leafB.position.set(sx + 0.035, 0.69, sz);
        sproutGroup.add(stem1, leafA, leafB);

        // Stage 2: Bushy multi-leaf crop rosettes + bamboo stake
        const bushBase = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), leafDarkMat);
        bushBase.scale.set(1.1, 0.85, 1.1);
        bushBase.position.set(sx, 0.69, sz);
        const bushTop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), leafFreshMat);
        bushTop.position.set(sx + 0.02, 0.78, sz - 0.01);
        growingGroup.add(bushBase, bushTop);
        if (cfg.cropType === 'vegetables') {
          const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.62, 6), mats.oakWood);
          stake.position.set(sx + 0.06, 0.84, sz);
          growingGroup.add(stake);
        }

        // Stage 3: Full mature foliage + distinct ripe crop fruits/heads
        const ripeBush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.175, 1), leafDarkMat);
        ripeBush.scale.set(1.15, 0.98, 1.12);
        ripeBush.position.set(sx, 0.74, sz);
        const crownLeaves = new THREE.Mesh(new THREE.DodecahedronGeometry(0.135, 0), leafFreshMat);
        crownLeaves.position.set(sx, 0.88, sz);
        ripeGroup.add(ripeBush, crownLeaves);

        if (cfg.cropType === 'vegetables') {
          const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.015, 0.74, 6), mats.oakWood);
          stake.position.set(sx + 0.06, 0.9, sz);
          ripeGroup.add(stake);
          for (let f = 0; f < 2; f++) {
            const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), tomatoFruitMat);
            fruit.position.set(sx + (f === 0 ? -0.07 : 0.08), 0.78 + f * 0.11, sz + (f === 0 ? 0.09 : -0.08));
            ripeGroup.add(fruit);
          }
        } else if (cfg.cropType === 'berries') {
          for (let f = 0; f < 3; f++) {
            const berry = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.062, 6), berryFruitMat);
            berry.rotation.x = Math.PI;
            berry.position.set(
              sx + (f - 1) * 0.075,
              0.72 + (f % 2) * 0.06,
              sz + (f % 2 === 0 ? 0.1 : -0.09)
            );
            ripeGroup.add(berry);
          }
        } else {
          // Herbs: fragrant flowering lavender/basil spikes
          for (let s = 0; s < 2; s++) {
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.14, 6), herbBlossomMat);
            spike.position.set(sx + (s === 0 ? -0.05 : 0.06), 0.98, sz);
            ripeGroup.add(spike);
          }
        }
      }
    }

    bedGrp.add(sproutGroup, growingGroup, ripeGroup);
    b2Group.add(bedGrp);

    b2FarmBedVisuals.push({
      id: cfg.id,
      cropType: cfg.cropType,
      sproutGroup,
      growingGroup,
      ripeGroup,
      growLightMat,
      dripEmissiveMat,
    });
  }

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
    [2, 4],
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

  for (const [sx, sz, sw, sd] of [
    [-11.5, 0, 7.0, 24.0],
    [11.5, 0, 7.0, 24.0],
    [0, -9.5, 16.0, 5.0],
    [0, 9.5, 16.0, 5.0],
  ] as const) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.24, sd), mats.graphiteStone);
    slab.position.set(sx, b1Y - 0.12, sz);
    slab.receiveShadow = true;
    b1RingGroup.add(slab);
  }

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

  AURELION_ROOMS.filter((r) => r.level === 'B1').forEach((r) => {
    const plaque = new THREE.Mesh(
      new THREE.PlaneGeometry(1.5, 0.46),
      mats.createRoomPlaqueMaterial(r.code, r.name, '#6ce8ff')
    );
    plaque.position.set(r.center[0], b1Y + 2.65, r.center[1]);
    b1RingGroup.add(plaque);
  });

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

  const secDesk = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.9, 1.1), mats.charcoalTitanium);
  secDesk.position.set(11.5, b1Y + 0.45, -7.8);
  const secMonitor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 0.08), mats.cyanTelemetry);
  secMonitor.position.set(11.5, b1Y + 1.45, -8.3);
  const cctvWall = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.8, 3.8), mats.charcoalTitanium);
  cctvWall.position.set(14.3, b1Y + 1.6, -1.0);
  b1RingGroup.add(secDesk, secMonitor, cctvWall);

  const meetTable = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.82, 1.6), mats.walnutWood);
  meetTable.position.set(5.5, b1Y + 0.41, 9.6);
  const emergMapTable = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.86, 1.6), mats.charcoalTitanium);
  emergMapTable.position.set(0.0, b1Y + 0.43, 9.6);
  b1RingGroup.add(meetTable, emergMapTable);

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
    generatorFans,
    generatorLedMats,
    pumpRotors,
    pumpLedMat,
    purifierUvMat,
    cisternLevelBars,
    b2FarmBedVisuals,
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
  const b2Visible = handles.b2Group.visible;
  const b1Visible = handles.b1RingGroup.visible;

  if (b2Visible) {
    // 1. Animate diesel generator rotors, radiator fans & control LEDs
    if (systems.generatorRunning) {
      handles.generatorRotors.forEach((r) => {
        r.rotation.z += delta * 18.0;
      });
      handles.generatorFans.forEach((f) => {
        f.rotation.z += delta * 24.0;
      });
    }
    handles.generatorLedMats.forEach((m) => {
      m.color.setHex(systems.generatorRunning ? 0x22c55e : 0xf59e0b);
      m.emissive.setHex(systems.generatorRunning ? 0x22c55e : 0xf59e0b);
      m.emissiveIntensity = systems.generatorRunning ? 1.35 : 0.7;
    });

    // 2. Animate Booster Water Pump shaft couplings & status lamp
    const pumpSpinning = systems.waterPumpActive && systems.tier2StandardPowered && systems.rawWaterLiters > 5;
    if (pumpSpinning) {
      handles.pumpRotors.forEach((p) => {
        p.rotation.z += delta * 22.0;
      });
    }
    handles.pumpLedMat.color.setHex(pumpSpinning ? 0x22c55e : 0xf59e0b);
    handles.pumpLedMat.emissive.setHex(pumpSpinning ? 0x22c55e : 0xf59e0b);
    handles.pumpLedMat.emissiveIntensity = pumpSpinning ? 1.3 : 0.55;

    // 3. RO/UV Purifier UV quartz chamber glow & water cistern sight-level bars
    const uvActive = systems.purifierActive && systems.tier2StandardPowered;
    handles.purifierUvMat.emissiveIntensity = uvActive ? 1.55 : 0.15;
    const fillRatio = Math.max(0.06, Math.min(1.0, systems.rawWaterLiters / systems.maxWaterCapacityLiters));
    handles.cisternLevelBars.forEach((bar) => {
      bar.scale.y = fillRatio;
      bar.position.y = 0.44 + fillRatio * 0.91;
    });

    // 4. B2 Physical Farm Beds crop growth & drip/grow-light state
    const growPowered = systems.tier2StandardPowered;
    const dripActive = systems.waterPumpActive && growPowered && systems.treatedWaterLiters > 15;
    handles.b2FarmBedVisuals.forEach((vis, i) => {
      const bed = systems.b2FarmBeds[i];
      if (!bed) return;
      vis.sproutGroup.visible = bed.stage === 1;
      vis.growingGroup.visible = bed.stage === 2;
      vis.ripeGroup.visible = bed.stage === 3;
      if (bed.stage === 2) {
        const s = 0.72 + bed.growthProgress * 0.35;
        vis.growingGroup.scale.set(1, s, 1);
      }
      vis.growLightMat.emissiveIntensity = growPowered ? 1.05 : 0.08;
      vis.dripEmissiveMat.emissiveIntensity = dripActive ? 1.0 : 0.15;
    });

    // 5. Live B2 SCADA Control Display (throttled to ~2.5 Hz when visible)
    handles.scadaTimer = (handles.scadaTimer ?? 0.5) + delta;
    if (handles.scadaCtx && handles.scadaTimer >= 0.4) {
      handles.scadaTimer = 0;
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
        90
      );
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(
        `SOLAR ROOFTOP: +${systems.solarKw.toFixed(1)} kW  |  LOAD: ${systems.totalDemandKw.toFixed(1)} kW`,
        24,
        126
      );
      ctx.fillStyle = '#facc15';
      ctx.fillText(
        `LiFePO4 BATTERY BANK: ${systems.batteryKwh.toFixed(1)} / ${systems.batteryCapacityKwh} kWh (${Math.round((systems.batteryKwh / systems.batteryCapacityKwh) * 100)}%)`,
        24,
        162
      );
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(
        `PRIORITY SHEDDING: ${systems.powerPriorityMode.toUpperCase()}  [T1:${systems.tier1CriticalPowered ? 'ON' : 'OFF'} T2:${systems.tier2StandardPowered ? 'ON' : 'OFF'} T3:${systems.tier3LuxuryPowered ? 'ON' : 'OFF'}]`,
        24,
        198
      );
      ctx.fillStyle = '#34d399';
      ctx.fillText(
        `WATER PUMP: ${pumpSpinning ? 'PRESSURIZED' : 'IDLE'} (${systems.waterPressureBar.toFixed(1)} BAR) | POTABLE ${Math.round(systems.treatedWaterLiters)} L`,
        24,
        244
      );
      ctx.fillText(
        `RO/UV FILTRATION: ${uvActive ? (pumpSpinning ? 'ACTIVE (280 L/h)' : 'TRICKLE (90 L/h)') : 'PAUSED'}`,
        24,
        280
      );
      const ripeB2 = systems.b2FarmBeds.filter((b) => b.stage === 3).length;
      ctx.fillStyle = '#a3e635';
      ctx.fillText(
        `B2 FARM BEDS: ${ripeB2}/4 RIPE · DRIP IRRIGATION ${dripActive ? 'FLOWING' : 'PAUSED'}`,
        24,
        316
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '15px monospace';
      ctx.fillText('[E] AT GENERATOR, PUMP, WATER SKID, OR FARM BEDS TO OPERATE', 24, 358);
      handles.scadaTex.needsUpdate = true;
    }
  } else {
    handles.scadaTimer = 0.5;
  }

  if (b1Visible) {
    handles.tvTimer = (handles.tvTimer ?? 0.6) + delta;
    if (handles.basementTvCtx && (handles.tvTimer >= 0.5 || handles.lastTvOn !== basementTvOn)) {
      handles.tvTimer = 0;
      handles.lastTvOn = basementTvOn;
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
        ctx.fillText(`● WATER: ${Math.round(systems.treatedWaterLiters)} L (${systems.waterPressureBar.toFixed(1)} BAR)`, 18, 122);
        ctx.fillText(
          `● CROPS: ${systems.hydroBeds.filter((b) => b.stage === 3).length}/12 F5  |  ${systems.b2FarmBeds.filter((b) => b.stage === 3).length}/4 B2`,
          18,
          158
        );
        ctx.fillText(`● ELEVATORS: MAIN(${systems.elevators.main.currentFloor}) SVC(${systems.elevators.service.currentFloor}) VIP(${systems.elevators.private.currentFloor})`, 18, 194);
      }
      handles.basementTvTex.needsUpdate = true;
    }
  } else {
    handles.tvTimer = 0.6;
  }
}
