import * as THREE from 'three';
import { SupplyDropState } from '../../types/game';
import { soundEngine } from '../../utils/audio';

export interface ExtractionState {
  active: boolean;
  beaconUid: string | null;
  remainingSeconds: number;
  totalSeconds: number;
  completed: boolean;
}

export class WorldEventsManager {
  private scene: THREE.Scene;
  private getHeight: (x: number, z: number) => number;

  private activeDrop: SupplyDropState | null = null;
  private dropMesh: THREE.Group | null = null;
  private dropChute: THREE.Mesh | null = null;
  private nextDropTimer = 115;

  private bossTimer = 170;
  private extractionState: ExtractionState = {
    active: false,
    beaconUid: null,
    remainingSeconds: 0,
    totalSeconds: 90,
    completed: false,
  };
  private extractionWaveTimer = 0;

  constructor(scene: THREE.Scene, getHeight: (x: number, z: number) => number) {
    this.scene = scene;
    this.getHeight = getHeight;
  }

  public getActiveSupplyDrop(): SupplyDropState | null {
    return this.activeDrop;
  }

  public getExtractionState(): ExtractionState {
    return { ...this.extractionState };
  }

  public spawnSupplyDropNear(playerPos: THREE.Vector3) {
    if (this.activeDrop && !this.activeDrop.looted) return;
    this.clearDropMesh();

    const angle = Math.random() * Math.PI * 2;
    const dist = 55 + Math.random() * 45;
    const x = playerPos.x + Math.cos(angle) * dist;
    const z = playerPos.z + Math.sin(angle) * dist;
    const groundY = this.getHeight(x, z);

    const dropId = `drop_${Date.now()}`;
    this.activeDrop = {
      id: dropId,
      position: [x, groundY, z],
      altitude: 48,
      landed: false,
      looted: false,
      etaSeconds: 12,
    };

    const g = new THREE.Group();
    g.position.set(x, groundY + 48, z);

    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.3, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.65, metalness: 0.35 })
    );
    crate.castShadow = true;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.25, 1.55),
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.5 })
    );

    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0xea580c, side: THREE.DoubleSide, roughness: 0.85 })
    );
    chute.position.y = 3.2;
    this.dropChute = chute;

    const flareBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.5, 22, 8),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.22, depthWrite: false })
    );
    flareBeam.position.y = 11;

    g.add(crate, stripe, chute, flareBeam);
    this.scene.add(g);
    this.dropMesh = g;
    soundEngine.playRadarPing();
  }

  public markSupplyDropLooted(): boolean {
    if (!this.activeDrop || this.activeDrop.looted || !this.activeDrop.landed) return false;
    this.activeDrop.looted = true;
    this.clearDropMesh();
    this.nextDropTimer = 180;
    return true;
  }

  public startExtractionHoldout(beaconUid: string) {
    if (this.extractionState.active || this.extractionState.completed) return;
    this.extractionState = {
      active: true,
      beaconUid,
      remainingSeconds: 90,
      totalSeconds: 90,
      completed: false,
    };
    this.extractionWaveTimer = 1.0;
    soundEngine.playEmergencySiren();
  }

  public resetExtractionState() {
    this.extractionState = {
      active: false,
      beaconUid: null,
      remainingSeconds: 0,
      totalSeconds: 90,
      completed: false,
    };
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    dayCount: number,
    onSpawnAlphaBoss: (pos: THREE.Vector3) => void,
    onSpawnExtractionWave: () => void,
    onExtractionCompleted: () => void
  ) {
    // 1. Supply Drop timer & descent
    if (!this.activeDrop || this.activeDrop.looted) {
      this.nextDropTimer -= delta;
      if (this.nextDropTimer <= 0) {
        this.spawnSupplyDropNear(playerPos);
      }
    } else if (!this.activeDrop.landed && this.dropMesh) {
      this.activeDrop.altitude = Math.max(0, this.activeDrop.altitude - delta * 4.2);
      this.activeDrop.etaSeconds = Math.ceil(this.activeDrop.altitude / 4.2);
      this.dropMesh.position.y = this.activeDrop.position[1] + this.activeDrop.altitude + 0.65;
      this.dropMesh.rotation.y += delta * 0.35;

      if (this.activeDrop.altitude <= 0.05) {
        this.activeDrop.landed = true;
        this.activeDrop.altitude = 0;
        if (this.dropChute) {
          this.dropChute.visible = false;
        }
      }
    }

    // 2. Periodic Alpha Boss Quarantine Encounter
    if (dayCount >= 2) {
      this.bossTimer -= delta;
      if (this.bossTimer <= 0) {
        this.bossTimer = 210 + Math.random() * 90;
        const angle = Math.random() * Math.PI * 2;
        const bx = playerPos.x + Math.cos(angle) * 58;
        const bz = playerPos.z + Math.sin(angle) * 58;
        const by = this.getHeight(bx, bz);
        onSpawnAlphaBoss(new THREE.Vector3(bx, by, bz));
      }
    }

    // 3. Endgame Evacuation Holdout
    if (this.extractionState.active) {
      this.extractionState.remainingSeconds = Math.max(0, this.extractionState.remainingSeconds - delta);
      this.extractionWaveTimer -= delta;
      if (this.extractionWaveTimer <= 0) {
        this.extractionWaveTimer = 14;
        onSpawnExtractionWave();
      }
      if (this.extractionState.remainingSeconds <= 0) {
        this.extractionState.active = false;
        this.extractionState.completed = true;
        soundEngine.playDawnVictoryChime();
        onExtractionCompleted();
      }
    }
  }

  private clearDropMesh() {
    if (!this.dropMesh) return;
    this.scene.remove(this.dropMesh);
    this.dropMesh.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.geometry.dispose();
        if (Array.isArray(m.material)) m.material.forEach((mt) => mt.dispose());
        else m.material.dispose();
      }
    });
    this.dropMesh = null;
    this.dropChute = null;
  }

  public dispose() {
    this.clearDropMesh();
  }
}
