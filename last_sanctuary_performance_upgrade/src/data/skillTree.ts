export interface TalentPerk {
  id: string;
  branch: 'combatant' | 'engineer' | 'pathfinder';
  name: string;
  description: string;
  cost: number;
  requiresId?: string;
  bonusSummary: string;
}

export const TALENT_PERKS: TalentPerk[] = [
  // Combatant branch
  {
    id: 'perk_quick_draw',
    branch: 'combatant',
    name: 'Quick Draw',
    description: '20% faster weapon swing and crossbow reload cadence.',
    cost: 1,
    bonusSummary: '+20% Attack Speed',
  },
  {
    id: 'perk_headhunter',
    branch: 'combatant',
    name: 'Headhunter',
    description: 'Critical headshots deal +40% bonus damage and recover 8 stamina.',
    cost: 1,
    requiresId: 'perk_quick_draw',
    bonusSummary: '+40% Headshot DMG',
  },
  {
    id: 'perk_iron_strike',
    branch: 'combatant',
    name: 'Iron Strike',
    description: 'Melee attacks deal +25% damage and double stagger knockback.',
    cost: 2,
    requiresId: 'perk_headhunter',
    bonusSummary: '+25% Melee & Knockback',
  },

  // Engineer branch
  {
    id: 'perk_scrap_recycler',
    branch: 'engineer',
    name: 'Scrap Recycler',
    description: 'Harvesting and salvaging yields +35% bonus metal & circuits.',
    cost: 1,
    bonusSummary: '+35% Salvage Yield',
  },
  {
    id: 'perk_turret_overclock',
    branch: 'engineer',
    name: 'Turret Overclock',
    description: 'Automated Sentry Turrets deal +35% damage and consume 30% less power.',
    cost: 1,
    requiresId: 'perk_scrap_recycler',
    bonusSummary: '+35% Turret DPS',
  },
  {
    id: 'perk_reinforced_alloy',
    branch: 'engineer',
    name: 'Reinforced Alloy',
    description: 'Newly placed walls, gates, and turrets gain +40% structural integrity.',
    cost: 2,
    requiresId: 'perk_turret_overclock',
    bonusSummary: '+40% Structure HP',
  },

  // Pathfinder branch
  {
    id: 'perk_ghost_step',
    branch: 'pathfinder',
    name: 'Ghost Step',
    description: 'Crouching reduces zombie detection radius by 45% and noise by 50%.',
    cost: 1,
    bonusSummary: '-45% Stealth Detection',
  },
  {
    id: 'perk_thermal_endurance',
    branch: 'pathfinder',
    name: 'Thermal Endurance',
    description: '50% resistance to blizzards, sandstorms, and flashlight battery drain.',
    cost: 1,
    requiresId: 'perk_ghost_step',
    bonusSummary: '+50% Weather & Battery Resist',
  },
  {
    id: 'perk_fisherman_luck',
    branch: 'pathfinder',
    name: 'Pathfinder Instinct',
    description: 'Doubles fishing catch yield and grants +25% sprint stamina recovery.',
    cost: 2,
    requiresId: 'perk_thermal_endurance',
    bonusSummary: '2x Fishing & +25% Stamina',
  },
];
