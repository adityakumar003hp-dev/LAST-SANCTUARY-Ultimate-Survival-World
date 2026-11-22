# LAST SANCTUARY: REBIRTH — Three-Carriage Railway Physics Fix

## Included changes
- All passenger and drivable trains now contain three units total: one powered lead car and two passenger coaches.
- Train collision bounds cover the complete three-unit consist, including its rear coach.
- Rail and ballast geometry use the same deterministic 16 m terrain-grade sampling grid as train placement. Train wheel bottoms are aligned to the rail crowns to prevent visible floating or terrain clipping.
- AI and drivable train wheels animate while the consist moves.
- Every streamed station receives a ground-level platform, concourse floor, roof, walls, entrance opening, pillars, benches, signboard and signal structure.
- Station walls and solid fixtures are included in player collision bounds.
- Existing railway exclusion rules for vegetation, rocks and wildlife remain in place.
- Existing apartment, controls, environments, announcements and railway electrification systems are retained.

## Validation
- ZIP archive integrity is checked after packaging.
- TypeScript/TSX transpilation is checked for all source files.
- Full dependency-backed production build and Android gameplay testing could not be run in this environment; those checks remain pending.
