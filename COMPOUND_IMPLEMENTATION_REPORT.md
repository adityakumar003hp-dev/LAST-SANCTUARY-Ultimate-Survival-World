# LAST SANCTUARY: REBIRTH — Compound implementation report

## Scope

This patch modifies the existing React 19 / Three.js 0.187 / TypeScript / Vite game source. It does not replace the game or create a standalone demo. Existing campaign, railway, world, player, survival and save code has been retained.

## Implemented in source

- **Compound footprint:** 100 m × 126.5 m (12,650 m²), exactly 5× the documented 44 m × 57.5 m baseline (2,530 m²). The protected procedural-spawn zone has been synchronized to the perimeter bounds.
- **Three principal buildings:** the Player Mansion (including its attached wings and existing residential/medical/armory/farming/utility/rooftop content), a detached four-level Railway Command Centre, and a detached four-bay Vehicle Garage.
- **Five perimeter gates:** one main gate, west and east pedestrian gates, a south vehicle gate and a north vehicle gate. Each has an interaction, animated visual state, collision state, command-console control and save/restore state. Companion navigation now considers all five openings.
- **Twenty perimeter towers:** ten on each side, with collidable tower bodies, camera housings, searchlights and alarm-beacon visuals. Tower `userData` identifies the CCTV, searchlight, motion-sensor and alarm systems.
- **Twenty armed sentry turrets:** 20 explicit placements, 42 damage per hit, burst fire, ammunition/health/kill telemetry and save/restore. Wildlife is no longer a valid turret target.
- **Hostile-only targeting:** zombies are treated as the existing hostile NPC class. Other NPC/faction targets are accepted only through `registerHostileFactionTarget`, which requires a non-empty faction ID, explicit `allegiance: 'hostile'`, a living target and a non-player identity. Player, friendly, neutral and unknown-allegiance targets are rejected. The target is checked again before damage; projectile tracers do not apply a second hit.
- **Command Centre interior:** segmented exterior shell instead of a solid blocking box, four floor slabs, collision-backed stair flights, a working floor-cycle elevator interaction, dispatch/research computer terminals and access to the existing Railway Operations UI.
- **Vehicle Garage:** segmented walls leave four actual vehicle bays. The requested Aegis armored SUV, Enduro motorcycle, mountain bicycle and Military Enforcement Vehicle are placed in the four bays. The military vehicle has a visible game-only remote weapon station model.
- **Security console:** shows all turret telemetry, five gate states and the hostile-only rules of engagement.
- **Persistence:** compound gate states, garage shutter state and turret ammunition/health/kill counters are added as an optional versioned save field. Older saves without the field continue to load with defaults.
- **Courtyard:** low planted landscaping remains; tree/bench park-style dressing was removed.

## Important source limitation

The supplied project has a zombie hostile-NPC system and friendly settlement NPC systems, but no active hostile human-faction NPC manager was found in the source. The faction-target adapter is implemented; an enemy-faction actor system must call `ApartmentBuilding.registerHostileFactionTarget(...)` for its hostile actors to be engaged. Until then, the live turret target source is the existing zombie manager. Friendly settlement NPCs are not registered and cannot be selected.

The Military Enforcement Vehicle's mounted weapon station is currently a visual/gameplay metadata model; this patch does **not** add a vehicle weapon firing control or a separate damage/projectile system for that vehicle.

Tower cameras, searchlights and alarm beacons have scene visuals and system metadata. The existing SecurityManager remains intact; this patch does not add a new per-tower CCTV feed or wire each motion sensor independently into the alarm manager.

## Validation

| Check | Result |
|---|---|
| Compound static validator (`npm run validate:compound`) | PASS — 11/11 (includes runtime/placement regression checks) |
| Existing campaign/project validator (`node scripts/validate-project.mjs`) | PASS — 7/7 |
| TypeScript/TSX syntax transpilation (139 source files) | PASS — 0 syntax errors |
| Full TypeScript typecheck | BLOCKED — project dependencies are not installed; Vite type packages are unavailable |
| Vite production build | BLOCKED — `node_modules` is absent; dependency installation timed out in this environment |
| Browser gameplay, collision, NPC navigation and save/reload testing | NOT RUN — requires running the project in Google AI Studio or a local browser after installing dependencies |

The static checks validate source declarations and wiring, not live runtime behaviour. Run `npm install`, then `npm run lint`, `npm run build` and `npm run validate:compound` in Google AI Studio before publishing. In-game, test every gate from both sides, all four command-centre floors, the four garage bays, and friendly-fire exclusion with a hostile faction actor registered through the adapter.


## Runtime and placement hotfix (2026-11-25)

- Fixed the turret update runtime exception `ReferenceError: wildlifeMgr is not defined`: the update method's declared `_wildlifeMgr` parameter is now passed consistently to the projectile update helper. The helper remains visual-only and does not apply duplicate damage.
- Fixed both checkpoint placement warnings by moving each boom-gate pedestal 0.25 m outward from its checkpoint booth. The resulting horizontal clearance is 0.175 m, eliminating the previous 0.075 m intersection while keeping the boom pivot and beacon aligned.
- Added regression checks for both defects to `scripts/validate-compound.mjs`.
