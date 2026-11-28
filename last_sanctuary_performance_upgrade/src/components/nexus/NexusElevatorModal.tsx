import React, { useState, useEffect } from 'react';
import { X, ArrowUpDown, ShieldAlert, Wrench, Lock } from 'lucide-react';
import {
  NEXUS_ELEVATORS,
  NEXUS_FLOORS,
  NEXUS_FLOOR_ORDER,
  type NexusElevatorId,
  type NexusFloorNumber,
} from '../../engine/nexus/NexusConfig';
import {
  hasNexusClearance,
  type NexusDashboardSnapshot,
} from '../../engine/nexus/NexusSystems';

interface NexusElevatorModalProps {
  elevatorId: NexusElevatorId | null;
  snapshot: NexusDashboardSnapshot | null;
  onSelectFloor: (elevatorId: NexusElevatorId, floor: NexusFloorNumber) => void;
  onToggleMaintenance: (elevatorId: NexusElevatorId) => void;
  onClose: () => void;
}

export const NexusElevatorModal: React.FC<NexusElevatorModalProps> = ({
  elevatorId,
  snapshot,
  onSelectFloor,
  onToggleMaintenance,
  onClose,
}) => {
  const [activeShaft, setActiveShaft] = useState<NexusElevatorId>(elevatorId || 'liftA');

  useEffect(() => {
    if (elevatorId) setActiveShaft(elevatorId);
  }, [elevatorId]);

  if (!elevatorId || !snapshot) return null;

  const cfg = NEXUS_ELEVATORS[activeShaft];
  const runtime = snapshot.systems.elevators[activeShaft];
  const clearance = snapshot.systems.clearanceLevel;
  const isLuxury = activeShaft === 'liftA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div
        className={`w-full max-w-2xl rounded-xl border bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden ${
          isLuxury ? 'border-amber-500/45' : 'border-cyan-500/45'
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2.5 border ${
                isLuxury
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40'
              }`}
            >
              <ArrowUpDown className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[11px] font-mono tracking-wider text-neutral-400">
                THE NEXUS · Vertical Transit ({cfg.speedMetersPerSec.toFixed(1)} m/s)
              </div>
              <h3 className="text-base font-semibold text-white">{cfg.name}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
            aria-label="Close elevator control"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Dual-Lift Switcher (Strictly 2 Elevators) */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="inline-flex rounded-lg bg-neutral-900 p-1 border border-neutral-800">
              {(['liftA', 'liftB'] as NexusElevatorId[]).map((id) => {
                const st = snapshot.systems.elevators[id];
                const active = activeShaft === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveShaft(id)}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? id === 'liftA'
                          ? 'bg-amber-500 text-neutral-950 font-semibold'
                          : 'bg-cyan-500 text-neutral-950 font-semibold'
                        : 'text-neutral-300 hover:text-white'
                    }`}
                  >
                    {id === 'liftA' ? 'Lift A · Grand Glass' : 'Lift B · Express Titanium'} (F{st.currentFloor})
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onToggleMaintenance(activeShaft)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                runtime.maintenanceHold
                  ? 'border-rose-500/60 bg-rose-950/60 text-rose-200 hover:bg-rose-900/60'
                  : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
              }`}
            >
              <Wrench className="h-3.5 w-3.5" />
              {runtime.maintenanceHold ? 'Release Maintenance Hold' : 'Maintenance Hold'}
            </button>
          </div>

          {/* Live Cab Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-neutral-800 bg-neutral-900/70 p-3.5 text-xs font-mono tabular-nums">
            <div>
              <div className="text-neutral-400 text-[11px]">Current Floor</div>
              <div className={`text-sm font-bold mt-0.5 ${isLuxury ? 'text-amber-300' : 'text-cyan-300'}`}>
                F{runtime.currentFloor} · {NEXUS_FLOORS[runtime.currentFloor].code}
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-[11px]">Elevation</div>
              <div className="text-sm font-semibold text-white mt-0.5">{runtime.currentY.toFixed(2)} m</div>
            </div>
            <div>
              <div className="text-neutral-400 text-[11px]">Door State</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {runtime.doorOpenFactor > 0.8 ? 'Open' : runtime.doorOpenFactor < 0.1 ? 'Locked' : 'Cycling'}
              </div>
            </div>
            <div>
              <div className="text-neutral-400 text-[11px]">Motion</div>
              <div className="text-sm font-semibold text-white mt-0.5">
                {runtime.maintenanceHold
                  ? 'Hold Active'
                  : runtime.moving
                    ? `En Route → F${runtime.targetFloor}`
                    : 'Standing By'}
              </div>
            </div>
          </div>

          {runtime.maintenanceHold && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/50 px-4 py-2.5 text-xs text-rose-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400" />
              <span>
                {cfg.name} is placed on maintenance hold. Release the hold above to dispatch the car.
              </span>
            </div>
          )}

          {/* Floor 1–8 Dispatch Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[48vh] overflow-y-auto pr-1">
            {[...NEXUS_FLOOR_ORDER].reverse().map((fl) => {
              const spec = NEXUS_FLOORS[fl];
              const isCurrent = runtime.currentFloor === fl && !runtime.moving;
              const isTarget = runtime.moving && runtime.targetFloor === fl;
              const isQueued = runtime.queue.includes(fl);
              const cleared = hasNexusClearance(clearance, spec.requiredClearance);

              return (
                <button
                  key={fl}
                  disabled={runtime.maintenanceHold}
                  onClick={() => {
                    onSelectFloor(activeShaft, fl);
                    onClose();
                  }}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    runtime.maintenanceHold
                      ? 'border-neutral-800 bg-neutral-900/40 text-neutral-600 cursor-not-allowed'
                      : isCurrent
                        ? isLuxury
                          ? 'border-amber-400 bg-amber-500/15 text-amber-100 cursor-pointer'
                          : 'border-cyan-400 bg-cyan-500/15 text-cyan-100 cursor-pointer'
                        : isTarget || isQueued
                          ? 'border-sky-500/70 bg-sky-500/15 text-sky-100 cursor-pointer'
                          : 'border-neutral-800 bg-neutral-900 hover:border-neutral-600 hover:bg-neutral-800/80 text-neutral-200 cursor-pointer'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white tabular-nums">{spec.code}</span>
                      <span className="text-xs font-semibold truncate">{spec.title}</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">{spec.department}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                    {!cleared && (
                      <span title={`Requires ${spec.requiredClearance} clearance`} className="text-amber-400">
                        <Lock className="h-3.5 w-3.5" />
                      </span>
                    )}
                    <span>
                      {isCurrent ? 'AT FLOOR' : isTarget ? 'EN ROUTE' : isQueued ? 'QUEUED' : 'DISPATCH'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800 pt-3">
            <span>
              Active Clearance: <strong className="text-neutral-200 capitalize">{clearance}</strong> · Trips Completed:{' '}
              <span className="font-mono tabular-nums text-neutral-200">{runtime.tripsCompleted}</span>
            </span>
            <span>East 8-Floor Staircase always open</span>
          </div>
        </div>
      </div>
    </div>
  );
};
