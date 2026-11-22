import React, { useEffect, useState, useCallback } from 'react';
import { X, Train, Activity, MapPinned, Gauge, Clock3, Keyboard, RadioTower, ShieldCheck, AlertTriangle, Volume2, Power } from 'lucide-react';
import { soundEngine } from '../utils/audio';

type RailwayTrackLine = 'F1' | 'F2' | 'F3' | 'B1' | 'B2' | 'B3';

interface ServiceTelemetry {
  line: RailwayTrackLine;
  name: string;
  from: string;
  to: string;
  next: string;
  stop: string;
  arrival: string;
  departure: string;
  speed: number;
  distance: number;
  remaining: number;
  condition: string;
  status: 'RUNNING' | 'DWELLING' | 'DOORS_OPEN' | 'HELD';
  dwellSeconds: number;
  x: number;
  z: number;
}

const fallbackServices: ServiceTelemetry[] = [
  { line: 'F1', name: 'Sanctuary Express', from: 'Central Station', to: 'North Apex', next: 'Pine Valley Junction', stop: 'Pine Valley Junction', arrival: '14:18', departure: '14:20', speed: 50, distance: 126, remaining: 48, condition: 'GOOD', status: 'RUNNING', dwellSeconds: 0, x: 12, z: 150 },
  { line: 'F2', name: 'Desert Intercity', from: 'West Interchange', to: 'East Terminal', next: 'Highland Ridge', stop: 'Highland Ridge', arrival: '14:24', departure: '14:26', speed: 50, distance: 214, remaining: 72, condition: 'GOOD', status: 'RUNNING', dwellSeconds: 0, x: -260, z: 162 },
  { line: 'F3', name: 'City Commuter', from: 'South Meadow', to: 'Northern Ridge', next: 'Riverbend Depot', stop: 'Riverbend Depot', arrival: '14:13', departure: '14:15', speed: 50, distance: 42, remaining: 11, condition: 'GOOD', status: 'RUNNING', dwellSeconds: 0, x: -760, z: 174 },
  { line: 'B1', name: 'Coastal Passenger', from: 'Northern Apex', to: 'Central Station', next: 'Sunset Coastway', stop: 'Sunset Coastway', arrival: '14:31', departure: '14:33', speed: 50, distance: 88, remaining: 35, condition: 'GOOD', status: 'RUNNING', dwellSeconds: 0, x: -12, z: 210 },
  { line: 'B2', name: 'Night Mail', from: 'East Terminal', to: 'West Interchange', next: 'Redwood Foothills', stop: 'Redwood Foothills', arrival: '14:37', departure: '14:39', speed: 50, distance: 302, remaining: 96, condition: 'GOOD', status: 'RUNNING', dwellSeconds: 0, x: 760, z: 198 },
  { line: 'B3', name: 'Metro Regional', from: 'Northern Ridge', to: 'South Meadow', next: 'Canyon Pass Freight', stop: 'Canyon Pass Freight', arrival: '14:20', departure: '14:22', speed: 50, distance: 59, remaining: 19, condition: 'GOOD', status: 'RUNNING', dwellSeconds: 0, x: 260, z: 186 },
];

export const TrainControlCenter: React.FC<{ isOpen: boolean; onClose: () => void; engine?: any }> = ({ isOpen, onClose, engine }) => {
  const [selected, setSelected] = useState(0);
  const [trains, setTrains] = useState<ServiceTelemetry[]>(fallbackServices);
  const [log, setLog] = useState<string[]>(['[CTC] Central Train Control System initialized.', '[CTC] All six automated lines F1-F3, B1-B3 synchronized.']);

  // Live polling of engine AITrainManager
  useEffect(() => {
    if (!isOpen) return;
    const poll = () => {
      if (engine?.aiTrainManager?.getDispatchTelemetry) {
        const live: ServiceTelemetry[] = engine.aiTrainManager.getDispatchTelemetry();
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
    setLog(prev => [msg, ...prev.slice(0, 7)]);
  }, []);

  const handleToggleHold = useCallback((targetLine?: RailwayTrackLine) => {
    const lineToToggle = targetLine || trains[selected]?.line;
    if (!lineToToggle) return;

    if (engine?.aiTrainManager?.toggleServiceHold) {
      const isNowHeld = engine.aiTrainManager.toggleServiceHold(lineToToggle);
      soundEngine.playStationChime();
      addLog(`[DISPATCH] Line ${lineToToggle} order updated: ${isNowHeld ? 'HOLD AT CURRENT BLOCK' : 'CLEARED FOR DEPARTURE'}`);
    } else {
      setTrains(prev => prev.map(t => {
        if (t.line === lineToToggle) {
          const nextHeld = t.status !== 'HELD';
          addLog(`[SIM-DISPATCH] Line ${lineToToggle} order updated: ${nextHeld ? 'HOLD' : 'CLEARED'}`);
          return { ...t, status: nextHeld ? 'HELD' : 'RUNNING', speed: nextHeld ? 0 : 50 };
        }
        return t;
      }));
    }
  }, [engine, trains, selected, addLog]);

  const handleBroadcastAnnouncement = useCallback(() => {
    const t = trains[selected];
    if (!t) return;
    soundEngine.playStationChime();
    addLog(`[PA-BROADCAST] Station announcement triggered for Line ${t.line} approaching ${t.next}.`);
  }, [trains, selected, addLog]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        setSelected(Number(e.key) - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'Tab') {
        setSelected(v => (v + 1) % 6);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        setSelected(v => (v + 5) % 6);
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
  }, [isOpen, onClose, selected, handleToggleHold, handleBroadcastAnnouncement]);

  if (!isOpen) return null;
  const current = trains[selected] || trains[0];
  const isHeld = current.status === 'HELD';
  const panel = 'rounded-lg border border-cyan-500/30 bg-[#07131e]/90 p-3 shadow-[0_0_24px_rgba(6,182,212,.08)]';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-2 text-cyan-50 backdrop-blur-sm select-none" role="dialog" aria-modal="true" aria-label="Railway operations control centre">
      <div className="relative flex max-h-[96vh] w-full max-w-[1540px] flex-col overflow-auto rounded-xl border border-cyan-400/50 bg-[#040c14] p-3 font-mono shadow-2xl">
        {/* Terminal Header */}
        <header className="mb-3 flex items-center justify-between border-b border-cyan-500/30 pb-2">
          <div className="flex items-center gap-3">
            <RadioTower className="h-6 w-6 text-cyan-400 animate-pulse" />
            <div>
              <div className="flex items-center gap-2 text-base md:text-lg font-black tracking-widest text-cyan-300">
                LAST SANCTUARY · CENTRAL RAILWAY DISPATCH
              </div>
              <div className="text-[10px] tracking-[.25em] text-cyan-400/70">
                BASEMENT CONTROL FACILITY · 5-MONITOR OPERATIONS CONSOLE
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-block rounded border border-emerald-500/40 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
              ● CTC SYSTEM ONLINE
            </span>
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-slate-300 transition-colors hover:border-red-500 hover:bg-red-950/50 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* 5-Screen Console Layout */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
          {/* LEFT COLUMN: 2 SCREENS */}
          <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {/* LEFT MONITOR 01: POWER & TRACTION */}
            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">LEFT DISPLAY 1 · INFRASTRUCTURE</span>
                <Power className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <div className="text-[9px] text-slate-400 uppercase">Track Network</div>
                  <div className="text-xl font-black text-cyan-200">6 / 6 LINES</div>
                  <div className="text-[10px] text-emerald-400">F1, F2, F3, B1, B2, B3 Active</div>
                </div>
                <div className="h-1.5 w-full rounded bg-slate-800">
                  <div className="h-full w-full rounded bg-gradient-to-r from-cyan-400 to-emerald-400" />
                </div>
                <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                  <div><span className="text-slate-500">OHE Grid:</span> 25 kV AC</div>
                  <div><span className="text-slate-500">Feeders:</span> Nominal</div>
                  <div><span className="text-slate-500">Interlock:</span> Solid State</div>
                  <div><span className="text-slate-500">Detection:</span> Axle Counters</div>
                </div>
              </div>
            </div>

            {/* LEFT MONITOR 02: SELECTED TRAIN TELEMETRY */}
            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">LEFT DISPLAY 2 · TRAIN TELEMETRY</span>
                <Activity className="h-3 w-3 text-cyan-300" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">SERVICE</span>
                  <span className="font-bold text-cyan-300">{current.line} · {current.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">BRAKE PIPE</span>
                  <span className="font-bold text-emerald-400">5.02 bar [OK]</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">PASSENGER DOORS</span>
                  <span className={`font-bold ${current.status === 'DOORS_OPEN' ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>
                    {current.status === 'DOORS_OPEN' ? 'OPEN (BOARDING)' : 'LOCKED'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">STATION DWELL</span>
                  <span className="font-bold text-amber-300">
                    {current.dwellSeconds > 0 ? `${current.dwellSeconds}s remaining` : 'EN ROUTE'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">WORLD POSITION</span>
                  <span className="font-bold text-slate-300">X:{current.x} · Z:{current.z}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER COLUMN: MAIN PANORAMIC WIDE SCREEN */}
          <main className="min-w-0 space-y-3">
            {/* WIDE SCREEN: TIMETABLE & SERVICE STATUS */}
            <section className={panel}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/60 pb-1.5">
                <div className="flex items-center gap-2 text-xs font-bold tracking-wider text-cyan-300">
                  <Train className="h-4 w-4 text-cyan-400" />
                  <span>CENTER WIDE SCREEN · TIMETABLE & ARRIVAL/DEPARTURE BOARD</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-slate-400">CURRENT TIME: 14:15:40</span>
                  <span className="rounded bg-cyan-950 px-2 py-0.5 text-cyan-300 border border-cyan-700/50">
                    ALL 6 PASSENGER SERVICES AUTONOMOUS
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead className="bg-[#03090f] text-[9px] uppercase text-cyan-400">
                    <tr>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Service Line</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Route Origin / Terminus</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Next Scheduled Stop</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Speed</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2">Dispatch Status</th>
                      <th className="border-b border-cyan-900/80 px-2 py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trains.map((row, i) => {
                      const isSel = selected === i;
                      const isRowHeld = row.status === 'HELD';
                      return (
                        <tr
                          key={row.line}
                          onClick={() => setSelected(i)}
                          className={`cursor-pointer border-b border-slate-800/80 transition-colors ${
                            isSel
                              ? 'bg-cyan-950/70 text-white font-medium shadow-[inset_2px_0_0_#22d3ee]'
                              : 'text-slate-300 hover:bg-slate-900/60'
                          }`}
                        >
                          <td className="px-2 py-2.5 font-bold">
                            <span className="inline-block w-8 rounded bg-cyan-900/50 px-1 py-0.5 text-center text-[10px] text-cyan-300 mr-2 border border-cyan-600/40">
                              {row.line}
                            </span>
                            {row.name}
                          </td>
                          <td className="px-2 py-2.5 text-slate-400">{row.from} → {row.to}</td>
                          <td className="px-2 py-2.5">{row.next}</td>
                          <td className="px-2 py-2.5">
                            <span className="font-bold text-cyan-300">{row.speed}</span> <span className="text-[10px] text-slate-500">km/h</span>
                          </td>
                          <td className="px-2 py-2.5">
                            {isRowHeld ? (
                              <span className="inline-flex items-center gap-1 rounded bg-rose-950/70 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-700/60">
                                <AlertTriangle className="h-3 w-3" /> HELD BY DISPATCH
                              </span>
                            ) : row.status === 'DOORS_OPEN' ? (
                              <span className="inline-flex items-center gap-1 rounded bg-amber-950/70 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-700/60 animate-pulse">
                                ● BOARDING ({row.dwellSeconds}s)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-950/70 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-700/60">
                                ● EN ROUTE
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleHold(row.line);
                              }}
                              className={`rounded px-2 py-1 text-[10px] font-bold border transition-colors ${
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

            {/* SCHEMATIC TRACK MAP */}
            <section className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                  <MapPinned className="h-4 w-4" />
                  <span>SIX-LINE LIVE SCHEMATIC TRACK LAYOUT & TRAIN PINGS</span>
                </div>
                <div className="text-[10px] text-slate-400">CLICK ANY TRACK TO INSPECT</div>
              </div>
              <svg viewBox="0 0 740 180" className="w-full rounded bg-[#030a10] border border-cyan-950/80 p-2" role="img" aria-label="Six railway lines and station nodes">
                <defs>
                  <linearGradient id="trackGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                {/* Station Columns */}
                {['Sanctuary Central', 'Pine Valley', 'Highland Ridge', 'Riverbend Depot'].map((name, idx) => (
                  <g key={name}>
                    <line x1={100 + idx * 180} y1="15" x2={100 + idx * 180} y2="165" stroke="#1e293b" strokeDasharray="3,3" strokeWidth="1" />
                    <text x={100 + idx * 180} y="172" fontSize="8" fill="#64748b" textAnchor="middle">{name}</text>
                  </g>
                ))}
                {/* 6 Railway Tracks */}
                {trains.map((t, i) => {
                  const y = 24 + i * 23;
                  const isLineSelected = selected === i;
                  // Normalized train position for ping (scaled from world X)
                  const normX = Math.max(30, Math.min(710, 100 + ((t.x + 1000) % 2400) * 0.25));
                  return (
                    <g key={t.line} onClick={() => setSelected(i)} className="cursor-pointer">
                      <line
                        x1="25"
                        y1={y}
                        x2="715"
                        y2={y}
                        stroke={isLineSelected ? '#38bdf8' : '#334155'}
                        strokeWidth={isLineSelected ? 3 : 1.5}
                      />
                      <rect x="10" y={y - 8} width="22" height="15" rx="3" fill={isLineSelected ? '#0369a1' : '#0f172a'} stroke={isLineSelected ? '#38bdf8' : '#475569'} strokeWidth="1" />
                      <text x="21" y={y + 3} fontSize="9" fontWeight="bold" fill="#f8fafc" textAnchor="middle">{t.line}</text>

                      {/* Station stop circles on track */}
                      {[100, 280, 460, 640].map((cx, sIdx) => (
                        <circle key={sIdx} cx={cx} cy={y} r="3" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                      ))}

                      {/* Live Train Ping */}
                      <circle cx={normX} cy={y} r={isLineSelected ? 6 : 4.5} fill={t.status === 'HELD' ? '#f43f5e' : isLineSelected ? '#22d3ee' : '#38bdf8'} className="transition-all duration-300" />
                      <circle cx={normX} cy={y} r="10" fill="none" stroke={t.status === 'HELD' ? '#f43f5e' : '#22d3ee'} strokeWidth="1" opacity="0.6" className="animate-ping" />
                    </g>
                  );
                })}
              </svg>
            </section>

            {/* QUICK STATS BAR */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className={panel}>
                <div className="text-[9px] text-cyan-400">ACTIVE SELECTION</div>
                <div className="text-lg font-black text-white">{current.line} · {current.name}</div>
                <div className="text-[9px] text-slate-400">{current.from} → {current.to}</div>
              </div>
              <div className={panel}>
                <div className="flex items-center gap-1 text-[9px] text-cyan-400">
                  <Gauge className="h-3 w-3" /> TRACK SPEED
                </div>
                <div className="text-lg font-black text-cyan-200">{current.speed} <small className="text-xs">km/h</small></div>
                <div className="text-[9px] text-emerald-400">Cruising nominal</div>
              </div>
              <div className={panel}>
                <div className="flex items-center gap-1 text-[9px] text-cyan-400">
                  <Clock3 className="h-3 w-3" /> NEXT STATION ETA
                </div>
                <div className="text-lg font-black text-amber-200">{current.arrival}</div>
                <div className="text-[9px] text-slate-400">{current.remaining} km away</div>
              </div>
              <div className={panel}>
                <div className="text-[9px] text-cyan-400">DISPATCH DIRECTIVE</div>
                <div className={`text-lg font-black ${isHeld ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isHeld ? 'HOLD AT BLOCK' : 'LINE CLEAR'}
                </div>
                <div className="text-[9px] text-slate-400">Block Signal Aspect: {isHeld ? 'RED' : 'GREEN'}</div>
              </div>
            </div>
          </main>

          {/* RIGHT COLUMN: 2 SCREENS */}
          <aside className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {/* RIGHT MONITOR 01: SIGNALLING & INTERLOCKING */}
            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">RIGHT DISPLAY 1 · SIGNALS</span>
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="rounded border border-slate-800 bg-[#02070c] p-2">
                  <div className="text-[9px] text-slate-400">AUTOMATIC BLOCK STATUS</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${isHeld ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <span className="font-bold text-white">{isHeld ? 'SIGNAL HOLD [RED]' : 'SIGNAL CLEAR [GREEN]'}</span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Interlocking circuit safe</div>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <div><span className="text-slate-500">Track Circuit:</span> Normal</div>
                  <div><span className="text-slate-500">Points Switch:</span> Normal</div>
                  <div><span className="text-slate-500">AWS / TPWS:</span> Armed</div>
                  <div><span className="text-slate-500">Radio Channel:</span> 457.2 MHz</div>
                </div>
              </div>
            </div>

            {/* RIGHT MONITOR 02: OPERATIONS LOG & AUDIT */}
            <div className={panel}>
              <div className="mb-2 flex items-center justify-between border-b border-cyan-900/60 pb-1">
                <span className="text-[10px] font-bold text-cyan-400">RIGHT DISPLAY 2 · LOG & ALERTS</span>
                <AlertTriangle className="h-3 w-3 text-amber-400" />
              </div>
              <div className="h-[140px] overflow-y-auto space-y-1.5 text-[9px] font-mono text-slate-400 pr-1">
                {log.map((entry, idx) => (
                  <div key={idx} className="rounded bg-slate-900/60 px-1.5 py-1 text-slate-300 border-l-2 border-cyan-500">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Console Keyboard / Footer Command Bar */}
        <footer className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-cyan-900/60 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelected(v => (v + 5) % 6)}
              className="rounded border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900"
            >
              ◀ PREV [←]
            </button>
            <button
              onClick={() => setSelected(v => (v + 1) % 6)}
              className="rounded border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900"
            >
              NEXT [→] ▶
            </button>
            <button
              onClick={() => handleToggleHold()}
              className={`rounded px-3 py-1.5 text-xs font-bold transition-colors border ${
                isHeld
                  ? 'border-emerald-600 bg-emerald-950/80 text-emerald-200 hover:bg-emerald-900'
                  : 'border-rose-600 bg-rose-950/80 text-rose-200 hover:bg-rose-900'
              }`}
            >
              {isHeld ? 'CLEAR HOLD [H]' : 'HOLD SERVICE [H]'}
            </button>
            <button
              onClick={handleBroadcastAnnouncement}
              className="rounded border border-cyan-700/60 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 transition-colors hover:bg-cyan-900 flex items-center gap-1.5"
            >
              <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
              <span>PA BROADCAST [A]</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <Keyboard className="h-4 w-4 text-cyan-400" />
            <span className="hidden sm:inline">[1-6] SELECT LINE · [←/→] CYCLE · [H] HOLD/CLEAR · [A] PA CHIME · [ESC] EXIT</span>
            <span className="sm:hidden">[1-6] SELECT · [H] HOLD · [ESC] EXIT</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

