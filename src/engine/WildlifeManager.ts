/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTerrainHeight } from './Terrain';
import { RailwayNetworkGenerator } from './world/RailwayNetworkGenerator';
import { isProtectedSpawnZone } from './world/ProtectedSpawnZones';
import { CompanionState, EcosystemDossier, EcosystemMetrics } from '../types/game';
import { soundEngine } from '../utils/audio';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { getDinosaurSkinPBR, getFurPBR, getRockPBR, getSoftParticleTexture } from '../utils/proceduralTextures';

export type WildlifeKind = 'mammal' | 'bird' | 'dinosaur' | 'aquatic' | 'reptile' | 'amphibian' | 'insect' | 'rare';
export type AnimalDiet = 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore';
export type AnimalTrophic = 'apex' | 'predator' | 'grazer' | 'small_prey' | 'bird' | 'aquatic';

export type AnimalBehaviorState =
  | 'roam'
  | 'graze'
  | 'drink'
  | 'rest'
  | 'stalk'
  | 'hunt'
  | 'attack'
  | 'defend'
  | 'feed'
  | 'flee'
  | 'herd'
  | 'courtship'
  | 'mating'
  | 'nursing'
  | 'protect_young'
  | 'stunned'
  | 'dead'
  | 'companion_follow'
  | 'companion_stay'
  | 'companion_defend';

export interface EvolutionaryGenome {
  generation: number;
  speedMod: number;        // 0.85 - 1.45
  sizeMod: number;         // 0.80 - 1.35
  staminaMod: number;      // 0.80 - 1.40
  aggressionMod: number;   // 0.50 - 1.60
  camouflageHue: number;   // Color variant
  adaptationTrait: string; // e.g. "Apex Vigor", "Ghost Stalk", "Titan Carapace"
  adaptationDesc: string;
}

export interface WildlifeSpecies {
  id: string;
  name: string;
  scientificName: string;
  kind: WildlifeKind;
  diet: AnimalDiet;
  trophic: AnimalTrophic;
  biomes: string[];
  color: number;
  scale: number;
  speed: number;
  attackDamage: number;
  temperament: 'shy' | 'neutral' | 'territorial';
  isTamable?: boolean;
  preyList?: string[];
  vocalPitch?: number;
}

export interface WildlifeAgent {
  id: string;
  species: WildlifeSpecies;
  group: THREE.Group;
  velocity: THREE.Vector3;
  target: THREE.Vector3;
  state: AnimalBehaviorState;
  stateTimer: number;
  health: number;
  maxHealth: number;
  hunger: number;           // 0-100 (100 = satiated, 0 = starving)
  thirst: number;           // 0-100
  energy: number;           // 0-100 (stamina)
  age: number;              // Seconds alive
  gender: 'male' | 'female';
  isJuvenile?: boolean;
  parentAgentId?: string;
  genome: EvolutionaryGenome;
  targetPreyId?: string | null;
  targetMateId?: string | null;
  matingCooldown: number;   // Seconds until ready to mate again
  isPregnant?: boolean;
  pregnantTimer?: number;
  growthTimer?: number;
  killsCount: number;
  offspringCount: number;
  isTamed?: boolean;
  deathTimer?: number;
  infectionStage?: 'normal' | 'stunned' | 'zombie';
  infectionTimer?: number;
}

// 40+ dynamic species categorized with realistic trophic links
export const WILDLIFE_SPECIES: WildlifeSpecies[] = [
  // --- PREHISTORIC DINOSAURS ---
  {
    id: 'trex',
    name: 'Tyrannosaurus Rex',
    scientificName: 'Tyrannosaurus rex (Theropoda)',
    kind: 'dinosaur',
    diet: 'carnivore',
    trophic: 'apex',
    biomes: ['dinosaur_valley', 'volcanic_wastes', 'ashlands'],
    color: 0x7a3e2b,
    scale: 2.3,
    speed: 5.8,
    attackDamage: 75,
    temperament: 'territorial',
    preyList: ['triceratops', 'stegosaurus', 'longneck', 'buffalo', 'deer', 'zebra'],
    vocalPitch: 55,
  },
  {
    id: 'raptor',
    name: 'Velociraptor',
    scientificName: 'Velociraptor mongoliensis (Dromaeosauridae)',
    kind: 'dinosaur',
    diet: 'carnivore',
    trophic: 'predator',
    biomes: ['dinosaur_valley', 'dense_forest', 'valley', 'tropical_jungle', 'savannah', 'ancient_forest', 'bamboo_forest'],
    color: 0x55704a,
    scale: 1.05,
    speed: 6.5,
    attackDamage: 28,
    temperament: 'territorial',
    isTamable: true,
    preyList: ['deer', 'zebra', 'boar', 'rabbit', 'goat'],
    vocalPitch: 180,
  },
  {
    id: 'triceratops',
    name: 'Triceratops',
    scientificName: 'Triceratops horridus (Ceratopsidae)',
    kind: 'dinosaur',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['dinosaur_valley', 'green_plains', 'valley', 'savannah', 'alpine_meadow'],
    color: 0x69734b,
    scale: 1.7,
    speed: 2.8,
    attackDamage: 45, // Defensive counter-charge
    temperament: 'neutral',
    vocalPitch: 90,
  },
  {
    id: 'stegosaurus',
    name: 'Stegosaurus',
    scientificName: 'Stegosaurus stenops (Thyreophora)',
    kind: 'dinosaur',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['dinosaur_valley', 'dense_forest', 'green_plains', 'tropical_jungle', 'ancient_forest'],
    color: 0x6c7650,
    scale: 1.55,
    speed: 2.5,
    attackDamage: 50, // Thagomizer tail swing
    temperament: 'neutral',
    vocalPitch: 85,
  },
  {
    id: 'longneck',
    name: 'Brachiosaurus',
    scientificName: 'Brachiosaurus altithorax (Sauropoda)',
    kind: 'dinosaur',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['dinosaur_valley', 'green_plains', 'valley', 'savannah', 'waterfall_valley'],
    color: 0x8c9871,
    scale: 2.4,
    speed: 1.9,
    attackDamage: 30,
    temperament: 'neutral',
    vocalPitch: 60,
  },
  {
    id: 'pteranodon',
    name: 'Pteranodon',
    scientificName: 'Pteranodon longiceps (Pterosauria)',
    kind: 'bird',
    diet: 'piscivore',
    trophic: 'bird',
    biomes: ['dinosaur_valley', 'rocky_canyon', 'mountain_range', 'snow_peaks'],
    color: 0x9c5c3d,
    scale: 1.5,
    speed: 9.0,
    attackDamage: 22,
    temperament: 'neutral',
    preyList: ['fish', 'reef_fish'],
    vocalPitch: 320,
  },

  // --- APEX & CARNIVOROUS MAMMALS ---
  {
    id: 'lion',
    name: 'African Lion',
    scientificName: 'Panthera leo (Felidae)',
    kind: 'mammal',
    diet: 'carnivore',
    trophic: 'apex',
    biomes: ['savannah', 'green_plains'],
    color: 0xb58a4c,
    scale: 1.3,
    speed: 5.6,
    attackDamage: 38,
    temperament: 'territorial',
    preyList: ['zebra', 'buffalo', 'giraffe', 'deer'],
    vocalPitch: 110,
  },
  {
    id: 'tiger',
    name: 'Bengal Tiger',
    scientificName: 'Panthera tigris (Felidae)',
    kind: 'mammal',
    diet: 'carnivore',
    trophic: 'apex',
    biomes: ['tropical_jungle', 'dense_forest', 'bamboo_forest'],
    color: 0xc66a22,
    scale: 1.25,
    speed: 5.8,
    attackDamage: 40,
    temperament: 'territorial',
    preyList: ['deer', 'boar', 'monkey', 'goat'],
    vocalPitch: 115,
  },
  {
    id: 'panther',
    name: 'Black Panther',
    scientificName: 'Panthera pardus (Felidae)',
    kind: 'mammal',
    diet: 'carnivore',
    trophic: 'predator',
    biomes: ['tropical_jungle', 'deep_swamp', 'ancient_forest'],
    color: 0x1d1c1c,
    scale: 1.15,
    speed: 6.2,
    attackDamage: 34,
    temperament: 'territorial',
    preyList: ['deer', 'monkey', 'boar', 'duck'],
    vocalPitch: 130,
  },
  {
    id: 'wolf',
    name: 'Grey Wolf',
    scientificName: 'Canis lupus (Canidae)',
    kind: 'mammal',
    diet: 'carnivore',
    trophic: 'predator',
    biomes: ['dense_forest', 'mountain_range', 'snow_peaks', 'taiga', 'tundra', 'ancient_forest'],
    color: 0x777b80,
    scale: 0.85,
    speed: 5.5,
    attackDamage: 22,
    temperament: 'territorial',
    isTamable: true,
    preyList: ['deer', 'rabbit', 'fox', 'boar', 'goat'],
    vocalPitch: 220,
  },
  {
    id: 'bear',
    name: 'Grizzly Bear',
    scientificName: 'Ursus arctos horribilis (Ursidae)',
    kind: 'mammal',
    diet: 'omnivore',
    trophic: 'apex',
    biomes: ['dense_forest', 'mountain_range', 'taiga', 'ancient_forest'],
    color: 0x493326,
    scale: 1.4,
    speed: 3.8,
    attackDamage: 44,
    temperament: 'territorial',
    preyList: ['deer', 'boar', 'fish'],
    vocalPitch: 95,
  },

  // --- HERBIVORES & PREY SPECIES ---
  {
    id: 'deer',
    name: 'Red Deer',
    scientificName: 'Cervus elaphus (Cervidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['dense_forest', 'green_plains', 'valley', 'tropical_jungle', 'ancient_forest', 'bamboo_forest', 'savannah', 'waterfall_valley'],
    color: 0x8a5735,
    scale: 1.0,
    speed: 4.8,
    attackDamage: 12,
    temperament: 'shy',
    vocalPitch: 380,
  },
  {
    id: 'zebra',
    name: 'Plains Zebra',
    scientificName: 'Equus quagga (Equidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['savannah', 'green_plains'],
    color: 0xd8d3c8,
    scale: 1.0,
    speed: 5.0,
    attackDamage: 15,
    temperament: 'shy',
    vocalPitch: 420,
  },
  {
    id: 'horse',
    name: 'Wild Mustang',
    scientificName: 'Equus caballus (Equidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['green_plains', 'savannah', 'alpine_meadow', 'waterfall_valley'],
    color: 0x79533b,
    scale: 1.1,
    speed: 6.2,
    attackDamage: 18,
    temperament: 'shy',
    isTamable: true,
    vocalPitch: 400,
  },
  {
    id: 'elephant',
    name: 'Asian Elephant',
    scientificName: 'Elephas maximus (Elephantidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['green_plains', 'wetlands', 'tropical_jungle'],
    color: 0x77766f,
    scale: 1.95,
    speed: 2.8,
    attackDamage: 55, // Trunk sweep
    temperament: 'neutral',
    vocalPitch: 70,
  },
  {
    id: 'giraffe',
    name: 'Savannah Giraffe',
    scientificName: 'Giraffa camelopardalis (Giraffidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['savannah'],
    color: 0xb98b48,
    scale: 1.7,
    speed: 3.5,
    attackDamage: 30,
    temperament: 'neutral',
    vocalPitch: 200,
  },
  {
    id: 'buffalo',
    name: 'Wild Water Buffalo',
    scientificName: 'Bubalus arnee (Bovidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['savannah', 'wetlands', 'mangrove_delta', 'deep_swamp'],
    color: 0x403b35,
    scale: 1.35,
    speed: 3.2,
    attackDamage: 38,
    temperament: 'territorial',
    vocalPitch: 120,
  },
  {
    id: 'boar',
    name: 'Wild Boar',
    scientificName: 'Sus scrofa (Suidae)',
    kind: 'mammal',
    diet: 'omnivore',
    trophic: 'grazer',
    biomes: ['dense_forest', 'wetlands', 'tropical_jungle', 'mangrove_delta', 'deep_swamp'],
    color: 0x514039,
    scale: 0.8,
    speed: 4.1,
    attackDamage: 24,
    temperament: 'territorial',
    vocalPitch: 260,
  },
  {
    id: 'fox',
    name: 'Red Fox',
    scientificName: 'Vulpes vulpes (Canidae)',
    kind: 'mammal',
    diet: 'omnivore',
    trophic: 'small_prey',
    biomes: ['dense_forest', 'green_plains', 'valley', 'ancient_forest', 'bamboo_forest'],
    color: 0xb65d25,
    scale: 0.6,
    speed: 4.8,
    attackDamage: 12,
    temperament: 'shy',
    isTamable: true,
    preyList: ['rabbit', 'frog'],
    vocalPitch: 500,
  },
  {
    id: 'monkey',
    name: 'Tree Macaque',
    scientificName: 'Macaca mulatta (Cercopithecidae)',
    kind: 'mammal',
    diet: 'omnivore',
    trophic: 'small_prey',
    biomes: ['tropical_jungle', 'bamboo_forest', 'ancient_forest'],
    color: 0x8b654a,
    scale: 0.55,
    speed: 4.5,
    attackDamage: 8,
    temperament: 'shy',
    vocalPitch: 750,
  },

  // --- BIRDS ---
  {
    id: 'eagle',
    name: 'Golden Eagle',
    scientificName: 'Aquila chrysaetos (Accipitridae)',
    kind: 'bird',
    diet: 'carnivore',
    trophic: 'bird',
    biomes: ['mountain_range', 'snow_peaks', 'valley', 'alpine_meadow', 'tundra', 'rocky_canyon'],
    color: 0x8b6844,
    scale: 0.75,
    speed: 8.8,
    attackDamage: 25,
    temperament: 'shy',
    preyList: ['rabbit', 'fish', 'frog'],
    vocalPitch: 1100,
  },
  {
    id: 'parrot',
    name: 'Scarlet Macaw',
    scientificName: 'Ara macao (Psittacidae)',
    kind: 'bird',
    diet: 'herbivore',
    trophic: 'bird',
    biomes: ['dense_forest', 'wetlands', 'tropical_jungle', 'mangrove_delta'],
    color: 0xd52c24,
    scale: 0.45,
    speed: 7.4,
    attackDamage: 5,
    temperament: 'shy',
    isTamable: true,
    vocalPitch: 1400,
  },
  {
    id: 'duck',
    name: 'Wild Mallard',
    scientificName: 'Anas platyrhynchos (Anatidae)',
    kind: 'bird',
    diet: 'herbivore',
    trophic: 'bird',
    biomes: ['river_basin', 'lake_district', 'wetlands', 'mangrove_delta', 'coral_coast', 'waterfall_valley'],
    color: 0x55765a,
    scale: 0.4,
    speed: 4.8,
    attackDamage: 4,
    temperament: 'shy',
    vocalPitch: 650,
  },
  {
    id: 'flamingo',
    name: 'Greater Flamingo',
    scientificName: 'Phoenicopterus roseus (Phoenicopteridae)',
    kind: 'bird',
    diet: 'herbivore',
    trophic: 'bird',
    biomes: ['wetlands', 'mangrove_delta', 'coral_coast'],
    color: 0xe58b9e,
    scale: 0.75,
    speed: 5.6,
    attackDamage: 6,
    temperament: 'shy',
    vocalPitch: 800,
  },

  // --- AQUATIC & REPTILIAN ---
  {
    id: 'shark',
    name: 'Reef Shark',
    scientificName: 'Carcharhinus perezi (Carcharhinidae)',
    kind: 'aquatic',
    diet: 'piscivore',
    trophic: 'apex',
    biomes: ['coral_coast', 'coastline', 'island'],
    color: 0x596b78,
    scale: 1.2,
    speed: 5.2,
    attackDamage: 38,
    temperament: 'territorial',
    preyList: ['reef_fish', 'turtle'],
    vocalPitch: 80,
  },
  {
    id: 'dolphin',
    name: 'Bottlenose Dolphin',
    scientificName: 'Tursiops truncatus (Delphinidae)',
    kind: 'aquatic',
    diet: 'piscivore',
    trophic: 'aquatic',
    biomes: ['coral_coast', 'coastline', 'island'],
    color: 0x658a9b,
    scale: 1.0,
    speed: 5.4,
    attackDamage: 15,
    temperament: 'neutral',
    vocalPitch: 1200,
  },
  {
    id: 'turtle',
    name: 'Sea Turtle',
    scientificName: 'Chelonia mydas (Cheloniidae)',
    kind: 'aquatic',
    diet: 'herbivore',
    trophic: 'aquatic',
    biomes: ['river_basin', 'lake_district', 'wetlands', 'mangrove_delta', 'coral_coast', 'island'],
    color: 0x456b4b,
    scale: 0.55,
    speed: 1.6,
    attackDamage: 8,
    temperament: 'shy',
    vocalPitch: 300,
  },
  {
    id: 'crocodile',
    name: 'Saltwater Crocodile',
    scientificName: 'Crocodylus porosus (Crocodylidae)',
    kind: 'reptile',
    diet: 'carnivore',
    trophic: 'apex',
    biomes: ['wetlands', 'mangrove_delta', 'coral_coast', 'deep_swamp'],
    color: 0x52614b,
    scale: 1.25,
    speed: 2.8,
    attackDamage: 45,
    temperament: 'territorial',
    preyList: ['deer', 'zebra', 'buffalo', 'duck', 'turtle'],
    vocalPitch: 75,
  },

  // --- SMALL MAMMALS & GRAZERS ---
  {
    id: 'rabbit',
    name: 'Cottontail Rabbit',
    scientificName: 'Sylvilagus floridanus (Leporidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'small_prey',
    biomes: ['green_plains', 'dense_forest', 'valley', 'ancient_forest', 'alpine_meadow'],
    color: 0x9e8568,
    scale: 0.35,
    speed: 5.2,
    attackDamage: 2,
    temperament: 'shy',
    isTamable: true,
    vocalPitch: 900,
  },
  {
    id: 'sheep',
    name: 'Domestic Sheep',
    scientificName: 'Ovis aries (Bovidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['green_plains', 'alpine_meadow', 'valley'],
    color: 0xe6e4db,
    scale: 0.85,
    speed: 3.2,
    attackDamage: 8,
    temperament: 'shy',
    isTamable: true,
    vocalPitch: 350,
  },
  {
    id: 'goat',
    name: 'Mountain Goat',
    scientificName: 'Oreamnos americanus (Bovidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['mountain_range', 'snow_peaks', 'alpine_meadow', 'rocky_canyon'],
    color: 0xf0efe8,
    scale: 0.9,
    speed: 4.2,
    attackDamage: 14,
    temperament: 'neutral',
    isTamable: true,
    vocalPitch: 420,
  },
  {
    id: 'cow',
    name: 'Pasture Cow',
    scientificName: 'Bos taurus (Bovidae)',
    kind: 'mammal',
    diet: 'herbivore',
    trophic: 'grazer',
    biomes: ['green_plains', 'valley', 'alpine_meadow'],
    color: 0x242424,
    scale: 1.3,
    speed: 2.6,
    attackDamage: 20,
    temperament: 'neutral',
    vocalPitch: 150,
  },

  // --- AQUATIC & AMPHIBIAN ---
  {
    id: 'fish',
    name: 'River Salmon',
    scientificName: 'Salmo salar (Salmonidae)',
    kind: 'aquatic',
    diet: 'herbivore',
    trophic: 'aquatic',
    biomes: ['river_basin', 'lake_district', 'waterfall_valley'],
    color: 0x5a7d8a,
    scale: 0.35,
    speed: 3.8,
    attackDamage: 1,
    temperament: 'shy',
    vocalPitch: 1200,
  },
  {
    id: 'reef_fish',
    name: 'Coral Reef Fish',
    scientificName: 'Chaetodontidae (Perciformes)',
    kind: 'aquatic',
    diet: 'herbivore',
    trophic: 'aquatic',
    biomes: ['coral_coast', 'coastline', 'island'],
    color: 0xe6a122,
    scale: 0.3,
    speed: 3.6,
    attackDamage: 1,
    temperament: 'shy',
    vocalPitch: 1300,
  },
  {
    id: 'frog',
    name: 'Tree Frog',
    scientificName: 'Hyla arborea (Hylidae)',
    kind: 'amphibian',
    diet: 'herbivore',
    trophic: 'small_prey',
    biomes: ['wetlands', 'mangrove_delta', 'tropical_jungle', 'river_basin', 'deep_swamp'],
    color: 0x3cb043,
    scale: 0.25,
    speed: 2.8,
    attackDamage: 1,
    temperament: 'shy',
    vocalPitch: 1400,
  },
];

// Reusable calculation vectors to guarantee zero garbage-collection allocations in loop
const _tempVecA = new THREE.Vector3();
const _tempVecB = new THREE.Vector3();
const _tempVecC = new THREE.Vector3();
const _tempDir = new THREE.Vector3();

export class WildlifeManager {
  private scene: THREE.Scene;
  private agents = new Map<string, WildlifeAgent>();
  public get creatures(): WildlifeAgent[] {
    return Array.from(this.agents.values());
  }
  private seed: number;
  private spawnClock = 0;
  private maxAgents = 22; // Rich active population near player

  // Ecosystem Simulation Metrics
  public metrics: EcosystemMetrics = {
    totalOrganisms: 0,
    predatorCount: 0,
    herbivoreCount: 0,
    totalBirths: 0,
    totalPredations: 0,
    highestGeneration: 1,
  };

  // Tamed companion state
  public companionState: CompanionState | null = null;
  public companionAgentId: string | null = null;

  // Particle systems for biological feedback (mating glow, feeding blood)
  private particleGroup: THREE.Group;
  private feedingParticles: THREE.Points | null = null;
  private matingParticles: THREE.Points | null = null;
  private particleTimer = 0;

  // Spatial audio listener tracking
  private lastPlayerPos = new THREE.Vector3();
  private lastPlayerYaw = 0;
  private lastHour = 12.0;
  private isDusk = false;

  constructor(scene: THREE.Scene, seed: number) {
    this.scene = scene;
    this.seed = seed;
    this.particleGroup = new THREE.Group();
    this.particleGroup.name = 'ecosystem_particles';
    this.scene.add(this.particleGroup);
    this.initParticleSystems();
  }

  private initParticleSystems() {
    const softTex = getSoftParticleTexture();
    // Mating Heart / Life Glow Particles
    const mCount = 20;
    const mGeo = new THREE.BufferGeometry();
    const mPos = new Float32Array(mCount * 3);
    for (let i = 0; i < mCount * 3; i++) mPos[i] = 0;
    mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
    const mMat = new THREE.PointsMaterial({
      color: 0xff66cc,
      size: 0.42,
      map: softTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.matingParticles = new THREE.Points(mGeo, mMat);
    this.particleGroup.add(this.matingParticles);

    // Feeding Blood / Bite Impact Particles
    const fCount = 24;
    const fGeo = new THREE.BufferGeometry();
    const fPos = new Float32Array(fCount * 3);
    for (let i = 0; i < fCount * 3; i++) fPos[i] = 0;
    fGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
    const fMat = new THREE.PointsMaterial({
      color: 0x991111,
      size: 0.36,
      map: softTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.feedingParticles = new THREE.Points(fGeo, fMat);
    this.particleGroup.add(this.feedingParticles);
  }

  public update(
    delta: number,
    player: THREE.Vector3,
    biomeAt: (x: number, z: number) => string,
    isNight: boolean,
    playerYaw: number = 0,
    hour: number = 12.0,
    onOrganismConverted?: (agent: WildlifeAgent) => void
  ) {
    this.lastPlayerPos.copy(player);
    this.lastPlayerYaw = playerYaw;
    this.lastHour = hour;
    this.isDusk = hour >= 17.5 && hour < 21.0;

    this.particleTimer += delta;

    // Periodic population census & ecological spawning
    this.spawnClock += delta;
    if (this.spawnClock > 3.5 && this.agents.size < this.maxAgents) {
      this.spawnClock = 0;
      this.spawnAround(player, biomeAt, isNight);
    }

    // Dynamic metrics recalculation
    let predators = 0;
    let herbivores = 0;

    // Process all autonomous living agents
    for (const [id, a] of this.agents) {
      // 1. Companion Agent update (if tamed)
      if (a.isTamed) {
        this.updateCompanionAgent(a, delta, player);
        continue;
      }

      // Count trophic types
      if (a.species.diet === 'carnivore') predators++;
      else herbivores++;

      const dx = a.group.position.x - player.x;
      const dz = a.group.position.z - player.z;
      const distSqToPlayer = dx * dx + dz * dz;

      // Despawn far agents to conserve memory & CPU (unless it has young; 115^2 = 13225)
      if (distSqToPlayer > 13225 && !a.isJuvenile) {
        this.disposeAgent(id, a);
        continue;
      }

      // 2. Biological Need Depletion
      const isMoving = a.state !== 'rest' && a.state !== 'dead' && a.state !== 'graze' && a.state !== 'drink';
      const isSprinting = a.state === 'hunt' || a.state === 'flee';

      a.age += delta;
      a.hunger = Math.max(0, a.hunger - delta * (isSprinting ? 0.7 : isMoving ? 0.25 : 0.1));
      a.thirst = Math.max(0, a.thirst - delta * 0.18);
      a.energy = Math.max(0, Math.min(100, a.energy + delta * (isSprinting ? -3.0 : isMoving ? -0.3 : 2.5)));
      a.matingCooldown = Math.max(0, a.matingCooldown - delta);

      // Gestation & Egg Nesting Check
      if (a.isPregnant && a.pregnantTimer !== undefined) {
        a.pregnantTimer -= delta;
        if (a.pregnantTimer <= 0) {
          this.giveBirthToOffspring(a);
        }
      }

      // Juvenile Growth maturation
      if (a.isJuvenile && a.growthTimer !== undefined) {
        a.growthTimer -= delta;
        if (a.growthTimer <= 0) {
          a.isJuvenile = false;
          // Scale smoothly to adult size
          a.group.scale.setScalar(a.species.scale * a.genome.sizeMod);
        }
      }

      // Handle Death / Smooth Carcass collapse & decay
      if (a.state === 'dead') {
        a.deathTimer = (a.deathTimer || 0) + delta;
        const collapseT = Math.min(1, a.deathTimer / 0.45);
        const easedCollapse = 1 - Math.pow(1 - collapseT, 3);
        a.group.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2.2, easedCollapse);
        a.group.rotation.x = THREE.MathUtils.lerp(0, 0.14, easedCollapse);
        if (a.deathTimer > 15.0) {
          a.group.position.y -= delta * 0.35;
        }
        if (a.deathTimer > 18.0) {
          this.disposeAgent(id, a);
        }
        continue;
      }

      // Handle 60-second stunned infection conversion into zombie
      if (a.state === 'stunned' || a.infectionStage === 'stunned') {
        a.infectionTimer = Math.max(0, (a.infectionTimer ?? 60) - delta);
        // Convulsing/trembling stunned pose while turning
        const shiver = Math.sin(this.particleTimer * 24 + id.charCodeAt(0)) * 0.09;
        a.group.rotation.z = THREE.MathUtils.damp(a.group.rotation.z, 0.22 + shiver, 8, delta);
        a.group.rotation.x = THREE.MathUtils.damp(a.group.rotation.x, 0.16, 6, delta);
        const head = a.group.getObjectByName('head');
        if (head) {
          head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0.42, 6, delta);
          head.rotation.y = shiver * 1.6;
        }
        if (a.infectionTimer <= 0) {
          a.infectionStage = 'zombie';
          onOrganismConverted?.(a);
          this.disposeAgent(id, a);
        }
        continue;
      }

      // Decrement behavior timer
      a.stateTimer -= delta;

      // 3. Autonomous Decision Making (Distance-tiered LOD: distant >65m tick simplified)
      const distToPlayer = Math.sqrt(distSqToPlayer);
      const isDistantLod = distSqToPlayer > 4225;
      if (!isDistantLod || (Math.floor(this.particleTimer * 10 + a.age * 3) % 3 === 0)) {
        this.evaluateAutonomousBrain(a, delta, player, distToPlayer, isNight);
      }

      // 4. Locomotion & Physics Integration
      this.applyAgentLocomotion(a, delta);
    }

    this.metrics.totalOrganisms = this.agents.size;
    this.metrics.predatorCount = predators;
    this.metrics.herbivoreCount = herbivores;
  }

  // --- AUTONOMOUS ECOSYSTEM BRAIN ---
  private evaluateAutonomousBrain(
    a: WildlifeAgent,
    delta: number,
    player: THREE.Vector3,
    distToPlayer: number,
    isNight: boolean
  ) {
    const isCarnivore = a.species.diet === 'carnivore';

    // A. Player Interaction (Territorial vs Shy)
    if (distToPlayer < 12 && a.species.temperament === 'territorial' && a.state !== 'attack' && a.state !== 'hunt' && a.state !== 'feed') {
      a.state = 'hunt';
      a.target.copy(player);
      a.stateTimer = 6.0;
      const isApex = a.species.diet === 'carnivore' && (a.species.scale >= 1.4 || a.species.id.includes('rex') || a.species.id.includes('spino') || a.species.id.includes('carno'));
      soundEngine.playSpatialCreatureRoar(a.group.position, player, this.lastPlayerYaw, a.species.vocalPitch || 80, 1.4, isNight, this.isDusk, isApex);
      return;
    } else if (distToPlayer < 14 && a.species.temperament === 'shy' && a.state !== 'flee') {
      a.state = 'flee';
      a.stateTimer = 5.0;
      _tempDir.subVectors(a.group.position, player).setY(0).normalize();
      a.target.copy(a.group.position).addScaledVector(_tempDir, 35);
      soundEngine.playSpatialCreatureCall(a.group.position, player, this.lastPlayerYaw, a.species.kind === 'bird', a.species.vocalPitch || 400, isNight);
      return;
    }

    // B. Predator Hunting & Stalking Loop
    if (isCarnivore) {
      if (a.state === 'feed') {
        // Eating carcass
        if (a.stateTimer <= 0) {
          a.hunger = 100;
          a.state = 'rest';
          a.stateTimer = 5.0;
        }
        return;
      }

      // If hungry or opportunistic, scan for prey species
      if ((a.hunger < 75 || a.state === 'stalk' || a.state === 'hunt') && a.state !== 'mating') {
        let nearestPrey: WildlifeAgent | null = null;
        let minPreyDistSq = 1444.0; // 38.0^2 = 1444.0

        for (const other of this.agents.values()) {
          if (other.id === a.id || other.state === 'dead' || other.species.diet === 'carnivore') continue;
          const dSq = a.group.position.distanceToSquared(other.group.position);
          if (dSq < minPreyDistSq) {
            minPreyDistSq = dSq;
            nearestPrey = other;
          }
        }

        if (nearestPrey) {
          a.targetPreyId = nearestPrey.id;

          if (minPreyDistSq > 256.0) { // 16.0^2 = 256.0
            // Stalking behavior: stealth slow approach
            a.state = 'stalk';
            a.target.copy(nearestPrey.group.position);
          } else {
            // High-speed Pursuit / Attack
            if (a.state !== 'hunt') {
              const isApex = a.species.diet === 'carnivore' && (a.species.scale >= 1.4 || a.species.id.includes('rex') || a.species.id.includes('spino') || a.species.id.includes('carno'));
              soundEngine.playSpatialCreatureRoar(a.group.position, player, this.lastPlayerYaw, a.species.vocalPitch || 70, 1.5, isNight, this.isDusk, isApex);
            }
            a.state = 'hunt';
            a.target.copy(nearestPrey.group.position);

            // Alert the prey so it flees!
            if (nearestPrey.state !== 'flee' && nearestPrey.state !== 'defend') {
              nearestPrey.state = 'flee';
              nearestPrey.stateTimer = 6.0;
              _tempDir.subVectors(nearestPrey.group.position, a.group.position).setY(0).normalize();
              nearestPrey.target.copy(nearestPrey.group.position).addScaledVector(_tempDir, 40);
              soundEngine.playSpatialCreatureCall(nearestPrey.group.position, player, this.lastPlayerYaw, nearestPrey.species.kind === 'bird', nearestPrey.species.vocalPitch || 420, isNight);
            }

            // Catch and strike prey! (2.4^2 = 5.76)
            if (minPreyDistSq < 5.76) {
              this.executePredatorAttack(a, nearestPrey);
              return;
            }
          }
          return;
        }
      }
    }

    // C. Herbivore Feeding (Grazing on grass) & Hydration (Drinking)
    if (!isCarnivore && a.state !== 'flee' && a.state !== 'defend' && a.state !== 'mating') {
      // Thirst management: seek river/water
      if (a.thirst < 40 && a.state !== 'drink') {
        const riverWave = Math.sin(a.group.position.z * 0.004) * 45;
        const targetX = 50 + riverWave;
        a.target.set(targetX, 0, a.group.position.z + (Math.random() - 0.5) * 15);
        a.state = 'drink';
        a.stateTimer = 8.0;
        return;
      }

      if (a.state === 'drink') {
        if (a.stateTimer <= 0) {
          a.thirst = 100;
          a.state = 'roam';
          a.stateTimer = 4.0;
        }
        return;
      }

      // Hunger management: graze
      if (a.hunger < 60 && a.state !== 'graze') {
        a.state = 'graze';
        a.stateTimer = 4.5 + Math.random() * 3;
        soundEngine.playSpatialAnimalGrazing(a.group.position, player, this.lastPlayerYaw);
        return;
      }

      if (a.state === 'graze') {
        if (a.stateTimer <= 0) {
          a.hunger = 100;
          a.state = 'roam';
          a.stateTimer = 4.0;
        }
        return;
      }
    }

    // D. Courtship Rituals & Mating
    if (a.hunger > 60 && a.thirst > 50 && a.matingCooldown <= 0 && !a.isJuvenile && a.state !== 'flee' && a.state !== 'hunt' && a.state !== 'dead') {
      // Find compatible mate of same species
      if (!a.targetMateId) {
        for (const other of this.agents.values()) {
          if (other.id !== a.id && other.species.id === a.species.id && !other.isJuvenile && other.matingCooldown <= 0 && other.gender !== a.gender) {
            const d = a.group.position.distanceTo(other.group.position);
            if (d < 26.0) {
              a.targetMateId = other.id;
              other.targetMateId = a.id;
              a.state = 'courtship';
              other.state = 'courtship';
              a.stateTimer = 4.5;
              other.stateTimer = 4.5;
              soundEngine.playSpatialMatingTrill(a.group.position, player, this.lastPlayerYaw, isNight);
              break;
            }
          }
        }
      }

      if (a.state === 'courtship' && a.targetMateId) {
        const mate = this.agents.get(a.targetMateId);
        if (mate) {
          a.target.copy(mate.group.position);
          const d = a.group.position.distanceTo(mate.group.position);
          if (d < 2.5) {
            // Mating Climax
            a.state = 'mating';
            mate.state = 'mating';
            a.stateTimer = 3.0;
            mate.stateTimer = 3.0;
            a.matingCooldown = 65.0;
            mate.matingCooldown = 65.0;

            if (a.gender === 'female') {
              a.isPregnant = true;
              a.pregnantTimer = 6.0;
            } else if (mate.gender === 'female') {
              mate.isPregnant = true;
              mate.pregnantTimer = 6.0;
            }

            // Spawn Courtship Particle Pulse
            if (this.matingParticles) {
              const posAttr = this.matingParticles.geometry.attributes.position as THREE.BufferAttribute;
              const p = a.group.position;
              for (let i = 0; i < posAttr.count; i++) {
                posAttr.setXYZ(
                  i,
                  p.x + (Math.random() - 0.5) * 2.5,
                  p.y + 0.8 + Math.random() * 1.5,
                  p.z + (Math.random() - 0.5) * 2.5
                );
              }
              posAttr.needsUpdate = true;
              (this.matingParticles.material as THREE.PointsMaterial).opacity = 0.85;
              setTimeout(() => {
                if (this.matingParticles) {
                  (this.matingParticles.material as THREE.PointsMaterial).opacity = 0;
                }
              }, 1800);
            }
            return;
          }
        }
      }

      if (a.state === 'mating') {
        if (a.stateTimer <= 0) {
          a.state = 'roam';
          a.targetMateId = null;
        }
        return;
      }
    }

    // E. Juvenile Following Mother
    if (a.isJuvenile && a.parentAgentId) {
      const parent = this.agents.get(a.parentAgentId);
      if (parent) {
        const d = a.group.position.distanceTo(parent.group.position);
        if (d > 4.5) {
          a.state = 'herd';
          a.target.copy(parent.group.position);
        } else if (a.stateTimer <= 0) {
          a.state = Math.random() > 0.4 ? 'roam' : 'rest';
          a.stateTimer = 3.0;
        }
        return;
      }
    }

    // F. Periodic Roaming & Natural Rest
    if (a.stateTimer <= 0) {
      if (isNight && Math.random() > 0.35 && !['owl', 'glow_moth', 'panther'].includes(a.species.id)) {
        a.state = 'rest';
        a.stateTimer = 8.0 + Math.random() * 8.0;
      } else {
        a.state = 'roam';
        a.stateTimer = 4.0 + Math.random() * 6.0;
        const angle = Math.random() * Math.PI * 2;
        const r = 10 + Math.random() * 20;
        a.target.set(
          a.group.position.x + Math.cos(angle) * r,
          a.group.position.y,
          a.group.position.z + Math.sin(angle) * r
        );
      }
    }
  }

  // --- PREDATOR ATTACK & PREY SELF-DEFENSE ---
  private executePredatorAttack(predator: WildlifeAgent, prey: WildlifeAgent) {
    soundEngine.playSpatialBiteImpact(predator.group.position, this.lastPlayerPos, this.lastPlayerYaw);

    // Check for large herbivore counter-attack defense (Triceratops, Stegosaurus, Buffalo, Elephant, Bear)
    const isDefensiveTank = ['triceratops', 'stegosaurus', 'buffalo', 'elephant', 'bear'].includes(prey.species.id);

    if (isDefensiveTank && Math.random() < 0.65) {
      // Prey defends with horns/tusks/thagomizer!
      prey.state = 'defend';
      prey.stateTimer = 3.0;
      prey.group.rotation.y = Math.atan2(
        predator.group.position.x - prey.group.position.x,
        predator.group.position.z - prey.group.position.z
      );

      // Inflict counter damage on predator
      const counterDmg = prey.species.attackDamage * (prey.genome.aggressionMod || 1.0);
      predator.health -= counterDmg;
      soundEngine.playCreatureCall(false, prey.species.vocalPitch || 120);

      if (predator.health <= 0) {
        predator.state = 'dead';
        predator.deathTimer = 0;
        return;
      }
    }

    // Predator inflicts bite damage
    const dmg = predator.species.attackDamage * predator.genome.aggressionMod;
    prey.health -= dmg;

    // Show blood particle burst
    if (this.feedingParticles) {
      const posAttr = this.feedingParticles.geometry.attributes.position as THREE.BufferAttribute;
      const p = prey.group.position;
      for (let i = 0; i < posAttr.count; i++) {
        posAttr.setXYZ(
          i,
          p.x + (Math.random() - 0.5) * 1.5,
          p.y + 0.6 + Math.random() * 0.8,
          p.z + (Math.random() - 0.5) * 1.5
        );
      }
      posAttr.needsUpdate = true;
      (this.feedingParticles.material as THREE.PointsMaterial).opacity = 0.9;
      setTimeout(() => {
        if (this.feedingParticles) (this.feedingParticles.material as THREE.PointsMaterial).opacity = 0;
      }, 700);
    }

    if (prey.health <= 0) {
      // Prey is killed (smooth collapse handled in update())
      prey.state = 'dead';
      prey.deathTimer = 0;
      predator.state = 'feed';
      predator.stateTimer = 8.0;
      predator.killsCount++;
      this.metrics.totalPredations++;
    }
  }

  // --- GENETICS & OFFSPRING CREATION ---
  private giveBirthToOffspring(mother: WildlifeAgent) {
    mother.isPregnant = false;
    mother.offspringCount++;
    this.metrics.totalBirths++;

    const species = mother.species;
    const gen = mother.genome.generation + 1;
    if (gen > this.metrics.highestGeneration) {
      this.metrics.highestGeneration = gen;
    }

    // Adaptive genetic mutation
    const speedMutation = (Math.random() - 0.45) * 0.12; // Slight positive bias for natural selection
    const sizeMutation = (Math.random() - 0.45) * 0.10;
    const staminaMutation = (Math.random() - 0.45) * 0.10;

    const traits = [
      { name: 'Apex Stride', desc: '+18% Sprint Velocity and Quick Evasion' },
      { name: 'Titan Bone Structure', desc: '+25% Max Health & Physical Mass' },
      { name: 'Shadow Coat', desc: 'Melanistic Camouflage blends into dark cover' },
      { name: 'Keen Senses', desc: 'Detects predators & prey at extended distances' },
      { name: 'Primal Vigor', desc: '+30% Faster Energy Regeneration' },
    ];
    const trait = traits[Math.floor(Math.random() * traits.length)];

    const childGenome: EvolutionaryGenome = {
      generation: gen,
      speedMod: THREE.MathUtils.clamp(mother.genome.speedMod + speedMutation, 0.8, 1.45),
      sizeMod: THREE.MathUtils.clamp(mother.genome.sizeMod + sizeMutation, 0.75, 1.35),
      staminaMod: THREE.MathUtils.clamp(mother.genome.staminaMod + staminaMutation, 0.8, 1.4),
      aggressionMod: mother.genome.aggressionMod,
      camouflageHue: Math.random() > 0.85 ? 0xd4af37 : mother.genome.camouflageHue, // Rare golden variation
      adaptationTrait: trait.name,
      adaptationDesc: trait.desc,
    };

    const childId = `juvenile_${species.id}_gen${gen}_${Date.now() % 10000}`;
    const group = this.createCreatureMesh(species, childGenome);
    // Juvenile starts at 55% stature
    group.scale.setScalar(species.scale * childGenome.sizeMod * 0.55);

    const birthPos = mother.group.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2));
    group.position.copy(birthPos);
    this.scene.add(group);

    const childAgent: WildlifeAgent = {
      id: childId,
      species,
      group,
      velocity: new THREE.Vector3(),
      target: birthPos.clone(),
      state: 'roam',
      stateTimer: 3.0,
      health: (species.kind === 'dinosaur' ? 180 : 60) * childGenome.sizeMod,
      maxHealth: (species.kind === 'dinosaur' ? 180 : 60) * childGenome.sizeMod,
      hunger: 90,
      thirst: 90,
      energy: 100,
      age: 0,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      isJuvenile: true,
      parentAgentId: mother.id,
      genome: childGenome,
      matingCooldown: 90.0,
      growthTimer: 75.0, // Matures to adult after 75s
      killsCount: 0,
      offspringCount: 0,
    };

    this.agents.set(childId, childAgent);
    soundEngine.playCreatureCall(species.kind === 'bird', (species.vocalPitch || 400) * 1.5); // Cute high-pitch baby chirp
  }

  // --- LOCOMOTION & KINEMATICS ---
  private applyAgentLocomotion(a: WildlifeAgent, delta: number) {
    if (a.state === 'rest' || a.state === 'dead') return;

    _tempDir.subVectors(a.target, a.group.position).setY(0);
    const distToTarget = _tempDir.length();

    if (distToTarget > 0.35) {
      _tempDir.normalize();

      // Locomotion speed factors
      let speedMult = a.genome.speedMod;
      if (a.state === 'hunt') speedMult *= 1.45;
      else if (a.state === 'flee') speedMult *= 1.55;
      else if (a.state === 'stalk') speedMult *= 0.42; // Slow stalking crouch
      else if (a.state === 'graze' || a.state === 'drink') speedMult *= 0.2;
      if (a.isJuvenile) speedMult *= 0.85;

      const currentSpeed = a.species.speed * speedMult;
      const nextX = a.group.position.x + _tempDir.x * currentSpeed * delta;
      const nextZ = a.group.position.z + _tempDir.z * currentSpeed * delta;
      if (RailwayNetworkGenerator.isProtectedRailwayZone(a.group.position.x, a.group.position.z)) {
        // Failsafe ejection if a wild creature was somehow spawned or pushed inside station bounds
        const nearestStationX = Math.round(a.group.position.x / 1200) * 1200;
        const escX = a.group.position.x - nearestStationX;
        const escZ = a.group.position.z - 236;
        const escLen = Math.hypot(escX, escZ) || 1;
        const stepX = (escX / escLen) * Math.max(currentSpeed, 6) * delta;
        const stepZ = (escZ / escLen) * Math.max(currentSpeed, 6) * delta;
        a.group.position.x += stepX;
        a.group.position.z += stepZ;
        a.target.set(a.group.position.x + (escX / escLen) * 28, a.group.position.y, a.group.position.z + (escZ / escLen) * 28);
      } else if (!RailwayNetworkGenerator.isProtectedRailwayZone(nextX, nextZ) && !isProtectedSpawnZone(nextX, nextZ)) {
        a.group.position.x = nextX;
        a.group.position.z = nextZ;
      } else {
        // Turn away from the railway/station instead of crossing the protected zone.
        a.target.set(a.group.position.x - _tempDir.x * 16, a.group.position.y, a.group.position.z - _tempDir.z * 16);
      }

      // Smooth steering toward target
      const targetRot = Math.atan2(_tempDir.x, _tempDir.z);
      a.group.rotation.y = THREE.MathUtils.damp(a.group.rotation.y, targetRot, 8, delta);
    }

    // Ground Elevation & Aquatic Positioning
    const idPhase = (a.id.charCodeAt(0) + (a.id.charCodeAt(a.id.length - 1) || 0)) * 0.73;
    if (a.species.kind === 'bird') {
      const flightAlt = 8.0 + Math.sin(this.particleTimer * 1.8 + idPhase + a.group.position.x * 0.08) * 2.5;
      const ground = getTerrainHeight(a.group.position.x, a.group.position.z, this.seed);
      a.group.position.y = Math.max(ground + 0.5, ground + flightAlt);
      const bankTarget = Math.sin(this.particleTimer * 1.4 + idPhase) * (a.state === 'flee' ? 0.34 : 0.20);
      a.group.rotation.z = THREE.MathUtils.damp(a.group.rotation.z, bankTarget, 5, delta);
      const wingL = a.group.getObjectByName('wing_left');
      const wingR = a.group.getObjectByName('wing_right');
      if (wingL && wingR) {
        const flapFreq = a.state === 'flee' || a.state === 'hunt' ? 18.0 : 12.5;
        const flap = Math.sin(this.particleTimer * flapFreq + idPhase) * (a.state === 'flee' ? 0.72 : 0.54);
        wingL.rotation.z = flap;
        wingR.rotation.z = -flap;
      }
    } else if (a.species.kind === 'aquatic') {
      const ground = getTerrainHeight(a.group.position.x, a.group.position.z, this.seed);
      a.group.position.y = Math.min(-0.35, ground + 0.5) + Math.sin(this.particleTimer * 2.2 + idPhase) * 0.08;
      a.group.rotation.z = Math.sin(this.particleTimer * 4.5 + idPhase) * 0.12;
      const tailOld = a.group.getObjectByName('tail') || a.group.getObjectByName('tail_base');
      if (tailOld) {
        tailOld.rotation.y = Math.sin(this.particleTimer * 9.0 + idPhase) * 0.35;
      }
    } else {
      const ground = getTerrainHeight(a.group.position.x, a.group.position.z, this.seed);
      const isMoving = distToTarget > 0.35;
      a.group.position.y = ground;
      this.animateAgentLimbs(a, isMoving, delta, idPhase);
    }
  }

  private animateAgentLimbs(a: WildlifeAgent, isMoving: boolean, _delta: number, idPhase: number = 0) {
    const legL = a.group.getObjectByName('leg_left');
    const legR = a.group.getObjectByName('leg_right');
    const legBackL = a.group.getObjectByName('leg_back_l');
    const legBackR = a.group.getObjectByName('leg_back_r');
    const tailBase = a.group.getObjectByName('tail_base');
    const tailMid = a.group.getObjectByName('tail_mid');
    const tailTip = a.group.getObjectByName('tail_tip');
    const tailOld = a.group.getObjectByName('tail');
    const head = a.group.getObjectByName('head');
    const jaw = a.group.getObjectByName('jaw');
    const chest = a.group.getObjectByName('chest');

    const t = this.particleTimer;

    // 1. Leg Walk / Sprint Cycle (all 4 legs when quadruped, individualized phase)
    if (legL && legR) {
      if (isMoving) {
        const cycleRate = a.state === 'hunt' || a.state === 'flee' ? 14.5 : a.state === 'stalk' ? 5.5 : a.isJuvenile ? 12.0 : 8.5;
        const speedFactor = Math.max(0.7, a.species.speed / 3.8);
        const phase = t * cycleRate * speedFactor + idPhase;
        const cycle = Math.sin(phase);
        const strideAmp = a.state === 'hunt' || a.state === 'flee' ? 0.72 : a.state === 'stalk' ? 0.42 : 0.60;
        legL.rotation.x = cycle * strideAmp;
        legR.rotation.x = -cycle * strideAmp;
        if (legBackL) legBackL.rotation.x = -cycle * (strideAmp * 0.92);
        if (legBackR) legBackR.rotation.x = cycle * (strideAmp * 0.92);

        // Natural vertical stride bounce & subtle shoulder roll
        a.group.position.y += Math.abs(Math.sin(phase)) * (a.state === 'hunt' || a.state === 'flee' ? 0.08 : 0.035);
        a.group.rotation.z = THREE.MathUtils.damp(a.group.rotation.z, Math.cos(phase) * 0.04, 10, _delta);
      } else {
        legL.rotation.x = THREE.MathUtils.damp(legL.rotation.x, 0, 10, _delta);
        legR.rotation.x = THREE.MathUtils.damp(legR.rotation.x, 0, 10, _delta);
        if (legBackL) legBackL.rotation.x = THREE.MathUtils.damp(legBackL.rotation.x, 0, 10, _delta);
        if (legBackR) legBackR.rotation.x = THREE.MathUtils.damp(legBackR.rotation.x, 0, 10, _delta);
        a.group.rotation.z = THREE.MathUtils.damp(a.group.rotation.z, 0, 8, _delta);
      }
    }

    // 2. Realistic Sinusoidal Tail Waves
    if (tailBase) {
      const tailWaveSpeed = isMoving ? 7.5 : 3.4;
      const tailAmp = isMoving ? 0.28 : 0.14;
      tailBase.rotation.y = Math.sin(t * tailWaveSpeed + idPhase) * tailAmp;
      if (tailMid) {
        tailMid.rotation.y = Math.sin(t * tailWaveSpeed + idPhase - 0.7) * (tailAmp * 1.3);
      }
      if (tailTip) {
        tailTip.rotation.y = Math.sin(t * tailWaveSpeed + idPhase - 1.4) * (tailAmp * 1.6);
      }
    } else if (tailOld) {
      tailOld.rotation.y = Math.sin(t * 5.2 + idPhase) * 0.22;
    }

    // 3. Respiration / Chest Expansion
    if (chest) {
      const breath = 1.0 + Math.sin(t * 2.4 + idPhase) * 0.035;
      chest.scale.set(breath, breath, 1.0);
    }

    // 4. Predatory Jaw Snap & Head Dipping
    if (jaw) {
      if (a.state === 'attack' || a.state === 'feed') {
        jaw.rotation.x = Math.max(0, Math.sin(t * 14.0 + idPhase) * 0.5);
      } else {
        jaw.rotation.x = THREE.MathUtils.damp(jaw.rotation.x, 0, 12, _delta);
      }
    }

    if (head) {
      if (a.state === 'graze' || a.state === 'drink' || a.state === 'feed') {
        const peck = Math.sin(t * 4.5 + idPhase) * 0.06;
        head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0.45 + peck, 6, _delta);
      } else if (a.state === 'stalk') {
        head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0.22, 6, _delta);
      } else {
        const lookScan = !isMoving ? Math.sin(t * 1.1 + idPhase) * 0.08 : 0;
        head.rotation.x = THREE.MathUtils.damp(head.rotation.x, 0, 8, _delta);
        head.rotation.y = THREE.MathUtils.damp(head.rotation.y, lookScan, 4, _delta);
      }
    }
  }

  // --- COMPANION UPDATE ---
  private updateCompanionAgent(a: WildlifeAgent, delta: number, player: THREE.Vector3) {
    const dx = player.x - a.group.position.x;
    const dz = player.z - a.group.position.z;
    const distToPlayer = Math.hypot(dx, dz);

    if (this.companionState && this.companionState.state === 'stay') {
      a.state = 'companion_stay';
    } else {
      a.state = 'companion_follow';
    }

    if (a.state === 'companion_follow') {
      if (distToPlayer > 85) {
        a.group.position.set(player.x - 3, player.y, player.z - 3);
      } else if (distToPlayer > 3.2) {
        _tempDir.set(dx, 0, dz).normalize();
        const speed = a.species.speed * a.genome.speedMod * (distToPlayer > 8 ? 1.8 : 1.15);
        a.group.position.addScaledVector(_tempDir, speed * delta);
        a.group.rotation.y = THREE.MathUtils.damp(a.group.rotation.y, Math.atan2(_tempDir.x, _tempDir.z), 10, delta);
      }
    }

    const ground = getTerrainHeight(a.group.position.x, a.group.position.z, this.seed);
    a.group.position.y = ground;
    this.animateAgentLimbs(a, distToPlayer > 3.2, delta);
  }

  // --- SPAWN LOGIC ---
  private spawnAround(player: THREE.Vector3, biomeAt: (x: number, z: number) => string, isNight: boolean) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 65;
    const x = player.x + Math.cos(angle) * radius;
    const z = player.z + Math.sin(angle) * radius;
    // Wildlife must never spawn in railway right-of-way or either protected compound.
    if (RailwayNetworkGenerator.isProtectedRailwayZone(x, z) || isProtectedSpawnZone(x, z)) return;
    const biome = biomeAt(x, z);

    let pool = WILDLIFE_SPECIES.filter((s) => s.biomes.includes(biome));
    if (isNight) {
      pool = pool.filter((s) => !['parrot', 'duck', 'butterfly', 'flamingo'].includes(s.id));
    }
    if (!pool.length) {
      pool = WILDLIFE_SPECIES.filter((s) => s.kind === 'mammal' || s.kind === 'dinosaur');
    }

    const species = pool[Math.floor(Math.random() * pool.length)];
    const id = `wild_${species.id}_${Math.floor(x)}_${Math.floor(z)}_${Date.now() % 1000}`;
    if (this.agents.has(id)) return;

    const initialGenome: EvolutionaryGenome = {
      generation: 1,
      speedMod: 0.95 + Math.random() * 0.15,
      sizeMod: 0.95 + Math.random() * 0.15,
      staminaMod: 1.0,
      aggressionMod: 1.0,
      camouflageHue: species.color,
      adaptationTrait: 'Wild Adaptation',
      adaptationDesc: 'Natural survival constitution tuned to local biome',
    };

    const group = this.createCreatureMesh(species, initialGenome);
    const altitude = species.kind === 'bird' ? 8 : 0;
    group.position.set(x, getTerrainHeight(x, z, this.seed) + altitude, z);
    this.scene.add(group);

    const agent: WildlifeAgent = {
      id,
      species,
      group,
      velocity: new THREE.Vector3(),
      target: new THREE.Vector3(x, group.position.y, z),
      state: 'roam',
      stateTimer: 2 + Math.random() * 5,
      health: (species.kind === 'dinosaur' ? 300 : 100) * initialGenome.sizeMod,
      maxHealth: (species.kind === 'dinosaur' ? 300 : 100) * initialGenome.sizeMod,
      hunger: 70 + Math.random() * 30,
      thirst: 70 + Math.random() * 30,
      energy: 100,
      age: 10 + Math.random() * 50,
      gender: Math.random() > 0.5 ? 'male' : 'female',
      genome: initialGenome,
      matingCooldown: 25.0 + Math.random() * 40.0,
      killsCount: 0,
      offspringCount: 0,
    };

    this.agents.set(id, agent);
  }

  // --- BIOLOGICAL SCANNER DOSSIER API ---
  public getScannedDossier(playerPos: THREE.Vector3, lookDir: THREE.Vector3): EcosystemDossier | null {
    let bestAgent: WildlifeAgent | null = null;
    let minScore = Infinity;

    for (const a of this.agents.values()) {
      if (a.state === 'dead') continue;
      _tempVecA.subVectors(a.group.position, playerPos);
      const dist = _tempVecA.length();
      if (dist > 30.0) continue;

      _tempVecA.normalize();
      const dot = _tempVecA.dot(lookDir);
      if (dot > 0.7) {
        // In player's forward crosshair cone
        const score = dist - dot * 10;
        if (score < minScore) {
          minScore = score;
          bestAgent = a;
        }
      }
    }

    if (!bestAgent) return null;

    let intentDesc = 'Wandering ambiently and scenting the breeze.';
    if (bestAgent.state === 'hunt') intentDesc = `Actively pursuing prey species in full sprint!`;
    else if (bestAgent.state === 'stalk') intentDesc = `Stealthily stalking target downwind.`;
    else if (bestAgent.state === 'courtship') intentDesc = `Displaying courtship dance to prospective mate.`;
    else if (bestAgent.state === 'mating') intentDesc = `Mating ritual in progress.`;
    else if (bestAgent.state === 'graze') intentDesc = `Foraging and grazing on local vegetation.`;
    else if (bestAgent.state === 'drink') intentDesc = `Drinking fresh water at shoreline.`;
    else if (bestAgent.state === 'defend') intentDesc = `Defending territory with counter-charge!`;
    else if (bestAgent.state === 'protect_young') intentDesc = `Fiercely protecting juvenile offspring!`;
    else if (bestAgent.state === 'feed') intentDesc = `Feeding on fresh hunt kill.`;
    else if (bestAgent.state === 'flee') intentDesc = `Evasive flight from nearby predator threat!`;
    else if (bestAgent.state === 'stunned') intentDesc = `Infected & stunned! Mutating into zombie in ${Math.ceil(bestAgent.infectionTimer ?? 60)}s!`;

    return {
      agentId: bestAgent.id,
      speciesName: bestAgent.species.name,
      scientificName: bestAgent.species.scientificName,
      kind: bestAgent.species.kind,
      diet: bestAgent.species.diet,
      state: bestAgent.state.toUpperCase().replace('_', ' '),
      intentDescription: intentDesc,
      health: Math.round(bestAgent.health),
      maxHealth: Math.round(bestAgent.maxHealth),
      hunger: Math.round(bestAgent.hunger),
      thirst: Math.round(bestAgent.thirst),
      generation: bestAgent.genome.generation,
      adaptationTrait: bestAgent.genome.adaptationTrait,
      distance: Math.round(bestAgent.group.position.distanceTo(playerPos)),
      isJuvenile: !!bestAgent.isJuvenile,
      offspringCount: bestAgent.offspringCount,
      killsCount: bestAgent.killsCount,
    };
  }

  public getNearestCreature(playerPos: THREE.Vector3, maxDist = 4.0): WildlifeAgent | null {
    let nearest: WildlifeAgent | null = null;
    let minDist = maxDist;
    for (const a of this.agents.values()) {
      if (a.state === 'dead') continue;
      const d = Math.hypot(a.group.position.x - playerPos.x, a.group.position.z - playerPos.z);
      if (d < minDist) {
        minDist = d;
        nearest = a;
      }
    }
    return nearest;
  }

  public tameCreature(agentId: string): CompanionState | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    agent.isTamed = true;
    agent.state = 'companion_follow';
    this.companionAgentId = agent.id;

    // Gold companion halo ring
    const ringGeo = new THREE.TorusGeometry(0.55 * agent.species.scale, 0.05, 8, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const halo = new THREE.Mesh(ringGeo, ringMat);
    halo.position.set(0, 1.8 * agent.species.scale, 0);
    agent.group.add(halo);

    const comp: CompanionState = {
      speciesId: agent.species.id,
      name: `Loyal ${agent.species.name}`,
      kind: agent.species.kind === 'dinosaur' ? 'dinosaur' : agent.species.kind === 'bird' ? 'bird' : 'mammal',
      health: agent.health,
      maxHealth: agent.maxHealth,
      state: 'follow',
      isMounted: false,
    };
    this.companionState = comp;
    return comp;
  }

  public setCompanionOrder(order: 'follow' | 'stay' | 'defend') {
    if (this.companionState) {
      this.companionState.state = order;
    }
  }

  public getNearestHostileThreat(pos: THREE.Vector3, maxDist: number): WildlifeAgent | null {
    let nearest: WildlifeAgent | null = null;
    let minDist = maxDist;

    for (const agent of this.agents.values()) {
      if (agent.state === 'rest' && agent.health <= 0) continue;
      if (agent.isTamed) continue;
      const isHostile =
        agent.species.diet === 'carnivore' ||
        agent.species.trophic === 'apex' ||
        agent.species.trophic === 'predator' ||
        agent.state === 'attack' ||
        agent.state === 'hunt';
      if (!isHostile) continue;

      const d = agent.group.position.distanceTo(pos);
      if (d < minDist) {
        minDist = d;
        nearest = agent;
      }
    }

    return nearest;
  }

  public damageCreature(agentId: string, amount: number): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    agent.health -= amount;
    if (agent.health <= 0) {
      agent.health = 0;
      agent.state = 'dead';
      agent.deathTimer = 0;
      return true;
    } else {
      agent.state = 'flee';
      agent.stateTimer = 4.0;
      return false;
    }
  }

  public infectCreature(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.state === 'dead' || agent.state === 'stunned' || agent.infectionStage === 'stunned' || agent.isTamed) {
      return false;
    }
    agent.infectionStage = 'stunned';
    agent.state = 'stunned';
    agent.infectionTimer = 60.0;
    agent.velocity.set(0, 0, 0);

    // Visual bio-infection marker ring above stunned organism
    if (!agent.group.getObjectByName('infection_stun_ring')) {
      const ringGeo = new THREE.TorusGeometry(0.45 * agent.species.scale, 0.045, 6, 16);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x84cc16, transparent: true, opacity: 0.85 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = 'infection_stun_ring';
      ring.position.set(0, 1.4 * agent.species.scale, 0);
      agent.group.add(ring);
    }
    soundEngine.playSpatialCreatureCall(agent.group.position, this.lastPlayerPos, this.lastPlayerYaw, agent.species.kind === 'bird', agent.species.vocalPitch || 320, false);
    return true;
  }

  // --- PROCEDURAL 3D MESH GENERATION ---
  private createCreatureMesh(s: WildlifeSpecies, genome: EvolutionaryGenome): THREE.Group {
    const g = new THREE.Group();
    g.name = `wildlife_${s.id}`;
    g.scale.setScalar(s.scale * genome.sizeMod);

    const bodyColor = genome.camouflageHue || s.color;
    const sid = s.id.toLowerCase();
    const furPattern: 'solid' | 'striped' | 'spotted' | 'wool' | 'feather' =
      s.kind === 'bird'
        ? 'feather'
        : sid.includes('sheep')
          ? 'wool'
          : sid.includes('tiger') || sid.includes('zebra') || sid.includes('hyena')
            ? 'striped'
            : sid.includes('leopard') || sid.includes('cheetah') || sid.includes('jaguar') || sid.includes('giraffe')
              ? 'spotted'
              : 'solid';

    const matCache: Map<string, THREE.Material> = (WildlifeManager as any).__matCache ??
      ((WildlifeManager as any).__matCache = new Map<string, THREE.Material>());
    const getOrCreateSharedMat = (key: string, create: () => THREE.Material): THREE.Material => {
      let cached = matCache.get(key);
      if (!cached) {
        cached = create();
        cached.userData.__sharedResource = true;
        matCache.set(key, cached);
      }
      return cached;
    };

    const mainMat = getOrCreateSharedMat(`main_${s.id}_${bodyColor}`, () => {
      if (s.kind === 'dinosaur' || s.kind === 'reptile') {
        const dinoPBR = getDinosaurSkinPBR(s.id, bodyColor);
        return new THREE.MeshStandardMaterial({
          map: dinoPBR.albedo,
          normalMap: dinoPBR.normal,
          roughnessMap: dinoPBR.roughness,
          normalScale: new THREE.Vector2(1.25, 1.25),
          roughness: 0.72,
          metalness: 0.04,
        });
      } else if (s.kind === 'aquatic' || s.kind === 'amphibian') {
        const wetPBR = getRockPBR();
        return new THREE.MeshStandardMaterial({
          color: bodyColor,
          normalMap: wetPBR.normal,
          normalScale: new THREE.Vector2(0.4, 0.4),
          roughness: 0.16,
          metalness: 0.14,
          envMapIntensity: 1.4,
        });
      } else {
        const furPBR = getFurPBR(bodyColor, furPattern);
        return new THREE.MeshStandardMaterial({
          map: furPBR.albedo,
          normalMap: furPBR.normal,
          roughnessMap: furPBR.roughness,
          normalScale: new THREE.Vector2(1.05, 1.05),
          roughness: furPattern === 'wool' ? 0.95 : 0.78,
          metalness: 0.02,
          envMapIntensity: 0.9,
        });
      }
    });

    const bellyMat = getOrCreateSharedMat(`belly_${bodyColor}`, () => {
      const bellyColor = new THREE.Color(bodyColor).lerp(new THREE.Color(0xeae2d2), 0.48);
      return new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.85 });
    });
    const darkMat = getOrCreateSharedMat('wildlife_dark', () => new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.82 }));
    const hornMat = getOrCreateSharedMat('wildlife_horn', () => new THREE.MeshStandardMaterial({ color: 0xe6dcc4, roughness: 0.48, metalness: 0.05 }));
    const toothMat = getOrCreateSharedMat('wildlife_tooth', () => new THREE.MeshStandardMaterial({ color: 0xf4f1e6, roughness: 0.28 }));
    const eyeMat = getOrCreateSharedMat(`wildlife_eye_${s.kind === 'dinosaur' ? 'dino' : 'std'}`, () => new THREE.MeshStandardMaterial({
      color: s.kind === 'dinosaur' ? 0xe09618 : 0x261a12,
      roughness: 0.06,
      metalness: 0.08,
      envMapIntensity: 1.5,
    }));
    const pupilMat = getOrCreateSharedMat('wildlife_pupil', () => new THREE.MeshBasicMaterial({ color: 0x060608 }));

    if (s.id === 'trex') {
      // TYRANNOSAURUS REX: Anatomically proportioned apex apex predator
      const bodyGroup = new THREE.Group();
      bodyGroup.name = 'chest';
      bodyGroup.position.set(0, 1.85, 0);

      // Muscular theropod torso (chest + ribcage)
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 2.4, 10), mainMat);
      torso.rotation.x = Math.PI / 2 - 0.12;
      torso.castShadow = true;
      bodyGroup.add(torso);

      // Dorsal osteoderm spinal crests (scutes along the spine)
      for (let i = -0.9; i <= 0.9; i += 0.3) {
        const scute = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 4), darkMat);
        scute.rotation.x = -0.2;
        scute.position.set(0, 0.78, i);
        bodyGroup.add(scute);
      }
      g.add(bodyGroup);

      // S-Curved Neck and Heavy Cranium
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 0.9, 8), mainMat);
      neck.rotation.x = -Math.PI / 4;
      neck.position.set(0, 2.35, 1.15);
      g.add(neck);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 2.75, 1.6);

      // Upper cranium with brow ridges and binocular eye orbits
      const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.7, 1.4), mainMat);
      cranium.position.set(0, 0.12, 0);
      cranium.castShadow = true;
      head.add(cranium);

      // Tapered snout
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.8, 5), mainMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, 0.05, 0.95);
      head.add(snout);

      // Upper Serrated Teeth Row
      for (let tx = -0.28; tx <= 0.28; tx += 0.14) {
        for (let tz = 0.2; tz <= 0.8; tz += 0.2) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 4), toothMat);
          tooth.rotation.x = Math.PI;
          tooth.position.set(tx, -0.25, tz);
          head.add(tooth);
        }
      }

      // Amber Eyes with reptilian slit pupil
      for (const side of [-0.42, 0.42]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), eyeMat);
        eye.position.set(side, 0.22, 0.3);
        head.add(eye);
      }

      // Articulated Lower Jaw (Pivots during bite attack)
      const jaw = new THREE.Group();
      jaw.name = 'jaw';
      jaw.position.set(0, -0.24, -0.15);
      const jawBone = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 1.25), darkMat);
      jawBone.position.set(0, -0.05, 0.55);
      jaw.add(jawBone);
      head.add(jaw);

      g.add(head);

      // Muscular Bipedal Legs (Thigh -> Calf -> Foot with 3 Talons & Rear Dewclaw)
      for (const [side, legName] of [[-0.65, 'leg_left'], [0.65, 'leg_right']] as const) {
        const leg = new THREE.Group();
        leg.name = legName;
        leg.position.set(side, 1.4, -0.1);

        // Bulky muscular thigh
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.25, 0.95, 8), mainMat);
        thigh.position.set(0, -0.2, 0.1);
        thigh.rotation.x = 0.25;
        leg.add(thigh);

        // Lower calf / shin
        const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.85, 8), darkMat);
        calf.position.set(0, -0.85, -0.05);
        calf.rotation.x = -0.3;
        leg.add(calf);

        // Foot & 3 Curved Talons
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.55), darkMat);
        foot.position.set(0, -1.35, 0.15);
        for (const tox of [-0.12, 0, 0.12]) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 4), toothMat);
          claw.rotation.x = Math.PI / 2.5;
          claw.position.set(tox, -0.02, 0.28);
          foot.add(claw);
        }
        leg.add(foot);
        g.add(leg);
      }

      // 3-Segment Counterbalance Tail with natural sinusoidal sway
      const tailBase = new THREE.Group();
      tailBase.name = 'tail_base';
      tailBase.position.set(0, 1.7, -1.1);
      const tailMesh1 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.3, 7), mainMat);
      tailMesh1.rotation.x = -Math.PI / 2 + 0.1;
      tailMesh1.position.set(0, 0, -0.65);
      tailBase.add(tailMesh1);

      const tailMid = new THREE.Group();
      tailMid.name = 'tail_mid';
      tailMid.position.set(0, 0.05, -1.25);
      const tailMesh2 = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.2, 6), mainMat);
      tailMesh2.rotation.x = -Math.PI / 2 + 0.05;
      tailMesh2.position.set(0, 0, -0.6);
      tailMid.add(tailMesh2);

      const tailTip = new THREE.Group();
      tailTip.name = 'tail_tip';
      tailTip.position.set(0, 0.05, -1.15);
      const tailMesh3 = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.1, 5), mainMat);
      tailMesh3.rotation.x = -Math.PI / 2;
      tailMesh3.position.set(0, 0, -0.55);
      tailTip.add(tailMesh3);

      tailMid.add(tailTip);
      tailBase.add(tailMid);
      g.add(tailBase);

      // Two-Clawed Forearms
      for (const side of [-0.45, 0.45]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.45, 6), mainMat);
        arm.rotation.x = 0.5;
        arm.position.set(side, 1.6, 0.85);
        g.add(arm);
      }
    } else if (s.id === 'raptor') {
      // VELOCIRAPTOR: Fast, lethal pack hunter with sickle killing claw & feather crests
      const bodyGroup = new THREE.Group();
      bodyGroup.name = 'chest';
      bodyGroup.position.set(0, 1.15, 0);

      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.38, 1.35, 8), mainMat);
      torso.rotation.x = Math.PI / 2 - 0.15;
      bodyGroup.add(torso);
      g.add(bodyGroup);

      // Curved raptor neck
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, 0.65, 6), mainMat);
      neck.rotation.x = -Math.PI / 3.5;
      neck.position.set(0, 1.45, 0.65);
      g.add(neck);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 1.7, 0.95);

      const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.32, 0.75), mainMat);
      head.add(skull);

      // Feathered Quill Crest along skull ridge
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 4), darkMat);
      crest.rotation.x = -Math.PI / 3;
      crest.position.set(0, 0.22, -0.15);
      head.add(crest);

      // Amber eyes
      for (const side of [-0.19, 0.19]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), eyeMat);
        eye.position.set(side, 0.08, 0.15);
        head.add(eye);
      }

      // Articulated Jaw with small sharp teeth
      const jaw = new THREE.Group();
      jaw.name = 'jaw';
      jaw.position.set(0, -0.12, -0.05);
      const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.65), darkMat);
      jawMesh.position.set(0, 0, 0.3);
      jaw.add(jawMesh);
      head.add(jaw);
      g.add(head);

      // Raptor Hind Legs with Hyper-Extended Sickle Killing Claw
      for (const [side, legName] of [[-0.28, 'leg_left'], [0.28, 'leg_right']] as const) {
        const leg = new THREE.Group();
        leg.name = legName;
        leg.position.set(side, 0.95, 0);

        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.65, 6), mainMat);
        thigh.position.set(0, -0.15, 0.08);
        thigh.rotation.x = 0.28;
        leg.add(thigh);

        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.6, 6), darkMat);
        shin.position.set(0, -0.6, -0.05);
        shin.rotation.x = -0.35;
        leg.add(shin);

        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.32), darkMat);
        foot.position.set(0, -0.92, 0.1);

        // Hyper-extended Sickle Killing Claw on inner toe
        const sickleClaw = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), hornMat);
        sickleClaw.rotation.x = -Math.PI / 3;
        sickleClaw.position.set(side < 0 ? 0.07 : -0.07, 0.08, 0.08);
        foot.add(sickleClaw);

        leg.add(foot);
        g.add(leg);
      }

      // Stiffened Counterbalance Tail with feathers
      const tailBase = new THREE.Group();
      tailBase.name = 'tail_base';
      tailBase.position.set(0, 1.15, -0.65);
      const tail1 = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.0, 5), mainMat);
      tail1.rotation.x = -Math.PI / 2;
      tail1.position.set(0, 0, -0.5);
      tailBase.add(tail1);

      const tailTip = new THREE.Group();
      tailTip.name = 'tail_tip';
      tailTip.position.set(0, 0, -0.95);
      const tail2 = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.1, 5), mainMat);
      tail2.rotation.x = -Math.PI / 2;
      tail2.position.set(0, 0, -0.55);
      tailTip.add(tail2);

      tailBase.add(tailTip);
      g.add(tailBase);
    } else if (s.id === 'triceratops') {
      // TRICERATOPS: Heavy herbivorous tank with epoccipital frill and 3 horns
      const bodyGroup = new THREE.Group();
      bodyGroup.name = 'chest';
      bodyGroup.position.set(0, 1.25, 0);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 2.3, 10), mainMat);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      bodyGroup.add(body);
      g.add(bodyGroup);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 1.2, 1.45);

      // Scalloped Epoccipital Bony Frill with color display rings
      const frill = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.16, 14), mainMat);
      frill.rotation.x = Math.PI / 3.2;
      frill.position.set(0, 0.65, -0.35);
      head.add(frill);

      // Curved Brow Horns with Ivory Keratin Grain
      for (const side of [-0.38, 0.38]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.11, 1.15, 6), hornMat);
        horn.rotation.x = Math.PI / 4;
        horn.position.set(side, 0.85, 0.15);
        head.add(horn);
      }

      // Nasal Horn & Beak
      const nasalHorn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.45, 6), hornMat);
      nasalHorn.rotation.x = Math.PI / 3;
      nasalHorn.position.set(0, 0.32, 0.85);
      head.add(nasalHorn);

      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.85, 6), darkMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.05, 0.8);
      head.add(beak);
      g.add(head);

      // 4 Pillar Legs
      const legGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.95, 8);
      for (const [x, z, name] of [
        [-0.7, 0.75, 'leg_left'],
        [0.7, 0.75, 'leg_right'],
        [-0.7, -0.75, 'leg_back_l'],
        [0.7, -0.75, 'leg_back_r'],
      ] as const) {
        const leg = new THREE.Mesh(legGeo, darkMat);
        leg.name = name;
        leg.position.set(x, 0.48, z);
        g.add(leg);
      }

      // Tail
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 6), mainMat);
      tail.name = 'tail_base';
      tail.rotation.x = -Math.PI / 2 - 0.2;
      tail.position.set(0, 1.1, -1.2);
      g.add(tail);
    } else if (s.kind === 'bird') {
      // Sculpted Aerodynamic Bird with Swept Wings & Tail Feathers
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mainMat);
      body.scale.set(0.85, 0.8, 1.55);
      body.position.set(0, 0.5, 0);
      body.castShadow = true;
      g.add(body);

      const breast = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), bellyMat);
      breast.scale.set(0.8, 0.7, 1.2);
      breast.position.set(0, 0.45, 0.08);
      g.add(breast);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 0.65, 0.42);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mainMat);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), hornMat);
      beak.rotation.x = Math.PI / 2;
      beak.position.set(0, -0.02, 0.22);
      for (const side of [-0.11, 0.11]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 6), eyeMat);
        eye.position.set(side, 0.04, 0.11);
        head.add(eye);
      }
      head.add(skull, beak);
      g.add(head);

      // Articulated Wings (Pivoted at shoulder for smooth flight flapping)
      for (const [side, wName] of [[-1, 'wing_left'], [1, 'wing_right']] as const) {
        const wingPivot = new THREE.Group();
        wingPivot.name = wName;
        wingPivot.position.set(side * 0.22, 0.56, 0.04);
        const inner = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.045, 0.44), mainMat);
        inner.position.set(side * 0.36, 0, -0.04);
        const outer = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.03, 0.28), darkMat);
        outer.position.set(side * 0.96, -0.02, -0.10);
        outer.rotation.y = side * -0.25;
        wingPivot.add(inner, outer);
        g.add(wingPivot);
      }

      const tailFan = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.46, 5), darkMat);
      tailFan.rotation.x = -Math.PI / 2;
      tailFan.scale.set(1.2, 1.0, 0.22);
      tailFan.position.set(0, 0.52, -0.45);
      g.add(tailFan);
    } else if (s.id === 'rabbit') {
      // COTTONTAIL RABBIT: Rounded haunches, upright inner-lined ears, twitching nose & cotton tail
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 10), mainMat);
      body.scale.set(0.72, 0.68, 1.05);
      body.position.y = 0.28;
      body.castShadow = true;
      g.add(body);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 0.44, 0.34);

      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mainMat);
      skull.scale.set(0.95, 0.9, 1.1);
      head.add(skull);

      for (const side of [-0.075, 0.075]) {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.28, 4, 8), mainMat);
        ear.rotation.z = side * -0.22;
        ear.rotation.x = -0.18;
        ear.position.set(side, 0.26, -0.05);
        head.add(ear);

        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
        eye.position.set(side * 1.65, 0.04, 0.12);
        head.add(eye);
      }

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), new THREE.MeshStandardMaterial({ color: 0xe48b8d, roughness: 0.45 }));
      nose.position.set(0, -0.02, 0.19);
      head.add(nose);
      g.add(head);

      for (const [x, z] of [[-0.12, 0.18], [0.12, 0.18], [-0.15, -0.18], [0.15, -0.18]]) {
        const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.08, 3, 6), mainMat);
        paw.rotation.x = Math.PI / 2;
        paw.position.set(x, 0.04, z);
        g.add(paw);
      }

      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), new THREE.MeshStandardMaterial({ color: 0xf7f5f0, roughness: 0.92 }));
      tail.position.set(0, 0.26, -0.38);
      g.add(tail);
    } else if (s.id === 'sheep') {
      // DOMESTIC SHEEP: Rich curly wool PBR fleece, sculpted head & ears, hooves
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.66, 14, 12), mainMat);
      body.scale.set(0.88, 0.82, 1.25);
      body.position.y = 0.74;
      body.castShadow = true;
      g.add(body);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 0.96, 0.76);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), darkMat);
      skull.scale.set(0.85, 0.95, 1.35);
      head.add(skull);
      for (const side of [-0.19, 0.19]) {
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 3, 6), darkMat);
        ear.rotation.z = side < 0 ? 1.1 : -1.1;
        ear.position.set(side, 0.04, -0.05);
        head.add(ear);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
        eye.position.set(side * 0.65, 0.05, 0.16);
        head.add(eye);
      }
      g.add(head);

      for (const [x, z, name] of [[-0.28, 0.35, 'leg_left'], [0.28, 0.35, 'leg_right'], [-0.28, -0.35, 'leg_back_l'], [0.28, -0.35, 'leg_back_r']] as const) {
        const leg = new THREE.Group();
        leg.name = name;
        leg.position.set(x, 0.54, z);
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.058, 0.54, 8), darkMat);
        limb.position.y = -0.27;
        leg.add(limb);
        g.add(leg);
      }
    } else if (s.id === 'goat') {
      // MOUNTAIN GOAT: Tapered torso, beard, swept horns, cloven hooves
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), mainMat);
      body.scale.set(0.78, 0.75, 1.32);
      body.position.y = 0.76;
      body.castShadow = true;
      g.add(body);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.19, 0.42, 8), mainMat);
      neck.position.set(0, 0.94, 0.54);
      neck.rotation.x = 0.5;
      g.add(neck);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 1.10, 0.74);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mainMat);
      skull.scale.set(0.78, 0.85, 1.38);
      head.add(skull);

      for (const side of [-0.09, 0.09]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.48, 6), hornMat);
        horn.rotation.x = -Math.PI / 3;
        horn.position.set(side, 0.28, -0.05);
        head.add(horn);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), eyeMat);
        eye.position.set(side * 1.25, 0.04, 0.10);
        head.add(eye);
      }
      const beard = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 5), mainMat);
      beard.rotation.x = Math.PI;
      beard.position.set(0, -0.18, 0.12);
      head.add(beard);
      g.add(head);

      for (const [x, z, name] of [[-0.25, 0.35, 'leg_left'], [0.25, 0.35, 'leg_right'], [-0.25, -0.35, 'leg_back_l'], [0.25, -0.35, 'leg_back_r']] as const) {
        const leg = new THREE.Group();
        leg.name = name;
        leg.position.set(x, 0.62, z);
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.048, 0.62, 8), darkMat);
        limb.position.y = -0.31;
        leg.add(limb);
        g.add(leg);
      }
    } else if (s.id === 'cow') {
      // PASTURE DAIRY COW: Rounded torso, black hide patches, curved horns, pink muzzle & udder
      const cowBodyMat = getOrCreateSharedMat('wildlife_cow_body', () => {
        const cowPBR = getFurPBR(0xf3f1ea, 'spotted');
        return new THREE.MeshStandardMaterial({
          map: cowPBR.albedo,
          normalMap: cowPBR.normal,
          roughness: 0.78,
        });
      });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.25, 6, 12), cowBodyMat);
      body.rotation.x = Math.PI / 2;
      body.scale.set(0.92, 1.0, 0.88);
      body.position.y = 1.16;
      body.castShadow = true;
      g.add(body);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.65, 10), cowBodyMat);
      neck.position.set(0, 1.28, 0.98);
      neck.rotation.x = 0.65;
      g.add(neck);

      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, 1.44, 1.38);
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), cowBodyMat);
      skull.scale.set(0.86, 0.88, 1.25);
      head.add(skull);

      const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xe2a294, roughness: 0.55 }));
      muzzle.scale.set(1.0, 0.68, 0.85);
      muzzle.position.set(0, -0.10, 0.34);
      head.add(muzzle);
      for (const side of [-0.22, 0.22]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.28, 6), hornMat);
        horn.rotation.z = side < 0 ? 0.65 : -0.65;
        horn.position.set(side, 0.24, -0.04);
        head.add(horn);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 6), eyeMat);
        eye.position.set(side * 1.15, 0.06, 0.16);
        head.add(eye);
      }
      g.add(head);

      for (const [x, z, name] of [[-0.42, 0.65, 'leg_left'], [0.42, 0.65, 'leg_right'], [-0.42, -0.65, 'leg_back_l'], [0.42, -0.65, 'leg_back_r']] as const) {
        const leg = new THREE.Group();
        leg.name = name;
        leg.position.set(x, 0.84, z);
        const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.085, 0.84, 8), cowBodyMat);
        limb.position.y = -0.42;
        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 8), darkMat);
        hoof.position.y = -0.80;
        leg.add(limb, hoof);
        g.add(leg);
      }
    } else if (s.id === 'fish' || s.id === 'reef_fish') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mainMat);
      body.scale.set(0.55, 0.9, 1.85);
      body.position.y = 0.3;
      g.add(body);

      const finDorsal = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 4), mainMat);
      finDorsal.position.set(0, 0.5, 0.02);
      g.add(finDorsal);

      const tailFin = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.26, 4), mainMat);
      tailFin.rotation.x = Math.PI / 2;
      tailFin.scale.set(0.22, 1.0, 1.3);
      tailFin.position.set(0, 0.3, -0.46);
      g.add(tailFin);
    } else if (s.id === 'frog') {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mainMat);
      body.scale.set(1.1, 0.6, 1.25);
      body.position.y = 0.14;
      g.add(body);

      for (const side of [-0.1, 0.1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeMat);
        eye.position.set(side, 0.22, 0.1);
        g.add(eye);
      }
    } else {
      // Sculpted Quadrupeds (Lion, Tiger, Wolf, Bear, Deer, Horse, Zebra, Giraffe, Leopard, Boar, etc.)
      const isLongNeck = sid.includes('giraffe');
      const isAntlered = sid.includes('deer') || sid.includes('elk') || sid.includes('moose') || sid.includes('stag');
      const isManed = sid.includes('lion');

      const chestGroup = new THREE.Group();
      chestGroup.name = 'chest';
      chestGroup.position.set(0, 0.88, 0);
      const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.82, 6, 12), mainMat);
      torso.rotation.x = Math.PI / 2;
      torso.scale.set(0.95, 1.0, 1.08);
      torso.castShadow = true;
      chestGroup.add(torso);
      g.add(chestGroup);

      // Angled muscular neck
      const neckLen = isLongNeck ? 1.45 : 0.52;
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, neckLen, 10), mainMat);
      neck.position.set(0, 1.05 + (isLongNeck ? 0.55 : 0), 0.62);
      neck.rotation.x = isLongNeck ? 0.25 : 0.58;
      neck.castShadow = true;
      g.add(neck);

      // Sculpted Cranium + Tapered Snout + Ears + Glossy Eyes
      const head = new THREE.Group();
      head.name = 'head';
      head.position.set(0, isLongNeck ? 2.05 : 1.25, 0.88);
      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mainMat);
      cranium.scale.set(0.92, 0.88, 1.1);
      cranium.castShadow = true;
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.15, 0.34, 8), mainMat);
      snout.rotation.x = Math.PI / 2;
      snout.position.set(0, -0.05, 0.24);
      const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), darkMat);
      noseTip.position.set(0, -0.03, 0.40);
      head.add(cranium, snout, noseTip);

      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.16, 6), mainMat);
        ear.position.set(side * 0.15, 0.20, -0.04);
        ear.rotation.z = side * -0.22;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 8), eyeMat);
        eye.position.set(side * 0.15, 0.06, 0.16);
        const pup = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), pupilMat);
        pup.position.set(side * 0.155, 0.06, 0.185);
        head.add(ear, eye, pup);
      }

      if (isManed) {
        const mane = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), new THREE.MeshStandardMaterial({ color: 0x3b2212, roughness: 0.92 }));
        mane.position.set(0, -0.02, -0.08);
        head.add(mane);
      }
      if (isAntlered) {
        for (const side of [-1, 1]) {
          const antlerMain = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.035, 0.55, 6), hornMat);
          antlerMain.position.set(side * 0.14, 0.42, -0.02);
          antlerMain.rotation.z = side * -0.35;
          const tine = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.22, 5), hornMat);
          tine.position.set(side * 0.22, 0.46, 0.10);
          tine.rotation.x = 0.5;
          head.add(antlerMain, tine);
        }
      }
      g.add(head);

      // 4 Articulated Legs (Front & Hind Quarters)
      const legOffsets: Array<[number, number, string]> = [
        [-0.28, 0.45, 'leg_left'],
        [0.28, 0.45, 'leg_right'],
        [-0.28, -0.45, 'leg_back_l'],
        [0.28, -0.45, 'leg_back_r'],
      ];
      legOffsets.forEach(([lx, lz, lName]) => {
        const legPivot = new THREE.Group();
        legPivot.name = lName;
        legPivot.position.set(lx, 0.72, lz);
        const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.085, 0.42, 8), mainMat);
        upper.position.y = -0.18;
        upper.castShadow = true;
        const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.062, 0.36, 8), darkMat);
        lower.position.y = -0.52;
        const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.18), darkMat);
        paw.position.set(0, -0.68, 0.03);
        legPivot.add(upper, lower, paw);
        g.add(legPivot);
      });

      const tail = new THREE.Group();
      tail.name = 'tail_base';
      tail.position.set(0, 0.94, -0.72);
      const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.072, 0.62, 7), mainMat);
      tailMesh.rotation.x = -0.55;
      tailMesh.position.set(0, -0.15, -0.22);
      tail.add(tailMesh);
      g.add(tail);
    }

    return g;
  }

  private disposeAgent(id: string, a: WildlifeAgent) {
    this.scene.remove(a.group);
    a.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        if (!o.geometry.userData?.__sharedResource) o.geometry.dispose();
        if (Array.isArray(o.material)) {
          o.material.forEach((m) => { if (!m.userData?.__sharedResource) m.dispose(); });
        } else if (!o.material.userData?.__sharedResource) {
          o.material.dispose();
        }
      }
    });
    this.agents.delete(id);
  }

  public dispose() {
    for (const [id, a] of this.agents) {
      this.disposeAgent(id, a);
    }
    this.agents.clear();
    this.scene.remove(this.particleGroup);
  }
}
