# LAST SANCTUARY — MASTER SPECIFICATIONS-TO-GAMEPLAY IMPLEMENTATION FILE
**Purpose:** Execute every applicable specification in this archive as working gameplay code in the existing original project.  
**Target:** The original `LAST_SANCTUARY_UPDATED_IMPLEMENTED_SOURCE.zip` project.  
**Project stack:** React + TypeScript + Three.js (confirm exact versions from the root `package.json` before editing).

---

## 1. Mission: implement, do not merely describe

You are modifying an existing game. This is a source-code implementation and integration task, not a redesign, mock-up, documentation-only pass, screenshot, or separate demo.

Read **all specification and implementation documents in this ZIP**, including documents under:
- project root,
- `public/assets/aistudio/`,
- `latest_working_source/`,
- `latest_working_source/public/assets/aistudio/`,
- `ls_dev/`,
- `ls_dev/public/assets/aistudio/`.

Treat repeated copies as duplicate references, not separate features to implement twice. Extract each unique requirement into a traceability checklist. Implement every applicable requirement in the **active root application** and its actual runtime systems.

## 2. Canonical source and preservation rules

1. The active application is the root `package.json`, root `src/`, root `index.html`, and root build configuration, unless inspection proves the repository's scripts explicitly use another directory.
2. `latest_working_source/` and `ls_dev/` are historical snapshots/reference material. Do not silently replace the active root app with either snapshot. Compare them when useful and port only verified missing changes.
3. Do not create a second game, parallel scene, duplicate manager, isolated prototype, disconnected modal, fake button, static dashboard, or decorative object that has no gameplay behavior.
4. Preserve all already-working systems and their public APIs: world/chunk streaming, terrain, player movement and camera, survival, inventory, crafting, building, base management, apartment/mansion, garage, vehicles, companions, NPCs, wildlife, zombies, farming, hunting, railway, missions, story, save/load, audio, UI, and mobile controls.
5. Never delete a feature just to make the build pass. If requirements conflict, resolve them using the precedence rules below and record the decision.
6. Keep TypeScript strictness. Avoid `any`, unsafe casts, fake completion flags, hard-coded success states, placeholder TODOs, and silent error swallowing.
7. Reuse and extend existing managers/components where they own the behavior. One authoritative runtime owner per system.
8. Keep desktop keyboard, touch/mobile controls, accessibility, and UI scaling working together.

## 3. Requirement precedence and conflict resolution

The archive contains multiple generations of specifications and status reports. Resolve conflicts in this order:

1. The user's latest explicit instruction in the active conversation.
2. Explicitly marked final/authoritative specifications (for example, final world structure, final campaign, and remaining-implementation handoff documents).
3. Later dated integration/hotfix documents.
4. Earlier feature specifications.
5. Historical status reports and README claims.

A status report saying a feature is complete is not proof. Verify the actual active root runtime code and tests. If two authoritative documents genuinely conflict, do not guess: record the conflict, preserve existing gameplay, and choose the least destructive interpretation pending clarification.

**Campaign conflict rule:** Inspect the six-day and eight-day campaign documents and identify which one is explicitly declared authoritative by the latest final specification. Do not merge two incompatible campaign lengths or silently discard missions. Preserve legacy saves with a versioned migration.

**Train rule:** Trains are autonomous AI services. The player is a passenger/explorer, never a train driver. A railway control room in the player's apartment basement is a dispatch/monitoring simulation interface; it must not grant direct locomotive throttle/steering control unless a later explicit user instruction changes the AI-only rule.

## 4. Required workflow

### Phase A — inventory and baseline

1. List every unique `.md` and `.txt` specification in the archive and read it fully.
2. Identify duplicates by content hash; maintain one canonical record per unique document.
3. Inspect root `package.json`, `tsconfig.json`, Vite config, `src/main.tsx`, `src/App.tsx`, `src/index.css`, all engine managers, data definitions, HUDs, modals, save/load code, and existing tests.
4. Establish baseline commands and results:
   - dependency installation (only if environment permits),
   - type check,
   - production build,
   - unit/integration tests,
   - archive integrity check.
5. Map runtime ownership and update order: renderer, scene, camera, player, physics, world/chunks, NPCs, trains, missions, UI, persistence.
6. Create `IMPLEMENTATION_TRACEABILITY_MASTER.md` with one row per requirement: source document + section, runtime owner, files changed, test ID, status.

### Phase B — convert prose into executable requirements

For every unique specification:
1. Extract each requirement as a small, testable acceptance criterion.
2. Mark it `IMPLEMENTED`, `PARTIAL`, `MISSING`, `CONFLICT`, or `NOT_APPLICABLE` based on actual root code inspection.
3. Identify dependencies and the single runtime owner.
4. Implement missing behavior in the real gameplay code.
5. Add tests or deterministic in-game diagnostics.
6. Update the traceability row only after verification.

Do not stop after reading a document, adding a note, creating a component, or making a visual mesh. A feature is complete only when its behavior is reachable in the game and connected to the correct game state.

### Phase C — implementation order

Implement in dependency order, not in the order files happen to appear:

1. **Build/runtime foundation:** compilation, Three.js renderer lifecycle, resize, frame delta, cleanup/disposal, error handling.
2. **Core physics and player:** collision/hitboxes, ground sampling, movement, camera ownership, interaction range, spawn safety.
3. **World and persistence:** protected zones, chunk streaming, terrain/biomes, POIs, world coordinates, LOD, save/load and migration.
4. **Home and compound:** authoritative floor plan, room geometry, stairs, doors, walls, gates, collision, spawn positions, backyard/pool/terrace, garage and medical/armory areas as specified.
5. **Vehicles and companions:** each requested vehicle's actual mount/drive/dismount physics and camera; passenger seating and companion actions.
6. **Railway:** track network, station geometry, AI train movement, braking, stopping, spacing, junctions, physical carriages/interiors, boarding, passenger exploration, announcements, HUD and basement dispatch room.
7. **NPCs and living world:** survivor rescue, dialogue, companion AI, wildlife, species, zombies, grounding, schedules and interactions.
8. **Survival gameplay:** inventory, crafting, storage, farming, hunting, recipes, items, base management and resource loops.
9. **Story and missions:** authoritative campaign, objective state machine, day transitions, dialogue/cinematics, rewards, failure/recovery, free-roam unlock and save persistence.
10. **UI/audio/mobile:** HUD, menus, map, phone, controls, overlap prevention, responsive layouts, audio and accessibility.
11. **Polish/performance:** LOD, bounded frame delta, object pooling where appropriate, cleanup, profiling and device QA.

This ordering is a guide; adjust only when code dependencies require it and document why.

## 5. Gameplay implementation requirements

### 5.1 Apartment / mansion / compound
- Implement the final authoritative building structure as actual traversable scene geometry, not a floor-plan description.
- Every room, floor, stair, landing, door, window, roof/terrace and service area must have correct dimensions, placement, lighting, collision and navigation where relevant.
- Player spawn must be inside the intended accessible area and must not intersect geometry.
- Doors and gates need state, interaction prompts, animation and synchronized colliders.
- Procedural zombies, wildlife, resources, vegetation and random props must respect protected compound footprints. Authored objects explicitly belonging inside the compound remain allowed.
- Keep garage vehicles, medical/armory features, pool and outdoor spaces consistent with the final specification.
- Verify all requested bathrooms/rooms/floors by scene inspection and automated geometry assertions where possible.

### 5.2 Railway simulation and passenger gameplay
- All trains are AI controlled. Remove or safely no-op legacy player-driving input paths.
- AI owns acceleration, braking, route progression, station approach, stopping position, dwell time, doors, announcements, departure and recovery.
- Enforce track direction, junction selection, train spacing, collision/clearance and no-overlap constraints.
- Preserve physical locomotives/carriages, connected couplers, doors, windows, roofs, floors, seats, interior collision and passenger walk-through.
- Boarding must not activate vehicle-driving mode. Passenger exit restores on-foot camera, avatar visibility and mobile controls.
- Passenger HUD exposes service, direction, speed, next station, arrival/departure state and exit only.

### 5.3 Basement train dispatch / control centre (latest user requirement)
- Place the dispatch/control room in the basement of the player's apartment. Remove the old first-floor control-room installation; do not remove the rest of the first floor or unrelated rooms.
- Build a dedicated room with a desk and **five displays**: one large wide central monitor, two small monitors on its left, and two small monitors on its right.
- The large screen must show a legible live-style board for six train services, including arrival and departure times.
- Include a railway network map with train positions/routes and station labels.
- Include per-train service ID, direction, condition/status, speed, distance travelled, distance remaining, current/next station, station where it will stop, estimated arrival and departure, delays/holding state and relevant warnings.
- Add keyboard-operable UI navigation and dispatch actions. Keyboard shortcuts must be contextual, visible in the interface, not conflict with movement/gameplay controls, and work with focus management. Provide mouse/touch alternatives.
- The console is an operations/monitoring interface, not a direct train-driving cockpit. Valid actions may include selecting a service, viewing route, reviewing timetable, requesting an AI dispatch hold/release, and acknowledging alerts, provided those commands are implemented in the AI service state machine.
- Use a typed data model and derive all displays from actual AI train state. Do not hard-code six fake trains or static times. If fewer than six services exist in a scenario, show inactive/unscheduled slots honestly.
- If live train telemetry is unavailable, label estimates/simulation values clearly. Never claim real-world railway integration.

### 5.4 Camera and cinematic lifecycle
- Use one explicit camera ownership mechanism for gameplay, first-person, passenger, vehicle, cinematic and observer modes.
- Every cinematic must release camera ownership and input locks on completion, skip, interruption, respawn, scene unload and error.
- Restore avatar visibility and correct follow camera after cinematic.
- Guard against invalid coordinates, detached cameras, unbounded delta and stale references.

### 5.5 Missions, story and save data
- Implement campaign progression as a persisted state machine, not a static catalogue.
- Objectives must be completable through actual interactions/gameplay and have clear prerequisites, state, rewards and failure/recovery behavior.
- Day transitions, dialogue, cutscenes, mission unlocks and free-roam transition must be connected.
- Add versioned save migration; do not erase existing user progress when adding fields or changing campaign data.
- Test fresh save, legacy save, interrupted mission, reload, and completed campaign paths.

### 5.6 World, NPCs, wildlife and survival
- Procedural systems must use shared world coordinates and protected-zone queries.
- NPC feet must align to sampled ground height on terrain, road, sidewalk, pads and slopes.
- Wildlife species need valid models, collision, movement, habitat/spawn rules and lifecycle cleanup; no unsupported species should be claimed as implemented.
- Survival resources, farming, hunting, recipes, storage and crafting must update the same authoritative inventory/persistence state.
- Avoid duplicate item registries and disconnected UI-only values.

### 5.7 UI, mobile and performance
- All controls must invoke real state transitions and show feedback.
- Prevent HUD/modal overlap across desktop and narrow Android screens; respect safe areas and touch target sizes.
- Keyboard shortcuts must not fire while typing in text inputs.
- Touch/mobile controls must remain usable while passenger, cinematic, menu and interaction states change.
- Dispose Three.js geometries, materials, textures, audio nodes, listeners and timers when owners are destroyed.
- Use bounded frame delta and avoid per-frame allocations in hot paths where practical.
- Do not trade away world detail or existing gameplay without profiling evidence.

## 6. Testing and acceptance gates

Run and report each gate separately. Never invent a PASS.

### Gate 1 — source/build
- `npm install` (or project package manager equivalent)
- TypeScript type check
- Production build
- Lint/test scripts if defined
- No unresolved imports, runtime console errors or missing assets

### Gate 2 — deterministic gameplay tests
- Player spawn and movement; all collision boundaries.
- Apartment floor/stair/door traversal and no fall-through.
- Gate animation and collider synchronization.
- Protected-zone spawn exclusion.
- Every vehicle's mount, movement, steering, braking and dismount.
- AI train station approach, stop, dwell, doors, departure, junction, blockage and safe spacing.
- Passenger boarding/exploration/exit without train-driving controls.
- Basement dispatch console shows actual six-service state and reacts to keyboard, mouse and touch.
- Cinematic completion/skip/interruption restores camera, avatar and controls.
- NPC/wildlife grounding and cleanup.
- Mission completion, day progression, rewards, reload and legacy save migration.
- Inventory/crafting/farming/hunting persistence.

### Gate 3 — visual/device QA
- Desktop at common aspect ratios.
- Android portrait and landscape.
- Low/medium device performance.
- UI overlap, text legibility, touch target size, camera clipping, scene traversal and loading.
- Long session with chunk transitions and save/reload.

### Gate 4 — delivery
- Re-run build and tests after the final edit.
- Verify archive with `unzip -t`.
- Deliver the **complete updated original project source ZIP**, not only patches or documentation.
- Include `IMPLEMENTATION_TRACEABILITY_MASTER.md`, `IMPLEMENTATION_CHANGELOG.md`, and `IMPLEMENTATION_TEST_REPORT.md`.
- Test report must clearly separate `PASS`, `FAIL`, `NOT RUN`, and `BLOCKED`, with command/device/method and evidence.
- List known limitations and every requirement that remains partial or unverified.

## 7. Definition of done

The task is done only when:
- Every unique applicable requirement from every specification document has a traceability row.
- Every `MISSING` requirement has been implemented or explicitly marked `BLOCKED` with a concrete reason.
- Every implemented feature is wired into the actual root gameplay runtime.
- No duplicate/parallel implementation was introduced.
- Existing features and save compatibility are preserved.
- Build and automated tests pass, and manual desktop/Android checks are reported honestly.
- The final ZIP contains the full active source and all updated documentation.

**Do not respond with a plan alone. Execute the work against the original source tree. If the environment cannot run or validate a step, state the exact blocker and continue with all independent work.**
