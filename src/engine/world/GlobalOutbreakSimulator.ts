import * as THREE from 'three';
import {
  GlobalOutbreakCitySave,
  GlobalOutbreakSaveData,
} from '../../types/game';
import { REAL_WORLD_CITIES, RealWorldCity } from '../geo/RealWorldCities';
import { RealEarthDataset } from '../geo/RealEarthDataset';
import { WorldCoordinates } from './WorldCoordinates';
import { getTerrainHeight } from '../Terrain';
import { isProtectedSpawnZone } from './ProtectedSpawnZones';
import { RailwayNetworkGenerator } from './RailwayNetworkGenerator';
import { buildRealisticHumanoid } from '../rendering/RealisticHumanoidBuilder';
import type { ZombieManager } from '../ZombieManager';

export type OutbreakDangerLevel = 'Safe' | 'Alert' | 'Containment' | 'Overrun' | 'Critical';

export interface CityOutbreakTelemetry {
  city: RealWorldCity;
  healthyCount: number;
  transformingCount: number;
  infectedCount: number;
  evacuatedCount: number;
  powerGridRatio: number;
  dangerLevel: OutbreakDangerLevel;
}

export interface GlobalOutbreakMetrics {
  apocalypticSeverity: number; // 0..1
  powerGridStability: number; // 0.15..1
  totalHealthy: number;
  totalTransforming: number;
  totalInfected: number;
  totalEvacuated: number;
  overrunCitiesCount: number;
  activeLocalPedestrians: number;
}

type PedestrianRoutine = 'walk' | 'work' | 'sit' | 'seek_shelter' | 'evacuate' | 'panic';

interface RegionalPedestrian {
  id: string;
  name: string;
  role: string;
  continent: string;
  shirtHex: number;
  pantsHex: number;
  skinHex: number;
  hairHex: number;
  position: [number, number, number];
  homePos: [number, number, number];
  yaw: number;
  walkPhase: number;
  routine: PedestrianRoutine;
  routineTimer: number;
  infectionStage: 'healthy' | 'stunned' | 'zombie';
  infectionTimer: number; // Counts down 60 -> 0 seconds while stunned
  cityId: string | null;
  countryName: string;
  cityName: string | null;
  hasGiftedSupply?: boolean;
  infectionRing?: THREE.Mesh | null;
  group: THREE.Group;
  leftArm?: THREE.Object3D | null;
  rightArm?: THREE.Object3D | null;
  leftLeg?: THREE.Object3D | null;
  rightLeg?: THREE.Object3D | null;
  head?: THREE.Object3D | null;
}

const REGIONAL_NAMES: Record<string, string[]> = {
  Asia: ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Kenji', 'Yuki', 'Wei', 'Min-Ji', 'Arjun', 'Kavya'],
  Europe: ['Oliver', 'Clara', 'Lukas', 'Camille', 'Sofia', 'Matteo', 'Freya', 'Henrik'],
  'North America': ['Maya', 'Noah', 'Elena', 'Marcus', 'Jordan', 'Sofia', 'Ethan', 'Aria'],
  'South America': ['Mateus', 'Camila', 'Diego', 'Valentina', 'Lucas', 'Isabela'],
  Africa: ['Amara', 'Kofi', 'Zuri', 'Tariq', 'Nia', 'Youssef'],
  'Australia & Oceania': ['Lachlan', 'Chloe', 'Aroha', 'Liam', 'Ruby'],
  Antarctica: ['Dr. Vance', 'Dr. Sorensen', 'Tech Patel'],
};

const PEDESTRIAN_ROLES = [
  'Commuter',
  'Transit Worker',
  'Nurse',
  'Engineer',
  'Merchant',
  'Courier',
  'Civilian',
  'Technician',
];

const SHIRT_PALETTE = [
  0x3b82f6, 0x10b981, 0xf59e0b, 0x64748b, 0xe11d48, 0x8b5cf6, 0x0ea5e9, 0xd97706, 0x475569,
];
const PANTS_PALETTE = [0x1e293b, 0x27272a, 0x334155, 0x3f3f46, 0x1f2937];
const SKIN_PALETTE = [0xf1c29b, 0xd9a173, 0xb87a4e, 0x8d5524, 0xf4cfb2];
const HAIR_PALETTE = [0x18181b, 0x2b211a, 0x4a3525, 0x7c5832, 0x52525b];

function classifyDanger(infectedRatio: number, transformingRatio: number): OutbreakDangerLevel {
  const weighted = infectedRatio + transformingRatio * 0.6;
  if (weighted >= 0.48) return 'Critical';
  if (weighted >= 0.24) return 'Overrun';
  if (weighted >= 0.08) return 'Containment';
  if (weighted > 0.005) return 'Alert';
  return 'Safe';
}

export class GlobalOutbreakSimulator {
  private scene: THREE.Scene;
  private worldSeed: number;
  private cityStates: Map<string, CityOutbreakTelemetry> = new Map();
  private pedestrians: Map<string, RegionalPedestrian> = new Map();
  private nextPedId = 1;
  private spawnCheckTimer = 0;
  private macroTickTimer = 0;
  private simClock = 0;

  public apocalypticSeverity = 0; // 0 = pre-outbreak/peaceful, 1 = full collapse
  public powerGridStability = 1.0; // 1.0 = normal grid, 0.15 = global blackout

  private maxActivePedestrians = 16;

  constructor(scene: THREE.Scene, worldSeed: number = 42) {
    this.scene = scene;
    this.worldSeed = worldSeed;
    this.initCities();
  }

  public setPopulationBudget(maxCount: number) {
    this.maxActivePedestrians = Math.max(8, Math.min(32, Math.round(maxCount)));
  }

  private initCities() {
    this.cityStates.clear();
    for (const city of REAL_WORLD_CITIES) {
      this.cityStates.set(city.id, {
        city,
        healthyCount: city.population,
        transformingCount: 0,
        infectedCount: 0,
        evacuatedCount: 0,
        powerGridRatio: 1.0,
        dangerLevel: 'Safe',
      });
    }
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isOutbreakActive: boolean,
    dayCount: number,
    isNight: boolean,
    zombieMgr?: ZombieManager
  ) {
    this.simClock += delta;

    // 1. Macro Tier 2/3 global city outbreak progression (~every 1.5s)
    this.macroTickTimer += delta;
    if (this.macroTickTimer >= 1.5) {
      const stepDt = this.macroTickTimer;
      this.macroTickTimer = 0;
      this.stepGlobalCities(stepDt, isOutbreakActive, dayCount, isNight);
    }

    // 2. Tier 1 local pedestrian spawning around player in urban/town/populated Real Earth chunks
    this.spawnCheckTimer += delta;
    if (this.spawnCheckTimer >= 0.85) {
      this.spawnCheckTimer = 0;
      this.maintainRegionalPedestrians(playerPos, isOutbreakActive, isNight);
    }

    // 3. Tick Tier 1 pedestrians (routines, flee/panic, 60s stunned transformation -> Zombie)
    this.updatePedestrians(delta, playerPos, isOutbreakActive, isNight, zombieMgr);
  }

  private stepGlobalCities(
    stepDt: number,
    isOutbreakActive: boolean,
    dayCount: number,
    isNight: boolean
  ) {
    if (!isOutbreakActive) {
      this.apocalypticSeverity = Math.max(0, this.apocalypticSeverity - stepDt * 0.05);
      this.powerGridStability = 1.0;
      return;
    }

    // Gradual worldwide escalation anchored by campaign day & night acceleration
    const nightBoost = isNight ? 1.45 : 1.0;
    const dayScale = Math.min(2.6, 0.35 + Math.max(0, dayCount - 1) * 0.25);

    let totalPop = 0;
    let totalInfected = 0;
    let totalTransforming = 0;
    let gridSum = 0;

    this.cityStates.forEach((st) => {
      const pop = Math.max(1, st.city.population);
      totalPop += pop;

      // Seed patient-zero pockets in major international hubs once outbreak starts
      if (st.infectedCount === 0 && st.transformingCount === 0) {
        const hubFactor =
          st.city.tier === 'megacity' || st.city.hasAirport || st.city.id === 'us_oakridge'
            ? 0.0025
            : 0.0006;
        const seeded = Math.max(1, Math.floor(pop * hubFactor));
        const take = Math.min(st.healthyCount, seeded);
        st.healthyCount -= take;
        st.transformingCount += take;
      }

      // 60-second biological conversion wave across transforming civilians
      const convertNow = Math.min(
        st.transformingCount,
        Math.ceil((st.transformingCount / 60) * stepDt * nightBoost)
      );
      st.transformingCount -= convertNow;
      st.infectedCount += convertNow;

      // Secondary transmission + civil evacuation response
      const activeSpreaders = st.infectedCount;
      const densityFactor = st.city.tier === 'megacity' ? 1.35 : st.city.tier === 'metropolis' ? 1.15 : 0.78;
      const infectionRate = Math.min(0.018, (activeSpreaders / pop) * 0.042 * densityFactor * dayScale * nightBoost);
      const newStunned = Math.min(
        st.healthyCount,
        Math.floor(st.healthyCount * infectionRate * stepDt)
      );
      st.healthyCount -= newStunned;
      st.transformingCount += newStunned;

      // Organized evacuations move healthy civilians toward remote sanctuaries/rural belts
      if (st.infectedCount / pop > 0.04 && st.healthyCount > 0) {
        const evac = Math.min(
          st.healthyCount,
          Math.floor(st.healthyCount * 0.003 * stepDt)
        );
        st.healthyCount -= evac;
        st.evacuatedCount += evac;
      }

      const infRatio = st.infectedCount / pop;
      const transRatio = st.transformingCount / pop;
      st.powerGridRatio = Math.max(0.12, Number((1 - infRatio * 1.15).toFixed(2)));
      st.dangerLevel = classifyDanger(infRatio, transRatio);

      totalInfected += st.infectedCount;
      totalTransforming += st.transformingCount;
      gridSum += st.powerGridRatio;
    });

    const cityCount = Math.max(1, this.cityStates.size);
    const avgGrid = gridSum / cityCount;
    const globalRatio = (totalInfected + totalTransforming * 0.5) / Math.max(1, totalPop);
    // Immediate day-of-outbreak atmospheric shift blended with macro city fall ratio
    const baselineOutbreak = Math.min(1, 0.26 + Math.max(0, dayCount - 1) * 0.1 + globalRatio * 1.45);
    this.apocalypticSeverity = Number(Math.max(0, Math.min(1, baselineOutbreak)).toFixed(3));
    this.powerGridStability = Number(Math.max(0.15, Math.min(1, avgGrid)).toFixed(3));
  }

  private maintainRegionalPedestrians(
    playerPos: THREE.Vector3,
    isOutbreakActive: boolean,
    isNight: boolean
  ) {
    // Despawn far pedestrians cleanly (>105m)
    const maxDistSq = 105 * 105;
    this.pedestrians.forEach((ped, id) => {
      const dx = ped.position[0] - playerPos.x;
      const dz = ped.position[2] - playerPos.z;
      if (dx * dx + dz * dz > maxDistSq) {
        this.removePedestrianMesh(ped);
        this.pedestrians.delete(id);
      }
    });

    if (this.pedestrians.size >= this.maxActivePedestrians) return;

    const geo = WorldCoordinates.worldToLatLon(playerPos.x, playerPos.z);
    const earth = RealEarthDataset.sampleEarthGeography(geo.lat, geo.lon);
    if (!earth.isLand) return;

    const cityHit = REAL_WORLD_CITIES.reduce<{ city: RealWorldCity; distKm: number } | null>((best, c) => {
      const dLat = (geo.lat - c.lat) * 111.32;
      const dLon = (geo.lon - c.lon) * 111.32 * Math.max(0.2, Math.cos((geo.lat * Math.PI) / 180));
      const dKm = Math.hypot(dLat, dLon);
      if (dKm <= Math.max(14, c.footprintRadiusKm * 1.6) && (!best || dKm < best.distKm)) {
        return { city: c, distKm: dKm };
      }
      return best;
    }, null);

    // Keep starter Oakridge town managed by TownLifeManager; spawn regional pedestrians elsewhere in populated zones
    const distFromOrigin = Math.hypot(playerPos.x, playerPos.z);
    if (distFromOrigin < 240) return;

    const targetCount = cityHit
      ? Math.max(5, Math.min(this.maxActivePedestrians, Math.round((1 - Math.min(0.72, this.apocalypticSeverity * 0.65)) * this.maxActivePedestrians)))
      : Math.max(3, Math.round(this.maxActivePedestrians * 0.25));

    if (this.pedestrians.size >= targetCount) return;

    const needed = Math.min(4, targetCount - this.pedestrians.size);
    for (let i = 0; i < needed; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 22 + Math.random() * 52;
      const sx = playerPos.x + Math.cos(angle) * dist;
      const sz = playerPos.z + Math.sin(angle) * dist;
      if (isProtectedSpawnZone(sx, sz) || RailwayNetworkGenerator.isProtectedRailwayZone(sx, sz)) {
        continue;
      }
      const sy = getTerrainHeight(sx, sz, this.worldSeed);
      if (sy < 0.25) continue; // Don't spawn pedestrians underwater

      const spawnGeo = WorldCoordinates.worldToLatLon(sx, sz);
      const spawnSample = RealEarthDataset.sampleEarthGeography(spawnGeo.lat, spawnGeo.lon);
      const continentKey = spawnSample.continent ?? 'North America';
      const names = REGIONAL_NAMES[continentKey] || REGIONAL_NAMES['North America'];

      const idSeed = this.nextPedId++;
      const name = names[(idSeed * 7 + Math.floor(Math.abs(sx))) % names.length];
      const role = !cityHit && continentKey === 'Antarctica'
        ? 'Polar Researcher'
        : !cityHit
          ? (idSeed % 2 === 0 ? 'Local Ranger' : 'Traveler')
          : PEDESTRIAN_ROLES[(idSeed * 3) % PEDESTRIAN_ROLES.length];
      const shirtHex = SHIRT_PALETTE[(idSeed * 5) % SHIRT_PALETTE.length];
      const pantsHex = PANTS_PALETTE[(idSeed * 3) % PANTS_PALETTE.length];
      const skinHex = SKIN_PALETTE[(idSeed * 2) % SKIN_PALETTE.length];
      const hairHex = HAIR_PALETTE[(idSeed * 4) % HAIR_PALETTE.length];

      const rig = buildRealisticHumanoid({
        shirtColor: shirtHex,
        pantsColor: pantsHex,
        skinColor: skinHex,
        hairColor: hairHex,
        hairStyle: idSeed % 5 === 0 ? 'beanie' : idSeed % 3 === 0 ? 'ponytail' : 'short',
        fabricStyle: role === 'Nurse' ? 'uniform' : 'wool',
        hasBackpack: role === 'Courier' || role === 'Traveler' || isOutbreakActive,
        name: `regional_npc_${idSeed}`,
      });
      rig.group.position.set(sx, sy, sz);
      const yaw = Math.random() * Math.PI * 2;
      rig.group.rotation.y = yaw;
      this.scene.add(rig.group);

      const routine: PedestrianRoutine = isOutbreakActive
        ? Math.random() < 0.55
          ? 'evacuate'
          : 'seek_shelter'
        : isNight
          ? 'seek_shelter'
          : Math.random() < 0.4
            ? 'work'
            : 'walk';

      const ped: RegionalPedestrian = {
        id: `reg_npc_${idSeed}`,
        name,
        role,
        continent: continentKey,
        shirtHex,
        pantsHex,
        skinHex,
        hairHex,
        position: [sx, sy, sz],
        homePos: [sx, sy, sz],
        yaw,
        walkPhase: Math.random() * Math.PI * 2,
        routine,
        routineTimer: 3 + Math.random() * 6,
        infectionStage: 'healthy',
        infectionTimer: 60,
        cityId: cityHit?.city.id ?? null,
        countryName: spawnSample.country,
        cityName: cityHit?.city.name ?? null,
        group: rig.group,
        leftArm: rig.leftArm,
        rightArm: rig.rightArm,
        leftLeg: rig.leftLeg,
        rightLeg: rig.rightLeg,
        head: rig.headMesh,
      };
      this.pedestrians.set(ped.id, ped);
    }
  }

  private updatePedestrians(
    delta: number,
    playerPos: THREE.Vector3,
    isOutbreakActive: boolean,
    isNight: boolean,
    zombieMgr?: ZombieManager
  ) {
    const toConvert: RegionalPedestrian[] = [];

    this.pedestrians.forEach((ped) => {
      if (ped.infectionStage === 'zombie') return;

      // 1. 60-second Stunned -> Zombie Transformation Countdown
      if (ped.infectionStage === 'stunned') {
        ped.infectionTimer = Math.max(0, ped.infectionTimer - delta);
        const shiver = Math.sin(this.simClock * 20 + ped.walkPhase) * 0.1;
        ped.group.rotation.x = THREE.MathUtils.damp(ped.group.rotation.x, 0.25, 4, delta);
        ped.group.rotation.z = shiver * 0.85;
        if (ped.infectionRing) {
          ped.infectionRing.rotation.z += delta * 2.5;
          ped.infectionRing.scale.setScalar(0.92 + Math.sin(this.simClock * 8) * 0.12);
        }
        if (ped.leftArm && ped.rightArm) {
          ped.leftArm.rotation.x = THREE.MathUtils.damp(ped.leftArm.rotation.x, -0.55 + shiver, 6, delta);
          ped.rightArm.rotation.x = THREE.MathUtils.damp(ped.rightArm.rotation.x, -0.55 - shiver, 6, delta);
        }
        if (ped.head) {
          ped.head.rotation.x = 0.32;
          ped.head.rotation.y = shiver * 1.4;
        }
        if (ped.infectionTimer <= 0) {
          toConvert.push(ped);
        }
        return;
      }

      // 2. React to nearby zombies dynamically (panic / flee)
      let nearestThreatDistSq = 28 * 28;
      let threatX = 0;
      let threatZ = 0;
      let hasThreat = false;

      if (zombieMgr && zombieMgr.zombies.length > 0) {
        for (let i = 0; i < zombieMgr.zombies.length; i++) {
          const z = zombieMgr.zombies[i];
          if (z.state === 'dead') continue;
          const dx = ped.position[0] - z.position[0];
          const dz = ped.position[2] - z.position[2];
          const dSq = dx * dx + dz * dz;
          if (dSq < nearestThreatDistSq) {
            nearestThreatDistSq = dSq;
            threatX = z.position[0];
            threatZ = z.position[2];
            hasThreat = true;
          }
        }
      }

      if (hasThreat) {
        ped.routine = 'panic';
        ped.routineTimer = 4.0;
        ped.yaw = Math.atan2(ped.position[0] - threatX, ped.position[2] - threatZ);
      } else {
        ped.routineTimer -= delta;
        if (ped.routineTimer <= 0) {
          ped.routineTimer = 3.5 + Math.random() * 5.5;
          if (isOutbreakActive) {
            ped.routine = Math.random() < 0.5 ? 'evacuate' : 'seek_shelter';
          } else if (isNight) {
            ped.routine = 'seek_shelter';
          } else {
            ped.routine = Math.random() < 0.25 ? 'work' : 'walk';
          }
          ped.yaw += (Math.random() - 0.5) * 1.9;
        }
      }

      const speed =
        ped.routine === 'panic'
          ? 4.7
          : ped.routine === 'evacuate' || ped.routine === 'seek_shelter'
            ? 2.8
            : ped.routine === 'work' || ped.routine === 'sit'
              ? 0.0
              : 1.55;

      if (speed > 0.05) {
        const nextX = ped.position[0] + Math.sin(ped.yaw) * speed * delta;
        const nextZ = ped.position[2] + Math.cos(ped.yaw) * speed * delta;
        const nextY = getTerrainHeight(nextX, nextZ, this.worldSeed);
        if (nextY >= 0.2) {
          ped.position[0] = nextX;
          ped.position[1] = nextY;
          ped.position[2] = nextZ;
        } else {
          ped.yaw += Math.PI * 0.65;
        }
      }

      ped.group.position.set(ped.position[0], ped.position[1], ped.position[2]);
      ped.group.rotation.y = ped.yaw + Math.PI; // RealisticHumanoidBuilder faces -Z
      ped.group.rotation.x = THREE.MathUtils.damp(ped.group.rotation.x, 0, 6, delta);
      ped.group.rotation.z = THREE.MathUtils.damp(ped.group.rotation.z, 0, 6, delta);

      const distToPlayerSq =
        (ped.position[0] - playerPos.x) ** 2 + (ped.position[2] - playerPos.z) ** 2;
      if (distToPlayerSq < 82 * 82) {
        if (speed > 0.05) {
          ped.walkPhase += delta * (speed * 3.1);
          const swing = Math.sin(ped.walkPhase);
          if (ped.leftLeg) ped.leftLeg.rotation.x = swing * 0.52;
          if (ped.rightLeg) ped.rightLeg.rotation.x = -swing * 0.52;
          if (ped.leftArm) ped.leftArm.rotation.x = ped.routine === 'panic' ? -2.0 + swing * 0.25 : -swing * 0.42;
          if (ped.rightArm) ped.rightArm.rotation.x = ped.routine === 'panic' ? -2.0 - swing * 0.25 : swing * 0.42;
        } else {
          const idle = Math.sin(this.simClock * 1.9 + ped.walkPhase) * 0.08;
          if (ped.leftLeg) ped.leftLeg.rotation.x = THREE.MathUtils.damp(ped.leftLeg.rotation.x, 0, 6, delta);
          if (ped.rightLeg) ped.rightLeg.rotation.x = THREE.MathUtils.damp(ped.rightLeg.rotation.x, 0, 6, delta);
          if (ped.leftArm) ped.leftArm.rotation.x = idle;
          if (ped.rightArm) ped.rightArm.rotation.x = -idle;
        }
      }
    });

    // Execute finished 60s transformations -> ZombieManager
    for (const ped of toConvert) {
      this.convertPedestrianToZombie(ped, zombieMgr);
    }
  }

  public infectPedestrian(pedestrianId: string): boolean {
    const ped = this.pedestrians.get(pedestrianId);
    if (!ped || ped.infectionStage !== 'healthy') return false;
    ped.infectionStage = 'stunned';
    ped.infectionTimer = 60.0;
    ped.routine = 'panic';

    if (!ped.infectionRing) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.42, 16),
        new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 2.05, 0);
      ped.group.add(ring);
      ped.infectionRing = ring;
    }

    if (ped.cityId) {
      const cityState = this.cityStates.get(ped.cityId);
      if (cityState && cityState.healthyCount > 0) {
        cityState.healthyCount -= 1;
        cityState.transformingCount += 1;
      }
    }
    return true;
  }

  public getNearestInteractivePedestrian(
    playerPos: THREE.Vector3,
    maxRange: number = 3.4
  ): { id: string; name: string; role: string; infectionStage: 'healthy' | 'stunned' | 'zombie'; infectionTimer: number } | null {
    let best: RegionalPedestrian | null = null;
    let bestDistSq = maxRange * maxRange;
    this.pedestrians.forEach((ped) => {
      if (ped.infectionStage === 'zombie') return;
      const dx = ped.position[0] - playerPos.x;
      const dz = ped.position[2] - playerPos.z;
      const dSq = dx * dx + dz * dz;
      if (dSq <= bestDistSq && Math.abs(ped.position[1] - playerPos.y) < 3.2) {
        bestDistSq = dSq;
        best = ped;
      }
    });
    if (!best) return null;
    const found = best as RegionalPedestrian;
    return {
      id: found.id,
      name: found.name,
      role: found.role,
      infectionStage: found.infectionStage,
      infectionTimer: found.infectionTimer,
    };
  }

  public interactWithPedestrian(
    pedestrianId: string,
    isOutbreakActive: boolean
  ): { speaker: string; role: string; text: string; giftItem?: { id: string; qty: number } } | null {
    const ped = this.pedestrians.get(pedestrianId);
    if (!ped) return null;

    if (ped.infectionStage === 'stunned') {
      return {
        speaker: ped.name,
        role: `${ped.role} · CRITICAL`,
        text: `Bite exposure! Turning in ${Math.ceil(ped.infectionTimer)}s — clear the area!`,
      };
    }

    const place = ped.cityName ? `${ped.cityName}, ${ped.countryName}` : ped.countryName;
    const cityTelemetry = ped.cityId ? this.cityStates.get(ped.cityId) : undefined;
    let text = `Greetings from ${place}. Roads are clear for now—stay sharp out there.`;
    let giftItem: { id: string; qty: number } | undefined;

    if (isOutbreakActive) {
      const danger = cityTelemetry?.dangerLevel ?? 'Alert';
      text = `Outbreak status in ${place}: ${danger}! Grid is at ${Math.round((cityTelemetry?.powerGridRatio ?? this.powerGridStability) * 100)}%. Check local clinics and rail hubs for supplies!`;
      if (!ped.hasGiftedSupply && Math.random() < 0.45) {
        ped.hasGiftedSupply = true;
        giftItem = ped.role === 'Nurse'
          ? { id: 'medical_bandage', qty: 1 }
          : { id: 'clean_water', qty: 1 };
      }
    } else if (ped.role === 'Transit Worker') {
      text = `${place} transit lines are running normally. Watch the station departures if trouble hits.`;
    } else if (ped.role === 'Nurse') {
      text = `Medical supplies are stocked inside the local clinics if you ever need bandages or rest.`;
    }

    return {
      speaker: ped.name,
      role: ped.role,
      text,
      giftItem,
    };
  }

  private convertPedestrianToZombie(ped: RegionalPedestrian, zombieMgr?: ZombieManager) {
    ped.infectionStage = 'zombie';
    if (ped.cityId) {
      const cityState = this.cityStates.get(ped.cityId);
      if (cityState) {
        if (cityState.transformingCount > 0) cityState.transformingCount -= 1;
        cityState.infectedCount += 1;
      }
    }

    if (zombieMgr && zombieMgr.isOutbreakActive) {
      const spawned = zombieMgr.spawnZombie(
        Math.random() < 0.22 ? 'runner' : 'walker',
        [ped.position[0], ped.position[1], ped.position[2]],
        true,
        {
          name: ped.name,
          role: ped.role,
          clothHex: ped.shirtHex,
          pantsHex: ped.pantsHex,
        }
      );
      if (spawned) spawned.state = 'chase';
    }

    this.removePedestrianMesh(ped);
    this.pedestrians.delete(ped.id);
  }

  /** Trigger flee/panic routines when gunshots, explosions, or alarms fire nearby. */
  public alertNearSound(origin: THREE.Vector3, radiusMeters: number = 48) {
    const rSq = radiusMeters * radiusMeters;
    this.pedestrians.forEach((ped) => {
      if (ped.infectionStage !== 'healthy') return;
      const dx = ped.position[0] - origin.x;
      const dz = ped.position[2] - origin.z;
      if (dx * dx + dz * dz <= rSq) {
        ped.routine = 'panic';
        ped.routineTimer = 5.5;
        ped.yaw = Math.atan2(dx, dz);
      }
    });
  }

  public getLivingTargets(): Array<{ id: string; kind: 'regional_npc'; position: [number, number, number] }> {
    const out: Array<{ id: string; kind: 'regional_npc'; position: [number, number, number] }> = [];
    this.pedestrians.forEach((ped) => {
      if (ped.infectionStage === 'healthy') {
        out.push({ id: ped.id, kind: 'regional_npc', position: ped.position });
      }
    });
    return out;
  }

  public getCityStates(): CityOutbreakTelemetry[] {
    return Array.from(this.cityStates.values());
  }

  public getGlobalMetrics(): GlobalOutbreakMetrics {
    let totalHealthy = 0;
    let totalTransforming = 0;
    let totalInfected = 0;
    let totalEvacuated = 0;
    let overrunCitiesCount = 0;

    this.cityStates.forEach((st) => {
      totalHealthy += st.healthyCount;
      totalTransforming += st.transformingCount;
      totalInfected += st.infectedCount;
      totalEvacuated += st.evacuatedCount;
      if (st.dangerLevel === 'Overrun' || st.dangerLevel === 'Critical') {
        overrunCitiesCount++;
      }
    });

    return {
      apocalypticSeverity: this.apocalypticSeverity,
      powerGridStability: this.powerGridStability,
      totalHealthy,
      totalTransforming,
      totalInfected,
      totalEvacuated,
      overrunCitiesCount,
      activeLocalPedestrians: this.pedestrians.size,
    };
  }

  public exportSaveData(): GlobalOutbreakSaveData {
    const cityStates: GlobalOutbreakCitySave[] = [];
    let totalGlobalInfected = 0;
    let totalGlobalTransforming = 0;
    let totalGlobalEvacuated = 0;

    this.cityStates.forEach((st) => {
      totalGlobalInfected += st.infectedCount;
      totalGlobalTransforming += st.transformingCount;
      totalGlobalEvacuated += st.evacuatedCount;
      cityStates.push({
        cityId: st.city.id,
        healthyCount: st.healthyCount,
        transformingCount: st.transformingCount,
        infectedCount: st.infectedCount,
        evacuatedCount: st.evacuatedCount,
        powerGridRatio: st.powerGridRatio,
      });
    });

    return {
      apocalypticSeverity: this.apocalypticSeverity,
      powerGridStability: this.powerGridStability,
      totalGlobalInfected,
      totalGlobalTransforming,
      totalGlobalEvacuated,
      cityStates,
    };
  }

  public importSaveData(data?: GlobalOutbreakSaveData) {
    if (!data) return;
    if (typeof data.apocalypticSeverity === 'number') {
      this.apocalypticSeverity = Math.max(0, Math.min(1, data.apocalypticSeverity));
    }
    if (typeof data.powerGridStability === 'number') {
      this.powerGridStability = Math.max(0.15, Math.min(1, data.powerGridStability));
    }
    if (Array.isArray(data.cityStates)) {
      for (const saved of data.cityStates) {
        const entry = this.cityStates.get(saved.cityId);
        if (!entry) continue;
        const pop = Math.max(1, entry.city.population);
        entry.healthyCount = Math.max(0, saved.healthyCount);
        entry.transformingCount = Math.max(0, saved.transformingCount);
        entry.infectedCount = Math.max(0, saved.infectedCount);
        entry.evacuatedCount = Math.max(0, saved.evacuatedCount);
        entry.powerGridRatio = Math.max(0.12, Math.min(1, saved.powerGridRatio));
        entry.dangerLevel = classifyDanger(
          entry.infectedCount / pop,
          entry.transformingCount / pop
        );
      }
    }
  }

  public clearLocalPedestrians() {
    this.pedestrians.forEach((ped) => this.removePedestrianMesh(ped));
    this.pedestrians.clear();
  }

  private removePedestrianMesh(ped: RegionalPedestrian) {
    this.scene.remove(ped.group);
    ped.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose?.();
      }
    });
  }

  public dispose() {
    this.clearLocalPedestrians();
    this.cityStates.clear();
  }
}
