# Global Zombie Outbreak Expansion

This update extends the existing 12-day / 96-mission project source and preserves its existing story and game systems.

## Population simulation

- The city-level population ledger is dynamic and saved with the game.
- Once the outbreak is active, each in-game day multiplies each city's citizen population by **3.0×**. The increase is added to the healthy citizen pool.
- Each city receives a daily zombie-growth target of **2.0×** its infected-plus-transforming population at the start of the day.
- The target is reached through citizen conversions. Existing zombies are never duplicated to satisfy the target.
- There is no fixed worldwide zombie-count ceiling. The natural constraint is the currently simulated citizen population, which itself grows daily.
- Global city populations are simulated statistically; nearby citizens and zombies are represented by individual game entities.
- Infection can travel to further cities through the global transport-network simulation.

## Night and day conversion

- Daytime: **60 seconds** from exposure to conversion.
- Night-time: **10 seconds** from exposure to conversion (6× faster).
- The conversion duration is captured when exposure begins, so a citizen keeps the timer that applied at the moment of infection.
- The same timing applies to all ages and professions in the local town, regional pedestrians, and global statistical conversion cohorts.

## Citizens

Age groups:
- Child
- Teenager
- Young Adult
- Adult
- Middle-aged Adult
- Elderly

Profession examples:
- Military soldier, officer, medic and engineer
- Nurse, doctor, surgeon and paramedic
- Police officer, inspector, traffic police and station police
- Railway security, conductor, station manager and train engineer
- Prison warden and prison guard
- Firefighter, teacher, student, farmer, mechanic, construction worker, shopkeeper, courier and ranger

Age affects visual scale, collision size and converted-zombie scale; profession affects uniform/accessories and routine. Neither age nor profession grants infection immunity or changes conversion duration.

## Global asteroid impacts

The outbreak initializes asteroid impact zones across seven continental regions:
- North America — Oakridge (existing local prologue impact)
- South America — Sao Paulo
- Europe — London
- Africa — Cairo
- Asia — New Delhi
- Australia & Oceania — Sydney
- Antarctica — McMurdo research station

Six remote impact sites receive their own falling-meteor visual and persistent crater/crystal site. The local Oakridge impact continues to use the existing MeteoriteImpactManager. Impact sites are reprojected when the player changes the active Earth origin.

## Persistence and compatibility

- Daily population totals, daily zombie targets, conversion cohorts, processed day and impact-site IDs are saved in `globalOutbreakState`.
- New fields are optional so older saves remain loadable. Older transforming counts are restored as conversion cohorts.
- The outbreak remains active after campaign completion and during Free Exploration through the existing prologue update path.

## Validation status

- Static TypeScript/TSX transpilation passed for all 172 source files.
- `scripts/validate-global-outbreak.mjs` validates the requested multipliers, timer rules, profession/age catalogue, impact locations and removal of the former eight-zombie wave ceiling.
- A full TypeScript build/browser/mobile playthrough could not be run in this environment because the project dependencies (`three`, React, Vite and type packages) are not installed in the supplied source package. Install dependencies and run `npm run lint` and `npm run build` in the project environment before release.
