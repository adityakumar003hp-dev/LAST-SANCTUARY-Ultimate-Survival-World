# LAST SANCTUARY: REBIRTH
## Complete Apartment Building, Four-Floor Interior, Armory, and Living-Species Repair
### Google AI Studio / Three.js / TypeScript implementation specification

**Integration rule:** Implement this inside the existing LAST SANCTUARY: REBIRTH project. This is an additive integration, not a replacement game or a standalone demo. Preserve all existing pages, assets, controls, story progression, save data, wildlife systems, physics, chunk streaming, NPCs, and UI unless a specific change below requires a compatible extension. Do not delete or rename existing systems.

---

# 1. Primary objectives

Implement and verify these connected features:

1. Repair the apartment building so its interior is fully visible and explorable.
2. Build four connected floors with a continuous staircase.
3. Furnish and make the first-floor essentials interactable.
4. Give the second floor grey walls and the first floor white walls.
5. Build a rooftop swimming pool on the fourth floor.
6. Build a third-floor fictional game armory with exactly 100 distinct inventory entries, including the requested AK-style, MP5-style, MP-45-style, launcher-style, minigun-style and laser-gun-style entries.
7. Audit and repair every existing living-species definition, model, scale, collision, animation, AI state, spawning, despawning, and persistence path.
8. Keep all systems compatible with existing story, player controls, physics, save/load, and chunk streaming.

Do not claim the implementation is complete merely because meshes are visible. Every required interaction and system must be connected to the existing game loop and save system.

# 2. Mandatory project inspection before editing

Before changing code:

- Inspect the full source tree and current entry points.
- Locate the existing apartment/building generator, interior visibility and material systems.
- Locate player movement, camera collision, physics/collider registration, interaction prompts, inventory, item definitions, save/load, chunk streaming and objective navigation.
- Locate all species registries, species models, wildlife managers, AI/state logic, animation systems, spawn rules, collision layers and persistence.
- Search for duplicate apartment, wildlife, item or inventory implementations before adding anything.
- Reuse current systems and naming conventions. Do not create a second GameEngine, WildlifeManager, PhysicsManager, inventory or save manager.
- If an equivalent feature already exists, repair and extend it instead of duplicating it.
- Do not replace the existing world with a test scene.

# 3. Apartment building architecture

Create one persistent four-floor apartment building in the existing starting-city location.

## 3.1 Building layout

Use a shared coordinate system and a single building root/group. Define floor elevations from a central configuration rather than scattering hard-coded heights throughout the code.

Suggested logical layout:
- Floor 1: main living floor.
- Floor 2: secondary living floor with grey walls.
- Floor 3: fictional armory and inventory storage.
- Floor 4: rooftop swimming-pool level.

Each floor must have:
- A continuous walkable floor surface.
- Exterior and interior walls with correct thickness.
- Door and window openings.
- Door frames and functional doors where supported.
- Correct ceiling/roof separation so the camera can see the current interior.
- Stairs/landing openings aligned with the staircase.
- Collision surfaces matching the visible geometry.
- Floor labels or subtle wayfinding signs.
- Interior lights connected to the game's lighting/time-of-day system.

## 3.2 Fix invisible interior bug

The apartment's essential objects and room interiors must not disappear when the player enters.

Inspect and fix all likely causes rather than hiding the whole building:
- Incorrect render order or depth-write/depth-test settings.
- Opaque exterior shell covering interior geometry.
- Incorrect material side (front/back/double-sided) or normals.
- Incorrect visibility flags, layer masks, frustum culling or parent visibility.
- Incorrect camera near/far clipping planes.
- Interior meshes positioned inside walls or at the wrong scale.
- Z-fighting between floor, ceiling, walls and furniture.
- Incorrect chunk visibility or building LOD logic.
- Interior objects being disposed when the player enters or leaves a chunk.

Required behavior:
- Outside view: exterior building looks complete.
- When the player enters: the camera must see the room and furniture.
- Use a camera-aware interior visibility solution: hide or fade only the wall/roof sections that obstruct the current camera view. Do not make all walls permanently invisible.
- When the player changes rooms or floors, restore the appropriate wall/roof visibility smoothly.
- Prevent furniture and essential props from flickering or vanishing.
- Keep lighting, shadows and collision stable when visibility changes.
- If a roof cutaway is used, keep the roof visible from exterior angles and hide only obstructing sections for interior camera views.
- Test both first-person and third-person camera modes if both exist.

## 3.3 Floor 1 — white-wall living area

Use clean white painted walls, realistic but performance-conscious materials, visible baseboards, doors and windows.

Include:
- Bedroom with a bed, pillow, blanket and bedside table.
- Working television with an on/off interaction and a simple screen state.
- Refrigerator with an open/close interaction and food-storage inventory UI.
- Mobile phone prop with an interaction to open a fictional in-game phone interface if the game supports one.
- Sofa and small table.
- Basic kitchen counter and cabinets.
- Sink and simple kitchen props.
- Storage cupboard.
- Ceiling lights and suitable lamps.
- Working ceiling fan with visible rotation and an on/off interaction.
- Air conditioner mounted on a wall, with on/off and simple fan/cooling state.
- Basic necessities such as water, food containers, first-aid supplies and hygiene props as non-consumable decoration or existing inventory items where supported.

Do not add real-world phone services, external network calls or unnecessary APIs. The phone is an in-game prop/interface.

Interactions:
- Bed: rest/sleep interaction only if compatible with the existing day/night and save systems.
- TV: switch on/off; show a simple local in-game screen or broadcast state.
- Refrigerator: open/close and view a simple storage interface.
- Fan and AC: toggle states and appropriate sound/visual effects.
- Lights: toggle where appropriate, while retaining a default lighting state.
- Mobile: open/close a local in-game device UI if available.

All interactions must use the existing interaction framework. Do not add inert buttons.

## 3.4 Floor 2 — grey-wall floor

- Use clearly grey painted walls, visually distinct from Floor 1.
- Include believable rooms and basic furniture without overcrowding.
- Add working lights, doors, windows and correct collision.
- Use the same camera-aware wall/roof visibility solution.
- Keep this floor accessible by the shared staircase.
- Do not accidentally apply the grey material to Floor 1.

## 3.5 Floor 3 — fictional game armory

Create a clearly labelled fictional armory room for game inventory and equipment collection.

Visual requirements:
- Secure-looking lockers, display racks, shelves and labelled storage cabinets.
- Distinct display slots for the 100 entries in the catalogue below.
- Item icons and names in the inventory UI.
- Category and rarity labels.
- Quantity/count display for ammunition inventory entries.
- Locked/unlocked state and collection status.
- Safe fictional pickup/store interaction.
- No real-world weapon assembly, ammunition manufacturing, modification, tactical instruction or real weapon operating details.

Important data model:
- Treat every catalogue row below as a distinct fictional game inventory definition.
- Weapon-like entries are fictional visual/gameplay archetypes, not real-world technical replicas.
- Ammunition entries use fictional energy cells, generic cartridges or abstract game tokens. Do not specify real cartridge dimensions, propellant, projectile construction, pressure, manufacturing, weapon conversion or real-world performance.
- Keep all effects stylized and non-graphic.
- The armory is a game inventory location, not a real-world guide.

### 100 distinct fictional armory inventory entries

Use exactly 100 unique IDs. Each entry must have a stable ID, display name, category, rarity, icon key, description, stackability, and any existing game-compatible cosmetic/gameplay metadata. Do not invent technical specifications.

**A. Fictional weapon display entries (1–30)**

1. `armory_001` — AK-Style Field Rifle (fictional visual archetype)
2. `armory_002` — MP5-Style Compact Blaster
3. `armory_003` — MP-45-Style Compact Blaster
4. `armory_004` — Pulse Carbine
5. `armory_005` — Scout Energy Rifle
6. `armory_006` — Long-Range Ion Rifle
7. `armory_007` — Burst Pulse Rifle
8. `armory_008` — Arc Projector
9. `armory_009` — Plasma Repeater
10. `armory_010` — Stun Projector
11. `armory_011` — Minigun-Style Rotary Energy Prop
12. `armory_012` — Fictional Heavy Launcher
13. `armory_013` — Signal Flare Launcher
14. `armory_014` — Foam Utility Launcher
15. `armory_015` — Laser Sidearm
16. `armory_016` — Dual Laser Sidearms
17. `armory_017` — Ion Pistol
18. `armory_018` — Pulse Pistol
19. `armory_019` — Compact Arc Tool
20. `armory_020` — Cryo Tagger
21. `armory_021` — Sonic Disruptor
22. `armory_022` — Shield Emitter
23. `armory_023` — Repair Beam Tool
24. `armory_024` — Survey Scanner
25. `armory_025` — Hologram Decoy Projector
26. `armory_026` — EMP Pulse Device
27. `armory_027` — Gravity Pulse Tool
28. `armory_028` — Drone Controller
29. `armory_029` — Rescue Beacon Launcher
30. `armory_030` — Experimental Light Projector

**B. Fictional ammunition and energy supplies (31–60)**

31. `armory_031` — Standard Game Ammo Pack
32. `armory_032` — Compact Blaster Ammo Pack
33. `armory_033` — Heavy Blaster Ammo Pack
34. `armory_034` — Pulse Energy Cell
35. `armory_035` — Large Pulse Energy Cell
36. `armory_036` — Laser Energy Cell
37. `armory_037` — Ion Energy Cell
38. `armory_038` — Arc Energy Cell
39. `armory_039` — Plasma Energy Cell
40. `armory_040` — Stun Energy Cell
41. `armory_041` — Rotary Energy Belt (abstract game item)
42. `armory_042` — Launcher Charge Pack (fictional)
43. `armory_043` — Signal Flare Pack
44. `armory_044` — Foam Canister Pack
45. `armory_045` — Cryo Tag Cartridge (fictional)
46. `armory_046` — Sonic Pulse Cell
47. `armory_047` — EMP Energy Cell
48. `armory_048` — Shield Recharge Cell
49. `armory_049` — Repair Charge Cell
50. `armory_050` — Scanner Battery
51. `armory_051` — Drone Power Cell
52. `armory_052` — Beacon Charge
53. `armory_053` — Hologram Charge
54. `armory_054` — Gravity Energy Cell
55. `armory_055` — Universal Energy Pack
56. `armory_056` — Emergency Supply Pack
57. `armory_057` — Rare Energy Core
58. `armory_058` — Common Energy Cell
59. `armory_059` — Unstable Fictional Power Cell
60. `armory_060` — Recovered Supply Cache

**C. Protection, utility and support equipment (61–80)**

61. `armory_061` — Light Protective Suit
62. `armory_062` — Heavy Protective Suit
63. `armory_063` — Explorer Helmet
64. `armory_064` — Respirator Mask
65. `armory_065` — Protective Gloves
66. `armory_066` — Reinforced Boots
67. `armory_067` — Portable Shield Pack
68. `armory_068` — Emergency Medical Kit
69. `armory_069` — Field Bandage Pack
70. `armory_070` — Antiseptic Supply Kit
71. `armory_071` — Water Filter
72. `armory_072` — Portable Water Container
73. `armory_073` — Ration Pack
74. `armory_074` — Repair Toolkit
75. `armory_075` — Portable Generator Cell
76. `armory_076` — Flashlight
77. `armory_077` — Night-Vision Game Goggles
78. `armory_078` — Signal Radio
79. `armory_079` — Tracking Scanner
80. `armory_080` — Rescue Drone

**D. Rare, experimental and collectible game items (81–100)**

81. `armory_081` — Prototype Pulse Core
82. `armory_082` — Ancient Energy Relic
83. `armory_083` — Aurora Laser Core
84. `armory_084` — Quantum Battery
85. `armory_085` — Void Energy Cell
86. `armory_086` — Solar Recharge Module
87. `armory_087` — Bio-Signal Scanner
88. `armory_088` — Wildlife Tracking Beacon
89. `armory_089` — Habitat Restoration Kit
90. `armory_090` — Emergency Shelter Beacon
91. `armory_091` — Portable Barrier Emitter
92. `armory_092` — Rescue Flare
93. `armory_093` — Recon Camera Drone
94. `armory_094` — Holographic Map Projector
95. `armory_095` — Advanced Repair Core
96. `armory_096` — Rare Shield Core
97. `armory_097` — Prototype Energy Projector
98. `armory_098` — Celestial Supply Token
99. `armory_099` — Golden Armory Collectible
100. `armory_100` — Last Sanctuary Master Cache

### Armory inventory behavior

- Store the catalogue in one canonical registry; do not duplicate definitions in UI components.
- Validate that there are exactly 100 entries and all IDs are unique.
- Display all 100 entries in a scrollable/grid inventory catalogue.
- The room may show selected physical display props while the UI exposes the complete catalogue.
- Items may be locked until story progression or exploration unlocks them.
- Pickup, storage, transfer and quantity changes must go through the existing inventory service.
- Persist ownership, quantities, unlocks and display states through the existing save system.
- Prevent duplicate pickup rewards after reload or chunk re-entry.
- Do not grant every item automatically unless the existing progression design explicitly calls for it.
- Add a clear empty-state, full-inventory message and invalid-item handling.
- Use non-graphic, stylized effects and abstract gameplay attributes only.

## 3.6 Floor 4 — rooftop swimming pool

- Build a rooftop pool with visible water surface, pool basin, coping, deck and safety railings.
- Provide safe access from the staircase landing.
- Add pool lighting and appropriate reflections only if supported by the current renderer/performance budget.
- Add water entry/exit and swimming interaction by reusing the existing water/swimming physics system.
- Ensure the player cannot walk through the pool floor or fall through the roof.
- Add a ladder or steps for entering and exiting the pool.
- Add pool collision boundaries and water-volume detection.
- Do not allow the player to become trapped in the water.
- Keep the rooftop and pool persistent across chunk unload/reload.

# 4. Staircase connecting all floors

Build one continuous staircase from Floor 1 to Floor 4.

Requirements:
- Every flight connects to a landing at the correct floor elevation.
- Stair width is sufficient for the player capsule and camera.
- Use visible steps, handrails and landing platforms.
- Collision must match the visible steps or use a tested walkable ramp collider with visually modelled steps.
- The player must be able to walk up and down without jumping, snagging, sliding uncontrollably or falling through.
- Keep head clearance and camera clearance at every landing.
- Add lighting along the stairwell and clear floor-number signs.
- Use the existing player controller and physics manager; do not create a separate movement system.
- Test ascending and descending with keyboard, touch controls and controller input if supported.

# 5. Repair ALL living species

This is a whole-registry audit, not a sheep-only addition.

## 5.1 Build a canonical species audit

Enumerate every species currently supported by the game, including where present:
- Mammals: domestic, wild, grazing, predator and small mammals.
- Birds: ground birds, flying birds, water birds and scavengers.
- Reptiles and amphibians.
- Fish and other aquatic species.
- Insects and small creatures.
- Dinosaurs and other prehistoric species.
- Any special, rare, story-specific or biome-specific creatures.

Do not invent a claim that a species exists if it is not in the source registry. Produce a report listing:
- Species ID and display name.
- Model/asset source.
- Base scale and scale variation.
- Collision dimensions.
- Movement type and speed range.
- Animation/state coverage.
- Biome and spawn rules.
- AI behavior profile.
- Save/persistence status.
- Missing or failing components.

## 5.2 Species model and scale correction

For each species:
- Use consistent world units and a documented scale convention.
- Correct models that are too large, too small, floating, buried, rotated incorrectly or offset from their origin.
- Keep body proportions appropriate to the species' model asset; do not apply one global scale to all animals.
- Apply scale exactly once. Avoid multiplying scale in both the model loader and spawn manager.
- Normalize forward direction and ground-contact point.
- Verify feet, hooves, fins or body contact against the ground/water.
- Use low-cost LODs for distant creatures and restore detail nearby.
- Do not resize the player or unrelated world objects to compensate for animal scale errors.

## 5.3 Collision and physics

- Give every physical species a collider derived from its actual model bounds and movement posture.
- Register/unregister colliders with the existing unified physics/collision manager.
- Ensure collision follows movement and animation without jitter.
- Use appropriate collision layers for player, wildlife, environment and triggers.
- Small creatures should not use oversized colliders.
- Flying creatures should not be forced to collide with the ground continuously.
- Aquatic creatures should use water-volume logic rather than land-ground collision.
- Avoid expensive per-frame full-world collision checks.
- Use spatial partitioning or the existing broad-phase system.
- Prevent ghost collisions after an animal despawns or its chunk unloads.
- Clean up colliders, animation resources, audio and event subscriptions when entities are disposed.

## 5.4 AI, animation and species behavior

Preserve existing AI states and extend only where missing. Reuse the current WildlifeManager and central update loop.

Check:
- Idle, roam, rest and feeding behavior.
- Flee/avoid behavior where appropriate.
- Herd/flock/school grouping where appropriate.
- Predator/prey behavior only where already supported and suitable for the game's design.
- Water entry/exit and swimming for aquatic species.
- Flight takeoff/landing for flying species.
- Nesting, young-following and protective behaviors only where already supported.
- Animation transitions without snapping or repeated state resets.
- No animal should remain stuck in one state indefinitely.
- No invalid position, NaN velocity, infinite speed or unbounded animation delta.
- Respect pause state, game speed and frame delta.

Do not force every species to share identical behavior. Use species-specific profiles and capabilities.

## 5.5 Spawn, chunk streaming and persistence

- Preserve deterministic spawn behavior where the existing world uses deterministic seeds.
- Prevent duplicate animals when a chunk is loaded more than once.
- Restore saved/discovered wildlife state when a chunk is revisited.
- Use active simulation near the player and low-cost abstract simulation at a distance if the project supports it.
- Do not claim distant animals are fully simulated if they are only despawned.
- Keep story-critical or player-named creatures persistent according to existing save rules.
- Cleanly unload temporary entities and restore persistent entities.
- Ensure wildlife does not spawn inside buildings, walls, the player, water where unsuitable, or blocked terrain.
- Respect biome, climate, time-of-day and existing spawn constraints.
- Ensure species registries have unique IDs and valid model references.

## 5.6 Species validation report

Create a developer-visible audit output or diagnostic report showing:
- Total species in registry.
- Valid and invalid model references.
- Duplicate IDs.
- Missing scale/collider/animation/AI definitions.
- Spawn validation failures.
- Persistence failures.
- Runtime errors and warnings.

Do not silently skip broken species. Log a clear species ID and reason, and use a safe fallback model only when appropriate.

# 6. Technical integration architecture

Adapt names to the actual repository; these are responsibilities, not instructions to create duplicate managers.

- ApartmentBuilding/ApartmentInterior: owns building geometry, floors, rooms and visibility state.
- ApartmentInteractionController: routes TV, fridge, bed, fan, AC, lights, doors and phone interactions through the existing interaction system.
- StaircaseController or shared geometry builder: constructs stair flights, landings and collision.
- RooftopPoolController: handles pool bounds, water volume and safe entry/exit.
- ArmoryCatalog: canonical registry of exactly 100 unique entries.
- ArmoryInteractionController: reads/writes inventory through the existing inventory service.
- SpeciesAudit: validates the current canonical species registry.
- WildlifeManager: remains the owner of wildlife simulation; extend it rather than duplicating it.
- UnifiedPhysicsManager: remains the owner of world/player/wildlife collision integration where appropriate.
- Existing SaveManager: persists apartment state, armory state and wildlife state.

Do not create these classes if equivalent classes already exist. Prefer small extensions to current systems.

# 7. Save/load requirements

Persist:
- Apartment building discovery and unlocked access.
- Door states where relevant.
- TV, fan, AC and light states if the existing game saves world interactions.
- Refrigerator storage contents if connected to inventory.
- Armory item unlocks, ownership and quantities.
- Pool state only if it can change.
- Persistent wildlife identity/state where supported by the current world model.

On load:
- Validate saved data and supply safe defaults for older saves.
- Migrate old save versions without deleting user progress.
- Do not duplicate armory items or wildlife entities.
- Rebuild transient meshes and colliders from saved logical state.
- Do not save transient render objects, Three.js meshes or runtime references directly.

# 8. Performance and mobile compatibility

- Reuse geometry/materials where safe.
- Use instancing for repeated armory props, lights or small decorative objects where appropriate.
- Avoid creating new materials every frame.
- Dispose of resources correctly.
- Use reasonable shadow settings and LODs.
- Keep touch controls and mobile camera behavior unchanged.
- Avoid excessive transparent materials for the apartment cutaway.
- Ensure the four floors and 100-item catalogue do not cause a major frame-rate drop.
- Do not preload every distant wildlife model simultaneously.

# 9. Required testing checklist

## Apartment
- [ ] Building is visible from outside.
- [ ] Interior is visible when entering; no essential furniture is hidden.
- [ ] First floor walls are white.
- [ ] Second floor walls are grey.
- [ ] Third floor armory is accessible.
- [ ] Fourth floor rooftop pool is accessible.
- [ ] Staircase connects all four floors in both directions.
- [ ] Player cannot fall through floors, stairs, walls or pool basin.
- [ ] Camera does not get trapped or clipped badly indoors.
- [ ] Lights work on every floor.
- [ ] TV, fridge, fan, AC and mobile interactions work.
- [ ] Furniture is correctly scaled and placed.
- [ ] Building remains intact after chunk unload/reload.

## Armory
- [ ] Exactly 100 entries exist.
- [ ] Every ID is unique.
- [ ] Every item has a valid category, icon and display name.
- [ ] Catalogue scrolls and displays all entries.
- [ ] Pickup/store operations use the existing inventory system.
- [ ] Quantity changes persist after save/load.
- [ ] Locked items do not bypass progression.
- [ ] Re-entering the room does not duplicate items.

## Living species
- [ ] Every species in the current registry appears in the audit.
- [ ] No duplicate species IDs.
- [ ] Models face the correct direction and contact the ground/water properly.
- [ ] Scale and collider sizes are appropriate per species.
- [ ] Animations transition correctly.
- [ ] AI states update without getting stuck.
- [ ] No ghost colliders remain after despawn.
- [ ] Chunk reload does not duplicate wildlife.
- [ ] Save/load restores supported persistent wildlife state.
- [ ] Mobile performance remains acceptable.

## Regression
- [ ] Existing story and prologue still work.
- [ ] Existing three companion NPCs remain persistent and non-duplicated.
- [ ] Existing player movement and camera remain functional.
- [ ] Existing controls work on desktop and mobile.
- [ ] Existing inventory and save files remain compatible.
- [ ] Existing environments, missions and objectives remain intact.

# 10. Build and delivery rules for Google AI Studio

1. Inspect the repository before editing.
2. Make additive source changes in the existing project.
3. Do not paste this specification as a replacement for the game source.
4. Do not use pseudocode where a real implementation is required.
5. Do not leave TODO-only placeholder systems for required features.
6. If an asset is missing, create a procedural Three.js fallback that matches the game's style.
7. Do not install unnecessary dependencies.
8. Run the project's actual typecheck/build/test commands after implementation.
9. Fix all errors introduced by the changes.
10. Report commands run and their actual results. Never claim a build passed if it was not run successfully.
11. List files changed and explain how each system integrates with the existing code.
12. Clearly list any remaining limitations rather than claiming everything works.
13. Provide a final test checklist and explain how to test the apartment, armory, stairs, pool and wildlife in-game.

**Final acceptance condition:** The result must be the user's existing LAST SANCTUARY: REBIRTH game with the four-floor apartment, visible interiors, functional staircase, first-floor necessities, grey second floor, 100-entry fictional armory on the third floor, rooftop pool on the fourth floor, and a validated repair pass across every living species currently present in the project's canonical registry. No existing project systems should be removed or replaced.
