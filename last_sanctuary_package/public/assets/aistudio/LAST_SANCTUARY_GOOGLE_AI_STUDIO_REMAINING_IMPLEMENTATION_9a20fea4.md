# LAST SANCTUARY — REMAINING IMPLEMENTATION & VALIDATION
## Google AI Studio handoff file | 4 November 2026

You are continuing an EXISTING React + TypeScript + Three.js game called **LAST SANCTUARY — Ultimate Survival World**. This is an implementation task, not a redesign, tutorial, mock-up, or feature proposal.

## 0. Mandatory working rules

1. Inspect the complete existing project before editing. Read `package.json`, `src/App.tsx`, `src/engine/GameEngine.ts`, `src/engine/PlayerController.ts`, `src/engine/world/AITrainManager.ts`, `src/engine/prologue/CinematicCameraManager.ts`, `src/engine/prologue/PrologueManager.ts`, `src/engine/prologue/TownLifeManager.ts`, `src/engine/physics/UnifiedPhysicsManager.ts`, the relevant HUD/mobile-control components, and the campaign data files.
2. Modify the existing systems in place. Do not create a second game, duplicate managers, parallel demo scene, fake buttons, static screenshots, or disconnected sample implementations.
3. Preserve all existing working content: world/chunk streaming, player movement, inventory, crafting, survival stats, weather/time, building, base, mansion/apartment, garage, friends, wildlife, zombies, railway network, save/load, mobile controls, UI, audio, and story content.
4. Before editing, map the actual runtime ownership and update order for renderer, scene, camera, player, NPCs, train manager, mission manager, and save/load. Follow the existing architecture.
5. Do not delete or rename public APIs unless every caller is updated. Do not silently remove features to make compilation pass.
6. Avoid broad `any` casts, placeholder TODOs, fake completion flags, and hard-coded success states. Add proper types and runtime state.
7. After every change, run the strongest available checks. Fix errors caused by your changes. Do not report a test as passed unless it was actually run.
8. Deliver the complete updated project source, not just snippets. Include a concise change log and a test report distinguishing PASS, FAIL, and NOT RUN.

## 1. Required train behaviour — every train is AI-controlled

The user's explicit requirement is: **all trains must be controlled by AI; the player must not drive any train.**

- Make every train service autonomous. Do not leave any locomotive or service player-drivable.
- Inspect all train definitions, legacy locomotive controls, boarding logic, vehicle-mode flags, mobile control routing, HUD state, keyboard handlers, and save/load state.
- Ensure all train definitions explicitly use `playerDrivable: false` (or the project's equivalent typed property).
- Disable/remove player throttle, reverse, steering, brake, horn, manual door, driver camera, and train-driving input paths. Legacy input handlers must safely no-op rather than accidentally move a train.
- Do not disable passenger interaction. The player can board, exit, sit/stand if supported, and freely explore train interiors while the train is moving.
- Ensure boarding a train does NOT activate vehicle-driving mode or hide the normal on-foot controls incorrectly.
- Train AI must own acceleration, braking, station approach, stopping, dwell time, door opening/closing, announcements, departure, route progression, and recovery from blocked/invalid states.
- AI trains must obey track direction, junctions, station stopping positions, collision/clearance rules, and spacing. Prevent trains from overlapping or teleporting through each other.
- Passenger HUD must show useful service information: train/service ID, direction, speed, next station, arrival/departure message, and an Exit action only. No driver controls.
- When the player exits, clear passenger/train HUD state and restore on-foot camera, avatar visibility, and mobile controls.
- Preserve all existing carriages, windows, doors, physical floors/walls/roofs, interior collision, carriage connections, announcements, and station assets.
- Resolve any contradictory old code or comments that still enable player driving. The AI-only requirement is authoritative.

## 2. Cinematic camera freeze and invisible player

The supplied Android screenshot shows a wide, elevated view of the meteorite/prologue area. The player avatar is not visible, while the HUD and interaction prompt remain active. The user reports that cinematic view freezes and they cannot see the player.

### Required implementation

- Trace every cinematic start, update, completion, skip, interruption, scene transition, player-control lock, and camera ownership change.
- Use one explicit camera ownership/state mechanism (or extend the existing one) so cinematic, player-follow, first-person, vehicle/passenger, and observer views cannot fight each other.
- Every cinematic must end deterministically:
  - Complete when its authored duration/last keyframe is reached.
  - On completion, release cinematic ownership and all associated control locks.
  - On skip, perform the same cleanup path as normal completion.
  - On interruption, scene unload, respawn, or error, restore a valid gameplay camera and player control.
- Do not depend on a React render or a one-time callback to restore camera state. Ensure cleanup also happens if the cinematic component/manager is disposed.
- Restore the gameplay camera to a valid player-follow pose using the player's current world position and rotation. Avoid snapping to a stale camera target or a point far above the terrain.
- Validate camera vectors and transforms. If target/camera values are non-finite or the camera is excessively far from the player, recover to a safe follow pose.
- Ensure the player mesh is visible in third-person/on-foot gameplay after cinematic exit. First-person may hide the body intentionally, but third-person must not inherit a stale `visible = false` from a cutscene, train, or vehicle.
- Do not render the player twice. Ensure the player model and shadow are correctly attached to the active scene and visibility is restored after transitions.
- Keep camera collision/obstruction handling and mobile touch-orbit controls functional.
- Make cinematic camera updates use frame delta time, not a fixed assumed frame rate. Clamp large delta spikes after backgrounding/resume.
- Ensure the camera follows the actual player entity, not an NPC, meteorite, waypoint, or old spawn transform.
- Add a small recover-camera action or safe automatic recovery if camera ownership becomes invalid. It must not reset player position or mission progress.

### Acceptance checks

1. Start a cinematic and allow it to finish: gameplay camera follows player; third-person avatar is visible.
2. Start and skip a cinematic: same result.
3. Complete a cinematic, enter and exit a train, then return to walking: avatar visible and camera follows player.
4. Switch first-person → third-person: body appears in third-person.
5. Pause/resume or background/foreground the Android browser: camera does not remain frozen.
6. No camera teleport to sky, origin, or old cinematic target.

## 3. Park NPC floating fix

The user reports NPCs floating above the ground near the park. A previous patch attempted to ground park residents to the authored park grass pad. Verify this in the actual runtime; do not assume that patch is sufficient.

- Identify every park NPC spawn path, including initial town population, respawn, pooled NPC reuse, LOD recreation, save/load restoration, and wandering/idle animation.
- Ground NPCs against the actual collidable park surface or a reliable ground query at their X/Z position. Do not use an unrelated terrain height if the park has an authored raised pad.
- Use a downward raycast or the project's equivalent ground query, with an appropriate collision layer/filter so the NPC does not hit its own collider, props, trees, benches, or decorative meshes.
- Account for each character model's origin/pivot and foot offset. The bottom of the feet must contact the walkable surface; do not set the model origin to ground if its pivot is at the hips.
- Apply the same grounding rule after spawn, movement, animation, respawn, pool reuse, and save/load restore.
- If a ground query fails, keep the NPC at its last valid grounded position or use the known park pad height. Never assign `NaN`, infinity, or an arbitrary world Y.
- Ensure NPC movement/navigation remains on walkable ground and does not cause vertical drift. Do not continuously snap NPCs through stairs or raised platforms.
- Add a debug-only optional ground-contact visual/logging mode to diagnose foot height without affecting normal gameplay.

### Acceptance checks

1. Observe every park NPC at initial load: feet touch grass/pavement.
2. Wait while NPCs wander, idle, animate, and turn: no vertical drift.
3. Leave the area and return so NPCs are pooled/recreated: still grounded.
4. Save and reload near the park: still grounded.
5. NPCs can use park paths/steps where present without being forced through the floor.

## 4. Mission campaign — replace grouped auto-completion with real objective progression

The project has an eight-day / 56-mission catalogue. Current notes indicate Days 1–6 may be marked complete together when the existing prologue ends. Replace that shortcut with real, persistent objective tracking.

- Preserve the existing story and sequence. Do not remove the prologue, companions, meteorite sequence, railway story, military base, farming, mansion, or final expedition.
- For each mission, track objective IDs, prerequisites, activation conditions, completion conditions, rewards, and next mission.
- Complete an objective only after its actual world interaction/event succeeds. Do not mark all Day 1–6 objectives complete from a single prologue completion callback.
- Keep mission state persistent through save/load and app refresh.
- Make objective updates idempotent so an event cannot award duplicate rewards or complete the same objective repeatedly.
- If an existing save has the old grouped completion flag, migrate it safely: preserve the user's completed story state, but do not fabricate detailed historical objective completion where no data exists. Mark unverifiable older objectives as legacy-completed or migrated with a clear migration marker, and make future progression granular.
- Keep free roaming available. The user must not be forced to follow the objective marker or sleep on a timer.
- Ensure Days 7–8 mansion/railway mission triggers remain connected to real interactables, not just proximity text.
- Show current mission, active objective, progress, and completion feedback in the existing HUD/Quest Journal.
- Add safe fallbacks for missing quest IDs or older save versions.

### Acceptance checks

- Start a fresh save and progress through Days 1–6: each mission advances from its own objective completion.
- Reload during an active mission: current objective and progress are retained.
- Complete the same interaction twice: no duplicate reward.
- Load an older save: no crash, lost inventory, or forced restart.
- Days 7–8 still unlock through the intended story conditions and remain completable.

## 5. Full runtime/build validation

The current handoff status says a dependency-backed production build and live Android/browser test have not yet been completed. Complete them in Google AI Studio's environment.

- Install dependencies using the project's lockfile and package manager. Do not replace dependency versions casually.
- Run the package's production build script and TypeScript check/lint script.
- Fix all compile/type errors introduced by the implementation. Separate pre-existing errors from new ones in the report.
- Run the game in browser preview. Inspect console errors, failed asset requests, renderer errors, and unhandled promise rejections.
- Test Android-sized viewport and touch controls, including joystick, jump, sprint, interact, camera orbit, inventory, map, quest journal, train boarding/exiting, and pause/resume.
- Test save → reload → restore for player position, inventory, mission state, train passenger state, and parked vehicles.
- Check frame-rate and memory stability while moving between streamed chunks and near the park, railway, mansion, and military base.
- Check that chunk unload/reload does not duplicate NPCs, trains, props, or interactables.
- Verify collision at train carriage connections, station platforms, mansion doors/stairs, park surfaces, and protected-zone boundaries.
- Do not claim mobile testing if only desktop emulation was used. State exactly which device/viewport and browser were tested.

## 6. Required test report

Create `LAST_SANCTUARY_REMAINING_WORK_TEST_REPORT.md` containing:

- Build command and exact result.
- Typecheck command and exact result.
- Browser preview test environment.
- Android device/viewport and browser, if actually tested.
- Train AI-only acceptance results.
- Cinematic completion/skip/recovery results.
- Third-person player visibility results.
- Park NPC grounding results, including respawn and save/load.
- Mission progression and migration results.
- Save/load and chunk streaming results.
- Known remaining issues, each with affected file/system and reproducible steps.

Use only these statuses: `PASS`, `FAIL`, `NOT RUN`, `BLOCKED`.
Never label a static source inspection as a runtime pass.

## 7. Required delivery

Return:
1. The complete updated project source/archive.
2. `LAST_SANCTUARY_REMAINING_WORK_TEST_REPORT.md`.
3. A concise change log listing exact files changed and why.
4. A list of anything still blocked or not run.

Do not return only this prompt, a feature checklist, or isolated code snippets. Implement the changes in the existing project and verify them.
