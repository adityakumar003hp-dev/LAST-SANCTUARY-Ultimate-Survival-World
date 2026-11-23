import { RadiantBounty, WeatherType } from '../types/game';

export const DAILY_BOUNTY_POOL: Omit<RadiantBounty, 'id' | 'current' | 'claimed' | 'completed'>[] = [
  {
    title: 'Brute Breaker',
    description: 'Eliminate 2 armored Brute or Juggernaut infected threatening the outskirts.',
    category: 'combat',
    targetType: 'kill_brute',
    target: 2,
    rewardXp: 240,
    rewardItems: [
      { itemId: 'metal_scrap', count: 10 },
      { itemId: 'crossbow_bolts', count: 16 },
    ],
  },
  {
    title: 'Deadeye Protocol',
    description: 'Score 5 precision headshots with ranged or melee strikes.',
    category: 'combat',
    targetType: 'kill_headshot',
    target: 5,
    rewardXp: 220,
    rewardItems: [
      { itemId: 'medkit', count: 1 },
      { itemId: 'crossbow_bolts', count: 20 },
    ],
  },
  {
    title: 'Perimeter Sweep',
    description: 'Clear 12 infected roaming near sanctuary supply corridors.',
    category: 'defense',
    targetType: 'kill_any',
    target: 12,
    rewardXp: 200,
    rewardItems: [
      { itemId: 'electronic_parts', count: 4 },
      { itemId: 'nails_bolts', count: 16 },
    ],
  },
  {
    title: 'Shoreline Angler',
    description: 'Catch 3 fresh fish from a river or coastline using a fishing rod.',
    category: 'survival',
    targetType: 'catch_fish',
    target: 3,
    rewardXp: 160,
    rewardItems: [
      { itemId: 'clean_water', count: 2 },
      { itemId: 'herb_stew', count: 1 },
    ],
  },
  {
    title: 'Munitions Prep',
    description: 'Craft ammunition or explosives at the sanctuary workbench.',
    category: 'salvage',
    targetType: 'craft_ammo',
    target: 2,
    rewardXp: 150,
    rewardItems: [
      { itemId: 'flashlight_battery', count: 2 },
      { itemId: 'bandage', count: 4 },
    ],
  },
  {
    title: 'Apex Quarantine Purge',
    description: 'Defeat 1 Mutated Alpha Boss wandering a quarantine anomaly zone.',
    category: 'boss',
    targetType: 'kill_boss',
    target: 1,
    rewardXp: 550,
    rewardItems: [
      { itemId: 'antibiotic_shot', count: 2 },
      { itemId: 'pipe_bomb', count: 2 },
      { itemId: 'electronic_parts', count: 8 },
    ],
  },
];

export function generateDailyBounties(dayCount: number): RadiantBounty[] {
  const offset = Math.max(0, dayCount - 1) % DAILY_BOUNTY_POOL.length;
  const picks: RadiantBounty[] = [];
  for (let i = 0; i < 3; i++) {
    const template = DAILY_BOUNTY_POOL[(offset + i * 2) % DAILY_BOUNTY_POOL.length];
    picks.push({
      ...template,
      id: `bounty_d${dayCount}_${i}_${template.targetType}`,
      current: 0,
      claimed: false,
      completed: false,
    });
  }
  return picks;
}

export interface RadioTransmission {
  id: string;
  frequency: string;
  callsign: string;
  channel: 'EMERGENCY' | 'WEATHER' | 'BOUNTY' | 'RAILWAY';
  message: string;
}

export function generateProceduralRadioBroadcast(params: {
  dayCount: number;
  biomeName: string;
  weather: WeatherType;
  isNight: boolean;
  isBloodMoon: boolean;
  hasActiveSupplyDrop: boolean;
  activeBossNearby: boolean;
}): RadioTransmission {
  const { dayCount, biomeName, weather, isNight, isBloodMoon, hasActiveSupplyDrop, activeBossNearby } = params;

  if (isBloodMoon) {
    return {
      id: `rad_bm_${dayCount}`,
      frequency: '104.7 MHz',
      callsign: 'WATCHTOWER ZERO',
      channel: 'EMERGENCY',
      message: `Blood Moon surge confirmed on Day ${dayCount}. Armored infected and Spitters advancing toward perimeter lights. Keep sentry turrets powered.`,
    };
  }

  if (activeBossNearby) {
    return {
      id: `rad_boss_${dayCount}`,
      frequency: '118.2 MHz',
      callsign: 'BIO-HAZARD RECON',
      channel: 'EMERGENCY',
      message: `Seismic bio-signature detected near ${biomeName}. Alpha Mutant roaming sector — equip Gas Mask and heavy ordnance before engagement.`,
    };
  }

  if (hasActiveSupplyDrop) {
    return {
      id: `rad_drop_${dayCount}`,
      frequency: '121.5 MHz',
      callsign: 'SKYLINE LOGISTICS',
      channel: 'BOUNTY',
      message: `Automated relief chute deployed over ${biomeName}. Follow the amber smoke flare before scavengers or infected converge on the crate.`,
    };
  }

  if (weather === 'toxic_fog') {
    return {
      id: `rad_tox_${dayCount}`,
      frequency: '98.4 MHz',
      callsign: 'METEO STATION 4',
      channel: 'WEATHER',
      message: `Spore-laden toxic inversion settling over ${biomeName}. Wear a charcoal-filtered Gas Mask outdoors to prevent radiation and viral buildup.`,
    };
  }

  if (weather === 'thunderstorm' || weather === 'blizzard' || weather === 'sandstorm') {
    return {
      id: `rad_wx_${dayCount}_${weather}`,
      frequency: '98.4 MHz',
      callsign: 'METEO STATION 4',
      channel: 'WEATHER',
      message: `Severe ${weather.replace('_', ' ')} front sweeping ${biomeName}. Seek insulated shelter or campfire warmth; rainwater cisterns are filling rapidly.`,
    };
  }

  const flavorPool: RadioTransmission[] = [
    {
      id: `rad_fl_1_${dayCount}`,
      frequency: '108.9 MHz',
      callsign: 'RAILWAY DISPATCH',
      channel: 'RAILWAY',
      message: `Day ${dayCount} corridor check: Express rail lines remain operational across the valley. Check Platform tickets if moving heavy salvage.`,
    },
    {
      id: `rad_fl_2_${dayCount}`,
      frequency: '101.3 MHz',
      callsign: 'SANCTUARY RELAY',
      channel: 'BOUNTY',
      message: `${isNight ? 'Nightfall' : 'Daylight'} telemetry from ${biomeName}: Check the Notice Board for fresh Bounty contracts and blueprint drops.`,
    },
    {
      id: `rad_fl_3_${dayCount}`,
      frequency: '112.0 MHz',
      callsign: 'OUTPOST ECHO',
      channel: 'EMERGENCY',
      message: `Reminder to survivors: Salvage excess gear at a Salvage Bench for spare circuits, and mount Suppressors to mask gunfire noise.`,
    },
  ];

  return flavorPool[dayCount % flavorPool.length];
}
