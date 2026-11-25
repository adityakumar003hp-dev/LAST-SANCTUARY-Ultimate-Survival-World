import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  Gauge,
  HardDrive,
  Monitor,
  RefreshCw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import {
  GraphicsManagerConfig,
  GraphicsManagerSnapshot,
  GraphicsQualityMode,
} from '../types/game';
import { soundEngine } from '../utils/audio';

interface GraphicsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  engine: GameEngine | null;
  qualityMode: GraphicsQualityMode;
  onSelectQualityMode: (mode: GraphicsQualityMode) => void;
  onSyncViewDistance?: (chunks: number) => void;
}

const PRESET_CARDS: Array<{
  id: GraphicsQualityMode;
  label: string;
  tag: string;
  specs: string;
  flagship?: boolean;
}> = [
  {
    id: 'performance',
    label: 'Smooth Performance',
    tag: 'Zero-Lag Boost',
    specs: '1.0x Scale · Shadows Off · 1-Chunk Stream',
  },
  {
    id: 'balanced',
    label: '4K Cinema Balanced',
    tag: 'Balanced Clarity',
    specs: 'Up to 1.35x Scale · 2048px Shadows · 4x AF',
  },
  {
    id: 'quality',
    label: 'High Ultra 4K',
    tag: 'Ultra 4K Detail',
    specs: 'Up to 1.65x Scale · HDR Bloom · 8x AF · 3-Chunk',
  },
  {
    id: 'ultra_5x',
    label: 'Ultra Realistic 5x',
    tag: 'High Fidelity',
    specs: 'Up to 2.0x Scale · 3072px Shadows · 16x AF · 4-Chunk',
  },
  {
    id: 'absolute_realism',
    label: 'Absolute Realism',
    tag: 'Experimental · Max Engine Fidelity',
    specs: 'Up to 2.0x Scale · 3072px Shadows · 16x AF · 5-Chunk · Max Lighting',
    flagship: true,
  },
];

export const GraphicsManagerModal: React.FC<GraphicsManagerModalProps> = ({
  isOpen,
  onClose,
  engine,
  qualityMode,
  onSelectQualityMode,
  onSyncViewDistance,
}) => {
  const [config, setConfig] = useState<GraphicsManagerConfig | null>(null);
  const [snap, setSnap] = useState<GraphicsManagerSnapshot | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !engine) return;
    setConfig(engine.getGraphicsConfig());
    setSnap(engine.getGraphicsSnapshot());

    const timer = window.setInterval(() => {
      if (!engine) return;
      setSnap(engine.getGraphicsSnapshot());
    }, 400);

    return () => window.clearInterval(timer);
  }, [isOpen, engine]);

  if (!isOpen) return null;

  const applyPatch = (patch: Partial<GraphicsManagerConfig>) => {
    if (!engine) return;
    soundEngine.playUIClick();
    const updated = engine.updateGraphicsConfig(patch);
    setConfig(updated);
    setSnap(engine.getGraphicsSnapshot());
    if (patch.viewDistanceChunks !== undefined && onSyncViewDistance) {
      onSyncViewDistance(updated.viewDistanceChunks);
    }
  };

  const handleSelectPreset = (mode: GraphicsQualityMode) => {
    soundEngine.playUIClick();
    onSelectQualityMode(mode);
    if (engine) {
      const updated = engine.getGraphicsConfig();
      setConfig(updated);
      setSnap(engine.getGraphicsSnapshot());
      onSyncViewDistance?.(updated.viewDistanceChunks);
    }
  };

  const handleOptimizeMemory = () => {
    if (!engine) return;
    soundEngine.playBuildSnap();
    const res = engine.optimizeGraphicsMemory();
    setSnap(engine.getGraphicsSnapshot());
    setStatusMessage(
      `Cache optimized: trimmed ${res.freedChunks} distant chunks, flushed ${res.clearedGeometries} geos & ${res.clearedTextures} textures.`
    );
    window.setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleResetSafe = () => {
    if (!engine) return;
    soundEngine.playBuildSnap();
    const safeCfg = engine.resetGraphicsToSafeAuto();
    onSelectQualityMode(safeCfg.preset);
    setConfig(safeCfg);
    setSnap(engine.getGraphicsSnapshot());
    onSyncViewDistance?.(safeCfg.viewDistanceChunks);
    setStatusMessage('Restored Safe Auto profile with Anti-Lag Governor enabled.');
    window.setTimeout(() => setStatusMessage(null), 3500);
  };

  const effectiveCfg = config ?? engine?.getGraphicsConfig();

  return (
    <div className="fixed inset-0 z-[72] flex items-center justify-center bg-black/80 p-3 sm:p-4 font-sans">
      <div className="relative flex w-full max-w-2xl max-h-[90dvh] flex-col rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3.5 bg-neutral-900/70 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sliders className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-neutral-100 truncate">
                Graphics &amp; Stability Manager
              </h2>
              <p className="text-[11px] font-mono text-neutral-400 truncate">
                {snap ? `${snap.gpuRendererName}${snap.isSoftwareGl ? ' (Software Mode)' : ''}` : 'WebGL Render Pipeline'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUIClick();
              onClose();
            }}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors cursor-pointer"
            title="Close Graphics Manager"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 overflow-y-auto p-4 sm:p-5">
          {statusMessage && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-2 text-xs text-emerald-300 font-medium">
              {statusMessage}
            </div>
          )}

          {/* Live Engine Health & Frame-Pacing Telemetry */}
          {snap && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-neutral-400">
                  <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Live FPS</span>
                </div>
                <div className="mt-0.5 font-mono tabular-nums text-base font-bold text-neutral-100">
                  <span
                    className={
                      snap.fps >= snap.targetFps * 0.85
                        ? 'text-emerald-400'
                        : snap.fps >= 30
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }
                  >
                    {snap.fps}
                  </span>{' '}
                  <span className="text-[11px] text-neutral-500">/ {snap.targetFps}</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400 tabular-nums">
                  Avg {snap.frameTimeMs}ms · P95 {snap.p95FrameTimeMs}ms
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-neutral-400">
                  <Monitor className="h-3.5 w-3.5 text-sky-400" />
                  <span>Render Scale</span>
                </div>
                <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-neutral-100">
                  {snap.renderWidth}×{snap.renderHeight}
                </div>
                <div className="text-[10px] font-mono text-neutral-400 tabular-nums">
                  {snap.dpr.toFixed(2)}x DPR · {snap.anisotropy}x AF
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-neutral-400">
                  <Cpu className="h-3.5 w-3.5 text-amber-400" />
                  <span>GPU Workload</span>
                </div>
                <div className="mt-0.5 font-mono tabular-nums text-sm font-bold text-neutral-100">
                  {snap.drawCalls} <span className="text-[10px] text-neutral-400">draws</span>
                </div>
                <div className="text-[10px] font-mono text-neutral-400 tabular-nums">
                  {(snap.triangles / 1000).toFixed(1)}k tris · {snap.geometries} geos
                </div>
              </div>

              <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-neutral-400">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Crash Guard</span>
                </div>
                <div className="mt-0.5 font-mono text-xs font-bold uppercase text-neutral-100 truncate">
                  {snap.contextHealth === 'healthy'
                    ? 'Healthy'
                    : snap.contextHealth === 'safe_mode'
                    ? 'Safe Mode'
                    : 'Recovering'}
                </div>
                <div className="text-[10px] font-mono text-neutral-400 truncate" title={snap.governorActionLabel}>
                  {snap.governorActionLabel}
                </div>
              </div>
            </div>
          )}

          {/* Anti-Lag Governor & Target FPS */}
          {effectiveCfg && (
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3.5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                    <Activity className="h-4 w-4" />
                    <span>Anti-Lag Dynamic Governor</span>
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Automatically trims resolution, shadows, and distant chunk builds on lag spikes, then restores quality smoothly when FPS recovers.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => applyPatch({ autoGovernor: !effectiveCfg.autoGovernor })}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    effectiveCfg.autoGovernor ? 'bg-cyan-500' : 'bg-neutral-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      effectiveCfg.autoGovernor ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
                <span className="text-xs font-semibold text-neutral-300">Target Smooth Frame Rate</span>
                <div className="flex gap-1.5">
                  {([30, 60] as const).map((fps) => (
                    <button
                      key={fps}
                      type="button"
                      onClick={() => applyPatch({ targetFps: fps })}
                      className={`px-3 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer border ${
                        effectiveCfg.targetFps === fps
                          ? 'bg-cyan-500 text-neutral-950 border-cyan-400'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {fps} FPS {fps === 30 ? '(Stable)' : '(Smooth)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quality Presets */}
          <div>
            <div className="text-[11px] font-mono uppercase text-neutral-400 mb-2">Quality Presets</div>
            <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-[10px] leading-relaxed text-amber-200">Absolute Realism pushes the highest visual quality supported by this game engine. On phones and low-memory GPUs it automatically uses a safer adaptive profile; unsupported effects are not forced, to help prevent freezes and missing textures.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_CARDS.map((card) => {
                const active = (effectiveCfg?.preset ?? qualityMode) === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    disabled={card.id === 'absolute_realism' && Boolean(snap?.isSoftwareGl)}
                    onClick={() => handleSelectPreset(card.id)}
                    className={`flex flex-col gap-1 rounded-xl border p-3 text-left transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? card.flagship
                          ? 'bg-amber-500/15 border-amber-400'
                          : 'bg-sky-500/15 border-sky-400'
                        : 'bg-neutral-900/70 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-neutral-100">
                        {card.flagship ? (
                          <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Zap className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                        )}
                        <span>{card.label}</span>
                      </span>
                      <span className="text-[10px] font-mono text-amber-300">{card.tag}</span>
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">{card.specs}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fine-Grained Pipeline Sliders & Toggles */}
          {effectiveCfg && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5 flex flex-col gap-3.5">
              {/* Render Resolution Scale */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                  <span>Internal Render Scale</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono tabular-nums text-amber-300">
                      {effectiveCfg.renderScale === null
                        ? 'Auto Preset'
                        : `${effectiveCfg.renderScale.toFixed(2)}x`}
                    </span>
                    {effectiveCfg.renderScale !== null && (
                      <button
                        type="button"
                        onClick={() => applyPatch({ renderScale: null })}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
                      >
                        Reset Auto
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="0.65"
                  max="2.0"
                  step="0.05"
                  value={effectiveCfg.renderScale ?? snap?.dpr ?? 1.0}
                  onChange={(e) => applyPatch({ renderScale: parseFloat(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* View Distance Chunks */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                  <span>Terrain Streaming Distance</span>
                  <span className="font-mono tabular-nums text-amber-300">
                    {effectiveCfg.viewDistanceChunks} chunks (~{effectiveCfg.viewDistanceChunks * 256}m radius)
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={effectiveCfg.viewDistanceChunks}
                  onChange={(e) => applyPatch({ viewDistanceChunks: parseInt(e.target.value, 10) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Weather & Particle Density */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                  <span>Weather &amp; Particle Budget</span>
                  <span className="font-mono tabular-nums text-amber-300">
                    {Math.round(effectiveCfg.particleDensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.25"
                  max="1.0"
                  step="0.05"
                  value={effectiveCfg.particleDensity}
                  onChange={(e) => applyPatch({ particleDensity: parseFloat(e.target.value) })}
                  className="accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Shadows + Post-Processing + Anisotropy Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-neutral-200">Real-Time Sun Shadows</span>
                    <span className="text-[10px] text-neutral-400">Disable to boost FPS up to 40%</span>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(snap?.isSoftwareGl)}
                    onClick={() =>
                      applyPatch({
                        shadowsEnabled: !effectiveCfg.shadowsEnabled,
                        shadowResolution: !effectiveCfg.shadowsEnabled
                          ? effectiveCfg.shadowResolution || 1024
                          : effectiveCfg.shadowResolution,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                      effectiveCfg.shadowsEnabled ? 'bg-amber-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        effectiveCfg.shadowsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-neutral-200">HDR Bloom &amp; Sun Shafts</span>
                    <span className="text-[10px] text-neutral-400">Post-processing pipeline</span>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(snap?.isSoftwareGl)}
                    onClick={() => {
                      const next = !effectiveCfg.postProcessingEnabled;
                      applyPatch({ postProcessingEnabled: next, bloomEnabled: next });
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-40 ${
                      effectiveCfg.postProcessingEnabled ? 'bg-amber-500' : 'bg-neutral-800'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        effectiveCfg.postProcessingEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Shadow Res & Anisotropy Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-neutral-400">Shadow Map Resolution</span>
                  <div className="grid grid-cols-4 gap-1">
                    {([512, 1024, 2048, 3072] as const).map((res) => (
                      <button
                        key={res}
                        type="button"
                        disabled={!effectiveCfg.shadowsEnabled}
                        onClick={() => applyPatch({ shadowResolution: res })}
                        className={`py-1 rounded text-[10px] font-mono font-bold border cursor-pointer disabled:opacity-35 ${
                          effectiveCfg.shadowResolution === res && effectiveCfg.shadowsEnabled
                            ? 'bg-amber-500 text-neutral-950 border-amber-400'
                            : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-semibold text-neutral-400">Anisotropic Filtering</span>
                  <div className="grid grid-cols-4 gap-1">
                    {([1, 4, 8, 16] as const).map((af) => (
                      <button
                        key={af}
                        type="button"
                        onClick={() => applyPatch({ anisotropyLevel: af })}
                        className={`py-1 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                          effectiveCfg.anisotropyLevel === af
                            ? 'bg-amber-500 text-neutral-950 border-amber-400'
                            : 'bg-neutral-950 text-neutral-300 border-neutral-800'
                        }`}
                      >
                        {af}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Crash Prevention & Memory Maintenance Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={handleOptimizeMemory}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-700/60 bg-emerald-950/40 hover:bg-emerald-900/50 px-3.5 py-2 text-xs font-bold text-emerald-300 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Free GPU Memory &amp; Clear Cache</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetSafe}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3.5 py-2 text-xs font-semibold text-neutral-200 transition-colors cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
                <span>Safe Auto Reset</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUIClick();
                  onClose();
                }}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-neutral-950 cursor-pointer"
              >
                Apply &amp; Resume
              </button>
            </div>
          </div>

          {snap && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500">
              <HardDrive className="h-3 w-3 shrink-0" />
              <span>
                WebGL Ceilings: Max Texture {snap.maxTextureDim}px · Max Renderbuffer {snap.maxRenderBufferDim}px · Spikes Guarded: {snap.frameSpikeCount}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
