import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AITrainManager, RailwayServiceTelemetry } from '../engine/world/AITrainManager';
import { soundEngine } from '../utils/audio';
import { stationAnnouncementSystem } from '../engine/world/MultilingualAnnouncementSystem';

interface RailwayOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainManager: AITrainManager | null;
}

export const RailwayOperationsModal: React.FC<RailwayOperationsModalProps> = ({
  isOpen,
  onClose,
  trainManager,
}) => {
  const [telemetry, setTelemetry] = useState<RailwayServiceTelemetry[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'board' | 'map' | 'signals' | 'diagnostics' | 'timetable' | 'cctv' | 'freight' | 'power' | 'announcements'>('board');
  const [actionFeedback, setActionFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Poll live telemetry from train manager at 4 Hz while open
  useEffect(() => {
    if (!isOpen || !trainManager) return;
    const updateData = () => {
      setTelemetry(trainManager.getOperationsTelemetry());
    };
    updateData();
    const interval = setInterval(updateData, 250);
    return () => clearInterval(interval);
  }, [isOpen, trainManager]);

  const selectedTrain = useMemo(() => {
    return telemetry.find((t) => t.slot === selectedSlot) || telemetry[0] || null;
  }, [telemetry, selectedSlot]);

  // Dispatch Hold / Release Action
  const handleToggleHold = useCallback(() => {
    if (!trainManager || !selectedTrain) return;
    if (selectedTrain.holdOrdered) {
      const res = trainManager.releaseTrainHold(selectedTrain.trainId);
      setActionFeedback({ text: res.message, isError: !res.success });
      if (res.success) soundEngine.playStationChime();
      else soundEngine.playUIClick();
    } else {
      const res = trainManager.requestTrainHold(selectedTrain.trainId);
      setActionFeedback({ text: res.message, isError: !res.success });
      soundEngine.playUIClick();
    }
    // Refresh telemetry immediately
    setTelemetry(trainManager.getOperationsTelemetry());
  }, [trainManager, selectedTrain]);

  // Acknowledge Warning Action
  const handleAcknowledgeWarning = useCallback(() => {
    if (!trainManager || !selectedTrain) return;
    const res = trainManager.acknowledgeWarning(selectedTrain.trainId);
    setActionFeedback({ text: res.message, isError: !res.success });
    soundEngine.playUIClick();
    setTelemetry(trainManager.getOperationsTelemetry());
  }, [trainManager, selectedTrain]);

  // Keyboard shortcut listener while operations modal is active
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1-6: Direct slot selection
      if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const slotNum = parseInt(e.key, 10);
        setSelectedSlot(slotNum);
        soundEngine.playUIClick();
        e.preventDefault();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowUp') {
        setSelectedSlot((prev) => (prev > 1 ? prev - 1 : 6));
        soundEngine.playUIClick();
        e.preventDefault();
        return;
      }
      if (e.key === 'ArrowDown') {
        setSelectedSlot((prev) => (prev < 6 ? prev + 1 : 1));
        soundEngine.playUIClick();
        e.preventDefault();
        return;
      }

      // H key: Request hold or release
      if (e.key === 'h' || e.key === 'H') {
        handleToggleHold();
        e.preventDefault();
        return;
      }

      // R key: Review route & timetable tab
      if (e.key === 'r' || e.key === 'R') {
        setActiveTab((prev) => (prev === 'timetable' ? 'board' : 'timetable'));
        soundEngine.playUIClick();
        e.preventDefault();
        return;
      }

      // A key: Acknowledge warning
      if (e.key === 'a' || e.key === 'A') {
        handleAcknowledgeWarning();
        e.preventDefault();
        return;
      }

      // Enter key: Focus details on selected train
      if (e.key === 'Enter') {
        setActiveTab('diagnostics');
        soundEngine.playUIClick();
        e.preventDefault();
        return;
      }

      // Escape key: Close modal
      if (e.key === 'Escape') {
        onClose();
        soundEngine.playUIClick();
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleToggleHold, handleAcknowledgeWarning, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2 sm:p-4 text-white font-sans select-none animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-6xl max-h-[95vh] bg-[#090d16] border-2 border-sky-600/70 rounded-xl shadow-2xl shadow-sky-950/60 overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#0f172a] border-b border-sky-900/60">
          <div className="flex items-center space-x-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400" />
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-wider text-sky-300 font-mono">
                SANCTUARY CENTRAL RAILWAY OPERATIONS CENTRE
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                BASEMENT SUB-LEVEL 1 · AUTOMATIC TRAIN SUPERVISION (ATS) · 6-TRACK CORRIDOR
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-2 sm:mt-0">
            <span className="px-2.5 py-1 text-xs font-mono tabular-nums font-bold bg-[#071121] text-sky-200 border border-sky-700/60 rounded">
              DAY {selectedTrain?.dayCount ?? 1} · {selectedTrain?.currentTimeText ?? '08:00:00'}
            </span>
            <span className="hidden md:inline-block px-2.5 py-1 text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 rounded">
              INTERLOCK: NOMINAL
            </span>
            <button
              onClick={() => {
                soundEngine.playUIClick();
                onClose();
              }}
              className="px-3 py-1.5 text-xs font-bold font-mono bg-rose-600/80 hover:bg-rose-500 text-white rounded transition-colors shadow"
              title="Close Interface (Esc)"
            >
              EXIT [ESC]
            </button>
          </div>
        </div>

        {/* Action Feedback Banner */}
        {actionFeedback && (
          <div
            className={`px-4 py-2 text-xs font-mono font-bold flex items-center justify-between transition-all ${
              actionFeedback.isError
                ? 'bg-rose-950/90 text-rose-200 border-b border-rose-700'
                : 'bg-emerald-950/90 text-emerald-200 border-b border-emerald-700'
            }`}
          >
            <span>{actionFeedback.text}</span>
            <button
              onClick={() => setActionFeedback(null)}
              className="text-xs px-2 py-0.5 bg-black/40 hover:bg-black/60 rounded ml-4"
            >
              DISMISS
            </button>
          </div>
        )}

        {/* Tactical Monitor Navigation Tabs */}
        <div className="flex items-center overflow-x-auto bg-[#0b1120] border-b border-slate-800 px-3 py-1.5 space-x-2 scrollbar-none">
          <button
            onClick={() => {
              setActiveTab('board');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'board'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            CENTRE MONITOR: OPERATIONS BOARD
          </button>
          <button
            onClick={() => {
              setActiveTab('map');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            LEFT 1: NETWORK MAP
          </button>
          <button
            onClick={() => {
              setActiveTab('signals');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'signals'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            LEFT 2: SIGNALS & BLOCKS
          </button>
          <button
            onClick={() => {
              setActiveTab('diagnostics');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'diagnostics'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            RIGHT 1: TRAIN DIAGNOSTICS
          </button>
          <button
            onClick={() => {
              setActiveTab('timetable');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'timetable'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            RIGHT 2: TIMETABLE [R]
          </button>
          <button
            onClick={() => {
              setActiveTab('cctv');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'cctv'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            📹 CCTV CHANNELS
          </button>
          <button
            onClick={() => {
              setActiveTab('freight');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'freight'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            🏗️ FREIGHT LOGISTICS
          </button>
          <button
            onClick={() => {
              setActiveTab('power');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'power'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            ⚡ 25kV & SOLAR POWER
          </button>
          <button
            onClick={() => {
              setActiveTab('announcements');
              soundEngine.playUIClick();
            }}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded transition-all whitespace-nowrap ${
              activeTab === 'announcements'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            📢 PA ANNOUNCEMENTS
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-[#070a12]">
          
          {/* TAB 1: OPERATIONS BOARD (CENTRE MONITOR) */}
          {activeTab === 'board' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2.5">
                {telemetry.map((t) => {
                  const isSelected = t.slot === selectedSlot;
                  return (
                    <div
                      key={t.slot}
                      onClick={() => {
                        setSelectedSlot(t.slot);
                        soundEngine.playUIClick();
                      }}
                      className={`p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#131c31] border-sky-400 shadow-md shadow-sky-900/40 ring-1 ring-sky-400'
                          : 'bg-[#0f172a]/80 border-slate-800 hover:border-slate-700 hover:bg-[#141e33]'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {/* Slot, Line Badge and Service Info */}
                        <div className="flex items-center space-x-3">
                          <span className="w-6 h-6 flex items-center justify-center text-xs font-mono tabular-nums font-bold bg-slate-800 text-slate-300 rounded">
                            {t.slot}
                          </span>
                          <span
                            className={`px-2.5 py-1 text-xs font-mono font-bold rounded ${
                              t.direction === 1
                                ? 'bg-sky-900 text-sky-200 border border-sky-700'
                                : 'bg-amber-900 text-amber-200 border border-amber-700'
                            }`}
                          >
                            {t.trainNumber} · {t.line}
                          </span>
                          <div>
                            <div className="font-bold text-sm text-slate-100">
                              {t.serviceId} · {t.serviceName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {t.serviceType} · {t.directionLabel}
                            </div>
                          </div>
                        </div>

                        {/* Stations & Route Progress */}
                        <div className="text-left font-mono tabular-nums text-[11px] space-y-0.5">
                          <div className="text-slate-300">
                            Arrived: <span className="text-emerald-300 font-semibold">{t.arrivedStation}</span> · Departed: <span className="text-slate-100 font-semibold">{t.departedStation}</span>
                          </div>
                          <div className="text-sky-300">
                            Departing <span className="font-semibold">{t.departingStation}</span> → Arriving <span className="text-amber-300 font-semibold">{t.arrivingStation}</span>
                          </div>
                          <div className="text-slate-400">
                            Covered: <span className="text-emerald-300">{t.legDistanceCoveredM}m</span> ({t.routeDistanceCoveredKm.toFixed(2)}km) · Left: <span className="text-amber-300">{t.legDistanceLeftM}m</span> ({t.routeDistanceLeftKm.toFixed(2)}km)
                          </div>
                        </div>

                        {/* Speed, Arrival/Departure Clocks and Condition */}
                        <div className="flex items-center space-x-3">
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-base font-bold text-emerald-400">
                              {t.speedKmh} km/h
                            </div>
                            <div className="text-[11px] text-slate-300">
                              DEP {t.departureTime} · ARR {t.arrivalTime}
                            </div>
                            <div className="text-[10px] text-sky-300">
                              {t.isAtStation ? `DEP IN ${t.departureCountdownText}` : `ARR IN ${t.arrivalCountdownText}`}
                            </div>
                          </div>

                          <div
                            className={`px-3 py-1.5 text-xs font-mono font-bold rounded text-center ${
                              t.holdOrdered
                                ? 'bg-rose-900 text-rose-200 border border-rose-600'
                                : t.stationStatus === 'doors_open'
                                ? 'bg-amber-900 text-amber-200 border border-amber-600'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                            }`}
                          >
                            <div>{t.condition} · {t.conditionPct}%</div>
                            <div className="text-[10px] font-normal opacity-85">{t.onTimeStatus}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Quick-Action Panel for Selected Train */}
              {selectedTrain && (
                <div className="mt-4 p-4 rounded-xl bg-[#0f172a] border border-sky-900/60 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-950 flex items-center justify-center font-mono font-bold text-sky-400 border border-sky-800">
                      #{selectedTrain.slot}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">
                        Selected: {selectedTrain.serviceId} ({selectedTrain.serviceName})
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Line {selectedTrain.line} · Block {selectedTrain.blockId} · Signal: {selectedTrain.signalAspect.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleToggleHold}
                      className={`px-4 py-2 text-xs font-mono font-bold rounded-lg transition-all shadow ${
                        selectedTrain.holdOrdered
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-rose-600 hover:bg-rose-500 text-white'
                      }`}
                    >
                      {selectedTrain.holdOrdered ? 'RELEASE HOLD [H]' : 'REQUEST HOLD [H]'}
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('diagnostics');
                        soundEngine.playUIClick();
                      }}
                      className="px-4 py-2 text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                    >
                      VIEW DIAGNOSTICS [ENTER]
                    </button>

                    {selectedTrain.warningMessage && !selectedTrain.warningAcknowledged && (
                      <button
                        onClick={handleAcknowledgeWarning}
                        className="px-4 py-2 text-xs font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                      >
                        ACKNOWLEDGE WARNING [A]
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NETWORK TOPOLOGY MAP (LEFT 1 MONITOR) */}
          {activeTab === 'map' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-sky-400 font-mono mb-2">
                  6-TRACK AUTONOMOUS RAILWAY CORRIDOR (SANCTUARY REGIONAL SYSTEM)
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  Live 8-station corridor progress across the 9.6 km primary loop ({telemetry[0]?.currentTimeText ?? '08:00:00'}).
                </p>

                <div className="space-y-4">
                  {telemetry.map((t) => (
                    <div key={t.slot} className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800/80">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums mb-1.5">
                        <span className="font-bold text-sky-300">
                          {t.trainNumber} · TRACK {t.line} ({t.directionLabel})
                        </span>
                        <span className="text-slate-300">
                          {t.departingStation} → {t.arrivingStation} · {t.speedKmh} km/h · {t.routeProgressPct}%
                        </span>
                      </div>

                      {/* Track Bar with 8 Station Pins and Train Marker */}
                      <div className="relative w-full h-7 bg-slate-900 border border-slate-800 rounded flex items-center px-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((sIdx) => {
                          const leftPct = 4 + (sIdx / 7) * 92;
                          return (
                            <div
                              key={sIdx}
                              style={{ left: `${leftPct}%` }}
                              className="absolute top-0 bottom-0 w-0.5 bg-slate-700/70"
                              title={`Station ${sIdx + 1}`}
                            />
                          );
                        })}

                        {(() => {
                          const normRatio =
                            t.direction === 1
                              ? t.routeProgressPct / 100
                              : 1 - t.routeProgressPct / 100;
                          const leftPct = Math.max(4, Math.min(96, 4 + normRatio * 92));
                          return (
                            <div
                              style={{ left: `${leftPct}%` }}
                              className={`absolute -translate-x-1/2 flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white shadow-lg ${
                                t.holdOrdered
                                  ? 'bg-rose-600 ring-2 ring-rose-400'
                                  : 'bg-emerald-600 ring-1 ring-emerald-400'
                              }`}
                            >
                              <span>{t.direction === 1 ? '►' : '◄'}</span>
                              <span>{t.serviceId}</span>
                            </div>
                          );
                        })()}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-mono">
                        {(t.routeStations || []).map((st) => (
                          <span
                            key={st.index}
                            className={`rounded px-1.5 py-0.5 border ${
                              st.status === 'arrived'
                                ? 'border-emerald-500/60 bg-emerald-950/70 text-emerald-300'
                                : st.status === 'arriving'
                                ? 'border-amber-500/60 bg-amber-950/70 text-amber-300'
                                : st.status === 'departed'
                                ? 'border-sky-500/60 bg-sky-950/70 text-sky-300'
                                : 'border-slate-800 bg-slate-900/70 text-slate-400'
                            }`}
                          >
                            {st.shortName} ({st.status})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNALS & BLOCKS (LEFT 2 MONITOR) */}
          {activeTab === 'signals' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-sky-400 font-mono mb-2">
                  BLOCK OCCUPANCY & INTERLOCKING SIGNALS
                </h3>
                <p className="text-xs text-slate-400 font-mono mb-4">
                  Standard fixed-block signalling with automated headway protection and cab signalling.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {telemetry.map((t) => (
                    <div key={t.slot} className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-white">
                          BLOCK {t.blockId}
                        </span>
                        <span
                          className={`w-3.5 h-3.5 rounded-full ${
                            t.signalAspect === 'red'
                              ? 'bg-rose-500 shadow-lg shadow-rose-500/50'
                              : t.signalAspect === 'yellow'
                              ? 'bg-amber-400 shadow-lg shadow-amber-400/50'
                              : 'bg-emerald-400 shadow-lg shadow-emerald-400/50'
                          }`}
                        />
                      </div>
                      <div className="text-xs text-slate-400 font-mono space-y-1">
                        <div>Occupant: <span className="text-sky-300 font-bold">{t.serviceId}</span></div>
                        <div>Signal Aspect: <span className="text-white uppercase font-bold">{t.signalAspect}</span></div>
                        <div>Distance to Station: <span className="text-slate-300">{t.distToNextMeters}m</span></div>
                        <div>Safety Interlock: <span className="text-emerald-400">ENGAGED</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: FLEET DIAGNOSTICS (RIGHT 1 MONITOR) */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-4">
              {selectedTrain ? (
                <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-white font-mono">
                        {selectedTrain.serviceId} · {selectedTrain.serviceName}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono">
                        Subsystem Telemetry Profile · Line {selectedTrain.line}
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-700 text-xs font-mono font-bold rounded">
                      {selectedTrain.condition} · {selectedTrain.conditionPct}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Traction Motor Temp</div>
                      <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                        {selectedTrain.tractionMotorTempC}°C
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">{selectedTrain.conditionDetail}</div>
                    </div>

                    <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Pneumatic Air Brake</div>
                      <div className="text-xl font-bold font-mono text-sky-400 mt-1">
                        {selectedTrain.brakePressureBar} BAR
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">Nominal: 5.0 BAR</div>
                    </div>

                    <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Catenary Voltage</div>
                      <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                        {selectedTrain.pantographVoltageKv} kV
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">25 kV AC Single-Phase</div>
                    </div>

                    <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400 font-mono">Distance Covered / Left</div>
                      <div className="text-base font-bold font-mono tabular-nums text-cyan-300 mt-1">
                        {selectedTrain.routeDistanceCoveredKm.toFixed(2)} / {selectedTrain.routeDistanceLeftKm.toFixed(2)} km
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1">
                        Leg: {selectedTrain.legDistanceCoveredM}m / {selectedTrain.legDistanceLeftM}m left
                      </div>
                    </div>
                  </div>

                  {/* Subsystems checklist */}
                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800 font-mono text-xs space-y-1.5 text-slate-300">
                    <div className="text-slate-400 font-bold mb-1">STATION & CONDITION LOG:</div>
                    <div className="text-emerald-400">✓ Last Arrived: {selectedTrain.arrivedStation} · Last Departed: {selectedTrain.departedStation}</div>
                    <div className="text-sky-400">✓ Active Leg: {selectedTrain.departingStation} → {selectedTrain.arrivingStation}</div>
                    <div className="text-amber-300">✓ Departure {selectedTrain.departureTime} · Arrival {selectedTrain.arrivalTime} · Cumulative {selectedTrain.totalDistanceCoveredKm.toFixed(1)} km</div>
                    <div className="text-emerald-400">✓ Automatic Train Protection (ATP) Beacon Link: SYNCED · Doors {selectedTrain.doorsOpen ? 'OPEN' : 'SECURED'}</div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 font-mono">No train selected.</div>
              )}
            </div>
          )}

          {/* TAB 5: TIMETABLE & STATION BOARD (RIGHT 2 MONITOR) */}
          {activeTab === 'timetable' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <h3 className="text-sm font-bold text-amber-400 font-mono">
                    LIVE CORRIDOR TIMETABLE — ALL 6 SERVICES
                  </h3>
                  <span className="text-xs text-slate-300 font-mono tabular-nums">
                    CLOCK: DAY {selectedTrain?.dayCount ?? 1} · {selectedTrain?.currentTimeText ?? '08:00:00'}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono tabular-nums text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 px-2">TRAIN / LINE</th>
                        <th className="py-2 px-2">ARRIVED / DEPARTED</th>
                        <th className="py-2 px-2">DEPARTING → ARRIVING</th>
                        <th className="py-2 px-2">DEP TIME</th>
                        <th className="py-2 px-2">ARR TIME</th>
                        <th className="py-2 px-2">SPEED</th>
                        <th className="py-2 px-2">COVERED / LEFT</th>
                        <th className="py-2 px-2">CONDITION</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {telemetry.map((t) => (
                        <tr key={t.slot} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-2 font-bold text-sky-300">
                            {t.trainNumber} ({t.line})
                          </td>
                          <td className="py-2.5 px-2 text-[11px] text-slate-300">
                            <div>ARR: {t.arrivedStation}</div>
                            <div className="text-slate-400">DEP: {t.departedStation}</div>
                          </td>
                          <td className="py-2.5 px-2 text-[11px]">
                            <div className="text-sky-300">{t.departingStation} →</div>
                            <div className="text-amber-300 font-bold">{t.arrivingStation}</div>
                          </td>
                          <td className="py-2.5 px-2 text-slate-200">
                            <div>{t.departureTime}</div>
                            <div className="text-[10px] text-slate-400">
                              {t.isAtStation ? `In ${t.departureCountdownText}` : 'Departed'}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-emerald-400 font-bold">
                            <div>{t.arrivalTime}</div>
                            <div className="text-[10px] text-sky-300 font-normal">
                              {t.isAtStation ? 'At Platform' : `ETA ${t.arrivalCountdownText}`}
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-cyan-300 font-bold">{t.speedKmh} km/h</td>
                          <td className="py-2.5 px-2 text-[11px]">
                            <div>{t.legDistanceCoveredM}m / {t.legDistanceLeftM}m</div>
                            <div className="text-[10px] text-slate-400">
                              {t.routeDistanceCoveredKm.toFixed(2)} / {t.routeDistanceLeftKm.toFixed(2)} km
                            </div>
                          </td>
                          <td className="py-2.5 px-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                t.holdOrdered
                                  ? 'bg-rose-900 text-rose-300'
                                  : t.stationStatus === 'doors_open'
                                  ? 'bg-amber-900 text-amber-300'
                                  : 'bg-emerald-950 text-emerald-300'
                              }`}
                            >
                              {t.condition} ({t.conditionPct}%)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CCTV SECURITY CHANNELS */}
          {activeTab === 'cctv' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                      STATION CCTV SURVEILLANCE & RPF SECURITY INTERLOCK
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      8 High-Definition Optical Feeds · AI Video Analytics & Motion Detection
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold rounded">
                      ALL 8 CAMERAS ONLINE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { id: 'CAM-01', name: 'Main Concourse & Colonnade', view: 'Ground Level Y=0.27', status: 'Normal flow · 42 passengers' },
                    { id: 'CAM-02', name: 'TVM Kiosks & DFMD Security', view: 'Security Screening Arch', status: 'Active scanning · Turnstiles OK' },
                    { id: 'CAM-03', name: 'AC Executive Lounge & Cafe', view: 'First Floor Y=4.70', status: 'Seated passengers · Peaceful' },
                    { id: 'CAM-04', name: 'Skywalks & Air Concourse', view: 'Upper Level Y=9.80', status: 'Dual F.O.B. & Concourse clear' },
                    { id: 'CAM-05', name: 'Platforms 1 & 2 (Rajdhani)', view: 'Island Platform West', status: 'Tactile edge clear · Train dwell' },
                    { id: 'CAM-06', name: 'Platforms 3 & 4 (Vande Bharat)', view: 'Semi-High-Speed Bay', status: 'Boarding queues nominal' },
                    { id: 'CAM-07', name: 'Freight Terminal & Crane', view: 'South Cargo Siding Z=122', status: 'WAG-9 stationary · Crane standby' },
                    { id: 'CAM-08', name: 'Level Crossing X=160', view: 'Perimeter Road Barrier', status: 'Barriers elevated · Road clear' },
                  ].map((cam) => (
                    <div key={cam.id} className="bg-black/80 rounded-lg border border-slate-700 p-2.5 relative overflow-hidden group">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5 border-b border-slate-800 pb-1">
                        <span className="font-bold text-sky-400">{cam.id}</span>
                        <span className="flex items-center gap-1 text-rose-400 font-bold">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                          REC
                        </span>
                      </div>

                      {/* Simulated Camera Feed Canvas Graphic */}
                      <div className="h-24 bg-gradient-to-b from-slate-900 to-slate-950 rounded border border-slate-800 flex flex-col items-center justify-center p-2 text-center relative">
                        <div className="absolute top-1 left-1.5 text-[9px] font-mono text-emerald-400/80">
                          {cam.view}
                        </div>
                        <div className="text-slate-500 text-2xl mb-1">📹</div>
                        <div className="text-[11px] font-bold text-white font-sans truncate w-full">{cam.name}</div>
                        <div className="text-[9px] text-emerald-400 font-mono mt-0.5">{cam.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: FREIGHT & CARGO LOGISTICS */}
          {activeTab === 'freight' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>🏗️</span>
                      FREIGHT LOGISTICS & CONTAINER TERMINAL (TRACK Z=122)
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Dedicated Heavy Freight Corridor, WAG-9 Locomotive & Rail Gantry Crane
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-amber-950 text-amber-300 border border-amber-700 text-xs font-mono font-bold rounded">
                    YARD CAPACITY: 82% OPERATIONAL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Freight Locomotive</div>
                    <div className="text-base font-bold font-mono text-emerald-400 mt-1">WAG-9 #31088</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">6,000 HP Heavy Co-Co Electric</div>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Rail Gantry Crane</div>
                    <div className="text-base font-bold font-mono text-amber-400 mt-1">ACTIVE · DOCKSIDE</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">Spreader Beam: 40ft TEU Ready</div>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Container Stock</div>
                    <div className="text-base font-bold font-mono text-sky-400 mt-1">48 TEU IN YARD</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">CONCOR Red, Blue & Green Stacks</div>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Parcel Consignments</div>
                    <div className="text-base font-bold font-mono text-purple-400 mt-1">16 LOGISTICS SHIPMENTS</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">Medical supplies, tools, grain</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: 25kV TRACTION & ROOFTOP SOLAR POWER */}
          {activeTab === 'power' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>⚡</span>
                      25kV AC TRACTION SUBSTATION & SOLAR TELEMETRY
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Overhead Catenary Electrification, Rooftop PV Array & Redundant Battery Backup
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-700 text-xs font-mono font-bold rounded">
                    GRID STABILITY: 100% NOMINAL
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Traction Line Voltage</div>
                    <div className="text-xl font-bold font-mono text-amber-400 mt-1">25.4 kV AC</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">50 Hz Single-Phase Catenary</div>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Rooftop Solar Array</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-1">146.2 kW</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">48 Angled PV Panels Generating</div>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Station Battery Reserve</div>
                    <div className="text-xl font-bold font-mono text-sky-400 mt-1">98.5% (420 kWh)</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">UPS Critical Life-Support Online</div>
                  </div>

                  <div className="p-3 bg-[#0a0f1d] rounded-lg border border-slate-800">
                    <div className="text-xs text-slate-400 font-mono">Diesel Backup Generator</div>
                    <div className="text-xl font-bold font-mono text-purple-400 mt-1">STANDBY (100% FUEL)</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">Auto-Transfer Switch Armed</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: PA PUBLIC ADDRESS ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="space-y-4">
              <div className="p-4 bg-[#0f172a] rounded-xl border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                      <span>📢</span>
                      MULTILINGUAL STATION PUBLIC ADDRESS (PA) CONSOLE
                    </h3>
                    <p className="text-xs text-slate-400 font-mono">
                      Manual and Autonomous Indian Railways Announcements (Hindi & English)
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => {
                      soundEngine.playStationChime();
                      stationAnnouncementSystem.announceTrainArrival('12301', 'Sanctuary Rajdhani Express', 'Sanctuary Central Terminus', 'Northern Apex', 1);
                    }}
                    className="p-3 bg-[#0a0f1d] hover:bg-slate-800/80 rounded-lg border border-slate-700 text-left transition-all"
                  >
                    <div className="text-xs text-amber-400 font-mono font-bold">📢 Announce Rajdhani Arrival</div>
                    <div className="text-[11px] text-slate-300 font-sans mt-1">
                      Platform 1 arrival advisory in Hindi & English
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playStationChime();
                      stationAnnouncementSystem.announceTrainDeparture('22436', 'Vande Bharat Express', 'Varanasi Junction', 2);
                    }}
                    className="p-3 bg-[#0a0f1d] hover:bg-slate-800/80 rounded-lg border border-slate-700 text-left transition-all"
                  >
                    <div className="text-xs text-sky-400 font-mono font-bold">📢 Announce Vande Bharat</div>
                    <div className="text-[11px] text-slate-300 font-sans mt-1">
                      Platform 2 semi-high-speed departure advisory
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      soundEngine.playStationChime();
                      stationAnnouncementSystem.announceSecurityNotice();
                    }}
                    className="p-3 bg-[#0a0f1d] hover:bg-slate-800/80 rounded-lg border border-slate-700 text-left transition-all"
                  >
                    <div className="text-xs text-rose-400 font-mono font-bold">🛡️ Broadcast RPF Security Alert</div>
                    <div className="text-[11px] text-slate-300 font-sans mt-1">
                      Unattended luggage & vigilance advisory
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Tactical Footer with Keyboard Shortcuts Help */}
        <div className="px-4 py-2.5 bg-[#0b1120] border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span><strong className="text-white">[1-6]</strong> Select Train</span>
            <span><strong className="text-white">[↑/↓]</strong> Navigate</span>
            <span><strong className="text-white">[ENTER]</strong> Diagnostics</span>
            <span><strong className="text-white">[H]</strong> Hold/Release</span>
            <span><strong className="text-white">[R]</strong> Timetable</span>
            <span><strong className="text-white">[A]</strong> Ack Warning</span>
            <span><strong className="text-white">[ESC]</strong> Close</span>
          </div>
          <div className="mt-1 sm:mt-0 text-slate-500">
            TOUCH & MOUSE ENABLED · SAFE ATS DISPATCH
          </div>
        </div>

      </div>
    </div>
  );
};
