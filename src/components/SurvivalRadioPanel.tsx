import React, { useMemo, useState } from 'react';
import { Radio, RefreshCw, X, CheckCircle2, ArrowRight, Tv } from 'lucide-react';
import { RadiantBounty, WeatherType } from '../types/game';
import { generateProceduralRadioBroadcast } from '../data/bounties';
import { soundEngine } from '../utils/audio';
import type { GlobalMediaSnapshot, MediaChannelId } from '../engine/media/MediaTypes';

interface SurvivalRadioPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dayCount: number;
  biomeName: string;
  weather: WeatherType;
  isNight: boolean;
  hasActiveSupplyDrop: boolean;
  activeBossNearby: boolean;
  bounties: RadiantBounty[];
  onClaimBounty: (bountyId: string) => void;
  mediaSnapshot?: GlobalMediaSnapshot | null;
  onSelectRadioChannel?: (channelId: MediaChannelId) => void;
  onOpenMediaNetwork?: () => void;
}

export const SurvivalRadioPanel: React.FC<SurvivalRadioPanelProps> = ({
  isOpen,
  onClose,
  dayCount,
  biomeName,
  weather,
  isNight,
  hasActiveSupplyDrop,
  activeBossNearby,
  bounties,
  onClaimBounty,
  mediaSnapshot,
  onSelectRadioChannel,
  onOpenMediaNetwork,
}) => {
  const [tuneOffset, setTuneOffset] = useState(0);

  const liveMediaRadio = useMemo(() => {
    if (!mediaSnapshot) return null;
    return (
      mediaSnapshot.channels.find((c) => c.definition.id === mediaSnapshot.activeRadioChannelId) ??
      mediaSnapshot.channels.find((c) => c.definition.id === 'oakridge_radio') ??
      null
    );
  }, [mediaSnapshot]);

  const broadcast = useMemo(() => {
    return generateProceduralRadioBroadcast({
      dayCount: dayCount + tuneOffset,
      biomeName,
      weather,
      isNight: isNight && tuneOffset % 2 === 0,
      isBloodMoon: isNight && dayCount % 3 === 0 && tuneOffset === 0,
      hasActiveSupplyDrop: hasActiveSupplyDrop && tuneOffset === 0,
      activeBossNearby: activeBossNearby && tuneOffset === 0,
    });
  }, [dayCount, tuneOffset, biomeName, weather, isNight, hasActiveSupplyDrop, activeBossNearby]);

  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto fixed bottom-28 right-3 sm:right-4 z-40 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-neutral-800 bg-neutral-950/92 p-4 text-neutral-100 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="h-4 w-4 text-amber-400 shrink-0" />
          <h3 className="text-sm font-bold tracking-wide truncate">Emergency Ham Radio</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
          aria-label="Close radio panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Live Global Media Radio Feed (Oakridge Radio 94.7 FM / Civil Defense) */}
      {liveMediaRadio && (
        <div className="mt-2.5 rounded-xl border border-sky-900/60 bg-sky-950/30 p-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-sky-300">
            <span>{liveMediaRadio.definition.name} · 94.7 FM</span>
            <span>Comms {mediaSnapshot?.commsHealthPct ?? 100}%</span>
          </div>
          <div className="text-xs font-semibold text-white">{liveMediaRadio.headline}</div>
          {liveMediaRadio.bodyLines[0] && (
            <p className="text-[11px] text-neutral-300 leading-snug">{liveMediaRadio.bodyLines[0]}</p>
          )}
          <div className="flex items-center justify-between gap-2 pt-1">
            {onSelectRadioChannel && mediaSnapshot && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playRadioBroadcastBeep();
                  const idx = mediaSnapshot.channels.findIndex(
                    (c) => c.definition.id === mediaSnapshot.activeRadioChannelId
                  );
                  const next = mediaSnapshot.channels[(idx + 1) % mediaSnapshot.channels.length];
                  if (next) onSelectRadioChannel(next.definition.id);
                }}
                className="rounded border border-sky-700/70 bg-sky-900/40 px-2 py-0.5 text-[10px] font-semibold text-sky-200 hover:bg-sky-800/60 cursor-pointer"
              >
                Next Station
              </button>
            )}
            {onOpenMediaNetwork && (
              <button
                type="button"
                onClick={onOpenMediaNetwork}
                className="flex items-center gap-1 rounded border border-neutral-700 bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold text-neutral-200 hover:bg-neutral-800 cursor-pointer"
              >
                <Tv className="h-3 w-3 text-sky-400" />
                <span>Media Hub</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Telemetry metadata line (no pills) */}
      <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono text-neutral-400 tabular-nums">
        <span>
          <strong className="text-amber-400">{broadcast.frequency}</strong> · {broadcast.callsign}
        </span>
        <span className="text-neutral-300">{broadcast.channel}</span>
      </div>

      <p className="mt-2 rounded-xl border border-neutral-800/90 bg-neutral-900/60 p-3 text-xs leading-relaxed text-neutral-200">
        {broadcast.message}
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => {
            soundEngine.playRadioBroadcastBeep();
            setTuneOffset((prev) => prev + 1);
          }}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 cursor-pointer whitespace-nowrap shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
          <span>Scan Band</span>
        </button>
        <span className="text-[11px] font-mono text-neutral-500 tabular-nums">
          Day {dayCount}
        </span>
      </div>

      {/* Active Bounties Ticker */}
      <div className="mt-3.5 border-t border-neutral-800 pt-3">
        <div className="flex items-center justify-between text-xs font-semibold text-neutral-300 mb-2">
          <span>Active Outpost Bounties</span>
          <span className="font-mono text-[11px] text-neutral-400 tabular-nums">
            {bounties.filter((b) => b.claimed).length}/{bounties.length} claimed
          </span>
        </div>

        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-0.5">
          {bounties.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800/80 bg-neutral-900/50 px-3 py-2 text-xs"
            >
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-neutral-100 truncate">{b.title}</div>
                <div className="text-[11px] font-mono text-neutral-400 tabular-nums">
                  {b.current}/{b.target} · +{b.rewardXp} XP
                </div>
              </div>
              {b.claimed ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 whitespace-nowrap shrink-0">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Claimed</span>
                </span>
              ) : b.completed ? (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playDawnVictoryChime();
                    onClaimBounty(b.id);
                  }}
                  className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-bold text-neutral-950 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <span>Claim</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              ) : (
                <span className="text-[11px] font-mono text-neutral-500 whitespace-nowrap shrink-0">
                  Active
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
