import assert from 'node:assert/strict';
import { GlobalMediaManager } from '../src/engine/media/GlobalMediaManager';
import { ASTEROID_MEDIA_STAGES, MEDIA_CHANNELS } from '../src/engine/media/MediaChannelRegistry';
import type { MediaWorldInputContext, ReporterProfession } from '../src/engine/media/MediaTypes';
import { isProtectedSpawnZone } from '../src/engine/world/ProtectedSpawnZones';
import { CURRENT_SAVE_VERSION, migrateSaveData } from '../src/utils/storage';
import type { FullGameSave } from '../src/types/game';
import { GlobalPopulationState, type GlobalPopulationStateSnapshot } from '../src/engine/world/GlobalPopulationState';
import type { GlobalOutbreakMetrics } from '../src/engine/world/GlobalOutbreakSimulator';

function makePopulationSnapshot(day: number, infected: number, healthy: number): GlobalPopulationStateSnapshot {
  const popState = new GlobalPopulationState();
  const snap = popState.getSnapshot();
  return {
    ...snap,
    currentDay: day,
    isOutbreakActive: infected > 0,
    totalPopulation: healthy + infected,
    totalHealthy: healthy,
    totalInfected: infected,
  };
}

function makeMetrics(sev: number, infected: number, healthy: number, grid: number): GlobalOutbreakMetrics {
  return {
    apocalypticSeverity: sev,
    powerGridStability: grid,
    totalPopulation: healthy + infected,
    totalHealthy: healthy,
    totalTransforming: 0,
    totalInfected: infected,
    totalEvacuated: 0,
    overrunCitiesCount: infected > 0 ? 4 : 0,
    activeLocalPedestrians: 24,
    citizenDailyMultiplier: 3,
    zombieDailyMultiplier: 2,
    activeConversionSeconds: 60,
  };
}

function makeContext(overrides: Partial<MediaWorldInputContext> = {}): MediaWorldInputContext {
  return {
    dayCount: 1,
    campaignDay: 1,
    gameTimeMinutes: 540,
    isNight: false,
    weatherType: 'clear',
    weatherSeverity: 0.2,
    visibilityPercent: 100,
    meteorInFlight: false,
    meteorImpacted: false,
    cityOutbreakStarted: false,
    isOutbreakActive: false,
    globalMetrics: makeMetrics(0, 0, 100_000, 1.0),
    cityStates: [],
    populationState: makePopulationSnapshot(1, 0, 100_000),
    activeTrainCount: 6,
    delayedTrainCount: 0,
    powerStatePowered: true,
    powerGridStability: 1.0,
    nearestCityName: 'Oakridge Valley',
    ...overrides,
  };
}

// 1. Validate 6 channels & complete 24-hour programming schedules
assert.equal(MEDIA_CHANNELS.length, 6, 'Expected 6 interconnected media channels');
for (const ch of MEDIA_CHANNELS) {
  assert.ok(ch.schedule.length >= 3, `${ch.id} should cover 24h across schedule blocks`);
  assert.equal(ch.schedule[0].startHour, 0, `${ch.id} schedule should start at 00:00`);
  for (let i = 1; i < ch.schedule.length; i++) {
    assert.equal(ch.schedule[i].startHour, ch.schedule[i - 1].endHour, `${ch.id} schedule must be contiguous`);
  }
  assert.equal(ch.schedule[ch.schedule.length - 1].endHour, 24, `${ch.id} schedule should end at 24:00`);
}
assert.equal(ASTEROID_MEDIA_STAGES.length, 9, 'Expected 9 asteroid coverage stages');

// 2. Validate 5 world phases + zero infected reporters in Day 1 normal world
const mgr = new GlobalMediaManager();
mgr.update(1.0, makeContext({ dayCount: 1, campaignDay: 1, gameTimeMinutes: 540 }));
let snap = mgr.getSnapshot();
assert.equal(snap.worldPhase, 'normal_world');
assert.equal(snap.channels.length, 6);
assert.equal(snap.facilities.length, 7);
assert.equal(snap.reporters.length, 12);

const expectedProfessions: ReporterProfession[] = [
  'News Anchor',
  'Field Reporter',
  'Investigative Journalist',
  'Camera Operator',
  'Photographer',
  'Weather Presenter',
  'Scientist',
  'Radio Presenter',
  'Broadcast Technician',
  'Editor',
  'Security Personnel',
  'Media Vehicle Driver',
];
for (const prof of expectedProfessions) {
  assert.ok(snap.reporters.some((r) => r.profession === prof), `Missing reporter profession: ${prof}`);
}

// Ensure Day 1 live trigger never turns a reporter stunned/infected when outbreak is inactive
mgr.triggerLiveReporterIncident(true);
for (let i = 0; i < 6; i++) {
  mgr.update(8.0, makeContext({ dayCount: 1, campaignDay: 1, isOutbreakActive: false, meteorImpacted: false }));
}
snap = mgr.getSnapshot();
assert.ok(
  snap.reporters.every((r) => r.status !== 'stunned' && r.status !== 'infected'),
  'Day 1 peaceful life must never stun or infect reporters'
);

// 3. Validate Day 2 -> Impact -> Outbreak -> Late-stage progression + full 7-stage incident
mgr.reset(2);
mgr.update(1.0, makeContext({ dayCount: 2, campaignDay: 2, gameTimeMinutes: 720, meteorInFlight: true }));
assert.equal(mgr.getWorldPhase(), 'asteroid_approaching');
assert.ok(mgr.getSnapshot().asteroidStageIndex >= 4);

mgr.update(1.0, makeContext({ dayCount: 2, campaignDay: 2, meteorImpacted: true, globalMetrics: makeMetrics(0.1, 0, 100_000, 0.85) }));
assert.equal(mgr.getWorldPhase(), 'asteroid_impact');

// Trigger outbreak incident & step through stages cleanly
mgr.triggerLiveReporterIncident(true);
const outbreakCtx = makeContext({
  dayCount: 3,
  campaignDay: 3,
  cityOutbreakStarted: true,
  isOutbreakActive: true,
  meteorImpacted: true,
  globalMetrics: makeMetrics(0.35, 18_000, 82_000, 0.7),
  populationState: makePopulationSnapshot(3, 18_000, 82_000),
});
const seenIncidentStages = new Set<string>([mgr.getLiveIncidentStage()]);
for (let i = 0; i < 8; i++) {
  mgr.update(7.5, outbreakCtx);
  seenIncidentStages.add(mgr.getLiveIncidentStage());
}
assert.equal(mgr.getWorldPhase(), 'outbreak');
assert.ok(seenIncidentStages.has('camera_anomaly'));
assert.ok(seenIncidentStages.has('signal_interference'));
assert.ok(seenIncidentStages.has('studio_reconnect'));
assert.ok(seenIncidentStages.has('outbreak_conversion'));
assert.ok(seenIncidentStages.has('feed_lost'));
assert.ok(seenIncidentStages.has('studio_emergency_bulletin'));

mgr.update(
  1.0,
  makeContext({
    dayCount: 6,
    campaignDay: 6,
    isOutbreakActive: true,
    powerGridStability: 0.28,
    globalMetrics: makeMetrics(0.84, 70_000, 30_000, 0.28),
    populationState: makePopulationSnapshot(6, 70_000, 30_000),
  })
);
assert.equal(mgr.getWorldPhase(), 'late_stage');
assert.ok(mgr.getSnapshot().broadcastHistory.length > 0, 'Broadcast archive should record crisis headlines');

// 4. Validate backup generator toggle & save export/import round-trip
mgr.setActiveChannel('discovery_science');
mgr.setActiveRadioChannel('oakridge_radio');
mgr.setFacilityBackupPower('fac_metro_regional', true);
mgr.recordStudioInspection('studio_a');
const exported = mgr.exportSaveData();
const restored = new GlobalMediaManager(exported);
assert.equal(restored.getActiveChannelId(), 'discovery_science');
assert.equal(restored.getSnapshot().activeRadioChannelId, 'oakridge_radio');
assert.ok(restored.getSnapshot().inspectedStudioIds.includes('studio_a'));
assert.equal(restored.getFacilities().find((f) => f.id === 'fac_metro_regional')?.backupPowerOn, true);

// 5. Validate Oakridge Media Tower protected spawn zone & v1..v3 -> v4 save migration
assert.equal(isProtectedSpawnZone(66, -28), true, 'Oakridge Media Tower plaza must be protected from hostile spawns');
assert.equal(CURRENT_SAVE_VERSION, 4, 'Save version should be migrated to v4');
const legacySave = {
  saveVersion: 2,
  metadata: {
    id: 'slot_1',
    name: 'Legacy Test',
    characterName: 'Tester',
    dayCount: 3,
    timeString: '12:00',
    timestamp: Date.now(),
    difficulty: 'standard',
    gameMode: 'story',
  },
  worldSeed: 42,
  playerPosition: [0, 0, 0],
  playerRotation: 0,
  playerStats: {
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    hunger: 80,
    thirst: 80,
    temperature: 22,
    infection: 0,
    level: 1,
    xp: 0,
    xpToNextLevel: 100,
    skillPoints: 0,
    skills: { strength: 1, endurance: 1, engineering: 1, survival: 1 },
  },
  inventory: [],
  hotbar: [],
  selectedHotbarIndex: 0,
  structures: [],
  quests: [],
  gameTimeMinutes: 720,
  dayCount: 3,
  lastSleptDay: -1,
  nightHordeCountDefeated: 0,
  discoveredChunks: ['0_0'],
  waypoints: [],
  chunkModifications: {},
  rescuedSurvivorIds: [],
} as unknown as FullGameSave;

const migrated = migrateSaveData(legacySave);
assert.equal(migrated.saveVersion, 4);
assert.ok(migrated.mediaState, 'Migrated save must include mediaState');
assert.equal(migrated.mediaState.worldPhase, 'outbreak');

console.log('GLOBAL MEDIA NETWORK VALIDATION PASSED: 6 channels, 5 phases, 9 asteroid stages, 7 incident stages, 12 professions, 7 facilities, v4 save migration.');
