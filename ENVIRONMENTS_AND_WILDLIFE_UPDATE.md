# LAST SANCTUARY: REBIRTH — Environments & Wildlife Update

## Included
- Added a curated catalog of 15 featured exploration environments in `src/engine/world/BiomeGenerator.ts`.
- Added eight new procedural biome variants: tropical jungle, savanna, snow forest, autumn forest, volcanic lands, ancient forest, bamboo forest and dinosaur valley.
- Kept the existing settlements, city, industrial, research, cave, subway, river, lake, mountain, desert and other biome systems.
- Added lightweight procedural wildlife with biome-aware species selection and wandering behavior in `src/engine/world/WildlifeManager.ts`.
- Wildlife is capped at 12 nearby animals and despawns beyond its active radius to limit mobile performance cost.
- Added biome-specific vegetation density and tree silhouettes for jungle, savanna, bamboo, autumn, snow and ancient forest regions.
- Connected wildlife updates and cleanup to `GameEngine`.

## Notes / validation
- Existing camera, mobile/desktop controls, player systems, zombies, buildings, resources, quests and save data were retained.
- All TS/TSX files passed syntax transpilation.
- A full Vite build and in-game mobile/desktop test could not be run because dependencies could not be installed in this environment.
- The 15 featured environments are procedural regions; they are discovered by exploration rather than selected from a separate map menu.
- Animal models are lightweight low-poly procedural placeholders with wandering behavior; they are not yet fully animated, rideable, tamable or combat-enabled.
