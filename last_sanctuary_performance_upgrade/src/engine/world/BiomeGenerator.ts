/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BiomeDefinition, BiomeType } from '../../types/game';
import { WorldCoordinates } from './WorldCoordinates';
import { RealEarthDataset } from '../geo/RealEarthDataset';
import { RealWorldCities } from '../geo/RealWorldCities';

export const BIOMES: Record<BiomeType, BiomeDefinition> = {
  dense_forest: {
    id: 'dense_forest',
    name: 'Pinecone Wildwood',
    description: 'Thick, ancient conifer forest with towering pines and abundant timber resources.',
    groundColor: 0x2b4a2b,
    fogColor: 0x415b49,
    foliageColor: 0x1f3b23,
    temperature: 18,
    elevationMultiplier: 1.0,
    roughness: 0.6,
    treeDensity: 0.85,
    rockDensity: 0.35,
    scrapDensity: 0.15,
    zombieThreatLevel: 2,
  },
  green_plains: {
    id: 'green_plains',
    name: 'Verdant Meadowlands',
    description: 'Expansive rolling grasslands, fertile soil, and open sightlines ideal for survival building.',
    groundColor: 0x4e7a3e,
    fogColor: 0x7aa579,
    foliageColor: 0x3d6630,
    temperature: 22,
    elevationMultiplier: 0.4,
    roughness: 0.25,
    treeDensity: 0.3,
    rockDensity: 0.2,
    scrapDensity: 0.15,
    zombieThreatLevel: 1,
  },
  abandoned_city: {
    id: 'abandoned_city',
    name: 'Metropolis Ruins',
    description: 'Crumbling skyscrapers, overgrown asphalt avenues, and high-value salvaged electronics.',
    groundColor: 0x3a3c3e,
    fogColor: 0x484b4d,
    foliageColor: 0x3f4f3a,
    temperature: 19,
    elevationMultiplier: 0.2,
    roughness: 0.15,
    treeDensity: 0.15,
    rockDensity: 0.3,
    scrapDensity: 0.95,
    zombieThreatLevel: 4,
  },
  small_village: {
    id: 'small_village',
    name: 'Rural Settlement',
    description: 'Clustered rustic homes, community stores, and pre-war survivor stockpiles.',
    groundColor: 0x4f6b45,
    fogColor: 0x6e8766,
    foliageColor: 0x36542f,
    temperature: 20,
    elevationMultiplier: 0.35,
    roughness: 0.3,
    treeDensity: 0.4,
    rockDensity: 0.25,
    scrapDensity: 0.6,
    zombieThreatLevel: 2,
  },
  farmland: {
    id: 'farmland',
    name: 'Golden Valley Agrarian Fields',
    description: 'Irrigated crop fields, old silos, and wild berry bushes with rich organic harvest.',
    groundColor: 0x5a6d3f,
    fogColor: 0x82916b,
    foliageColor: 0x66783c,
    temperature: 23,
    elevationMultiplier: 0.25,
    roughness: 0.2,
    treeDensity: 0.25,
    rockDensity: 0.15,
    scrapDensity: 0.3,
    zombieThreatLevel: 2,
  },
  industrial_zone: {
    id: 'industrial_zone',
    name: 'Ironworks Industrial Complex',
    description: 'Heavy manufacturing plants, refineries, scrap yards, and structural steel beams.',
    groundColor: 0x333538,
    fogColor: 0x4b4640,
    foliageColor: 0x2b382d,
    temperature: 16,
    elevationMultiplier: 0.3,
    roughness: 0.2,
    treeDensity: 0.1,
    rockDensity: 0.4,
    scrapDensity: 0.9,
    zombieThreatLevel: 4,
  },
  mountain_range: {
    id: 'mountain_range',
    name: 'Craggy Highlands',
    description: 'Dramatic granite peaks, quarry cliffs, deep fissures, and mineral veins.',
    groundColor: 0x5a5856,
    fogColor: 0x6b7178,
    foliageColor: 0x273629,
    temperature: 8,
    elevationMultiplier: 2.8,
    roughness: 0.95,
    treeDensity: 0.3,
    rockDensity: 0.95,
    scrapDensity: 0.2,
    zombieThreatLevel: 3,
  },
  valley: {
    id: 'valley',
    name: 'Mistwood Hollow',
    description: 'Sheltered lowlands nestled between ridges with moderate climate and steady wind.',
    groundColor: 0x42613d,
    fogColor: 0x66856a,
    foliageColor: 0x2d4d29,
    temperature: 20,
    elevationMultiplier: 0.5,
    roughness: 0.4,
    treeDensity: 0.6,
    rockDensity: 0.35,
    scrapDensity: 0.3,
    zombieThreatLevel: 2,
  },
  river_basin: {
    id: 'river_basin',
    name: 'Willow River Watershed',
    description: 'Winding freshwater tributary flanked by fertile banks, gravel bars, and water reeds.',
    groundColor: 0x3f5c40,
    fogColor: 0x597870,
    foliageColor: 0x305234,
    temperature: 21,
    elevationMultiplier: 0.2,
    roughness: 0.3,
    treeDensity: 0.5,
    rockDensity: 0.45,
    scrapDensity: 0.25,
    zombieThreatLevel: 2,
    waterColor: 0x1f5c7a,
  },
  lake_district: {
    id: 'lake_district',
    name: 'Emerald Water Basin',
    description: 'Scenic expansive freshwater lake surrounded by clay banks and wooden docks.',
    groundColor: 0x38523b,
    fogColor: 0x537780,
    foliageColor: 0x294a2e,
    temperature: 19,
    elevationMultiplier: 0.15,
    roughness: 0.25,
    treeDensity: 0.45,
    rockDensity: 0.3,
    scrapDensity: 0.2,
    zombieThreatLevel: 2,
    waterColor: 0x174d6b,
  },
  coastline: {
    id: 'coastline',
    name: 'Driftwood Shoreline',
    description: 'Sandy dunes, sea-weathered timber, and coastal winds opening into the ocean shelf.',
    groundColor: 0xb59e6d,
    fogColor: 0x8ab8c7,
    foliageColor: 0x5e734a,
    temperature: 24,
    elevationMultiplier: 0.1,
    roughness: 0.2,
    treeDensity: 0.2,
    rockDensity: 0.35,
    scrapDensity: 0.4,
    zombieThreatLevel: 2,
    waterColor: 0x166885,
  },
  island: {
    id: 'island',
    name: 'Isolated Archipelago',
    description: 'Natural sanctuary surrounded on all sides by deep water; excellent natural moat.',
    groundColor: 0x486b45,
    fogColor: 0x6e9ea8,
    foliageColor: 0x2e5730,
    temperature: 23,
    elevationMultiplier: 0.4,
    roughness: 0.45,
    treeDensity: 0.55,
    rockDensity: 0.5,
    scrapDensity: 0.25,
    zombieThreatLevel: 1,
    waterColor: 0x135978,
  },
  desert: {
    id: 'desert',
    name: 'Scorched Dunes Wastes',
    description: 'Arid sandstone dunes, blazing sun, dehydration danger, and exposed mineral deposits.',
    groundColor: 0xc49a56,
    fogColor: 0xbfa37a,
    foliageColor: 0x85774a,
    temperature: 36,
    elevationMultiplier: 0.8,
    roughness: 0.5,
    treeDensity: 0.05,
    rockDensity: 0.6,
    scrapDensity: 0.35,
    zombieThreatLevel: 3,
  },
  snow_peaks: {
    id: 'snow_peaks',
    name: 'Glacial Summit',
    description: 'Sub-zero blizzards, frost-covered pines, hypothermia risk, and silent frozen expanses.',
    groundColor: 0xd9e3eb,
    fogColor: 0xc9d4de,
    foliageColor: 0x5c7069,
    temperature: -5,
    elevationMultiplier: 2.5,
    roughness: 0.8,
    treeDensity: 0.4,
    rockDensity: 0.7,
    scrapDensity: 0.15,
    zombieThreatLevel: 3,
  },
  wetlands: {
    id: 'wetlands',
    name: 'Sunken Marshlands',
    description: 'Muddy bogs, weeping willows, murky standing water, and abundant medical herbal flora.',
    groundColor: 0x384732,
    fogColor: 0x4c5e47,
    foliageColor: 0x2b422a,
    temperature: 21,
    elevationMultiplier: 0.15,
    roughness: 0.35,
    treeDensity: 0.55,
    rockDensity: 0.2,
    scrapDensity: 0.35,
    zombieThreatLevel: 3,
    waterColor: 0x2b4238,
  },
  cave_system: {
    id: 'cave_system',
    name: 'Subterranean Cavern Outcrop',
    description: 'Dark limestone hollows, subterranean drippings, sheltered from surface storms.',
    groundColor: 0x3b3735,
    fogColor: 0x2e2926,
    foliageColor: 0x243325,
    temperature: 14,
    elevationMultiplier: 1.2,
    roughness: 0.85,
    treeDensity: 0.1,
    rockDensity: 0.95,
    scrapDensity: 0.4,
    zombieThreatLevel: 4,
  },
  subway_tunnels: {
    id: 'subway_tunnels',
    name: 'Metro Underground Transit',
    description: 'Old concrete tunnel arteries connecting city sectors; infested with lurking screamers.',
    groundColor: 0x2b2b2b,
    fogColor: 0x212121,
    foliageColor: 0x1f2b20,
    temperature: 15,
    elevationMultiplier: 0.2,
    roughness: 0.1,
    treeDensity: 0.05,
    rockDensity: 0.3,
    scrapDensity: 0.9,
    zombieThreatLevel: 5,
  },
  research_facility: {
    id: 'research_facility',
    name: 'Apex Bio-Tech Complex',
    description: 'High-security containment labs, satellite comms, military caches, and brute variants.',
    groundColor: 0x42464a,
    fogColor: 0x3d434a,
    foliageColor: 0x26382b,
    temperature: 18,
    elevationMultiplier: 0.3,
    roughness: 0.15,
    treeDensity: 0.15,
    rockDensity: 0.35,
    scrapDensity: 0.85,
    zombieThreatLevel: 5,
  },
  tropical_jungle: { id:'tropical_jungle', name:'Emerald Rainforest', description:'Dense humid canopy, giant ferns, vines, monsoon pools and exceptional biodiversity.', groundColor:0x315a35, fogColor:0x52745b, foliageColor:0x174525, temperature:28, elevationMultiplier:0.7, roughness:0.7, treeDensity:0.98, rockDensity:0.25, scrapDensity:0.08, zombieThreatLevel:3 },
  savannah: { id:'savannah', name:'Sunfire Savannah', description:'Wide golden grasslands, scattered acacia trees and seasonal watering holes.', groundColor:0x9b884c, fogColor:0xc0a66d, foliageColor:0x718044, temperature:30, elevationMultiplier:0.3, roughness:0.35, treeDensity:0.12, rockDensity:0.25, scrapDensity:0.12, zombieThreatLevel:2 },
  taiga: { id:'taiga', name:'Northern Taiga', description:'Cold evergreen woodland, peat clearings, conifers and long winter shadows.', groundColor:0x405747, fogColor:0x657c78, foliageColor:0x244234, temperature:4, elevationMultiplier:0.7, roughness:0.65, treeDensity:0.9, rockDensity:0.4, scrapDensity:0.12, zombieThreatLevel:2 },
  tundra: { id:'tundra', name:'Windcut Tundra', description:'Treeless permafrost plains, frozen ponds, low shrubs and exposed stone.', groundColor:0x9ba8a3, fogColor:0xb7c4c7, foliageColor:0x697c70, temperature:-12, elevationMultiplier:0.25, roughness:0.8, treeDensity:0.03, rockDensity:0.65, scrapDensity:0.1, zombieThreatLevel:2 },
  volcanic_wastes: { id:'volcanic_wastes', name:'Ashfall Caldera', description:'Black basalt, ash fields, geothermal vents and heat-scarred vegetation.', groundColor:0x383331, fogColor:0x62534c, foliageColor:0x4c4930, temperature:42, elevationMultiplier:1.6, roughness:0.95, treeDensity:0.02, rockDensity:0.95, scrapDensity:0.3, zombieThreatLevel:4 },
  mangrove_delta: { id:'mangrove_delta', name:'Mangrove Delta', description:'Tidal channels, tangled roots, brackish lagoons and dense coastal birdlife.', groundColor:0x465b43, fogColor:0x66857c, foliageColor:0x31563d, temperature:27, elevationMultiplier:0.1, roughness:0.55, treeDensity:0.75, rockDensity:0.1, scrapDensity:0.15, zombieThreatLevel:2, waterColor:0x315f59 },
  coral_coast: { id:'coral_coast', name:'Azure Reef Shelf', description:'Warm shallow coastal waters, reef shelves, tide pools and marine habitats.', groundColor:0x8eaa91, fogColor:0x8bb8bd, foliageColor:0x4b805e, temperature:26, elevationMultiplier:0.05, roughness:0.2, treeDensity:0.08, rockDensity:0.35, scrapDensity:0.08, zombieThreatLevel:1, waterColor:0x167b9b },
  badlands: { id:'badlands', name:'Redstone Badlands', description:'Eroded red mesas, dry ravines, hoodoos and sparse hardy scrub.', groundColor:0x9b5c42, fogColor:0xb47c60, foliageColor:0x78613c, temperature:34, elevationMultiplier:1.1, roughness:0.9, treeDensity:0.04, rockDensity:0.9, scrapDensity:0.2, zombieThreatLevel:3 },
  ancient_forest: { id:'ancient_forest', name:'Elderwood Reserve', description:'Old-growth broadleaf forest, fallen logs, mossy stones and layered canopy.', groundColor:0x36543a, fogColor:0x58715b, foliageColor:0x23482e, temperature:17, elevationMultiplier:0.8, roughness:0.7, treeDensity:0.95, rockDensity:0.35, scrapDensity:0.08, zombieThreatLevel:2 },
  alpine_meadow: { id:'alpine_meadow', name:'High Alpine Meadow', description:'High elevation grasslands, wildflowers, glacial streams and steep ridgelines.', groundColor:0x70866a, fogColor:0x9aabb0, foliageColor:0x54724c, temperature:7, elevationMultiplier:1.8, roughness:0.55, treeDensity:0.12, rockDensity:0.7, scrapDensity:0.08, zombieThreatLevel:2 },
  bamboo_forest: { id:'bamboo_forest', name:'Whispering Bamboo', description:'Tall bamboo groves, shaded gullies, soft leaf litter and hidden clearings.', groundColor:0x4d7045, fogColor:0x6d896b, foliageColor:0x36703a, temperature:22, elevationMultiplier:0.5, roughness:0.5, treeDensity:0.88, rockDensity:0.2, scrapDensity:0.08, zombieThreatLevel:2 },
  crystal_cavern: { id:'crystal_cavern', name:'Prismatic Deep Cavern', description:'Subterranean mineral chambers with crystal deposits and low natural light.', groundColor:0x393c4d, fogColor:0x34384d, foliageColor:0x34464a, temperature:12, elevationMultiplier:0.2, roughness:0.85, treeDensity:0.0, rockDensity:1.0, scrapDensity:0.25, zombieThreatLevel:3 },
  sand_dunes: { id:'sand_dunes', name:'Golden Sand Dunes', description:'Sweeping undulating desert dunes with wind-rippled sand and scorching heat.', groundColor:0xd6ad60, fogColor:0xdec18a, foliageColor:0x9e884e, temperature:38, elevationMultiplier:0.9, roughness:0.4, treeDensity:0.02, rockDensity:0.3, scrapDensity:0.2, zombieThreatLevel:3 },
  rocky_canyon: { id:'rocky_canyon', name:'Crimson Red Canyon', description:'Deep carved gorges, sheer sandstone cliffs, echo hollows and perilous stone bridges.', groundColor:0xa64b2a, fogColor:0xb5694c, foliageColor:0x5a4833, temperature:29, elevationMultiplier:1.7, roughness:0.95, treeDensity:0.08, rockDensity:0.98, scrapDensity:0.25, zombieThreatLevel:4 },
  glacier_field: { id:'glacier_field', name:'Frostvein Glacier', description:'Towering shelves of glacial blue ice, perilous crevasses, and sub-zero katabatic gales.', groundColor:0xd4e9f7, fogColor:0xbed6e8, foliageColor:0x7fa2b8, temperature:-18, elevationMultiplier:2.2, roughness:0.85, treeDensity:0.01, rockDensity:0.85, scrapDensity:0.1, zombieThreatLevel:3, waterColor:0x88c4e8 },
  ashlands: { id:'ashlands', name:'Smoldering Ashlands', description:'Sulfurous volcanic ash plains, smoldering craters, basalt spires, and geothermal vents.', groundColor:0x2e2928, fogColor:0x4f4440, foliageColor:0x3d372e, temperature:45, elevationMultiplier:1.3, roughness:0.9, treeDensity:0.01, rockDensity:0.9, scrapDensity:0.35, zombieThreatLevel:4 },
  waterfall_valley: { id:'waterfall_valley', name:'Cascade Mist Valley', description:'High cliff amphitheater with roaring waterfalls plunging into emerald freshwater pools.', groundColor:0x3d6842, fogColor:0x6e9a80, foliageColor:0x2d6132, temperature:21, elevationMultiplier:0.9, roughness:0.7, treeDensity:0.8, rockDensity:0.5, scrapDensity:0.15, zombieThreatLevel:2, waterColor:0x19747e },
  dinosaur_valley: { id:'dinosaur_valley', name:'Prehistoric Dinosaur Basin', description:'Primeval lost world sheltered by towering crags. Roamed by Apex T-Rex, Triceratops, Velociraptor packs, and Brachiosaurus.', groundColor:0x47633b, fogColor:0x68855a, foliageColor:0x225528, temperature:26, elevationMultiplier:0.75, roughness:0.65, treeDensity:0.85, rockDensity:0.45, scrapDensity:0.1, zombieThreatLevel:4 },
  deep_swamp: { id:'deep_swamp', name:'Blackwater Bayou', description:'Deep murky cypress swamp choked with moss, submerged hollows, glowing mushrooms, and lurkers.', groundColor:0x2e3b2b, fogColor:0x3b4a3a, foliageColor:0x213622, temperature:24, elevationMultiplier:0.12, roughness:0.45, treeDensity:0.75, rockDensity:0.15, scrapDensity:0.3, zombieThreatLevel:4, waterColor:0x23382c },
};

export class BiomeGenerator {
  /**
   * Deterministically samples Real Earth WGS-84 geography, city footprints,
   * and thematic micro-climate variation to select a biome at (x, z).
   */
  public static getBiomeAt(x: number, z: number, seed: number = 42): BiomeDefinition {
    const distFromOrigin = Math.hypot(x, z);
    if (distFromOrigin < 160) return BIOMES.green_plains;

    const { lat, lon } = WorldCoordinates.worldToLatLon(x, z);

    // 1. Check Real-World Cities / Airports / Seaports / Industrial Belts
    const urban = RealWorldCities.getUrbanBiomeOverride(lat, lon);
    if (urban && distFromOrigin > 185) {
      return BIOMES[urban.biome] ?? BIOMES.abandoned_city;
    }

    // 2. Sample Authentic Earth Continent / Ocean / Mountain / River / Desert Geography
    const earth = RealEarthDataset.sampleEarthGeography(lat, lon);

    const cX = x * 0.0008;
    const cZ = z * 0.0008;
    const tempNoise = Math.sin(cX + seed * 3.1) * Math.cos(cZ + seed * 1.7);
    const moistNoise = Math.cos(cX * 1.3 - seed * 2.3) * Math.sin(cZ * 1.1 + seed * 4.9);
    const biomeHash =
      Math.abs(
        Math.sin(Math.floor(x / 850) * 127.1 + Math.floor(z / 850) * 311.7 + seed * 19.19) * 43758.5453
      ) % 1;

    // Preserve rare discoverable thematic regions cleanly in appropriate Earth bands
    if (distFromOrigin > 420 && earth.isLand && !earth.isLake) {
      if (biomeHash > 0.965) return BIOMES.dinosaur_valley;
      if (biomeHash > 0.93 && earth.realElevationMeters > 800) return BIOMES.crystal_cavern;
      if (biomeHash > 0.90 && earth.riverProximity > 0.15) return BIOMES.waterfall_valley;
      if (biomeHash > 0.87 && earth.realElevationMeters > 1200 && Math.abs(lat) < 40) return BIOMES.volcanic_wastes;
      if (biomeHash > 0.84 && earth.suggestedBiome === 'dense_forest') return BIOMES.ancient_forest;
    }

    // Blend local Oakridge starter corridor rivers smoothly
    const riverWave = Math.sin(z * 0.004) * 45;
    const riverDist = Math.abs(x - 50 - riverWave);
    if (riverDist < 22 && distFromOrigin < 2200) return BIOMES.river_basin;

    // Local farmland/village corridors along highways between major cities
    const poiGridX = Math.floor((x + 500) / 900);
    const poiGridZ = Math.floor((z + 500) / 900);
    const poiHash = Math.abs(Math.sin(poiGridX * 37.1 + poiGridZ * 91.3 + seed) * 10000) % 1;
    if (
      distFromOrigin > 320 &&
      earth.isLand &&
      earth.realElevationMeters < 1800 &&
      Math.abs(lat) < 60 &&
      poiHash > 0.88
    ) {
      if (poiHash > 0.965) return BIOMES.research_facility;
      if (poiHash > 0.93) return BIOMES.small_village;
      return BIOMES.farmland;
    }

    // Subtle localized micro-variation within Earth macro climate
    if (earth.suggestedBiome === 'dense_forest' && moistNoise < -0.35) {
      return BIOMES.green_plains;
    }
    if (earth.suggestedBiome === 'green_plains' && tempNoise > 0.3 && moistNoise < -0.25) {
      return BIOMES.farmland;
    }

    return BIOMES[earth.suggestedBiome] ?? BIOMES.green_plains;
  }
}

