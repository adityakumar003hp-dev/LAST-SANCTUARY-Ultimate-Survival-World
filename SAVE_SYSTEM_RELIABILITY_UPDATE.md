# LAST SANCTUARY: REBIRTH — Save/Load Reliability Update

## Scope
This patch is applied to the active root `src/` application. Historical nested source snapshots are unchanged.

## Existing behavior verified
- `GameEngine.update()` triggers an automatic checkpoint every 60 seconds of active simulation time.
- Automatic checkpoints write the `autosave` slot and, when a named slot is active, also preserve that active slot.
- `GameEngine.enqueueCheckpointSave()` serializes engine-level checkpoint operations.
- `saveGameToSlot()` serializes writes per slot and uses IndexedDB with a verified localStorage staging/backup fallback.
- Save snapshots include player position/rotation/stats, inventory/hotbar, structures, quests, time/day, world streaming changes, rescued survivors, base/vehicle state, campaign checkpoint, outbreak state and railway state fields already supported by the source.

## Changes in this patch
- `loadGameFromSlot(slotId)` now waits for any pending write to that exact slot before reading IndexedDB/localStorage. This prevents a Load Game action from restoring an older snapshot while a newer autosave is still committing.
- `getAllSaveSlots()` now waits for currently queued writes before listing slots.
- The localStorage slot listing now validates primary, backup and staging copies. A valid recovery copy can keep a slot visible when its primary localStorage record is damaged.
- Existing timestamps are compared when choosing between IndexedDB and localStorage copies, so the newest valid copy is returned.

## Validation
- TypeScript/TSX transpilation syntax check: PASS — 139 source files, 0 syntax errors.
- Full dependency-backed `npm run build`: NOT RUN — project dependencies were not installed in this workspace.
- Browser/Android runtime test and simulated storage quota/device interruption tests: NOT RUN.

## Important limitation
A browser/device can still terminate the app before an asynchronous storage transaction completes, or clear browser site data. The backup/staging and IndexedDB paths improve resilience but cannot guarantee recovery from every OS/browser storage failure. Exported save backups remain useful for long-term protection.
