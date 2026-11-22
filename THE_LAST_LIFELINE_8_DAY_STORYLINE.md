# LAST SANCTUARY — THE LAST LIFELINE

Approved campaign: 8 days × 8 events = 64 events. Structured data: `src/data/lastSanctuaryCampaign.ts`.

## Non-negotiable rules
- Protected sanctuary walls, gates and doors remain secure. Infected never breach, climb, destroy or spawn inside protected sanctuary zones.
- Trains are AI-driven only. The player is a passenger and may board, walk through connected carriages, sit, look through windows and disembark at the designated arrival point.
- Stations are only boarding/arrival points. No station exploration objectives, railway control-room tasks, repair tasks or player train driving.
- The world remains continuous and explorable.
- Day 8 completes the campaign and unlocks permanent free roam.
- The mansion first-floor medical section is a permanent facility; see `FIRST_FLOOR_MEDICAL_SECTION_IMPLEMENTATION_SPEC.md`.

## Day themes
1. The Last Normal Day
2. The Outbreak
3. The Railway Journey
4. The Military Connection
5. Food, Water and Self-Sufficiency
6. The Lifeline Network
7. Building a New Home
8. The Last Sanctuary

## Implementation status
This update adds the approved campaign data catalogue and implementation specifications. It does not claim all 64 events are wired to runtime triggers, or that the medical rooms, NPC patient logic, inventory interactions or recovery mechanics are already implemented in the 3D world. Those require integration in the world, building, interaction and save systems, followed by runtime testing.
