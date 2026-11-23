import React, { useState } from 'react';
import { X, User, Shield, Zap, Wrench, Heart, Plus, Award, Check } from 'lucide-react';
import { PlayerStats } from '../types/game';
import { TALENT_PERKS } from '../data/skillTree';
import { soundEngine } from '../utils/audio';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onUpgradeSkill: (skillKey: keyof PlayerStats['skills']) => void;
  onUnlockPerk?: (perkId: string, cost: number) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  stats,
  onUpgradeSkill,
  onUnlockPerk,
}) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'perks' | 'records'>('skills');

  if (!isOpen) return null;

  const unlockedPerks = stats.perkUnlocks || [];
  const killStats = stats.killStats || { total: 0, headshots: 0, bosses: 0, stealth: 0 };

  const skillList: {
    key: keyof PlayerStats['skills'];
    name: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'strength',
      name: 'Physical Might',
      description: 'Increases melee damage against infected and chopping speed on trees and boulders.',
      icon: <Zap className="h-5 w-5 text-amber-400" />,
    },
    {
      key: 'endurance',
      name: 'Hardened Vitality',
      description: 'Increases maximum stamina pool and sprint recovery efficiency.',
      icon: <Heart className="h-5 w-5 text-rose-500" />,
    },
    {
      key: 'engineering',
      name: 'Architectural Engineering',
      description: 'Fortifies constructed barricades and walls with +25% structural durability bonus.',
      icon: <Wrench className="h-5 w-5 text-sky-400" />,
    },
    {
      key: 'survival',
      name: 'Wilderness Survival',
      description: 'Reduces passive hunger and dehydration depletion rates by 15% per rank.',
      icon: <Shield className="h-5 w-5 text-emerald-400" />,
    },
  ];

  const branchTitles: { id: 'combatant' | 'engineer' | 'pathfinder'; label: string }[] = [
    { id: 'combatant', label: 'Combatant Branch' },
    { id: 'engineer', label: 'Engineer Branch' },
    { id: 'pathfinder', label: 'Pathfinder Branch' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="flex h-[82vh] w-full max-w-3xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Survivor Progression &amp; Talent Tree</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Level & Points Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/60 px-6 py-3.5">
          <div>
            <div className="text-lg font-bold text-neutral-100">
              Level {stats.level} Survivor
              {(stats.rebirthCount || 0) > 0 ? ` · Rebirth Cycle ${stats.rebirthCount}` : ''}
            </div>
            <div className="text-xs text-neutral-400 font-mono tabular-nums mt-0.5">
              XP {stats.xp} / {stats.xpToNextLevel} · Armor: {stats.equippedArmorId ? stats.equippedArmorId.replace(/_/g, ' ') : 'None'} · Mask: {stats.equippedMaskId ? 'CBRN Respirator' : 'None'}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 border border-amber-500/40">
            <span className="text-xs font-semibold text-amber-300">Skill Points:</span>
            <span className="text-base font-bold font-mono tabular-nums text-amber-400">{stats.skillPoints}</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/30 px-6 py-2">
          <button
            type="button"
            onClick={() => setActiveTab('skills')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === 'skills' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            Core Attributes
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('perks')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === 'perks' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            Perk Talent Tree
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('records')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap ${
              activeTab === 'records' ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-300 hover:bg-neutral-800'
            }`}
          >
            Career Records
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'skills' && (
            <div className="flex flex-col gap-3.5">
              {skillList.map((skill) => {
                const currentLevel = stats.skills[skill.key];
                const canUpgrade = stats.skillPoints > 0;
                return (
                  <div
                    key={skill.key}
                    className="flex items-center justify-between gap-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-neutral-800 p-2.5 mt-0.5">{skill.icon}</div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-neutral-100">{skill.name}</h4>
                          <span className="font-mono text-xs text-neutral-400 tabular-nums">
                            · Rank {currentLevel}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-neutral-400 max-w-md leading-relaxed">
                          {skill.description}
                        </p>
                      </div>
                    </div>

                    <button
                      disabled={!canUpgrade}
                      onClick={() => {
                        onUpgradeSkill(skill.key);
                        soundEngine.playBuildSnap();
                      }}
                      className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap shrink-0 ${
                        canUpgrade
                          ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer'
                          : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                      }`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Upgrade</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'perks' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {branchTitles.map((branch) => {
                const perks = TALENT_PERKS.filter((p) => p.branch === branch.id);
                return (
                  <div key={branch.id} className="flex flex-col gap-3 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {branch.label}
                    </h3>
                    {perks.map((perk) => {
                      const isUnlocked = unlockedPerks.includes(perk.id);
                      const prereqMet = !perk.requiresId || unlockedPerks.includes(perk.requiresId);
                      const canUnlock = !isUnlocked && prereqMet && stats.skillPoints >= perk.cost && Boolean(onUnlockPerk);
                      return (
                        <div
                          key={perk.id}
                          className={`rounded-xl border p-3 ${
                            isUnlocked
                              ? 'border-emerald-700/60 bg-emerald-950/30'
                              : 'border-neutral-800 bg-neutral-950/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-neutral-100">{perk.name}</span>
                            <span className="text-[11px] font-mono text-amber-300 tabular-nums">
                              {perk.cost} SP
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-neutral-400 leading-relaxed">
                            {perk.description}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono text-neutral-300">{perk.bonusSummary}</span>
                            {isUnlocked ? (
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <Check className="h-3.5 w-3.5" />
                                <span>Unlocked</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                disabled={!canUnlock}
                                onClick={() => onUnlockPerk?.(perk.id, perk.cost)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${
                                  canUnlock
                                    ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer'
                                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                                }`}
                              >
                                {prereqMet ? 'Unlock' : 'Locked'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'records' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono tabular-nums">
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="text-[11px] text-neutral-400">Infected Eliminated</div>
                <div className="mt-1 text-2xl font-bold text-neutral-100">{killStats.total}</div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="text-[11px] text-neutral-400">Precision Headshots</div>
                <div className="mt-1 text-2xl font-bold text-amber-400">{killStats.headshots}</div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="text-[11px] text-neutral-400">Stealth Ambush Kills</div>
                <div className="mt-1 text-2xl font-bold text-sky-400">{killStats.stealth}</div>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
                <div className="text-[11px] text-neutral-400">Alpha Bosses Purged</div>
                <div className="mt-1 text-2xl font-bold text-rose-400">{killStats.bosses}</div>
              </div>
              <div className="col-span-2 sm:col-span-4 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 flex items-center gap-3 font-sans">
                <Award className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="text-xs text-neutral-300">
                  Radiation Exposure: <strong className="font-mono text-lime-300">{Math.round(stats.radiationExposure ?? 0)}%</strong> · Viral Infection: <strong className="font-mono text-rose-300">{Math.round(stats.infection ?? 0)}%</strong> · Rebirth Cycles Completed: <strong className="font-mono text-amber-300">{stats.rebirthCount ?? 0}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
