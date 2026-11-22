import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { WorldTerrain, getTerrainHeight } from './Terrain';
import { BuildingManager } from './BuildingManager';
import { ZombieManager } from './ZombieManager';
import { PlayerController } from './PlayerController';
import { soundEngine } from '../utils/audio';
import { HarvestableResource, PlacedStructure, PlayerStats, Quest, SaveSlotMetadata, FullGameSave, GameMode, Difficulty, ItemDefinition, VehicleState, CompanionState, EcosystemDossier, EcosystemMetrics } from '../types/game';
import { ITEMS } from '../data/items';
import { saveGameToSlot } from '../utils/storage';
import { ChunkManager } from './world/ChunkManager';
import { WorldPersistence } from './world/WorldPersistence';
import { WildlifeManager } from './WildlifeManager';
import { SurvivorRescueManager, SurvivorDialogue } from './SurvivorRescueManager';
import { NPCSettlementManager } from './base/NPCSettlementManager';
import { VehicleParkingManager } from './base/VehicleParkingManager';
import { PrologueManager } from './prologue/PrologueManager';
import { ProloguePhase, PrologueSubtitle, PrologueSaveData } from '../types/prologue';
import { UnifiedPhysicsManager } from './physics/UnifiedPhysicsManager';
import { DynamicPropPhysicsManager } from './physics/DynamicPropPhysicsManager';
import { ObjectiveNavigator } from './navigation/ObjectiveNavigator';
import { ObjectiveNavigationState } from '../types/physics';
import { ContextSoundscapeManager } from './audio/ContextSoundscapeManager';
import { AITrainManager } from './world/AITrainManager';
import { AtmosphericSky } from './rendering/AtmosphericSky';

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
  onOpenMedicalClinic?: () => void;
  onOpenApartmentStatus?: () => void;
  onTrainChange?: (hudData: any | null) => void;
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
  public prologueManager: PrologueManager;
  public physicsManager: UnifiedPhysicsManager;
  public dynamicPropPhysics: DynamicPropPhysicsManager;
  public objectiveNavigator: ObjectiveNavigator;
  public soundscapeManager: ContextSoundscapeManager;
  public aiTrainManager: AITrainManager;
  public atmosphericSky: AtmosphericSky;

  // Environment & Lights
  private dirLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private pmremGenerator: THREE.PMREMGenerator;

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
  public quests: Quest[];
  public activeSlotItem: ItemDefinition | null = null;
  public gameMode: GameMode = 'survival';
  public difficulty: Difficulty = 'standard';

  // Game Loop Controls
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private frameId: number = 0;
  private clock: THREE.Timer;
  private localLightBudgetTimer: number = 0;
  private localLights: Array<THREE.PointLight | THREE.SpotLight> = [];
  private readonly maxActiveLocalLights: number = 4;
  public callbacks: GameEngineCallbacks;
  private autoSaveTimer: number = 0;
  private scannerTimer: number = 0;
  private static readonly _camDir = new THREE.Vector3();

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
    customSeed: number = 42
  ) {
    this.container = container;
    this.callbacks = callbacks;
    this.clock = new THREE.Timer();

    // 1. Initialize Three.js WebGLRenderer safely
    let glRenderer: THREE.WebGLRenderer;
    try {
      glRenderer = new THREE.WebGLRenderer({
        antialias: false,
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

    // Listen for WebGL context loss and prevent default browser page block
    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context loss prevented from blocking application');
    }, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored');
      this.onResize();
    }, false);

    // Detect mobile and software rendering
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.innerWidth <= 840);
    try {
      const gl = this.renderer.getContext();
      const ext = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : (gl ? gl.RENDERER : null);
      const gpu = param ? String(gl.getParameter(param) || '') : '';
      this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      this.isSoftwareGl = false;
    }

    const width = Math.max(container.clientWidth || window.innerWidth, 320);
    const height = Math.max(container.clientHeight || window.innerHeight, 240);
    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;

    // Cap pixel ratio: 1.0 on mobile to prevent GPU fillrate choking and context loss; max 1.25 on desktop
    this.renderer.setPixelRatio(
      isMobile || this.isSoftwareGl ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25)
    );
    // Three.js r187 removed PCFSoftShadowMap. PCFShadowMap is the supported PCF mode.
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.appendChild(this.renderer.domElement);

    // 3. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb); // daytime sky blue
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0075);

    this.camera = new THREE.PerspectiveCamera(
      70,
      container.clientWidth / container.clientHeight,
      0.1,
      450
    );

    // 4. Studio Environment Reflection (Dispose PMREMGenerator immediately to free render targets)
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const envTexture = this.pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTexture;
    this.pmremGenerator.dispose();

    // 5. Lighting Rig (High-fidelity directional shadow bounds, bias, and ambient bounce)
    this.hemiLight = new THREE.HemisphereLight(0x89c2f8, 0x3a4b32, 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaee, 2.4);
    this.dirLight.position.set(60, 90, 40);
    this.dirLight.castShadow = !this.isSoftwareGl;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 240;
    const d = 42;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.035;
    this.scene.add(this.dirLight);
    this.scene.add(this.dirLight.target);

    // 5b. Atmospheric Skydome & Celestial Spheres
    this.atmosphericSky = new AtmosphericSky(this.scene, this.dirLight);

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
    this.aiTrainManager = new AITrainManager(this.scene, seed);
    if (initialSave) this.rescueManager.importRescued(initialSave.rescuedSurvivorIds);
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
    const prologueInitData: PrologueSaveData | undefined = initialSave?.prologueState || (initialSave ? {
      phase: 'completed',
      isCompleted: true,
      day: initialSave.dayCount,
      craterFormed: true,
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
      this.quests = initialSave.quests;
      this.player.position.set(...initialSave.playerPosition);
      this.player.yaw = initialSave.playerRotation;
      if (initialSave.structures && initialSave.structures.length > 0) {
        this.buildingMgr.loadSavedStructures(initialSave.structures);
      } else {
        this.buildingMgr.initStarterBase(954, 22);
      }
      this.dynamicPropPhysics.initCompoundProps(954, 22);
      this.gameMode = initialSave.metadata.gameMode;
      this.difficulty = initialSave.metadata.difficulty;
    } else {
      // New Game: Start in Day 1 Peaceful Town Life
      this.buildingMgr.initStarterBase(954, 22);
      this.dynamicPropPhysics.initCompoundProps(954, 22);
      // The game begins with the player sleeping in bed on Floor 1 bedroom (-31.5, 0.65, 41.8)
      this.player.position.set(-31.5, 0.65, 41.8);
      this.player.avatarGroup.position.set(-31.5, 0.65, 41.8);
      this.player.yaw = Math.PI / 2;
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

    // Attach resize & visibility listeners
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);

    // Initialize graphics quality mode from stored preference
    try {
      const savedPreset = localStorage.getItem('last_sanctuary_quality_preset') as ('auto' | 'performance' | 'balanced' | 'quality') | null;
      if (savedPreset) {
        this.setQualityMode(savedPreset);
      }
    } catch {}

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

  public onResize = () => {
    if (!this.container) return;
    const w = Math.max(this.container.clientWidth || window.innerWidth, 320);
    const h = Math.max(this.container.clientHeight || window.innerHeight, 240);
    if (w === this.lastWidth && h === this.lastHeight) return;
    this.lastWidth = w;
    this.lastHeight = h;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  public setQualityMode(mode: 'auto' | 'performance' | 'balanced' | 'quality') {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (window.innerWidth <= 840);
    const actual = mode === 'auto' ? (isMobile || this.isSoftwareGl ? 'performance' : 'balanced') : mode;

    if (actual === 'performance') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
      if (this.dirLight) this.dirLight.castShadow = false;
    } else if (actual === 'balanced') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      this.renderer.shadowMap.enabled = !this.isSoftwareGl;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.dirLight) {
        this.dirLight.castShadow = !this.isSoftwareGl;
        this.dirLight.shadow.mapSize.set(1024, 1024);
      }
    } else if (actual === 'quality') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      // Use the supported PCF shadow mode on current Three.js versions.
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      if (this.dirLight) {
        this.dirLight.castShadow = true;
        this.dirLight.shadow.mapSize.set(2048, 2048);
      }
    }
  }

  public getDiagnosticInfo() {
    const renderInfo = this.renderer.info.render;
    return {
      drawCalls: renderInfo.calls,
      triangles: renderInfo.triangles,
      entities: (this.wildlifeManager?.metrics?.totalOrganisms || 0) + (this.zombieMgr?.zombies.length || 0),
      dpr: this.renderer.getPixelRatio(),
      activeLocalLights: this.localLights.filter((light) => light.visible).length,
    };
  }

  private startLoop() {
    const tick = (timestamp?: number) => {
      if (!this.isRunning) return;

      // When tab is hidden, yield CPU
      if (document.hidden) {
        this.frameId = window.setTimeout(tick, 200);
        return;
      }

      if (!this.isPaused) {
        // Strict bounded timestep (max 0.05s = 50ms) prevents physics tunneling / simulation death
        this.clock.update(timestamp ?? performance.now());
        const delta = Math.min(0.05, this.clock.getDelta());
        this.update(delta);
      }

      this.updateLocalLightBudget();
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        // Pace loop on software WebGL to avoid starving main thread
        this.frameId = window.setTimeout(tick, 80);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 80);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  /**
   * Keep the number of simultaneously compiled point/spot lights bounded.
   * Three.js adds every visible local light to MeshStandardMaterial shaders;
   * large streamed scenes can otherwise exceed low-end GPU uniform limits.
   * Decorative lights remain in the world and are enabled when near the camera.
   */
  private updateLocalLightBudget() {
    this.localLightBudgetTimer += 1 / 60;
    if (this.localLightBudgetTimer < 0.5 && this.localLights.length) return;
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
    const lightPositionA = new THREE.Vector3();
    const lightPositionB = new THREE.Vector3();
    discovered.sort((a, b) => {
      const da = a.getWorldPosition(lightPositionA).distanceToSquared(GameEngine._camDir);
      const db = b.getWorldPosition(lightPositionB).distanceToSquared(GameEngine._camDir);
      return da - db;
    });

    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.innerWidth <= 840;
    const limit = mobile || this.isSoftwareGl ? 3 : this.maxActiveLocalLights;
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
  private update(delta: number) {
    // 1. Advance Game Time (1 real sec = 2 game mins)
    this.gameTimeMinutes += delta * 2.0;
    if (this.gameTimeMinutes >= 1440) {
      this.gameTimeMinutes -= 1440;
      this.dayCount += 1;
    }

    const hour = this.gameTimeMinutes / 60;
    this.isNight = hour >= 21.0 || hour < 5.0;
    this.isDusk = hour >= 18.0 && hour < 21.0;

    // Trigger context-aware continuous diurnal & nocturnal environmental soundscape
    const currentBiomeId = this.chunkManager.getCurrentBiome(this.player.position.x, this.player.position.z).id;
    this.soundscapeManager.update(delta, this.gameTimeMinutes, this.player.position, this.player.yaw, currentBiomeId);
    this.aiTrainManager.update(delta, this.player.position);

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
      soundEngine.playDawnVictoryChime();
      this.callbacks.onHordeEvent('dawn_victory');
      this.addXP(150);
      this.updateQuestProgress('survive_night', 1);
      this.updateQuestProgress('survive_hordes', 1);
    }

    // Update Celestial Lighting & Atmospheric Scattering Sky
    const isBloodMoon = this.isNight && (this.dayCount % 7 === 0 || this.dayCount === 1);
    if (this.atmosphericSky) {
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

    // Animate realistic river water flow ripples
    if (this.terrain?.waterMesh?.material) {
      const wMat = this.terrain.waterMesh.material as THREE.MeshStandardMaterial;
      if (wMat.normalMap) {
        wMat.normalMap.offset.x = (wMat.normalMap.offset.x + delta * 0.025) % 1;
        wMat.normalMap.offset.y = (wMat.normalMap.offset.y + delta * 0.012) % 1;
      }
    }

    // 2. Player, Train or Vehicle Movement & Physics
    if (this.aiTrainManager && this.aiTrainManager.activePassengerTrain) {
      // Passenger exploration mode: walk the full three-car consist and remain attached to it.
      const train = this.aiTrainManager.activePassengerTrain;
      const seatedPosition = this.aiTrainManager.getPassengerSeatWorldPosition();
      if (seatedPosition) {
        this.player.position.copy(seatedPosition);
      } else {
        const direction = train.direction;
        const localX = THREE.MathUtils.clamp((this.player.position.x - train.x) * direction, -65.5, 13.0);
        const localZ = THREE.MathUtils.clamp((this.player.position.z - train.z) * direction, -1.1, 1.1);
        const walkSpeed = 2.8 * delta;
        const nextLocalX = THREE.MathUtils.clamp(localX + ((this.inputState.forward ? 1 : 0) - (this.inputState.backward ? 1 : 0)) * walkSpeed, -65.5, 13.0);
        const nextLocalZ = THREE.MathUtils.clamp(localZ + ((this.inputState.right ? 1 : 0) - (this.inputState.left ? 1 : 0)) * walkSpeed, -1.1, 1.1);
        this.player.position.set(train.x + direction * nextLocalX, train.group.position.y + 1.55, train.z + direction * nextLocalZ);
      }
      this.player.avatarGroup.visible = false;
      // Drag anywhere on the game view to orbit a full 360 degrees around the passenger.
      const cameraDistance = seatedPosition ? 3.1 : 4.8;
      const horizontal = Math.cos(this.passengerCameraPitch) * cameraDistance;
      this.camera.position.set(
        this.player.position.x - Math.sin(this.passengerCameraYaw) * horizontal,
        this.player.position.y + 1.15 + Math.sin(this.passengerCameraPitch) * cameraDistance,
        this.player.position.z - Math.cos(this.passengerCameraYaw) * horizontal
      );
      this.camera.lookAt(this.player.position.x, this.player.position.y + 1.0, this.player.position.z);
      this.callbacks.onTrainChange?.(this.aiTrainManager.getTrainHUDData());
      this.callbacks.onVehicleChange?.(null, 0);
    } else if (this.aiTrainManager && this.aiTrainManager.activeDrivableTrain) {
      // 2A. Legacy locomotive driving branch (disabled while all six trains are AI-operated)
      const train = this.aiTrainManager.activeDrivableTrain;
      this.aiTrainManager.updateTrainControls(this.inputState);

      // Sync player position to locomotive driver cabin
      const fwd = train.direction;
      this.player.position.set(train.x, train.group.position.y + 3.2, train.z);
      this.player.yaw = fwd === 1 ? 0 : Math.PI;
      this.player.avatarGroup.visible = false;

      if (train.cabCameraActive) {
        // First-person cab driver viewpoint looking out front window
        this.camera.position.set(train.x + fwd * 12.2, train.group.position.y + 3.85, train.z);
        this.camera.lookAt(train.x + fwd * 80.0, train.group.position.y + 3.6, train.z);
      } else {
        // Third-person locomotive chase camera
        const camX = train.x - fwd * 24.0;
        const camY = train.group.position.y + 7.8;
        const camZ = train.z;
        this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, camX, 12, delta);
        this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, camY, 12, delta);
        this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, camZ, 12, delta);
        this.camera.lookAt(train.x + fwd * 8.0, train.group.position.y + 2.8, train.z);
      }

      this.callbacks.onTrainChange?.(this.aiTrainManager.getTrainHUDData());
      this.callbacks.onVehicleChange?.(null, 0);
    } else if (this.vehicleManager && this.vehicleManager.vehicleState.isOccupied) {
      this.callbacks.onTrainChange?.(null);
      // Vehicle driving mode
      this.vehicleManager.update(delta, this.inputState, this.terrain.seed);

      // Sync player position to driver seat
      this.player.position.set(
        this.vehicleManager.vehicleState.position[0],
        this.vehicleManager.vehicleState.position[1],
        this.vehicleManager.vehicleState.position[2]
      );
      this.player.yaw = this.vehicleManager.vehicleState.rotationY;
      this.player.avatarGroup.visible = false;

      // Third-person vehicle chase camera
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

      this.callbacks.onVehicleChange?.(this.vehicleManager.vehicleState, this.vehicleManager.currentSpeed);
    } else {
      this.callbacks.onTrainChange?.(null);
      // Normal on-foot survivor movement
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
        const stationBodyPoint = this.player.position.clone().add(new THREE.Vector3(0, 1.0, 0));
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
          this.damagePlayer(delta * 12.0); // Drowning damage
        }
      } else {
        this.playerStats.oxygen = Math.min(this.playerStats.maxOxygen, this.playerStats.oxygen + delta * 35.0);
      }

      this.playerStats.isSwimming = isSwimming;
      this.playerStats.isSubmerged = isSubmerged;
    }

    // 2b. Objective Navigation update
    const navState = this.objectiveNavigator.update(delta, this.player.position, this.player.yaw);
    this.callbacks.onNavigationUpdate?.(navState);

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
    this.chunkManager.updatePlayerPosition(this.player.position);
    const starterChunk = this.chunkManager.activeChunks.get('0_0');
    if (starterChunk) { starterChunk.terrainMesh.visible = false; if (starterChunk.waterMesh) starterChunk.waterMesh.visible = false; }
    this.wildlifeManager.update(delta, this.player.position, (x, z) => this.chunkManager.getCurrentBiome(x, z).id, this.isNight, this.player.yaw, hour);

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

    this.npcSettlementManager.update(delta, this.isNight, true);
    this.prologueManager.update(delta);
    const rescuedNow = this.rescueManager.update(delta, this.player.position, this.buildingMgr.safeZoneCenter, this.buildingMgr.safeZoneRadius);
    rescuedNow.forEach(() => { this.addXP(75); this.callbacks.onItemCollected('canned_beans', 2); this.callbacks.onItemCollected('clean_water', 2); this.callbacks.onInteractionPrompt('Survivor safely escorted to the sanctuary.'); });

    // Distance to Safe Zone Center
    const distToSafe = Math.hypot(
      this.player.position.x - this.buildingMgr.safeZoneCenter.x,
      this.player.position.z - this.buildingMgr.safeZoneCenter.z
    );
    const inSafeZone = distToSafe < this.buildingMgr.safeZoneRadius;

    // Hunger & Thirst Drains (slower in safe zone)
    const drainMultiplier = inSafeZone ? 0.6 : 1.0;
    this.playerStats.hunger = Math.max(0, this.playerStats.hunger - delta * 0.12 * drainMultiplier);
    this.playerStats.thirst = Math.max(0, this.playerStats.thirst - delta * 0.18 * drainMultiplier);

    // Starvation / Dehydration Health Damage
    if (this.playerStats.hunger <= 0 || this.playerStats.thirst <= 0) {
      this.damagePlayer(delta * 2.5);
    }

    // Passive Health Regen if well-fed & hydrated
    if (this.playerStats.hunger > 60 && this.playerStats.thirst > 60 && this.playerStats.health < this.playerStats.maxHealth) {
      this.playerStats.health = Math.min(this.playerStats.maxHealth, this.playerStats.health + delta * 1.5);
    }

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

    this.callbacks.onStatsChange({ ...this.playerStats });
    this.callbacks.onTimeChange(this.gameTimeMinutes, this.dayCount, this.isNight, this.isDusk);

    // 4. Horde Director Waves at Night (only if prologue is completed)
    if (this.isNight && this.prologueManager.isCompleted) {
      this.hordeWaveTimer += delta;
      if (this.hordeWaveTimer >= 35.0) {
        this.hordeWaveTimer = 0;
        const waveCount = 3 + Math.min(6, this.dayCount * 2);
        this.zombieMgr.spawnHordeWave(this.player.position, waveCount);
      }
    }

    // 5. Update Zombies
    if (this.zombieMgr.zombies.length > 0) {
      this.zombieMgr.update(delta, this.player.position, this.buildingMgr, (dmg) => {
        this.damagePlayer(dmg);
      });
    }

    // 6. Raycast Interaction Prompt
    this.checkInteractionPrompt();

    // 7. Auto-save every 60s
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer >= 60.0) {
      this.autoSaveTimer = 0;
      this.triggerAutoSave();
    }
  }

  private updateAtmosphere(hour: number) {
    let sunIntensity = 2.4;
    let sunColor = new THREE.Color(0xfffaee);

    if (hour >= 5.0 && hour < 8.0) {
      // Dawn / Sunrise: Golden warmth
      const t = (hour - 5.0) / 3.0;
      sunColor.setRGB(1.0, 0.72 + t * 0.23, 0.45 + t * 0.45);
      sunIntensity = 1.4 + t * 1.0;
      this.hemiLight.color.setRGB(1.0, 0.82, 0.65);
      this.hemiLight.groundColor.setRGB(0.24, 0.19, 0.15);
      this.hemiLight.intensity = 0.75;
    } else if (hour >= 8.0 && hour < 17.0) {
      // Full daylight: Crisp clear sun with sky bounce
      sunColor.setRGB(1.0, 0.98, 0.93);
      sunIntensity = 2.4;
      this.hemiLight.color.setRGB(0.54, 0.76, 0.97);
      this.hemiLight.groundColor.setRGB(0.23, 0.29, 0.2);
      this.hemiLight.intensity = 0.85;
    } else if (hour >= 17.0 && hour < 20.5) {
      // Sunset / Dusk: Fiery golden hour
      const t = (hour - 17.0) / 3.5;
      sunColor.setRGB(1.0, 0.52 - t * 0.35, 0.2 - t * 0.15);
      sunIntensity = 2.0 - t * 1.5;
      this.hemiLight.color.setRGB(1.0 - t * 0.5, 0.54 - t * 0.35, 0.32 - t * 0.2);
      this.hemiLight.groundColor.setRGB(0.18, 0.12, 0.1);
      this.hemiLight.intensity = 0.65;
    } else {
      // Night: Moonlight illumination
      const isBloodMoon = this.isNight && (this.dayCount % 7 === 0 || this.dayCount === 1);
      if (isBloodMoon) {
        sunColor.setRGB(0.85, 0.2, 0.2);
        sunIntensity = 0.45;
        this.hemiLight.color.setRGB(0.25, 0.08, 0.1);
        this.hemiLight.groundColor.setRGB(0.06, 0.02, 0.03);
        this.hemiLight.intensity = 0.32;
      } else {
        sunColor.setRGB(0.68, 0.82, 1.0);
        sunIntensity = 0.38;
        this.hemiLight.color.setRGB(0.12, 0.18, 0.32);
        this.hemiLight.groundColor.setRGB(0.04, 0.06, 0.1);
        this.hemiLight.intensity = 0.26;
      }
    }

    const horizonColor = this.atmosphericSky ? this.atmosphericSky.getHorizonColor() : new THREE.Color(0x87ceeb);
    this.scene.background = horizonColor;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = horizonColor;
      this.scene.fog.density = this.isNight ? 0.015 : 0.0075;
    }

    this.dirLight.color = sunColor;
    this.dirLight.intensity = sunIntensity;

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
    const range = 3.2;

    // Check zombies first
    let hitZombie: { id: string; dist: number } | null = null;
    for (const z of this.zombieMgr.zombies) {
      const dx = z.position[0] - this.player.position.x;
      const dz = z.position[2] - this.player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < range) {
        if (!hitZombie || d < hitZombie.dist) {
          hitZombie = { id: z.id, dist: d };
        }
      }
    }

    if (hitZombie) {
      let dmg = 20;
      let knockback = 1.5;
      if (this.activeSlotItem) {
        dmg = this.activeSlotItem.damage || 20;
        if (this.activeSlotItem.id === 'stun_baton') knockback = 4.0;
      }
      const res = this.zombieMgr.damageZombie(hitZombie.id, dmg, knockback);
      if (res) {
        soundEngine.playHurt();
        if (res.killed) {
          this.addXP(res.xp);
          // Drop loot (cloth / metal)
          this.callbacks.onItemCollected('cloth_fabric', 2);
          if (Math.random() > 0.5) this.callbacks.onItemCollected('nails_bolts', 2);
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

      const damaged = this.terrain.damageResource(nearestRes.id, dmg);
      if (damaged && damaged.health <= 0) {
        // Collect yield
        const itemDef = ITEMS[damaged.yieldItem];
        if (itemDef) {
          this.callbacks.onResourceHarvested(damaged, itemDef, damaged.yieldAmount);
          this.callbacks.onItemCollected(itemDef.id, damaged.yieldAmount);
          this.addXP(15);
          if (damaged.yieldItem === 'wood') {
            this.updateQuestProgress('gather_wood', damaged.yieldAmount);
          } else if (damaged.yieldItem === 'stone') {
            this.updateQuestProgress('gather_stone', damaged.yieldAmount);
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
          }
          break;
        }
      }
    }
  }

  private performRangedShot() {
    this.raycaster.setFromCamera(this.screenCenter, this.camera);
    const range = 50.0;

    // Check hit on closest zombie
    let nearestZombie: { id: string; dist: number } | null = null;
    for (const z of this.zombieMgr.zombies) {
      const dx = z.position[0] - this.player.position.x;
      const dz = z.position[2] - this.player.position.z;
      const d = Math.hypot(dx, dz);
      if (d < range) {
        if (!nearestZombie || d < nearestZombie.dist) {
          nearestZombie = { id: z.id, dist: d };
        }
      }
    }

    if (nearestZombie) {
      const res = this.zombieMgr.damageZombie(nearestZombie.id, 65, 3.0);
      if (res) {
        soundEngine.playHurt();
        if (res.killed) {
          this.addXP(res.xp);
          this.callbacks.onItemCollected('cloth_fabric', 2);
        }
      }
    }
  }

  public handleInteractKey() {
    // E Key interaction
    const range = 3.8;

    // -1. If currently in locomotive train -> Exit train
    if (this.aiTrainManager?.activePassengerTrain) {
      if (this.aiTrainManager.passengerSeatLocalPosition) {
        this.aiTrainManager.standFromPassengerSeat();
        this.callbacks.onInteractionPrompt('You stood up. Walk through the carriage or use E near a seat.');
      } else if (this.aiTrainManager.sitOnNearbyPassengerSeat(this.player.position)) {
        this.callbacks.onInteractionPrompt('Seated. Drag the view to look around 360°. Press E to stand.');
      } else {
        this.exitPassengerTrain();
      }
      return;
    }
    if (this.aiTrainManager && this.aiTrainManager.activeDrivableTrain) {
      this.exitTrain();
      return;
    }

    // Board any of the six AI-operated trains only while stopped at a station with doors open.
    if (this.aiTrainManager) {
      const passengerTrain = this.aiTrainManager.getNearbyBoardableAITrain(this.player.position, 7.0);
      if (passengerTrain) {
        this.aiTrainManager.boardAITrain(passengerTrain);
        this.player.avatarGroup.visible = false;
        this.callbacks.onInteractionPrompt(`Boarded AI service ${passengerTrain.line}. Walk to either end to explore all 3 carriages; press E near a seat to sit.`);
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
        this.executeBedSleep(new THREE.Vector3(-29.8, 0.245, 41.8));
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
      // Post-campaign Companion Interaction inside or around Base
      const friend = this.prologueManager.companionMgr.getNearestCompanion(this.player.position, 3.8);
      if (friend) {
        if (friend.id === 'marcus') {
          friend.isFollowing = !friend.isFollowing;
          soundEngine.playUIClick();
          this.callbacks.onInteractionPrompt(friend.isFollowing ? 'Marcus is now following you on your expedition.' : 'Marcus will guard the sanctuary gate.');
          this.updateQuestProgress('talk_to_marcus', 1);
        } else if (friend.id === 'chloe') {
          soundEngine.playUIClick();
          this.callbacks.onPrologueSubtitle?.({
            speaker: 'Chloe Miller',
            role: 'The Technician',
            text: 'I am monitoring the base power grid and communications. All facilities operational.',
            duration: 4.5,
          });
        } else if (friend.id === 'maya') {
          this.playerStats.health = this.playerStats.maxHealth;
          this.callbacks.onStatsChange({ ...this.playerStats });
          soundEngine.playDawnVictoryChime();
          this.callbacks.onPrologueSubtitle?.({
            speaker: 'Dr. Maya Lin',
            role: 'The Medic',
            text: 'I treated your injuries and refreshed your vitals. Stay safe outside the perimeter.',
            duration: 4.5,
          });
        }
        return;
      }
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
        } else if (struct.typeId === 'campfire') {
          soundEngine.playUIClick();
          this.callbacks.onOpenCrafting('campfire');
          return;
        }
      }
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

  public resolveSurvivorChoice(id: string, choice: string) {
    if (choice === 'Help me reach the sanctuary') {
      const started = this.rescueManager.beginEscort(id);
      if (started) this.callbacks.onInteractionPrompt('Survivor is following you. Lead them back inside the sanctuary perimeter.');
    }
  }

  public logSpeciesDossier(agentId: string) {
    const creature = this.wildlifeManager.getNearestCreature(this.player.position, 35.0);
    if (!creature) return;
    this.addXP(50);
    soundEngine.playDawnVictoryChime();
    this.callbacks.onInteractionPrompt(`Logged ${creature.species.name} (Gen ${creature.genome.generation}) in Field Chronicle! +50 XP`);
    this.updateQuestProgress('study_wildlife', 1);
  }

  public executeBedSleep(returnPosition?: THREE.Vector3): boolean {
    const hour = this.gameTimeMinutes / 60;
    // Sleeping is available only during the actual night window (21:00–05:00).
    // Dusk and early morning are deliberately excluded.
    const isActualNight = hour >= 21.0 || hour < 5.0;

    // Sequential night-only sleep check
    if (!isActualNight) {
      soundEngine.playUIClick();
      this.callbacks.onPrologueSubtitle?.({
        speaker: 'Survivor',
        text: "It's still daytime. I can only sleep at night.",
        duration: 4.0,
      });
      this.callbacks.onInteractionPrompt("It's still daytime. I can only sleep at night.");
      return false;
    }

    // Store the night being completed, not the destination morning's day number.
    const sleepingNightDay = this.dayCount;

    // Already slept tonight check: exact requirement quote
    if (this.lastSleptDay === sleepingNightDay) {
      soundEngine.playUIClick();
      this.callbacks.onPrologueSubtitle?.({
        speaker: 'Survivor',
        text: "I've already slept tonight. I should get some rest tomorrow.",
        duration: 4.0,
      });
      this.callbacks.onInteractionPrompt("I've already slept tonight. I should get some rest tomorrow.");
      return false;
    }

    // Proper lying-down animation
    this.player.startSleeping(3.5, returnPosition);

    // If in Day 1 peaceful night prologue, route to PrologueManager sleepToDay2
    if (!this.prologueManager.isCompleted && (this.prologueManager.phase === 'D1_E10_LAST_NORMAL_NIGHT' || this.prologueManager.phase === 'night1_peaceful')) {
      this.lastSleptDay = sleepingNightDay;
      this.prologueManager.sleepToDay2();
      return true;
    }

    // Advance in-game night to morning (06:00 AM Dawn)
    soundEngine.playDawnVictoryChime();
    this.gameTimeMinutes = 360; // 06:00 AM Dawn
    this.dayCount += 1;
    this.lastSleptDay = sleepingNightDay;

    // Passive health and stamina recovery (no speed/sprint shortcut)
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
    return true;
  }

  public sleepUntilDawn() {
    this.executeBedSleep();
  }

  private checkInteractionPrompt() {
    if (this.buildingMgr.activeDef) {
      this.callbacks.onInteractionPrompt('[Left-Click] Place Structure | [R] Rotate | [B / Esc] Cancel');
      const aim = this.getPlacementAimPoint();
      if (aim) {
        this.buildingMgr.updatePreview(aim, true);
      }
      return;
    }

    // Train boarding / passenger exploration prompts.
    if (this.aiTrainManager) {
      if (this.aiTrainManager.activePassengerTrain) {
        if (this.aiTrainManager.passengerSeatLocalPosition) this.callbacks.onInteractionPrompt('[E] Stand up · Drag view for 360° look');
        else if (this.aiTrainManager.getNearbyPassengerSeat(this.player.position, 2.8)) this.callbacks.onInteractionPrompt('[E] Sit on passenger seat · Drag view for 360° look');
        else this.callbacks.onInteractionPrompt('[E] Exit train · Walk through all 3 carriages');
        return;
      }
      const passengerTrain = this.aiTrainManager.getNearbyBoardableAITrain(this.player.position, 7.0);
      if (passengerTrain) {
        this.callbacks.onInteractionPrompt(`[E] Board AI train ${passengerTrain.line} · doors open`);
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
        } else if (struct.typeId === 'campfire') {
          this.callbacks.onInteractionPrompt('[E] Cook / Boil Water at Campfire');
          return;
        }
      }
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

  public damagePlayer(amount: number) {
    if (this.gameMode === 'creative') return;
    this.playerStats.health = Math.max(0, this.playerStats.health - amount);
    soundEngine.playHurt();

    if (this.playerStats.health <= 0) {
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

  public updateQuestProgress(objectiveId: string, amount: number) {
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

  public enterTrain(_train: any) {
    // Legacy locomotive entry is disabled; players may only board AI passenger services.
    this.callbacks.onInteractionPrompt('All trains are AI-operated. Board as a passenger when the station doors open.');
  }

  public exitPassengerTrain() {
    if (!this.aiTrainManager?.activePassengerTrain) return;
    this.aiTrainManager.exitAITrain(this.player.position);
    this.player.avatarGroup.position.copy(this.player.position);
    this.player.avatarGroup.visible = this.player.cameraView !== 'first';
    this.callbacks.onTrainChange?.(null);
    this.callbacks.onInteractionPrompt('Exited passenger carriage.');
  }

  public exitTrain() {
    if (!this.aiTrainManager || !this.aiTrainManager.activeDrivableTrain) return;
    this.aiTrainManager.exitPlayerTrain(this.player.position);
    this.player.avatarGroup.position.copy(this.player.position);
    this.player.avatarGroup.visible = this.player.cameraView !== 'first';
    this.callbacks.onTrainChange?.(null);
    this.callbacks.onInteractionPrompt('Exited locomotive onto platform.');
  }

  public throttleTrainUp() {
    this.aiTrainManager?.updateTrainControls({ forward: true, backward: false });
  }

  public throttleTrainDown() {
    this.aiTrainManager?.updateTrainControls({ forward: false, backward: true, brake: true });
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
    this.aiTrainManager?.toggleCameraView();
  }

  public triggerAutoSave() {
    const meta: SaveSlotMetadata = {
      id: 'autosave',
      name: 'Autosave Slot',
      characterName: 'Survivor',
      dayCount: this.dayCount,
      timeString: `${Math.floor(this.gameTimeMinutes / 60).toString().padStart(2, '0')}:${Math.floor(this.gameTimeMinutes % 60).toString().padStart(2, '0')}`,
      timestamp: Date.now(),
      difficulty: this.difficulty,
      gameMode: this.gameMode,
    };

    const saveData: FullGameSave = {
      metadata: meta,
      worldSeed: this.terrain.seed,
      playerPosition: [this.player.position.x, this.player.position.y, this.player.position.z],
      playerRotation: this.player.yaw,
      playerStats: { ...this.playerStats },
      inventory: [],
      hotbar: [],
      selectedHotbarIndex: 0,
      structures: [...this.buildingMgr.structures],
      quests: [...this.quests],
      gameTimeMinutes: this.gameTimeMinutes,
      dayCount: this.dayCount,
      lastSleptDay: this.lastSleptDay,
      nightHordeCountDefeated: this.nightHordesDefeated,
      ...this.worldPersistence.exportSaveData(),
      rescuedSurvivorIds: this.rescueManager.exportRescued(),
      baseState: {
        level: 2,
        power: { solarProductionKw: 15, generatorProductionKw: 25, totalProductionKw: 40, consumptionKw: 12, batteryCurrentKwh: 45, batteryCapacityKwh: 80, isGeneratorRunning: false, generatorFuel: 80, isPowered: true },
        water: { storageLiters: 450, maxCapacityLiters: 1000, rainCatchmentRate: 20, purificationRate: 15, cleanWaterLiters: 400 },
        food: { refrigeratorRations: 30, pantryRations: 40, isRefrigerated: true, daysOfFoodRemaining: 14 },
        security: { isAlarmArmed: false, isAlarmTriggered: false, activeGateLocked: false, nearbyZombiesDetected: 0, cctvChannels: [] },
        npcs: [],
        research: [],
        vehicle: { ...this.vehicleManager.vehicleState },
        overallHealth: 100,
      },
      tamedCompanion: this.wildlifeManager.companionState,
    };

    saveGameToSlot(saveData);
  }

  public dispose() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
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
    this.aiTrainManager?.dispose();
    try {
      this.atmosphericSky?.dispose();
    } catch {}
    try {
      this.pmremGenerator?.dispose();
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
