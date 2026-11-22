import React, { useState } from 'react';
import { X, BookOpen, CheckCircle2, Circle, Award, Calendar, Compass, Train, MapPin, Check } from 'lucide-react';
import { Quest } from '../types/game';
import { LAST_SANCTUARY_CAMPAIGN, CAMPAIGN_TITLE, CAMPAIGN_DAY_COUNT, CampaignEvent } from '../data/lastSanctuaryCampaign';
import { RESEARCH_STORY_UNLOCKS, RESEARCH_FACILITY_INDEX } from '../data/researchComplex';
import type { ResearchStoryUnlock, ResearchFacilityDefinition } from '../data/researchComplex';

interface QuestJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  quests: Quest[];
  currentDay?: number;
  prologuePhase?: string | null;
}

export const QuestJournalModal: React.FC<QuestJournalModalProps> = ({
  isOpen,
  onClose,
  quests,
  currentDay = 1,
  prologuePhase,
}) => {
  const [activeTab, setActiveTab] = useState<'directives' | 'campaign'>('directives');
  const [selectedDay, setSelectedDay] = useState<number>(Math.max(1, Math.min(10, currentDay)));

  if (!isOpen) return null;

  // Filter the 10-day campaign missions for the selected day
  const dayEvents = LAST_SANCTUARY_CAMPAIGN.filter((e) => e.day === selectedDay);
  const currentDayTitle = dayEvents[0]?.dayTitle || `DAY ${selectedDay}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4">
      <div className="flex h-[88vh] w-full max-w-4xl flex-col rounded-2xl bg-neutral-950/98 border border-neutral-800 shadow-2xl text-neutral-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/15 p-2 text-amber-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-amber-400">
                Operations Chronicle • Day {currentDay}
              </p>
              <h2 className="text-base sm:text-lg font-bold tracking-wide">Survivor Chronicle & Mission Log</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-xl bg-neutral-900 border border-neutral-800 p-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('directives')}
                className={`rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  activeTab === 'directives'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Directives ({quests.length})
              </button>
              <button
                onClick={() => setActiveTab('campaign')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all cursor-pointer ${
                  activeTab === 'campaign'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>10-Day Campaign (70)</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white cursor-pointer"
              aria-label="Close chronicle"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        {activeTab === 'directives' ? (
          /* Quests Container */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col gap-5">
            {quests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 text-neutral-500">
                <Compass className="h-10 w-10 mb-3 opacity-40 text-amber-500" />
                <p className="text-sm font-semibold">No active field directives at this time.</p>
                <p className="text-xs text-neutral-500 mt-1">Check the 10-Day Campaign tab or explore the world to receive new orders.</p>
              </div>
            ) : (
              quests.map((quest) => (
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
              ))
            )}
          </div>
        ) : (
          /* 10-Day Campaign Container */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Day Selector Ribbon */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-800/80 bg-neutral-900/40 overflow-x-auto">
              <span className="text-[11px] font-mono text-neutral-400 uppercase font-semibold mr-1 shrink-0">
                Campaign Timeline:
              </span>
              {Array.from({ length: CAMPAIGN_DAY_COUNT }, (_, i) => i + 1).map((day) => {
                const isSelected = selectedDay === day;
                const isPast = day < currentDay;
                const isCurrent = day === currentDay;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-md shadow-amber-500/10'
                        : isCurrent
                        ? 'bg-amber-950/60 text-amber-300 border border-amber-600/50 hover:bg-amber-900/60'
                        : isPast
                        ? 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                        : 'bg-neutral-950 text-neutral-500 border border-neutral-900 hover:text-neutral-300'
                    }`}
                  >
                    <span>Day {day}</span>
                    {isPast && <Check className="h-3 w-3 text-emerald-400" />}
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Banner */}
            <div className="flex items-center justify-between px-5 py-3 bg-neutral-900/60 border-b border-neutral-800/60">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                  {CAMPAIGN_TITLE} • Day {selectedDay} of 10
                </span>
                <h3 className="text-sm sm:text-base font-bold text-neutral-100">{currentDayTitle}</h3>
              </div>
              <span className="text-xs font-mono text-neutral-400">
                7 Missions ({selectedDay * 7 - 6}–{selectedDay * 7} of 70)
              </span>
            </div>

            {/* Events Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid gap-4">
              {(() => {
                const campaignQuest = quests.find((q) => q.id.startsWith('ls_campaign_m'));
                const activeMissionNumber = campaignQuest
                  ? parseInt(campaignQuest.id.replace('ls_campaign_m', '')) || (currentDay * 7 - 6)
                  : currentDay * 7 - 6;

                return dayEvents.map((evt) => {
                  const isMissionDone = evt.mission < activeMissionNumber || (evt.mission === activeMissionNumber && campaignQuest?.completed);
                  const isMissionActive = evt.mission === activeMissionNumber && !campaignQuest?.completed;
                  const researchUnlock = RESEARCH_STORY_UNLOCKS.find((entry: ResearchStoryUnlock) => entry.mission === evt.mission);
                  const researchFacility = researchUnlock ? RESEARCH_FACILITY_INDEX.find((facility: ResearchFacilityDefinition) => facility.id === researchUnlock.facilityId) : undefined;

                  // Use live objectives from quest if this is the active mission
                  const displayObjectives = isMissionActive && campaignQuest
                    ? campaignQuest.objectives.map((o) => ({ desc: o.description, done: o.completed, current: o.current, target: o.target }))
                    : evt.objectives.map((desc) => ({ desc, done: isMissionDone, current: isMissionDone ? 1 : 0, target: 1 }));

                  return (
                    <div
                      key={evt.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isMissionDone
                          ? 'border-emerald-800/30 bg-emerald-950/15'
                          : isMissionActive
                          ? 'border-amber-500/70 bg-neutral-900/90 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/30'
                          : 'border-neutral-800/80 bg-neutral-950/60 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                            isMissionActive
                              ? 'text-neutral-950 bg-amber-400 border-amber-300 font-extrabold'
                              : 'text-amber-400 bg-amber-950/60 border-amber-800/40'
                          }`}>
                            M{evt.mission.toString().padStart(2, '0')}
                          </span>
                          <h4 className="text-sm font-bold text-neutral-100">{evt.title}</h4>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          {/* Location Tag */}
                          <span className="flex items-center gap-1 rounded bg-neutral-800/80 border border-neutral-700/60 px-2 py-0.5 text-neutral-300">
                            <MapPin className="h-3 w-3 text-cyan-400" />
                            <span className="capitalize">{evt.location.replace(/_/g, ' ')}</span>
                          </span>

                          {/* Railway Tag if present */}
                          {evt.railwayControl && (
                            <span className="flex items-center gap-1 rounded bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 text-sky-300 font-mono">
                              <Train className="h-3 w-3 text-sky-400" />
                              <span>{evt.railwayControl} • Passenger</span>
                            </span>
                          )}

                          {/* Status Badge */}
                          {isMissionDone ? (
                            <span className="flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-700/60 px-2 py-0.5 text-emerald-400 font-bold">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Completed</span>
                            </span>
                          ) : isMissionActive ? (
                            <span className="flex items-center gap-1 rounded bg-amber-950/90 border border-amber-500/80 px-2.5 py-0.5 text-amber-300 font-bold">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                              <span>Active Checkpoint</span>
                            </span>
                          ) : (
                            <span className="rounded bg-neutral-900 border border-neutral-800 px-2 py-0.5 text-neutral-500">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-neutral-300 leading-relaxed">{evt.summary}</p>
                      {researchFacility && researchUnlock && (
                        <div className="mt-3 rounded-lg border border-cyan-900/60 bg-cyan-950/20 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300">Research Facility • {researchFacility.classification}</span>
                            <span className="text-[10px] font-mono text-cyan-500">DAY 8 INTEL</span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-cyan-100">{researchFacility.name}</p>
                          <p className="mt-1 text-[11px] text-neutral-300">{researchFacility.purpose}</p>
                          <p className="mt-2 text-[11px] text-amber-200">Classified discovery: {researchUnlock.clue}</p>
                        </div>
                      )}

                      {/* Objectives List */}
                      <div className="mt-3 pt-3 border-t border-neutral-800/60 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                            Directives:
                          </span>
                          {isMissionActive && (
                            <span className="text-[10px] font-mono text-amber-400">
                              {displayObjectives.filter((o) => o.done).length} / {displayObjectives.length} Completed
                            </span>
                          )}
                        </div>
                        {displayObjectives.map((obj, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 text-xs text-neutral-300">
                            <div className="flex items-center gap-2">
                              {obj.done ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              ) : (
                                <Circle className="h-3.5 w-3.5 text-neutral-600 shrink-0" />
                              )}
                              <span className={obj.done ? 'text-neutral-400 line-through' : 'text-neutral-200'}>
                                {obj.desc}
                              </span>
                            </div>
                            {isMissionActive && obj.target > 1 && (
                              <span className="text-[11px] font-mono text-neutral-400">
                                {obj.current} / {obj.target}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            {selectedDay === 10 && (
              <div className="mx-5 mb-4 rounded-xl border border-emerald-800/60 bg-emerald-950/25 p-4">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Compass className="h-4 w-4" /> Mission 70 unlocks permanent Free Exploration
                </div>
                <p className="mt-1 text-xs leading-relaxed text-neutral-300">The campaign conclusion does not reset the world. Keep your apartment, companions, military base, research facilities, railway network, vehicles and sanctuary, and continue exploring, building, farming, researching and defending.</p>
              </div>
            )}
          </div>
        )}

        <footer className="border-t border-neutral-800 px-5 py-3 text-xs text-neutral-500 flex items-center justify-between bg-neutral-950">
          <span>{CAMPAIGN_TITLE} • 10 Days × 7 Missions = 70 Story Missions • Free Exploration after Mission 70</span>
          <span>Press [J] or [Esc] to exit Chronicle</span>
        </footer>
      </div>
    </div>
  );
};
