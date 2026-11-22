# LAST SANCTUARY — Integration Update (November 2026)

This update is applied to the supplied source project.

## Campaign
- Campaign catalogue now contains exactly 42 missions: seven missions for each of six days.
- Day 6 ends by unlocking indefinite free exploration; it does not end or reset the world.
- Existing story order and the separate apartment and military-base medical facilities are retained.

## Protected compounds and spawning
- Apartment and military starter-base protected rectangles remain authoritative for procedural vegetation, POIs and chunk scatter.
- Wildlife spawn selection already rejects both protected zones.
- Zombie creation now relocates any requested spawn point that falls inside a protected zone to the nearest outside edge, with a 2 m margin.
- Story-authored furniture, medical facilities, crops and mission objects are not filtered by these procedural-spawn guards.

## Apartment and starter base
- Apartment floor elevation and staircase support remain driven by PlayerController's authored floor-height logic; floor slabs are intentionally not registered as vertical wall colliders.
- Apartment perimeter walls and doorway/gate state remain registered with UnifiedPhysicsManager.
- Existing apartment medical room and the starter-base medical division are preserved.

## Train
- AI passenger train consist is three connected walkable carriages: powered lead carriage plus two coaches.
- Each coach retains a solid floor, side walls, roof, transparent window panels, end gangways, seats and bogies.
- Passenger exploration is train-relative and updates against the moving train each frame, so the player is carried with the consist while walking or seated.
- The interior exploration bounds prevent the passenger from stepping off the consist; gangway bridge meshes span the two inter-carriage gaps.
- Corrected a stale source comment that incorrectly described six extra coaches.

## Verification limits
The project source has been patched, but a browser/gameplay runtime test has not been performed in this environment. In particular, visually verify collision at every apartment level, the military-base floors, doorway thresholds, all train gangways, and movement while the train is in motion before treating this as runtime-certified.


## Rooftop pool, stairwell and spawn cleanup
See `ROOFTOP_POOL_STAIRCASE_SPAWN_FIX.md`. The rooftop pool geometry and player swim/exit logic are now connected; chunk resource/POI instantiation is additionally filtered by protected compound zones. Runtime verification remains pending.


## Screenshot repair — Nov 4, 2026
- Expanded apartment protected spawn zone beyond the wall perimeter to prevent tree canopies/debris from clipping into the yard.
- Added timed player sleeping pose and wired it to apartment bed interaction.
- See `ROOFTOP_POOL_STAIRCASE_SPAWN_FIX.md` for details and testing limitations.
