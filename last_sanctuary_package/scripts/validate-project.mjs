import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const campaign = read('src/data/eightDayCampaign.ts');
const train = read('src/engine/world/AITrainManager.ts');
const camera = read('src/engine/prologue/CinematicCameraManager.ts');
const engine = read('src/engine/GameEngine.ts');
const town = read('src/engine/prologue/TownLifeManager.ts');
const player = read('src/engine/PlayerController.ts');

check('Eight-day campaign catalogue declares 56 missions',
  campaign.includes('EIGHT_DAY_CAMPAIGN_TOTAL_MISSIONS = 56') &&
  campaign.includes('EIGHT_DAY_CAMPAIGN_MISSIONS_PER_DAY = 7'));
check('All six railway tracks are typed AI-only',
  (train.match(/isPlayerDrivable: false/g) || []).length >= 7);
check('Legacy train-driving APIs are disabled',
  train.includes('public updateTrainControls') &&
  train.includes('Intentionally disabled: train traction is exclusively AI-controlled.'));
check('Cinematic manager releases ownership on completion, skip and interruption',
  camera.includes('this.releaseOwnership(true)') &&
  camera.includes('this.releaseOwnership(false)') &&
  camera.includes('public dispose(): void'));
check('Game update clamps abnormal delta time',
  engine.includes('THREE.MathUtils.clamp(delta, 0, 0.05)'));
check('Game engine has finite/detached camera recovery',
  engine.includes('private ensureCameraTransform()') &&
  engine.includes('this.ensureCameraTransform();'));
check('Campaign progress is not mass-completed by a prologue callback',
  !/for\s*\(\s*const\s+mission\s+of\s+EIGHT_DAY_CAMPAIGN\s*\)\s*\{[\s\S]{0,180}mission\.day\s*>\s*6/.test(engine));
check('Park NPCs use explicit ground height and foot offset',
  town.includes('getCitizenRootHeight') &&
  town.includes('citizenFootOffset') &&
  town.includes('isParkGrassPad'));
check('Player camera has detached-camera recovery',
  player.includes('cameraDetached') && player.includes('distanceTo(this.position) > 25'));
check('No source tree was replaced by a standalone demo',
  fs.existsSync(path.join(root, 'src/App.tsx')) &&
  fs.existsSync(path.join(root, 'src/main.tsx')) &&
  fs.existsSync(path.join(root, 'src/engine/GameEngine.ts')));

const docs = fs.readdirSync(root).filter((name) => /\.(md|txt)$/i.test(name));
check('Project specification and history documents are retained in the project',
  docs.length >= 25, `${docs.length} Markdown/text documents present`);

for (const result of checks) {
  console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
}
const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} static checks passed.`);
if (failed.length) process.exitCode = 1;
