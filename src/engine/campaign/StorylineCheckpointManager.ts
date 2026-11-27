/**
 * StorylineCheckpointManager.ts
 *
 * Dedicated Storyline & Checkpoint Save/Load Architecture for LAST SANCTUARY: REBIRTH.
 * Enforces:
 * 1. Exact Storyline Restoration (Mission 1 to 96, Day 1 to 12, exact partial objectives, flags, checkpoints).
 * 2. Exact Load Game Slot Behavior (never restarts at Mission 1, never auto-advances, preserves in-progress state).
 * 3. Save Slot Independence (Slot 1, 2, 3, Autosave isolated; New Game never wipes saves).
 * 4. Mission 96 & Permanent Free Exploration Unlock.
 */

import * as THREE from 'three';
import { LAST_SANCTUARY_CAMPAIGN, CampaignEvent, CAMPAIGN_ENDINGS } from '../../data/lastSanctuaryCampaign';
import { StoryCheckpointData, StoryObjectiveState, Quest } from '../../types/game';
import { soundEngine } from '../../utils/audio';

export const SAFE_CHECKPOINT_COORDINATES: Record<string, [number, number, number]> = {
  apartment: [-31.5, 0.88, 41.8],
  town: [-10, 0.2, 17],
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
  private missionStartedAt = Date.now();
  private lastInteractionAt = 0;

  constructor(private readonly engine: any) {
    if (!this.engine || this.engine.gameMode === 'story') {
      this.initDefaultMission(1);
    }
  }

  /**
   * Returns canonical campaign event definition by mission number (1-96).
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
    this.missionStartedAt = Date.now();
    this.missionId = def.id;
    const selectedEnding = def.mission === 96 ? CAMPAIGN_ENDINGS.find((ending) => ending.id === this.storyFlags.endingChoice) : undefined;
    this.missionTitle = selectedEnding?.title || def.title;
    this.missionDescription = selectedEnding?.description || def.summary;
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
    if (def.cinematic) {
      const playerPosition = this.engine.player?.position;
      if (playerPosition && this.engine.prologueManager?.cinematicCam) {
        this.engine.prologueManager.cinematicCam.playCampaignOrbit(playerPosition, 5.5);
      }
      this.engine.callbacks?.onPrologueTitle?.({ title: selectedEnding?.title || def.cinematic.title, subtitle: selectedEnding?.description || def.cinematic.beat, day: `DAY ${def.day} • CINEMATIC` });
    }
    this.syncWithEngineQuest();
  }

  /**
   * Exact Storyline Restoration from a save slot.
   */
  public restoreFromSave(saveData: StoryCheckpointData) {
    if (!saveData) return;

    this.missionStartedAt = Date.now();
    this.completedMissionNumbers = Array.isArray(saveData.completedMissionNumbers)
      ? [...saveData.completedMissionNumbers]
      : [];
    this.storyFlags = saveData.storyFlags ? { ...saveData.storyFlags } : {};
    this.unlockedFacilities = Array.isArray(saveData.unlockedFacilities)
      ? [...saveData.unlockedFacilities]
      : [];

    // Migrate saves from the retired 6/8/10-day catalogues to the new canonical mission IDs.
    // A previously completed 70-mission campaign remains completed and enters the new free-roam epilogue.
    const wasLegacyFinalMission = Boolean(saveData.isFreeExplorationUnlocked && saveData.missionNumber === 70);
    if (wasLegacyFinalMission) {
      this.currentMissionNumber = 96;
      this.campaignDay = 12;
      this.storyFlags.endingChoice = this.storyFlags.endingChoice || 'local_rebuild';
      if (!this.completedMissionNumbers.includes(96)) this.completedMissionNumbers.push(96);
    } else {
      this.currentMissionNumber = Math.max(1, Math.min(96, saveData.missionNumber || 1));
      const currentDefinition = this.getMissionDefinition(this.currentMissionNumber) || LAST_SANCTUARY_CAMPAIGN[0];
      this.campaignDay = currentDefinition.day;
    }

    const definition = this.getMissionDefinition(this.currentMissionNumber) || LAST_SANCTUARY_CAMPAIGN[0];
    const selectedEnding = this.currentMissionNumber === 96
      ? CAMPAIGN_ENDINGS.find((ending) => ending.id === this.storyFlags.endingChoice)
      : undefined;
    const expectedTitle = selectedEnding?.title || definition.title;
    const expectedDescription = selectedEnding?.description || definition.summary;
    const legacyDefinition = wasLegacyFinalMission || saveData.missionId !== definition.id || saveData.missionTitle !== expectedTitle || saveData.missionDescription !== expectedDescription || saveData.location !== definition.location;

    this.missionId = definition.id;
    this.missionTitle = expectedTitle;
    this.missionDescription = expectedDescription;
    this.location = definition.location;
    this.checkpointId = legacyDefinition
      ? `checkpoint_m${this.currentMissionNumber.toString().padStart(2, '0')}_migrated`
      : saveData.checkpointId || `checkpoint_m${this.currentMissionNumber}`;
    this.checkpointPosition = legacyDefinition
      ? [...(SAFE_CHECKPOINT_COORDINATES[this.location] || [954, 0.5, 22])]
      : saveData.checkpointPosition && saveData.checkpointPosition.length === 3
        ? [...saveData.checkpointPosition]
        : [...(SAFE_CHECKPOINT_COORDINATES[this.location] || [954, 0.5, 22])];

    // New-campaign saves retain exact partial progress. Legacy catalogues are rebuilt against the new objectives.
    if (legacyDefinition || wasLegacyFinalMission) {
      this.objectives = definition.objectives.map((description, index) => ({
        id: `obj_${this.currentMissionNumber}_${index}`,
        description,
        current: wasLegacyFinalMission ? 1 : 0,
        target: 1,
        completed: wasLegacyFinalMission,
      }));
    } else if (Array.isArray(saveData.objectives) && saveData.objectives.length > 0) {
      this.objectives = saveData.objectives.map((objective) => ({
        id: objective.id,
        description: objective.description,
        current: Number(objective.current ?? (objective.completed ? 1 : 0)),
        target: Number(objective.target ?? 1),
        completed: Boolean(objective.completed),
      }));
    } else {
      this.objectives = definition.objectives.map((description, index) => ({
        id: `obj_${this.currentMissionNumber}_${index}`,
        description,
        current: 0,
        target: 1,
        completed: false,
      }));
    }

    this.isFreeExplorationUnlocked = Boolean(
      saveData.isFreeExplorationUnlocked || this.completedMissionNumbers.includes(96) || wasLegacyFinalMission
    );
    const firstUnfinished = this.objectives.find((objective) => !objective.completed);
    this.activeObjective = this.isFreeExplorationUnlocked
      ? 'Permanent Free Exploration — continue exploring the existing world'
      : firstUnfinished?.description || saveData.activeObjective || 'Continue your mission';

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

    // Military installation established: Mission >= 25 or Day >= 4
    if (this.currentMissionNumber >= 25 || this.campaignDay >= 4) {
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
   * Complete the arrival objective when the player reaches this mission's authored location.
   * This gives every campaign entry a real in-world starting trigger without spawning new POIs.
   */
  public updateLocationProgress(playerPosition: THREE.Vector3) {
    if (this.isFreeExplorationUnlocked || this.currentMissionNumber === 94 || Date.now() - this.missionStartedAt < 1800) return;
    const target = SAFE_CHECKPOINT_COORDINATES[this.location];
    if (!target) return;
    const dx = playerPosition.x - target[0];
    const dz = playerPosition.z - target[2];
    const radius = this.location === 'train' ? 28 : this.location === 'railway_station' ? 24 : 18;
    if (dx * dx + dz * dz > radius * radius) return;
    const firstPending = this.objectives.find((objective) => !objective.completed);
    if (!firstPending) return;
    // Arrival only completes the first objective; the remaining objectives require player actions.
    firstPending.current = firstPending.target;
    firstPending.completed = true;
    this.activeObjective = this.objectives.find((objective) => !objective.completed)?.description || 'Mission objectives complete';
    this.syncWithEngineQuest();
    if (this.objectives.every((objective) => objective.completed)) this.onMissionCompleted();
  }

  /**
   * In-world interactions performed near the active mission location progress the next directive.
   * Existing systems (talking, collecting, crafting, inspecting and using facilities) feed this hook.
   */
  public notifyMissionInteraction(playerPosition: THREE.Vector3, amount = 1) {
    const now = Date.now();
    if (this.isFreeExplorationUnlocked || this.currentMissionNumber === 94 || (this.currentMissionNumber === 27 && !this.engine.prologueManager?.baseTasks?.generator) || now - this.missionStartedAt < 1800 || now - this.lastInteractionAt < 350) return;
    const target = SAFE_CHECKPOINT_COORDINATES[this.location];
    if (!target) return;
    const dx = playerPosition.x - target[0];
    const dz = playerPosition.z - target[2];
    const interactionRadius = this.location === 'train' ? 34 : 30;
    if (dx * dx + dz * dz > interactionRadius * interactionRadius) return;
    this.lastInteractionAt = now;
    const pending = this.objectives.find((objective) => !objective.completed);
    if (!pending) return;
    pending.current = Math.min(pending.target, pending.current + Math.max(1, amount));
    pending.completed = pending.current >= pending.target;
    this.activeObjective = this.objectives.find((objective) => !objective.completed)?.description || 'Mission objectives complete';
    this.syncWithEngineQuest();
    if (this.objectives.every((objective) => objective.completed)) this.onMissionCompleted();
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

    if (this.currentMissionNumber === 96) {
      // Mission 96 Completed: Unlock Permanent Free Exploration!
      this.isFreeExplorationUnlocked = true;
      const ending = CAMPAIGN_ENDINGS.find((item) => item.id === this.storyFlags.endingChoice);
      this.engine.callbacks.onPrologueTitle?.({
        title: ending?.title || 'THE LAST SANCTUARY: REBIRTH',
        subtitle: ending?.description || 'Campaign Concluded • Permanent Free Exploration Unlocked',
        day: 'DAY 12 — SANCTUARY ESTABLISHED',
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

  /** Store the player's final campaign path and complete the decision mission. */
  public setEndingChoice(choice: 'local_rebuild' | 'united_survivors' | 'unknown_horizon') {
    if (this.currentMissionNumber !== 94) return false;
    this.storyFlags = { ...this.storyFlags, endingChoice: choice };
    this.objectives = this.objectives.map((objective) => ({
      ...objective,
      current: objective.target,
      completed: true,
    }));
    this.activeObjective = 'Decision confirmed';
    this.syncWithEngineQuest();
    this.onMissionCompleted();
    this.engine.callbacks?.onInteractionPrompt?.(`Campaign path selected: ${CAMPAIGN_ENDINGS.find((ending) => ending.id === choice)?.title || choice}`);
    this.engine.triggerAutoSave?.();
    return true;
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
   * Generates test save scenarios for verification (Mission 5, Mission 17 halfway, Mission 67 partial, Mission 70 research, Mission 96).
   */
  public loadTestScenario(
    scenario: 'mission_5' | 'mission_17_halfway' | 'mission_67_partial' | 'mission_70_research' | 'mission_96_completed'
  ) {
    if (scenario === 'mission_5') {
      // Day 1, Mission 5: A Doctor’s Errand
      const def = this.getMissionDefinition(5)!;
      this.campaignDay = 1;
      this.currentMissionNumber = 5;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m05_doctor_errand';
      this.checkpointPosition = SAFE_CHECKPOINT_COORDINATES.hospital;
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
        this.engine.player.position.set(...SAFE_CHECKPOINT_COORDINATES.hospital);
      }
    } else if (scenario === 'mission_17_halfway') {
      // Day 3, Mission 17: A Signal from Chloe (Halfway: 1 of 2 objectives done)
      const def = this.getMissionDefinition(17)!;
      this.campaignDay = 3;
      this.currentMissionNumber = 17;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m17_railway_signal';
      this.checkpointPosition = [...SAFE_CHECKPOINT_COORDINATES.town];
      this.objectives = [
        {
          id: 'obj_17_0',
          description: def.objectives[0] || 'Meet Chloe',
          current: 1,
          target: 1,
          completed: true, // 1st objective completed!
        },
        {
          id: 'obj_17_1',
          description: def.objectives[1] || 'Listen to the recovered transmission',
          current: 0,
          target: 1,
          completed: false, // 2nd objective unfinished!
        },
      ];
      this.activeObjective = this.objectives[1].description;
      this.completedMissionNumbers = Array.from({ length: 16 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = false;
      if (this.engine.player) {
        this.engine.player.position.set(...SAFE_CHECKPOINT_COORDINATES.town);
      }
    } else if (scenario === 'mission_67_partial') {
      // Day 9, Mission 67: Research Records (one of two objectives complete)
      const def = this.getMissionDefinition(67)!;
      this.campaignDay = 9;
      this.currentMissionNumber = 67;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m67_research_records';
      this.checkpointPosition = [974, 0.5, 1];
      this.objectives = def.objectives.map((description, idx) => ({
        id: `obj_67_${idx}`,
        description,
        current: idx === 0 ? 1 : 0,
        target: 1,
        completed: idx === 0,
      }));
      this.activeObjective = this.objectives[1].description;
      this.completedMissionNumbers = Array.from({ length: 66 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = false;
      this.unlockedFacilities = ['sample_storage', 'scientist_quarters', 'quarantine_ward'];
      if (this.engine.player) this.engine.player.position.set(974, 0.5, 1);
    } else if (scenario === 'mission_70_research') {
      // Day 9, Mission 70: The Origin Clue
      const def = this.getMissionDefinition(70)!;
      this.campaignDay = 9;
      this.currentMissionNumber = 70;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m70_origin_analysis';
      this.checkpointPosition = [974, 0.5, -12];
      this.objectives = def.objectives.map((desc, idx) => ({
        id: `obj_70_${idx}`,
        description: desc,
        current: 0,
        target: 1,
        completed: false,
      }));
      this.activeObjective = this.objectives[0].description;
      this.completedMissionNumbers = Array.from({ length: 69 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = false;
      this.unlockedFacilities = ['sample_storage', 'scientist_quarters', 'quarantine_ward', 'research_command', 'biology_lab'];
      if (this.engine.player) {
        this.engine.player.position.set(974, 0.5, -12);
      }
    } else if (scenario === 'mission_96_completed') {
      // Legacy test scenario name retained; now represents the final 12-day campaign mission.
      const def = this.getMissionDefinition(96)!;
      this.campaignDay = 12;
      this.currentMissionNumber = 96;
      this.missionId = def.id;
      this.missionTitle = def.title;
      this.missionDescription = def.summary;
      this.location = def.location;
      this.checkpointId = 'checkpoint_m96_sanctuary_dawn';
      this.checkpointPosition = [954, 0.5, 22];
      this.objectives = def.objectives.map((desc, idx) => ({
        id: `obj_96_${idx}`,
        description: desc,
        current: 1,
        target: 1,
        completed: true,
      }));
      this.activeObjective = 'Sanctuary Established — Infinite Free Exploration Active';
      this.completedMissionNumbers = Array.from({ length: 96 }, (_, i) => i + 1);
      this.isFreeExplorationUnlocked = true;
      if (this.engine.player) {
        this.engine.player.position.set(954, 0.5, 22);
      }
    }

    this.syncWithEngineQuest();
    this.syncWorldStateWithMission();
  }
}
