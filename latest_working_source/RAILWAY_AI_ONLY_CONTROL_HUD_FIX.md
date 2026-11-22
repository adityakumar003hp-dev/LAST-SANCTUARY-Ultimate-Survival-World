# Railway AI-only passenger HUD correction

- All six railway track definitions now explicitly set `playerDrivable: false`.
- Passenger train HUD now shows service line, speed, direction, next-stop announcement, and an exit action only.
- Removed throttle, brake, horn, manual door, and driver-camera controls from the passenger HUD.
- Mobile controls no longer enter vehicle-driving mode merely because the player is aboard a passenger train.
- Legacy locomotive discovery and boarding are disabled; legacy throttle input is a no-op.
- Passenger exit clears the train HUD state.

Validation performed: TypeScript/TSX syntax transpilation for all 78 source files and ZIP integrity check. Full dependency-backed production build and in-game device testing remain outstanding.
