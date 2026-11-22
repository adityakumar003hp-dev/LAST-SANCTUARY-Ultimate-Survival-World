# Apartment Compound + Backyard Pool Redesign

Updated the existing apartment implementation without replacing the game project.

## Included
- A continuous four-sided residential compound wall with a single front entrance opening.
- A two-leaf hinged front compound gate, with an interaction prompt and synchronized solid collision when closed; it starts open so the player can leave the property.
- Dedicated collision boxes for all compound wall segments and the gate.
- A ground-level swimming pool behind the apartment, with a surrounding deck, coping, entry steps, loungers, pool lights, and animated water surface.
- Pool-edge collision that leaves the entry-step gap accessible.
- Backyard pool interaction and pool-volume detection, while retaining the existing rooftop pool.
- Existing apartment rooms, front apartment doors, furniture, train systems, and other game systems retained.

## Main files changed
- `src/engine/prologue/ApartmentBuilding.ts`
- `src/engine/prologue/TownLifeManager.ts`
- `src/engine/prologue/PrologueManager.ts`
- `src/engine/GameEngine.ts`

## Validation
- TypeScript syntax transpilation passed for all four changed source files.
- A full project type-check/build could not be run in this environment because project dependencies were not installed; the package installation attempt timed out.
