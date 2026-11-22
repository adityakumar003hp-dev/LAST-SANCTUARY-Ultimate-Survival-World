# LAST SANCTUARY — Complete Survival Expansion

This is the updated Google AI Studio project ZIP, based on the original `deadzone-craft (1).zip` repository.

## Quick start
1. Open/import the complete project in Google AI Studio.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Run `npm run build` before publishing.

## New integrated systems
- Expanded biome generation and chunk streaming through the existing chunk manager.
- Wildlife species manager for mammals, birds, dinosaurs, aquatic species and rare creatures.
- Survivor rescue manager with dialogue and persistent rescued state.
- Conversation modal and E-key survivor interaction.

Read `IMPLEMENTATION_UPDATE.md` for the exact implementation scope and known limitations. Read `public/assets/aistudio/LAST_SANCTUARY_REALISM_AND_WORLD_EXPANSION_MASTER_PROMPT.md` for the next-stage Google AI Studio instructions to upgrade procedural placeholders into high-realism assets and deeper simulation.

**Honest status:** this package contains integrated gameplay foundations and procedural placeholder models. It is not a photorealistic finished release. A complete build and mobile play-test should be run in Google AI Studio after import.


## Six-Day Campaign Update
The authoritative opening campaign is six days / 36 missions. See `SIX_DAY_CAMPAIGN_AND_STARTER_BASE_SPEC.md` and `src/data/sixDayCampaign.ts`. The apartment and military Starter Base use protected procedural no-spawn footprints. See `src/engine/world/ProtectedSpawnZones.ts`.
