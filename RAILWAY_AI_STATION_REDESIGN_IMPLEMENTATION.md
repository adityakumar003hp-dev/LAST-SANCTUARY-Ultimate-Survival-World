# LAST SANCTUARY: REBIRTH — Railway AI & Passenger Simulation Upgrade

## Active source files changed

- `src/engine/world/RailwayNPCManager.ts`
- `src/engine/world/AITrainManager.ts`
- `src/engine/prologue/BasementControlRoom.ts`
- `src/engine/GameEngine.ts`
- `src/types/game.ts`

The root `package.json` and root `src/` remain the active project. Historical nested source snapshots in the original archive were left untouched.

## Implemented in this patch

### Human NPC population and appearance
- Expanded the railway population to 42 persistent identities: the existing named cast plus 30 generated commuter/employee identities.
- Rebuilt the procedural railway avatar around rounded shared humanoid geometry, a rotating head pivot, layered eyes/iris/pupils, ears, nose, mouth, eyebrows, hair/headwear variants, clothing details, articulated limbs, hands/fingers, boots and luggage.
- Kept the existing player-scale rig dimensions and shoulder/hip animation pivots; added small per-identity height/body-scale variation.
- Reused shared sphere/limb/finger geometry and limited high-detail NPC visibility/updates to the local 260m simulation bubble.

### Passenger and station behaviour
- Assigned each NPC a station, one of the six railway track levels, a destination, travel purpose, role and individual state.
- Corrected the previous single-platform update assumption: each NPC now simulates against its own station index and assigned track instead of all passengers being steered around the player's nearest F1 platform.
- Added unique station bench seat IDs and reservation state (two places per modeled bench). Passengers walk to a reserved bench before sitting; reservations are released when they stand, queue or board.
- Added nearby-crowd separation so walking NPCs push apart rather than continuously occupying the same space.
- Staff with station-master, ticketing and passenger-assistance roles receive dedicated duty posts and terminal-interaction arm animation. Security and supervisory roles use the existing patrol/roaming behaviour.

### Train boarding, seating and destination exits
- Connected passenger AI to all six existing AI-operated trains.
- Passengers select a service on their assigned track that can reach their destination; they walk to the open carriage-side door marker and wait for the door/dwell state.
- Boarding now begins at the carriage threshold and walks into the aisle before reaching a reserved passenger seat. The pilot observer seat is excluded from passenger seat allocation.
- Onboard passengers retain their train/local position, can walk the carriage aisle and release/reacquire seat reservations.
- Passengers disembark only at their assigned destination and walk to the open door before stepping onto the platform; the previous random mid-route exit behaviour was removed.

### Station operations and apartment basement dispatch
- Added platform CCTV camera housings/lenses and public-address speaker props to the existing station architecture.
- Added a live station-operations snapshot: passenger count, platform/onboard/seated passengers, boarding queues, employees, trains at platforms and train-related incidents.
- Added automatic text announcements for train arrivals and dispatch holds.
- Connected the station snapshot to the existing five-monitor railway command room in the apartment basement. The diagnostics monitor now displays passenger, employee, queue and incident status alongside train mechanical telemetry.
- Corrected station collision geometry to use each station group's actual track Z coordinate, including all six track levels; added collision boxes for modeled pillars, benches, luggage carts, ticket kiosks, fare gates and the dispatch office.

### Save/load persistence
- Added `railwayNPCSaveState` to the game save schema.
- Save/load now preserves NPC IDs, positions, station/track assignments, state, destination, current train, local carriage position, train-seat assignment, station-seat assignment, timers and facing/animation phase.
- Restore rebuilds train seat occupancy and station bench reservations from saved NPC records.

## Validation performed

- TypeScript transpilation syntax checks passed for all 98 root TypeScript/TSX source files.
- Source-level checks passed for the six train services, 42-NPC population, station bench seat IDs, door-based boarding, destination-based exits, basement station telemetry and NPC save/load hooks.
- ZIP integrity is checked after packaging.

## Not yet verified / incomplete

- Full `npm run build` and `tsc --noEmit` were not available: dependency installation timed out in this environment, and the archive has no installed `node_modules` directory.
- No live browser/Google AI Studio play-test was possible here. Boarding timing, platform alignment, seat pose alignment, station collisions and Android frame rate still need in-game validation.
- The procedural humanoids are higher-detail versions of the game's existing geometric player-rig style, not photorealistic scanned characters or a fully skinned motion-capture rig.
- This patch does not yet provide full navmesh/pathfinding around every station obstacle, voice/TTS announcements, live CCTV image feeds, full incident dispatch/medical/fire response, interactive working escalators/lifts, or fully simulated shops/restrooms/taxi/bus services.
- Station facilities that were already present in the source (concourse, ticket kiosks, fare gates, platform displays, benches, dispatch office, signals and emergency call pillar) remain in place; this patch does not claim every requested facility is now fully interactive.

The patch is integrated into the original project source. It is not a separate demo or replacement game.
