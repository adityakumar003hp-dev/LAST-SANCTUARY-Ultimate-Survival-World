import React, { useState, useEffect, useRef } from 'react';
import { Play, FolderOpen, HelpCircle, Shield, Award, Sparkles, X, Trash2, AlertTriangle, Database, Download, Upload, BookMarked, Sliders, Trophy } from 'lucide-react';
import { Difficulty, GameMode, SandboxSettings, SaveSlotMetadata } from '../types/game';
import { getAllSaveSlots, deleteSaveSlot, downloadSaveSlotJson, validateAndImportSaveJson } from '../utils/storage';
import { getLeaderboardRuns, LeaderboardEntry } from '../utils/blueprintShare';
import { soundEngine } from '../utils/audio';
import { seedAllVerificationTestSaves } from '../utils/checkpointTestSaves';
import { PWAInstallButton } from './PWAInstallButton';

interface MainMenuProps {
  onStartNewGame: (config: {
    characterName: string;
    difficulty: Difficulty;
    gameMode: GameMode;
    seed: number;
    sandboxSettings: SandboxSettings;
  }) => void;
  onContinueGame: () => void;
  onLoadSaveSlot: (slotId: string) => void;
  onOpenAchievements?: () => void;
  onOpenCompendium?: () => void;
  hasContinue: boolean;
  isLaunching?: boolean;
  launchError?: string | null;
  onDismissError?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartNewGame,
  onContinueGame,
  onLoadSaveSlot,
  onOpenAchievements,
  onOpenCompendium,
  hasContinue,
  isLaunching = false,
  launchError = null,
  onDismissError,
}) => {
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [showSandboxDrawer, setShowSandboxDrawer] = useState(false);
  const [leaderboardRuns, setLeaderboardRuns] = useState<LeaderboardEntry[]>([]);
  const [saveSlots, setSaveSlots] = useState<SaveSlotMetadata[]>([]);
  const [confirmDeleteSlot, setConfirmDeleteSlot] = useState<SaveSlotMetadata | null>(null);
  const [isSeedingTestSaves, setIsSeedingTestSaves] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Game Form
  const [characterName, setCharacterName] = useState('Survivor');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');
  const [gameMode, setGameMode] = useState<GameMode>('survival');
  const [seed, setSeed] = useState(42);
  const [sandboxSettings, setSandboxSettings] = useState<SandboxSettings>({
    lootMultiplier: 1.0,
    zombieDensity: 1.0,
    dayLengthMultiplier: 1.0,
    weatherIntensity: 1.0,
    friendlyFire: false,
    permadeath: false,
    infinitePower: false,
  });

  useEffect(() => {
    loadSlots();
    setLeaderboardRuns(getLeaderboardRuns());
  }, []);

  const loadSlots = async () => {
    const slots = await getAllSaveSlots();
    setSaveSlots(slots);
  };

  const handleLaunchNew = () => {
    if (isLaunching) return;
    soundEngine.playBuildSnap();
    setShowNewGameModal(false);
    onStartNewGame({
      characterName,
      difficulty,
      gameMode,
      seed,
      sandboxSettings,
    });
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center overflow-y-auto overflow-x-hidden bg-neutral-950 font-sans select-none px-4 py-6 [@media(max-height:540px)]:py-3">
      {/* Apocalyptic Ambient Background Grid & Vignette */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-950/20 via-neutral-950/80 to-black pointer-events-none" />
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="relative z-10 my-auto flex w-full max-w-2xl flex-col items-center">
        {/* Hero Branding */}
        <div className="flex flex-col items-center text-center px-2 sm:px-4 mb-5 sm:mb-8 [@media(max-height:540px)]:mb-3">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-400 mb-3 sm:mb-4 shadow-lg">
            <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span>OPEN-WORLD SURVIVAL & FORTIFICATION SIMULATION</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-7xl [@media(max-height:500px)]:text-3xl font-black tracking-tight text-neutral-100 drop-shadow-2xl">
            LAST SANCTUARY
          </h1>
          <h2 className="text-lg sm:text-2xl md:text-3xl [@media(max-height:500px)]:text-lg font-extrabold tracking-widest text-amber-500 mt-1 uppercase">
            REBIRTH
          </h2>
          <div className="mt-2.5 sm:mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-neutral-900/90 px-3 sm:px-3.5 py-1 text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.18em] text-neutral-100 shadow-lg">
            <span className="inline-flex h-2.5 w-4 overflow-hidden rounded-[2px] border border-white/20 shrink-0 flex-col">
              <span className="h-1/3 w-full bg-[#FF9933]" />
              <span className="h-1/3 w-full bg-white" />
              <span className="h-1/3 w-full bg-[#138808]" />
            </span>
            <span className="text-amber-400">OWNER-ADITYA, MADE IN INDIA</span>
          </div>
          <p className="mt-3 sm:mt-4 max-w-lg text-xs sm:text-sm text-neutral-400 leading-relaxed [@media(max-height:460px)]:hidden">
            Harvest wild resources, establish defensive perimeters, construct fortified shelters, and defend humanity’s final haven against nightly zombie hordes.
          </p>
        </div>

        {/* Launch Error Banner (Prevents Silent Failures) */}
        {launchError && (
          <div className="mb-4 flex w-full max-w-md items-start gap-2.5 rounded-xl border border-rose-500/50 bg-rose-950/90 px-4 py-3 text-xs text-rose-100 shadow-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-bold text-rose-300">Unable to Start 3D World</div>
              <p className="mt-0.5 text-rose-200/90 leading-relaxed">{launchError}</p>
            </div>
            {onDismissError && (
              <button
                onClick={onDismissError}
                className="rounded p-1 text-rose-300 hover:text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Main Menu Action Buttons */}
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full max-w-xs px-2 sm:px-4">
          <button
            onClick={() => {
              soundEngine.playUIClick();
              setGameMode('story');
              setShowNewGameModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:brightness-110 py-3 sm:py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider text-neutral-950 transition-all cursor-pointer shadow-xl shadow-amber-500/25 border border-amber-300/40"
          >
            <Sparkles className="h-4 w-4 text-neutral-950 shrink-0" />
            <span>Story: The Beginning of the End</span>
          </button>

          {hasContinue && (
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onContinueGame();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-neutral-100 transition-all cursor-pointer shadow-lg"
            >
              <Play className="h-4 w-4 fill-amber-400 text-amber-400 shrink-0" />
              <span>Continue Saved Game</span>
            </button>
          )}

          <button
            onClick={() => {
              soundEngine.playUIClick();
              setGameMode('survival');
              setShowNewGameModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
          >
            <Shield className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>Open World Survival Sandbox</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              loadSlots();
              setShowLoadModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-300 transition-all cursor-pointer"
          >
            <FolderOpen className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>Load Game Slot</span>
          </button>

          <button
            onClick={() => {
              soundEngine.playUIClick();
              setShowControlsModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-300 transition-all cursor-pointer"
          >
            <HelpCircle className="h-4 w-4 text-neutral-400 shrink-0" />
            <span>Survivor Guide &amp; Controls</span>
          </button>

          {onOpenCompendium && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUIClick();
                onOpenCompendium();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-300 transition-all cursor-pointer"
            >
              <BookMarked className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>37 Biomes &amp; Wildlife Codex</span>
            </button>
          )}

          {onOpenAchievements && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUIClick();
                onOpenAchievements();
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-300 transition-all cursor-pointer"
            >
              <Award className="h-4 w-4 text-amber-400 shrink-0" />
              <span>Achievements &amp; Career</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playUIClick();
              setLeaderboardRuns(getLeaderboardRuns());
              setShowHallOfFame(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-800 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-neutral-300 transition-all cursor-pointer"
          >
            <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Survival Hall of Fame</span>
          </button>

          <PWAInstallButton />
        </div>

        {/* Footer Details (In flow so short viewports never overlap buttons) */}
        <div className="mt-5 sm:mt-8 pb-2 flex flex-col items-center gap-1.5 text-xs font-mono text-neutral-500 px-4 text-center">
          <span className="text-amber-400/90 font-bold tracking-widest">OWNER-ADITYA, MADE IN INDIA</span>
          <div className="flex flex-wrap items-center justify-center gap-2 text-[10px] sm:text-[11px] text-neutral-500">
            <span>Three.js 3D Engine</span>
            <span aria-hidden="true">·</span>
            <a
              href="/guide.html"
              className="text-neutral-400 hover:text-amber-400 underline underline-offset-4 transition-colors"
            >
              Survival Guide
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/sitemap.html"
              className="text-neutral-400 hover:text-amber-400 underline underline-offset-4 transition-colors"
            >
              Site Map
            </a>
          </div>
        </div>
      </div>

      {/* --- New Game Configuration Modal --- */}
      {showNewGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="flex w-full max-w-lg max-h-[90dvh] overflow-y-auto flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-4 sm:p-6 text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold">Initialize New Sanctuary</h3>
              <button
                onClick={() => setShowNewGameModal(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {/* Character Name */}
              <div>
                <label className="text-xs uppercase font-bold text-neutral-400 block mb-1">
                  Survivor Designation
                </label>
                <input
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Game Mode */}
              <div>
                <label className="text-xs uppercase font-bold text-neutral-400 block mb-1">
                  Simulation Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { id: 'story', title: 'Story Campaign', desc: 'The Beginning of the End: 13-chapter origin story' },
                    { id: 'survival', title: 'Survival RPG', desc: 'Resource gathering, hunger, night horde assault' },
                    { id: 'creative', title: 'Creative Builder', desc: 'Infinite health & peaceful base construction' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setGameMode(mode.id as GameMode)}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        gameMode === mode.id
                          ? 'border-amber-400 bg-amber-500/20 shadow-md shadow-amber-500/10'
                          : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                      }`}
                    >
                      <span className="text-xs font-bold text-neutral-100">{mode.title}</span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-xs uppercase font-bold text-neutral-400 block mb-1">
                  World Hostility Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'explorer', label: 'Explorer' },
                    { id: 'standard', label: 'Standard' },
                    { id: 'survivor', label: 'Survivor' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id as Difficulty)}
                      className={`rounded-xl border py-2 text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        difficulty === d.id
                          ? 'border-amber-400 bg-amber-500 text-neutral-950 font-bold'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* World Seed */}
              <div>
                <label className="text-xs uppercase font-bold text-neutral-400 block mb-1">
                  Procedural World Seed
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(parseInt(e.target.value) || 42)}
                    className="flex-1 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm font-mono text-neutral-100 focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    onClick={() => setSeed(Math.floor(Math.random() * 90000) + 1000)}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 cursor-pointer"
                  >
                    Randomize
                  </button>
                </div>
              </div>

              {/* Sandbox Customizer Drawer */}
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50">
                <button
                  type="button"
                  onClick={() => setShowSandboxDrawer((v) => !v)}
                  className="flex w-full items-center justify-between px-3.5 py-2.5 text-xs font-bold text-neutral-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="h-3.5 w-3.5 text-amber-400" />
                    <span>Sandbox Rules Customizer</span>
                  </span>
                  <span className="text-[11px] font-mono text-amber-400">
                    {showSandboxDrawer ? 'Hide' : 'Configure'}
                  </span>
                </button>
                {showSandboxDrawer && (
                  <div className="border-t border-neutral-800 p-3.5 flex flex-col gap-3 text-xs font-mono tabular-nums">
                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Loot Yield Multiplier</span>
                        <span>{sandboxSettings.lootMultiplier.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="3.0"
                        step="0.25"
                        value={sandboxSettings.lootMultiplier}
                        onChange={(e) =>
                          setSandboxSettings((s) => ({ ...s, lootMultiplier: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Zombie Horde Density</span>
                        <span>{sandboxSettings.zombieDensity.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.25"
                        value={sandboxSettings.zombieDensity}
                        onChange={(e) =>
                          setSandboxSettings((s) => ({ ...s, zombieDensity: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Daylight Cycle Duration</span>
                        <span>{sandboxSettings.dayLengthMultiplier.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.25"
                        value={sandboxSettings.dayLengthMultiplier}
                        onChange={(e) =>
                          setSandboxSettings((s) => ({ ...s, dayLengthMultiplier: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-neutral-300 mb-1">
                        <span>Weather Storm Intensity</span>
                        <span>{sandboxSettings.weatherIntensity.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="2.0"
                        step="0.25"
                        value={sandboxSettings.weatherIntensity}
                        onChange={(e) =>
                          setSandboxSettings((s) => ({ ...s, weatherIntensity: parseFloat(e.target.value) }))
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3 pt-1 font-sans">
                      <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sandboxSettings.permadeath}
                          onChange={(e) => setSandboxSettings((s) => ({ ...s, permadeath: e.target.checked }))}
                          className="accent-rose-500"
                        />
                        <span>Permadeath</span>
                      </label>
                      <label className="flex items-center gap-2 text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sandboxSettings.infinitePower}
                          onChange={(e) => setSandboxSettings((s) => ({ ...s, infinitePower: e.target.checked }))}
                          className="accent-amber-500"
                        />
                        <span>Infinite Base Power</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Start Button */}
              <button
                onClick={handleLaunchNew}
                className="mt-2 w-full rounded-xl bg-amber-500 hover:bg-amber-400 py-3.5 text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all cursor-pointer shadow-lg shadow-amber-500/20"
              >
                Awaken Survivor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Survival Hall of Fame (LocalStorage) --- */}
      {showHallOfFame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="flex w-full max-w-lg max-h-[86dvh] flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-5 text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold">Survival Hall of Fame</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHallOfFame(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4 flex-1 overflow-y-auto flex flex-col gap-2">
              {leaderboardRuns.length === 0 ? (
                <div className="py-10 text-center text-xs text-neutral-500">
                  No completed or fallen runs recorded on this device yet. Survive, extract, or fall in battle to log your career score.
                </div>
              ) : (
                leaderboardRuns.map((run, idx) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-4 py-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-neutral-100">
                        #{idx + 1} · {run.survivorName} {run.extracted ? '(Extracted)' : '(Fallen)'}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-400 tabular-nums mt-0.5">
                        Day {run.daysSurvived} · {run.kills} Kills · {run.bosses} Bosses · NG+ {run.rebirths}
                      </div>
                    </div>
                    <span className="font-mono text-[11px] uppercase text-amber-400">{run.difficulty}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Load Game Modal --- */}
      {showLoadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="flex max-h-[88dvh] w-full max-w-xl flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-4 sm:p-6 text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-lg font-bold">Saved Sanctuary Worlds</h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Exact storyline checkpoints, objectives, inventory and world restoration
                </p>
              </div>
              <button
                onClick={() => {
                  setShowLoadModal(false);
                  setConfirmDeleteSlot(null);
                }}
                className="rounded-lg p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Test Checkpoints Seeder & JSON Import Bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-800/40 bg-amber-950/20 px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-200">
                  Test Checkpoints or JSON Backup Restore
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const raw = await file.text();
                      const imported = await validateAndImportSaveJson(raw);
                      await loadSlots();
                      soundEngine.playBuildSnap();
                      setSaveStatus({
                        type: 'success',
                        text: `Imported "${imported.name}" successfully.`,
                      });
                    } catch (err: any) {
                      setSaveStatus({
                        type: 'error',
                        text: err?.message || 'Failed to import save file.',
                      });
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-[11px] font-semibold px-2.5 py-1 transition-all cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5 text-amber-400" />
                  <span>Import JSON</span>
                </button>
                <button
                  onClick={async () => {
                    setIsSeedingTestSaves(true);
                    await seedAllVerificationTestSaves();
                    await loadSlots();
                    setIsSeedingTestSaves(false);
                    soundEngine.playBuildSnap();
                    setSaveStatus({ type: 'success', text: 'Verification checkpoint saves seeded.' });
                  }}
                  disabled={isSeedingTestSaves}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 transition-all cursor-pointer shadow disabled:opacity-50"
                >
                  {isSeedingTestSaves ? 'Seeding...' : 'Seed Test Saves'}
                </button>
              </div>
            </div>

            {saveStatus && (
              <div
                className={`mt-2.5 rounded-xl border px-3.5 py-2 text-xs font-medium ${
                  saveStatus.type === 'success'
                    ? 'border-emerald-800/70 bg-emerald-950/60 text-emerald-300'
                    : 'border-rose-800/70 bg-rose-950/60 text-rose-300'
                }`}
              >
                {saveStatus.text}
              </div>
            )}

            {/* Slot List */}
            <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-2.5">
              {saveSlots.length > 0 ? (
                saveSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 hover:border-neutral-700 transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-neutral-100">{slot.name}</span>
                        {slot.isFreeExploration ? (
                          <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950 border border-cyan-800/60 px-2 py-0.5 rounded">
                            Free Exploration
                          </span>
                        ) : slot.missionNumber ? (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-950 border border-amber-800/60 px-2 py-0.5 rounded">
                            Day {slot.campaignDay || slot.dayCount} • M{slot.missionNumber.toString().padStart(2, '0')}
                          </span>
                        ) : null}
                      </div>

                      {slot.missionTitle && (
                        <div className="text-xs font-semibold text-neutral-200 mt-1">
                          {slot.missionTitle}
                          {slot.progressPercent !== undefined && (
                            <span className="text-neutral-400 font-normal ml-1.5">
                              ({slot.progressPercent}% complete)
                            </span>
                          )}
                        </div>
                      )}

                      {slot.checkpointId && (
                        <div className="text-[11px] text-amber-400/80 font-mono mt-0.5">
                          Checkpoint: {slot.checkpointId}
                        </div>
                      )}

                      <div className="text-[11px] text-neutral-500 font-mono mt-1">
                        {slot.difficulty.toUpperCase()} • {slot.timeString} • {new Date(slot.timestamp).toLocaleDateString()} {new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          soundEngine.playUIClick();
                          onLoadSaveSlot(slot.id);
                        }}
                        className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-neutral-950 cursor-pointer shadow transition-transform active:scale-95"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await downloadSaveSlotJson(slot.id);
                          setSaveStatus(
                            ok
                              ? { type: 'success', text: `Exported "${slot.name}" as JSON backup.` }
                              : { type: 'error', text: 'Could not read save slot for export.' }
                          );
                        }}
                        className="rounded-lg p-2 text-neutral-400 hover:text-amber-300 hover:bg-neutral-800 cursor-pointer transition-colors"
                        title="Export Save JSON"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          soundEngine.playUIClick();
                          setConfirmDeleteSlot(slot);
                        }}
                        className="rounded-lg p-2 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 cursor-pointer transition-colors"
                        title="Delete Save"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-neutral-500 py-12">
                  <p>No saved sanctuary worlds detected.</p>
                  <p className="mt-1 text-neutral-600">Import a JSON backup or click &ldquo;Seed Test Saves&rdquo; above!</p>
                </div>
              )}
            </div>

            {/* Delete Confirmation Overlay */}
            {confirmDeleteSlot && (
              <div className="rounded-xl border border-rose-900/80 bg-rose-950/60 p-4 flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>Delete Save Slot: {confirmDeleteSlot.name}?</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Are you sure you want to delete this save slot? This action is permanent and cannot be undone.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={async () => {
                      await deleteSaveSlot(confirmDeleteSlot.id);
                      setConfirmDeleteSlot(null);
                      await loadSlots();
                    }}
                    className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-1.5 cursor-pointer shadow"
                  >
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmDeleteSlot(null)}
                    className="rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs px-3.5 py-1.5 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Controls Modal --- */}
      {showControlsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
          <div className="flex w-full max-w-lg max-h-[90dvh] overflow-y-auto flex-col rounded-2xl bg-neutral-950 border border-neutral-800 shadow-2xl p-4 sm:p-6 text-neutral-100">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-lg font-bold">Survivor Controls & Keybindings</h3>
              <button
                onClick={() => setShowControlsModal(false)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2 text-xs">
              {[
                { key: 'W / A / S / D', action: 'Move Survivor / Drive Vehicle or Boat' },
                { key: 'L-Ctrl', action: 'Crouch Stealth / Swim Dive' },
                { key: 'Tab', action: 'Quick-Swap Melee / Ranged Hotbar Slot' },
                { key: 'G / U', action: 'Throw Molotov or Flare / Cast Fishing Rod' },
                { key: '[', action: 'Toggle Emergency Ham Radio & Bounties' },
                { key: 'Left Click', action: 'Attack / Headshot / Harvest / Place Structure' },
                { key: 'Space / Shift', action: 'Jump or Surface / Sprint' },
                { key: 'E', action: 'Interact (Gates, Stashes, Salvage Bench, Beacon, Vehicles)' },
                { key: 'H / L', action: 'Vehicle or Train Horn / Headlights' },
                { key: 'B / I / C / K', action: 'Build / Backpack / Stats & Perks / Craft' },
                { key: 'M / N / V / P', action: 'Map / Minimap / Camera Perspective / Photo Mode' },
                { key: 'Q / F / Z', action: 'Quick-Heal / Flashlight / Bio-Scanner' },
                { key: 'R / 1-8', action: 'Rotate Blueprint / Equip Hotbar Slot' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-neutral-900/60 px-3 py-2 border border-neutral-800/60"
                >
                  <span className="font-mono font-bold text-amber-400 bg-neutral-800 px-2 py-0.5 rounded">
                    {item.key}
                  </span>
                  <span className="text-neutral-300 font-medium">{item.action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
