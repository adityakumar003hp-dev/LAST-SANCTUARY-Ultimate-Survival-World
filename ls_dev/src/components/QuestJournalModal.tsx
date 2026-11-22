import React from 'react';
import { X, BookOpen, CheckCircle2, Circle, Award } from 'lucide-react';
import { Quest } from '../types/game';

interface QuestJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
}

export const QuestJournalModal: React.FC<QuestJournalModalProps> = ({
  isOpen,
  onClose,
  quests,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex h-[82vh] w-full max-w-3xl flex-col rounded-2xl bg-neutral-950/95 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-bold tracking-wide">Survivor Chronicle & Mission Log</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quests Container */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {quests.map((quest) => (
            <div
              key={quest.id}
              className={`rounded-2xl border p-5 transition-all ${
                quest.completed
                  ? 'border-emerald-800/40 bg-emerald-950/20'
                  : 'border-neutral-800 bg-neutral-900/50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 block mb-1">
                    Chapter {quest.chapter} Mission
                  </span>
                  <h3 className="text-base font-bold text-neutral-100">{quest.title}</h3>
                  <p className="mt-1 text-xs text-neutral-300 leading-relaxed max-w-xl">
                    {quest.description}
                  </p>
                </div>
                {quest.completed && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-950 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-800/60">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Completed</span>
                  </span>
                )}
              </div>

              {/* Objectives */}
              <div className="mt-4 pt-4 border-t border-neutral-800/80 flex flex-col gap-2.5">
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Directives
                </span>
                {quest.objectives.map((obj) => (
                  <div key={obj.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {obj.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="h-4 w-4 text-neutral-600 shrink-0" />
                      )}
                      <span className={obj.completed ? 'text-neutral-400 line-through' : 'text-neutral-200'}>
                        {obj.description}
                      </span>
                    </div>
                    <span className="font-mono text-neutral-400 font-bold">
                      {obj.current} / {obj.target}
                    </span>
                  </div>
                ))}
              </div>

              {/* Rewards */}
              <div className="mt-4 pt-3 border-t border-neutral-800/60 flex items-center gap-2 text-xs text-amber-300">
                <Award className="h-4 w-4 text-amber-400" />
                <span className="font-semibold">Rewards:</span>
                <span className="font-mono text-neutral-300">+{quest.rewards.xp} XP</span>
                {quest.rewards.items && (
                  <span className="text-neutral-400 font-mono">
                    • {quest.rewards.items.length} Supply Bundles
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
