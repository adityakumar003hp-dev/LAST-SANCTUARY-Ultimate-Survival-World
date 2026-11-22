# Railway Boarding, Physical Trains & World Separation Update

## Included source changes
- All four AI train services (F2, F3, B2, B3) can be boarded as passenger trains while stopped at a station with doors open. The player remains attached to the moving train and can walk within a constrained carriage interior; E exits the carriage.
- F1 and B1 remain the two player-drivable locomotives. They have visible 3D geometry, cab controls, headlights, doors, wheels/bogies, interior floor/seating/rails and collision bounds. Boarding is restricted to stopped locomotives.
- RailwayNetworkGenerator now follows the same east-west X-axis corridor and z offsets as AITrainManager. The six tracks are 12 metres apart and are placed at z=150..210, outside the apartment-town road grid.
- Track chunks are deterministic and world-aligned; each track is emitted only in its owning z chunk row.
- On-foot player movement is pushed outside train collision Box3 bounds. Train meshes remain normal visible Three.js meshes; there are no ghost/sprite substitutes.
- Existing town traffic stays on the two paved roads: Main Avenue lane x=-1.65 and Cross Street lane z=1.65. The railway corridor is spatially separated from both.

## Interaction
- Approach a stopped F1/B1 locomotive from its side and press E to board and drive.
- Approach an AI train during its station dwell while its doors are open and press E to board and explore the passenger carriage.
- Press E to exit. AI train dwell remains 120 active simulation seconds.

## Verification limits
- ZIP integrity and changed-file TypeScript transpilation were checked.
- Full `tsc --noEmit`, Vite production build and in-game WebGL/mobile testing were not completed because project dependencies are not installed in this environment.
- The current AI train route is still the existing coordinate-based corridor; this update aligns the visible railway generator to it but does not add pathfinding, switches or signalling interlocks.
