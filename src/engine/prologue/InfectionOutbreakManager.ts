import * as THREE from 'three';
import { ZombieManager } from '../ZombieManager';
import { TownLifeManager } from './TownLifeManager';
import { soundEngine } from '../../utils/audio';

/**
 * Fictional outbreak simulation for the Oakridge prologue town.
 * Contact starts a 60-second stunned conversion phase; converted citizens
 * are replaced by the existing zombie AI entity. No graphic injury effects.
 */
export class InfectionOutbreakManager {
  public zombieMgr: ZombieManager;
  public townMgr: TownLifeManager;
  public isOutbreakActive = false;
  private sirenTimer = 0;
  private spawnWaveTimer = 0;
  private initialZombiesSpawned = false;
  private readonly conversionDuration = 60;
  private readonly contactRadiusSq = 2.2 * 2.2;

  constructor(zombieMgr: ZombieManager, townMgr: TownLifeManager) {
    this.zombieMgr = zombieMgr;
    this.townMgr = townMgr;
  }

  public triggerOutbreak(impactPos: THREE.Vector3) {
    this.isOutbreakActive = true;
    this.zombieMgr.isOutbreakActive = true;
    soundEngine.playEmergencySiren();

    // The first exposed resident becomes the initial carrier. Conversion still
    // uses the same readable 60-second stun window as subsequent infections.
    const seed = this.townMgr.citizens
      .filter((c) => c.infectionStage === 'normal')
      .map((c) => ({ c, d: Math.hypot(c.position[0] - impactPos.x, c.position[2] - impactPos.z) }))
      .sort((a, b) => a.d - b.d)[0];
    if (seed && seed.d < 120) this.beginConversion(seed.c, 'meteorite_exposure');

    if (!this.initialZombiesSpawned) {
      this.initialZombiesSpawned = true;
      this.zombieMgr.spawnZombie('walker', [6, 0, -38]);
      this.zombieMgr.spawnZombie('runner', [-6, 0, -42]);
      this.zombieMgr.spawnZombie('crawler', [0, 0, -32]);
      this.zombieMgr.spawnZombie('walker', [18, 0, -40]);
    }
  }

  public infectCitizen(citizenId: string, sourceId: string): boolean {
    const citizen = this.townMgr.citizens.find((c) => c.id === citizenId);
    if (!citizen || citizen.infectionStage === 'stunned' || citizen.infectionStage === 'zombie') return false;
    this.beginConversion(citizen, sourceId);
    return true;
  }

  private beginConversion(citizen: TownCitizenLike, sourceId: string) {
    if (citizen.infectionStage === 'stunned' || citizen.infectionStage === 'zombie') return;
    citizen.infectionStage = 'stunned';
    citizen.infectionTimer = this.conversionDuration;
    citizen.infectedBy = sourceId;
    citizen.schedule = 'cower';
  }

  private updateCitizenConversions(delta: number) {
    const activeZombies = this.zombieMgr.zombies.filter((z) => z.state !== 'dead');
    for (const citizen of this.townMgr.citizens) {
      if (citizen.infectionStage === 'zombie') continue;

      // Proximity represents a successful fictional bite/contact event.
      // Each resident can only enter the conversion sequence once.
      if (citizen.infectionStage !== 'stunned') {
        for (const zombie of activeZombies) {
          const dx = zombie.position[0] - citizen.position[0];
          const dz = zombie.position[2] - citizen.position[2];
          if (dx * dx + dz * dz <= this.contactRadiusSq) {
            this.beginConversion(citizen, zombie.id);
            break;
          }
        }
      }

      if (citizen.infectionStage === 'stunned') {
        citizen.infectionTimer = Math.max(0, (citizen.infectionTimer ?? this.conversionDuration) - delta);
        if (citizen.infectionTimer <= 0) {
          this.townMgr.convertCitizenToZombie(citizen, this.zombieMgr);
        }
      }
    }
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    if (!this.isOutbreakActive) return;

    this.sirenTimer += delta;
    if (this.sirenTimer >= 14) {
      this.sirenTimer = 0;
      soundEngine.playEmergencySiren();
    }

    this.updateCitizenConversions(delta);

    this.spawnWaveTimer += delta;
    if (this.spawnWaveTimer > 18 && this.zombieMgr.zombies.length < 8) {
      this.spawnWaveTimer = 0;
      const flankX = playerPos.x + (Math.random() > 0.5 ? 25 : -25);
      const flankZ = playerPos.z + (Math.random() > 0.5 ? 25 : -25);
      this.zombieMgr.spawnZombie('walker', [flankX, 0, flankZ]);
    }
  }
}

type TownCitizenLike = {
  id: string;
  position: [number, number, number];
  schedule: string;
  infectionStage?: string;
  infectionTimer?: number;
  infectedBy?: string;
};
