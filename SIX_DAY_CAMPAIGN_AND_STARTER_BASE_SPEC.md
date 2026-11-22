# LAST SANCTUARY — Six-Day Campaign & Starter Base Specification

## Campaign authority
The active opening campaign is **6 days / 36 missions**, defined in `src/data/sixDayCampaign.ts`. It supersedes the earlier four-day / 40-mission THE LAST LINE catalogue. Legacy canonical prologue event IDs and save fields must remain unchanged. The campaign file is a structured mission catalogue; do not claim that all mission triggers/UI are runtime-wired unless a separate integration pass implements and tests them.

## Required story order
- **Day 1 — Normal life (01–07):** spawn in apartment; explore; reunite with Marcus, Chloe and Dr. Maya; roam together; visit park; visit Okhla Market; return home; sleep.
- **Day 2 — Outbreak (08–14):** wake; reunite; outbreak starts; explore carefully; return to apartment; collect supplies; prepare to depart. The apartment already contains its medical room from the beginning. The player does not build it.
- **Day 3 — Railway journey (15–19):** reach station; board a stopped passenger train; ride to the next station; disembark; discover the Starter Base nearby. Player is a passenger only.
- **Day 4 — Relocation (20–25):** enter and explore the military base; relocate; repair/fuel/activate emergency generator; secure compound; establish headquarters.
- **Day 5 — Food & survival (26–31):** inspect food; discover farming land; harvest vegetables/fruits; store produce; supply expedition; defend against infected.
- **Day 6 — Sanctuary (32–36):** Chloe finds a railway transmission; investigate; rescue survivors; Maya treats patients in the base medical division; confirm the sanctuary. After completion, free exploration remains open indefinitely.

## Absolute procedural no-spawn rule
The apartment compound and military Starter Base are **protected authored spaces**. No procedural world content may spawn inside their boundary or within their structures on any floor. This includes vegetation, grass tufts, trees, bushes, rocks, scrap, wildlife, random POIs/buildings, debris, random props, and ambient clutter. The exclusion must include chunk-edge checks and must apply to all floors/rooftops/garage/courtyard/interior volumes. Only deliberately authored objects are permitted: designed architecture, furniture, beds, kitchen equipment, medical equipment, weapons, armour, generator, solar panels, turrets, vehicles, planted/harvestable farm crops, storage, companions, and mission objects. Do not suppress these intentional authored objects.

### Current source implementation in this package
`src/engine/world/ProtectedSpawnZones.ts` centralizes X/Z protected footprints. It is wired into procedural resource placement, near-LOD grass tufts, POI placement, and wildlife spawn placement. Current coordinate rectangles are documented in that file and should be aligned to the final authored compound meshes if their positions or dimensions change. This does not automatically block arbitrary future spawn systems; every new procedural spawner must call `isProtectedSpawnZone(x, z)` before creating content. Interior volumes are protected by the same footprint projection across all Y levels.

## Apartment (existing home)
Keep the existing apartment, rooms, four-floor layout, friends, player spawn, garage/vehicle access, and pre-existing medical room. Maintain the clean enclosed compound, safe stair handrails/guardrails, perimeter walls/gate and the established rooftop redesign. No random vegetation, debris, wildlife, or props within the compound/building.

## Military Starter Base (new headquarters)
- Three storeys, continuous solid perimeter walls and collision barriers; infected, vehicles and other entities cannot pass through walls.
- Interactive main gate opens/closes; closed gate has solid collision; entrance remains traversable when open.
- Ground floor: living room/TV, refrigerator, dining table, kitchen, staircase with continuous handrails/landing guardrails, beds/sleeping quarters, emergency generator and solar power.
- Second floor: two separate divisions. (A) Armoury: 100 weapon types represented in the catalogue/display, racks, ammunition storage, armour/protective gear and loadout area. (B) Medical division: beds, cabinets, medkits, bandages, medicines and treatment equipment. This is separate from the apartment’s pre-existing medical room.
- Third floor: terrace, glass-enclosed rooms, guarded/walkable rooftop paths and solar panels. Exactly **four** automated rooftop turrets at distinct positions, each with independent 360-degree coverage.
- Compound defence: automated perimeter guns plus four roof turrets; hostile detection, tracking and engagement. Power-aware behaviour should use generator/solar state.
- Garage: accessible, drivable military enforcement/armoured patrol vehicle, ATV and tank. Preserve collision, parking and clear movement routes.
- Emergency generator: inspect, repair, fuel and activate; supplies essential systems. Solar panels provide supplementary power.
- Food warehouse/refrigerator and protected farming land. Player harvests existing crops (tomatoes, potatoes, carrots, cabbage, onions and seasonal fruit) and stores produce. Do not create a medical-room-building objective.
- The base should match the apartment’s detail/quality while retaining a military design language. The apartment remains intact as the original home.

## Railway preservation
Preserve six AI-operated services F1/F2/F3/B1/B2/B3 and seven-car passenger formations. Preserve train physics, boarding/disembarking, seats, coach exploration, passenger AI, announcements, HUD and camera orbit. Do not add player locomotive driving. Reuse existing trains/stations; never spawn duplicate trains for a mission. Boarding only when a train is stopped and valid. Do not teleport companions into moving trains. If a service is unavailable, wait or select a valid alternate service. Do not move tracks into the apartment compound.

## Companions
- Marcus: practical repairs and vehicle support.
- Chloe: communications and radio signals.
- Dr. Maya: medical and rescue support.
Keep companions on safe navigation/boarding paths; no teleporting into moving trains or through barriers.

## Acceptance checks for implementation
1. Exactly 36 campaign entries across six days, sequential unlock chain, 6 mission groups.
2. Apartment medical room exists from new game; no construction mission for it.
3. Military base has its own medical division.
4. Both compound footprints reject all procedural spawn classes, including chunk boundaries and every Y level.
5. Intentional crops, furniture, vehicles, generator, solar panels, armoury, medical assets and defences remain spawnable/authored.
6. Gate open/close and wall collision work.
7. Exactly four rooftop turrets; each covers 360 degrees independently.
8. Three specified garage vehicles are drivable.
9. Generator repair/fuel/power loop and food harvest/storage loop work.
10. Six AI train services and seven-car consists remain AI-only; passenger boarding is stopped-train-only.
11. Day 6 completion unlocks indefinite free exploration.
