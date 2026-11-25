# LAST SANCTUARY: REBIRTH — Apartment Dependency Binding Update

## Implemented in this source update
- Integrated `ApartmentObjectBinding` into `ApartmentBuilding`.
- At apartment construction completion, registers independently addressable direct-child object roots from the basement, Floors 1–4, rooftop, exterior-wall assembly, and staircase/elevator assembly.
- Refreshes registered bindings from the apartment update loop so their local dependency anchors remain synchronized with the live root transform.
- Exposes `getObjectBinding`, `bindApartmentObject`, and `unbindApartmentObject` for systems that create or replace apartment objects at runtime.
- Bindings provide local attachment points for visuals, animation pivots, effects, audio, interaction and navigation helpers, plus world-space synchronization callbacks for physics integrations.

## Important limitations
This is a dependency-binding foundation, not a completed migration of every legacy apartment subsystem. Existing interaction prompts and physics colliders that are still registered independently by fixed world coordinates are not automatically converted merely by creating a binding. Every such legacy system must explicitly use its object's binding or be migrated to binding-aware collider registration. In particular, this update does not claim that every removed architectural wall automatically unregisters its corresponding physics collider. Verify and migrate the relevant collider registrations before relying on wall-removal behavior.

The apartment's existing authored meshes, floor layout, animation code, interaction logic, and save/load behavior are otherwise left in place. No railway, railway command centre, vehicle garage, compound/world, mission, or NPC source files were intentionally changed.

## Validation
- Archive integrity: source ZIP passed `ZipFile.testzip()` before editing.
- Source changes: `ApartmentBuilding.ts` and existing `ApartmentObjectBinding.ts`.
- Full TypeScript typecheck, production build, and in-game movement/collision tests were not run in this environment.
