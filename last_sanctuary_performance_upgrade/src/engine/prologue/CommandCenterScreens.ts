import * as THREE from 'three';
import type { AITrainManager, RailwayServiceTelemetry } from '../world/AITrainManager';
import type { SharedBroadcastScreenFeed } from '../media/MediaTypes';

export interface CommandScreenSpec {
  id: string;
  index: number;
  floor: number; // 1..8
  title: string;
  category: 'dispatch' | 'telemetry' | 'security' | 'signals' | 'comms' | 'engineering' | 'briefing' | 'executive';
  pos: [number, number, number];
  size: [number, number];
  rotY: number;
  rotX?: number;
  bank: number;
  cell: number;
}

export interface CompoundLiveStatus {
  mainGateOpen: boolean;
  vehicleGate1Open: boolean;
  vehicleGate2Open: boolean;
  westPedOpen: boolean;
  eastPedOpen: boolean;
  garageShutterOpen: boolean;
  turretCount: number;
  activeThreats: number;
}

const FLOOR_H = 3.45;
const fY = (floorZeroIndexed: number, dy: number) => 0.65 + floorZeroIndexed * FLOOR_H + dy;

export const COMMAND_CENTER_25_SCREENS: CommandScreenSpec[] = [
  // FLOOR 1 (f=0): Grand Dispatch Lobby — 4 Screens (SCR-01 .. SCR-04)
  { id: 'SCR-01', index: 1, floor: 1, title: 'MASTER RAIL NETWORK MAP', category: 'dispatch', pos: [-6.8, fY(0, 2.02), 8.56], size: [3.2, 1.82], rotY: Math.PI, bank: 0, cell: 0 },
  { id: 'SCR-02', index: 2, floor: 1, title: '6-TRAIN CENTRAL DISPATCH', category: 'dispatch', pos: [-3.2, fY(0, 2.02), 8.56], size: [3.4, 1.82], rotY: Math.PI, bank: 0, cell: 1 },
  { id: 'SCR-03', index: 3, floor: 1, title: 'OAKRIDGE STATION ARRIVALS', category: 'dispatch', pos: [0.4, fY(0, 2.02), 8.56], size: [3.2, 1.82], rotY: Math.PI, bank: 0, cell: 2 },
  { id: 'SCR-04', index: 4, floor: 1, title: 'LOBBY RECEPTION & ALERTS', category: 'dispatch', pos: [-0.8, fY(0, 1.32), 2.25], size: [1.7, 0.92], rotY: Math.PI, rotX: -0.22, bank: 0, cell: 3 },

  // FLOOR 2 (f=1): Central Train Dispatch Hall — 6 Screens (SCR-05 .. SCR-10)
  { id: 'SCR-05', index: 5, floor: 2, title: 'TRAIN 01 LIVE TELEMETRY', category: 'telemetry', pos: [-7.4, fY(1, 2.02), 8.56], size: [3.3, 1.82], rotY: Math.PI, bank: 0, cell: 4 },
  { id: 'SCR-06', index: 6, floor: 2, title: 'TRAIN 02 LIVE TELEMETRY', category: 'telemetry', pos: [-3.7, fY(1, 2.02), 8.56], size: [3.3, 1.82], rotY: Math.PI, bank: 1, cell: 0 },
  { id: 'SCR-07', index: 7, floor: 2, title: 'TRAIN 03 LIVE TELEMETRY', category: 'telemetry', pos: [0.0, fY(1, 2.02), 8.56], size: [3.3, 1.82], rotY: Math.PI, bank: 1, cell: 1 },
  { id: 'SCR-08', index: 8, floor: 2, title: 'TRAIN 04 LIVE TELEMETRY', category: 'telemetry', pos: [-4.0, fY(1, 1.32), 2.25], size: [1.65, 0.9], rotY: Math.PI, rotX: -0.22, bank: 1, cell: 2 },
  { id: 'SCR-09', index: 9, floor: 2, title: 'TRAIN 05 LIVE TELEMETRY', category: 'telemetry', pos: [-0.8, fY(1, 1.32), 2.25], size: [1.65, 0.9], rotY: Math.PI, rotX: -0.22, bank: 1, cell: 3 },
  { id: 'SCR-10', index: 10, floor: 2, title: 'TRAIN 06 LIVE TELEMETRY', category: 'telemetry', pos: [2.4, fY(1, 1.32), 2.25], size: [1.65, 0.9], rotY: Math.PI, rotX: -0.22, bank: 1, cell: 4 },

  // FLOOR 3 (f=2): Security & Perimeter Surveillance — 4 Screens (SCR-11 .. SCR-14)
  { id: 'SCR-11', index: 11, floor: 3, title: '5KM PERIMETER RADAR SWEEP', category: 'security', pos: [-7.2, fY(2, 2.02), 8.56], size: [3.6, 1.85], rotY: Math.PI, bank: 2, cell: 0 },
  { id: 'SCR-12', index: 12, floor: 3, title: '5 GATES & 20 TURRETS ROE', category: 'security', pos: [-3.1, fY(2, 2.02), 8.56], size: [3.6, 1.85], rotY: Math.PI, bank: 2, cell: 1 },
  { id: 'SCR-13', index: 13, floor: 3, title: 'ZOMBIE HORDE HEATMAP', category: 'security', pos: [1.0, fY(2, 2.02), 8.56], size: [3.6, 1.85], rotY: Math.PI, bank: 2, cell: 2 },
  { id: 'SCR-14', index: 14, floor: 3, title: 'COMPOUND & RAIL CCTV CAM', category: 'security', pos: [-2.8, fY(2, 1.32), 2.25], size: [1.9, 0.96], rotY: Math.PI, rotX: -0.22, bank: 2, cell: 3 },

  // FLOOR 4 (f=3): Signal Interlocking & Track Control — 3 Screens (SCR-15 .. SCR-17)
  { id: 'SCR-15', index: 15, floor: 4, title: 'BLOCK SIGNAL ASPECT MATRIX', category: 'signals', pos: [-6.8, fY(3, 2.02), 8.56], size: [3.8, 1.85], rotY: Math.PI, bank: 2, cell: 4 },
  { id: 'SCR-16', index: 16, floor: 4, title: 'TRACK SWITCH INTERLOCKING', category: 'signals', pos: [-1.8, fY(3, 2.02), 8.56], size: [3.8, 1.85], rotY: Math.PI, bank: 3, cell: 0 },
  { id: 'SCR-17', index: 17, floor: 4, title: 'HOLD & DELAY QUEUE MONITOR', category: 'signals', pos: [-0.8, fY(3, 1.32), 2.25], size: [1.9, 0.96], rotY: Math.PI, rotX: -0.22, bank: 3, cell: 1 },

  // FLOOR 5 (f=4): Communications & Weather Telemetry — 3 Screens (SCR-18 .. SCR-20)
  { id: 'SCR-18', index: 18, floor: 5, title: 'MULTILINGUAL PA & RADIO', category: 'comms', pos: [-6.8, fY(4, 2.02), 8.56], size: [3.8, 1.85], rotY: Math.PI, bank: 3, cell: 2 },
  { id: 'SCR-19', index: 19, floor: 5, title: 'WEATHER & TRACK VISIBILITY', category: 'comms', pos: [-1.8, fY(4, 2.02), 8.56], size: [3.8, 1.85], rotY: Math.PI, bank: 3, cell: 3 },
  { id: 'SCR-20', index: 20, floor: 5, title: 'CAB-TO-TOWER VOICE RELAY', category: 'comms', pos: [-0.8, fY(4, 1.32), 2.25], size: [1.9, 0.96], rotY: Math.PI, rotX: -0.22, bank: 3, cell: 4 },

  // FLOOR 6 (f=5): Fleet Engineering & Traction Power — 3 Screens (SCR-21 .. SCR-23)
  { id: 'SCR-21', index: 21, floor: 6, title: '25KV TRACTION POWER GRID', category: 'engineering', pos: [-6.8, fY(5, 2.02), 8.56], size: [3.8, 1.85], rotY: Math.PI, bank: 4, cell: 0 },
  { id: 'SCR-22', index: 22, floor: 6, title: 'LOCOMOTIVE MOTOR & BRAKES', category: 'engineering', pos: [-1.8, fY(5, 2.02), 8.56], size: [3.8, 1.85], rotY: Math.PI, bank: 4, cell: 1 },
  { id: 'SCR-23', index: 23, floor: 6, title: 'GARAGE & RAIL POWER SYNC', category: 'engineering', pos: [-0.8, fY(5, 1.32), 2.25], size: [1.9, 0.96], rotY: Math.PI, rotX: -0.22, bank: 4, cell: 2 },

  // FLOOR 7 (f=6): Command Briefing & Ops Quarters — 1 Screen (SCR-24)
  { id: 'SCR-24', index: 24, floor: 7, title: 'EARTH CORRIDOR STRATEGY WALL', category: 'briefing', pos: [-2.4, fY(6, 2.02), 8.56], size: [5.4, 2.05], rotY: Math.PI, bank: 4, cell: 3 },

  // FLOOR 8 (f=7): Executive Observatory & Server Sync — 1 Screen (SCR-25)
  { id: 'SCR-25', index: 25, floor: 8, title: 'CENTRAL SERVER & 25-SCREEN SYNC', category: 'executive', pos: [-2.4, fY(7, 2.02), 8.56], size: [5.4, 2.05], rotY: Math.PI, bank: 4, cell: 4 },
];

export class CommandCenterScreens {
  private canvases: HTMLCanvasElement[] = [];
  private contexts: (CanvasRenderingContext2D | null)[] = [];
  private textures: THREE.CanvasTexture[] = [];
  private materials: THREE.Material[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private sweepAngle = 0;
  private bankTickTimer = 0;
  private nextBankIndex = 0;

  constructor(commandGroup: THREE.Group) {
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x101720,
      roughness: 0.3,
      metalness: 0.85,
    });
    const cyanTrimMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.materials.push(bezelMat, cyanTrimMat);

    // 5 texture banks x 5 cells = 25 unique live screen panels (320x240 each)
    for (let b = 0; b < 5; b++) {
      const canvas = document.createElement('canvas');
      canvas.width = 1600;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex });
      this.canvases.push(canvas);
      this.contexts.push(ctx);
      this.textures.push(tex);
      this.materials.push(mat);
    }

    const screenRoot = new THREE.Group();
    screenRoot.name = 'railway_command_25_live_screens';
    commandGroup.add(screenRoot);

    for (const spec of COMMAND_CENTER_25_SCREENS) {
      const holder = new THREE.Group();
      holder.name = `command_screen_${String(spec.index).padStart(2, '0')}`;
      holder.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
      holder.rotation.y = spec.rotY;
      if (spec.rotX) holder.rotation.x = spec.rotX;

      const [w, h] = spec.size;
      const bezelGeo = new THREE.BoxGeometry(w + 0.14, h + 0.14, 0.08);
      const bezel = new THREE.Mesh(bezelGeo, bezelMat);
      bezel.castShadow = true;

      const ledGeo = new THREE.BoxGeometry(w + 0.16, 0.035, 0.09);
      const ledTop = new THREE.Mesh(ledGeo, cyanTrimMat);
      ledTop.position.y = h / 2 + 0.075;

      const faceGeo = new THREE.PlaneGeometry(w, h);
      const uv = faceGeo.attributes.uv;
      const u0 = spec.cell * 0.2;
      const u1 = (spec.cell + 1) * 0.2;
      for (let i = 0; i < uv.count; i++) {
        uv.setX(i, uv.getX(i) < 0.5 ? u0 : u1);
      }
      uv.needsUpdate = true;

      const face = new THREE.Mesh(faceGeo, this.materials[2 + spec.bank]);
      face.position.z = 0.048;
      face.userData = {
        screenId: spec.id,
        screenIndex: spec.index,
        floor: spec.floor,
        title: spec.title,
        category: spec.category,
      };

      this.geometries.push(bezelGeo, ledGeo, faceGeo);
      holder.add(bezel, ledTop, face);
      screenRoot.add(holder);
    }

    // Initial full draw
    for (let b = 0; b < 5; b++) {
      this.renderBank(b, [], {
        mainGateOpen: false,
        vehicleGate1Open: false,
        vehicleGate2Open: false,
        westPedOpen: false,
        eastPedOpen: false,
        garageShutterOpen: true,
        turretCount: 20,
        activeThreats: 0,
      });
    }
  }

  public getScreenCount(): number {
    return COMMAND_CENTER_25_SCREENS.length;
  }

  public update(
    delta: number,
    aiTrainMgr: AITrainManager | null,
    status: CompoundLiveStatus,
    mediaFeed?: SharedBroadcastScreenFeed | null
  ) {
    this.sweepAngle = (this.sweepAngle + delta * 1.6) % (Math.PI * 2);
    this.bankTickTimer += delta;
    if (this.bankTickTimer >= 0.08) {
      this.bankTickTimer = 0;
      const telemetry = aiTrainMgr ? aiTrainMgr.getOperationsTelemetry() : [];
      this.renderBank(this.nextBankIndex, telemetry, status, mediaFeed);
      this.nextBankIndex = (this.nextBankIndex + 1) % 5;
    }
  }

  private renderBank(
    bank: number,
    telemetry: RailwayServiceTelemetry[],
    status: CompoundLiveStatus,
    mediaFeed?: SharedBroadcastScreenFeed | null
  ) {
    const ctx = this.contexts[bank];
    if (!ctx) return;

    const specs = COMMAND_CENTER_25_SCREENS.filter((s) => s.bank === bank);
    for (const spec of specs) {
      const ox = spec.cell * 320;
      this.drawCell(ctx, ox, 0, 320, 240, spec, telemetry, status, mediaFeed);
    }
    this.textures[bank].needsUpdate = true;
  }

  private drawCell(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    spec: CommandScreenSpec,
    telemetry: RailwayServiceTelemetry[],
    status: CompoundLiveStatus,
    mediaFeed?: SharedBroadcastScreenFeed | null
  ) {
    // Background + outer border
    ctx.fillStyle = '#07111d';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#184b68';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

    // Header bar
    ctx.fillStyle = '#0c2336';
    ctx.fillRect(x + 4, y + 4, w - 8, 28);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${spec.id} // F${spec.floor}`, x + 10, y + 22);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(spec.title.slice(0, 25), x + 98, y + 22);

    const cx = x + 12;
    let cy = y + 50;

    if (spec.index >= 5 && spec.index <= 10) {
      // Individual train telemetry (Trains 01..06)
      const slotIdx = spec.index - 5;
      const t = telemetry[slotIdx];
      if (!t) {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px monospace';
        ctx.fillText(`TRAIN 0${slotIdx + 1}: STANDBY`, cx, cy + 20);
        return;
      }
      ctx.fillStyle = t.status === 'RUNNING' ? '#22c55e' : t.status === 'HELD' ? '#ef4444' : '#f59e0b';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${t.trainNumber} · ${t.line.toUpperCase()} [${t.status}]`, cx, cy);
      cy += 20;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px monospace';
      ctx.fillText(`SPD: ${t.speedKmh.toFixed(1)} km/h | COND: ${t.conditionPct}%`, cx, cy);
      cy += 18;
      ctx.fillText(`ARRIVED: ${t.arrivedStation.slice(0, 20)}`, cx, cy);
      cy += 17;
      ctx.fillText(`DEPARTED: ${t.departedStation.slice(0, 19)}`, cx, cy);
      cy += 17;
      ctx.fillStyle = '#7dd3fc';
      ctx.fillText(`ARRIVING: ${t.arrivingStation.slice(0, 19)}`, cx, cy);
      cy += 17;
      ctx.fillText(`DEPARTING: ${t.departingStation.slice(0, 18)}`, cx, cy);
      cy += 19;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`DIST +${t.routeDistanceCoveredKm.toFixed(1)}km / REM ${t.routeDistanceLeftKm.toFixed(1)}km`, cx, cy);
      cy += 18;
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`ARR ${t.arrivalTime}  DEP ${t.departureTime}`, cx, cy);
      // Progress bar
      ctx.fillStyle = '#0f293a';
      ctx.fillRect(cx, y + h - 22, w - 24, 9);
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(cx, y + h - 22, ((w - 24) * Math.max(4, t.routeProgressPct)) / 100, 9);
      return;
    }

    if (spec.index === 1) {
      // Network map
      ctx.strokeStyle = '#1e6e8e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 25, y + 92);
      ctx.lineTo(x + w - 25, y + 92);
      ctx.moveTo(x + 25, y + 148);
      ctx.lineTo(x + w - 25, y + 148);
      ctx.stroke();
      telemetry.slice(0, 6).forEach((t, i) => {
        const px = x + 32 + ((t.routeProgressPct || (i * 18) % 100) / 100) * (w - 64);
        const py = i % 2 === 0 ? y + 92 : y + 148;
        ctx.fillStyle = t.status === 'RUNNING' ? '#22d3ee' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px monospace';
        ctx.fillText(`T${i + 1}`, px - 6, py - 10);
      });
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`ACTIVE CORRIDORS: ${telemetry.length}/6 ONLINE`, cx, y + h - 18);
      return;
    }

    if (spec.index === 2 || spec.index === 3) {
      // 6-train dispatch summary / arrivals
      ctx.font = '11px monospace';
      for (let i = 0; i < 6; i++) {
        const t = telemetry[i];
        ctx.fillStyle = t?.status === 'RUNNING' ? '#4ade80' : '#fbbf24';
        const label = t
          ? `${t.trainNumber} ${t.speedKmh.toFixed(0)}km/h -> ${t.arrivingStation.slice(0, 12)}`
          : `TR-0${i + 1} STANDBY`;
        ctx.fillText(label, cx, cy + i * 26);
      }
      return;
    }

    if (spec.index === 11 || spec.index === 13) {
      // Radar / Threat Heatmap
      const rcx = x + w / 2;
      const rcy = y + 132;
      const rr = 66;
      ctx.strokeStyle = '#155e75';
      ctx.lineWidth = 1.5;
      for (const frac of [0.35, 0.68, 1]) {
        ctx.beginPath();
        ctx.arc(rcx, rcy, rr * frac, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = spec.index === 13 ? '#f43f5e' : '#22d3ee';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rcx, rcy);
      ctx.lineTo(rcx + Math.cos(this.sweepAngle) * rr, rcy + Math.sin(this.sweepAngle) * rr);
      ctx.stroke();
      ctx.fillStyle = status.activeThreats > 0 ? '#f87171' : '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(
        spec.index === 13
          ? `DETECTED HOSTILES: ${status.activeThreats}`
          : `5KM SWEEP · 20 TURRETS READY`,
        cx,
        y + h - 14
      );
      return;
    }

    if (spec.index === 12) {
      // 5 gates & 20 turrets
      ctx.font = '11px monospace';
      const rows: Array<[string, boolean]> = [
        ['GATE 1 MAIN 12M', status.mainGateOpen],
        ['GATE 2 WEST PED', status.westPedOpen],
        ['GATE 3 EAST PED', status.eastPedOpen],
        ['GATE 4 GARAGE VEH', status.vehicleGate1Open],
        ['GATE 5 NORTH VEH', status.vehicleGate2Open],
        ['GARAGE SHUTTERS', status.garageShutterOpen],
      ];
      rows.forEach(([name, isOpen], idx) => {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(name, cx, cy + idx * 24);
        ctx.fillStyle = isOpen ? '#fbbf24' : '#34d399';
        ctx.fillText(isOpen ? 'OPEN' : 'SECURED', cx + 178, cy + idx * 24);
      });
      ctx.fillStyle = '#38bdf8';
      ctx.fillText(`SENTRIES: ${status.turretCount} ONLINE [HOSTILE ONLY]`, cx, y + h - 14);
      return;
    }

    if ((spec.index === 18 || spec.index === 20) && mediaFeed) {
      const isEmerg = mediaFeed.priority === 'emergency' || mediaFeed.status === 'eas_override';
      ctx.fillStyle = isEmerg ? '#f43f5e' : '#38bdf8';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `${mediaFeed.channelName.slice(0, 22).toUpperCase()} · ${mediaFeed.signalStrengthPct}% SIG`,
        cx,
        cy
      );
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(mediaFeed.headline.slice(0, 36), cx, cy + 24);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(mediaFeed.subheadline.slice(0, 32), cx, cy + 52);
      ctx.fillText(`PHASE: ${mediaFeed.worldPhase.toUpperCase()}`, cx, cy + 72);
      if (mediaFeed.lines[0]) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(mediaFeed.lines[0].slice(0, 34), cx, cy + 98);
      }
      ctx.fillStyle = isEmerg ? '#fbbf24' : '#34d399';
      ctx.fillText(mediaFeed.ticker.slice(0, 34), cx, y + h - 14);
      return;
    }

    // Generic crisp telemetry screens (CCTV, Signals, Comms, Power, Engineering, Briefing, Server)
    ctx.font = '11px monospace';
    const avgCond =
      telemetry.length > 0
        ? Math.round(telemetry.reduce((acc, t) => acc + t.conditionPct, 0) / telemetry.length)
        : 100;
    const runningCount = telemetry.filter((t) => t.status === 'RUNNING').length;
    const lines = [
      `FLOOR ${spec.floor} STATION: ONLINE`,
      `ACTIVE TRAINS: ${runningCount}/${telemetry.length || 6} IN TRANSIT`,
      `FLEET CONDITION AVG: ${avgCond}%`,
      `25KV GRID: 24.8 kV · NOMINAL`,
      `TURRET ROE: HOSTILE FACTION ONLY`,
      `NETWORK SYNC: 25/25 SCREENS ACTIVE`,
    ];
    lines.forEach((line, idx) => {
      ctx.fillStyle = idx === 0 ? '#38bdf8' : idx === 5 ? '#34d399' : '#cbd5e1';
      ctx.fillText(line, cx, cy + idx * 26);
    });
  }

  public dispose() {
    this.textures.forEach((t) => t.dispose());
    this.materials.forEach((m) => m.dispose());
    this.geometries.forEach((g) => g.dispose());
    this.canvases.length = 0;
    this.contexts.length = 0;
    this.textures.length = 0;
    this.materials.length = 0;
    this.geometries.length = 0;
  }
}
