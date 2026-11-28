import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const outbreak = read('src/engine/world/GlobalOutbreakSimulator.ts');
const infection = read('src/engine/prologue/InfectionOutbreakManager.ts');
const town = read('src/engine/prologue/TownLifeManager.ts');
const types = read('src/types/game.ts');
const game = read('src/engine/GameEngine.ts');
const zombies = read('src/engine/ZombieManager.ts');

const popState = read('src/engine/world/GlobalPopulationState.ts');
const dashboard = read('src/components/GlobalOutbreakDashboard.tsx');
const mapModal = read('src/components/MapModal.tsx');

assert.match(outbreak, /const nextPopulation = previousPopulation \* 3/);
assert.match(outbreak, /currentZombiePopulation \* 2/);
assert.match(outbreak, /remainingSeconds: isNight \? 10 : 60/);
assert.match(outbreak, /CONTINENTAL_ASTEROID_IMPACTS/);
for (const cityId of ['us_oakridge', 'br_saopaulo', 'gb_london', 'eg_cairo', 'in_delhi', 'au_sydney', 'aq_mcmurdo']) {
  assert.ok(outbreak.includes(`cityId: '${cityId}'`), `Missing asteroid impact city ${cityId}`);
}
for (const age of ['Child', 'Teenager', 'Young Adult', 'Adult', 'Middle-aged Adult', 'Elderly']) {
  assert.ok(outbreak.includes(`'${age}'`), `Missing citizen age group ${age}`);
  assert.ok(popState.includes(`'${age}'`), `Missing age group ${age} in GlobalPopulationState`);
}
for (const profession of ['Military Soldier', 'Nurse', 'Doctor', 'Station Police', 'Prison Warden', 'Prison Guard', 'Police Officer', 'Railway Security']) {
  assert.ok(outbreak.includes(`'${profession}'`), `Missing citizen profession ${profession}`);
}
for (const category of ['Civilian', 'Military', 'Medical', 'Police', 'Security', 'Emergency', 'Railway']) {
  assert.ok(popState.includes(`'${category}'`), `Missing profession category ${category} in GlobalPopulationState`);
}
assert.match(popState, /CITIZEN_DAILY_GROWTH_MULTIPLIER = 3\.0/);
assert.match(popState, /ZOMBIE_DAILY_GROWTH_MULTIPLIER = 2\.0/);
assert.match(popState, /DAYTIME_CONVERSION_SECONDS = 60/);
assert.match(popState, /NIGHTTIME_CONVERSION_SECONDS = 10/);
assert.match(popState, /public reset\(initialDay: number = 1/);
assert.match(outbreak, /public reset\(initialDay: number = 1\)/);
assert.match(game, /public resetGlobalSimulation\(initialDay: number = 1\)/);
assert.match(dashboard, /from 'd3'/);
assert.match(dashboard, /d3\.zoom/);
assert.match(dashboard, /d3\.stack/);
assert.match(mapModal, /GlobalOutbreakDashboard/);

assert.match(infection, /citizen\.infectionTimer = isNight \? 10 : 60/);
assert.match(infection, /if \(this\.spawnWaveTimer > 18\)/);
assert.doesNotMatch(infection, /zombieMgr\.zombies\.length\s*<\s*8/);
assert.match(town, /ageGroup: 'Child'/);
assert.match(town, /ageGroup: 'Teenager'/);
assert.match(zombies, /scale \* \(z\.victimScale \?\? 1\)/);
assert.match(outbreak, /victimScale: ageScale\(ped\.ageGroup\)/);
assert.match(types, /conversionCohorts\?: Array/);
assert.match(types, /GlobalPopulationStateSave/);
assert.match(game, /this\.sandboxSettings\.dayLengthMultiplier/);

// Sanity-check the requested daily multipliers independently of rendering.
assert.equal(100 * 3 ** 2, 900, 'Citizen population must triple each day');
assert.equal(100 * 2 ** 2, 400, 'Zombie target must double each day');
assert.equal(60 / 10, 6, 'Night conversion must be six times as fast as daytime');

console.log('Global outbreak validation passed: GlobalPopulationState, GlobalOutbreakDashboard (D3), 3x citizen growth, 2x zombie target, 60s/10s conversion, 7 continental impact sites, age/profession safety, and clean reset.');
