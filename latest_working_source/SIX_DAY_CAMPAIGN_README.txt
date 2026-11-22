LAST SANCTUARY — SIX-DAY CAMPAIGN PACKAGE

Authoritative campaign: 6 days, 36 missions.
Source catalogue: src/data/sixDayCampaign.ts
Detailed requirements: SIX_DAY_CAMPAIGN_AND_STARTER_BASE_SPEC.md

IMPORTANT: This package includes the six-day mission data catalogue and a source-level protected-spawn-zone implementation. The campaign catalogue is not, by itself, proof that mission triggers/UI have been wired into runtime. The new Starter Base feature list is an implementation specification; do not treat every listed room, turret, vehicle, farming interaction or generator loop as playable until separately implemented and tested.

Protected zones: apartment compound and military Starter Base reject procedural vegetation/resources, grass tufts, POIs and wildlife spawns. Future procedural spawners must also call isProtectedSpawnZone(x, z).

Preserve legacy prologue event IDs, six AI-only railway services (F1/F2/F3/B1/B2/B3), seven-car passenger formations, and passenger-only player control.
