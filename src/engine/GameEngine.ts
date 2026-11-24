import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RealismShaderGlobals, CinematicPostShader } from './shaders/RealismShaders';
import { WorldTerrain, getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { ZombieManager } from './ZombieManager';
import { PlayerController } from './PlayerController';
import { soundEngine } from '../utils/audio';
import { getWaterRippleNormalMap } from '../utils/proceduralTextures';
import { HarvestableResource, PlacedStructure, PlayerStats, Quest, SaveSlotMetadata, FullGameSave, GameMode, Difficulty, ItemDefinition, VehicleState, CompanionState, EcosystemDossier, EcosystemMetrics, InventorySlot, RailwayTicket, GraphicsQuality, GraphicsQualityMode, GraphicsManagerConfig, GraphicsManagerSnapshot, BaseLevel, BaseState, NPCRole } from '../types/game';
import { GraphicsManager, probeGraphicsHardware } from './graphics/GraphicsManager';
import { ITEMS } from '../data/items';
import { saveGameToSlot } from '../utils/storage';
import { ChunkManager } from './world/ChunkManager';
import { WorldPersistence } from './world/WorldPersistence';
import { WildlifeManager } from './WildlifeManager';
import { SurvivorRescueManager, SurvivorDialogue } from './SurvivorRescueManager';
import { NPCSettlementManager } from './base/NPCSettlementManager';
import { VehicleParkingManager } from './base/VehicleParkingManager';
import { PowerManager } from './base/PowerManager';
import { WaterManager } from './base/WaterManager';
import { FoodStorageManager } from './base/FoodStorageManager';
import { SecurityManager } from './base/SecurityManager';
import { ResearchManager } from './base/ResearchManager';
import { PrologueManager } from './prologue/PrologueManager';
import { ProloguePhase, PrologueSubtitle, PrologueSaveData, StoryCompanion } from '../types/prologue';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { DynamicPropPhysicsManager } from './physics/DynamicPropPhysicsManager';
import { ObjectiveNavigator } from './navigation/ObjectiveNavigator';
import { ObjectiveNavigationState } from '../types/physics';
import { ContextSoundscapeManager } from './audio/ContextSoundscapeManager';
import { AITrainManager } from './world/AITrainManager';
import { AtmosphericSky } from './rendering/AtmosphericSky';
import { HouseInteractionController, HouseInteractionType } from './interaction/HouseInteractionController';
import { isProtectedSpawnZone } from './world/ProtectedSpawnZones';
import { StorylineCheckpointManager } from './campaign/StorylineCheckpointManager';
import { WeatherManager } from './weather/WeatherManager';
import { TacticalCombatEffects } from './combat/TacticalCombatEffects';
import { WorldEventsManager, ExtractionState } from './world/WorldEventsManager';
import { WeatherType, SandboxSettings, WeaponModId, RadiantBounty, SupplyDropState, ZombieEntity, EarthOriginConfig } from '../types/game';
import { WorldCoordinates } from './world/WorldCoordinates';
import { GlobalOutbreakSimulator } from './world/GlobalOutbreakSimulator';
import { DEFAULT_EARTH_ORIGIN, EarthProjection, METERS_PER_DEG_LAT, normalizeLon } from './geo/EarthProjection';
import { RealEarthDataset } from './geo/RealEarthDataset';
import { RealWorldCities } from './geo/RealWorldCities';

export interface GameEngineCallbacks {
  onStatsChange: (stats: PlayerStats) => void;
  onTimeChange: (timeMinutes: number, dayCount: number, isNight: boolean, isDusk: boolean) => void;
  onHordeEvent: (event: 'dusk_warning' | 'night_horde_start' | 'dawn_victory' | null) => void;
  onInteractionPrompt: (prompt: string | null) => void;
  onQuestsUpdate: (quests: Quest[]) => void;
  onOpenStorage: (struct: PlacedStructure) => void;
  onOpenCrafting: (stationType?: string) => void;
  onResourceHarvested: (res: HarvestableResource, item: ItemDefinition, amount: number) => void;
  onItemCollected: (itemId: string, count: number) => void;
  onOpenNoticeBoard: () => void;
  onGameOver: () => void;
  onOpenDialogue?: (dialogue: SurvivorDialogue) => void;
  onVehicleChange?: (vehicle: VehicleState | null, speed: number) => void;
  onCompanionChange?: (companion: CompanionState | null) => void;
  onPrologueSubtitle?: (subtitle: PrologueSubtitle | null) => void;
  onProloguePhase?: (phase: ProloguePhase) => void;
  onPrologueTitle?: (banner: { title: string; subtitle: string; day: string } | null) => void;
  onPrologueObjective?: (obj: string | null) => void;
  onEcosystemDossier?: (dossier: EcosystemDossier | null) => void;
  onEcosystemMetrics?: (metrics: EcosystemMetrics) => void;
  onNavigationUpdate?: (navState: ObjectiveNavigationState) => void;
  onOpenArmory?: () => void;
  onOpenFridge?: () => void;
  onOpenPhone?: () => void;
  onOpenRailwayOperations?: () => void;
  onOpenRailwayTickets?: () => void;
  onOpenMedicalClinic?: () => void;
  onOpenApartmentStatus?: () => void;
  onOpenSecurityCommandCenter?: () => void;
  onTrainChange?: (hudData: any | null) => void;
  onOpenFriendModal?: (friend: StoryCompanion) => void;
  onGetInventory?: () => (InventorySlot | null)[];
  onGetHotbar?: () => (InventorySlot | null)[];
  onGetSelectedHotbarIndex?: () => number;
  onBiomeChange?: (biomeId: string, biomeName: string) => void;
  onSpeciesScanned?: (speciesId: string) => void;
  onCareerEvent?: (event: {
    type:
      | 'zombie_killed'
      | 'structure_built'
      | 'resource_harvested'
      | 'species_logged'
      | 'survivor_rescued'
      | 'horde_defeated'
      | 'save_created';
    count?: number;
  }) => void;
  onWeatherChange?: (weather: WeatherType, intensity?: number) => void;
  onHitEvent?: (ev: { amount: number; isHeadshot?: boolean; isStealth?: boolean; screenX: number; screenY: number }) => void;
  onBossStatusChange?: (boss: { name: string; health: number; maxHealth: number } | null) => void;
  onWorldEventUpdate?: (ev: { supplyDrop: SupplyDropState | null; extraction: ExtractionState }) => void;
  onBountyProgress?: (targetType: RadiantBounty['targetType'], amount?: number) => void;
  onExtractionVictory?: () => void;
  onOpenBlueprintModal?: () => void;
  onOpenFishingModal?: () => void;
  onGetBounties?: () => RadiantBounty[];
  onAutoSaved?: (info: { slotId: string; timestamp: number; dayCount: number; timeString: string }) => void;
}

export class GameEngine {
  public container: HTMLDivElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  // Subsystems
  public terrain: WorldTerrain;
  public buildingMgr: BuildingManager;
  public zombieMgr: ZombieManager;
  public player: PlayerController;
  public chunkManager: ChunkManager;
  public worldPersistence: WorldPersistence;
  public wildlifeManager: WildlifeManager;
  public rescueManager: SurvivorRescueManager;
  public npcSettlementManager: NPCSettlementManager;
  public vehicleManager: VehicleParkingManager;
  public baseLevel: BaseLevel = 2;
  public powerManager: PowerManager;
  public waterManager: WaterManager;
  public foodManager: FoodStorageManager;
  public securityManager: SecurityManager;
  public researchManager: ResearchManager;
  public prologueManager: PrologueManager;
  public physicsManager: UnifiedPhysicsManager;
  public dynamicPropPhysics: DynamicPropPhysicsManager;
  public objectiveNavigator: ObjectiveNavigator;
  public soundscapeManager: ContextSoundscapeManager;
  public aiTrainManager: AITrainManager;
  public atmosphericSky: AtmosphericSky;
  public houseInteractionCtrl: HouseInteractionController;
  public storylineManager: StorylineCheckpointManager;
  public weatherManager: WeatherManager;
  public combatEffects: TacticalCombatEffects;
  public worldEventsManager: WorldEventsManager;
  public globalOutbreakSimulator: GlobalOutbreakSimulator;
  public earthOrigin: EarthOriginConfig = { ...DEFAULT_EARTH_ORIGIN };

  // Environment, Lights & Post-Processing
  private dirLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private pmremGenerator: THREE.PMREMGenerator;
  private envTexture: THREE.Texture | null = null;
  private lastEnvPhase: string = '';
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private cinematicPass: ShaderPass | null = null;
  private usePostProcessing: boolean = false;
  private wetAccum: number = 0;
  private engineClock: number = 0;

  // Time & Horde Simulation
  public gameTimeMinutes: number = 480; // 08:00 AM
  public dayCount: number = 1;
  public lastSleptDay: number = -1;
  public isNight: boolean = false;
  public isDusk: boolean = false;
  private duskWarningFired: boolean = false;
  private hordeWaveTimer: number = 0;
  private dawnVictoryFired: boolean = false;
  public nightHordesDefeated: number = 0;

  // Player RPG stats & inventory
  public playerStats: PlayerStats;
  public quests: Quest[] = [];
  public activeSlotItem: ItemDefinition | null = null;
  public gameMode: GameMode = 'survival';
  public difficulty: Difficulty = 'standard';
  public activeRailwayTicket?: RailwayTicket;

  // Quality, Atmosphere Scaling & Graphics Manager
  public graphicsManager: GraphicsManager;
  public activeQualityMode: GraphicsQualityMode = 'balanced';
  private baseFov: number = 70;
  private resizeObserver: ResizeObserver | null = null;
  private envIntensityMultiplier: number = 1.0;
  private sunIntensityMultiplier: number = 1.0;
  private fogDensityMultiplier: number = 1.0;
  private activeMaxAnisotropy: number = 8;
  private activeShadowMapRes: number = 2048;
  private maxRenderBufferDim: number = 4096;
  private maxTextureDim: number = 4096;
  private rollingFps: number = 60;
  private lastFramePerfTime: number = 0;
  private watchdogDprFactor: number = 1.0;
  private activeLocalLightLimit: number = 4;

  // Game Loop Controls
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private frameId: number = 0;
  private clock: THREE.Timer;
  private localLightBudgetTimer: number = 0;
  private localLights: Array<THREE.PointLight | THREE.SpotLight> = [];
  private readonly maxActiveLocalLights: number = 4;
  public callbacks: GameEngineCallbacks;
  public activeSaveSlotId: string = 'autosave';
  public activeSaveSlotName: string = 'Autosave Slot';
  public characterName: string = 'Survivor';
  private autoSaveTimer: number = 0;
  private checkpointWriteQueue: Promise<void> = Promise.resolve();

  private enqueueCheckpointSave(saveData: FullGameSave): Promise<void> {
    const operation = this.checkpointWriteQueue.catch(() => undefined).then(() => saveGameToSlot(saveData));
    this.checkpointWriteQueue = operation.catch((error: unknown) => {
      console.error('Checkpoint save failed; the previous valid checkpoint was retained.', error);
    });
    return operation;
  }
  private scannerTimer: number = 0;
  private securityScreenTimer: number = 0;
  private uiSyncTimer: number = 0;
  private lastReportedBiomeId: string = '';
  private lastReportedWeather: WeatherType = 'clear';
  private weatherFogMultiplier: number = 1.0;
  private geigerTimer: number = 0;
  public sandboxSettings: SandboxSettings = {
    lootMultiplier: 1.0,
    zombieDensity: 1.0,
    dayLengthMultiplier: 1.0,
    weatherIntensity: 1.0,
    friendlyFire: false,
    permadeath: false,
    infinitePower: false,
  };
  public weaponMods: Record<string, WeaponModId[]> = {};
  public deathBagData: { position: [number, number, number]; items: (InventorySlot | null)[] } | null = null;
  private static readonly _camDir = new THREE.Vector3();
  private static readonly _tmpVecA = new THREE.Vector3();
  private static readonly _tmpVecB = new THREE.Vector3();
  private static readonly _tmpVecC = new THREE.Vector3();
  private static readonly _sunScreenVec = new THREE.Vector3();
  private static readonly _sunColor = new THREE.Color();
  private _livingTargetsBuffer: Array<{ id: string; kind: 'citizen' | 'survivor' | 'settlement' | 'wildlife' | 'regional_npc'; position: [number, number, number] }> = [];

  // Input State (Supports both digital key flags and 360-degree analog touch)
  public inputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    jump: false,
    sprint: false,
    crouch: false,
    analogX: 0,
    analogZ: 0,
    isAnalog: false,
  };

  // Crosshair Raycaster
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private screenCenter: THREE.Vector2 = new THREE.Vector2(0, 0);
  private passengerCameraYaw = 0;
  private passengerCameraPitch = 0.12;
  private passengerLookPointer: number | null = null;
  private passengerLookLast = new THREE.Vector2();
  private readonly onPassengerPointerDown = (event: PointerEvent) => {
    if (!this.aiTrainManager?.activePassengerTrain) return;
    this.passengerLookPointer = event.pointerId;
    this.passengerLookLast.set(event.clientX, event.clientY);
    try { this.renderer.domElement.setPointerCapture(event.pointerId); } catch { /* optional */ }
  };
  private readonly onPassengerPointerMove = (event: PointerEvent) => {
    if (this.passengerLookPointer !== event.pointerId || !this.aiTrainManager?.activePassengerTrain) return;
    const dx = event.clientX - this.passengerLookLast.x;
    const dy = event.clientY - this.passengerLookLast.y;
    this.passengerLookLast.set(event.clientX, event.clientY);
    this.passengerCameraYaw -= dx * 0.008;
    this.passengerCameraPitch = THREE.MathUtils.clamp(this.passengerCameraPitch - dy * 0.006, -0.55, 0.75);
  };
  private readonly onPassengerPointerUp = (event: PointerEvent) => {
    if (this.passengerLookPointer === event.pointerId) this.passengerLookPointer = null;
  };

  // Software WebGL flag
  public isSoftwareGl: boolean = false;

  constructor(
    container: HTMLDivElement,
    initialSave: FullGameSave | null,
    callbacks: GameEngineCallbacks,
    customSeed: number = 42,
    startingOrigin?: EarthOriginConfig,
    launchOptions?: { gameMode?: GameMode; difficulty?: Difficulty; characterName?: string }
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Timer();
    this.gameMode = initialSave?.metadata?.gameMode ?? launchOptions?.gameMode ?? 'survival';
    this.difficulty = initialSave?.metadata?.difficulty ?? launchOptions?.difficulty ?? 'standard';
    this.characterName = initialSave?.metadata?.characterName ?? launchOptions?.characterName ?? 'Survivor';
    this.activeSaveSlotId = initialSave?.metadata?.id || 'autosave';
    this.activeSaveSlotName = initialSave?.metadata?.name || 'Autosave Slot';
    this.earthOrigin = initialSave?.earthOrigin
      ? { ...initialSave.earthOrigin }
      : startingOrigin
        ? { ...startingOrigin }
        : { ...DEFAULT_EARTH_ORIGIN };
    WorldCoordinates.setWorldOrigin(this.earthOrigin);

    // 1. Probe GPU hardware & initialize GraphicsManager BEFORE creating WebGLRenderer
    const hwCaps = probeGraphicsHardware();
    this.graphicsManager = new GraphicsManager(hwCaps);
    const isMobile = hwCaps.isMobile;
    this.isSoftwareGl = hwCaps.isSoftwareGl;
    this.maxRenderBufferDim = hwCaps.maxRenderBufferDim;
    this.maxTextureDim = hwCaps.maxTextureDim;

    // Initialize Three.js WebGLRenderer safely with MSAA on hardware GPUs
    let glRenderer: THREE.WebGLRenderer;
    try {
      glRenderer = new THREE.WebGLRenderer({
        antialias: !this.isSoftwareGl && hwCaps.deviceMemoryGb > 2,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        depth: true,
        stencil: false,
      });
    } catch {
      const fallbackCanvas = document.createElement('canvas');
      glRenderer = new THREE.WebGLRenderer({
        canvas: fallbackCanvas,
        antialias: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
        preserveDrawingBuffer: false,
        depth: true,
        stencil: false,
      });
    }
    this.renderer = glRenderer;
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.addEventListener('pointerdown', this.onPassengerPointerDown);
    this.renderer.domElement.addEventListener('pointermove', this.onPassengerPointerMove);
    this.renderer.domElement.addEventListener('pointerup', this.onPassengerPointerUp);
    this.renderer.domElement.addEventListener('pointercancel', this.onPassengerPointerUp);

    // Listen for WebGL context loss & auto-step down to Safe Mode on recovery
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost — activating GraphicsManager Safe Recovery Mode');
      this.graphicsManager.handleContextLost();
      this.usePostProcessing = false;
      this.renderer.shadowMap.enabled = false;
      if (this.dirLight) this.dirLight.castShadow = false;
    }, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored — reinitializing safe render pipeline');
      this.graphicsManager.handleContextRestored();
      this.rebuildComposerSafely();
      this.applyGraphicsConfiguration(false);
      this.onResize();
      if (this.isRunning) {
        this.startLoop();
      }
    }, false);

    // Refine hardware WebGL buffer/texture ceilings directly from active context
    try {
      const glCtx = this.renderer.getContext();
      if (glCtx) {
        this.maxRenderBufferDim = Math.min(8192, Number(glCtx.getParameter(glCtx.MAX_RENDERBUFFER_SIZE)) || this.maxRenderBufferDim);
        this.maxTextureDim = Math.min(8192, Number(glCtx.getParameter(glCtx.MAX_TEXTURE_SIZE)) || this.maxTextureDim);
        this.graphicsManager.caps.maxRenderBufferDim = this.maxRenderBufferDim;
        this.graphicsManager.caps.maxTextureDim = this.maxTextureDim;
        this.graphicsManager.caps.maxAnisotropy = Math.max(1, this.renderer.capabilities.getMaxAnisotropy());
      }
    } catch {}

    const width = Math.max(container.clientWidth || window.innerWidth, 280);
    const height = Math.max(container.clientHeight || window.innerHeight, 240);
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    // Cap pixel ratio cleanly: 1.0 on mobile/software, up to 1.5 on GPU desktop
    this.renderer.setPixelRatio(
      isMobile || this.isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.5)
    );
    // Three.js r187 removed PCFSoftShadowMap. PCFShadowMap is the supported PCF mode.
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera (with portrait-safe aspect projection)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // daytime sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.007);

    this.camera = new THREE.PerspectiveCamera(
      this.baseFov,
      width / height,
      0.1,
      520
    );
    this.updateCameraProjection(width, height);

    // 4. Dynamic Outdoor Atmospheric IBL via PMREMGenerator
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    this.refreshOutdoorEnvironment('day', 0x1e60a8, 0xcbe5f8, 0x3b4d30, 0xfff8ea, 0.92);

    // 5. Outdoor Key + Atmospheric Sky Bounce Fill Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x89c2f8, 0x3a4b32, 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaee, 2.45);
    this.dirLight.position.set(60, 90, 40);
    this.dirLight.castShadow = !this.isSoftwareGl;
    const initialShadowRes = isMobile ? 1024 : 2048;
    this.dirLight.shadow.mapSize.width = initialShadowRes;
    this.dirLight.shadow.mapSize.height = initialShadowRes;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 240;
    const d = 44;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.00025;
    this.dirLight.shadow.normalBias = 0.03;
    this.dirLight.shadow.radius = 2.6;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // Subtle cool sky-scatter bounce light opposite the sun for soft shadow separation
    this.fillLight = new THREE.DirectionalLight(0x9bc4f2, 0.36);
    this.fillLight.position.set(-50, 40, -35);
    this.fillLight.castShadow = false;
    this.scene.add(this.fillLight);

    // 5b. Atmospheric Skydome & Celestial Spheres
    this.atmosphericSky = new AtmosphericSky(this.scene, this.dirLight);

    // 5c. GPU HDR Post-Processing (EffectComposer + subtle high-threshold Bloom + ACES OutputPass)
    // Safely sized by GraphicsManager to avoid HalfFloat MSAA OOM on constrained GPUs.
    if (!this.isSoftwareGl) {
      this.rebuildComposerSafely(width, height);
    }

    // 6. Subsystem Instantiation
    this.physicsManager = new UnifiedPhysicsManager(this.scene);
    this.dynamicPropPhysics = new DynamicPropPhysicsManager(this.scene);
    this.objectiveNavigator = new ObjectiveNavigator(this.scene);
    this.soundscapeManager = new ContextSoundscapeManager();
    const seed = initialSave ? initialSave.worldSeed : customSeed;
    this.terrain = new WorldTerrain(this.scene, seed);
    this.buildingMgr = new BuildingManager(this.scene);
    this.zombieMgr = new ZombieManager(this.scene);
    this.player = new PlayerController(this.scene, this.camera, seed);
    this.worldPersistence = new WorldPersistence();
    if (initialSave) this.worldPersistence.importSaveData({ discoveredChunks: initialSave.discoveredChunks, waypoints: initialSave.waypoints, chunkModifications: initialSave.chunkModifications });
    this.chunkManager = new ChunkManager(this.scene, seed, 'medium', this.worldPersistence);
    this.wildlifeManager = new WildlifeManager(this.scene, seed);
    this.rescueManager = new SurvivorRescueManager(this.scene, seed);
    this.npcSettlementManager = new NPCSettlementManager(this.scene);
    this.vehicleManager = new VehicleParkingManager(this.scene);
    this.powerManager = new PowerManager();
    this.waterManager = new WaterManager();
    this.foodManager = new FoodStorageManager();
    this.securityManager = new SecurityManager();
    this.researchManager = new ResearchManager();
    this.aiTrainManager = new AITrainManager(this.scene, seed);
    this.player.aiTrainManager = this.aiTrainManager;
    this.weatherManager = new WeatherManager(this.scene);
    this.combatEffects = new TacticalCombatEffects(this.scene);
    this.worldEventsManager = new WorldEventsManager(this.scene, (x, z) => getTerrainHeight(x, z, seed));
    this.globalOutbreakSimulator = new GlobalOutbreakSimulator(this.scene, seed);
    if (initialSave?.globalOutbreakState) {
      this.globalOutbreakSimulator.importSaveData(initialSave.globalOutbreakState);
    }
    if (initialSave?.activeRailwayTicket) {
      this.activeRailwayTicket = initialSave.activeRailwayTicket;
    }
    if (initialSave) this.rescueManager.importRescued(initialSave.rescuedSurvivorIds);
    if (initialSave?.baseState) {
      const bs = initialSave.baseState;
      this.baseLevel = bs.level ?? 2;
      if (bs.power) this.powerManager.state = { ...this.powerManager.state, ...bs.power };
      if (bs.water) this.waterManager.state = { ...this.waterManager.state, ...bs.water };
      if (bs.food) this.foodManager.state = { ...this.foodManager.state, ...bs.food };
      if (bs.security) {
        this.securityManager.state = {
          ...this.securityManager.state,
          ...bs.security,
          cctvChannels:
            bs.security.cctvChannels && bs.security.cctvChannels.length > 0
              ? bs.security.cctvChannels
              : this.securityManager.state.cctvChannels,
        };
      }
      if (bs.npcs && bs.npcs.length > 0) {
        bs.npcs.forEach((savedNpc) => this.npcSettlementManager.assignRole(savedNpc.id, savedNpc.role));
      }
      if (bs.research && bs.research.length > 0) {
        bs.research.forEach((tech) => {
          if (tech.unlocked) this.researchManager.unlockTech(tech.id);
        });
      }
    }
    if (initialSave?.baseState?.vehicle) {
      this.vehicleManager.vehicleState = { ...initialSave.baseState.vehicle };
      this.vehicleManager.mesh.position.set(...this.vehicleManager.vehicleState.position);
      this.vehicleManager.mesh.rotation.y = this.vehicleManager.vehicleState.rotationY;
    }
    if (initialSave?.tamedCompanion) {
      this.wildlifeManager.companionState = initialSave.tamedCompanion;
      this.callbacks.onCompanionChange?.(initialSave.tamedCompanion);
    }

    // 7. Instantiate Prologue Manager
    const missionNum = initialSave?.storyCheckpoint?.missionNumber ?? (initialSave?.prologueState?.chapter ?? 1);
    const isMissionBeyondPrologue = missionNum > 14;

    const prologueInitData: PrologueSaveData | undefined = initialSave?.prologueState || (initialSave ? {
      phase: isMissionBeyondPrologue ? 'completed' : 'D1_E01_NEW_MORNING',
      isCompleted: isMissionBeyondPrologue,
      day: initialSave.storyCheckpoint?.campaignDay ?? initialSave.dayCount,
      craterFormed: isMissionBeyondPrologue || missionNum >= 9,
      friendsMet: { marcus: true, chloe: true, maya: true },
      shelterUnlocked: true,
      shelterDoorClosed: true,
      generatorOnline: true,
      radioInspected: true,
      suppliesInspected: true,
      companions: {},
    } : undefined);

    this.prologueManager = new PrologueManager(
      this,
      {
        onSubtitleChange: (sub) => this.callbacks.onPrologueSubtitle?.(sub),
        onPhaseChange: (phase) => this.callbacks.onProloguePhase?.(phase),
        onTitleBanner: (banner) => this.callbacks.onPrologueTitle?.(banner),
        onObjectiveUpdate: (obj) => this.callbacks.onPrologueObjective?.(obj),
      },
      prologueInitData
    );

    // Register solid world colliders with physics manager
    this.prologueManager.townMgr.registerColliders(this.physicsManager);
    this.prologueManager.companionMgr.registerColliders(this.physicsManager);

    // Storyline Checkpoint Manager (Handles all 70 missions and exact checkpoint restoration)
    this.storylineManager = new StorylineCheckpointManager(this);

    // House & Furniture Universal Interaction Controller
    this.houseInteractionCtrl = new HouseInteractionController(this.player);
    this.houseInteractionCtrl.onPrompt = (msg) => this.callbacks.onInteractionPrompt(msg);
    this.houseInteractionCtrl.onSubtitle = (sub) => this.callbacks.onPrologueSubtitle?.(sub);
    this.houseInteractionCtrl.onCompleteAction = (type) => this.handleHouseInteractionComplete(type);

    // 8. Load or Initialize Game State
    if (initialSave) {
      this.gameTimeMinutes = initialSave.gameTimeMinutes;
      this.dayCount = initialSave.dayCount;
      if (initialSave.lastSleptDay !== undefined) {
        this.lastSleptDay = initialSave.lastSleptDay;
      }
      this.nightHordesDefeated = initialSave.nightHordeCountDefeated;
      this.playerStats = initialSave.playerStats;
      if (this.playerStats.oxygen === undefined) {
        this.playerStats.oxygen = 100;
        this.playerStats.maxOxygen = 100;
      }
      this.playerStats.flashlightBattery = this.playerStats.flashlightBattery ?? 100;
      this.playerStats.radiationExposure = this.playerStats.radiationExposure ?? 0;
      this.playerStats.noiseLevel = this.playerStats.noiseLevel ?? 0;
      this.playerStats.perkUnlocks = this.playerStats.perkUnlocks ?? [];
      this.playerStats.killStats = this.playerStats.killStats ?? { total: 0, headshots: 0, bosses: 0, stealth: 0 };
      this.playerStats.rebirthCount = initialSave.rebirthCount ?? this.playerStats.rebirthCount ?? 0;
      if (initialSave.weatherType) {
        this.weatherManager.setWeather(initialSave.weatherType);
      }
      if (initialSave.sandboxSettings) {
        this.sandboxSettings = { ...this.sandboxSettings, ...initialSave.sandboxSettings };
        this.weatherManager.setIntensityMultiplier(this.sandboxSettings.weatherIntensity);
      }
      if (initialSave.weaponMods) {
        this.weaponMods = { ...initialSave.weaponMods };
      }
      if (initialSave.deathBag) {
        this.deathBagData = initialSave.deathBag;
        this.combatEffects.setDeathBag(initialSave.deathBag.position);
      }
      this.player.position.set(...initialSave.playerPosition);
      this.player.avatarGroup.position.copy(this.player.position);
      this.player.velocity.set(0, 0, 0);
      this.player.isSleeping = false;
      this.player.yaw = initialSave.playerRotation;
      this.chunkManager.updatePlayerPosition(this.player.position, true);
      if (initialSave.structures && initialSave.structures.length > 0) {
        this.buildingMgr.loadSavedStructures(initialSave.structures);
      } else {
        this.buildingMgr.initStarterBase(954, 22);
      }
      this.dynamicPropPhysics.initCompoundProps(954, 22);
      this.gameMode = initialSave.metadata.gameMode;
      this.difficulty = initialSave.metadata.difficulty;

      // Exact Storyline Restoration
      if (initialSave.storyCheckpoint && this.gameMode === 'story') {
        this.storylineManager.restoreFromSave(initialSave.storyCheckpoint);
      } else {
        this.quests = Array.isArray(initialSave.quests) ? [...initialSave.quests] : [];
      }
      if (initialSave.trainSaveState?.inTrain) {
        this.aiTrainManager.restoreFromSaveState(initialSave.trainSaveState);
      }
      this.aiTrainManager.npcManager.restoreSaveState(initialSave.railwayNPCSaveState, this.aiTrainManager.trains);
    } else {
      // New Game: Start in Day 1 Peaceful Town Life
      this.buildingMgr.initStarterBase(954, 22);
      this.dynamicPropPhysics.initCompoundProps(954, 22);
      // The game begins with the player sleeping in bed on Floor 1 bedroom ON TOP of the mattress (-31.5, 0.88, 41.8)
      this.player.position.set(-31.5, 0.88, 41.8);
      this.player.avatarGroup.position.set(-31.5, 0.88, 41.8);
      this.player.yaw = Math.PI;
      this.player.startSleeping(7.0, new THREE.Vector3(-29.8, 0.245, 41.8));

      this.playerStats = {
        health: 100,
        maxHealth: 100,
        stamina: 100,
        maxStamina: 100,
        hunger: 95,
        thirst: 95,
        temperature: 24,
        infection: 0,
        oxygen: 100,
        maxOxygen: 100,
        flashlightBattery: 100,
        radiationExposure: 0,
        noiseLevel: 6,
        perkUnlocks: [],
        killStats: { total: 0, headshots: 0, bosses: 0, stealth: 0 },
        rebirthCount: 0,
        level: 1,
        xp: 0,
        xpToNextLevel: 100,
        skillPoints: 0,
        skills: {
          strength: 1,
          endurance: 1,
          engineering: 1,
          survival: 1,
        },
        latitude: this.earthOrigin.lat,
        longitude: this.earthOrigin.lon,
        realElevationMeters: 120,
        countryName: this.earthOrigin.country,
        continentOrOcean: this.earthOrigin.continent,
      };
      this.quests = [];
    }

    // Only spawn wandering zombies if prologue is already completed
    if (this.prologueManager.isCompleted) {
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 45;
        const z = Math.sin(angle) * 45;
        this.zombieMgr.spawnZombie('walker', [x, 0, z]);
      }
    }

    // Attach resize, orientation & visibility listeners
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onOrientationChange);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(this.container);
    }

    // Initialize GraphicsManager pipeline from stored preferences & hardware capabilities
    this.applyGraphicsConfiguration(false);

    // Enforce light budget BEFORE pre-warming WebGL shaders so excess local lights never compile heavy shader variants
    this.updateLocalLightBudget(true);

    // Pre-warm WebGL shader programs once on desktop hardware GPUs to prevent first-frame movement stutter
    if (!this.isSoftwareGl && !isMobile) {
      try {
        this.renderer.compile(this.scene, this.camera);
      } catch {}
    }

    // Start loop
    this.isRunning = true;
    this.startLoop();
  }

  private onVisibilityChange = () => {
    if (document.hidden) {
      this.clock.reset();
    } else {
      this.clock.reset(); // Prevent a large delta after the tab becomes visible again
    }
  };

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (!paused) {
      this.clock.reset(); // Discard paused time so simulation resumes smoothly
    }
  }

  private lastWidth: number = 0;
  private lastHeight: number = 0;

  private updateCameraProjection(w: number, h: number) {
    const aspect = Math.max(0.25, w / Math.max(1, h));
    this.camera.aspect = aspect;
    if (aspect < 1.0) {
      // Widen vertical FOV smoothly in portrait orientation so horizontal field stays open
      const clampedAspect = Math.max(aspect, 0.52);
      const baseHalfRad = THREE.MathUtils.degToRad(this.baseFov * 0.5);
      const portraitFovRad = 2 * Math.atan(Math.tan(baseHalfRad) / Math.pow(clampedAspect, 0.72));
      this.camera.fov = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(portraitFovRad), this.baseFov, 96);
    } else {
      this.camera.fov = this.baseFov;
    }
    this.camera.updateProjectionMatrix();
  }

  public setBaseFov(fov: number) {
    this.baseFov = THREE.MathUtils.clamp(fov, 55, 100);
    const w = this.lastWidth || Math.max(this.container?.clientWidth || window.innerWidth, 280);
    const h = this.lastHeight || Math.max(this.container?.clientHeight || window.innerHeight, 240);
    this.updateCameraProjection(w, h);
  }

  private onOrientationChange = () => {
    window.setTimeout(() => this.onResize(), 60);
    window.setTimeout(() => this.onResize(), 220);
  };

  public onResize = () => {
    if (!this.container) return;
    const w = Math.max(this.container.clientWidth || window.innerWidth, 280);
    const h = Math.max(this.container.clientHeight || window.innerHeight, 240);
    if (w === this.lastWidth && h === this.lastHeight) return;
    this.lastWidth = w;
    this.lastHeight = h;
    this.updateCameraProjection(w, h);
    this.applySafePixelRatio();
    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }
  };

  private targetDesiredDpr: number = 1.0;

  private rebuildComposerSafely(explicitW?: number, explicitH?: number) {
    if (this.isSoftwareGl) return;
    try {
      (this.cinematicPass as any)?.dispose?.();
      this.bloomPass?.dispose();
      this.composer?.dispose();
    } catch {}
    this.composer = null;
    this.bloomPass = null;
    this.cinematicPass = null;

    const w = explicitW ?? (this.lastWidth || Math.max(this.container?.clientWidth || window.innerWidth, 280));
    const h = explicitH ?? (this.lastHeight || Math.max(this.container?.clientHeight || window.innerHeight, 240));
    try {
      const samples = this.graphicsManager.getSafeComposerSamples(w, h, this.renderer.capabilities.isWebGL2);
      const rt = new THREE.WebGLRenderTarget(w, h, {
        type: THREE.HalfFloatType,
        samples,
      });
      this.composer = new EffectComposer(this.renderer, rt);
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.16, 0.35, 0.94);
      this.composer.addPass(this.bloomPass);
      this.cinematicPass = new ShaderPass(CinematicPostShader);
      this.composer.addPass(this.cinematicPass);
      this.composer.addPass(new OutputPass());
    } catch {
      this.composer = null;
      this.bloomPass = null;
      this.cinematicPass = null;
      this.usePostProcessing = false;
    }
  }

  private applySafePixelRatio() {
    const w = Math.max(this.container?.clientWidth || window.innerWidth, 280);
    const h = Math.max(this.container?.clientHeight || window.innerHeight, 240);
    const safeDpr = this.graphicsManager.computeSafePixelRatio(this.targetDesiredDpr, w, h);
    this.renderer.setPixelRatio(safeDpr);
    if (this.composer) {
      this.composer.setPixelRatio(safeDpr);
    }
  }

  private applyTextureAnisotropy(targetAniso: number) {
    const maxHw = Math.max(1, this.renderer.capabilities.getMaxAnisotropy());
    const clamped = Math.max(1, Math.min(maxHw, targetAniso));
    if (this.activeMaxAnisotropy === clamped) return;
    this.activeMaxAnisotropy = clamped;
    this.chunkManager?.setTextureAnisotropy(clamped);

    const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'] as const;
    const seen = new Set<THREE.Texture>();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.material) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (let i = 0; i < mats.length; i++) {
        const mat = mats[i] as any;
        if (!mat) continue;
        for (let k = 0; k < texKeys.length; k++) {
          const tex = mat[texKeys[k]] as THREE.Texture | undefined;
          if (tex && !seen.has(tex)) {
            seen.add(tex);
            if (tex.anisotropy !== clamped) {
              tex.anisotropy = clamped;
              tex.needsUpdate = true;
            }
          }
        }
      }
    });
  }

  private setShadowMapSize(size: number, frustumHalfExtent: number, bias: number, normalBias: number) {
    const safeSize = Math.min(this.maxTextureDim, size);
    const prevWidth = this.dirLight.shadow.mapSize.width;
    this.dirLight.shadow.mapSize.set(safeSize, safeSize);
    this.dirLight.shadow.camera.left = -frustumHalfExtent;
    this.dirLight.shadow.camera.right = frustumHalfExtent;
    this.dirLight.shadow.camera.top = frustumHalfExtent;
    this.dirLight.shadow.camera.bottom = -frustumHalfExtent;
    this.dirLight.shadow.camera.updateProjectionMatrix();
    this.dirLight.shadow.bias = bias;
    this.dirLight.shadow.normalBias = normalBias;
    if (prevWidth !== safeSize && this.dirLight.shadow.map) {
      this.dirLight.shadow.map.dispose();
      this.dirLight.shadow.map = null as any;
    }
    this.activeShadowMapRes = safeSize;
  }

  public applyGraphicsConfiguration(forceChunkSync = false) {
    const effective = this.graphicsManager.getEffectiveTarget(window.devicePixelRatio || 1, Boolean(this.composer));
    this.activeQualityMode = this.graphicsManager.config.preset;
    this.targetDesiredDpr = effective.desiredDpr;
    this.watchdogDprFactor = effective.watchdogDprFactor;
    this.activeLocalLightLimit = effective.maxLocalLights;

    if (this.envIntensityMultiplier !== effective.envIntensityMultiplier) {
      this.lastEnvPhase = '';
    }
    this.envIntensityMultiplier = effective.envIntensityMultiplier;
    this.sunIntensityMultiplier = effective.sunIntensityMultiplier;
    this.fogDensityMultiplier = effective.fogDensityMultiplier;
    this.renderer.toneMappingExposure = effective.toneMappingExposure;

    // Shadows
    this.renderer.shadowMap.enabled = effective.shadowsEnabled;
    if (effective.shadowsEnabled) {
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.dirLight) {
        this.dirLight.castShadow = true;
        this.setShadowMapSize(
          effective.shadowResolution,
          effective.shadowFrustumExtent,
          effective.shadowBias,
          effective.shadowNormalBias
        );
      }
    } else {
      if (this.dirLight) {
        this.dirLight.castShadow = false;
        if (this.dirLight.shadow.map) {
          this.dirLight.shadow.map.dispose();
          this.dirLight.shadow.map = null as any;
        }
      }
      this.activeShadowMapRes = 0;
    }

    // Post-processing & Bloom
    this.usePostProcessing = effective.postProcessingEnabled && Boolean(this.composer);
    if (this.bloomPass) {
      this.bloomPass.enabled = effective.bloomEnabled;
      this.bloomPass.strength = effective.bloomStrength;
      this.bloomPass.radius = effective.bloomRadius;
      this.bloomPass.threshold = effective.bloomThreshold;
    }
    if (this.cinematicPass) {
      this.cinematicPass.enabled = this.usePostProcessing;
      this.cinematicPass.uniforms.uSunShaftIntensity.value = effective.sunShaftIntensity;
    }

    // Particles, Anisotropy & Chunk Streaming
    this.weatherManager?.setParticleBudgetScale(effective.particleDensity);
    this.applyTextureAnisotropy(effective.anisotropy);

    this.applySafePixelRatio();
    const w = this.lastWidth || Math.max(this.container?.clientWidth || window.innerWidth, 280);
    const h = this.lastHeight || Math.max(this.container?.clientHeight || window.innerHeight, 240);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    if (this.bloomPass) {
      this.bloomPass.resolution.set(w, h);
    }

    if (this.chunkManager) {
      this.chunkManager.setQuality(effective.chunkQuality, false);
      this.chunkManager.setStreamingRadius(effective.viewDistanceChunks);
      if (forceChunkSync) {
        this.chunkManager.updatePlayerPosition(this.player.position, true, true);
      }
    }
  }

  public setQualityMode(mode: GraphicsQualityMode | 'auto') {
    const isMobile = this.graphicsManager.caps.isMobile;
    const actual: GraphicsQualityMode =
      mode === 'auto' ? (isMobile || this.isSoftwareGl ? 'performance' : 'balanced') : mode;
    this.graphicsManager.setPreset(actual, false);
    this.applyGraphicsConfiguration(true);
  }

  public setViewDistanceChunks(chunks: number) {
    this.graphicsManager.updateConfig({ viewDistanceChunks: chunks });
    this.applyGraphicsConfiguration(true);
  }

  public getGraphicsConfig(): GraphicsManagerConfig {
    return { ...this.graphicsManager.config };
  }

  public updateGraphicsConfig(patch: Partial<GraphicsManagerConfig>): GraphicsManagerConfig {
    const next = this.graphicsManager.updateConfig(patch);
    this.applyGraphicsConfiguration(patch.viewDistanceChunks !== undefined);
    return { ...next };
  }

  public resetGraphicsToSafeAuto(): GraphicsManagerConfig {
    const next = this.graphicsManager.resetToSafeAuto();
    this.applyGraphicsConfiguration(true);
    return { ...next };
  }

  public optimizeGraphicsMemory(): { freedChunks: number; clearedGeometries: number; clearedTextures: number } {
    const effective = this.graphicsManager.getEffectiveTarget(window.devicePixelRatio || 1, Boolean(this.composer));
    const freedChunks = this.chunkManager
      ? this.chunkManager.trimDistantChunks(effective.viewDistanceChunks, this.player.position)
      : 0;
    const memRes = this.graphicsManager.optimizeMemoryNow(this.renderer, this.dirLight);
    this.applyGraphicsConfiguration(false);
    return {
      freedChunks,
      clearedGeometries: memRes.clearedGeometries,
      clearedTextures: memRes.clearedTextures,
    };
  }

  public getGraphicsSnapshot(): GraphicsManagerSnapshot {
    const w = this.lastWidth || this.container?.clientWidth || window.innerWidth;
    const h = this.lastHeight || this.container?.clientHeight || window.innerHeight;
    const effective = this.graphicsManager.getEffectiveTarget(window.devicePixelRatio || 1, Boolean(this.composer));
    return this.graphicsManager.getSnapshot(this.renderer, w, h, effective);
  }

  public getDiagnosticInfo() {
    const snap = this.getGraphicsSnapshot();
    return {
      drawCalls: snap.drawCalls,
      triangles: snap.triangles,
      entities: (this.wildlifeManager?.metrics?.totalOrganisms || 0) + (this.zombieMgr?.zombies.length || 0),
      dpr: snap.dpr,
      renderWidth: snap.renderWidth,
      renderHeight: snap.renderHeight,
      shadowMapRes: snap.shadowMapRes,
      anisotropy: snap.anisotropy,
      qualityMode: snap.preset,
      fps: snap.fps,
      frameTimeMs: snap.frameTimeMs,
      p95FrameTimeMs: snap.p95FrameTimeMs,
      activeLocalLights: this.localLights.filter((light) => light.visible).length,
      governorState: snap.governorState,
      governorLevel: snap.governorLevel,
      governorActionLabel: snap.governorActionLabel,
      contextHealth: snap.contextHealth,
      geometries: snap.geometries,
      textures: snap.textures,
    };
  }

  private startLoop() {
    this.lastFramePerfTime = performance.now();
    const tick = (timestamp?: number) => {
      if (!this.isRunning) return;

      // When tab is hidden, pause active rendering and yield CPU
      if (document.hidden) {
        this.graphicsManager.scheduleNextFrame(tick, this.renderer, true);
        return;
      }

      const now = timestamp ?? performance.now();
      const rawElapsed = Math.max(0.001, (now - this.lastFramePerfTime) / 1000);
      this.lastFramePerfTime = now;

      const workStart = performance.now();

      if (!this.isPaused) {
        // Strict bounded timestep (max 0.05s = 50ms) prevents physics tunneling / simulation death
        this.clock.update(now);
        const delta = Math.min(0.05, this.clock.getDelta());
        this.update(delta, rawElapsed);
      }

      this.updateLocalLightBudget();
      this.chunkManager.updateFrustumCulling(this.camera, this.player.position);
      if (this.usePostProcessing && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      const frameWorkMs = performance.now() - workStart;
      const gov = this.graphicsManager.recordFrameAndGovern(rawElapsed, frameWorkMs, this.isPaused);
      this.rollingFps = this.graphicsManager.rollingFps;

      if (gov.emergencyTrimRequested) {
        const eff = this.graphicsManager.getEffectiveTarget(window.devicePixelRatio || 1, Boolean(this.composer));
        this.chunkManager?.trimDistantChunks(eff.viewDistanceChunks, this.player.position);
        this.renderer.renderLists.dispose();
      }
      if (gov.changed) {
        this.applyGraphicsConfiguration(false);
      }

      this.graphicsManager.scheduleNextFrame(tick, this.renderer, false);
    };

    this.graphicsManager.scheduleNextFrame(tick, this.renderer, document.hidden);
  }

  /**
   * Keep the number of simultaneously compiled point/spot lights bounded.
   * Three.js adds every visible local light to MeshStandardMaterial shaders;
   * large streamed scenes can otherwise exceed low-end GPU uniform limits.
   * Decorative lights remain in the world and are enabled when near the camera.
   */
  private updateLocalLightBudget(force: boolean = false) {
    if (!force) {
      this.localLightBudgetTimer += 1 / 60;
      if (this.localLightBudgetTimer < 2.0 && this.localLights.length) return;
    }
    this.localLightBudgetTimer = 0;

    const discovered: Array<THREE.PointLight | THREE.SpotLight> = [];
    this.scene.traverse((object) => {
      if ((object as THREE.PointLight).isPointLight || (object as THREE.SpotLight).isSpotLight) {
        const light = object as THREE.PointLight | THREE.SpotLight;
        if (!light.userData.__lightBudgetCulled) {
          light.userData.__lightBudgetDesiredVisible = light.visible;
        } else {
          light.visible = Boolean(light.userData.__lightBudgetDesiredVisible);
          light.userData.__lightBudgetCulled = false;
        }
        if (light.userData.__lightBudgetDesiredVisible) discovered.push(light);
      }
    });

    this.camera.getWorldPosition(GameEngine._camDir);
    discovered.sort((a, b) => {
      const da = a.getWorldPosition(GameEngine._tmpVecA).distanceToSquared(GameEngine._camDir);
      const db = b.getWorldPosition(GameEngine._tmpVecB).distanceToSquared(GameEngine._camDir);
      return da - db;
    });

    const limit = this.activeLocalLightLimit;
    const active = new Set(discovered.slice(0, limit));
    for (const light of discovered) {
      if (!active.has(light)) {
        light.visible = false;
        light.userData.__lightBudgetCulled = true;
      } else {
        light.visible = true;
        light.userData.__lightBudgetCulled = false;
      }
    }
    this.localLights = discovered;
  }

  // --- Core Game Update ---
  private update(delta: number, realElapsedSec: number = delta) {
    // 1. Advance Game Time (1 real sec = 2 game mins scaled by sandbox dayLengthMultiplier)
    const dayScale = Math.max(0.25, this.sandboxSettings.dayLengthMultiplier || 1.0);
    this.gameTimeMinutes += (delta * 2.0) / dayScale;
    if (this.gameTimeMinutes >= 1440) {
      this.gameTimeMinutes -= 1440;
      this.dayCount += 1;
      this.callbacks.onBountyProgress?.('survive_night', 1);
    }

    const hour = this.gameTimeMinutes / 60;
    this.isNight = hour >= 21.0 || hour < 5.0;
    this.isDusk = hour >= 18.0 && hour < 21.0;

    // Trigger context-aware continuous diurnal & nocturnal environmental soundscape
    const currentBiome = this.chunkManager.getCurrentBiome(this.player.position.x, this.player.position.z);
    const currentBiomeId = currentBiome.id;
    if (currentBiomeId !== this.lastReportedBiomeId) {
      this.lastReportedBiomeId = currentBiomeId;
      this.callbacks.onBiomeChange?.(currentBiome.id, currentBiome.name);
    }

    // Dynamic Biome Weather update
    const wx = this.weatherManager.update(delta, this.player.position, currentBiomeId, this.player.isSubmerged);
    this.weatherFogMultiplier = wx.fogDensityMultiplier;
    this.playerStats.weatherType = wx.weather;
    this.playerStats.weatherIntensity = wx.intensity;
    this.playerStats.visibilityPercent = wx.visibilityPercent;
    if (wx.weather !== this.lastReportedWeather) {
      this.lastReportedWeather = wx.weather;
      this.callbacks.onWeatherChange?.(wx.weather, wx.intensity);
    } else if (Math.random() < 0.08) {
      this.callbacks.onWeatherChange?.(wx.weather, wx.intensity);
    }
    if (wx.rainCatchmentBonus > 0) {
      this.waterManager.state.storageLiters = Math.min(
        this.waterManager.state.maxCapacityLiters,
        this.waterManager.state.storageLiters + wx.rainCatchmentBonus * delta * 0.2
      );
    }

    this.soundscapeManager.update(delta, this.gameTimeMinutes, this.player.position, this.player.yaw, currentBiomeId, wx.weather, wx.intensity);
    this.aiTrainManager.update(delta, this.player.position, this.gameTimeMinutes, this.dayCount);

    // Dusk warning
    if (this.isDusk && !this.duskWarningFired) {
      this.duskWarningFired = true;
      soundEngine.playDuskWarningHorn();
      this.callbacks.onHordeEvent('dusk_warning');
    }

    // Night horde start
    if (this.isNight && this.duskWarningFired) {
      this.duskWarningFired = false;
      this.dawnVictoryFired = false;
      this.callbacks.onHordeEvent('night_horde_start');
    }

    // Dawn victory event
    if (!this.isNight && !this.isDusk && hour >= 6.0 && hour < 7.0 && !this.dawnVictoryFired) {
      this.dawnVictoryFired = true;
      this.nightHordesDefeated += 1;
      this.callbacks.onCareerEvent?.({ type: 'horde_defeated', count: 1 });
      soundEngine.playDawnVictoryChime();
      this.callbacks.onHordeEvent('dawn_victory');
      this.addXP(150);
      this.updateQuestProgress('survive_night', 1);
      this.updateQuestProgress('survive_hordes', 1);
    }

    // Update Celestial Lighting & Atmospheric Scattering Sky
    const isBloodMoon = this.isNight && (this.dayCount % 7 === 0 || this.dayCount === 1);
    if (this.atmosphericSky) {
      this.atmosphericSky.setWeatherState(wx.overcast, wx.lightningFlash);
      this.atmosphericSky.update(
        this.gameTimeMinutes,
        this.isNight,
        this.isDusk,
        isBloodMoon,
        delta,
        this.player.position
      );
    }
    this.updateAtmosphere(hour);

    // Synchronize shared global realism shaders (wind, rain wetness, lightning, sun scattering)
    this.engineClock += delta;
    const wetTarget = wx.rainIntensity > 0.05 ? 1.0 : 0.0;
    const wetRate = wetTarget > this.wetAccum ? 0.14 : 0.04;
    this.wetAccum = THREE.MathUtils.clamp(
      this.wetAccum + (wetTarget > this.wetAccum ? delta * wetRate : -delta * wetRate),
      0,
      1
    );
    RealismShaderGlobals.uTime.value = this.engineClock;
    RealismShaderGlobals.uWindStrength.value = wx.windStrength;
    RealismShaderGlobals.uRainIntensity.value = wx.rainIntensity;
    RealismShaderGlobals.uWetness.value = this.wetAccum;
    RealismShaderGlobals.uLightningFlash.value = wx.lightningFlash;
    RealismShaderGlobals.uSunDir.value.copy(this.dirLight.position).sub(this.player.position).normalize();
    RealismShaderGlobals.uSunColor.value.copy(this.dirLight.color);
    if (this.atmosphericSky) {
      RealismShaderGlobals.uHorizonColor.value.copy(this.atmosphericSky.getHorizonColor());
    }

    // Update volumetric sun-shaft & lens grading post-process uniforms
    if (this.usePostProcessing && this.cinematicPass) {
      this.camera.getWorldDirection(GameEngine._camDir);
      const sunDot = Math.max(0, GameEngine._camDir.dot(RealismShaderGlobals.uSunDir.value));
      GameEngine._sunScreenVec.copy(this.dirLight.position).project(this.camera);
      this.cinematicPass.uniforms.uSunScreenPos.value.set(
        GameEngine._sunScreenVec.x * 0.5 + 0.5,
        GameEngine._sunScreenVec.y * 0.5 + 0.5
      );
      const baseShaft =
        this.activeQualityMode === 'ultra_5x' ? 0.24 : this.activeQualityMode === 'quality' ? 0.18 : 0.10;
      const dayVis = this.isNight ? 0.28 : 1.0;
      const overcastAtten = 1.0 - wx.overcast * 0.65;
      this.cinematicPass.uniforms.uSunShaftIntensity.value =
        baseShaft * Math.pow(sunDot, 1.5) * dayVis * overcastAtten;
      this.cinematicPass.uniforms.uSunColor.value.copy(this.dirLight.color);
      this.cinematicPass.uniforms.uTime.value = this.engineClock;
      const caBoost =
        (this.player.isSubmerged ? 0.0022 : 0) +
        (this.player.isSprinting ? 0.0007 : 0) +
        (this.playerStats.health < 25 ? 0.0014 : 0);
      this.cinematicPass.uniforms.uChromatic.value = 0.0005 + caBoost;
    }

    // Animate realistic river, chunk, pool & fountain water ripples simultaneously via shared Gerstner normal map
    const waterNormal = getWaterRippleNormalMap();
    waterNormal.offset.x = (waterNormal.offset.x + delta * 0.025) % 1;
    waterNormal.offset.y = (waterNormal.offset.y + delta * 0.013) % 1;

    this.uiSyncTimer += delta;
    const shouldSyncHud = this.uiSyncTimer >= 0.125; // ~8Hz React UI sync eliminates reconciliation stutter while staying crisp

    // 2. Player, Train or Vehicle Movement & Physics
    if (this.aiTrainManager && this.aiTrainManager.activePassengerTrain) {
      this.player.setViewmodelOverrideHidden(true);
      const train = this.aiTrainManager.activePassengerTrain;

      // Update player movement inside the 3-carriage train consist
      this.aiTrainManager.movePlayerInsideTrain(this.inputState, delta);

      // Compute player world position from stable train local coordinate
      const worldPos = train.group.localToWorld(GameEngine._tmpVecA.copy(this.aiTrainManager.playerLocalPos));
      this.player.position.copy(worldPos);

      // Update avatar visibility and orientation
      const camMode = this.aiTrainManager.cameraMode;
      const isThirdPerson = camMode === 'interior_3rd' || camMode === 'chase' || camMode === 'rear';
      this.player.avatarGroup.visible = isThirdPerson;
      if (isThirdPerson) {
        this.player.avatarGroup.position.copy(worldPos);
        this.player.avatarGroup.rotation.y = train.group.rotation.y + (train.manualDriving ? 0 : this.player.yaw);
      }

      // Dynamic Camera Views
      if (camMode === 'cab') {
        const cabEye = train.group.localToWorld(GameEngine._tmpVecB.set(16.8, 3.6, 0.65));
        const cabLook = train.group.localToWorld(GameEngine._tmpVecC.set(85.0, 2.5, 0.65));
        this.camera.position.copy(cabEye);
        this.camera.lookAt(cabLook);
      } else if (camMode === 'chase') {
        const chasePos = train.group.localToWorld(GameEngine._tmpVecB.set(-60.0, 18.0, 0));
        const trainCenter = train.group.localToWorld(GameEngine._tmpVecC.set(-45.0, 3.2, 0));
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, chasePos.x, 6, delta);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, chasePos.y, 6, delta);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, chasePos.z, 6, delta);
        this.camera.lookAt(trainCenter);
      } else if (camMode === 'rear') {
        const rearEye = train.group.localToWorld(GameEngine._tmpVecB.set(-102.0, 3.6, 0));
        const rearLook = train.group.localToWorld(GameEngine._tmpVecC.set(-160.0, 2.2, 0));
        this.camera.position.copy(rearEye);
        this.camera.lookAt(rearLook);
      } else if (camMode === 'interior_3rd') {
        const eyeHeight = 1.6;
        const camDist = 2.6;
        const camYaw = train.group.rotation.y + this.player.yaw;
        const camX = worldPos.x + Math.sin(camYaw) * camDist;
        const camZ = worldPos.z + Math.cos(camYaw) * camDist;
        const camY = worldPos.y + eyeHeight + 0.35;
        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(worldPos.x, worldPos.y + eyeHeight, worldPos.z);
      } else {
        const eyeHeight = this.aiTrainManager.seatedSeatId ? 1.05 : 1.6;
        const eyePos = GameEngine._tmpVecB.set(worldPos.x, worldPos.y + eyeHeight, worldPos.z);
        this.camera.position.copy(eyePos);
        const lookTarget = GameEngine._tmpVecC.set(
          eyePos.x - Math.sin(this.player.yaw) * Math.cos(this.player.pitch),
          eyePos.y + Math.sin(this.player.pitch),
          eyePos.z - Math.cos(this.player.yaw) * Math.cos(this.player.pitch)
        );
        this.camera.lookAt(lookTarget);
      }

      if (shouldSyncHud) {
        this.callbacks.onTrainChange?.(this.aiTrainManager.getTrainHUDData());
        this.callbacks.onVehicleChange?.(null, 0);
      }
    } else if (this.vehicleManager && this.vehicleManager.vehicleState.isOccupied) {
      this.player.setViewmodelOverrideHidden(true);
      if (shouldSyncHud) this.callbacks.onTrainChange?.(null);
      this.vehicleManager.update(delta, this.inputState, this.terrain.seed);

      this.player.position.set(
        this.vehicleManager.vehicleState.position[0],
        this.vehicleManager.vehicleState.position[1],
        this.vehicleManager.vehicleState.position[2]
      );
      this.player.yaw = this.vehicleManager.vehicleState.rotationY;
      this.player.avatarGroup.visible = false;

      const forwardX = Math.sin(this.vehicleManager.vehicleState.rotationY);
      const forwardZ = Math.cos(this.vehicleManager.vehicleState.rotationY);
      const camX = this.vehicleManager.vehicleState.position[0] - forwardX * 6.5;
      const camY = this.vehicleManager.vehicleState.position[1] + 3.2;
      const camZ = this.vehicleManager.vehicleState.position[2] - forwardZ * 6.5;

      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 15, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 15, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 15, delta);
      this.camera.lookAt(
        this.vehicleManager.vehicleState.position[0],
        this.vehicleManager.vehicleState.position[1] + 1.2,
        this.vehicleManager.vehicleState.position[2]
      );

      if (shouldSyncHud) {
        this.callbacks.onVehicleChange?.(this.vehicleManager.vehicleState, this.vehicleManager.currentSpeed);
      }
    } else {
      this.player.setViewmodelOverrideHidden(false);
      if (shouldSyncHud) this.callbacks.onTrainChange?.(null);
      const hasMovementInput =
        this.inputState.forward ||
        this.inputState.backward ||
        this.inputState.left ||
        this.inputState.right ||
        this.inputState.jump ||
        (this.inputState.isAnalog && (Math.abs(this.inputState.analogX || 0) > 0.15 || Math.abs(this.inputState.analogZ || 0) > 0.15));

      if (this.houseInteractionCtrl) {
        this.houseInteractionCtrl.update(delta, hasMovementInput);
        this.player.isHouseInteracting = this.houseInteractionCtrl.isInteracting;
      }

      const { staminaDelta, isSwimming, isSubmerged } = this.player.update(
        delta,
        this.inputState,
        this.playerStats.stamina,
        this.buildingMgr,
        this.prologueManager?.cinematicCam?.isCinematicActive ?? false
      );

      this.playerStats.stamina = Math.max(
        0,
        Math.min(this.playerStats.maxStamina, this.playerStats.stamina + staminaDelta)
      );

      // Physical train hitboxes: keep the on-foot survivor outside every complete train.
      if (this.aiTrainManager && !this.aiTrainManager.activePassengerTrain && !this.aiTrainManager.activeDrivableTrain) {
        for (const hit of this.aiTrainManager.getTrainCollisionBoxes()) {
          if (!hit.box.containsPoint(this.player.position)) continue;
          const centerZ = (hit.box.min.z + hit.box.max.z) * 0.5;
          const side = this.player.position.z >= centerZ ? 1 : -1;
          this.player.position.z = centerZ + side * ((hit.box.max.z - hit.box.min.z) * 0.5 + 0.8);
          this.player.velocity.z = 0;
        }
      }

      // Solid station walls, pillars, benches and signs block the survivor on every streamed station.
      if (this.aiTrainManager) {
        const stationBodyPoint = GameEngine._tmpVecA.copy(this.player.position);
        stationBodyPoint.y += 1.0;
        for (const hit of this.aiTrainManager.getStationCollisionBoxes()) {
          if (!hit.box.containsPoint(stationBodyPoint)) continue;
          const left = Math.abs(this.player.position.x - hit.box.min.x);
          const right = Math.abs(hit.box.max.x - this.player.position.x);
          const near = Math.abs(this.player.position.z - hit.box.min.z);
          const far = Math.abs(hit.box.max.z - this.player.position.z);
          const minPenetration = Math.min(left, right, near, far);
          if (minPenetration === left) this.player.position.x = hit.box.min.x - 0.35;
          else if (minPenetration === right) this.player.position.x = hit.box.max.x + 0.35;
          else if (minPenetration === near) this.player.position.z = hit.box.min.z - 0.35;
          else this.player.position.z = hit.box.max.z + 0.35;
          this.player.velocity.x = 0;
          this.player.velocity.z = 0;
        }
      }

      // Oxygen simulation during swimming & diving
      if (isSubmerged) {
        this.playerStats.oxygen = Math.max(0, this.playerStats.oxygen - delta * 14.0);
        if (this.playerStats.oxygen <= 0) {
          this.damagePlayer(delta * 12.0);
        }
      } else {
        this.playerStats.oxygen = Math.min(this.playerStats.maxOxygen, this.playerStats.oxygen + delta * 35.0);
      }

      this.playerStats.isSwimming = isSwimming;
      this.playerStats.isSubmerged = isSubmerged;
    }

    // 2b. Objective Navigation update
    const navState = this.objectiveNavigator.update(delta, this.player.position, this.player.yaw);
    if (shouldSyncHud) {
      this.callbacks.onNavigationUpdate?.(navState);
    }

    // 2c. Dynamic Movable Props Physics Update (Gravity, Player Push, Wall Collisions)
    this.dynamicPropPhysics.update(delta, this.player.position, this.player.velocity);

    // If active waypoint destination is reached, synchronize narrative chapter transition
    if (navState.isAtDestination) {
      if (
        (navState.activeObjective?.id === 'story_day1_meet_friends' || navState.activeObjective?.id === 'story_meet_friends_cafe') &&
        this.prologueManager.phase === 'ch2_outside_apartment'
      ) {
        this.prologueManager.startChapter3();
      }
    }

    // Stream the expanded world after leaving the original sanctuary starter region.
    // The legacy starter terrain remains intact; distant chunks are generated in small batches.
    const distanceFromStarter = Math.hypot(this.player.position.x, this.player.position.z);
    this.terrain.mesh.visible = distanceFromStarter <= 138;
    this.terrain.waterMesh.visible = distanceFromStarter <= 138;
    this.chunkManager.updatePlayerPosition(this.player.position, false, this.graphicsManager.shouldAllowChunkBuild());
    const starterChunk = this.chunkManager.activeChunks.get('0_0');
    if (starterChunk) { starterChunk.terrainMesh.visible = false; if (starterChunk.waterMesh) starterChunk.waterMesh.visible = false; }
    this.wildlifeManager.update(
      delta,
      this.player.position,
      (x, z) => this.chunkManager.getCurrentBiome(x, z).id,
      this.isNight,
      this.player.yaw,
      hour,
      (convertedAgent) => {
        if (!this.zombieMgr.isOutbreakActive) return;
        const zType =
          convertedAgent.species.scale >= 1.5
            ? 'brute'
            : convertedAgent.species.speed >= 5.2
              ? 'runner'
              : convertedAgent.species.kind === 'dinosaur'
                ? 'stalker'
                : 'walker';
        const spawned = this.zombieMgr.spawnZombie(
          zType,
          [convertedAgent.group.position.x, convertedAgent.group.position.y, convertedAgent.group.position.z],
          true
        );
        if (spawned) spawned.state = 'chase';
      }
    );

    // Dynamic Ecosystem Scanner & Real-Time Metrics Update (throttled every 0.12s)
    this.scannerTimer += delta;
    if (this.scannerTimer >= 0.12) {
      this.scannerTimer = 0;
      this.callbacks.onEcosystemMetrics?.(this.wildlifeManager.metrics);
      this.camera.getWorldDirection(GameEngine._camDir);
      const dossier = this.wildlifeManager.getScannedDossier(this.player.position, GameEngine._camDir);
      this.callbacks.onEcosystemDossier?.(dossier);
      if (dossier && (dossier.kind === 'dinosaur' || dossier.diet === 'carnivore')) {
        this.updateQuestProgress('observe_dinosaur', 1);
      }
    }

    this.powerManager.update(delta, hour);
    this.waterManager.update(delta, this.powerManager.state.isPowered);
    this.foodManager.update(delta, this.powerManager.state.isPowered, this.npcSettlementManager.npcs.length);
    let zombiesNearPerimeter = 0;
    if (this.zombieMgr?.zombies) {
      for (let i = 0; i < this.zombieMgr.zombies.length; i++) {
        const z = this.zombieMgr.zombies[i];
        if (z.state === 'dead') continue;
        if (
          Math.hypot(
            z.position[0] - this.buildingMgr.safeZoneCenter.x,
            z.position[2] - this.buildingMgr.safeZoneCenter.z
          ) <= 55
        ) {
          zombiesNearPerimeter++;
        }
      }
    }
    this.securityManager.update(zombiesNearPerimeter, this.isNight, this.powerManager.state.isPowered);
    this.npcSettlementManager.update(delta, this.isNight, this.powerManager.state.isPowered, (convertedPos) => {
      if (!this.zombieMgr.isOutbreakActive) return;
      const spawned = this.zombieMgr.spawnZombie('walker', convertedPos, true);
      if (spawned) spawned.state = 'chase';
    });
    this.globalOutbreakSimulator.update(
      delta,
      this.player.position,
      this.zombieMgr.isOutbreakActive,
      this.dayCount,
      this.isNight,
      this.zombieMgr
    );
    this.chunkManager.setApocalypticSeverity(this.globalOutbreakSimulator.apocalypticSeverity);
    if (this.prologueManager?.townMgr) {
      this.prologueManager.townMgr.gridPowerFactor = this.globalOutbreakSimulator.powerGridStability;
    }
    this.prologueManager.update(delta);
    const rescuedNow = this.rescueManager.update(
      delta,
      this.player.position,
      this.buildingMgr.safeZoneCenter,
      this.buildingMgr.safeZoneRadius,
      (convertedPos) => {
        if (!this.zombieMgr.isOutbreakActive) return;
        const spawned = this.zombieMgr.spawnZombie('runner', convertedPos, true);
        if (spawned) spawned.state = 'chase';
      }
    );
    if (rescuedNow.length > 0) {
      this.callbacks.onCareerEvent?.({ type: 'survivor_rescued', count: rescuedNow.length });
    }
    rescuedNow.forEach(() => { this.addXP(75); this.callbacks.onItemCollected('canned_beans', 2); this.callbacks.onItemCollected('clean_water', 2); this.callbacks.onInteractionPrompt('Survivor safely escorted to the sanctuary.'); });

    // Distance to Safe Zone Center & Compound Bounds
    const distToSafe = Math.hypot(
      this.player.position.x - this.buildingMgr.safeZoneCenter.x,
      this.player.position.z - this.buildingMgr.safeZoneCenter.z
    );
    const inMilitarySafe = distToSafe < this.buildingMgr.safeZoneRadius;
    const inApartmentSafe = isProtectedSpawnZone(this.player.position.x, this.player.position.z);
    const inSafeZone = inMilitarySafe || inApartmentSafe;

    // Hunger & Thirst Drains (weather-reactive: snow/blizzard drains hunger faster, sandstorm drains thirst faster)
    const isEarlyPrologue = !this.prologueManager.isCompleted && this.dayCount <= 2;
    const drainMultiplier = isEarlyPrologue ? 0 : inSafeZone ? 0.35 : 1.0;
    const hasCoat = this.playerStats.equippedArmorId === 'thermal_coat';
    const weatherHungerMult =
      wx.weather === 'blizzard'
        ? hasCoat ? 1.25 : 1.55
        : wx.weather === 'thunderstorm' || wx.weather === 'rain'
          ? 1.15
          : this.playerStats.temperature < 8
            ? 1.3
            : 1.0;
    const weatherThirstMult = wx.weather === 'sandstorm' ? 1.35 : wx.weather === 'rain' ? 0.85 : 1.0;
    this.playerStats.hungerDrainModifier = Number(weatherHungerMult.toFixed(2));
    this.playerStats.thirstDrainModifier = Number(weatherThirstMult.toFixed(2));

    this.playerStats.hunger = Math.max(0, this.playerStats.hunger - delta * 0.12 * drainMultiplier * weatherHungerMult);
    this.playerStats.thirst = Math.max(0, this.playerStats.thirst - delta * 0.18 * drainMultiplier * weatherThirstMult);

    // Starvation / Dehydration Health Damage (strictly disabled during early story prologue to prevent false defeats)
    if (!isEarlyPrologue && (this.playerStats.hunger <= 0 || this.playerStats.thirst <= 0)) {
      this.damagePlayer(delta * 2.5);
    }

    // Passive Health Regen if well-fed & hydrated
    if (this.playerStats.hunger > 60 && this.playerStats.thirst > 60 && this.playerStats.health < this.playerStats.maxHealth) {
      this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + delta * 1.5);
    }

    // Medical Bed resting regeneration in Ground-Floor Clinic
    if (this.player.isRestingOnMedicalBed) {
      if (this.playerStats.health < this.playerStats.maxHealth) {
        this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 20.0 * delta);
      }
    }

    // Dynamic Security Screen update (throttled every 0.25s)
    this.securityScreenTimer += delta;
    if (this.securityScreenTimer >= 0.25) {
      this.securityScreenTimer = 0;
      const apt = this.prologueManager?.townMgr?.apartmentBuilding;
      if (apt) {
        const aptOrigin = apt.group.position;
        const trackedEntities: Array<{ x: number; z: number; type: 'zombie' | 'creature' }> = [];
        if (this.zombieMgr?.zombies) {
          for (let i = 0; i < this.zombieMgr.zombies.length; i++) {
            const z = this.zombieMgr.zombies[i];
            if (z.state === 'dead') continue;
            const dist = Math.hypot(z.position[0] - aptOrigin.x, z.position[2] - aptOrigin.z);
            if (dist <= 5000) {
              trackedEntities.push({ x: z.position[0], z: z.position[2], type: 'zombie' });
            }
          }
        }
        if (this.wildlifeManager?.creatures) {
          for (let i = 0; i < this.wildlifeManager.creatures.length; i++) {
            const c = this.wildlifeManager.creatures[i];
            const dist = Math.hypot(c.group.position.x - aptOrigin.x, c.group.position.z - aptOrigin.z);
            if (dist <= 5000) {
              trackedEntities.push({ x: c.group.position.x, z: c.group.position.z, type: 'creature' });
            }
          }
        }
        const playerRel = {
          x: this.player.position.x - aptOrigin.x,
          z: this.player.position.z - aptOrigin.z
        };
        apt.renderSecurityScreenContent(trackedEntities, playerRel);
        apt.renderWallClockContent(this.gameTimeMinutes, this.dayCount);
        apt.renderComputerScreenContent(this.playerStats, this.dayCount, this.gameTimeMinutes);
      }
    }

    // Flashlight battery drain & auto shutoff
    if (this.player.isFlashlightOn) {
      const battResist = this.hasPerk('perk_thermal_endurance') ? 0.5 : 1.0;
      const nextBatt = Math.max(0, (this.playerStats.flashlightBattery ?? 100) - delta * 0.55 * battResist);
      this.playerStats.flashlightBattery = nextBatt;
      if (nextBatt <= 0 && this.player.isFlashlightOn) {
        this.player.toggleFlashlight();
        this.callbacks.onInteractionPrompt('Flashlight battery depleted — use Lithium Power Cell in Inventory.');
      }
    }

    // Body Temperature & Weather Exposure
    const nearCampfire = this.buildingMgr.structures.some(
      (s) => (s.typeId === 'campfire' || s.typeId === 'perimeter_torch') &&
        Math.hypot(s.position[0] - this.player.position.x, s.position[2] - this.player.position.z) < 6.0
    );
    const thermalCoatBonus = this.playerStats.equippedArmorId === 'thermal_coat' ? 9.0 : 0;
    const nightChill = this.isNight ? -6.5 : 0;
    const targetTemp = Math.max(
      -8,
      Math.min(46, currentBiome.temperature + (this.lastReportedWeather === 'blizzard' ? -14 : this.lastReportedWeather === 'sandstorm' ? 7 : 0) + nightChill + (nearCampfire ? 14 : 0) + thermalCoatBonus)
    );
    this.playerStats.temperature = THREE.MathUtils.damp(this.playerStats.temperature, targetTemp, 0.25, delta);
    if (!isEarlyPrologue && (this.playerStats.temperature < 5 || this.playerStats.temperature > 42)) {
      const thermalDmgMult = this.hasPerk('perk_thermal_endurance') ? 0.45 : 1.0;
      this.damagePlayer(delta * 0.9 * thermalDmgMult);
    }

    // Toxic Fog / Radiation Hazard Exposure
    const isUndergroundOrIndoors = this.player.position.y < -2.0 || inApartmentSafe;
    if (this.lastReportedWeather === 'toxic_fog' && !isUndergroundOrIndoors && !isEarlyPrologue) {
      const hasGasMask = this.playerStats.equippedMaskId === 'gas_mask';
      if (!hasGasMask) {
        this.playerStats.radiationExposure = Math.min(100, (this.playerStats.radiationExposure ?? 0) + delta * 2.8);
        this.playerStats.infection = Math.min(100, this.playerStats.infection + delta * 1.4);
      } else {
        this.playerStats.radiationExposure = Math.max(0, (this.playerStats.radiationExposure ?? 0) - delta * 1.2);
      }
    } else {
      this.playerStats.radiationExposure = Math.max(0, (this.playerStats.radiationExposure ?? 0) - delta * 2.5);
    }

    if ((this.playerStats.radiationExposure ?? 0) > 20 || this.playerStats.infection > 30) {
      this.geigerTimer -= delta;
      if (this.geigerTimer <= 0) {
        this.geigerTimer = Math.max(0.35, 1.6 - (this.playerStats.radiationExposure ?? 0) * 0.012);
        soundEngine.playGeigerTick();
      }
      if (!isEarlyPrologue && (this.playerStats.radiationExposure ?? 0) > 70) {
        this.damagePlayer(delta * 1.4);
      }
    }
    if (!isEarlyPrologue && this.playerStats.infection > 55) {
      this.damagePlayer(delta * 1.1);
    }

    // Vehicle EV / Base Recharge when parked at powered base
    const basePowered = this.powerManager.state.isPowered || this.sandboxSettings.infinitePower;
    if (basePowered) {
      for (const veh of this.vehicleManager.vehicles.values()) {
        if (!veh.state.isOccupied && veh.def.fuelType !== 'pedal') {
          const dv = Math.hypot(veh.state.position[0] - this.buildingMgr.safeZoneCenter.x, veh.state.position[2] - this.buildingMgr.safeZoneCenter.z);
          if (dv < 55 && veh.state.batteryPercent < 100) {
            veh.state.batteryPercent = Math.min(100, veh.state.batteryPercent + delta * 1.8);
          }
        }
      }
    }

    // Stealth Noise Telemetry
    const movingNow = this.inputState.forward || this.inputState.backward || this.inputState.left || this.inputState.right || (this.inputState.isAnalog && Math.hypot(this.inputState.analogX, this.inputState.analogZ) > 0.15);
    const hasGhostPerk = this.hasPerk('perk_ghost_step');
    const noiseTarget = this.player.isSprinting ? 82 : movingNow ? (this.player.isCrouching ? (hasGhostPerk ? 8 : 16) : 44) : 5;
    this.playerStats.noiseLevel = Math.round(THREE.MathUtils.damp(this.playerStats.noiseLevel ?? 6, noiseTarget, 10, delta));

    // Animate placed doors, flames, radar dishes & electric fences
    this.buildingMgr.updateAnimations(delta, this.player.position);

    // Tactical Combat Effects (Sentry Turrets, Traps, Molotovs, Flares, Pipe Bombs, Spitter Acid)
    const turretDmgMult = this.hasPerk('perk_turret_overclock') ? 1.35 : 1.0;
    this.combatEffects.update(
      delta,
      this.player.position,
      this.zombieMgr.zombies,
      this.buildingMgr.structures,
      this.buildingMgr.structureMeshes,
      basePowered,
      turretDmgMult,
      (zId, dmg, kbVec, isTurret) => {
        const res = this.zombieMgr.damageZombie(zId, dmg, kbVec ? kbVec.length() : 0.8);
        if (res?.killed) {
          this.handleZombieKilledEffects(zId, res.xp, false, false, isTurret);
        }
      },
      (dmg) => this.damagePlayer(dmg),
      (uid) => this.buildingMgr.damageStructure(uid, 9999)
    );

    // World Events (Supply Drops, Alpha Bosses, Extraction Holdout)
    this.worldEventsManager.update(
      delta,
      this.player.position,
      this.dayCount,
      (bossPos) => {
        if (!this.prologueManager.isCompleted) return;
        const alreadyBoss = this.zombieMgr.zombies.some((z) => z.isBoss && z.state !== 'dead');
        if (!alreadyBoss) {
          this.zombieMgr.spawnZombie('alpha_boss', [bossPos.x, bossPos.y, bossPos.z]);
          this.callbacks.onInteractionPrompt('ALERT: Mutated Alpha Bio-Boss detected nearby!');
        }
      },
      () => {
        this.zombieMgr.spawnHordeWave(this.player.position, 5);
      },
      () => {
        this.callbacks.onInteractionPrompt('EXTRACTION SIGNAL CONFIRMED — Rebirth Rescue Ready!');
        this.callbacks.onExtractionVictory?.();
      }
    );

    // Companion combat assist against attacking zombies
    if (this.wildlifeManager.companionState && this.wildlifeManager.companionState.state !== 'stay') {
      const nearestZombie = this.zombieMgr.zombies.find((z) => {
        const d = Math.hypot(z.position[0] - this.player.position.x, z.position[2] - this.player.position.z);
        return d < 10.0 && z.state !== 'dead';
      });
      if (nearestZombie) {
        this.zombieMgr.damageZombie(nearestZombie.id, 25 * delta, 1.0);
      }
    }

    if (shouldSyncHud) {
      this.uiSyncTimer = 0;
      const geo = WorldCoordinates.worldToLatLon(this.player.position.x, this.player.position.z);
      const earthSample = RealEarthDataset.sampleEarthGeography(geo.lat, geo.lon);
      const nearCity = RealWorldCities.findNearestCity(geo.lat, geo.lon, 250);
      const geoTile = WorldCoordinates.worldToGeoTile(this.player.position.x, this.player.position.z, 14);
      this.playerStats.latitude = geo.lat;
      this.playerStats.longitude = geo.lon;
      this.playerStats.realElevationMeters = Math.round(earthSample.realElevationMeters);
      this.playerStats.countryName = earthSample.country;
      this.playerStats.continentOrOcean = earthSample.continent ?? earthSample.ocean ?? 'Earth';
      this.playerStats.nearestCityName = nearCity?.city.name;
      this.playerStats.geoTileKey = geoTile.key;

      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onTimeChange(this.gameTimeMinutes, this.dayCount, this.isNight, this.isDusk);

      // Boss health bar telemetry
      const activeBoss = this.zombieMgr.zombies.find(
        (z) => z.isBoss && z.state !== 'dead' && Math.hypot(z.position[0] - this.player.position.x, z.position[2] - this.player.position.z) < 75
      );
      this.callbacks.onBossStatusChange?.(
        activeBoss ? { name: activeBoss.bossTitle || 'Alpha Mutant', health: activeBoss.health, maxHealth: activeBoss.maxHealth } : null
      );
      this.callbacks.onWorldEventUpdate?.({
        supplyDrop: this.worldEventsManager.getActiveSupplyDrop(),
        extraction: this.worldEventsManager.getExtractionState(),
      });
    }

    // 4. Horde Director Waves at Night (scaled by sandbox zombieDensity + rebirth cycle)
    if (this.isNight && this.prologueManager.isCompleted) {
      this.hordeWaveTimer += delta;
      if (this.hordeWaveTimer >= 35.0) {
        this.hordeWaveTimer = 0;
        const densityScale = Math.max(0.4, this.sandboxSettings.zombieDensity || 1.0);
        const rebirthBonus = (this.playerStats.rebirthCount || 0) * 2;
        const waveCount = Math.round((3 + Math.min(6, this.dayCount * 2) + rebirthBonus) * densityScale);
        this.zombieMgr.spawnHordeWave(this.player.position, waveCount);
      }
    }

    // 5. Update Zombies (attacking player, town citizens, field survivors, settlement NPCs & wildlife organisms)
    if (this.zombieMgr.zombies.length > 0) {
      const detectMult = this.player.isCrouching ? (hasGhostPerk ? 0.35 : 0.62) : 1.0;
      const targets = this._livingTargetsBuffer;
      targets.length = 0;

      const citizens = this.prologueManager?.townMgr?.citizens;
      if (citizens) {
        for (let i = 0; i < citizens.length; i++) {
          const citizen = citizens[i];
          if (citizen.infectionStage !== 'stunned' && citizen.infectionStage !== 'zombie') {
            targets.push({ id: citizen.id, kind: 'citizen', position: citizen.position });
          }
        }
      }
      const survivors = this.rescueManager.getLivingTargets();
      for (let i = 0; i < survivors.length; i++) targets.push(survivors[i]);

      const settlementTargets = this.npcSettlementManager.getLivingTargets();
      for (let i = 0; i < settlementTargets.length; i++) targets.push(settlementTargets[i]);

      const regionalNpcs = this.globalOutbreakSimulator.getLivingTargets();
      for (let i = 0; i < regionalNpcs.length; i++) targets.push(regionalNpcs[i]);

      const creatures = this.wildlifeManager.creatures;
      for (let i = 0; i < creatures.length; i++) {
        const c = creatures[i];
        if (c.state === 'dead' || c.state === 'stunned' || c.infectionStage === 'stunned' || c.infectionStage === 'zombie' || c.isTamed) continue;
        targets.push({
          id: c.id,
          kind: 'wildlife',
          position: [c.group.position.x, c.group.position.y, c.group.position.z],
        });
      }

      this.zombieMgr.update(
        delta,
        this.player.position,
        this.buildingMgr,
        (dmg) => {
          this.damagePlayer(dmg);
        },
        detectMult,
        (origin, target, acidDmg) => {
          this.combatEffects.spawnAcidSpit(origin, target, acidDmg);
        },
        targets as Array<{ id: string; kind?: 'citizen' | 'survivor' | 'settlement' | 'wildlife'; position: [number, number, number] }>,
        (targetId, kind, zombieId) => {
          const k = kind as string;
          if (k === 'citizen') {
            this.prologueManager?.outbreakMgr?.infectCitizen(targetId, zombieId);
          } else if (k === 'survivor') {
            this.rescueManager.infectSurvivor(targetId);
          } else if (k === 'settlement') {
            this.npcSettlementManager.infectNPC(targetId);
          } else if (k === 'wildlife') {
            this.wildlifeManager.infectCreature(targetId);
          } else if (k === 'regional_npc') {
            this.globalOutbreakSimulator.infectPedestrian(targetId);
          }
        }
      );
    }

    // 6. Raycast Interaction Prompt
    this.checkInteractionPrompt();

    // 7. Auto-save every 60s (1 minute real active time)
    this.autoSaveTimer += Math.min(1.0, Math.max(delta, realElapsedSec));
    if (this.autoSaveTimer >= 60.0) {
      this.autoSaveTimer = 0;
      this.triggerAutoSave();
    }
  }

  private refreshOutdoorEnvironment(
    phaseKey: string,
    topHex: number,
    horizonHex: number,
    groundHex: number,
    sunHex: number,
    envIntensity: number
  ) {
    if (this.lastEnvPhase === phaseKey || !this.pmremGenerator) return;
    this.lastEnvPhase = phaseKey;

    const envScene = new THREE.Scene();
    const skyGeo = new THREE.SphereGeometry(28, 24, 16);
    const pos = skyGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const cTop = new THREE.Color(topHex);
    const cHor = new THREE.Color(horizonHex);
    const cGnd = new THREE.Color(groundHex);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 28;
      if (y >= 0) {
        tmp.copy(cHor).lerp(cTop, Math.pow(y, 0.65));
      } else {
        tmp.copy(cHor).lerp(cGnd, Math.min(1, -y * 3.5));
      }
      colors[i * 3 + 0] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    skyGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const skyMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
    const skySphere = new THREE.Mesh(skyGeo, skyMat);

    // Subtle solar bounce panel in outdoor environment map for specular highlights on metal & water
    const sunPanelGeo = new THREE.CircleGeometry(4.5, 16);
    const sunPanelMat = new THREE.MeshBasicMaterial({ color: sunHex, side: THREE.DoubleSide });
    const sunPanel = new THREE.Mesh(sunPanelGeo, sunPanelMat);
    sunPanel.position.set(14, 16, 9);
    sunPanel.lookAt(0, 0, 0);

    envScene.add(skySphere, sunPanel);
    const nextEnv = this.pmremGenerator.fromScene(envScene, 0.04).texture;
    const prevEnv = this.envTexture;
    this.envTexture = nextEnv;
    this.scene.environment = nextEnv;
    this.scene.environmentIntensity = envIntensity * this.envIntensityMultiplier;
    if (prevEnv) prevEnv.dispose();

    skyGeo.dispose();
    skyMat.dispose();
    sunPanelGeo.dispose();
    sunPanelMat.dispose();
  }

  private updateAtmosphere(hour: number) {
    let sunIntensity = 2.45;
    const sunColor = GameEngine._sunColor.setRGB(1.0, 0.98, 0.93);

    if (hour >= 5.0 && hour < 8.0) {
      // Dawn / Sunrise: Golden warmth
      const t = (hour - 5.0) / 3.0;
      sunColor.setRGB(1.0, 0.72 + t * 0.23, 0.45 + t * 0.45);
      sunIntensity = 1.45 + t * 1.0;
      this.hemiLight.color.setRGB(1.0, 0.82, 0.65);
      this.hemiLight.groundColor.setRGB(0.24, 0.19, 0.15);
      this.hemiLight.intensity = 0.78;
      this.fillLight.color.setRGB(0.95, 0.72, 0.65);
      this.fillLight.intensity = 0.32;
      this.refreshOutdoorEnvironment('dawn', 0x3a64a2, 0xf2a36e, 0x3b2f24, 0xffc88a, 0.84);
    } else if (hour >= 8.0 && hour < 17.0) {
      // Full daylight: Crisp clear sun with sky bounce
      sunColor.setRGB(1.0, 0.98, 0.93);
      sunIntensity = 2.45;
      this.hemiLight.color.setRGB(0.54, 0.76, 0.97);
      this.hemiLight.groundColor.setRGB(0.23, 0.29, 0.2);
      this.hemiLight.intensity = 0.88;
      this.fillLight.color.setRGB(0x55 / 255, 0x99 / 255, 0xe8 / 255);
      this.fillLight.intensity = 0.36;
      this.refreshOutdoorEnvironment('day', 0x1e60a8, 0xcbe5f8, 0x3b4d30, 0xfff8ea, 0.92);
    } else if (hour >= 17.0 && hour < 20.5) {
      // Sunset / Dusk: Fiery golden hour
      const t = (hour - 17.0) / 3.5;
      sunColor.setRGB(1.0, 0.52 - t * 0.35, 0.2 - t * 0.15);
      sunIntensity = 2.05 - t * 1.5;
      this.hemiLight.color.setRGB(1.0 - t * 0.5, 0.54 - t * 0.35, 0.32 - t * 0.2);
      this.hemiLight.groundColor.setRGB(0.18, 0.12, 0.1);
      this.hemiLight.intensity = 0.65;
      this.fillLight.color.setRGB(0.52, 0.45, 0.78);
      this.fillLight.intensity = 0.28;
      this.refreshOutdoorEnvironment('dusk', 0x26244b, 0xd46a44, 0x241816, 0xff9248, 0.72);
    } else {
      // Night: Moonlight illumination
      const isBloodMoon = this.isNight && (this.dayCount % 7 === 0 || this.dayCount === 1);
      if (isBloodMoon) {
        sunColor.setRGB(0.85, 0.2, 0.2);
        sunIntensity = 0.48;
        this.hemiLight.color.setRGB(0.25, 0.08, 0.1);
        this.hemiLight.groundColor.setRGB(0.06, 0.02, 0.03);
        this.hemiLight.intensity = 0.34;
        this.fillLight.color.setRGB(0.28, 0.08, 0.12);
        this.fillLight.intensity = 0.18;
        this.refreshOutdoorEnvironment('bloodmoon', 0x140508, 0x451218, 0x100507, 0xd93636, 0.45);
      } else {
        sunColor.setRGB(0.68, 0.82, 1.0);
        sunIntensity = 0.42;
        this.hemiLight.color.setRGB(0.14, 0.22, 0.38);
        this.hemiLight.groundColor.setRGB(0.04, 0.06, 0.1);
        this.hemiLight.intensity = 0.28;
        this.fillLight.color.setRGB(0.16, 0.25, 0.44);
        this.fillLight.intensity = 0.16;
        this.refreshOutdoorEnvironment('night', 0x060b16, 0x142038, 0x070a10, 0x9ec0f2, 0.4);
      }
    }

    const horizonColor = this.atmosphericSky ? this.atmosphericSky.getHorizonColor() : GameEngine._sunColor;
    this.scene.background = horizonColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = horizonColor;
      this.scene.fog.density = (this.isNight ? 0.014 : 0.0068) * this.fogDensityMultiplier * this.weatherFogMultiplier;
    }

    this.dirLight.color.copy(sunColor);
    this.dirLight.intensity = sunIntensity * this.sunIntensityMultiplier;

    // Orbit sun / moon centered on the player for infinite world shadow coverage
    const sunAngle = ((hour - 6.0) / 24.0) * Math.PI * 2;
    const sunDist = 70;
    const sunHeight = Math.max(16, Math.sin(sunAngle) * 85);
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunZ = Math.sin(sunAngle) * 55;

    this.dirLight.position.set(
      this.player.position.x + sunX,
      this.player.position.y + sunHeight,
      this.player.position.z + sunZ
    );
    this.dirLight.target.position.set(
      this.player.position.x,
      this.player.position.y,
      this.player.position.z
    );
    this.dirLight.target.updateMatrixWorld();

    // Keep atmospheric sky fill opposite the sun
    this.fillLight.position.set(
      this.player.position.x - sunX * 0.7,
      this.player.position.y + 38,
      this.player.position.z - sunZ * 0.7
    );
  }

  // --- Interaction & Action Handling ---

  public handlePrimaryAction(inventory: { hasCrossbowBolts: boolean; consumeBolt: () => boolean }): boolean {
    this.player.triggerActionSwing();

    // 1. If currently in Building Mode -> place active structure
    if (this.buildingMgr.activeDef) {
      const snapTarget = this.getPlacementAimPoint();
      if (snapTarget) {
        const placed = this.buildingMgr.placeActiveStructure(snapTarget);
        if (placed) {
          soundEngine.playBuildSnap();
          this.callbacks.onCareerEvent?.({ type: 'structure_built', count: 1 });
          this.updateQuestProgress('build_foundation', placed.typeId === 'wooden_foundation' ? 1 : 0);
          this.updateQuestProgress('build_wall', placed.typeId === 'wooden_wall' ? 1 : 0);
          this.updateQuestProgress('build_gate', placed.typeId === 'wooden_gate' ? 1 : 0);
          this.updateQuestProgress('build_spikes', placed.typeId === 'defense_spikes' ? 1 : 0);
          this.updateQuestProgress('build_watchtower', placed.typeId === 'watchtower' ? 1 : 0);
          this.updateQuestProgress('build_lights', (placed.typeId === 'perimeter_torch' || placed.typeId === 'solar_spotlight') ? 1 : 0);
          this.updateQuestProgress('build_workbench', placed.typeId === 'workbench' ? 1 : 0);
          return true;
        }
      }
      return false;
    }

    // 2. Ranged Crossbow Attack
    if (this.activeSlotItem?.id === 'pulse_crossbow') {
      if (inventory.hasCrossbowBolts && inventory.consumeBolt()) {
        soundEngine.playCrossbowShot();
        this.performRangedShot();
        return true;
      }
      return false;
    }

    // 3. Stun Baton Shock Discharge
    if (this.activeSlotItem?.id === 'stun_baton') {
      soundEngine.playShockDischarge();
    }

    // 4. Melee Raycast against Zombies or Harvestables
    this.performMeleeRaycast();
    return true;
  }

  private performMeleeRaycast() {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const range = 3.4;

    // Check zombies first (with stealth backstab + critical headshot + perk multipliers)
    let hitZombie: { z: ZombieEntity; dist: number } | null = null;
    for (const z of this.zombieMgr.zombies) {
      if (z.state === 'dead') continue;
      const dx = z.position[0] - this.player.position.x;
      const dz = z.position[2] - this.player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < range) {
        if (!hitZombie || d < hitZombie.dist) {
          hitZombie = { z, dist: d };
        }
      }
    }

    if (hitZombie) {
      const z = hitZombie.z;
      let dmg = 20 + (this.playerStats.skills.strength - 1) * 4;
      let knockback = 1.5;
      if (this.activeSlotItem) {
        dmg = (this.activeSlotItem.damage || 20) + (this.playerStats.skills.strength - 1) * 4;
        if (this.activeSlotItem.id === 'stun_baton') knockback = 4.2;
      }
      if (this.hasPerk('perk_iron_strike')) {
        dmg *= 1.25;
        knockback *= 2.0;
      }

      // Stealth backstab if crouched and zombie unaware
      const isStealth = this.player.isCrouching && z.state !== 'chase' && z.state !== 'attack_player';
      if (isStealth) dmg *= 2.0;

      // Headshot check via camera pitch aiming near skull elevation
      const isHeadshot = this.player.pitch > -0.08 && this.player.pitch < 0.35;
      if (isHeadshot) {
        const hsMult = this.hasPerk('perk_headhunter') ? 2.15 : 1.75;
        dmg *= hsMult;
        soundEngine.playHeadshotPing();
        if (this.hasPerk('perk_headhunter')) {
          this.playerStats.stamina = Math.min(this.playerStats.maxStamina, this.playerStats.stamina + 8);
        }
      }

      const finalDmg = Math.round(dmg);
      const hitPos = GameEngine._tmpVecA.set(z.position[0], z.position[1] + (isHeadshot ? 1.55 : 1.15), z.position[2]);
      this.combatEffects.spawnImpactBurst(hitPos, 'blood', isHeadshot ? 12 : 8);
      this.spawnWorldDamageNumber(new THREE.Vector3(z.position[0], z.position[1] + 1.75, z.position[2]), finalDmg, isHeadshot, isStealth);

      const res = this.zombieMgr.damageZombie(z.id, finalDmg, knockback);
      if (res) {
        soundEngine.playHurt();
        if (res.killed) {
          this.handleZombieKilledEffects(z.id, res.xp, isHeadshot, isStealth, false);
        }
      }
      return;
    }

    // Check harvestable resources
    let nearestRes: HarvestableResource | null = null;
    let minResDist = 3.5;

    for (const r of this.terrain.resources) {
      const dx = r.position[0] - this.player.position.x;
      const dz = r.position[2] - this.player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < minResDist) {
        nearestRes = r;
        minResDist = d;
      }
    }

    if (nearestRes) {
      const toolType = this.activeSlotItem?.toolType || 'none';
      let dmg = 25;
      if (nearestRes.type === 'tree') {
        soundEngine.playChopWood();
        dmg = toolType === 'axe' ? 50 : 20;
      } else if (nearestRes.type === 'rock' || nearestRes.type === 'metal_scrap') {
        soundEngine.playMineRock();
        dmg = toolType === 'pickaxe' ? 55 : 18;
      } else {
        soundEngine.playChopWood();
        dmg = 40;
      }

      const burstKind = nearestRes.type === 'tree' ? 'wood' : nearestRes.type === 'metal_scrap' ? 'spark' : 'stone';
      this.combatEffects.spawnImpactBurst(
        GameEngine._tmpVecA.set(nearestRes.position[0], nearestRes.position[1] + 1.0, nearestRes.position[2]),
        burstKind,
        8
      );
      const damaged = this.terrain.damageResource(nearestRes.id, dmg);
      if (damaged && damaged.health <= 0) {
        this.callbacks.onCareerEvent?.({ type: 'resource_harvested', count: 1 });
        const itemDef = ITEMS[damaged.yieldItem];
        if (itemDef) {
          const lootMult = (this.sandboxSettings.lootMultiplier || 1.0) * (this.hasPerk('perk_scrap_recycler') && damaged.yieldItem === 'metal_scrap' ? 1.35 : 1.0);
          const yieldQty = Math.max(1, Math.round(damaged.yieldAmount * lootMult));
          this.callbacks.onResourceHarvested(damaged, itemDef, yieldQty);
          this.callbacks.onItemCollected(itemDef.id, yieldQty);
          this.addXP(15);
          if (damaged.yieldItem === 'wood') {
            this.updateQuestProgress('gather_wood', yieldQty);
          } else if (damaged.yieldItem === 'stone') {
            this.updateQuestProgress('gather_stone', yieldQty);
          }
        }
      }
      return;
    }

    // Check for structure repair with hammer
    if (this.activeSlotItem?.toolType === 'hammer') {
      for (const s of this.buildingMgr.structures) {
        const dx = s.position[0] - this.player.position.x;
        const dz = s.position[2] - this.player.position.z;
        if (Math.hypot(dx, dz) < 3.2) {
          if (this.buildingMgr.repairStructure(s.uid, 250)) {
            soundEngine.playBuildSnap();
            this.combatEffects.spawnImpactBurst(
              GameEngine._tmpVecA.set(s.position[0], s.position[1] + 1.0, s.position[2]),
              'spark',
              6
            );
          }
          break;
        }
      }
    }
  }

  private performRangedShot() {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const range = 55.0;
    const lookDir = GameEngine._camDir;
    this.camera.getWorldDirection(lookDir);

    this.player.triggerRecoilKick(1.0);
    const muzzleOrigin = this.camera.position.clone().addScaledVector(lookDir, 0.9);
    this.combatEffects.spawnImpactBurst(muzzleOrigin, 'muzzle', 4);

    // Visual tracer bolt
    this.combatEffects.spawnTracer(
      muzzleOrigin,
      lookDir,
      'bolt',
      65
    );

    const activeId = this.activeSlotItem?.id || 'pulse_crossbow';
    const mods = this.weaponMods[activeId] || [];
    const hasSuppressor = mods.includes('suppressor_mod');
    const hasExtendedMag = mods.includes('extended_mag_mod');
    const hasReflex = mods.includes('reflex_sight_mod');

    // Noise alert unless suppressed
    if (!hasSuppressor) {
      this.playerStats.noiseLevel = 92;
      this.globalOutbreakSimulator.alertNearSound(this.player.position, 52);
    }

    // Check line-of-fire zombie alignment
    let bestHit: { z: ZombieEntity; dist: number; hitHeight: number } | null = null;
    for (const z of this.zombieMgr.zombies) {
      if (z.state === 'dead') continue;
      const toZ = new THREE.Vector3(
        z.position[0] - this.camera.position.x,
        z.position[1] + 1.15 - this.camera.position.y,
        z.position[2] - this.camera.position.z
      );
      const proj = toZ.dot(lookDir);
      if (proj <= 0.5 || proj > range) continue;
      const perpSq = toZ.lengthSq() - proj * proj;
      const hitRadius = z.isBoss ? 1.65 : z.type === 'brute' || z.type === 'juggernaut' ? 1.25 : 0.9;
      if (perpSq <= hitRadius * hitRadius) {
        if (!bestHit || proj < bestHit.dist) {
          const rayYAtZ = this.camera.position.y + lookDir.y * proj;
          bestHit = { z, dist: proj, hitHeight: rayYAtZ - z.position[1] };
        }
      }
    }

    if (bestHit) {
      const { z, hitHeight } = bestHit;
      let dmg = (this.activeSlotItem?.damage || 65) * (hasExtendedMag ? 1.15 : 1.0);
      const isStealth = this.player.isCrouching && z.state !== 'chase' && z.state !== 'attack_player';
      if (isStealth) dmg *= 1.85;

      const isHeadshot = hitHeight >= (z.isBoss ? 2.15 : 1.38);
      if (isHeadshot) {
        const hsBonus = (this.hasPerk('perk_headhunter') ? 2.15 : 1.75) * (hasReflex ? 1.25 : 1.0);
        dmg *= hsBonus;
        soundEngine.playHeadshotPing();
      }

      const finalDmg = Math.round(dmg);
      this.combatEffects.spawnImpactBurst(
        GameEngine._tmpVecA.set(z.position[0], z.position[1] + (isHeadshot ? 1.55 : 1.15), z.position[2]),
        'blood',
        isHeadshot ? 14 : 9
      );
      this.spawnWorldDamageNumber(new THREE.Vector3(z.position[0], z.position[1] + 1.8, z.position[2]), finalDmg, isHeadshot, isStealth);

      const res = this.zombieMgr.damageZombie(z.id, finalDmg, 3.0);
      if (res) {
        soundEngine.playHurt();
        if (res.killed) {
          this.handleZombieKilledEffects(z.id, res.xp, isHeadshot, isStealth, false);
        }
      }
    }
  }

  public handleInteractKey() {
    // E Key interaction
    const range = 3.8;

    // -1. If currently inside train -> Check Pilot Observer Seat / Passenger Seat / Exit
    if (this.aiTrainManager?.activePassengerTrain) {
      if (this.aiTrainManager.isPilotSeated) {
        this.aiTrainManager.toggleDriverSeat();
        this.callbacks.onInteractionPrompt('Left pilot observer seat. Walk along aisle to explore all 5 compartments.');
      } else if (this.aiTrainManager.playerLocalPos.x >= 14.5) {
        this.aiTrainManager.toggleDriverSeat();
        this.callbacks.onInteractionPrompt('Seated in Pilot Observer Seat. Observing AI driver through windshield! [C] Camera.');
      } else if (this.aiTrainManager.seatedSeatId) {
        this.aiTrainManager.toggleSitOnSeat();
        this.callbacks.onInteractionPrompt('Stood up. Walk along the aisle to explore carriages or sit down.');
      } else if (this.aiTrainManager.toggleSitOnSeat()) {
        this.callbacks.onInteractionPrompt('Seated. Look around or press [C] for camera modes. Press [E] to stand.');
      } else {
        this.exitPassengerTrain();
      }
      return;
    }

    // Station lift call panels: E cycles the nearby lift between all three terminal levels.
    if (this.aiTrainManager) {
      const nearbyLift = this.aiTrainManager.getNearbyStationLift(this.player.position, 3.8);
      if (nearbyLift) {
        const floorOffsets = [0.27, 4.70, 9.80];
        const currentFloor = this.player.position.y < nearbyLift.baseY + 3.0 ? 0
          : this.player.position.y < nearbyLift.baseY + 7.4 ? 1 : 2;
        const targetFloor = ((currentFloor + 1) % 3) as 0 | 1 | 2;
        const dispatched = this.aiTrainManager.requestStationLiftFloor(nearbyLift.stationIndex, nearbyLift.liftIndex, targetFloor);
        if (dispatched) {
          this.player.position.set(nearbyLift.x, nearbyLift.baseY + floorOffsets[targetFloor], nearbyLift.z);
          this.player.velocity.set(0, 0, 0);
          this.callbacks.onInteractionPrompt(`Station Lift ${nearbyLift.liftIndex}: travelling to ${['Level 0 · Concourse (Y=0.27m)', 'Level 1 · Food Court & Lounge (Y=4.70m)', 'Level 3 · Skywalks & Air Concourse (Y=9.80m)'][targetFloor]}. Press E again to cycle levels.`);
          return;
        }
      }

      // Ticket Booking Counter & Smart TVM Kiosks
      const nearbyTVM = this.aiTrainManager.getNearbyTVMOrTicketCounter(this.player.position, 4.0);
      if (nearbyTVM) {
        soundEngine.playUIClick();
        this.callbacks.onOpenRailwayTickets?.();
        return;
      }

      // Interactive Station Amenities & Mechanisms (Water taps, toilets, clinic, food court, lockers, charging, help desk, RPF, gates, boom barriers, radar, etc.)
      const nearbyFacility = this.aiTrainManager.getNearbyStationInteractiveAction(this.player.position, 3.4);
      if (nearbyFacility) {
        const res = this.aiTrainManager.executeStationInteractiveAction(this.player.position, nearbyFacility.type);
        if (res.handled) {
          let statsChanged = false;
          if (res.healthDelta) {
            this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + res.healthDelta);
            statsChanged = true;
          }
          if (res.hungerDelta) {
            this.playerStats.hunger = Math.min(100, this.playerStats.hunger + res.hungerDelta);
            statsChanged = true;
          }
          if (res.thirstDelta) {
            this.playerStats.thirst = Math.min(100, this.playerStats.thirst + res.thirstDelta);
            statsChanged = true;
          }
          if (res.staminaDelta) {
            this.playerStats.stamina = Math.min(100, this.playerStats.stamina + res.staminaDelta);
            statsChanged = true;
          }
          if (statsChanged) {
            this.callbacks.onStatsChange({ ...this.playerStats });
          }
          if (res.rewardItem) {
            this.callbacks.onItemCollected(res.rewardItem, res.rewardQty ?? 1);
          }
          if (res.openOperations) {
            this.callbacks.onOpenRailwayOperations?.();
          }
          if (res.message) {
            this.callbacks.onInteractionPrompt(res.message);
          }
          return;
        }
      }
    }

    // Board nearby train
    if (this.aiTrainManager) {
      const nearbyTrain = this.aiTrainManager.getNearbyBoardableTrain(this.player.position, 8.5);
      if (nearbyTrain) {
        this.aiTrainManager.boardTrain(nearbyTrain, this.player.position);
        this.callbacks.onInteractionPrompt(`Boarded ${nearbyTrain.trainNumber} · ${nearbyTrain.serviceName} (${nearbyTrain.line}). Walk to explore all 7 carriages!`);
        return;
      }
    }

    // 0. If currently in vehicle -> Exit vehicle
    if (this.vehicleManager && this.vehicleManager.vehicleState.isOccupied) {
      this.exitVehicle();
      return;
    }

    // 0.1 Check vehicle mount
    if (this.vehicleManager) {
      const nearbyVeh = this.vehicleManager.getNearestVehicle(this.player.position, 4.2);
      if (nearbyVeh) {
        if (nearbyVeh.state.isLocked) {
          soundEngine.playUIClick();
          this.callbacks.onInteractionPrompt(`${nearbyVeh.state.name} is LOCKED. Press [K] to Unlock.`);
          return;
        }
        this.enterVehicle(nearbyVeh.state.id);
        return;
      }
    }

    // 0.2 Check creature taming or commanding
    const creature = this.wildlifeManager.getNearestCreature(this.player.position, 4.2);
    if (creature) {
      if (creature.species.isTamable && !creature.isTamed) {
        const comp = this.wildlifeManager.tameCreature(creature.id);
        if (comp) {
          soundEngine.playDawnVictoryChime();
          this.callbacks.onCompanionChange?.(comp);
          this.callbacks.onInteractionPrompt(`Tamed ${comp.name}! They will now follow and protect you.`);
          return;
        }
      } else if (creature.isTamed) {
        const nextOrder = this.wildlifeManager.companionState?.state === 'follow' ? 'stay' : 'follow';
        this.wildlifeManager.setCompanionOrder(nextOrder);
        this.callbacks.onCompanionChange?.({ ...this.wildlifeManager.companionState! });
        this.callbacks.onInteractionPrompt(`Companion ordered to: ${nextOrder.toUpperCase()}`);
        return;
      }
    }

    // Apartment Building interactions (Floor 1-4)
    const aptInteraction = this.prologueManager.townMgr.getApartmentInteraction(this.player.position);
    if (aptInteraction) {
      const apt = this.prologueManager.townMgr.apartmentBuilding;
      if (aptInteraction.id === 'tv') {
        const isOn = apt.toggleTV();
        this.callbacks.onInteractionPrompt(isOn ? 'TV: Switched ON [Oakridge Emergency Broadcast]' : 'TV: Switched OFF');
        return;
      } else if (aptInteraction.id === 'fan') {
        const isOn = apt.toggleFan();
        this.callbacks.onInteractionPrompt(isOn ? 'Ceiling Fan: Turned ON' : 'Ceiling Fan: Stopped');
        return;
      } else if (aptInteraction.id === 'ac') {
        const isOn = apt.toggleAC();
        this.callbacks.onInteractionPrompt(isOn ? 'Air Conditioner: ON [Cooling: 68°F]' : 'Air Conditioner: OFF');
        return;
      } else if (aptInteraction.id === 'door') {
        const isOpen = apt.toggleDoor();
        this.callbacks.onInteractionPrompt(isOpen ? 'Front Door: Opened' : 'Front Door: Closed');
        return;
      } else if (aptInteraction.id === 'compoundGate') {
        const isOpen = apt.toggleCompoundGate();
        this.callbacks.onInteractionPrompt(isOpen ? 'Residential compound gate: Open' : 'Residential compound gate: Closed');
        return;
      } else if (aptInteraction.id === 'fridge') {
        soundEngine.playUIClick();
        this.callbacks.onOpenFridge?.();
        return;
      } else if (aptInteraction.id === 'phone') {
        soundEngine.playUIClick();
        this.callbacks.onOpenPhone?.();
        return;
      } else if (aptInteraction.id === 'armory') {
        soundEngine.playUIClick();
        this.callbacks.onOpenArmory?.();
        return;
      } else if (aptInteraction.id === 'bed') {
        this.handleBedSleepInteraction();
        return;
      } else if (aptInteraction.id === 'washSink') {
        apt.toggleBathroomTap(true);
        soundEngine.playWaterRunning(3.2);
        this.houseInteractionCtrl.startInteraction({
          id: 'wash_sink',
          label: 'Bathroom Vanity Sink',
          targetObjectPos: new THREE.Vector3(-31.2, 0.82, 34.6),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-31.2, 0.245, 35.3),
          targetYaw: Math.PI,
          duration: 3.2,
        });
        this.callbacks.onInteractionPrompt('Washing hands and refreshing face with cool water...');
        return;
      } else if (aptInteraction.id === 'mirrorLook') {
        this.houseInteractionCtrl.startInteraction({
          id: 'mirror_look',
          label: 'Vanity Mirror',
          targetObjectPos: new THREE.Vector3(-31.2, 1.45, 34.6),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-31.2, 0.245, 35.3),
          targetYaw: Math.PI,
          duration: 3.0,
        });
        this.callbacks.onInteractionPrompt('Checking appearance in the bathroom mirror...');
        return;
      } else if (aptInteraction.id === 'shower') {
        apt.toggleBathroomShower(true);
        soundEngine.playWaterRunning(4.5);
        this.houseInteractionCtrl.startInteraction({
          id: 'shower',
          label: 'Enclosed Glass Shower',
          targetObjectPos: new THREE.Vector3(-32.6, 1.8, 34.2),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-32.6, 0.245, 34.4),
          targetYaw: Math.PI * 0.75,
          duration: 4.5,
        });
        this.callbacks.onInteractionPrompt('Taking a warm shower (Cleanliness & Stamina Restoring)...');
        return;
      } else if (aptInteraction.id === 'toilet') {
        this.houseInteractionCtrl.startInteraction({
          id: 'toilet',
          label: 'Porcelain Toilet',
          targetObjectPos: new THREE.Vector3(-32.8, 0.45, 35.8),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-32.5, 0.245, 35.8),
          targetYaw: -Math.PI / 2,
          duration: 3.5,
          privacyCamera: true,
        });
        this.callbacks.onInteractionPrompt('Using toilet (Sitting comfortably, will auto-flush)...');
        return;
      } else if (aptInteraction.id === 'bathtub') {
        soundEngine.playWaterRunning(4.5);
        this.houseInteractionCtrl.startInteraction({
          id: 'bathtub',
          label: 'Freestanding Bathtub',
          targetObjectPos: new THREE.Vector3(-30.2, 0.35, 34.0),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-30.2, 0.245, 34.6),
          targetYaw: Math.PI,
          duration: 4.5,
        });
        this.callbacks.onInteractionPrompt('Soaking in warm bath (Relieving physical fatigue)...');
        return;
      } else if (aptInteraction.id === 'towel') {
        this.houseInteractionCtrl.startInteraction({
          id: 'towel',
          label: 'Towel Rack',
          targetObjectPos: new THREE.Vector3(-29.55, 1.25, 35.2),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-29.8, 0.245, 35.2),
          targetYaw: Math.PI / 2,
          duration: 2.5,
        });
        this.callbacks.onInteractionPrompt('Drying hands with clean cotton towel.');
        return;
      } else if (aptInteraction.id === 'bathroomCabinet') {
        const isOpen = apt.toggleBathroomCabinet();
        if (isOpen) {
          this.callbacks.onItemCollected('medical_bandage', 1);
          this.callbacks.onInteractionPrompt('Medicine Cabinet: Opened [Collected Sterile Bandage & Antiseptic]');
        } else {
          this.callbacks.onInteractionPrompt('Medicine Cabinet: Closed');
        }
        return;
      } else if (aptInteraction.id === 'bathroomTap') {
        const isRunning = apt.toggleBathroomTap();
        this.callbacks.onInteractionPrompt(isRunning ? 'Vanity Tap: Running Water' : 'Vanity Tap: Closed');
        return;
      } else if (aptInteraction.id === 'bathroomLight') {
        const isOn = apt.toggleBathroomLight();
        this.callbacks.onInteractionPrompt(isOn ? 'Bathroom Ceiling Light: ON' : 'Bathroom Ceiling Light: OFF');
        return;
      } else if (aptInteraction.id === 'bathroomDoor') {
        const isOpen = apt.toggleBathroomDoor();
        this.callbacks.onInteractionPrompt(isOpen ? 'Bathroom Door: Swung Open' : 'Bathroom Door: Closed');
        return;
      } else if (aptInteraction.id === 'sofa') {
        this.houseInteractionCtrl.startInteraction({
          id: 'sofa_sit',
          label: 'Living Room Sofa',
          targetObjectPos: new THREE.Vector3(-26.0, 0.45, 35.5),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-26.0, 0.245, 35.2),
          targetYaw: 0,
          duration: -1,
        });
        this.callbacks.onInteractionPrompt('Relaxing on Living Room Sofa. Press any movement key or Jump to stand up.');
        return;
      } else if (aptInteraction.id === 'diningChair') {
        this.houseInteractionCtrl.startInteraction({
          id: 'chair_sit',
          label: 'Dining Chair',
          targetObjectPos: new THREE.Vector3(-21.8, 0.45, 34.2),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-21.8, 0.245, 34.0),
          targetYaw: Math.PI,
          duration: -1,
        });
        this.callbacks.onInteractionPrompt('Seated at Dining Table. Press any movement key or Jump to stand up.');
        return;
      } else if (aptInteraction.id === 'diningTable') {
        soundEngine.playUIClick();
        this.callbacks.onInteractionPrompt('Dining Table: Solid oak dining table set with place settings.');
        return;
      } else if (aptInteraction.id === 'kitchenStove') {
        const isOn = apt.toggleKitchenStove();
        this.callbacks.onInteractionPrompt(isOn ? 'Kitchen Cooking Range: 4 Burners ON [High Heat]' : 'Kitchen Cooking Range: OFF');
        return;
      } else if (aptInteraction.id === 'kitchenSink') {
        const isRunning = apt.toggleKitchenTap();
        this.houseInteractionCtrl.startInteraction({
          id: 'kitchen_sink',
          label: 'Kitchen Sink',
          targetObjectPos: new THREE.Vector3(-20.5, 0.9, 39.5),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-21.2, 0.245, 39.5),
          targetYaw: -Math.PI / 2,
          duration: 3.5,
        });
        this.callbacks.onInteractionPrompt('Drinking fresh purified tap water (+15 Thirst & Health)...');
        return;
      } else if (aptInteraction.id === 'wardrobe') {
        const isOpen = apt.toggleWardrobe();
        this.callbacks.onInteractionPrompt(isOpen ? 'Wardrobe: Double Doors Open [Clothing & Storage Inspected]' : 'Wardrobe: Doors Closed');
        return;
      } else if (aptInteraction.id === 'bedsideLamp') {
        const isOn = apt.toggleBedsideLamp();
        this.callbacks.onInteractionPrompt(isOn ? 'Bedside Night Lamp: ON' : 'Bedside Night Lamp: OFF');
        return;
      } else if (aptInteraction.id === 'computer') {
        this.houseInteractionCtrl.startInteraction({
          id: 'computer',
          label: 'Personal Terminal',
          targetObjectPos: new THREE.Vector3(-31.8, 0.75, 43.6),
          targetObjectRotY: 0,
          approachPos: new THREE.Vector3(-31.8, 0.245, 43.0),
          targetYaw: 0,
          duration: 3.5,
        });
        this.callbacks.onInteractionPrompt('Operating Local Terminal: Diagnostics All Green.');
        return;
      } else if (aptInteraction.id === 'wallClock') {
        const hours = Math.floor(this.gameTimeMinutes / 60);
        const mins = Math.floor(this.gameTimeMinutes % 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        this.callbacks.onInteractionPrompt(`Living Room Wall Clock: Day ${this.dayCount} · ${timeStr}`);
        return;
      } else if (aptInteraction.id === 'garageDoor') {
        const isOpen = apt.toggleGarageShutter();
        this.callbacks.onInteractionPrompt(isOpen ? 'Backyard Garage: Roll-Up Shutter Raised [OPEN]' : 'Backyard Garage: Roll-Up Shutter Lowered [CLOSED]');
        return;
      } else if (aptInteraction.id === 'turret') {
        soundEngine.playUIClick();
        this.callbacks.onInteractionPrompt('Gate Defense Sentry: ONLINE · Tracking Perimeter Threats');
        return;
      } else if (aptInteraction.id === 'railwayOperations') {
        soundEngine.playUIClick();
        this.callbacks.onOpenRailwayOperations?.();
        return;
      } else if (aptInteraction.id === 'medicalClinic') {
        soundEngine.playUIClick();
        this.callbacks.onOpenMedicalClinic?.();
        return;
      } else if (aptInteraction.id === 'patioDoor') {
        const isOpen = apt.togglePatioDoor();
        this.callbacks.onInteractionPrompt(isOpen ? 'Rear Patio Double Sliding Doors: OPEN' : 'Rear Patio Double Sliding Doors: CLOSED');
        return;
      } else if (aptInteraction.id === 'securityCommandCenter') {
        soundEngine.playUIClick();
        this.callbacks.onOpenSecurityCommandCenter?.();
        return;
      } else if (aptInteraction.id === 'medicalBed') {
        soundEngine.playUIClick();
        this.player.startMedicalRest(this.player.position);
        this.callbacks.onInteractionPrompt('Resting in Ground-Floor Medical Recovery Station (Regenerating Health. Move to stand up)');
        return;
      } else if (aptInteraction.id === 'basementTV') {
        const isOn = apt.toggleBasementTV();
        this.callbacks.onInteractionPrompt(isOn ? 'Basement 65-inch TV: ON [Perimeter Surveillance Feed]' : 'Basement 65-inch TV: OFF');
        return;
      } else if (aptInteraction.id === 'apartmentStatus') {
        soundEngine.playUIClick();
        this.callbacks.onOpenApartmentStatus?.();
        return;
      }
    }

    // Story Prologue & 13 Chapters Interaction
    if (!this.prologueManager.isCompleted) {
      if (this.prologueManager.handleInteraction(this.player.position)) {
        return;
      }
    } else {
      // Open the complete interaction panel for a nearby story companion.
      const friend = this.prologueManager.companionMgr.getNearestCompanion(this.player.position, 3.8);
      if (friend) {
        if (this.callbacks.onOpenFriendModal) {
          this.callbacks.onOpenFriendModal(friend);
        } else {
          const dialogue: SurvivorDialogue = {
            id: `friend_${friend.id}`,
            name: friend.name,
            role: friend.role,
            rescued: false,
            lines: [`${friend.name} is nearby. Choose how you want to interact.`],
            choices: ['Handshake', 'Clap', 'Dance', friend.isFollowing ? 'Unfollow' : 'Follow', friend.isFriend ? 'Unfriend' : 'Friend', 'Chat'],
          };
          this.callbacks.onOpenDialogue?.(dialogue);
        }
        if (friend.id === 'marcus') this.updateQuestProgress('talk_to_marcus', 1);
        return;
      }
    }

    // Research Complex Interaction (Biology Lab, Medical Research, Meteor Lab, Testing, Genetics, Storage, Command, Quarters, Quarantine, Secret Lab)
    if (this.prologueManager.researchComplex?.handleInteraction(this.player.position, this)) {
      return;
    }

    // Railway NPC & Passenger Conversation (Player-Quality Human NPCs on platforms and in trains)
    const railwayNPC = this.aiTrainManager?.npcManager?.getNearestNPC(this.player.position, 3.8);
    if (railwayNPC) {
      soundEngine.playUIClick();
      const dialogue = railwayNPC.getDialogue();
      this.callbacks.onOpenDialogue?.(dialogue);
      return;
    }

    // Town Citizen Conversation
    const citizen = this.prologueManager.townMgr.getNearestCitizen(this.player.position, 3.5);
    if (citizen) {
      const line = citizen.dialogueLines[Math.floor(Math.random() * citizen.dialogueLines.length)];
      this.callbacks.onPrologueSubtitle?.({
        speaker: citizen.name,
        role: citizen.role,
        text: line,
        duration: 4.5,
      });
      return;
    }

    // Night 1 Peaceful Sleep in Bed at Home
    if (this.prologueManager.phase === 'night1_peaceful') {
      const dHome = Math.hypot(this.player.position.x - (-26), this.player.position.z - 38);
      if (dHome < 4.0) {
        this.prologueManager.sleepToDay2();
        return;
      }
    }

    // Underground Shelter Interactive Stations
    const ix = this.prologueManager.shelterMgr.interiorCenter.x;
    const iy = this.prologueManager.shelterMgr.interiorCenter.y;
    const iz = this.prologueManager.shelterMgr.interiorCenter.z;
    const dShelterCenter = Math.hypot(this.player.position.x - ix, this.player.position.z - iz);

    if (this.player.position.y < -2.0 && dShelterCenter < 14) {
      // Radio
      const dRadio = Math.hypot(this.player.position.x - (ix - 5.5), this.player.position.z - (iz - 5));
      if (dRadio < 2.8) {
        soundEngine.playRadioStatic(2.0);
        this.callbacks.onPrologueSubtitle?.({
          speaker: 'Emergency Ham Radio',
          text: '...Emergency Broadcast Network: Meteorite impact in Sector 4 contaminated local airspace. All personnel seek underground containment...',
          duration: 5.5,
        });
        this.updateQuestProgress('inspect_radio', 1);
        return;
      }
      // Generator
      const dGen = Math.hypot(this.player.position.x - (ix + 5.5), this.player.position.z - (iz - 5));
      if (dGen < 2.8) {
        soundEngine.playBuildSnap();
        this.callbacks.onInteractionPrompt('Backup Diesel Generator: Online · 15 kW Output · 80% Fuel');
        this.updateQuestProgress('inspect_generator', 1);
        return;
      }
      // Medical
      const dMed = Math.hypot(this.player.position.x - (ix - 5.5), this.player.position.z - (iz + 4.5));
      if (dMed < 2.8) {
        this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 50);
        this.callbacks.onStatsChange({ ...this.playerStats });
        soundEngine.playDawnVictoryChime();
        this.callbacks.onItemCollected('medical_bandage', 1);
        this.callbacks.onInteractionPrompt('First Aid Station: Restored 50 HP and gathered Medical Bandage');
        return;
      }
      // Bunk Bed
      const dBunk = Math.hypot(this.player.position.x - (ix + 5.5), this.player.position.z - (iz + 4.5));
      if (dBunk < 2.8) {
        this.executeBedSleep(new THREE.Vector3(ix + 4.0, -4.5, iz + 4.5));
        return;
      }
      // Storage
      const dStorage = Math.hypot(this.player.position.x - ix, this.player.position.z - (iz - 5.5));
      if (dStorage < 2.8) {
        soundEngine.playBuildSnap();
        this.callbacks.onItemCollected('canned_beans', 3);
        this.callbacks.onItemCollected('clean_water', 3);
        this.callbacks.onInteractionPrompt('Scavenged Shelter Storage: +3 Canned Beans, +3 Clean Water');
        this.updateQuestProgress('check_storage', 1);
        return;
      }
      // Ladder to surface
      const dLadder = Math.hypot(this.player.position.x - ix, this.player.position.z - (iz + 6.2));
      if (dLadder < 2.8) {
        soundEngine.playFootstep();
        this.player.position.set(-46, 0.5, 26);
        this.callbacks.onInteractionPrompt('Climbed to the surface.');
        this.updateQuestProgress('surface_recon', 1);
        return;
      }
    } else {
      // Exterior blast door to descend into bunker
      const ex = this.prologueManager.shelterMgr.entrancePos.x;
      const ez = this.prologueManager.shelterMgr.entrancePos.z;
      const dPortal = Math.hypot(this.player.position.x - ex, this.player.position.z - ez);
      if (dPortal < 3.8) {
        soundEngine.playFootstep();
        this.player.position.set(-46, -4.2, 24);
        this.callbacks.onInteractionPrompt('Entered Underground Shelter 09.');
        return;
      }
    }

    // Nearby survivor conversation/rescue takes priority over world props.
    const survivor = this.rescueManager.nearest(this.player.position, range);
    if (survivor) {
      const dialogue = this.rescueManager.getDialogue(survivor.id);
      if (dialogue) this.callbacks.onOpenDialogue?.(dialogue);
      return;
    }

    // Check placed structures
    for (const struct of this.buildingMgr.structures) {
      const dx = struct.position[0] - this.player.position.x;
      const dz = struct.position[2] - this.player.position.z;
      if (Math.hypot(dx, dz) < range) {
        const def = this.buildingMgr.activeDef; // check type
        if (struct.typeId === 'wooden_gate' || struct.typeId === 'starter_cabin') {
          const isOpen = this.buildingMgr.toggleDoor(struct.uid);
          soundEngine.playGateToggle(isOpen);
          return;
        } else if (struct.typeId === 'survivor_bed') {
          const returnP = new THREE.Vector3(struct.position[0] + 1.2, struct.position[1], struct.position[2]);
          this.executeBedSleep(returnP);
          return;
        } else if (struct.typeId === 'notice_board') {
          soundEngine.playUIClick();
          this.updateQuestProgress('read_notice_board', 1);
          this.callbacks.onOpenNoticeBoard();
          return;
        } else if (struct.typeId === 'farm_plot') {
          const result = this.buildingMgr.tendFarmPlot(struct.uid, true);
          this.updateQuestProgress('tend_farm', 1);
          if (result.action === 'harvested') {
            soundEngine.playBuildSnap();
            this.callbacks.onItemCollected('wild_berries', result.yieldAmount || 4);
            this.addXP(25);
          } else if (result.action === 'planted') {
            soundEngine.playBuildSnap();
          }
          return;
        } else if (struct.typeId === 'water_collector') {
          soundEngine.playUIClick();
          this.callbacks.onItemCollected('clean_water', 1);
          return;
        } else if (struct.typeId === 'storage_chest') {
          soundEngine.playUIClick();
          this.updateQuestProgress('open_storage_stash', 1);
          this.callbacks.onOpenStorage(struct);
          return;
        } else if (struct.typeId === 'workbench') {
          soundEngine.playUIClick();
          this.callbacks.onOpenCrafting('workbench');
          return;
        } else if (struct.typeId === 'salvage_bench') {
          soundEngine.playUIClick();
          this.callbacks.onOpenBlueprintModal?.();
          return;
        } else if (struct.typeId === 'evacuation_beacon') {
          const ext = this.worldEventsManager.getExtractionState();
          if (!ext.active && !ext.completed) {
            this.worldEventsManager.startExtractionHoldout(struct.uid);
            this.callbacks.onInteractionPrompt('EVACUATION BEACON ACTIVE: Hold perimeter for 90s!');
          } else if (ext.completed) {
            this.callbacks.onExtractionVictory?.();
          }
          return;
        } else if (struct.typeId === 'campfire') {
          soundEngine.playUIClick();
          this.callbacks.onOpenCrafting('campfire');
          return;
        }
      }
    }

    // Check Active World Supply Drop
    const activeDrop = this.worldEventsManager.getActiveSupplyDrop();
    if (activeDrop && activeDrop.landed && !activeDrop.looted) {
      const dDrop = Math.hypot(activeDrop.position[0] - this.player.position.x, activeDrop.position[2] - this.player.position.z);
      if (dDrop < 4.2 && this.worldEventsManager.markSupplyDropLooted()) {
        soundEngine.playBuildSnap();
        this.callbacks.onItemCollected('medkit', 2);
        this.callbacks.onItemCollected('crossbow_bolts', 18);
        this.callbacks.onItemCollected('electronic_parts', 6);
        this.callbacks.onItemCollected('antibiotic_shot', 1);
        this.callbacks.onItemCollected('boss_core', 1);
        this.addXP(120);
        this.callbacks.onInteractionPrompt('Looted Skyline Air-Drop Crate! +Medkits, +Bolts, +Circuits, +Bio-Core');
        return;
      }
    }

    // Check Corpse Death Bag recovery
    const bagPos = this.combatEffects.getDeathBagPosition();
    if (bagPos && this.deathBagData && this.player.position.distanceTo(bagPos) < 3.6) {
      for (const slot of this.deathBagData.items) {
        if (slot) this.callbacks.onItemCollected(slot.item.id, slot.count);
      }
      this.deathBagData = null;
      this.combatEffects.setDeathBag(null);
      soundEngine.playBuildSnap();
      this.callbacks.onInteractionPrompt('Recovered supplies from Corpse Recovery Backpack!');
      return;
    }

    // Check supply crate
    const crate = this.terrain.resources.find((r) => r.type === 'supply_crate');
    if (crate) {
      const dx = crate.position[0] - this.player.position.x;
      const dz = crate.position[2] - this.player.position.z;
      if (Math.hypot(dx, dz) < range) {
        this.terrain.damageResource(crate.id, 100);
        soundEngine.playBuildSnap();
        this.callbacks.onItemCollected('canned_beans', 3);
        this.callbacks.onItemCollected('clean_water', 2);
        this.callbacks.onItemCollected('nails_bolts', 8);
        return;
      }
    }

    // Check movable dynamic physics props (Chairs, Stools, Crates, Barrels, Barriers, Rubble)
    const lookDir = new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw));
    if (this.dynamicPropPhysics.kickNearbyProp(this.player.position, lookDir)) {
      this.callbacks.onInteractionPrompt('Kicked physical object!');
      return;
    }
  }

  /** Raycast-select a nearby visible friend from mouse or mobile touch coordinates. */
  public tryOpenFriendInteraction(clientX: number, clientY: number): boolean {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, this.camera);
    const candidates: Array<{ id: 'marcus' | 'chloe' | 'maya'; distance: number }> = [];
    this.prologueManager.companionMgr.companionMeshes.forEach((mesh, id) => {
      const knownFriend = this.prologueManager.isCompleted || this.prologueManager.friendsMet[id];
      if (!knownFriend || !mesh.visible) return;
      const hits = raycaster.intersectObject(mesh, true);
      if (!hits.length) return;
      const d = Math.hypot(mesh.position.x - this.player.position.x, mesh.position.z - this.player.position.z);
      if (d <= 7) candidates.push({ id, distance: hits[0].distance });
    });
    const selected = candidates.sort((a, b) => a.distance - b.distance)[0];
    if (!selected) return false;
    const friend = this.prologueManager.companionMgr.companions.get(selected.id);
    if (!friend) return false;
    if (this.callbacks.onOpenFriendModal) {
      this.callbacks.onOpenFriendModal(friend);
    } else {
      this.callbacks.onOpenDialogue?.({
        id: `friend_${friend.id}`, name: friend.name, role: friend.role, rescued: false,
        lines: [`${friend.name} is nearby. Choose how you want to interact.`],
        choices: ['Handshake', 'Clap', 'Dance', friend.isFollowing ? 'Unfollow' : 'Follow', friend.isFriend ? 'Unfriend' : 'Friend', 'Chat'],
      });
    }
    return true;
  }

  public resolveSurvivorChoice(id: string, choice: string) {
    if (id.startsWith('friend_')) {
      const friendId = id.slice(7) as 'marcus' | 'chloe' | 'maya';
      const manager = this.prologueManager.companionMgr;
      const friend = manager.companions.get(friendId);
      if (!friend) return;
      if (choice === 'Handshake' || choice === 'Clap' || choice === 'Dance') {
        const friendMesh = manager.companionMeshes.get(friendId);
        if (friendMesh) {
          this.player.yaw = Math.atan2(friendMesh.position.x - this.player.position.x, friendMesh.position.z - this.player.position.z);
          friendMesh.rotation.y = Math.atan2(this.player.position.x - friendMesh.position.x, this.player.position.z - friendMesh.position.z);
        }
        manager.playFriendGesture(friendId, choice.toLowerCase() as 'handshake' | 'clap' | 'dance');
        this.player.triggerSocialAction(choice);
        this.callbacks.onInteractionPrompt(`${friend.name} joined you: ${choice}.`);
      } else if (choice === 'Stop Dance') {
        manager.stopFriendGesture(friendId);
        this.player.triggerSocialAction('Stop Dance');
        this.callbacks.onInteractionPrompt(`${friend.name} stopped dancing.`);
      } else if (choice === 'Follow' || choice === 'Unfollow') {
        manager.setFriendFollowing(friendId, choice === 'Follow');
        this.callbacks.onInteractionPrompt(choice === 'Follow' ? `${friend.name} is following you.` : `${friend.name} will stay here.`);
      } else if (choice === 'Friend') {
        friend.isFriend = true;
        friend.relationshipScore = Math.min(100, friend.relationshipScore + 10);
        this.callbacks.onInteractionPrompt(`${friend.name} added as a friend.`);
      } else if (choice === 'Unfriend') {
        friend.isFriend = false;
        friend.relationshipScore = 0;
        manager.setFriendFollowing(friendId, false);
        this.callbacks.onInteractionPrompt(`${friend.name} removed from your friend list. They remain an NPC.`);
      } else if (choice === 'Chat') {
        // The React friend panel owns the conversation history and chat composer.
      }
      return;
    }
    if (choice === 'Help me reach the sanctuary') {
      const started = this.rescueManager.beginEscort(id);
      if (started) this.callbacks.onInteractionPrompt('Survivor is following you. Lead them back inside the sanctuary perimeter.');
    }
  }

  public logSpeciesDossier(agentId: string) {
    const matched = this.wildlifeManager.creatures.find((c) => c.id === agentId);
    const creature = matched || this.wildlifeManager.getNearestCreature(this.player.position, 35.0);
    if (!creature) return;
    this.addXP(50);
    this.callbacks.onSpeciesScanned?.(creature.species.id);
    this.callbacks.onCareerEvent?.({ type: 'species_logged', count: 1 });
    soundEngine.playDawnVictoryChime();
    this.callbacks.onInteractionPrompt(`Logged ${creature.species.name} (Gen ${creature.genome.generation}) in Field Chronicle! +50 XP`);
    this.updateQuestProgress('study_wildlife', 1);
  }

  public handleBedSleepInteraction(): boolean {
    const hour = this.gameTimeMinutes / 60;
    const isActualNight = hour >= 21.0 || hour < 5.0;

    // Bed Mattress world position (-31.5, 0.88, 41.8) strictly on top of mattress
    const bedMattressPos = new THREE.Vector3(-31.5, 0.88, 41.8);
    const bedApproachPos = new THREE.Vector3(-29.8, 0.245, 41.8);

    const started = this.houseInteractionCtrl.startInteraction({
      id: 'bed_sleep',
      label: 'Double Bed',
      targetObjectPos: bedMattressPos,
      targetObjectRotY: 0,
      approachPos: bedApproachPos,
      targetYaw: Math.PI / 2,
      duration: 4.5,
    });

    if (started) {
      if (isActualNight) {
        this.callbacks.onInteractionPrompt('Resting in Bed (Sleeping until Dawn 06:00 AM...)');
      } else {
        this.callbacks.onInteractionPrompt('Resting in Bed (Restorative nap, restoring stamina...)');
      }
    }
    return started;
  }

  public executeBedSleep(returnPosition?: THREE.Vector3): boolean {
    return this.handleBedSleepInteraction();
  }

  private finishBedSleep(): void {
    const hour = this.gameTimeMinutes / 60;
    const isActualNight = hour >= 21.0 || hour < 5.0;

    if (isActualNight) {
      const sleepingNightDay = this.dayCount;
      if (!this.prologueManager.isCompleted && (this.prologueManager.phase === 'D1_E10_LAST_NORMAL_NIGHT' || this.prologueManager.phase === 'night1_peaceful')) {
        this.lastSleptDay = sleepingNightDay;
        this.gameTimeMinutes = 480; // 08:00 AM Day 2
        this.dayCount = 2;
        this.playerStats.health = this.playerStats.maxHealth;
        this.playerStats.stamina = this.playerStats.maxStamina;
        this.playerStats.hunger = 100;
        this.playerStats.thirst = 100;
        this.playerStats.temperature = 24;
        this.callbacks.onStatsChange({ ...this.playerStats });
        this.callbacks.onTimeChange(this.gameTimeMinutes, this.dayCount, false, false);
        this.prologueManager.sleepToDay2();
        return;
      }

      soundEngine.playDawnVictoryChime();
      this.gameTimeMinutes = 360; // 06:00 AM Dawn
      this.dayCount += 1;
      this.lastSleptDay = sleepingNightDay;

      // Full passive health and stamina recovery
      this.playerStats.health = this.playerStats.maxHealth;
      this.playerStats.stamina = this.playerStats.maxStamina;
      this.playerStats.temperature = 24;
      this.buildingMgr.advanceFarmCrops();

      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onTimeChange(this.gameTimeMinutes, this.dayCount, false, false);
      this.callbacks.onHordeEvent('dawn_victory');
      this.updateQuestProgress('survive_night', 1);
      this.updateQuestProgress('rest_in_bed', 1);

      this.callbacks.onPrologueSubtitle?.({
        speaker: 'Survivor',
        text: `Dawn breaks over the valley. Morning of Day ${this.dayCount}. Feeling rested for the day ahead.`,
        duration: 4.5,
      });
      this.callbacks.onInteractionPrompt(`Morning of Day ${this.dayCount}. Health and stamina refreshed.`);
      this.triggerAutoSave();
    } else {
      // Daytime rest
      soundEngine.playDawnVictoryChime();
      this.gameTimeMinutes = (this.gameTimeMinutes + 120) % 1440;
      this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 30);
      this.playerStats.stamina = this.playerStats.maxStamina;
      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onTimeChange(this.gameTimeMinutes, this.dayCount, false, false);
      this.callbacks.onInteractionPrompt('Woke up refreshed from daytime rest. Stamina fully restored.');
    }
  }

  private handleHouseInteractionComplete(type: HouseInteractionType): void {
    const apt = this.prologueManager?.townMgr?.apartmentBuilding;
    if (type === 'bed_sleep') {
      this.finishBedSleep();
    } else if (type === 'wash_sink') {
      apt?.toggleBathroomTap(false);
      this.playerStats.stamina = Math.min(this.playerStats.maxStamina, this.playerStats.stamina + 15);
      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onInteractionPrompt('Hands and face cleaned. Feeling refreshed (+15 Stamina).');
    } else if (type === 'shower') {
      apt?.toggleBathroomShower(false);
      this.playerStats.stamina = this.playerStats.maxStamina;
      this.playerStats.temperature = 24;
      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onInteractionPrompt('Hot shower completed. Full stamina restored!');
    } else if (type === 'toilet') {
      apt?.triggerToiletFlush();
      this.callbacks.onInteractionPrompt('Toilet flushed with fresh water.');
    } else if (type === 'bathtub') {
      this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 25);
      this.playerStats.stamina = this.playerStats.maxStamina;
      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onInteractionPrompt('Warm soak complete. Health +25 & full stamina!');
    } else if (type === 'kitchen_sink') {
      apt?.toggleKitchenTap(false);
      this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + 15);
      this.callbacks.onStatsChange({ ...this.playerStats });
      this.callbacks.onInteractionPrompt('Drank fresh mountain spring water. Health +15!');
    }
  }

  public sleepUntilDawn() {
    this.executeBedSleep();
  }

  private checkInteractionPrompt() {
    if (this.houseInteractionCtrl && this.houseInteractionCtrl.isInteracting) {
      return;
    }

    if (this.buildingMgr.activeDef) {
      this.callbacks.onInteractionPrompt('[Left-Click] Place Structure | [R] Rotate | [B / Esc] Cancel');
      const aim = this.getPlacementAimPoint();
      if (aim) {
        this.buildingMgr.updatePreview(aim, true);
      }
      return;
    }

    // Train boarding, walking, seats and driving prompts
    if (this.aiTrainManager) {
      if (this.aiTrainManager.activePassengerTrain) {
        const train = this.aiTrainManager.activePassengerTrain;
        const nearbyTrainNPC = this.aiTrainManager.npcManager?.getNearestNPC(this.player.position, 2.5);
        if (nearbyTrainNPC) {
          this.callbacks.onInteractionPrompt(`[E] Talk to ${nearbyTrainNPC.profile.name} (${nearbyTrainNPC.profile.role})`);
          return;
        }

        if (this.aiTrainManager.isPilotSeated) {
          this.callbacks.onInteractionPrompt('[E] Stand Up from Pilot Seat · [C] Camera View · Watch AI Pilot Drive');
        } else if (this.aiTrainManager.playerLocalPos.x >= 14.5) {
          this.callbacks.onInteractionPrompt('[E] Sit in Pilot Observer Seat · Watch AI Drive · [C] Camera');
        } else if (this.aiTrainManager.seatedSeatId) {
          this.callbacks.onInteractionPrompt('[E] Stand Up · [C] Camera View · Explore 5 Carriages');
        } else if (this.aiTrainManager.activePassengerTrain.seats.some(s => this.aiTrainManager!.playerLocalPos.distanceTo(s.localPos) < 1.8)) {
          this.callbacks.onInteractionPrompt('[E] Sit Down · [C] Camera · Explore Dining, Sleeper & Lounge Cars');
        } else {
          this.callbacks.onInteractionPrompt('[E] Exit Train · [C] Camera · Walk freely through all 5 compartments');
        }
        return;
      }

      const nearbyRailwayNPC = this.aiTrainManager.npcManager?.getNearestNPC(this.player.position, 3.8);
      if (nearbyRailwayNPC) {
        this.callbacks.onInteractionPrompt(`[E] Talk to ${nearbyRailwayNPC.profile.name} (${nearbyRailwayNPC.profile.role})`);
        return;
      }

      const nearbyTVM = this.aiTrainManager.getNearbyTVMOrTicketCounter(this.player.position, 4.0);
      if (nearbyTVM) {
        this.callbacks.onInteractionPrompt(`[E] ${nearbyTVM.label} · Book Passenger Ticket or Fast Travel`);
        return;
      }

      const nearbyLift = this.aiTrainManager.getNearbyStationLift(this.player.position, 3.8);
      if (nearbyLift) {
        this.callbacks.onInteractionPrompt(`[E] Station Lift ${nearbyLift.liftIndex} · Travel between Ground, Mezzanine & Dual Skywalk`);
        return;
      }

      const nearbyFacility = this.aiTrainManager.getNearbyStationInteractiveAction(this.player.position, 3.4);
      if (nearbyFacility) {
        this.callbacks.onInteractionPrompt(nearbyFacility.prompt);
        return;
      }

      const boardable = this.aiTrainManager.getNearbyBoardableTrain(this.player.position, 8.5);
      if (boardable) {
        this.callbacks.onInteractionPrompt(`[E] Board ${boardable.trainNumber} · ${boardable.serviceName} (${boardable.line}) · Explore 5 Carriages`);
        return;
      }
    }

    // Vehicle interaction prompt
    if (this.vehicleManager) {
      if (this.vehicleManager.vehicleState.isOccupied) {
        this.callbacks.onInteractionPrompt('[F / Exit] Dismount Vehicle · [L] Headlights · [K] Lock/Unlock');
        return;
      }
      const nearbyVeh = this.vehicleManager.getNearestVehicle(this.player.position, 4.2);
      if (nearbyVeh) {
        if (nearbyVeh.state.isLocked) {
          this.callbacks.onInteractionPrompt(`[K] Unlock ${nearbyVeh.state.name} [LOCKED]`);
        } else {
          this.callbacks.onInteractionPrompt(`[E / Drive] Drive ${nearbyVeh.state.name} · [K] Lock`);
        }
        return;
      }
    }

    // Creature taming prompt
    const creature = this.wildlifeManager.getNearestCreature(this.player.position, 4.0);
    if (creature) {
      if (creature.species.isTamable && !creature.isTamed) {
        this.callbacks.onInteractionPrompt(`[E / Tame] Tame Wild ${creature.species.name}`);
        return;
      } else if (creature.isTamed) {
        const order = this.wildlifeManager.companionState?.state || 'follow';
        this.callbacks.onInteractionPrompt(`[E] Command Companion (Current: ${order.toUpperCase()})`);
        return;
      }
    }

    // Apartment Building interactions prompt (Floors 1-4: TV, Fan, AC, Fridge, Phone, Armory, Bed, Pool, Door)
    const aptPrompt = this.prologueManager.townMgr.getApartmentInteraction(this.player.position);
    if (aptPrompt) {
      this.callbacks.onInteractionPrompt(aptPrompt.prompt);
      return;
    }

    // Research Complex Facilities Prompt (Biology Lab, Medical Research, Meteor Lab, Testing Chambers, Genetics Lab, Sample Storage, Command Center, Quarters, Quarantine, Secret Lab)
    const researchPrompt = this.prologueManager.researchComplex?.getInteractionPrompt(this.player.position);
    if (researchPrompt) {
      this.callbacks.onInteractionPrompt(researchPrompt);
      return;
    }

    const range = 3.5;

    // 13-Chapter Story Prologue Prompt
    if (!this.prologueManager.isCompleted) {
      const prologuePrompt = this.prologueManager.getInteractionPrompt(this.player.position);
      if (prologuePrompt) {
        this.callbacks.onInteractionPrompt(prologuePrompt);
        return;
      }
    }

    // Story Companion Prompt
    const nearbyFriend = this.prologueManager.companionMgr.getNearestCompanion(this.player.position, 3.8);
    if (nearbyFriend) {
      this.callbacks.onInteractionPrompt(`[E] Talk to ${nearbyFriend.name} · ${nearbyFriend.role}`);
      return;
    }

    // Town Citizen Prompt
    const nearbyCitizen = this.prologueManager.townMgr.getNearestCitizen(this.player.position, 3.5);
    if (nearbyCitizen) {
      this.callbacks.onInteractionPrompt(`[E] Talk to ${nearbyCitizen.name} (${nearbyCitizen.role})`);
      return;
    }

    // Night 1 Bed Prompt
    if (this.prologueManager.phase === 'night1_peaceful') {
      const dHome = Math.hypot(this.player.position.x - (-26), this.player.position.z - 38);
      if (dHome < 3.8) {
        this.callbacks.onInteractionPrompt('[E] Sleep in Bed until Morning (Starts Day 2)');
        return;
      }
    }

    // Underground Shelter Interactive Stations
    const ix = this.prologueManager.shelterMgr.interiorCenter.x;
    const iy = this.prologueManager.shelterMgr.interiorCenter.y;
    const iz = this.prologueManager.shelterMgr.interiorCenter.z;
    const dShelterCenter = Math.hypot(this.player.position.x - ix, this.player.position.z - iz);

    if (this.player.position.y < -2.0 && dShelterCenter < 14) {
      // Radio
      const dRadio = Math.hypot(this.player.position.x - (ix - 5.5), this.player.position.z - (iz - 5));
      if (dRadio < 2.8) {
        this.callbacks.onInteractionPrompt('[E] Tune Emergency Ham Radio');
        return;
      }
      // Generator
      const dGen = Math.hypot(this.player.position.x - (ix + 5.5), this.player.position.z - (iz - 5));
      if (dGen < 2.8) {
        this.callbacks.onInteractionPrompt('[E] Inspect Backup Diesel Generator (15 kW Online)');
        return;
      }
      // Medical
      const dMed = Math.hypot(this.player.position.x - (ix - 5.5), this.player.position.z - (iz + 4.5));
      if (dMed < 2.8) {
        this.callbacks.onInteractionPrompt('[E] Access Medical First Aid Cabinet (Restores Health)');
        return;
      }
      // Bunk Bed
      const dBunk = Math.hypot(this.player.position.x - (ix + 5.5), this.player.position.z - (iz + 4.5));
      if (dBunk < 2.8) {
        const hour = this.gameTimeMinutes / 60;
        const isBedtime = hour >= 21.0 || hour < 5.0;
        if (!isBedtime) {
          this.callbacks.onInteractionPrompt('[E] Shelter Bunk Bed (Sleep available at night)');
        } else if (this.lastSleptDay === this.dayCount) {
          this.callbacks.onInteractionPrompt('[E] Shelter Bunk Bed (Already slept tonight)');
        } else {
          this.callbacks.onInteractionPrompt('[E] Rest in Shelter Bunk Bed until Morning');
        }
        return;
      }
      // Storage
      const dStorage = Math.hypot(this.player.position.x - ix, this.player.position.z - (iz - 5.5));
      if (dStorage < 2.8) {
        this.callbacks.onInteractionPrompt('[E] Open Shelter Emergency Supplies');
        return;
      }
      // Ladder to surface
      const dLadder = Math.hypot(this.player.position.x - ix, this.player.position.z - (iz + 6.2));
      if (dLadder < 2.8) {
        this.callbacks.onInteractionPrompt('[E] Climb Exit Ladder to Surface');
        return;
      }
    } else {
      // Exterior blast door to descend into bunker
      const ex = this.prologueManager.shelterMgr.entrancePos.x;
      const ez = this.prologueManager.shelterMgr.entrancePos.z;
      const dPortal = Math.hypot(this.player.position.x - ex, this.player.position.z - ez);
      if (dPortal < 3.8) {
        this.callbacks.onInteractionPrompt('[E] Descend into Underground Shelter 09');
        return;
      }
    }

    const nearbySurvivor = this.rescueManager.nearest(this.player.position, range);
    if (nearbySurvivor) {
      this.callbacks.onInteractionPrompt(`[E] Talk to ${nearbySurvivor.name} · ${nearbySurvivor.role}`);
      return;
    }
    for (const struct of this.buildingMgr.structures) {
      const dx = struct.position[0] - this.player.position.x;
      const dz = struct.position[2] - this.player.position.z;
      if (Math.hypot(dx, dz) < range) {
        if (this.activeSlotItem?.toolType === 'hammer' && struct.currentHealth < struct.maxHealth) {
          const name = struct.typeId === 'wooden_wall' ? 'Fortified Palisade Wall' : struct.typeId === 'wooden_gate' ? 'Perimeter Gate' : 'Structure';
          this.callbacks.onInteractionPrompt(`[Left-Click] Repair ${name} (${Math.round(struct.currentHealth)}/${struct.maxHealth} HP)`);
          return;
        }
        if (struct.typeId === 'wooden_gate' || struct.typeId === 'starter_cabin') {
          this.callbacks.onInteractionPrompt(`[E] ${struct.isOpen ? 'Close Gate / Door' : 'Open Gate / Door'}`);
          return;
        } else if (struct.typeId === 'survivor_bed') {
          const hour = this.gameTimeMinutes / 60;
          const isBedtime = hour >= 21.0 || hour < 5.0;
          if (!isBedtime) {
            this.callbacks.onInteractionPrompt('[E] Survivor Bed (Sleep available at night)');
          } else if (this.lastSleptDay === this.dayCount) {
            this.callbacks.onInteractionPrompt('[E] Survivor Bed (Already slept tonight)');
          } else {
            this.callbacks.onInteractionPrompt('[E] Sleep in Bed until Morning (Advance to Dawn)');
          }
          return;
        } else if (struct.typeId === 'notice_board') {
          this.callbacks.onInteractionPrompt('[E] Read Sanctuary Notice Board & Directives');
          return;
        } else if (struct.typeId === 'farm_plot') {
          const stage = struct.farmStage || 0;
          if (stage === 0) {
            this.callbacks.onInteractionPrompt('[E] Plant Seed Packet in Soil');
          } else if (stage === 1) {
            this.callbacks.onInteractionPrompt('[E] Tend Farm Plot (Crops are Growing)');
          } else {
            this.callbacks.onInteractionPrompt('[E] Harvest Ripe Berries (+4 Crops)');
          }
          return;
        } else if (struct.typeId === 'water_collector') {
          this.callbacks.onInteractionPrompt('[E] Draw Clean Water from Cistern');
          return;
        } else if (struct.typeId === 'storage_chest') {
          this.callbacks.onInteractionPrompt('[E] Open Storage Stash');
          return;
        } else if (struct.typeId === 'workbench') {
          this.callbacks.onInteractionPrompt('[E] Use Artisan Workbench');
          return;
        } else if (struct.typeId === 'salvage_bench') {
          this.callbacks.onInteractionPrompt('[E] Gear Salvage & Blueprint Terminal');
          return;
        } else if (struct.typeId === 'evacuation_beacon') {
          const ext = this.worldEventsManager.getExtractionState();
          this.callbacks.onInteractionPrompt(
            ext.active
              ? `Evacuation Signal Active (${Math.ceil(ext.remainingSeconds)}s remaining)`
              : ext.completed
                ? '[E] Complete Evacuation / Trigger NG+ Rebirth'
                : '[E] Activate Rebirth Evacuation Radio Beacon'
          );
          return;
        } else if (struct.typeId === 'campfire') {
          this.callbacks.onInteractionPrompt('[E] Cook / Boil Water at Campfire');
          return;
        }
      }
    }

    // Supply Drop & Death Bag Prompts
    const activeDropPrompt = this.worldEventsManager.getActiveSupplyDrop();
    if (activeDropPrompt && activeDropPrompt.landed && !activeDropPrompt.looted) {
      if (Math.hypot(activeDropPrompt.position[0] - this.player.position.x, activeDropPrompt.position[2] - this.player.position.z) < 4.2) {
        this.callbacks.onInteractionPrompt('[E] Loot Skyline Air-Drop Supply Crate');
        return;
      }
    }
    const bagPosPrompt = this.combatEffects.getDeathBagPosition();
    if (bagPosPrompt && this.player.position.distanceTo(bagPosPrompt) < 3.6) {
      this.callbacks.onInteractionPrompt('[E] Recover Loot from Corpse Backpack');
      return;
    }

    // Check resource prompt
    for (const res of this.terrain.resources) {
      const dx = res.position[0] - this.player.position.x;
      const dz = res.position[2] - this.player.position.z;
      if (Math.hypot(dx, dz) < 3.2) {
        if (res.type === 'tree') {
          this.callbacks.onInteractionPrompt('[Left-Click] Fell Timber Pine (Equip Axe)');
          return;
        } else if (res.type === 'rock') {
          this.callbacks.onInteractionPrompt('[Left-Click] Quarry Granite Boulder (Equip Pickaxe)');
          return;
        } else if (res.type === 'metal_scrap') {
          this.callbacks.onInteractionPrompt('[Left-Click] Salvage Vehicle Scrap (Equip Pickaxe)');
          return;
        } else if (res.type === 'berry_bush') {
          this.callbacks.onInteractionPrompt('[Left-Click] Forage Wild Berries');
          return;
        } else if (res.type === 'supply_crate') {
          this.callbacks.onInteractionPrompt('[E] Scavenge Outpost Supply Crate');
          return;
        }
      }
    }

    // Check nearby pushable/kickable dynamic physics prop
    const nearbyProp = this.dynamicPropPhysics.getNearbyPushableProp(this.player.position, 2.4);
    if (nearbyProp) {
      this.callbacks.onInteractionPrompt(`[E] Push / Kick ${nearbyProp.name} (${nearbyProp.mass} kg)`);
      return;
    }

    this.callbacks.onInteractionPrompt(null);
  }

  private getPlacementAimPoint(): THREE.Vector3 | null {
    // Project ray forward 4.5 meters in front of the player onto terrain
    const forwardX = -Math.sin(this.player.yaw) * 4.5;
    const forwardZ = -Math.cos(this.player.yaw) * 4.5;
    return new THREE.Vector3(
      this.player.position.x + forwardX,
      0,
      this.player.position.z + forwardZ
    );
  }

  private gameOverTriggered = false;

  public damagePlayer(amount: number) {
    // Reject malformed damage so NaN/undefined/stale values cannot trigger a false defeat.
    if (this.gameMode === 'creative' || !Number.isFinite(amount) || amount <= 0 || this.gameOverTriggered) return;
    const armorMult = this.playerStats.equippedArmorId === 'scrap_armor_vest' ? 0.65 : 1.0;
    const effectiveAmount = amount * armorMult;
    const maxHealth = Number.isFinite(this.playerStats.maxHealth) && this.playerStats.maxHealth > 0 ? this.playerStats.maxHealth : 100;
    const currentHealth = Number.isFinite(this.playerStats.health) ? this.playerStats.health : maxHealth;
    this.playerStats.maxHealth = maxHealth;
    this.playerStats.health = THREE.MathUtils.clamp(currentHealth - effectiveAmount, 0, maxHealth);
    soundEngine.playHurt();
    this.callbacks.onStatsChange({ ...this.playerStats });

    if (this.playerStats.health <= 0 && !this.gameOverTriggered) {
      this.gameOverTriggered = true;
      // Drop Corpse Death Bag at incapacitation spot if not permadeath
      if (!this.sandboxSettings.permadeath) {
        const invSnapshot = (this.callbacks.onGetInventory?.() || []).filter(Boolean) as InventorySlot[];
        if (invSnapshot.length > 0) {
          this.deathBagData = {
            position: [this.player.position.x, this.player.position.y, this.player.position.z],
            items: invSnapshot.slice(0, 12),
          };
          this.combatEffects.setDeathBag(this.deathBagData.position);
        }
      }
      console.warn('[GameOver] reason=player_health_depleted', { day: this.prologueManager.day, health: this.playerStats.health });
      this.callbacks.onGameOver();
    }
  }

  public addXP(amount: number) {
    this.playerStats.xp += amount;
    while (this.playerStats.xp >= this.playerStats.xpToNextLevel) {
      this.playerStats.xp -= this.playerStats.xpToNextLevel;
      this.playerStats.level += 1;
      this.playerStats.skillPoints += 1;
      this.playerStats.xpToNextLevel = Math.floor(this.playerStats.xpToNextLevel * 1.5);
    }
  }

  public updateQuestProgress(objectiveId: string, amount: number = 1) {
    this.storylineManager?.updateObjective(objectiveId, amount);

    let changed = false;
    this.quests.forEach((q) => {
      if (q.completed) return;
      q.objectives.forEach((obj) => {
        if (obj.id === objectiveId && !obj.completed) {
          obj.current = Math.min(obj.target, obj.current + amount);
          if (obj.current >= obj.target) {
            obj.completed = true;
          }
          changed = true;
        }
      });
      // Check if entire quest completed
      const allDone = q.objectives.every((o) => o.completed);
      if (allDone && !q.completed) {
        q.completed = true;
        this.addXP(q.rewards.xp);
        if (q.rewards.items) {
          q.rewards.items.forEach((rew) => {
            this.callbacks.onItemCollected(rew.itemId, rew.count);
          });
        }
      }
    });

    if (changed) {
      this.callbacks.onQuestsUpdate([...this.quests]);
    }
  }

  public enterVehicle(vehicleId?: string) {
    if (!this.vehicleManager) return;
    const res = this.vehicleManager.enterVehicle(vehicleId);
    if (!res.success) {
      if (res.reason === 'locked') {
        soundEngine.playUIClick();
        this.callbacks.onInteractionPrompt(`${res.vehicle?.state.name || 'Vehicle'} is LOCKED. Press [K] to Unlock.`);
      }
      return;
    }
    this.player.avatarGroup.visible = false;
    soundEngine.playBuildSnap();
    this.callbacks.onVehicleChange?.(this.vehicleManager.vehicleState, this.vehicleManager.currentSpeed);
  }

  public exitVehicle() {
    if (!this.vehicleManager) return;
    const vPos = [...this.vehicleManager.vehicleState.position];
    this.vehicleManager.exitVehicle();
    this.player.avatarGroup.visible = this.player.cameraView !== 'first';
    this.player.position.x = vPos[0] + 2.2;
    this.player.position.z = vPos[2];
    this.callbacks.onVehicleChange?.(null, 0);
  }

  public toggleVehicleHeadlights() {
    if (this.vehicleManager) {
      this.vehicleManager.toggleHeadlights();
      this.callbacks.onVehicleChange?.(this.vehicleManager.vehicleState, this.vehicleManager.currentSpeed);
    }
  }

  public toggleVehicleLock() {
    if (!this.vehicleManager) return;
    const isOccupied = this.vehicleManager.vehicleState.isOccupied;
    const target = isOccupied
      ? this.vehicleManager.vehicleState
      : this.vehicleManager.getNearestVehicle(this.player.position, 6.0)?.state;
    if (target) {
      const isLocked = this.vehicleManager.toggleLock(target.id);
      soundEngine.playUIClick();
      this.callbacks.onInteractionPrompt(`${target.name}: ${isLocked ? 'LOCKED [Secured]' : 'UNLOCKED [Accessible]'}`);
      this.callbacks.onVehicleChange?.(this.vehicleManager.vehicleState, this.vehicleManager.currentSpeed);
    }
  }

  public enterTrain(train: any) {
    if (this.aiTrainManager && train) {
      this.aiTrainManager.boardTrain(train);
    }
  }

  public exitPassengerTrain() {
    if (!this.aiTrainManager?.activePassengerTrain) return;
    this.aiTrainManager.exitTrain(this.player.position);
    this.player.avatarGroup.position.copy(this.player.position);
    this.player.avatarGroup.visible = this.player.cameraView !== 'first';
    this.callbacks.onTrainChange?.(null);
    this.callbacks.onInteractionPrompt('Exited train onto platform.');
  }

  public exitTrain() {
    this.exitPassengerTrain();
  }

  public fastTravelToStation(stationIdentifier: string | number, stationName?: string): void {
    if (!this.player || !this.aiTrainManager) return;
    if (this.aiTrainManager.activePassengerTrain) {
      this.exitPassengerTrain();
    }
    let targetX = 0;
    let label = stationName || 'Sanctuary Central Terminus';
    if (typeof stationIdentifier === 'number') {
      targetX = stationIdentifier;
      if (!stationName) label = `Station (KM ${(targetX / 1000).toFixed(1)})`;
    } else {
      label = stationIdentifier;
      const stationMap: Record<string, number> = {
        'Sanctuary Central Terminus': 0,
        'Highland Ridge Junction': 1200,
        'Redwood Valley Station': 2400,
        'Northern Apex Shield Post': 3600,
        'Eastern Shore Terminal': -1200,
        'Foundry District Siding': -2400,
        'Western Dunes Outpost': -3600,
        'New Haven Metro Central': -4800,
      };
      targetX = stationMap[stationIdentifier] ?? 0;
    }
    const groundY = this.aiTrainManager.trackSurfaceY(targetX, 265);
    this.player.position.set(targetX, groundY + 0.35, 265);
    this.player.velocity.set(0, 0, 0);
    this.player.avatarGroup.position.copy(this.player.position);
    soundEngine.playStationChime();
    this.callbacks.onInteractionPrompt(`Arrived at ${label}. Welcome to the station terminal.`);
  }

  public boardAssignedTrain(ticket: RailwayTicket): void {
    if (!this.player || !this.aiTrainManager) return;
    this.activeRailwayTicket = ticket;
    const targetTrain = this.aiTrainManager.trains.find((t: any) => t.trainNumber === ticket.trainNumber)
      || this.aiTrainManager.trains[0];
    if (!targetTrain) return;

    this.aiTrainManager.boardTrain(targetTrain);

    // Place player inside their booked coach tier:
    // Coach mappings: GS -> carriage 1 (+3.0), SL -> carriage 2 (-7.0), 3A -> carriage 3 (-17.0), 2A/1A -> carriage 4 (-27.0), CC/EC/LUX -> carriage 5 (-37.0)
    let coachOffsetX = 3.0;
    const coachStr = ticket.coach || '';
    if (coachStr.startsWith('S')) coachOffsetX = -7.0;
    else if (coachStr.startsWith('B')) coachOffsetX = -17.0;
    else if (coachStr.startsWith('A') || coachStr.startsWith('H')) coachOffsetX = -27.0;
    else if (coachStr.startsWith('C') || coachStr.startsWith('E') || coachStr.startsWith('LUX')) coachOffsetX = -37.0;

    this.aiTrainManager.playerLocalPos.set(coachOffsetX, 1.52, 0);
    this.callbacks.onInteractionPrompt(`Boarded ${targetTrain.trainNumber} · Coach ${ticket.coach} (${ticket.travelClass}), Seat/Berth ${ticket.berthSeat}. Explore carriages freely!`);
  }

  public navigateToStationFacility(facilityType: 'restaurant' | 'shops' | 'medical' | 'police' | 'toilets' | 'lifts' | 'escalators'): void {
    if (!this.player || !this.aiTrainManager) return;
    const stationIndex = Math.round(this.player.position.x / 1200);
    const coords = this.aiTrainManager.getFacilityCoordinates(stationIndex, facilityType);
    if (!coords) return;
    const labels: Record<string, string> = {
      restaurant: 'Jan Aahaar Multi-Cuisine Food Court',
      shops: 'A.H. Wheeler Railway Bookstall & Retail',
      medical: 'Sanctuary First-Aid Clinic',
      police: 'Railway Protection Force (RPF) Post',
      toilets: 'Executive Restroom & Washroom Block',
      lifts: 'Station Glass Elevator Bank',
      escalators: 'Motorized Escalator Concourse Steps',
    };
    const label = labels[facilityType] || 'Station Facility';
    this.objectiveNavigator.setObjective({
      id: `facility_${facilityType}`,
      title: label,
      instruction: `Follow navigation beacon to ${label}.`,
      destinationName: label,
      position: [coords.x, coords.y, coords.z],
      arrivalRadius: 3.5,
      icon: 'map_pin',
      stepDescription: `Approach ${label} at the station concourse.`,
    });
    soundEngine.playUIClick();
    this.callbacks.onInteractionPrompt(`Navigating to ${label} · Follow waypoint marker`);
  }

  public fastTravelToFloor(floor: 0 | 1 | 2 | 3 | 4): void {
    if (!this.player || !this.aiTrainManager) return;
    const stationIndex = Math.round(this.player.position.x / 1200);
    const stationX = stationIndex * 1200;
    const hallZ = 265;
    const baseY = this.aiTrainManager.trackSurfaceY(stationX, hallZ) - 0.37;
    let targetX = stationX;
    let targetY = baseY + 0.27;
    let targetZ = hallZ + 18;
    let floorName = 'Level 0: Main Entrance & Concourse';
    if (floor === 0) {
      targetX = stationX;
      targetY = baseY + 0.27;
      targetZ = hallZ + 18;
      floorName = 'Level 0: Main Entrance & Grand Concourse';
    } else if (floor === 1) {
      targetX = stationX - 28;
      targetY = baseY + 4.70;
      targetZ = hallZ - 4;
      floorName = 'Level 1: IRCTC Food Court & AC Waiting Lounge';
    } else if (floor === 2) {
      targetX = stationX + 28;
      targetY = baseY + 4.70;
      targetZ = hallZ + 4;
      floorName = 'Level 2: Retail Bazaar & Executive Terrace';
    } else if (floor === 3) {
      targetX = stationX - 52;
      targetY = baseY + 9.80;
      targetZ = hallZ;
      floorName = 'Level 3: Dual Skywalks & Over-Track Air Concourse';
    } else if (floor === 4) {
      targetX = stationX + 12;
      targetY = baseY + 14.50;
      targetZ = hallZ + 6;
      floorName = 'Level 4: Rooftop Helipad & Solar Sanctuary Array';
    }
    this.player.position.set(targetX, targetY, targetZ);
    this.player.velocity.set(0, 0, 0);
    this.player.avatarGroup.position.copy(this.player.position);
    soundEngine.playStationChime();
    this.callbacks.onInteractionPrompt(`Arrived at ${floorName}.`);
  }

  public throttleTrainUp() {
    if (this.aiTrainManager?.activePassengerTrain) {
      const train = this.aiTrainManager.activePassengerTrain;
      train.throttle = Math.min(1.0, train.throttle + 0.2);
    }
  }

  public throttleTrainDown() {
    if (this.aiTrainManager?.activePassengerTrain) {
      const train = this.aiTrainManager.activePassengerTrain;
      train.throttle = Math.max(-0.6, train.throttle - 0.25);
    }
  }

  public toggleTrainReverse() {
    if (this.aiTrainManager?.activePassengerTrain) {
      const train = this.aiTrainManager.activePassengerTrain;
      train.direction = (train.direction * -1) as (1 | -1);
      soundEngine.playSwitchClick();
    }
  }

  public honkTrainHorn() {
    this.aiTrainManager?.honkHorn();
  }

  public toggleTrainHeadlights() {
    this.aiTrainManager?.toggleHeadlights();
  }

  public toggleTrainDoors() {
    this.aiTrainManager?.toggleDoors();
  }

  public toggleTrainCamera() {
    this.aiTrainManager?.cycleCameraMode();
  }

  public toggleTrainDrive() {
    this.aiTrainManager?.toggleDriverSeat();
  }

  public toggleTrainSit() {
    this.aiTrainManager?.toggleSitOnSeat();
  }

  public hasPerk(perkId: string): boolean {
    return Boolean(this.playerStats.perkUnlocks?.includes(perkId));
  }

  public unlockTalentPerk(perkId: string, cost: number): boolean {
    if (this.hasPerk(perkId)) return false;
    if (this.playerStats.skillPoints < cost) return false;
    this.playerStats.skillPoints -= cost;
    this.playerStats.perkUnlocks = [...(this.playerStats.perkUnlocks || []), perkId];
    soundEngine.playDawnVictoryChime();
    this.callbacks.onStatsChange({ ...this.playerStats });
    return true;
  }

  public setSandboxSettings(settings: Partial<SandboxSettings>) {
    this.sandboxSettings = { ...this.sandboxSettings, ...settings };
    this.weatherManager.setIntensityMultiplier(this.sandboxSettings.weatherIntensity);
  }

  public applyWeaponMod(weaponId: string, modId: WeaponModId): boolean {
    const existing = this.weaponMods[weaponId] || [];
    if (existing.includes(modId)) return false;
    this.weaponMods[weaponId] = [...existing, modId];
    soundEngine.playBuildSnap();
    this.callbacks.onInteractionPrompt(`Installed ${modId.replace('_mod', '').replace('_', ' ')} on ${weaponId}!`);
    return true;
  }

  public throwTacticalItem(kind: 'molotov_cocktail' | 'noise_flare' | 'pipe_bomb') {
    const dir = GameEngine._camDir;
    this.camera.getWorldDirection(dir);
    const dist = 10.5;
    const lx = this.player.position.x + dir.x * dist;
    const lz = this.player.position.z + dir.z * dist;
    const ly = getTerrainHeight(lx, lz, this.terrain.seed);
    this.combatEffects.spawnThrowableEffect(kind, new THREE.Vector3(lx, ly, lz));
  }

  public attemptFishing() {
    const terrainY = getTerrainHeight(this.player.position.x, this.player.position.z, this.terrain.seed);
    const riverX = 50 + Math.sin(this.player.position.z * 0.004) * 45;
    const distToRiver = Math.abs(this.player.position.x - riverX);
    if (terrainY < 1.2 || distToRiver < 28 || this.player.isSwimming) {
      soundEngine.playFishingSplash();
      this.callbacks.onOpenFishingModal?.();
    } else {
      this.callbacks.onInteractionPrompt('Move closer to the river or shoreline water to cast your line.');
    }
  }

  public honkActiveVehicleHorn() {
    if (this.vehicleManager.vehicleState.isOccupied) {
      soundEngine.playVehicleHorn();
    }
  }

  public triggerRebirthNGPlus() {
    this.playerStats.rebirthCount = (this.playerStats.rebirthCount || 0) + 1;
    this.dayCount = 1;
    this.gameTimeMinutes = 480;
    this.playerStats.health = this.playerStats.maxHealth;
    this.playerStats.hunger = 100;
    this.playerStats.thirst = 100;
    this.playerStats.infection = 0;
    this.playerStats.radiationExposure = 0;
    this.worldEventsManager.resetExtractionState();
    this.zombieMgr.clearAllZombies();
    this.player.position.set(-29.8, 0.25, 41.8);
    this.callbacks.onStatsChange({ ...this.playerStats });
    this.callbacks.onInteractionPrompt(`REBIRTH NG+ CYCLE ${this.playerStats.rebirthCount} STARTED — Threats stronger, loot & perks retained!`);
  }

  private spawnWorldDamageNumber(worldPos: THREE.Vector3, amount: number, isHeadshot?: boolean, isStealth?: boolean) {
    const projected = worldPos.clone().project(this.camera);
    if (projected.z > 1) return;
    const screenX = Math.max(10, Math.min(90, (projected.x * 0.5 + 0.5) * 100));
    const screenY = Math.max(12, Math.min(82, (-projected.y * 0.5 + 0.5) * 100));
    this.callbacks.onHitEvent?.({ amount, isHeadshot, isStealth, screenX, screenY });
  }

  private handleZombieKilledEffects(
    zombieId: string,
    xp: number,
    isHeadshot: boolean,
    isStealth: boolean,
    isTurret?: boolean
  ) {
    const z = this.zombieMgr.zombies.find((item) => item.id === zombieId);
    const ks = this.playerStats.killStats || { total: 0, headshots: 0, bosses: 0, stealth: 0 };
    ks.total += 1;
    if (isHeadshot) ks.headshots += 1;
    if (isStealth) ks.stealth += 1;
    if (z?.isBoss) ks.bosses += 1;
    this.playerStats.killStats = ks;

    this.addXP(xp);
    this.callbacks.onCareerEvent?.({ type: 'zombie_killed', count: 1 });
    this.callbacks.onBountyProgress?.('kill_any', 1);
    if (isHeadshot) this.callbacks.onBountyProgress?.('kill_headshot', 1);
    if (z?.type === 'brute' || z?.type === 'juggernaut') this.callbacks.onBountyProgress?.('kill_brute', 1);
    if (z?.isBoss) {
      this.callbacks.onBountyProgress?.('kill_boss', 1);
      this.callbacks.onItemCollected('boss_core', 1);
      this.callbacks.onItemCollected('electronic_parts', 6);
      this.callbacks.onItemCollected('antibiotic_shot', 1);
      this.callbacks.onInteractionPrompt('ALPHA MUTANT DEFEATED! Collected Alpha Bio-Core!');
    } else if (!isTurret) {
      this.callbacks.onItemCollected('cloth_fabric', 2);
      if (Math.random() > 0.5) this.callbacks.onItemCollected('nails_bolts', 2);
      if (Math.random() > 0.72) this.callbacks.onItemCollected('raw_meat', 1);
    }
  }

  public getBaseState(): BaseState {
    return {
      level: this.baseLevel,
      power: { ...this.powerManager.state },
      water: { ...this.waterManager.state },
      food: { ...this.foodManager.state },
      security: {
        ...this.securityManager.state,
        cctvChannels: this.securityManager.state.cctvChannels.map((c) => ({ ...c })),
      },
      npcs: this.npcSettlementManager.npcs.map((n) => ({ ...n })),
      research: this.researchManager.technologies.map((t) => ({ ...t })),
      vehicle: { ...this.vehicleManager.vehicleState },
      overallHealth: 100,
    };
  }

  public toggleBaseGenerator(): void {
    const running = this.powerManager.toggleGenerator();
    this.callbacks.onInteractionPrompt(
      running
        ? 'Backup Diesel Generator: STARTED (+22 kW Output)'
        : this.powerManager.state.generatorFuel <= 0
        ? 'Backup Diesel Generator: OUT OF FUEL'
        : 'Backup Diesel Generator: STANDBY'
    );
  }

  public toggleBaseGateLock(): void {
    const locked = this.securityManager.toggleGateLock();
    const apt = this.prologueManager?.townMgr?.apartmentBuilding;
    if (apt && apt.compoundGateOpen && locked) {
      apt.toggleCompoundGate();
    }
    this.callbacks.onInteractionPrompt(
      locked ? 'Perimeter Sanctuary Gate: LOCKED' : 'Perimeter Sanctuary Gate: UNLOCKED'
    );
  }

  public toggleBaseAlarm(): void {
    const armed = this.securityManager.toggleAlarmArm();
    this.callbacks.onInteractionPrompt(armed ? 'Perimeter Defense Alarm: ARMED' : 'Perimeter Defense Alarm: DISARMED');
  }

  public assignBaseNpcRole(npcId: string, role: NPCRole): void {
    this.npcSettlementManager.assignRole(npcId, role);
    this.callbacks.onInteractionPrompt(`Reassigned settlement survivor to ${role.toUpperCase()} duty.`);
  }

  public unlockBaseResearch(techId: string): void {
    if (this.researchManager.unlockTech(techId)) {
      if (techId === 'uv_water_filtration') {
        this.waterManager.state.purificationRate *= 2;
      } else if (techId === 'ev_overclocking') {
        this.powerManager.state.batteryCapacityKwh += 40;
      }
      this.addXP(75);
      this.callbacks.onInteractionPrompt('Research Blueprint Unlocked! +75 XP');
    }
  }

  public upgradeBaseLevel(): void {
    if (this.baseLevel >= 4) return;
    this.baseLevel = (this.baseLevel + 1) as BaseLevel;
    this.powerManager.state.batteryCapacityKwh += this.baseLevel === 3 ? 50 : 100;
    this.waterManager.state.maxCapacityLiters += this.baseLevel === 3 ? 400 : 800;
    this.addXP(200);
    this.callbacks.onInteractionPrompt(`Sanctuary Upgraded to Level ${this.baseLevel} Estate! +200 XP`);
  }

  public drawBaseCleanWater(): void {
    if (this.waterManager.drawCleanWater(1)) {
      this.callbacks.onItemCollected('clean_water', 1);
      this.callbacks.onInteractionPrompt('Bottled 1 Purified Water Canteen from Sanctuary Filtration!');
    } else {
      this.callbacks.onInteractionPrompt('Purified water reserves empty — wait for filtration cycle.');
    }
  }

  public withdrawBaseRation(): void {
    if (this.foodManager.withdrawRation()) {
      this.callbacks.onItemCollected('canned_beans', 1);
      this.callbacks.onInteractionPrompt('Withdrew 1 Survival Ration from Cold Storage.');
    } else {
      this.callbacks.onInteractionPrompt('Cold storage food rations depleted.');
    }
  }

  public teleportToGeoCoordinate(lat: number, lon: number, label?: string): void {
    const targetLat = Math.max(-85, Math.min(85, lat));
    const targetLon = normalizeLon(lon);
    const sample = RealEarthDataset.sampleEarthGeography(targetLat, targetLon);

    // Anchor earthOrigin slightly SW so local [420, 420] maps strictly to [targetLat, targetLon]
    // cleanly outside Oakridge starter meshes (0,0) and Railway (z=134..226).
    const landingX = 420;
    const landingZ = 420;
    const originLat = targetLat + landingZ / METERS_PER_DEG_LAT;
    const cosLat = Math.max(0.12, Math.cos((targetLat * Math.PI) / 180));
    const originLon = normalizeLon(targetLon - landingX / (METERS_PER_DEG_LAT * cosLat));

    this.earthOrigin = {
      id: `atlas_${targetLat.toFixed(2)}_${targetLon.toFixed(2)}`,
      name: label || sample.regionLabel || 'Expedition Sector',
      country: sample.country,
      continent: sample.continent ?? sample.ocean ?? 'Earth',
      lat: originLat,
      lon: originLon,
    };
    WorldCoordinates.setWorldOrigin(this.earthOrigin);

    this.chunkManager.clearLoadedChunks();
    this.globalOutbreakSimulator.clearLocalPedestrians();
    this.zombieMgr.clearAllZombies();

    const groundY = Math.max(0.3, getTerrainHeight(landingX, landingZ, this.terrain.seed));
    this.player.position.set(landingX, groundY, landingZ);
    this.player.velocity.set(0, 0, 0);
    this.player.avatarGroup.position.set(landingX, groundY, landingZ);
    this.chunkManager.updatePlayerPosition(this.player.position, true);

    const actualGeo = WorldCoordinates.worldToLatLon(landingX, landingZ);
    this.playerStats.latitude = actualGeo.lat;
    this.playerStats.longitude = actualGeo.lon;
    this.playerStats.realElevationMeters = Math.round(sample.realElevationMeters);
    this.playerStats.countryName = sample.country;
    this.playerStats.continentOrOcean = sample.continent ?? sample.ocean ?? 'Earth';
    this.playerStats.nearestCityName = RealWorldCities.findNearestCity(actualGeo.lat, actualGeo.lon, 250)?.city.name;
    this.playerStats.geoTileKey = WorldCoordinates.worldToGeoTile(landingX, landingZ, 14).key;
    this.callbacks.onStatsChange({ ...this.playerStats });
    this.callbacks.onInteractionPrompt(
      `Deployed to ${label || sample.country} (${EarthProjection.formatLatLon(actualGeo.lat, actualGeo.lon)})`
    );
  }

  public captureScreenshotDataUrl(): string | null {
    try {
      this.updateLocalLightBudget(true);
      if (this.usePostProcessing && this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
      return this.renderer.domElement.toDataURL('image/png');
    } catch (err) {
      console.warn('Screenshot capture failed:', err);
      return null;
    }
  }

  public triggerAutoSave(slotId?: string, slotName?: string) {
    const isStory = this.gameMode === 'story';
    const storyData = isStory ? this.storylineManager?.exportCheckpoint() : undefined;
    const effectiveDay = isStory && storyData ? storyData.campaignDay : this.dayCount;
    const formattedTime = `${Math.floor(this.gameTimeMinutes / 60).toString().padStart(2, '0')}:${Math.floor(this.gameTimeMinutes % 60).toString().padStart(2, '0')}`;

    const liveInv = this.callbacks.onGetInventory?.() || [];
    const liveHotbar = this.callbacks.onGetHotbar?.() || [];
    const liveIndex = this.callbacks.onGetSelectedHotbarIndex?.() ?? 0;
    const liveBounties = this.callbacks.onGetBounties?.() ?? [];

    const buildSaveForSlot = (targetId: string, targetName: string): FullGameSave => {
      const meta: SaveSlotMetadata = {
        id: targetId,
        name: targetName,
        characterName: this.characterName || 'Survivor',
        dayCount: effectiveDay,
        timeString: formattedTime,
        timestamp: Date.now(),
        difficulty: this.difficulty,
        gameMode: this.gameMode,
        campaignDay: isStory && storyData ? storyData.campaignDay : this.dayCount,
        missionNumber: isStory && storyData ? storyData.missionNumber : undefined,
        missionTitle: isStory && storyData ? storyData.missionTitle : undefined,
        checkpointId: isStory && storyData ? storyData.checkpointId : undefined,
        progressPercent: isStory && storyData ? storyData.progressPercent : undefined,
        isFreeExploration: isStory && storyData ? storyData.isFreeExplorationUnlocked : false,
      };

      return {
        saveVersion: 2,
        earthOrigin: { ...this.earthOrigin },
        globalOutbreakState: this.globalOutbreakSimulator.exportSaveData(),
        metadata: meta,
        worldSeed: this.terrain.seed,
        playerPosition: [this.player.position.x, this.player.position.y, this.player.position.z],
        playerRotation: this.player.yaw,
        playerStats: { ...this.playerStats },
        inventory: [...liveInv],
        hotbar: [...liveHotbar],
        selectedHotbarIndex: liveIndex,
        structures: [...this.buildingMgr.structures],
        quests: [...this.quests],
        gameTimeMinutes: this.gameTimeMinutes,
        dayCount: effectiveDay,
        lastSleptDay: this.lastSleptDay,
        nightHordeCountDefeated: this.nightHordesDefeated,
        ...this.worldPersistence.exportSaveData(),
        rescuedSurvivorIds: this.rescueManager.exportRescued(),
        baseState: this.getBaseState(),
        tamedCompanion: this.wildlifeManager.companionState,
        prologueState: this.prologueManager?.exportSaveData(),
        storyCheckpoint: storyData,
        unlockedFacilities: storyData?.unlockedFacilities,
        weatherType: this.lastReportedWeather,
        bounties: liveBounties,
        sandboxSettings: this.sandboxSettings,
        deathBag: this.deathBagData,
        weaponMods: this.weaponMods,
        rebirthCount: this.playerStats.rebirthCount,
        trainSaveState: this.aiTrainManager?.getTrainSaveState(),
        railwayNPCSaveState: this.aiTrainManager?.npcManager.getSaveState(),
        activeRailwayTicket: this.activeRailwayTicket,
      };
    };

    if (slotId) {
      const resolvedName =
        slotName || (slotId === 'autosave' ? 'Autosave Slot' : slotId.replace(/_/g, ' ').toUpperCase());
      if (slotId !== 'autosave') {
        this.activeSaveSlotId = slotId;
        this.activeSaveSlotName = resolvedName;
      }
      const saveData = buildSaveForSlot(slotId, resolvedName);
      void this.enqueueCheckpointSave(saveData).then(() => {
        this.callbacks.onCareerEvent?.({ type: 'save_created', count: 1 });
        this.callbacks.onAutoSaved?.({ slotId, timestamp: saveData.metadata.timestamp, dayCount: effectiveDay, timeString: formattedTime });
      }).catch((error: unknown) => console.error('Manual checkpoint failed:', error));
      return;
    }

    // Automatic / Checkpoint Save: always update 'autosave' AND conserve progress in the active slot if loaded/saved
    const autoSaveData = buildSaveForSlot('autosave', 'Autosave Slot');
    void this.enqueueCheckpointSave(autoSaveData).then(() => {
      this.callbacks.onCareerEvent?.({ type: 'save_created', count: 1 });
      this.callbacks.onAutoSaved?.({ slotId: this.activeSaveSlotId || 'autosave', timestamp: autoSaveData.metadata.timestamp, dayCount: effectiveDay, timeString: formattedTime });
    }).catch((error: unknown) => console.error('Autosave failed:', error));
    if (this.activeSaveSlotId && this.activeSaveSlotId !== 'autosave') {
      const activeSaveData = buildSaveForSlot(
        this.activeSaveSlotId,
        this.activeSaveSlotName || this.activeSaveSlotId.replace(/_/g, ' ').toUpperCase()
      );
      void this.enqueueCheckpointSave(activeSaveData).catch((error: unknown) => console.error('Active-slot checkpoint failed:', error));
    }
  }

  public dispose() {
    this.isRunning = false;
    this.graphicsManager?.cancelScheduledFrame();
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.renderer.domElement.removeEventListener('pointerdown', this.onPassengerPointerDown);
    this.renderer.domElement.removeEventListener('pointermove', this.onPassengerPointerMove);
    this.renderer.domElement.removeEventListener('pointerup', this.onPassengerPointerUp);
    this.renderer.domElement.removeEventListener('pointercancel', this.onPassengerPointerUp);
    try {
      this.prologueManager?.dispose();
    } catch (e) {
      console.warn('Error disposing prologue manager:', e);
    }
    this.chunkManager.dispose();
    this.wildlifeManager.dispose();
    this.rescueManager.dispose();
    this.npcSettlementManager.dispose();
    if (this.vehicleManager) this.vehicleManager.dispose();
    this.terrain.dispose();
    this.buildingMgr.dispose();
    this.dynamicPropPhysics.dispose();
    this.zombieMgr.dispose();
    this.objectiveNavigator.dispose();
    this.soundscapeManager.dispose();
    this.weatherManager?.dispose();
    this.combatEffects?.dispose();
    this.worldEventsManager?.dispose();
    this.aiTrainManager?.dispose();
    this.globalOutbreakSimulator?.dispose();
    try {
      this.atmosphericSky?.dispose();
    } catch {}
    try {
      this.envTexture?.dispose();
      this.pmremGenerator?.dispose();
    } catch {}
    try {
      (this.cinematicPass as any)?.dispose?.();
      this.bloomPass?.dispose();
      this.composer?.dispose();
    } catch {}
    if (this.renderer) {
      try {
        const gl = this.renderer.getContext();
        const loseExt = gl?.getExtension('WEBGL_lose_context');
        if (loseExt) loseExt.loseContext();
      } catch {}
      this.renderer.dispose();
      if (this.container && this.renderer.domElement && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }
  }
}
