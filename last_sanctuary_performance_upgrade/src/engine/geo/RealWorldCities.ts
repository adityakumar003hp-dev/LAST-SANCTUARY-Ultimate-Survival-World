/**
 * Real-World Cities, Towns, Airports, Seaports, Industrial Belts & Landmarks GIS Catalog
 * Coordinates are real WGS-84 Latitude / Longitude.
 */

import { EarthProjection, normalizeLon } from './EarthProjection';
import { BiomeType } from '../../types/game';

export type RealSettlementTier =
  | 'megacity'
  | 'metropolis'
  | 'city'
  | 'town'
  | 'village'
  | 'airport'
  | 'seaport'
  | 'industrial'
  | 'landmark';

export interface RealWorldCity {
  id: string;
  name: string;
  country: string;
  continent: string;
  lat: number;
  lon: number;
  tier: RealSettlementTier;
  population: number;
  footprintRadiusKm: number;
  hasMetro: boolean;
  hasAirport: boolean;
  isSeaport: boolean;
  landmarkName?: string;
}

export const REAL_WORLD_CITIES: ReadonlyArray<RealWorldCity> = [
  // North America
  { id: 'us_portland', name: 'Portland', country: 'United States', continent: 'North America', lat: 45.5152, lon: -122.6784, tier: 'city', population: 652503, footprintRadiusKm: 11.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Columbia River Bridges & St. Johns Tower' },
  { id: 'us_oakridge', name: 'Oakridge', country: 'United States', continent: 'North America', lat: 43.7465, lon: -122.4614, tier: 'town', population: 3206, footprintRadiusKm: 2.5, hasMetro: false, hasAirport: false, isSeaport: false },
  { id: 'us_seattle', name: 'Seattle', country: 'United States', continent: 'North America', lat: 47.6062, lon: -122.3321, tier: 'metropolis', population: 749256, footprintRadiusKm: 13.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Puget Sound Space Needle & Port' },
  { id: 'us_sanfrancisco', name: 'San Francisco', country: 'United States', continent: 'North America', lat: 37.7749, lon: -122.4194, tier: 'metropolis', population: 808437, footprintRadiusKm: 11.5, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Golden Gate Suspension Span' },
  { id: 'us_losangeles', name: 'Los Angeles', country: 'United States', continent: 'North America', lat: 34.0522, lon: -118.2437, tier: 'megacity', population: 3822238, footprintRadiusKm: 26.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'us_newyork', name: 'New York City', country: 'United States', continent: 'North America', lat: 40.7128, lon: -74.006, tier: 'megacity', population: 8335897, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Liberty Harbor & Empire Spire' },
  { id: 'us_chicago', name: 'Chicago', country: 'United States', continent: 'North America', lat: 41.8781, lon: -87.6298, tier: 'megacity', population: 2665039, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'us_miami', name: 'Miami', country: 'United States', continent: 'North America', lat: 25.7617, lon: -80.1918, tier: 'metropolis', population: 449514, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'us_denver', name: 'Denver', country: 'United States', continent: 'North America', lat: 39.7392, lon: -104.9903, tier: 'city', population: 713252, footprintRadiusKm: 12.5, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'us_houston', name: 'Houston', country: 'United States', continent: 'North America', lat: 29.7604, lon: -95.3698, tier: 'megacity', population: 2302878, footprintRadiusKm: 22.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'ca_vancouver', name: 'Vancouver', country: 'Canada', continent: 'North America', lat: 49.2827, lon: -123.1207, tier: 'metropolis', population: 662248, footprintRadiusKm: 11.5, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'ca_toronto', name: 'Toronto', country: 'Canada', continent: 'North America', lat: 43.6532, lon: -79.3832, tier: 'megacity', population: 2794356, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'CN Communications Tower' },
  { id: 'ca_montreal', name: 'Montreal', country: 'Canada', continent: 'North America', lat: 45.5017, lon: -73.5673, tier: 'metropolis', population: 1762949, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'mx_cdmx', name: 'Mexico City', country: 'Mexico', continent: 'North America', lat: 19.4326, lon: -99.1332, tier: 'megacity', population: 9209944, footprintRadiusKm: 26.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'cu_havana', name: 'Havana', country: 'Cuba', continent: 'North America', lat: 23.1136, lon: -82.3666, tier: 'city', population: 2137847, footprintRadiusKm: 11.0, hasMetro: false, hasAirport: true, isSeaport: true },

  // South America
  { id: 'br_saopaulo', name: 'Sao Paulo', country: 'Brazil', continent: 'South America', lat: -23.5505, lon: -46.6333, tier: 'megacity', population: 11451245, footprintRadiusKm: 28.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'br_rio', name: 'Rio de Janeiro', country: 'Brazil', continent: 'South America', lat: -22.9068, lon: -43.1729, tier: 'megacity', population: 6211223, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Sugarloaf & Guanabara Harbor' },
  { id: 'br_manaus', name: 'Manaus', country: 'Brazil', continent: 'South America', lat: -3.119, lon: -60.0217, tier: 'city', population: 2063547, footprintRadiusKm: 11.0, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'ar_buenosaires', name: 'Buenos Aires', country: 'Argentina', continent: 'South America', lat: -34.6037, lon: -58.3816, tier: 'megacity', population: 3120612, footprintRadiusKm: 22.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'cl_santiago', name: 'Santiago', country: 'Chile', continent: 'South America', lat: -33.4489, lon: -70.6693, tier: 'megacity', population: 6257516, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'pe_lima', name: 'Lima', country: 'Peru', continent: 'South America', lat: -12.0464, lon: -77.0428, tier: 'megacity', population: 10092000, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'co_bogota', name: 'Bogota', country: 'Colombia', continent: 'South America', lat: 4.711, lon: -74.0721, tier: 'megacity', population: 7907000, footprintRadiusKm: 18.0, hasMetro: false, hasAirport: true, isSeaport: false },
  { id: 'ar_ushuaia', name: 'Ushuaia', country: 'Argentina', continent: 'South America', lat: -54.8019, lon: -68.303, tier: 'town', population: 82615, footprintRadiusKm: 3.5, hasMetro: false, hasAirport: true, isSeaport: true },

  // Europe
  { id: 'gb_london', name: 'London', country: 'United Kingdom', continent: 'Europe', lat: 51.5072, lon: -0.1276, tier: 'megacity', population: 8866180, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Westminster Clock Tower & Thames Crossing' },
  { id: 'gb_edinburgh', name: 'Edinburgh', country: 'United Kingdom', continent: 'Europe', lat: 55.9533, lon: -3.1883, tier: 'city', population: 506520, footprintRadiusKm: 8.5, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'ie_dublin', name: 'Dublin', country: 'Ireland', continent: 'Europe', lat: 53.3498, lon: -6.2603, tier: 'city', population: 592713, footprintRadiusKm: 9.5, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'fr_paris', name: 'Paris', country: 'France', continent: 'Europe', lat: 48.8566, lon: 2.3522, tier: 'megacity', population: 2102650, footprintRadiusKm: 19.0, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'Champ de Mars Iron Lattice Tower' },
  { id: 'de_berlin', name: 'Berlin', country: 'Germany', continent: 'Europe', lat: 52.52, lon: 13.405, tier: 'metropolis', population: 3755251, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'nl_rotterdam', name: 'Rotterdam Europort', country: 'Netherlands', continent: 'Europe', lat: 51.9244, lon: 4.4777, tier: 'seaport', population: 663900, footprintRadiusKm: 12.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'es_madrid', name: 'Madrid', country: 'Spain', continent: 'Europe', lat: 40.4168, lon: -3.7038, tier: 'metropolis', population: 3332035, footprintRadiusKm: 16.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'it_rome', name: 'Rome', country: 'Italy', continent: 'Europe', lat: 41.9028, lon: 12.4964, tier: 'metropolis', population: 2748109, footprintRadiusKm: 16.0, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'Flavian Amphitheatre Ruins' },
  { id: 'ch_zurich', name: 'Zurich', country: 'Switzerland', continent: 'Europe', lat: 47.3769, lon: 8.5417, tier: 'city', population: 428737, footprintRadiusKm: 7.5, hasMetro: false, hasAirport: true, isSeaport: false },
  { id: 'is_reykjavik', name: 'Reykjavik', country: 'Iceland', continent: 'Europe', lat: 64.1466, lon: -21.9426, tier: 'city', population: 139875, footprintRadiusKm: 6.5, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'no_oslo', name: 'Oslo', country: 'Norway', continent: 'Europe', lat: 59.9139, lon: 10.7522, tier: 'city', population: 709037, footprintRadiusKm: 9.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'gr_athens', name: 'Athens', country: 'Greece', continent: 'Europe', lat: 37.9838, lon: 23.7275, tier: 'metropolis', population: 643452, footprintRadiusKm: 12.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'tr_istanbul', name: 'Istanbul', country: 'Turkey', continent: 'Europe', lat: 41.0082, lon: 28.9784, tier: 'megacity', population: 15655924, footprintRadiusKm: 26.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'ru_moscow', name: 'Moscow', country: 'Russia', continent: 'Europe', lat: 55.7558, lon: 37.6173, tier: 'megacity', population: 13104177, footprintRadiusKm: 26.0, hasMetro: true, hasAirport: true, isSeaport: false },

  // Africa
  { id: 'eg_cairo', name: 'Cairo', country: 'Egypt', continent: 'Africa', lat: 30.0444, lon: 31.2357, tier: 'megacity', population: 10107125, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'Giza Plateau Pyramids & Nile Citadel' },
  { id: 'ma_casablanca', name: 'Casablanca', country: 'Morocco', continent: 'Africa', lat: 33.5731, lon: -7.5898, tier: 'metropolis', population: 3359818, footprintRadiusKm: 14.0, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'ng_lagos', name: 'Lagos', country: 'Nigeria', continent: 'Africa', lat: 6.5244, lon: 3.3792, tier: 'megacity', population: 15946000, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'ke_nairobi', name: 'Nairobi', country: 'Kenya', continent: 'Africa', lat: -1.2921, lon: 36.8219, tier: 'metropolis', population: 4397073, footprintRadiusKm: 15.0, hasMetro: false, hasAirport: true, isSeaport: false },
  { id: 'et_addis', name: 'Addis Ababa', country: 'Ethiopia', continent: 'Africa', lat: 9.032, lon: 38.7469, tier: 'metropolis', population: 3945000, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'za_capetown', name: 'Cape Town', country: 'South Africa', continent: 'Africa', lat: -33.9249, lon: 18.4241, tier: 'metropolis', population: 4710000, footprintRadiusKm: 15.0, hasMetro: false, hasAirport: true, isSeaport: true, landmarkName: 'Table Mountain Harbor' },
  { id: 'za_johannesburg', name: 'Johannesburg', country: 'South Africa', continent: 'Africa', lat: -26.2041, lon: 28.0473, tier: 'megacity', population: 5635127, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'mg_antananarivo', name: 'Antananarivo', country: 'Madagascar', continent: 'Africa', lat: -18.8792, lon: 47.5079, tier: 'city', population: 1275207, footprintRadiusKm: 9.0, hasMetro: false, hasAirport: true, isSeaport: false },

  // Asia
  { id: 'in_delhi', name: 'New Delhi', country: 'India', continent: 'Asia', lat: 28.6139, lon: 77.209, tier: 'megacity', population: 32941000, footprintRadiusKm: 28.0, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'Kartavya Arch & New Delhi Central Rail Terminal' },
  { id: 'in_jaipur', name: 'Jaipur', country: 'India', continent: 'Asia', lat: 26.9124, lon: 75.7873, tier: 'metropolis', population: 4207000, footprintRadiusKm: 16.5, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'Hawa Mahal Sandstone Facade & Amer Hill Fort' },
  { id: 'in_mumbai', name: 'Mumbai', country: 'India', continent: 'Asia', lat: 19.076, lon: 72.8777, tier: 'megacity', population: 21297000, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Marine Drive Harbor & Gateway Arch' },
  { id: 'in_bengaluru', name: 'Bengaluru', country: 'India', continent: 'Asia', lat: 12.9716, lon: 77.5946, tier: 'megacity', population: 13608000, footprintRadiusKm: 21.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'in_kolkata', name: 'Kolkata', country: 'India', continent: 'Asia', lat: 22.5726, lon: 88.3639, tier: 'megacity', population: 15333000, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'in_chennai', name: 'Chennai', country: 'India', continent: 'Asia', lat: 13.0827, lon: 80.2707, tier: 'megacity', population: 11776000, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'in_hyderabad', name: 'Hyderabad', country: 'India', continent: 'Asia', lat: 17.385, lon: 78.4867, tier: 'megacity', population: 10801000, footprintRadiusKm: 19.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'np_kathmandu', name: 'Kathmandu', country: 'Nepal', continent: 'Asia', lat: 27.7172, lon: 85.324, tier: 'city', population: 1571000, footprintRadiusKm: 10.0, hasMetro: false, hasAirport: true, isSeaport: false },
  { id: 'ae_dubai', name: 'Dubai', country: 'United Arab Emirates', continent: 'Asia', lat: 25.2048, lon: 55.2708, tier: 'metropolis', population: 3604030, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Downtown Spire & Jebel Ali Port' },
  { id: 'sa_riyadh', name: 'Riyadh', country: 'Saudi Arabia', continent: 'Asia', lat: 24.7136, lon: 46.6753, tier: 'megacity', population: 7009100, footprintRadiusKm: 22.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'sg_singapore', name: 'Singapore', country: 'Singapore', continent: 'Asia', lat: 1.3521, lon: 103.8198, tier: 'metropolis', population: 5917600, footprintRadiusKm: 16.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Marina Bay Port & Skybridge' },
  { id: 'th_bangkok', name: 'Bangkok', country: 'Thailand', continent: 'Asia', lat: 13.7563, lon: 100.5018, tier: 'megacity', population: 11070000, footprintRadiusKm: 22.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'cn_beijing', name: 'Beijing', country: 'China', continent: 'Asia', lat: 39.9042, lon: 116.4074, tier: 'megacity', population: 21843000, footprintRadiusKm: 28.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'cn_shanghai', name: 'Shanghai', country: 'China', continent: 'Asia', lat: 31.2304, lon: 121.4737, tier: 'megacity', population: 24870895, footprintRadiusKm: 28.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Pudong Financial Towers & Port' },
  { id: 'hk_hongkong', name: 'Hong Kong', country: 'China', continent: 'Asia', lat: 22.3193, lon: 114.1694, tier: 'megacity', population: 7498100, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'jp_tokyo', name: 'Tokyo', country: 'Japan', continent: 'Asia', lat: 35.6762, lon: 139.6503, tier: 'megacity', population: 37194000, footprintRadiusKm: 32.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Sumida Sky Spire & Tokyo Bay Terminal' },
  { id: 'jp_osaka', name: 'Osaka', country: 'Japan', continent: 'Asia', lat: 34.6937, lon: 135.5023, tier: 'megacity', population: 19013000, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'kr_seoul', name: 'Seoul', country: 'South Korea', continent: 'Asia', lat: 37.5665, lon: 126.978, tier: 'megacity', population: 9963000, footprintRadiusKm: 21.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'id_jakarta', name: 'Jakarta', country: 'Indonesia', continent: 'Asia', lat: -6.2088, lon: 106.8456, tier: 'megacity', population: 11249000, footprintRadiusKm: 22.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'ph_manila', name: 'Manila', country: 'Philippines', continent: 'Asia', lat: 14.5995, lon: 120.9842, tier: 'megacity', population: 14667000, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'lk_colombo', name: 'Colombo', country: 'Sri Lanka', continent: 'Asia', lat: 6.9271, lon: 79.8612, tier: 'city', population: 637000, footprintRadiusKm: 8.5, hasMetro: false, hasAirport: true, isSeaport: true },

  // Australia & Oceania
  { id: 'au_sydney', name: 'Sydney', country: 'Australia', continent: 'Australia & Oceania', lat: -33.8688, lon: 151.2093, tier: 'metropolis', population: 5312000, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Bennelong Harbor Shells & Arch Bridge' },
  { id: 'au_melbourne', name: 'Melbourne', country: 'Australia', continent: 'Australia & Oceania', lat: -37.8136, lon: 144.9631, tier: 'metropolis', population: 5078000, footprintRadiusKm: 19.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'au_perth', name: 'Perth', country: 'Australia', continent: 'Australia & Oceania', lat: -31.9505, lon: 115.8605, tier: 'city', population: 2192000, footprintRadiusKm: 13.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'nz_auckland', name: 'Auckland', country: 'New Zealand', continent: 'Australia & Oceania', lat: -36.8485, lon: 174.7633, tier: 'city', population: 1657200, footprintRadiusKm: 11.0, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'nz_queenstown', name: 'Queenstown', country: 'New Zealand', continent: 'Australia & Oceania', lat: -45.0312, lon: 168.6626, tier: 'village', population: 16600, footprintRadiusKm: 2.2, hasMetro: false, hasAirport: true, isSeaport: false },

  // Additional North America, Central America & Caribbean
  { id: 'us_boston', name: 'Boston', country: 'United States', continent: 'North America', lat: 42.3601, lon: -71.0589, tier: 'metropolis', population: 654776, footprintRadiusKm: 11.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'us_dallas', name: 'Dallas', country: 'United States', continent: 'North America', lat: 32.7767, lon: -96.797, tier: 'megacity', population: 1304379, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'us_phoenix', name: 'Phoenix', country: 'United States', continent: 'North America', lat: 33.4484, lon: -112.074, tier: 'megacity', population: 1644409, footprintRadiusKm: 19.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'us_anchorage', name: 'Anchorage', country: 'United States', continent: 'North America', lat: 61.2181, lon: -149.9003, tier: 'city', population: 287145, footprintRadiusKm: 9.0, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'us_honolulu', name: 'Honolulu', country: 'United States', continent: 'North America', lat: 21.3069, lon: -157.8583, tier: 'city', population: 345510, footprintRadiusKm: 8.5, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'pa_panama', name: 'Panama City', country: 'Panama', continent: 'North America', lat: 8.9824, lon: -79.5199, tier: 'metropolis', population: 1938000, footprintRadiusKm: 12.0, hasMetro: true, hasAirport: true, isSeaport: true },

  // Additional South America
  { id: 'ec_quito', name: 'Quito', country: 'Ecuador', continent: 'South America', lat: -0.1807, lon: -78.4678, tier: 'metropolis', population: 2011388, footprintRadiusKm: 11.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'bo_lapaz', name: 'La Paz', country: 'Bolivia', continent: 'South America', lat: -16.4897, lon: -68.1193, tier: 'city', population: 816044, footprintRadiusKm: 9.0, hasMetro: false, hasAirport: true, isSeaport: false },
  { id: 'uy_montevideo', name: 'Montevideo', country: 'Uruguay', continent: 'South America', lat: -34.9011, lon: -56.1645, tier: 'metropolis', population: 1381000, footprintRadiusKm: 11.5, hasMetro: false, hasAirport: true, isSeaport: true },

  // Additional Europe
  { id: 'fr_lyon', name: 'Lyon', country: 'France', continent: 'Europe', lat: 45.764, lon: 4.8357, tier: 'city', population: 522250, footprintRadiusKm: 9.5, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'de_munich', name: 'Munich', country: 'Germany', continent: 'Europe', lat: 48.1351, lon: 11.582, tier: 'metropolis', population: 1512491, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'pl_warsaw', name: 'Warsaw', country: 'Poland', continent: 'Europe', lat: 52.2297, lon: 21.0122, tier: 'metropolis', population: 1861975, footprintRadiusKm: 15.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'se_stockholm', name: 'Stockholm', country: 'Sweden', continent: 'Europe', lat: 59.3293, lon: 18.0686, tier: 'metropolis', population: 984748, footprintRadiusKm: 12.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'pt_lisbon', name: 'Lisbon', country: 'Portugal', continent: 'Europe', lat: 38.7223, lon: -9.1393, tier: 'city', population: 545796, footprintRadiusKm: 9.5, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'at_vienna', name: 'Vienna', country: 'Austria', continent: 'Europe', lat: 48.2082, lon: 16.3738, tier: 'metropolis', population: 1982097, footprintRadiusKm: 14.5, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'ua_kyiv', name: 'Kyiv', country: 'Ukraine', continent: 'Europe', lat: 50.4501, lon: 30.5234, tier: 'metropolis', population: 2952301, footprintRadiusKm: 16.5, hasMetro: true, hasAirport: true, isSeaport: false },

  // Additional Africa
  { id: 'tz_daressalaam', name: 'Dar es Salaam', country: 'Tanzania', continent: 'Africa', lat: -6.7924, lon: 39.2083, tier: 'megacity', population: 7776000, footprintRadiusKm: 17.0, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'gh_accra', name: 'Accra', country: 'Ghana', continent: 'Africa', lat: 5.6037, lon: -0.187, tier: 'metropolis', population: 2660000, footprintRadiusKm: 14.0, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'dz_algiers', name: 'Algiers', country: 'Algeria', continent: 'Africa', lat: 36.7538, lon: 3.0588, tier: 'metropolis', population: 2988145, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'cd_kinshasa', name: 'Kinshasa', country: 'DR Congo', continent: 'Africa', lat: -4.4419, lon: 15.2663, tier: 'megacity', population: 16316000, footprintRadiusKm: 23.0, hasMetro: false, hasAirport: true, isSeaport: false },

  // Additional Asia & Middle East
  { id: 'in_ahmedabad', name: 'Ahmedabad', country: 'India', continent: 'Asia', lat: 23.0225, lon: 72.5714, tier: 'megacity', population: 8650000, footprintRadiusKm: 18.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'in_pune', name: 'Pune', country: 'India', continent: 'Asia', lat: 18.5204, lon: 73.8567, tier: 'megacity', population: 7184000, footprintRadiusKm: 17.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'in_varanasi', name: 'Varanasi', country: 'India', continent: 'Asia', lat: 25.3176, lon: 82.9739, tier: 'city', population: 1740000, footprintRadiusKm: 10.5, hasMetro: false, hasAirport: true, isSeaport: false, landmarkName: 'Dashashwamedh Riverfront Ghats' },
  { id: 'in_udaipur', name: 'Udaipur', country: 'India', continent: 'Asia', lat: 24.5854, lon: 73.7125, tier: 'city', population: 608000, footprintRadiusKm: 8.5, hasMetro: false, hasAirport: true, isSeaport: false, landmarkName: 'Pichola Lake Marble Palace' },
  { id: 'pk_karachi', name: 'Karachi', country: 'Pakistan', continent: 'Asia', lat: 24.8607, lon: 67.0011, tier: 'megacity', population: 17236000, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'bd_dhaka', name: 'Dhaka', country: 'Bangladesh', continent: 'Asia', lat: 23.8103, lon: 90.4125, tier: 'megacity', population: 23210000, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'vn_hochiminh', name: 'Ho Chi Minh City', country: 'Vietnam', continent: 'Asia', lat: 10.8231, lon: 106.6297, tier: 'megacity', population: 9321000, footprintRadiusKm: 20.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'my_kualalumpur', name: 'Kuala Lumpur', country: 'Malaysia', continent: 'Asia', lat: 3.139, lon: 101.6869, tier: 'megacity', population: 8622000, footprintRadiusKm: 19.0, hasMetro: true, hasAirport: true, isSeaport: false, landmarkName: 'Petronas Twin Skybridge Towers' },
  { id: 'tw_taipei', name: 'Taipei', country: 'Taiwan', continent: 'Asia', lat: 25.033, lon: 121.5654, tier: 'megacity', population: 2646204, footprintRadiusKm: 15.0, hasMetro: true, hasAirport: true, isSeaport: true, landmarkName: 'Taipei 101 Tiered Spire' },
  { id: 'cn_chengdu', name: 'Chengdu', country: 'China', continent: 'Asia', lat: 30.5728, lon: 104.0668, tier: 'megacity', population: 21192000, footprintRadiusKm: 24.0, hasMetro: true, hasAirport: true, isSeaport: false },
  { id: 'il_telaviv', name: 'Tel Aviv', country: 'Israel', continent: 'Asia', lat: 32.0853, lon: 34.7818, tier: 'metropolis', population: 467875, footprintRadiusKm: 10.5, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'qa_doha', name: 'Doha', country: 'Qatar', continent: 'Asia', lat: 25.2854, lon: 51.531, tier: 'metropolis', population: 2382000, footprintRadiusKm: 14.0, hasMetro: true, hasAirport: true, isSeaport: true },

  // Additional Oceania
  { id: 'au_brisbane', name: 'Brisbane', country: 'Australia', continent: 'Australia & Oceania', lat: -27.4705, lon: 153.026, tier: 'metropolis', population: 2628000, footprintRadiusKm: 16.0, hasMetro: true, hasAirport: true, isSeaport: true },
  { id: 'nz_wellington', name: 'Wellington', country: 'New Zealand', continent: 'Australia & Oceania', lat: -41.2865, lon: 174.7762, tier: 'city', population: 418500, footprintRadiusKm: 8.5, hasMetro: false, hasAirport: true, isSeaport: true },

  // Antarctica Research Outposts
  { id: 'aq_mcmurdo', name: 'McMurdo Research Station', country: 'Antarctica', continent: 'Antarctica', lat: -77.8419, lon: 166.6863, tier: 'industrial', population: 850, footprintRadiusKm: 1.8, hasMetro: false, hasAirport: true, isSeaport: true },
  { id: 'aq_amundsen', name: 'Amundsen-Scott Polar Outpost', country: 'Antarctica', continent: 'Antarctica', lat: -85.0, lon: 0.0, tier: 'industrial', population: 150, footprintRadiusKm: 1.2, hasMetro: false, hasAirport: true, isSeaport: false },
];

export type RegionalArchStyle =
  | 'south_asian'
  | 'east_asian'
  | 'european'
  | 'mena_desert'
  | 'north_american'
  | 'latin_american'
  | 'african'
  | 'arctic';

export interface RegionalArchPalette {
  style: RegionalArchStyle;
  wallPrimary: number;
  wallSecondary: number;
  trimHex: number;
  roofHex: number;
  glassHex: number;
  accentHex: number;
  maxStories: number;
}

export interface CityProximityResult {
  city: RealWorldCity;
  distanceKm: number;
  insideFootprint: boolean;
}

export class RealWorldCities {
  public static getRegionalArchitecturePalette(
    lat: number,
    lon: number,
    country?: string,
    continent?: string | null,
    cityId?: string
  ): RegionalArchPalette {
    const c = (country || '').toLowerCase();
    const cont = (continent || '').toLowerCase();

    if (Math.abs(lat) > 64 || cont.includes('antarctica')) {
      return {
        style: 'arctic',
        wallPrimary: 0xd8dee6,
        wallSecondary: 0x9aa6b2,
        trimHex: 0xd96b27,
        roofHex: 0x475569,
        glassHex: 0x38bdf8,
        accentHex: 0xf59e0b,
        maxStories: 2,
      };
    }
    if (cityId === 'in_jaipur' || cityId === 'in_udaipur') {
      return {
        style: 'south_asian',
        wallPrimary: 0xd68974,
        wallSecondary: 0xe6b49c,
        trimHex: 0xf4ece1,
        roofHex: 0xb6604c,
        glassHex: 0x2f4f5f,
        accentHex: 0xe09f3e,
        maxStories: 4,
      };
    }
    if (c.includes('india') || c.includes('nepal') || c.includes('pakistan') || c.includes('bangladesh') || c.includes('sri lanka')) {
      return {
        style: 'south_asian',
        wallPrimary: 0xd8cbb8,
        wallSecondary: 0xc98c72,
        trimHex: 0xf0ebe3,
        roofHex: 0x7c6f64,
        glassHex: 0x2c5266,
        accentHex: 0xd97706,
        maxStories: 6,
      };
    }
    if (c.includes('japan') || c.includes('korea') || c.includes('china') || c.includes('taiwan') || c.includes('singapore') || c.includes('hong kong') || c.includes('malaysia') || c.includes('thailand') || c.includes('vietnam')) {
      return {
        style: 'east_asian',
        wallPrimary: 0xc2c8d1,
        wallSecondary: 0x4e5866,
        trimHex: 0x2a313b,
        roofHex: 0x334155,
        glassHex: 0x2b6e8a,
        accentHex: 0x0ea5e9,
        maxStories: 9,
      };
    }
    if (c.includes('egypt') || c.includes('united arab') || c.includes('saudi') || c.includes('qatar') || c.includes('morocco') || c.includes('algeria') || c.includes('israel')) {
      return {
        style: 'mena_desert',
        wallPrimary: 0xe2cca8,
        wallSecondary: 0xc7ad85,
        trimHex: 0xf2e8d5,
        roofHex: 0xb69970,
        glassHex: 0x2c7a8c,
        accentHex: 0xd4a346,
        maxStories: cityId === 'ae_dubai' || cityId === 'qa_doha' ? 10 : 5,
      };
    }
    if (cont.includes('europe') || c.includes('united kingdom') || c.includes('france') || c.includes('germany') || c.includes('italy') || c.includes('spain') || c.includes('russia')) {
      return {
        style: 'european',
        wallPrimary: 0xd9cfb8,
        wallSecondary: 0xb58670,
        trimHex: 0xede7dc,
        roofHex: 0x6f4338,
        glassHex: 0x2e4a5c,
        accentHex: 0xb45309,
        maxStories: 5,
      };
    }
    if (cont.includes('south america') || c.includes('mexico') || c.includes('cuba') || c.includes('panama')) {
      return {
        style: 'latin_american',
        wallPrimary: 0xdfd0ba,
        wallSecondary: 0xc87d65,
        trimHex: 0xf3ece2,
        roofHex: 0x9b4d38,
        glassHex: 0x2f5f73,
        accentHex: 0xeab308,
        maxStories: 6,
      };
    }
    if (cont.includes('africa')) {
      return {
        style: 'african',
        wallPrimary: 0xcbb495,
        wallSecondary: 0xa67454,
        trimHex: 0xe7dccb,
        roofHex: 0x6e4736,
        glassHex: 0x2e5866,
        accentHex: 0xd97706,
        maxStories: 4,
      };
    }
    // Default North America / Australia & Oceania
    return {
      style: 'north_american',
      wallPrimary: 0x9ea5ad,
      wallSecondary: 0x7c5848,
      trimHex: 0xd4d8de,
      roofHex: 0x3b424a,
      glassHex: 0x2c6480,
      accentHex: 0x38bdf8,
      maxStories: 8,
    };
  }

  public static findNearestCity(lat: number, lon: number, maxKm: number = 2500): CityProximityResult | null {
    const nLon = normalizeLon(lon);
    let bestCity: RealWorldCity | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < REAL_WORLD_CITIES.length; i++) {
      const c = REAL_WORLD_CITIES[i];
      // Fast degree-box filter first
      if (Math.abs(lat - c.lat) > maxKm / 90) continue;
      const d = EarthProjection.haversineDistanceKm(lat, nLon, c.lat, c.lon);
      if (d < bestDist && d <= maxKm) {
        bestDist = d;
        bestCity = c;
      }
    }

    if (!bestCity) return null;
    return {
      city: bestCity,
      distanceKm: bestDist,
      insideFootprint: bestDist <= bestCity.footprintRadiusKm,
    };
  }

  public static getUrbanBiomeOverride(lat: number, lon: number): {
    biome: BiomeType;
    city: RealWorldCity;
    distanceKm: number;
  } | null {
    const nearest = RealWorldCities.findNearestCity(lat, lon, 35);
    if (!nearest || !nearest.insideFootprint) return null;
    const { city, distanceKm } = nearest;
    const norm = distanceKm / Math.max(0.5, city.footprintRadiusKm);

    if (city.tier === 'industrial' || (city.isSeaport && norm > 0.65 && norm < 0.85)) {
      return { biome: 'industrial_zone', city, distanceKm };
    }
    if (city.tier === 'megacity' || city.tier === 'metropolis' || city.tier === 'city') {
      if (norm < 0.62) return { biome: 'abandoned_city', city, distanceKm };
      if (norm < 0.88) return { biome: 'industrial_zone', city, distanceKm };
      return { biome: 'small_village', city, distanceKm };
    }
    if (city.tier === 'town' || city.tier === 'village') {
      return { biome: norm < 0.7 ? 'small_village' : 'farmland', city, distanceKm };
    }
    return { biome: 'abandoned_city', city, distanceKm };
  }
}
