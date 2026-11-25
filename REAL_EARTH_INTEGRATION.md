# Real Earth GIS Integration — Last Sanctuary: Rebirth

## Architecture Overview

1. **WGS-84 & World Coordinate Projection (`src/engine/geo/EarthProjection.ts`, `src/engine/geo/WorldCoordinates.ts`)**
   - Uses WGS-84 metric conversion (`EARTH_RADIUS_M = 6,378,137 m`, spherical Mercator meters and local cosine-corrected latitude/longitude offsets relative to `earthOrigin`) mapping `(lat, lon)` ↔ Three.js `(x, z)` where `+X` = East and `+Z` = South.
   - Supports bidirectional round-trip conversion (`latLonToWorld` ↔ `worldToLatLon`), slippy-tile indices (`z/tx/ty`), and SRTM 1°×1° tile IDs.

2. **Embedded Offline Macro Earth Dataset (`src/engine/geo/RealEarthDataset.ts`)**
   - **7 Continents & 18 Major Islands**: Multi-vertex Natural Earth 1:110m/50m-derived coastline polygons with signed coastal shoreline distance (`coastDistanceKm`) and coastal elevation ramp.
   - **5 Oceans**: Pacific, Atlantic, Indian, Arctic, and Southern oceans with continental shelf and abyssal bathymetry.
   - **Mountain Ranges & Plateaus**: Himalayas, Andes, Rockies, Alps, Urals, Caucasus, Pyrenees, Ethiopian Highlands, Atlas Mountains, Aravalli Range, Japanese Alps, and Tibetan Plateau.
   - **Hydrology & Deserts**: 12 major river corridors (Amazon, Nile, Yangtze, Mississippi, Ganges, Danube, Congo, Mekong, Rhine, Thames, Indus, Volga), 6 major lakes/inland seas, and 9 major desert belts.
   - **Köppen-Geiger & Altitude Biome Classification**: Maps latitude, coastal proximity, deserts, lakes, rivers, and elevation into playable biome IDs consumed by `BiomeGenerator.ts` and `WeatherManager.ts`.

3. **Real-World Cities, Landmarks & Live Sector Enrichment (`src/engine/geo/RealWorldCities.ts`, `src/engine/geo/OsmTileFetcher.ts`)**
   - **55+ Real-World Gazetteer Hubs**: Including Jaipur, New Delhi, Mumbai, London, New York City, Tokyo, Dubai, Sydney, Cairo, Rio de Janeiro, Kathmandu, Portland, Singapore, Seoul, and others across all continents.
   - **City Urban Footprints**: Applies urban road grids, metro/airport flags, and landmark anchors when streaming chunks inside city radius.
   - **OpenStreetMap Overpass API (`OsmTileFetcher.ts`)**: Throttled, cached (`localStorage` + in-memory cache) optional live building/road metadata enrichment with deterministic offline fallback so the engine never blocks or crashes offline.

4. **Off-Thread Terrain & Continuous Chunk Streaming (`src/engine/world/terrain.worker.ts`, `TerrainGenerator.ts`, `ChunkManager.ts`)**
   - `TerrainGenerator` samples continuous `RealEarthDataset` elevations combined with deterministic seeded multi-octave FBM noise and flattens major urban footprints so `ChunkManager` chunks stitch smoothly across chunk borders (`256m` grid).
   - `teleportToGeoCoordinate(lat, lon, label)` re-anchors `earthOrigin` to any target Earth location and persists it inside save slots alongside checkpoint, structures, quests, and outbreak telemetry.

## Dataset Sources & Limitations
- **Macro Coastlines / Boundaries**: Embedded simplified Natural Earth 1:110m/50m vector polygons and country bounding boxes (approximate country borders in curved/enclave regions, suitable for game-scale continent/country classification).
- **Elevation / Bathymetry**: Macro ridge/plateau/shelf GIS model blended with deterministic procedural detail (not a multi-gigabyte raw 30m DEM binary).
- **OSM Vector Cache**: Requires outbound access to `https://overpass-api.de/api/interpreter` when live building footprints are fetched; falls back cleanly to deterministic urban footprints offline.
