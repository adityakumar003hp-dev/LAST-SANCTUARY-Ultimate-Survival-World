import React, { useMemo, useState } from 'react';
import {
  Tv,
  Radio,
  Users,
  AlertTriangle,
  X,
  Search,
  Power,
  Truck,
  Building2,
  Signal,
  Clock,
  Globe,
  Play,
} from 'lucide-react';
import { ASTEROID_MEDIA_STAGES } from '../engine/media/MediaChannelRegistry';
import type {
  GlobalMediaSnapshot,
  MediaChannelId,
  MediaWorldPhase,
} from '../engine/media/MediaTypes';
import type {
  GlobalOutbreakMetrics,
  GlobalPopulationStateSnapshot,
} from '../engine/world/GlobalOutbreakSimulator';

type MediaTab = 'channels' | 'crisis' | 'field' | 'archive';

export interface GlobalMediaDashboardProps {
  isOpen: boolean;
  snapshot: GlobalMediaSnapshot | null;
  globalMetrics?: GlobalOutbreakMetrics | null;
  populationSnapshot?: GlobalPopulationStateSnapshot | null;
  onSelectChannel: (channelId: MediaChannelId) => void;
  onSelectRadioChannel: (channelId: MediaChannelId) => void;
  onToggleFacilityBackup: (facilityId: string, on: boolean) => void;
  onTriggerLiveIncident?: () => void;
  onClose: () => void;
}

const PHASE_LABELS: Record<MediaWorldPhase, { label: string; tone: string }> = {
  normal_world: { label: 'Phase 1 · Normal Civilian Broadcast', tone: 'text-emerald-400' },
  asteroid_approaching: { label: 'Phase 2 · Asteroid Tracking Advisory', tone: 'text-amber-300' },
  asteroid_impact: { label: 'Phase 3 · Emergency Impact Broadcast', tone: 'text-rose-400' },
  outbreak: { label: 'Phase 4 · Global Outbreak Emergency', tone: 'text-rose-300' },
  late_stage: { label: 'Phase 5 · Automated Carrier & Resilience', tone: 'text-amber-400' },
};

const INCIDENT_STEPS = [
  { id: 'standby', label: '00. Standby' },
  { id: 'normal_report', label: '01. Live Street Dispatch' },
  { id: 'camera_anomaly', label: '02. Camera Anomaly' },
  { id: 'signal_interference', label: '03. Signal Interference' },
  { id: 'studio_reconnect', label: '04. Studio Reconnect' },
  { id: 'outbreak_conversion', label: '05. Perimeter Breach' },
  { id: 'feed_lost', label: '06. Signal Lost' },
  { id: 'studio_emergency_bulletin', label: '07. Studio Bulletin' },
] as const;

export const GlobalMediaDashboard: React.FC<GlobalMediaDashboardProps> = ({
  isOpen,
  snapshot,
  globalMetrics,
  populationSnapshot,
  onSelectChannel,
  onSelectRadioChannel,
  onToggleFacilityBackup,
  onTriggerLiveIncident,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<MediaTab>('channels');
  const [historyFilter, setHistoryFilter] = useState<MediaChannelId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const activeChannel = useMemo(() => {
    if (!snapshot) return null;
    return (
      snapshot.channels.find((c) => c.definition.id === snapshot.activeChannelId) ??
      snapshot.channels[0] ??
      null
    );
  }, [snapshot]);

  const filteredReporters = useMemo(() => {
    if (!snapshot) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return snapshot.reporters;
    return snapshot.reporters.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.profession.toLowerCase().includes(q) ||
        r.locationLabel.toLowerCase().includes(q)
    );
  }, [snapshot, searchQuery]);

  const filteredHistory = useMemo(() => {
    if (!snapshot) return [];
    const q = searchQuery.trim().toLowerCase();
    return snapshot.broadcastHistory.filter((item) => {
      if (historyFilter !== 'all' && item.channelId !== historyFilter) return false;
      if (!q) return true;
      return (
        item.headline.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      );
    });
  }, [snapshot, historyFilter, searchQuery]);

  if (!isOpen) return null;

  const phaseInfo = snapshot ? PHASE_LABELS[snapshot.worldPhase] : PHASE_LABELS.normal_world;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4"
      role="dialog"
      aria-label="Global Media Network Center"
    >
      <div className="flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0b111c] text-slate-100 shadow-2xl">
        {/* Top Bar Contract: Breadcrumb / Title — Navigation Tabs — Close */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-[#0f172a] px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0">
              Global Media Network &amp; Broadcast Control
            </h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span className={phaseInfo.tone}>{phaseInfo.label}</span>
              <span aria-hidden="true">·</span>
              <span>Day {snapshot?.dayCount ?? 1} / {snapshot?.timeString ?? '08:00'}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-slate-300">Comms {snapshot?.commsHealthPct ?? 100}%</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
              {[
                { id: 'channels' as const, label: 'Live Channels', icon: Tv },
                { id: 'crisis' as const, label: 'Crisis & Asteroid', icon: Globe },
                { id: 'field' as const, label: 'Reporters & Fleet', icon: Truck },
                { id: 'archive' as const, label: 'Radio & Archive', icon: Radio },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer shrink-0"
              aria-label="Close Global Media Network"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {!snapshot ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-slate-400">
            Broadcast telemetry initializing. Enter the world to receive live Global Media Network signals.
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* TAB 1: LIVE CHANNELS (6 INTERCONNECTED NETWORKS) */}
            {activeTab === 'channels' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Network Lineup (6 Channels)</span>
                    <span className="font-mono tabular-nums">
                      TV: {activeChannel?.definition.channelBadge ?? 'CH 24'}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
                    {snapshot.channels.map((ch) => {
                      const isTvSelected = ch.definition.id === snapshot.activeChannelId;
                      const isRadioSelected = ch.definition.id === snapshot.activeRadioChannelId;
                      const isEmerg = ch.status === 'eas_override' || ch.priority === 'emergency';
                      return (
                        <div
                          key={ch.definition.id}
                          className={`p-3.5 transition-colors ${
                            isTvSelected ? 'bg-slate-800/80' : 'hover:bg-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectChannel(ch.definition.id)}
                              className="text-left flex-1 min-w-0 cursor-pointer"
                            >
                              <div className="text-sm font-semibold text-white truncate">
                                {ch.definition.name}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                                <span className="font-mono" style={{ color: ch.definition.accentHex }}>
                                  {ch.definition.channelBadge}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{ch.currentPresenter || ch.definition.leadPresenter}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={
                                    isEmerg
                                      ? 'text-rose-400 font-semibold'
                                      : ch.status === 'degraded'
                                        ? 'text-amber-300'
                                        : ch.status === 'automated_loop'
                                          ? 'text-amber-400'
                                          : 'text-emerald-400'
                                  }
                                >
                                  {ch.status.replace('_', ' ')}
                                </span>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => onSelectChannel(ch.definition.id)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                                  isTvSelected
                                    ? 'bg-sky-600 text-white'
                                    : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                                }`}
                              >
                                {isTvSelected ? 'On Screens' : 'Tune TV'}
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectRadioChannel(ch.definition.id)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                                  isRadioSelected
                                    ? 'bg-amber-600 text-white'
                                    : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                                }`}
                                title="Set active radio frequency"
                              >
                                {isRadioSelected ? 'Radio On' : 'Radio'}
                              </button>
                            </div>
                          </div>
                          <p className="mt-1.5 text-xs text-slate-300 line-clamp-1">{ch.headline}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Active Channel Broadcast Monitor & 24h Schedule */}
                <div className="lg:col-span-7 space-y-4">
                  {activeChannel && (() => {
                    const isActiveEmergency =
                      activeChannel.priority === 'emergency' || activeChannel.status === 'eas_override';
                    return (
                    <div className="rounded-xl border border-slate-800 bg-[#080d17] overflow-hidden">
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-slate-800"
                        style={{ backgroundColor: isActiveEmergency ? '#450a0a' : '#0c1f38' }}
                      >
                        <div className="text-sm font-bold text-white">
                          {activeChannel.definition.name} — {activeChannel.currentProgram}
                        </div>
                        <div className="text-xs font-mono text-slate-200 tabular-nums">
                          {isActiveEmergency ? 'EMERGENCY FEED' : 'LIVE TELEMETRY'} · {activeChannel.signalStrengthPct}% SIGNAL
                        </div>
                      </div>

                      <div className="p-5 space-y-4">
                        <div>
                          <div className="text-xs text-slate-400">
                            Host: {activeChannel.currentPresenter || activeChannel.definition.leadPresenter} ({activeChannel.definition.scope}) · Region: {activeChannel.regionTag}
                          </div>
                          <h3 className="mt-1.5 text-lg sm:text-xl font-bold text-white leading-snug">
                            {activeChannel.headline}
                          </h3>
                        </div>

                        <div className="space-y-2 border-t border-slate-800 pt-3">
                          {activeChannel.bodyLines.map((line, i) => (
                            <p key={i} className="text-sm text-slate-200 leading-relaxed">
                              {line}
                            </p>
                          ))}
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 text-xs font-mono text-amber-300">
                          TICKER: {activeChannel.ticker}
                        </div>

                        <div className="border-t border-slate-800 pt-4">
                          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                            <Clock className="h-3.5 w-3.5 text-sky-400" />
                            <span>Daily Programming Schedule</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs tabular-nums">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-400">
                                  <th className="py-1.5 pr-3 font-medium">Window</th>
                                  <th className="py-1.5 pr-3 font-medium">Program</th>
                                  <th className="py-1.5 font-medium">Focus</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/70">
                                {activeChannel.definition.schedule.map((slot) => {
                                  const isCurrent = slot.programTitle === activeChannel.currentProgram;
                                  return (
                                    <tr key={`${slot.startHour}-${slot.programTitle}`} className={isCurrent ? 'bg-sky-950/30 text-white' : 'text-slate-300'}>
                                      <td className="py-2 pr-3 font-mono whitespace-nowrap">
                                        {String(slot.startHour).padStart(2, '0')}:00–{String(slot.endHour).padStart(2, '0')}:00
                                      </td>
                                      <td className="py-2 pr-3 font-medium">{slot.programTitle}</td>
                                      <td className="py-2 text-slate-400">{slot.focus}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* TAB 2: CRISIS & ASTEROID SYNC */}
            {activeTab === 'crisis' && (
              <div className="space-y-5">
                {/* Real Simulation KPI Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                    <div className="text-xs text-slate-400">Healthy Population</div>
                    <div className="mt-1 text-lg font-bold font-mono text-emerald-400 tabular-nums">
                      {(populationSnapshot?.totalHealthy ?? globalMetrics?.totalHealthy ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                    <div className="text-xs text-slate-400">Infected Global Total</div>
                    <div className="mt-1 text-lg font-bold font-mono text-rose-400 tabular-nums">
                      {(populationSnapshot?.totalInfected ?? globalMetrics?.totalInfected ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                    <div className="text-xs text-slate-400">Grid Stability</div>
                    <div className="mt-1 text-lg font-bold font-mono text-amber-300 tabular-nums">
                      {Math.round((globalMetrics?.powerGridStability ?? 1) * 100)}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3.5">
                    <div className="text-xs text-slate-400">Network Comms Health</div>
                    <div className="mt-1 text-lg font-bold font-mono text-sky-400 tabular-nums">
                      {snapshot.commsHealthPct}%
                    </div>
                  </div>
                </div>

                {/* Live Reporter Incident Sequencer */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">Live Field Broadcast Event Monitor</h3>
                      <p className="text-xs text-slate-400">
                        Unit: {snapshot.liveIncidentReporterName} · Active Stage: {snapshot.liveIncidentStage.replace(/_/g, ' ')}
                      </p>
                    </div>
                    {onTriggerLiveIncident && snapshot.liveIncidentStage === 'standby' && (
                      <button
                        type="button"
                        onClick={onTriggerLiveIncident}
                        className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Dispatch Field Unit Live</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                    {INCIDENT_STEPS.map((st) => {
                      const active = snapshot.liveIncidentStage === st.id;
                      return (
                        <div
                          key={st.id}
                          className={`rounded-lg border px-2.5 py-2 text-xs ${
                            active
                              ? 'border-rose-500 bg-rose-950/50 text-white font-semibold'
                              : 'border-slate-800 bg-slate-950/60 text-slate-400'
                          }`}
                        >
                          {st.label}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 9-Stage Asteroid News Coverage Progression */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">Asteroid Coverage Progression (9 Stages)</h3>
                    <span className="text-xs font-mono text-sky-400 tabular-nums">
                      Stage {snapshot.asteroidStageIndex + 1} / {ASTEROID_MEDIA_STAGES.length}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden">
                    {ASTEROID_MEDIA_STAGES.map((st, idx) => {
                      const current = idx === snapshot.asteroidStageIndex;
                      const passed = idx < snapshot.asteroidStageIndex;
                      return (
                        <div
                          key={st.id}
                          className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs ${
                            current
                              ? 'bg-sky-950/50 text-white'
                              : passed
                                ? 'bg-slate-900/40 text-slate-300'
                                : 'bg-slate-950/40 text-slate-500'
                          }`}
                        >
                          <div>
                            <span className="font-mono text-slate-400 mr-2 tabular-nums">0{idx + 1}.</span>
                            <span className="font-semibold">{st.title}</span>
                            <span className="mx-2 text-slate-600" aria-hidden="true">/</span>
                            <span>{st.summary}</span>
                          </div>
                          <span className="font-mono text-[11px] whitespace-nowrap shrink-0">
                            {current ? 'Active Coverage' : passed ? 'Archived' : 'Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: REPORTERS (12), FLEET (7) & FACILITIES (7) */}
            {activeTab === 'field' && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative w-full sm:w-80">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter reporters or stations..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums">
                    {filteredReporters.length} Staff · {snapshot.vehicles.length} Media Vehicles · {snapshot.facilities.length} Facilities
                  </div>
                </div>

                {/* 12 Media Professionals Table */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-xs font-semibold text-white">
                    <Users className="h-4 w-4 text-sky-400" />
                    <span>Newsroom &amp; Field Personnel (12 Professions)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                        <tr>
                          <th className="px-4 py-2 font-medium">Reporter</th>
                          <th className="px-4 py-2 font-medium">Profession</th>
                          <th className="px-4 py-2 font-medium">Assignment</th>
                          <th className="px-4 py-2 font-medium">Equipment</th>
                          <th className="px-4 py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {filteredReporters.map((rep) => (
                          <tr key={rep.id} className="hover:bg-slate-800/40">
                            <td className="px-4 py-2.5 font-semibold text-white whitespace-nowrap">{rep.name}</td>
                            <td className="px-4 py-2.5 text-sky-300 whitespace-nowrap">{rep.profession}</td>
                            <td className="px-4 py-2.5 text-slate-300">{rep.locationLabel}</td>
                            <td className="px-4 py-2.5 text-slate-400">{rep.equipment}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span
                                className={
                                  rep.status === 'infected'
                                    ? 'text-rose-400 font-semibold'
                                    : rep.status === 'stunned' || rep.status === 'evacuated'
                                      ? 'text-amber-300'
                                      : 'text-emerald-400'
                                }
                              >
                                {rep.status.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 7 News Vehicles & 7 Media Facilities */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-xs font-semibold text-white">
                      <Truck className="h-4 w-4 text-amber-400" />
                      <span>Broadcast Vehicles ({snapshot.vehicles.length})</span>
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {snapshot.vehicles.length === 0 ? (
                        <div className="p-4 text-xs text-slate-400">
                          Fleet telemetry awaiting initial world frame update.
                        </div>
                      ) : (
                        snapshot.vehicles.map((v) => (
                          <div key={v.id} className="px-4 py-2.5 text-xs flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate">{v.name}</div>
                              <div className="text-slate-400 font-mono tabular-nums">
                                Crew: {v.crewNames.join(', ')} · Pos ({Math.round(v.position[0])}, {Math.round(v.position[2])})
                              </div>
                            </div>
                            <span className="font-mono text-emerald-400 whitespace-nowrap shrink-0">
                              {v.statusText}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-xs font-semibold text-white">
                      <Building2 className="h-4 w-4 text-cyan-400" />
                      <span>Media Facilities &amp; Backup Power ({snapshot.facilities.length})</span>
                    </div>
                    <div className="divide-y divide-slate-800/80">
                      {snapshot.facilities.map((fac) => (
                        <div key={fac.id} className="px-4 py-2.5 text-xs flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-semibold text-white truncate">{fac.name}</div>
                            <div className="text-slate-400 font-mono tabular-nums">
                              {fac.region} · Uplink {fac.uplinkStrength}% · Staff {fac.staffCount}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleFacilityBackup(fac.id, !fac.backupPowerOn)}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                              fac.backupPowerOn
                                ? 'bg-emerald-600 text-white'
                                : 'border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            <Power className="h-3 w-3" />
                            <span>{fac.backupPowerOn ? 'Backup On' : 'Start Backup'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: RADIO & BROADCAST ARCHIVE */}
            {activeTab === 'archive' && (
              <div className="space-y-6">
                {/* Automated EAS Recordings */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                  <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-xs font-semibold text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>Emergency Broadcast Recordings &amp; Automated Loops</span>
                  </div>
                  <div className="divide-y divide-slate-800/80">
                    {snapshot.emergencyRecordings.map((rec) => (
                      <div key={rec.id} className="p-4 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-amber-300">{rec.title}</span>
                          <span className="font-mono text-slate-400 tabular-nums">
                            Day {rec.recordedDay} · {rec.isAutomatedLoop ? 'Automated Carrier Loop' : 'Archived Bulletin'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed">{rec.transcript}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Broadcast History Log */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 px-4 py-2.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-white">
                      <Signal className="h-4 w-4 text-sky-400" />
                      <span>Historical Broadcast Records ({filteredHistory.length})</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setHistoryFilter('all')}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                          historyFilter === 'all' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        All
                      </button>
                      {snapshot.channels.map((c) => (
                        <button
                          key={c.definition.id}
                          type="button"
                          onClick={() => setHistoryFilter(c.definition.id)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer whitespace-nowrap ${
                            historyFilter === c.definition.id ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {c.definition.channelBadge}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-800/70 max-h-96 overflow-y-auto">
                    {filteredHistory.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No historical broadcasts logged yet for the active filter.
                      </div>
                    ) : (
                      filteredHistory.map((item) => (
                        <div key={item.id} className="px-4 py-3 space-y-1 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400 font-mono tabular-nums">
                            <span>
                              Day {item.day} · {item.timeString} · {item.channelId.replace(/_/g, ' ')}
                            </span>
                            <span className={item.priority === 'emergency' ? 'text-rose-400 font-semibold' : 'text-sky-300'}>
                              {item.priority}
                            </span>
                          </div>
                          <div className="font-semibold text-white">{item.headline}</div>
                          <p className="text-slate-300">{item.summary}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
};
