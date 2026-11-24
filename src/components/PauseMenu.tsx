import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Save,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  X,
  Volume2,
  Eye,
  Smartphone,
  Keyboard,
  ShieldAlert,
  Sparkles,
  Monitor,
  Check,
  Zap,
  Award,
  Download,
  Upload,
  BookMarked,
  Camera,
} from 'lucide-react';
import {
  GameSettings,
  GraphicsQualityMode,
  KeybindAction,
  KeybindConfig,
  SandboxSettings,
  SaveSlotMetadata,
  WeatherType,
} from '../types/game';
import { soundEngine } from '../utils/audio';
import { getAllSaveSlots, downloadSaveSlotJson, validateAndImportSaveJson } from '../utils/storage';
import { DEFAULT_KEYBINDS, KEYBIND_LABELS, formatKeyCode } from '../utils/keybinds';

interface DiagnosticSnapshot {
  renderWidth: number;
  renderHeight: number;
  shadowMapRes: number;
  anisotropy: number;
  dpr: number;
  fps: number;
}

interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onSave: (slotId?: string, slotName?: string) => void;
  onQuitToMenu: () => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  qualityMode: GraphicsQualityMode;
  onSelectQualityMode: (mode: GraphicsQualityMode) => void;
  diagnosticInfo?: DiagnosticSnapshot | null;
  touchControlsMode?: 'auto' | 'always' | 'off';
  onSetTouchControlsMode?: (mode: 'auto' | 'always' | 'off') => void;
  onOpenAchievements?: () => void;
  onOpenCompendium?: () => void;
  onCaptureScreenshot?: () => void;
  keybinds?: KeybindConfig;
  onUpdateKeybinds?: (next: KeybindConfig) => void;
  onResetKeybinds?: () => void;
  sandboxSettings?: SandboxSettings;
  onUpdateSandboxSettings?: (patch: Partial<SandboxSettings>) => void;
  currentWeather?: WeatherType;
  onForceWeather?: (weather: WeatherType | 'auto') => void;
  onOpenGraphicsManager?: () => void;
}

interface QualityModeOption {
  id: GraphicsQualityMode;
  title: string;
  tierLabel: string;
  specs: string;
  description: string;
  chunkQuality: GameSettings['graphicsQuality'];
  isFlagship?: boolean;
}

const PICTURE_QUALITY_MODES: QualityModeOption[] = [
  {
    id: 'performance',
    title: 'Mode 1 · Smooth Performance',
    tierLabel: 'Zero-Lag Boost',
    specs: '1.0x Scale · Shadows Off · 1-Chunk Fast Stream',
    description: 'Maximizes frame rate stability and responsiveness on all mobile and desktop devices with zero hitching.',
    chunkQuality: 'low',
  },
  {
    id: 'balanced',
    title: 'Mode 2 · 4K Cinema Balanced',
    tierLabel: 'Balanced Clarity',
    specs: 'Up to 1.35x HiDPI · 2048px Shadows · 4x Anisotropy',
    description: 'Crisp HDR ACES lighting, soft PCF shadows, and 2-chunk terrain streaming tuned for smooth high-refresh play.',
    chunkQuality: 'medium',
  },
  {
    id: 'quality',
    title: 'Mode 3 · High Ultra 4K',
    tierLabel: 'Ultra 4K Detail',
    specs: 'Up to 1.65x Scale · HDR Bloom · 8x Anisotropy · 3-Chunk Horizon',
    description: 'Full-pipeline HDR bloom, sharp textures at grazing angles, and long-range architectural detail.',
    chunkQuality: 'high',
  },
  {
    id: 'ultra_5x',
    title: 'Mode 4 · Ultra Realistic 5x Max',
    tierLabel: '5x Better Realism',
    specs: 'Up to 2.0x Supersampling · 3072px Shadows · 16x AF · 4-Chunk Horizon',
    description: 'Maximum engine realism: hardware-clamped supersampling, 3K shadow maps, 16x texture filtering, enriched sky IBL reflections, and Anti-Lag Governor protection.',
    chunkQuality: 'ultra',
    isFlagship: true,
  },
];

export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onSave,
  onQuitToMenu,
  settings,
  onUpdateSettings,
  qualityMode,
  onSelectQualityMode,
  diagnosticInfo,
  touchControlsMode = 'auto',
  onSetTouchControlsMode,
  onOpenAchievements,
  onOpenCompendium,
  onCaptureScreenshot,
  keybinds = DEFAULT_KEYBINDS,
  onUpdateKeybinds,
  onResetKeybinds,
  sandboxSettings,
  onUpdateSandboxSettings,
  currentWeather = 'clear',
  onForceWeather,
  onOpenGraphicsManager,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'picture_quality' | 'settings' | 'controls' | 'save_slots'>('main');
  const [controlsCategory, setControlsCategory] = useState<'mobile' | 'desktop'>('desktop');
  const [rebindingAction, setRebindingAction] = useState<KeybindAction | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingSlots, setExistingSlots] = useState<SaveSlotMetadata[]>([]);
  const [confirmOverwriteSlot, setConfirmOverwriteSlot] = useState<{ id: string; name: string } | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!rebindingAction) return;
    const handleCaptureKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code !== 'Escape' && onUpdateKeybinds) {
        onUpdateKeybinds({ ...keybinds, [rebindingAction]: e.code });
        soundEngine.playBuildSnap();
      }
      setRebindingAction(null);
    };
    window.addEventListener('keydown', handleCaptureKey, { capture: true });
    return () => window.removeEventListener('keydown', handleCaptureKey, { capture: true });
  }, [rebindingAction, keybinds, onUpdateKeybinds]);

  useEffect(() => {
    if (isOpen) {
      loadSlots();
      setConfirmOverwriteSlot(null);
      setSaveError(null);
    }
  }, [isOpen]);

  const loadSlots = async () => {
    try {
      const slots = await getAllSaveSlots();
      setExistingSlots(slots);
    } catch (e) {
      console.warn('Failed to load slots in PauseMenu:', e);
    }
  };

  const handleExecuteSave = (slotId: string, slotName: string) => {
    onSave(slotId, slotName);
    soundEngine.playBuildSnap();
    setConfirmOverwriteSlot(null);
    setSaveMessage(`Game successfully saved to ${slotName}!`);
    loadSlots();
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleChooseQualityMode = (opt: QualityModeOption) => {
    soundEngine.playUIClick();
    onSelectQualityMode(opt.id);
    onUpdateSettings({
      ...settings,
      graphicsQuality: opt.chunkQuality,
    });
  };

  if (!isOpen) return null;

  const activeModeMeta = PICTURE_QUALITY_MODES.find((m) => m.id === qualityMode) || PICTURE_QUALITY_MODES[1];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2.5 sm:p-4">
      <div className="flex w-full max-w-xl max-h-[92dvh] flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-wide">Game Paused</h2>
            <p className="text-[10px] font-mono font-bold tracking-widest text-amber-400/90 mt-0.5">
              OWNER-ADITYA, MADE IN INDIA
            </p>
          </div>
          <button
            onClick={onResume}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab back bar */}
        {activeTab !== 'main' && (
          <div className="border-b border-neutral-800 px-4 sm:px-6 py-2 bg-neutral-900/40 flex items-center justify-between shrink-0">
            <button
              onClick={() => setActiveTab('main')}
              className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer"
            >
              ← Back to Pause Menu
            </button>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              {activeTab === 'picture_quality'
                ? 'Picture Quality'
                : activeTab === 'save_slots'
                ? 'Save Slots'
                : activeTab === 'controls'
                ? 'Controls'
                : 'Audio & Visual'}
            </span>
          </div>
        )}

        {/* Save confirmation / error toast */}
        {saveMessage && (
          <div className="bg-emerald-950/80 border-b border-emerald-800/80 px-6 py-2 text-xs font-semibold text-emerald-300 text-center shrink-0">
            {saveMessage}
          </div>
        )}
        {saveError && (
          <div className="bg-rose-950/80 border-b border-rose-800/80 px-6 py-2 text-xs font-semibold text-rose-300 text-center shrink-0">
            {saveError}
          </div>
        )}

        {/* Scrollable Content Tabs (Portrait & Landscape Safe) */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {activeTab === 'main' && (
            <div className="flex flex-col gap-2.5 sm:gap-3">
              <button
                onClick={onResume}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 py-3 text-sm font-bold uppercase tracking-wider text-neutral-950 transition-all cursor-pointer shadow-lg"
              >
                <Play className="h-4 w-4 fill-neutral-950" />
                <span>Resume Game</span>
              </button>

              {/* Dedicated Graphics & Stability Manager */}
              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  if (onOpenGraphicsManager) {
                    onOpenGraphicsManager();
                  } else {
                    setActiveTab('picture_quality');
                  }
                }}
                className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-neutral-900 via-amber-950/25 to-neutral-900 hover:border-amber-500/60 border border-amber-500/35 px-4 py-3 text-sm font-semibold text-neutral-100 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Graphics &amp; Stability Manager</span>
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400 whitespace-nowrap">
                  {activeModeMeta.tierLabel} →
                </span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  loadSlots();
                  setActiveTab('save_slots');
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
              >
                <Save className="h-4 w-4 text-emerald-400" />
                <span>Save Game to Slot</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('settings');
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
              >
                <SettingsIcon className="h-4 w-4 text-sky-400" />
                <span>Audio, Camera & Touch Settings</span>
              </button>

              <button
                onClick={() => {
                  soundEngine.playUIClick();
                  setActiveTab('controls');
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 text-amber-400" />
                <span>Controls &amp; Keybindings</span>
              </button>

              {onOpenCompendium && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUIClick();
                    onOpenCompendium();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
                >
                  <BookMarked className="h-4 w-4 text-emerald-400" />
                  <span>37 Biomes &amp; Wildlife Codex</span>
                </button>
              )}

              {onCaptureScreenshot && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUIClick();
                    onCaptureScreenshot();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-sky-400" />
                  <span>Capture 3D Screenshot (PNG)</span>
                </button>
              )}

              {onOpenAchievements && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUIClick();
                    onOpenAchievements();
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 py-2.5 sm:py-3 text-sm font-semibold text-neutral-200 transition-all cursor-pointer"
                >
                  <Award className="h-4 w-4 text-amber-400" />
                  <span>Achievements &amp; Survival Summary</span>
                </button>
              )}

              <div className="my-1 border-t border-neutral-800" />

              <button
                onClick={onQuitToMenu}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 py-2.5 sm:py-3 text-sm font-semibold text-rose-300 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Exit to Title Screen</span>
              </button>
            </div>
          )}

          {activeTab === 'picture_quality' && (
            <div className="flex flex-col gap-3">
              {/* Live Hardware Summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-900/80 border border-neutral-800 px-3.5 py-2.5 text-[11px]">
                <div className="flex items-center gap-2 text-neutral-200 font-semibold">
                  <Monitor className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>Active Pipeline: {activeModeMeta.tierLabel}</span>
                </div>
                {diagnosticInfo && (
                  <div className="font-mono text-[10px] text-neutral-400 tabular-nums">
                    {diagnosticInfo.renderWidth}×{diagnosticInfo.renderHeight} · {diagnosticInfo.dpr.toFixed(2)}x ·{' '}
                    {diagnosticInfo.shadowMapRes > 0 ? `${diagnosticInfo.shadowMapRes}px Shadows` : 'Shadows Off'} ·{' '}
                    {diagnosticInfo.anisotropy}x AF · {diagnosticInfo.fps} FPS
                  </div>
                )}
              </div>

              {onOpenGraphicsManager && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUIClick();
                    onOpenGraphicsManager();
                  }}
                  className="rounded-xl border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-950/50 px-3.5 py-2 text-xs font-bold text-cyan-300 flex items-center justify-between cursor-pointer"
                >
                  <span>Advanced Anti-Lag Governor, Render Scale &amp; VRAM Cache</span>
                  <span className="font-mono">Open Manager →</span>
                </button>
              )}

              {/* 4 Selectable Picture Quality Modes */}
              <div className="flex flex-col gap-2.5">
                {PICTURE_QUALITY_MODES.map((opt) => {
                  const isSelected = qualityMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleChooseQualityMode(opt)}
                      className={`flex flex-col gap-1.5 rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                        isSelected
                          ? opt.isFlagship
                            ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/10'
                            : 'bg-sky-500/10 border-sky-400 shadow-md'
                          : opt.isFlagship
                          ? 'bg-neutral-900/85 border-amber-500/35 hover:border-amber-400/70'
                          : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {opt.isFlagship ? (
                            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                          ) : (
                            <Zap className="h-4 w-4 text-sky-400 shrink-0" />
                          )}
                          <span className="text-xs sm:text-sm font-bold text-neutral-100 truncate">
                            {opt.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-[10px] font-mono font-semibold ${
                              opt.isFlagship ? 'text-amber-300' : 'text-neutral-400'
                            }`}
                          >
                            {opt.tierLabel}
                          </span>
                          {isSelected && (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-neutral-950">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-[10px] font-mono text-amber-300/90">{opt.specs}</div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed">{opt.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex flex-col gap-4">
              {/* Quick Link to Dedicated Picture Quality Section */}
              <div className="flex items-center justify-between rounded-xl bg-neutral-900/80 border border-neutral-800 px-3.5 py-2.5">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-amber-400" />
                    <span>Picture Quality Preset</span>
                  </span>
                  <span className="text-[10px] text-neutral-400">{activeModeMeta.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('picture_quality')}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold cursor-pointer"
                >
                  Select Mode
                </button>
              </div>

              {/* Master Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Master Volume</span>
                  </span>
                  <span className="font-mono tabular-nums">{Math.round(settings.masterVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.masterVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...settings, masterVolume: val };
                    onUpdateSettings(updated);
                    soundEngine.setVolumes(val, settings.sfxVolume, settings.musicVolume);
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* SFX Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="h-3.5 w-3.5 text-neutral-400" />
                    <span>Sound Effects Volume</span>
                  </span>
                  <span className="font-mono tabular-nums">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...settings, sfxVolume: val };
                    onUpdateSettings(updated);
                    soundEngine.setVolumes(settings.masterVolume, val, settings.musicVolume);
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Music Volume */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Atmospheric Ambience Volume</span>
                  <span className="font-mono">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    const updated = { ...settings, musicVolume: val };
                    onUpdateSettings(updated);
                    soundEngine.setVolumes(settings.masterVolume, settings.sfxVolume, val);
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Mouse Sensitivity */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Look & Touch Sensitivity</span>
                  <span className="font-mono">{settings.mouseSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="3.0"
                  step="0.1"
                  value={settings.mouseSensitivity}
                  onChange={(e) => {
                    onUpdateSettings({ ...settings, mouseSensitivity: parseFloat(e.target.value) });
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Field of View */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Camera Field of View (FOV)</span>
                  <span className="font-mono">{settings.fieldOfView}°</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="95"
                  step="1"
                  value={settings.fieldOfView}
                  onChange={(e) => {
                    onUpdateSettings({ ...settings, fieldOfView: parseInt(e.target.value) });
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Touch Controls Mode Setting */}
              {onSetTouchControlsMode && (
                <div className="flex flex-col gap-1.5 pt-1 border-t border-neutral-800">
                  <div className="flex justify-between text-xs font-semibold text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-cyan-400" />
                      <span>On-Screen Touch Controls</span>
                    </span>
                    <span className="font-mono uppercase text-cyan-400">{touchControlsMode}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {(['auto', 'always', 'off'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onSetTouchControlsMode(mode)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                          touchControlsMode === mode
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {mode === 'auto' ? 'Auto Detect' : mode === 'always' ? 'Always On' : 'Disabled'}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-neutral-500">
                    {touchControlsMode === 'auto'
                      ? 'Automatically shows on smartphones, tablets, and touch displays'
                      : touchControlsMode === 'always'
                      ? 'Forced on for all screens, laptops, and hybrid touchbooks'
                      : 'Hidden for pure keyboard & mouse desktop play'}
                  </span>
                </div>
              )}

              {/* View Distance Chunks */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-semibold text-neutral-300">
                  <span>Terrain Render View Distance</span>
                  <span className="font-mono tabular-nums">
                    {settings.viewDistanceChunks ?? 3} chunks (~{(settings.viewDistanceChunks ?? 3) * 64}m)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={settings.viewDistanceChunks ?? 3}
                  onChange={(e) => {
                    onUpdateSettings({
                      ...settings,
                      viewDistanceChunks: parseInt(e.target.value, 10),
                    });
                  }}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* HUD Coordinates Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">Show World Coordinates</span>
                  <span className="text-[10px] text-neutral-400">Display X / Z coordinates on top-right HUD</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      showCoordinates: !settings.showCoordinates,
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.showCoordinates ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.showCoordinates ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Camera Shake Accessibility Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-neutral-200">Camera Impact Shake</span>
                  <span className="text-[10px] text-neutral-400">Reduce motion for accessibility</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateSettings({
                      ...settings,
                      firstPersonCamera: !settings.firstPersonCamera,
                    });
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    !settings.firstPersonCamera ? 'bg-amber-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      !settings.firstPersonCamera ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Weather & Live Sandbox Overrides */}
              {(onForceWeather || (sandboxSettings && onUpdateSandboxSettings)) && (
                <div className="flex flex-col gap-3 pt-2 border-t border-neutral-800">
                  {onForceWeather && (
                    <div>
                      <div className="flex items-center justify-between text-xs font-semibold text-neutral-200 mb-1.5">
                        <span>Weather Pattern Control</span>
                        <span className="font-mono text-amber-400 capitalize">{currentWeather.replace('_', ' ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(['auto', 'clear', 'rain', 'thunderstorm', 'blizzard', 'sandstorm', 'toxic_fog'] as const).map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => onForceWeather(w)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize cursor-pointer whitespace-nowrap ${
                              w === currentWeather
                                ? 'bg-amber-500 text-neutral-950 font-bold'
                                : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                            }`}
                          >
                            {w.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {sandboxSettings && onUpdateSandboxSettings && (
                    <div className="flex flex-col gap-2 text-xs font-mono tabular-nums">
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
                          onChange={(e) => onUpdateSandboxSettings({ lootMultiplier: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-neutral-300 mb-1">
                          <span>Weather Intensity</span>
                          <span>{sandboxSettings.weatherIntensity.toFixed(1)}x</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2.0"
                          step="0.25"
                          value={sandboxSettings.weatherIntensity}
                          onChange={(e) => onUpdateSandboxSettings({ weatherIntensity: parseFloat(e.target.value) })}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-neutral-300 cursor-pointer font-sans">
                        <input
                          type="checkbox"
                          checked={sandboxSettings.infinitePower}
                          onChange={(e) => onUpdateSandboxSettings({ infinitePower: e.target.checked })}
                          className="accent-amber-500"
                        />
                        <span>Infinite Base Solar &amp; Generator Power</span>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'controls' && (
            <div className="flex flex-col gap-3">
              {/* Category Tab Selector */}
              <div className="flex rounded-xl bg-neutral-900 p-1 border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setControlsCategory('mobile')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    controlsCategory === 'mobile'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Mobile & Touch Controls</span>
                </button>
                <button
                  type="button"
                  onClick={() => setControlsCategory('desktop')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    controlsCategory === 'desktop'
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  <span>Desktop Keyboard & Mouse</span>
                </button>
              </div>

              {controlsCategory === 'mobile' ? (
                <div className="flex flex-col gap-2 text-xs max-h-72 overflow-y-auto pr-1">
                  {[
                    { control: 'Left Thumbstick', action: '360° Analog Walk / Run. Drag outward to lock sprint.' },
                    { control: 'Screen Drag', action: 'Rotate camera view, aim crosshair, look around 360°.' },
                    { control: 'Two-Finger Pinch', action: 'Pinch screen in/out to adjust camera zoom distance.' },
                    { control: 'ACTION Button', action: 'Attack predators, chop trees, mine ores, fire crossbow, place blueprints.' },
                    { control: 'INTERACT Button', action: 'Enter vehicle/train, open doors, loot crates, talk, sleep in bed.' },
                    { control: 'JUMP / SURFACE', action: 'Leap over obstacles on land, or surface to breathe when swimming.' },
                    { control: 'SNEAK / CROUCH', action: 'Silent stealth mode on land, or dive down underwater.' },
                    { control: 'Tap HUD Cards', action: 'Tap Vitals for Stats, tap Coords for Map, tap Quest banner for Journal.' },
                    { control: 'ACTIONS Drawer', action: 'Opens Backpack, Build Catalog, Map Radar, Flashlight & Camera.' },
                    { control: 'Hotbar Slots (1-8)', action: 'Tap any weapon, tool, food, or water bottle to select.' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-3 rounded-lg bg-neutral-900/60 p-2.5 border border-neutral-800/60"
                    >
                      <span className="font-bold text-amber-400 bg-neutral-800 px-2 py-0.5 rounded text-[11px] shrink-0">
                        {item.control}
                      </span>
                      <span className="text-neutral-300 font-medium text-right text-[11px]">{item.action}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2 text-xs max-h-72 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between pb-1.5 border-b border-neutral-800">
                    <span className="text-[11px] text-neutral-400">
                      {rebindingAction
                        ? `Press any key for "${KEYBIND_LABELS[rebindingAction]}" (Esc to cancel)...`
                        : 'Click any binding button to remap it to a new key.'}
                    </span>
                    {onResetKeybinds && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUIClick();
                          onResetKeybinds();
                        }}
                        className="rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1 text-[11px] font-semibold text-neutral-300 cursor-pointer whitespace-nowrap"
                      >
                        Reset Defaults
                      </button>
                    )}
                  </div>
                  {(Object.keys(KEYBIND_LABELS) as KeybindAction[]).map((action) => (
                    <div
                      key={action}
                      className="flex items-center justify-between rounded-lg bg-neutral-900/60 px-3 py-2 border border-neutral-800/60"
                    >
                      <span className="text-neutral-300 font-medium">{KEYBIND_LABELS[action]}</span>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUIClick();
                          setRebindingAction(action);
                        }}
                        className={`font-mono font-bold px-2.5 py-1 rounded border text-[11px] cursor-pointer whitespace-nowrap ${
                          rebindingAction === action
                            ? 'bg-amber-500 text-neutral-950 border-amber-300'
                            : 'bg-neutral-800 text-amber-400 border-neutral-700 hover:border-amber-500/60'
                        }`}
                      >
                        {rebindingAction === action ? 'Press Key...' : formatKeyCode(keybinds[action])}
                      </button>
                    </div>
                  ))}
                  <div className="mt-1 flex items-center justify-between rounded-lg bg-neutral-900/40 px-3 py-2 border border-neutral-800/50 text-[11px] text-neutral-400">
                    <span>Vehicle / Train Horn &amp; Headlights</span>
                    <span className="font-mono text-neutral-300">H / L</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'save_slots' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                <div>
                  <span className="text-xs uppercase font-bold text-neutral-400">
                    Select Save Slot
                  </span>
                  <span className="block text-[10px] font-mono text-neutral-500">
                    Independent Story Checkpoints &amp; JSON Backups
                  </span>
                </div>

                <div>
                  <input
                    ref={importInputRef}
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
                        setSaveError(null);
                        setSaveMessage(`Imported "${imported.name}" into local saves.`);
                        setTimeout(() => setSaveMessage(null), 3500);
                      } catch (err: any) {
                        setSaveError(err?.message || 'Failed to import save JSON.');
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => importInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-200 cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5 text-amber-400" />
                    <span>Import JSON</span>
                  </button>
                </div>
              </div>

              {/* Slot List */}
              <div className="flex flex-col gap-2.5 max-h-80 overflow-y-auto pr-1">
                {[
                  { id: 'slot_1', label: 'Slot 1' },
                  { id: 'slot_2', label: 'Slot 2' },
                  { id: 'slot_3', label: 'Slot 3' },
                  { id: 'autosave', label: 'Autosave Slot' },
                ].map((slotDef) => {
                  const existing = existingSlots.find((s) => s.id === slotDef.id);
                  return (
                    <div
                      key={slotDef.id}
                      className="flex flex-col rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 hover:border-neutral-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-100">{slotDef.label}</span>
                            {existing?.isFreeExploration ? (
                              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.2 rounded">
                                Free Exploration
                              </span>
                            ) : existing?.missionNumber ? (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/40 px-1.5 py-0.2 rounded">
                                Day {existing.campaignDay} • M{existing.missionNumber}
                              </span>
                            ) : null}
                          </div>

                          {existing ? (
                            <div className="text-[11px] text-neutral-300 mt-1">
                              {existing.missionTitle ? `${existing.missionTitle} • ` : ''}
                              {existing.progressPercent !== undefined ? `${existing.progressPercent}% complete` : ''}
                              <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                {existing.timeString} • {new Date(existing.timestamp).toLocaleDateString()}{' '}
                                {new Date(existing.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-500 italic mt-0.5 block">Empty Save Slot</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {existing && (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await downloadSaveSlotJson(slotDef.id);
                                if (ok) {
                                  setSaveError(null);
                                  setSaveMessage(`Exported ${slotDef.label} as JSON backup.`);
                                  setTimeout(() => setSaveMessage(null), 3000);
                                } else {
                                  setSaveError(`Could not export ${slotDef.label}.`);
                                }
                              }}
                              className="rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 p-1.5 text-neutral-300 hover:text-amber-300 cursor-pointer"
                              title="Export Save JSON"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              if (existing) {
                                setConfirmOverwriteSlot({ id: slotDef.id, name: slotDef.label });
                              } else {
                                handleExecuteSave(slotDef.id, slotDef.label);
                              }
                            }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow ${
                              existing
                                ? 'bg-amber-600 hover:bg-amber-500 text-neutral-950'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {existing ? 'Overwrite' : 'Save Slot'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Overwrite Confirmation Overlay */}
              {confirmOverwriteSlot && (
                <div className="rounded-xl border border-rose-900/80 bg-rose-950/40 p-3.5 flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-bold">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Overwrite Confirmation: {confirmOverwriteSlot.name}</span>
                  </div>
                  <p className="text-[11px] text-neutral-300 leading-relaxed">
                    This slot already contains saved progression. Overwriting will replace it with your current storyline checkpoint.
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleExecuteSave(confirmOverwriteSlot.id, confirmOverwriteSlot.name)}
                      className="rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 cursor-pointer shadow"
                    >
                      Confirm Overwrite
                    </button>
                    <button
                      onClick={() => setConfirmOverwriteSlot(null)}
                      className="rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs px-3 py-1.5 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
