# Train Physical Interior & Passenger Announcement Upgrade

Updated files:
- `src/engine/world/AITrainManager.ts`
- `src/components/TrainHUD.tsx`

Changes:
- Replaced the opaque full-height train body block with an underframe and carriage shell geometry.
- Added a visible walkable floor, upper/lower side-wall bands, window mullions, end bulkheads and roof.
- Split lower side-wall geometry around both sliding passenger-door openings.
- Kept the existing passenger movement bounds aligned with the carriage interior.
- Added live passenger announcements for approaching stations, arrivals/doors-open and departures.
- Exposed announcement information for both AI passenger trains and player-drivable trains.
- Added a responsive announcement strip to the train HUD.

Validation:
- TypeScript/TSX syntax transpilation passed for both modified files.
- ZIP archive integrity is checked after packaging.
- Full dependency install, production build and Android device gameplay testing remain pending because dependencies were not available in this environment.
