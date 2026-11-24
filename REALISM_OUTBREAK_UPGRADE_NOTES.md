# LAST SANCTUARY: REBIRTH — Realism & Dynamic Outbreak Upgrade

## Implemented in this source update

- Added a 60-second fictional stunned/conversion phase to town-resident infection.
- Zombies can select nearby living Oakridge town residents as AI targets, rather than exclusively pursuing the player.
- Contact with an active zombie starts the resident conversion timer; converted residents are replaced by the existing walker entity and use the existing zombie AI/animation system.
- Added a non-graphic stunned pose for residents during the conversion interval.
- Kept the outbreak simulation running after campaign completion and when loading a completed campaign save.
- Preserved the existing meteorite-gated outbreak start and protected-zone zombie spawn checks.

## Scope and honest limitations

This is a gameplay-system upgrade to the existing procedural Three.js project, not a claim that the project has become a photorealistic simulation of the entire real Earth. The currently authored civilian conversion integration covers the Oakridge `TownLifeManager` residents. It does not yet convert every companion, settlement resident, wildlife species, or player character. The player remains playable and is attacked through the existing damage system; player infection/turning is not added in this patch.

The world remains a procedurally generated, Earth-inspired game world. A geographically accurate planet-scale Earth requires licensed/verified elevation, road, building, land-cover, and geospatial datasets plus streaming and memory budgets; those datasets are not bundled in this source archive. Ultra-realistic assets, motion-captured animation, advanced global illumination, and platform-specific performance validation also require additional assets and device testing.

## Validation

- TypeScript/TSX syntax transpilation: 129 files checked, zero syntax diagnostics.
- Full TypeScript typecheck and Vite production build: not completed because dependencies could not be installed within the available build session.
- Runtime gameplay, mobile performance, NPC pathfinding under load, and visual quality: not yet tested in a running browser/device.
