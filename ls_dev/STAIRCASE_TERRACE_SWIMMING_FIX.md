# Apartment staircase and terrace swimming fix

- Replaced the three same-direction straight flights with a left-right-left switchback/U-turn staircase between all four apartment levels.
- Added alternating full-width landings and handrails within the existing stairwell opening.
- Updated PlayerController floor-height sampling so each flight rises in its actual direction and landings stay level.
- Removed rooftop terrace coordinates from swimming detection. The roof is treated as a dry, solid terrace; backyard water remains the only apartment swimming area.

Validation: source archive updated. A full TypeScript/Vite build could not be run because the archive does not include installed dependencies (`vite/client` types unavailable). In-game movement and collision still require runtime testing.
