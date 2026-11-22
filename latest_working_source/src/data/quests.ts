import { Quest } from '../types/game';

export const INITIAL_QUESTS: Quest[] = [
  {
    id: 'chapter_1',
    chapter: 1,
    title: 'Chapter 1: Outpost 7 Haven',
    description: 'You have arrived at Sanctuary Outpost 7—a fortified ranger clearing with a log cabin, perimeter palisade, water cistern, and lookout tower. Inspect its facilities, gather local resources, and prepare for the night horde.',
    completed: false,
    rewards: {
      xp: 300,
      items: [
        { itemId: 'canned_beans', count: 3 },
        { itemId: 'clean_water', count: 2 },
        { itemId: 'crop_seeds', count: 4 },
      ],
    },
    objectives: [
      {
        id: 'read_notice_board',
        description: 'Read the Sanctuary Notice Board [E] near the cabin entrance',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'open_storage_stash',
        description: 'Open the indoor Storage Chest [E] to collect supplies',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'gather_wood',
        description: 'Harvest 8 Timber Wood from nearby forest trees',
        current: 0,
        target: 8,
        completed: false,
      },
      {
        id: 'tend_farm',
        description: 'Tend or plant crops at the Cultivated Farm Plot [E]',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'rest_in_bed',
        description: 'Rest in the Cabin Survivor Bed [E] to recover vitals',
        current: 0,
        target: 1,
        completed: false,
      },
    ],
  },
  {
    id: 'chapter_2',
    chapter: 2,
    title: 'Chapter 2: The Red Moon Rises',
    description: 'The infected sense fresh warmth and human presence. Reinforce your sanctuary perimeter with lethal spikes, an operable gate, and a defensive weapon before nightfall.',
    completed: false,
    rewards: {
      xp: 500,
      items: [
        { itemId: 'electronic_parts', count: 6 },
        { itemId: 'medkit', count: 2 },
        { itemId: 'crossbow_bolts', count: 24 },
      ],
    },
    objectives: [
      {
        id: 'build_gate',
        description: 'Construct a Sanctuary Gate with latch mechanism',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'build_spikes',
        description: 'Deploy 2 Defensive Spike Traps on perimeter paths',
        current: 0,
        target: 2,
        completed: false,
      },
      {
        id: 'craft_weapon',
        description: 'Craft a Kinetic Shock Baton or Composite Crossbow',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'survive_night',
        description: 'Survive the Night Horde assault until 06:00 dawn',
        current: 0,
        target: 1,
        completed: false,
      },
    ],
  },
  {
    id: 'chapter_3',
    chapter: 3,
    title: 'Chapter 3: Fortress of Hope',
    description: 'Expand your compound into a beacon of human resilience. Build an elevated watchtower for vantage fire, automate clean water gathering, and establish an illuminated perimeter.',
    completed: false,
    rewards: {
      xp: 1000,
      items: [
        { itemId: 'medkit', count: 4 },
        { itemId: 'pulse_crossbow', count: 1 },
      ],
    },
    objectives: [
      {
        id: 'build_watchtower',
        description: 'Erect an Elevated Watchtower structure',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'build_lights',
        description: 'Place 2 Perimeter Torches or Solar Spotlights',
        current: 0,
        target: 2,
        completed: false,
      },
      {
        id: 'build_workbench',
        description: 'Build a Master Artisan Workbench',
        current: 0,
        target: 1,
        completed: false,
      },
      {
        id: 'survive_hordes',
        description: 'Successfully defend Sanctuary through 3 Night Hordes',
        current: 0,
        target: 3,
        completed: false,
      },
    ],
  },
  {
    id: 'chapter_4',
    chapter: 4,
    title: 'Chapter 4: The Living Biosphere',
    description: 'The meteorite fallout has catalyzed rapid evolutionary adaptation across the valley. Study living fauna with your Bio-Scanner [Z], observe autonomous predator-prey hunting chains, and document new genetic traits.',
    completed: false,
    rewards: {
      xp: 1200,
      items: [
        { itemId: 'medkit', count: 3 },
        { itemId: 'canned_beans', count: 5 },
        { itemId: 'electronic_parts', count: 8 },
      ],
    },
    objectives: [
      {
        id: 'study_wildlife',
        description: 'Scan and log 3 living organisms with the Bio-Scanner [Z / E]',
        current: 0,
        target: 3,
        completed: false,
      },
      {
        id: 'observe_dinosaur',
        description: 'Locate Prehistoric Dinosaur Valley or observe an apex predator',
        current: 0,
        target: 1,
        completed: false,
      },
    ],
  },
];
