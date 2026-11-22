# First-Floor Medical Section — Functional Integration Specification

## Placement and access
- The medical section is inside the existing first-floor building on its first floor (use the project's own floor numbering).
- It must not be a separate demo building or teleport-only scene.
- Preserve the existing mansion shell, stairs/elevator, room dimensions and spawn.
- Provide a continuous walkable route from the first-floor landing.
- Walls, counters, beds and cabinets need collision; doors must be interactable.
- Mobile interaction prompts and touch controls must work.

## Rooms
1. Reception and patient check-in.
2. Examination room with examination bed.
3. Treatment room.
4. Recovery room with usable patient beds.
5. Medicine and supply storage.
6. Medical refrigerator.
7. Medical workstation for patient records and stock.

## Functional interactions
- Reception opens a patient list and lets the player select a patient.
- Examination bed starts a non-graphic in-game examination and displays a health/status report.
- Treatment station uses available game inventory for appropriate recovery actions.
- Recovery beds allow the player or NPCs to rest; recovery uses the existing game time/health systems.
- Cabinets open inventory UI and persist stored items.
- Medical refrigerator stores eligible items and remains compatible with existing storage systems.
- Workstation displays patient status, treatment history and supply counts.
- Doors and lights are interactive where supported by the existing interaction architecture.

## NPC and persistence
- Resident NPCs can visit and occupy available beds.
- Medical staff assignment may use the existing survivor job system. Do not fake autonomous treatment if no staff AI exists; provide player-operated interactions instead.
- Patient state and inventory persist through save/load. Prevent duplicate stock/rewards on re-entry.

## Campaign integration
- Day 7 Event 4: complete first-floor medical setup.
- Day 8 Event 3: verify inventory, beds and equipment.
- The section remains usable after Event 64 during free roam.

## Sanctuary protection invariant
Infected never spawn inside or breach protected sanctuary boundaries. No clinic mission requires defending or repairing the perimeter or clearing infected inside.

## Validation checklist
- [ ] Correct first-floor placement and reachable entrance.
- [ ] Physical collision on walls, counters, beds and cabinets.
- [ ] Doors and interaction prompts work on desktop and mobile.
- [ ] Storage and refrigerator inventories persist.
- [ ] Patient UI does not trap player controls.
- [ ] Recovery uses actual game health/time state, not cosmetic animation only.
- [ ] Save/load preserves inventory and patient state.
- [ ] Section remains usable after Day 8.
