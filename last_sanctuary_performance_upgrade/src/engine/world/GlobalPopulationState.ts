import { REAL_WORLD_CITIES, RealWorldCity } from '../geo/RealWorldCities';
import {
  AsteroidImpactSaveRecord,
  GlobalPopulationStateSave,
  PopulationHistorySavePoint,
} from '../../types/game';

export type CitizenAgeGroup =
  | 'Child'
  | 'Teenager'
  | 'Young Adult'
  | 'Adult'
  | 'Middle-aged Adult'
  | 'Elderly';

export type ProfessionCategory =
  | 'Civilian'
  | 'Military'
  | 'Medical'
  | 'Police'
  | 'Security'
  | 'Emergency'
  | 'Railway';

export const CITIZEN_AGE_GROUPS: ReadonlyArray<CitizenAgeGroup> = [
  'Child',
  'Teenager',
  'Young Adult',
  'Adult',
  'Middle-aged Adult',
  'Elderly',
];

export const PROFESSION_CATEGORIES: ReadonlyArray<ProfessionCategory> = [
  'Civilian',
  'Military',
  'Medical',
  'Police',
  'Security',
  'Emergency',
  'Railway',
];

export const ADULT_PROFESSIONS_BY_CATEGORY: Record<ProfessionCategory, ReadonlyArray<string>> = {
  Military: ['Military Soldier', 'Military Officer', 'Commander', 'Military Doctor', 'Military Engineer'],
  Medical: ['Nurse', 'Doctor', 'Surgeon', 'Paramedic', 'Hospital Worker'],
  Police: ['Police Officer', 'Police Inspector', 'Detective', 'Traffic Police', 'Station Police', 'Special Police Unit'],
  Security: ['Prison Warden', 'Prison Guard', 'Security Officer'],
  Emergency: ['Firefighter', 'Rescue Personnel', 'Emergency Responder'],
  Railway: ['Train Driver', 'Station Master', 'Railway Police', 'Railway Engineer', 'Station Worker'],
  Civilian: [
    'Teacher',
    'Student',
    'Shopkeeper',
    'Farmer',
    'Mechanic',
    'Construction Worker',
    'Engineer',
    'Office Employee',
    'Driver',
    'Other Civilian',
  ],
};

export const MINOR_ALLOWED_ROLES: ReadonlyArray<string> = ['Student', 'Child Dependent'];

export const CITIZEN_DAILY_GROWTH_MULTIPLIER = 3.0;
export const ZOMBIE_DAILY_GROWTH_MULTIPLIER = 2.0;
export const DAYTIME_CONVERSION_SECONDS = 60;
export const NIGHTTIME_CONVERSION_SECONDS = 10;

export const AGE_GROUP_WEIGHTS: Record<CitizenAgeGroup, number> = {
  Child: 0.12,
  Teenager: 0.12,
  'Young Adult': 0.19,
  Adult: 0.37,
  'Middle-aged Adult': 0.13,
  Elderly: 0.07,
};

// Applied strictly to the Adult + Young Adult + Middle-aged Adult + Elderly workforce (76% of citizens).
// Children & Teenagers (24%) are assigned exclusively to Civilian minors/students and never hold adult professions.
export const ADULT_PROFESSION_WEIGHTS: Record<ProfessionCategory, number> = {
  Civilian: 0.64,
  Medical: 0.06,
  Police: 0.06,
  Military: 0.08,
  Security: 0.04,
  Emergency: 0.05,
  Railway: 0.07,
};

export interface ContinentalAsteroidBlueprint {
  id: string;
  continent: string;
  cityId: string;
  triggerDay: number;
  radiusKm: number;
  terrainCondition: string;
}

export const CONTINENTAL_ASTEROID_BLUEPRINTS: ReadonlyArray<ContinentalAsteroidBlueprint> = [
  {
    id: 'impact_na_oakridge',
    continent: 'North America',
    cityId: 'us_oakridge',
    triggerDay: 2,
    radiusKm: 42,
    terrainCondition: 'Temperate Mountain Valley · Sector 4 Ridge',
  },
  {
    id: 'impact_sa_saopaulo',
    continent: 'South America',
    cityId: 'br_saopaulo',
    triggerDay: 2,
    radiusKm: 68,
    terrainCondition: 'Subtropical High-Density Urban Basin',
  },
  {
    id: 'impact_eu_london',
    continent: 'Europe',
    cityId: 'gb_london',
    triggerDay: 2,
    radiusKm: 56,
    terrainCondition: 'Maritime River Basin · Rail & Port Hub',
  },
  {
    id: 'impact_af_cairo',
    continent: 'Africa',
    cityId: 'eg_cairo',
    triggerDay: 2,
    radiusKm: 64,
    terrainCondition: 'Arid Nile Delta Corridor',
  },
  {
    id: 'impact_as_delhi',
    continent: 'Asia',
    cityId: 'in_delhi',
    triggerDay: 2,
    radiusKm: 84,
    terrainCondition: 'High-Density Alluvial Megacity Zone',
  },
  {
    id: 'impact_oc_sydney',
    continent: 'Australia & Oceania',
    cityId: 'au_sydney',
    triggerDay: 2,
    radiusKm: 52,
    terrainCondition: 'Coastal Harbor & Rail Corridor',
  },
  {
    id: 'impact_an_mcmurdo',
    continent: 'Antarctica',
    cityId: 'aq_mcmurdo',
    triggerDay: 2,
    radiusKm: 28,
    terrainCondition: 'Polar Ice Sheet · Research Station Outpost',
  },
];

export interface DemographicBucket {
  total: number;
  healthy: number;
  transforming: number;
  infected: number;
  evacuated: number;
}

export interface CityPopulationRecord {
  city: RealWorldCity;
  populationCount: number;
  healthyCount: number;
  transformingCount: number;
  infectedCount: number;
  evacuatedCount: number;
  dailyZombieTarget?: number;
  dangerLevel: 'Safe' | 'Alert' | 'Containment' | 'Overrun' | 'Critical';
  powerGridRatio: number;
  lastUpdatedAt?: number;
}

export interface GlobalPopulationStateSnapshot {
  version: number;
  currentDay: number;
  isNight: boolean;
  isOutbreakActive: boolean;
  baselineDay1Population: number;
  totalPopulation: number;
  totalHealthy: number;
  totalTransforming: number;
  totalInfected: number;
  totalEvacuated: number;
  citizenGrowthMultiplier: number;
  zombieGrowthMultiplier: number;
  citizenDailyStartPopulation: number;
  projectedNextDayPopulation: number;
  actualCitizenGrowthFactor: number;
  zombieDailyStartCount: number;
  zombieDailyTargetCount: number;
  actualZombieGrowthFactor: number;
  activeConversionSeconds: number;
  daytimeConversionSeconds: number;
  nighttimeConversionSeconds: number;
  nightSpeedMultiplier: number;
  ageGroups: Record<CitizenAgeGroup, DemographicBucket>;
  professionCategories: Record<ProfessionCategory, DemographicBucket>;
  minorCount: number;
  minorAdultProfessionViolations: number;
  asteroidImpacts: AsteroidImpactSaveRecord[];
  activeImpactCount: number;
  history: PopulationHistorySavePoint[];
  cityDangerCounts: Record<'Safe' | 'Alert' | 'Containment' | 'Overrun' | 'Critical', number>;
  resetCount: number;
  lastResetAt: number;
}

export function isMinorAgeGroup(ageGroup: CitizenAgeGroup): boolean {
  return ageGroup === 'Child' || ageGroup === 'Teenager';
}

export function classifyProfessionCategory(role: string): ProfessionCategory {
  const r = role.toLowerCase();
  if (r.includes('military') || r === 'commander') return 'Military';
  if (r.includes('nurse') || r.includes('doctor') || r.includes('surgeon') || r.includes('paramedic') || r.includes('medic') || r.includes('hospital')) {
    return 'Medical';
  }
  if (r.includes('police') || r.includes('detective') || r.includes('inspector')) return 'Police';
  if (r.includes('warden') || r.includes('guard') || r.includes('security')) return 'Security';
  if (r.includes('firefighter') || r.includes('rescue') || r.includes('emergency')) return 'Emergency';
  if (r.includes('railway') || r.includes('train') || r.includes('station') || r.includes('conductor') || r.includes('transit')) {
    return 'Railway';
  }
  return 'Civilian';
}

export function assignSafeProfessionForAgeGroup(
  ageGroup: CitizenAgeGroup,
  seed: number,
  continent: string,
  isCity: boolean
): string {
  // Children and teenagers must never receive adult professions.
  if (ageGroup === 'Child') {
    return seed % 3 === 0 ? 'Child Dependent' : 'Student';
  }
  if (ageGroup === 'Teenager') {
    return 'Student';
  }
  if (ageGroup === 'Elderly') {
    const elderlyPool = ['Other Civilian', 'Shopkeeper', 'Teacher', 'Farmer', 'Doctor', 'Station Master'] as const;
    return elderlyPool[Math.abs(seed) % elderlyPool.length];
  }
  if (!isCity) {
    if (continent === 'Antarctica') {
      const polarPool = ['Engineer', 'Military Engineer', 'Doctor', 'Emergency Responder', 'Other Civilian'] as const;
      return polarPool[Math.abs(seed) % polarPool.length];
    }
    const ruralPool = ['Farmer', 'Mechanic', 'Construction Worker', 'Driver', 'Other Civilian'] as const;
    return ruralPool[Math.abs(seed) % ruralPool.length];
  }

  // Deterministic weighted roll across adult profession categories
  const roll = Math.abs(seed * 17 + 11) % 100;
  let category: ProfessionCategory = 'Civilian';
  if (roll < 8) category = 'Military';
  else if (roll < 14) category = 'Medical';
  else if (roll < 20) category = 'Police';
  else if (roll < 24) category = 'Security';
  else if (roll < 29) category = 'Emergency';
  else if (roll < 36) category = 'Railway';

  const pool = ADULT_PROFESSIONS_BY_CATEGORY[category];
  return pool[Math.abs(seed * 7) % pool.length];
}

function emptyBucket(): DemographicBucket {
  return { total: 0, healthy: 0, transforming: 0, infected: 0, evacuated: 0 };
}

function allocateByWeights<K extends string>(total: number, keys: ReadonlyArray<K>, weights: Record<K, number>): Record<K, number> {
  const out = {} as Record<K, number>;
  let allocated = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (i === keys.length - 1) {
      out[k] = Math.max(0, total - allocated);
    } else {
      const count = Math.floor(total * (weights[k] ?? 0));
      out[k] = count;
      allocated += count;
    }
  }
  return out;
}

export class GlobalPopulationState {
  public readonly version = 1;
  public baselineDay1Population: number = 0;
  public currentDay: number = 1;
  public isNight: boolean = false;
  public isOutbreakActive: boolean = false;
  public citizenDailyStartPopulation: number = 0;
  public zombieDailyStartCount: number = 0;
  public zombieDailyTargetCount: number = 0;
  public resetCount: number = 0;
  public lastResetAt: number = Date.now();
  public asteroidImpacts: AsteroidImpactSaveRecord[] = [];
  public history: PopulationHistorySavePoint[] = [];

  private ageGroups: Record<CitizenAgeGroup, DemographicBucket> = {
    Child: emptyBucket(),
    Teenager: emptyBucket(),
    'Young Adult': emptyBucket(),
    Adult: emptyBucket(),
    'Middle-aged Adult': emptyBucket(),
    Elderly: emptyBucket(),
  };

  private professionCategories: Record<ProfessionCategory, DemographicBucket> = {
    Civilian: emptyBucket(),
    Military: emptyBucket(),
    Medical: emptyBucket(),
    Police: emptyBucket(),
    Security: emptyBucket(),
    Emergency: emptyBucket(),
    Railway: emptyBucket(),
  };

  private totalPopulation = 0;
  private totalHealthy = 0;
  private totalTransforming = 0;
  private totalInfected = 0;
  private totalEvacuated = 0;
  private minorCount = 0;
  private cityDangerCounts: Record<'Safe' | 'Alert' | 'Containment' | 'Overrun' | 'Critical', number> = {
    Safe: 0,
    Alert: 0,
    Containment: 0,
    Overrun: 0,
    Critical: 0,
  };
  private lastHistorySimSeconds = -999;

  constructor(initialDay: number = 1) {
    this.baselineDay1Population = REAL_WORLD_CITIES.reduce((sum, c) => sum + c.population, 0);
    this.reset(initialDay, false);
  }

  public reset(initialDay: number = 1, incrementResetCounter: boolean = true) {
    const safeDay = Math.max(1, initialDay);
    this.currentDay = safeDay;
    this.isNight = false;
    this.isOutbreakActive = false;
    this.citizenDailyStartPopulation = this.baselineDay1Population;
    this.zombieDailyStartCount = 0;
    this.zombieDailyTargetCount = 0;
    this.lastHistorySimSeconds = -999;

    if (incrementResetCounter) {
      this.resetCount += 1;
      this.lastResetAt = Date.now();
    }

    this.asteroidImpacts = CONTINENTAL_ASTEROID_BLUEPRINTS.map((bp) => {
      const city = REAL_WORLD_CITIES.find((c) => c.id === bp.cityId);
      return {
        id: bp.id,
        cityId: bp.cityId,
        cityName: city?.name ?? bp.cityId,
        continent: bp.continent,
        country: city?.country ?? 'International',
        lat: city?.lat ?? 0,
        lon: city?.lon ?? 0,
        triggerDay: bp.triggerDay,
        impacted: false,
        impactedAtSimSeconds: null,
        radiusKm: bp.radiusKm,
        severity: 0,
        terrainCondition: bp.terrainCondition,
        discovered: false,
      };
    });

    this.history = [];
    this.syncFromCities(
      REAL_WORLD_CITIES.map((city) => ({
        city,
        populationCount: city.population,
        healthyCount: city.population,
        transformingCount: 0,
        infectedCount: 0,
        evacuatedCount: 0,
        dailyZombieTarget: 0,
        dangerLevel: 'Safe',
        powerGridRatio: 1.0,
      })),
      0,
      safeDay,
      false,
      false
    );
  }

  public markDailyTransition(newDay: number, previousGlobalPop: number, currentZombiePop: number, newZombieTarget: number) {
    this.currentDay = Math.max(1, newDay);
    this.citizenDailyStartPopulation = Math.max(1, previousGlobalPop);
    this.zombieDailyStartCount = Math.max(0, currentZombiePop);
    this.zombieDailyTargetCount = Math.max(0, newZombieTarget);
  }

  public markImpactOccurred(cityId: string, simSeconds: number, triggerDay: number, severity: number = 0.45) {
    const rec = this.asteroidImpacts.find((imp) => imp.cityId === cityId);
    if (!rec) return;
    if (!rec.impacted) {
      rec.impacted = true;
      rec.impactedAtSimSeconds = Number(simSeconds.toFixed(1));
      rec.triggerDay = Math.max(1, triggerDay);
    }
    rec.discovered = true;
    rec.severity = Number(Math.max(rec.severity, Math.min(1, severity)).toFixed(3));
  }

  public syncFromCities(
    cities: ReadonlyArray<CityPopulationRecord>,
    simSeconds: number,
    dayCount: number,
    isNight: boolean,
    isOutbreakActive: boolean
  ) {
    this.currentDay = Math.max(1, dayCount);
    this.isNight = isNight;
    this.isOutbreakActive = isOutbreakActive;

    for (const age of CITIZEN_AGE_GROUPS) this.ageGroups[age] = emptyBucket();
    for (const prof of PROFESSION_CATEGORIES) this.professionCategories[prof] = emptyBucket();

    this.totalPopulation = 0;
    this.totalHealthy = 0;
    this.totalTransforming = 0;
    this.totalInfected = 0;
    this.totalEvacuated = 0;
    this.minorCount = 0;
    this.cityDangerCounts = { Safe: 0, Alert: 0, Containment: 0, Overrun: 0, Critical: 0 };

    let summedDailyZombieTarget = 0;

    for (const st of cities) {
      const pop = Math.max(0, Math.round(st.populationCount));
      const healthy = Math.max(0, Math.round(st.healthyCount));
      const transforming = Math.max(0, Math.round(st.transformingCount));
      const infected = Math.max(0, Math.round(st.infectedCount));
      const evacuated = Math.max(0, Math.round(st.evacuatedCount));

      this.totalPopulation += pop;
      this.totalHealthy += healthy;
      this.totalTransforming += transforming;
      this.totalInfected += infected;
      this.totalEvacuated += evacuated;
      this.cityDangerCounts[st.dangerLevel] = (this.cityDangerCounts[st.dangerLevel] ?? 0) + 1;
      summedDailyZombieTarget += Math.min(pop, Math.max(infected + transforming, Math.round(st.dailyZombieTarget ?? 0)));

      // Age-group distribution derived strictly from city's real simulated population & conversion ratios.
      const totalAges = allocateByWeights(pop, CITIZEN_AGE_GROUPS, AGE_GROUP_WEIGHTS);
      const healthyAges = allocateByWeights(healthy, CITIZEN_AGE_GROUPS, AGE_GROUP_WEIGHTS);
      const transAges = allocateByWeights(transforming, CITIZEN_AGE_GROUPS, AGE_GROUP_WEIGHTS);
      const infAges = allocateByWeights(infected, CITIZEN_AGE_GROUPS, AGE_GROUP_WEIGHTS);
      const evacAges = allocateByWeights(evacuated, CITIZEN_AGE_GROUPS, AGE_GROUP_WEIGHTS);

      for (const age of CITIZEN_AGE_GROUPS) {
        const b = this.ageGroups[age];
        b.total += totalAges[age];
        b.healthy += healthyAges[age];
        b.transforming += transAges[age];
        b.infected += infAges[age];
        b.evacuated += evacAges[age];
      }

      // Strictly separate minor cohorts (Child + Teenager) from adult professions:
      // 100% of minors reside in Civilian (Student / Child Dependent) and NEVER receive adult professions.
      const cityMinorTotal = totalAges.Child + totalAges.Teenager;
      const cityMinorHealthy = healthyAges.Child + healthyAges.Teenager;
      const cityMinorTrans = transAges.Child + transAges.Teenager;
      const cityMinorInf = infAges.Child + infAges.Teenager;
      const cityMinorEvac = evacAges.Child + evacAges.Teenager;
      this.minorCount += cityMinorTotal;

      this.professionCategories.Civilian.total += cityMinorTotal;
      this.professionCategories.Civilian.healthy += cityMinorHealthy;
      this.professionCategories.Civilian.transforming += cityMinorTrans;
      this.professionCategories.Civilian.infected += cityMinorInf;
      this.professionCategories.Civilian.evacuated += cityMinorEvac;

      const adultTotal = Math.max(0, pop - cityMinorTotal);
      const adultHealthy = Math.max(0, healthy - cityMinorHealthy);
      const adultTrans = Math.max(0, transforming - cityMinorTrans);
      const adultInf = Math.max(0, infected - cityMinorInf);
      const adultEvac = Math.max(0, evacuated - cityMinorEvac);

      // Regional adjustments: Antarctica research stations have higher Military/Medical/Engineering weight
      const weights: Record<ProfessionCategory, number> =
        st.city.continent === 'Antarctica'
          ? { Civilian: 0.42, Medical: 0.16, Police: 0.02, Military: 0.22, Security: 0.06, Emergency: 0.10, Railway: 0.02 }
          : st.city.hasMetro
            ? ADULT_PROFESSION_WEIGHTS
            : { Civilian: 0.67, Medical: 0.06, Police: 0.06, Military: 0.08, Security: 0.04, Emergency: 0.05, Railway: 0.04 };

      const profTotals = allocateByWeights(adultTotal, PROFESSION_CATEGORIES, weights);
      const profHealthy = allocateByWeights(adultHealthy, PROFESSION_CATEGORIES, weights);
      const profTrans = allocateByWeights(adultTrans, PROFESSION_CATEGORIES, weights);
      const profInf = allocateByWeights(adultInf, PROFESSION_CATEGORIES, weights);
      const profEvac = allocateByWeights(adultEvac, PROFESSION_CATEGORIES, weights);

      for (const cat of PROFESSION_CATEGORIES) {
        const pb = this.professionCategories[cat];
        pb.total += profTotals[cat];
        pb.healthy += profHealthy[cat];
        pb.transforming += profTrans[cat];
        pb.infected += profInf[cat];
        pb.evacuated += profEvac[cat];
      }

      // Sync impact severity if this city is an active impact zone
      const impact = this.asteroidImpacts.find((imp) => imp.cityId === st.city.id);
      if (impact && impact.impacted && pop > 0) {
        impact.severity = Number(Math.min(1, (infected + transforming * 0.6) / pop).toFixed(4));
      }
    }

    if (this.citizenDailyStartPopulation <= 0) {
      this.citizenDailyStartPopulation = Math.max(1, this.totalPopulation);
    }
    if (isOutbreakActive && summedDailyZombieTarget > 0) {
      this.zombieDailyTargetCount = Math.min(this.totalPopulation, summedDailyZombieTarget);
    }

    // Record historical snapshot on day change or every 15 simulation seconds
    const lastPoint = this.history[this.history.length - 1];
    const shouldAppend =
      !lastPoint ||
      lastPoint.day !== this.currentDay ||
      simSeconds - this.lastHistorySimSeconds >= 15;

    if (shouldAppend) {
      this.lastHistorySimSeconds = simSeconds;
      const point: PopulationHistorySavePoint = {
        day: this.currentDay,
        simSeconds: Number(simSeconds.toFixed(1)),
        totalPopulation: this.totalPopulation,
        healthyCount: this.totalHealthy,
        transformingCount: this.totalTransforming,
        infectedCount: this.totalInfected,
        evacuatedCount: this.totalEvacuated,
        overrunCities: (this.cityDangerCounts.Overrun ?? 0) + (this.cityDangerCounts.Critical ?? 0),
        impactCount: this.asteroidImpacts.filter((i) => i.impacted).length,
      };
      this.history.push(point);
      if (this.history.length > 64) {
        this.history.shift();
      }
    }
  }

  public getSnapshot(): GlobalPopulationStateSnapshot {
    const activeZombiesAndTransforming = this.totalInfected + this.totalTransforming;
    const actualCitizenGrowthFactor =
      this.citizenDailyStartPopulation > 0
        ? Number((this.totalPopulation / this.citizenDailyStartPopulation).toFixed(2))
        : 1.0;
    const actualZombieGrowthFactor =
      this.zombieDailyStartCount > 0
        ? Number((activeZombiesAndTransforming / this.zombieDailyStartCount).toFixed(2))
        : activeZombiesAndTransforming > 0
          ? 2.0
          : 0;

    return {
      version: this.version,
      currentDay: this.currentDay,
      isNight: this.isNight,
      isOutbreakActive: this.isOutbreakActive,
      baselineDay1Population: this.baselineDay1Population,
      totalPopulation: this.totalPopulation,
      totalHealthy: this.totalHealthy,
      totalTransforming: this.totalTransforming,
      totalInfected: this.totalInfected,
      totalEvacuated: this.totalEvacuated,
      citizenGrowthMultiplier: CITIZEN_DAILY_GROWTH_MULTIPLIER,
      zombieGrowthMultiplier: ZOMBIE_DAILY_GROWTH_MULTIPLIER,
      citizenDailyStartPopulation: this.citizenDailyStartPopulation,
      projectedNextDayPopulation: this.totalPopulation * CITIZEN_DAILY_GROWTH_MULTIPLIER,
      actualCitizenGrowthFactor,
      zombieDailyStartCount: this.zombieDailyStartCount,
      zombieDailyTargetCount: this.zombieDailyTargetCount,
      actualZombieGrowthFactor,
      activeConversionSeconds: this.isNight ? NIGHTTIME_CONVERSION_SECONDS : DAYTIME_CONVERSION_SECONDS,
      daytimeConversionSeconds: DAYTIME_CONVERSION_SECONDS,
      nighttimeConversionSeconds: NIGHTTIME_CONVERSION_SECONDS,
      nightSpeedMultiplier: DAYTIME_CONVERSION_SECONDS / NIGHTTIME_CONVERSION_SECONDS,
      ageGroups: { ...this.ageGroups },
      professionCategories: { ...this.professionCategories },
      minorCount: this.minorCount,
      minorAdultProfessionViolations: 0,
      asteroidImpacts: this.asteroidImpacts.map((imp) => ({ ...imp })),
      activeImpactCount: this.asteroidImpacts.filter((imp) => imp.impacted).length,
      history: this.history.map((pt) => ({ ...pt })),
      cityDangerCounts: { ...this.cityDangerCounts },
      resetCount: this.resetCount,
      lastResetAt: this.lastResetAt,
    };
  }

  public exportSaveData(): GlobalPopulationStateSave {
    return {
      version: this.version,
      baselineDay1Population: this.baselineDay1Population,
      currentDay: this.currentDay,
      citizenDailyStartPopulation: this.citizenDailyStartPopulation,
      citizenGrowthMultiplier: CITIZEN_DAILY_GROWTH_MULTIPLIER,
      zombieDailyStartCount: this.zombieDailyStartCount,
      zombieDailyTargetCount: this.zombieDailyTargetCount,
      zombieGrowthMultiplier: ZOMBIE_DAILY_GROWTH_MULTIPLIER,
      daytimeConversionSeconds: DAYTIME_CONVERSION_SECONDS,
      nighttimeConversionSeconds: NIGHTTIME_CONVERSION_SECONDS,
      resetCount: this.resetCount,
      lastResetAt: this.lastResetAt,
      asteroidImpacts: this.asteroidImpacts.map((imp) => ({ ...imp })),
      history: this.history.map((pt) => ({ ...pt })),
    };
  }

  public importSaveData(saved?: GlobalPopulationStateSave) {
    if (!saved) return;
    this.baselineDay1Population = Math.max(1, saved.baselineDay1Population || this.baselineDay1Population);
    this.currentDay = Math.max(1, saved.currentDay || 1);
    this.citizenDailyStartPopulation = Math.max(1, saved.citizenDailyStartPopulation || this.baselineDay1Population);
    this.zombieDailyStartCount = Math.max(0, saved.zombieDailyStartCount || 0);
    this.zombieDailyTargetCount = Math.max(0, saved.zombieDailyTargetCount || 0);
    this.resetCount = Math.max(0, saved.resetCount || 0);
    this.lastResetAt = saved.lastResetAt || Date.now();
    if (Array.isArray(saved.asteroidImpacts) && saved.asteroidImpacts.length > 0) {
      const byId = new Map(saved.asteroidImpacts.map((a) => [a.cityId, a]));
      this.asteroidImpacts = this.asteroidImpacts.map((bp) => {
        const match = byId.get(bp.cityId);
        return match ? { ...bp, ...match } : bp;
      });
    }
    if (Array.isArray(saved.history)) {
      this.history = saved.history.slice(-64).map((pt) => ({ ...pt }));
      const last = this.history[this.history.length - 1];
      this.lastHistorySimSeconds = last ? last.simSeconds : -999;
    }
  }
}
