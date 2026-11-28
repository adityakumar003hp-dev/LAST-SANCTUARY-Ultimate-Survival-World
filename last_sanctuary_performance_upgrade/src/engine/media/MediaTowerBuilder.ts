import * as THREE from 'three';
import { getTerrainHeight } from '../Terrain';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { drawSharedBroadcastCanvas } from './SharedBroadcastRenderer';
import type { GlobalMediaManager } from './GlobalMediaManager';
import type { MediaChannelId } from './MediaTypes';
import { getBrushedMetalPBR, getConcretePBR, getMarbleTilePBR, getAsphaltPBR } from '../../utils/proceduralTextures';

export const MEDIA_TOWER_ORIGIN = new THREE.Vector3(66, 0, -28);
export const MEDIA_TOWER_HALF_W = 13.0; // Total X width = 26m (X: 53..79)
export const MEDIA_TOWER_HALF_D = 10.0; // Total Z depth = 20m (Z: -38..-18)
export const MEDIA_TOWER_FLOOR_YS = [0.22, 4.12, 8.02, 11.92] as const; // F1, F2, F3, Roof

export interface MediaInteractiveStation {
  id: string;
  label: string;
  worldPos: THREE.Vector3;
  kind: 'studio_desk' | 'control_room' | 'weather_desk' | 'science_desk' | 'radio_booth' | 'editor_desk' | 'backup_generator' | 'rooftop_uplink' | 'elevator';
  channelId?: MediaChannelId;
}

export class MediaTowerBuilder {
  public readonly group: THREE.Group;
  public readonly origin = MEDIA_TOWER_ORIGIN.clone();
  public readonly interactiveStations: MediaInteractiveStation[] = [];

  // Animated elevator & rooftop satellite dishes
  private elevatorCab!: THREE.Group;
  private elevatorTargetFloor = 0;
  private elevatorCurrentY: number = MEDIA_TOWER_FLOOR_YS[0];
  private satelliteDishes: THREE.Object3D[] = [];
  private beaconMat!: THREE.MeshBasicMaterial;
  private towerLights: THREE.PointLight[] = [];

  // Live studio/control/lobby screens synchronized with GlobalMediaManager
  private screens: Array<{
    channelId: MediaChannelId;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
    compact?: boolean;
  }> = [];

  private screenRefreshTimer = 0;
  private clockTime = 0;

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group();
    this.group.name = 'oakridge_media_tower_hq';
    const baseY = getTerrainHeight(this.origin.x, this.origin.z);
    this.origin.y = Math.max(0, baseY);
    this.group.position.set(this.origin.x, 0, this.origin.z);
    scene.add(this.group);

    this.buildPlazaAndRoadLink();
    this.buildTowerStructure();
    this.buildFloor1ReceptionAndRadio();
    this.buildFloor2StudiosAndControlRoom();
    this.buildFloor3EditorialAndBriefing();
    this.buildRooftopUplinkAndHelipad();
  }

  private buildPlazaAndRoadLink(): void {
    const asphaltPBR = getAsphaltPBR();
    const concretePBR = getConcretePBR(0xb8bec6);

    const roadMat = new THREE.MeshStandardMaterial({
      map: asphaltPBR.albedo,
      normalMap: asphaltPBR.normal,
      roughness: 0.88,
    });
    const plazaMat = new THREE.MeshStandardMaterial({
      map: concretePBR.albedo,
      normalMap: concretePBR.normal,
      roughness: 0.78,
    });

    // East Cross Street connector from X=48 (Town Cross Street end) to Plaza (X=66, Z=0..-16)
    const linkEW = new THREE.Mesh(new THREE.BoxGeometry(20, 0.14, 6.2), roadMat);
    linkEW.position.set(-8, 0.06, 28); // world X=58, Z=0
    linkEW.receiveShadow = true;

    const linkNS = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.14, 24), roadMat);
    linkNS.position.set(-10, 0.06, 16); // world X=56, Z=-12 (links plaza driveway)
    linkNS.receiveShadow = true;

    // Concrete plaza pad under tower & fleet apron
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(34, 0.2, 30), plazaMat);
    plaza.position.set(0, 0.09, 0);
    plaza.receiveShadow = true;

    // Helipad landing circle decal on Roof & Press Plaza Sign
    const signBase = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 2.2, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.65 })
    );
    signBase.position.set(-6.5, 1.2, 12.2);
    const signFace = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 1.4, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x0284c7 })
    );
    signFace.position.set(-6.5, 1.35, 12.5);

    this.group.add(linkEW, linkNS, plaza, signBase, signFace);
  }

  private createScreenPanel(
    w: number,
    h: number,
    channelId: MediaChannelId,
    compact: boolean = false
  ): THREE.Group {
    const holder = new THREE.Group();
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35, metalness: 0.8 })
    );
    const canvas = document.createElement('canvas');
    canvas.width = compact ? 384 : 512;
    canvas.height = compact ? 224 : 288;
    const ctx = canvas.getContext('2d')!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: texture })
    );
    face.position.z = 0.06;
    holder.add(bezel, face);
    this.screens.push({ channelId, canvas, ctx, texture, compact });
    return holder;
  }

  private buildTowerStructure(): void {
    const concretePBR = getConcretePBR(0xe2e8f0);
    const metalPBR = getBrushedMetalPBR(0x1e293b);
    const marblePBR = getMarbleTilePBR(0xdbe2ea);

    const wallMat = new THREE.MeshStandardMaterial({
      map: concretePBR.albedo,
      normalMap: concretePBR.normal,
      roughness: 0.72,
      side: THREE.DoubleSide,
    });
    const darkMetalMat = new THREE.MeshStandardMaterial({
      map: metalPBR.albedo,
      normalMap: metalPBR.normal,
      roughness: 0.35,
      metalness: 0.78,
    });
    const floorMat = new THREE.MeshStandardMaterial({
      map: marblePBR.albedo,
      normalMap: marblePBR.normal,
      roughness: 0.55,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x67b7dc,
      roughness: 0.08,
      metalness: 0.25,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
    });

    const hw = MEDIA_TOWER_HALF_W; // 13
    const hd = MEDIA_TOWER_HALF_D; // 10
    const floorH = 3.9;
    const totalH = 3 * floorH; // 11.7m roof height

    // Floor slabs (F1, F2, F3, Roof) with clean stair void at NE corner (local X in [7.2..12.4], Z in [-8.8..-2.0])
    // and elevator shaft void at (local X in [4.2..6.8], Z in [4.2..6.8])
    for (let f = 0; f < 4; f++) {
      const fy = MEDIA_TOWER_FLOOR_YS[f];
      if (f === 0) {
        const ground = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.24, hd * 2), floorMat);
        ground.position.set(0, fy - 0.12, 0);
        ground.receiveShadow = true;
        this.group.add(ground);
      } else {
        // Main west slab covering X in [-13..7.0]
        const westSlab = new THREE.Mesh(new THREE.BoxGeometry(20.0, 0.22, hd * 2), floorMat);
        westSlab.position.set(-3.0, fy - 0.11, 0);
        westSlab.receiveShadow = true;
        // South-East slab covering X in [7.0..13], Z in [-2.0..10]
        const seSlab = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.22, 12.0), floorMat);
        seSlab.position.set(10.0, fy - 0.11, 4.0);
        seSlab.receiveShadow = true;
        // Narrow North stair landing X in [7.0..13], Z in [-10..-8.2]
        const neLanding = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.22, 1.8), floorMat);
        neLanding.position.set(10.0, fy - 0.11, -9.1);
        this.group.add(westSlab, seSlab, neLanding);
      }
    }

    // Walkable Staircase steps in NE Stairwell (local X in [8.2..12.2], Z from -2.2 down to -8.4)
    const stairStepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.4 });
    for (let f = 0; f < 3; f++) {
      const baseY = MEDIA_TOWER_FLOOR_YS[f];
      const nextY = MEDIA_TOWER_FLOOR_YS[f + 1];
      const steps = 12;
      for (let s = 0; s < steps; s++) {
        const t = (s + 0.5) / steps;
        const step = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.2, 0.56), stairStepMat);
        step.position.set(10.2, baseY + t * (nextY - baseY) - 0.08, -2.3 - t * 6.0);
        this.group.add(step);
      }
    }

    // Perimeter Architectural Curtain Walls (with wide open South Entrance +Z at X in [-2.4..2.4], height 3.4m)
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, totalH, 0.3), wallMat);
    northWall.position.set(0, totalH * 0.5, -hd);
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, totalH, hd * 2), wallMat);
    westWall.position.set(-hw, totalH * 0.5, 0);
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, totalH, hd * 2), wallMat);
    eastWall.position.set(hw, totalH * 0.5, 0);

    // South wall split around main double glass lobby doorway (X in [-2.6..2.6], Y < 3.6)
    const southLeft = new THREE.Mesh(new THREE.BoxGeometry(10.4, totalH, 0.3), wallMat);
    southLeft.position.set(-7.8, totalH * 0.5, hd);
    const southRight = new THREE.Mesh(new THREE.BoxGeometry(10.4, totalH, 0.3), wallMat);
    southRight.position.set(7.8, totalH * 0.5, hd);
    const southHeader = new THREE.Mesh(new THREE.BoxGeometry(5.2, totalH - 3.6, 0.3), wallMat);
    southHeader.position.set(0, 3.6 + (totalH - 3.6) * 0.5, hd);

    // Architectural Glass Strips & Exterior Media Tower Sign Band
    const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2 - 1, 2.2), glassMat);
    glassFront.position.set(0, 6.0, hd + 0.17);
    const glassFront3 = glassFront.clone();
    glassFront3.position.y = 9.9;

    const marquee = new THREE.Mesh(new THREE.BoxGeometry(11.0, 0.9, 0.25), darkMetalMat);
    marquee.position.set(0, 4.15, hd + 0.35);
    const marqueeGlow = new THREE.Mesh(
      new THREE.BoxGeometry(10.6, 0.5, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x0ea5e9 })
    );
    marqueeGlow.position.set(0, 4.15, hd + 0.49);

    // Entrance Canopy
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.25, 3.2), darkMetalMat);
    canopy.position.set(0, 3.65, hd + 1.6);

    // Roof safety parapet
    const parapetN = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 1.0, 0.25), darkMetalMat);
    parapetN.position.set(0, MEDIA_TOWER_FLOOR_YS[3] + 0.5, -hd);
    const parapetS = parapetN.clone();
    parapetS.position.z = hd;
    const parapetW = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.0, hd * 2), darkMetalMat);
    parapetW.position.set(-hw, MEDIA_TOWER_FLOOR_YS[3] + 0.5, 0);
    const parapetE = parapetW.clone();
    parapetE.position.x = hw;

    this.group.add(
      northWall, westWall, eastWall,
      southLeft, southRight, southHeader,
      glassFront, glassFront3, marquee, marqueeGlow, canopy,
      parapetN, parapetS, parapetW, parapetE
    );

    // Passenger Elevator Cab & Guide Rails (local X = 5.5, Z = 5.5)
    const guideRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, totalH + 1.0, 0.2),
      darkMetalMat
    );
    guideRail.position.set(6.7, totalH * 0.5, 5.5);
    this.group.add(guideRail);

    this.elevatorCab = new THREE.Group();
    this.elevatorCab.name = 'media_tower_elevator';
    const cabFloor = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), darkMetalMat);
    const cabBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.6, 0.1), glassMat);
    cabBack.position.set(0, 1.3, 1.15);
    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 2.4), darkMetalMat);
    cabRoof.position.y = 2.65;
    this.elevatorCab.add(cabFloor, cabBack, cabRoof);
    this.elevatorCab.position.set(5.5, MEDIA_TOWER_FLOOR_YS[0], 5.5);
    this.group.add(this.elevatorCab);

    this.interactiveStations.push({
      id: 'media_elevator',
      label: 'Media Tower Elevator (Cycle F1 / F2 / F3 / Roof)',
      worldPos: new THREE.Vector3(this.origin.x + 5.5, MEDIA_TOWER_FLOOR_YS[0], this.origin.z + 5.5),
      kind: 'elevator',
    });

    // Budgeted Interior Point Lights (3 lights total)
    for (const [lx, ly, lz] of [[0, 3.6, 0], [-2, 7.5, -1], [0, 11.4, -1]]) {
      const pt = new THREE.PointLight(0xeef6ff, 1.5, 26, 1.5);
      pt.position.set(lx, ly, lz);
      this.group.add(pt);
      this.towerLights.push(pt);
    }
  }

  private buildFloor1ReceptionAndRadio(): void {
    const fy = MEDIA_TOWER_FLOOR_YS[0];
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.5 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c5338, roughness: 0.72 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.36,
      roughness: 0.15,
    });

    // Reception & Security Desk
    const receptionDesk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 1.2), deskMat);
    receptionDesk.position.set(0, fy + 0.55, 5.2);
    this.group.add(receptionDesk);

    // Lobby Public Broadcast Display
    const lobbyTv = this.createScreenPanel(3.4, 1.9, 'oakridge_news_24');
    lobbyTv.position.set(0, fy + 2.2, 2.2);
    this.group.add(lobbyTv);

    // Radio Station Booth ("OAKRIDGE RADIO 94.7 FM") at West F1 (X: -8..-2, Z: 1..7)
    const boothGlass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.6, 5.5), glassMat);
    boothGlass.position.set(-2.5, fy + 1.3, 4.0);
    const radioTable = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 1.1), woodMat);
    radioTable.position.set(-5.5, fy + 0.42, 4.0);
    const mixer = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.18, 0.65),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0xf59e0b, emissiveIntensity: 0.35 })
    );
    mixer.position.set(-5.5, fy + 0.94, 4.0);
    const radioScreen = this.createScreenPanel(1.8, 1.0, 'oakridge_radio', true);
    radioScreen.position.set(-5.5, fy + 1.8, 1.6);
    this.group.add(boothGlass, radioTable, mixer, radioScreen);

    this.interactiveStations.push({
      id: 'f1_radio_booth',
      label: 'Oakridge Radio 94.7 FM Live Console',
      worldPos: new THREE.Vector3(this.origin.x - 5.5, fy, this.origin.z + 4.0),
      kind: 'radio_booth',
      channelId: 'oakridge_radio',
    });

    // Equipment Storage Racks & Backup Generator (NW F1)
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.7, roughness: 0.4 });
    const equipRack = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.2, 1.0), rackMat);
    equipRack.position.set(-8.0, fy + 1.1, -6.5);
    const generatorBox = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 1.8, 1.8),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55, metalness: 0.45 })
    );
    generatorBox.position.set(1.5, fy + 0.9, -6.8);
    this.group.add(equipRack, generatorBox);

    this.interactiveStations.push({
      id: 'f1_backup_generator',
      label: 'Toggle Media Tower Backup Diesel Generator',
      worldPos: new THREE.Vector3(this.origin.x + 1.5, fy, this.origin.z - 6.8),
      kind: 'backup_generator',
    });
  }

  private buildFloor2StudiosAndControlRoom(): void {
    const fy = MEDIA_TOWER_FLOOR_YS[1];
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.4, metalness: 0.6 });
    const camMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.75 });
    const sciMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.45, metalness: 0.4 });

    // Studio A: Oakridge News 24 Presentation Set (West-North F2)
    const studioStage = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 0.18, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 })
    );
    studioStage.position.set(-6.5, fy + 0.09, -4.5);
    const anchorDesk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.95, 1.0), deskMat);
    anchorDesk.position.set(-6.5, fy + 0.65, -4.2);

    // 2 Studio Cameras on pedestals pointing at anchor desk
    for (const cx of [-8.2, -4.8]) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 1.35, 8), camMat);
      ped.position.set(cx, fy + 0.7, -1.6);
      const camHead = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.65), camMat);
      camHead.position.set(cx, fy + 1.48, -1.6);
      this.group.add(ped, camHead);
    }

    const newsBackdrop = this.createScreenPanel(4.6, 2.3, 'oakridge_news_24');
    newsBackdrop.position.set(-6.5, fy + 2.05, -7.2);
    this.group.add(studioStage, anchorDesk, newsBackdrop);

    this.interactiveStations.push({
      id: 'f2_studio_a',
      label: 'Oakridge News 24 Studio A Anchor Desk',
      worldPos: new THREE.Vector3(this.origin.x - 6.5, fy, this.origin.z - 4.2),
      kind: 'studio_desk',
      channelId: 'oakridge_news_24',
    });

    // Studio B: Weather Studio (Center-North F2)
    const weatherScreen = this.createScreenPanel(3.4, 2.0, 'oakridge_weather', true);
    weatherScreen.position.set(1.2, fy + 1.85, -7.2);
    const weatherDesk = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.85, 0.9), deskMat);
    weatherDesk.position.set(1.2, fy + 0.42, -5.0);
    this.group.add(weatherScreen, weatherDesk);

    this.interactiveStations.push({
      id: 'f2_weather_studio',
      label: 'Oakridge Weather Studio Doppler Desk',
      worldPos: new THREE.Vector3(this.origin.x + 1.2, fy, this.origin.z - 5.0),
      kind: 'weather_desk',
      channelId: 'oakridge_weather',
    });

    // Studio C: Discovery Science Studio (East-Center F2)
    const sciDesk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 1.0), sciMat);
    sciDesk.position.set(2.5, fy + 0.45, -0.5);
    const sciScreen = this.createScreenPanel(2.8, 1.6, 'discovery_science', true);
    sciScreen.rotation.y = -Math.PI / 2;
    sciScreen.position.set(5.4, fy + 1.75, -0.5);
    this.group.add(sciDesk, sciScreen);

    this.interactiveStations.push({
      id: 'f2_science_studio',
      label: 'Discovery Science Broadcast Terminal',
      worldPos: new THREE.Vector3(this.origin.x + 2.5, fy, this.origin.z - 0.5),
      kind: 'science_desk',
      channelId: 'discovery_science',
    });

    // Master Broadcast Control Room & Editing Desks (South-West F2)
    const ctrlConsole = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.95, 1.1), camMat);
    ctrlConsole.position.set(-4.5, fy + 0.48, 5.2);
    const ctrlWall1 = this.createScreenPanel(2.6, 1.45, 'worldwatch_intl', true);
    ctrlWall1.position.set(-6.0, fy + 2.0, 6.8);
    ctrlWall1.rotation.y = Math.PI;
    const ctrlWall2 = this.createScreenPanel(2.6, 1.45, 'oakridge_local', true);
    ctrlWall2.position.set(-3.0, fy + 2.0, 6.8);
    ctrlWall2.rotation.y = Math.PI;
    this.group.add(ctrlConsole, ctrlWall1, ctrlWall2);

    this.interactiveStations.push({
      id: 'f2_control_room',
      label: 'Master Broadcast Control Console (6-Channel Switcher)',
      worldPos: new THREE.Vector3(this.origin.x - 4.5, fy, this.origin.z + 5.2),
      kind: 'control_room',
    });
  }

  private buildFloor3EditorialAndBriefing(): void {
    const fy = MEDIA_TOWER_FLOOR_YS[2];
    const confMat = new THREE.MeshStandardMaterial({ color: 0x5c402c, roughness: 0.6 });
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });

    // Conference & Press Briefing Table
    const confTable = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.8, 2.2), confMat);
    confTable.position.set(-4.0, fy + 0.4, -2.5);
    for (let i = -2; i <= 2; i++) {
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.55), chairMat);
      c1.position.set(-4.0 + i * 1.15, fy + 0.45, -4.1);
      const c2 = c1.clone();
      c2.position.z = -0.9;
      this.group.add(c1, c2);
    }

    // International WorldWatch Verification Desk + Wall Screen
    const intlScreen = this.createScreenPanel(4.2, 2.1, 'worldwatch_intl');
    intlScreen.position.set(-4.0, fy + 2.0, -7.2);
    const editorDesk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.85, 1.0), confMat);
    editorDesk.position.set(1.5, fy + 0.42, 4.2);
    this.group.add(confTable, intlScreen, editorDesk);

    this.interactiveStations.push({
      id: 'f3_editorial_desk',
      label: 'Global Editorial & Archive Verification Terminal',
      worldPos: new THREE.Vector3(this.origin.x + 1.5, fy, this.origin.z + 4.2),
      kind: 'editor_desk',
      channelId: 'worldwatch_intl',
    });
  }

  private buildRooftopUplinkAndHelipad(): void {
    const fy = MEDIA_TOWER_FLOOR_YS[3];
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.35 });
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.4, roughness: 0.4 });

    // Painted Helipad Circle for SkyEye 24 News Helicopter
    const padRing = new THREE.Mesh(
      new THREE.RingGeometry(3.4, 3.85, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    padRing.rotation.x = -Math.PI / 2;
    padRing.position.set(-2.5, fy + 0.03, 1.0);
    const padHBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.04, 2.8), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    padHBar1.position.set(-3.3, fy + 0.03, 1.0);
    const padHBar2 = padHBar1.clone();
    padHBar2.position.x = -1.7;
    const padHCross = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 0.45), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    padHCross.position.set(-2.5, fy + 0.03, 1.0);
    this.group.add(padRing, padHBar1, padHBar2, padHCross);

    // Tall Transmission Antenna Tower (NW Roof Corner)
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.48, 12.0, 8), metalMat);
    mast.position.set(-10.0, fy + 6.0, -7.2);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), this.beaconMat);
    beacon.position.set(-10.0, fy + 12.2, -7.2);
    this.group.add(mast, beacon);

    // 2 Motorized Satellite Uplink Dishes
    for (const [dx, dz] of [[-5.0, -7.0], [1.5, -7.0]]) {
      const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.4, 1.5, 8), metalMat);
      ped.position.set(dx, fy + 0.75, dz);
      const dishPivot = new THREE.Group();
      dishPivot.position.set(dx, fy + 1.65, dz);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.35, 0.6, 14), dishMat);
      bowl.rotation.x = -Math.PI * 0.35;
      const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.9, 6), metalMat);
      horn.position.set(0, 0.65, -0.4);
      dishPivot.add(bowl, horn);
      this.group.add(ped, dishPivot);
      this.satelliteDishes.push(dishPivot);
    }

    this.interactiveStations.push({
      id: 'roof_uplink',
      label: 'Rooftop Satellite Array & Emergency Transmitter',
      worldPos: new THREE.Vector3(this.origin.x + 1.5, fy, this.origin.z - 6.5),
      kind: 'rooftop_uplink',
    });
  }

  public registerColliders(physMgr: UnifiedPhysicsManager): void {
    const ox = this.origin.x;
    const oz = this.origin.z;
    const hw = MEDIA_TOWER_HALF_W;
    const hd = MEDIA_TOWER_HALF_D;
    const totalH = 11.7;

    // Outer walls with open doorway on south face (X in [-2.6..2.6])
    physMgr.registerBoxCollider('media_wall_n', 'building', [ox, totalH * 0.5, oz - hd], hw * 2, totalH, 0.5);
    physMgr.registerBoxCollider('media_wall_w', 'building', [ox - hw, totalH * 0.5, oz], 0.5, totalH, hd * 2);
    physMgr.registerBoxCollider('media_wall_e', 'building', [ox + hw, totalH * 0.5, oz], 0.5, totalH, hd * 2);
    physMgr.registerBoxCollider('media_wall_sl', 'building', [ox - 7.8, totalH * 0.5, oz + hd], 10.4, totalH, 0.5);
    physMgr.registerBoxCollider('media_wall_sr', 'building', [ox + 7.8, totalH * 0.5, oz + hd], 10.4, totalH, 0.5);
  }

  /**
   * Computes exact walkable floor/stair/elevator elevation for PlayerController.
   */
  public getFloorElevationAt(worldX: number, worldY: number, worldZ: number): number | null {
    const lx = worldX - this.origin.x;
    const lz = worldZ - this.origin.z;
    if (Math.abs(lx) > MEDIA_TOWER_HALF_W + 0.4 || Math.abs(lz) > MEDIA_TOWER_HALF_D + 0.4) {
      return null;
    }

    // 1. Check elevator cab
    if (Math.abs(lx - 5.5) <= 1.25 && Math.abs(lz - 5.5) <= 1.25) {
      if (worldY >= this.elevatorCurrentY - 1.2 && worldY <= this.elevatorCurrentY + 2.4) {
        return this.elevatorCurrentY;
      }
    }

    // 2. Check NE Stairwell (local X in [8.0..12.5], Z in [-8.6..-2.0])
    if (lx >= 8.0 && lx <= 12.5 && lz >= -8.6 && lz <= -2.0) {
      for (let f = 0; f < 3; f++) {
        const bY = MEDIA_TOWER_FLOOR_YS[f];
        const nY = MEDIA_TOWER_FLOOR_YS[f + 1];
        if (worldY >= bY - 0.8 && worldY <= nY + 0.4) {
          const p = THREE.MathUtils.clamp((-2.3 - lz) / 6.0, 0, 1);
          return bY + p * (nY - bY);
        }
      }
    }

    // 3. Solid floor slabs top-down
    for (let f = 3; f >= 0; f--) {
      const fy = MEDIA_TOWER_FLOOR_YS[f];
      if (worldY >= fy - 0.9) {
        return fy;
      }
    }
    return MEDIA_TOWER_FLOOR_YS[0];
  }

  public getElevatorCabWorldY(): number {
    return this.elevatorCurrentY;
  }

  public cycleElevatorFloor(): number {
    this.elevatorTargetFloor = (this.elevatorTargetFloor + 1) % 4;
    return this.elevatorTargetFloor + 1;
  }

  public getNearestStation(playerPos: THREE.Vector3, maxDist: number = 3.1): MediaInteractiveStation | null {
    // Dynamically sync elevator station Y
    const elev = this.interactiveStations.find((s) => s.kind === 'elevator');
    if (elev) elev.worldPos.y = this.elevatorCurrentY;

    let best: MediaInteractiveStation | null = null;
    let bestD = maxDist;
    for (const st of this.interactiveStations) {
      if (Math.abs(playerPos.y - st.worldPos.y) > 2.2) continue;
      const d = Math.hypot(playerPos.x - st.worldPos.x, playerPos.z - st.worldPos.z);
      if (d < bestD) {
        bestD = d;
        best = st;
      }
    }
    return best;
  }

  public update(delta: number, mediaMgr: GlobalMediaManager, powerGridStability: number): void {
    this.clockTime += delta;

    // Smooth elevator motion
    const targetY = MEDIA_TOWER_FLOOR_YS[this.elevatorTargetFloor];
    this.elevatorCurrentY = THREE.MathUtils.damp(this.elevatorCurrentY, targetY, 3.6, delta);
    this.elevatorCab.position.y = this.elevatorCurrentY;

    // Rotate satellite dishes gently & blink rooftop beacon
    for (let i = 0; i < this.satelliteDishes.length; i++) {
      this.satelliteDishes[i].rotation.y = Math.sin(this.clockTime * 0.25 + i) * 0.45;
    }
    if (this.beaconMat) {
      const blink = Math.sin(this.clockTime * 4.2) > 0;
      this.beaconMat.color.setHex(blink ? 0xef4444 : 0x450a0a);
    }

    // Tower lights react to grid stability / backup generator
    const fac = mediaMgr.getFacilities().find((f) => f.id === 'fac_oakridge_tower');
    const lit = fac?.operational ? (fac.backupPowerOn ? 0.9 : Math.max(0.45, powerGridStability)) : 0.12;
    for (const l of this.towerLights) {
      l.intensity = 1.6 * lit;
    }

    // Refresh synchronized studio/control screens at ~2Hz (low overhead)
    this.screenRefreshTimer += delta;
    if (this.screenRefreshTimer >= 0.48) {
      this.screenRefreshTimer = 0;
      for (const scr of this.screens) {
        const feed = mediaMgr.getSharedScreenFeed(scr.channelId);
        drawSharedBroadcastCanvas(scr.ctx, scr.canvas.width, scr.canvas.height, feed, {
          compact: scr.compact,
          timePhase: this.clockTime,
        });
        scr.texture.needsUpdate = true;
      }
    }
  }

  public dispose(): void {
    for (const scr of this.screens) {
      scr.texture.dispose();
    }
    this.screens.length = 0;
    this.group.parent?.remove(this.group);
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose?.();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material?.dispose?.();
      }
    });
  }
}
