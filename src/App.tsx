/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback, Suspense, lazy } from 'react';
import { GameEngine } from './engine/GameEngine';
import { DialogueModal } from './components/DialogueModal';
import { FriendInteractionModal } from './components/FriendInteractionModal';
import { SurvivorDialogue } from './engine/SurvivorRescueManager';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { BuildMenu } from './components/BuildMenu';
import { InventoryModal } from './components/InventoryModal';
import { CraftingModal } from './components/CraftingModal';
import { QuestJournalModal } from './components/QuestJournalModal';
import { CharacterModal } from './components/CharacterModal';
import { PauseMenu } from './components/PauseMenu';
import { StorageChestModal } from './components/StorageChestModal';
import { NoticeBoardModal } from './components/NoticeBoardModal';
import { MobileControls } from './components/MobileControls';
import { HordeAlertBanner } from './components/HordeAlertBanner';
import { VehicleHUD } from './components/VehicleHUD';
import { TrainHUD } from './components/TrainHUD';
import { CinematicOverlay } from './components/prologue/CinematicOverlay';
import { PerformanceDiagnostic } from './components/PerformanceDiagnostic';
import { GraphicsManagerModal } from './components/GraphicsManagerModal';
import { SurvivalRadioPanel } from './components/SurvivalRadioPanel';
import { FishingModal } from './components/FishingModal';
import { ProloguePhase, PrologueSubtitle, StoryCompanion } from './types/prologue';
import {
  FullGameSave,
  PlayerStats,
  InventorySlot,
  Quest,
  GameSettings,
  GraphicsQualityMode,
  StructureDefinition,
  PlacedStructure,
  CraftingRecipe,
  Difficulty,
  GameMode,
  VehicleState,
  CompanionState,
  EcosystemDossier,
  EcosystemMetrics,
  BaseState,
  BiomeType,
  NPCRole,
  WeatherType,
  SandboxSettings,
  KeybindConfig,
  RadiantBounty,
  FloatingDamageNumber,
  SupplyDropState,
  WeaponModId,
  EarthOriginConfig,
} from './types/game';
import { ExtractionState } from './engine/world/WorldEventsManager';
import { ObjectiveNavigationState } from './types/physics';
import { ITEMS } from './data/items';
import { INITIAL_QUESTS } from './data/quests';
import { FridgeStorageModal } from './components/FridgeStorageModal';
import { PhoneModal } from './components/PhoneModal';
import { RailwayOperationsModal } from './components/RailwayOperationsModal';
import { RailwayStationHUD } from './components/RailwayStationHUD';
import { IndiaRailwayNetworkModal } from './components/IndiaRailwayNetworkModal';
import { RailwayTicket } from './types/game';
import { MedicalClinicModal } from './components/MedicalClinicModal';
import { ApartmentStatusModal } from './components/ApartmentStatusModal';
import { SecurityCommandCenterModal } from './components/SecurityCommandCenterModal';
import { CornerMinimap } from './components/CornerMinimap';
import { ArmoryCatalogItem } from './data/armoryCatalog';
import { saveGameToSlot, loadGameFromSlot, getAllSaveSlots } from './utils/storage';
import { soundEngine } from './utils/audio';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BIOMES } from './engine/world/BiomeGenerator';
import { useGamepad } from './hooks/useGamepad';
import { loadCodexState, recordDiscoveredBiome, recordScannedSpecies, CodexState } from './data/codex';
import {
  CareerStats,
  loadCareerStats,
  incrementCareerStat,
  recordCareerHighWater,
} from './data/achievements';
import { loadKeybinds, saveKeybinds, resetKeybinds } from './utils/keybinds';
import { generateDailyBounties } from './data/bounties';
import { recordRunScore } from './utils/blueprintShare';
import { Camera, X as CloseIcon } from 'lucide-react';

const MapModal = lazy(() => import('./components/MapModal').then((m) => ({ default: m.MapModal })));
const ArmoryCatalogModal = lazy(() =>
  import('./components/ArmoryCatalogModal').then((m) => ({ default: m.ArmoryCatalogModal }))
);
const RailwayTicketModal = lazy(() =>
  import('./components/RailwayTicketModal').then((m) => ({ default: m.RailwayTicketModal }))
);
const BaseManagementDashboardModal = lazy(() =>
  import('./components/BaseManagementDashboardModal').then((m) => ({ default: m.BaseManagementDashboardModal }))
);
const TrainControlCenter = lazy(() =>
  import('./components/TrainControlCenter').then((m) => ({ default: m.TrainControlCenter }))
);
const FieldCompendiumModal = lazy(() =>
  import('./components/FieldCompendiumModal').then((m) => ({ default: m.FieldCompendiumModal }))
);
const AchievementsModal = lazy(() =>
  import('./components/AchievementsModal').then((m) => ({ default: m.AchievementsModal }))
);
const BlueprintManagerModal = lazy(() =>
  import('./components/BlueprintManagerModal').then((m) => ({ default: m.BlueprintManagerModal }))
);

const SETTINGS_STORAGE_KEY = 'last_sanctuary_settings_v1';

export default function App() {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [hasContinue, setHasContinue] = useState(false);

  // Three.js Mount Container Ref
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  // Vehicle & Companion States
  const [activeVehicle, setActiveVehicle] = useState<VehicleState | null>(null);
  const [vehicleSpeed, setVehicleSpeed] = useState<number>(0);
  const [companion, setCompanion] = useState<CompanionState | null>(null);

  // Ecosystem & Bio-Scanner States
  const [ecosystemDossier, setEcosystemDossier] = useState<EcosystemDossier | null>(null);
  const [isBioScannerActive, setIsBioScannerActive] = useState<boolean>(true);
  const [ecosystemMetrics, setEcosystemMetrics] = useState<EcosystemMetrics | null>(null);
  const [navigationState, setNavigationState] = useState<ObjectiveNavigationState | null>(null);

  // Prologue State
  const [prologuePhase, setProloguePhase] = useState<ProloguePhase>('completed');
  const [prologueSubtitle, setPrologueSubtitle] = useState<PrologueSubtitle | null>(null);
  const [prologueTitleBanner, setPrologueTitleBanner] = useState<{ title: string; subtitle: string; day: string } | null>(null);
  const [prologueObjective, setPrologueObjective] = useState<string | null>(null);

  // Survivor Stats & Time
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    hunger: 85,
    thirst: 90,
    temperature: 24,
    infection: 0,
    oxygen: 100,
    maxOxygen: 100,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    skillPoints: 1,
    skills: { strength: 1, endurance: 1, engineering: 1, survival: 1 },
  });

  const [timeMinutes, setTimeMinutes] = useState(480);
  const [dayCount, setDayCount] = useState(1);
  const [isNight, setIsNight] = useState(false);
  const [isDusk, setIsDusk] = useState(false);
  const [hordeEvent, setHordeEvent] = useState<'dusk_warning' | 'night_horde_start' | 'dawn_victory' | null>(null);
  const [interactionPrompt, setInteractionPrompt] = useState<string | null>(null);

  // Quests
  const [quests, setQuests] = useState<Quest[]>(INITIAL_QUESTS);

  // Inventory & Hotbar (Starter Kit)
  const [inventory, setInventory] = useState<(InventorySlot | null)[]>([
    { item: ITEMS['canned_beans'], count: 2 },
    { item: ITEMS['clean_water'], count: 2 },
    { item: ITEMS['bandage'], count: 2 },
    { item: ITEMS['nails_bolts'], count: 12 },
    ...new Array(20).fill(null),
  ]);

  const [hotbar, setHotbar] = useState<(InventorySlot | null)[]>([
    { item: ITEMS['stone_axe'], count: 1 },
    { item: ITEMS['stone_pickaxe'], count: 1 },
    { item: ITEMS['builder_hammer'], count: 1 },
    { item: ITEMS['canned_beans'], count: 1 },
    { item: ITEMS['clean_water'], count: 1 },
    null,
    null,
    null,
  ]);

  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState(0);

  // Synchronized refs for live save exports
  const inventoryRef = useRef(inventory);
  const hotbarRef = useRef(hotbar);
  const selectedHotbarIndexRef = useRef(selectedHotbarIndex);

  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  useEffect(() => {
    hotbarRef.current = hotbar;
  }, [hotbar]);

  useEffect(() => {
    selectedHotbarIndexRef.current = selectedHotbarIndex;
  }, [selectedHotbarIndex]);

  const [cameraView, setCameraView] = useState<'first' | 'third' | 'second'>('third');
  const [isFlashlightOn, setIsFlashlightOn] = useState(false);

  // Modals
  const [isBuildOpen, setIsBuildOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isCraftingOpen, setIsCraftingOpen] = useState(false);
  const [craftingStation, setCraftingStation] = useState<string | undefined>(undefined);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isCharacterOpen, setIsCharacterOpen] = useState(false);
  const [isPauseOpen, setIsPauseOpen] = useState(false);
  const [openChestStructure, setOpenChestStructure] = useState<PlacedStructure | null>(null);
  const [isNoticeBoardOpen, setIsNoticeBoardOpen] = useState(false);
  const [activeDialogue, setActiveDialogue] = useState<SurvivorDialogue | null>(null);
  const [isArmoryOpen, setIsArmoryOpen] = useState(false);
  const [activeFriendModal, setActiveFriendModal] = useState<StoryCompanion | null>(null);
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isRailwayOperationsOpen, setIsRailwayOperationsOpen] = useState(false);
  const [isRailwayTicketsOpen, setIsRailwayTicketsOpen] = useState(false);
  const [activeRailwayTicket, setActiveRailwayTicket] = useState<RailwayTicket | null>(null);
  const [isStationHUDVisible, setIsStationHUDVisible] = useState(false);
  const [currentStationFloor, setCurrentStationFloor] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [liveStationTrainInfo, setLiveStationTrainInfo] = useState<any>(null);
  const [activeFacilityWaypoint, setActiveFacilityWaypoint] = useState<{ label: string; distanceMeters: number } | null>(null);
  const [isMedicalClinicOpen, setIsMedicalClinicOpen] = useState(false);
  const [isApartmentStatusOpen, setIsApartmentStatusOpen] = useState(false);
  const [isSecurityCommandCenterOpen, setIsSecurityCommandCenterOpen] = useState(false);
  const [isRailwayNetworkMapOpen, setIsRailwayNetworkMapOpen] = useState(false);
  const [isBaseDashboardOpen, setIsBaseDashboardOpen] = useState(false);
  const [liveBaseState, setLiveBaseState] = useState<BaseState | null>(null);
  const [isTrainControlCenterOpen, setIsTrainControlCenterOpen] = useState(false);
  const [isCompendiumOpen, setIsCompendiumOpen] = useState(false);
  const [codexState, setCodexState] = useState<CodexState>(() => loadCodexState());
  const [currentBiome, setCurrentBiome] = useState<{ id: string; name: string; tempC: number }>({
    id: 'green_plains',
    name: 'Verdant Meadowlands',
    tempC: 22,
  });
  const [playerCoords, setPlayerCoords] = useState<[number, number, number]>([0, 0, 0]);
  const [showMinimap, setShowMinimap] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true
  );
  const [isPhotoMode, setIsPhotoMode] = useState(false);
  const [photoToast, setPhotoToast] = useState<string | null>(null);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [careerStats, setCareerStats] = useState<CareerStats>(() => loadCareerStats());

  // Dynamic Weather, Combat Feedback, Bounties, Sandbox & Keybinds
  const [weather, setWeather] = useState<WeatherType>('clear');
  const [weatherIntensity, setWeatherIntensity] = useState<number>(0.35);
  const [damageNumbers, setDamageNumbers] = useState<FloatingDamageNumber[]>([]);
  const [hitmarkerActive, setHitmarkerActive] = useState(false);
  const [bossStatus, setBossStatus] = useState<{ name: string; health: number; maxHealth: number } | null>(null);
  const [worldEvent, setWorldEvent] = useState<{ supplyDrop: SupplyDropState | null; extraction: ExtractionState } | null>(null);
  const [bounties, setBounties] = useState<RadiantBounty[]>(() => generateDailyBounties(1));
  const bountiesRef = useRef<RadiantBounty[]>(bounties);
  bountiesRef.current = bounties;
  const lastBountyDayRef = useRef(1);
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);
  const [sandboxSettings, setSandboxSettings] = useState<SandboxSettings>({
    lootMultiplier: 1.0,
    zombieDensity: 1.0,
    dayLengthMultiplier: 1.0,
    weatherIntensity: 1.0,
    friendlyFire: false,
    permadeath: false,
    infinitePower: false,
  });
  const [keybinds, setKeybinds] = useState<KeybindConfig>(() => loadKeybinds());
  const [isRadioOpen, setIsRadioOpen] = useState(false);
  const [isFishingOpen, setIsFishingOpen] = useState(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isExtractionVictoryOpen, setIsExtractionVictoryOpen] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);
  const [weaponMods, setWeaponMods] = useState<Record<string, WeaponModId[]>>({});
  const survivorNameRef = useRef('Survivor');
  const statsRef = useRef(stats);
  statsRef.current = stats;
  const dayCountRef = useRef(dayCount);
  dayCountRef.current = dayCount;

  // Performance Diagnostics Overlay & Graphics Manager Modal
  const [isPerfOpen, setIsPerfOpen] = useState(false);
  const [isGraphicsManagerOpen, setIsGraphicsManagerOpen] = useState(false);
  const [qualityMode, setQualityMode] = useState<GraphicsQualityMode>(() => {
    try {
      const stored = localStorage.getItem('last_sanctuary_quality_preset');
      if (
        stored === 'performance' ||
        stored === 'balanced' ||
        stored === 'quality' ||
        stored === 'ultra_5x' ||
        stored === 'absolute_realism'
      ) {
        return stored;
      }
      if (stored === 'auto') return 'balanced';
    } catch {}
    const isMobileUA =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    return isMobileUA ? 'performance' : 'balanced';
  });

  const mapQualityModeToSetting = (
    mode: GraphicsQualityMode
  ): GameSettings['graphicsQuality'] => {
    if (mode === 'performance') return 'low';
    if (mode === 'balanced') return 'medium';
    if (mode === 'quality') return 'high';
    return 'ultra';
  };

  const handleSelectQualityMode = useCallback((mode: GraphicsQualityMode) => {
    setQualityMode(mode);
    setSettings((prev) => ({
      ...prev,
      graphicsQuality: mapQualityModeToSetting(mode),
    }));
    if (engineRef.current) {
      engineRef.current.setQualityMode(mode);
    }
    try {
      localStorage.setItem('last_sanctuary_quality_preset', mode);
    } catch {}
  }, []);

  const [trainHUDData, setTrainHUDData] = useState<any | null>(null);

  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const stationPollCacheRef = useRef({
    isNear: false,
    floor: -1 as number,
    bannerKey: '',
    waypointKey: '',
  });
  const [touchControlsMode, setTouchControlsMode] = useState<'auto' | 'always' | 'off'>(() => {
    try {
      const stored = localStorage.getItem('last_sanctuary_touch_mode');
      if (stored === 'auto' || stored === 'always' || stored === 'off') return stored;
    } catch {}
    return 'always';
  });

  const handleToggleTouchControlsMode = useCallback(() => {
    setTouchControlsMode((prev) => {
      const modes: ('auto' | 'always' | 'off')[] = ['auto', 'always', 'off'];
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      const nextMode = modes[nextIdx];
      try {
        localStorage.setItem('last_sanctuary_touch_mode', nextMode);
      } catch {}
      return nextMode;
    });
  }, []);


  // F4 Key listener for Performance Diagnostics overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        setIsPerfOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Settings (persisted to localStorage)
  const [settings, setSettings] = useState<GameSettings>(() => {
    const defaults: GameSettings = {
      masterVolume: 0.7,
      sfxVolume: 0.8,
      musicVolume: 0.4,
      mouseSensitivity: 1.0,
      fieldOfView: 70,
      showCoordinates: true,
      graphicsQuality: mapQualityModeToSetting(qualityMode),
      firstPersonCamera: false,
      viewDistanceChunks: 3,
    };
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<GameSettings>;
        return {
          ...defaults,
          ...parsed,
          graphicsQuality: mapQualityModeToSetting(qualityMode),
        };
      }
    } catch {}
    return defaults;
  });

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  // High-water career progression tracking
  useEffect(() => {
    if (gameState !== 'playing') return;
    setCareerStats(
      recordCareerHighWater({
        highestDay: dayCount,
        highestLevel: stats.level,
        missionsCompleted: quests.filter((q) => q.completed).length,
      })
    );
  }, [gameState, dayCount, stats.level, quests]);

  // Check for existing save on mount & auto-save synchronously if tab closes during active play
  useEffect(() => {
    getAllSaveSlots().then((slots) => {
      if (slots.length > 0) setHasContinue(true);
    });
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const handleBeforeUnload = () => {
      engineRef.current?.triggerAutoSave();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, [gameState]);

  // Update Station HUD visibility, active train banner, floor elevation, and facility waypoint (dirty-checked)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      const engine = engineRef.current;
      if (!engine || !engine.player || !engine.aiTrainManager) return;
      const pos = engine.player.position;
      const stationIndex = Math.round(pos.x / 1200);
      const stationX = stationIndex * 1200;
      const distX = Math.abs(pos.x - stationX);
      const distZ = Math.abs(pos.z - 265);
      const isNear = (distX < 280 && distZ < 160) || !!engine.aiTrainManager.activePassengerTrain;
      const cache = stationPollCacheRef.current;

      if (cache.isNear !== isNear) {
        cache.isNear = isNear;
        setIsStationHUDVisible(isNear);
      }

      if (isNear) {
        const hallZ = 265;
        const baseY = engine.aiTrainManager.trackSurfaceY(stationX, hallZ) - 0.37;
        const relY = pos.y - baseY;
        const fl: 0 | 1 | 2 | 3 | 4 =
          relY >= 12.2 ? 4 : relY >= 7.4 ? 3 : relY >= 3.0 ? (pos.x > stationX ? 2 : 1) : 0;
        if (cache.floor !== fl) {
          cache.floor = fl;
          setCurrentStationFloor(fl);
        }

        const banner = engine.aiTrainManager.getLiveStationTrainBanner(stationIndex);
        const bannerKey = banner
          ? `${banner.trainNumber}|${banner.status}|${banner.platform}|${Math.round(banner.countdownSeconds ?? 0)}`
          : '';
        if (cache.bannerKey !== bannerKey) {
          cache.bannerKey = bannerKey;
          setLiveStationTrainInfo(banner);
        }

        if (engine.objectiveNavigator?.activeObjective) {
          const obj = engine.objectiveNavigator.activeObjective;
          const d = Math.round(Math.hypot(pos.x - obj.position[0], pos.z - obj.position[2]));
          const waypointKey = `${obj.title}|${d}`;
          if (cache.waypointKey !== waypointKey) {
            cache.waypointKey = waypointKey;
            setActiveFacilityWaypoint({ label: obj.title, distanceMeters: d });
          }
        } else if (cache.waypointKey !== '') {
          cache.waypointKey = '';
          setActiveFacilityWaypoint(null);
        }
      }
    }, 450);
    return () => clearInterval(interval);
  }, [gameState]);

  // Sync camera FOV, shake, view distance, and audio settings
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setBaseFov(settings.fieldOfView);
      engineRef.current.player.enableCameraShake = !settings.firstPersonCamera;
      if (settings.viewDistanceChunks) {
        engineRef.current.setViewDistanceChunks(settings.viewDistanceChunks);
      }
    }
  }, [settings.fieldOfView, settings.firstPersonCamera, settings.viewDistanceChunks]);

  // Update engine held item whenever hotbar selection changes
  useEffect(() => {
    if (engineRef.current) {
      const activeSlot = hotbar[selectedHotbarIndex];
      engineRef.current.activeSlotItem = activeSlot ? activeSlot.item : null;
      engineRef.current.player.setHeldItem(activeSlot ? activeSlot.item : null);
    }
  }, [hotbar, selectedHotbarIndex]);

  // Inventory & Item Collection
  const collectItem = useCallback((itemId: string, count: number) => {
    const itemDef = ITEMS[itemId];
    if (!itemDef) return;

    setHotbar((prevHotbar) => {
      // 1. Try stacking into existing hotbar slot
      if (itemDef.stackable) {
        const existingIdx = prevHotbar.findIndex((s) => s && s.item.id === itemId && s.count < itemDef.maxStack);
        if (existingIdx !== -1) {
          const updated = [...prevHotbar];
          const cur = updated[existingIdx]!;
          updated[existingIdx] = { ...cur, count: cur.count + count };
          return updated;
        }
      }
      return prevHotbar;
    });

    setInventory((prevInv) => {
      // 2. Try stacking into inventory
      if (itemDef.stackable) {
        const existingIdx = prevInv.findIndex((s) => s && s.item.id === itemId && s.count < itemDef.maxStack);
        if (existingIdx !== -1) {
          const updated = [...prevInv];
          const cur = updated[existingIdx]!;
          updated[existingIdx] = { ...cur, count: cur.count + count };
          return updated;
        }
      }
      // 3. Put into first empty inventory slot
      const emptyIdx = prevInv.findIndex((s) => s === null);
      if (emptyIdx !== -1) {
        const updated = [...prevInv];
        updated[emptyIdx] = { item: itemDef, count };
        return updated;
      }
      return prevInv;
    });
  }, []);

  // Initialize Game Simulation
  const launchEngine = useCallback(
    (
      initialSave: FullGameSave | null,
      seed: number = 42,
      mode: GameMode = 'survival',
      diff: Difficulty = 'standard',
      startingOrigin?: EarthOriginConfig
    ) => {
      if (!canvasMountRef.current) return;

      // Clean up any existing engine
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (canvasMountRef.current) {
        while (canvasMountRef.current.firstChild) {
          canvasMountRef.current.removeChild(canvasMountRef.current.firstChild);
        }
      }

      // Explicitly close pause menu and all overlays upon game launch
      setIsPauseOpen(false);
      setIsInventoryOpen(false);
      setIsBuildOpen(false);
      setIsCraftingOpen(false);
      setIsMapOpen(false);
      setIsJournalOpen(false);
      setIsCharacterOpen(false);
      setIsNoticeBoardOpen(false);
      setIsArmoryOpen(false);
      setIsFridgeOpen(false);
      setIsPhoneOpen(false);
      setIsRailwayOperationsOpen(false);
      setIsMedicalClinicOpen(false);
      setIsApartmentStatusOpen(false);
      setIsSecurityCommandCenterOpen(false);
      setIsBaseDashboardOpen(false);
      setIsTrainControlCenterOpen(false);
      setIsCompendiumOpen(false);
      setIsPhotoMode(false);
      setActiveDialogue(null);
      setActiveFriendModal(null);
      setOpenChestStructure(null);

      const callbacks = {
        onStatsChange: (newStats: PlayerStats) => setStats(newStats),
        onTimeChange: (mins: number, days: number, night: boolean, dusk: boolean) => {
          setTimeMinutes(mins);
          setDayCount(days);
          setIsNight(night);
          setIsDusk(dusk);
          if (days > lastBountyDayRef.current) {
            lastBountyDayRef.current = days;
            setBounties(generateDailyBounties(days));
          }
        },
        onHordeEvent: (event: 'dusk_warning' | 'night_horde_start' | 'dawn_victory' | null) => {
          setHordeEvent(event);
        },
        onInteractionPrompt: (prompt: string | null) => setInteractionPrompt(prompt),
        onQuestsUpdate: (updatedQuests: Quest[]) => setQuests(updatedQuests),
        onOpenStorage: (struct: PlacedStructure) => setOpenChestStructure(struct),
        onOpenCrafting: (station?: string) => {
          setCraftingStation(station);
          setIsCraftingOpen(true);
        },
        onResourceHarvested: () => {},
        onItemCollected: (id: string, count: number) => collectItem(id, count),
        onOpenNoticeBoard: () => setIsNoticeBoardOpen(true),
        onGameOver: () => {
          const curStats = statsRef.current;
          recordRunScore({
            survivorName: survivorNameRef.current,
            daysSurvived: dayCountRef.current,
            kills: curStats.killStats?.total ?? 0,
            bosses: curStats.killStats?.bosses ?? 0,
            rebirths: curStats.rebirthCount ?? 0,
            difficulty: engineRef.current?.difficulty || 'standard',
            extracted: false,
          });
          setGameState('gameover');
        },
        onWeatherChange: (nextWeather: WeatherType, nextIntensity?: number) => {
          setWeather(nextWeather);
          if (typeof nextIntensity === 'number') {
            setWeatherIntensity(nextIntensity);
          }
        },
        onHitEvent: (ev: { amount: number; isHeadshot?: boolean; isStealth?: boolean; screenX: number; screenY: number }) => {
          const id = `dn_${Date.now()}_${Math.random()}`;
          setDamageNumbers((prev) => [
            ...prev.filter((d) => Date.now() - d.createdAt < 750),
            {
              id,
              x: ev.screenX,
              y: ev.screenY,
              amount: ev.amount,
              isHeadshot: ev.isHeadshot,
              isStealth: ev.isStealth,
              createdAt: Date.now(),
            },
          ]);
          setHitmarkerActive(true);
          setTimeout(() => setHitmarkerActive(false), 140);
          setTimeout(() => {
            setDamageNumbers((prev) => prev.filter((d) => d.id !== id));
          }, 760);
        },
        onBossStatusChange: (boss: { name: string; health: number; maxHealth: number } | null) => {
          setBossStatus(boss);
        },
        onWorldEventUpdate: (ev: { supplyDrop: SupplyDropState | null; extraction: ExtractionState }) => {
          setWorldEvent(ev);
        },
        onBountyProgress: (targetType: RadiantBounty['targetType'], amount: number = 1) => {
          setBounties((prev) =>
            prev.map((b) => {
              if (b.claimed || b.targetType !== targetType) return b;
              const nextCur = Math.min(b.target, b.current + amount);
              return { ...b, current: nextCur, completed: nextCur >= b.target };
            })
          );
        },
        onExtractionVictory: () => {
          const curStats = statsRef.current;
          recordRunScore({
            survivorName: survivorNameRef.current,
            daysSurvived: dayCountRef.current,
            kills: curStats.killStats?.total ?? 0,
            bosses: curStats.killStats?.bosses ?? 0,
            rebirths: curStats.rebirthCount ?? 0,
            difficulty: engineRef.current?.difficulty || 'standard',
            extracted: true,
          });
          setIsExtractionVictoryOpen(true);
        },
        onOpenBlueprintModal: () => setIsBlueprintModalOpen(true),
        onOpenFishingModal: () => setIsFishingOpen(true),
        onGetBounties: () => bountiesRef.current,
        onAutoSaved: (info: { slotId: string; timestamp: number; dayCount: number; timeString: string }) => {
          setHasContinue(true);
          setAutoSaveToast(`Checkpoint Saved · Day ${info.dayCount} ${info.timeString}`);
          setTimeout(() => setAutoSaveToast(null), 3200);
        },
        onOpenDialogue: (dialogue: SurvivorDialogue) => setActiveDialogue(dialogue),
        onVehicleChange: (veh: VehicleState | null, speed: number) => {
          setActiveVehicle(veh);
          setVehicleSpeed(speed);
        },
        onCompanionChange: (comp: CompanionState | null) => {
          setCompanion(comp);
        },
        onPrologueSubtitle: (sub: PrologueSubtitle | null) => setPrologueSubtitle(sub),
        onProloguePhase: (phase: ProloguePhase) => setProloguePhase(phase),
        onPrologueTitle: (banner: { title: string; subtitle: string; day: string } | null) => setPrologueTitleBanner(banner),
        onPrologueObjective: (obj: string | null) => setPrologueObjective(obj),
        onEcosystemDossier: (dossier: EcosystemDossier | null) => {
          setEcosystemDossier(dossier);
        },
        onEcosystemMetrics: (m: EcosystemMetrics) => {
          setEcosystemMetrics(m);
        },
        onNavigationUpdate: (nav: ObjectiveNavigationState) => {
          setNavigationState(nav);
        },
        onOpenArmory: () => setIsArmoryOpen(true),
        onOpenFridge: () => setIsFridgeOpen(true),
        onOpenPhone: () => setIsPhoneOpen(true),
        onOpenRailwayOperations: () => setIsRailwayOperationsOpen(true),
        onOpenRailwayTickets: () => setIsRailwayTicketsOpen(true),
        onOpenMedicalClinic: () => setIsMedicalClinicOpen(true),
        onOpenApartmentStatus: () => setIsApartmentStatusOpen(true),
        onOpenSecurityCommandCenter: () => setIsSecurityCommandCenterOpen(true),
        onTrainChange: (data: any | null) => setTrainHUDData(data),
        onOpenFriendModal: (friend: StoryCompanion) => setActiveFriendModal(friend),
        onGetInventory: () => inventoryRef.current,
        onGetHotbar: () => hotbarRef.current,
        onGetSelectedHotbarIndex: () => selectedHotbarIndexRef.current,
        onBiomeChange: (biomeId: string, biomeName: string) => {
          const def = BIOMES[biomeId as BiomeType];
          setCurrentBiome({
            id: biomeId,
            name: biomeName,
            tempC: def?.temperature ?? 22,
          });
          const res = recordDiscoveredBiome(biomeId);
          setCodexState(res.state);
        },
        onSpeciesScanned: (speciesId: string) => {
          const res = recordScannedSpecies(speciesId);
          setCodexState(res.state);
        },
        onCareerEvent: (event: {
          type:
            | 'zombie_killed'
            | 'structure_built'
            | 'resource_harvested'
            | 'species_logged'
            | 'survivor_rescued'
            | 'horde_defeated'
            | 'save_created';
          count?: number;
        }) => {
          const delta = event.count ?? 1;
          const map: Record<typeof event.type, keyof CareerStats> = {
            zombie_killed: 'zombiesDefeated',
            structure_built: 'structuresBuilt',
            resource_harvested: 'resourcesHarvested',
            species_logged: 'speciesLogged',
            survivor_rescued: 'survivorsRescued',
            horde_defeated: 'hordesSurvived',
            save_created: 'savesCreated',
          };
          setCareerStats(incrementCareerStat(map[event.type], delta));
        },
      };

      setLaunchError(null);
      setIsLaunching(true);

      // Yield a paint frame so the loading indicator renders smoothly before world/WebGL initialization
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          try {
            if (!canvasMountRef.current) {
              throw new Error('3D viewport mount element was not ready.');
            }
            const engine = new GameEngine(
              canvasMountRef.current,
              initialSave,
              callbacks,
              seed,
              startingOrigin,
              {
                gameMode: mode,
                difficulty: diff,
                characterName: initialSave?.metadata?.characterName || survivorNameRef.current,
              }
            );
            engine.gameMode = mode;
            engine.difficulty = diff;
            engine.setSandboxSettings(sandboxSettings);
            if (!initialSave) {
              engine.quests = [...INITIAL_QUESTS];
              setQuests([...INITIAL_QUESTS]);
              setBounties(generateDailyBounties(1));
              lastBountyDayRef.current = 1;
              setWeaponMods({});
            }

            // Restore inventory, hotbar, time, stats, bounties, and checkpoint quests faithfully if loading save
            if (initialSave) {
              if (initialSave.metadata?.characterName) {
                survivorNameRef.current = initialSave.metadata.characterName;
              }
              setStats({ ...engine.playerStats });
              setDayCount(engine.dayCount);
              setTimeMinutes(engine.gameTimeMinutes);
              lastBountyDayRef.current = engine.dayCount;
              setPlayerCoords([engine.player.position.x, engine.player.position.y, engine.player.position.z]);

              if (initialSave.inventory && initialSave.inventory.length > 0) {
                setInventory(initialSave.inventory);
                inventoryRef.current = initialSave.inventory;
              }
              if (initialSave.hotbar && initialSave.hotbar.length > 0) {
                setHotbar(initialSave.hotbar);
                hotbarRef.current = initialSave.hotbar;
              }
              if (typeof initialSave.selectedHotbarIndex === 'number') {
                setSelectedHotbarIndex(initialSave.selectedHotbarIndex);
                selectedHotbarIndexRef.current = initialSave.selectedHotbarIndex;
              }
              if (engine.quests && engine.quests.length > 0) {
                setQuests([...engine.quests]);
              } else if (initialSave.quests && initialSave.quests.length > 0) {
                setQuests(initialSave.quests);
              }
              if (initialSave.activeRailwayTicket) {
                setActiveRailwayTicket(initialSave.activeRailwayTicket);
              }
              if (initialSave.sandboxSettings) {
                setSandboxSettings(initialSave.sandboxSettings);
                engine.setSandboxSettings(initialSave.sandboxSettings);
              }
              if (initialSave.weaponMods) {
                setWeaponMods(initialSave.weaponMods);
              }
              if (initialSave.bounties && initialSave.bounties.length > 0) {
                setBounties(initialSave.bounties);
              } else {
                setBounties(generateDailyBounties(engine.dayCount));
              }
              if (initialSave.weatherType) {
                setWeather(initialSave.weatherType);
              }
            }

            // If new game started in open-world survival or creative mode without story, complete story campaign directly
            if (!initialSave && mode !== 'story') {
              engine.prologueManager.completeCampaign();
            }

            engine.setBaseFov(settings.fieldOfView);
            if (settings.viewDistanceChunks) {
              engine.setViewDistanceChunks(settings.viewDistanceChunks);
            }
            soundEngine.setVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume);
            engine.setPaused(false);
            engineRef.current = engine;
            setIsPauseOpen(false);
            setIsLaunching(false);
            setGameState('playing');
          } catch (err: any) {
            console.error('Failed to initialize 3D GameEngine:', err);
            const message = err?.message || 'Unable to start 3D WebGL simulation on this device.';
            setLaunchError(message);
            setIsLaunching(false);
          }
        });
      });
    },
    [collectItem, sandboxSettings, settings.fieldOfView, settings.masterVolume, settings.musicVolume, settings.sfxVolume, settings.viewDistanceChunks]
  );

  const startNewGame = (config: {
    characterName: string;
    difficulty: Difficulty;
    gameMode: GameMode;
    seed: number;
    sandboxSettings: SandboxSettings;
    earthOrigin?: EarthOriginConfig;
  }) => {
    survivorNameRef.current = config.characterName || 'Survivor';
    setSandboxSettings(config.sandboxSettings);
    launchEngine(null, config.seed, config.gameMode, config.difficulty, config.earthOrigin);
  };

  const continueGame = async () => {
    const slots = await getAllSaveSlots();
    if (slots.length > 0) {
      const save = await loadGameFromSlot(slots[0].id);
      if (save) {
        launchEngine(save, save.worldSeed, save.metadata.gameMode, save.metadata.difficulty);
      }
    }
  };

  const loadSaveSlot = async (slotId: string) => {
    const save = await loadGameFromSlot(slotId);
    if (save) {
      launchEngine(save, save.worldSeed, save.metadata.gameMode, save.metadata.difficulty);
    }
  };

  // Sync player coordinates & base dashboard snapshot smoothly while playing
  useEffect(() => {
    if (gameState !== 'playing') return;
    const timer = setInterval(() => {
      const engine = engineRef.current;
      if (!engine || !engine.player) return;
      setPlayerCoords([engine.player.position.x, engine.player.position.y, engine.player.position.z]);
      if (isBaseDashboardOpen) {
        setLiveBaseState(engine.getBaseState());
      }
    }, 300);
    return () => clearInterval(timer);
  }, [gameState, isBaseDashboardOpen]);

  // Quick-Consume (Medkits, Bandages, Food, Clean Water) from Hotbar or Inventory
  const handleQuickConsume = useCallback(
    (kind: 'heal' | 'eat' | 'drink') => {
      const targetIds =
        kind === 'heal'
          ? ['medkit', 'bandage']
          : kind === 'eat'
          ? ['canned_beans', 'energy_bar', 'wild_berries']
          : ['clean_water'];

      if (kind === 'heal' && stats.health >= stats.maxHealth) {
        engineRef.current?.callbacks.onInteractionPrompt('Health is already full.');
        return;
      }
      if (kind === 'eat' && stats.hunger >= 99) {
        engineRef.current?.callbacks.onInteractionPrompt('Hunger is already satisfied.');
        return;
      }
      if (kind === 'drink' && stats.thirst >= 99) {
        engineRef.current?.callbacks.onInteractionPrompt('Thirst is already satisfied.');
        return;
      }

      let foundItemName = '';
      let healthDelta = 0;
      let hungerDelta = 0;
      let thirstDelta = 0;
      let staminaDelta = 0;
      let consumedFrom: 'hotbar' | 'inventory' | null = null;
      let foundIdx = -1;

      for (const id of targetIds) {
        const hbIdx = hotbarRef.current.findIndex((s) => s && s.item.id === id && s.count > 0);
        if (hbIdx !== -1) {
          consumedFrom = 'hotbar';
          foundIdx = hbIdx;
          const item = hotbarRef.current[hbIdx]!.item;
          foundItemName = item.name;
          healthDelta = item.healthRestore ?? 0;
          hungerDelta = item.hungerRestore ?? 0;
          thirstDelta = item.thirstRestore ?? 0;
          staminaDelta = item.staminaRestore ?? 0;
          break;
        }
        const invIdx = inventoryRef.current.findIndex((s) => s && s.item.id === id && s.count > 0);
        if (invIdx !== -1) {
          consumedFrom = 'inventory';
          foundIdx = invIdx;
          const item = inventoryRef.current[invIdx]!.item;
          foundItemName = item.name;
          healthDelta = item.healthRestore ?? 0;
          hungerDelta = item.hungerRestore ?? 0;
          thirstDelta = item.thirstRestore ?? 0;
          staminaDelta = item.staminaRestore ?? 0;
          break;
        }
      }

      if (!consumedFrom || foundIdx === -1) {
        engineRef.current?.callbacks.onInteractionPrompt(
          kind === 'heal'
            ? 'No Medkit or Bandage in bag.'
            : kind === 'eat'
            ? 'No rations available in bag.'
            : 'No clean water available in bag.'
        );
        return;
      }

      if (consumedFrom === 'hotbar') {
        setHotbar((prev) => {
          const next = [...prev];
          const cur = next[foundIdx];
          if (!cur) return prev;
          next[foundIdx] = cur.count > 1 ? { ...cur, count: cur.count - 1 } : null;
          return next;
        });
      } else {
        setInventory((prev) => {
          const next = [...prev];
          const cur = next[foundIdx];
          if (!cur) return prev;
          next[foundIdx] = cur.count > 1 ? { ...cur, count: cur.count - 1 } : null;
          return next;
        });
      }

      setStats((prev) => {
        const nextHealth = Math.min(prev.maxHealth, prev.health + healthDelta);
        const nextHunger = Math.min(100, prev.hunger + hungerDelta);
        const nextThirst = Math.min(100, prev.thirst + thirstDelta);
        const nextStamina = Math.min(prev.maxStamina, prev.stamina + staminaDelta);
        if (engineRef.current) {
          engineRef.current.playerStats.health = nextHealth;
          engineRef.current.playerStats.hunger = nextHunger;
          engineRef.current.playerStats.thirst = nextThirst;
          engineRef.current.playerStats.stamina = nextStamina;
          engineRef.current.callbacks.onInteractionPrompt(`Used ${foundItemName}`);
        }
        return {
          ...prev,
          health: nextHealth,
          hunger: nextHunger,
          thirst: nextThirst,
          stamina: nextStamina,
        };
      });
      soundEngine.playBuildSnap();
    },
    [stats.health, stats.maxHealth, stats.hunger, stats.thirst]
  );

  const quickConsumeRef = useRef(handleQuickConsume);
  quickConsumeRef.current = handleQuickConsume;

  const quickCounts = React.useMemo(() => {
    let med = 0;
    let food = 0;
    let water = 0;
    for (const s of [...hotbar, ...inventory]) {
      if (!s) continue;
      if (s.item.id === 'medkit' || s.item.id === 'bandage') med += s.count;
      else if (s.item.id === 'canned_beans' || s.item.id === 'energy_bar' || s.item.id === 'wild_berries') food += s.count;
      else if (s.item.id === 'clean_water') water += s.count;
    }
    return { med, food, water };
  }, [hotbar, inventory]);

  const handleCaptureScreenshot = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const dataUrl = engine.captureScreenshotDataUrl();
    if (!dataUrl) {
      setPhotoToast('Could not capture WebGL frame on this device.');
      setTimeout(() => setPhotoToast(null), 3000);
      return;
    }
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `last-sanctuary-day-${dayCount}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundEngine.playDawnVictoryChime();
    setPhotoToast(`Screenshot saved (Day ${dayCount})`);
    setTimeout(() => setPhotoToast(null), 3000);
  }, [dayCount]);

  const isAnyModalBlockingInput =
    isPauseOpen ||
    isInventoryOpen ||
    isBuildOpen ||
    isCraftingOpen ||
    isMapOpen ||
    isJournalOpen ||
    isCharacterOpen ||
    isNoticeBoardOpen ||
    isArmoryOpen ||
    isFridgeOpen ||
    isPhoneOpen ||
    isRailwayOperationsOpen ||
    isRailwayTicketsOpen ||
    isMedicalClinicOpen ||
    isApartmentStatusOpen ||
    isSecurityCommandCenterOpen ||
    isRailwayNetworkMapOpen ||
    isBaseDashboardOpen ||
    isTrainControlCenterOpen ||
    isCompendiumOpen ||
    isAchievementsOpen ||
    isFishingOpen ||
    isBlueprintModalOpen ||
    isExtractionVictoryOpen ||
    isGraphicsManagerOpen ||
    !!activeDialogue ||
    !!activeFriendModal ||
    !!openChestStructure;

  const { isGamepadConnected } = useGamepad({
    engineRef,
    enabled: gameState === 'playing' && !isAnyModalBlockingInput,
    mouseSensitivity: settings.mouseSensitivity,
    onPrimaryAction: () => {
      const engine = engineRef.current;
      if (!engine) return;
      const hasBolts = inventoryRef.current.some((s) => s && s.item.id === 'crossbow_bolts' && s.count > 0);
      const consumeBolt = () => {
        let consumed = false;
        setInventory((prev) => {
          const idx = prev.findIndex((s) => s && s.item.id === 'crossbow_bolts' && s.count > 0);
          if (idx !== -1) {
            const updated = [...prev];
            const cur = updated[idx]!;
            updated[idx] = cur.count <= 1 ? null : { ...cur, count: cur.count - 1 };
            consumed = true;
            return updated;
          }
          return prev;
        });
        return consumed;
      };
      engine.handlePrimaryAction({ hasCrossbowBolts: hasBolts, consumeBolt });
    },
    onInteract: () => engineRef.current?.handleInteractKey(),
    onToggleCamera: () => {
      const engine = engineRef.current;
      if (!engine) return;
      engine.player.toggleView();
      setCameraView(engine.player.cameraView);
      soundEngine.playUIClick();
    },
    onToggleFlashlight: () => {
      const engine = engineRef.current;
      if (!engine) return;
      const active = engine.player.toggleFlashlight();
      setIsFlashlightOn(active);
      soundEngine.playUIClick();
    },
    onCycleHotbar: (delta) => {
      setSelectedHotbarIndex((prev) => (prev + delta + 8) % 8);
      soundEngine.playUIClick();
    },
    onTogglePause: () => {
      const engine = engineRef.current;
      setIsPauseOpen((prev) => {
        const next = !prev;
        if (engine) engine.setPaused(next);
        return next;
      });
    },
  });

  // Keyboard and Mouse Event Listeners
  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      const engine = engineRef.current;
      if (!engine) return;
      if (activeDialogue) { if (e.code === 'Escape') setActiveDialogue(null); return; }

      const code = e.code;

      // Key mappings (customizable via keybinds)
      if (code === keybinds.moveForward) engine.inputState.forward = true;
      if (code === keybinds.moveBackward) engine.inputState.backward = true;
      if (code === keybinds.moveLeft) engine.inputState.left = true;
      if (code === keybinds.moveRight) engine.inputState.right = true;
      if (code === keybinds.jump) engine.inputState.jump = true;
      if (code === keybinds.sprint || code === 'ShiftRight') engine.inputState.sprint = true;
      if (code === keybinds.crouch) {
        engine.inputState.crouch = true;
        setIsCrouching(true);
      }

      // Number keys 1-8 for hotbar
      if (e.key >= '1' && e.key <= '8') {
        const slotIdx = parseInt(e.key) - 1;
        setSelectedHotbarIndex(slotIdx);
        soundEngine.playUIClick();
      }

      // Modals and action keys
      if (code === keybinds.buildMode) {
        setIsBuildOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === keybinds.inventory) {
        setIsInventoryOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === keybinds.map) {
        setIsMapOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyJ') {
        setIsJournalOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === keybinds.character) {
        setIsCharacterOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === keybinds.cameraToggle) {
        if (engine.aiTrainManager?.activePassengerTrain) {
          engine.toggleTrainCamera();
        } else {
          engine.player.toggleView();
          setCameraView(engine.player.cameraView);
        }
        soundEngine.playUIClick();
      } else if (code === keybinds.quickSwap) {
        e.preventDefault();
        const curSlot = hotbarRef.current[selectedHotbarIndexRef.current];
        const wantRanged = curSlot?.item.toolType !== 'ranged';
        const targetIdx = hotbarRef.current.findIndex((s, i) =>
          i !== selectedHotbarIndexRef.current &&
          s &&
          (wantRanged ? s.item.toolType === 'ranged' : s.item.toolType === 'weapon' || s.item.toolType === 'axe')
        );
        if (targetIdx !== -1) {
          setSelectedHotbarIndex(targetIdx);
        } else {
          const fallbackIdx = hotbarRef.current.findIndex(
            (s, i) => i !== selectedHotbarIndexRef.current && s !== null
          );
          if (fallbackIdx !== -1) setSelectedHotbarIndex(fallbackIdx);
        }
        soundEngine.playUIClick();
      } else if (code === keybinds.radio) {
        soundEngine.playRadioBroadcastBeep();
        setIsRadioOpen((prev) => !prev);
      } else if (code === keybinds.fish) {
        const hasRod = [...hotbarRef.current, ...inventoryRef.current].some((s) => s?.item.id === 'fishing_rod');
        if (hasRod) {
          engine.attemptFishing();
        } else {
          engine.callbacks.onInteractionPrompt('Craft a Carbon Fishing Rod first to fish.');
        }
      } else if (code === keybinds.throwable) {
        if (engine.aiTrainManager?.activePassengerTrain) {
          engine.toggleTrainDoors();
        } else {
          const throwables = ['molotov_cocktail', 'pipe_bomb', 'noise_flare'] as const;
          let found: (typeof throwables)[number] | null = null;
          const hbIdx = hotbarRef.current.findIndex((s) => s && throwables.includes(s.item.id as any));
          if (hbIdx !== -1) {
            found = hotbarRef.current[hbIdx]!.item.id as (typeof throwables)[number];
            setHotbar((prev) => {
              const u = [...prev];
              const cur = u[hbIdx]!;
              u[hbIdx] = cur.count <= 1 ? null : { ...cur, count: cur.count - 1 };
              return u;
            });
          } else {
            const invIdx = inventoryRef.current.findIndex((s) => s && throwables.includes(s.item.id as any));
            if (invIdx !== -1) {
              found = inventoryRef.current[invIdx]!.item.id as (typeof throwables)[number];
              setInventory((prev) => {
                const u = [...prev];
                const cur = u[invIdx]!;
                u[invIdx] = cur.count <= 1 ? null : { ...cur, count: cur.count - 1 };
                return u;
              });
            }
          }
          if (found) {
            engine.throwTacticalItem(found);
          } else {
            engine.callbacks.onInteractionPrompt('No Molotov, Pipe Bomb, or Decoy Flare in bag.');
          }
        }
      } else if (code === 'KeyZ') {
        setIsBioScannerActive((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === keybinds.flashlight) {
        if (engine.vehicleManager?.vehicleState.isOccupied) {
          engine.exitVehicle();
        } else {
          const active = engine.player.toggleFlashlight();
          setIsFlashlightOn(active);
          soundEngine.playUIClick();
        }
      } else if (code === 'KeyH') {
        if (engine.aiTrainManager?.activePassengerTrain) {
          engine.honkTrainHorn();
        } else {
          engine.honkActiveVehicleHorn();
        }
      } else if (code === 'KeyL') {
        if (engine.aiTrainManager?.activePassengerTrain) {
          engine.toggleTrainHeadlights();
        } else if (engine.vehicleManager?.vehicleState.isOccupied) {
          engine.toggleVehicleHeadlights();
        }
      } else if (code === keybinds.crafting) {
        if (engine.vehicleManager?.vehicleState.isOccupied) {
          engine.toggleVehicleLock();
        } else {
          setCraftingStation(undefined);
          setIsCraftingOpen((prev) => !prev);
          soundEngine.playUIClick();
        }
      } else if (code === keybinds.reload) {
        if (engine.aiTrainManager?.activePassengerTrain && engine.aiTrainManager.activePassengerTrain.manualDriving) {
          engine.toggleTrainReverse();
        } else if (engine.buildingMgr.activeDef) {
          engine.buildingMgr.rotatePreview();
          soundEngine.playUIClick();
        }
      } else if (code === keybinds.interact) {
        engine.handleInteractKey();
      } else if (code === 'KeyO') {
        setIsBaseDashboardOpen((prev) => {
          const next = !prev;
          if (next) setLiveBaseState(engine.getBaseState());
          return next;
        });
        soundEngine.playUIClick();
      } else if (code === 'KeyT') {
        setIsTrainControlCenterOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyX') {
        setIsCompendiumOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyN') {
        setShowMinimap((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyP') {
        setIsPhotoMode((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyQ') {
        quickConsumeRef.current('heal');
      } else if (code === 'F3') {
        engine.physicsManager.toggleDebugMode();
        soundEngine.playUIClick();
      } else if (code === 'Escape') {
        if (isPhotoMode) {
          setIsPhotoMode(false);
        } else if (
          isBuildOpen ||
          isInventoryOpen ||
          isCraftingOpen ||
          isMapOpen ||
          isJournalOpen ||
          isCharacterOpen ||
          isNoticeBoardOpen ||
          isArmoryOpen ||
          isFridgeOpen ||
          isPhoneOpen ||
          isRailwayOperationsOpen ||
          isRailwayTicketsOpen ||
          isMedicalClinicOpen ||
          isApartmentStatusOpen ||
          isSecurityCommandCenterOpen ||
          isRailwayNetworkMapOpen ||
          isBaseDashboardOpen ||
          isTrainControlCenterOpen ||
          isCompendiumOpen ||
          isAchievementsOpen ||
          isFishingOpen ||
          isBlueprintModalOpen ||
          isExtractionVictoryOpen ||
          isGraphicsManagerOpen ||
          !!activeDialogue ||
          !!activeFriendModal ||
          openChestStructure
        ) {
          setIsBuildOpen(false);
          setIsInventoryOpen(false);
          setIsCraftingOpen(false);
          setIsMapOpen(false);
          setIsJournalOpen(false);
          setIsCharacterOpen(false);
          setIsNoticeBoardOpen(false);
          setIsArmoryOpen(false);
          setIsFridgeOpen(false);
          setIsPhoneOpen(false);
          setIsRailwayOperationsOpen(false);
          setIsRailwayTicketsOpen(false);
          setIsMedicalClinicOpen(false);
          setIsApartmentStatusOpen(false);
          setIsSecurityCommandCenterOpen(false);
          setIsRailwayNetworkMapOpen(false);
          setIsBaseDashboardOpen(false);
          setIsTrainControlCenterOpen(false);
          setIsCompendiumOpen(false);
          setIsAchievementsOpen(false);
          setIsFishingOpen(false);
          setIsBlueprintModalOpen(false);
          setIsExtractionVictoryOpen(false);
          setIsGraphicsManagerOpen(false);
          setActiveDialogue(null);
          setActiveFriendModal(null);
          setOpenChestStructure(null);
          engine.buildingMgr.setBuildingMode(null);
        } else {
          setIsPauseOpen((prev) => {
            const next = !prev;
            engine.setPaused(next);
            return next;
          });
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (activeDialogue) { if (e.code === 'Escape') setActiveDialogue(null); return; }

      const code = e.code;
      if (code === keybinds.moveForward) engine.inputState.forward = false;
      if (code === keybinds.moveBackward) engine.inputState.backward = false;
      if (code === keybinds.moveLeft) engine.inputState.left = false;
      if (code === keybinds.moveRight) engine.inputState.right = false;
      if (code === keybinds.jump) engine.inputState.jump = false;
      if (code === keybinds.sprint || code === 'ShiftRight') engine.inputState.sprint = false;
      if (code === keybinds.crouch) {
        engine.inputState.crouch = false;
        setIsCrouching(false);
      }
    };

    // Mouse Look / Pointer Lock
    const isModalActive = isAnyModalBlockingInput;

    const handleMouseMove = (e: MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || isModalActive) return;

      const sens = 0.0022 * settings.mouseSensitivity;
      engine.player.yaw -= e.movementX * sens;
      engine.player.pitch -= e.movementY * sens;
      // Clamp pitch to prevent flipping
      engine.player.pitch = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, engine.player.pitch));
    };

    // Mouse Wheel Zoom for Third-Person Camera Distance
    const handleWheel = (e: WheelEvent) => {
      const engine = engineRef.current;
      if (!engine || isModalActive) return;
      engine.player.adjustCameraDistance(e.deltaY * 0.003);
    };

    const handleTouchStart = (e: TouchEvent) => {
      const engine = engineRef.current;
      const touch = e.changedTouches[0];
      if (!engine || !touch || isModalActive) return;
      engine.tryOpenFriendInteraction(touch.clientX, touch.clientY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click action in world
        const engine = engineRef.current;
        if (!engine || isModalActive) return;

        // Check if cursor clicked on a UI button/overlay
        if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;

        // Select a nearby friend before running the primary world action.
        if (engine.tryOpenFriendInteraction(e.clientX, e.clientY)) return;

        // Check crossbow bolts
        const hasBolts = inventory.some((s) => s && s.item.id === 'crossbow_bolts' && s.count > 0);
        const consumeBolt = () => {
          let consumed = false;
          setInventory((prev) => {
            const idx = prev.findIndex((s) => s && s.item.id === 'crossbow_bolts' && s.count > 0);
            if (idx !== -1) {
              const updated = [...prev];
              const cur = updated[idx]!;
              if (cur.count <= 1) updated[idx] = null;
              else updated[idx] = { ...cur, count: cur.count - 1 };
              consumed = true;
              return updated;
            }
            return prev;
          });
          return consumed;
        };

        engine.handlePrimaryAction({
          hasCrossbowBolts: hasBolts,
          consumeBolt,
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [
    gameState,
    isPauseOpen,
    isInventoryOpen,
    isBuildOpen,
    isCraftingOpen,
    isMapOpen,
    isJournalOpen,
    isCharacterOpen,
    isNoticeBoardOpen,
    isArmoryOpen,
    isFridgeOpen,
    isPhoneOpen,
    isRailwayOperationsOpen,
    isRailwayTicketsOpen,
    isMedicalClinicOpen,
    isApartmentStatusOpen,
    isSecurityCommandCenterOpen,
    isRailwayNetworkMapOpen,
    isBaseDashboardOpen,
    isTrainControlCenterOpen,
    isCompendiumOpen,
    isAchievementsOpen,
    isFishingOpen,
    isBlueprintModalOpen,
    isExtractionVictoryOpen,
    isGraphicsManagerOpen,
    isPhotoMode,
    isAnyModalBlockingInput,
    activeDialogue,
    activeFriendModal,
    openChestStructure,
    inventory,
    settings.mouseSensitivity,
    keybinds,
  ]);

  // Crafting Recipe Execution
  const handleCraftRecipe = (recipe: CraftingRecipe) => {
    // 1. Deduct ingredients
    setInventory((prev) => {
      const updated = [...prev];
      recipe.ingredients.forEach((ing) => {
        let needed = ing.count;
        for (let i = 0; i < updated.length; i++) {
          const slot = updated[i];
          if (slot && slot.item.id === ing.itemId) {
            const take = Math.min(slot.count, needed);
            slot.count -= take;
            needed -= take;
            if (slot.count <= 0) updated[i] = null;
            if (needed <= 0) break;
          }
        }
      });
      return updated;
    });

    // 2. Add crafted result
    collectItem(recipe.resultItemId, recipe.resultCount);

    // 3. Update quest and bounty progress
    if (engineRef.current) {
      if (recipe.resultItemId === 'builder_hammer') {
        engineRef.current.updateQuestProgress('craft_hammer', 1);
      } else if (recipe.resultItemId === 'stun_baton' || recipe.resultItemId === 'pulse_crossbow') {
        engineRef.current.updateQuestProgress('craft_weapon', 1);
      }
      if (
        recipe.resultItemId === 'crossbow_bolts' ||
        recipe.resultItemId === 'molotov_cocktail' ||
        recipe.resultItemId === 'pipe_bomb'
      ) {
        engineRef.current.callbacks.onBountyProgress?.('craft_ammo', 1);
      }
      if (
        recipe.resultItemId === 'cooked_steak' ||
        recipe.resultItemId === 'grilled_fish' ||
        recipe.resultItemId === 'herb_stew'
      ) {
        soundEngine.playSizzleCook();
      }
    }
  };

  // Consume / Use / Equip / Throw Item from backpack or hotbar
  const handleUseItem = (slotIndex: number, isFromHotbar: boolean) => {
    const list = isFromHotbar ? hotbar : inventory;
    const slot = list[slotIndex];
    if (!slot) return;

    const item = slot.item;

    // Equippable tactical armor & masks (do not consume stack)
    if (item.id === 'scrap_armor_vest' || item.id === 'thermal_coat') {
      const nextArmor = stats.equippedArmorId === item.id ? undefined : item.id;
      setStats((prev) => {
        if (engineRef.current) engineRef.current.playerStats.equippedArmorId = nextArmor;
        return { ...prev, equippedArmorId: nextArmor };
      });
      engineRef.current?.callbacks.onInteractionPrompt(
        nextArmor ? `Equipped ${item.name}` : `Unequipped ${item.name}`
      );
      return;
    }
    if (item.id === 'gas_mask') {
      const nextMask = stats.equippedMaskId === item.id ? undefined : item.id;
      setStats((prev) => {
        if (engineRef.current) engineRef.current.playerStats.equippedMaskId = nextMask;
        return { ...prev, equippedMaskId: nextMask };
      });
      engineRef.current?.callbacks.onInteractionPrompt(
        nextMask ? 'Equipped CBRN Gas Mask' : 'Removed CBRN Gas Mask'
      );
      return;
    }

    let applied = false;

    if (item.id === 'antibiotic_shot') {
      setStats((prev) => {
        if (engineRef.current) {
          engineRef.current.playerStats.infection = 0;
          engineRef.current.playerStats.radiationExposure = 0;
          engineRef.current.playerStats.health = Math.min(prev.maxHealth, prev.health + 20);
        }
        return {
          ...prev,
          infection: 0,
          radiationExposure: 0,
          health: Math.min(prev.maxHealth, prev.health + 20),
        };
      });
      engineRef.current?.callbacks.onInteractionPrompt('Antidote administered: Infection & radiation purged.');
      applied = true;
    } else if (item.id === 'flashlight_battery') {
      setStats((prev) => {
        if (engineRef.current) engineRef.current.playerStats.flashlightBattery = 100;
        return { ...prev, flashlightBattery: 100 };
      });
      engineRef.current?.callbacks.onInteractionPrompt('Flashlight Battery recharged to 100%.');
      applied = true;
    } else if (item.id === 'charcoal_filter') {
      setStats((prev) => {
        if (engineRef.current) engineRef.current.playerStats.radiationExposure = Math.max(0, (prev.radiationExposure ?? 0) - 25);
        return { ...prev, radiationExposure: Math.max(0, (prev.radiationExposure ?? 0) - 25) };
      });
      engineRef.current?.callbacks.onInteractionPrompt('Fresh Charcoal Filter fitted.');
      applied = true;
    } else if (item.id === 'molotov_cocktail' || item.id === 'noise_flare' || item.id === 'pipe_bomb') {
      engineRef.current?.throwTacticalItem(item.id);
      applied = true;
    }

    if (item.hungerRestore) {
      setStats((prev) => {
        const nextHunger = Math.min(100, prev.hunger + (item.hungerRestore || 0));
        if (engineRef.current) engineRef.current.playerStats.hunger = nextHunger;
        return { ...prev, hunger: nextHunger };
      });
      applied = true;
    }
    if (item.thirstRestore) {
      setStats((prev) => {
        const nextThirst = Math.min(100, prev.thirst + (item.thirstRestore || 0));
        if (engineRef.current) engineRef.current.playerStats.thirst = nextThirst;
        return { ...prev, thirst: nextThirst };
      });
      applied = true;
    }
    if (item.healthRestore && item.id !== 'antibiotic_shot') {
      setStats((prev) => {
        const nextHealth = Math.max(0, Math.min(prev.maxHealth, prev.health + (item.healthRestore || 0)));
        if (engineRef.current) engineRef.current.playerStats.health = nextHealth;
        return { ...prev, health: nextHealth };
      });
      applied = true;
    }
    if (item.staminaRestore) {
      setStats((prev) => {
        const nextStam = Math.min(prev.maxStamina, prev.stamina + (item.staminaRestore || 0));
        if (engineRef.current) engineRef.current.playerStats.stamina = nextStam;
        return { ...prev, stamina: nextStam };
      });
      applied = true;
    }

    if (applied) {
      if (isFromHotbar) {
        setHotbar((prev) => {
          const updated = [...prev];
          const cur = updated[slotIndex]!;
          if (cur.count <= 1) updated[slotIndex] = null;
          else updated[slotIndex] = { ...cur, count: cur.count - 1 };
          return updated;
        });
      } else {
        setInventory((prev) => {
          const updated = [...prev];
          const cur = updated[slotIndex]!;
          if (cur.count <= 1) updated[slotIndex] = null;
          else updated[slotIndex] = { ...cur, count: cur.count - 1 };
          return updated;
        });
      }
    }
  };

  const handleSalvageItem = (slotIndex: number, isFromHotbar: boolean) => {
    handleDropItem(slotIndex, isFromHotbar);
    const hasRecycler = engineRef.current?.hasPerk('perk_scrap_recycler');
    collectItem('metal_scrap', hasRecycler ? 4 : 3);
    collectItem('electronic_parts', 1);
  };

  const handleRepairItem = (slotIndex: number, isFromHotbar: boolean) => {
    let needed = 2;
    setInventory((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length && needed > 0; i++) {
        const s = next[i];
        if (s && s.item.id === 'metal_scrap') {
          const take = Math.min(s.count, needed);
          s.count -= take;
          needed -= take;
          if (s.count <= 0) next[i] = null;
        }
      }
      return next;
    });
    if (isFromHotbar) {
      setHotbar((prev) => {
        const u = [...prev];
        const cur = u[slotIndex];
        if (cur) u[slotIndex] = { ...cur, durability: cur.item.maxDurability || 100 };
        return u;
      });
    } else {
      setInventory((prev) => {
        const u = [...prev];
        const cur = u[slotIndex];
        if (cur) u[slotIndex] = { ...cur, durability: cur.item.maxDurability || 100 };
        return u;
      });
    }
  };

  const handleAttachWeaponMod = (weaponId: string, modId: WeaponModId) => {
    if (!engineRef.current) return;
    if (!engineRef.current.applyWeaponMod(weaponId, modId)) return;
    // Consume 1 mod kit from hotbar or inventory
    const hbIdx = hotbarRef.current.findIndex((s) => s?.item.id === modId);
    if (hbIdx !== -1) {
      setHotbar((prev) => {
        const u = [...prev];
        const cur = u[hbIdx]!;
        u[hbIdx] = cur.count <= 1 ? null : { ...cur, count: cur.count - 1 };
        return u;
      });
    } else {
      const invIdx = inventoryRef.current.findIndex((s) => s?.item.id === modId);
      if (invIdx !== -1) {
        setInventory((prev) => {
          const u = [...prev];
          const cur = u[invIdx]!;
          u[invIdx] = cur.count <= 1 ? null : { ...cur, count: cur.count - 1 };
          return u;
        });
      }
    }
    setWeaponMods((prev) => ({
      ...prev,
      [weaponId]: [...(prev[weaponId] || []), modId],
    }));
  };

  const handleClaimBounty = (bountyId: string) => {
    const target = bounties.find((b) => b.id === bountyId);
    if (!target || !target.completed || target.claimed) return;
    setBounties((prev) => prev.map((b) => (b.id === bountyId ? { ...b, claimed: true } : b)));
    engineRef.current?.addXP(target.rewardXp);
    target.rewardItems.forEach((ri) => collectItem(ri.itemId, ri.count));
    engineRef.current?.callbacks.onInteractionPrompt(`Bounty Complete: ${target.title} (+${target.rewardXp} XP)`);
  };

  const handleDropItem = (slotIndex: number, isFromHotbar: boolean) => {
    if (isFromHotbar) {
      setHotbar((prev) => {
        const u = [...prev];
        u[slotIndex] = null;
        return u;
      });
    } else {
      setInventory((prev) => {
        const u = [...prev];
        u[slotIndex] = null;
        return u;
      });
    }
  };

  const handleMoveToHotbar = (invIndex: number, hotbarIndex: number) => {
    const itemToMove = inventory[invIndex];
    if (!itemToMove) return;

    // Find empty hotbar slot
    let targetIdx = hotbar.findIndex((s) => s === null);
    if (targetIdx === -1) targetIdx = hotbarIndex;

    const existingHotbar = hotbar[targetIdx];
    setHotbar((prev) => {
      const u = [...prev];
      u[targetIdx] = itemToMove;
      return u;
    });

    setInventory((prev) => {
      const u = [...prev];
      u[invIndex] = existingHotbar;
      return u;
    });
  };

  const handleUpgradeSkill = (key: keyof PlayerStats['skills']) => {
    if (stats.skillPoints <= 0) return;
    setStats((prev) => {
      const next = {
        ...prev,
        skillPoints: prev.skillPoints - 1,
        skills: {
          ...prev.skills,
          [key]: prev.skills[key] + 1,
        },
      };
      if (engineRef.current) {
        engineRef.current.playerStats.skillPoints = next.skillPoints;
        engineRef.current.playerStats.skills = { ...next.skills };
      }
      return next;
    });
  };

  const handleManualSave = (slotId: string = 'autosave', slotName?: string) => {
    if (engineRef.current) {
      engineRef.current.triggerAutoSave(slotId, slotName);
    }
  };

  return (
    <div className="relative h-[100dvh] w-[100dvw] overflow-hidden bg-black select-none font-sans">
      {/* Three.js Isolated Canvas Mount (Persistent Ref) */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Title / Main Menu */}
      {gameState === 'menu' && (
        <MainMenu
          onStartNewGame={startNewGame}
          onContinueGame={continueGame}
          onLoadSaveSlot={loadSaveSlot}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
          onOpenCompendium={() => setIsCompendiumOpen(true)}
          hasContinue={hasContinue}
          isLaunching={isLaunching}
          launchError={launchError}
          onDismissError={() => setLaunchError(null)}
        />
      )}

      {/* Launching World Loading Overlay */}
      {isLaunching && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950/95 p-6 text-center text-neutral-100">
          <div className="h-12 w-12 rounded-full border-4 border-amber-500/25 border-t-amber-500 animate-spin mb-4" />
          <h2 className="text-lg font-black uppercase tracking-widest text-amber-400">
            Initializing Last Sanctuary
          </h2>
          <p className="mt-1.5 text-xs text-neutral-400 max-w-xs">
            Building world terrain, Central Railway Mega Station, and shaders...
          </p>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="flex flex-col items-center rounded-2xl border border-rose-900 bg-neutral-950 p-8 text-center text-neutral-100 max-w-md shadow-2xl">
            <h2 className="text-3xl font-black tracking-wider text-rose-500 uppercase">
              Player Down
            </h2>
            <p className="mt-2 text-xs text-neutral-400">
              Your character has been incapacitated. The sanctuary has not been declared destroyed. Reload your recent checkpoint to continue.
            </p>
            <div className="mt-6 flex flex-col gap-3 w-full">
              <button
                onClick={() => {
                  soundEngine.playBuildSnap();
                  continueGame();
                }}
                className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-sm font-bold uppercase tracking-wider text-neutral-950 cursor-pointer"
              >
                Reload Recent Checkpoint
              </button>
              <button
                onClick={() => setGameState('menu')}
                className="w-full rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 py-2.5 text-xs font-semibold text-neutral-300 cursor-pointer"
              >
                Return to Title Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-Game HUD & Modals */}
      {gameState === 'playing' && (
        <>
          {/* Prologue Cinematic & Subtitle Overlay */}
          <CinematicOverlay
            phase={prologuePhase}
            subtitle={prologueSubtitle}
            titleBanner={prologueTitleBanner}
            objective={prologueObjective}
            onSkipScene={() => {
              if (engineRef.current) {
                engineRef.current.prologueManager.cinematicCam.endCinematic();
              }
            }}
            onSkipPrologue={() => {
              if (engineRef.current) {
                engineRef.current.prologueManager.skipPrologue();
              }
            }}
          />

          {/* HUD-Free Photo Mode Floating Control Strip */}
          {isPhotoMode && (
            <div className="pointer-events-auto fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-neutral-700/80 bg-neutral-950/90 px-4 py-2 shadow-2xl">
              <button
                type="button"
                onClick={handleCaptureScreenshot}
                className="flex items-center gap-1.5 rounded-full bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-neutral-950 cursor-pointer transition-all active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Capture PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPhotoMode(false)}
                className="flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 cursor-pointer"
              >
                <CloseIcon className="h-3.5 w-3.5" />
                <span>Exit [P]</span>
              </button>
            </div>
          )}

          {photoToast && (
            <div className="pointer-events-none fixed top-14 left-1/2 z-50 -translate-x-1/2 rounded-full border border-emerald-500/50 bg-emerald-950/95 px-4 py-1.5 text-xs font-semibold text-emerald-200 shadow-xl">
              {photoToast}
            </div>
          )}

          {!isPhotoMode && (
            <>
              <HUD
                stats={stats}
                timeMinutes={timeMinutes}
                dayCount={dayCount}
                isNight={isNight}
                isDusk={isDusk}
                interactionPrompt={interactionPrompt}
                autoSaveToast={autoSaveToast}
                hotbar={hotbar}
                selectedIndex={selectedHotbarIndex}
                onSelectSlot={(idx) => {
                  setSelectedHotbarIndex(idx);
                  soundEngine.playUIClick();
                }}
                activeQuest={quests.find((q) => !q.completed) || null}
                cameraView={cameraView}
                isFlashlightOn={isFlashlightOn}
                biomeName={currentBiome.name}
                biomeTempC={currentBiome.tempC}
                playerPos={playerCoords}
                onOpenBuild={() => {
                  setIsBuildOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenInventory={() => {
                  setIsInventoryOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenCharacter={() => {
                  setIsCharacterOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenMap={() => {
                  setIsMapOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenJournal={() => {
                  setIsJournalOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenBaseDashboard={() => {
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                  setIsBaseDashboardOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenTrainControl={() => {
                  setIsTrainControlCenterOpen(true);
                  soundEngine.playUIClick();
                }}
                onOpenCompendium={() => {
                  setIsCompendiumOpen(true);
                  soundEngine.playUIClick();
                }}
                onToggleMinimap={() => {
                  setShowMinimap((prev) => !prev);
                  soundEngine.playUIClick();
                }}
                isMinimapOpen={showMinimap}
                onEnterPhotoMode={() => {
                  setIsPhotoMode(true);
                  soundEngine.playUIClick();
                }}
                onQuickHeal={() => handleQuickConsume('heal')}
                onQuickEat={() => handleQuickConsume('eat')}
                onQuickDrink={() => handleQuickConsume('drink')}
                quickCounts={quickCounts}
                isGamepadConnected={isGamepadConnected}
                onToggleCamera={() => {
                  if (engineRef.current) {
                    engineRef.current.player.toggleView();
                    setCameraView(engineRef.current.player.cameraView);
                    soundEngine.playUIClick();
                  }
                }}
                onZoomCamera={(delta) => {
                  if (engineRef.current) {
                    engineRef.current.player.adjustCameraDistance(delta);
                  }
                }}
                onToggleFlashlight={() => {
                  if (engineRef.current) {
                    const active = engineRef.current.player.toggleFlashlight();
                    setIsFlashlightOn(active);
                    soundEngine.playUIClick();
                  }
                }}
                onOpenPause={() => {
                  if (engineRef.current) {
                    engineRef.current.setPaused(true);
                    setIsPauseOpen(true);
                    soundEngine.playUIClick();
                  }
                }}
                companion={companion}
                onToggleCompanionOrder={() => {
                  if (engineRef.current && companion) {
                    const next = companion.state === 'follow' ? 'stay' : 'follow';
                    engineRef.current.wildlifeManager.setCompanionOrder(next);
                    setCompanion({ ...engineRef.current.wildlifeManager.companionState! });
                    soundEngine.playUIClick();
                  }
                }}
                ecosystemDossier={isBioScannerActive ? ecosystemDossier : null}
                onLogSpeciesDossier={(agentId) => engineRef.current?.logSpeciesDossier(agentId)}
                ecosystemMetrics={ecosystemMetrics}
                isBioScannerActive={isBioScannerActive}
                onToggleBioScanner={() => setIsBioScannerActive((prev) => !prev)}
                navigationState={navigationState}
                onToggleHitboxDebug={() => {
                  if (engineRef.current) {
                    engineRef.current.physicsManager.toggleDebugMode();
                    soundEngine.playUIClick();
                  }
                }}
                onTogglePerfDiagnostic={() => setIsPerfOpen((prev) => !prev)}
                isPerfOpen={isPerfOpen}
                qualityMode={qualityMode}
                onCycleQualityMode={() => {
                  soundEngine.playUIClick();
                  setIsGraphicsManagerOpen(true);
                }}
                touchControlsMode={touchControlsMode}
                onToggleTouchControlsMode={handleToggleTouchControlsMode}
                showCoordinates={settings.showCoordinates}
                onInteract={() => {
                  if (engineRef.current) engineRef.current.handleInteractKey();
                }}
                weather={weather}
                weatherIntensity={weatherIntensity}
                damageNumbers={damageNumbers}
                hitmarkerActive={hitmarkerActive}
                bossStatus={bossStatus}
                supplyDrop={worldEvent?.supplyDrop ?? null}
                extraction={worldEvent?.extraction ?? null}
                isCrouching={isCrouching}
                isRadioOpen={isRadioOpen}
                onToggleRadio={() => {
                  soundEngine.playRadioBroadcastBeep();
                  setIsRadioOpen((p) => !p);
                }}
                onOpenBlueprints={() => {
                  soundEngine.playUIClick();
                  setIsBlueprintModalOpen(true);
                }}
                onTriggerRebirth={() => {
                  engineRef.current?.triggerRebirthNGPlus();
                  setIsExtractionVictoryOpen(false);
                }}
              />

              <SurvivalRadioPanel
                isOpen={isRadioOpen}
                onClose={() => setIsRadioOpen(false)}
                dayCount={dayCount}
                biomeName={currentBiome.name}
                weather={weather}
                isNight={isNight}
                hasActiveSupplyDrop={Boolean(worldEvent?.supplyDrop && !worldEvent.supplyDrop.looted)}
                activeBossNearby={Boolean(bossStatus)}
                bounties={bounties}
                onClaimBounty={handleClaimBounty}
              />

              <CornerMinimap
                engineRef={engineRef}
                isVisible={showMinimap}
                onClose={() => setShowMinimap(false)}
                onOpenFullMap={() => {
                  setIsMapOpen(true);
                  soundEngine.playUIClick();
                }}
              />

              {/* Active Drivable Vehicle HUD */}
              {activeVehicle && (
                <VehicleHUD
                  vehicleState={activeVehicle}
                  speed={vehicleSpeed}
                  onExitVehicle={() => engineRef.current?.exitVehicle()}
                  onToggleHeadlights={() => engineRef.current?.toggleVehicleHeadlights()}
                  onToggleLock={() => engineRef.current?.toggleVehicleLock()}
                />
              )}

              {/* Active Train HUD (Exploration, Walking & Cab Driving) */}
              {trainHUDData && (
                <TrainHUD
                  hudData={trainHUDData}
                  onExitTrain={() => engineRef.current?.exitPassengerTrain()}
                  onToggleDrive={() => engineRef.current?.toggleTrainDrive()}
                  onToggleSit={() => engineRef.current?.toggleTrainSit()}
                  onThrottleUp={() => engineRef.current?.throttleTrainUp()}
                  onThrottleDown={() => engineRef.current?.throttleTrainDown()}
                  onToggleReverse={() => engineRef.current?.toggleTrainReverse()}
                  onHonkHorn={() => engineRef.current?.honkTrainHorn()}
                  onToggleHeadlights={() => engineRef.current?.toggleTrainHeadlights()}
                  onToggleDoors={() => engineRef.current?.toggleTrainDoors()}
                  onCycleCamera={() => engineRef.current?.toggleTrainCamera()}
                />
              )}

              {/* Indian Railways Mega Terminal HUD & Level Quick-Nav */}
              <RailwayStationHUD
                isVisible={isStationHUDVisible}
                activeTrainInfo={liveStationTrainInfo}
                currentFloor={currentStationFloor}
                onSelectFloor={(fl) => {
                  setCurrentStationFloor(fl);
                  engineRef.current?.fastTravelToFloor(fl);
                }}
                onNavigateToFacility={(type) => {
                  engineRef.current?.navigateToStationFacility(type);
                }}
                onOpenTickets={() => setIsRailwayTicketsOpen(true)}
                onOpenOperations={() => setIsRailwayOperationsOpen(true)}
                onOpenDispatch={() => setIsTrainControlCenterOpen(true)}
                onOpenMap={() => setIsRailwayNetworkMapOpen(true)}
                onOpenJourney={() => setIsRailwayTicketsOpen(true)}
                onOpenPause={() => {
                  if (engineRef.current) engineRef.current.setPaused(true);
                  setIsPauseOpen(true);
                }}
                activeFacilityWaypoint={activeFacilityWaypoint}
              />

              {/* Horde Alert Event Banner */}
              <HordeAlertBanner event={hordeEvent} onDismiss={() => setHordeEvent(null)} />
            </>
          )}

          {/* Mobile Touch Overlay & Quick Shortcuts (hidden during Photo Mode) */}
          {!isPhotoMode && (
            <MobileControls
            onMoveChange={(move) => {
              if (engineRef.current) {
                engineRef.current.inputState.forward = move.forward;
                engineRef.current.inputState.backward = move.backward;
                engineRef.current.inputState.left = move.left;
                engineRef.current.inputState.right = move.right;
                engineRef.current.inputState.analogX = move.analogX ?? 0;
                engineRef.current.inputState.analogZ = move.analogZ ?? 0;
                engineRef.current.inputState.isAnalog = !!move.isAnalog;
              }
            }}
            onLookDelta={(dx, dy) => {
              if (engineRef.current) {
                const sens = (settings.mouseSensitivity || 1.0) * 0.004;
                engineRef.current.player.yaw -= dx * sens;
                engineRef.current.player.pitch = Math.max(
                  -1.2,
                  Math.min(1.2, engineRef.current.player.pitch - dy * sens)
                );
              }
            }}
            onZoomDelta={(delta) => {
              if (engineRef.current) {
                engineRef.current.player.adjustCameraDistance(delta);
              }
            }}
            onResetCamera={() => {
              if (engineRef.current) {
                engineRef.current.player.pitch = 0;
              }
            }}
            onJump={() => {
              if (engineRef.current) {
                engineRef.current.inputState.jump = true;
                setTimeout(() => {
                  if (engineRef.current) engineRef.current.inputState.jump = false;
                }, 120);
              }
            }}
            onSprintToggle={(sprint) => {
              if (engineRef.current) engineRef.current.inputState.sprint = sprint;
            }}
            isSprinting={engineRef.current?.player.isSprinting ?? false}
            onPrimaryAction={() => {
              if (engineRef.current) {
                const hasBolts = inventory.some((s) => s && s.item.id === 'crossbow_bolts' && s.count > 0);
                const consumeBolt = () => {
                  let c = false;
                  setInventory((p) => {
                    const i = p.findIndex((s) => s && s.item.id === 'crossbow_bolts' && s.count > 0);
                    if (i !== -1) {
                      const u = [...p];
                      const cur = u[i]!;
                      if (cur.count <= 1) u[i] = null;
                      else u[i] = { ...cur, count: cur.count - 1 };
                      c = true;
                      return u;
                    }
                    return p;
                  });
                  return c;
                };
                engineRef.current.handlePrimaryAction({
                  hasCrossbowBolts: hasBolts,
                  consumeBolt,
                });
              }
            }}
            onInteract={() => {
              if (engineRef.current) engineRef.current.handleInteractKey();
            }}
            interactionPrompt={interactionPrompt}
            onOpenInventory={() => {
              setIsInventoryOpen((prev) => !prev);
              soundEngine.playUIClick();
            }}
            onOpenCrafting={() => {
              setIsCraftingOpen((prev) => !prev);
              soundEngine.playUIClick();
            }}
            onOpenBuild={() => {
              setIsBuildOpen((prev) => !prev);
              soundEngine.playUIClick();
            }}
            onOpenMap={() => {
              setIsMapOpen((prev) => !prev);
              soundEngine.playUIClick();
            }}
            onOpenJournal={() => {
              setIsJournalOpen((prev) => !prev);
              soundEngine.playUIClick();
            }}
            onOpenCharacter={() => {
              setIsCharacterOpen((prev) => !prev);
              soundEngine.playUIClick();
            }}
            onToggleFlashlight={() => {
              if (engineRef.current) {
                const on = engineRef.current.player.toggleFlashlight();
                setIsFlashlightOn(on);
                soundEngine.playUIClick();
              }
            }}
            isFlashlightOn={isFlashlightOn}
            onToggleCameraView={() => {
              if (engineRef.current) {
                engineRef.current.player.toggleView();
                setCameraView(engineRef.current.player.cameraView);
                soundEngine.playUIClick();
              }
            }}
            cameraView={cameraView}
            onOpenMenu={() => {
              if (engineRef.current) engineRef.current.setPaused(true);
              setIsPauseOpen(true);
              soundEngine.playUIClick();
            }}
            isBuildingMode={!!engineRef.current?.buildingMgr.activeDef}
            onRotateBuilding={() => {
              if (engineRef.current) {
                engineRef.current.buildingMgr.rotatePreview();
                soundEngine.playUIClick();
              }
            }}
            onCancelBuilding={() => {
              if (engineRef.current) {
                engineRef.current.buildingMgr.cancelBuilding();
                soundEngine.playUIClick();
              }
            }}
            activeItemToolType={hotbar[selectedHotbarIndex]?.item.toolType || null}
            isDriving={!!activeVehicle}
            onExitVehicle={() => engineRef.current?.exitVehicle()}
            onToggleVehicleLights={() => engineRef.current?.toggleVehicleHeadlights()}
            isSwimming={stats.isSwimming ?? false}
            onDive={() => {
              if (engineRef.current) {
                engineRef.current.player.velocity.y = -3.5;
              }
            }}
            onToggleBioScanner={() => setIsBioScannerActive((prev) => !prev)}
            isBioScannerActive={isBioScannerActive}
            qualityMode={qualityMode}
            onCycleQualityMode={() => {
              soundEngine.playUIClick();
              setIsGraphicsManagerOpen(true);
            }}
            touchControlsMode={touchControlsMode}
            onToggleTouchControlsMode={handleToggleTouchControlsMode}
            onCrouchToggle={(crouch) => {
              if (engineRef.current) engineRef.current.inputState.crouch = crouch;
            }}
            isCrouching={engineRef.current?.inputState.crouch ?? false}
            onHonkHorn={() => soundEngine.playVehicleHorn()}
            />
          )}

          {/* Build Catalog Modal */}
          <BuildMenu
            isOpen={isBuildOpen}
            onClose={() => setIsBuildOpen(false)}
            inventory={[...inventory, ...hotbar]}
            onSelectStructure={(structDef: StructureDefinition) => {
              if (engineRef.current) {
                engineRef.current.buildingMgr.setBuildingMode(structDef.id);
              }
            }}
          />

          {/* Inventory Modal */}
          <InventoryModal
            isOpen={isInventoryOpen}
            onClose={() => setIsInventoryOpen(false)}
            inventory={inventory}
            hotbar={hotbar}
            onUseItem={handleUseItem}
            onDropItem={handleDropItem}
            onMoveToHotbar={handleMoveToHotbar}
            equippedArmorId={stats.equippedArmorId}
            equippedMaskId={stats.equippedMaskId}
            onOpenBlueprints={() => setIsBlueprintModalOpen(true)}
          />

          {/* Crafting Modal */}
          <CraftingModal
            isOpen={isCraftingOpen}
            onClose={() => setIsCraftingOpen(false)}
            stationType={craftingStation}
            inventory={[...inventory, ...hotbar]}
            onCraftRecipe={handleCraftRecipe}
          />

          {/* Radar Map Modal (Lazy) */}
          <Suspense fallback={null}>
            <MapModal
              isOpen={isMapOpen}
              onClose={() => setIsMapOpen(false)}
              playerPos={
                engineRef.current
                  ? [engineRef.current.player.position.x, engineRef.current.player.position.y, engineRef.current.player.position.z]
                  : [0, 0, 0]
              }
              playerYaw={engineRef.current ? engineRef.current.player.yaw : 0}
              safeZoneCenter={
                engineRef.current
                  ? [engineRef.current.buildingMgr.safeZoneCenter.x, 0, engineRef.current.buildingMgr.safeZoneCenter.z]
                  : [0, 0, 0]
              }
              safeZoneRadius={engineRef.current ? engineRef.current.buildingMgr.safeZoneRadius : 15}
              structures={engineRef.current ? engineRef.current.buildingMgr.structures : []}
              zombies={engineRef.current ? engineRef.current.zombieMgr.zombies : []}
              resources={engineRef.current ? engineRef.current.terrain.resources : []}
              discoveredChunks={engineRef.current ? engineRef.current.worldPersistence.discoveredChunks : new Set(['0_0'])}
              waypoints={engineRef.current ? engineRef.current.worldPersistence.waypoints : []}
              onAddWaypoint={(wp) => engineRef.current?.worldPersistence.addWaypoint(wp)}
              onRemoveWaypoint={(id) => engineRef.current?.worldPersistence.removeWaypoint(id)}
              earthLat={stats.latitude}
              earthLon={stats.longitude}
              realElevationMeters={stats.realElevationMeters}
              countryName={stats.countryName}
              continentOrOcean={stats.continentOrOcean}
              nearestCityName={stats.nearestCityName}
              globalCities={engineRef.current?.globalOutbreakSimulator.getCityStates()}
              globalMetrics={engineRef.current?.globalOutbreakSimulator.getGlobalMetrics()}
              onTravelToGeoCoordinate={(lat, lon, label) => {
                engineRef.current?.teleportToGeoCoordinate(lat, lon, label);
              }}
            />
          </Suspense>

          {/* Quest Journal Modal */}
          <QuestJournalModal
            isOpen={isJournalOpen}
            onClose={() => setIsJournalOpen(false)}
            quests={quests}
            currentDay={dayCount}
            prologuePhase={prologuePhase}
          />

          {/* Character Progression Modal */}
          <CharacterModal
            isOpen={isCharacterOpen}
            onClose={() => setIsCharacterOpen(false)}
            stats={stats}
            onUpgradeSkill={handleUpgradeSkill}
            onUnlockPerk={(perkId, cost) => engineRef.current?.unlockTalentPerk(perkId, cost)}
          />

          {/* Fishing Minigame Modal */}
          <FishingModal
            isOpen={isFishingOpen}
            onClose={() => setIsFishingOpen(false)}
            hasLuckyPerk={engineRef.current?.hasPerk('perk_fisherman_luck') ?? false}
            onCatchFish={(count) => {
              collectItem('raw_fish', count);
              engineRef.current?.callbacks.onBountyProgress?.('catch_fish', count);
            }}
          />

          {/* Blueprint Sharing, Salvage & Weapon Mods Modal */}
          <Suspense fallback={null}>
            <BlueprintManagerModal
              isOpen={isBlueprintModalOpen}
              onClose={() => setIsBlueprintModalOpen(false)}
              structures={engineRef.current?.buildingMgr.structures || []}
              playerPos={playerCoords}
              inventory={inventory}
              hotbar={hotbar}
              weaponMods={weaponMods}
              onDeployBlueprint={(items, name) => {
                if (engineRef.current) {
                  engineRef.current.buildingMgr.placeBlueprintStructures(items, playerCoords);
                  engineRef.current.callbacks.onInteractionPrompt(`Blueprint Deployed: ${name}`);
                }
              }}
              onSalvageItem={handleSalvageItem}
              onRepairItem={handleRepairItem}
              onAttachWeaponMod={handleAttachWeaponMod}
            />
          </Suspense>

          {/* Extraction Complete & NG+ Rebirth Victory Modal */}
          {isExtractionVictoryOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
              <div className="w-full max-w-md rounded-2xl border border-amber-500/50 bg-neutral-950 p-6 text-center text-neutral-100 shadow-2xl">
                <h2 className="text-2xl font-black tracking-wide text-amber-400">
                  Evacuation Complete
                </h2>
                <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                  You held the perimeter until the extraction signal stabilized. Continue into Rebirth NG+ Cycle {(stats.rebirthCount || 0) + 1} with your level, perks, and inventory intact, or stay in this world.
                </p>
                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      engineRef.current?.triggerRebirthNGPlus();
                      setIsExtractionVictoryOpen(false);
                    }}
                    className="w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-xs font-bold uppercase tracking-wider text-neutral-950 cursor-pointer"
                  >
                    Start Rebirth NG+ Cycle {(stats.rebirthCount || 0) + 1}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsExtractionVictoryOpen(false)}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 py-2.5 text-xs font-semibold text-neutral-200 cursor-pointer"
                  >
                    Continue Exploring Current World
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Storage Chest Modal */}
          <StorageChestModal
            isOpen={!!openChestStructure}
            onClose={() => setOpenChestStructure(null)}
            structure={openChestStructure}
            playerInventory={inventory}
            onTransferToChest={(invIndex) => {
              if (!openChestStructure || !openChestStructure.storageItems) return;
              const item = inventory[invIndex];
              if (!item) return;

              const emptyChestIdx = openChestStructure.storageItems.findIndex((s) => s === null);
              if (emptyChestIdx !== -1) {
                openChestStructure.storageItems[emptyChestIdx] = item;
                setInventory((prev) => {
                  const u = [...prev];
                  u[invIndex] = null;
                  return u;
                });
              }
            }}
            onTransferToInventory={(chestIndex) => {
              if (!openChestStructure || !openChestStructure.storageItems) return;
              const item = openChestStructure.storageItems[chestIndex];
              if (!item) return;

              const emptyInvIdx = inventory.findIndex((s) => s === null);
              if (emptyInvIdx !== -1) {
                setInventory((prev) => {
                  const u = [...prev];
                  u[emptyInvIdx] = item;
                  return u;
                });
                openChestStructure.storageItems[chestIndex] = null;
              }
            }}
          />

          <DialogueModal dialogue={activeDialogue} onClose={() => setActiveDialogue(null)} onChoice={(id, choice) => engineRef.current?.resolveSurvivorChoice(id, choice)} />

          <FriendInteractionModal
            friend={activeFriendModal}
            isOpen={!!activeFriendModal}
            onClose={() => setActiveFriendModal(null)}
            onAction={(action) => {
              if (activeFriendModal && engineRef.current) {
                engineRef.current.resolveSurvivorChoice(`friend_${activeFriendModal.id}`, action);
              }
            }}
          />

          {/* Sanctuary Notice Board Modal */}
          <NoticeBoardModal
            isOpen={isNoticeBoardOpen}
            onClose={() => setIsNoticeBoardOpen(false)}
            bounties={bounties}
            onClaimBounty={handleClaimBounty}
            dayCount={dayCount}
            biomeName={currentBiome.name}
            weather={weather}
          />

          {/* Pause Menu */}
          {isPauseOpen && (
            <PauseMenu
              isOpen={isPauseOpen}
              onResume={() => {
                if (engineRef.current) engineRef.current.setPaused(false);
                setIsPauseOpen(false);
              }}
              onSave={handleManualSave}
              onQuitToMenu={() => {
                if (engineRef.current) {
                  engineRef.current.triggerAutoSave();
                  engineRef.current.dispose();
                  engineRef.current = null;
                }
                setIsPauseOpen(false);
                setGameState('menu');
                getAllSaveSlots().then((slots) => setHasContinue(slots.length > 0));
              }}
              settings={settings}
              onUpdateSettings={setSettings}
              qualityMode={qualityMode}
              onSelectQualityMode={handleSelectQualityMode}
              diagnosticInfo={engineRef.current?.getDiagnosticInfo() ?? null}
              touchControlsMode={touchControlsMode}
              onSetTouchControlsMode={(mode) => {
                setTouchControlsMode(mode);
                try {
                  localStorage.setItem('last_sanctuary_touch_mode', mode);
                } catch {}
              }}
              onOpenAchievements={() => setIsAchievementsOpen(true)}
              onOpenCompendium={() => setIsCompendiumOpen(true)}
              onCaptureScreenshot={() => {
                if (engineRef.current) {
                  engineRef.current.setPaused(false);
                }
                setIsPauseOpen(false);
                requestAnimationFrame(() => handleCaptureScreenshot());
              }}
              keybinds={keybinds}
              onUpdateKeybinds={(next) => {
                setKeybinds(next);
                saveKeybinds(next);
              }}
              onResetKeybinds={() => setKeybinds(resetKeybinds())}
              sandboxSettings={sandboxSettings}
              onUpdateSandboxSettings={(patch) => {
                setSandboxSettings((prev) => {
                  const next = { ...prev, ...patch };
                  engineRef.current?.setSandboxSettings(next);
                  return next;
                });
              }}
              currentWeather={weather}
              onForceWeather={(w) => {
                if (!engineRef.current) return;
                if (w === 'auto') {
                  engineRef.current.weatherManager.clearManualOverride();
                } else {
                  engineRef.current.weatherManager.setWeather(w, true);
                  setWeather(w);
                  setWeatherIntensity(w === 'clear' ? 0.35 : 0.9 * (sandboxSettings.weatherIntensity ?? 1));
                }
              }}
              onOpenGraphicsManager={() => {
                setIsPauseOpen(false);
                if (engineRef.current) engineRef.current.setPaused(false);
                setIsGraphicsManagerOpen(true);
              }}
            />
          )}

          {/* Floor 3 Armory Vault Modal (100 Fictional Entries) */}
          <Suspense fallback={null}>
            <ArmoryCatalogModal
              isOpen={isArmoryOpen}
              onClose={() => setIsArmoryOpen(false)}
              onCollectItem={(item: ArmoryCatalogItem) => {
                setInventory((prev) => {
                  const updated = [...prev];
                  const emptyIdx = updated.findIndex((s) => s === null);
                  if (emptyIdx !== -1) {
                    updated[emptyIdx] = { item, count: 1 };
                  }
                  return updated;
                });
                if (engineRef.current) {
                  engineRef.current.callbacks.onInteractionPrompt(`Vault Item Retrieved: ${item.name}`);
                }
              }}
            />
          </Suspense>

          {/* Floor 1 Refrigerator Food Storage Modal */}
          <FridgeStorageModal
            isOpen={isFridgeOpen}
            onClose={() => setIsFridgeOpen(false)}
            onTakeItem={(itemId, count) => collectItem(itemId, count)}
            onConsumeDirectly={(hunger, thirst, name) => {
              setStats((prev) => {
                const updated = {
                  ...prev,
                  hunger: Math.min(100, prev.hunger + hunger),
                  thirst: Math.min(100, prev.thirst + thirst),
                };
                if (engineRef.current) {
                  engineRef.current.playerStats.hunger = updated.hunger;
                  engineRef.current.playerStats.thirst = updated.thirst;
                  engineRef.current.callbacks.onInteractionPrompt(`Enjoyed ${name}: Nourishment replenished.`);
                }
                return updated;
              });
            }}
          />

          {/* Floor 1 Smartphone Modal */}
          <PhoneModal
            isOpen={isPhoneOpen}
            onClose={() => setIsPhoneOpen(false)}
            day={dayCount}
            currentEventId={prologuePhase || undefined}
          />

          {/* Sub-Level 1 Basement Railway Operations Centre Modal */}
          <RailwayOperationsModal
            isOpen={isRailwayOperationsOpen}
            onClose={() => setIsRailwayOperationsOpen(false)}
            trainManager={engineRef.current?.aiTrainManager || null}
          />

          {/* Passenger Ticket Booking & Smart TVM Kiosk Modal */}
          <Suspense fallback={null}>
            <RailwayTicketModal
              isOpen={isRailwayTicketsOpen}
              onClose={() => setIsRailwayTicketsOpen(false)}
              playerCredits={500}
              activeTicket={activeRailwayTicket || undefined}
              onPurchaseTicket={(ticket) => {
                setActiveRailwayTicket(ticket);
                if (engineRef.current) {
                  engineRef.current.activeRailwayTicket = ticket;
                }
              }}
              onBoardTrainDirectly={(ticket) => {
                setActiveRailwayTicket(ticket);
                engineRef.current?.boardAssignedTrain(ticket);
                setIsRailwayTicketsOpen(false);
              }}
              onFastTravelToDestination={(destinationStation) => {
                engineRef.current?.fastTravelToStation(destinationStation);
                setIsRailwayTicketsOpen(false);
              }}
            />
          </Suspense>

          {/* India Dynamic Railway Network Glowing World Map Modal */}
          <IndiaRailwayNetworkModal
            isOpen={isRailwayNetworkMapOpen}
            onClose={() => setIsRailwayNetworkMapOpen(false)}
            onFastTravelToStation={(stationName) => {
              engineRef.current?.fastTravelToStation(stationName);
              setIsRailwayNetworkMapOpen(false);
            }}
          />

          {/* First-Floor Sanctuary Medical Clinic Modal */}
          <MedicalClinicModal
            isOpen={isMedicalClinicOpen}
            onClose={() => setIsMedicalClinicOpen(false)}
            health={stats.health}
            maxHealth={stats.maxHealth}
            firstAidKits={
              [...inventory, ...hotbar].reduce((acc, slot) => {
                if (slot && (slot.item.id === 'medkit' || slot.item.id === 'bandage')) {
                  return acc + slot.count;
                }
                return acc;
              }, 0)
            }
            onUseFirstAid={() => {
              if (stats.health >= stats.maxHealth) return;
              let consumed = false;
              setInventory((prev) => {
                const idx = prev.findIndex((s) => s && (s.item.id === 'medkit' || s.item.id === 'bandage'));
                if (idx !== -1) {
                  consumed = true;
                  const next = [...prev];
                  const slot = next[idx]!;
                  if (slot.count > 1) {
                    next[idx] = { ...slot, count: slot.count - 1 };
                  } else {
                    next[idx] = null;
                  }
                  return next;
                }
                return prev;
              });

              if (!consumed) {
                setHotbar((prev) => {
                  const idx = prev.findIndex((s) => s && (s.item.id === 'medkit' || s.item.id === 'bandage'));
                  if (idx !== -1) {
                    const next = [...prev];
                    const slot = next[idx]!;
                    if (slot.count > 1) {
                      next[idx] = { ...slot, count: slot.count - 1 };
                    } else {
                      next[idx] = null;
                    }
                    return next;
                  }
                  return prev;
                });
              }

              setStats((prev) => {
                const newHealth = Math.min(prev.maxHealth, prev.health + 25);
                if (engineRef.current) {
                  engineRef.current.playerStats.health = newHealth;
                  engineRef.current.callbacks.onInteractionPrompt(`Sanctuary Medical Clinic: Applied Medical Treatment (+25 HP). Health: ${Math.round(newHealth)}/${prev.maxHealth}`);
                }
                return { ...prev, health: newHealth };
              });
              soundEngine.playBuildSnap();
            }}
          />

          {/* Ground Floor Sanctuary Building Management & Defense Terminal Modal */}
          <ApartmentStatusModal
            isOpen={isApartmentStatusOpen}
            onClose={() => setIsApartmentStatusOpen(false)}
            compoundGateOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.compoundGateOpen ?? false}
            onToggleCompoundGate={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleCompoundGate();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Compound Gate: OPEN' : 'Compound Gate: CLOSED');
              }
            }}
            garageShutterOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.garageShutterOpen ?? false}
            onToggleGarageShutter={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleGarageShutter();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Backyard Garage Shutter: OPEN' : 'Backyard Garage Shutter: LOWERED');
              }
            }}
            frontDoorOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.state.doorOpen ?? false}
            onToggleFrontDoor={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleDoor();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Front Residence Doors: OPEN' : 'Front Residence Doors: CLOSED');
              }
            }}
            fanOn={engineRef.current?.prologueManager.townMgr.apartmentBuilding.state.fanOn ?? false}
            onToggleFan={() => {
              if (engineRef.current) {
                const on = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleFan();
                engineRef.current.callbacks.onInteractionPrompt(on ? 'Ceiling Fan: ACTIVE' : 'Ceiling Fan: STOPPED');
              }
            }}
            acOn={engineRef.current?.prologueManager.townMgr.apartmentBuilding.state.acOn ?? false}
            onToggleAC={() => {
              if (engineRef.current) {
                const on = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleAC();
                engineRef.current.callbacks.onInteractionPrompt(on ? 'Air Conditioner: ON' : 'Air Conditioner: OFF');
              }
            }}
            turretKills={
              engineRef.current?.prologueManager.townMgr.apartmentBuilding.turrets?.getTotalNeutralizedCount() ?? 0
            }
          />

          {/* Dedicated 5 km Security & Tactical Command Center */}
          <SecurityCommandCenterModal
            isOpen={isSecurityCommandCenterOpen}
            onClose={() => setIsSecurityCommandCenterOpen(false)}
            compoundGateOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.compoundGateOpen ?? false}
            onToggleCompoundGate={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleCompoundGate();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Compound Gate: OPEN' : 'Compound Gate: CLOSED');
              }
            }}
            vehicleGateOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.vehicleGateOpen ?? false}
            onToggleVehicleGate={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleVehicleGate();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Gate 4 Vehicle Entrance: OPEN' : 'Gate 4 Vehicle Entrance: CLOSED');
              }
            }}
            vehicleGate2Open={engineRef.current?.prologueManager.townMgr.apartmentBuilding.vehicleGate2Open ?? false}
            onToggleVehicleGate2={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleSecondVehicleGate();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Gate 5 North Vehicle Entrance: OPEN' : 'Gate 5 North Vehicle Entrance: CLOSED');
              }
            }}
            garageShutterOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.garageShutterOpen ?? false}
            onToggleGarageShutter={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleGarageShutter();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Backyard Garage Shutter: OPEN' : 'Backyard Garage Shutter: LOWERED');
              }
            }}
            frontDoorOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.state.doorOpen ?? false}
            onToggleFrontDoor={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleDoor();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Front Residence Doors: OPEN' : 'Front Residence Doors: CLOSED');
              }
            }}
            patioDoorOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.patioDoorOpen ?? true}
            onTogglePatioDoor={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.togglePatioDoor();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'Rear Patio Double Sliding Doors: OPEN' : 'Rear Patio Double Sliding Doors: CLOSED');
              }
            }}
            westPedestrianDoorOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.westPedestrianDoorOpen ?? false}
            onToggleWestPedestrianDoor={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleWestPedestrianDoor();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'West Pedestrian Gate: OPEN' : 'West Pedestrian Gate: CLOSED');
              }
            }}
            eastPedestrianDoorOpen={engineRef.current?.prologueManager.townMgr.apartmentBuilding.eastPedestrianDoorOpen ?? false}
            onToggleEastPedestrianDoor={() => {
              if (engineRef.current) {
                const open = engineRef.current.prologueManager.townMgr.apartmentBuilding.toggleEastPedestrianDoor();
                engineRef.current.callbacks.onInteractionPrompt(open ? 'East Pedestrian Gate: OPEN' : 'East Pedestrian Gate: CLOSED');
              }
            }}
            turrets={isSecurityCommandCenterOpen ? engineRef.current?.prologueManager.townMgr.apartmentBuilding.turrets?.getTurretsTelemetry() : undefined}
            radarEntities={(() => {
              if (!isSecurityCommandCenterOpen || !engineRef.current) return [];
              const aptOrigin = engineRef.current.prologueManager.townMgr.apartmentBuilding.group.position;
              const list: any[] = [];
              if (engineRef.current.zombieMgr?.zombies) {
                for (const z of engineRef.current.zombieMgr.zombies) {
                  if (z.state === 'dead') continue;
                  const dx = z.position[0] - aptOrigin.x;
                  const dz = z.position[2] - aptOrigin.z;
                  const dist = Math.hypot(dx, dz);
                  if (dist <= 5000) {
                    const angle = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
                    list.push({
                      id: z.id,
                      type: 'zombie',
                      name: `${z.type.toUpperCase()} ZOMBIE`,
                      distance: Math.round(dist),
                      angle: Math.round(angle),
                      dangerLevel: dist < 50 ? 'high' : dist < 300 ? 'medium' : 'low'
                    });
                  }
                }
              }
              if (engineRef.current.wildlifeManager?.creatures) {
                for (const c of engineRef.current.wildlifeManager.creatures) {
                  const dx = c.group.position.x - aptOrigin.x;
                  const dz = c.group.position.z - aptOrigin.z;
                  const dist = Math.hypot(dx, dz);
                  if (dist <= 5000) {
                    const angle = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
                    list.push({
                      id: c.id,
                      type: 'creature',
                      name: c.species.name.toUpperCase(),
                      distance: Math.round(dist),
                      angle: Math.round(angle),
                      dangerLevel: c.species.temperament === 'territorial' ? (dist < 80 ? 'high' : 'medium') : 'low'
                    });
                  }
                }
              }
              return list;
            })()}
            playerPosition={isSecurityCommandCenterOpen && engineRef.current ? [engineRef.current.player.position.x, engineRef.current.player.position.y, engineRef.current.player.position.z] : undefined}
          />

          {/* Apex Sanctuary Central Terminal Dashboard [O] */}
          {isBaseDashboardOpen && (liveBaseState || engineRef.current) && (
            <Suspense fallback={null}>
              <BaseManagementDashboardModal
                isOpen={isBaseDashboardOpen}
                onClose={() => setIsBaseDashboardOpen(false)}
                baseState={liveBaseState || engineRef.current!.getBaseState()}
                onToggleGenerator={() => {
                  engineRef.current?.toggleBaseGenerator();
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onToggleGateLock={() => {
                  engineRef.current?.toggleBaseGateLock();
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onToggleAlarm={() => {
                  engineRef.current?.toggleBaseAlarm();
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onAssignNpcRole={(npcId: string, role: NPCRole) => {
                  engineRef.current?.assignBaseNpcRole(npcId, role);
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onUnlockResearch={(techId: string) => {
                  engineRef.current?.unlockBaseResearch(techId);
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onUpgradeBaseLevel={() => {
                  engineRef.current?.upgradeBaseLevel();
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onDrawCleanWater={() => {
                  engineRef.current?.drawBaseCleanWater();
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
                onWithdrawRation={() => {
                  engineRef.current?.withdrawBaseRation();
                  if (engineRef.current) setLiveBaseState(engineRef.current.getBaseState());
                }}
              />
            </Suspense>
          )}

          {/* Central Train Control Dispatch Console [T] */}
          <Suspense fallback={null}>
            <TrainControlCenter
              isOpen={isTrainControlCenterOpen}
              onClose={() => setIsTrainControlCenterOpen(false)}
              engine={engineRef.current}
            />
          </Suspense>

          {/* Performance Diagnostics Overlay */}
          <PerformanceDiagnostic
            engine={engineRef.current}
            isOpen={isPerfOpen}
            onClose={() => setIsPerfOpen(false)}
            qualityMode={qualityMode}
            onSelectQualityMode={handleSelectQualityMode}
            onOpenGraphicsManager={() => setIsGraphicsManagerOpen(true)}
          />

          {/* Graphics & Stability Manager Modal */}
          <GraphicsManagerModal
            isOpen={isGraphicsManagerOpen}
            onClose={() => setIsGraphicsManagerOpen(false)}
            engine={engineRef.current}
            qualityMode={qualityMode}
            onSelectQualityMode={handleSelectQualityMode}
            onSyncViewDistance={(chunks) =>
              setSettings((prev) => ({
                ...prev,
                viewDistanceChunks: chunks,
              }))
            }
          />
        </>
      )}

      {/* 37 Biomes & Wildlife Field Compendium Modal [X] */}
      <Suspense fallback={null}>
        <FieldCompendiumModal
          isOpen={isCompendiumOpen}
          onClose={() => setIsCompendiumOpen(false)}
          codexState={codexState}
          currentBiomeId={gameState === 'playing' ? currentBiome.id : undefined}
        />
      </Suspense>

      {/* Achievements & Survival Summary Modal */}
      <Suspense fallback={null}>
        <AchievementsModal
          isOpen={isAchievementsOpen}
          onClose={() => setIsAchievementsOpen(false)}
          careerStats={careerStats}
          liveSummary={
            gameState === 'playing' && engineRef.current
              ? {
                  dayCount,
                  level: stats.level,
                  structuresCount: engineRef.current.buildingMgr.structures.length,
                  hordesDefeated: engineRef.current.nightHordesDefeated,
                  rescuedCount: engineRef.current.rescueManager.rescuedCount,
                  discoveredChunksCount: engineRef.current.worldPersistence.discoveredChunks.size,
                }
              : null
          }
        />
      </Suspense>

      {/* Offline Mode Connectivity Indicator */}
      <OfflineIndicator />
    </div>
  );
}
