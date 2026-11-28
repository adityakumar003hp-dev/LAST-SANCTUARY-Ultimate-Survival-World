import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const building = read('src/engine/prologue/ApartmentBuilding.ts');
const turrets = read('src/engine/prologue/ApartmentTurrets.ts');
const gameEngine = read('src/engine/GameEngine.ts');
const gameTypes = read('src/types/game.ts');
const protectedZones = read('src/engine/world/ProtectedSpawnZones.ts');
const vehicles = read('src/engine/base/VehicleParkingManager.ts');
const securityUi = read('src/components/SecurityCommandCenterModal.tsx');
const app = read('src/App.tsx');

const results = [];
function check(name, fn) {
  try { fn(); results.push({ name, status: 'PASS' }); }
  catch (error) { results.push({ name, status: 'FAIL', detail: error.message }); }
}

check('Exactly 20 armed turret placements', () => {
  const block = turrets.match(/const perimeter = \[([\s\S]*?)\] as const;/)?.[1];
  assert.ok(block, 'turret perimeter array missing');
  const placements = block.match(/\[[^\[\]]+\]/g) ?? [];
  assert.equal(placements.length, 20, `found ${placements.length} turret placements`);
});

check('Hostile-only target allowlist; player and unknown/friendly/neutral protected', () => {
  assert.match(turrets, /candidate\.allegiance !== 'hostile'/);
  assert.match(turrets, /candidate\.id\.toLowerCase\(\) === 'player'/);
  assert.match(turrets, /candidate\.isPlayer/);
  assert.match(turrets, /!candidate\.factionId\?\.trim\(\)/);
  assert.match(turrets, /target\.allegiance !== 'hostile'/);
  assert.doesNotMatch(turrets, /getNearestHostileThreat|damageCreature/);
});

check('Exactly five perimeter gate structures and colliders', () => {
  for (const name of ['gate_1_main_motorized_12m','gate_2_west_pedestrian_2m','gate_3_east_emergency_pedestrian_2m','gate_4_independent_vehicle_8m','gate_5_north_vehicle_8m']) assert.ok(building.includes(name), `missing ${name}`);
  for (const id of ['apt_compound_gate','apt_compound_door_left','apt_compound_door_right','apt_vehicle_gate','apt_vehicle_gate_2']) assert.ok(building.includes(id), `missing collider ${id}`);
  assert.match(building, /vehicleGate2Open/);
  assert.match(gameEngine, /aptInteraction\.id === 'vehicleGate2'/);
  assert.match(app, /onToggleVehicleGate2/);
  assert.match(securityUi, /Gate 5 — North Vehicle Access/);
});

check('Exactly 20 perimeter towers, ten per side', () => {
  assert.match(building, /const towerZ=\[-58,-45,-32,-19,-6,6,19,32,45,58\]/);
  assert.match(building, /towerZ\.forEach\(\(z,i\)=>tower\(-50,z,'left',i\)\)/);
  assert.match(building, /towerZ\.forEach\(\(z,i\)=>tower\(50,z,'right',i\)\)/);
});

check('Compound land area is exactly five times the documented original footprint', () => {
  const area = 100 * 126.5;
  const original = 44 * 57.5;
  assert.equal(area, original * 5);
  assert.match(building, /const halfW=50, southZ=-63\.25, northZ=63\.25/);
  assert.match(protectedZones, /minX: -76, maxX: 24, minZ: -25\.25, maxZ: 101\.25/);
});

check('Three compound buildings are identified and command centre has multi-floor navigation', () => {
  for (const name of ['building_1_player_mansion_attached_wings','building_2_independent_railway_command_centre','building_3_four_vehicle_security_garage']) assert.ok(building.includes(name), `missing ${name}`);
  assert.match(building, /explorableRooms=\['main_dispatch','intelligence_and_surveillance','communications','research_and_technology_labs','roof_service_deck'\]/);
  assert.match(building, /railway_command_four_floor_staircase/);
  assert.match(building, /railway_command_elevator_shaft/);
  assert.match(building, /cycleCommandElevator/);
  assert.match(gameEngine, /aptInteraction\.id === 'commandElevator'/);
});

check('Garage contains the four requested vehicle bays and mounted weapon carrier', () => {
  assert.match(building, /vehicleBays:\['enforcement_suv','motorcycle','bicycle','military_enforcement_vehicle'\]/);
  for (const name of ['Aegis Enforcer Tactical Armored SUV','Phantom 650cc Enduro Motorbike','RidgeLine Mountain Expedition Bicycle','Military Enforcement Vehicle — Armored Gun Carrier']) assert.ok(vehicles.includes(name), `missing vehicle ${name}`);
  assert.match(vehicles, /military_enforcement_remote_weapon_station/);
  assert.doesNotMatch(building, /garageShell/);
});

check('Compound gate and turret state is saved and restored', () => {
  assert.match(gameTypes, /interface CompoundSecuritySaveData/);
  assert.match(gameTypes, /compoundState\?: CompoundSecuritySaveData/);
  assert.match(gameEngine, /compoundState: this\.prologueManager/);
  assert.match(gameEngine, /restoreCompoundState\(initialSave\.compoundState\)/);
  assert.match(building, /exportCompoundState\(\)/);
  assert.match(building, /restoreCompoundState\(saved\?/);
});

check('Security UI exposes gate 5 and all turret telemetry', () => {
  assert.match(app, /turrets=\{isSecurityCommandCenterOpen \? engineRef\.current\?\.prologueManager\.townMgr\.apartmentBuilding\.turrets\?\.getTurretsTelemetry\(\)/);
  assert.match(securityUi, /20 ARMED PERIMETER TURRETS/);
  assert.match(securityUi, /HOSTILE-ONLY TARGETING/);
});

check('Wildlife manager parameter is consistently scoped in turret update', () => {
  assert.match(turrets, /_wildlifeMgr:\s*WildlifeManager \| null/);
  assert.match(turrets, /this\.updateProjectiles\(delta, zombieMgr, _wildlifeMgr\)/);
  assert.doesNotMatch(turrets, /this\.updateProjectiles\(delta, zombieMgr, wildlifeMgr\)/);
});

check('Checkpoint boom pedestals clear their booth colliders', () => {
  assert.match(read('src/engine/world/MegaStationArchitecture.ts'), /const pivotX = gx - side \* 2\.50/);
  const boothHalfWidth = 4.2 / 2;
  const pedestalHalfWidth = 0.45 / 2;
  const centerOffset = 2.5;
  assert.ok(centerOffset - boothHalfWidth - pedestalHalfWidth >= 0.1, 'pedestal must have at least 0.1m clearance');
});

console.log('\nCompound validation');
for (const item of results) console.log(`${item.status.padEnd(4)} ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
const failed = results.filter((item) => item.status === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
if (failed) process.exitCode = 1;
