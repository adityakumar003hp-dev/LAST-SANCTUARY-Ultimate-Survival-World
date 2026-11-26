import * as THREE from 'three';
import {
  NEXUS_ALL_SCREENS,
  NEXUS_FLOORS,
  NEXUS_SCREEN_BANK_COUNT,
  NexusScreenSpec,
} from './NexusConfig';
import type { NexusLiveContext, NexusSystems } from './NexusSystems';

export class NexusScreensRenderer {
  private readonly canvases: HTMLCanvasElement[] = [];
  private readonly contexts: (CanvasRenderingContext2D | null)[] = [];
  private readonly textures: THREE.CanvasTexture[] = [];
  private readonly materials: THREE.Material[] = [];
  private readonly geometries: THREE.BufferGeometry[] = [];
  private directoryCanvas: HTMLCanvasElement;
  private directoryCtx: CanvasRenderingContext2D | null;
  private directoryTex: THREE.CanvasTexture;
  private nextBankToUpdate = 0;
  private tickTimer = 0;

  constructor(
    floorGroups: Record<number, THREE.Group>,
    onRegisterFloor1Directory?: (mesh: THREE.Mesh) => void
  ) {
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x0f141c,
      roughness: 0.28,
      metalness: 0.86,
    });
    const goldFrameMat = new THREE.MeshStandardMaterial({
      color: 0xd4b36a,
      roughness: 0.25,
      metalness: 0.9,
    });
    this.materials.push(bezelMat, goldFrameMat);

    // 16 texture atlases (each 1280 x 720, 4 columns x 3 rows = 12 screens at 320 x 240 px)
    for (let b = 0; b < NEXUS_SCREEN_BANK_COUNT; b++) {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      this.canvases.push(canvas);
      this.contexts.push(ctx);
      this.textures.push(tex);
      this.materials.push(mat);
    }

    // Build all 189 physical 3D interactive monitors inside their respective floor groups
    for (const spec of NEXUS_ALL_SCREENS) {
      const targetGroup = floorGroups[spec.floor];
      if (!targetGroup) continue;

      const [w, h] = spec.mountSize;
      const holder = new THREE.Group();
      holder.name = `nexus_screen_${spec.id}`;
      holder.position.set(spec.mountPos[0], spec.mountPos[1], spec.mountPos[2]);
      holder.rotation.y = spec.mountRotY;
      if (spec.mountRotX) holder.rotation.x = spec.mountRotX;

      const bezelGeo = new THREE.BoxGeometry(w + 0.08, h + 0.08, 0.055);
      this.geometries.push(bezelGeo);
      const bezel = new THREE.Mesh(bezelGeo, bezelMat);
      holder.add(bezel);

      const trimGeo = new THREE.BoxGeometry(w + 0.1, 0.025, 0.062);
      this.geometries.push(trimGeo);
      const trim = new THREE.Mesh(trimGeo, goldFrameMat);
      trim.position.y = -h * 0.5 - 0.032;
      holder.add(trim);

      const screenGeo = new THREE.PlaneGeometry(w, h);
      // Map UV cleanly to cell in 4x3 grid
      const col = spec.cell % 4;
      const row = Math.floor(spec.cell / 4); // 0 top, 2 bottom
      const u0 = col * 0.25;
      const u1 = u0 + 0.25;
      const v1 = 1 - row / 3;
      const v0 = v1 - 1 / 3;
      const uvAttr = screenGeo.attributes.uv;
      uvAttr.setXY(0, u0, v1);
      uvAttr.setXY(1, u1, v1);
      uvAttr.setXY(2, u0, v0);
      uvAttr.setXY(3, u1, v0);
      uvAttr.needsUpdate = true;
      this.geometries.push(screenGeo);

      const screenMat = this.materials[2 + spec.bank];
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.z = 0.03;
      holder.add(screenMesh);

      targetGroup.add(holder);
    }

    // Floor 1 North Building Directory Wall Texture
    this.directoryCanvas = document.createElement('canvas');
    this.directoryCanvas.width = 1024;
    this.directoryCanvas.height = 512;
    this.directoryCtx = this.directoryCanvas.getContext('2d');
    this.directoryTex = new THREE.CanvasTexture(this.directoryCanvas);
    this.directoryTex.colorSpace = THREE.SRGBColorSpace;
    const dirMat = new THREE.MeshBasicMaterial({ map: this.directoryTex });
    this.materials.push(dirMat);
    const dirGeo = new THREE.PlaneGeometry(5.6, 2.5);
    this.geometries.push(dirGeo);
    const dirMesh = new THREE.Mesh(dirGeo, dirMat);
    dirMesh.position.set(0.2, NEXUS_FLOORS[1].floorY + 2.35, 8.68);
    dirMesh.rotation.y = Math.PI;
    dirMesh.name = 'nexus_f1_building_directory_screen';
    if (floorGroups[1]) {
      floorGroups[1].add(dirMesh);
    }
    onRegisterFloor1Directory?.(dirMesh);
  }

  public update(delta: number, systems: NexusSystems, live: NexusLiveContext, forceAll = false): void {
    this.tickTimer += delta;
    if (!forceAll && this.tickTimer < 0.16) return;
    this.tickTimer = 0;

    if (forceAll) {
      for (let b = 0; b < NEXUS_SCREEN_BANK_COUNT; b++) {
        this.renderBank(b, systems, live);
      }
      this.renderFloor1Directory(systems, live);
      return;
    }

    // Render 2 banks per tick + F1 directory periodically
    for (let step = 0; step < 2; step++) {
      this.renderBank(this.nextBankToUpdate, systems, live);
      this.nextBankToUpdate = (this.nextBankToUpdate + 1) % NEXUS_SCREEN_BANK_COUNT;
    }
    if (this.nextBankToUpdate === 0) {
      this.renderFloor1Directory(systems, live);
    }
  }

  private renderFloor1Directory(systems: NexusSystems, live: NexusLiveContext): void {
    const ctx = this.directoryCtx;
    if (!ctx) return;
    ctx.fillStyle = '#0b0f17';
    ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = '#d4b36a';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 1004, 492);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('THE NEXUS · 8-FLOOR GRAND INTELLIGENCE DIRECTORY', 32, 54);
    ctx.fillStyle = '#d4b36a';
    ctx.font = '18px monospace';
    ctx.fillText(
      `VISITOR: ${systems.visitorName.toUpperCase()} · CLEARANCE: ${systems.clearanceLevel.toUpperCase()} · TRAINS ACTIVE: ${live.trains.length}`,
      32,
      86
    );

    const rows = [
      ['F8', 'ZOMBIE OUTBREAK INTELLIGENCE & RADAR', '32 SCREENS + WORLD RADAR', '#f43f5e'],
      ['F7', 'PLAYER COMPOUND INTELLIGENCE & RADAR', '32 SCREENS + 20-TOWER 3D TABLE', '#06b6d4'],
      ['F6', 'EXECUTIVE SKY COMMAND', '25 SCREENS · STRATEGIC SUITE', '#eab308'],
      ['F5', 'TECH & COMMS DIVISION', '25 SCREENS · SERVERS & SIM LAB', '#818cf8'],
      ['F4', 'INFRASTRUCTURE ENGINEERING LAB', '25 SCREENS · TRACK & BRIDGES', '#f59e0b'],
      ['F3', 'TRAIN OPERATIONS ARENA', '25 SCREENS · 6-TRAIN DISPATCH', '#22d3ee'],
      ['F2', 'RAILWAY NETWORK OBSERVATORY', '25 SCREENS · 3D CORRIDOR MAP', '#38bdf8'],
      ['F1', 'GRAND TERMINAL ATRIUM', '15 ZONES · LIFT A & LIFT B', '#d4b36a'],
    ];

    rows.forEach(([fl, name, sub, col], idx) => {
      const y = 114 + idx * 46;
      ctx.fillStyle = '#131a26';
      ctx.fillRect(32, y, 960, 38);
      ctx.fillStyle = col;
      ctx.fillRect(32, y, 8, 38);
      ctx.font = 'bold 20px monospace';
      ctx.fillText(fl, 54, y + 26);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(name, 106, y + 26);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(sub, 660, y + 25);
    });

    this.directoryTex.needsUpdate = true;
  }

  private renderBank(bankIndex: number, systems: NexusSystems, live: NexusLiveContext): void {
    const ctx = this.contexts[bankIndex];
    if (!ctx) return;

    const startIdx = bankIndex * 12;
    const endIdx = Math.min(NEXUS_ALL_SCREENS.length, startIdx + 12);

    for (let idx = startIdx; idx < endIdx; idx++) {
      const spec = NEXUS_ALL_SCREENS[idx];
      const col = spec.cell % 4;
      const row = Math.floor(spec.cell / 4);
      const ox = col * 320;
      const oy = row * 240;
      this.drawCell(ctx, ox, oy, spec, systems, live);
    }

    this.textures[bankIndex].needsUpdate = true;
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    ox: number,
    oy: number,
    spec: NexusScreenSpec,
    systems: NexusSystems,
    live: NexusLiveContext
  ): void {
    const accent = NEXUS_FLOORS[spec.floor].accentCss;

    ctx.fillStyle = '#0a0f18';
    ctx.fillRect(ox, oy, 320, 240);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 3, oy + 3, 314, 234);

    // Header Band
    ctx.fillStyle = '#131c2b';
    ctx.fillRect(ox + 5, oy + 5, 310, 34);
    ctx.fillStyle = accent;
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${spec.code} · F${spec.floor}`, ox + 12, oy + 20);
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(spec.title.slice(0, 33), ox + 12, oy + 34);

    // Content uniquely specialized by screen type
    ctx.font = '11px monospace';
    if (spec.floor === 2 || spec.floor === 3) {
      const targetTrain = spec.targetId
        ? live.trains.find((t) => t.line === spec.targetId)
        : live.trains[spec.indexOnFloor % Math.max(1, live.trains.length)];

      if (spec.uiKind === 'network_map') {
        // Corridor schematic
        for (let lineIdx = 0; lineIdx < 6; lineIdx++) {
          const ly = oy + 62 + lineIdx * 24;
          ctx.strokeStyle = '#1e293b';
          ctx.beginPath();
          ctx.moveTo(ox + 16, ly);
          ctx.lineTo(ox + 304, ly);
          ctx.stroke();
          const t = live.trains[lineIdx];
          if (t) {
            const norm = ((t.x + 4800) / 9600);
            const px = ox + 18 + Math.max(0, Math.min(1, norm)) * 282;
            ctx.fillStyle = t.holdOrdered ? '#ef4444' : '#38bdf8';
            ctx.fillRect(px - 6, ly - 5, 12, 10);
            ctx.fillStyle = '#cbd5e1';
            ctx.fillText(`${t.line} ${t.speedKmh}kmh`, ox + 16, ly - 7);
          }
        }
      } else if (targetTrain) {
        ctx.fillStyle = targetTrain.holdOrdered ? '#f87171' : '#38bdf8';
        ctx.fillText(`${targetTrain.trainNumber} · ${targetTrain.line} (${targetTrain.status})`, ox + 14, oy + 62);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillText(`SPD: ${targetTrain.speedKmh} km/h  DIST: ${targetTrain.totalDistanceCoveredKm} km`, ox + 14, oy + 84);
        ctx.fillText(`NEXT: ${targetTrain.nextStation.slice(0, 22)}`, ox + 14, oy + 104);
        ctx.fillText(`ETA: ${targetTrain.arrivalCountdownText}  MTR: ${targetTrain.tractionMotorTempC}C`, ox + 14, oy + 124);
        ctx.fillText(`BRK: ${targetTrain.brakePressureBar.toFixed(1)}BAR  OHL: ${targetTrain.pantographVoltageKv.toFixed(1)}kV`, ox + 14, oy + 144);
        // Progress bar
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(ox + 14, oy + 166, 290, 12);
        ctx.fillStyle = accent;
        ctx.fillRect(ox + 14, oy + 166, Math.max(8, (targetTrain.routeProgressPct / 100) * 290), 12);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(`ROUTE PROGRESS ${targetTrain.routeProgressPct}%`, ox + 14, oy + 200);
      } else {
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('AWAITING TRAIN TELEMETRY...', ox + 14, oy + 90);
      }
    } else if (spec.floor === 4 || spec.floor === 5 || spec.floor === 6) {
      const aur = live.compound.aurelionSnapshot;
      ctx.fillStyle = accent;
      ctx.fillText(spec.purpose.slice(0, 36), ox + 12, oy + 60);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`LIFT A: F${systems.elevators.liftA.currentFloor} (${systems.elevators.liftA.moving ? 'RUN' : 'IDLE'})`, ox + 12, oy + 86);
      ctx.fillText(`LIFT B: F${systems.elevators.liftB.currentFloor} (${systems.elevators.liftB.moving ? 'RUN' : 'IDLE'})`, ox + 12, oy + 106);
      ctx.fillText(`RAIL FLEET: ${live.trains.length} ACTIVE · PAXS: ${live.stationSnapshot?.stationPassengers ?? 0}`, ox + 12, oy + 128);
      if (aur) {
        ctx.fillText(`SOLAR/GEN: ${aur.power.solarKw.toFixed(1)}kW / ${aur.power.generatorKw.toFixed(1)}kW`, ox + 12, oy + 150);
        ctx.fillText(`BATT: ${aur.power.batteryPercent.toFixed(0)}% · WATER: ${Math.round(aur.water.treatedLiters)}L`, ox + 12, oy + 170);
      }
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`OPEN WORK ORDERS: ${systems.engineeringOrders.filter((w) => w.status === 'open').length}`, ox + 12, oy + 198);
    } else if (spec.floor === 7) {
      const turrets = live.compound.turrets;
      const onlineCount = turrets.filter((t) => t.health > 0).length;
      const gatesOpen =
        (live.compound.mainGateOpen ? 1 : 0) +
        (live.compound.westPedOpen ? 1 : 0) +
        (live.compound.eastPedOpen ? 1 : 0) +
        (live.compound.vehicleGate1Open ? 1 : 0) +
        (live.compound.vehicleGate2Open ? 1 : 0);

      // Draw crisp mini compound perimeter radar
      ctx.strokeStyle = '#0e7490';
      ctx.strokeRect(ox + 16, oy + 52, 110, 140);
      const sweep = systems.radarSweepAngle;
      ctx.strokeStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(ox + 71, oy + 122);
      ctx.lineTo(ox + 71 + Math.cos(sweep) * 50, oy + 122 + Math.sin(sweep) * 50);
      ctx.stroke();

      ctx.fillStyle = '#67e8f9';
      ctx.fillText(`TURRETS: ${onlineCount}/${turrets.length}`, ox + 140, oy + 68);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`GATES OPEN: ${gatesOpen}/5`, ox + 140, oy + 90);
      ctx.fillText(`FLEET: ${live.compound.vehicles.length} VEHICLES`, ox + 140, oy + 112);
      ctx.fillText(`NPCS: ${live.npcs.length} TRACKED`, ox + 140, oy + 134);
      ctx.fillText(`LAYERS ON: ${Object.values(systems.compoundLayers).filter(Boolean).length}/12`, ox + 140, oy + 156);
      ctx.fillText(`POS: ${Math.round(live.player.position[0])}, ${Math.round(live.player.position[2])}`, ox + 140, oy + 180);
    } else if (spec.floor === 8) {
      const m = live.outbreak.globalMetrics;
      const sevPct = Math.round(m.apocalypticSeverity * 100);
      ctx.fillStyle = sevPct > 65 ? '#fb7185' : '#fbbf24';
      ctx.fillText(`SEVERITY: ${sevPct}%  GRID: ${Math.round(m.powerGridStability * 100)}%`, ox + 14, oy + 62);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(`INFECTED: ${m.totalInfected.toLocaleString()}`, ox + 14, oy + 84);
      ctx.fillText(`OVERRUN CITIES: ${m.overrunCitiesCount}/${live.outbreak.cities.length}`, ox + 14, oy + 106);
      ctx.fillText(`SECTOR ZOMBIES: ${live.outbreak.activeZombies.length}`, ox + 14, oy + 128);
      ctx.fillText(`CHUNKS SCANNED: ${live.outbreak.discoveredChunksCount}`, ox + 14, oy + 150);
      ctx.fillText(`WEATHER: ${live.outbreak.weather.weather.toUpperCase()}`, ox + 14, oy + 172);
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`LAYERS ACTIVE: ${Object.values(systems.outbreakLayers).filter(Boolean).length}/10`, ox + 14, oy + 196);
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.fillText(`[E] INSPECT ${spec.id} · PRESS FOR TERMINAL`, ox + 12, oy + 225);
  }

  public dispose(): void {
    this.textures.forEach((t) => t.dispose());
    this.directoryTex.dispose();
    this.materials.forEach((m) => m.dispose());
    this.geometries.forEach((g) => g.dispose());
  }
}
