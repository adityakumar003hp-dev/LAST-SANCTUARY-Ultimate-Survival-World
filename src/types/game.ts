import type { AurelionSaveState } from '../engine/aurelion/AurelionSystems';

export type GameMode = 'survival' | 'creative' | 'story';
export type Difficulty = 'explorer' | 'standard' | 'survivor';
export type CameraView = 'first' | 'third' | 'second';

export type ItemCategory = 
  | 'resource' 
  | 'tool' 
  | 'weapon' 
  | 'building' 
  | 'consumable' 
  | 'medical' 
  | 'component';

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  icon: string; // Lucide icon identifier or visual key
  stackable: boolean;
  maxStack: number;
  weight: number;
  durability?: number;
  maxDurability?: number;
  // Consumable stats
  hungerRestore?: number;
  thirstRestore?: number;
  healthRestore?: number;
  staminaRestore?: number;
  // Tool stats
  toolType?: 'axe' | 'pickaxe' | 'hammer' | 'weapon' | 'ranged';
  damage?: number;
  harvestEfficiency?: {
    wood?: number;
    stone?: number;
    metal?: number;
  };
}

export interface InventorySlot {
  item: ItemDefinition;
  count: number;
  durability?: number;
}

export interface CraftingRecipe {
  id: string;
  resultItemId: string;
  resultCount: number;
  category: 'survival' | 'tools' | 'defense' | 'construction' | 'medical';
  ingredients: { itemId: string; count: number }[];
  requiredStation?: string; // e.g., 'workbench', 'campfire'
  craftTimeSeconds: number;
  description: string;
}

export type StructureCategory = 'defense' | 'structure' | 'utility' | 'furniture';

export interface StructureDefinition {
  id: string;
  name: string;
  category: StructureCategory;
  description: string;
  icon: string;
  width: number;
  height: number;
  depth: number;
  maxHealth: number;
  cost: { itemId: string; count: number }[];
  isDoor?: boolean;
  isLightSource?: boolean;
  isStorage?: boolean;
  isCraftingStation?: string; // 'workbench', 'campfire', 'water_collector'
  isBed?: boolean;
  isFarmPlot?: boolean;
  isNoticeBoard?: boolean;
  safeZoneContribution?: number; // meters radius of safe zone
  spikeDamage?: number; // damages attacking zombies
}

export interface PlacedStructure {
  uid: string;
  typeId: string;
  position: [number, number, number];
  rotationY: number;
  currentHealth: number;
  maxHealth: number;
  isOpen?: boolean; // for doors/gates
  storageItems?: (InventorySlot | null)[];
  farmStage?: number; // 0 = empty, 1 = growing, 2 = mature
  farmCrop?: string;
}

export type WeatherType = 'clear' | 'rain' | 'thunderstorm' | 'blizzard' | 'sandstorm' | 'toxic_fog';

export type ZombieType =
  | 'walker'
  | 'runner'
  | 'brute'
  | 'screamer'
  | 'crawler'
  | 'spitter'
  | 'juggernaut'
  | 'stalker'
  | 'alpha_boss';

export interface ZombieEntity {
  id: string;
  type: ZombieType;
  position: [number, number, number];
  rotationY: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  state: 'idle' | 'patrol' | 'chase' | 'attack_structure' | 'attack_player' | 'stagger' | 'dead';
  targetStructureUid?: string;
  attackCooldown: number;
  detectionRadius: number;
  deathTimer?: number;
  isBoss?: boolean;
  bossTitle?: string;
  variantSpeedMult?: number;
  rangedCooldown?: number;
  victimName?: string;
  victimRole?: string;
  victimAppearance?: {
    clothHex?: number;
    pantsHex?: number;
  };
}

export interface HarvestableResource {
  id: string;
  type: 'tree' | 'rock' | 'metal_scrap' | 'berry_bush' | 'water_well' | 'supply_crate';
  position: [number, number, number];
  health: number;
  maxHealth: number;
  yieldItem: string;
  yieldAmount: number;
  requiredTool?: 'axe' | 'pickaxe' | 'none';
  respawnTime?: number;
}

export type WeaponModId = 'suppressor_mod' | 'extended_mag_mod' | 'reflex_sight_mod';

export interface KillStats {
  total: number;
  headshots: number;
  bosses: number;
  stealth: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  hunger: number; // 0-100
  thirst: number; // 0-100
  temperature: number; // Celsius (e.g. 20-37)
  infection: number; // 0-100
  oxygen: number; // 0-100 for swimming & diving
  maxOxygen: number;
  isSwimming?: boolean;
  isSubmerged?: boolean;
  flashlightBattery?: number; // 0-100
  radiationExposure?: number; // 0-100
  noiseLevel?: number; // 0-100
  weatherType?: WeatherType;
  weatherIntensity?: number; // 0.0 - 1.5
  visibilityPercent?: number; // 0 - 100
  hungerDrainModifier?: number; // 1.0 = baseline
  thirstDrainModifier?: number; // 1.0 = baseline
  latitude?: number;
  longitude?: number;
  realElevationMeters?: number;
  countryName?: string;
  continentOrOcean?: string;
  nearestCityName?: string;
  geoTileKey?: string;
  equippedArmorId?: string;
  equippedMaskId?: string;
  perkUnlocks?: string[];
  killStats?: KillStats;
  rebirthCount?: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  skillPoints: number;
  skills: {
    strength: number;      // Melee damage, carry weight
    endurance: number;     // Stamina regen, max health
    engineering: number;   // Structure HP bonus, crafting speed
    survival: number;      // Hunger/thirst drain reduction
  };
}

export interface SandboxSettings {
  lootMultiplier: number; // 0.5 - 3.0
  zombieDensity: number; // 0.5 - 2.5
  dayLengthMultiplier: number; // 0.5 - 2.0
  weatherIntensity: number; // 0 - 2.0
  friendlyFire: boolean;
  permadeath: boolean;
  infinitePower: boolean;
}

export type KeybindAction =
  | 'moveForward'
  | 'moveBackward'
  | 'moveLeft'
  | 'moveRight'
  | 'sprint'
  | 'jump'
  | 'crouch'
  | 'interact'
  | 'flashlight'
  | 'reload'
  | 'quickSwap'
  | 'throwable'
  | 'buildMode'
  | 'character'
  | 'inventory'
  | 'crafting'
  | 'map'
  | 'cameraToggle'
  | 'radio'
  | 'fish';

export type KeybindConfig = Record<KeybindAction, string>;

export interface RadiantBounty {
  id: string;
  title: string;
  description: string;
  category: 'combat' | 'boss' | 'salvage' | 'survival' | 'defense';
  targetType: 'kill_any' | 'kill_brute' | 'kill_boss' | 'kill_headshot' | 'catch_fish' | 'craft_ammo' | 'survive_night';
  current: number;
  target: number;
  rewardXp: number;
  rewardItems: { itemId: string; count: number }[];
  claimed: boolean;
  completed: boolean;
}

export interface FloatingDamageNumber {
  id: string;
  x: number; // screen % 0..100
  y: number; // screen % 0..100
  amount: number;
  isHeadshot?: boolean;
  isStealth?: boolean;
  isPlayerDamage?: boolean;
  createdAt: number;
}

export interface SupplyDropState {
  id: string;
  position: [number, number, number];
  altitude: number;
  landed: boolean;
  looted: boolean;
  etaSeconds: number;
}

export interface CompanionState {
  speciesId: string;
  name: string;
  kind: 'mammal' | 'dinosaur' | 'bird';
  health: number;
  maxHealth: number;
  state: 'follow' | 'stay' | 'defend';
  isMounted?: boolean;
}

export interface EcosystemDossier {
  agentId: string;
  speciesName: string;
  scientificName: string;
  kind: string;
  diet: 'carnivore' | 'herbivore' | 'omnivore' | 'piscivore';
  state: string;
  intentDescription: string;
  health: number;
  maxHealth: number;
  hunger: number;
  thirst: number;
  generation: number;
  adaptationTrait: string;
  distance: number;
  isJuvenile: boolean;
  offspringCount: number;
  killsCount: number;
}

export interface EcosystemMetrics {
  totalOrganisms: number;
  predatorCount: number;
  herbivoreCount: number;
  totalBirths: number;
  totalPredations: number;
  highestGeneration: number;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  chapter: number;
  completed: boolean;
  rewards: { xp: number; items?: { itemId: string; count: number }[] };
  objectives: {
    id: string;
    description: string;
    current: number;
    target: number;
    completed: boolean;
  }[];
}

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';
export type GraphicsQualityMode = 'performance' | 'balanced' | 'quality' | 'ultra_5x' | 'absolute_realism';
export type GraphicsTargetFps = 30 | 60;
export type GraphicsGovernorState = 'optimal' | 'adapting_down' | 'stabilized' | 'recovering' | 'manual';

export interface GraphicsManagerConfig {
  preset: GraphicsQualityMode;
  autoGovernor: boolean;
  targetFps: GraphicsTargetFps;
  renderScale: number | null; // null = auto from preset; otherwise 0.6..2.0
  shadowsEnabled: boolean;
  shadowResolution: 0 | 512 | 1024 | 2048 | 3072;
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  anisotropyLevel: 1 | 4 | 8 | 16;
  viewDistanceChunks: number;
  particleDensity: number; // 0.25..1.0
  maxLocalLights: number; // 2..6
}

export interface GraphicsManagerSnapshot {
  preset: GraphicsQualityMode;
  autoGovernor: boolean;
  targetFps: GraphicsTargetFps;
  fps: number;
  frameTimeMs: number;
  p95FrameTimeMs: number;
  dpr: number;
  watchdogDprFactor: number;
  renderWidth: number;
  renderHeight: number;
  shadowMapRes: number;
  shadowsEnabled: boolean;
  postProcessingEnabled: boolean;
  bloomEnabled: boolean;
  anisotropy: number;
  viewDistanceChunks: number;
  effectiveViewDistanceChunks: number;
  particleDensity: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  isSoftwareGl: boolean;
  isMobile: boolean;
  gpuRendererName: string;
  contextHealth: 'healthy' | 'recovering' | 'safe_mode';
  contextLossCount: number;
  governorState: GraphicsGovernorState;
  governorLevel: number;
  governorActionLabel: string;
  frameSpikeCount: number;
  maxRenderBufferDim: number;
  maxTextureDim: number;
}

export interface GameSettings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  mouseSensitivity: number;
  fieldOfView: number;
  showCoordinates: boolean;
  graphicsQuality: GraphicsQuality;
  firstPersonCamera: boolean;
  viewDistanceChunks?: number;
}

export type BiomeType =
  | 'dense_forest'
  | 'green_plains'
  | 'abandoned_city'
  | 'small_village'
  | 'farmland'
  | 'industrial_zone'
  | 'mountain_range'
  | 'valley'
  | 'river_basin'
  | 'lake_district'
  | 'coastline'
  | 'island'
  | 'desert'
  | 'snow_peaks'
  | 'wetlands'
  | 'cave_system'
  | 'subway_tunnels'
  | 'research_facility'
  | 'tropical_jungle'
  | 'savannah'
  | 'taiga'
  | 'tundra'
  | 'volcanic_wastes'
  | 'mangrove_delta'
  | 'coral_coast'
  | 'badlands'
  | 'ancient_forest'
  | 'alpine_meadow'
  | 'bamboo_forest'
  | 'crystal_cavern'
  | 'sand_dunes'
  | 'rocky_canyon'
  | 'glacier_field'
  | 'ashlands'
  | 'waterfall_valley'
  | 'dinosaur_valley'
  | 'deep_swamp';

export interface BiomeDefinition {
  id: BiomeType;
  name: string;
  description: string;
  groundColor: number;
  fogColor: number;
  foliageColor: number;
  temperature: number; // Celsius
  elevationMultiplier: number;
  roughness: number;
  treeDensity: number;
  rockDensity: number;
  scrapDensity: number;
  zombieThreatLevel: number; // 1-5
  waterColor?: number;
}

export interface ChunkCoord {
  cx: number;
  cz: number;
}

export interface POIStructure {
  id: string;
  type: 'cabin' | 'ruined_house' | 'gas_station' | 'warehouse' | 'watchtower' | 'radio_bunker' | 'research_lab' | 'village' | 'town' | 'city_district' | 'hospital' | 'clinic' | 'fire_station' | 'police_station' | 'factory' | 'industrial_complex' | 'airport' | 'power_station' | 'water_treatment' | 'university' | 'shopping_centre' | 'freight_terminal';
  name: string;
  position: [number, number, number];
  rotationY: number;
  hasLoot: boolean;
  isLooted: boolean;
}

export interface ChunkData {
  coord: ChunkCoord;
  key: string;
  seed: number;
  biome: BiomeType;
  resources: HarvestableResource[];
  pois: POIStructure[];
  isLoaded: boolean;
  lodLevel: number;
  minElevation: number;
  maxElevation: number;
}

export interface ChunkModificationData {
  destroyedResourceIds: string[];
  openedPoiIds: string[];
  placedStructures: PlacedStructure[];
}

export interface MapWaypoint {
  id: string;
  name: string;
  position: [number, number, number];
  icon: string;
  color: string;
  isCustom?: boolean;
}

// --- Base Systems & Modern Sanctuary ---
export type BaseLevel = 1 | 2 | 3 | 4;

export interface PowerState {
  solarProductionKw: number;
  generatorProductionKw: number;
  totalProductionKw: number;
  consumptionKw: number;
  batteryCurrentKwh: number;
  batteryCapacityKwh: number;
  isGeneratorRunning: boolean;
  generatorFuel: number; // 0-100%
  isPowered: boolean;
}

export interface WaterState {
  storageLiters: number;
  maxCapacityLiters: number;
  rainCatchmentRate: number; // L/h
  purificationRate: number; // L/h
  cleanWaterLiters: number;
}

export interface FoodState {
  refrigeratorRations: number;
  pantryRations: number;
  isRefrigerated: boolean;
  daysOfFoodRemaining: number;
}

export interface SecurityState {
  isAlarmArmed: boolean;
  isAlarmTriggered: boolean;
  activeGateLocked: boolean;
  nearbyZombiesDetected: number;
  cctvChannels: {
    id: number;
    name: string;
    cameraPosition: [number, number, number];
    lookAt: [number, number, number];
    status: 'online' | 'offline' | 'alert';
  }[];
}

export type NPCRole = 'scout' | 'engineer' | 'botanist' | 'medic' | 'idle';

export interface NPCSurvivor {
  id: string;
  name: string;
  role: NPCRole;
  assignedRoom: string;
  currentTask: string;
  health: number;
  maxHealth: number;
  morale: number; // 0-100
  position: [number, number, number];
  avatarColor: string;
}

export interface ResearchTech {
  id: string;
  name: string;
  description: string;
  costComponents: number;
  costMetal: number;
  unlocked: boolean;
  icon: string;
  category: 'power' | 'defense' | 'farming' | 'medical' | 'vehicle';
}

export type VehicleType = 'atv' | 'enforce' | 'car' | 'bicycle' | 'motorbike' | 'buggy' | 'motorboat' | 'armored_truck';

export interface VehicleState {
  id: string;
  name: string;
  type?: VehicleType;
  position: [number, number, number];
  rotationY: number;
  batteryPercent: number; // 0-100% or fuel
  headlightsOn: boolean;
  isOccupied: boolean;
  trunkInventory: (InventorySlot | null)[];
  odometerKm?: number;
  isLocked?: boolean;
  gear?: 'P' | 'R' | 'N' | 'D' | '1' | '2' | '3' | '4' | '5';
  rpm?: number;
  engineRunning?: boolean;
  fuelType?: 'electric' | 'gasoline' | 'pedal';
}

export interface BaseState {
  level: BaseLevel;
  power: PowerState;
  water: WaterState;
  food: FoodState;
  security: SecurityState;
  npcs: NPCSurvivor[];
  research: ResearchTech[];
  vehicle: VehicleState;
  overallHealth: number;
}

export interface StoryObjectiveState {
  id: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export interface StoryCheckpointData {
  campaignDay: number; // 1 to 10
  missionNumber: number; // 1 to 70
  missionId: string; // e.g. 'LS_D8_04'
  missionTitle: string;
  missionDescription: string;
  location: string;
  checkpointId: string; // e.g. 'checkpoint_m53_lab_power'
  checkpointPosition: [number, number, number];
  activeObjective: string;
  objectives: StoryObjectiveState[];
  completedObjectivesCount: number;
  totalObjectivesCount: number;
  progressPercent: number; // 0 to 100
  completedMissionNumbers: number[];
  storyFlags: Record<string, any>;
  isFreeExplorationUnlocked: boolean; // true if Mission 70 genuinely completed
  unlockedFacilities?: string[];
  weatherState?: string;
}

export interface SaveSlotMetadata {
  id: string;
  name: string;
  characterName: string;
  dayCount: number;
  timeString: string;
  timestamp: number;
  difficulty: Difficulty;
  gameMode: GameMode;
  campaignDay?: number;
  missionNumber?: number;
  missionTitle?: string;
  checkpointId?: string;
  progressPercent?: number;
  isFreeExploration?: boolean;
}

export interface EarthOriginConfig {
  id: string;
  name: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
}

export interface GlobalOutbreakCitySave {
  cityId: string;
  healthyCount: number;
  transformingCount: number;
  infectedCount: number;
  evacuatedCount: number;
  powerGridRatio: number;
}

export interface GlobalOutbreakSaveData {
  apocalypticSeverity: number;
  powerGridStability: number;
  totalGlobalInfected: number;
  totalGlobalTransforming: number;
  totalGlobalEvacuated: number;
  cityStates: GlobalOutbreakCitySave[];
}

export interface CompoundSecuritySaveData {
  version: 1;
  mainGateOpen: boolean;
  pedestrianGatesOpen: [boolean, boolean];
  vehicleGatesOpen: [boolean, boolean];
  garageShutterOpen: boolean;
  turrets: Array<{ id: string; ammo: number; health: number; killsCount: number }>;
}

export interface FullGameSave {
  saveVersion?: number;
  earthOrigin?: EarthOriginConfig;
  globalOutbreakState?: GlobalOutbreakSaveData;
  metadata: SaveSlotMetadata;
  worldSeed: number;
  playerPosition: [number, number, number];
  playerRotation: number;
  playerStats: PlayerStats;
  inventory: (InventorySlot | null)[];
  hotbar: (InventorySlot | null)[];
  selectedHotbarIndex: number;
  structures: PlacedStructure[];
  quests: Quest[];
  gameTimeMinutes: number;
  dayCount: number;
  lastSleptDay?: number;
  nightHordeCountDefeated: number;
  // World Streaming & Base Additions
  discoveredChunks?: string[];
  waypoints?: MapWaypoint[];
  chunkModifications?: Record<string, ChunkModificationData>;
  baseState?: BaseState;
  rescuedSurvivorIds?: string[];
  tamedCompanion?: CompanionState | null;
  prologueState?: import('./prologue').PrologueSaveData;
  storyCheckpoint?: StoryCheckpointData;
  unlockedFacilities?: string[];
  weatherState?: string;
  weatherType?: WeatherType;
  bounties?: RadiantBounty[];
  sandboxSettings?: SandboxSettings;
  deathBag?: {
    position: [number, number, number];
    items: (InventorySlot | null)[];
  } | null;
  weaponMods?: Record<string, WeaponModId[]>;
  rebirthCount?: number;
  ecosystemMetrics?: EcosystemMetrics;
  trainSaveState?: TrainSaveState;
  railwayNPCSaveState?: RailwayNPCSaveRecord[];
  activeRailwayTicket?: RailwayTicket;
  compoundState?: CompoundSecuritySaveData;
  aurelionState?: AurelionSaveState;
  nexusState?: import('../engine/nexus/NexusSystems').NexusSaveState;
}

export type RailwayPassengerClass =
  | 'II' // General Class
  | 'SL' // Sleeper Class
  | '3A' // AC 3-Tier
  | '2A' // AC 2-Tier
  | '1A' // AC First Class
  | 'CC' // AC Chair Car
  | 'EC' // Executive Chair Car
  | 'SALOON' // Luxury Saloon / Anubhuti Suite
  | 'DIVYANGJAN'; // Accessible / Divyangjan

export interface RailwayTicket {
  pnr: string;
  trainNumber: string;
  trainName: string;
  sourceStation: string;
  destinationStation: string;
  travelClass: RailwayPassengerClass;
  coach: string;
  berthSeat: string;
  platform: number;
  departureTime: string;
  fareCredits: number;
  timestamp: number;
}

export interface RailwayNPCSaveRecord {
  id: string;
  position: [number, number, number];
  currentStationIndex: number;
  assignedTrackZ: number;
  state: string;
  destinationStation: string;
  currentTrainId?: string;
  localTrainPos?: [number, number, number];
  assignedSeatId?: string | null;
  assignedStationSeatId?: string | null;
  stateTimer: number;
  walkPhase: number;
  yaw: number;
  targetYaw: number;
}

export interface TrainSaveState {
  inTrain: boolean;
  trainId: string;
  line: string;
  carriageIndex: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  localTrainPos: [number, number, number];
  isDriving: boolean;
  trainSpeed: number;
  cameraMode?: 'interior_1st' | 'interior_3rd' | 'cab' | 'chase' | 'rear';
}


