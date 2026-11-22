import React, { useState } from 'react';
import {
  Train,
  Volume2,
  LogOut,
  Camera,
  Sun,
  Radio,
  Sliders,
  ChevronRight,
  Minimize2,
  Maximize2,
  Clock,
  Compass,
  Armchair,
  DoorOpen,
  DoorClosed,
  Eye,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { TrainHUDData } from '../engine/world/AITrainManager';

interface TrainHUDProps {
  hudData: TrainHUDData;
  onExitTrain: () => void;
  onToggleDrive?: () => void; // Used for Pilot Observer Seat toggle
  onToggleSit?: () => void;
  onThrottleUp?: () => void;
  onThrottleDown?: () => void;
  onToggleReverse?: () => void;
  onHonkHorn?: () => void;
  onToggleHeadlights?: () => void;
  onToggleDoors?: () => void;
  onCycleCamera?: () => void;
}

export const TrainHUD: React.FC<TrainHUDProps> = ({
  hudData,
  onExitTrain,
  onToggleDrive,
  onToggleSit,
  onHonkHorn,
  onToggleHeadlights,
  onToggleDoors,
  onCycleCamera,
}) => {
  const [minimized, setMinimized] = useState(false);

  const signalBadge =
    hudData.signalAspect === 'green'
      ? 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50'
      : hudData.signalAspect === 'yellow'
      ? 'text-amber-400 bg-amber-950/80 border-amber-500/50'
      : 'text-rose-400 bg-rose-950/80 border-rose-500/50';

  const cameraLabel =
    hudData.cameraMode === 'interior_1st'
      ? '1ST PERSON'
      : hudData.cameraMode === 'interior_3rd'
      ? '3RD PERSON'
      : hudData.cameraMode === 'cab'
      ? 'CAB WINDSHIELD'
      : hudData.cameraMode === 'chase'
      ? 'CHASE CAM'
      : 'REAR LOUNGE';

  if (minimized) {
    return (
      <div className="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-3 font-mono select-none">
        <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-cyan-400/50 bg-neutral-950/95 px-3.5 py-2 shadow-2xl text-neutral-100">
          <div className="flex items-center gap-2">
            <Train className="h-4 w-4 text-cyan-400 animate-pulse" />
            <span className="font-black text-amber-400 text-xs">{hudData.trainNumber}</span>
            <span className="text-neutral-500">·</span>
            <span className="text-xs font-bold text-white">{hudData.speedKmh} KM/H</span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            {hudData.isDwelling ? (
              <span className="text-amber-300 font-bold">DEP: {hudData.departureCountdownText}</span>
            ) : (
              <span className="text-cyan-300 font-bold">ARR: {hudData.arrivalCountdownText}</span>
            )}
          </div>

          <button
            onClick={() => setMinimized(false)}
            className="flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-950/50 px-2 py-1 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
            title="Restore Railway Stopwatch HUD"
          >
            <Maximize2 className="h-3 w-3" />
            <span>EXPAND</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-2.5 sm:p-4 font-sans select-none">
      {/* Top Header: Route, Timetable Countdowns & Identity */}
      <div className="flex flex-col items-center gap-2 max-w-4xl mx-auto w-full">
        {/* Dynamic PA Announcement Ribbon */}
        <div
          aria-live="polite"
          className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-cyan-400/40 bg-slate-950/90 px-4 py-1.5 text-center text-xs font-semibold text-cyan-100 shadow-2xl max-w-[95vw]"
        >
          <Volume2 className="h-4 w-4 shrink-0 text-amber-300 animate-pulse" />
          <span className="truncate">{hudData.announcement}</span>
        </div>

        {/* Train Consist Information Card */}
        <div className="pointer-events-auto flex flex-col gap-2 rounded-2xl border border-neutral-700/80 bg-neutral-950/95 p-3 shadow-2xl w-full text-xs text-neutral-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400">
                <Train className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-mono">
                  <span className="font-black text-amber-400 text-sm tracking-wider">{hudData.trainNumber}</span>
                  <span className="text-neutral-500">·</span>
                  <span className="font-bold text-white tracking-wide">{hudData.serviceName}</span>
                  <span className="text-neutral-500">({hudData.line})</span>
                </div>
                <div className="text-[10px] text-cyan-300/80 font-mono flex items-center gap-1.5">
                  <Compass className="h-3 w-3 inline text-cyan-400" />
                  <span>{hudData.directionLabel}</span>
                  <span className="text-neutral-600">|</span>
                  <span className="text-emerald-400 font-bold">AI OPERATED</span>
                </div>
              </div>
            </div>

            {/* Current Compartment Badge */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-700/70 text-[11px] font-mono">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-amber-300">{hudData.carriageName}</span>
            </div>

            {/* Minimize Toggle Button */}
            <button
              onClick={() => setMinimized(true)}
              className="flex items-center gap-1 rounded-xl border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] font-mono font-bold text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Minimize HUD"
            >
              <Minimize2 className="h-3.5 w-3.5" />
              <span>MINIMIZE</span>
            </button>
          </div>

          {/* STOPWATCH AND COUNTDOWN ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono">
            {/* Box 1: Departure Countdown (< 300s) */}
            <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${
              hudData.isDwelling
                ? 'border-amber-500/60 bg-amber-950/40 text-amber-200'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-400'
            }`}>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>DEPARTURE IN</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-300 leading-tight">
                {hudData.isDwelling ? hudData.departureCountdownText : 'DEPARTED'}
              </div>
              <div className="text-[9px] text-neutral-400">STATION DWELLING</div>
            </div>

            {/* Box 2: Arrival Countdown (< 300s) */}
            <div className={`flex flex-col items-center justify-center p-2 rounded-xl border ${
              !hudData.isDwelling
                ? 'border-cyan-500/60 bg-cyan-950/40 text-cyan-200'
                : 'border-neutral-800 bg-neutral-900/60 text-neutral-400'
            }`}>
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                <Clock className="h-3 w-3 text-cyan-400" />
                <span>NEXT ARRIVAL IN</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-300 leading-tight">
                {!hudData.isDwelling ? hudData.arrivalCountdownText : 'AT PLATFORM'}
              </div>
              <div className="text-[9px] text-neutral-400">
                {hudData.distToNextMeters}m TO {hudData.nextStation}
              </div>
            </div>

            {/* Box 3: AI Pilot Status & Speed */}
            <div className="flex flex-col justify-center p-2 rounded-xl border border-neutral-800 bg-neutral-900/60">
              <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400">
                <span>AI PILOT STATUS</span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {hudData.aiStatus}
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl sm:text-2xl font-black text-white">{hudData.speedKmh} <span className="text-xs font-normal text-neutral-400">KM/H</span></span>
                <span className="text-xs font-mono text-cyan-300">{hudData.speedMph} MPH</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-0.5">
                <span>DOORS:</span>
                <span className={hudData.doorsOpen ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {hudData.doorsOpen ? 'OPEN (PLATFORM)' : 'LOCKED (CRUISING)'}
                </span>
              </div>
            </div>
          </div>

          {/* Station Progression Route Ribbon */}
          <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto py-1 border-t border-neutral-800/80 font-mono text-neutral-300">
            <span className="text-neutral-500 font-bold">ROUTE:</span>
            <span className="text-neutral-400 truncate max-w-[140px]">{hudData.currentStation}</span>
            <ChevronRight className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="text-cyan-300 font-black truncate max-w-[160px] underline decoration-cyan-500/50">
              {hudData.nextStation}
            </span>
            {hudData.upcomingStations.map((st, i) => (
              <React.Fragment key={i}>
                <ChevronRight className="h-3 w-3 text-neutral-600 shrink-0" />
                <span className="text-neutral-500 truncate max-w-[130px] hidden md:inline">{st}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Deck: Passenger Observation Actions & Camera Views */}
      <div className="flex flex-col gap-2 max-w-4xl mx-auto w-full">
        <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-2 sm:p-2.5 shadow-2xl">
          {/* Left Cluster: Compartment Status */}
          <div className="flex items-center gap-2">
            {/* Observer Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-700 text-xs font-mono">
              <Eye className="h-4 w-4 text-cyan-400" />
              <span className="text-white font-bold">
                {hudData.isPilotSeated
                  ? 'PILOT CAB OBSERVER'
                  : hudData.isSeated
                  ? 'PASSENGER SEATED'
                  : 'EXPLORING CARRIAGES'}
              </span>
            </div>

            {/* Signal Indicator */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-mono font-bold ${signalBadge}`}>
              <Radio className="h-3.5 w-3.5" />
              <span className="uppercase">{hudData.signalAspect} SIGNAL</span>
            </div>
          </div>

          {/* Center Cluster: Actions (Observer pilot seat, Sit down, Camera, Horn, Lights) */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Camera View Switcher */}
            {onCycleCamera && (
              <button
                onClick={onCycleCamera}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 transition-colors text-neutral-200 text-xs font-bold cursor-pointer"
                title="Switch Camera View [C]"
              >
                <Camera className="h-3.5 w-3.5 text-cyan-400" />
                <span className="text-[11px] font-mono">{cameraLabel}</span>
              </button>
            )}

            {/* Pilot Observer Seat Toggle (Inside Locomotive Cab) */}
            {onToggleDrive && (hudData.canTakeControls || hudData.isPilotSeated) && (
              <button
                onClick={onToggleDrive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer shadow-lg ${
                  hudData.isPilotSeated
                    ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
                }`}
                title="Toggle Pilot Observer Seat [E]"
              >
                <Eye className="h-4 w-4" />
                <span>{hudData.isPilotSeated ? 'STAND UP [E]' : 'PILOT SEAT [E]'}</span>
              </button>
            )}

            {/* Standard Passenger Seat (Dining table, Passenger coach, Sleeping bunk, Lounge) */}
            {onToggleSit && !hudData.isPilotSeated && (hudData.canSit || hudData.isSeated) && (
              <button
                onClick={onToggleSit}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  hudData.isSeated
                    ? 'bg-amber-700/80 hover:bg-amber-600 border-amber-500 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 border-blue-400 text-white'
                }`}
                title="Sit Down / Stand Up [E]"
              >
                <Armchair className="h-3.5 w-3.5" />
                <span>{hudData.isSeated ? 'STAND UP [E]' : 'SIT DOWN [E]'}</span>
              </button>
            )}

            {/* Train Horn */}
            {onHonkHorn && (
              <button
                onClick={onHonkHorn}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-amber-300 text-xs font-bold cursor-pointer"
                title="Train Horn [H]"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">HORN [H]</span>
              </button>
            )}

            {/* Headlights */}
            {onToggleHeadlights && (
              <button
                onClick={onToggleHeadlights}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  hudData.headlightsOn
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
                title="Headlights [L]"
              >
                <Sun className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">LIGHTS [L]</span>
              </button>
            )}

            {/* Passenger Doors Toggle */}
            {onToggleDoors && (
              <button
                onClick={onToggleDoors}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${
                  hudData.doorsOpen
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                }`}
                title="Toggle Doors [G]"
              >
                {hudData.doorsOpen ? <DoorOpen className="h-3.5 w-3.5 text-cyan-300" /> : <DoorClosed className="h-3.5 w-3.5" />}
                <span className="hidden sm:inline">DOORS [G]</span>
              </button>
            )}
          </div>

          {/* Right Cluster: Exit Train Button */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onExitTrain}
              disabled={!hudData.canExit}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                hudData.canExit
                  ? 'bg-rose-700 hover:bg-rose-600 border-rose-500 text-white cursor-pointer shadow-lg'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-500 cursor-not-allowed opacity-60'
              }`}
              title={hudData.canExit ? 'Step out safely onto station platform' : 'Train moving at speed — wait for station stop'}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>EXIT TRAIN</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
