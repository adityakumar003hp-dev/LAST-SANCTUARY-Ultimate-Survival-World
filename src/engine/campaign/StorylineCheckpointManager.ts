/**
 * StorylineCheckpointManager.ts
 *
 * Dedicated Storyline & Checkpoint Save/Load Architecture for LAST SANCTUARY: REBIRTH.
 * Enforces:
 * 1. Exact Storyline Restoration (Mission 1 to 70, Day 1 to 10, exact partial objectives, flags, checkpoints).
 * 2. Exact Load Game Slot Behavior (never restarts at Mission 1, never auto-advances, preserves in-progress state).
 * 3. Save Slot Independence (Slot 1, 2, 3, Autosave isolated; New Game never wipes saves).
 * 4. Mission 70 & Permanent Free Exploration Unlock.
 */

import * as THREE from 'three';
import { LAST_SANCTUARY_CAMPAIGN, CampaignEvent } from '../../data/lastSanctuaryCampaign';
import { StoryCheckpointData, StoryObjectiveState, Quest } from '../../types/game';
import { soundEngine } from '../../utils/audio';

export const SAFE_CHECKPOINT_COORDINATES: Record<string, [number, number, number]> = {
  apartment: [-31.5, 0.88, 41.8],
  town: [18, 0.2, 50],
  market: [80, 0.2, 75],
  park: [45, 0.2, 120],
  impact_site: [520, 1.5, 140],
  railway_station: [280, 0.5, 16],
  train: [310, 1.2, 16],
  arrival_point: [640, 0.5, 16],
  military_base: [954, 0.5, 33],
  armory: [942, 0.5, 18],
  military_medical: [951.6, 0.5, 19.4],
  warehouse: [965, 0.5, 24],
  farm: [920, 0.2, -40],
  water_facility: [985, 0.5, -15],
  command_center: [958, 0.5, 42],
  garage: [948, 0.5, 6],
  accommodation: [940, 0.5, 36],
  sanctuary: [954, 0.5, 22],
  radio_station: [1010, 2.0, 50],
  settlement: [1120, 0.5, 80],
  wilderness: [750, 0.5, 90],
  research_site: [974, 0.5, 1],
  research_complex: [974, 0.5, 1],
  containment: [974, 0.5, -12],
  regional_command: [958, 0.5, 42],
  highway: [480, 0.5, 18],
  hospital: [1150, 0.5, -45],
  industrial_zone: [1080, 0.5, 130],
  regional_network: [954, 0.5, 22],
};

export class StorylineCheckpointManager {
  public campaignDay: number = 1;
  public currentMissionNumber: number = 1;
  public missionId: string = 'LS_D1_01';
  public missionTitle: string = 'A New Morning';
  public missionDescription: string = 'Wake up in the apartment and begin an ordinary day.';
  public location: string = 'apartment';
  public checkpointId: string = 'checkpoint_m01_morning';
  public checkpointPosition: [number, number, number] = [-31.5, 0.88, 41.8];
  public activeObjective: string = 'Wake up and get dressed';
  public objectives: StoryObjectiveState[] = [];
  public completedMissionNumbers: number[] = [];
  public storyFlags: Record<string, any> = {};
  public isFreeExplorationUnlocked: boolean = false;
  public unlockedFacilities: string[] = [];

  constructor(private readonly engine: any) {
    if (!this.engine || this.engine.gameMode === 'story') {
      this.initDefaultMission(1);
    }
  }

  /**
   * Returns canonical campaign event definition by mission number (1-70).
   */
  public getMissionDefinition(missionNumber: number): CampaignEvent | undefined {
    return LAST_SANCTUARY_CAMPAIGN.find((m) => m.mission === missionNumber);
  }

  /**
   * Initializes the mission state from the canonical catalog.
   */
  public initDefaultMission(missionNumber: number) {
    const def = this.getMissionDefinition(missionNumber) || LAST_SANCTUARY_CAMPAIGN[0];
    this.currentMissionNumber = def.mission;
    this.campaignDay = def.day;
    this.missionId = def.id;
    this.missionTitle = def.title;
    this.missionDescription = def.summary;
    this.location = def.location;
    this.checkpointId = `checkpoint_m${def.mission.toString().padStart(2, '0')}_start`;
    this.checkpointPosition = SAFE_CHECKPOINT_COORDINATES[def.location] || [954, 0.5, 22];

    // Build objectives list
    this.objectives = def.objectives.map((desc, idx) => ({
      id: `obj_${def.mission}_${idx}`,
      description: desc,
      current: 0,
      target: 1,
      completed: false,
    }));

    this.activeObjective = this.objectives[0]?.description || 'Explore the world';
    this.syncWithEngineQuest();
  }

  /**
   * Exact Storyline Restoration from a save slot.
   */
  public restoreFromSave(saveData: StoryCheckpointData) {
    if (!saveData) return;

    this.campaignDay = Math.max(1, Math.min(10, saveData.campaignDay || 1));
    this.currentMissionNumber = Math.max(1, Math.min(70, saveData.missionNumber || 1));
    this.missionId = saveData.missionId || `LS_D${this.campaignDay}_01`;
    this.missionTitle = saveData.missionTitle || 'Restored Mission';
    this.missionDescription = saveData.missionDescription || '';
    this.location = saveData.location || 'sanctuary';
    this.checkpointId = saveData.checkpointId || `checkpoint_m${this.currentMissionNumber}`;
    this.checkpointPosition = saveData.checkpointPosition && saveData.checkpointPosition.length === 3
      ? [...saveData.checkpointPosition]
      : (SAFE_CHECKPOINT_COORDINATES[this.location] || [954, 0.5, 22]);

    this.completedMissionNumbers = Array.isArray(saveData.completedMissionNumbers)
      ? [...saveData.completedMissionNumbers]
      : [];

    this.storyFlags = saveData.storyFlags ? { ...saveData.storyFlags } : {};
    this.unlockedFacilities = Array.isArray(saveData.unlockedFacilities)
      ? [...saveData.unlockedFacilities]
      : [];

    // Permanent Free Exploration is unlocked ONLY if Mission 70 was completed
    this.isFreeExplorationUnlocked = Boolean(
      saveData.isFreeExplorationUnlocked || this.completedMissionNumbers.includes(70)
    );

    // Exact restoration of objectives: preserve completed as completed, unfinished as unfinished!
    if (Array.isArray(saveData.objectives) && saveData.objectives.length > 0) {
      this.objectives = saveData.objectives.map((obj) => ({
        id: obj.id,
        description: obj.description,
        current: Number(obj.current ?? (obj.completed ? 1 : 0)),
        target: Number(obj.target ?? 1),
        completed: Boolean(obj.completed),
      }));
    } else {
      // Fallback to catalog if empty
      const def = this.getMissionDefinition(this.currentMissionNumber);
      this.objectives = (def?.objectives || ['Continue your mission']).map((desc, idx) => ({
        id: `obj_${this.currentMissionNumber}_${idx}`,
        description: desc,
        current: 0,
        target: 1,
        completed: false,
      }));
    }

    // Restore active objective
    const firstUnfinished = this.objectives.find((o) => !o.completed);
    this.activeObjective = saveData.activeObjective || firstUnfinished?.description || 'Continue your mission';

    // Synchronize engine quest and notifications
    this.syncWithEngineQuest();
    this.syncWorldStateWithMission();
  }

  /**
   * Adapts world environment according to mission progression.
   */
  public syncWorldStateWithMission() {
    if (!this.engine) return;

    // Outbreak status: active from Day 2 onwards or Mission >= 8
    const isOutbreak = this.campaignDay >= 2 || this.currentMissionNumber >= 8;
    if (this.engine.zombieMgr) {
      this.engine.zombieMgr.isOutbreakActive = isOutbreak;
    }

    // Crater formed: Mission >= 9 or meteorite flag
    if ((this.currentMissionNumber >= 9 || this.campaignDay >= 2) && this.engine.prologueManager?.meteorMgr) {
      this.engine.prologueManager.meteorMgr.spawnPhysicalCrater();
    }

    // Starter Base established: Mission >= 14 or Day >= 3
    if (this.currentMissionNumber >= 14 || this.campaignDay >= 3) {
      if (this.engine.prologueManager) {
        this.engine.prologueManager.starterBaseEstablished = true;
      }
    }

    // Free exploration mode
    if (this.isFreeExplorationUnlocked) {
      this.engine.chunkManager?.setStreamingRadius(null);
    }
  }

  /**
   * Synchronizes the active mission with `this.engine.quests` so the UI HUD,
   * Navigation Compass, and Quest Journal reflect the exact restored state.
   */
  public syncWithEngineQuest() {
    if (!this.engine) return;
    if (this.engine.gameMode && this.engine.gameMode !== 'story') return;

    const questObj: Quest = {
      id: `ls_campaign_m${this.currentMissionNumber}`,
      chapter: this.campaignDay,
      title: `Mission ${this.currentMissionNumber}: ${this.missionTitle}`,
      description: this.missionDescription,
      completed: this.objectives.length > 0 && this.objectives.every((o) => o.completed),
      rewards: {
        xp: this.currentMissionNumber * 100,
        items: [{ itemId: 'clean_water', count: 2 }, { itemId: 'canned_beans', count: 2 }],
      },
      objectives: this.objectives.map((o) => ({
        id: o.id,
        description: o.description,
        current: o.current,
        target: o.target,
        completed: o.completed,
      })),
    };

    // Replace or insert the primary campaign quest at index 0
    const otherQuests = (this.engine.quests || []).filter(
      (q: Quest) => !q.id.startsWith('ls_campaign_m') && q.id !== 'main_survival_story'
    );
    this.engine.quests = [questObj, ...otherQuests];
    this.engine.callbacks.onQuestsUpdate?.([...this.engine.quests]);

    // Update active objective banner in HUD
    const unfinished = this.objectives.find((o) => !o.completed);
    const hudPrompt = this.isFreeExplorationUnlocked
      ? 'FREE EXPLORATION UNLOCKED — Rebuild humanity across the 30 biomes'
      : unfinished
      ? `Mission ${this.currentMissionNumber}: ${unfinished.description}`
      : `Mission ${this.currentMissionNumber} Complete`;
    this.engine.callbacks.onPrologueObjective?.(hudPrompt);
  }

  /**
   * Updates progress on an objective.
   */
  public updateObjective(objectiveId: string, delta: number = 1) {
    let changed = false;
    for (const obj of this.objectives) {
      if (obj.id === objectiveId && !obj.completed) {
        obj.current = Math.min(obj.target, obj.current + delta);
        if (obj.current >= obj.target) {
          obj.completed = true;
          soundEngine.playBuildSnap();
        }
        changed = true;
      }
    }

    if (changed) {
      const nextUnfinished = this.objectives.find((o) => !o.completed);
      if (nextUnfinished) {
        this.activeObjective = nextUnfinished.description;
      }

      this.syncWithEngineQuest();

      // Check if all objectives in current mission are now complete
      const allDone = this.objectives.every((o) => o.completed);
      if (allDone) {
        this.onMissionCompleted();
      }
    }
  }

  /**
   * Sets an objective's completion state explicitly.
   */
  public setObjectiveState(index: number, completed: boolean, current?: number) {
    if (this.objectives[index]) {
      this.objectives[index].completed = completed;
      if (current !== undefined) {
        this.objectives[index].current = current;
      } else {
        this.objectives[index].current = completed ? this.objectives[index].target : 0;
      }
      this.syncWithEngineQuest();
    }
  }

  /**
   * Handles natural completion of the active mission.
   */
  private onMissionCompleted() {
    if (!this.completedMissionNumbers.includes(this.currentMissionNumber)) {
      this.completedMissionNumbers.push(this.currentMissionNumber);
    }

    this.engine.addXP?.(this.currentMissionNumber * 100);

    if (this.currentMissionNumber === 70) {
      // Mission 70 Completed: Unlock Permanent Free Exploration!
      this.isFreeExplorationUnlocked = true;
      this.engine.callbacks.onPrologueTitle?.({
        title: 'THE LAST SANCTUARY: REBIRTH',
        subtitle: 'Campaign Concluded • Permanent Free Exploration Unlocked',
        day: 'DAY 10 — SANCTUARY ESTABLISHED',
      });
      this.engine.callbacks.onPrologueObjective?.(
        'FREE EXPLORATION ACTIVE — Infinite survival, exploration and construction'
      );
      this.engine.triggerAutoSave();
      return;
    }

    // Advance to next mission
    const nextMission = this.currentMissionNumber + 1;
    this.engine.callbacks.onPrologueTitle?.({
      title: `Mission ${this.currentMissionNumber} Complete`,
      subtitle: `Advancing to Mission ${nextMission}`,
      day: `DAY ${this.campaignDay}`,
    });

    this.initDefaultMission(nextMission);
    this.engine.triggerAutoSave();
  }

  /**
   * Records a safe checkpoint position and ID.
   */
  public setCheckpoint(id: string, pos?: [number, number, number]) {
    this.checkpointId = id;
    if (pos) {
      this.checkpointPosition = [...pos];
    } else if (this.engine.player?.position) {
      this.checkpointPosition = [
        this.engine.player.position.x,
        this.engine.player.position.y,
        this.engine.player.position.z,
      ];
    }
  }

  /**
   * Generates the complete, exact checkpoint snapshot for saving.
   */
  public exportCheckpoint(): StoryCheckpointData {
    const completedCount = this.objectives.filter((o) => o.completed).length;
    const totalCount = this.objectives.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const unfinished = this.objectives.find((o) => !o.completed);
    const livePos: [number, number, number] = this.engine?.player?.position
      ? [this.engine.player.position.x, this.engine.player.position.y, this.engine.player.position.z]
      : [...this.checkpointPosition];

    return {
      campaignDay: this.campaignDay,
      missionNumber: this.currentMissionNumber,
      missionId: this.missionId,
      missionTitle: this.missionTitle,
      missionDescription: this.missionDescription,
      location: this.location,
      checkpointId: this.checkpointId,
      checkpointPosition: livePos,
      activeObjective: unfinished ? unfinished.description : (this.activeObjective || 'Continue mission'),
      objectives: this.objectives.map((o) => ({
        id: o.id,
        description: o.description,
        current: o.current,
        target: o.target,
        completed: o.completed,
      })),
      completedObjectivesCount: completedCount,
      totalObjectivesCount: totalCount,
      progressPercent: pct,
      completedMissionNumbers: [...this.completedMissionNumbers],
      storyFlags: { ...this.storyFlags },
      isFreeExplorationUnlocked: this.isFreeExplorationUnlocked,
      unlockedFacilities: [...this.unlockedFacilities],
    };
  }

  /**
   * Generates test save scenarios for verification (Mission 5, Mission 15 halfway, Mission 53 partial, Mission 55, Mission 70).
   */
  public loadTestScenario(
    scenario: 'mission_5' | 'mission_15_halfway' | 'mission_53_partial' | 'mission_55' | 'mission_70_completed'
  ) {
    if (scenario === 'mission_5') {
      // Day 1, Mission 5: Okhla Market
      const def = this.getMissionDefinition(5)!;
      this.campaignDay = 1;
      this.currentMissionNumber = 5;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m05_okhla_market';
      this.checkpointPosition = [80, 0.2, 75];
      this.objectives = def.objectives.map((desc, idx) => ({
        id: `obj_5_${idx}`,
        description: desc,
        current: 0,
        target: 1,
        completed: false,
      }));
      this.activeObjective = this.objectives[0].description;
      this.completedMissionNumbers = [1, 2, 3, 4];
      this.isFreeExplorationUnlocked = false;
      if (this.engine.player) {
        this.engine.player.position.set(80, 0.2, 75);
      }
    } else if (scenario === 'mission_15_halfway') {
      // Day 3, Mission 15: A Signal from the Railway (Halfway: 1 of 2 objectives done)
      const def = this.getMissionDefinition(15)!;
      this.campaignDay = 3;
      this.currentMissionNumber = 15;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m15_railway_signal';
      this.checkpointPosition = [280, 0.5, 16];
      this.objectives = [
        {
          id: 'obj_15_0',
          description: def.objectives[0] || 'Inspect the railway signal',
          current: 1,
          target: 1,
          completed: true, // 1st objective completed!
        },
        {
          id: 'obj_15_1',
          description: def.objectives[1] || 'Listen to Chloe’s transmission',
          current: 0,
          target: 1,
          completed: false, // 2nd objective unfinished!
        },
      ];
      this.activeObjective = this.objectives[1].description;
      this.completedMissionNumbers = Array.from({ length: 14 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = false;
      if (this.engine.player) {
        this.engine.player.position.set(280, 0.5, 16);
      }
    } else if (scenario === 'mission_53_partial') {
      // Day 8, Mission 53: The Research Complex (Exactly 2 of 5 objectives completed, 3 remaining)
      const def = this.getMissionDefinition(53)!;
      this.campaignDay = 8;
      this.currentMissionNumber = 53;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m53_research_lab_power';
      this.checkpointPosition = [974, 0.5, 1];
      this.objectives = [
        {
          id: 'obj_53_0',
          description: 'Infiltrate research campus perimeter gate',
          current: 1,
          target: 1,
          completed: true, // DONE
        },
        {
          id: 'obj_53_1',
          description: 'Locate primary sub-level power transformer',
          current: 1,
          target: 1,
          completed: true, // DONE (2 of 5 completed!)
        },
        {
          id: 'obj_53_2',
          description: 'Restore campus emergency breaker switches',
          current: 0,
          target: 1,
          completed: false, // REMAINING
        },
        {
          id: 'obj_53_3',
          description: 'Access classified biology terminal records',
          current: 0,
          target: 1,
          completed: false, // REMAINING
        },
        {
          id: 'obj_53_4',
          description: 'Download meteor spore sequencing telemetry',
          current: 0,
          target: 1,
          completed: false, // REMAINING (3 remaining!)
        },
      ];
      this.activeObjective = this.objectives[2].description;
      this.completedMissionNumbers = Array.from({ length: 52 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = false;
      this.unlockedFacilities = ['sample_storage', 'scientist_quarters', 'quarantine_ward'];
      if (this.engine.player) {
        this.engine.player.position.set(974, 0.5, 1);
      }
    } else if (scenario === 'mission_55') {
      // Day 8, Mission 55: The Origin of Infection
      const def = this.getMissionDefinition(55)!;
      this.campaignDay = 8;
      this.currentMissionNumber = 55;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m55_origin_analysis';
      this.checkpointPosition = [974, 0.5, -12];
      this.objectives = def.objectives.map((desc, idx) => ({
        id: `obj_55_${idx}`,
        description: desc,
        current: 0,
        target: 1,
        completed: false,
      }));
      this.activeObjective = this.objectives[0].description;
      this.completedMissionNumbers = Array.from({ length: 54 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = false;
      this.unlockedFacilities = ['sample_storage', 'scientist_quarters', 'quarantine_ward', 'research_command', 'biology_lab'];
      if (this.engine.player) {
        this.engine.player.position.set(974, 0.5, -12);
      }
    } else if (scenario === 'mission_70_completed') {
      // Day 10, Mission 70: A New Beginning (Completed, Free Exploration Unlocked!)
      const def = this.getMissionDefinition(70)!;
      this.campaignDay = 10;
      this.currentMissionNumber = 70;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m70_sanctuary_dawn';
      this.checkpointPosition = [954, 0.5, 22];
      this.objectives = def.objectives.map((desc, idx) => ({
        id: `obj_70_${idx}`,
        description: desc,
        current: 1,
        target: 1,
        completed: true,
      }));
      this.activeObjective = 'Sanctuary Established — Infinite Free Exploration Active';
      this.completedMissionNumbers = Array.from({ length: 70 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = true;
      if (this.engine.player) {
        this.engine.player.position.set(954, 0.5, 22);
      }
    }

    this.syncWithEngineQuest();
    this.syncWorldStateWithMission();
  }
}
