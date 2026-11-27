# LAST SANCTUARY — Complete Survival Expansion

This is the updated Google AI Studio project ZIP, based on the original `deadzone-craft (1).zip` repository.

## Current campaign — LAST SANCTUARY: REBIRTH (November 2026)

The active campaign catalogue and in-game Chronicle have been upgraded to **12 days / 96 missions (8 per day)**, followed by permanent Free Exploration. This replaces the former campaign structure. See `CAMPAIGN_12_DAY_IMPLEMENTATION.md` for the active storyline, four companion roles, cinematic milestones, branching endings and continuity rules. The research POI is upgraded into the Apex Biomedical Research Complex containment campus.

## Quick start
1. Open/import the complete project in Google AI Studio.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Run `npm run build` before publishing.

## New integrated systems
- Expanded biome generation and chunk streaming through the existing chunk manager.
- Wildlife species manager for mammals, birds, dinosaurs, aquatic species and rare creatures.
- Survivor rescue manager with dialogue and persistent rescued state.
- Conversation modal and E-key survivor interaction.

Read `IMPLEMENTATION_UPDATE.md` for the exact implementation scope and known limitations. Read `public/assets/aistudio/LAST_SANCTUARY_REALISM_AND_WORLD_EXPANSION_MASTER_PROMPT.md` for the next-stage Google AI Studio instructions to upgrade procedural placeholders into high-realism assets and deeper simulation.

**Honest status:** this package contains integrated gameplay foundations and procedural placeholder models. It is not a photorealistic finished release. A complete build and mobile play-test should be run in Google AI Studio after import.


## Earlier campaign notes (historical)
The six-day and eight-day campaign documents are retained only as historical design records. The active campaign is the 12-day / 96-mission catalogue in `src/data/lastSanctuaryCampaign.ts`.


## Updated source delivery

For the updated project, use the root `package.json` and root `src/` directory as the active application. See `COMPOUND_IMPLEMENTATION_REPORT.md` for the latest five-gate, twenty-turret Player Mansion / Rebirth Compound implementation and its validation limits. Run `npm run validate:compound` for the source-level compound checks. See `IMPLEMENTATION_DELIVERY_REPORT.md` for broader implemented code changes and `IMPLEMENTATION_TRACEABILITY.md` for the subsystem-to-source map.

## Railway basement dispatch control centre (November 2026)
The apartment now contains a dedicated underground railway dispatch room. The former upper-floor command desk has been removed and the new room is accessed by walking down to basement level and pressing **E** at the dispatch console. It includes one wide operations board, four auxiliary monitors, a keyboard desk, six-line railway map, six-service arrival/departure board, condition, speed, distance and next-stop details. Keyboard controls are listed in `RAILWAY_BASEMENT_CONTROL_CENTER_UPDATE.md`.

**Railway AI and station architecture update (November 2026):** the root source now builds one shared eight-platform, three-floor terminal for the six AI train lines, with separate arrival/departure gates, platform canopies, service rooms, waiting areas, four animated lift cabins with E-key floor selection, an overhead footbridge, parking and station amenities. The railway population contains 72 persistent identities spanning passengers, children, teenagers, senior citizens, wheelchair users, tourists, family/couple travellers, railway operations, security, vendors and emergency staff. The walkable floor and stair elevations are handled directly in `src/engine/PlayerController.ts`; station geometry, lift/gate automation and collision bounds are implemented in `src/engine/world/AITrainManager.ts`; passenger identities, character variants and platform seat placement are implemented in `src/engine/world/RailwayNPCManager.ts`; lift interaction is wired into `src/engine/GameEngine.ts`. The basement dispatch room continues to read live six-train telemetry and station-AI operations.


## Five-floor apartment correction (November 2026)
The root `src/` application now contains the active five-level apartment implementation: Floor 1 living suite, Floor 2 medical centre, Floor 3 armory, Floor 4 survival farm/utilities, and Floor 5 open rooftop swimming-pool terrace, plus the retained basement operations room. The exterior shell is four enclosed storeys with the fifth level exposed as the rooftop deck so the pool terrace is visible from outside. Four ascending staircase flights connect Floors 1–5, with a separate basement access flight. The rooftop pool rim colliders and player floor-height handling are aligned to the fifth-floor elevation.

**Import note:** import this archive from its root. The active application is the root `package.json` and root `src/` directory.


## Large solid farm infrastructure and prop collision update (November 2026)
The active root `src/engine/prologue/ApartmentBuilding.ts` now builds a large industrial water-treatment plant with multiple filter vessels, membrane housings, pumps, control cabinet and pipe manifolds; two large steel water-storage tanks with access ladders, inspection gauges and valves; and a full-size emergency generator with radiator, exhaust, service panel and adjacent fuel reservoir. These are actual Three.js meshes in the playable Floor 4 survival-farm room, not overlay art or a separate demo.

The active apartment physics registration now includes blocking colliders for the large utility equipment, both water tanks, crop planters, farm crates, medical beds/equipment/cabinets, armory lockers/crates/vault/terminal, and basement server racks/command desk/crates. The IV bags are opaque solid props. Intentional transparency is limited to actual glass and water surfaces; the equipment and structural props use opaque materials and cast/receive shadows.

## Outpost 7 Military Research & Science Complex (November 2026)
The military compound now includes an authored 3D research campus inside the protected Outpost 7 footprint. Its ten facilities are Biology Laboratory, Medical Research Center, Meteor Research Lab, Infection Testing Chambers, Genetics Laboratory, Underground Sample Storage, Research Command Center, Scientist Quarters, Quarantine Ward and a Secret Underground Laboratory. The campus includes perimeter walls, a controlled access gate, signage, floodlights and a visible underground access hatch. The active 12-day campaign places the Outpost 7 research sequence on Day 9 (Missions 65–72). See `MILITARY_RESEARCH_COMPLEX_IMPLEMENTATION.md`.

**Scope note:** this update adds the physical facility layout and the Day 9 journal/story-intel linkage. It does not claim bespoke interactive lab experiments, vaccine crafting, or fully simulated containment systems unless separately implemented in the gameplay systems.
