import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Crosshair,
  Droplets,
  Zap,
  Fan,
  Warehouse,
  Activity,
  Sprout,
  Wrench,
  ArrowUpDown,
  Lightbulb,
  Film,
  Waves,
  Fuel,
} from 'lucide-react';
import type { AurelionLevelId } from '../engine/aurelion/AurelionConfig';
import type {
  AurelionDashboardSnapshot,
  AurelionRoomLightsState,
  ElevatorId,
  HvacMode,
  PowerPriorityMode,
} from '../engine/aurelion/AurelionSystems';

interface ApartmentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshot: AurelionDashboardSnapshot | null;
  // Compound & Floor 1 toggles
  compoundGateOpen: boolean;
  onToggleCompoundGate: () => void;
  garageShutterOpen: boolean;
  onToggleGarageShutter: () => void;
  frontDoorOpen: boolean;
  onToggleFrontDoor: () => void;
  fanOn: boolean;
  onToggleFan: () => void;
  acOn: boolean;
  onToggleAC: () => void;
  turretKills?: number;
  // Aurelion 9-Level interactive controls
  onToggleGenerator: () => void;
  onRefuelGenerator: () => void;
  onSetPowerPriority: (mode: PowerPriorityMode) => void;
  onTogglePurifier: () => void;
  onDrawWaterBottle: () => void;
  onRepairMaintenance: () => void;
  onSetHvacMode: (mode: HvacMode) => void;
  onToggleCinema: () => void;
  onToggleAquariumLights: () => void;
  onToggleFloorLight: (key: keyof AurelionRoomLightsState) => void;
  onPlantHydroBed: (bedId: number) => void;
  onHarvestHydroBed: (bedId: number) => void;
  onCommandElevator: (elevatorId: ElevatorId, floor: AurelionLevelId) => void;
}

type ModalTab = 'systems' | 'elevators' | 'hydroponics' | 'lighting' | 'access';

const FLOOR_LIGHT_LABELS: Array<{ key: keyof AurelionRoomLightsState; label: string }> = [
  { key: 'b2', label: 'B2 Infrastructure' },
  { key: 'b1', label: 'B1 Operations' },
  { key: 'f1', label: 'F1 Grand Palace' },
  { key: 'f2', label: 'F2 Residence' },
  { key: 'f3', label: 'F3 Medical' },
  { key: 'f4', label: 'F4 Armory & Gear' },
  { key: 'f5', label: 'F5 Sky Farm' },
  { key: 'f6', label: 'F6 Resort' },
  { key: 'f7', label: 'F7 Crown' },
];

export const ApartmentStatusModal: React.FC<ApartmentStatusModalProps> = ({
  isOpen,
  onClose,
  snapshot,
  compoundGateOpen,
  onToggleCompoundGate,
  garageShutterOpen,
  onToggleGarageShutter,
  frontDoorOpen,
  onToggleFrontDoor,
  fanOn,
  onToggleFan,
  acOn,
  onToggleAC,
  turretKills = 0,
  onToggleGenerator,
  onRefuelGenerator,
  onSetPowerPriority,
  onTogglePurifier,
  onDrawWaterBottle,
  onRepairMaintenance,
  onSetHvacMode,
  onToggleCinema,
  onToggleAquariumLights,
  onToggleFloorLight,
  onPlantHydroBed,
  onHarvestHydroBed,
  onCommandElevator,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('systems');

  if (!isOpen) return null;

  const batteryPct = snapshot ? snapshot.power.batteryPercent : 0;
  const potablePct = snapshot
    ? Math.max(0, Math.min(100, Math.round((snapshot.water.treatedLiters / snapshot.water.maxCapacityLiters) * 100)))
    : 0;
  const rawPct = snapshot
    ? Math.max(0, Math.min(100, Math.round((snapshot.water.rawLiters / snapshot.water.maxCapacityLiters) * 100)))
    : 0;
  const fuelPct = snapshot
    ? Math.max(0, Math.min(100, Math.round((snapshot.power.fuelLiters / snapshot.power.fuelCapacityLiters) * 100)))
    : 0;
  const integrityPct = snapshot ? Math.round(snapshot.climate.maintenanceIntegrity) : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-5 select-none">
      <div className="flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-neutral-950 border border-amber-500/30 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4 bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2.5 text-amber-300 border border-amber-500/35">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.24em] text-amber-400 block">
                THE AURELION · 9-Level Private Estate Management OS
              </span>
              <h2 className="text-lg sm:text-xl font-bold tracking-wide text-neutral-100">
                Estate Engineering, Life Support & Defense Matrix
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
            aria-label="Close terminal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-neutral-800 bg-neutral-900/70 px-6 py-2.5">
          {(
            [
              { id: 'systems', label: 'Power, Water & Integrity' },
              { id: 'elevators', label: '3-Shaft Elevators' },
              { id: 'hydroponics', label: 'F5 Hydroponic Farm (12)' },
              { id: 'lighting', label: '9-Floor Lighting & Climate' },
              { id: 'access', label: 'Compound Gates & Turrets' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {!snapshot ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-sm text-neutral-400">
              Synchronizing live telemetry from B2 Infrastructure Kingdom...
            </div>
          ) : activeTab === 'systems' ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Power Microgrid */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                      <Zap className="h-4 w-4 text-amber-400" />
                      B2 LiFePO4 Microgrid & Solar
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      {snapshot.power.batteryKwh.toFixed(1)} / {snapshot.power.batteryCapacityKwh} kWh ({batteryPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60 mb-3">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${batteryPct}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                    <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-2">
                      <span className="text-neutral-400 block text-[10px] uppercase">F7 Solar</span>
                      <strong className="text-emerald-400 font-mono">+{snapshot.power.solarKw.toFixed(1)} kW</strong>
                    </div>
                    <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-2">
                      <span className="text-neutral-400 block text-[10px] uppercase">Estate Load</span>
                      <strong className="text-amber-300 font-mono">-{snapshot.power.totalDemandKw.toFixed(1)} kW</strong>
                    </div>
                    <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-2">
                      <span className="text-neutral-400 block text-[10px] uppercase">Net Balance</span>
                      <strong
                        className={`font-mono ${snapshot.power.netKw >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {snapshot.power.netKw >= 0 ? '+' : ''}
                        {snapshot.power.netKw.toFixed(1)} kW
                      </strong>
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-300 mb-2">Load Shedding Priority:</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['balanced', 'critical', 'luxury'] as PowerPriorityMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onSetPowerPriority(mode)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-bold uppercase cursor-pointer transition-colors ${
                          snapshot.power.priorityMode === mode
                            ? 'bg-amber-500 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-mono border-t border-neutral-800 pt-3">
                  <span className={snapshot.power.tier1CriticalPowered ? 'text-emerald-400' : 'text-rose-400'}>
                    T1 Critical: {snapshot.power.tier1CriticalPowered ? 'ON' : 'OFF'}
                  </span>
                  <span className={snapshot.power.tier2StandardPowered ? 'text-emerald-400' : 'text-rose-400'}>
                    · T2 Standard: {snapshot.power.tier2StandardPowered ? 'ON' : 'SHED'}
                  </span>
                  <span className={snapshot.power.tier3LuxuryPowered ? 'text-emerald-400' : 'text-rose-400'}>
                    · T3 Luxury: {snapshot.power.tier3LuxuryPowered ? 'ON' : 'SHED'}
                  </span>
                </div>
              </div>

              {/* Twin Diesel Generators & Fuel */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                      <Fuel className="h-4 w-4 text-orange-400" />
                      B2 Twin Diesel Generators (70 kW)
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                        snapshot.power.generatorRunning
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {snapshot.power.generatorRunning ? `RUNNING (+${snapshot.power.generatorKw.toFixed(0)} kW)` : 'STANDBY'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-300 mb-1.5">
                    <span>Diesel Fuel Reserve</span>
                    <span className="font-mono font-bold">
                      {Math.round(snapshot.power.fuelLiters)} / {snapshot.power.fuelCapacityLiters} L ({fuelPct}%)
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60 mb-4">
                    <div className="h-full bg-orange-400 transition-all" style={{ width: `${fuelPct}%` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={onToggleGenerator}
                    className={`py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      snapshot.power.generatorRunning
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    }`}
                  >
                    {snapshot.power.generatorRunning ? 'Stop Generators' : 'Start Generators'}
                  </button>
                  <button
                    onClick={onRefuelGenerator}
                    className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 cursor-pointer transition-colors"
                  >
                    Top Off Fuel (+120 L)
                  </button>
                </div>
              </div>

              {/* Water Reserves & RO/UV Purification */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                      <Droplets className="h-4 w-4 text-cyan-400" />
                      B2 RO/UV Water Filtration Plant
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      {snapshot.water.purifierActive ? `${snapshot.water.purificationLitersPerHour} L/h ACTIVE` : 'PAUSED'}
                    </span>
                  </div>
                  <div className="space-y-2.5 mb-3">
                    <div>
                      <div className="flex justify-between text-xs text-neutral-300 mb-1">
                        <span>Potable Cistern</span>
                        <span className="font-mono font-bold">
                          {Math.round(snapshot.water.treatedLiters).toLocaleString()} /{' '}
                          {snapshot.water.maxCapacityLiters.toLocaleString()} L ({potablePct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                        <div className="h-full bg-cyan-400 transition-all" style={{ width: `${potablePct}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-neutral-300 mb-1">
                        <span>Raw Rain & Cistern Intake</span>
                        <span className="font-mono font-bold">
                          {Math.round(snapshot.water.rawLiters).toLocaleString()} /{' '}
                          {snapshot.water.maxCapacityLiters.toLocaleString()} L ({rawPct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                        <div className="h-full bg-sky-600 transition-all" style={{ width: `${rawPct}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={onTogglePurifier}
                    className={`py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      snapshot.water.purifierActive
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                    }`}
                  >
                    {snapshot.water.purifierActive ? 'Pause Purifier' : 'Enable Purifier'}
                  </button>
                  <button
                    onClick={onDrawWaterBottle}
                    className="py-2 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-200 cursor-pointer transition-colors"
                  >
                    Bottle Clean Water (-2 L)
                  </button>
                </div>
              </div>

              {/* Structural & Mechanical Maintenance */}
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Estate Mechanical Integrity
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">{integrityPct}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-neutral-800 overflow-hidden border border-neutral-700/60 mb-3">
                    <div className="h-full bg-emerald-400 transition-all" style={{ width: `${integrityPct}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-2.5">
                      <span className="text-neutral-400 block text-[10px] uppercase">Footprint</span>
                      <strong className="text-neutral-200">30 × 24 m · 9 Levels</strong>
                    </div>
                    <div className="rounded-lg bg-neutral-950 border border-neutral-800 p-2.5">
                      <span className="text-neutral-400 block text-[10px] uppercase">Envelopes</span>
                      <strong className="text-neutral-200">B2–B1 Vault + F1–F7 Glass</strong>
                    </div>
                  </div>
                </div>
                <button
                  onClick={onRepairMaintenance}
                  className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  Run Full System Calibration (Restore 100%)
                </button>
              </div>
            </div>
          ) : activeTab === 'elevators' ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Object.values(snapshot.elevators).map((el) => (
                <div
                  key={el.id}
                  className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        {el.name}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-neutral-300 mb-3">
                      Cab Floor: <strong className="text-white">{el.currentFloor}</strong>
                      {el.moving ? ` → ${el.targetFloor}` : ' (IDLE)'}
                      {el.lockedByLoadShedding && (
                        <span className="block text-rose-400 mt-1">LOCKED BY POWER SHEDDING</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {el.stops.map((stop) => (
                      <button
                        key={stop}
                        disabled={el.lockedByLoadShedding}
                        onClick={() => onCommandElevator(el.id, stop)}
                        className={`py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                          el.lockedByLoadShedding
                            ? 'bg-neutral-800/50 text-neutral-600 cursor-not-allowed'
                            : el.currentFloor === stop && !el.moving
                              ? 'bg-amber-500 text-neutral-950 cursor-pointer'
                              : el.targetFloor === stop && el.moving
                                ? 'bg-cyan-600 text-white cursor-pointer'
                                : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 cursor-pointer'
                        }`}
                      >
                        {stop}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === 'hydroponics' ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snapshot.agriculture.beds.map((bed) => {
                const pct = Math.round(bed.growthProgress * 100);
                return (
                  <div
                    key={bed.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3.5 flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                          <Sprout className="h-3.5 w-3.5 text-emerald-400" />
                          {bed.label}
                        </span>
                        <span className="text-[10px] font-mono uppercase text-emerald-300">{bed.cropType}</span>
                      </div>
                      <div className="mt-2 h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
                        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="mt-1 flex justify-between text-[11px] font-mono text-neutral-400">
                        <span>
                          {bed.stage === 0
                            ? 'Empty Trough'
                            : bed.stage === 1
                              ? 'Seedling'
                              : bed.stage === 2
                                ? 'Maturing'
                                : 'Ready to Harvest'}
                        </span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                    {bed.stage === 0 ? (
                      <button
                        onClick={() => onPlantHydroBed(bed.id)}
                        className="w-full py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-bold text-white cursor-pointer"
                      >
                        Plant Seeds
                      </button>
                    ) : bed.stage === 3 ? (
                      <button
                        onClick={() => onHarvestHydroBed(bed.id)}
                        className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-neutral-950 cursor-pointer"
                      >
                        Harvest Produce
                      </button>
                    ) : (
                      <div className="text-center text-[11px] font-mono text-neutral-500 py-1">
                        Automated Nutrient Feed Active
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : activeTab === 'lighting' ? (
            <div className="space-y-5">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                    <Lightbulb className="h-4 w-4 text-amber-300" />
                    9-Level Architectural Lighting Matrix
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FLOOR_LIGHT_LABELS.map(({ key, label }) => {
                    const isOn = snapshot.climate.roomLights[key];
                    return (
                      <button
                        key={String(key)}
                        onClick={() => onToggleFloorLight(key)}
                        className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                          isOn
                            ? 'border-amber-500/60 bg-amber-500/10 text-amber-200'
                            : 'border-neutral-800 bg-neutral-950 text-neutral-400'
                        }`}
                      >
                        <div className="text-xs font-bold">{label}</div>
                        <div className="text-[11px] font-mono mt-0.5">{isOn ? 'ILLUMINATED' : 'DIMMED'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-3">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                    <Fan className="h-4 w-4 text-cyan-400" />
                    B2 HVAC & Floor 1 Climate Controls
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['comfort', 'eco', 'off'] as HvacMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => onSetHvacMode(mode)}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase cursor-pointer ${
                          snapshot.climate.hvacMode === mode
                            ? 'bg-cyan-500 text-neutral-950'
                            : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                        }`}
                      >
                        HVAC {mode}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onToggleFan}
                      className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                        fanOn ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      F1 Ceiling Fan: {fanOn ? 'ON' : 'OFF'}
                    </button>
                    <button
                      onClick={onToggleAC}
                      className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${
                        acOn ? 'bg-emerald-600 text-white' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      F1 Wall AC: {acOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 space-y-3">
                  <div className="text-xs font-bold text-neutral-200 flex items-center gap-2">
                    <Film className="h-4 w-4 text-amber-300" />
                    Floor 6 Resort & Entertainment Systems
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onToggleCinema}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold cursor-pointer ${
                        snapshot.climate.cinemaOn ? 'bg-amber-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      4K Cinema: {snapshot.climate.cinemaOn ? 'ON' : 'STANDBY'}
                    </button>
                    <button
                      onClick={onToggleAquariumLights}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 ${
                        snapshot.climate.aquariumLightsOn ? 'bg-cyan-600 text-white' : 'bg-neutral-800 text-neutral-300'
                      }`}
                    >
                      <Waves className="h-3.5 w-3.5" />
                      Aquarium LED: {snapshot.climate.aquariumLightsOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 sm:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="flex items-center gap-2 text-sm font-bold text-neutral-200">
                    <Warehouse className="h-4 w-4 text-teal-400" />
                    Compound Gates & Estate Entrances
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={onToggleCompoundGate}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-neutral-300 block">Main 12 m Compound Gate</span>
                    <span
                      className={`mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        compoundGateOpen ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {compoundGateOpen ? 'OPEN' : 'SECURED'}
                    </span>
                  </button>
                  <button
                    onClick={onToggleGarageShutter}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-neutral-300 block">4-Bay Vehicle Garage Shutters</span>
                    <span
                      className={`mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        garageShutterOpen ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {garageShutterOpen ? 'RAISED' : 'LOWERED'}
                    </span>
                  </button>
                  <button
                    onClick={onToggleFrontDoor}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 text-left hover:border-neutral-600 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-neutral-300 block">Aurelion Grand Entrance Doors</span>
                    <span
                      className={`mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                        frontDoorOpen ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {frontDoorOpen ? 'OPEN' : 'LOCKED'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 sm:col-span-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crosshair className="h-5 w-5 text-rose-400" />
                  <div>
                    <div className="text-sm font-bold text-neutral-100">20-Tower Autonomous Perimeter Defense</div>
                    <div className="text-xs text-neutral-400">
                      Preserved perimeter turrets & 5km radar integrated with B1 Security Monitoring.
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-neutral-400">Verified Eliminations</div>
                  <div className="text-xl font-mono font-bold text-amber-400">{turretKills}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="border-t border-neutral-800 px-6 py-3 text-xs text-neutral-500 flex items-center justify-between bg-neutral-950">
          <span>THE AURELION BMS · Live Engine Telemetry</span>
          <span>Press [Esc] or Click Close to Exit</span>
        </footer>
      </div>
    </div>
  );
};
