import React from 'react';
import { FastForward, Shield } from 'lucide-react';
import { PrologueSubtitle, ProloguePhase } from '../../types/prologue';

interface CinematicOverlayProps {
  phase: ProloguePhase;
  subtitle: PrologueSubtitle | null;
  titleBanner: { title: string; subtitle: string; day: string } | null;
  objective: string | null;
  onSkipScene: () => void;
  onSkipPrologue: () => void;
}

export const CinematicOverlay: React.FC<CinematicOverlayProps> = ({
  phase,
  subtitle,
  titleBanner,
  objective,
  onSkipScene,
  onSkipPrologue,
}) => {
  const isCinematicMode =
    phase === 'intro_cinematic' ||
    phase === 'ch7_the_meteorite' ||
    phase === 'ch13_the_world_awaits' ||
    phase === 'day2_meteorite_cinematic' ||
    phase === 'day2_impact_aftermath' ||
    phase === 'day2_final_cinematic';

  if (phase === 'completed' && !subtitle && !objective && !titleBanner) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[var(--z-cinematic,55)] flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Top Letterbox Bar */}
      <div
        className={`w-full bg-black/95 transition-all duration-700 ease-in-out shrink-0 ${
          isCinematicMode ? 'h-10 sm:h-14 md:h-18' : 'h-0'
        }`}
      />

      {/* Top Navigation & Controls Container with Safe Areas */}
      <div className="relative w-full flex items-start justify-between px-3 sm:px-6 pt-[max(0.5rem,var(--sat))] pointer-events-none">
        {/* Objective Toast (Left/Center slot, non-colliding) */}
        {objective && phase !== 'completed' && (
          <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-amber-500/40 bg-neutral-950/92 px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-neutral-100 shadow-2xl max-w-[calc(100vw-120px)] sm:max-w-md animate-in fade-in slide-in-from-top-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[9px] sm:text-[10px]">
                {phase.startsWith('day1') ? 'DAY 1 OBJECTIVE' : 'DAY 2 OBJECTIVE'}
              </span>
              <span className="text-neutral-200 text-xs font-medium truncate">{objective}</span>
            </div>
          </div>
        )}

        {/* Dedicated Skip Options Slot (Compact, never touches objective) */}
        {phase !== 'completed' && (
          <div className="pointer-events-auto ml-auto flex items-center gap-1.5 shrink-0 pl-2">
            {isCinematicMode && (
              <button
                onClick={onSkipScene}
                className="flex items-center gap-1 rounded-lg border border-neutral-700 bg-neutral-900/90 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-neutral-200 hover:bg-neutral-800 hover:text-white transition-all cursor-pointer shadow-lg active:scale-95"
                title="Skip Current Cutscene"
              >
                <FastForward className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xs:inline">Skip Scene</span>
              </button>
            )}
            <button
              onClick={onSkipPrologue}
              className="flex items-center gap-1 rounded-lg border border-amber-600/50 bg-amber-950/80 hover:bg-amber-900/90 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-bold text-amber-300 transition-all cursor-pointer shadow-lg active:scale-95"
              title="Jump straight to underground shelter and open-world survival"
            >
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>Skip Prologue</span>
            </button>
          </div>
        )}
      </div>

      {/* Center Grand Title Banner (Cinematic Chapter Card) */}
      {titleBanner && (
        <div className="my-auto flex flex-col items-center justify-center text-center px-4 py-4 max-w-[92vw] sm:max-w-2xl mx-auto rounded-2xl bg-black/60 border border-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="rounded-full border border-amber-500/50 bg-amber-500/15 px-3 py-0.5 text-[10px] sm:text-xs font-mono font-bold tracking-widest text-amber-400 uppercase mb-2">
            {titleBanner.day}
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-wider text-neutral-100 drop-shadow-2xl leading-tight">
            {titleBanner.title}
          </h1>
          <h2 className="text-sm sm:text-lg md:text-xl font-bold tracking-widest text-rose-500 uppercase mt-1.5">
            {titleBanner.subtitle}
          </h2>
        </div>
      )}

      {/* Subtitle / Dialogue Card (Placed safely ABOVE bottom controls) */}
      <div className="relative w-full flex flex-col items-center justify-end px-3 sm:px-6 pb-[calc(max(0.5rem,var(--sab))+5.5rem)] sm:pb-[calc(max(0.5rem,var(--sab))+4.5rem)] pointer-events-none">
        {subtitle && (
          <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-neutral-800/90 bg-neutral-950/92 p-3 sm:p-4 shadow-2xl transition-all animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-amber-400">
                {subtitle.speaker}
              </span>
              {subtitle.role && (
                <span className="rounded bg-neutral-800 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-semibold text-neutral-400">
                  {subtitle.role}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-normal text-neutral-100 leading-snug sm:leading-relaxed">
              "{subtitle.text}"
            </p>
          </div>
        )}
      </div>

      {/* Bottom Letterbox Bar */}
      <div
        className={`w-full bg-black/95 transition-all duration-700 ease-in-out shrink-0 ${
          isCinematicMode ? 'h-10 sm:h-14 md:h-18' : 'h-0'
        }`}
      />
    </div>
  );
};
