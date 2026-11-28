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
import {
  GlobalPopulationState,
  GlobalPopulationStateSnapshot,
  CitizenAgeGroup,
  assignSafeProfessionForAgeGroup,
  classifyProfessionCategory,
  DAYTIME_CONVERSION_SECONDS,
  NIGHTTIME_CONVERSION_SECONDS,
  CITIZEN_DAILY_GROWTH_MULTIPLIER,
  ZOMBIE_DAILY_GROWTH_MULTIPLIER,
} from './GlobalPopulationState';

export type { CitizenAgeGroup, GlobalPopulationStateSnapshot };

export type OutbreakDangerLevel = 'Safe' | 'Alert' | 'Containment' | 'Overrun' | 'Critical';

export interface CityOutbreakTelemetry {
  city: RealWorldCity;
  healthyCount: number;
  transformingCount: number;
  infectedCount: number;
  evacuatedCount: number;
  populationCount: number;
  dailyZombieTarget?: number;
  dailyGrowthDay?: number;
  powerGridRatio: number;
  dangerLevel: OutbreakDangerLevel;
  lastUpdatedAt?: number;
}

export interface GlobalOutbreakMetrics {
  apocalypticSeverity: number; // 0..1
  powerGridStability: number; // 0.15..1
  totalPopulation: number;
  totalHealthy: number;
  totalTransforming: number;
  totalInfected: number;
  totalEvacuated: number;
  overrunCitiesCount: number;
  activeLocalPedestrians: number;
  citizenDailyMultiplier: number;
  zombieDailyMultiplier: number;
  activeConversionSeconds: number;
}

type PedestrianRoutine = 'walk' | 'work' | 'sit' | 'seek_shelter' | 'evacuate' | 'panic';

interface RegionalPedestrian {
  id: string;
  name: string;
  role: string;
  ageGroup: CitizenAgeGroup;
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
  infectionTimer: number; // 60 seconds by day, 10 seconds at night
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
  'Civilian', 'Other Civilian', 'Shopkeeper', 'Teacher', 'Student', 'Farmer', 'Mechanic',
  'Construction Worker', 'Engineer', 'Office Employee', 'Driver', 'Courier',
  'Nurse', 'Doctor', 'Surgeon', 'Paramedic', 'Hospital Worker',
  'Military Soldier', 'Military Officer', 'Commander', 'Military Doctor', 'Military Engineer',
  'Police Officer', 'Police Inspector', 'Detective', 'Traffic Police', 'Station Police', 'Special Police Unit',
  'Railway Security', 'Prison Warden', 'Prison Guard', 'Security Officer',
  'Firefighter', 'Rescue Personnel', 'Emergency Responder',
  'Train Driver', 'Station Master', 'Railway Police', 'Railway Engineer', 'Station Worker',
  'Local Ranger', 'Traveler', 'Polar Researcher',
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


const CONTINENTAL_ASTEROID_IMPACTS: ReadonlyArray<{ continent: string; cityId: string }> = [
  { continent: 'North America', cityId: 'us_oakridge' },
  { continent: 'South America', cityId: 'br_saopaulo' },
  { continent: 'Europe', cityId: 'gb_london' },
  { continent: 'Africa', cityId: 'eg_cairo' },
  { continent: 'Asia', cityId: 'in_delhi' },
  { continent: 'Australia & Oceania', cityId: 'au_sydney' },
  { continent: 'Antarctica', cityId: 'aq_mcmurdo' },
];

interface ConversionCohort { remainingSeconds: number; count: number; }
interface AsteroidImpactVisual {
  cityId: string;
  group: THREE.Group;
  meteor: THREE.Group;
  start: THREE.Vector3;
  end: THREE.Vector3;
  progress: number;
  landed: boolean;
}

function ageGroupForSeed(seed: number): CitizenAgeGroup {
  const roll = seed % 100;
  if (roll < 12) return 'Child';
  if (roll < 24) return 'Teenager';
  if (roll < 43) return 'Young Adult';
  if (roll < 80) return 'Adult';
  if (roll < 93) return 'Middle-aged Adult';
  return 'Elderly';
}

function ageScale(age: CitizenAgeGroup): number {
  switch (age) {
    case 'Child': return 0.70;
    case 'Teenager': return 0.86;
    case 'Young Adult': return 0.96;
    case 'Middle-aged Adult': return 0.99;
    case 'Elderly': return 0.94;
    default: return 1.0;
  }
}

function professionAppearance(role: string, seed: number) {
  const r = role.toLowerCase();
  if (r.includes('military')) return { shirt: 0x536348, pants: 0x303b2b, fabric: 'tactical' as const, hair: 'beanie' as const, holster: true };
  if (r.includes('nurse') || r.includes('doctor') || r.includes('surgeon') || r.includes('paramedic') || r.includes('medic')) return { shirt: 0xe7edf0, pants: 0x5a9ea8, fabric: 'uniform' as const, hair: 'bun' as const, medic: true };
  if (r.includes('police') || r.includes('warden') || r.includes('guard') || r.includes('security')) return { shirt: 0x24395b, pants: 0x182333, fabric: 'uniform' as const, hair: 'station_master_cap' as const, holster: true };
  if (r.includes('railway') || r.includes('station manager') || r.includes('conductor') || r.includes('train engineer') || r.includes('transit')) return { shirt: 0x344b69, pants: 0x202a38, fabric: 'uniform' as const, hair: 'conductor_cap' as const };
  if (r.includes('firefighter')) return { shirt: 0xd45a24, pants: 0x292b2e, fabric: 'tactical' as const, hair: 'beanie' as const };
  if (r.includes('student') || r.includes('teacher')) return { shirt: 0x4f77a8, pants: 0x343b49, fabric: 'wool' as const, hair: 'short' as const };
  if (r.includes('construction') || r.includes('engineer') || r.includes('mechanic')) return { shirt: 0xc58a2c, pants: 0x343434, fabric: 'denim' as const, hair: 'beanie' as const };
  return { shirt: SHIRT_PALETTE[(seed * 5) % SHIRT_PALETTE.length], pants: PANTS_PALETTE[(seed * 3) % PANTS_PALETTE.length], fabric: 'wool' as const, hair: 'short' as const };
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
  private lastObservedDay = 1;
  private dayElapsedSeconds = 0;
  private dayDurationSeconds = 720;
  private lastTravelSpreadAt = 0;
  private impactSitesInitialized = false;
  private impactedCityIds = new Set<string>();
  private conversionCohorts = new Map<string, ConversionCohort[]>();
  private asteroidVisuals = new Map<string, AsteroidImpactVisual>();

  public readonly populationState: GlobalPopulationState;
  public apocalypticSeverity = 0; // 0 = pre-outbreak/peaceful, 1 = full collapse
  public powerGridStability = 1.0; // 1.0 = normal grid, 0.15 = global blackout

  private maxActivePedestrians = 16;
  private lastIsNight = false;
  private lastOutbreakActive = false;

  constructor(scene: THREE.Scene, worldSeed: number = 42, initialDay: number = 1) {
    this.scene = scene;
    this.worldSeed = worldSeed;
    this.lastObservedDay = Math.max(1, initialDay);
    this.populationState = new GlobalPopulationState(this.lastObservedDay);
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
        populationCount: city.population,
        powerGridRatio: 1.0,
        dangerLevel: 'Safe',
        lastUpdatedAt: 0,
      });
    }
    this.syncPopulationState();
  }

  private syncPopulationState() {
    this.populationState.syncFromCities(
      Array.from(this.cityStates.values()),
      this.simClock,
      this.lastObservedDay,
      this.lastIsNight,
      this.lastOutbreakActive
    );
  }

  public reset(initialDay: number = 1) {
    const safeDay = Math.max(1, initialDay);
    this.clearLocalPedestrians();
    this.disposeAsteroidVisuals();
    this.conversionCohorts.clear();
    this.impactedCityIds.clear();
    this.impactSitesInitialized = false;
    this.apocalypticSeverity = 0;
    this.powerGridStability = 1.0;
    this.simClock = 0;
    this.macroTickTimer = 0;
    this.spawnCheckTimer = 0;
    this.dayElapsedSeconds = 0;
    this.lastTravelSpreadAt = 0;
    this.lastObservedDay = safeDay;
    this.lastIsNight = false;
    this.lastOutbreakActive = false;

    this.cityStates.clear();
    for (const city of REAL_WORLD_CITIES) {
      this.cityStates.set(city.id, {
        city,
        healthyCount: city.population,
        transformingCount: 0,
        infectedCount: 0,
        evacuatedCount: 0,
        populationCount: city.population,
        dailyZombieTarget: 0,
        dailyGrowthDay: safeDay,
        powerGridRatio: 1.0,
        dangerLevel: 'Safe',
        lastUpdatedAt: 0,
      });
    }
    this.populationState.reset(safeDay, true);
  }

  public getPopulationState(): GlobalPopulationStateSnapshot {
    return this.populationState.getSnapshot();
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    isOutbreakActive: boolean,
    dayCount: number,
    isNight: boolean,
    zombieMgr?: ZombieManager,
    dayLengthMultiplier: number = 1.0
  ) {
    this.simClock += delta;
    this.lastIsNight = isNight;
    this.lastOutbreakActive = isOutbreakActive;
    this.dayDurationSeconds = 720 * Math.max(0.25, dayLengthMultiplier || 1.0);
    if (isOutbreakActive) {
      if (dayCount > this.lastObservedDay) {
        for (let day = this.lastObservedDay + 1; day <= dayCount; day++) this.applyDailyGrowth(day);
        this.lastObservedDay = dayCount;
        this.dayElapsedSeconds = 0;
      }
      this.dayElapsedSeconds = Math.min(this.dayDurationSeconds, this.dayElapsedSeconds + delta);
    } else {
      this.dayElapsedSeconds = 0;
    }

    if (isOutbreakActive && !this.impactSitesInitialized) {
      this.initializeContinentalImpacts(dayCount, isNight);
    }
    this.updateAsteroidVisuals(delta);

    // 1. Macro global city outbreak progression (~every 1.5s)
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

    // 3. Tick Tier 1 pedestrians (routines, flee/panic, 60s day / 10s night conversion -> Zombie)
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

    const conversionDuration = isNight ? 10 : 60;
    let totalPop = 0;
    let totalInfected = 0;
    let totalTransforming = 0;
    let gridSum = 0;

    this.cityStates.forEach((st) => {
      const pop = Math.max(1, st.populationCount);
      totalPop += pop;

      // Complete each statistical conversion cohort using the same 60s / 10s
      // timer as nearby rendered citizens. Cohorts keep the duration they began with.
      const cohorts = this.conversionCohorts.get(st.city.id) ?? [];
      let completed = 0;
      const pending: ConversionCohort[] = [];
      for (const cohort of cohorts) {
        cohort.remainingSeconds -= stepDt;
        if (cohort.remainingSeconds <= 0) completed += cohort.count;
        else pending.push(cohort);
      }
      this.conversionCohorts.set(st.city.id, pending);
      if (completed > 0) {
        st.transformingCount = Math.max(0, st.transformingCount - completed);
        st.infectedCount += completed;
      }

      // The 2x daily zombie target is achieved by converting available citizens,
      // never by cloning existing zombies. The target includes active conversions.
      const currentZombiePopulation = st.infectedCount + st.transformingCount;
      const target = Math.min(pop, Math.max(currentZombiePopulation, st.dailyZombieTarget ?? currentZombiePopulation));
      const remainingTarget = Math.max(0, target - currentZombiePopulation);
      const remainingDaySeconds = Math.max(1, this.dayDurationSeconds - this.dayElapsedSeconds);
      const scheduledConversions = remainingTarget > 0
        ? Math.min(st.healthyCount, Math.ceil((remainingTarget * stepDt) / remainingDaySeconds))
        : 0;
      if (scheduledConversions > 0) {
        st.healthyCount -= scheduledConversions;
        st.transformingCount += scheduledConversions;
        pending.push({ remainingSeconds: conversionDuration, count: scheduledConversions });
        this.conversionCohorts.set(st.city.id, pending);
      }

      // Secondary spread between connected cities/transport hubs. This remains
      // population-limited and feeds the same conversion queue.
      const activeSpreaders = st.infectedCount;
      const densityFactor = st.city.tier === 'megacity' ? 1.35 : st.city.tier === 'metropolis' ? 1.15 : 0.78;
      const hubFactor = st.city.hasAirport || st.city.isSeaport ? 1.35 : 1.0;
      const globalPressure = Math.min(0.0015, (totalInfected / Math.max(1, totalPop)) * 0.002);
      const localPressure = (activeSpreaders / pop) * 0.004 * densityFactor;
      const spreadRate = Math.min(0.02, (globalPressure + localPressure) * hubFactor * (isNight ? 1.5 : 1.0));
      const remainingAfterSchedule = Math.max(0, target - (currentZombiePopulation + scheduledConversions));
      const ambientNew = Math.min(remainingAfterSchedule, st.healthyCount, Math.floor(st.healthyCount * spreadRate * stepDt));
      if (ambientNew > 0) {
        st.healthyCount -= ambientNew;
        st.transformingCount += ambientNew;
        pending.push({ remainingSeconds: conversionDuration, count: ambientNew });
        this.conversionCohorts.set(st.city.id, pending);
      }

      // Organized evacuations move healthy civilians toward remote sanctuaries/rural belts.
      if (st.infectedCount / pop > 0.04 && st.healthyCount > 0) {
        const evac = Math.min(st.healthyCount, Math.floor(st.healthyCount * 0.003 * stepDt));
        st.healthyCount -= evac;
        st.evacuatedCount += evac;
      }

      const infRatio = st.infectedCount / pop;
      const transRatio = st.transformingCount / pop;
      st.powerGridRatio = Math.max(0.12, Number((1 - infRatio * 1.15).toFixed(2)));
      st.dangerLevel = classifyDanger(infRatio, transRatio);
      st.lastUpdatedAt = Number(this.simClock.toFixed(1));
      totalInfected += st.infectedCount;
      totalTransforming += st.transformingCount;
      gridSum += st.powerGridRatio;
    });

    // Every 30 real seconds, infection reaches another city through the global
    // transport network, unless all catalogued cities already have an outbreak.
    if (this.simClock - this.lastTravelSpreadAt >= 30 && totalInfected > 0) {
      const next = Array.from(this.cityStates.values())
        .filter((st) => st.infectedCount === 0 && st.transformingCount === 0 && st.healthyCount > 0)
        .sort((a, b) => Number(b.city.hasAirport || b.city.isSeaport) - Number(a.city.hasAirport || a.city.isSeaport))[0];
      if (next) {
        const seed = Math.max(1, Math.min(next.healthyCount, Math.floor(next.populationCount * (next.city.hasAirport ? 0.00002 : 0.000005))));
        next.healthyCount -= seed;
        next.transformingCount += seed;
        next.dailyZombieTarget = Math.min(next.populationCount, seed * 2);
        next.lastUpdatedAt = Number(this.simClock.toFixed(1));
        this.conversionCohorts.set(next.city.id, [...(this.conversionCohorts.get(next.city.id) ?? []), { remainingSeconds: conversionDuration, count: seed }]);
      }
      this.lastTravelSpreadAt = this.simClock;
    }

    const cityCount = Math.max(1, this.cityStates.size);
    const avgGrid = gridSum / cityCount;
    const globalRatio = (totalInfected + totalTransforming * 0.5) / Math.max(1, totalPop);
    const baselineOutbreak = Math.min(1, 0.26 + Math.max(0, dayCount - 1) * 0.1 + globalRatio * 1.45);
    this.apocalypticSeverity = Number(Math.max(0, Math.min(1, baselineOutbreak)).toFixed(3));
    this.powerGridStability = Number(Math.max(0.15, Math.min(1, avgGrid)).toFixed(3));
    this.syncPopulationState();
  }

  private applyDailyGrowth(day: number) {
    let previousGlobalPop = 0;
    let currentZombieGlobal = 0;
    let nextZombieTargetGlobal = 0;

    this.cityStates.forEach((st) => {
      const previousPopulation = Math.max(1, st.populationCount || st.city.population);
      const nextPopulation = previousPopulation * 3;
      const additionalCitizens = Math.max(0, nextPopulation - previousPopulation);
      previousGlobalPop += previousPopulation;
      st.populationCount = nextPopulation;
      st.healthyCount += additionalCitizens;
      const currentZombiePopulation = st.infectedCount + st.transformingCount;
      currentZombieGlobal += currentZombiePopulation;
      st.dailyZombieTarget = Math.min(nextPopulation, currentZombiePopulation * 2);
      nextZombieTargetGlobal += st.dailyZombieTarget;
      st.dailyGrowthDay = day;
      st.lastUpdatedAt = Number(this.simClock.toFixed(1));
    });

    this.populationState.markDailyTransition(day, previousGlobalPop, currentZombieGlobal, nextZombieTargetGlobal);
    this.syncPopulationState();
  }

  private initializeContinentalImpacts(day: number, isNight: boolean) {
    this.impactSitesInitialized = true;
    this.lastObservedDay = day;
    const duration = isNight ? 10 : 60;
    for (const site of CONTINENTAL_ASTEROID_IMPACTS) {
      const state = this.cityStates.get(site.cityId);
      const city = state?.city;
      if (!state || !city) continue;
      this.impactedCityIds.add(site.cityId);
      const seed = Math.max(1, Math.min(state.healthyCount, Math.floor(state.populationCount * (site.cityId === 'us_oakridge' ? 0.0005 : 0.00001))));
      state.healthyCount -= seed;
      state.transformingCount += seed;
      this.conversionCohorts.set(site.cityId, [...(this.conversionCohorts.get(site.cityId) ?? []), { remainingSeconds: duration, count: seed }]);
      state.dailyZombieTarget = Math.min(state.populationCount, Math.max(1, seed * 2));
      state.dailyGrowthDay = day;
      state.lastUpdatedAt = Number(this.simClock.toFixed(1));
      this.populationState.markImpactOccurred(site.cityId, this.simClock, day, seed / Math.max(1, state.populationCount));
      if (site.cityId !== 'us_oakridge') this.createAsteroidVisual(city);
    }
    this.syncPopulationState();
  }

  private createAsteroidVisual(city: RealWorldCity, alreadyLanded: boolean = false) {
    if (this.asteroidVisuals.has(city.id)) return;
    const [x, z] = WorldCoordinates.latLonToWorld(city.lat + 0.015, city.lon + 0.02);
    const groundY = getTerrainHeight(x, z, this.worldSeed);
    const group = new THREE.Group();
    group.name = `global_asteroid_impact_${city.id}`;
    const meteor = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({ color: 0xff4b19, emissive: 0xff3b0b, emissiveIntensity: 3.2, roughness: 0.28 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffb52e, transparent: true, opacity: 0.72 });
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2, 1), rockMat);
    const glow = new THREE.Mesh(new THREE.SphereGeometry(3.8, 12, 12), glowMat);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(2.1, 17, 8), new THREE.MeshBasicMaterial({ color: 0xff6b22, transparent: true, opacity: 0.55 }));
    tail.position.y = 8.5;
    meteor.add(rock, glow, tail);
    const start = new THREE.Vector3(x - 75, groundY + 190, z - 95);
    const end = new THREE.Vector3(x, groundY + 3, z);
    meteor.position.copy(start);
    group.add(meteor);
    this.scene.add(group);
    const visual: AsteroidImpactVisual = { cityId: city.id, group, meteor, start, end, progress: alreadyLanded ? 1 : 0, landed: alreadyLanded };
    this.asteroidVisuals.set(city.id, visual);
    if (alreadyLanded) { meteor.visible = false; this.addAsteroidCrater(visual, x, z, groundY); }
  }

  private updateAsteroidVisuals(delta: number) {
    this.asteroidVisuals.forEach((impact) => {
      if (impact.landed) return;
      impact.progress = Math.min(1, impact.progress + delta / 3.5);
      impact.meteor.position.lerpVectors(impact.start, impact.end, impact.progress);
      impact.meteor.rotation.x += delta * 3.5;
      impact.meteor.rotation.z += delta * 4.5;
      if (impact.progress >= 1) {
        impact.landed = true;
        impact.meteor.visible = false;
        const [x, z] = WorldCoordinates.latLonToWorld(
          (this.cityStates.get(impact.cityId)?.city.lat ?? 0) + 0.015,
          (this.cityStates.get(impact.cityId)?.city.lon ?? 0) + 0.02
        );
        const y = getTerrainHeight(x, z, this.worldSeed);
        this.addAsteroidCrater(impact, x, z, y);
      }
    });
  }

  private addAsteroidCrater(impact: AsteroidImpactVisual, x: number, z: number, y: number) {
    if (impact.group.getObjectByName(`asteroid_crater_${impact.cityId}`)) return;
    const crater = new THREE.Group();
    crater.name = `asteroid_crater_${impact.cityId}`;
    crater.position.set(x, y, z);
    const scorch = new THREE.Mesh(new THREE.RingGeometry(2.5, 13, 32), new THREE.MeshStandardMaterial({ color: 0x211915, roughness: 1, side: THREE.DoubleSide }));
    scorch.rotation.x = -Math.PI / 2;
    scorch.position.y = 0.12;
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(2.0, 0), new THREE.MeshStandardMaterial({ color: 0x35e4c0, emissive: 0x0a9c87, emissiveIntensity: 2.2, metalness: 0.65, roughness: 0.2 }));
    core.position.set(0, 1.0, 0);
    const light = new THREE.PointLight(0x28e8c2, 2.0, 24);
    light.position.set(0, 2.0, 0);
    crater.add(scorch, core, light);
    impact.group.add(crater);
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
      const ageGroup = ageGroupForSeed(idSeed * 13 + Math.floor(Math.abs(sz)));
      const role = assignSafeProfessionForAgeGroup(ageGroup, idSeed, continentKey, Boolean(cityHit));
      const appearance = professionAppearance(role, idSeed);
      const shirtHex = appearance.shirt;
      const pantsHex = appearance.pants;
      const skinHex = SKIN_PALETTE[(idSeed * 2) % SKIN_PALETTE.length];
      const hairHex = HAIR_PALETTE[(idSeed * 4) % HAIR_PALETTE.length];

      const rig = buildRealisticHumanoid({
        shirtColor: shirtHex,
        jacketColor: shirtHex,
        pantsColor: pantsHex,
        skinColor: skinHex,
        hairColor: hairHex,
        hairStyle: appearance.hair,
        fabricStyle: appearance.fabric,
        hasHolster: 'holster' in appearance ? appearance.holster : false,
        hasMedicArmband: 'medic' in appearance ? appearance.medic : false,
        hasStethoscope: role === 'Nurse' || role === 'Doctor' || role === 'Surgeon',
        hasBackpack: role === 'Courier' || role === 'Traveler' || role === 'Military Engineer' || isOutbreakActive,
        name: `regional_npc_${idSeed}_${ageGroup.toLowerCase().replace(/[^a-z]+/g, '_')}_${role.toLowerCase().replace(/[^a-z]+/g, '_')}`,
      });
      rig.group.scale.setScalar(ageScale(ageGroup));
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
        ageGroup,
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

      // 1. Day/night Stunned -> Zombie Transformation Countdown
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

    // Execute finished conversions -> ZombieManager
    for (const ped of toConvert) {
      this.convertPedestrianToZombie(ped, zombieMgr);
    }
  }

  public infectPedestrian(pedestrianId: string, isNight: boolean = false): boolean {
    const ped = this.pedestrians.get(pedestrianId);
    if (!ped || ped.infectionStage !== 'healthy') return false;
    ped.infectionStage = 'stunned';
    ped.infectionTimer = isNight ? 10.0 : 60.0;
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
        this.conversionCohorts.set(ped.cityId, [...(this.conversionCohorts.get(ped.cityId) ?? []), { remainingSeconds: isNight ? 10 : 60, count: 1 }]);
        cityState.dailyZombieTarget = Math.max(cityState.dailyZombieTarget ?? 0, cityState.infectedCount + cityState.transformingCount);
      }
    }
    return true;
  }

  public getNearestInteractivePedestrian(
    playerPos: THREE.Vector3,
    maxRange: number = 3.4
  ): { id: string; name: string; role: string; ageGroup: CitizenAgeGroup; infectionStage: 'healthy' | 'stunned' | 'zombie'; infectionTimer: number } | null {
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
      ageGroup: found.ageGroup,
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
        role: `${ped.ageGroup} · ${ped.role} · CRITICAL`,
        text: `Bite exposure! Turning in ${Math.ceil(ped.infectionTimer)}s — clear the area!`,
      };
    }

    const place = ped.cityName ? `${ped.cityName}, ${ped.countryName}` : ped.countryName;
    const cityTelemetry = ped.cityId ? this.cityStates.get(ped.cityId) : undefined;
    const category = classifyProfessionCategory(ped.role);
    let text = `Greetings from ${place}. Roads are clear for now—stay sharp out there.`;
    let giftItem: { id: string; qty: number } | undefined;

    if (isOutbreakActive) {
      const danger = cityTelemetry?.dangerLevel ?? 'Alert';
      if (category === 'Military' || category === 'Police' || category === 'Security') {
        text = `Perimeter alert in ${place} (${danger})! Hold defensive corridors and watch for infected breaches.`;
      } else if (category === 'Medical' || category === 'Emergency') {
        text = `Triage active in ${place} (${danger})! Exposure turns in 60s by day and 10s at night—stay clear of bites!`;
      } else if (category === 'Railway') {
        text = `Rail dispatch in ${place} (${danger}): evacuee trains remain our fastest corridor between safe hubs.`;
      } else {
        text = `Outbreak status in ${place}: ${danger}! Grid is at ${Math.round((cityTelemetry?.powerGridRatio ?? this.powerGridStability) * 100)}%. Check local clinics and rail hubs for supplies!`;
      }
      if (!ped.hasGiftedSupply && Math.random() < (category === 'Medical' ? 0.65 : 0.4)) {
        ped.hasGiftedSupply = true;
        giftItem = category === 'Medical'
          ? { id: 'medical_bandage', qty: 1 }
          : { id: 'clean_water', qty: 1 };
      }
    } else if (category === 'Railway') {
      text = `${place} transit lines are running on normal schedules. All platforms clear.`;
    } else if (category === 'Medical') {
      text = `Clinics and emergency wards in ${place} are fully stocked and operating normally.`;
    } else if (category === 'Military' || category === 'Police' || category === 'Security') {
      text = `Civilian patrol routine in ${place} is calm and orderly today.`;
    }

    return {
      speaker: ped.name,
      role: `${ped.ageGroup} · ${ped.role}`,
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
          victimScale: ageScale(ped.ageGroup),
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
    let totalPopulation = 0;
    let totalHealthy = 0;
    let totalTransforming = 0;
    let totalInfected = 0;
    let totalEvacuated = 0;
    let overrunCitiesCount = 0;

    this.cityStates.forEach((st) => {
      totalPopulation += st.populationCount;
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
      totalPopulation,
      totalHealthy,
      totalTransforming,
      totalInfected,
      totalEvacuated,
      overrunCitiesCount,
      activeLocalPedestrians: this.pedestrians.size,
      citizenDailyMultiplier: CITIZEN_DAILY_GROWTH_MULTIPLIER,
      zombieDailyMultiplier: ZOMBIE_DAILY_GROWTH_MULTIPLIER,
      activeConversionSeconds: this.lastIsNight ? NIGHTTIME_CONVERSION_SECONDS : DAYTIME_CONVERSION_SECONDS,
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
        populationCount: st.populationCount,
        dailyZombieTarget: st.dailyZombieTarget ?? 0,
        dailyGrowthDay: st.dailyGrowthDay ?? this.lastObservedDay,
        conversionCohorts: this.conversionCohorts.get(st.city.id) ?? [],
        transformingCount: st.transformingCount,
        infectedCount: st.infectedCount,
        evacuatedCount: st.evacuatedCount,
        powerGridRatio: st.powerGridRatio,
        lastUpdatedAt: st.lastUpdatedAt ?? Number(this.simClock.toFixed(1)),
        dangerLevel: st.dangerLevel,
      });
    });

    return {
      apocalypticSeverity: this.apocalypticSeverity,
      powerGridStability: this.powerGridStability,
      totalGlobalInfected,
      totalGlobalTransforming,
      totalGlobalEvacuated,
      cityStates,
      lastProcessedDay: this.lastObservedDay,
      impactedCityIds: Array.from(this.impactedCityIds),
      impactSitesInitialized: this.impactSitesInitialized,
      populationState: this.populationState.exportSaveData(),
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
    this.lastObservedDay = Math.max(1, data.lastProcessedDay ?? this.lastObservedDay);
    const hasLegacyOutbreak = Boolean(data.cityStates?.some((city) => city.infectedCount > 0 || city.transformingCount > 0));
    this.impactSitesInitialized = data.impactSitesInitialized ?? hasLegacyOutbreak;
    this.lastOutbreakActive = this.impactSitesInitialized || hasLegacyOutbreak || this.apocalypticSeverity > 0;
    if (hasLegacyOutbreak && !data.impactedCityIds) {
      this.impactedCityIds = new Set();
    }
    this.impactedCityIds = new Set(data.impactedCityIds ?? []);
    if (Array.isArray(data.cityStates)) {
      for (const saved of data.cityStates) {
        const entry = this.cityStates.get(saved.cityId);
        if (!entry) continue;
        entry.healthyCount = Math.max(0, saved.healthyCount);
        entry.populationCount = Math.max(entry.city.population, saved.populationCount ?? entry.city.population);
        entry.dailyZombieTarget = Math.max(0, saved.dailyZombieTarget ?? 0);
        entry.dailyGrowthDay = saved.dailyGrowthDay ?? this.lastObservedDay;
        const restoredCohorts = (saved.conversionCohorts ?? []).map((c) => ({ remainingSeconds: Math.max(0, c.remainingSeconds), count: Math.max(0, c.count) }));
        if (restoredCohorts.length === 0 && saved.transformingCount > 0) restoredCohorts.push({ remainingSeconds: 60, count: saved.transformingCount });
        this.conversionCohorts.set(saved.cityId, restoredCohorts);
        const cohortCount = restoredCohorts.reduce((sum, c) => sum + c.count, 0);
        entry.transformingCount = Math.max(0, saved.transformingCount, cohortCount);
        entry.infectedCount = Math.max(0, saved.infectedCount);
        entry.evacuatedCount = Math.max(0, saved.evacuatedCount);
        entry.powerGridRatio = Math.max(0.12, Math.min(1, saved.powerGridRatio));
        entry.lastUpdatedAt = saved.lastUpdatedAt ?? 0;
        entry.dangerLevel = classifyDanger(
          entry.infectedCount / Math.max(1, entry.populationCount),
          entry.transformingCount / Math.max(1, entry.populationCount)
        );
      }
    }
    if (data.populationState) {
      this.populationState.importSaveData(data.populationState);
    } else if (this.impactSitesInitialized) {
      for (const cityId of this.impactedCityIds) {
        const st = this.cityStates.get(cityId);
        const ratio = st ? (st.infectedCount + st.transformingCount) / Math.max(1, st.populationCount) : 0.25;
        this.populationState.markImpactOccurred(cityId, this.simClock, this.lastObservedDay, ratio);
      }
    }
    if (this.impactSitesInitialized) {
      for (const cityId of this.impactedCityIds) {
        if (cityId === 'us_oakridge') continue;
        const city = this.cityStates.get(cityId)?.city;
        if (city) this.createAsteroidVisual(city, true);
      }
    }
    this.syncPopulationState();
  }

  public refreshAsteroidVisuals() {
    this.disposeAsteroidVisuals();
    if (!this.impactSitesInitialized) return;
    for (const cityId of this.impactedCityIds) {
      if (cityId === 'us_oakridge') continue;
      const city = this.cityStates.get(cityId)?.city;
      if (city) this.createAsteroidVisual(city, true);
    }
  }

  private disposeAsteroidVisuals() {
    this.asteroidVisuals.forEach((impact) => {
      this.scene.remove(impact.group);
      impact.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => material.dispose());
        }
      });
    });
    this.asteroidVisuals.clear();
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
    this.disposeAsteroidVisuals();
    this.conversionCohorts.clear();
    this.cityStates.clear();
  }
}
