/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Car, Zap, Lightbulb, LogOut, Lock, Unlock, Gauge, Compass } from 'lucide-react';
import { VehicleState } from '../types/game';

interface VehicleHUDProps {
  vehicleState: VehicleState;
  speed: number;
  onExitVehicle: () => void;
  onToggleHeadlights: () => void;
  onToggleLock?: () => void;
}

export const VehicleHUD: React.FC<VehicleHUDProps> = ({
  vehicleState,
  speed,
  onExitVehicle,
  onToggleHeadlights,
  onToggleLock,
}) => {
  const speedKmh = Math.round(Math.abs(speed) * 3.6);
  const odometerDisplay = (vehicleState.odometerKm || 0).toFixed(1);
  const gear = vehicleState.gear || (speedKmh > 0 ? 'D' : speed < -0.1 ? 'R' : 'P');
  const rpm = vehicleState.rpm || 800;
  const isPedal = vehicleState.fuelType === 'pedal';

  return (
    <div className="pointer-events-none absolute bottom-[calc(max(0.75rem,var(--sab))+4.8rem)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 font-sans select-none z-30 max-w-[94vw]">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-6 rounded-2xl bg-neutral-950/92 border border-neutral-800 px-4 py-2.5 sm:px-6 sm:py-3.5 shadow-2xl backdrop-blur-md pointer-events-auto">
        {/* Gear & Speedometer Cluster */}
        <div className="flex items-center gap-3 pr-3 sm:pr-4 border-r border-neutral-800">
          {/* Active Gear */}
          <div className="flex flex-col items-center">
            <span className={`text-xl sm:text-2xl font-black font-mono px-2 py-0.5 rounded-lg border ${
              gear === 'R'
                ? 'bg-rose-950/80 text-rose-400 border-rose-800/80'
                : gear === 'D'
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                : 'bg-neutral-900 text-amber-400 border-neutral-800'
            }`}>
              {gear}
            </span>
            <span className="text-[8px] font-bold text-neutral-500 uppercase mt-0.5">GEAR</span>
          </div>

          {/* Speedometer */}
          <div className="flex flex-col items-center">
            <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white tabular-nums">
              {speedKmh}
            </div>
            <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
              KM / H
            </div>
          </div>
        </div>

        {/* Real-Life Odometer & Engine RPM */}
        <div className="flex flex-col gap-1 min-w-[130px] sm:min-w-[160px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-200 truncate max-w-[140px] sm:max-w-[180px] flex items-center gap-1.5" title={vehicleState.name}>
              <Car className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{vehicleState.name}</span>
            </span>
            <span className="font-mono text-amber-400 font-bold text-[11px] whitespace-nowrap">
              {isPedal ? 'PEDAL' : `${Math.round(vehicleState.batteryPercent)}%`}
            </span>
          </div>

          {/* Fuel / Battery Bar */}
          <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden border border-neutral-700/50">
            <div
              className={`h-full transition-all duration-150 ${
                isPedal 
                  ? 'bg-emerald-400 w-full' 
                  : 'bg-gradient-to-r from-amber-500 to-emerald-400'
              }`}
              style={{ width: isPedal ? '100%' : `${Math.max(0, Math.min(100, vehicleState.batteryPercent))}%` }}
            />
          </div>

          {/* Real-Life Odometer & RPM Readout */}
          <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-0.5">
            <span className="flex items-center gap-1">
              <Compass className="h-3 w-3 text-cyan-400" />
              <span>ODO: <strong className="text-neutral-200">{odometerDisplay} km</strong></span>
            </span>
            <span>
              {isPedal ? `${rpm} RPM (Cadence)` : `${rpm} RPM`}
            </span>
          </div>
        </div>

        {/* Action Controls: Lock, Headlights, Exit */}
        <div className="flex items-center gap-2 pl-3 sm:pl-4 border-l border-neutral-800">
          {/* Lock / Unlock Toggle Button */}
          {onToggleLock && (
            <button
              onClick={onToggleLock}
              className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                vehicleState.isLocked
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800/80'
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
              }`}
              title={vehicleState.isLocked ? 'Vehicle LOCKED [Press K]' : 'Vehicle UNLOCKED [Press K]'}
            >
              {vehicleState.isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          )}

          {/* Headlights Toggle Button */}
          <button
            onClick={onToggleHeadlights}
            className={`p-2 rounded-xl border cursor-pointer transition-colors ${
              vehicleState.headlightsOn
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title="Toggle High-Beam Headlights [L]"
          >
            <Lightbulb className="h-4 w-4" />
          </button>

          {/* Exit Button */}
          <button
            onClick={onExitVehicle}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">EXIT [F]</span>
            <span className="sm:hidden">EXIT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
