import { CraftingRecipe } from '../types/game';

export const RECIPES: CraftingRecipe[] = [
  // --- Basic Survival & Components ---
  {
    id: 'craft_nails',
    resultItemId: 'nails_bolts',
    resultCount: 8,
    category: 'construction',
    ingredients: [
      { itemId: 'metal_scrap', count: 1 },
    ],
    craftTimeSeconds: 1,
    description: 'Forge fasteners and heavy structural nails from salvaged sheet metal.',
  },
  {
    id: 'craft_bandage',
    resultItemId: 'bandage',
    resultCount: 2,
    category: 'medical',
    ingredients: [
      { itemId: 'cloth_fabric', count: 2 },
    ],
    craftTimeSeconds: 2,
    description: 'Weave clean antiseptic bandages from fibrous canvas fabric.',
  },
  {
    id: 'craft_medkit',
    resultItemId: 'medkit',
    resultCount: 1,
    category: 'medical',
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'bandage', count: 2 },
      { itemId: 'clean_water', count: 1 },
      { itemId: 'electronic_parts', count: 1 },
    ],
    craftTimeSeconds: 4,
    description: 'Advanced field trauma kit with coagulant injectors and wound clamps.',
  },

  // --- Tools ---
  {
    id: 'craft_stone_axe',
    resultItemId: 'stone_axe',
    resultCount: 1,
    category: 'tools',
    ingredients: [
      { itemId: 'wood', count: 4 },
      { itemId: 'stone', count: 3 },
      { itemId: 'nails_bolts', count: 2 },
    ],
    craftTimeSeconds: 3,
    description: 'Lumberjack axe for rapidly harvesting timber trees.',
  },
  {
    id: 'craft_stone_pickaxe',
    resultItemId: 'stone_pickaxe',
    resultCount: 1,
    category: 'tools',
    ingredients: [
      { itemId: 'wood', count: 4 },
      { itemId: 'stone', count: 5 },
      { itemId: 'nails_bolts', count: 2 },
    ],
    craftTimeSeconds: 3,
    description: 'Hardened pickaxe to quarry rocks and scrap metal.',
  },
  {
    id: 'craft_builder_hammer',
    resultItemId: 'builder_hammer',
    resultCount: 1,
    category: 'tools',
    ingredients: [
      { itemId: 'wood', count: 5 },
      { itemId: 'metal_scrap', count: 2 },
      { itemId: 'nails_bolts', count: 4 },
    ],
    craftTimeSeconds: 3,
    description: 'Reinforced engineer mallet to build, repair, and upgrade settlement fortifications.',
  },

  // --- Weapons & Defense ---
  {
    id: 'craft_stun_baton',
    resultItemId: 'stun_baton',
    resultCount: 1,
    category: 'defense',
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'metal_scrap', count: 5 },
      { itemId: 'electronic_parts', count: 3 },
      { itemId: 'nails_bolts', count: 4 },
    ],
    craftTimeSeconds: 5,
    description: 'Shockwave security baton designed to stagger and knock back hostile infected.',
  },
  {
    id: 'craft_pulse_crossbow',
    resultItemId: 'pulse_crossbow',
    resultCount: 1,
    category: 'defense',
    requiredStation: 'workbench',
    ingredients: [
      { itemId: 'wood', count: 8 },
      { itemId: 'metal_scrap', count: 4 },
      { itemId: 'cloth_fabric', count: 3 },
      { itemId: 'nails_bolts', count: 6 },
    ],
    craftTimeSeconds: 6,
    description: 'Silent mechanical crossbow engineered to eliminate threats from watchtowers.',
  },
  {
    id: 'craft_crossbow_bolts',
    resultItemId: 'crossbow_bolts',
    resultCount: 12,
    category: 'defense',
    ingredients: [
      { itemId: 'wood', count: 2 },
      { itemId: 'metal_scrap', count: 1 },
      { itemId: 'nails_bolts', count: 2 },
    ],
    craftTimeSeconds: 2,
    description: 'Aerodynamic steel-tipped arrows designed for high puncture damage.',
  },

  // --- Campfire Recipes ---
  {
    id: 'purify_water',
    resultItemId: 'clean_water',
    resultCount: 1,
    category: 'survival',
    requiredStation: 'campfire',
    ingredients: [
      { itemId: 'dirty_water', count: 1 },
      { itemId: 'wood', count: 1 },
    ],
    craftTimeSeconds: 3,
    description: 'Boil river water on the open flame to eradicate bacterial pathogens.',
  },
  {
    id: 'cook_berry_ration',
    resultItemId: 'canned_beans',
    resultCount: 1,
    category: 'survival',
    requiredStation: 'campfire',
    ingredients: [
      { itemId: 'wild_berries', count: 4 },
      { itemId: 'clean_water', count: 1 },
    ],
    craftTimeSeconds: 3,
    description: 'Simmer sweet wild berries into a hot nutrient-dense survival compote.',
  },
];
