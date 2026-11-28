// Legacy validation script from an earlier source snapshot. Its source assumptions do not match the current root application. Use `npm run validate:compound` for the current compound implementation.
import fs from 'node:fs';
const read = (p) => fs.readFileSync(p, 'utf8');
const zombie = read('src/engine/ZombieManager.ts');
const engine = read('src/engine/GameEngine.ts');
const app = read('src/App.tsx');
const apartment = read('src/engine/prologue/ApartmentBuilding.ts');
const checks = [
  ['Hostile spawn inputs reject non-finite coordinates', zombie.includes('![position[0], position[1], position[2]].every(Number.isFinite)')],
  ['Protected spawn candidates are checked against every protected zone', zombie.includes('if (isProtectedSpawnZone(candidate.x, candidate.z)) continue;')],
  ['Unsafe spawn relocation fails closed when no safe point exists', zombie.includes('if (!safe) return null;')],
  ['Player damage ignores invalid and non-positive values', engine.includes('if (!Number.isFinite(amount) || amount <= 0) return;')],
  ['Player defeat callback is one-shot', engine.includes('private hasTriggeredGameOver = false') && engine.includes('this.hasTriggeredGameOver = true;')],
  ['Defeat screen accurately identifies player incapacitation', app.includes('Survivor Down') && app.includes('does not mean the sanctuary compound has fallen')],
  ['Stair flights shifted away from the east wall', apartment.includes('const lanes = [4.65, 6.15, 4.65, 6.15]')],
  ['Rooftop guardrail visuals use transparent physical glass', apartment.includes('new THREE.MeshPhysicalMaterial') && apartment.includes('transmission: 0.35')],
  ['Four matching rooftop guardrail colliders registered', ['apt_roof_guardrail_n','apt_roof_guardrail_s','apt_roof_guardrail_w','apt_roof_guardrail_e'].every(x => apartment.includes(x))],
  ['Rooftop pool remains a single named pool group', (apartment.match(/rooftop_swimming_pool_with_exit_steps/g) || []).length === 1],
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(`\n${checks.filter(x => x[1]).length}/${checks.length} final-repair source checks passed.`);
if (checks.some(x => !x[1])) process.exitCode = 1;
