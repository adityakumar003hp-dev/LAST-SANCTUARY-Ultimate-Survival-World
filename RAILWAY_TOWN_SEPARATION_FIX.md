# Railway / Apartment Town Separation Fix

## Changes
- Increased the six visible railway centre-line offsets to 10 m spacing (`-25, -15, -5, 5, 15, 25`) instead of 3 m spacing. Track ballast and sleeper widths were adjusted to suit the wider corridor.
- Added a 115 m protected radius around the prologue apartment/town origin. Railway station branches are not generated inside this district, preventing station spurs and platform structures from crossing the apartment, roads, or town traffic area.
- Limited station spurs to nearby POIs (55 m maximum) and placed the platform beside the railway corridor rather than at the POI centre, reducing the chance of rails cutting through buildings.
- Kept civilian traffic on the two existing paved town-road lanes: Main Avenue at x = -1.65 and Cross Street at z = 1.65. Reduced traffic speeds and locked each moving car to its road lane during updates so cars cannot drift onto railway geometry.

## Scope / verification
This is a targeted source-level correction. The ZIP archive was integrity-tested. A full TypeScript/Vite build and in-game visual verification were not performed in this environment. AI train route/track graph unification remains a separate integration task; this patch addresses the apartment-town overlap and visible railway spacing.
