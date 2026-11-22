# Garage, protected premises and friend interactions

## Garage collection
- One playable Trail ATV is parked in the player residence garage area.
- Four additional authored garage vehicles are created: one street motorcycle (BIKE), one mountain bicycle, one road car and one enforcement SUV.
- The motorcycle, bicycle, car and enforcement SUV are currently visual parked garage assets; the existing ATV remains the drivable vehicle system.

## Protected premises
- The player residence/mansion compound and Military Starter Base are authoritative no-procedural-spawn zones.
- Terrain resource generation, chunk vegetation/resources, POI generation, wildlife, zombie spawns and dynamic ambient props use the protected-zone rules.
- Random physics crates/barrels/stools are not spawned at a protected compound center. Authored structures, furniture, crops, mission objects and garage vehicles remain allowed.

## Friend interactions
- After the main prologue, interacting with Marcus, Chloe or Maya opens a friend action menu.
- Actions: Handshake, Hug, Dance, Drive, Follow/Unfollow.
- Social actions update relationship score and trigger a short arm-pose animation.
- Drive marks the selected friend as a passenger: the friend is hidden while the player is in the vehicle and appears beside the player after exiting.
- During story-critical prologue interactions, existing scripted mission dialogue retains priority so campaign progression is not replaced by the social menu.

## Validation
- TypeScript transpile syntax check passed for all 82 TS/TSX source files.
- Full type-check/build was not available because project dependencies (including `vite/client`) are not installed in this environment.
