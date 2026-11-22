# Apartment Entry and Spawn Collision Fix

- Removed apartment floor slabs and staircase ramps from the ordinary horizontal solid-collider list. The player controller already calculates the walkable floor elevations; treating slabs as walls pushed the player outside the apartment.
- Kept the apartment perimeter walls and furniture collision. The south facade retains its central doorway.
- Added a synchronized doorway collider that is disabled while the double doors are open and enabled when they are closed.
- Kept the existing initial open-door animation state.
- Moved the new-game spawn to a clear interior living-room position at (-26, 0.245, 34.2), away from furniture and perimeter walls; synchronized the avatar and initial camera.
- Aligned the player floor-height values with the visible floor slab top surfaces and pool basin floor.

Validation: all TypeScript/TSX files passed syntax transpilation. A full dependency-backed production build and in-game Android test were not available in this environment.
