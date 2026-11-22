/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { DialogueModal } from './components/DialogueModal';
import { SurvivorDialogue } from './engine/SurvivorRescueManager';
import { HUD } from './components/HUD';
import { MainMenu } from './components/MainMenu';
import { BuildMenu } from './components/BuildMenu';
import { InventoryModal } from './components/InventoryModal';
import { CraftingModal } from './components/CraftingModal';
import { MapModal } from './components/MapModal';
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
import { PerformanceDiagnostic, GraphicsQualityMode } from './components/PerformanceDiagnostic';
import { ProloguePhase, PrologueSubtitle } from './types/prologue';
import { 
  FullGameSave, 
  PlayerStats, 
  InventorySlot, 
  Quest, 
  GameSettings, 
  StructureDefinition, 
  PlacedStructure, 
  CraftingRecipe, 
  Difficulty, 
  GameMode,
  VehicleState,
  CompanionState,
  EcosystemDossier,
  EcosystemMetrics
} from './types/game';
import { ObjectiveNavigationState } from './types/physics';
import { ITEMS } from './data/items';
import { INITIAL_QUESTS } from './data/quests';
import { ArmoryCatalogModal } from './components/ArmoryCatalogModal';
import { FridgeStorageModal } from './components/FridgeStorageModal';
import { PhoneModal } from './components/PhoneModal';
import { RailwayOperationsModal } from './components/RailwayOperationsModal';
import { MedicalClinicModal } from './components/MedicalClinicModal';
import { ApartmentStatusModal } from './components/ApartmentStatusModal';
import { ArmoryCatalogItem } from './data/armoryCatalog';
import { saveGameToSlot, loadGameFromSlot, getAllSaveSlots } from './utils/storage';
import { soundEngine } from './utils/audio';

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
  const [isFridgeOpen, setIsFridgeOpen] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isRailwayOperationsOpen, setIsRailwayOperationsOpen] = useState(false);
  const [isMedicalClinicOpen, setIsMedicalClinicOpen] = useState(false);
  const [isApartmentStatusOpen, setIsApartmentStatusOpen] = useState(false);

  // Performance Diagnostics Overlay State & Graphics Quality Preset
  const [isPerfOpen, setIsPerfOpen] = useState(false);
  const [qualityMode, setQualityMode] = useState<GraphicsQualityMode>(() => {
    try {
      const stored = localStorage.getItem('last_sanctuary_quality_preset');
      if (stored === 'performance' || stored === 'balanced' || stored === 'quality') return stored;
    } catch {}
    return 'auto';
  });

  const handleCycleQualityMode = useCallback(() => {
    setQualityMode((prev) => {
      const modes: GraphicsQualityMode[] = ['auto', 'performance', 'balanced', 'quality'];
      const nextIdx = (modes.indexOf(prev) + 1) % modes.length;
      const nextMode = modes[nextIdx];
      if (engineRef.current) {
        engineRef.current.setQualityMode(nextMode);
      }
      try {
        localStorage.setItem('last_sanctuary_quality_preset', nextMode);
      } catch {}
      return nextMode;
    });
  }, []);

  const [trainHUDData, setTrainHUDData] = useState<any | null>(null);

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

  // Settings
  const [settings, setSettings] = useState<GameSettings>({
    masterVolume: 0.7,
    sfxVolume: 0.8,
    musicVolume: 0.4,
    mouseSensitivity: 1.0,
    fieldOfView: 70,
    showCoordinates: true,
    graphicsQuality: 'high',
    firstPersonCamera: false,
    viewDistanceChunks: 3,
  });

  // Check for existing save on mount
  useEffect(() => {
    getAllSaveSlots().then((slots) => {
      if (slots.length > 0) setHasContinue(true);
    });
  }, []);

  // Sync camera FOV and shake settings
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.camera.fov = settings.fieldOfView;
      engineRef.current.camera.updateProjectionMatrix();
      engineRef.current.player.enableCameraShake = !settings.firstPersonCamera;
    }
  }, [settings.fieldOfView, settings.firstPersonCamera]);

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
    (initialSave: FullGameSave | null, seed: number = 42, mode: GameMode = 'survival', diff: Difficulty = 'standard') => {
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

      const callbacks = {
        onStatsChange: (newStats: PlayerStats) => setStats(newStats),
        onTimeChange: (mins: number, days: number, night: boolean, dusk: boolean) => {
          setTimeMinutes(mins);
          setDayCount(days);
          setIsNight(night);
          setIsDusk(dusk);
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
        onGameOver: () => setGameState('gameover'),
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
        onOpenMedicalClinic: () => setIsMedicalClinicOpen(true),
        onOpenApartmentStatus: () => setIsApartmentStatusOpen(true),
        onTrainChange: (data: any | null) => setTrainHUDData(data),
      };

      try {
        const engine = new GameEngine(canvasMountRef.current, initialSave, callbacks, seed);
        engine.gameMode = mode;
        engine.difficulty = diff;
        engine.quests = initialSave ? initialSave.quests : [...INITIAL_QUESTS];

        // If new game started in open-world survival or creative mode without story, complete story campaign directly
        if (!initialSave && mode !== 'story') {
          engine.prologueManager.completeCampaign();
        }

        engineRef.current = engine;
        setGameState('playing');
      } catch (err) {
        console.error('Failed to initialize 3D GameEngine:', err);
      }
    },
    [collectItem]
  );

  const startNewGame = (config: { characterName: string; difficulty: Difficulty; gameMode: GameMode; seed: number }) => {
    launchEngine(null, config.seed, config.gameMode, config.difficulty);
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

      // Key mappings
      if (code === 'KeyW') engine.inputState.forward = true;
      if (code === 'KeyS') engine.inputState.backward = true;
      if (code === 'KeyA') engine.inputState.left = true;
      if (code === 'KeyD') engine.inputState.right = true;
      if (code === 'Space') engine.inputState.jump = true;
      if (code === 'ShiftLeft' || code === 'ShiftRight') engine.inputState.sprint = true;

      // Number keys 1-8 for hotbar
      if (e.key >= '1' && e.key <= '8') {
        const slotIdx = parseInt(e.key) - 1;
        setSelectedHotbarIndex(slotIdx);
        soundEngine.playUIClick();
      }

      // Modals and action keys
      if (code === 'KeyB') {
        setIsBuildOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyI') {
        setIsInventoryOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyM') {
        setIsMapOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyJ') {
        setIsJournalOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyC') {
        setIsCharacterOpen((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyV') {
        engine.player.toggleView();
        setCameraView(engine.player.cameraView);
        soundEngine.playUIClick();
      } else if (code === 'KeyZ') {
        setIsBioScannerActive((prev) => !prev);
        soundEngine.playUIClick();
      } else if (code === 'KeyF') {
        if (engine.vehicleManager?.vehicleState.isOccupied) {
          engine.exitVehicle();
        } else {
          const active = engine.player.toggleFlashlight();
          setIsFlashlightOn(active);
          soundEngine.playUIClick();
        }
      } else if (code === 'KeyH') {
        if (engine.aiTrainManager?.activeDrivableTrain) engine.honkTrainHorn();
      } else if (code === 'KeyL') {
        if (engine.aiTrainManager?.activeDrivableTrain) {
          engine.toggleTrainHeadlights();
        } else if (engine.vehicleManager?.vehicleState.isOccupied) {
          engine.toggleVehicleHeadlights();
        }
      } else if (code === 'KeyK') {
        if (engine.vehicleManager) {
          engine.toggleVehicleLock();
        }
      } else if (code === 'KeyR') {
        if (engine.buildingMgr.activeDef) {
          engine.buildingMgr.rotatePreview();
          soundEngine.playUIClick();
        }
      } else if (code === 'KeyE') {
        engine.handleInteractKey();
      } else if (code === 'F3') {
        engine.physicsManager.toggleDebugMode();
        soundEngine.playUIClick();
      } else if (code === 'Escape') {
        // Close open modals first, otherwise pause
        if (
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
          isMedicalClinicOpen ||
          isApartmentStatusOpen ||
          !!activeDialogue ||
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
          setIsMedicalClinicOpen(false);
          setIsApartmentStatusOpen(false);
          setActiveDialogue(null);
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
      if (code === 'KeyW') engine.inputState.forward = false;
      if (code === 'KeyS') engine.inputState.backward = false;
      if (code === 'KeyA') engine.inputState.left = false;
      if (code === 'KeyD') engine.inputState.right = false;
      if (code === 'Space') engine.inputState.jump = false;
      if (code === 'ShiftLeft' || code === 'ShiftRight') engine.inputState.sprint = false;
    };

    // Mouse Look / Pointer Lock
    const isModalActive = isPauseOpen || isInventoryOpen || isBuildOpen || isMapOpen || isNoticeBoardOpen || isArmoryOpen || isFridgeOpen || isPhoneOpen || !!activeDialogue;

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

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        // Left click action in world
        const engine = engineRef.current;
        if (!engine || isModalActive) return;

        // Check if cursor clicked on a UI button/overlay
        if ((e.target as HTMLElement).closest('.pointer-events-auto')) return;

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
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
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
    activeDialogue,
    openChestStructure,
    inventory,
    settings.mouseSensitivity,
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

    // 3. Update quest progress if crafting hammer or weapon
    if (engineRef.current) {
      if (recipe.resultItemId === 'builder_hammer') {
        engineRef.current.updateQuestProgress('craft_hammer', 1);
      } else if (recipe.resultItemId === 'stun_baton' || recipe.resultItemId === 'pulse_crossbow') {
        engineRef.current.updateQuestProgress('craft_weapon', 1);
      }
    }
  };

  // Consume / Use Item from backpack
  const handleUseItem = (slotIndex: number, isFromHotbar: boolean) => {
    const list = isFromHotbar ? hotbar : inventory;
    const slot = list[slotIndex];
    if (!slot) return;

    const item = slot.item;
    let applied = false;

    if (item.hungerRestore) {
      setStats((prev) => ({
        ...prev,
        hunger: Math.min(100, prev.hunger + (item.hungerRestore || 0)),
      }));
      applied = true;
    }
    if (item.thirstRestore) {
      setStats((prev) => ({
        ...prev,
        thirst: Math.min(100, prev.thirst + (item.thirstRestore || 0)),
      }));
      applied = true;
    }
    if (item.healthRestore) {
      setStats((prev) => ({
        ...prev,
        health: Math.min(prev.maxHealth, prev.health + (item.healthRestore || 0)),
      }));
      applied = true;
    }
    if (item.staminaRestore) {
      setStats((prev) => ({
        ...prev,
        stamina: Math.min(prev.maxStamina, prev.stamina + (item.staminaRestore || 0)),
      }));
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
    setStats((prev) => ({
      ...prev,
      skillPoints: prev.skillPoints - 1,
      skills: {
        ...prev.skills,
        [key]: prev.skills[key] + 1,
      },
    }));
  };

  const handleManualSave = () => {
    if (engineRef.current) {
      engineRef.current.triggerAutoSave();
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black select-none font-sans">
      {/* Three.js Isolated Canvas Mount (Persistent Ref) */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {/* Title / Main Menu */}
      {gameState === 'menu' && (
        <MainMenu
          onStartNewGame={startNewGame}
          onContinueGame={continueGame}
          onLoadSaveSlot={loadSaveSlot}
          hasContinue={hasContinue}
        />
      )}

      {/* Game Over Screen */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="flex flex-col items-center rounded-2xl border border-rose-900 bg-neutral-950 p-8 text-center text-neutral-100 max-w-md shadow-2xl">
            <h2 className="text-3xl font-black tracking-wider text-rose-500 uppercase">
              Sanctuary Fallen
            </h2>
            <p className="mt-2 text-xs text-neutral-400">
              The infected broke through your defenses and overwhelmed the sanctuary compound on Day {dayCount}.
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

          <HUD
            stats={stats}
            timeMinutes={timeMinutes}
            dayCount={dayCount}
            isNight={isNight}
            isDusk={isDusk}
            interactionPrompt={interactionPrompt}
            hotbar={hotbar}
            selectedIndex={selectedHotbarIndex}
            onSelectSlot={(idx) => {
              setSelectedHotbarIndex(idx);
              soundEngine.playUIClick();
            }}
            activeQuest={quests.find((q) => !q.completed) || null}
            cameraView={cameraView}
            isFlashlightOn={isFlashlightOn}
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
            onCycleQualityMode={handleCycleQualityMode}
            touchControlsMode={touchControlsMode}
            onToggleTouchControlsMode={handleToggleTouchControlsMode}
            onInteract={() => {
              if (engineRef.current) engineRef.current.handleInteractKey();
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

          {/* Active Drivable Locomotive Train HUD */}
          {trainHUDData && (
            <TrainHUD
              hudData={trainHUDData}
              onExitTrain={() => engineRef.current?.exitPassengerTrain()}
            />
          )}

          {/* Horde Alert Event Banner */}
          <HordeAlertBanner event={hordeEvent} onDismiss={() => setHordeEvent(null)} />

          {/* Mobile Touch Overlay & Quick Shortcuts */}
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
            onCycleQualityMode={handleCycleQualityMode}
            touchControlsMode={touchControlsMode}
            onToggleTouchControlsMode={handleToggleTouchControlsMode}
            onCrouchToggle={(crouch) => {
              if (engineRef.current) engineRef.current.inputState.crouch = crouch;
            }}
            isCrouching={engineRef.current?.inputState.crouch ?? false}
            onHonkHorn={() => soundEngine.playVehicleHorn()}
          />

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
          />

          {/* Crafting Modal */}
          <CraftingModal
            isOpen={isCraftingOpen}
            onClose={() => setIsCraftingOpen(false)}
            stationType={craftingStation}
            inventory={[...inventory, ...hotbar]}
            onCraftRecipe={handleCraftRecipe}
          />

          {/* Radar Map Modal */}
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
          />

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
          />

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

          {/* Sanctuary Notice Board Modal */}
          <NoticeBoardModal
            isOpen={isNoticeBoardOpen}
            onClose={() => setIsNoticeBoardOpen(false)}
          />

          {/* Pause Menu */}
          <PauseMenu
            isOpen={isPauseOpen}
            onResume={() => {
              if (engineRef.current) engineRef.current.setPaused(false);
              setIsPauseOpen(false);
            }}
            onSave={handleManualSave}
            onQuitToMenu={() => {
              if (engineRef.current) {
                engineRef.current.dispose();
                engineRef.current = null;
              }
              setIsPauseOpen(false);
              setGameState('menu');
            }}
            settings={settings}
            onUpdateSettings={setSettings}
            touchControlsMode={touchControlsMode}
            onSetTouchControlsMode={(mode) => {
              setTouchControlsMode(mode);
              try {
                localStorage.setItem('last_sanctuary_touch_mode', mode);
              } catch {}
            }}
          />

          {/* Floor 3 Armory Vault Modal (100 Fictional Entries) */}
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

          {/* Performance Diagnostics Overlay */}
          <PerformanceDiagnostic
            engine={engineRef.current}
            isOpen={isPerfOpen}
            onClose={() => setIsPerfOpen(false)}
            qualityMode={qualityMode}
            onSelectQualityMode={(mode) => {
              setQualityMode(mode);
              if (engineRef.current) {
                engineRef.current.setQualityMode(mode);
              }
            }}
          />
        </>
      )}
    </div>
  );
}
