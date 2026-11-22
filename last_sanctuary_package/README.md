# LAST SANCTUARY — Ultimate Survival World

Google AI Studio / Vite / React / Three.js project.

## Run the project
1. Import the project into Google AI Studio or open it in a local development environment.
2. Install dependencies with `npm install`.
3. Start the development server with `npm run dev`.
4. Run `npm run build` before publishing.

## Apartment update
The active root `src/` project now contains the integrated five-floor apartment and retained basement:
- Basement: railway operations room, control desk and monitoring systems.
- Floor 1: living area, bedroom, kitchenette, bathroom and household appliances.
- Floor 2: medical centre with reception, patient bays, monitors, IV stands, oxygen and operating area.
- Floor 3: armory and secure storage.
- Floor 4: survival farm, water and utility systems.
- Floor 5: rooftop pool terrace, pergola, seating and solar panels.
- Four connected ascending staircase flights plus basement access.
- Existing compound enclosure, double gate, garage, sedan and backyard pool retained.

The apartment geometry, player floor-height handling, rooftop pool bounds, staircase traversal, floor cutaways and story rooftop objective have been updated together. Existing campaign, world, railway, wildlife, zombie, vehicle and survival systems remain in the active root source.

## Validation status
All 89 TypeScript/TSX source files passed syntax transpilation. A full Vite build and runtime play-test were not completed in this environment because the project dependencies are not installed here. Run `npm install` followed by `npm run build` in Google AI Studio to complete that validation.
