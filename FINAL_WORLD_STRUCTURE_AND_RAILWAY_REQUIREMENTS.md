# LAST SANCTUARY — Final World Structure & Railway Requirements

This document consolidates the latest user-approved requirements. It supplements the six-day campaign and Starter Base specification. It does not claim that every item below is already fully implemented or runtime-tested.

## 1. Protected compounds and procedural spawning

The Apartment Compound and Military Starter Base are protected, authored spaces. Procedural world generation must not place trees, grass, bushes, rocks, debris, wildlife, random structures, or ambient clutter inside either perimeter or inside any building/structure within it. This includes all floors, rooms, staircases, garages, courtyards, terraces and rooftops. Intentionally authored content remains allowed: furniture, beds, equipment, crops, vehicles, NPCs, mission props, medical supplies, generators and defences.

The protected-zone predicate must be consulted by every relevant spawn path: chunk scatter, vegetation, POI/building placement, wildlife spawning and wildlife wandering. The existing `src/engine/world/ProtectedSpawnZones.ts` defines the protected world-space footprints; keep those coordinates synchronized with the final authored compound footprints.

## 2. Player compound: exactly five gates

The Player Mansion / Rebirth Compound has exactly **five independent perimeter gates** in its otherwise continuous wall: **one main vehicle gate, two pedestrian gates and two vehicle gates**. Each gate is animated, collidable while closed, passable while open, independently interactive and included in the security console and save state. Do not add any sixth entrance or an un-gated wall opening.

The separate Military Starter Base retains its existing one double-leaf gate; this five-gate requirement applies to the Player Mansion / Rebirth Compound only.

## 3. Solid perimeter walls

Both compounds require continuous, visibly modeled solid perimeter walls. The Player Mansion / Rebirth Compound has only the five specified gate openings; the Military Starter Base retains its single double-leaf opening. Physical colliders must match visible wall geometry. Player, infected, wildlife and vehicles must not pass through, clip through, or walk over the walls. Each gate collider must update correctly as its leaves or lift panel open and close.

## 4. Solid, visible architecture in every explorable structure

Applies to the apartment, military base, every explorable building, railway stations, platforms and all passenger train coaches:

- Floors are visible modeled surfaces with matching walkable collision; no invisible-floor traversal or falling through.
- Walls are visible 3D geometry with physical collision; no invisible wall-only boundaries and no missing wall surfaces that expose the outside world.
- Windows are intentional openings with visible frames and glass. The outside world is visible only through actual windows, doors or other authored openings.
- Doorways and corridors remain navigable; doors must not be sealed by their own wall colliders.
- Every room and floor that is advertised as explorable must have a coherent interior shell, floor, wall and ceiling/roof treatment.

### Railway specifics

- Passenger coaches have a solid visible floor, side walls, end walls/bulkheads, roof and small framed windows. The player sees exterior scenery through the windows, not through missing walls.
- Station concourses have solid walkable floors, visible physical walls, roof/support structure and intentional door/opening areas.
- Platforms have solid visible platform slabs and collision, including their edges and safe boarding access.
- Preserve the six AI services F1, F2, F3, B1, B2 and B3, the seven-coach passenger formation, passenger boarding, seats, announcements, coach exploration and existing station schedule. Player remains a passenger; do not add locomotive driving.

## 5. Train wheel and bogie animation

Every visible wheel on every locomotive and coach/bogie rotates with actual train travel. Rotation is speed-synchronized, eases naturally with the train's movement, reverses direction for reverse-running services, and stops during station dwell. Wheels must remain aligned to rails and must not float or clip through track geometry. Bogies, axles and suspension remain attached to the coach and follow the route through curves.

`src/engine/world/AITrainManager.ts` already constructs visible bogies and wheel meshes and tags them with `userData.isTrainWheel`. The AI wheel update now advances wheels only when the train is travelling, applies the service direction to rotation, and leaves wheels still during station dwell. The update traverses each train group, so the wheel meshes across its consist animate together.

## 6. Preservation constraints

- Do not change the apartment spawn, existing apartment rooms, companions or canonical prologue event IDs/save compatibility.
- Do not alter the six railway lines, track spacing, station positions, seven-coach formation or AI-only control model.
- Do not create duplicate trains for missions. Use existing AI services and station entities.
- Keep the six-day campaign (36 missions) as the active campaign specification; the older 40-mission/four-day story is superseded.

## 7. Validation checklist

- [ ] No procedural spawn inside either protected compound or inside its structures.
- [ ] Player Mansion / Rebirth Compound has continuous walls and exactly five gates (1 main, 2 pedestrian, 2 vehicle).
- [ ] Military Starter Base retains its single double-leaf gate.
- [ ] Every gate blocks passage while closed and allows passage while open; no invisible extra entrances.
- [ ] Apartment and Starter Base rooms/floors have visible solid surfaces and matching collision.
- [ ] Every explorable station/platform/coach has solid visible floors and walls.
- [ ] Exterior view from an interior is only through modeled windows/doors/openings.
- [ ] All six AI services retain seven passenger coaches and working boarding/announcements.
- [ ] Wheels rotate while moving, stop at station dwell, and rotate in the correct direction.
- [ ] Player remains a passenger and cannot drive the locomotives.

## Implementation status note

The current Player Mansion / Rebirth Compound source now defines a 100 m × 126.5 m footprint (exactly five times the documented 44 m × 57.5 m baseline), five independently controlled gates, 20 perimeter towers and 20 armed sentries. The Military Starter Base gate remains unchanged. Source-level checks pass, but a full dependency install, production build and in-browser collision/navigation test remain required before runtime acceptance.
