# Implementation changelog — 2026-11-24

## Current request: autosave/load reliability and basement command-centre expansion

### Changed source files
- `src/utils/storage.ts`
  - Added checkpoint shape validation before accepting persisted data.
  - Added per-slot serialized write queues.
  - Commits IndexedDB save + metadata in one read/write transaction and closes the database connection on completion/failure.
  - Uses a verified localStorage staging record, retains the previous valid checkpoint as a backup, and recovers the newest valid primary/backup/staging copy.
  - Increased the save schema version to 3; existing migration behavior remains in place.
- `src/engine/GameEngine.ts`
  - Serializes checkpoint writes from the game engine so autosave, manual save, and active-slot preservation do not overlap.
  - Reports save success only after the queued storage operation resolves; failed writes are logged without replacing the prior valid checkpoint.
- `src/engine/prologue/BasementControlRoom.ts`
  - Added a 15-panel wall display using live AI train telemetry, plus one additional desk display (six desk monitors total).
  - Added a 3D hologram table with six train markers positioned from live AI train coordinates and colored by live service status.
  - Retained the existing basement geometry, access stair, five original desk monitor functions, and operations modal integration.

### Scope protection
No source files that define the house above basement level, exterior, pool, garden, compound, terrain, or player spawn were edited.

### Known incomplete work
The 15 wall panels currently share one composite live-telemetry canvas rather than 15 individually authored feeds. The hologram plots live train positions but does not yet expose direct per-marker pointer/touch selection. The current save schema preserves the existing active-passenger-train state, not a full snapshot of all six autonomous trains. A separate technical-facilities sublevel with dedicated elevator/stair collision/navigation has not been implemented. Full device QA and deterministic six-train/save-reload integration tests remain unverified because project dependencies could not be installed in this execution environment.
