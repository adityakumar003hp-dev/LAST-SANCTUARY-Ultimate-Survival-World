import React from 'react';
import { X, User, Shield, Zap, Wrench, Heart, Plus } from 'lucide-react';
import { PlayerStats } from '../types/game';
import { soundEngine } from '../utils/audio';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: PlayerStats;
  onUpgradeSkill: (skillKey: keyof PlayerStats['skills']) => void;
}

export const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  stats,
  onUpgradeSkill,
}) => {
  if (!isOpen) return null;

  const skillList: {
    key: keyof PlayerStats['skills'];
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      key: 'strength',
      name: 'Physical Might',
      description: 'Increases melee damage against infected and chopping speed on trees and boulders.',
      icon: <Zap className="h-5 w-5 text-amber-400" />,
      color: 'text-amber-400',
    },
    {
      key: 'endurance',
      name: 'Hardened Vitality',
      description: 'Increases maximum stamina pool and sprint recovery efficiency.',
      icon: <Heart className="h-5 w-5 text-rose-500" />,
      color: 'text-rose-500',
    },
    {
      key: 'engineering',
      name: 'Architectural Engineering',
      description: 'Fortifies constructed barricades and walls with +25% structural durability bonus.',
      icon: <Wrench className="h-5 w-5 text-sky-400" />,
      color: 'text-sky-400',
    },
    {
      key: 'survival',
      name: 'Wilderness Survival',
      description: 'Reduces passive hunger and dehydration depletion rates by 15% per rank.',
      icon: <Shield className="h-5 w-5 text-emerald-400" />,
      color: 'text-emerald-400',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="flex h-[80vh] w-full max-w-2xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Survivor Progression & Skills</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Level & Points Banner */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/60 px-6 py-4">
          <div>
            <div className="text-xl font-bold text-neutral-100">Level {stats.level} Survivor</div>
            <div className="text-xs text-neutral-400 font-mono mt-0.5">
              XP Progress: {stats.xp} / {stats.xpToNextLevel}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-2 border border-amber-500/40">
            <span className="text-xs font-semibold text-amber-300">Available Skill Points:</span>
            <span className="text-base font-bold font-mono text-amber-400">{stats.skillPoints}</span>
          </div>
        </div>

        {/* Skills List */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {skillList.map((skill) => {
            const currentLevel = stats.skills[skill.key];
            const canUpgrade = stats.skillPoints > 0;

            return (
              <div
                key={skill.key}
                className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 transition-all hover:bg-neutral-900/80"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-neutral-800 p-2.5 mt-0.5">{skill.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-neutral-100">{skill.name}</h4>
                      <span className="font-mono text-xs font-bold text-neutral-400 rounded bg-neutral-800 px-2 py-0.5">
                        Rank {currentLevel}
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
                  className={`flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                    canUpgrade
                      ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md'
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
      </div>
    </div>
  );
};
