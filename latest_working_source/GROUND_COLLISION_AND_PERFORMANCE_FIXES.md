# LAST SANCTUARY: REBIRTH — Grounding and Performance Fixes

## Changes in this build

- PlayerController now receives the active world seed and uses it for ground-height checks and third-person camera terrain clearance. This prevents the player/camera from querying seed 42 while streamed terrain is generated with the save's actual world seed.
- Player grounding includes a small clearance above the procedural terrain surface to reduce sinking caused by the difference between the continuous height function and the chunk mesh's triangle interpolation.
- Gravity integration is bounded to a 1/30-second physics step when a frame stalls, reducing large-frame tunnelling and sudden ground penetration.
- Chunk streaming is throttled to one generation batch every 110 ms and one new chunk per batch, spreading expensive geometry/vegetation/POI generation across frames.
- Chunk unloading now has a one-chunk hysteresis safety ring, preventing terrain immediately outside the active radius from disappearing as soon as the player crosses a chunk boundary.
- Third-person terrain obstruction sampling is reduced from 14 to 8 samples per frame.
- Harvestable vegetation meshes no longer cast individual dynamic shadows; this reduces shadow-map workload while keeping their geometry and gameplay resources.
- Renderer pixel ratio is capped at 1.5 on hardware WebGL to reduce mobile GPU fill-rate cost.

## Preserved

Existing game systems, components, world generation, buildings, base management, zombies, NPC systems, vehicles, crafting, inventory, quests, map, HUD, and save data formats are retained.

## Validation note

The ZIP structure and edited source files were inspected. A full TypeScript/Vite build could not be run in this environment because project dependencies were not installed and package installation did not complete. Please run `npm install` (or the project's Bun install workflow) and `npm run build` in your development environment before publishing.
