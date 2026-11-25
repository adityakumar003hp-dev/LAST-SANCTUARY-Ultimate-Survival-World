import React, { useEffect, useState, useCallback } from 'react';
import {
  X,
  Train,
  Activity,
  MapPinned,
  Gauge,
  Clock3,
  Keyboard,
  RadioTower,
  ShieldCheck,
  AlertTriangle,
  Volume2,
  Power,
  Route,
  ArrowRight,
  Wrench,
} from 'lucide-react';
import { soundEngine } from '../utils/audio';
import type { RailwayServiceTelemetry, RailwayTrackLine, RouteStationStop } from '../engine/world/AITrainManager';

const STATION_AXIS_LABELS = [
  'Central',
  'Pine Valley',
  'Highland',
  'Riverbend',
  'Redwood',
  'Canyon Pass',
  'Sunset Coast',
  'North Apex',
];

function makeFallbackStops(direction: 1 | -1, departedIdx: number, arrivingIdx: number): RouteStationStop[] {
  const full = [
    { index: 0, name: 'Sanctuary Central Terminal', shortName: 'Central' },
    { index: 1, name: 'Pine Valley Junction', shortName: 'Pine Valley' },
    { index: 2, name: 'Highland Ridge Station', shortName: 'Highland' },
    { index: 3, name: 'Riverbend Depot', shortName: 'Riverbend' },
    { index: 4, name: 'Redwood Foothills Station', shortName: 'Redwood' },
    { index: 5, name: 'Canyon Pass Freight Depot', shortName: 'Canyon Pass' },
    { index: 6, name: 'Sunset Coastway Station', shortName: 'Sunset Coast' },
    { index: 7, name: 'Northern Apex Research Stop', shortName: 'North Apex' },
  ];
  const order = direction === 1 ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const depPos = order.indexOf(departedIdx);
  return order.map((idx, pos) => ({
    ...full[idx],
    status:
      idx === departedIdx
        ? 'departed'
        : idx === arrivingIdx
          ? 'arriving'
          : pos < depPos
            ? 'passed'
            : 'upcoming',
  }));
}

const fallbackServices: RailwayServiceTelemetry[] = [
  {
    slot: 1,
    trainId: 'ai_train_f1',
    trainNumber: 'Train 01',
    line: 'F1',
    serviceId: 'LS-101',
    serviceName: 'Sanctuary Rajdhani Express',
    name: 'Sanctuary Rajdhani Express',
    serviceType: 'Superfast Express',
    from: 'Sanctuary Central Terminal',
    to: 'Northern Apex Research Stop',
    next: 'Pine Valley Junction',
    stop: 'Sanctuary Central Terminal',
    directionLabel: 'FORWARD (+X)',
    direction: 1,
    x: 12,
    z: 150,
    speed: 65,
    speedKmh: 65,
    speedMph: 40,
    currentStation: 'Sanctuary Central Terminal',
    nextStation: 'Pine Valley Junction',
    arrivedStation: 'Sanctuary Central Terminal',
    departedStation: 'Sanctuary Central Terminal',
    arrivingStation: 'Pine Valley Junction',
    departingStation: 'Sanctuary Central Terminal',
    isAtStation: false,
    distToNextMeters: 1188,
    distTravelledKm: 0.01,
    distRemainingKm: 9.59,
    legDistanceCoveredM: 12,
    legDistanceLeftM: 1188,
    legDistanceCoveredKm: 0.01,
    legDistanceLeftKm: 1.19,
    routeDistanceCoveredKm: 0.01,
    routeDistanceLeftKm: 9.59,
    routeTotalKm: 9.6,
    totalDistanceCoveredKm: 12.4,
    routeProgressPct: 1,
    routeStations: makeFallbackStops(1, 0, 1),
    distance: 0.01,
    remaining: 9.59,
    arrival: '01:06',
    departure: 'DEP 08:00',
    arrivalTime: '08:02',
    departureTime: '08:00',
    currentTimeText: '08:00:00',
    dayCount: 1,
    scheduledArrival: '08:02',
    estimatedArrival: '08:02 (01:06)',
    departureCountdownSeconds: 0,
    arrivalCountdownSeconds: 66,
    departureCountdownText: '00:00',
    arrivalCountdownText: '01:06',
    delaySeconds: 0,
    onTimeStatus: 'ON TIME',
    stationStatus: 'running',
    status: 'RUNNING',
    dwellSeconds: 0,
    condition: 'OPTIMAL',
    conditionDetail: 'Traction & brakes nominal',
    doorsOpen: false,
    holdOrdered: false,
    tractionMotorTempC: 68,
    brakePressureBar: 5.0,
    pantographVoltageKv: 25.0,
    conditionPct: 98,
    blockId: 'BLK-F1-S1',
    signalAspect: 'green',
    warningMessage: null,
    warningAcknowledged: true,
  },
  {
    slot: 2,
    trainId: 'ai_train_f2',
    trainNumber: 'Train 02',
    line: 'F2',
    serviceId: 'LS-102',
    serviceName: 'Sanctuary Vande Bharat',
    name: 'Sanctuary Vande Bharat',
    serviceType: 'Semi-High-Speed Express',
    from: 'Sanctuary Central Terminal',
    to: 'Northern Apex Research Stop',
    next: 'Sanctuary Central Terminal',
    stop: 'Northern Apex Research Stop',
    directionLabel: 'FORWARD (+X)',
    direction: 1,
    x: -340,
    z: 162,
    speed: 65,
    speedKmh: 65,
    speedMph: 40,
    currentStation: 'Northern Apex Research Stop',
    nextStation: 'Sanctuary Central Terminal',
    arrivedStation: 'Northern Apex Research Stop',
    departedStation: 'Northern Apex Research Stop',
    arrivingStation: 'Sanctuary Central Terminal',
    departingStation: 'Northern Apex Research Stop',
    isAtStation: false,
    distToNextMeters: 340,
    distTravelledKm: 9.26,
    distRemainingKm: 0.34,
    legDistanceCoveredM: 860,
    legDistanceLeftM: 340,
    legDistanceCoveredKm: 0.86,
    legDistanceLeftKm: 0.34,
    routeDistanceCoveredKm: 9.26,
    routeDistanceLeftKm: 0.34,
    routeTotalKm: 9.6,
    totalDistanceCoveredKm: 18.6,
    routeProgressPct: 96,
    routeStations: makeFallbackStops(1, 7, 0),
    distance: 9.26,
    remaining: 0.34,
    arrival: '00:19',
    departure: 'DEP 07:57',
    arrivalTime: '08:01',
    departureTime: '07:57',
    currentTimeText: '08:00:00',
    dayCount: 1,
    scheduledArrival: '08:01',
    estimatedArrival: '08:01 (00:19)',
    departureCountdownSeconds: 0,
    arrivalCountdownSeconds: 19,
    departureCountdownText: '00:00',
    arrivalCountdownText: '00:19',
    delaySeconds: 0,
    onTimeStatus: 'ON TIME',
    stationStatus: 'running',
    status: 'RUNNING',
    dwellSeconds: 0,
    condition: 'OPTIMAL',
    conditionDetail: 'Traction & brakes nominal',
    doorsOpen: false,
    holdOrdered: false,
    tractionMotorTempC: 69,
    brakePressureBar: 5.0,
    pantographVoltageKv: 25.1,
    conditionPct: 97,
    blockId: 'BLK-F2-S8',
    signalAspect: 'green',
    warningMessage: null,
    warningAcknowledged: true,
  },
  {
    slot: 3,
    trainId: 'ai_train_f3',
    trainNumber: 'Train 03',
    line: 'F3',
    serviceId: 'LS-103',
    serviceName: 'Highland Express Mail',
    name: 'Highland Express Mail',
    serviceType: 'Superfast Sleeper Mail',
    from: 'Sanctuary Central Terminal',
    to: 'Northern Apex Research Stop',
    next: 'Sanctuary Central Terminal',
    stop: 'Northern Apex Research Stop',
    directionLabel: 'FORWARD (+X)',
    direction: 1,
    x: -760,
    z: 174,
    speed: 65,
    speedKmh: 65,
    speedMph: 40,
    currentStation: 'Northern Apex Research Stop',
    nextStation: 'Sanctuary Central Terminal',
    arrivedStation: 'Northern Apex Research Stop',
    departedStation: 'Northern Apex Research Stop',
    arrivingStation: 'Sanctuary Central Terminal',
    departingStation: 'Northern Apex Research Stop',
    isAtStation: false,
    distToNextMeters: 760,
    distTravelledKm: 8.84,
    distRemainingKm: 0.76,
    legDistanceCoveredM: 440,
    legDistanceLeftM: 760,
    legDistanceCoveredKm: 0.44,
    legDistanceLeftKm: 0.76,
    routeDistanceCoveredKm: 8.84,
    routeDistanceLeftKm: 0.76,
    routeTotalKm: 9.6,
    totalDistanceCoveredKm: 22.1,
    routeProgressPct: 92,
    routeStations: makeFallbackStops(1, 7, 0),
    distance: 8.84,
    remaining: 0.76,
    arrival: '00:42',
    departure: 'DEP 07:56',
    arrivalTime: '08:01',
    departureTime: '07:56',
    currentTimeText: '08:00:00',
    dayCount: 1,
    scheduledArrival: '08:01',
    estimatedArrival: '08:01 (00:42)',
    departureCountdownSeconds: 0,
    arrivalCountdownSeconds: 42,
    departureCountdownText: '00:00',
    arrivalCountdownText: '00:42',
    delaySeconds: 0,
    onTimeStatus: 'ON TIME',
    stationStatus: 'running',
    status: 'RUNNING',
    dwellSeconds: 0,
    condition: 'OPTIMAL',
    conditionDetail: 'Traction & brakes nominal',
    doorsOpen: false,
    holdOrdered: false,
    tractionMotorTempC: 70,
    brakePressureBar: 5.0,
    pantographVoltageKv: 24.9,
    conditionPct: 96,
    blockId: 'BLK-F3-S8',
    signalAspect: 'green',
    warningMessage: null,
    warningAcknowledged: true,
  },
  {
    slot: 4,
    trainId: 'ai_train_b3',
    trainNumber: 'Train 04',
    line: 'B3',
    serviceId: 'LS-201',
    serviceName: 'Redwood Crossway Intercity',
    name: 'Redwood Crossway Intercity',
    serviceType: 'Intercity Express',
    from: 'Northern Apex Research Stop',
    to: 'Sanctuary Central Terminal',
    next: 'Sanctuary Central Terminal',
    stop: 'Pine Valley Junction',
    directionLabel: 'BACKWARD (-X)',
    direction: -1,
    x: 340,
    z: 186,
    speed: 65,
    speedKmh: 65,
    speedMph: 40,
    currentStation: 'Pine Valley Junction',
    nextStation: 'Sanctuary Central Terminal',
    arrivedStation: 'Pine Valley Junction',
    departedStation: 'Pine Valley Junction',
    arrivingStation: 'Sanctuary Central Terminal',
    departingStation: 'Pine Valley Junction',
    isAtStation: false,
    distToNextMeters: 340,
    distTravelledKm: 8.06,
    distRemainingKm: 1.54,
    legDistanceCoveredM: 860,
    legDistanceLeftM: 340,
    legDistanceCoveredKm: 0.86,
    legDistanceLeftKm: 0.34,
    routeDistanceCoveredKm: 8.06,
    routeDistanceLeftKm: 1.54,
    routeTotalKm: 9.6,
    totalDistanceCoveredKm: 15.8,
    routeProgressPct: 84,
    routeStations: makeFallbackStops(-1, 1, 0),
    distance: 8.06,
    remaining: 1.54,
    arrival: '00:19',
    departure: 'DEP 07:54',
    arrivalTime: '08:01',
    departureTime: '07:54',
    currentTimeText: '08:00:00',
    dayCount: 1,
    scheduledArrival: '08:01',
    estimatedArrival: '08:01 (00:19)',
    departureCountdownSeconds: 0,
    arrivalCountdownSeconds: 19,
    departureCountdownText: '00:00',
    arrivalCountdownText: '00:19',
    delaySeconds: 0,
    onTimeStatus: 'ON TIME',
    stationStatus: 'running',
    status: 'RUNNING',
    dwellSeconds: 0,
    condition: 'OPTIMAL',
    conditionDetail: 'Traction & brakes nominal',
    doorsOpen: false,
    holdOrdered: false,
    tractionMotorTempC: 67,
    brakePressureBar: 5.0,
    pantographVoltageKv: 25.0,
    conditionPct: 98,
    blockId: 'BLK-B3-S2',
    signalAspect: 'green',
    warningMessage: null,
    warningAcknowledged: true,
  },
  {
    slot: 5,
    trainId: 'ai_train_b2',
    trainNumber: 'Train 05',
    line: 'B2',
    serviceId: 'LS-202',
    serviceName: 'Sanctuary Metro Commuter',
    name: 'Sanctuary Metro Commuter',
    serviceType: 'Suburban Metro',
    from: 'Northern Apex Research Stop',
    to: 'Sanctuary Central Terminal',
    next: 'Sanctuary Central Terminal',
    stop: 'Pine Valley Junction',
    directionLabel: 'BACKWARD (-X)',
    direction: -1,
    x: 760,
    z: 198,
    speed: 65,
    speedKmh: 65,
    speedMph: 40,
    currentStation: 'Pine Valley Junction',
    nextStation: 'Sanctuary Central Terminal',
    arrivedStation: 'Pine Valley Junction',
    departedStation: 'Pine Valley Junction',
    arrivingStation: 'Sanctuary Central Terminal',
    departingStation: 'Pine Valley Junction',
    isAtStation: false,
    distToNextMeters: 760,
    distTravelledKm: 7.64,
    distRemainingKm: 1.96,
    legDistanceCoveredM: 440,
    legDistanceLeftM: 760,
    legDistanceCoveredKm: 0.44,
    legDistanceLeftKm: 0.76,
    routeDistanceCoveredKm: 7.64,
    routeDistanceLeftKm: 1.96,
    routeTotalKm: 9.6,
    totalDistanceCoveredKm: 19.3,
    routeProgressPct: 80,
    routeStations: makeFallbackStops(-1, 1, 0),
    distance: 7.64,
    remaining: 1.96,
    arrival: '00:42',
    departure: 'DEP 07:53',
    arrivalTime: '08:01',
    departureTime: '07:53',
    currentTimeText: '08:00:00',
    dayCount: 1,
    scheduledArrival: '08:01',
    estimatedArrival: '08:01 (00:42)',
    departureCountdownSeconds: 0,
    arrivalCountdownSeconds: 42,
    departureCountdownText: '00:00',
    arrivalCountdownText: '00:42',
    delaySeconds: 0,
    onTimeStatus: 'ON TIME',
    stationStatus: 'running',
    status: 'RUNNING',
    dwellSeconds: 0,
    condition: 'OPTIMAL',
    conditionDetail: 'Traction & brakes nominal',
    doorsOpen: false,
    holdOrdered: false,
    tractionMotorTempC: 68,
    brakePressureBar: 5.0,
    pantographVoltageKv: 24.8,
    conditionPct: 97,
    blockId: 'BLK-B2-S2',
    signalAspect: 'green',
    warningMessage: null,
    warningAcknowledged: true,
  },
  {
    slot: 6,
    trainId: 'ai_train_b1',
    trainNumber: 'Train 06',
    line: 'B1',
    serviceId: 'LS-203',
    serviceName: 'Northern Apex Shield Express',
    name: 'Northern Apex Shield Express',
    serviceType: 'Tactical / Medical Transport',
    from: 'Northern Apex Research Stop',
    to: 'Sanctuary Central Terminal',
    next: 'Northern Apex Research Stop',
    stop: 'Sanctuary Central Terminal',
    directionLabel: 'BACKWARD (-X)',
    direction: -1,
    x: -12,
    z: 210,
    speed: 65,
    speedKmh: 65,
    speedMph: 40,
    currentStation: 'Sanctuary Central Terminal',
    nextStation: 'Northern Apex Research Stop',
    arrivedStation: 'Sanctuary Central Terminal',
    departedStation: 'Sanctuary Central Terminal',
    arrivingStation: 'Northern Apex Research Stop',
    departingStation: 'Sanctuary Central Terminal',
    isAtStation: false,
    distToNextMeters: 1188,
    distTravelledKm: 8.41,
    distRemainingKm: 1.19,
    legDistanceCoveredM: 12,
    legDistanceLeftM: 1188,
    legDistanceCoveredKm: 0.01,
    legDistanceLeftKm: 1.19,
    routeDistanceCoveredKm: 8.41,
    routeDistanceLeftKm: 1.19,
    routeTotalKm: 9.6,
    totalDistanceCoveredKm: 24.0,
    routeProgressPct: 88,
    routeStations: makeFallbackStops(-1, 0, 7),
    distance: 8.41,
    remaining: 1.19,
    arrival: '01:06',
    departure: 'DEP 07:52',
    arrivalTime: '08:02',
    departureTime: '07:52',
    currentTimeText: '08:00:00',
    dayCount: 1,
    scheduledArrival: '08:02',
    estimatedArrival: '08:02 (01:06)',
    departureCountdownSeconds: 0,
    arrivalCountdownSeconds: 66,
    departureCountdownText: '00:00',
    arrivalCountdownText: '01:06',
    delaySeconds: 0,
    onTimeStatus: 'ON TIME',
    stationStatus: 'running',
    status: 'RUNNING',
    dwellSeconds: 0,
    condition: 'OPTIMAL',
    conditionDetail: 'Traction & brakes nominal',
    doorsOpen: false,
    holdOrdered: false,
    tractionMotorTempC: 71,
    brakePressureBar: 5.0,
    pantographVoltageKv: 25.2,
    conditionPct: 99,
    blockId: 'BLK-B1-S1',
    signalAspect: 'green',
    warningMessage: null,
    warningAcknowledged: true,
  },
];

function shortStation(fullName: string): string {
  return fullName
    .replace('Sanctuary Central Terminal', 'Central Terminal')
    .replace('Northern Apex Research Stop', 'Northern Apex')
    .replace('Canyon Pass Freight Depot', 'Canyon Pass')
    .replace('Redwood Foothills Station', 'Redwood Foothills')
    .replace('Sunset Coastway Station', 'Sunset Coastway')
    .replace('Highland Ridge Station', 'Highland Ridge')
    .replace(' Station', '');
}

function getConditionBadgeClass(condition: string, holdOrdered: boolean): string {
  if (holdOrdered || condition === 'DISPATCH HOLD') {
    return 'border-rose-500/50 bg-rose-950/80 text-rose-300';
  }
  if (condition === 'THERMAL WATCH' || condition === 'BRAKE CHECK') {
    return 'border-amber-500/50 bg-amber-950/80 text-amber-300';
  }
  if (condition === 'BOARDING' || condition === 'DOORS LOCKING') {
    return 'border-sky-500/50 bg-sky-950/80 text-sky-300';
  }
  return 'border-emerald-500/40 bg-emerald-950/70 text-emerald-300';
}

export const TrainControlCenter: React.FC<{ isOpen: boolean; onClose: () => void; engine?: any }> = ({
  isOpen,
  onClose,
  engine,
}) => {
  const [selected, setSelected] = useState(0);
  const [trains, setTrains] = useState<RailwayServiceTelemetry[]>(fallbackServices);
  const [log, setLog] = useState<string[]>([
    '[CTC] Underground Railway Central Command initialized.',
    '[CTC] All 6 autonomous consists (F1-F3, B3-B1) streaming live telemetry.',
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const poll = () => {
      if (engine?.aiTrainManager?.getDispatchTelemetry) {
        const live: RailwayServiceTelemetry[] = engine.aiTrainManager.getDispatchTelemetry();
        if (live && live.length > 0) {
          setTrains(live);
        }
      }
    };
    poll();
    const timer = setInterval(poll, 300);
    return () => clearInterval(timer);
  }, [isOpen, engine]);

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev.slice(0, 7)]);
  }, []);

  const handleToggleHold = useCallback(
    (targetLine?: RailwayTrackLine) => {
      const targetTrain = targetLine ? trains.find((t) => t.line === targetLine) : trains[selected];
      const lineToToggle = targetLine || targetTrain?.line;
      if (!lineToToggle) return;

      if (engine?.aiTrainManager?.toggleServiceHold) {
        const isNowHeld = engine.aiTrainManager.toggleServiceHold(lineToToggle);
        soundEngine.playStationChime();
        addLog(
          `[DISPATCH] ${targetTrain?.trainNumber ?? lineToToggle} (${lineToToggle}): ${
            isNowHeld ? 'HELD AT SIGNAL BLOCK' : 'CLEARED FOR DEPARTURE'
          }`
        );
      } else {
        setTrains((prev) =>
          prev.map((t) => {
            if (t.line !== lineToToggle) return t;
            const nextHeld = !t.holdOrdered;
            addLog(
              `[SIM-DISPATCH] ${t.trainNumber} (${lineToToggle}): ${nextHeld ? 'HELD' : 'CLEARED'}`
            );
            return {
              ...t,
              holdOrdered: nextHeld,
              status: nextHeld ? 'HELD' : 'RUNNING',
              condition: nextHeld ? 'DISPATCH HOLD' : 'OPTIMAL',
              conditionDetail: nextHeld ? 'Held on interlocking red block' : 'Traction & brakes nominal',
              speed: nextHeld ? 0 : 65,
              speedKmh: nextHeld ? 0 : 65,
              speedMph: nextHeld ? 0 : 40,
              signalAspect: nextHeld ? 'red' : 'green',
            };
          })
        );
      }
    },
    [engine, trains, selected, addLog]
  );

  const handleBroadcastAnnouncement = useCallback(() => {
    const t = trains[selected];
    if (!t) return;
    soundEngine.playStationChime();
    addLog(
      `[PA-BROADCAST] ${t.trainNumber} (${t.line}): Arriving ${t.arrivingStation} · ETA ${t.arrivalTime} (${t.arrivalCountdownText}).`
    );
  }, [trains, selected, addLog]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        setSelected(Number(e.key) - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
        setSelected((v) => (v + 1) % 6);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        setSelected((v) => (v + 5) % 6);
        e.preventDefault();
      } else if (e.code === 'Space' || e.key.toLowerCase() === 'h') {
        handleToggleHold();
        e.preventDefault();
      } else if (e.key.toLowerCase() === 'a') {
        handleBroadcastAnnouncement();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose, handleToggleHold, handleBroadcastAnnouncement]);

  if (!isOpen) return null;
  const current = trains[selected] || trains[0];
  const isHeld = current.holdOrdered || current.status === 'HELD';
  const liveClock = current.currentTimeText || '08:00:00';
  const liveDay = current.dayCount ?? 1;

  const panel = 'rounded-lg border border-cyan-500/25 bg-[#07131e]/95 p-3';

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-2 text-cyan-50 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Underground railway central command center"
    >
      <div className="relative flex max-h-[96vh] w-full max-w-[1600px] flex-col overflow-auto rounded-xl border border-cyan-400/40 bg-[#040c14] p-3 font-mono tabular-nums shadow-2xl">
        {/* Header Bar */}
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/30 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/60">
              <RadioTower className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm sm:text-base md:text-lg font-black tracking-wider text-cyan-200">
                UNDERGROUND RAILWAY CENTRAL COMMAND CENTER
              </div>
              <div className="text-[10px] tracking-[0.2em] text-cyan-400/75">
                AUTOMATIC TRAIN SUPERVISION · 6 CORRIDOR SERVICES · 8 REGIONAL STATIONS
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded border border-cyan-500/40 bg-[#071522] px-2.5 py-1 text-[11px] font-bold text-cyan-200">
              DAY {liveDay} · {liveClock}
            </div>
            <span className="hidden sm:inline-block rounded border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              INTERLOCK ONLINE · {trains.filter((t) => !t.holdOrdered).length}/6 MOVING
            </span>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-300 transition-colors hover:border-rose-500 hover:bg-rose-950/60 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Main 3-Column Operations Grid */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[270px_minmax(0,1fr)_275px]">
          {/* LEFT COLUMN: POWER & SELECTED TRAIN MECHANICAL / STATION INSPECTOR */}
          <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">CORRIDOR INFRASTRUCTURE</span>
                <Power className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase">Active Fleet</div>
                    <div className="text-lg font-black text-cyan-200">6 / 6 TRAINS</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-slate-400 uppercase">Cycle Length</div>
                    <div className="text-sm font-bold text-emerald-300">{current.routeTotalKm.toFixed(1)} km</div>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded bg-slate-800 overflow-hidden">
                  <div className="h-full w-full rounded bg-emerald-500/80" />
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                  <div className="rounded bg-[#040a11] px-2 py-1 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">CATENARY</span>
                    <span className="text-amber-300 font-bold">{current.pantographVoltageKv} kV AC</span>
                  </div>
                  <div className="rounded bg-[#040a11] px-2 py-1 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">STATIONS</span>
                    <span className="text-cyan-300 font-bold">8 LINKED HUBS</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">
                  {current.trainNumber.toUpperCase()} ({current.line}) CONDITION
                </span>
                <Wrench className="h-3.5 w-3.5 text-cyan-300" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between rounded border border-slate-800 bg-[#040a11] px-2.5 py-2">
                  <div>
                    <div className="text-[9px] text-slate-400">CURRENT CONDITION</div>
                    <div className="text-sm font-black text-white">{current.condition}</div>
                    <div className="text-[10px] text-slate-400">{current.conditionDetail}</div>
                  </div>
                  <span
                    className={`rounded border px-2 py-1 text-xs font-black ${getConditionBadgeClass(
                      current.condition,
                      isHeld
                    )}`}
                  >
                    {current.conditionPct}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div className="rounded bg-[#040a11] px-2 py-1.5 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">MOTOR TEMP</span>
                    <span className="font-bold text-emerald-300">{current.tractionMotorTempC}°C</span>
                  </div>
                  <div className="rounded bg-[#040a11] px-2 py-1.5 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">BRAKE PIPE</span>
                    <span className="font-bold text-sky-300">{current.brakePressureBar.toFixed(1)} BAR</span>
                  </div>
                  <div className="rounded bg-[#040a11] px-2 py-1.5 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">DOORS</span>
                    <span className={`font-bold ${current.doorsOpen ? 'text-amber-300' : 'text-slate-200'}`}>
                      {current.doorsOpen ? 'OPEN (BOARD)' : 'LOCKED'}
                    </span>
                  </div>
                  <div className="rounded bg-[#040a11] px-2 py-1.5 border border-slate-800/80">
                    <span className="text-slate-500 block text-[9px]">TOTAL LOGGED</span>
                    <span className="font-bold text-cyan-200">{current.totalDistanceCoveredKm.toFixed(1)} km</span>
                  </div>
                </div>

                <div className="rounded bg-[#040a11] px-2.5 py-2 border border-slate-800/80 space-y-1 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ARRIVED STATION:</span>
                    <span className="font-bold text-emerald-300">{shortStation(current.arrivedStation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DEPARTED STATION:</span>
                    <span className="font-bold text-slate-200">{shortStation(current.departedStation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">DEPARTING STATION:</span>
                    <span className="font-bold text-sky-300">{shortStation(current.departingStation)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ARRIVING STATION:</span>
                    <span className="font-bold text-amber-300">{shortStation(current.arrivingStation)}</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER COLUMN: ALL 6 TRAINS LIVE DISPATCH TABLE + FULL 8-STATION SCHEMATIC + ROUTE TIMELINE */}
          <main className="min-w-0 space-y-3">
            {/* ALL-6-TRAINS LIVE TELEMETRY MATRIX */}
            <section className={panel}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/60 pb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300">
                  <Train className="h-4 w-4 text-cyan-400" />
                  <span>ALL 6 SERVICES · ARRIVAL / DEPARTURE, ROUTE & CONDITION MATRIX</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-300 font-bold">
                    CLOCK: DAY {liveDay} · {liveClock}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-[11px]">
                  <thead className="bg-[#03090f] text-[9px] uppercase text-cyan-400">
                    <tr>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Train / Line</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Arrived / Departed</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Departing → Arriving</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Departure</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Arrival</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Speed & Time</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Covered / Left</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Condition</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2 text-right">Control</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trains.map((row, i) => {
                      const isSel = selected === i;
                      const isRowHeld = row.holdOrdered || row.status === 'HELD';
                      return (
                        <tr
                          key={row.line}
                          onClick={() => setSelected(i)}
                          className={`cursor-pointer border-b border-slate-800/80 transition-colors ${
                            isSel ? 'bg-cyan-950/75 text-white' : 'text-slate-300 hover:bg-slate-900/60'
                          }`}
                        >
                          <td className="px-2 py-2 align-top">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black border ${
                                  isSel
                                    ? 'bg-cyan-500 text-slate-950 border-cyan-300'
                                    : 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                                }`}
                              >
                                {row.trainNumber} · {row.line}
                              </span>
                            </div>
                            <div className="mt-0.5 text-[10px] font-bold text-slate-200 truncate max-w-[145px]">
                              {row.serviceName || row.name}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-[10px]">
                            <div className="text-emerald-300">
                              <span className="text-slate-500">ARR:</span> {shortStation(row.arrivedStation)}
                            </div>
                            <div className="text-slate-300">
                              <span className="text-slate-500">DEP:</span> {shortStation(row.departedStation)}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-[10px]">
                            <div className="flex items-center gap-1 text-sky-300 font-semibold">
                              <span>{shortStation(row.departingStation)}</span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-slate-500" />
                            </div>
                            <div className="text-amber-300 font-bold">{shortStation(row.arrivingStation)}</div>
                          </td>

                          <td className="px-2 py-2 align-top text-[10px]">
                            <div className="font-bold text-slate-100">{row.departureTime}</div>
                            <div className="text-slate-400">
                              {row.isAtStation ? `IN ${row.departureCountdownText}` : 'DEPARTED'}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-[10px]">
                            <div className="font-bold text-amber-200">{row.arrivalTime}</div>
                            <div className="text-cyan-300">
                              {row.isAtStation ? 'AT PLATFORM' : `ETA ${row.arrivalCountdownText}`}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-[10px]">
                            <div className="font-black text-cyan-300">
                              {row.speedKmh} km/h <span className="text-slate-500 font-normal">({row.speedMph} mph)</span>
                            </div>
                            <div className="text-slate-400">{row.currentTimeText}</div>
                          </td>

                          <td className="px-2 py-2 align-top text-[10px]">
                            <div>
                              <span className="text-emerald-300 font-bold">{row.legDistanceCoveredM}m</span>
                              <span className="text-slate-500"> / </span>
                              <span className="text-amber-300 font-bold">{row.legDistanceLeftM}m</span>
                            </div>
                            <div className="text-[9px] text-slate-400">
                              Route {row.routeDistanceCoveredKm.toFixed(2)}/{row.routeDistanceLeftKm.toFixed(2)} km
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top">
                            <span
                              className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold ${getConditionBadgeClass(
                                row.condition,
                                isRowHeld
                              )}`}
                            >
                              {row.condition} · {row.conditionPct}%
                            </span>
                            <div className="mt-0.5 text-[9px] text-slate-400 truncate max-w-[115px]">
                              {row.conditionDetail}
                            </div>
                          </td>

                          <td className="px-2 py-2 align-top text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleHold(row.line);
                              }}
                              className={`rounded px-2 py-1 text-[10px] font-bold border transition-colors cursor-pointer ${
                                isRowHeld
                                  ? 'border-emerald-600 bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900'
                                  : 'border-rose-600 bg-rose-950/70 text-rose-300 hover:bg-rose-900'
                              }`}
                            >
                              {isRowHeld ? 'CLEAR' : 'HOLD'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* FULL 8-STATION CORRIDOR SCHEMATIC TRACK MAP */}
            <section className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <MapPinned className="h-4 w-4" />
                  <span>8-STATION · 6-TRACK LIVE CORRIDOR RADAR</span>
                </div>
                <div className="text-[10px] text-slate-400">CLICK TRACK TO INSPECT ROUTE & TELEMETRY</div>
              </div>

              <svg
                viewBox="0 0 820 198"
                className="w-full rounded bg-[#030a10] border border-cyan-950/80 p-1.5"
                role="img"
                aria-label="Six railway lines across eight regional stations"
              >
                {/* 8 Real Station Vertical Axes */}
                {STATION_AXIS_LABELS.map((name, idx) => {
                  const sx = 68 + idx * 102;
                  return (
                    <g key={name}>
                      <line
                        x1={sx}
                        y1="14"
                        x2={sx}
                        y2="168"
                        stroke="#1e293b"
                        strokeDasharray="3,3"
                        strokeWidth="1"
                      />
                      <text x={sx} y="182" fontSize="8.5" fill="#94a3b8" textAnchor="middle">
                        S{idx + 1} · {name}
                      </text>
                    </g>
                  );
                })}

                {/* 6 Railway Tracks */}
                {trains.map((t, i) => {
                  const y = 24 + i * 24;
                  const isLineSelected = selected === i;
                  const ratio =
                    t.direction === 1
                      ? Math.max(0, Math.min(1, t.routeProgressPct / 100))
                      : Math.max(0, Math.min(1, 1 - t.routeProgressPct / 100));
                  const normX = 68 + ratio * (7 * 102);
                  return (
                    <g key={t.line} onClick={() => setSelected(i)} className="cursor-pointer">
                      <line
                        x1="56"
                        y1={y}
                        x2="796"
                        y2={y}
                        stroke={isLineSelected ? '#38bdf8' : '#334155'}
                        strokeWidth={isLineSelected ? 3 : 1.5}
                      />
                      <rect
                        x="10"
                        y={y - 8}
                        width="38"
                        height="16"
                        rx="3"
                        fill={isLineSelected ? '#0369a1' : '#0f172a'}
                        stroke={isLineSelected ? '#38bdf8' : '#475569'}
                        strokeWidth="1"
                      />
                      <text x="29" y={y + 3} fontSize="8.5" fontWeight="bold" fill="#f8fafc" textAnchor="middle">
                        T0{i + 1}·{t.line}
                      </text>

                      {STATION_AXIS_LABELS.map((_n, sIdx) => (
                        <circle
                          key={sIdx}
                          cx={68 + sIdx * 102}
                          cy={y}
                          r="2.8"
                          fill="#0f172a"
                          stroke="#64748b"
                          strokeWidth="1.2"
                        />
                      ))}

                      <circle
                        cx={normX}
                        cy={y}
                        r={isLineSelected ? 6.5 : 5}
                        fill={t.holdOrdered ? '#f43f5e' : t.isAtStation ? '#f59e0b' : '#22d3ee'}
                      />
                      <text
                        x={normX}
                        y={y + 2.5}
                        fontSize="7"
                        fontWeight="bold"
                        fill="#020617"
                        textAnchor="middle"
                      >
                        {t.direction === 1 ? '▶' : '◀'}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </section>

            {/* SELECTED TRAIN ROUTE DISPLAY (8 ORDERED STOPS + DISTANCE COVERED/LEFT) */}
            <section className={panel}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/60 pb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <Route className="h-4 w-4 text-cyan-400" />
                  <span>
                    ROUTE DISPLAY · {current.trainNumber.toUpperCase()} ({current.line}) · {current.directionLabel}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="text-emerald-300 font-bold">
                    COVERED: {current.routeDistanceCoveredKm.toFixed(2)} km (Leg {current.legDistanceCoveredM}m)
                  </span>
                  <span className="text-amber-300 font-bold">
                    LEFT: {current.routeDistanceLeftKm.toFixed(2)} km (Leg {current.legDistanceLeftM}m)
                  </span>
                  <span className="text-cyan-300 font-bold">{current.routeProgressPct}%</span>
                </div>
              </div>

              {/* Route Progress Bar */}
              <div className="mb-3 h-2 w-full rounded bg-slate-900 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 transition-all duration-300"
                  style={{ width: `${Math.max(2, Math.min(100, current.routeProgressPct))}%` }}
                />
              </div>

              {/* 8 Ordered Station Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
                {(current.routeStations || []).map((st, idx) => {
                  const statusStyle =
                    st.status === 'arrived'
                      ? 'border-emerald-400 bg-emerald-950/70 text-emerald-200'
                      : st.status === 'arriving'
                        ? 'border-amber-400 bg-amber-950/70 text-amber-200'
                        : st.status === 'departed'
                          ? 'border-sky-400 bg-sky-950/70 text-sky-200'
                          : st.status === 'passed'
                            ? 'border-slate-700 bg-slate-900/70 text-slate-400'
                            : 'border-slate-800 bg-[#040a11] text-slate-300';
                  return (
                    <div key={`${st.index}-${idx}`} className={`rounded border px-2 py-1.5 text-[10px] ${statusStyle}`}>
                      <div className="flex items-center justify-between text-[8px] font-bold uppercase opacity-80">
                        <span>S{st.index + 1}</span>
                        <span>{st.status}</span>
                      </div>
                      <div className="mt-0.5 font-bold truncate" title={st.name}>
                        {st.shortName}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </main>

          {/* RIGHT COLUMN: SIGNALS, SPEED & TIME SUMMARY, DISPATCH LOG */}
          <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">SPEED, SCHEDULE & SIGNALS</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="rounded border border-slate-800 bg-[#02070c] p-2">
                    <div className="flex items-center gap-1 text-[9px] text-cyan-400">
                      <Gauge className="h-3 w-3" /> SPEED
                    </div>
                    <div className="text-lg font-black text-white">
                      {current.speedKmh} <span className="text-[10px] text-slate-400">km/h</span>
                    </div>
                    <div className="text-[9px] text-slate-400">{current.speedMph} mph · X:{current.x}</div>
                  </div>

                  <div className="rounded border border-slate-800 bg-[#02070c] p-2">
                    <div className="flex items-center gap-1 text-[9px] text-cyan-400">
                      <Clock3 className="h-3 w-3" /> NEXT ETA
                    </div>
                    <div className="text-lg font-black text-amber-200">{current.arrivalTime}</div>
                    <div className="text-[9px] text-slate-400">
                      {current.isAtStation
                        ? `DEP ${current.departureCountdownText}`
                        : `IN ${current.arrivalCountdownText}`}
                    </div>
                  </div>
                </div>

                <div className="rounded border border-slate-800 bg-[#02070c] p-2">
                  <div className="text-[9px] text-slate-400">BLOCK INTERLOCK · {current.blockId}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        isHeld
                          ? 'bg-rose-500'
                          : current.signalAspect === 'yellow'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                      }`}
                    />
                    <span className="font-bold text-white">
                      {isHeld
                        ? 'SIGNAL HOLD [RED]'
                        : current.signalAspect === 'yellow'
                          ? 'APPROACH CAUTION [AMBER]'
                          : 'LINE CLEAR [GREEN]'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">OPERATIONS LOG & ALERTS</span>
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              </div>
              <div className="h-[190px] overflow-y-auto space-y-1.5 text-[10px] text-slate-300 pr-1">
                {log.map((entry, idx) => (
                  <div
                    key={idx}
                    className="rounded border border-cyan-900/50 bg-slate-900/70 px-2 py-1.5 text-slate-200"
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Footer Command Bar */}
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cyan-900/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelected((v) => (v + 5) % 6)}
              className="rounded border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900 cursor-pointer"
            >
              ◀ PREV [←]
            </button>
            <button
              onClick={() => setSelected((v) => (v + 1) % 6)}
              className="rounded border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900 cursor-pointer"
            >
              NEXT [→] ▶
            </button>
            <button
              onClick={() => handleToggleHold()}
              className={`rounded px-3 py-1.5 text-xs font-bold transition-colors border cursor-pointer ${
                isHeld
                  ? 'border-emerald-600 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900'
                  : 'border-rose-600 bg-rose-950/80 text-rose-200 hover:bg-rose-900'
              }`}
            >
              {isHeld ? 'CLEAR HOLD [H]' : 'HOLD SERVICE [H]'}
            </button>
            <button
              onClick={handleBroadcastAnnouncement}
              className="rounded border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900 flex items-center gap-1.5 cursor-pointer"
            >
              <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
              <span>PA BROADCAST [A]</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Keyboard className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">
              [1-6] SELECT TRAIN · [←/→] CYCLE · [H] HOLD/CLEAR · [A] PA CHIME · [ESC] EXIT
            </span>
            <span className="sm:hidden">[1-6] SELECT · [H] HOLD · [ESC] EXIT</span>
          </div>
        </footer>
      </div>
    </div>
  );
};
