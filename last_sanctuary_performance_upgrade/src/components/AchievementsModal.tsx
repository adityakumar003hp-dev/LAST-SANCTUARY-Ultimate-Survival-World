import React, { useMemo, useState } from 'react';
import { Award, CheckCircle2, Lock, X } from 'lucide-react';
import { ACHIEVEMENTS, CareerStats } from '../data/achievements';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerStats: CareerStats;
  liveSummary?: {
    dayCount: number;
    level: number;
    structuresCount: number;
    hordesDefeated: number;
    rescuedCount: number;
    discoveredChunksCount: number;
  } | null;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  careerStats,
  liveSummary,
}) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const evaluated = useMemo(() => {
    return ACHIEVEMENTS.map((ach) => {
      const current = careerStats[ach.metric] || 0;
      const unlocked = current >= ach.target;
      const pct = Math.min(100, Math.round((current / ach.target) * 100));
      return { ...ach, current, unlocked, pct };
    });
  }, [careerStats]);

  if (!isOpen) return null;

  const unlockedCount = evaluated.filter((a) => a.unlocked).length;
  const filtered = evaluated.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-neutral-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <Award className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">
                Achievements &amp; Survival Summary
              </h3>
              <p className="text-xs text-neutral-400 tabular-nums">
                {unlockedCount} of {ACHIEVEMENTS.length} milestones unlocked
                <span aria-hidden="true"> · </span>
                Highest Day {careerStats.highestDay}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Survival Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <div className="text-[11px] text-neutral-400">
                {liveSummary ? 'Current Day / Best' : 'Highest Day'}
              </div>
              <div className="mt-1 text-lg font-bold text-amber-400 tabular-nums">
                {liveSummary
                  ? `Day ${liveSummary.dayCount} / ${careerStats.highestDay}`
                  : `Day ${careerStats.highestDay}`}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <div className="text-[11px] text-neutral-400">Zombies Neutralized</div>
              <div className="mt-1 text-lg font-bold text-neutral-100 tabular-nums">
                {careerStats.zombiesDefeated}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <div className="text-[11px] text-neutral-400">Structures Built</div>
              <div className="mt-1 text-lg font-bold text-neutral-100 tabular-nums">
                {liveSummary
                  ? `${liveSummary.structuresCount} (${careerStats.structuresBuilt} total)`
                  : careerStats.structuresBuilt}
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
              <div className="text-[11px] text-neutral-400">
                {liveSummary ? 'Sectors Explored' : 'Survivors Rescued'}
              </div>
              <div className="mt-1 text-lg font-bold text-emerald-400 tabular-nums">
                {liveSummary
                  ? `${liveSummary.discoveredChunksCount} chunks`
                  : careerStats.survivorsRescued}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
              {(
                [
                  { id: 'all', label: `All (${evaluated.length})` },
                  { id: 'unlocked', label: `Unlocked (${unlockedCount})` },
                  { id: 'locked', label: `In Progress (${evaluated.length - unlockedCount})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    filter === tab.id
                      ? 'bg-amber-500 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-neutral-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <span className="text-xs text-neutral-400 tabular-nums">
              Level {liveSummary?.level ?? careerStats.highestLevel} · {careerStats.speciesLogged} Species Logged
            </span>
          </div>

          {/* Achievements List */}
          <div className="space-y-2.5">
            {filtered.length > 0 ? (
              filtered.map((ach) => (
                <div
                  key={ach.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    ach.unlocked
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-neutral-800 bg-neutral-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      {ach.unlocked ? (
                        <CheckCircle2 className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      ) : (
                        <Lock className="h-4 w-4 text-neutral-500 mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-neutral-100">
                          {ach.title}
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                          {ach.description}
                        </p>
                        <div className="mt-1.5 text-[11px] text-neutral-400 capitalize">
                          {ach.category}
                          <span aria-hidden="true"> · </span>
                          <span className={ach.unlocked ? 'text-amber-300 font-semibold' : 'text-neutral-500'}>
                            {ach.rewardLabel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono text-xs tabular-nums">
                      <span className={ach.unlocked ? 'text-amber-400 font-bold' : 'text-neutral-300'}>
                        {Math.min(ach.current, ach.target)} / {ach.target}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-800">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ach.unlocked ? 'bg-amber-400' : 'bg-neutral-500'
                      }`}
                      style={{ width: `${ach.pct}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 py-10 text-center text-xs text-neutral-500">
                No achievements match this filter yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
