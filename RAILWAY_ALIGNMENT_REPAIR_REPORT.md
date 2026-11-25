# Railway Alignment Repair — LAST SANCTUARY: REBIRTH

## Source inspection

The uploaded project ZIP was valid and contained 746 entries. The active root source contains both `RailwayNetworkGenerator.ts` (world-chunk track rendering) and `AITrainManager.ts` (train-following and a second train-proximity track renderer).

The key mismatch was that the world track generator sampled terrain height directly at each 16 m segment centre, while AITrainManager used a separate 128 m interpolated grade for train height and its own rail geometry. The two render paths could therefore disagree vertically. In addition, the 16 m track pieces were left horizontal even when the sampled terrain grade changed between pieces, creating visible steps or apparent floating/kinked sections.

## Changes

- Added `src/engine/world/RailwayGrade.ts` as the single shared, deterministic railway elevation function.
- The shared grade uses world-aligned 64 m terrain samples with smooth interpolation, plus a gradual transition into level station approaches.
- Updated `RailwayNetworkGenerator.ts` to use that shared grade and tilt each 16 m ballast/rail segment to match its start/end elevation.
- Updated `AITrainManager.ts` so train height, train pitch, AI-generated rail pieces, ballast and sleepers all use the same grade function.
- Rail spacing remains 1.76 m between rail centre lines (±0.88 m), preserving the existing six-track layout and train service definitions.
- Existing train schedules, stations, train models, AI services, gameplay and controls were not intentionally changed.

## Verification

- Original ZIP integrity: passed (`ZipFile.testzip()` returned no errors).
- TypeScript syntax transpilation: passed for all three changed TypeScript files using the installed TypeScript compiler API.
- Full production build, static type-check and in-game visual/runtime tests were not run because project dependencies are not installed in this environment.
- Actual Android/vivo device testing is still required. This is a source-level alignment repair, not a claim that all track defects have been verified in gameplay.

## Files changed

- `src/engine/world/RailwayGrade.ts` (new)
- `src/engine/world/RailwayNetworkGenerator.ts`
- `src/engine/world/AITrainManager.ts`
