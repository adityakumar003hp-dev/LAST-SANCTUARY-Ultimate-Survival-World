import React from 'react';
import { X, FileText, Home, Bed, Archive, Hammer, Droplets, Sprout, ShieldAlert, CheckCircle2, Radio } from 'lucide-react';
import { RadiantBounty, WeatherType } from '../types/game';
import { generateProceduralRadioBroadcast } from '../data/bounties';
import { soundEngine } from '../utils/audio';

interface NoticeBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  bounties?: RadiantBounty[];
  onClaimBounty?: (bountyId: string) => void;
  dayCount?: number;
  biomeName?: string;
  weather?: WeatherType;
}

export const NoticeBoardModal: React.FC<NoticeBoardModalProps> = ({
  isOpen,
  onClose,
  bounties = [],
  onClaimBounty,
  dayCount = 1,
  biomeName = 'Sanctuary Valley',
  weather = 'clear',
}) => {
  if (!isOpen) return null;

  const transmission = generateProceduralRadioBroadcast({
    dayCount,
    biomeName,
    weather,
    isNight: false,
    isBloodMoon: dayCount % 3 === 0,
    hasActiveSupplyDrop: false,
    activeBossNearby: false,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="flex h-[84vh] w-full max-w-3xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">
              Sanctuary Outpost 7 — Bounties &amp; Facility Directives
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Active Radiant Bounties */}
          {bounties.length > 0 && (
            <div>
              <h3 className="text-xs uppercase font-bold text-amber-400 tracking-wider mb-3">
                Daily Outpost Bounty Contracts
              </h3>
              <div className="flex flex-col gap-2.5">
                {bounties.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3.5"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-sm font-bold text-neutral-100">
                        <span>{b.title}</span>
                        <span className="text-xs font-mono font-normal text-neutral-400 tabular-nums">
                          · {b.current}/{b.target} · +{b.rewardXp} XP
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5">{b.description}</p>
                    </div>
                    {b.claimed ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 whitespace-nowrap shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Claimed</span>
                      </span>
                    ) : b.completed && onClaimBounty ? (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playDawnVictoryChime();
                          onClaimBounty(b.id);
                        }}
                        className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-neutral-950 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Claim Reward
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-neutral-400 whitespace-nowrap shrink-0">
                        In Progress
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Radio Dispatch Summary */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-100/90 leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-amber-400 mb-1">
              <Radio className="h-4 w-4" />
              <span>{transmission.frequency} · {transmission.callsign}</span>
            </div>
            <p>{transmission.message}</p>
          </div>

          {/* Base Facilities Grid */}
          <div>
            <h3 className="text-xs uppercase font-bold text-neutral-400 tracking-wider mb-3">
              Base Facilities &amp; Operations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Home className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Ranger Cabin</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Solid timber shelter providing thermal insulation against blizzards and toxic fog.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Bed className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Survivor Bed (Rest Point)</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Rest until 06:00 Dawn to restore health, stamina, advance farm crops, and refresh daily bounties.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Archive className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Indoor Storage Stash</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    16-slot lockable chest keeping rations, electronics, and spare ammo safe.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Hammer className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Artisan &amp; Salvage Benches</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Craft crossbows, electric fences, gas masks, weapon attachments, or dismantle spare gear.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Sprout className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Cultivated Farm Plot</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Plant survival seed packets and harvest mature berry yields every morning.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-3.5">
                <Droplets className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-neutral-100">Rainwater Cistern</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                    Collects clean drinking water faster during rainfall and storms.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Defense Directives */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">
              <ShieldAlert className="h-4 w-4" />
              <span>Endgame &amp; Defense Protocol</span>
            </div>
            <ul className="text-xs text-neutral-300 space-y-1.5 list-disc list-inside">
              <li>Deploy Sentry Turrets, High-Voltage Shock Fences, and Landmine Traps along outer walls.</li>
              <li>Hunt Alpha Mutants for Bio-Cores to construct and activate the Rebirth Evacuation Beacon.</li>
              <li>Carry a CBRN Respirator Mask when Toxic Fog rolls over the valley.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 bg-neutral-950 px-6 py-3.5 text-xs text-neutral-400 flex items-center justify-between">
          <span>Sanctuary Outpost 7 is marked on your World Map.</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-amber-500 hover:bg-amber-400 px-4 py-1.5 text-xs font-bold uppercase text-neutral-950 cursor-pointer whitespace-nowrap"
          >
            Acknowledge &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
};
