# Player Mansion / Rebirth Compound — Current implementation

This file replaces the older four-gate compound report. The active implementation is the root `src/` application and the current specification is five gates, twenty armed turrets and twenty perimeter towers.

## Current design

- 100 m × 126.5 m protected footprint: exactly five times the documented 44 m × 57.5 m baseline.
- Exactly three principal buildings: Player Mansion, Railway Command Centre and four-bay Vehicle Garage.
- Exactly five animated, collidable perimeter gates: one main, two pedestrian and two vehicle gates.
- Exactly twenty perimeter security towers: ten left and ten right.
- Exactly twenty armed sentry turrets with hostile-only targeting.
- Four requested garage vehicles: armored SUV, motorcycle, bicycle and Military Enforcement Vehicle.
- Compound gate/security state is included in the save data.

See `COMPOUND_IMPLEMENTATION_REPORT.md` for the exact source changes, validation results and known integration limits. `FINAL_WORLD_STRUCTURE_AND_RAILWAY_REQUIREMENTS.md` now records the five-gate player-compound requirement; the separate Military Starter Base retains its own existing gate design.
