# LAST SANCTUARY — Compound protection, garages, farming and hunting update

## Absolute protected compound rule
The authored apartment/house compound and starter/military-base compound are safe no-procedural-spawn areas. The protected footprint includes every point inside the perimeter boundary walls, plus building interiors, upper floors, roofs, courtyard, garage, farm plots and medical rooms. No procedural zombies, wildlife, trees, rocks, berry bushes, scrap, loot, POIs, wrecks, vehicles or ambient props may be created there. Story-authored furniture, medical equipment, farm crops and the explicitly listed garage vehicles are permitted authored content. Spawn checks must use the shared `isProtectedSpawnZone(x,z)` predicate at creation time; mobile wildlife must also be prevented from crossing inward. Existing code already routes zombie spawns outside protected rectangles, filters wildlife spawn and locomotion, and filters chunk resources/POIs. Keep all these checks centralized in `src/engine/world/ProtectedSpawnZones.ts`.

## Authored garage roster
Apartment garage: one car, one ATV and one motorcycle.
Military starter-base garage: one ATV, one tank and one military enforcement vehicle.
These six are fixed authored vehicles, not random/procedural spawns. Their content manifest is `src/data/sanctuaryContent.ts`. Place each in a dedicated garage bay with collision, interaction/enter-exit support and save persistence. Do not replace the existing apartment or military medical facilities.

## Farming and food
Both compounds have protected cultivated farm areas. Crops are planted from seeds, visibly progress through growth stages, become harvestable, enter player inventory/storage, and can be eaten to restore hunger. The authored crop catalog includes tomato, potato, carrot, cabbage, corn, watermelon, apple, banana and wild berries with growth/yield/hunger metadata in `src/data/sanctuaryContent.ts`. Existing farm plot planting/harvest progression remains intact; extend it to select crop type and grant the selected harvest rather than always returning wild berries.

## Hunting and species
Wildlife remains outside the protected compound boundaries. The player may hunt eligible wild food species outside the compounds, harvest the carcass, and cook/eat the resulting meat to restore hunger. Huntable food category identifiers are listed in `src/data/sanctuaryContent.ts`. Do not spawn huntable animals inside either compound. Do not make protected compound farm crops or authored garage vehicles count as procedural spawns.

## Acceptance tests
1. Run repeated zombie, wildlife, resource, POI, loot and vehicle spawn attempts at multiple points inside each compound, including garage/farm/roof coordinates: zero procedural objects created inside.
2. Move wildlife toward the compound boundary: it must turn away and never cross the protected perimeter.
3. Confirm authored garage roster exactly matches the six vehicles above and each vehicle is interactable/drivable.
4. Plant, grow, harvest and eat every crop; hunger increases by its catalog value and harvested items can be stored.
5. Hunt an eligible species outside the walls, harvest and eat/cook meat; hunger increases.
6. Confirm apartment and military medical facilities, story sequence, railway and 42-mission campaign remain intact.
