# Last Sanctuary — Train, Cinematic Camera and Park NPC Hotfix

## Changes
- All six railway services (F1, F2, F3, B1, B2, B3) are configured as autonomous AI-operated trains. The player-drivable fleet is intentionally empty; AI trains continue on their timetable, stop, open doors, announce arrivals/departures and resume.
- Cinematic camera tracks now terminate at their configured duration, snap to the authored final camera pose, and release camera ownership. This prevents the player controller from remaining locked out of camera follow after a cutscene.
- The on-foot player avatar visibility is re-synchronized to the selected camera view every normal movement frame, so a stale hidden flag does not leave the player invisible after leaving a vehicle/train/cutscene. First-person view correctly keeps the avatar hidden.
- Park residents are grounded to the authored park grass pad rather than sampling procedural terrain elevation beneath it; the model foot offset aligns with the pad surface.

## Verification status
Source-level checks are included in the delivery. A live Android/browser playtest is still required to verify camera framing, train timetables and NPC foot contact under the deployed build.
