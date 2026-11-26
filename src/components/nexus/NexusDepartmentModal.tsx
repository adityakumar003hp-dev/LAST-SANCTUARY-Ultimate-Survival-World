import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Radio,
  TrainFront,
  Wrench,
  Cpu,
  Shield,
  Radar,
  Send,
  Trash2,
} from 'lucide-react';
import {
  NEXUS_FLOORS,
  NEXUS_SCREENS_BY_FLOOR,
  NEXUS_ELEVATORS,
  type NexusFloorNumber,
  type NexusScreenSpec,
} from '../../engine/nexus/NexusConfig';
import {
  hasNexusClearance,
  type NexusDashboardSnapshot,
} from '../../engine/nexus/NexusSystems';
import { NexusCompoundRadarView } from './NexusCompoundRadarView';
import { NexusOutbreakRadarView } from './NexusOutbreakRadarView';
import type { RailwayTrackLine } from '../../engine/world/AITrainManager';

interface NexusDepartmentModalProps {
  floor: Exclude<NexusFloorNumber, 1> | null;
  initialScreenId?: string;
  snapshot: NexusDashboardSnapshot | null;
  onTrainHold: (trainId: string) => void;
  onTrainRelease: (trainId: string) => void;
  onTrainAckWarning: (trainId: string) => void;
  onToggleLineHold: (line: RailwayTrackLine) => void;
  onToggleWorkOrder: (orderId: string) => void;
  onSendComms: (channel: string, message: string) => void;
  onPinNote: (note: string) => void;
  onRemoveNote: (idx: number) => void;
  onToggleCompoundLayer: (layerId: string) => void;
  onToggleOutbreakLayer: (layerId: string) => void;
  onToggleCompoundGate: (gateKey: 'main' | 'westPed' | 'eastPed' | 'veh1' | 'veh2' | 'garage') => void;
  onSelectScreen?: (floor: NexusFloorNumber, screenId: string) => void;
  onCompoundPrefsChange?: (rotationDeg: number, zoom: number) => void;
  onOutbreakPrefsChange?: (lonOffset: number, zoom: number, continentFilter: string) => void;
  onOpenFloor1Staff: () => void;
  onClose: () => void;
}

const DEPT_FLOORS: Array<Exclude<NexusFloorNumber, 1>> = [2, 3, 4, 5, 6, 7, 8];

export const NexusDepartmentModal: React.FC<NexusDepartmentModalProps> = ({
  floor,
  initialScreenId,
  snapshot,
  onTrainHold,
  onTrainRelease,
  onTrainAckWarning,
  onToggleLineHold,
  onToggleWorkOrder,
  onSendComms,
  onPinNote,
  onRemoveNote,
  onToggleCompoundLayer,
  onToggleOutbreakLayer,
  onToggleCompoundGate,
  onSelectScreen,
  onCompoundPrefsChange,
  onOutbreakPrefsChange,
  onOpenFloor1Staff,
  onClose,
}) => {
  const [activeFloor, setActiveFloor] = useState<Exclude<NexusFloorNumber, 1>>(floor || 2);
  const [selectedScreenId, setSelectedScreenId] = useState<string>('F2-S01');
  const [commsChannel, setCommsChannel] = useState('NEXUS-OPS');
  const [commsText, setCommsText] = useState('');
  const [alertText, setAlertText] = useState('');

  useEffect(() => {
    if (!floor) return;
    setActiveFloor(floor);
    const list = NEXUS_SCREENS_BY_FLOOR[floor];
    const savedId = snapshot?.systems.selectedScreenByFloor?.[floor];
    if (initialScreenId && list.some((s) => s.id === initialScreenId)) {
      setSelectedScreenId(initialScreenId);
    } else if (savedId && list.some((s) => s.id === savedId)) {
      setSelectedScreenId(savedId);
    } else if (list.length > 0) {
      setSelectedScreenId(list[0].id);
    }
  }, [floor, initialScreenId]);

  if (!floor || !snapshot) return null;

  const floorSpec = NEXUS_FLOORS[activeFloor];
  const screens = NEXUS_SCREENS_BY_FLOOR[activeFloor];
  const activeScreen: NexusScreenSpec =
    screens.find((s) => s.id === selectedScreenId) || screens[0];

  const hasClearance = hasNexusClearance(snapshot.systems.clearanceLevel, floorSpec.requiredClearance);
  const trains = snapshot.live.trains;
  const ob = snapshot.live.outbreak;
  const cmp = snapshot.live.compound;

  const renderScreenBody = () => {
    if (!hasClearance) {
      return (
        <div className="rounded-lg border border-amber-600/50 bg-amber-950/35 p-6 text-center space-y-3">
          <Lock className="h-8 w-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-semibold text-white">
            Clearance Required: {floorSpec.requiredClearance.toUpperCase()}
          </h3>
          <p className="text-xs text-neutral-300 max-w-md mx-auto">
            Your current Floor 1 badge level is <strong className="capitalize">{snapshot.systems.clearanceLevel}</strong>.
            Verify your Staff or Command badge at Floor 1 Reception to operate {floorSpec.code} consoles.
          </p>
          <button
            onClick={() => {
              onClose();
              onOpenFloor1Staff();
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-semibold text-neutral-950 cursor-pointer"
          >
            Open Floor 1 Staff Verification
          </button>
        </div>
      );
    }

    // Floor 7 Radar Center
    if (activeFloor === 7 && activeScreen.uiKind === 'compound_layer') {
      return (
        <NexusCompoundRadarView
          snapshot={snapshot}
          onToggleLayer={onToggleCompoundLayer}
          onToggleGate={onToggleCompoundGate}
          onPrefsChange={onCompoundPrefsChange}
          focusLayerId={activeScreen.targetId}
        />
      );
    }

    // Floor 8 Outbreak Radar Center
    if (activeFloor === 8 && activeScreen.uiKind === 'outbreak_layer') {
      return (
        <NexusOutbreakRadarView
          snapshot={snapshot}
          onToggleLayer={onToggleOutbreakLayer}
          onPinBrief={onPinNote}
          onPrefsChange={onOutbreakPrefsChange}
          focusLayerId={activeScreen.targetId}
        />
      );
    }

    // Turret Inspector (F7)
    if (activeScreen.uiKind === 'turret_inspector') {
      let subset = cmp.turrets;
      if (activeScreen.targetId && activeScreen.targetId.includes('-')) {
        const [a, b] = activeScreen.targetId.split('-').map(Number);
        if (Number.isFinite(a) && Number.isFinite(b)) {
          subset = cmp.turrets.slice(a, b + 1);
        }
      }
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Individual Perimeter Sentry Towers (Hostile-Only ROE Active)</span>
            <span className="font-mono tabular-nums text-cyan-300">{subset.length} Displayed</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {subset.map((t) => (
              <div
                key={t.id}
                className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-3 text-xs font-mono tabular-nums space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{t.name}</span>
                  <span className={t.isLockedOn ? 'text-rose-400' : 'text-emerald-400'}>
                    {t.isLockedOn ? 'LOCKED' : t.isReloading ? 'RELOAD' : 'ARMED'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Ammo</span>
                  <span className="text-neutral-100">
                    {t.ammo}/{t.maxAmmo}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>HP</span>
                  <span className="text-neutral-100">
                    {Math.round(t.health)}/{t.maxHealth}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400">
                  <span>Kills</span>
                  <span className="text-amber-300">{t.killsCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Gate Matrix (F6 / F7)
    if (activeScreen.uiKind === 'gate_matrix') {
      const gateList: Array<{ key: 'main' | 'westPed' | 'eastPed' | 'veh1' | 'veh2' | 'garage'; label: string; open: boolean }> = [
        { key: 'main', label: 'Gate 1 · Main 12m South Entrance', open: cmp.mainGateOpen },
        { key: 'westPed', label: 'Gate 2 · West Pedestrian Airlock', open: cmp.westPedOpen },
        { key: 'eastPed', label: 'Gate 3 · East Emergency Exit', open: cmp.eastPedOpen },
        { key: 'veh1', label: 'Gate 4 · South Garage Vehicle Portal', open: cmp.vehicleGate1Open },
        { key: 'veh2', label: 'Gate 5 · North Railway Vehicle Portal', open: cmp.vehicleGate2Open },
        { key: 'garage', label: 'Garage Bay Motorized Shutter', open: cmp.garageShutterOpen },
      ];
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gateList.map((g) => (
            <div
              key={g.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-800 bg-neutral-900/75 px-4 py-3 text-xs"
            >
              <div>
                <div className="font-semibold text-white">{g.label}</div>
                <div className={g.open ? 'text-emerald-400 mt-0.5' : 'text-amber-300 mt-0.5'}>
                  {g.open ? 'Status: OPEN' : 'Status: SEALED'}
                </div>
              </div>
              <button
                onClick={() => onToggleCompoundGate(g.key)}
                className="px-3 py-1.5 rounded-md bg-cyan-500 hover:bg-cyan-400 text-neutral-950 font-semibold cursor-pointer shrink-0"
              >
                {g.open ? 'Seal' : 'Open'}
              </button>
            </div>
          ))}
        </div>
      );
    }

    // Cities / Bio Intel (F8)
    if (activeScreen.uiKind === 'city_intel') {
      const bucket = activeScreen.targetId;
      const list = ob.cities.filter((c) => {
        if (!bucket) return true;
        if (bucket === 'Asia') return c.city.continent === 'Asia' || c.city.continent === 'Australia & Oceania';
        if (bucket === 'Americas') return c.city.continent === 'North America' || c.city.continent === 'South America';
        if (bucket === 'Africa') return c.city.continent === 'Africa' || c.city.continent === 'Antarctica';
        return c.city.continent === bucket;
      });
      return (
        <div className="space-y-3">
          <NexusOutbreakRadarView
            snapshot={snapshot}
            onToggleLayer={onToggleOutbreakLayer}
            onPinBrief={onPinNote}
            initialContinentFilter={bucket || 'All'}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2">
            {list.slice(0, 12).map((c) => (
              <div
                key={c.city.id}
                className="rounded-lg border border-neutral-800 bg-neutral-900/75 px-3 py-2 text-xs font-mono tabular-nums"
              >
                <div className="font-sans font-semibold text-white truncate">
                  {c.city.name} ({c.city.country})
                </div>
                <div className="flex justify-between text-[11px] text-neutral-400 mt-1">
                  <span>Infected: {c.infectedCount}</span>
                  <span>Grid: {Math.round(c.powerGridRatio * 100)}%</span>
                  <span className="text-rose-300">{c.dangerLevel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Train Telemetry & Dispatch (F2, F3, F6)
    if (activeScreen.uiKind === 'train_telemetry' || activeScreen.uiKind === 'signal_interlock' || activeScreen.uiKind === 'network_map') {
      const filteredTrains = activeScreen.targetId
        ? trains.filter((t) => t.line === activeScreen.targetId)
        : trains;
      const activeList = filteredTrains.length > 0 ? filteredTrains : trains;
      return (
        <div className="space-y-4">
          {/* Corridor Line Visualization */}
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-3.5 space-y-2">
            <div className="text-xs font-semibold text-cyan-300">
              6-Track Continuous Rail Corridor (−4.8 km to +4.8 km)
            </div>
            <div className="space-y-2">
              {activeList.map((t) => {
                const normX = Math.max(2, Math.min(98, ((t.x + 4800) / 9600) * 100));
                return (
                  <div key={t.trainId} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span className="text-white">
                        {t.trainNumber} · Line {t.line} ({t.serviceName})
                      </span>
                      <span className="text-cyan-300">
                        {Math.round(t.speedKmh)} km/h · {t.status} · Signal {t.signalAspect.toUpperCase()}
                      </span>
                    </div>
                    <div className="relative h-2.5 rounded bg-neutral-800 overflow-hidden">
                      <div
                        className="absolute top-0 bottom-0 w-3 rounded bg-cyan-400"
                        style={{ left: `calc(${normX.toFixed(1)}% - 6px)` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct Dispatch Hold / Release / Warning Ack Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeList.map((t) => (
              <div
                key={t.trainId}
                className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white">
                    {t.trainNumber} — Line {t.line}
                  </div>
                  <span className="font-mono text-[11px] text-amber-300">{t.onTimeStatus}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums text-neutral-300">
                  <div>Next: {t.nextStation}</div>
                  <div>ETA: {t.arrivalCountdownText}</div>
                  <div>Motor: {Math.round(t.tractionMotorTempC)}°C</div>
                  <div>Brake: {t.brakePressureBar.toFixed(1)} bar</div>
                </div>
                {t.warningMessage && (
                  <div className="rounded border border-amber-700 bg-amber-950/50 px-2.5 py-1.5 text-[11px] text-amber-200 flex items-center justify-between gap-2">
                    <span className="truncate">{t.warningMessage}</span>
                    {!t.warningAcknowledged && (
                      <button
                        onClick={() => onTrainAckWarning(t.trainId)}
                        className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-semibold shrink-0 cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {t.holdOrdered ? (
                    <button
                      onClick={() => onTrainRelease(t.trainId)}
                      className="px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-[11px] cursor-pointer"
                    >
                      Release Train Hold
                    </button>
                  ) : (
                    <button
                      onClick={() => onTrainHold(t.trainId)}
                      className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-[11px] cursor-pointer"
                    >
                      Hold Train
                    </button>
                  )}
                  <button
                    onClick={() => onToggleLineHold(t.line)}
                    className="px-3 py-1 rounded border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] cursor-pointer"
                  >
                    Toggle Line {t.line} Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Station Operations (F2/F3/F4)
    if (activeScreen.uiKind === 'station_ops') {
      const stSnap = snapshot.live.stationSnapshot;
      const facilityEntries = stSnap ? Object.entries(stSnap.facilities) : [];
      return (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="text-neutral-400 font-sans">Station Concourse NPCs</div>
              <div className="text-lg font-bold text-white mt-0.5">{stSnap?.stationPassengers ?? 0}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="text-neutral-400 font-sans">Onboard Passengers</div>
              <div className="text-lg font-bold text-cyan-300 mt-0.5">{stSnap?.onboardPassengers ?? 0}</div>
            </div>
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
              <div className="text-neutral-400 font-sans">Boarding Queues</div>
              <div className="text-lg font-bold text-amber-300 mt-0.5">{stSnap?.boardingQueues ?? 0}</div>
            </div>
          </div>
          {!stSnap ? (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 text-xs text-neutral-400">
              No passenger concourse summary available right now.
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="rounded-lg border border-neutral-800 bg-neutral-900/75 px-3.5 py-2.5 text-xs text-neutral-300">
                PA Broadcast: <span className="text-white">{stSnap.announcement}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {facilityEntries.map(([name, status]) => (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900/75 px-3 py-2 text-xs"
                  >
                    <span className="capitalize text-neutral-300">{name}</span>
                    <span className="font-mono text-[11px] text-cyan-300">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    // Comms Dispatch & Engineering Orders
    if (activeScreen.uiKind === 'comms_log' || activeScreen.uiKind === 'engineering_spec') {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-4 space-y-3">
            <div className="text-xs font-semibold text-white">Engineering Work Orders & Rail Grid</div>
            <div className="space-y-2">
              {snapshot.systems.engineeringOrders.map((wo) => (
                <div
                  key={wo.id}
                  className="flex items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-white truncate">{wo.title}</div>
                    <div className="text-[11px] text-neutral-400">
                      {wo.id} · {wo.sector}
                    </div>
                  </div>
                  <button
                    onClick={() => onToggleWorkOrder(wo.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer shrink-0 ${
                      wo.status === 'verified'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                    }`}
                  >
                    {wo.status === 'verified' ? 'Verified' : 'Mark Verified'}
                  </button>
                </div>
              ))}
            </div>
            {cmp.aurelionSnapshot && (
              <div className="pt-2 border-t border-neutral-800 grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                <div>Solar: {cmp.aurelionSnapshot.power.solarKw.toFixed(1)} kW</div>
                <div>Net Load: {cmp.aurelionSnapshot.power.netKw.toFixed(1)} kW</div>
                <div>Battery: {Math.round(cmp.aurelionSnapshot.power.batteryPercent)}%</div>
                <div>Treated H₂O: {Math.round(cmp.aurelionSnapshot.water.treatedLiters)} L</div>
              </div>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-4 space-y-3">
            <div className="text-xs font-semibold text-white">Radio & Telemetry Dispatch Log</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={commsChannel}
                onChange={(e) => setCommsChannel(e.target.value)}
                className="w-28 rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs font-mono text-white"
              />
              <input
                type="text"
                value={commsText}
                onChange={(e) => setCommsText(e.target.value)}
                placeholder="Transmit operational message..."
                className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-white"
              />
              <button
                onClick={() => {
                  if (!commsText.trim()) return;
                  onSendComms(commsChannel, commsText);
                  setCommsText('');
                }}
                className="rounded bg-cyan-500 hover:bg-cyan-400 px-3 py-1.5 text-xs font-semibold text-neutral-950 cursor-pointer inline-flex items-center gap-1"
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </button>
            </div>
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {snapshot.systems.commsLog.map((c) => (
                <div key={c.id} className="rounded border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-[11px]">
                  <span className="font-mono text-cyan-300 mr-2">[{c.channel}]</span>
                  <span className="text-neutral-200">{c.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Executive Brief, Server Diagnostics & Scientific Telemetry fallback (F5/F6/F8)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-4 space-y-2.5 text-xs font-mono tabular-nums">
          <div className="font-sans text-xs font-semibold text-white">Live Integrated Telemetry</div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Lift A Grand Glass</span>
            <span className="text-amber-300">
              F{snapshot.systems.elevators.liftA.currentFloor} ({NEXUS_ELEVATORS.liftA.speedMetersPerSec} m/s)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Lift B Express Titanium</span>
            <span className="text-cyan-300">
              F{snapshot.systems.elevators.liftB.currentFloor} ({NEXUS_ELEVATORS.liftB.speedMetersPerSec} m/s)
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Trains Active</span>
            <span className="text-white">{trains.length} / 6</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Perimeter Towers</span>
            <span className="text-white">{cmp.turrets.length} / 20</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Wildlife Contacts</span>
            <span className="text-emerald-300">{ob.wildlifeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Weather & Visibility</span>
            <span className="text-white">
              {ob.weather.weather} · {Math.round(ob.weather.visibilityPercent)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-400 font-sans">Base Research</span>
            <span className="text-white">
              {ob.baseResearchUnlockedCount} / {ob.baseResearchTotalCount}
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/75 p-4 space-y-3 text-xs">
          <div className="font-semibold text-white">Pinned Executive Alert Notes</div>
          <div className="flex gap-2">
            <input
              type="text"
              value={alertText}
              onChange={(e) => setAlertText(e.target.value)}
              placeholder="Pin executive briefing note..."
              className="flex-1 rounded border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-xs text-white"
            />
            <button
              onClick={() => {
                if (!alertText.trim()) return;
                onPinNote(alertText);
                setAlertText('');
              }}
              className="rounded bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-neutral-950 cursor-pointer"
            >
              Pin Note
            </button>
          </div>
          {snapshot.systems.pinnedAlertNotes.length === 0 ? (
            <div className="text-[11px] text-neutral-400">No executive alerts pinned yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {snapshot.systems.pinnedAlertNotes.map((note, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded border border-neutral-800 bg-neutral-950/70 px-3 py-1.5 text-[11px]"
                >
                  <span className="text-neutral-200">{note}</span>
                  <button
                    onClick={() => onRemoveNote(idx)}
                    className="text-neutral-400 hover:text-rose-400 cursor-pointer"
                    aria-label="Remove pinned note"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const floorIcon =
    activeFloor === 3 ? (
      <TrainFront className="h-5 w-5" />
    ) : activeFloor === 4 ? (
      <Wrench className="h-5 w-5" />
    ) : activeFloor === 5 ? (
      <Cpu className="h-5 w-5" />
    ) : activeFloor === 6 ? (
      <Shield className="h-5 w-5" />
    ) : activeFloor === 7 || activeFloor === 8 ? (
      <Radar className="h-5 w-5" />
    ) : (
      <Radio className="h-5 w-5" />
    );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 select-none">
      <div className="w-full max-w-6xl rounded-xl border border-neutral-700 bg-neutral-950 text-neutral-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="rounded-lg p-2 border shrink-0"
              style={{
                borderColor: `${floorSpec.accentCss}55`,
                backgroundColor: `${floorSpec.accentCss}18`,
                color: floorSpec.accentCss,
              }}
            >
              {floorIcon}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-neutral-400 truncate">
                THE NEXUS · {floorSpec.code} · {screens.length} Unique Operational Screens
              </div>
              <h2 className="text-base font-semibold text-white truncate">{floorSpec.title}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
            aria-label="Close department console"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Floor Switcher F2..F8 */}
        <div className="flex items-center gap-1.5 overflow-x-auto border-b border-neutral-800 bg-neutral-950 px-5 py-2">
          {DEPT_FLOORS.map((fl) => {
            const spec = NEXUS_FLOORS[fl];
            const active = activeFloor === fl;
            return (
              <button
                key={fl}
                onClick={() => {
                  setActiveFloor(fl);
                  const savedId = snapshot.systems.selectedScreenByFloor?.[fl];
                  const nextId =
                    savedId && NEXUS_SCREENS_BY_FLOOR[fl].some((s) => s.id === savedId)
                      ? savedId
                      : NEXUS_SCREENS_BY_FLOOR[fl][0].id;
                  setSelectedScreenId(nextId);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  active
                    ? 'bg-neutral-100 text-neutral-950 font-semibold'
                    : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'
                }`}
              >
                {spec.code} · {spec.title.split(' ')[0]} ({NEXUS_SCREENS_BY_FLOOR[fl].length})
              </button>
            );
          })}
        </div>

        {/* Main Split: Unique Screen List + Active Screen Panel */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Screen Catalog */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-neutral-800 overflow-y-auto p-3 space-y-1 max-h-48 lg:max-h-none bg-neutral-950">
            <div className="px-1.5 pb-1.5 text-[11px] font-medium text-neutral-400">
              {floorSpec.code} Screen Matrix ({screens.length})
            </div>
            {screens.map((scr) => {
              const selected = activeScreen.id === scr.id;
              return (
                <button
                  key={scr.id}
                  onClick={() => {
                    setSelectedScreenId(scr.id);
                    onSelectScreen?.(activeFloor, scr.id);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-md border text-xs transition-colors cursor-pointer ${
                    selected
                      ? 'border-cyan-400 bg-cyan-500/15 text-white'
                      : 'border-transparent hover:border-neutral-800 hover:bg-neutral-900 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] text-cyan-300">{scr.code}</span>
                    <span className="font-mono text-[10px] text-neutral-500 tabular-nums">
                      #{String(scr.indexOnFloor).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="font-medium truncate mt-0.5">{scr.title}</div>
                </button>
              );
            })}
          </div>

          {/* Active Screen Workspace */}
          <div className="lg:col-span-9 overflow-y-auto p-5 space-y-4">
            <div className="border-b border-neutral-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-[11px] font-mono text-cyan-300">
                  Screen {activeScreen.code} · {floorSpec.department}
                </div>
                <h3 className="text-base font-semibold text-white mt-0.5">{activeScreen.title}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{activeScreen.purpose}</p>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 shrink-0">
                Clearance: <strong className="text-white uppercase">{snapshot.systems.clearanceLevel}</strong>
              </div>
            </div>

            {renderScreenBody()}
          </div>
        </div>
      </div>
    </div>
  );
};
