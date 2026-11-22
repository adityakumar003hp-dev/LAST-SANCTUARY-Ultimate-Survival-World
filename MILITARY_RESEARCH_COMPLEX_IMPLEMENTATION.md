# Outpost 7 — Military Research & Science Complex

## Integrated source changes
- `src/engine/base/ResearchComplexManager.ts` creates the authored 3D campus inside the military base protected footprint.
- `src/data/researchFacilities.ts` defines the ten named facilities and their functions/classification.
- `src/data/researchComplex.ts` maps Day 8 missions 50–56 to facility-specific discoveries and classified files.
- `src/engine/prologue/PrologueManager.ts` creates and disposes the campus with the world lifecycle.
- `src/components/QuestJournalModal.tsx` displays each Day 8 mission's research facility, classification and discovery clue.

## Physical campus contents
1. Biology Laboratory
2. Medical Research Center
3. Meteor Research Lab
4. Infection Testing Chambers
5. Genetics Laboratory
6. Underground Sample Storage
7. Research Command Center
8. Scientist Quarters
9. Quarantine Ward
10. Secret Underground Laboratory access hatch

The compound also has a concrete foundation, controlled vehicle access, perimeter walls, a gate header, security lighting and facility beacons. It is placed within the existing protected Outpost 7 zone so procedural spawns do not place unrelated objects over it.

## Day 8 story linkage
- Mission 50 — Meteor Research Lab: meteorite recovery log.
- Mission 51 — Research Command Center: classified Project Nightfall file.
- Mission 52 — Scientist Quarters: surviving staff roster.
- Mission 53 — Biology Laboratory: laboratory power restoration.
- Mission 54 — Infection Testing Chambers: containment protocol.
- Mission 55 — Genetics Laboratory: origin sequence report.
- Mission 56 — Secret Underground Laboratory: final Nightfall transmission.

## Validation
- TypeScript transpile/syntax checks passed for all five changed/new TS/TSX files.
- Full `npm run lint` / production build could not be completed in this environment because dependencies were not installed; the attempted dependency installation timed out.
- The journal shows story-intel clues and facility classifications. These are campaign narrative links, not a claim that each lab has a fully simulated experimental minigame or bespoke interaction yet.
