import * as THREE from 'three';
import { AITrainManager, RailwayServiceTelemetry } from '../world/AITrainManager';

export class BasementControlRoom {
  public group: THREE.Group;
  public origin: THREE.Vector3;

  // Active Canvas Textures for the exactly FIVE monitors
  private centreCanvas: HTMLCanvasElement;
  private centreCtx: CanvasRenderingContext2D | null;
  private centreTexture: THREE.CanvasTexture;

  private left1Canvas: HTMLCanvasElement;
  private left1Ctx: CanvasRenderingContext2D | null;
  private left1Texture: THREE.CanvasTexture;

  private left2Canvas: HTMLCanvasElement;
  private left2Ctx: CanvasRenderingContext2D | null;
  private left2Texture: THREE.CanvasTexture;

  private right1Canvas: HTMLCanvasElement;
  private right1Ctx: CanvasRenderingContext2D | null;
  private right1Texture: THREE.CanvasTexture;

  private right2Canvas: HTMLCanvasElement;
  private right2Ctx: CanvasRenderingContext2D | null;
  private right2Texture: THREE.CanvasTexture;

  // Monitor mesh references for cleanup and animation
  private monitorMeshes: THREE.Mesh[] = [];
  private renderTimer = 0;
  private blinkTimer = 0;

  // Materials for disposal
  private materials: THREE.Material[] = [];

  constructor(parent: THREE.Group, origin: THREE.Vector3) {
    this.origin = origin;
    this.group = new THREE.Group();
    this.group.name = 'apartment_basement_railway_control_centre';
    parent.add(this.group);

    // 1. Initialize Canvases for the 5 monitors
    this.centreCanvas = document.createElement('canvas');
    this.centreCanvas.width = 1024;
    this.centreCanvas.height = 512;
    this.centreCtx = this.centreCanvas.getContext('2d');
    this.centreTexture = new THREE.CanvasTexture(this.centreCanvas);
    this.centreTexture.colorSpace = THREE.SRGBColorSpace;

    this.left1Canvas = document.createElement('canvas');
    this.left1Canvas.width = 512;
    this.left1Canvas.height = 320;
    this.left1Ctx = this.left1Canvas.getContext('2d');
    this.left1Texture = new THREE.CanvasTexture(this.left1Canvas);
    this.left1Texture.colorSpace = THREE.SRGBColorSpace;

    this.left2Canvas = document.createElement('canvas');
    this.left2Canvas.width = 512;
    this.left2Canvas.height = 320;
    this.left2Ctx = this.left2Canvas.getContext('2d');
    this.left2Texture = new THREE.CanvasTexture(this.left2Canvas);
    this.left2Texture.colorSpace = THREE.SRGBColorSpace;

    this.right1Canvas = document.createElement('canvas');
    this.right1Canvas.width = 512;
    this.right1Canvas.height = 320;
    this.right1Ctx = this.right1Canvas.getContext('2d');
    this.right1Texture = new THREE.CanvasTexture(this.right1Canvas);
    this.right1Texture.colorSpace = THREE.SRGBColorSpace;

    this.right2Canvas = document.createElement('canvas');
    this.right2Canvas.width = 512;
    this.right2Canvas.height = 320;
    this.right2Ctx = this.right2Canvas.getContext('2d');
    this.right2Texture = new THREE.CanvasTexture(this.right2Canvas);
    this.right2Texture.colorSpace = THREE.SRGBColorSpace;

    // 2. Build Physical Basement Architecture
    this.buildBasementArchitecture();

    // 3. Build Staircase connecting Ground Floor to Basement
    this.buildBasementStaircase();

    // 4. Build Control Desk and Mount Exactly 5 Monitors
    this.buildControlDeskAndMonitors();

    // 5. Initial render on all 5 canvases
    this.renderAllMonitors([]);
  }

  // ==========================================
  // 1. BASEMENT ARCHITECTURE (y = -4.0 to -0.2)
  // ==========================================
  private buildBasementArchitecture() {
    const concreteWallMat = new THREE.MeshStandardMaterial({
      color: 0x484e55,
      roughness: 0.88,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const concreteFloorMat = new THREE.MeshStandardMaterial({
      color: 0x373c42,
      roughness: 0.72,
      metalness: 0.22,
    });
    const steelTrimMat = new THREE.MeshStandardMaterial({
      color: 0x22262b,
      metalness: 0.82,
      roughness: 0.35,
    });
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x7a838d,
      metalness: 0.75,
      roughness: 0.4,
    });
    const yellowStripeMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.6,
    });
    this.materials.push(concreteWallMat, concreteFloorMat, steelTrimMat, conduitMat, yellowStripeMat);

    // Polished Concrete Sub-Level Floor Slab at y = -4.0
    const floor = new THREE.Mesh(new THREE.BoxGeometry(16, 0.35, 14), concreteFloorMat);
    floor.position.set(0, -4.175, 0);
    floor.receiveShadow = true;
    this.group.add(floor);

    // Concrete Ceiling (underside of ground floor slab at y = -0.1)
    const ceiling = new THREE.Mesh(new THREE.BoxGeometry(16, 0.2, 14), concreteWallMat);
    ceiling.position.set(0, -0.1, 0);
    this.group.add(ceiling);

    // Heavy Exterior Concrete Perimeter Walls
    const wallN = new THREE.Mesh(new THREE.BoxGeometry(16, 3.9, 0.4), concreteWallMat);
    wallN.position.set(0, -2.05, 6.8);
    const wallS = new THREE.Mesh(new THREE.BoxGeometry(16, 3.9, 0.4), concreteWallMat);
    wallS.position.set(0, -2.05, -6.8);
    const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.9, 14), concreteWallMat);
    wallW.position.set(-7.8, -2.05, 0);
    const wallE = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.9, 14), concreteWallMat);
    wallE.position.set(7.8, -2.05, 0);
    this.group.add(wallN, wallS, wallW, wallE);

    // Hazard Demarcation Walkway Border along the floor
    const hazardStripe = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.02, 6.0), yellowStripeMat);
    hazardStripe.position.set(0, -3.98, -1.5);
    hazardStripe.receiveShadow = true;
    this.group.add(hazardStripe);

    const innerFloorPad = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.025, 5.6),
      new THREE.MeshStandardMaterial({ color: 0x1e242b, roughness: 0.65 })
    );
    innerFloorPad.position.set(0, -3.97, -1.5);
    innerFloorPad.receiveShadow = true;
    this.materials.push(innerFloorPad.material as THREE.Material);
    this.group.add(innerFloorPad);

    // Four Reinforced Structural Concrete Support Columns
    const colPositions: [number, number][] = [
      [-5.5, 3.5],
      [-5.5, -3.5],
      [5.5, 3.5],
      [5.5, -3.5],
    ];
    for (const [cx, cz] of colPositions) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 3.9, 12), concreteWallMat);
      col.position.set(cx, -2.05, cz);
      col.castShadow = true;
      col.receiveShadow = true;

      const stripeRing = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.4, 12), yellowStripeMat);
      stripeRing.position.set(cx, -3.5, cz);
      this.group.add(col, stripeRing);
    }

    // Industrial Ceiling Cable Trays and HVAC Ventilation Ducts
    for (const z of [-3.5, 0, 3.5]) {
      const duct = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.35, 0.65), conduitMat);
      duct.position.set(0, -0.4, z);
      this.group.add(duct);

      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.12, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x111316, metalness: 0.8 })
      );
      vent.position.set(0, -0.6, z);
      this.materials.push(vent.material as THREE.Material);
      this.group.add(vent);
    }

    // Heavy Server Racks along the West Wall (Subsystem AI & Telemetry Processors)
    for (let i = 0; i < 3; i++) {
      const rack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.6, 1.4), steelTrimMat);
      rack.position.set(-7.1, -2.7, -2.2 + i * 2.2);
      rack.castShadow = true;

      // Server unit faceplates with blinking LEDs
      const rackFace = new THREE.Mesh(
        new THREE.PlaneGeometry(0.02, 2.3),
        new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
      );
      rackFace.position.set(-6.64, -2.7, -2.2 + i * 2.2);
      rackFace.rotation.y = Math.PI / 2;
      this.materials.push(rackFace.material as THREE.Material);
      this.group.add(rack, rackFace);
    }

    // Electrical Main Distribution Switchgear on East Wall
    const breakerCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 2.2), steelTrimMat);
    breakerCabinet.position.set(7.5, -2.8, -4.5);
    const cabinetDoor = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 2.2, 1.0),
      new THREE.MeshStandardMaterial({ color: 0x3b424b, metalness: 0.7 })
    );
    cabinetDoor.position.set(7.48, -2.8, -4.5);
    this.materials.push(cabinetDoor.material as THREE.Material);
    this.group.add(breakerCabinet, cabinetDoor);

    // Warm Industrial Fluorescent Strip Light Fixtures
    const lights: Array<{ pos: [number, number, number]; color: number; intensity: number; dist: number }> = [
      { pos: [0, -0.6, -1.5], color: 0xe0f2fe, intensity: 2.2, dist: 16 },
      { pos: [-4.0, -0.6, 2.0], color: 0xffedd5, intensity: 1.6, dist: 12 },
      { pos: [4.0, -0.6, 2.0], color: 0xffedd5, intensity: 1.6, dist: 12 },
      { pos: [6.2, -1.2, -3.5], color: 0xa7f3d0, intensity: 1.4, dist: 10 }, // Stairwell base light
    ];
    for (const l of lights) {
      const lamp = new THREE.PointLight(l.color, l.intensity, l.dist, 1.4);
      lamp.position.set(l.pos[0], l.pos[1], l.pos[2]);
      this.group.add(lamp);

      // Industrial strip housing mesh
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 0.08, 0.28),
        new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.5 })
      );
      fixture.position.set(l.pos[0], l.pos[1] + 0.1, l.pos[2]);
      const bulb = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.04, 0.16),
        new THREE.MeshBasicMaterial({ color: l.color })
      );
      bulb.position.set(l.pos[0], l.pos[1] + 0.04, l.pos[2]);
      this.materials.push(fixture.material as THREE.Material, bulb.material as THREE.Material);
      this.group.add(fixture, bulb);
    }
  }

  // ==========================================
  // 2. BASEMENT STAIRCASE (Ground Floor -> B1)
  // ==========================================
  private buildBasementStaircase() {
    const stairSteelMat = new THREE.MeshStandardMaterial({
      color: 0x272b30,
      metalness: 0.85,
      roughness: 0.35,
    });
    const treadNosingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.5,
    });
    const handrailSteelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Distinct blue/cyan industrial safety railing
      metalness: 0.9,
      roughness: 0.25,
    });
    const landingTileMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
    });
    this.materials.push(stairSteelMat, treadNosingMat, handrailSteelMat, landingTileMat);

    const flightZ0 = -3.5;
    const flightZ1 = 0.7;
    const flightDepth = flightZ1 - flightZ0; // 4.2m
    const numSteps = 10;
    const flight1H = 2.145; // 0.245 down to -1.90
    const flight2H = 2.10;  // -1.90 down to -4.00
    const step1H = flight1H / numSteps;
    const step2H = flight2H / numSteps;
    const stepD = flightDepth / numSteps;

    // --- FLIGHT 1: Descends rearward in lane X = 6.65 (y: 0.245 -> -1.90) ---
    const lane1X = 6.65;
    const flight1Group = new THREE.Group();
    flight1Group.name = 'basement_stair_flight_1';

    for (let i = 0; i < numSteps; i++) {
      const z = flightZ0 + (i + 0.5) * stepD;
      const y = 0.245 - (i + 0.5) * step1H;

      // Tread
      const tread = new THREE.Mesh(new THREE.BoxGeometry(1.15, step1H, stepD + 0.03), stairSteelMat);
      tread.position.set(lane1X, y, z);
      tread.receiveShadow = true;
      flight1Group.add(tread);

      // Yellow anti-slip safety nosing on step edge
      const nosing = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.025, 0.06), treadNosingMat);
      nosing.position.set(lane1X, y + step1H * 0.5 + 0.012, z + stepD * 0.5);
      flight1Group.add(nosing);
    }

    // Handrails on Flight 1
    for (const sx of [lane1X - 0.62, lane1X + 0.62]) {
      const railLen = Math.hypot(flight1H, flightDepth);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, railLen, 8), handrailSteelMat);
      rail.rotation.x = Math.PI / 2 + Math.atan2(flight1H, flightDepth);
      rail.position.set(sx, 0.245 - flight1H * 0.5 + 0.85, (flightZ0 + flightZ1) / 2);
      flight1Group.add(rail);

      // Vertical balusters
      for (let b = 0; b <= 6; b++) {
        const t = b / 6;
        const bz = flightZ0 + t * flightDepth;
        const by = 0.245 - t * flight1H + 0.42;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 6), handrailSteelMat);
        post.position.set(sx, by, bz);
        flight1Group.add(post);
      }
    }
    this.group.add(flight1Group);

    // --- MIDWAY LANDING at y = -1.90 (z: 0.7 to 1.8, x: 4.8 to 7.6) ---
    const midLanding = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.22, 1.25), landingTileMat);
    midLanding.position.set(6.0, -1.90, 1.25);
    midLanding.receiveShadow = true;
    this.group.add(midLanding);

    // Rear wall guardrail on midway landing
    const landingRail = new THREE.Mesh(new THREE.BoxGeometry(2.95, 0.06, 0.06), handrailSteelMat);
    landingRail.position.set(6.0, -1.05, 1.85);
    this.group.add(landingRail);

    // --- FLIGHT 2: Returns forward in lane X = 5.35 (y: -1.90 -> -4.00) ---
    const lane2X = 5.35;
    const flight2Group = new THREE.Group();
    flight2Group.name = 'basement_stair_flight_2';

    for (let i = 0; i < numSteps; i++) {
      const z = flightZ1 - (i + 0.5) * stepD;
      const y = -1.90 - (i + 0.5) * step2H;

      const tread = new THREE.Mesh(new THREE.BoxGeometry(1.15, step2H, stepD + 0.03), stairSteelMat);
      tread.position.set(lane2X, y, z);
      tread.receiveShadow = true;
      flight2Group.add(tread);

      const nosing = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.025, 0.06), treadNosingMat);
      nosing.position.set(lane2X, y + step2H * 0.5 + 0.012, z - stepD * 0.5);
      flight2Group.add(nosing);
    }

    // Handrails on Flight 2
    for (const sx of [lane2X - 0.62, lane2X + 0.62]) {
      const railLen = Math.hypot(flight2H, flightDepth);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, railLen, 8), handrailSteelMat);
      rail.rotation.x = Math.PI / 2 - Math.atan2(flight2H, flightDepth);
      rail.position.set(sx, -1.90 - flight2H * 0.5 + 0.85, (flightZ0 + flightZ1) / 2);
      flight2Group.add(rail);

      for (let b = 0; b <= 6; b++) {
        const t = b / 6;
        const bz = flightZ1 - t * flightDepth;
        const by = -1.90 - t * flight2H + 0.42;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 6), handrailSteelMat);
        post.position.set(sx, by, bz);
        flight2Group.add(post);
      }
    }
    this.group.add(flight2Group);

    // --- GROUND FLOOR ENTRANCE PORTAL & LIGHTBOX SIGNAGE (Floor 1 at x = 6.65, z = -3.8) ---
    const portalGroup = new THREE.Group();
    portalGroup.name = 'basement_entrance_portal';
    portalGroup.position.set(lane1X, 0.245, flightZ0 - 0.35);

    // Archway portal frame
    const portalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 2.5, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.85, roughness: 0.3 })
    );
    portalFrame.position.set(0, 1.25, 0);

    // Illuminated Lightbox Signboard: "▼ LEVEL B1: RAILWAY OPERATIONS CENTRE"
    const signBox = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.45, 0.12),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
    );
    signBox.position.set(0, 2.65, 0.05);

    // Sign face canvas texture
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 512;
    signCanvas.height = 128;
    const sCtx = signCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#0f172a';
      sCtx.fillRect(0, 0, 512, 128);
      sCtx.strokeStyle = '#0284c7';
      sCtx.lineWidth = 4;
      sCtx.strokeRect(4, 4, 504, 120);

      // Down arrow badge
      sCtx.fillStyle = '#38bdf8';
      sCtx.beginPath();
      sCtx.moveTo(35, 35);
      sCtx.lineTo(65, 35);
      sCtx.lineTo(50, 75);
      sCtx.closePath();
      sCtx.fill();

      sCtx.fillStyle = '#f8fafc';
      sCtx.font = 'bold 26px sans-serif';
      sCtx.fillText('SUB-LEVEL 1', 85, 48);
      sCtx.fillStyle = '#38bdf8';
      sCtx.font = 'bold 20px sans-serif';
      sCtx.fillText('RAILWAY OPERATIONS CENTRE', 85, 82);

      sCtx.fillStyle = '#10b981';
      sCtx.font = '14px monospace';
      sCtx.fillText('● SYSTEM ONLINE · DISPATCH ACTIVE', 85, 108);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.42), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(0, 2.65, 0.12);
    this.materials.push(signMesh.material as THREE.Material);

    portalGroup.add(portalFrame, signBox, signMesh);

    // Safety Balustrade along Ground Floor Stair Opening (protecting the living room)
    const guardrail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.95, 4.4),
      handrailSteelMat
    );
    guardrail.position.set(lane2X - 0.65, 0.245 + 0.48, (flightZ0 + flightZ1) / 2);
    this.group.add(guardrail);

    this.group.add(portalGroup);
  }

  // ==========================================
  // 3. CONTROL DESK & EXACTLY FIVE MONITORS
  // ==========================================
  private buildControlDeskAndMonitors() {
    const deskSurfaceMat = new THREE.MeshStandardMaterial({
      color: 0x181c22,
      metalness: 0.65,
      roughness: 0.35,
    });
    const deskBodyMat = new THREE.MeshStandardMaterial({
      color: 0x232931,
      roughness: 0.7,
      metalness: 0.4,
    });
    const monitorBezelMat = new THREE.MeshStandardMaterial({
      color: 0x090b0e,
      roughness: 0.35,
      metalness: 0.85,
    });
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.9,
      roughness: 0.2,
    });
    this.materials.push(deskSurfaceMat, deskBodyMat, monitorBezelMat, standMat);

    const deskGroup = new THREE.Group();
    deskGroup.name = 'railway_operations_console_desk';
    // Positioned in front of the north wall, facing south towards the room entrance
    deskGroup.position.set(0, -4.0, 1.2);
    deskGroup.rotation.y = Math.PI; // Operator faces North towards monitors and wall

    // 1. Large Ergonomic Console Desk (Curved Front, Width 4.8m)
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.08, 1.35), deskSurfaceMat);
    deskTop.position.set(0, 0.82, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;

    // Angled Side Wings
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), deskSurfaceMat);
    wingL.position.set(-2.55, 0.82, 0.18);
    wingL.rotation.y = 0.28;
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 1.2), deskSurfaceMat);
    wingR.position.set(2.55, 0.82, 0.18);
    wingR.rotation.y = -0.28;

    // Heavy Metal Desk Pedestals & Cable Trays
    for (const px of [-1.8, 1.8]) {
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.95), deskBodyMat);
      pedestal.position.set(px, 0.4, 0);
      deskGroup.add(pedestal);
    }
    deskGroup.add(deskTop, wingL, wingR);

    // Operator Ergonomic High-Back Executive Swivel Armchair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -1.05);

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.12, 0.72),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    seat.position.y = 0.52;

    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.95, 0.14),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    backrest.position.set(0, 0.98, -0.32);
    backrest.rotation.x = -0.08;

    const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.48, 8), standMat);
    chairStem.position.y = 0.24;

    const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 5), standMat);
    chairBase.position.y = 0.02;

    chairGroup.add(seat, backrest, chairStem, chairBase);
    deskGroup.add(chairGroup);

    // Desktop Equipment: Illuminated Keyboard, Intercom, Radio Handset, Dispatch Buttons
    const keyboard = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.03, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.7, roughness: 0.4 })
    );
    keyboard.position.set(0, 0.87, -0.25);

    const trackball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x00d2d3 }));
    trackball.position.set(0.48, 0.88, -0.25);

    // Emergency Interlock Mushroom Button & Master Signal Toggles
    const eStop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.065, 0.06, 12),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    eStop.position.set(-1.1, 0.89, -0.22);

    const radioHandset = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.08, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.8 })
    );
    radioHandset.position.set(1.1, 0.89, -0.22);

    deskGroup.add(keyboard, trackball, eStop, radioHandset);

    // ==========================================
    // THE EXACTLY FIVE MONITORS MOUNTED ON DESK
    // ==========================================
    // Monitor mounting bracket rail
    const mountRail = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 0.08), standMat);
    mountRail.position.set(0, 1.45, 0.42);
    deskGroup.add(mountRail);

    // Helper to create an individual monitor
    const createMonitor = (
      name: string,
      w: number,
      h: number,
      canvasTexture: THREE.CanvasTexture,
      pos: THREE.Vector3,
      rotY: number
    ): THREE.Mesh => {
      const monGroup = new THREE.Group();
      monGroup.name = name;
      monGroup.position.copy(pos);
      monGroup.rotation.y = rotY;

      // Outer monitor bezel chassis
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, h + 0.06, 0.07), monitorBezelMat);
      bezel.castShadow = true;

      // Active screen surface with canvas texture
      const screenMat = new THREE.MeshBasicMaterial({ map: canvasTexture });
      this.materials.push(screenMat);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMat);
      screen.position.z = 0.038;
      this.monitorMeshes.push(screen);

      // Articulated mount stand arm
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), standMat);
      arm.position.set(0, -h * 0.5 - 0.22, -0.08);

      monGroup.add(bezel, screen, arm);
      deskGroup.add(monGroup);
      return screen;
    };

    // 1. CENTRE MONITOR: Large Widescreen - Train Operations Board (6 Slots)
    createMonitor(
      'monitor_centre_operations_board',
      2.55,
      1.25,
      this.centreTexture,
      new THREE.Vector3(0, 1.62, 0.38),
      0
    );

    // 2. LEFT MONITOR 1: Network Route & Track Layout Map
    createMonitor(
      'monitor_left_1_network_map',
      1.35,
      0.82,
      this.left1Texture,
      new THREE.Vector3(-1.95, 1.58, 0.22),
      0.32 // Angled 18 degrees towards centre
    );

    // 3. LEFT MONITOR 2: Signal & Track Interlocking Status
    createMonitor(
      'monitor_left_2_signals_status',
      1.35,
      0.82,
      this.left2Texture,
      new THREE.Vector3(-1.95, 0.88, 0.22),
      0.32
    );

    // 4. RIGHT MONITOR 1: Train Mechanical & Systems Diagnostics
    createMonitor(
      'monitor_right_1_train_diagnostics',
      1.35,
      0.82,
      this.right1Texture,
      new THREE.Vector3(1.95, 1.58, 0.22),
      -0.32 // Angled -18 degrees towards centre
    );

    // 5. RIGHT MONITOR 2: Central Timetable & Platform Board
    createMonitor(
      'monitor_right_2_timetable_platform',
      1.35,
      0.82,
      this.right2Texture,
      new THREE.Vector3(1.95, 0.88, 0.22),
      -0.32
    );

    this.group.add(deskGroup);
  }

  // ==========================================
  // DYNAMIC 2D CANVAS RENDERING FOR 5 MONITORS
  // ==========================================
  public update(delta: number, aiTrainMgr: AITrainManager | null) {
    this.renderTimer += delta;
    this.blinkTimer += delta;

    // Throttle canvas texture re-draws to ~10 FPS for rock-solid performance
    if (this.renderTimer >= 0.1) {
      this.renderTimer = 0;
      const telemetry = aiTrainMgr ? aiTrainMgr.getOperationsTelemetry() : [];
      const stationOps = aiTrainMgr?.getStationOperationsSnapshot?.() ?? null;
      this.renderAllMonitors(telemetry, stationOps);
    }
  }

  private renderAllMonitors(telemetry: RailwayServiceTelemetry[], stationOps: any = null) {
    this.renderCentreOperationsBoard(telemetry);
    this.renderLeft1NetworkMap(telemetry);
    this.renderLeft2SignalsAndStatus(telemetry);
    this.renderRight1Diagnostics(telemetry, stationOps);
    this.renderRight2Timetable(telemetry);
  }

  // Monitor 1: Centre - 6 Train Operations Slots
  private renderCentreOperationsBoard(telemetry: RailwayServiceTelemetry[]) {
    const ctx = this.centreCtx;
    if (!ctx) return;
    const w = 1024;
    const h = 512;

    // Dark sleek tactical dispatch background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Top Header
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 54);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('SANCTUARY METROPOLITAN TRANSIT AUTHORITY — CENTRAL RAILWAY OPERATIONS BOARD', 24, 34);

    const blinkOn = Math.floor(this.blinkTimer * 2) % 2 === 0;
    ctx.fillStyle = blinkOn ? '#10b981' : '#047857';
    ctx.beginPath();
    ctx.arc(w - 180, 28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.font = '14px monospace';
    ctx.fillText('NETWORK: LIVE', w - 160, 33);

    // Table Header Columns
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 54, w, 32);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('SLOT/LINE', 18, 74);
    ctx.fillText('SERVICE / ROUTE', 120, 74);
    ctx.fillText('DIRECTION', 320, 74);
    ctx.fillText('CURRENT / NEXT STATION', 440, 74);
    ctx.fillText('SPEED', 670, 74);
    ctx.fillText('ETA / SCHED', 760, 74);
    ctx.fillText('STATUS / DISPATCH', 880, 74);

    // Exactly Six Service Slots
    const rowH = 68;
    for (let slot = 1; slot <= 6; slot++) {
      const y = 86 + (slot - 1) * rowH;
      const data = telemetry.find((t) => t.slot === slot);

      // Alternating row background
      ctx.fillStyle = slot % 2 === 0 ? '#0f172a' : '#141e33';
      ctx.fillRect(0, y, w, rowH - 2);

      if (data) {
        // Line Badge (F1-F3 Cyan, B1-B3 Amber/Violet)
        const isForward = data.direction === 1;
        ctx.fillStyle = isForward ? '#0284c7' : '#d97706';
        ctx.fillRect(18, y + 14, 76, 26);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(data.trainNumber ? data.trainNumber.replace('Train ', 'T-') : data.line, 24, y + 32);

        // Service ID & Name
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`${data.trainNumber ? `${data.trainNumber} · ` : ''}${data.serviceId} · ${data.serviceName}`, 120, y + 28);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`${data.serviceType} (${data.line})`, 120, y + 48);

        // Direction
        ctx.fillStyle = isForward ? '#38bdf8' : '#fbbf24';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(data.directionLabel, 320, y + 36);

        // Current & Next Station
        ctx.fillStyle = '#f8fafc';
        ctx.font = '13px sans-serif';
        ctx.fillText(`${data.currentStation}`, 440, y + 28);
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText(`→ Next: ${data.nextStation} (${data.distToNextMeters}m)`, 440, y + 48);

        // Speed
        ctx.fillStyle = data.speedKmh > 0 ? '#34d399' : '#fbbf24';
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`${data.speedKmh} km/h`, 670, y + 32);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.fillText(`${data.speedMph} mph`, 670, y + 48);

        // Countdown Stopwatch (< 300s)
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`ARR: ${data.arrivalCountdownText || data.arrival}`, 760, y + 28);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '11px monospace';
        ctx.fillText(`DEP: ${data.departureCountdownText || data.departure}`, 760, y + 46);

        // Status Badge
        let badgeColor = '#10b981';
        let badgeText: string = data.onTimeStatus;
        if (data.holdOrdered) {
          badgeColor = '#ef4444';
          badgeText = 'HELD';
        } else if (data.stationStatus === 'doors_open') {
          badgeColor = '#f59e0b';
          badgeText = 'DWELL';
        }
        ctx.fillStyle = badgeColor;
        ctx.fillRect(880, y + 16, 110, 28);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(badgeText, 892, y + 35);
      } else {
        // Inactive / Unused Slot
        ctx.fillStyle = '#475569';
        ctx.font = '14px monospace';
        ctx.fillText(`[SLOT ${slot} · INACTIVE]`, 24, y + 38);
      }
    }

    // Bottom Status Ribbon
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h - 22, w, 22);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px monospace';
    ctx.fillText('DISPATCH POLICY: AUTOMATIC TRAIN SUPERVISION (ATS) ONLINE · SAFETY INTERLOCK VERIFIED', 20, h - 7);

    this.centreTexture.needsUpdate = true;
  }

  // Monitor 2: Left 1 - Live Network Route Map
  private renderLeft1NetworkMap(telemetry: RailwayServiceTelemetry[]) {
    const ctx = this.left1Ctx;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('LIVE RAILWAY NETWORK TOPOLOGY', 16, 24);

    // Draw 6 Parallel Railway Tracks (F1, F2, F3, B3, B2, B1)
    const trackYStart = 64;
    const trackSpacing = 36;
    const trackLines: Array<{ id: string; dir: number }> = [
      { id: 'F1', dir: 1 },
      { id: 'F2', dir: 1 },
      { id: 'F3', dir: 1 },
      { id: 'B3', dir: -1 },
      { id: 'B2', dir: -1 },
      { id: 'B1', dir: -1 },
    ];

    // Coordinate mapping: map x in [-2400, 2400] to canvas X [60, w - 40]
    const mapX = (worldX: number) => {
      const norm = (worldX + 2400) / 4800;
      return 60 + THREE.MathUtils.clamp(norm, 0, 1) * (w - 100);
    };

    // Draw Track Lines and Station Nodes
    trackLines.forEach((tl, idx) => {
      const ty = trackYStart + idx * trackSpacing;

      // Track Bed
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(60, ty);
      ctx.lineTo(w - 30, ty);
      ctx.stroke();

      // Track Tag
      ctx.fillStyle = tl.dir === 1 ? '#0284c7' : '#d97706';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(tl.id, 16, ty + 4);

      // Station tick marks along the line
      for (let st = -2; st <= 2; st++) {
        const sx = mapX(st * 1200);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(sx - 2, ty - 6, 4, 12);
      }

      // Plot Real Train Position
      const train = telemetry.find((t) => t.line === tl.id);
      if (train) {
        const tx = mapX(train.x);

        // Train blip
        ctx.fillStyle = train.holdOrdered ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fill();

        // Direction arrow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (tl.dir === 1) {
          ctx.moveTo(tx - 3, ty - 3);
          ctx.lineTo(tx + 3, ty);
          ctx.lineTo(tx - 3, ty + 3);
        } else {
          ctx.moveTo(tx + 3, ty - 3);
          ctx.lineTo(tx - 3, ty);
          ctx.lineTo(tx + 3, ty + 3);
        }
        ctx.stroke();

        // Train label
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(train.serviceId, tx - 14, ty - 9);
      }
    });

    // Legend
    ctx.fillStyle = '#475569';
    ctx.font = '10px monospace';
    ctx.fillText('■ STATION NODE · ● LIVE TRAIN (PULSING) · ◄► DIRECTION', 60, h - 14);

    this.left1Texture.needsUpdate = true;
  }

  // Monitor 3: Left 2 - Signals and Track Interlocking
  private renderLeft2SignalsAndStatus(telemetry: RailwayServiceTelemetry[]) {
    const ctx = this.left2Ctx;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SIGNALS & BLOCK INTERLOCKING TELEMETRY', 16, 24);

    // Block Grid
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('LINE / BLOCK OCCUPANCY', 18, 58);
    ctx.fillText('ASPECT', 220, 58);
    ctx.fillText('INTERLOCK STATUS', 340, 58);

    telemetry.slice(0, 6).forEach((t, i) => {
      const y = 72 + i * 36;
      ctx.fillStyle = i % 2 === 0 ? '#111827' : '#1e293b';
      ctx.fillRect(12, y, w - 24, 32);

      // Block ID
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`${t.line}: ${t.blockId}`, 20, y + 21);

      // Signal Light (Red / Yellow / Green)
      const aspectColor = t.signalAspect === 'red' ? '#ef4444' : (t.signalAspect === 'yellow' ? '#f59e0b' : '#10b981');
      ctx.fillStyle = aspectColor;
      ctx.beginPath();
      ctx.arc(245, y + 16, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = aspectColor;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(t.signalAspect.toUpperCase(), 265, y + 21);

      // Interlock safety status
      const interlockSafe = !t.holdOrdered;
      ctx.fillStyle = interlockSafe ? '#34d399' : '#f87171';
      ctx.font = '11px monospace';
      ctx.fillText(interlockSafe ? 'INTERLOCK LOCKED' : 'DISPATCH HOLD', 340, y + 21);
    });

    // Safety Alert Box
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(12, 276, w - 24, 32);
    ctx.strokeStyle = '#4338ca';
    ctx.strokeRect(12, 276, w - 24, 32);
    ctx.fillStyle = '#a5b4fc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('SAFE SEPARATION DISTANCE: 1,200M · FAIL-SAFE PROTOCOL: ACTIVE', 24, 296);

    this.left2Texture.needsUpdate = true;
  }

  // Monitor 4: Right 1 - Mechanical & Telemetry Diagnostics
  private renderRight1Diagnostics(telemetry: RailwayServiceTelemetry[], stationOps: any = null) {
    const ctx = this.right1Ctx;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    ctx.fillStyle = '#0c121e';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('FLEET MECHANICAL TELEMETRY DIAGNOSTICS', 16, 24);

    // Telemetry summary of leading train or Slot 1
    const t = telemetry[0];
    if (t) {
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`PRIMARY MONITORED: ${t.serviceId} · ${t.serviceName}`, 20, 64);

      // Gauge 1: Traction Motor Temperature
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Traction Motor Core Temp:', 20, 94);
      ctx.fillStyle = t.tractionMotorTempC > 80 ? '#ef4444' : '#10b981';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${t.tractionMotorTempC}°C (Optimal: 45-85°C)`, 220, 94);

      // Gauge 2: Pneumatic Air Brake Pressure
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Pneumatic Brake Reservoir:', 20, 126);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${t.brakePressureBar} BAR / 72.5 PSI`, 220, 126);

      // Gauge 3: Catenary Pantograph Voltage
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Pantograph Line Voltage:', 20, 158);
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${t.pantographVoltageKv} kV AC (25 kV Nom)`, 220, 158);

      // Gauge 4: Passenger Door Safety Interlock
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Passenger Door Locks:', 20, 190);
      ctx.fillStyle = t.doorsOpen ? '#fbbf24' : '#10b981';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(t.doorsOpen ? 'PLATFORM DOORS OPEN' : 'ALL DOORS SECURED', 220, 190);

      // Gauge 5: Overall Fleet Condition Index
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('Fleet Health Index:', 20, 222);
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`${t.conditionPct}% NOMINAL`, 220, 222);

      // Live passenger and station AI status, supplied by the same simulation as the trains.
      ctx.fillStyle = '#111827';
      ctx.fillRect(16, 238, w - 32, 66);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('STATION AI / PASSENGER OPERATIONS', 26, 253);
      ctx.fillStyle = '#34d399';
      ctx.font = '11px monospace';
      if (stationOps) {
        ctx.fillText(`PASSENGERS ${stationOps.passengerCount}  PLATFORM ${stationOps.stationPassengers}  ONBOARD ${stationOps.onboardPassengers}`, 26, 270);
        ctx.fillText(`EMPLOYEES ${stationOps.employeeCount}  QUEUES ${stationOps.boardingQueues}  AT PLATFORM ${stationOps.trainsAtPlatforms}`, 26, 286);
        ctx.fillStyle = stationOps.activeIncidents > 0 ? '#f87171' : '#34d399';
        ctx.fillText(stationOps.activeIncidents > 0 ? `ACTIVE INCIDENTS: ${stationOps.activeIncidents}` : 'FACILITIES / CCTV / PA / SIGNALS: ONLINE', 26, 300);
      } else {
        ctx.fillText('STATION AI TELEMETRY NOT AVAILABLE', 26, 280);
      }
    }

    this.right1Texture.needsUpdate = true;
  }

  // Monitor 5: Right 2 - Timetable and Station Board
  private renderRight2Timetable(telemetry: RailwayServiceTelemetry[]) {
    const ctx = this.right2Ctx;
    if (!ctx) return;
    const w = 512;
    const h = 320;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, 36);
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 15px monospace';
    ctx.fillText('SANCTUARY CENTRAL TERMINAL — TIMETABLE', 16, 24);

    // Columns
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 36, w, 24);
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('PLAT', 12, 52);
    ctx.fillText('LINE', 58, 52);
    ctx.fillText('DESTINATION', 115, 52);
    ctx.fillText('SCHED', 290, 52);
    ctx.fillText('STATUS', 380, 52);

    telemetry.slice(0, 6).forEach((t, i) => {
      const y = 62 + i * 38;
      ctx.fillStyle = i % 2 === 0 ? '#111827' : '#1e293b';
      ctx.fillRect(8, y, w - 16, 34);

      // Platform
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`P${i + 1}`, 16, y + 22);

      // Line
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(t.line, 60, y + 22);

      // Next / Destination
      ctx.fillStyle = '#f8fafc';
      ctx.font = '13px sans-serif';
      ctx.fillText(t.nextStation, 115, y + 22);

      // Sched
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.fillText(t.scheduledArrival, 290, y + 22);

      // Status
      const statusColor = t.holdOrdered ? '#ef4444' : (t.stationStatus === 'doors_open' ? '#f59e0b' : '#10b981');
      ctx.fillStyle = statusColor;
      ctx.font = 'bold 12px monospace';
      ctx.fillText(t.holdOrdered ? 'HELD' : (t.stationStatus === 'doors_open' ? 'BOARDING' : 'ON TIME'), 380, y + 22);
    });

    // Bottom scrolling dispatch ticker
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h - 24, w, 24);
    ctx.fillStyle = '#f59e0b';
    ctx.font = '11px monospace';
    ctx.fillText('ANNOUNCEMENT: ALL SIX LINES OPERATING ON SCHEDULE · DWELL: 120S', 16, h - 8);

    this.right2Texture.needsUpdate = true;
  }

  // ==========================================
  // INTERACTION DETECTION
  // ==========================================
  public getInteraction(playerPos: THREE.Vector3): {
    id: 'railwayOperations';
    label: string;
    prompt: string;
  } | null {
    // Control desk is in basement at local (0, -4.0, 1.2) -> world (-26, -4.0, 39.2)
    const deskWorldPos = new THREE.Vector3(this.origin.x + 0, this.origin.y - 4.0, this.origin.z + 1.2);
    const d = playerPos.distanceTo(deskWorldPos);

    // Player must be in the basement (y < -2.0) and near the console desk
    if (d < 3.2 && playerPos.y < -2.0) {
      return {
        id: 'railwayOperations',
        label: 'Basement Railway Operations Console',
        prompt: 'Press [E] to Access Railway Control Centre',
      };
    }
    return null;
  }

  public dispose() {
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
    for (const m of this.materials) {
      m.dispose();
    }
    this.centreTexture.dispose();
    this.left1Texture.dispose();
    this.left2Texture.dispose();
    this.right1Texture.dispose();
    this.right2Texture.dispose();
    this.materials = [];
    this.monitorMeshes = [];
  }
}
