# Source changelog — Player Mansion / Rebirth Compound

## Runtime source files changed

- `src/engine/prologue/ApartmentBuilding.ts` — five-gate perimeter, twenty tower models/colliders, compound sizing, roads/paths, command-centre interior, four-bay garage shell, elevator/workstation interactions, compound state persistence and security display.
- `src/engine/prologue/ApartmentTurrets.ts` — exactly twenty sentry placements, hostile-only NPC/faction targeting adapter, player/friendly/neutral/unknown exclusion, no wildlife targeting, single authoritative damage application, turret save data.
- `src/engine/GameEngine.ts` — Gate 5 and command-elevator interaction routing, compound state load/save.
- `src/engine/base/VehicleParkingManager.ts` — four requested vehicles positioned in the four garage bays; remaining vehicles retained outside the compound; visible mounted weapon station on the Military Enforcement Vehicle.
- `src/components/SecurityCommandCenterModal.tsx` and `src/App.tsx` — Gate 5 control, twenty-turret telemetry and hostile-only engagement notice.
- `src/engine/world/ProtectedSpawnZones.ts` — protected footprint synchronized to the exact compound perimeter.
- `src/types/game.ts` — optional versioned compound save-state type.
- `src/engine/prologue/PrologueManager.ts` — hostile-only security announcement.

## Validation and documentation

- `scripts/validate-compound.mjs` and `npm run validate:compound` — current compound static checks.
- `scripts/validate-project.mjs` — existing campaign/source integrity checks.
- `COMPOUND_IMPLEMENTATION_REPORT.md` — implementation scope and known limits.
- `DELIVERY_STATUS.md` — validation status.
- `FINAL_WORLD_STRUCTURE_AND_RAILWAY_REQUIREMENTS.md` — latest five-gate player-compound requirement.
