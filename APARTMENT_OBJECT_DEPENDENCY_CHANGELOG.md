# Apartment Object Dependency Binding Changelog

- Connected the reusable apartment object binding helper to `ApartmentBuilding`.
- Registered direct-child roots across basement, Floors 1–4, rooftop, exterior walls, and staircase/elevator assemblies.
- Synchronize registered roots each apartment update tick.
- Added runtime APIs to retrieve, bind, and unbind apartment object bindings.

Coverage is a foundation only. Existing independent world-coordinate interactions and colliders still require explicit migration. Automatic removal of every stale wall collider is not claimed. See `APARTMENT_OBJECT_DEPENDENCY_SYSTEM_REPORT.md`.
