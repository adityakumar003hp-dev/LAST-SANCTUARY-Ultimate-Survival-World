# LAST SANCTUARY: REBIRTH — 10-Day / 70-Mission Campaign

This update replaces the in-game Chronicle's former 8-day / 64-event catalogue with the canonical 10-day / 70-mission campaign.

## Integrated source changes

- `src/data/lastSanctuaryCampaign.ts` now contains all 70 missions, seven per day, with ordered IDs, mission numbers, objectives, destination categories and sequential `unlocksAfter` links.
- `src/data/eightDayCampaign.ts` is retained as a compatibility bridge and now exports the same 10-day campaign under both the new `TEN_DAY_*` names and legacy `EIGHT_DAY_*` names.
- `src/components/QuestJournalModal.tsx` now displays ten campaign days, mission numbers 01–70, the 10 × 7 count and the permanent Free Exploration epilogue.
- `src/engine/world/POIGenerator.ts` upgrades the existing Apex Biomedical Research POI into a visibly larger containment campus with two laboratory wings and sealed sample vessels. Existing research POI generation remains deterministic per world seed.

## Campaign outline

1. The Last Normal Day
2. The Outbreak
3. The Railway Journey
4. The Military Starter Base
5. Food and Survival
6. The Last Sanctuary
7. The Survivor Network
8. The Meteor Mystery
9. Reclaim the Region
10. The Last Stand

Mission 70's Chronicle epilogue explicitly preserves the world and unlocks permanent free exploration. The existing apartment, companions, railway, military base, vehicles, survival systems and procedural world source have been retained.

## Validation

- 70 unique mission IDs and mission numbers.
- Exactly seven missions on each of ten days.
- Each mission has objectives and a sequential predecessor link (except Mission 1).
- TypeScript syntax checks passed for the changed campaign, journal and POI generator files.

The project build could not be run in this environment because dependencies were not available for installation; the TypeScript compiler stopped at the missing `vite/client` type package. This ZIP contains the full source project, not a compiled game build.
