/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Passenger-only train information panel. Trains are AI-operated; this HUD
 * intentionally exposes no throttle, brake, horn, door, or driver-camera controls.
 */
import React from 'react';
import { Train, Volume2, LogOut } from 'lucide-react';

interface TrainHUDProps {
  hudData: {
    line: string;
    direction: string;
    speedKmh: number;
    nextStation?: string;
    announcement?: string;
  };
  onExitTrain: () => void;
}

export const TrainHUD: React.FC<TrainHUDProps> = ({ hudData, onExitTrain }) => (
  <div className="pointer-events-none fixed bottom-[calc(max(0.75rem,var(--sab))+4.8rem)] left-1/2 z-40 flex max-w-[95vw] -translate-x-1/2 flex-col items-center gap-2 font-sans select-none">
    <div aria-live="polite" className="pointer-events-auto flex max-w-[92vw] items-center gap-2 rounded-2xl border border-cyan-400/40 bg-slate-950/95 px-4 py-2 text-center text-[11px] font-bold text-cyan-100 shadow-xl backdrop-blur-xl">
      <Volume2 className="h-4 w-4 shrink-0 text-amber-300" />
      <span>{hudData.announcement || `Next station: ${hudData.nextStation || 'Station information unavailable'}`}</span>
    </div>
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-cyan-500/40 bg-neutral-950/95 px-4 py-3 text-neutral-100 shadow-xl backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <Train className="h-5 w-5 text-cyan-300" />
        <span className="text-xs font-black tracking-wide">AI PASSENGER SERVICE · {hudData.line}</span>
      </div>
      <span className="text-[11px] font-mono text-neutral-300">{hudData.speedKmh} km/h</span>
      <span className="text-[10px] text-neutral-400">{hudData.direction}</span>
      <button onClick={onExitTrain} className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-rose-500" title="Leave passenger train [E]">
        <LogOut className="h-4 w-4" /> EXIT [E]
      </button>
    </div>
  </div>
);
