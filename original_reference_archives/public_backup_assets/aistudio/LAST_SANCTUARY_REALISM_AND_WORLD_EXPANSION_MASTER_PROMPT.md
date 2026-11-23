# GOOGLE AI STUDIO — LAST SANCTUARY REALISM & WORLD EXPANSION MASTER IMPLEMENTATION PROMPT

You are modifying the existing LAST SANCTUARY React + TypeScript + Three.js survival game. Work inside the existing repository. Do not create a separate demo, do not replace the project architecture, and do not remove working features.

## Absolute preservation rules
1. Preserve the current player controller, camera modes, movement physics, mobile controls, keyboard controls, building, crafting, inventory, storage, quests, zombies, day/night cycle, starter sanctuary, audio, menus and save slots.
2. Make additive modular changes. Before editing a file, inspect its current implementation and all call sites. Avoid broad rewrites.
3. Keep desktop and Android/mobile performance. Use delta time, deterministic seeded world generation, bounded entity counts, frustum/distance culling, LOD, instancing where practical, pooled objects and disposal of geometries/materials.
4. Never use fake UI-only systems. Every button, rescue, conversation, mission, animal state and save operation must connect to actual game state.
5. Do not claim a feature is complete unless it exists in code and has been tested.

## Visual realism target
Aim for grounded, naturalistic survival-game presentation rather than cartoon visuals: physically based materials, correct roughness/metalness, natural scale, believable terrain silhouettes, layered vegetation, atmospheric perspective, realistic water surfaces, contact shadows, coherent sun/sky lighting, weather transitions, subtle wind motion, species-specific animation and spatial environmental audio. Prefer optimized GLB/GLTF assets with PBR textures and rigged animations. Provide low/medium/high/ultra LODs and mobile-safe fallbacks. Never load enormous uncompressed textures or dozens of unique high-poly models at once.

## Open-world streaming
- Treat the world as an effectively expandable seeded world, not one giant mesh.
- Use the existing 256-unit chunk grid, ChunkManager, ChunkGenerator, WorldPersistence and LODManager.
- Generate chunks deterministically from world seed + chunk coordinate.
- Prioritize chunks in the direction of player movement; load nearest first; unload distant chunks after persisting modifications.
- Keep chunk borders seamless: identical height samples on shared edges, consistent biome/road/river sampling and no gaps.
- Persist destroyed/harvested resources, opened POIs, placed structures, discovered regions, rescued survivors, missions and player-built modifications.
- Do not spawn large numbers of NPCs or animals in unloaded chunks. Store lightweight simulation records and activate full agents only near the player.
- Add asynchronous generation or worker-based terrain data preparation only if it can be safely integrated with the current Vite/browser setup.

## Biomes and environments
Support existing biomes plus tropical jungle, savannah, taiga, tundra, volcanic wastes, mangrove delta, coral coast, badlands, ancient forest, alpine meadow, bamboo forest and crystal cavern. Continue expanding with marsh, peat bog, redwood forest, temperate rainforest, Mediterranean scrub, steppe, salt flat, glacier, fjord, karst cave, limestone cave, flooded cavern, deep ocean shelf, kelp forest, reef lagoon, island chain, canyon, mesa, geothermal field, abandoned suburbs, overgrown megacity, industrial port, military exclusion zone, underground research complex and collapsed metro tunnels.

Each biome needs a climate profile, terrain profile, vegetation palette, resource table, weather probabilities, ambient audio, wildlife table, POI table and discovery name. Make biome transitions gradual at borders where appropriate. Water biomes must not be represented as ordinary grass terrain with a blue overlay; build shorelines, depth variation, underwater visibility and aquatic navigation as dedicated systems.

## Wildlife and species
Create a modular species database. Include mammals, birds, reptiles, amphibians, insects, freshwater and marine life, dinosaurs/prehistory and rare fictional species. Example species: deer, elk, boar, fox, wolf, bear, elephant, horse, rabbit, monkey, big cats, buffalo, eagle, hawk, owl, parrot, crow, duck, flamingo, penguin, crane, crocodile, turtle, dolphin, whale, shark, reef fish, crab, octopus, frog, snake, butterflies, fireflies, velociraptor, triceratops, stegosaurus and brachiosaurus.

For each species define habitat compatibility, preferred temperature, active hours, group size, movement speed, senses, hearing/vision radius, diet, social behaviour, threat response, animation set, sound set and spawn rarity. Implement bounded AI states: idle, graze, forage, drink, rest, sleep, investigate, flee, defend, hunt, follow herd, migrate and return-to-home. Use deterministic decision intervals, not expensive full AI every frame. Predators should not attack the player automatically unless species temperament and context justify it. Herbivores should react to predators. Birds should perch, flock, take off and land. Aquatic creatures should remain in water volumes. Dinosaurs belong in geographically coherent prehistoric zones and should have species-appropriate movement and social behaviour.

Add population persistence and ecology simulation: nearby agents run full AI; distant populations update with lightweight time-step records. Avoid spawning duplicates when a chunk reloads. Add safe animal observation and optional nonviolent interactions, tracking, rescue, feeding and companion trust where appropriate.

## Survivors, NPCs and conversations
Build a complete NPC system with stable IDs, names, roles, personality traits, schedules, home/work locations, needs, health, morale, relationships, faction, memory flags and current task. NPCs must walk to destinations, avoid obstacles, use settlements and react to weather, time, danger and player actions.

Conversation system requirements:
- Branching dialogue trees with response choices and persistent flags.
- Context-aware lines based on mission state, time, location, previous choices and relationship.
- Dialogue portraits, speaker names, role labels and readable subtitles.
- Conversation actions must call game logic: accept mission, decline, trade, recruit, assign task, ask for directions, share information, request rescue, or end conversation.
- Do not repeat the same greeting every interaction; remember important conversation outcomes.
- Add accessibility options for text size and dialogue speed.

## Rescue and saviour missions
Generate rescue encounters in remote cabins, caves, crashed vehicles, research facilities, towers, villages, islands and wilderness camps. Mission types: locate, free, stabilize, escort, defend, recover supplies, repair communications, reunite groups and bring survivors to sanctuary. Use clear objective states and route markers. NPCs must physically follow or travel to a safe destination; do not mark a rescue complete merely because the player entered a radius. Validate arrival and survivor status. Rescued NPCs persist, join settlements, gain roles and appear in later conversations. Add repeatable procedural rescue contracts without duplicating IDs.

## World simulation and atmosphere
Add a real 24-hour lighting cycle, cloud layers, wind, rain, thunder, fog, mist, snow, sandstorms and ashfall where biome-appropriate. Weather affects visibility, movement traction, temperature, animal activity and NPC schedules. Add wet/dry material transitions and puddles only where performance permits. Ensure weather and time state are saved or reproducibly derived.

## QA checklist
- Run TypeScript checks and production build; fix all errors introduced by this update.
- Test new game, continue, save/load, mobile touch controls and desktop keyboard controls.
- Walk across at least 20 chunk boundaries in all directions; verify no gaps, duplicated terrain, disappearing buildings or reset resources.
- Confirm wildlife populations do not multiply on chunk reload and distant entities are cleaned up.
- Confirm survivor dialogue, rescue, rewards and rescued state survive save/load.
- Profile frame time, draw calls, triangles, memory and entity counts on a modest Android device.
- Test low and medium quality with shadows disabled; game must remain playable.
- Keep an implementation report listing what is implemented, what is placeholder, and what remains unverified.

Deliver changes in the existing project, explain every changed file, report build/test results honestly, and provide a final ZIP of the complete repository. Do not remove existing systems to make the build pass; fix integration issues at their source.
