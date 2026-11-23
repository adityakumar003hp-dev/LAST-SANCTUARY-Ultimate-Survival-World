# LAST SANCTUARY — FINAL UI OVERLAP + MAXIMUM PERFORMANCE IMPLEMENTATION
## Google AI Studio implementation prompt

You are modifying the EXISTING LAST SANCTUARY project. Implement the changes directly in the current repository. Do not create a demo, replacement game, mockup, or disconnected sample. Preserve all existing survival systems, story/prologue, world, environments, wildlife, building/crafting, inventory, quests, save/load, vehicles, physics, audio, and desktop/mobile controls.

## PRIMARY GOALS
1. Eliminate overlapping, clipped, unreadable, or unreachable UI across mobile portrait, mobile landscape, tablet, and desktop.
2. Improve frame rate and input responsiveness as much as safely possible, especially on mid-range Android phones.
3. Keep the existing visual identity and gameplay. Do not remove features merely to improve performance.
4. Make measured, testable changes; do not claim performance gains unless verified.

## EXISTING PROJECT / FILES
The project is React 19 + TypeScript + Vite + Three.js. Start by inspecting the existing code and dependencies. Important areas include:
- `src/App.tsx`, `src/index.css`
- `src/components/HUD.tsx`
- `src/components/MobileControls.tsx`
- `src/components/VehicleHUD.tsx`
- `src/components/prologue/CinematicOverlay.tsx`
- `src/components/DialogueModal.tsx`
- `src/components/HordeAlertBanner.tsx`
- `src/engine/GameEngine.ts`
- `src/engine/Terrain.ts`
- `src/engine/WildlifeManager.ts`
- `src/engine/BuildingManager.ts`
- `src/engine/ZombieManager.ts`
- `src/engine/PlayerController.ts`
- `src/engine/rendering/AtmosphericSky.ts`
- `src/engine/audio/ContextSoundscapeManager.ts`

Inspect the real component hierarchy and CSS before editing. Reuse existing state, event handlers, controls, and engine lifecycle. Do not duplicate the HUD or create competing global overlays. Avoid broad rewrites when a targeted fix is safer.

---

# PART A — UI LAYOUT SYSTEM

## A1. Establish predictable responsive layers
Create or standardize a small set of layout layers:
- `game-canvas`: full available game viewport, behind all UI.
- `hud-top`: compact top status/navigation region.
- `hud-left` / `hud-right`: contextual widgets, only where needed.
- `mission-banner`: objective and current task.
- `cinematic-layer`: chapter cards and cinematic captions.
- `dialogue-layer`: narrator / dialogue captions.
- `hud-bottom`: status/inventory/action strip.
- `mobile-controls`: joystick and touch buttons.
- `modal-layer`: inventory, map, crafting, build menu, pause and other dialogs.
- `toast-layer`: temporary notifications.

Use a consistent z-index scale documented in CSS. Avoid arbitrary escalating z-index values. Modal layers must sit above HUD; cinematic cards must not accidentally cover essential active controls unless the current cinematic intentionally locks gameplay. Only one instance of each overlay should be rendered.

Use `position: fixed` or absolute positioning relative to a single game root only when appropriate. Ensure the game root has a known positioning context and `min-width: 0; min-height: 0; overflow: clip` where safe. Do not clip menus or modals that need scrolling.

## A2. Safe areas and viewport sizing
- Support Android/iOS safe areas with `env(safe-area-inset-top/right/bottom/left)`.
- Use `100dvh` with a fallback to `100vh`; avoid mobile browser address-bar jumps.
- Use `box-sizing: border-box` globally.
- Prevent accidental horizontal page scrolling.
- Account for landscape cutouts, rounded corners, browser/system bars, and notches.
- Do not rely on one fixed pixel layout. Use `clamp()`, `min()`, `max()`, percentages, flex/grid, and responsive breakpoints.
- Ensure UI stays inside the visible viewport when browser zoom or display scaling changes.

## A3. Fix the specific overlap types shown in the reference screenshot
- Top HUD buttons (bag/build/map/log/hero and scan/light/other actions): arrange into clearly separated compact groups. On narrow screens, use a collapsible/overflow menu or horizontally scrollable action strip rather than letting groups collide. Keep tap targets usable (prefer approximately 44 CSS px where space allows).
- Mission objective banner and “Skip Prologue”: put them in separate layout slots. On narrow screens, move Skip to a safe corner or a compact icon/button and never place it over objective text.
- Chapter title: center within the gameplay viewport, wrap naturally, use responsive typography such as `clamp()`, constrain width, and keep it from colliding with the objective banner. Add a subtle readable background/gradient if needed. Respect cinematic timing and dismissal logic.
- Narrator/dialogue caption: keep readable but compact, constrain width, wrap long lines, and position it above bottom controls. It must not cover the joystick or primary action buttons. If screen height is small, allow a compact caption mode or move it temporarily to a dedicated safe region.
- Bottom inventory/status strip: reserve a predictable region and avoid overlap with joystick, jump, sprint, interact, crouch, or action buttons.
- Mobile joystick and action buttons: use a responsive left/right control layout with safe-area padding. No buttons may overlap each other or important inventory/status elements. Keep touch controls visible and reachable in both portrait and landscape.
- Modal dialogs: center within the usable viewport, set `max-width`/`max-height`, use internal scrolling, and ensure close/confirm buttons remain reachable above the keyboard or system UI.
- Notifications, horde alerts, and objective prompts must not stack on top of each other indefinitely. Use a notification queue or distinct reserved positions where practical.
- Do not position every overlay using independent `bottom: 20px` or `top: 20px`; define shared layout slots and CSS variables.

## A4. Responsive breakpoints
Implement and test at minimum these viewports:
- 360 × 640 (small portrait phone)
- 390 × 844 (common portrait phone)
- 740 × 360 (small landscape phone)
- 844 × 390 (landscape phone)
- 1024 × 768 (tablet)
- 1366 × 768 (desktop)

On portrait mobile, prioritize gameplay visibility and reduce nonessential HUD density. On landscape mobile, keep controls separated at left and right edges and reserve the center for gameplay. On desktop, use the extra width without stretching buttons or captions excessively.

## A5. Accessibility and interaction
- Preserve keyboard support and all existing input bindings.
- Ensure touch controls use `touch-action: none` only on actual control surfaces, not the whole page.
- Avoid duplicate pointer/touch handlers that trigger an action twice.
- Use visible focus states, readable contrast, and appropriate `aria-label`s for icon-only buttons.
- Respect `prefers-reduced-motion`; never rely on animation alone to convey mission state.
- When a modal is open, avoid unintended gameplay input behind it. Restore focus/input correctly on close.

---

# PART B — PERFORMANCE OPTIMIZATION

## B1. Measure before and after
Add a development-only performance diagnostic (or reuse an existing one) that can report:
- FPS / frame time,
- renderer draw calls and triangle count if available,
- renderer pixel ratio,
- approximate active entities (wildlife, zombies, buildings/props where feasible),
- long frame warnings.

Do not display a permanent debug panel to normal players. Gate diagnostics behind development mode or a clear debug toggle. Avoid logging every frame.

Record a baseline before optimization when possible. Do not promise a specific FPS unless measured on a named device and scene.

## B2. Three.js renderer and render loop
Inspect the actual renderer initialization in `GameEngine.ts` and make conservative, configurable improvements:
- Cap device pixel ratio, especially on mobile (start with a configurable cap around 1.25–1.5 on mobile and around 1.75–2 on desktop, then validate visual quality and GPU load).
- Do not set a fixed low resolution for all devices. Adapt quality to device class and optionally frame-time feedback.
- Avoid creating new vectors, colors, materials, arrays, closures, or temporary objects every frame in hot loops; reuse scratch objects.
- Ensure there is only one active animation loop. Cancel it on teardown and avoid duplicate loops after restarting or changing scenes.
- Handle `visibilitychange` and pause rendering or reduce updates while the tab is hidden or the game is paused.
- Avoid unnecessary renderer resizing; update only when the actual viewport size changes.
- Do not render multiple times per frame unless explicitly required.
- Preserve color space, tone mapping, shadows, fog, and lighting unless profiling shows they are a major bottleneck. Any quality reduction must be configurable and reversible.

## B3. Geometry, materials, and scene objects
- Reuse shared geometries and materials for repeated trees, rocks, grass, debris, props, and structures where compatible.
- Use `InstancedMesh` for repeated compatible objects when it can be introduced without breaking per-object interaction/collision. Keep separate logical collision/interaction data as needed.
- Pool frequently spawned particles, projectiles, hit effects, and temporary props where practical.
- Dispose of geometries, materials, textures, render targets, and listeners when truly no longer used; do not dispose shared resources still used elsewhere.
- Avoid loading duplicate copies of the same asset.
- Add distance-based visibility/LOD for distant decorative objects. Preserve collision and mission-critical objects even if their render mesh is hidden.
- Frustum-cull objects correctly; do not disable culling globally.
- Avoid unnecessary real-time shadows for tiny/distant objects. Use a configurable mobile shadow quality profile; do not globally break lighting.
- Avoid rebuilding terrain meshes or scene-wide object lists every frame.
- Keep world appearance and gameplay readable. Do not replace the environment with empty terrain or random cubes.

## B4. Terrain, vegetation, buildings and wildlife
Inspect `Terrain.ts`, `BuildingManager.ts`, `WildlifeManager.ts`, `ZombieManager.ts`, and related systems:
- Use spatial partitioning, distance checks, or existing chunk/region systems to update only relevant nearby entities.
- Keep distant AI at a reduced update frequency while preserving believable movement and mission logic.
- Stagger expensive AI decisions across frames rather than updating every entity on the same frame.
- Keep essential threats, active missions, and nearby animals responsive.
- Avoid scanning every entity against every other entity each frame. Use spatial grids, buckets, or another suitable broad-phase approach where beneficial.
- Use squared-distance checks when only comparing distance thresholds.
- Reuse arrays/sets or scratch buffers in hot loops where safe.
- For vegetation, use instancing or merged meshes only when it does not break collision, chopping, harvesting, or interaction behavior.
- Do not deactivate entities that are in combat, in the current mission, or visible and close to the player.
- Maintain deterministic, correct collision and ground contact. Performance changes must not cause falling through terrain, missed hitboxes, or broken objective triggers.

## B5. Physics and input
- Inspect `UnifiedPhysicsManager.ts` and `PlayerController.ts`.
- Avoid duplicate raycasts/collision queries when the result can be safely reused for the same frame.
- Use a fixed or bounded physics timestep with a maximum catch-up step to prevent the spiral of death after a frame stall.
- Keep movement stable at varying frame rates; do not tie player speed directly to render FPS.
- Keep input responsive and do not throttle the player's own movement/control processing excessively.
- Avoid allocating new collision objects in tight loops.
- Preserve ground collision, building collision, vehicle handling, wildlife interactions, and existing controls.
- Do not change gameplay tuning without a clear need and regression tests.

## B6. Audio and ambient sound
- Inspect `ContextSoundscapeManager.ts`.
- Avoid starting duplicate ambient audio sources when the scene or component remounts.
- Suspend or reduce nonessential audio work while paused/hidden if compatible with current audio behavior.
- Preserve time-of-day soundscape, spatial wildlife audio, and bunker occlusion features.
- Avoid expensive per-frame audio parameter updates if the value has not meaningfully changed.

## B7. Quality settings
Add or refine a small graphics-quality setting if the project does not already have one:
- Auto (default; safe adaptive profile)
- Performance
- Balanced
- Quality

Profiles may adjust pixel ratio, shadow-map quality, particle density, distant foliage density, and nonessential effects. Do not disable essential gameplay objects, collision, mission logic, or core visual cues. Persist the player's preference using the project's existing settings/save mechanism where possible. Avoid creating a second conflicting settings store.

---

# PART C — IMPLEMENTATION SAFETY

1. Before editing, inspect the relevant code and identify existing systems that must be preserved.
2. Make changes directly in the existing files. Add a small helper module only if it reduces duplication and fits the architecture.
3. Do not rewrite `App.tsx`, `GameEngine.ts`, or the entire HUD wholesale unless the existing structure makes targeted changes impossible. If a refactor is required, keep it incremental.
4. Do not delete existing functionality, quest logic, story scenes, environments, animals, crafting, base building, vehicle features, saves, or audio.
5. Do not introduce new dependencies unless genuinely necessary.
6. Avoid placeholder handlers, fake settings, decorative controls that do nothing, or TODO-only implementations.
7. Do not silence TypeScript errors with broad `any`, `@ts-ignore`, or disabling strict checks.
8. Keep the project compatible with the existing package manager and scripts.
9. Do not modify secrets or `.env` values.
10. If a requested optimization risks visual/gameplay correctness, prefer correctness and explain the trade-off.

---

# PART D — REQUIRED VERIFICATION

Run the available project checks, at minimum:
- `npm run lint` (or the package manager's equivalent type-check script)
- `npm run build`

Fix any errors introduced by the changes. Do not claim a check passed unless it actually ran successfully.

Manually or with available browser/device tooling, inspect:
- all six viewport sizes listed above,
- prologue chapter title + objective + Skip button at the same time,
- narrator caption while joystick and action controls are visible,
- all major HUD buttons together,
- each modal open/close and internal scrolling,
- pause/resume and scene restart without duplicate loops/listeners,
- keyboard and touch controls,
- player collision, terrain contact, wildlife/zombie interactions, building interactions, and mission triggers,
- mobile quality profile and desktop quality profile.

If real device/browser testing is unavailable, explicitly list the checks that were not performed. Do not invent test results.

## ACCEPTANCE CRITERIA
- No overlapping interactive controls at the supported viewport sizes.
- Mission text, chapter title, narrator text, and Skip button remain readable and independently accessible.
- Joystick and action buttons do not cover each other or block important status UI.
- Modals remain inside the usable viewport and can scroll.
- No duplicate animation loops, event listeners, or ambient audio sources after restart/remount.
- No regression to gameplay mechanics, physics, objectives, saves, or story flow.
- Build and type-check succeed, or remaining pre-existing failures are clearly distinguished from new failures.
- Performance changes are justified by profiling or clear reductions in avoidable work, not unsupported claims.

## FINAL RESPONSE REQUIRED FROM YOU
After implementation, report:
1. Files changed and the reason for each.
2. Exact overlap fixes made.
3. Performance changes made and why they help.
4. Commands/tests actually run and their real results.
5. Any remaining known issues or device checks still required.
6. A concise list of changes that are configurable or reversible.

Now inspect the repository and implement this specification directly. Do not respond with only a plan or repeat this prompt. Make the actual code changes and verify them.
