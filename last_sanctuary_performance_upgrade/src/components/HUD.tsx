import React from 'react';
import { 
  Heart, 
  Zap, 
  Apple, 
  Droplet, 
  Shield, 
  Sun, 
  Moon, 
  Compass, 
  Hammer, 
  Package, 
  User, 
  Map as MapIcon, 
  BookOpen, 
  Eye, 
  Flashlight,
  Terminal,
  Navigation,
  Sunrise,
  Activity,
  Smartphone,
  Pause,
  BookMarked,
  Train,
  Camera,
  Radar,
  Gamepad2,
  HeartPulse,
  CloudRain,
  CloudLightning,
  Snowflake,
  Wind,
  AlertTriangle,
  BatteryCharging,
  Radio,
  Wrench,
  Skull,
  Tv
} from 'lucide-react';
import {
  PlayerStats,
  InventorySlot,
  Quest,
  GraphicsQualityMode,
  WeatherType,
  FloatingDamageNumber,
  SupplyDropState,
} from '../types/game';
import { ExtractionState } from '../engine/world/WorldEventsManager';
import { EarthProjection } from '../engine/geo/EarthProjection';

interface HUDProps {
  stats: PlayerStats;
  timeMinutes: number;
  dayCount: number;
  isNight: boolean;
  isDusk: boolean;
  interactionPrompt: string | null;
  autoSaveToast?: string | null;
  onInteract?: () => void;
  hotbar: (InventorySlot | null)[];
  selectedIndex: number;
  onSelectSlot: (index: number) => void;
  activeQuest: Quest | null;
  cameraView: 'first' | 'third' | 'second';
  isFlashlightOn: boolean;
  biomeName?: string;
  playerPos?: [number, number, number];
  onOpenBuild: () => void;
  onOpenInventory: () => void;
  onOpenCharacter: () => void;
  onOpenMap: () => void;
  onOpenJournal: () => void;
  onOpenBaseDashboard?: () => void;
  onToggleCamera: () => void;
  onZoomCamera?: (delta: number) => void;
  onToggleFlashlight: () => void;
  onOpenPause: () => void;
  companion?: import('../types/game').CompanionState | null;
  onToggleCompanionOrder?: () => void;
  ecosystemDossier?: import('../types/game').EcosystemDossier | null;
  onLogSpeciesDossier?: (agentId: string) => void;
  ecosystemMetrics?: import('../types/game').EcosystemMetrics | null;
  isBioScannerActive?: boolean;
  onToggleBioScanner?: () => void;
  navigationState?: import('../types/physics').ObjectiveNavigationState | null;
  onToggleHitboxDebug?: () => void;
  onTogglePerfDiagnostic?: () => void;
  isPerfOpen?: boolean;
  qualityMode?: GraphicsQualityMode;
  onCycleQualityMode?: () => void;
  touchControlsMode?: 'auto' | 'always' | 'off';
  onToggleTouchControlsMode?: () => void;
  showCoordinates?: boolean;
  onOpenTrainControl?: () => void;
  onOpenCompendium?: () => void;
  onToggleMinimap?: () => void;
  isMinimapOpen?: boolean;
  onEnterPhotoMode?: () => void;
  onQuickHeal?: () => void;
  onQuickEat?: () => void;
  onQuickDrink?: () => void;
  quickCounts?: { med: number; food: number; water: number };
  isGamepadConnected?: boolean;
  biomeTempC?: number;
  weather?: WeatherType;
  weatherIntensity?: number;
  damageNumbers?: FloatingDamageNumber[];
  hitmarkerActive?: boolean;
  bossStatus?: { name: string; health: number; maxHealth: number } | null;
  supplyDrop?: SupplyDropState | null;
  extraction?: ExtractionState | null;
  isCrouching?: boolean;
  isRadioOpen?: boolean;
  onToggleRadio?: () => void;
  onOpenMediaDashboard?: () => void;
  mediaBreakingBanner?: string | null;
  onOpenBlueprints?: () => void;
  onTriggerRebirth?: () => void;
}

const HUD_WEATHER_PARTICLES = Array.from({ length: 22 }, (_, idx) => {
  const seed = (idx * 37 + 13) % 100;
  const alt = (idx * 53 + 7) % 100;
  return {
    id: idx,
    leftPct: (idx * 4.7 + (seed % 9)) % 98,
    topPct: (alt * 0.93) % 95,
    durationSec: 0.72 + (seed % 10) * 0.055,
    snowDurationSec: 4.5 + (seed % 8) * 0.6,
    delaySec: -((idx * 0.37) % 4.5),
    sizePx: 3 + (alt % 4),
  };
});

export const HUD: React.FC<HUDProps> = ({
  stats,
  timeMinutes,
  dayCount,
  isNight,
  isDusk,
  interactionPrompt,
  autoSaveToast = null,
  hotbar,
  selectedIndex,
  onSelectSlot,
  activeQuest,
  cameraView,
  isFlashlightOn,
  biomeName = 'Sanctuary Valley',
  playerPos = [0, 0, 0],
  onOpenBuild,
  onOpenInventory,
  onOpenCharacter,
  onOpenMap,
  onOpenJournal,
  onOpenBaseDashboard,
  onToggleCamera,
  onZoomCamera,
  onToggleFlashlight,
  companion,
  onToggleCompanionOrder,
  ecosystemDossier,
  onLogSpeciesDossier,
  ecosystemMetrics,
  isBioScannerActive,
  onToggleBioScanner,
  navigationState,
  onToggleHitboxDebug,
  onTogglePerfDiagnostic,
  isPerfOpen = false,
  qualityMode = 'balanced',
  onCycleQualityMode,
  touchControlsMode = 'auto',
  onToggleTouchControlsMode,
  onOpenPause,
  onInteract,
  showCoordinates = true,
  onOpenTrainControl,
  onOpenCompendium,
  onToggleMinimap,
  isMinimapOpen = false,
  onEnterPhotoMode,
  onQuickHeal,
  onQuickEat,
  onQuickDrink,
  quickCounts,
  isGamepadConnected = false,
  biomeTempC,
  weather = 'clear',
  weatherIntensity,
  damageNumbers = [],
  hitmarkerActive = false,
  bossStatus = null,
  supplyDrop = null,
  extraction = null,
  isCrouching = false,
  isRadioOpen = false,
  onToggleRadio,
  onOpenMediaDashboard,
  mediaBreakingBanner,
  onOpenBlueprints,
  onTriggerRebirth,
}) => {
  const hours = Math.floor(timeMinutes / 60);
  const mins = Math.floor(timeMinutes % 60);
  const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  const isDawn = hours >= 5 && hours < 8;
  const qualityBadgeLabel =
    qualityMode === 'absolute_realism'
      ? 'REALISM MAX'
      : qualityMode === 'ultra_5x'
      ? 'ULTRA 5X'
      : qualityMode === 'quality'
      ? 'ULTRA 4K'
      : qualityMode === 'balanced'
      ? '4K BAL'
      : 'PERF';

  const firstIncompleteObj = activeQuest?.objectives.find((o) => !o.completed);
  const isCriticalHealth = stats.health < 30;
  const isCriticalOxygen = (stats.oxygen ?? 100) < 25;
  const isLowNeed = !isCriticalHealth && !isCriticalOxygen && (stats.hunger < 20 || stats.thirst < 20);

  const rawWeatherIntensity =
    weatherIntensity ?? stats.weatherIntensity ?? (weather === 'clear' ? 0.35 : 0.85);
  const normalizedWeatherIntensity = Math.max(0, Math.min(1, rawWeatherIntensity / 1.25));
  const weatherIndicatorOpacity = Number(
    Math.max(
      0.32,
      Math.min(
        1,
        weather === 'clear'
          ? 0.4 + normalizedWeatherIntensity * 0.45
          : 0.35 + normalizedWeatherIntensity * 0.65
      )
    ).toFixed(2)
  );
  const visibilityPct = Math.round(stats.visibilityPercent ?? 100);
  const hungerDrainPct = Math.round(((stats.hungerDrainModifier ?? 1) - 1) * 100);
  const thirstDrainPct = Math.round(((stats.thirstDrainModifier ?? 1) - 1) * 100);
  const activeParticleCount = Math.max(8, Math.round(10 + normalizedWeatherIntensity * 12));

  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden font-sans">
      {/* --- Atmospheric HUD Weather Particle Overlay --- */}
      {!stats.isSubmerged && weather !== 'clear' && normalizedWeatherIntensity > 0.05 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[5] overflow-hidden transition-opacity duration-500"
          style={{ opacity: Number((0.25 + normalizedWeatherIntensity * 0.68).toFixed(2)) }}
        >
          {weather === 'blizzard' && (
            <div className="absolute inset-0 shadow-[inset_0_0_95px_rgba(186,230,253,0.34)]" />
          )}
          {(weather === 'rain' || weather === 'thunderstorm') && (
            <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(56,189,248,0.18)]" />
          )}
          {weather === 'sandstorm' && (
            <div className="absolute inset-0 bg-amber-900/12 shadow-[inset_0_0_95px_rgba(217,119,6,0.28)]" />
          )}
          {weather === 'toxic_fog' && (
            <div className="absolute inset-0 bg-lime-950/12 shadow-[inset_0_0_95px_rgba(132,204,22,0.25)]" />
          )}

          {HUD_WEATHER_PARTICLES.slice(0, activeParticleCount).map((p) => {
            if (weather === 'rain' || weather === 'thunderstorm') {
              return (
                <span
                  key={p.id}
                  className="absolute -top-10 w-[1.5px] h-9 rounded-full bg-gradient-to-b from-transparent via-sky-200/75 to-sky-100/95 animate-hud-rain"
                  style={{
                    left: `${p.leftPct}%`,
                    animationDuration: `${(weather === 'thunderstorm' ? p.durationSec * 0.78 : p.durationSec).toFixed(2)}s`,
                    animationDelay: `${p.delaySec}s`,
                  }}
                />
              );
            }
            if (weather === 'blizzard') {
              return (
                <span
                  key={p.id}
                  className="absolute -top-6 rounded-full bg-cyan-50/90 shadow-[0_0_6px_rgba(207,250,254,0.85)] animate-hud-snow"
                  style={{
                    left: `${p.leftPct}%`,
                    width: `${p.sizePx}px`,
                    height: `${p.sizePx}px`,
                    animationDuration: `${p.snowDurationSec.toFixed(2)}s`,
                    animationDelay: `${p.delaySec}s`,
                  }}
                />
              );
            }
            if (weather === 'sandstorm') {
              return (
                <span
                  key={p.id}
                  className="absolute -left-24 h-[2px] w-16 rounded-full bg-gradient-to-r from-transparent via-amber-300/60 to-transparent animate-hud-sand"
                  style={{
                    top: `${p.topPct}%`,
                    animationDuration: `${(p.durationSec * 1.4).toFixed(2)}s`,
                    animationDelay: `${p.delaySec}s`,
                  }}
                />
              );
            }
            return (
              <span
                key={p.id}
                className="absolute rounded-full bg-lime-300/50 blur-[1px] animate-hud-spore"
                style={{
                  left: `${p.leftPct}%`,
                  top: `${p.topPct}%`,
                  width: `${p.sizePx + 2}px`,
                  height: `${p.sizePx + 2}px`,
                  animationDuration: `${(p.snowDurationSec * 0.85).toFixed(2)}s`,
                  animationDelay: `${p.delaySec}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* --- Low-Vitality Edge Vignette --- */}
      {isCriticalHealth && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 shadow-[inset_0_0_95px_rgba(225,29,72,0.58)] animate-pulse"
        />
      )}
      {isCriticalOxygen && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 shadow-[inset_0_0_95px_rgba(6,182,212,0.52)] animate-pulse"
        />
      )}
      {isLowNeed && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-10 shadow-[inset_0_0_75px_rgba(245,158,11,0.32)]"
        />
      )}

      {/* --- Top Left: Survivor Vital Status Bars + Quick Consume Strip --- */}
      <div className="absolute top-[max(0.5rem,var(--sat))] left-[max(0.5rem,var(--sal))] flex flex-col gap-1.5 z-20 pointer-events-auto w-36 sm:w-56 [@media(max-height:500px)]:w-36">
        <button
          type="button"
          onClick={onOpenCharacter}
          title="Tap to open Survivor Attributes & Skills [C]"
          className="flex flex-col gap-1 sm:gap-1.5 [@media(max-height:500px)]:gap-0.5 rounded-xl bg-neutral-950/85 p-2 sm:p-3 [@media(max-height:500px)]:p-1.5 shadow-2xl border border-neutral-800/80 w-full cursor-pointer active:scale-95 transition-transform text-left hover:border-amber-500/50"
        >
        {/* Health */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-500 fill-rose-500/30 shrink-0" />
          <div className="relative h-2.5 sm:h-3 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-600 to-rose-500 transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100))}%` }}
            />
          </div>
          <span className="w-8 sm:w-10 text-right text-[10px] sm:text-xs font-mono font-bold text-rose-400">
            {Math.round(stats.health)}
          </span>
        </div>

        {/* Stamina */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400 fill-amber-400/30 shrink-0" />
          <div className="relative h-2 sm:h-2.5 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-700/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (stats.stamina / stats.maxStamina) * 100))}%` }}
            />
          </div>
          <span className="w-8 sm:w-10 text-right text-[10px] sm:text-xs font-mono font-bold text-amber-300">
            {Math.round(stats.stamina)}
          </span>
        </div>

        {/* Hunger & Thirst Split */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-1 border-t border-neutral-800">
          <div className="flex items-center gap-1">
            <Apple className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-400 shrink-0" />
            <div className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-700/40">
              <div
                className="h-full bg-orange-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, stats.hunger))}%` }}
              />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-neutral-300">{Math.round(stats.hunger)}%</span>
          </div>

          <div className="flex items-center gap-1">
            <Droplet className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-sky-400 shrink-0" />
            <div className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-700/40">
              <div
                className="h-full bg-sky-500 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, stats.thirst))}%` }}
              />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-neutral-300">{Math.round(stats.thirst)}%</span>
          </div>
        </div>

        {/* Oxygen Gauge (Visible when swimming/submerged or recovering) */}
        {(stats.isSwimming || (stats.oxygen !== undefined && stats.oxygen < 98)) && (
          <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800 animate-in fade-in">
            <Droplet className="h-3 w-3 text-cyan-400 fill-cyan-400/50 shrink-0" />
            <div className="h-1.5 sm:h-2 w-full overflow-hidden rounded-full bg-neutral-900 border border-cyan-800/60">
              <div
                className={`h-full transition-all duration-150 ${
                  (stats.oxygen || 0) < 25 ? 'bg-rose-500 animate-pulse' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, stats.oxygen ?? 100))}%` }}
              />
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-cyan-300 font-bold shrink-0">
              {Math.round(stats.oxygen ?? 100)}% O₂
            </span>
          </div>
        )}

        {/* Environmental Telemetry: Battery, Temp, Visibility, Weather Drain, Radiation, Stealth */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 pt-1 text-[9px] sm:text-[10px] font-mono text-neutral-300 border-t border-neutral-800 tabular-nums">
          <span className="flex items-center gap-1" title="Flashlight Battery">
            <BatteryCharging className="h-3 w-3 text-yellow-400" />
            <span>{Math.round(stats.flashlightBattery ?? 100)}%</span>
          </span>
          <span>{Math.round(stats.temperature ?? 24)}°C</span>
          {visibilityPct < 98 && (
            <span className="flex items-center gap-0.5 text-sky-300 font-semibold" title="Atmospheric Visibility">
              <Eye className="h-2.5 w-2.5" />
              <span>{visibilityPct}%</span>
            </span>
          )}
          {hungerDrainPct > 5 && (
            <span className="text-orange-300 font-semibold" title="Cold/Weather Calorie Burn Rate">
              HGR +{hungerDrainPct}%
            </span>
          )}
          {thirstDrainPct > 5 && (
            <span className="text-cyan-300 font-semibold" title="Weather Hydration Drain Rate">
              THR +{thirstDrainPct}%
            </span>
          )}
          {(stats.radiationExposure ?? 0) > 1 && (
            <span className="text-lime-400 font-bold">RAD {Math.round(stats.radiationExposure ?? 0)}%</span>
          )}
          {(stats.infection ?? 0) > 1 && (
            <span className="text-rose-400 font-bold">INF {Math.round(stats.infection ?? 0)}%</span>
          )}
          {isCrouching && <span className="text-sky-400 font-bold">STEALTH</span>}
        </div>

        {/* Level & XP */}
        <div className="flex items-center justify-between pt-1 text-[10px] sm:text-[11px] text-neutral-400 border-t border-neutral-800 tabular-nums">
          <span className="font-semibold text-emerald-400">LVL {stats.level}</span>
          <span className="font-mono text-neutral-400">XP {stats.xp}/{stats.xpToNextLevel}</span>
        </div>

        {/* Owner Tag */}
        <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-neutral-800/80 text-[8px] sm:text-[9px] font-mono font-bold tracking-wider text-amber-400/95">
          <span className="inline-flex h-2 w-3 overflow-hidden rounded-[1px] border border-white/20 shrink-0 flex-col">
            <span className="h-1/3 w-full bg-[#FF9933]" />
            <span className="h-1/3 w-full bg-white" />
            <span className="h-1/3 w-full bg-[#138808]" />
          </span>
          <span className="truncate">OWNER-ADITYA, MADE IN INDIA</span>
        </div>
        </button>

        {/* Quick-Consume & Gamepad Status Bar */}
        {(onQuickHeal || onQuickEat || onQuickDrink || isGamepadConnected) && (
          <div className="flex flex-wrap items-center gap-1 [@media(max-height:460px)]:hidden">
            {onQuickHeal && (quickCounts?.med ?? 0) > 0 && (
              <button
                type="button"
                onClick={onQuickHeal}
                title="Quick-Heal (Medkit/Bandage) [Q]"
                className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                  isCriticalHealth
                    ? 'border-rose-400 bg-rose-600/90 text-white animate-pulse shadow'
                    : 'border-neutral-800 bg-neutral-950/90 text-rose-300 hover:border-rose-500/60'
                }`}
              >
                <HeartPulse className="h-2.5 w-2.5" />
                <span>[Q] {quickCounts?.med}</span>
              </button>
            )}
            {onQuickEat && (quickCounts?.food ?? 0) > 0 && (
              <button
                type="button"
                onClick={onQuickEat}
                title="Quick-Eat Ration from Inventory/Hotbar"
                className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                  stats.hunger < 30
                    ? 'border-orange-400 bg-orange-600/90 text-white animate-pulse'
                    : 'border-neutral-800 bg-neutral-950/90 text-orange-300 hover:border-orange-500/60'
                }`}
              >
                <Apple className="h-2.5 w-2.5" />
                <span>{quickCounts?.food}</span>
              </button>
            )}
            {onQuickDrink && (quickCounts?.water ?? 0) > 0 && (
              <button
                type="button"
                onClick={onQuickDrink}
                title="Quick-Drink Water from Inventory/Hotbar"
                className={`flex items-center gap-1 rounded-lg border px-1.5 py-0.5 text-[9px] font-mono font-bold transition-all cursor-pointer active:scale-95 ${
                  stats.thirst < 30
                    ? 'border-sky-400 bg-sky-600/90 text-white animate-pulse'
                    : 'border-neutral-800 bg-neutral-950/90 text-sky-300 hover:border-sky-500/60'
                }`}
              >
                <Droplet className="h-2.5 w-2.5" />
                <span>{quickCounts?.water}</span>
              </button>
            )}
            {isGamepadConnected && (
              <span
                title="Controller Connected"
                className="flex items-center gap-1 rounded-lg border border-emerald-700/60 bg-emerald-950/85 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-300"
              >
                <Gamepad2 className="h-2.5 w-2.5" />
                <span>PAD</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* --- Tamed Companion Card (When player has a pet/mount) --- */}
      {companion && (
        <div className="absolute top-[calc(max(0.5rem,var(--sat))+11.8rem)] sm:top-[calc(max(0.5rem,var(--sat))+13.4rem)] [@media(max-height:500px)]:top-[calc(max(0.35rem,var(--sat))+8.6rem)] left-[max(0.5rem,var(--sal))] flex items-center justify-between gap-2 sm:gap-3 rounded-xl bg-neutral-950/85 px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-xl border border-amber-500/40 w-40 sm:w-60 z-20 pointer-events-auto">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-300 truncate max-w-[95px] sm:max-w-[120px]">
                {companion.name}
              </span>
            </div>
            <span className="text-[9px] text-neutral-400 font-mono capitalize">
              Role: {companion.state} · HP: {Math.round(companion.health)}/{companion.maxHealth}
            </span>
          </div>
          <button
            onClick={onToggleCompanionOrder}
            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-400/50 rounded-lg text-[9px] font-bold text-amber-300 uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
          >
            {companion.state === 'follow' ? 'STAY' : 'FOLLOW'}
          </button>
        </div>
      )}

      {/* --- Top Center: In-World Waypoint & Compass Navigator --- */}
      {navigationState?.activeObjective && (
        <div className="absolute top-[calc(max(0.5rem,var(--sat))+10.2rem)] [@media(orientation:landscape)]:top-[max(0.5rem,var(--sat))] md:top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-2.5 rounded-2xl bg-neutral-950/92 px-3 py-1.5 sm:px-4 sm:py-2 [@media(max-height:500px)]:px-2.5 [@media(max-height:500px)]:py-1 shadow-2xl border border-amber-500/50 z-25 max-w-[92vw] [@media(orientation:landscape)]:max-w-[calc(100vw-22rem)] md:max-w-md animate-in fade-in slide-in-from-top-2">
          {/* Rotating Compass Bearing Indicator */}
          <div className="relative flex items-center justify-center h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-neutral-900 border border-amber-500/70 shadow-inner shrink-0">
            <div
              className="absolute flex items-center justify-center transition-transform duration-100 ease-out"
              style={{ transform: `rotate(${Math.round(navigationState.bearingAngleDegrees)}deg)` }}
            >
              <Navigation className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-amber-400 fill-amber-400 drop-shadow" />
            </div>
            <div className="h-1.5 w-1.5 rounded-full bg-amber-200 z-10" />
          </div>

          {/* Objective Title & Street-Safe Guidance */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[8px] sm:text-[10px] font-mono uppercase tracking-wider font-bold text-amber-400">
                ACTIVE WAYPOINT
              </span>
              {navigationState.isAtDestination ? (
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-500">
                  REACHED
                </span>
              ) : (
                <span className="text-[8px] sm:text-[9px] font-mono font-bold text-neutral-300">
                  {navigationState.distanceMeters.toFixed(1)}m
                </span>
              )}
            </div>
            <h4 className="text-[11px] sm:text-sm font-bold text-neutral-100 truncate">
              {navigationState.activeObjective.title}
            </h4>
            <p className="text-[9px] sm:text-[10px] text-neutral-400 truncate max-w-[170px] sm:max-w-[320px]">
              {navigationState.activeObjective.instruction}
            </p>
          </div>
        </div>
      )}

      {/* --- Top Right: Time, Day, & Cycle Clock (Responsive, touchable to open Map) --- */}
      <button
        type="button"
        onClick={onOpenMap}
        title="Tap to open Topographical Radar Map [M]"
        className="absolute top-[max(0.5rem,var(--sat))] right-[max(0.5rem,var(--sar))] flex items-center gap-1.5 sm:gap-2.5 rounded-xl bg-neutral-950/85 p-2 sm:p-2.5 [@media(max-height:500px)]:p-1.5 shadow-2xl border border-neutral-800/80 z-20 pointer-events-auto cursor-pointer active:scale-95 transition-transform hover:border-amber-500/50 text-left"
      >
        <div className="flex items-center gap-1.5 sm:gap-2 pr-1.5 sm:pr-2.5 border-r border-neutral-800">
          {isNight ? (
            <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />
          ) : isDusk ? (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          ) : isDawn ? (
            <Sunrise className="h-4 w-4 sm:h-5 sm:w-5 text-orange-400" />
          ) : (
            <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
          )}
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-bold tracking-wider text-neutral-100 font-mono">
              {timeStr}
            </span>
            <span className="text-[9px] sm:text-[10px] uppercase font-semibold text-neutral-400">
              DAY {dayCount} {isNight ? '• BLOOD MOON' : isDusk ? '• DUSK' : isDawn ? '• DAWN CHORUS' : '• DAYLIGHT'}
            </span>
          </div>
        </div>

        {/* Biome, Dynamic Weather Indicator & Coordinates */}
        <div className="flex flex-col items-end text-[10px] sm:text-xs">
          <span className="font-semibold text-amber-400 truncate max-w-[115px] sm:max-w-[155px] flex items-center gap-1">
            <span className="truncate">{biomeName}</span>
            {biomeTempC !== undefined ? ` · ${biomeTempC}°C` : ''}
          </span>
          <span
            className="flex items-center gap-1 text-[9px] font-mono font-semibold text-neutral-200 capitalize transition-opacity duration-300"
            style={{ opacity: weatherIndicatorOpacity }}
            title={`Weather: ${weather.replace('_', ' ')} (${Math.round(normalizedWeatherIntensity * 100)}% intensity)`}
          >
            {weather === 'clear' &&
              (isNight ? (
                <Moon className="h-3 w-3 text-indigo-300 shrink-0" />
              ) : (
                <Sun className="h-3 w-3 text-amber-300 shrink-0" />
              ))}
            {weather === 'rain' && <CloudRain className="h-3 w-3 text-sky-400 shrink-0" />}
            {weather === 'thunderstorm' && <CloudLightning className="h-3 w-3 text-amber-300 shrink-0" />}
            {weather === 'blizzard' && <Snowflake className="h-3 w-3 text-cyan-200 shrink-0" />}
            {weather === 'sandstorm' && <Wind className="h-3 w-3 text-orange-300 shrink-0" />}
            {weather === 'toxic_fog' && <AlertTriangle className="h-3 w-3 text-lime-400 shrink-0" />}
            <span>{weather.replace('_', ' ')}</span>
            {weather !== 'clear' && (
              <span className="text-neutral-400 tabular-nums">· {Math.round(normalizedWeatherIntensity * 100)}%</span>
            )}
            {supplyDrop && !supplyDrop.looted ? ' · Drop Active' : ''}
          </span>
          {showCoordinates && (
            <div className="flex flex-col items-end font-mono text-[9px] sm:text-[10px] text-neutral-400 tabular-nums">
              <span>
                {stats.latitude !== undefined && stats.longitude !== undefined
                  ? EarthProjection.formatLatLon(stats.latitude, stats.longitude)
                  : `${Math.round(playerPos[0])}, ${Math.round(playerPos[2])}`}
              </span>
              <span className="text-[8px] text-sky-300/90 truncate max-w-[140px]">
                {stats.nearestCityName ? `${stats.nearestCityName} · ` : ''}
                {stats.countryName || stats.continentOrOcean || 'Earth'}
                {stats.realElevationMeters !== undefined ? ` · ${stats.realElevationMeters}m` : ''}
              </span>
            </div>
          )}
          {ecosystemMetrics && (
            <span className="text-[8px] font-mono text-emerald-400 font-semibold truncate max-w-[110px] tabular-nums">
              {ecosystemMetrics.totalOrganisms} Fauna · Gen {ecosystemMetrics.highestGeneration}
            </span>
          )}
        </div>
      </button>

      {/* --- 1-Minute Auto-Save Confirmation Badge --- */}
      {autoSaveToast && (
        <div className="pointer-events-none fixed top-3 right-4 z-40 rounded-lg border border-emerald-500/40 bg-neutral-950/90 px-3 py-1.5 text-[11px] font-mono font-semibold text-emerald-300 shadow-lg">
          {autoSaveToast}
        </div>
      )}

      {/* --- World Boss Health Bar & Evacuation Holdout Banner --- */}
      {bossStatus && (
        <div className="pointer-events-none absolute top-24 left-1/2 -translate-x-1/2 z-25 w-[min(22rem,88vw)] rounded-xl border border-rose-700/80 bg-neutral-950/90 px-4 py-2 shadow-2xl">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1.5 truncate">
              <Skull className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{bossStatus.name}</span>
            </span>
            <span className="font-mono tabular-nums text-[11px]">
              {Math.max(0, Math.round(bossStatus.health))} / {Math.round(bossStatus.maxHealth)}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-900 border border-rose-900/60">
            <div
              className="h-full bg-gradient-to-r from-rose-600 to-amber-500 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, (bossStatus.health / Math.max(1, bossStatus.maxHealth)) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {extraction && (extraction.active || extraction.completed) && (
        <div className="pointer-events-auto absolute top-36 left-1/2 -translate-x-1/2 z-25 flex items-center gap-3 rounded-xl border border-amber-500/60 bg-neutral-950/92 px-4 py-2 text-xs shadow-2xl">
          {extraction.completed ? (
            <>
              <span className="font-bold text-emerald-300 whitespace-nowrap">
                Evacuation Signal Complete — Helicopter Ready
              </span>
              {onTriggerRebirth && (
                <button
                  type="button"
                  onClick={onTriggerRebirth}
                  className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1 text-[11px] font-bold text-neutral-950 cursor-pointer whitespace-nowrap"
                >
                  Trigger Rebirth NG+
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-3 font-mono tabular-nums">
              <span className="font-semibold text-amber-300 whitespace-nowrap">Evacuation Holdout</span>
              <span className="text-neutral-100 font-bold">{Math.ceil(extraction.remainingSeconds)}s</span>
            </div>
          )}
        </div>
      )}

      {/* --- Right: Autonomous Living Organism Biological Dossier --- */}
      {ecosystemDossier && (
        <div className={`absolute ${isMinimapOpen ? 'top-[13.8rem] sm:top-[15.2rem]' : 'top-20'} right-3 sm:right-4 z-30 flex flex-col gap-2 rounded-2xl bg-neutral-950/92 p-3 sm:p-4 border border-emerald-500/50 shadow-2xl w-64 sm:w-80 pointer-events-auto animate-in fade-in slide-in-from-right-4`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-neutral-100">{ecosystemDossier.speciesName}</h3>
                {ecosystemDossier.isJuvenile && (
                  <span className="text-[8px] uppercase font-bold text-amber-300 bg-amber-950/90 px-1 py-0.5 rounded border border-amber-700">
                    JUVENILE
                  </span>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 italic font-serif truncate max-w-[160px] sm:max-w-[200px]">{ecosystemDossier.scientificName}</p>
            </div>
            <span className={`text-[8px] sm:text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border shrink-0 ${
              ecosystemDossier.diet === 'carnivore' ? 'bg-rose-950/90 text-rose-300 border-rose-800' :
              ecosystemDossier.diet === 'herbivore' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' :
              'bg-amber-950/90 text-amber-300 border-amber-800'
            }`}>
              {ecosystemDossier.diet}
            </span>
          </div>

          <div className="rounded-lg bg-neutral-900/90 p-2 border border-neutral-800 flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-neutral-400 uppercase font-semibold">Autonomous Behavior:</span>
              <span className="text-[10px] font-bold text-amber-400 font-mono">[{ecosystemDossier.state}]</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-neutral-200 leading-snug">{ecosystemDossier.intentDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[9px] sm:text-[10px] font-mono text-neutral-300">
            <div>HP: <span className="text-rose-400 font-bold">{ecosystemDossier.health}/{ecosystemDossier.maxHealth}</span></div>
            <div>Distance: <span className="text-neutral-400 font-bold">{ecosystemDossier.distance}m</span></div>
            <div>Hunger: <span className="text-orange-400 font-bold">{ecosystemDossier.hunger}%</span></div>
            <div>Thirst: <span className="text-sky-400 font-bold">{ecosystemDossier.thirst}%</span></div>
          </div>

          {/* Evolutionary Genome & Adaptation */}
          <div className="rounded-lg bg-emerald-950/30 border border-emerald-800/60 p-2 text-[10px] sm:text-[11px]">
            <div className="flex items-center justify-between text-emerald-400 font-semibold mb-0.5">
              <span>Evolution Generation: #{ecosystemDossier.generation}</span>
              <span className="text-[9px] font-mono text-neutral-400">Natural Selection</span>
            </div>
            <span className="text-neutral-200 font-medium">{ecosystemDossier.adaptationTrait}</span>
          </div>

          {onLogSpeciesDossier && (
            <button
              onClick={() => onLogSpeciesDossier(ecosystemDossier.agentId)}
              className="w-full py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-1.5"
            >
              <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Log Specimen in Field Journal (+50 XP)</span>
            </button>
          )}
        </div>
      )}

      {/* --- Top Center: Active Quest Tracker (Stacked safely, touchable to open Journal) --- */}
      {activeQuest && firstIncompleteObj && (
        <button
          type="button"
          onClick={onOpenJournal}
          title="Tap to open Mission Journal [J]"
          className={`absolute ${
            navigationState?.activeObjective
              ? 'top-[calc(max(0.5rem,var(--sat))+14.2rem)] [@media(orientation:landscape)]:top-[calc(max(0.5rem,var(--sat))+3.8rem)] md:top-18'
              : 'top-[calc(max(0.5rem,var(--sat))+10.2rem)] [@media(orientation:landscape)]:top-[max(0.5rem,var(--sat))] md:top-3'
          } left-1/2 -translate-x-1/2 flex flex-col items-center rounded-xl bg-neutral-950/85 px-3 py-1 sm:px-4 sm:py-1.5 border border-neutral-800/80 shadow-xl max-w-[260px] [@media(orientation:landscape)]:max-w-[calc(100vw-22rem)] sm:max-w-md text-center z-10 transition-all pointer-events-auto cursor-pointer active:scale-95 hover:border-amber-500/50`}
        >
          <div className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-400 uppercase tracking-wider">
            <Compass className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{activeQuest.title}</span>
          </div>
          <div className="text-[11px] sm:text-sm text-neutral-200 font-medium mt-0.5 line-clamp-1">
            {firstIncompleteObj.description}
          </div>
          <div className="text-[9px] sm:text-xs font-mono text-amber-300/90 mt-0.5">
            Progress: {firstIncompleteObj.current} / {firstIncompleteObj.target}
          </div>
        </button>
      )}

      {/* --- Center: Reticle, Hitmarker & Floating Damage Numbers --- */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {damageNumbers.map((dn) => (
          <div
            key={dn.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 font-mono font-black tabular-nums drop-shadow transition-transform duration-300 ${
              dn.isHeadshot
                ? 'text-base sm:text-lg text-amber-300'
                : dn.isStealth
                ? 'text-sm sm:text-base text-cyan-300'
                : 'text-xs sm:text-sm text-white'
            }`}
            style={{ left: `${dn.x}%`, top: `${dn.y}%` }}
          >
            -{Math.round(dn.amount)}{dn.isHeadshot ? '!' : ''}
          </div>
        ))}

        <div className="relative flex items-center justify-center">
          <div className={`h-1.5 w-1.5 rounded-full ${hitmarkerActive ? 'bg-amber-400 scale-125' : 'bg-white/70'}`} />
          <div className={`absolute -top-3 h-2 w-[1px] ${hitmarkerActive ? 'bg-amber-400' : 'bg-white/40'}`} />
          <div className={`absolute -bottom-3 h-2 w-[1px] ${hitmarkerActive ? 'bg-amber-400' : 'bg-white/40'}`} />
          <div className={`absolute -left-3 w-2 h-[1px] ${hitmarkerActive ? 'bg-amber-400' : 'bg-white/40'}`} />
          <div className={`absolute -right-3 w-2 h-[1px] ${hitmarkerActive ? 'bg-amber-400' : 'bg-white/40'}`} />
        </div>

        {interactionPrompt && (
          <button
            type="button"
            onClick={() => onInteract?.()}
            className="pointer-events-auto absolute mt-16 sm:mt-18 rounded-2xl bg-amber-500 hover:bg-amber-400 active:bg-amber-300 text-neutral-950 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-black shadow-2xl border-2 border-amber-300 tracking-wide max-w-[90vw] text-center cursor-pointer active:scale-95 transition-all flex items-center gap-2"
            title="Tap to interact"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-950/20 text-[10px] font-black uppercase">
              TAP
            </span>
            <span>
              {interactionPrompt.replace(/\[E\]\s*/i, '').replace(/\[E\]/gi, '').trim() || 'INTERACT'}
            </span>
          </button>
        )}
      </div>

      {/* --- Bottom Center: Hotbar & Control Dock (Lifted cleanly above mobile thumbs in Portrait, centered between thumbs in Landscape) --- */}
      <div className="absolute bottom-[calc(max(0.5rem,var(--sab))+8.4rem)] [@media(orientation:landscape)]:bottom-[calc(max(0.35rem,var(--sab))+0.2rem)] lg:bottom-[calc(max(0.5rem,var(--sab))+0.25rem)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 sm:gap-1.5 pointer-events-auto layer-hud-bottom max-w-[95vw]">
        {/* Compact Mobile Quick Action Pill Bar */}
        <div className="flex lg:hidden items-center gap-1 rounded-xl bg-neutral-950/90 px-2 py-1 border border-white/15 shadow-lg text-neutral-300 text-[10px]">
          <button
            onClick={onOpenBuild}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 font-bold active:scale-95 cursor-pointer"
            title="Building Catalog [B]"
          >
            <Hammer className="h-3 w-3" />
            <span>BUILD</span>
          </button>
          <button
            onClick={onOpenInventory}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/10 text-neutral-200 font-bold active:scale-95 cursor-pointer"
            title="Inventory Bag [I]"
          >
            <Package className="h-3 w-3" />
            <span>BAG</span>
          </button>
          <button
            onClick={onOpenMap}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/10 text-neutral-200 font-bold active:scale-95 cursor-pointer"
            title="Cartography Map [M]"
          >
            <MapIcon className="h-3 w-3" />
            <span>MAP</span>
          </button>
          <button
            onClick={onOpenJournal}
            className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/10 text-neutral-200 font-bold active:scale-95 cursor-pointer"
            title="Quest Journal [J]"
          >
            <BookOpen className="h-3 w-3" />
            <span>LOG</span>
          </button>
          {onOpenCompendium && (
            <button
              onClick={onOpenCompendium}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 font-bold active:scale-95 cursor-pointer"
              title="Field Compendium [X]"
            >
              <BookMarked className="h-3 w-3" />
              <span>CODEX</span>
            </button>
          )}
          {onOpenMediaDashboard && (
            <button
              onClick={onOpenMediaDashboard}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 font-bold active:scale-95 cursor-pointer"
              title="Global Media Network [Y]"
            >
              <Tv className="h-3 w-3" />
              <span>MEDIA</span>
            </button>
          )}
          {onEnterPhotoMode && (
            <button
              onClick={onEnterPhotoMode}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-white/10 text-neutral-200 font-bold active:scale-95 cursor-pointer"
              title="Photo Mode [P]"
            >
              <Camera className="h-3 w-3" />
            </button>
          )}
          {onToggleTouchControlsMode && (
            <button
              onClick={onToggleTouchControlsMode}
              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-lg border font-mono font-bold active:scale-95 cursor-pointer ${
                touchControlsMode === 'always'
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-400/50'
                  : 'bg-white/10 text-neutral-400 border-transparent'
              }`}
              title="Toggle On-Screen Touch Controls"
            >
              <Smartphone className="h-3 w-3" />
              <span>TOUCH</span>
            </button>
          )}
        </div>

        {/* Quick Desktop Action Buttons (Visible on desktop large screens) */}
        <div className="hidden lg:flex items-center gap-1.5 rounded-xl bg-neutral-950/80 px-3 py-1.5 border border-neutral-800/80 shadow-lg text-neutral-300 text-xs">
          <button
            onClick={onOpenBuild}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-amber-400 font-medium"
            title="Open Building Catalog [B]"
          >
            <Hammer className="h-3.5 w-3.5" />
            <span>Build [B]</span>
          </button>
          <div className="h-3 w-[1px] bg-neutral-800" />

          <button
            onClick={onOpenInventory}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-200"
            title="Open Inventory [I]"
          >
            <Package className="h-3.5 w-3.5" />
            <span>Bag [I]</span>
          </button>
          <div className="h-3 w-[1px] bg-neutral-800" />

          <button
            onClick={onOpenCharacter}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-200"
            title="Character RPG Stats [C]"
          >
            <User className="h-3.5 w-3.5" />
            <span>Stats [C]</span>
          </button>
          <div className="h-3 w-[1px] bg-neutral-800" />

          <button
            onClick={onOpenMap}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-200"
            title="Map & Radar [M]"
          >
            <MapIcon className="h-3.5 w-3.5" />
            <span>Map [M]</span>
          </button>
          <div className="h-3 w-[1px] bg-neutral-800" />

          <button
            onClick={onOpenJournal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-200"
            title="Quest Journal [J]"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Journal [J]</span>
          </button>
          <div className="h-3 w-[1px] bg-neutral-800" />

          <button
            onClick={onToggleCamera}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-200"
            title="Cycle Camera View [V]"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>{cameraView === 'first' ? '1st' : cameraView === 'third' ? '3rd' : '2nd'} [V]</span>
          </button>

          <button onClick={() => onZoomCamera?.(-0.6)} className="flex items-center justify-center rounded-lg px-1.5 py-1 hover:bg-neutral-800 text-neutral-300" title="Zoom in (+)">+</button>
          <button onClick={() => onZoomCamera?.(0.6)} className="flex items-center justify-center rounded-lg px-1.5 py-1 hover:bg-neutral-800 text-neutral-300" title="Zoom out (-)">−</button>

          <button
            onClick={onToggleFlashlight}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer ${
              isFlashlightOn ? 'text-yellow-400 bg-neutral-800/80' : 'text-neutral-400'
            }`}
            title="Flashlight [F]"
          >
            <Flashlight className="h-3.5 w-3.5" />
            <span>[F]</span>
          </button>

          {onToggleBioScanner && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onToggleBioScanner}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium ${
                  isBioScannerActive ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-400 hover:bg-neutral-800'
                }`}
                title="Biological Ecosystem Scanner [Z]"
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Scan [Z]</span>
              </button>
            </>
          )}

          {onOpenBaseDashboard && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onOpenBaseDashboard}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-cyan-400 font-medium"
                title="Sanctuary Base Dashboard [O]"
              >
                <Terminal className="h-3.5 w-3.5" />
                <span>Base [O]</span>
              </button>
            </>
          )}

          {onOpenTrainControl && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onOpenTrainControl}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-sky-400 font-medium"
                title="Central Railway Dispatch Console [T]"
              >
                <Train className="h-3.5 w-3.5" />
                <span>Train [T]</span>
              </button>
            </>
          )}

          {onOpenCompendium && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onOpenCompendium}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-emerald-400 font-medium"
                title="Biomes & Wildlife Field Compendium [X]"
              >
                <BookMarked className="h-3.5 w-3.5" />
                <span>Codex [X]</span>
              </button>
            </>
          )}

          {onToggleMinimap && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onToggleMinimap}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs ${
                  isMinimapOpen ? 'text-amber-300 bg-neutral-800/70' : 'text-neutral-400'
                }`}
                title="Toggle Corner Tactical Minimap [N]"
              >
                <Radar className="h-3.5 w-3.5" />
                <span>[N]</span>
              </button>
            </>
          )}

          {onEnterPhotoMode && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onEnterPhotoMode}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-300 hover:text-amber-300 text-xs whitespace-nowrap shrink-0"
                title="HUD-Free Photo Mode & Screenshot [P]"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>[P]</span>
              </button>
            </>
          )}

          {onToggleRadio && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onToggleRadio}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs whitespace-nowrap shrink-0 ${
                  isRadioOpen ? 'text-amber-300 bg-neutral-800/80' : 'text-neutral-300'
                }`}
                title="Emergency Ham Radio & Bounties"
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Radio</span>
              </button>
            </>
          )}

          {onOpenMediaDashboard && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onOpenMediaDashboard}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs text-sky-300 whitespace-nowrap shrink-0"
                title={mediaBreakingBanner || 'Global Media Network & World News [Y]'}
              >
                <Tv className="h-3.5 w-3.5" />
                <span>Media [Y]</span>
              </button>
            </>
          )}

          {onOpenBlueprints && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onOpenBlueprints}
                className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-300 hover:text-amber-300 text-xs whitespace-nowrap shrink-0"
                title="Base Blueprints, Salvage & Weapon Mods"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Bench</span>
              </button>
            </>
          )}

          {onToggleHitboxDebug && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onToggleHitboxDebug}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-neutral-400 hover:text-emerald-400 text-xs"
                title="Toggle Solid Collision Hitboxes [F3]"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Hitbox [F3]</span>
              </button>
            </>
          )}

          {onTogglePerfDiagnostic && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onTogglePerfDiagnostic}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer text-xs ${
                  isPerfOpen ? 'bg-amber-500/25 text-amber-300 border border-amber-400/50' : 'text-neutral-400 hover:text-amber-300'
                }`}
                title="Toggle Performance Diagnostics & FPS [F4]"
              >
                <Activity className="h-3.5 w-3.5" />
                <span>Perf [F4]</span>
              </button>
            </>
          )}

          {onCycleQualityMode && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onCycleQualityMode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs font-mono font-bold text-emerald-400"
                title="Open Graphics & Stability Manager"
              >
                <Zap className="h-3.5 w-3.5" />
                <span className="uppercase">Gfx: {qualityBadgeLabel}</span>
              </button>
            </>
          )}

          {onToggleTouchControlsMode && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onToggleTouchControlsMode}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs font-mono font-bold ${
                  touchControlsMode === 'always'
                    ? 'text-cyan-400 bg-neutral-800/90 border border-cyan-500/40'
                    : touchControlsMode === 'off'
                    ? 'text-neutral-500 line-through'
                    : 'text-neutral-300'
                }`}
                title="Toggle On-Screen Touch Controls (Auto / Always / Off)"
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span className="uppercase">Touch: {touchControlsMode ?? 'auto'}</span>
              </button>
            </>
          )}

          {onOpenPause && (
            <>
              <div className="h-3 w-[1px] bg-neutral-800" />
              <button
                onClick={onOpenPause}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer text-xs font-mono font-bold text-neutral-400 hover:text-white"
                title="Pause Game [Esc]"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
            </>
          )}
        </div>

        {/* 5-slot compact mobile hotbar; desktop retains the full 8-slot quick bar */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-2xl bg-neutral-950/90 p-1 sm:p-2 border border-neutral-800/90 shadow-2xl overflow-x-auto max-w-[94vw] [@media(orientation:landscape)]:max-w-[calc(100vw-19.5rem)] md:[@media(orientation:landscape)]:max-w-[calc(100vw-23rem)] lg:max-w-none">
          {hotbar.slice(0, 8).map((slot, idx) => {
            const isSelected = selectedIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => onSelectSlot(idx)}
                className={`relative flex h-9 w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 shrink-0 flex-col items-center justify-center rounded-xl border transition-all cursor-pointer ${idx >= 5 ? 'mobile-hotbar-overflow-slot ' : ''}${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/25 shadow-lg shadow-amber-500/20 scale-105'
                    : 'border-neutral-800 bg-neutral-900/80 hover:border-neutral-700'
                }`}
              >
                {/* Number Key Indicator */}
                <span className="absolute top-0.5 left-1 text-[7px] sm:text-[9px] font-mono text-neutral-400 font-bold">
                  {idx + 1}
                </span>

                {slot ? (
                  <>
                    <span className="text-[9px] sm:text-xs font-semibold text-neutral-100 truncate px-0.5 text-center w-full">
                      {slot.item.name.split(' ')[0]}
                    </span>
                    {slot.count > 1 && (
                      <span className="absolute bottom-0.5 right-0.5 sm:right-1 font-mono text-[8px] sm:text-[10px] font-bold text-amber-300">
                        x{slot.count}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-700 text-xs font-mono">-</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
