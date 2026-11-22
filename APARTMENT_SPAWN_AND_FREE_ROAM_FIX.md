# Apartment Spawn & Free-Roam Fix

## Changes
- New-game spawn is now inside the apartment's first-floor bedroom aisle at (-32.5, 0.20, 36.7).
- The old spawn at (-30, 41) overlapped the bed collider and could trap the player immediately.
- Spawn now resets player velocity, updates the avatar transform, sets grounded state, and places the camera inside the apartment for the first frame.
- Day 2 wake-up position uses the same clear bedroom aisle instead of the bed collider.
- Apartment entrance starts open, so the player can walk between interior and exterior immediately. The door remains interactable and can be closed/reopened.
- Existing four-floor layout, staircase, apartment furniture, story events, and save restoration are preserved.

## Expected test
1. Start a genuinely new game (not Continue/Load).
2. Player should appear in the apartment bedroom aisle, not inside the bed.
3. Walk through the bedroom/living room and approach the open front entrance.
4. Walk outside, turn around, and re-enter through the same doorway.
5. Use E at the entrance to close/open the door.
6. Use stairs to access the upper floors.

## Verification
ZIP archive integrity checked. Full dependency install, TypeScript build, and live browser/device collision test have not been run in this environment.
