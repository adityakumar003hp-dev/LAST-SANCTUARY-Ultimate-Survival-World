# LAST SANCTUARY — Rooftop Pool, Staircase & Spawn Cleanup Update

## Applied source changes

- Reinstated a real rooftop swimming pool above the terrace deck, with a recessed basin, visible water surface, raised perimeter walls and four submerged exit steps.
- Added a bounded rooftop water volume in PlayerController. The terrace outside the basin remains dry; only the pool volume triggers swimming.
- Added a pool-exit jump interaction at the built-in step opening so the player can climb back onto the terrace.
- Updated rooftop pool wall colliders to match the new basin geometry.
- Added a final protected-zone filter to chunk resource and POI instantiation so generated trees, harvestables, debris/resource props and POIs are discarded inside the apartment and military compound zones.
- Retained the existing U-turn / left-right switchback stair flights and their floor-height support logic.

## Important testing status

The uploaded screenshots show (1) a rooftop terrace with a swimming prompt but no visible rooftop water basin, and (2) a stairwell cutaway with the player and stair flights appearing misaligned. The source project had no rooftop pool geometry in its current rooftop builder, and the rooftop swimming flag was never enabled by the player controller. Those code paths have now been connected.

ZIP integrity and targeted source checks are performed on this package. A full Vite/TypeScript build and live in-game test are not claimed: the project dependencies are not installed in this workspace. Please test the staircase path from ground floor to each landing, then enter the rooftop pool and jump out at the step opening.


## Screenshot follow-up: spawn buffer and sleeping animation
- Expanded the apartment no-spawn rectangle well beyond the perimeter walls to prevent tall tree crowns and large debris from overhanging into the compound.
- Added a final sleep state to PlayerController: movement and gravity are locked during a timed lie-down pose, then the survivor returns to the saved standing position.
- Apartment bed interaction now starts the visible sleeping animation before applying the existing story/rest outcome.
- This remains pending full build and in-game verification.
