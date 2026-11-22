/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Car, Zap, Lightbulb, LogOut } from 'lucide-react';
import { VehicleState } from '../types/game';

interface VehicleHUDProps {
  vehicleState: VehicleState;
  speed: number;
  onExitVehicle: () => void;
  onToggleHeadlights: () => void;
}

export const VehicleHUD: React.FC<VehicleHUDProps> = ({
  vehicleState,
  speed,
  onExitVehicle,
  onToggleHeadlights,
}) => {
  const speedKmh = Math.round(Math.abs(speed) * 3.6);

  return (
    <div className="pointer-events-none absolute bottom-[calc(max(0.75rem,var(--sab))+4.8rem)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 font-sans select-none z-30 max-w-[92vw]">
      <div className="flex items-center gap-4 sm:gap-6 rounded-2xl bg-neutral-950/90 border border-neutral-800 px-4 py-2.5 sm:px-6 sm:py-3.5 shadow-2xl backdrop-blur-md pointer-events-auto">
        {/* Speedometer */}
        <div className="flex flex-col items-center pr-4 border-r border-neutral-800">
          <div className="text-3xl font-black font-mono tracking-tight text-white">
            {speedKmh}
          </div>
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            KM / H
          </div>
        </div>

        {/* Vehicle Identity & Battery */}
        <div className="flex flex-col gap-1.5 min-w-[140px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-200 flex items-center gap-1.5">
              <Car className="h-4 w-4 text-amber-400" />
              Nomad EV Buggy
            </span>
            <span className="font-mono text-amber-400 font-bold">{Math.round(vehicleState.batteryPercent)}%</span>
          </div>

          <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-150"
              style={{ width: `${Math.max(0, Math.min(100, vehicleState.batteryPercent))}%` }}
            />
          </div>
        </div>

        {/* Headlight & Exit Buttons */}
        <div className="flex items-center gap-2 pl-4 border-l border-neutral-800">
          <button
            onClick={onToggleHeadlights}
            className={`p-2 rounded-xl border cursor-pointer transition-colors ${
              vehicleState.headlightsOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle High-Beam Headlights"
          >
            <Lightbulb className="h-5 w-5" />
          </button>

          <button
            onClick={onExitVehicle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>EXIT [F]</span>
          </button>
        </div>
      </div>
    </div>
  );
};
