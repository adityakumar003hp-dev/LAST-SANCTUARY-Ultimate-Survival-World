# LAST SANCTUARY: REBIRTH — Player Apartment Redesign

## Scope
The update is isolated to `src/engine/prologue/ApartmentBuilding.ts` and this report. It modifies the existing Player Apartment in place. No replacement apartment or duplicate building is created.

## Existing apartment systems retained
The existing apartment constructor and floor builders remain in use:
- Ground floor luxury living, lobby, kitchen/dining and guest suite (`buildFloor1`).
- First-floor private residence, master suite, family lounge and panoramic balconies (`buildFloor2`).
- Second-floor medical and survival facilities (`buildFloor3`).
- Third-floor self-sufficiency facilities, indoor growing, water storage and utilities (`buildFloor4Survival`).
- Existing rooftop pool, deck, pergola, loungers, planters and solar backup (`buildFloor5Pool`).
- Existing basement operations room and command-room integrations (`buildBasement`, `BasementControlRoom`, `CommandCenterScreens`).
- Existing stairs, elevator, doors, interaction state, apartment origin, player access, pool references and physics registration path.

## Implemented architectural upgrade
- Replaced the opaque dark facade infill with low-opacity blue architectural glazing while retaining the reinforced frame and existing wall groups.
- Added dark-metal curtain-wall mullions to give the existing window bays a consistent full-height glass rhythm.
- Added restrained travertine feature piers and bronze vertical fins to the front facade.
- Added upper-level planted facade troughs and foliage, positioned above the entrance and outside the existing balcony decks.
- Added warm architectural sconce fixtures and subtle point lighting.
- Added discreet front-facing security-camera housings and lenses.
- Added a stone entrance portal around the existing front-door opening without changing the door interaction or apartment origin.

## Protected systems
No edits were made to the Railway & Command Centre, Vehicle Garage, compound gates or walls, roads, security turrets, NPCs, missions, terrain, railway networks, campaign data, or save/load code. No new physics colliders or gameplay interactions were introduced by the facade additions.

## Validation results
- PASS — Original uploaded ZIP integrity checked before modification.
- PASS — Apartment implementation inspected; existing floor builders, rooftop, basement, stairs and elevator are retained.
- PASS — TypeScript syntax transpilation of the modified apartment source produced zero diagnostics.
- PASS — Output ZIP was rebuilt from the supplied original project with the apartment source update and this report only, then archive integrity checked.
- FAIL (pre-existing unrelated check) — `node scripts/validate-compound.mjs` reports 6/11 checks. Its Gate 5 label assertion expects `Gate 5 — North Vehicle Access`, while the existing source currently labels it `Gate 5 — North Vehicle Entrance`. The other five failures concern unrelated existing gate/compound assertions; no such files were changed in this apartment-only update.
- NOT RUN — Full TypeScript project check and production build: project dependencies are not installed; `tsc --noEmit` stops because `vite/client` and `vite-plugin-pwa/client` type definitions are unavailable.
- NOT RUN — In-game visual, collision, save/load, mobile/desktop performance and protected-neighbor regression tests: no running game/browser test session was available.

## Limitations
This is an isolated apartment visual upgrade built on the apartment's existing interior architecture and gameplay systems. It does not replace or recreate existing rooms that are already implemented. Runtime appearance and collision should still be checked in the game after importing the ZIP.
