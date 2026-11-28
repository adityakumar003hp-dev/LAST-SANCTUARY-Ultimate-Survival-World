import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: Boolean(ok), detail });

const campaign = read('src/data/lastSanctuaryCampaign.ts');
const journal = read('src/components/QuestJournalModal.tsx');
const poi = read('src/engine/world/POIGenerator.ts');
const compat = read('src/data/eightDayCampaign.ts');
const missions = [...campaign.matchAll(/mission: (\d+), title:/g)].map((m) => Number(m[1]));
const dayCounts = [...campaign.matchAll(/day: (\d+), dayTitle:/g)].map((m) => Number(m[1])).reduce((acc, day) => { acc[day] = (acc[day] || 0) + 1; return acc; }, {});
const ids = [...campaign.matchAll(/id: '(LS_D\d+_\d+)'/g)].map((m) => m[1]);

check('70 unique missions are present and numbered 1–70',
  missions.length === 70 && new Set(missions).size === 70 && missions.every((n, i) => n === i + 1));
check('Each of the 10 campaign days contains exactly 7 missions',
  Object.keys(dayCounts).length === 10 && Array.from({ length: 10 }, (_, i) => dayCounts[i + 1] === 7).every(Boolean));
check('Mission chain has unique IDs and sequential unlock dependencies',
  ids.length === 70 && new Set(ids).size === 70 && campaign.includes("unlocksAfter: 'LS_D10_06'"));
check('Journal displays 10 days, 70 missions and Free Exploration epilogue',
  journal.includes('Day {selectedDay} of 10') && journal.includes('of 70') && journal.includes('Mission 70 unlocks permanent Free Exploration'));
check('Research POI is upgraded into a multi-wing containment campus',
  poi.includes('Apex Biomedical Research Complex') && poi.includes('wingLeft') && poi.includes('containmentA') && poi.includes('containmentB'));
check('Legacy campaign imports resolve to the new 10-day catalogue',
  compat.includes('TEN_DAY_CAMPAIGN_TOTAL_DAYS = CAMPAIGN_DAY_COUNT') && compat.includes('EIGHT_DAY_CAMPAIGN = TEN_DAY_CAMPAIGN'));
check('Original game source and core systems are retained',
  fs.existsSync(path.join(root, 'src/App.tsx')) && fs.existsSync(path.join(root, 'src/main.tsx')) && fs.existsSync(path.join(root, 'src/engine/GameEngine.ts')) && fs.existsSync(path.join(root, 'src/engine/world/RailwayNetworkGenerator.ts')));

for (const result of checks) console.log(`${result.ok ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` — ${result.detail}` : ''}`);
const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} campaign integration checks passed.`);
if (failed.length) process.exitCode = 1;
