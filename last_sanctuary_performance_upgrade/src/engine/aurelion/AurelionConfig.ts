import * as THREE from 'three';

export type AurelionLevelId = 'B2' | 'B1' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7';

export interface AurelionLevelSpec {
  id: AurelionLevelId;
  index: number; // 0 = B2, 1 = B1, 2 = F1 ... 8 = F7
  title: string;
  subtitle: string;
  floorY: number;
  ceilingY: number;
  halfWidth: number;
  halfDepth: number;
  hasAtriumVoid: boolean;
  isOutdoorCrown?: boolean;
}

export const AURELION_LEVELS: Record<AurelionLevelId, AurelionLevelSpec> = {
  B2: {
    id: 'B2',
    index: 0,
    title: 'Basement B2',
    subtitle: 'Infrastructure Kingdom',
    floorY: -7.6,
    ceilingY: -4.22,
    halfWidth: 15.0,
    halfDepth: 12.0,
    hasAtriumVoid: false,
  },
  B1: {
    id: 'B1',
    index: 1,
    title: 'Basement B1',
    subtitle: 'Private Operations & Railway Level',
    floorY: -4.0,
    ceilingY: -0.12,
    halfWidth: 15.0,
    halfDepth: 12.0,
    hasAtriumVoid: false,
  },
  F1: {
    id: 'F1',
    index: 2,
    title: 'Floor 1',
    subtitle: 'Grand Palace & Residential Reception',
    floorY: 0.245,
    ceilingY: 3.78,
    halfWidth: 15.0,
    halfDepth: 12.0,
    hasAtriumVoid: false,
  },
  F2: {
    id: 'F2',
    index: 3,
    title: 'Floor 2',
    subtitle: 'Private Residential Palace',
    floorY: 4.0,
    ceilingY: 7.38,
    halfWidth: 15.0,
    halfDepth: 12.0,
    hasAtriumVoid: true,
  },
  F3: {
    id: 'F3',
    index: 4,
    title: 'Floor 3',
    subtitle: 'Private Medical & Wellness Centre',
    floorY: 7.6,
    ceilingY: 10.98,
    halfWidth: 15.0,
    halfDepth: 12.0,
    hasAtriumVoid: true,
  },
  F4: {
    id: 'F4',
    index: 5,
    title: 'Floor 4',
    subtitle: 'Equipment, Storage & Maintenance',
    floorY: 11.2,
    ceilingY: 14.58,
    halfWidth: 15.0,
    halfDepth: 12.0,
    hasAtriumVoid: true,
  },
  F5: {
    id: 'F5',
    index: 6,
    title: 'Floor 5',
    subtitle: 'Agricultural & Food Production Garden',
    floorY: 14.8,
    ceilingY: 18.18,
    halfWidth: 12.4,
    halfDepth: 10.2,
    hasAtriumVoid: false,
  },
  F6: {
    id: 'F6',
    index: 7,
    title: 'Floor 6',
    subtitle: 'Private Resort & Entertainment',
    floorY: 18.4,
    ceilingY: 21.78,
    halfWidth: 11.6,
    halfDepth: 9.6,
    hasAtriumVoid: false,
  },
  F7: {
    id: 'F7',
    index: 8,
    title: 'Floor 7',
    subtitle: 'Crown Level — Sky Palace',
    floorY: 22.0,
    ceilingY: 25.8,
    halfWidth: 11.6,
    halfDepth: 9.6,
    hasAtriumVoid: false,
    isOutdoorCrown: true,
  },
};

export const AURELION_LEVEL_ORDER: AurelionLevelId[] = ['B2', 'B1', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'];

export const AURELION_ELEVATOR_CONFIGS = {
  main: {
    id: 'main' as const,
    name: 'Main Passenger Elevator',
    stops: ['B2', 'B1', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] as AurelionLevelId[],
    localX: 3.5,
    localZ: -5.6,
    cabW: 1.9,
    cabD: 1.9,
    tierRequirement: 2 as const,
  },
  service: {
    id: 'service' as const,
    name: 'Service & Freight Elevator',
    stops: ['B2', 'B1', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] as AurelionLevelId[],
    localX: 9.4,
    localZ: 3.6,
    cabW: 2.0,
    cabD: 2.0,
    tierRequirement: 2 as const,
  },
  private: {
    id: 'private' as const,
    name: 'Private Basement VIP Elevator',
    stops: ['B2', 'B1', 'F1'] as AurelionLevelId[],
    localX: -4.0,
    localZ: -5.6,
    cabW: 1.85,
    cabD: 1.85,
    tierRequirement: 1 as const,
  },
};

// Grand Central Atrium opening (open F2, F3, F4)
export const AURELION_ATRIUM_VOID = {
  minX: -3.2,
  maxX: 3.2,
  minZ: -2.8,
  maxZ: 2.8,
};

// Continuous Switchback Grand Stairwell opening (matches BasementControlRoom lane1X=6.65, lane2X=5.35, Z=-3.5..+0.7)
export const AURELION_STAIR_VOID = {
  minX: 4.75,
  maxX: 7.45,
  minZ: -3.65,
  maxZ: 0.85,
  eastLaneX: 6.65,
  westLaneX: 5.35,
  zStart: -3.5,
  zEnd: 0.7,
};

// Swimming pool volumes in world coordinates relative to origin (-26, 0, 38)
export const AURELION_ROOFTOP_INFINITY_POOL = {
  localMinX: -9.4,
  localMaxX: -2.6,
  localMinZ: -3.8,
  localMaxZ: 3.3,
  basinBottomY: 22.05,
  waterSurfaceY: 22.98,
  deckY: 23.15,
};

export const AURELION_F6_INDOOR_POOL = {
  localMinX: -10.2,
  localMaxX: -4.4,
  localMinZ: -3.4,
  localMaxZ: 2.6,
  basinBottomY: 18.45,
  waterSurfaceY: 19.22,
  deckY: 19.35,
};

export interface AurelionRoomDef {
  id: string;
  level: AurelionLevelId;
  code: string;
  name: string;
  center: [number, number]; // local [x, z]
}

export const AURELION_ROOMS: AurelionRoomDef[] = [
  // B2 — Infrastructure Kingdom (12 rooms)
  { id: 'b2_power_hall', level: 'B2', code: 'B2-01', name: 'Main Power-Generation Hall', center: [-11.0, -7.2] },
  { id: 'b2_battery_storage', level: 'B2', code: 'B2-02', name: 'Battery Storage Room', center: [-11.0, 0.0] },
  { id: 'b2_electrical_dist', level: 'B2', code: 'B2-03', name: 'Electrical Distribution Room', center: [-11.0, 7.2] },
  { id: 'b2_fuel_storage', level: 'B2', code: 'B2-04', name: 'Fuel Management & Storage', center: [-4.0, -8.5] },
  { id: 'b2_water_reserve', level: 'B2', code: 'B2-05', name: 'Water Reserve Chamber', center: [-4.0, 7.8] },
  { id: 'b2_water_filtration', level: 'B2', code: 'B2-06', name: 'Water Filtration & Purification', center: [2.5, 7.8] },
  { id: 'b2_workshop', level: 'B2', code: 'B2-07', name: 'Mechanical Maintenance Workshop', center: [11.2, -7.2] },
  { id: 'b2_emergency_warehouse', level: 'B2', code: 'B2-08', name: 'Emergency Supplies Warehouse', center: [11.2, 8.2] },
  { id: 'b2_general_storage', level: 'B2', code: 'B2-09', name: 'General Storage Vault', center: [3.2, -8.5] },
  { id: 'b2_maintenance_office', level: 'B2', code: 'B2-10', name: 'Building Maintenance Office', center: [11.2, -1.5] },
  { id: 'b2_hvac_room', level: 'B2', code: 'B2-11', name: 'Ventilation & Climate Control', center: [-2.0, 0.0] },
  { id: 'b2_service_lobby', level: 'B2', code: 'B2-12', name: 'Service Elevator Lobby', center: [9.4, 3.6] },
  { id: 'b2_farm_bay', level: 'B2', code: 'B2-13', name: 'Subterranean Raised Farm Bay', center: [2.0, 3.85] },

  // B1 — Private Operations & Railway Level (12 rooms)
  { id: 'b1_railway_ops', level: 'B1', code: 'B1-01', name: 'Private Railway Operations Room', center: [0.0, 1.2] },
  { id: 'b1_train_gallery', level: 'B1', code: 'B1-02', name: 'Train Monitoring Gallery', center: [-11.2, 7.5] },
  { id: 'b1_route_monitoring', level: 'B1', code: 'B1-03', name: 'Route Monitoring Room', center: [-11.2, 0.0] },
  { id: 'b1_comms_centre', level: 'B1', code: 'B1-04', name: 'Communications Centre', center: [-11.2, -7.5] },
  { id: 'b1_security_room', level: 'B1', code: 'B1-05', name: 'Compound Security Monitoring', center: [11.5, -7.5] },
  { id: 'b1_cctv_room', level: 'B1', code: 'B1-06', name: 'CCTV Observation Room', center: [11.5, -1.0] },
  { id: 'b1_emergency_coord', level: 'B1', code: 'B1-07', name: 'Emergency Coordination Room', center: [0.0, 9.2] },
  { id: 'b1_tech_support', level: 'B1', code: 'B1-08', name: 'Technical Support Room', center: [-6.0, 9.2] },
  { id: 'b1_private_ops_office', level: 'B1', code: 'B1-09', name: 'Private Operations Office', center: [11.5, 8.2] },
  { id: 'b1_meeting_room', level: 'B1', code: 'B1-10', name: 'Operations Meeting Room', center: [5.5, 9.2] },
  { id: 'b1_staff_lounge', level: 'B1', code: 'B1-11', name: 'Operations Staff Lounge', center: [0.0, -9.2] },
  { id: 'b1_secure_lobby', level: 'B1', code: 'B1-12', name: 'Secure Elevator Lobby', center: [-4.0, -8.5] },

  // F1 — Grand Palace & Residential Reception (15 rooms)
  { id: 'f1_entrance_hall', level: 'F1', code: '1F-01', name: 'Grand Entrance Hall', center: [0.0, -9.6] },
  { id: 'f1_grand_reception', level: 'F1', code: '1F-02', name: 'Double-Height Grand Atrium Reception', center: [0.0, -1.5] },
  { id: 'f1_living_room', level: 'F1', code: '1F-03', name: 'Main Luxury Living Room', center: [-1.5, 1.0] },
  { id: 'f1_guest_lounge', level: 'F1', code: '1F-04', name: 'Formal Guest Reception Lounge', center: [11.2, -7.5] },
  { id: 'f1_dining_hall', level: 'F1', code: '1F-05', name: 'Grand Dining Hall', center: [2.2, 1.5] },
  { id: 'f1_kitchen', level: 'F1', code: '1F-06', name: 'Professional Residential Kitchen', center: [6.0, 4.6] },
  { id: 'f1_food_prep', level: 'F1', code: '1F-07', name: 'Chef Food Preparation Suite', center: [11.2, 8.5] },
  { id: 'f1_pantry', level: 'F1', code: '1F-08', name: 'Walk-in Pantry & Cold Larder', center: [4.5, 8.2] },
  { id: 'f1_guest_bedroom', level: 'F1', code: '1F-09', name: 'Primary Residential Bedroom Suite', center: [-5.5, 3.8] },
  { id: 'f1_guest_bath', level: 'F1', code: '1F-10', name: 'Full Spa Guest Bathroom', center: [-5.2, -5.0] },
  { id: 'f1_botanical_garden', level: 'F1', code: '1F-11', name: 'Indoor Botanical Conservatory', center: [-11.5, 7.5] },
  { id: 'f1_stair_foyer', level: 'F1', code: '1F-12', name: 'Grand Staircase Atrium Gallery', center: [6.0, -1.5] },
  { id: 'f1_elevator_lobby', level: 'F1', code: '1F-13', name: 'Main Passenger Elevator Lobby', center: [3.5, -8.2] },
  { id: 'f1_family_room', level: 'F1', code: '1F-14', name: 'Rear Family Sitting & Cinema Room', center: [-11.5, -2.5] },
  { id: 'f1_main_terrace', level: 'F1', code: '1F-15', name: 'North Garden Patio Terrace', center: [0.0, 10.2] },

  // F2 — Private Residential Palace (14 rooms)
  { id: 'f2_master_bedroom', level: 'F2', code: '2F-01', name: 'Master Principal Bedroom', center: [-11.2, 6.2] },
  { id: 'f2_master_bath', level: 'F2', code: '2F-02', name: 'Master Marble Spa Bathroom', center: [-11.2, -1.5] },
  { id: 'f2_wardrobe', level: 'F2', code: '2F-03', name: 'Bespoke Walk-In Wardrobe', center: [-11.2, -7.8] },
  { id: 'f2_private_lounge', level: 'F2', code: '2F-04', name: 'Master Private Sitting Lounge', center: [-5.5, 7.5] },
  { id: 'f2_suite_marcus', level: 'F2', code: '2F-05', name: 'Bedroom Suite 2 — Marcus Cole', center: [11.4, -7.6] },
  { id: 'f2_suite_chloe', level: 'F2', code: '2F-06', name: 'Bedroom Suite 3 — Chloe Miller', center: [11.4, -1.0] },
  { id: 'f2_suite_maya', level: 'F2', code: '2F-07', name: 'Bedroom Suite 4 — Dr. Maya Lin', center: [11.4, 8.2] },
  { id: 'f2_shared_bath', level: 'F2', code: '2F-08', name: 'Guest Suites Shared Bathroom', center: [6.2, 8.5] },
  { id: 'f2_private_study', level: 'F2', code: '2F-09', name: 'Executive Private Study', center: [-5.8, -8.2] },
  { id: 'f2_library', level: 'F2', code: '2F-10', name: 'Aurelion Reading Library', center: [0.0, 8.2] },
  { id: 'f2_family_lounge', level: 'F2', code: '2F-11', name: 'Upper Atrium Mezzanine Lounge', center: [0.0, -8.2] },
  { id: 'f2_laundry', level: 'F2', code: '2F-12', name: 'Automated Laundry & Valet Room', center: [3.2, 8.5] },
  { id: 'f2_storage', level: 'F2', code: '2F-13', name: 'Household Linen & Safe Storage', center: [-5.8, 1.5] },
  { id: 'f2_balcony', level: 'F2', code: '2F-14', name: 'Panoramic South & North Balconies', center: [0.0, -11.2] },

  // F3 — Private Medical & Wellness Centre (12 rooms)
  { id: 'f3_reception', level: 'F3', code: '3F-01', name: 'Medical Reception & Triage Desk', center: [1.5, -8.2] },
  { id: 'f3_treatment', level: 'F3', code: '3F-02', name: 'Main Surgical & Treatment Suite', center: [-11.2, 6.2] },
  { id: 'f3_emergency', level: 'F3', code: '3F-03', name: 'Emergency Trauma Care Bay', center: [-11.2, -1.0] },
  { id: 'f3_recovery_1', level: 'F3', code: '3F-04', name: 'Private Recovery Suite A', center: [-5.8, 7.6] },
  { id: 'f3_recovery_2', level: 'F3', code: '3F-05', name: 'Private Recovery Suite B', center: [0.0, 7.6] },
  { id: 'f3_bed_chamber', level: 'F3', code: '3F-06', name: 'Multi-Bed Medical Observation Ward', center: [11.2, 7.8] },
  { id: 'f3_diagnostic', level: 'F3', code: '3F-07', name: 'Diagnostic Imaging & MRI Room', center: [-11.2, -7.8] },
  { id: 'f3_supply', level: 'F3', code: '3F-08', name: 'Sterile Medical Supply Vault', center: [11.2, -7.8] },
  { id: 'f3_pharmacy', level: 'F3', code: '3F-09', name: 'Compounding Pharmacy Storage', center: [11.2, -1.5] },
  { id: 'f3_rehab', level: 'F3', code: '3F-10', name: 'Physiotherapy & Rehabilitation', center: [-5.8, -8.2] },
  { id: 'f3_staff_office', level: 'F3', code: '3F-11', name: 'Chief Medical Officer Office', center: [5.2, 8.5] },
  { id: 'f3_sanitation', level: 'F3', code: '3F-12', name: 'Airlock Sanitation & Wellness Lounge', center: [-5.5, 1.5] },

  // F4 — Equipment, Storage & Maintenance (12 rooms)
  { id: 'f4_vault', level: 'F4', code: '4F-01', name: 'Biometric Armory & Equipment Vault', center: [-11.2, 0.0] },
  { id: 'f4_protective', level: 'F4', code: '4F-02', name: 'Protective Gear & CBRN Lockers', center: [-11.2, -7.8] },
  { id: 'f4_backpack', level: 'F4', code: '4F-03', name: 'Expedition Packs & Utility Racks', center: [-11.2, 7.8] },
  { id: 'f4_inventory', level: 'F4', code: '4F-04', name: 'Automated Equipment Inventory Hall', center: [-5.5, 7.5] },
  { id: 'f4_workshop', level: 'F4', code: '4F-05', name: 'Precision Maintenance Workshop', center: [11.2, -7.8] },
  { id: 'f4_repair', level: 'F4', code: '4F-06', name: 'Gear Repair & Calibration Bay', center: [11.2, -1.2] },
  { id: 'f4_sorting', level: 'F4', code: '4F-07', name: 'Resource Logistics & Sorting Room', center: [0.0, 8.2] },
  { id: 'f4_counter', level: 'F4', code: '4F-08', name: 'Quartermaster Issue Counter', center: [0.0, -8.2] },
  { id: 'f4_admin', level: 'F4', code: '4F-09', name: 'Inventory Administration Office', center: [5.5, 8.2] },
  { id: 'f4_lobby', level: 'F4', code: '4F-10', name: 'Secure Storage Elevator Lobby', center: [3.5, -8.2] },
  { id: 'f4_prep', level: 'F4', code: '4F-11', name: 'Mission Preparation Lounge', center: [-5.5, -8.2] },
  { id: 'f4_parts', level: 'F4', code: '4F-12', name: 'Technical Spare Parts Vault', center: [11.2, 8.2] },

  // F5 — Agricultural & Food Production Garden (12 rooms)
  { id: 'f5_hydro_main', level: 'F5', code: '5F-01', name: 'Main Vertical Hydroponic Garden', center: [-7.5, 0.0] },
  { id: 'f5_greenhouse', level: 'F5', code: '5F-02', name: 'Panoramic Glass Conservatory', center: [0.0, 0.0] },
  { id: 'f5_seed_lib', level: 'F5', code: '5F-03', name: 'Cryo Seed Storage Library', center: [-8.5, -7.2] },
  { id: 'f5_nursery', level: 'F5', code: '5F-04', name: 'Propagation & Plant Nursery', center: [-8.5, 7.2] },
  { id: 'f5_food_proc', level: 'F5', code: '5F-05', name: 'Cleanroom Food Processing', center: [0.0, 7.2] },
  { id: 'f5_harvest_store', level: 'F5', code: '5F-06', name: 'Chilled Harvest Cold Storage', center: [5.5, 7.2] },
  { id: 'f5_preservation', level: 'F5', code: '5F-07', name: 'Dehydration & Preservation Lab', center: [9.5, 7.2] },
  { id: 'f5_water_dist', level: 'F5', code: '5F-08', name: 'Nutrient & Water Distribution', center: [-2.5, -7.2] },
  { id: 'f5_ag_office', level: 'F5', code: '5F-09', name: 'Agricultural Monitoring Office', center: [3.5, -7.2] },
  { id: 'f5_botanical_lounge', level: 'F5', code: '5F-10', name: 'Botanical Research Lounge', center: [9.5, -7.2] },
  { id: 'f5_sky_garden', level: 'F5', code: '5F-11', name: 'Stepped Exterior Sky Garden Terraces', center: [-13.6, 0.0] },
  { id: 'f5_ag_equip', level: 'F5', code: '5F-12', name: 'Agricultural Equipment Room', center: [10.0, -1.0] },

  // F6 — Private Resort & Entertainment (12 rooms)
  { id: 'f6_cinema', level: 'F6', code: '6F-01', name: 'Private 4K Dolby Screening Cinema', center: [8.8, -6.2] },
  { id: 'f6_gaming', level: 'F6', code: '6F-02', name: 'Simulation & Gaming Lounge', center: [2.5, -6.5] },
  { id: 'f6_fitness', level: 'F6', code: '6F-03', name: 'Luxury Athletic Fitness Centre', center: [9.2, 0.0] },
  { id: 'f6_recreation', level: 'F6', code: '6F-04', name: 'Billiards & Recreation Hall', center: [0.0, 0.0] },
  { id: 'f6_spa', level: 'F6', code: '6F-05', name: 'Cedar Sauna & Spa Relaxation', center: [-8.2, -6.8] },
  { id: 'f6_aquarium_pool', level: 'F6', code: '6F-06', name: 'Aquarium Lounge & Indoor Pool', center: [-7.2, 2.5] },
  { id: 'f6_music', level: 'F6', code: '6F-07', name: 'Grand Piano Music & Hobby Room', center: [0.0, 6.8] },
  { id: 'f6_social', level: 'F6', code: '6F-08', name: 'Panoramic Velvet Social Lounge', center: [-2.2, -6.5] },
  { id: 'f6_refreshment', level: 'F6', code: '6F-09', name: 'Artisan Non-Alcoholic Juice & Espresso Bar', center: [3.2, 6.8] },
  { id: 'f6_changing', level: 'F6', code: '6F-10', name: 'Spa Changing Suites & Showers', center: [-8.8, 7.2] },
  { id: 'f6_rec_storage', level: 'F6', code: '6F-11', name: 'Resort Equipment Storage', center: [9.2, 7.2] },
  { id: 'f6_terrace', level: 'F6', code: '6F-12', name: 'Sunset Resort Wrap Terrace', center: [0.0, -9.0] },

  // F7 — Crown Level: Sky Palace (12 rooms / zones)
  { id: 'f7_infinity_pool', level: 'F7', code: '7F-01', name: 'Crown Infinity Swimming Pool', center: [-6.0, 0.0] },
  { id: 'f7_poolside_lounge', level: 'F7', code: '7F-02', name: 'Cabana Poolside Sun Lounge', center: [-6.0, -6.8] },
  { id: 'f7_observation_deck', level: 'F7', code: '7F-03', name: '360° Panoramic Observation Deck', center: [0.0, -7.8] },
  { id: 'f7_sky_garden', level: 'F7', code: '7F-04', name: 'Crown Rooftop Sky Garden', center: [-6.0, 6.8] },
  { id: 'f7_outdoor_dining', level: 'F7', code: '7F-05', name: 'Pergola Alfresco Dining Terrace', center: [1.5, 5.8] },
  { id: 'f7_relax_lounge', level: 'F7', code: '7F-06', name: 'Private Firepit Sky Lounge', center: [0.5, -1.5] },
  { id: 'f7_solar_array', level: 'F7', code: '7F-07', name: 'Photovoltaic Solar Energy Canopy', center: [7.8, 6.2] },
  { id: 'f7_solar_monitor', level: 'F7', code: '7F-08', name: 'Solar Inverter & Telemetry Kiosk', center: [9.4, -2.5] },
  { id: 'f7_maint_access', level: 'F7', code: '7F-09', name: 'Rooftop Service & Maintenance Deck', center: [9.4, 3.6] },
  { id: 'f7_weather_station', level: 'F7', code: '7F-10', name: 'Meteorological Weather Station', center: [-9.8, 7.5] },
  { id: 'f7_glass_pavilion', level: 'F7', code: '7F-11', name: 'Sky Palace Glass Pavilion', center: [5.5, -6.0] },
  { id: 'f7_crown_lobby', level: 'F7', code: '7F-12', name: 'Crown Penthouse Elevator Lobby', center: [3.5, -5.6] },
];

export interface AurelionDocument {
  id: string;
  title: string;
  location: string;
  author: string;
  timestamp: string;
  paragraphs: string[];
}

export const AURELION_DOCUMENTS: AurelionDocument[] = [
  {
    id: 'aurelion_charter',
    title: 'THE AURELION — Structural & Continuity Dossier',
    location: 'Floor 2 · Executive Reading Library',
    author: 'Dr. Elena Vance, Principal Estate Architect',
    timestamp: 'Pre-Outbreak Charter · Revision IX',
    paragraphs: [
      'Designed under Project Aurelion as an autonomous nine-level private estate, every subsystem of this residence operates independently of municipal grids.',
      'Basement B2 houses the twin 35 kW diesel power plants, 250 kWh LiFePO4 battery vaults, and 15,000-liter reverse-osmosis water reserves. Under critical load shedding, Tier 1 life-safety systems—Floor 3 Medical Centre, B1 Operations, and the VIP Basement Lift—remain energized indefinitely.',
      'All three elevator cores and the continuous marble-and-walnut switchback staircase remain mechanically unlocked for resident traversal across all nine levels from B2 (-7.6 m) to the Floor 7 Sky Palace Crown (+22.0 m).',
    ],
  },
  {
    id: 'survivor_field_log',
    title: 'Oakridge Compound Logistics & Companion Assignment Log',
    location: 'Floor 2 · Executive Private Study',
    author: 'Marcus Cole & Chloe Miller',
    timestamp: 'Sanctuary Log · Entry 04',
    paragraphs: [
      'Suite 2F-05 through 2F-07 on Floor 2 have been provisioned as dedicated private quarters for Marcus Cole, Chloe Miller, and Dr. Maya Lin.',
      'Floor 5 Hydroponics links directly into the B2 Potable Water manifold and Floor 1 Cold Larder Pantry, ensuring fresh produce harvests supply our survival rations without leaving the compound.',
      'All 20 perimeter sentry towers and the adjacent 8-floor Railway Command Centre operate on dedicated telemetry linked to Sub-Level B1.',
    ],
  },
  {
    id: 'aquarium_ecological_note',
    title: 'Floor 6 Closed-Loop Marine Biome & Rooftop Weather Spec',
    location: 'Floor 6 · Aquarium Lounge',
    author: 'Aurelion Estate Marine Engineering',
    timestamp: 'Technical Memorandum · Bio-6F',
    paragraphs: [
      'The Floor 6 Aquarium Lounge maintains a thermally balanced 24°C closed-loop reef habitat powered by B2 auxiliary inverters alongside an indoor plunge leisure pool.',
      'Upstairs on Floor 7, the Crown Infinity Pool and high-efficiency monocrystalline solar pergola supply peak daytime energy directly into the B2 LiFePO4 bank.',
    ],
  },
];

export function getLevelForLocalY(localY: number): AurelionLevelSpec {
  if (localY < -5.8) return AURELION_LEVELS.B2;
  if (localY < -1.8) return AURELION_LEVELS.B1;
  if (localY < 2.3) return AURELION_LEVELS.F1;
  if (localY < 6.0) return AURELION_LEVELS.F2;
  if (localY < 9.6) return AURELION_LEVELS.F3;
  if (localY < 13.2) return AURELION_LEVELS.F4;
  if (localY < 16.8) return AURELION_LEVELS.F5;
  if (localY < 20.4) return AURELION_LEVELS.F6;
  return AURELION_LEVELS.F7;
}

export function getNearestRoomAtLocalPos(localX: number, localY: number, localZ: number): AurelionRoomDef | null {
  const lvl = getLevelForLocalY(localY);
  const candidates = AURELION_ROOMS.filter((r) => r.level === lvl.id);
  let best: AurelionRoomDef | null = null;
  let bestDist = Infinity;
  for (const r of candidates) {
    const d = Math.hypot(localX - r.center[0], localZ - r.center[1]);
    if (d < bestDist) {
      bestDist = d;
      best = r;
    }
  }
  return best;
}

/**
 * Generates clean non-overlapping walkable slab panels for any level, automatically carving:
 * - Grand Staircase opening: X in [4.75, 7.45], Z in [-3.65, 0.85]
 * - Main Passenger Elevator shaft: X in [2.45, 4.55], Z in [-6.65, -4.55]
 * - Service Elevator shaft: X in [8.35, 10.45], Z in [2.55, 4.65]
 * - Private Basement Elevator shaft (only on levels B1, F1): X in [-5.05, -2.95], Z in [-6.65, -4.55]
 * - Grand Atrium Void (on F2, F3, F4): X in [-3.2, +3.2], Z in [-2.8, +2.8]
 */
export function buildAurelionSlabWithOpenings(
  spec: AurelionLevelSpec,
  mat: THREE.Material,
  thickness = 0.24
): THREE.Group {
  const group = new THREE.Group();
  group.name = `slab_${spec.id}`;
  const y = spec.floorY - thickness * 0.5;
  const minX = -spec.halfWidth;
  const maxX = spec.halfWidth;
  const minZ = -spec.halfDepth;
  const maxZ = spec.halfDepth;

  const holes: Array<{ x0: number; x1: number; z0: number; z1: number }> = [
    // Stairwell opening on all levels except B2 floor bottom
    ...(spec.id !== 'B2'
      ? [{ x0: AURELION_STAIR_VOID.minX, x1: AURELION_STAIR_VOID.maxX, z0: AURELION_STAIR_VOID.minZ, z1: AURELION_STAIR_VOID.maxZ }]
      : []),
    // Main & Service elevator openings on all levels except B2 bottom pit floor
    ...(spec.id !== 'B2'
      ? [
          { x0: 2.45, x1: 4.55, z0: -6.65, z1: -4.55 },
          { x0: 8.35, x1: 10.45, z0: 2.55, z1: 4.65 },
        ]
      : []),
    // Private Basement VIP lift only penetrates B1 and F1 (not B2 pit, and stops below F2)
    ...(spec.id === 'B1' || spec.id === 'F1'
      ? [{ x0: -5.05, x1: -2.95, z0: -6.65, z1: -4.55 }]
      : []),
    // Grand Central Atrium Void on F2, F3, F4
    ...(spec.hasAtriumVoid
      ? [{ x0: AURELION_ATRIUM_VOID.minX, x1: AURELION_ATRIUM_VOID.maxX, z0: AURELION_ATRIUM_VOID.minZ, z1: AURELION_ATRIUM_VOID.maxZ }]
      : []),
  ];

  // Sweep-line partition along X & Z so zero Z-fighting and exact crisp openings
  const xs = Array.from(new Set([minX, maxX, ...holes.flatMap((h) => [h.x0, h.x1])])).sort((a, b) => a - b);
  const zs = Array.from(new Set([minZ, maxZ, ...holes.flatMap((h) => [h.z0, h.z1])])).sort((a, b) => a - b);

  for (let xi = 0; xi < xs.length - 1; xi++) {
    const x0 = xs[xi];
    const x1 = xs[xi + 1];
    const w = x1 - x0;
    if (w < 0.05) continue;
    const cx = (x0 + x1) * 0.5;

    // Merge contiguous unblocked Z spans for fewer draw calls
    let spanStartZ: number | null = null;
    for (let zi = 0; zi < zs.length - 1; zi++) {
      const z0 = zs[zi];
      const z1 = zs[zi + 1];
      if (z1 - z0 < 0.05) continue;
      const cz = (z0 + z1) * 0.5;
      const insideHole = holes.some((h) => cx > h.x0 && cx < h.x1 && cz > h.z0 && cz < h.z1);
      if (!insideHole) {
        if (spanStartZ === null) spanStartZ = z0;
      } else if (spanStartZ !== null) {
        const d = z0 - spanStartZ;
        if (d >= 0.05) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
          panel.position.set(cx, y, (spanStartZ + z0) * 0.5);
          panel.receiveShadow = true;
          group.add(panel);
        }
        spanStartZ = null;
      }
    }
    if (spanStartZ !== null) {
      const d = zs[zs.length - 1] - spanStartZ;
      if (d >= 0.05) {
        const panel = new THREE.Mesh(new THREE.BoxGeometry(w, thickness, d), mat);
        panel.position.set(cx, y, (spanStartZ + zs[zs.length - 1]) * 0.5);
        panel.receiveShadow = true;
        group.add(panel);
      }
    }
  }

  return group;
}
