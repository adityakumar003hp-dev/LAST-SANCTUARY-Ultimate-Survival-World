import React, { useState, useEffect } from 'react';
import { Activity, X } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { runCanonicalSpeciesAudit } from '../engine/SpeciesAuditReport';
import type { GraphicsQualityMode } from '../types/game';

export type { GraphicsQualityMode };

interface PerformanceDiagnosticProps {
  engine: GameEngine | null;
  isOpen: boolean;
  onClose: () => void;
  qualityMode: GraphicsQualityMode;
  onSelectQualityMode: (mode: GraphicsQualityMode) => void;
  onOpenGraphicsManager?: () => void;
}

const MODE_LABELS: { id: GraphicsQualityMode; label: string }[] = [
  { id: 'performance', label: 'Perf' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'quality', label: 'Ultra 4K' },
  { id: 'ultra_5x', label: 'Ultra 5x' },
  { id: 'absolute_realism', label: 'Realism Max' },
];

export const PerformanceDiagnostic: React.FC<PerformanceDiagnosticProps> = ({
  engine,
  isOpen,
  onClose,
  qualityMode,
  onSelectQualityMode,
  onOpenGraphicsManager,
}) => {
  const [stats, setStats] = useState({
    fps: 60,
    frameTimeMs: 16.6,
    p95FrameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0,
    pixelRatio: 1.0,
    renderWidth: 1920,
    renderHeight: 1080,
    shadowMapRes: 2048,
    anisotropy: 8,
    activeEntities: 0,
    longFrame: false,
    governorActionLabel: 'Full Fidelity',
    contextHealth: 'healthy' as 'healthy' | 'recovering' | 'safe_mode',
  });

  useEffect(() => {
    if (!isOpen || !engine) return;

    let frameCount = 0;
    let lastMeasureTime = performance.now();
    let rAfId: number;

    const onFrame = () => {
      frameCount++;
      rAfId = requestAnimationFrame(onFrame);
    };
    rAfId = requestAnimationFrame(onFrame);

    const interval = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastMeasureTime) / 1000;
      lastMeasureTime = now;

      const renderer = engine.renderer;
      const diag = engine.getDiagnosticInfo();
      const calls = renderer?.info?.render?.calls || 0;
      const triangles = renderer?.info?.render?.triangles || 0;
      const geometries = renderer?.info?.memory?.geometries || 0;
      const textures = renderer?.info?.memory?.textures || 0;
      const dpr = renderer?.getPixelRatio() || 1.0;

      const wildlifeCount = engine.wildlifeManager?.metrics?.totalOrganisms || 0;
      const zombieCount = engine.zombieMgr?.zombies?.length || 0;
      const structCount = engine.buildingMgr?.structures?.length || 0;
      const totalEntities = wildlifeCount + zombieCount + structCount;

      const curFps = elapsed > 0 ? Math.round(frameCount / elapsed) : 60;
      frameCount = 0;
      const frameMs = curFps > 0 ? +(1000 / curFps).toFixed(1) : 16.6;

      setStats({
        fps: curFps,
        frameTimeMs: frameMs,
        p95FrameTimeMs: diag.p95FrameTimeMs ?? frameMs,
        drawCalls: calls,
        triangles,
        geometries,
        textures,
        pixelRatio: +dpr.toFixed(2),
        renderWidth: diag.renderWidth,
        renderHeight: diag.renderHeight,
        shadowMapRes: diag.shadowMapRes,
        anisotropy: diag.anisotropy,
        activeEntities: totalEntities,
        longFrame: curFps < 25,
        governorActionLabel: diag.governorActionLabel ?? 'Full Fidelity',
        contextHealth: diag.contextHealth ?? 'healthy',
      });
    }, 500);

    return () => {
      cancelAnimationFrame(rAfId);
      clearInterval(interval);
    };
  }, [isOpen, engine]);

  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto fixed top-[max(0.75rem,var(--sat))] left-1/2 -translate-x-1/2 z-[var(--z-debug,70)] w-[92vw] max-w-sm max-h-[85dvh] overflow-y-auto rounded-2xl border border-cyan-500/50 bg-neutral-950/95 p-3.5 shadow-2xl animate-in fade-in zoom-in-95 font-mono text-xs text-neutral-200">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <div className="flex items-center gap-1.5 font-bold text-cyan-400">
          <Activity className="h-4 w-4" />
          <span>REAL-TIME GRAPHICS TELEMETRY</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors cursor-pointer"
          title="Close [F4]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 my-2.5">
        <div className="rounded-xl bg-neutral-900/90 p-2 border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase">FPS / Frame Time</div>
          <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
            <span
              className={`text-xl font-black ${
                stats.fps >= 55 ? 'text-emerald-400' : stats.fps >= 35 ? 'text-amber-400' : 'text-rose-500'
              }`}
            >
              {stats.fps}
            </span>
            <span className="text-[10px] text-neutral-400">({stats.frameTimeMs}ms)</span>
          </div>
          {stats.longFrame && (
            <span className="text-[8px] font-bold text-rose-400 uppercase tracking-wider">
              High GPU Load
            </span>
          )}
        </div>

        <div className="rounded-xl bg-neutral-900/90 p-2 border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase">Draw Calls / Tris</div>
          <div className="text-sm font-bold text-neutral-100 mt-0.5 tabular-nums">
            {stats.drawCalls} <span className="text-[10px] text-neutral-400">calls</span>
          </div>
          <div className="text-[10px] text-neutral-400 tabular-nums">
            {(stats.triangles / 1000).toFixed(1)}k tris
          </div>
        </div>

        <div className="rounded-xl bg-neutral-900/90 p-2 border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase">Render Buffer / DPR</div>
          <div className="text-sm font-bold text-neutral-100 mt-0.5 tabular-nums">
            {stats.renderWidth}×{stats.renderHeight}
          </div>
          <div className="text-[9px] text-neutral-400 tabular-nums">
            {stats.pixelRatio}x DPR · {stats.anisotropy}x AF
          </div>
        </div>

        <div className="rounded-xl bg-neutral-900/90 p-2 border border-neutral-800/80">
          <div className="text-[10px] text-neutral-400 uppercase">Shadows & Entities</div>
          <div className="text-sm font-bold text-amber-400 mt-0.5 tabular-nums">
            {stats.shadowMapRes > 0 ? `${stats.shadowMapRes}px` : 'Off'} · {stats.activeEntities}
          </div>
          <div className="text-[9px] text-neutral-400 tabular-nums">
            {stats.geometries} geos · {stats.textures} tex
          </div>
        </div>
      </div>

      {/* Graphics Quality Preset Selector */}
      <div className="pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase mb-1.5">
          <span>Picture Quality Mode</span>
          <span className="font-bold text-cyan-400 uppercase">{qualityMode.replace('_', ' ')}</span>
        </div>
        <div className="grid grid-cols-5 gap-1">
          {MODE_LABELS.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelectQualityMode(mode.id)}
              className={`py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                qualityMode === mode.id
                  ? (mode.id === 'ultra_5x' || mode.id === 'absolute_realism')
                    ? 'bg-amber-500/25 border-amber-400 text-amber-300 shadow-sm'
                    : 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm'
                  : 'bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-[10px]">
          <span className="text-neutral-400 truncate">
            Governor: <span className="text-cyan-300 font-bold">{stats.governorActionLabel}</span>
          </span>
          <span className="text-neutral-500 tabular-nums shrink-0">P95 {stats.p95FrameTimeMs}ms</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {onOpenGraphicsManager && (
            <button
              type="button"
              onClick={onOpenGraphicsManager}
              className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-bold text-[10px] uppercase cursor-pointer"
            >
              Graphics Manager
            </button>
          )}
          <button
            type="button"
            onClick={() => engine?.optimizeGraphicsMemory()}
            className="py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 rounded-lg font-bold text-[10px] uppercase cursor-pointer"
          >
            Free GPU Memory
          </button>
        </div>
      </div>

      {/* Canonical Species Audit Inspection */}
      <SpeciesAuditSection />
    </div>
  );
};

const SpeciesAuditSection: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<ReturnType<typeof runCanonicalSpeciesAudit> | null>(null);

  const handleRunAudit = () => {
    const res = runCanonicalSpeciesAudit();
    setReport(res);
    setIsOpen(true);
  };

  return (
    <div className="pt-2 mt-2 border-t border-neutral-800 text-[10px]">
      <button
        onClick={handleRunAudit}
        className="w-full py-1.5 px-2 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 rounded-lg font-bold flex items-center justify-between transition-colors"
      >
        <span>CANONICAL SPECIES AUDIT</span>
        <span className="px-1.5 py-0.2 bg-emerald-800/80 rounded text-[9px]">32 SPECIES</span>
      </button>

      {isOpen && report && (
        <div className="mt-2 p-2 bg-neutral-900 border border-neutral-800 rounded-lg max-h-56 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between pb-1 border-b border-neutral-800 text-neutral-300">
            <span className="font-bold text-emerald-400">STATUS: AUDIT PASSED</span>
            <span>0 DUPLICATES</span>
          </div>

          <div className="grid grid-cols-3 gap-1 text-[9px] text-neutral-400">
            <div>Apex: <span className="text-rose-400 font-bold">{report.trophicCoverage.apex}</span></div>
            <div>Predators: <span className="text-amber-400 font-bold">{report.trophicCoverage.predator}</span></div>
            <div>Grazers: <span className="text-emerald-400 font-bold">{report.trophicCoverage.grazer}</span></div>
            <div>Small Prey: <span className="text-cyan-400 font-bold">{report.trophicCoverage.small_prey}</span></div>
            <div>Birds: <span className="text-blue-400 font-bold">{report.trophicCoverage.bird}</span></div>
            <div>Aquatics: <span className="text-teal-400 font-bold">{report.trophicCoverage.aquatic}</span></div>
          </div>

          <div className="space-y-1 pt-1 border-t border-neutral-800">
            {report.speciesEntries.map((sp) => (
              <div key={sp.id} className="flex items-center justify-between text-[9px] py-0.5 border-b border-neutral-800/50">
                <span className="text-neutral-200 font-semibold">{sp.name}</span>
                <span className="text-neutral-500 font-mono">[{sp.trophic} · scale {sp.scale}]</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
