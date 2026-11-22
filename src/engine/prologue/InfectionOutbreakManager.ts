import * as THREE from 'three';
import { ZombieManager } from '../ZombieManager';
import { TownLifeManager } from './TownLifeManager';
import { soundEngine } from '../../utils/audio';

export class InfectionOutbreakManager {
  public zombieMgr: ZombieManager;
  public townMgr: TownLifeManager;
  public isOutbreakActive: boolean = false;
  private sirenTimer: number = 0;
  private spawnWaveTimer: number = 0;
  private initialZombiesSpawned: boolean = false;

  constructor(zombieMgr: ZombieManager, townMgr: TownLifeManager) {
    this.zombieMgr = zombieMgr;
    this.townMgr = townMgr;
  }

  public triggerOutbreak(impactPos: THREE.Vector3) {
    this.isOutbreakActive = true;
    this.zombieMgr.isOutbreakActive = true;
    soundEngine.playEmergencySiren();

    // Transform citizens closest to north-east road into early infected
    this.townMgr.citizens.forEach((c) => {
      const d = Math.hypot(c.position[0] - impactPos.x, c.position[2] - impactPos.z);
      if (d < 120 && c.id === 'mechanic_dan') {
        c.infectionStage = 'symptoms';
      }
    });

    // Spawn first wave of zombies: Walker, Runner, Crawler outside town boundary
    if (!this.initialZombiesSpawned) {
      this.initialZombiesSpawned = true;
      // 2 Walkers, 1 Runner, 1 Crawler on northern avenue
      this.zombieMgr.spawnZombie('walker', [6, 0, -38]);
      this.zombieMgr.spawnZombie('runner', [-6, 0, -42]);
      this.zombieMgr.spawnZombie('crawler', [0, 0, -32]);
      this.zombieMgr.spawnZombie('walker', [18, 0, -40]);
    }
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    if (!this.isOutbreakActive) return;

    // Siren repeat
    this.sirenTimer += delta;
    if (this.sirenTimer >= 14.0) {
      this.sirenTimer = 0;
      soundEngine.playEmergencySiren();
    }

    // Controlled trickle of zombies during escape if player is too far ahead
    this.spawnWaveTimer += delta;
    if (this.spawnWaveTimer > 18.0 && this.zombieMgr.zombies.length < 8) {
      this.spawnWaveTimer = 0;
      // Spawn ahead or flanking
      const flankX = playerPos.x + (Math.random() > 0.5 ? 25 : -25);
      const flankZ = playerPos.z + (Math.random() > 0.5 ? 25 : -25);
      this.zombieMgr.spawnZombie('walker', [flankX, 0, flankZ]);
    }
  }
}
