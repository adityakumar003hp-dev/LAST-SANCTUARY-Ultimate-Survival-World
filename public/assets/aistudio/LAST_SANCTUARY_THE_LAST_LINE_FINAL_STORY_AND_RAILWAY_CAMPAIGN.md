# LAST SANCTUARY — THE LAST LINE
## Final integrated story design: apartment compound, car, railway and survival

**Campaign promise:** When the roads fall silent, the railway carries hope.

This campaign extends the existing Oakridge Valley story. It does not replace the current canonical 20-event prologue, existing companions, survival systems, six AI railway services, seven-car passenger trains, or existing save data. The 40 missions in `src/data/lastLineCampaign.ts` are a structured campaign catalogue for integration into the existing quest/story manager and UI. They are not automatically activated merely by being present in the source tree.

## Core premise

The player and three friends — Marcus, Chloe and Dr. Maya — begin in their familiar apartment in Oakridge. The apartment is inside a fully enclosed residential compound. A private garage contains one parked sedan. The rooftop is a practical emergency lookout, not a swimming pool. On Day 1, the player discovers the local railway station and takes a normal passenger journey. After the meteorite impact and outbreak, the same railway becomes the only dependable way to reach isolated communities, rescue passengers and uncover the origin of a repeating emergency broadcast.

The railway is not a separate minigame: it is a major world-travel and story system that connects the apartment neighbourhood, town, stations, depots, remote regions and the eventual sanctuary.

## Four-day campaign arc

### Day 1 — The last normal day

1. **A New Morning:** Wake in the apartment and check the phone.
2. **Home Sweet Home:** Explore the four-floor apartment and staircase.
3. **The Private Compound:** Inspect the perimeter wall, secure entrance and clean courtyard.
4. **The Garage Key:** Find the key and inspect the parked sedan.
5. **Corner Roast:** Meet Marcus, Chloe and Dr. Maya.
6. **The Railway Station:** Discover Oakridge station, platforms and service board.
7. **The First Journey:** Board an AI-operated passenger service, explore the seven-car formation and exit at the destination.
8. **Strange News:** Hear the first report of an unidentified object approaching Earth and a strange signal reported near Pine Ridge.

Day 1 remains peaceful. No outbreak combat should be forced into this day. The first train journey establishes the train as an ordinary part of life before it becomes essential to survival.

### Day 2 — The world falls apart

9. **Emergency Broadcast:** Emergency alerts interrupt the morning.
10. **First Impact:** A meteorite strikes beyond Oakridge.
11. **The Infected Streets:** The player encounters the first infected and escapes.
12. **Return Behind the Walls:** The apartment compound becomes a temporary refuge.
13. **The Rooftop Watch:** Use the rooftop lookout, radio mast and solar equipment to assess the danger.
14. **Manual Override:** Restore the damaged gate mechanism and prepare the sedan.
15. **The Railway Emergency:** Discover that passenger services are still operating despite the crisis.
16. **The Missing Passengers:** Search a deserted platform and locate stranded civilians.
17. **The Last Departure:** Use an operating train to evacuate survivors from the danger zone.
18. **First Sanctuary:** Establish the existing Starter Base as a refuge.

### Day 3 — Beyond the city

19. **The Silent Platform:** Search an abandoned station for supplies and clues.
20. **The Medical Coach:** Recover medical supplies and help surviving passengers.
21. **Seven Coaches, Seven Stories:** Investigate the seven-car train, its passenger records and what happened aboard.
22. **The Broken Signal:** Investigate a signal fault disrupting railway operations.
23. **The Lost Service:** Locate a train that stopped reporting its position and recover its route recorder.
24. **The Supply Station:** Recover food, fuel and repair materials from a station depot.
25. **The Station Under Siege:** Defend survivors while they evacuate a threatened station.
26. **The Last Announcement:** Decode a repeating emergency message hidden in station announcements.
27. **A New Route:** Restore communications and open a route toward a distant region.
28. **The Hidden Shelter:** Find a possible survivor settlement beyond Oakridge.

### Day 4 — The railway network

29. **Six Lines:** Investigate the six existing services and record their status.
30. **The Northern Station:** Explore a remote station and identify a safe approach.
31. **The Passenger Rescue:** Rescue civilians stranded between stations.
32. **The Railway Warehouse:** Recover maintenance parts.
33. **The Signal Room:** Restore communications across the network.
34. **The Infected Platform:** Clear or bypass a dangerous platform.
35. **The Lost Family:** Find a missing family mentioned in a station message.
36. **The Final Coach:** Recover an emergency recording from a sealed coach.
37. **The Long Journey:** Travel beyond the known corridor to investigate the final transmission.
38. **A Sanctuary of Hope:** Establish contact with a potential permanent refuge.
39. **The Evacuation System:** Trace who is issuing automated railway instructions.
40. **The Last Line:** Reach the final station and decide whether the promised sanctuary is real or a trap.

## Mystery and narrative payoff

The first broadcast sounds routine: “Attention passengers. Emergency service remains operational. Proceed to the designated evacuation station.”

Later, a damaged recording reveals a second message: “If you can hear this, do not travel to the final station. The evacuation system is compromised.”

The player must compare station logs, coach recordings and signal-room data to determine who or what is controlling the network. The ending should resolve the immediate mystery but leave room for a later campaign: the final station may be a real refuge, a compromised automated system, or a deliberate lure. The game should not reveal the answer before the final mission.

## Railway gameplay requirements

- Preserve the six existing AI-operated services: F1, F2, F3, B1, B2 and B3.
- Preserve existing seven-car passenger train formations and the current AI train movement/physics.
- Do not add player locomotive-driving controls. The player is a passenger/explorer; trains remain AI-operated.
- Preserve existing boarding, disembarking, coach exploration, seats, announcements, train HUD, camera orbit and passenger AI.
- Train doors and boarding points must only be usable when the train is stopped and the current boarding logic permits it.
- Story missions must use the existing train and station entities; do not spawn duplicate trains for scripted sequences.
- A train mission must fail gracefully if its service is not currently available: show a clear wait/alternate-route objective rather than teleporting the player.
- Do not teleport companions visibly onto a moving train. Use a safe stopped-train boarding state and restore their positions only after a validated boarding interaction.
- Passenger rescue objectives must track rescued survivors and persist them through save/load.
- Station combat must respect platform edges, train clearance and safe boarding volumes.
- Keep railway tracks, platforms and station approaches outside the apartment's protected residential compound.

## Apartment and compound continuity requirements

- Preserve the existing apartment, four floors, rooms, companion story, player spawn and interaction systems.
- Add continuous handrails and protective balusters to both sides of every staircase flight, including landings. Maintain walkable stair width and collision clearance.
- The compound must have a continuous perimeter wall and a secure entrance gate.
- No procedural houses, trees, rocks, debris, scrap, bushes, wildlife or unrelated POIs may spawn inside the compound boundary. Only authored compound objects are allowed there.
- Keep the courtyard clean, paved and navigable. Do not block the player spawn, front entrance, garage opening or vehicle turning path.
- Remove the rooftop swimming pool completely. Replace it with a safe rooftop lookout deck, radio mast, solar panels and modest seating/pergola. No water-filled pool mesh or pool interaction should remain.
- Add an enclosed garage with a working shutter/door interaction and one authored parked sedan. The car must have a clear path to exit; it must not overlap the garage opening, player spawn or compound gate.
- Preserve existing vehicle physics and controls. Do not create a second conflicting vehicle controller.
- Keep the compound a safe starting area; story-driven threats can approach or damage its gate only when the appropriate event is active.

## Story and save integration requirements

- Keep the existing canonical Day 1/Day 2 20-event prologue IDs stable. Do not rename or delete existing event IDs.
- The 40-mission extended campaign is kept in `src/data/lastLineCampaign.ts` as a separate catalogue to avoid breaking legacy saves.
- Integrate the catalogue through the existing quest/story manager, objective navigator and quest journal rather than introducing a parallel HUD or save system.
- Persist current campaign mission ID, completed mission IDs, optional objective flags, passenger rescue IDs, route/signal discoveries, and the player's sanctuary decision.
- Migrate old saves safely: missing extended-campaign fields should default to an unstarted campaign; never reset existing inventory, player position, prologue phase, companions or base progress.
- Main missions should have checkpoints and clear fail/retry behaviour. Optional exploration should never soft-lock the main story.
- Keep companion roles consistent: Marcus supports practical/vehicle tasks, Chloe investigates signals and communications, and Maya handles medical/rescue context. Do not change their identities or overwrite existing dialogue without review.

## Performance and QA acceptance checklist

1. Existing game boots and the original prologue still starts at its current apartment spawn.
2. Existing save files load without losing progress.
3. Staircase rails are visible and do not obstruct player movement.
4. No pool remains on the rooftop; lookout deck is walkable.
5. Compound walls form a closed boundary and the gate opens/closes without blocking the car.
6. No procedural debris, vegetation, wildlife or buildings appear inside the compound.
7. Garage shutter interaction works and sedan can exit without collision trapping.
8. All six AI train services remain AI-operated and retain their existing routes.
9. Seven-car formation, passenger boarding, disembarking and coach exploration still work.
10. Railway mission objectives never place the player inside a moving train or outside safe boarding bounds.
11. Story mission completion and rescue flags survive save/load.
12. The existing town, wildlife, survival, crafting, inventory, base-building and unrelated systems remain intact.
13. Test on desktop and Android; use instancing, pooling, culling and low-cost collision where possible.

## Delivery note

This archive includes the existing project plus the extended campaign catalogue and this integration specification. The new 40-mission campaign is designed and data-authored, but a complete runtime integration into the prologue/quest UI, save schema and playable mission triggers still requires implementation and in-game QA. Do not describe the campaign as fully playable until those checks pass.
