# LAST SANCTUARY — Final Eight-Day Campaign & Player Mansion Integration Specification

## Scope and source of truth

This update extends the existing six-day / 42-mission storyline. It does not replace the apartment → friends/park/Okhla Market → outbreak/reunion → railway journey → military starter base → farming/survival → transmission/railway mystery/rescue → The Last Sanctuary sequence. Days 7 and 8 extend that story with the player-home mansion and final campaign chapter.

The original `src/data/sixDayCampaign.ts` and all `SD_D*_**` identifiers must remain unchanged for compatibility. The new `src/data/eightDayCampaign.ts` imports that catalogue and appends 14 new missions (`LS_D7_01`–`LS_D8_07`). This is a mission catalogue; it is not yet connected to runtime objective triggers, campaign-day transitions, QuestJournalModal or save migration.

## Eight-day story structure

| Day | Theme | Mission count |
|---|---|---:|
| 1 | Normal life — apartment, friends, park, Okhla Market | 7 |
| 2 | Outbreak, reunion, return to apartment, collect supplies | 7 |
| 3 | Railway station and connected passenger-train journey | 7 |
| 4 | Military starter base, medical division, relocation, generator and defences | 7 |
| 5 | Farming, harvesting, storage and survival | 7 |
| 6 | Transmission, railway mystery, rescue and original Last Sanctuary finale | 7 |
| 7 | Player mansion discovery, medical wing, armoury, vehicle garage and rooftop | 7 |
| 8 | Research connection, survivor network, final journey and free-exploration unlock | 7 |

After mission `LS_D8_07`, the campaign should mark itself complete and allow indefinite free exploration. Do not impose a deadline or force the player to sleep between missions.

## Player mansion — replacement for the player's apartment

Replace the player's apartment with one coherent, physically explorable, four-storey mansion plus a separate rooftop terrace. The mansion must not be confused with or replace the military starter base.

### Levels and room allocation

- **Ground floor:** two functional front entrances, grand lobby, living room, kitchen, dining room, guest bedroom, one bathroom, indoor pool, access to backyard and the multi-vehicle garage.
- **First floor:** master bedroom with attached bathroom, two additional bedrooms, one shared bathroom, family lounge, private library, workspace and mansion medical wing (examination room, recovery room and medical storage).
- **Second floor:** gaming room, cinema, gym, armoury/equipment storage, maintenance room, security room, communications room and one common bathroom.
- **Third floor:** emergency command centre, indoor farming, food/cold storage, water purification, backup generator, workshop, repair room and utility storage. No bathroom on this floor.
- **Rooftop terrace:** large rooftop swimming pool, continuous glass perimeter boundary with supporting frames and secure access gate, lounge, garden, pergola, outdoor kitchen/dining, solar panels, water storage and observation area. No bathroom on the rooftop.

**Bathroom count is exactly four:** one ground-floor guest bathroom; two first-floor bathrooms (master ensuite and shared); one second-floor common bathroom. No additional bathroom meshes, rooms or interactions may be added elsewhere.

### Vehicle garage

A dedicated garage is connected to the ground floor and has a clear driveway exit. Intended vehicles include cars, ATVs, motorcycles and bicycles. Each vehicle must use the existing vehicle physics/controller architecture; do not add competing controllers. Required gameplay includes enter/exit, steering, acceleration, braking, follow camera, mobile controls, parking/retrieval, collision and persistence of parked state. The garage shutter must open without trapping vehicles or blocking the driveway.

### Physical-world requirements

- All floors, walls, ceilings, staircases, railings, door frames, pool boundaries and glass terrace panels must have appropriate physical collision.
- All five levels (four floors plus rooftop) must be accessible through continuous staircases.
- The glass boundary must be visibly transparent while remaining a solid physical barrier; include a secure gate at the terrace access point.
- The rooftop pool must be a real bounded pool area with solid sides and floor, not a decorative plane that can be walked through.
- All rooms must be freely explorable. No invisible blockers in doorways or open corridors.
- Preserve the night-only sequential sleep rules and bed interaction. The player should spawn at the intended home spawn without starting in a swimming state or falling through the floor.
- Preserve mobile joystick, camera and interaction controls.

## Preserve previous world systems and story continuity

- Keep the original apartment's story role and existing medical room represented in the continuity of the story; the new mansion medical wing becomes the player's upgraded home facility. Keep the military starter-base medical division intact and separate.
- Preserve the three connected train carriages, solid floors/walls/roofs, transparent windows, continuous passage, player movement while train is moving, gap protection and train-carried player motion.
- Keep trains AI-operated unless the source project already explicitly supports player driving; do not create duplicate trains or a conflicting train controller for missions.
- Preserve the military starter base, its medical facilities, farming, survival, crafting, inventory, companions and existing save data.
- No zombies, wildlife, loot, vehicles or procedural objects may spawn inside protected mansion or military-base compound boundaries. Only authored compound objects are allowed inside.
- Maintain continuous compound walls, safe entrances, garage access and navigable turning space.

## Runtime integration still required

1. Connect `EIGHT_DAY_CAMPAIGN` to the existing story/quest manager and journal; do not add a parallel HUD.
2. Implement objective triggers against actual scene entities and interaction IDs.
3. Implement day completion and unlock ordering; each day has exactly seven missions.
4. Add save fields for campaign mission ID, completed mission IDs, objective flags, rescued survivor IDs, discoveries and campaign completion.
5. Migrate existing saves non-destructively. Missing campaign fields default to an unstarted extension; never reset inventory, player position, companions, prologue phase or base progress.
6. Implement the mansion geometry, collision, interactions, four-bathroom limit, garage vehicles and rooftop pool in the existing world/physics systems.
7. Verify the train interior and moving-player behaviour in the existing railway implementation.
8. Test on desktop and Android. Do not claim a feature is playable until it has been runtime-tested.

## Acceptance checklist

- [ ] Existing source builds and the original prologue still starts correctly.
- [ ] Existing saves load without losing progress.
- [ ] Campaign catalogue validates to exactly 56 missions: seven per day for eight days.
- [ ] Original six-day mission IDs remain unchanged.
- [ ] Day 7 introduces the mansion; Day 8 concludes the campaign and unlocks permanent free exploration.
- [ ] Mansion has four floors plus rooftop terrace, all physically accessible.
- [ ] Exactly four bathrooms exist.
- [ ] Medical wing and armoury are present; military-base medical division remains separate.
- [ ] Garage contains functional cars, ATVs, motorcycles and bicycles, using the existing vehicle system.
- [ ] Rooftop has a transparent, solid glass boundary and a physically bounded swimming pool.
- [ ] Train requirements remain intact.
- [ ] Protected compounds prevent procedural spawns.
- [ ] Mobile controls and performance are verified.

## Delivery status

The attached update ZIP contains the existing source project, the new eight-day campaign data catalogue, and this consolidated integration specification. The campaign catalogue and specification are authored; full runtime mission integration, mansion construction, vehicle implementation, physics integration and in-game QA are not certified by this package. Treat this as an integration-ready source update, not a fully implemented/tested final game build.
