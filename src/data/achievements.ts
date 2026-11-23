export interface CareerStats {
  highestDay: number;
  zombiesDefeated: number;
  hordesSurvived: number;
  structuresBuilt: number;
  speciesLogged: number;
  survivorsRescued: number;
  highestLevel: number;
  resourcesHarvested: number;
  missionsCompleted: number;
  savesCreated: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: 'survival' | 'combat' | 'building' | 'exploration' | 'campaign';
  metric: keyof CareerStats;
  target: number;
  rewardLabel: string;
}

const CAREER_STATS_KEY = 'lsr_career_stats_v1';

export const DEFAULT_CAREER_STATS: CareerStats = {
  highestDay: 1,
  zombiesDefeated: 0,
  hordesSurvived: 0,
  structuresBuilt: 0,
  speciesLogged: 0,
  survivorsRescued: 0,
  highestLevel: 1,
  resourcesHarvested: 0,
  missionsCompleted: 0,
  savesCreated: 0,
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_harvest',
    title: 'Forager of the Ruins',
    description: 'Harvest 15 wild wood, stone, or scrap resource nodes.',
    category: 'survival',
    metric: 'resourcesHarvested',
    target: 15,
    rewardLabel: 'Scavenger Tier I',
  },
  {
    id: 'perimeter_architect',
    title: 'Perimeter Architect',
    description: 'Construct 10 defensive walls, gates, traps, or utility structures.',
    category: 'building',
    metric: 'structuresBuilt',
    target: 10,
    rewardLabel: 'Sanctuary Engineer',
  },
  {
    id: 'outbreak_responder',
    title: 'Outbreak Responder',
    description: 'Neutralize 15 infected zombies across the valley and city zones.',
    category: 'combat',
    metric: 'zombiesDefeated',
    target: 15,
    rewardLabel: 'Combat Readiness',
  },
  {
    id: 'night_watchman',
    title: 'Dawn After Blood Moon',
    description: 'Survive at least 1 full night horde assault until sunrise.',
    category: 'combat',
    metric: 'hordesSurvived',
    target: 1,
    rewardLabel: 'Night Watchman',
  },
  {
    id: 'endurance_week',
    title: 'Seven Days Standing',
    description: 'Reach Day 7 in any Survival or Story Campaign run.',
    category: 'survival',
    metric: 'highestDay',
    target: 7,
    rewardLabel: 'Veteran Survivor',
  },
  {
    id: 'field_naturalist',
    title: 'Field Naturalist',
    description: 'Scan and log 5 living wildlife or prehistoric specimens in the dossier.',
    category: 'exploration',
    metric: 'speciesLogged',
    target: 5,
    rewardLabel: 'Bio-Chronicle',
  },
  {
    id: 'beacon_of_hope',
    title: 'Beacon of Hope',
    description: 'Safely escort 3 stranded survivors back to the Sanctuary perimeter.',
    category: 'exploration',
    metric: 'survivorsRescued',
    target: 3,
    rewardLabel: 'Sanctuary Warden',
  },
  {
    id: 'apex_survivor',
    title: 'Hardened Specialist',
    description: 'Advance your survivor RPG progression to Level 5.',
    category: 'survival',
    metric: 'highestLevel',
    target: 5,
    rewardLabel: 'Field Specialist',
  },
  {
    id: 'campaign_pioneer',
    title: 'Railway Campaign Pioneer',
    description: 'Complete 5 story campaign missions across the sanctuary & railway network.',
    category: 'campaign',
    metric: 'missionsCompleted',
    target: 5,
    rewardLabel: 'Story Pathfinder',
  },
  {
    id: 'archivist_protocol',
    title: 'Sanctuary Archivist',
    description: 'Record 3 world checkpoints or JSON save backups.',
    category: 'building',
    metric: 'savesCreated',
    target: 3,
    rewardLabel: 'Vault Keeper',
  },
];

export function loadCareerStats(): CareerStats {
  try {
    const raw = localStorage.getItem(CAREER_STATS_KEY);
    if (!raw) return { ...DEFAULT_CAREER_STATS };
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      highestDay: Math.max(1, Number(parsed.highestDay) || 1),
      zombiesDefeated: Math.max(0, Number(parsed.zombiesDefeated) || 0),
      hordesSurvived: Math.max(0, Number(parsed.hordesSurvived) || 0),
      structuresBuilt: Math.max(0, Number(parsed.structuresBuilt) || 0),
      speciesLogged: Math.max(0, Number(parsed.speciesLogged) || 0),
      survivorsRescued: Math.max(0, Number(parsed.survivorsRescued) || 0),
      highestLevel: Math.max(1, Number(parsed.highestLevel) || 1),
      resourcesHarvested: Math.max(0, Number(parsed.resourcesHarvested) || 0),
      missionsCompleted: Math.max(0, Number(parsed.missionsCompleted) || 0),
      savesCreated: Math.max(0, Number(parsed.savesCreated) || 0),
    };
  } catch {
    return { ...DEFAULT_CAREER_STATS };
  }
}

export function saveCareerStats(stats: CareerStats): CareerStats {
  try {
    localStorage.setItem(CAREER_STATS_KEY, JSON.stringify(stats));
  } catch {
    // Ignore storage quota errors cleanly
  }
  return stats;
}

export function incrementCareerStat(
  metric: keyof CareerStats,
  delta: number = 1
): CareerStats {
  const current = loadCareerStats();
  const updated: CareerStats = {
    ...current,
    [metric]: (current[metric] || 0) + delta,
  };
  return saveCareerStats(updated);
}

export function recordCareerHighWater(
  partial: Partial<CareerStats>
): CareerStats {
  const current = loadCareerStats();
  const updated: CareerStats = {
    highestDay: Math.max(current.highestDay, partial.highestDay ?? 1),
    zombiesDefeated: Math.max(current.zombiesDefeated, partial.zombiesDefeated ?? 0),
    hordesSurvived: Math.max(current.hordesSurvived, partial.hordesSurvived ?? 0),
    structuresBuilt: Math.max(current.structuresBuilt, partial.structuresBuilt ?? 0),
    speciesLogged: Math.max(current.speciesLogged, partial.speciesLogged ?? 0),
    survivorsRescued: Math.max(current.survivorsRescued, partial.survivorsRescued ?? 0),
    highestLevel: Math.max(current.highestLevel, partial.highestLevel ?? 1),
    resourcesHarvested: Math.max(current.resourcesHarvested, partial.resourcesHarvested ?? 0),
    missionsCompleted: Math.max(current.missionsCompleted, partial.missionsCompleted ?? 0),
    savesCreated: Math.max(current.savesCreated, partial.savesCreated ?? 0),
  };
  return saveCareerStats(updated);
}
