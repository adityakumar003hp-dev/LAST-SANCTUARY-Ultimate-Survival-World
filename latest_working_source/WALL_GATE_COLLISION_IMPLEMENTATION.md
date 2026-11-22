# Last Sanctuary — Protected Perimeter and Access Collision Update

## Implemented in source

- The residential compound perimeter is visually continuous and has no unintended openings.
- The front perimeter now has exactly one central double-leaf vehicle gate and two separate hinged pedestrian doors.
- Each of the three access points has its own solid physics collider and independent open/closed state.
- Closed access points block the player, companions and zombies. Opening an access point disables only that access point's collider; all surrounding wall colliders remain active.
- The mansion/apartment exterior keeps its solid north/east/west/south wall colliders and its two-leaf front entrance. The two entrance leaves are controlled by one door state and a matching solid doorway collider.
- Companions use legal doorway waypoints when following the player between the mansion, compound yard and outside world. They only select access points that are open. With no open route, their movement remains blocked by collision rather than crossing walls.
- Zombie chase, idle movement and knockback now pass through the unified collision resolver, so zombies cannot move through closed perimeter walls, gates or doors.
- The player continues to use the same unified collision resolver and can freely explore either side when the relevant access point is open.

## Interaction

- Approach the central vehicle gate and press E to open/close it.
- Approach either perimeter pedestrian door and press E to open/close it.
- Approach the mansion's double front entrance and press E to open/close both leaves.
- Mobile interaction continues to use the existing interaction control, because these access points are registered through the existing interaction prompt system.

## Important scope note

The current playable building source is still the existing four-floor apartment structure. This update secures that existing structure and compound; it does not claim that the separately specified five-level mansion replacement has been fully constructed.
