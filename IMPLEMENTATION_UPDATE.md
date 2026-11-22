# LAST SANCTUARY — Complete Survival Expansion

## Project base
This package extends the supplied `deadzone-craft (1).zip` React + TypeScript + Three.js project. It is not a replacement project. Existing player movement, camera, building, crafting, inventory, quests, zombies, day/night cycle, starter sanctuary and existing UI have been retained.

## Integrated in this package

### World streaming and persistence
- Connects the existing `ChunkManager`, `ChunkGenerator`, `LODManager` and `WorldPersistence` to the live game loop once the player leaves the original starter-terrain boundary.
- Keeps the starter terrain active in its original area and suppresses the duplicate streamed center-chunk surface when that chunk is loaded.
- Loads chunks in distance-prioritized batches using the existing graphics-quality radius and LOD logic.
- Saves discovered chunk coordinates and chunk modifications with the existing save slot format.

### Biome expansion
- Adds 12 climate/region definitions: tropical jungle, savannah, taiga, tundra, volcanic wastes, mangrove delta, coral coast, badlands, ancient forest, alpine meadow, bamboo forest and crystal cavern.
- Uses deterministic climate/continental sampling to select expanded biomes. Existing biome definitions remain available.

### Wildlife ecosystem
- Adds a data-driven species registry for mammals, birds, dinosaurs, aquatic wildlife and rare creatures.
- Includes deer, wolves, bears, foxes, boars, elephants, eagles, parrots, owls, ducks, penguins, tigers, lions, giraffes, zebras, horses, monkeys, buffalo, flamingos, crows, crocodiles, frogs, butterflies, fireflies, dolphins, sharks, whales, reef fish, velociraptors, triceratops, stegosaurus, brachiosaurus, luminous moths and freshwater turtles.
- Adds proximity-based spawning/despawning, roaming, resting, flee response, basic day/night species filtering and terrain-following movement.
- Wildlife is intentionally capped to a small active population for mobile performance.

### Survivors and conversations
- Adds four discoverable survivors with roles, dialogue, interaction prompts and rescue choices.
- Choosing to help starts a physical escort: the survivor follows the player and is only marked rescued after reaching the sanctuary perimeter. Completion grants a small supply reward and XP, and records the rescued ID in the save slot.
- Adds a dedicated conversation modal. Press E when close to a survivor.

## Important realism and production notes
The new wildlife and survivor characters currently use procedural Three.js primitive models. This makes the systems playable and keeps the ZIP self-contained, but it is not photorealistic character art. For a high-realism release, replace these placeholder meshes with optimized rigged GLB/GLTF models, PBR texture sets, skeletal animations, species-specific locomotion/idle/feeding/hunting animation clips, spatial audio and biome-specific ambient sound. Use LOD variants and texture atlases for mobile.

The current animal AI is a lightweight roaming/resting/fleeing foundation, not a complete ecological simulation. Full predator-prey chains, breeding, migration routes, herd memory, aquatic navigation, dinosaur combat, weather-driven population dynamics and companion taming are listed in the AI Studio integration brief as next-stage requirements. The rescue system currently includes four starter survivors; it is designed to be expanded with chunk-seeded survivor encounters and escort missions.

## Controls
- Move close to a survivor and press **E** to open their conversation.
- Choose **Help me reach the sanctuary** to rescue them.
- Explore beyond the original starter area to activate streamed chunks.

## Run
- `npm install`
- `npm run dev`
- `npm run build`

## Verification status
The source archive and integration points were inspected. A full dependency install/build could not be completed in this environment, so this package must be built and play-tested in Google AI Studio before release. Do not treat the project as a fully QA-certified or photorealistic finished game yet.
