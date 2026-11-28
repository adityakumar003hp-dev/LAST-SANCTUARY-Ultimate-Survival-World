/**
 * THE NEXUS — Grand Railway Intelligence, Compound Surveillance & Outbreak Headquarters
 * Complete 8-Floor Configuration, Dual Elevator Specs, 15 Floor-1 Zones & 189 Unique Screens
 *
 * Strictly confined to Structure 2 plot:
 *   ApartmentBuilding local center: (-48, 0, +24) -> World center: (-74, 0, +62)
 *   Footprint: 22.4m (X: -11.2..+11.2) x 18.4m (Z: -9.2..+9.2)
 */

export type NexusFloorNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type NexusElevatorId = 'liftA' | 'liftB';
export type NexusClearanceLevel = 'visitor' | 'staff' | 'security' | 'executive';

export interface NexusFloorSpec {
  floor: NexusFloorNumber;
  code: string;
  title: string;
  department: string;
  floorY: number;
  ceilingHeight: number;
  accentHex: number;
  accentCss: string;
  floorTheme: string;
  requiredClearance: NexusClearanceLevel;
  rooms: Array<{
    id: string;
    name: string;
    zone: string;
    restricted?: boolean;
    localBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  }>;
}

export const NEXUS_PLOT_ORIGIN_LOCAL = { x: -48, y: 0, z: 24 } as const;
export const NEXUS_PLOT_WORLD = { x: -74, y: 0, z: 62 } as const;
export const NEXUS_FOOTPRINT = { halfW: 11.2, halfD: 9.2, width: 22.4, depth: 18.4 } as const;

export const NEXUS_FLOOR_ORDER: readonly NexusFloorNumber[] = [1, 2, 3, 4, 5, 6, 7, 8];

export const NEXUS_FLOORS: Record<NexusFloorNumber, NexusFloorSpec> = {
  1: {
    floor: 1,
    code: 'F1',
    title: 'Grand Terminal Atrium',
    department: 'Reception, Visitor Registration & Security Access',
    floorY: 0.65,
    ceilingHeight: 4.6,
    accentHex: 0xd4af37,
    accentCss: '#d4af37',
    floorTheme: 'Champagne Gold, Smoked Travertine & Bronze Glass Atrium',
    requiredClearance: 'visitor',
    rooms: [
      { id: 'f1_grand_entrance_hall', name: 'Grand Entrance Hall', zone: 'South Central Portal', localBounds: { minX: -3.2, maxX: 3.2, minZ: -9.2, maxZ: -5.2 } },
      { id: 'f1_main_reception', name: 'Main Reception', zone: 'Central Atrium South', localBounds: { minX: -2.8, maxX: 2.8, minZ: -5.2, maxZ: -1.8 } },
      { id: 'f1_visitor_registration', name: 'Visitor Registration Room', zone: 'Southwest Bay', localBounds: { minX: -10.8, maxX: -4.8, minZ: -9.0, maxZ: -4.5 } },
      { id: 'f1_staff_id_desk', name: 'Staff ID Desk', zone: 'Southeast Bay', localBounds: { minX: 4.8, maxX: 10.8, minZ: -9.0, maxZ: -4.5 } },
      { id: 'f1_security_access_lobby', name: 'Security Access Lobby', zone: 'Central Checkpoint', localBounds: { minX: -4.2, maxX: 4.2, minZ: -1.8, maxZ: 1.6 } },
      { id: 'f1_building_directory_wall', name: 'Building Directory Wall', zone: 'North Gallery Wall', localBounds: { minX: -4.2, maxX: 4.2, minZ: 6.4, maxZ: 9.0 } },
      { id: 'f1_railway_info_gallery', name: 'Railway Info Gallery', zone: 'East Corridor', localBounds: { minX: 3.8, maxX: 6.4, minZ: -4.5, maxZ: 4.5 } },
      { id: 'f1_visitor_waiting_lounge', name: 'Visitor Waiting Lounge', zone: 'South-Central West', localBounds: { minX: -10.6, maxX: -3.6, minZ: -4.5, maxZ: -2.2 } },
      { id: 'f1_staff_reception_office', name: 'Staff Reception Office', zone: 'Northwest Restricted Suite', restricted: true, localBounds: { minX: -10.8, maxX: -5.2, minZ: 4.2, maxZ: 9.0 } },
      { id: 'f1_lift_a_lobby', name: 'Lift A Lobby (Grand Luxury)', zone: 'West Main Lift Hall', localBounds: { minX: -5.6, maxX: -3.2, minZ: -3.4, maxZ: -0.2 } },
      { id: 'f1_lift_b_lobby', name: 'Lift B Lobby (Express Tactical)', zone: 'West Express Lift Hall', localBounds: { minX: -5.6, maxX: -3.2, minZ: 0.4, maxZ: 3.6 } },
      { id: 'f1_security_info_desk', name: 'Security Info Desk', zone: 'Central Security Post', localBounds: { minX: 2.2, maxX: 5.0, minZ: -2.0, maxZ: 1.4 } },
      { id: 'f1_conference_reception', name: 'Conference Reception', zone: 'Northeast Glass Lounge', localBounds: { minX: 4.5, maxX: 10.8, minZ: 5.2, maxZ: 9.0 } },
      { id: 'f1_atrium_gallery', name: 'Atrium Gallery', zone: 'Central Sculptural Core', localBounds: { minX: -3.0, maxX: 3.0, minZ: 1.6, maxZ: 6.4 } },
      { id: 'f1_information_centre', name: 'Information Centre', zone: 'Central East Kiosk', localBounds: { minX: -1.8, maxX: 1.8, minZ: 2.4, maxZ: 5.6 } },
    ],
  },
  2: {
    floor: 2,
    code: 'F2',
    title: 'Railway Network Intelligence Observatory',
    department: 'Corridor Cartography & Station Analytics',
    floorY: 5.25,
    ceilingHeight: 3.6,
    accentHex: 0x38bdf8,
    accentCss: '#38bdf8',
    floorTheme: 'Circular Slate Observatory & Interactive 3D Rail Network Table',
    requiredClearance: 'visitor',
    rooms: [
      { id: 'f2_observatory_rotunda', name: 'Central Network Map Rotunda', zone: 'Center', localBounds: { minX: -4.2, maxX: 4.2, minZ: -4.2, maxZ: 4.2 } },
      { id: 'f2_regional_map_alcove', name: 'Regional Map Alcove', zone: 'Southwest', localBounds: { minX: -10.8, maxX: -4.4, minZ: -8.8, maxZ: -4.2 } },
      { id: 'f2_route_analysis_room', name: 'Route Analysis Room', zone: 'Northwest', localBounds: { minX: -10.8, maxX: -4.4, minZ: 4.2, maxZ: 8.8 } },
      { id: 'f2_station_gallery', name: 'Station Gallery', zone: 'North Curved Wall', localBounds: { minX: -4.4, maxX: 5.8, minZ: 4.4, maxZ: 8.8 } },
      { id: 'f2_archive_room', name: 'Cartographic Archive Room', zone: 'Southeast', localBounds: { minX: 5.6, maxX: 10.8, minZ: -8.8, maxZ: -4.6 } },
      { id: 'f2_analytics_suite', name: 'Corridor Analytics Suite', zone: 'South Gallery', localBounds: { minX: -4.4, maxX: 5.6, minZ: -8.8, maxZ: -4.4 } },
    ],
  },
  3: {
    floor: 3,
    code: 'F3',
    title: 'Train Operations Arena',
    department: 'Live 6-Train Dispatch, Interlocking & Crew Control',
    floorY: 8.85,
    ceilingHeight: 3.6,
    accentHex: 0x22d3ee,
    accentCss: '#22d3ee',
    floorTheme: 'Tiered Obsidian Command Arena & Horseshoe Telemetry Consoles',
    requiredClearance: 'staff',
    rooms: [
      { id: 'f3_tiered_arena', name: 'Tiered Train Control Arena', zone: 'Center', localBounds: { minX: -4.6, maxX: 5.4, minZ: -4.4, maxZ: 4.8 } },
      { id: 'f3_supervisor_office', name: 'Dispatch Supervisor Office', zone: 'Northwest', restricted: true, localBounds: { minX: -10.8, maxX: -5.0, minZ: 4.2, maxZ: 8.8 } },
      { id: 'f3_briefing_room', name: 'Shift Briefing Room', zone: 'Southwest', localBounds: { minX: -10.8, maxX: -4.8, minZ: -8.8, maxZ: -4.4 } },
      { id: 'f3_operator_stations', name: '6-Train Operator Stations', zone: 'Curved Arena Tier', localBounds: { minX: -4.6, maxX: 5.2, minZ: -3.2, maxZ: 3.8 } },
      { id: 'f3_train_archive', name: 'Consist & Telemetry Archive', zone: 'South', localBounds: { minX: -4.4, maxX: 5.6, minZ: -8.8, maxZ: -5.0 } },
    ],
  },
  4: {
    floor: 4,
    code: 'F4',
    title: 'Infrastructure Engineering Laboratory',
    department: 'Track Geometry, Bridges, Tunnels & Electrification',
    floorY: 12.45,
    ceilingHeight: 3.6,
    accentHex: 0xf59e0b,
    accentCss: '#f59e0b',
    floorTheme: 'Brushed Titanium Engineering Deck & Amber Precision Grid',
    requiredClearance: 'staff',
    rooms: [
      { id: 'f4_track_test_bench', name: 'Track Test Model Bench', zone: 'Center West', localBounds: { minX: -4.5, maxX: 1.5, minZ: -3.2, maxZ: 3.5 } },
      { id: 'f4_bridge_tunnel_bay', name: 'Bridge & Tunnel Stress Bay', zone: 'Northwest', localBounds: { minX: -10.8, maxX: -4.5, minZ: 4.2, maxZ: 8.8 } },
      { id: 'f4_technical_workshop', name: 'Traction & Pantograph Workshop', zone: 'North', localBounds: { minX: -4.2, maxX: 5.8, minZ: 4.4, maxZ: 8.8 } },
      { id: 'f4_meeting_room', name: 'Civil Engineering Meeting Room', zone: 'Southwest', localBounds: { minX: -10.8, maxX: -4.6, minZ: -8.8, maxZ: -4.2 } },
      { id: 'f4_observation_gallery', name: 'Structural Observation Gallery', zone: 'South', localBounds: { minX: -4.4, maxX: 5.6, minZ: -8.8, maxZ: -4.4 } },
    ],
  },
  5: {
    floor: 5,
    code: 'F5',
    title: 'Tech & Comms Division',
    department: 'Server Telemetry, Radio Dispatch & Rail Digital Twin',
    floorY: 16.05,
    ceilingHeight: 3.6,
    accentHex: 0x818cf8,
    accentCss: '#818cf8',
    floorTheme: 'Deep Graphite Cleanroom, Silver Titanium & Cool Indigo Polymer',
    requiredClearance: 'staff',
    rooms: [
      { id: 'f5_server_galleries', name: 'Core Server Rack Galleries', zone: 'West & North', restricted: true, localBounds: { minX: -10.8, maxX: -4.6, minZ: 4.2, maxZ: 8.8 } },
      { id: 'f5_comms_center', name: 'Comms Operator Center', zone: 'Center', localBounds: { minX: -4.2, maxX: 5.2, minZ: -3.6, maxZ: 3.8 } },
      { id: 'f5_simulation_lab', name: 'Railway Simulation Lab', zone: 'North', localBounds: { minX: -4.2, maxX: 5.8, minZ: 4.4, maxZ: 8.8 } },
      { id: 'f5_research_lab', name: 'Tech & Telemetry R&D Lab', zone: 'Southwest', localBounds: { minX: -10.8, maxX: -4.6, minZ: -8.8, maxZ: -4.2 } },
      { id: 'f5_coordination_center', name: 'Staff Coordination Center', zone: 'South', localBounds: { minX: -4.4, maxX: 5.6, minZ: -8.8, maxZ: -4.4 } },
    ],
  },
  6: {
    floor: 6,
    code: 'F6',
    title: 'Executive Sky Command',
    department: 'Cross-Department Oversight & Strategic Command',
    floorY: 19.65,
    ceilingHeight: 3.6,
    accentHex: 0xeab308,
    accentCss: '#eab308',
    floorTheme: 'Smoked Walnut, Champagne Gold & Panoramic Bronze Smart Glass',
    requiredClearance: 'executive',
    rooms: [
      { id: 'f6_sky_command_room', name: 'Panoramic Sky Command Room', zone: 'Center', localBounds: { minX: -4.6, maxX: 5.4, minZ: -4.2, maxZ: 4.2 } },
      { id: 'f6_strategic_table', name: 'Strategic Overview Table', zone: 'Core Center', localBounds: { minX: -2.4, maxX: 2.6, minZ: -2.2, maxZ: 2.2 } },
      { id: 'f6_executive_office', name: 'Director Executive Office', zone: 'Northwest', restricted: true, localBounds: { minX: -10.8, maxX: -4.6, minZ: 4.2, maxZ: 8.8 } },
      { id: 'f6_conference_room', name: 'Private Executive Conference Room', zone: 'North', localBounds: { minX: -4.2, maxX: 5.8, minZ: 4.4, maxZ: 8.8 } },
      { id: 'f6_executive_reception', name: 'Executive Reception', zone: 'Southwest', localBounds: { minX: -10.8, maxX: -4.6, minZ: -8.8, maxZ: -4.2 } },
      { id: 'f6_observation_lounge', name: 'Bronze Glass Observation Lounge', zone: 'South', localBounds: { minX: -4.4, maxX: 5.6, minZ: -8.8, maxZ: -4.4 } },
    ],
  },
  7: {
    floor: 7,
    code: 'F7',
    title: 'Player Compound Intelligence & Radar',
    department: '20-Tower Defense Grid, 5 Gates, Fleet & Sanctuary Telemetry',
    floorY: 23.25,
    ceilingHeight: 3.8,
    accentHex: 0x06b6d4,
    accentCss: '#06b6d4',
    floorTheme: 'Circular Cybernetic Cyan Glass Observatory & 3D Compound Radar',
    requiredClearance: 'security',
    rooms: [
      { id: 'f7_compound_radar_rotunda', name: 'Elevated Compound 3D Radar Rotunda', zone: 'Center', localBounds: { minX: -4.8, maxX: 5.2, minZ: -4.8, maxZ: 4.8 } },
      { id: 'f7_turret_telemetry_bay', name: '20-Tower Turret Fire-Control Bay', zone: 'North Arc', restricted: true, localBounds: { minX: -4.6, maxX: 5.8, minZ: 4.8, maxZ: 8.8 } },
      { id: 'f7_gate_vehicle_bay', name: '5-Gate & Garage Access Gallery', zone: 'South Arc', localBounds: { minX: -4.6, maxX: 5.8, minZ: -8.8, maxZ: -4.8 } },
      { id: 'f7_utility_grid_bay', name: 'Power, Solar & Water Grid Bay', zone: 'Northwest', localBounds: { minX: -10.8, maxX: -4.8, minZ: 4.0, maxZ: 8.8 } },
    ],
  },
  8: {
    floor: 8,
    code: 'F8',
    title: 'Zombie Outbreak Intelligence & Radar',
    department: 'Planetary Containment, Threat Tracking & Scientific Bio-Intel',
    floorY: 27.05,
    ceilingHeight: 4.0,
    accentHex: 0xf43f5e,
    accentCss: '#f43f5e',
    floorTheme: 'Dark Graphite, Deep Crimson-Amber & Illuminated Crown Sky Observatory',
    requiredClearance: 'security',
    rooms: [
      { id: 'f8_outbreak_radar_dome', name: 'Central Global Outbreak Radar Table', zone: 'Center', localBounds: { minX: -4.8, maxX: 5.2, minZ: -4.8, maxZ: 4.8 } },
      { id: 'f8_panoramic_world_wall', name: 'Panoramic World Outbreak Display Wall', zone: 'North Arc', localBounds: { minX: -4.8, maxX: 5.8, minZ: 4.8, maxZ: 8.8 } },
      { id: 'f8_bio_analysis_stations', name: 'Scientific Containment Analysis Stations', zone: 'South Arc', localBounds: { minX: -4.8, maxX: 5.8, minZ: -8.8, maxZ: -4.8 } },
      { id: 'f8_emergency_command_bay', name: 'Planetary Recon & Emergency Intel Bay', zone: 'Northwest', restricted: true, localBounds: { minX: -10.8, maxX: -4.8, minZ: 4.0, maxZ: 8.8 } },
    ],
  },
};

export interface NexusElevatorConfig {
  id: NexusElevatorId;
  name: string;
  subtitle: string;
  speedMetersPerSec: number;
  localX: number;
  localZ: number;
  cabW: number;
  cabD: number;
  cabH: number;
  callButtonLocalX: number;
  callButtonLocalZ: number;
  theme: 'luxury_glass' | 'express_titanium';
}

export const NEXUS_ELEVATORS: Record<NexusElevatorId, NexusElevatorConfig> = {
  liftA: {
    id: 'liftA',
    name: 'Lift A — Grand Luxury Passenger Lift',
    subtitle: 'Panoramic Bronze Glass & Champagne Gold · Smooth Executive Drive',
    speedMetersPerSec: 4.4,
    localX: -7.6,
    localZ: -2.0,
    cabW: 2.0,
    cabD: 2.0,
    cabH: 2.85,
    callButtonLocalX: -5.85,
    callButtonLocalZ: -2.0,
    theme: 'luxury_glass',
  },
  liftB: {
    id: 'liftB',
    name: 'Lift B — Express Intelligence Lift',
    subtitle: 'Dark Graphite & Silver Titanium · High-Speed Direct Shaft',
    speedMetersPerSec: 7.6,
    localX: -7.6,
    localZ: 2.0,
    cabW: 1.9,
    cabD: 1.9,
    cabH: 2.85,
    callButtonLocalX: -5.85,
    callButtonLocalZ: 2.0,
    theme: 'express_titanium',
  },
};

export const NEXUS_STAIRWELL = {
  minX: 6.4,
  maxX: 10.2,
  minZ: -5.2,
  maxZ: 6.0,
  zStart: -4.0,
  zEnd: 4.2,
  laneX: 8.2,
  width: 2.6,
} as const;

export interface RadarLayerDef {
  id: string;
  label: string;
  description: string;
  defaultEnabled: boolean;
}

export const NEXUS_COMPOUND_RADAR_LAYERS: RadarLayerDef[] = [
  { id: 'terrain_footprint', label: '01 · Compound Terrain & 100×126.5m Plot', description: 'Exact compound perimeter boundary & elevation envelope', defaultEnabled: true },
  { id: 'buildings_3', label: '02 · 3 Hero Buildings (Aurelion, Nexus, Garage)', description: 'Exact footprints and vertical profiles of all 3 compound structures', defaultEnabled: true },
  { id: 'security_walls', label: '03 · Perimeter Blast Walls & Battlements', description: 'Reinforced 6m perimeter wall segments and breach integrity', defaultEnabled: true },
  { id: 'gates_5', label: '04 · All 5 Perimeter Gates & Access States', description: 'Main 12m, West Ped, East Ped, South Vehicular, North Vehicular', defaultEnabled: true },
  { id: 'towers_20', label: '05 · All 20 Security Towers & Sentry Turrets', description: 'Individual tower lock-on vectors, ammo reserves & health', defaultEnabled: true },
  { id: 'roads_paths', label: '06 · Courtyard Roads, Plazas & Walkways', description: 'Internal compound vehicular & pedestrian transit lanes', defaultEnabled: true },
  { id: 'vehicles_fleet', label: '07 · Vehicles & 4-Bay Garage Fleet', description: 'Armed SUV, Bike, Cycle, Military Carrier live GPS & battery', defaultEnabled: true },
  { id: 'railway_corridor', label: '08 · Adjacent 6-Track Railway Corridor', description: 'F1–F3 & B1–B3 rail lines north of compound perimeter', defaultEnabled: true },
  { id: 'power_water_grid', label: '09 · Power, Solar, Generator & Water Systems', description: 'THE AURELION solar arrays, diesel reserve, B2 battery & RO water', defaultEnabled: false },
  { id: 'player_marker', label: '10 · Player Live Transponder', description: 'Exact real-time survivor position, floor & heading', defaultEnabled: true },
  { id: 'npc_companions', label: '11 · Friendly Companions & Settlement NPCs', description: 'Marcus, Chloe, Dr. Maya Lin & sanctuary NPCs', defaultEnabled: true },
  { id: 'radar_sweeps', label: '12 · Tactical Range Rings & Threat Contacts', description: '50m / 150m / 500m defense arcs & active hostiles near perimeter', defaultEnabled: true },
];

export const NEXUS_OUTBREAK_RADAR_LAYERS: RadarLayerDef[] = [
  { id: 'earth_grid', label: '01 · Earth Coordinate Matrix & Biomes', description: 'Planetary lat/lon graticule & active world origin anchor', defaultEnabled: true },
  { id: 'cities_network', label: '02 · Monitored Global Cities', description: 'Real-time GlobalOutbreakSimulator metropolitan status', defaultEnabled: true },
  { id: 'infection_density', label: '03 · Infection Spread Density', description: 'Healthy vs transforming vs infected ratio per city & local sector', defaultEnabled: true },
  { id: 'horde_threats', label: '04 · Active Infected Contacts', description: 'Live tracked ZombieManager hostiles around operational sector', defaultEnabled: true },
  { id: 'power_stability', label: '05 · Regional Power Grid Stability', description: 'Macro grid decay & blackout corridors across monitored hubs', defaultEnabled: true },
  { id: 'evacuation_zones', label: '06 · Evacuation & Survivor Signals', description: 'Evacuated population telemetry & active rescue/settlement positions', defaultEnabled: true },
  { id: 'wildlife_bio', label: '07 · Ecosystem & Wildlife Signatures', description: 'Tracked fauna presence & territorial anomaly density', defaultEnabled: false },
  { id: 'weather_hazards', label: '08 · Weather & Atmospheric Hazards', description: 'Visibility, toxic fog/storm severity & wind vectors', defaultEnabled: false },
  { id: 'supply_extraction', label: '09 · Emergency Supply Drops & Extraction', description: 'Active parachute cargo drop & extraction beacon telemetry', defaultEnabled: true },
  { id: 'explored_chunks', label: '10 · Explored vs Undiscovered Terrain', description: 'Honest chunk discovery coverage from WorldPersistence', defaultEnabled: true },
];

export interface NexusScreenSpec {
  id: string;
  code: string;
  floor: NexusFloorNumber;
  indexOnFloor: number;
  globalIndex: number;
  title: string;
  purpose: string;
  category:
    | 'rail_network'
    | 'train_ops'
    | 'engineering'
    | 'tech_comms'
    | 'executive'
    | 'compound_radar'
    | 'outbreak_radar';
  uiKind:
    | 'network_map'
    | 'train_telemetry'
    | 'station_ops'
    | 'signal_interlock'
    | 'engineering_spec'
    | 'comms_log'
    | 'server_diag'
    | 'exec_brief'
    | 'compound_layer'
    | 'turret_inspector'
    | 'gate_matrix'
    | 'outbreak_layer'
    | 'city_intel'
    | 'science_diag';
  targetId?: string; // e.g., train line, layer id, turret range, city bucket
  bank: number;
  cell: number;
  mountPos: [number, number, number];
  mountSize: [number, number];
  mountRotY: number;
  mountRotX?: number;
}

type BlueprintItem = Omit<NexusScreenSpec, 'globalIndex' | 'bank' | 'cell' | 'mountPos' | 'mountSize' | 'mountRotY' | 'mountRotX'>;

const F2_ITEMS: BlueprintItem[] = [
  { id: 'F2-S01', code: 'NET-01', floor: 2, indexOnFloor: 1, title: 'Global Rail Corridor Schematic', purpose: '6-track East-West spine geometry & station chainage', category: 'rail_network', uiKind: 'network_map' },
  { id: 'F2-S02', code: 'NET-02', floor: 2, indexOnFloor: 2, title: 'Line F1 Eastbound Route Profile', purpose: 'Grade elevation, speed profile & headway along Track F1', category: 'rail_network', uiKind: 'train_telemetry', targetId: 'F1' },
  { id: 'F2-S03', code: 'NET-03', floor: 2, indexOnFloor: 3, title: 'Line F2 Eastbound Express Map', purpose: 'Express stopping pattern & distance-to-terminus', category: 'rail_network', uiKind: 'train_telemetry', targetId: 'F2' },
  { id: 'F2-S04', code: 'NET-04', floor: 2, indexOnFloor: 4, title: 'Line F3 Freight & Heavy Haul', purpose: 'Heavy axle corridor load & block headway', category: 'rail_network', uiKind: 'train_telemetry', targetId: 'F3' },
  { id: 'F2-S05', code: 'NET-05', floor: 2, indexOnFloor: 5, title: 'Line B1 Westbound Spine Map', purpose: 'Return trunk corridor & turnaround timing', category: 'rail_network', uiKind: 'train_telemetry', targetId: 'B1' },
  { id: 'F2-S06', code: 'NET-06', floor: 2, indexOnFloor: 6, title: 'Line B2 Regional Commuter Route', purpose: 'Regional station dwell timing & turnaround status', category: 'rail_network', uiKind: 'train_telemetry', targetId: 'B2' },
  { id: 'F2-S07', code: 'NET-07', floor: 2, indexOnFloor: 7, title: 'Line B3 Emergency Supply Corridor', purpose: 'Priority cargo & evacuation shuttle routing', category: 'rail_network', uiKind: 'train_telemetry', targetId: 'B3' },
  { id: 'F2-S08', code: 'NET-08', floor: 2, indexOnFloor: 8, title: 'Sanctuary Central Terminus Hub', purpose: 'KM 0.0 main compound interchange status & platform occupancy', category: 'rail_network', uiKind: 'station_ops', targetId: '0' },
  { id: 'F2-S09', code: 'NET-09', floor: 2, indexOnFloor: 9, title: 'Highland Ridge Junction Status', purpose: 'KM +1.2 mountain ridge interchange telemetry', category: 'rail_network', uiKind: 'station_ops', targetId: '1' },
  { id: 'F2-S10', code: 'NET-10', floor: 2, indexOnFloor: 10, title: 'Redwood Valley Station Telemetry', purpose: 'KM +2.4 forest valley platform & passenger count', category: 'rail_network', uiKind: 'station_ops', targetId: '2' },
  { id: 'F2-S11', code: 'NET-11', floor: 2, indexOnFloor: 11, title: 'Northern Apex Shield Post', purpose: 'KM +3.6 northern perimeter outpost rail feed', category: 'rail_network', uiKind: 'station_ops', targetId: '3' },
  { id: 'F2-S12', code: 'NET-12', floor: 2, indexOnFloor: 12, title: 'Eastern Shore Terminal Board', purpose: 'KM -1.2 coastal approach arrivals & platform gates', category: 'rail_network', uiKind: 'station_ops', targetId: '4' },
  { id: 'F2-S13', code: 'NET-13', floor: 2, indexOnFloor: 13, title: 'Foundry District Siding', purpose: 'KM -2.4 industrial freight interchange & dwell monitor', category: 'rail_network', uiKind: 'station_ops', targetId: '5' },
  { id: 'F2-S14', code: 'NET-14', floor: 2, indexOnFloor: 14, title: 'Western Dunes Outpost', purpose: 'KM -3.6 arid sector station atmospheric & track alert', category: 'rail_network', uiKind: 'station_ops', targetId: '6' },
  { id: 'F2-S15', code: 'NET-15', floor: 2, indexOnFloor: 15, title: 'New Haven Metro Central', purpose: 'KM -4.8 metropolitan terminus crowd & power index', category: 'rail_network', uiKind: 'station_ops', targetId: '7' },
  { id: 'F2-S16', code: 'NET-16', floor: 2, indexOnFloor: 16, title: 'Headway & Separation Analyzer', purpose: 'Inter-train longitudinal separation across 9.6 km cycle', category: 'rail_network', uiKind: 'network_map' },
  { id: 'F2-S17', code: 'NET-17', floor: 2, indexOnFloor: 17, title: 'Station Dwell Compliance Matrix', purpose: 'Scheduled vs actual platform dwell durations', category: 'rail_network', uiKind: 'station_ops' },
  { id: 'F2-S18', code: 'NET-18', floor: 2, indexOnFloor: 18, title: 'Cross-Biome Rail Weather Overlay', purpose: 'Precipitation & visibility impact along track corridor', category: 'rail_network', uiKind: 'engineering_spec' },
  { id: 'F2-S19', code: 'NET-19', floor: 2, indexOnFloor: 19, title: 'Regional Earth Geo-Corridor Anchor', purpose: 'Geodesic projection from RealEarthDataset to track Z=150..210', category: 'rail_network', uiKind: 'network_map' },
  { id: 'F2-S20', code: 'NET-20', floor: 2, indexOnFloor: 20, title: 'Passenger Load & Coach Utilization', purpose: 'Occupancy across GS, SL, 3A, 2A, 1A, EC & Saloon classes', category: 'rail_network', uiKind: 'station_ops' },
  { id: 'F2-S21', code: 'NET-21', floor: 2, indexOnFloor: 21, title: 'Junction Switch Priority Routing', purpose: 'Turnout states & conflict-free corridor paths', category: 'rail_network', uiKind: 'signal_interlock' },
  { id: 'F2-S22', code: 'NET-22', floor: 2, indexOnFloor: 22, title: 'Ticket & Reservation Demand Feed', purpose: 'Active passenger ticket issuance & coach flow', category: 'rail_network', uiKind: 'station_ops' },
  { id: 'F2-S23', code: 'NET-23', floor: 2, indexOnFloor: 23, title: 'Corridor Distance Accumulator', purpose: 'Total cumulative km covered by active 6-train fleet', category: 'rail_network', uiKind: 'train_telemetry' },
  { id: 'F2-S24', code: 'NET-24', floor: 2, indexOnFloor: 24, title: 'Historical Schedule Archive Index', purpose: 'Previous cycle arrival drift & hold logs', category: 'rail_network', uiKind: 'comms_log' },
  { id: 'F2-S25', code: 'NET-25', floor: 2, indexOnFloor: 25, title: 'Observatory Master Sync Monitor', purpose: '3D table & 25-display frame coherence status', category: 'rail_network', uiKind: 'server_diag' },
];

const F3_ITEMS: BlueprintItem[] = [
  { id: 'F3-S01', code: 'OPS-01', floor: 3, indexOnFloor: 1, title: 'Master 6-Train Dispatch Board', purpose: 'Live fleet movement, direction, ETA & direct Hold/Release', category: 'train_ops', uiKind: 'train_telemetry' },
  { id: 'F3-S02', code: 'OPS-02', floor: 3, indexOnFloor: 2, title: 'Train 01 Primary Telemetry Desk', purpose: 'Speed, leg distance, motor temp & cab hold control for Train 01', category: 'train_ops', uiKind: 'train_telemetry', targetId: 'F1' },
  { id: 'F3-S03', code: 'OPS-03', floor: 3, indexOnFloor: 3, title: 'Train 02 Primary Telemetry Desk', purpose: 'Speed, leg distance, motor temp & cab hold control for Train 02', category: 'train_ops', uiKind: 'train_telemetry', targetId: 'F2' },
  { id: 'F3-S04', code: 'OPS-04', floor: 3, indexOnFloor: 4, title: 'Train 03 Primary Telemetry Desk', purpose: 'Speed, leg distance, motor temp & cab hold control for Train 03', category: 'train_ops', uiKind: 'train_telemetry', targetId: 'F3' },
  { id: 'F3-S05', code: 'OPS-05', floor: 3, indexOnFloor: 5, title: 'Train 04 Primary Telemetry Desk', purpose: 'Speed, leg distance, motor temp & cab hold control for Train 04', category: 'train_ops', uiKind: 'train_telemetry', targetId: 'B1' },
  { id: 'F3-S06', code: 'OPS-06', floor: 3, indexOnFloor: 6, title: 'Train 05 Primary Telemetry Desk', purpose: 'Speed, leg distance, motor temp & cab hold control for Train 05', category: 'train_ops', uiKind: 'train_telemetry', targetId: 'B2' },
  { id: 'F3-S07', code: 'OPS-07', floor: 3, indexOnFloor: 7, title: 'Train 06 Primary Telemetry Desk', purpose: 'Speed, leg distance, motor temp & cab hold control for Train 06', category: 'train_ops', uiKind: 'train_telemetry', targetId: 'B3' },
  { id: 'F3-S08', code: 'OPS-08', floor: 3, indexOnFloor: 8, title: 'Signal Aspect Matrix (Red/Amber/Green)', purpose: 'Live block occupancy & signal aspect locking across corridor', category: 'train_ops', uiKind: 'signal_interlock' },
  { id: 'F3-S09', code: 'OPS-09', floor: 3, indexOnFloor: 9, title: 'Dispatch Hold & Clearance Queue', purpose: 'Active hold orders, delay counters & release clearance', category: 'train_ops', uiKind: 'signal_interlock' },
  { id: 'F3-S10', code: 'OPS-10', floor: 3, indexOnFloor: 10, title: 'Platform Door Interlock Monitor', purpose: 'Carriage door open/lock sync across all 8 station stops', category: 'train_ops', uiKind: 'station_ops' },
  { id: 'F3-S11', code: 'OPS-11', floor: 3, indexOnFloor: 11, title: 'Arrival & Departure Clock Sync', purpose: 'Synchronized game-clock arrival/departure timetables', category: 'train_ops', uiKind: 'train_telemetry' },
  { id: 'F3-S12', code: 'OPS-12', floor: 3, indexOnFloor: 12, title: 'Active Warning & Alarm Console', purpose: 'Live locomotive warnings & operator acknowledgment status', category: 'train_ops', uiKind: 'comms_log' },
  { id: 'F3-S13', code: 'OPS-13', floor: 3, indexOnFloor: 13, title: 'Traction Motor Thermal Watch', purpose: 'Per-locomotive °C heat load vs throttle utilization', category: 'train_ops', uiKind: 'engineering_spec' },
  { id: 'F3-S14', code: 'OPS-14', floor: 3, indexOnFloor: 14, title: 'Air Brake Pipe Pressure Monitor', purpose: 'Live pneumatic brake reservoir BAR readings', category: 'train_ops', uiKind: 'engineering_spec' },
  { id: 'F3-S15', code: 'OPS-15', floor: 3, indexOnFloor: 15, title: '25kV Pantograph Catenary Voltage', purpose: 'Overhead traction kV stability across 6 trains', category: 'train_ops', uiKind: 'engineering_spec' },
  { id: 'F3-S16', code: 'OPS-16', floor: 3, indexOnFloor: 16, title: 'Station Concourse Passenger Density', purpose: 'RailwayNPCManager commuter counts & boarding flow', category: 'train_ops', uiKind: 'station_ops' },
  { id: 'F3-S17', code: 'OPS-17', floor: 3, indexOnFloor: 17, title: 'Shift Supervisor Tactical Overview', purpose: 'Executive fleet readiness & on-time performance index', category: 'train_ops', uiKind: 'exec_brief' },
  { id: 'F3-S18', code: 'OPS-18', floor: 3, indexOnFloor: 18, title: 'Crew Shift Handover Briefing', purpose: 'Scheduled operator rotation & open operational notes', category: 'train_ops', uiKind: 'comms_log' },
  { id: 'F3-S19', code: 'OPS-19', floor: 3, indexOnFloor: 19, title: 'Emergency Track Stop Interlock', purpose: 'Rapid fleet-wide line hold / all-clear dispatch control', category: 'train_ops', uiKind: 'signal_interlock' },
  { id: 'F3-S20', code: 'OPS-20', floor: 3, indexOnFloor: 20, title: 'ATVM & Reservation Counter Load', purpose: 'Live station ticket machine & counter queues', category: 'train_ops', uiKind: 'station_ops' },
  { id: 'F3-S21', code: 'OPS-21', floor: 3, indexOnFloor: 21, title: 'Speed Restriction & Caution Zones', purpose: 'Weather & approach speed limits per sector', category: 'train_ops', uiKind: 'signal_interlock' },
  { id: 'F3-S22', code: 'OPS-22', floor: 3, indexOnFloor: 22, title: 'Rolling Stock Condition Readiness', purpose: 'Fleet mechanical health % & maintenance scheduling', category: 'train_ops', uiKind: 'engineering_spec' },
  { id: 'F3-S23', code: 'OPS-23', floor: 3, indexOnFloor: 23, title: 'Multi-Language Station PA Queue', purpose: 'Automated arrival announcements across 8 stations', category: 'train_ops', uiKind: 'comms_log' },
  { id: 'F3-S24', code: 'OPS-24', floor: 3, indexOnFloor: 24, title: 'Consist Carriage Inventory Log', purpose: '7-carriage consist integrity & passenger coach status', category: 'train_ops', uiKind: 'station_ops' },
  { id: 'F3-S25', code: 'OPS-25', floor: 3, indexOnFloor: 25, title: 'Arena Dispatch Event Timeline', purpose: 'Chronological audit trail of train holds & clearances', category: 'train_ops', uiKind: 'comms_log' },
];

const F4_ITEMS: BlueprintItem[] = [
  { id: 'F4-S01', code: 'ENG-01', floor: 4, indexOnFloor: 1, title: 'Track Geometry & Alignment Laser', purpose: 'Gauge tolerance (1676mm) & rail longitudinal level telemetry', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S02', code: 'ENG-02', floor: 4, indexOnFloor: 2, title: 'Bridge Pier Structural Load Lab', purpose: 'Span deflection & floodwater clearance monitoring', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S03', code: 'ENG-03', floor: 4, indexOnFloor: 3, title: 'Tunnel Bore & Ventilation Telemetry', purpose: 'Bore airflow, moisture & seismic strain telemetry', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S04', code: 'ENG-04', floor: 4, indexOnFloor: 4, title: 'Ballast & Subgrade Moisture Profile', purpose: 'Weather runoff & embankment shear stability', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S05', code: 'ENG-05', floor: 4, indexOnFloor: 5, title: 'Catenary Tension & Wire Sag Meter', purpose: '25kV contact wire thermal expansion compensation', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S06', code: 'ENG-06', floor: 4, indexOnFloor: 6, title: '25kV Substation Transformer Load', purpose: 'Traction power phase balance & harmonic filter status', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S07', code: 'ENG-07', floor: 4, indexOnFloor: 7, title: 'Switch Point Actuator Diagnostics', purpose: 'Motor current draw & mechanical throw cycle timing', category: 'engineering', uiKind: 'signal_interlock' },
  { id: 'F4-S08', code: 'ENG-08', floor: 4, indexOnFloor: 8, title: 'Bogie Suspension & Wheel Flat Scan', purpose: 'Acoustic impact monitoring along Track F1–B3', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S09', code: 'ENG-09', floor: 4, indexOnFloor: 9, title: 'Axle Bearing Thermal Imaging Wall', purpose: 'Hotbox axle detection across moving trains', category: 'engineering', uiKind: 'train_telemetry' },
  { id: 'F4-S10', code: 'ENG-10', floor: 4, indexOnFloor: 10, title: 'Rail Ultrasonic Flaw Inspector', purpose: 'Weld integrity & hairline fracture screening', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S11', code: 'ENG-11', floor: 4, indexOnFloor: 11, title: 'Compound-to-Rail Grid Tie Sync', purpose: 'Auxiliary power tie between Aurelion solar/diesel & rail', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S12', code: 'ENG-12', floor: 4, indexOnFloor: 12, title: 'Regenerative Braking Energy Recovery', purpose: 'Deceleration kWh recaptured back into feeder bus', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S13', code: 'ENG-13', floor: 4, indexOnFloor: 13, title: 'Station Canopy & Truss Stress Monitor', purpose: 'MegaStationArchitecture wind & snow load telemetry', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S14', code: 'ENG-14', floor: 4, indexOnFloor: 14, title: 'Platform Lift Mechanical Diagnostics', purpose: '4-shaft station lift drive torque & brake health', category: 'engineering', uiKind: 'station_ops' },
  { id: 'F4-S15', code: 'ENG-15', floor: 4, indexOnFloor: 15, title: 'Level Crossing Boom & Barrier Check', purpose: 'Checkpoint pedestal clearance & arm actuation cycles', category: 'engineering', uiKind: 'signal_interlock' },
  { id: 'F4-S16', code: 'ENG-16', floor: 4, indexOnFloor: 16, title: 'Pantograph Carbon Strip Wear Log', purpose: 'Collector strip thickness & arc event count', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S17', code: 'ENG-17', floor: 4, indexOnFloor: 17, title: 'Trackside Drainage & Culvert Flow', purpose: 'Storm surge bypass flow rate along Z=134..226', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S18', code: 'ENG-18', floor: 4, indexOnFloor: 18, title: 'Welded Rail Expansion Joint Log', purpose: 'Ambient temperature rail stress calibration', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S19', code: 'ENG-19', floor: 4, indexOnFloor: 19, title: 'Workshop Crane & Hydraulic Test Bed', purpose: 'Lab bench calibration & actuator load state', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S20', code: 'ENG-20', floor: 4, indexOnFloor: 20, title: 'Engineering Work-Order Dispatch', purpose: 'Track inspection tickets & preventive maintenance status', category: 'engineering', uiKind: 'comms_log' },
  { id: 'F4-S21', code: 'ENG-21', floor: 4, indexOnFloor: 21, title: 'Concrete Sleeper & Fastening Audit', purpose: 'Clip torque compliance along 6 corridor tracks', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S22', code: 'ENG-22', floor: 4, indexOnFloor: 22, title: 'Battery Backup Bank (Way-Side)', purpose: 'Trackside signal battery state of charge', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S23', code: 'ENG-23', floor: 4, indexOnFloor: 23, title: 'Seismic & Vibration Waveform Scope', purpose: 'Structural tremor FFT along compound & rail bridge', category: 'engineering', uiKind: 'science_diag' },
  { id: 'F4-S24', code: 'ENG-24', floor: 4, indexOnFloor: 24, title: 'Garage Fleet Charging Bus Tie', purpose: 'EV & tactical vehicle charger interface telemetry', category: 'engineering', uiKind: 'engineering_spec' },
  { id: 'F4-S25', code: 'ENG-25', floor: 4, indexOnFloor: 25, title: 'Civil Lab Blueprint Revision Board', purpose: 'As-built structural revisions & signoff status', category: 'engineering', uiKind: 'exec_brief' },
];

const F5_ITEMS: BlueprintItem[] = [
  { id: 'F5-S01', code: 'TECH-01', floor: 5, indexOnFloor: 1, title: 'Primary Core Server Cluster A', purpose: 'Compute blades handling world & train state sync', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S02', code: 'TECH-02', floor: 5, indexOnFloor: 2, title: 'Primary Core Server Cluster B', purpose: 'Redundant persistence & chunk hash verification', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S03', code: 'TECH-03', floor: 5, indexOnFloor: 3, title: 'Fiber Optic Corridor Ring Telemetry', purpose: 'Wayside optical link latency across 8 stations', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S04', code: 'TECH-04', floor: 5, indexOnFloor: 4, title: 'Cab-to-Nexus Encrypted Radio Bus', purpose: 'Train driver voice & telemetry RF signal quality', category: 'tech_comms', uiKind: 'comms_log' },
  { id: 'F5-S05', code: 'TECH-05', floor: 5, indexOnFloor: 5, title: 'Multilingual Announcement Synthesizer', purpose: 'Live audio bus & terminal announcement queue', category: 'tech_comms', uiKind: 'comms_log' },
  { id: 'F5-S06', code: 'TECH-06', floor: 5, indexOnFloor: 6, title: 'Emergency Distress Frequency Watch', purpose: 'Field radio bands & survivor SOS repeater status', category: 'tech_comms', uiKind: 'comms_log' },
  { id: 'F5-S07', code: 'TECH-07', floor: 5, indexOnFloor: 7, title: 'Railway Digital Twin Sim Engine', purpose: 'Schedule stress-test & headway simulation parameters', category: 'tech_comms', uiKind: 'science_diag' },
  { id: 'F5-S08', code: 'TECH-08', floor: 5, indexOnFloor: 8, title: 'Collision-Avoidance ATP Algorithm', purpose: 'Automatic train protection braking envelope check', category: 'tech_comms', uiKind: 'signal_interlock' },
  { id: 'F5-S09', code: 'TECH-09', floor: 5, indexOnFloor: 9, title: 'Satellite Geo-Projection Relay', purpose: 'RealEarthDataset lat/lon tile coordinate telemetry', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S10', code: 'TECH-10', floor: 5, indexOnFloor: 10, title: 'Chunk Persistence & Save Bus', purpose: 'WorldPersistence discovered chunks & delta snapshots', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S11', code: 'TECH-11', floor: 5, indexOnFloor: 11, title: 'Cyber Intrusion & Access Firewall', purpose: 'NEXUS turnstile & console clearance verification logs', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S12', code: 'TECH-12', floor: 5, indexOnFloor: 12, title: 'Roof Spire Antenna Array Status', purpose: 'S-band, VHF rail & compound mesh transceivers', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S13', code: 'TECH-13', floor: 5, indexOnFloor: 13, title: 'Weather Telemetry Ingest Pipeline', purpose: 'Real-time meteorological sensor fusion for rail ops', category: 'tech_comms', uiKind: 'science_diag' },
  { id: 'F5-S14', code: 'TECH-14', floor: 5, indexOnFloor: 14, title: 'Companion & Field Squad Radio Link', purpose: 'Marcus, Chloe & Dr. Maya encrypted comm channel status', category: 'tech_comms', uiKind: 'comms_log' },
  { id: 'F5-S15', code: 'TECH-15', floor: 5, indexOnFloor: 15, title: 'Display Matrix Controller (189 Feeds)', purpose: 'Canvas atlas synchronization & refresh diagnostics', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S16', code: 'TECH-16', floor: 5, indexOnFloor: 16, title: 'Acoustic Cleanroom Thermal Bus', purpose: 'Server rack cooling delta & cold-aisle airflow', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S17', code: 'TECH-17', floor: 5, indexOnFloor: 17, title: 'UPS & Power Conditioning Matrix', purpose: 'Uninterruptible server load & voltage regulation', category: 'tech_comms', uiKind: 'engineering_spec' },
  { id: 'F5-S18', code: 'TECH-18', floor: 5, indexOnFloor: 18, title: 'Outbreak Data Packet Stream', purpose: 'City telemetry packet cadence to F8 observatory', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S19', code: 'TECH-19', floor: 5, indexOnFloor: 19, title: 'Autonomous Turret Link Encryption', purpose: 'F7 fire-control telemetry authentication packets', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S20', code: 'TECH-20', floor: 5, indexOnFloor: 20, title: 'Staff Coordination Shift Board', purpose: 'Active technical operators & station repair dispatches', category: 'tech_comms', uiKind: 'comms_log' },
  { id: 'F5-S21', code: 'TECH-21', floor: 5, indexOnFloor: 21, title: 'Backup Tape & Cold Storage Vault', purpose: 'Immutable archival snapshot verification status', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S22', code: 'TECH-22', floor: 5, indexOnFloor: 22, title: 'Lift A & Lift B Controller PLC', purpose: 'Dual elevator drive telemetry, speed & door interlocks', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S23', code: 'TECH-23', floor: 5, indexOnFloor: 23, title: 'Radio Spectrum Waterfall Display', purpose: 'Sub-GHz interference scan across 5 km perimeter', category: 'tech_comms', uiKind: 'science_diag' },
  { id: 'F5-S24', code: 'TECH-24', floor: 5, indexOnFloor: 24, title: 'Time-Sync Master Atomic Clock', purpose: 'NTP/PTP lock across all 8 floors & 8 stations', category: 'tech_comms', uiKind: 'server_diag' },
  { id: 'F5-S25', code: 'TECH-25', floor: 5, indexOnFloor: 25, title: 'R&D Prototype Firmware Staging', purpose: 'Approved telemetry patch release ledger', category: 'tech_comms', uiKind: 'comms_log' },
];

const F6_ITEMS: BlueprintItem[] = [
  { id: 'F6-S01', code: 'EXEC-01', floor: 6, indexOnFloor: 1, title: 'Command Executive Situation Brief', purpose: 'Unified summary of rail, compound defense & global outbreak', category: 'executive', uiKind: 'exec_brief' },
  { id: 'F6-S02', code: 'EXEC-02', floor: 6, indexOnFloor: 2, title: 'Strategic Rail Continuity Index', purpose: 'Fleet readiness, on-time score & corridor risk posture', category: 'executive', uiKind: 'exec_brief' },
  { id: 'F6-S03', code: 'EXEC-03', floor: 6, indexOnFloor: 3, title: 'Compound Security Posture Summary', purpose: '5-gate lockdown matrix & 20-turret ammunition readiness', category: 'executive', uiKind: 'gate_matrix' },
  { id: 'F6-S04', code: 'EXEC-04', floor: 6, indexOnFloor: 4, title: 'Global Outbreak Threat Advisory', purpose: 'Macro apocalyptic severity & power grid stability trend', category: 'executive', uiKind: 'outbreak_layer' },
  { id: 'F6-S05', code: 'EXEC-05', floor: 6, indexOnFloor: 5, title: 'Sanctuary Life-Support Executive View', purpose: 'THE AURELION solar, diesel fuel, RO water & medical status', category: 'executive', uiKind: 'exec_brief' },
  { id: 'F6-S06', code: 'EXEC-06', floor: 6, indexOnFloor: 6, title: 'Fleet & Garage Readiness Brief', purpose: 'Armed SUV, motorbike, bicycle & military gun-carrier status', category: 'executive', uiKind: 'compound_layer' },
  { id: 'F6-S07', code: 'EXEC-07', floor: 6, indexOnFloor: 7, title: 'Cross-Department Alert Escalation', purpose: 'Pinned critical alerts & supervisor directives', category: 'executive', uiKind: 'comms_log' },
  { id: 'F6-S08', code: 'EXEC-08', floor: 6, indexOnFloor: 8, title: 'NEXUS Facility Clearance Roster', purpose: 'Registered visitors, staff IDs & restricted zone status', category: 'executive', uiKind: 'exec_brief' },
  { id: 'F6-S09', code: 'EXEC-09', floor: 6, indexOnFloor: 9, title: 'Evacuation & Rescue Coordination', purpose: 'SurvivorRescueManager & NPCSettlement staffing overview', category: 'executive', uiKind: 'exec_brief' },
  { id: 'F6-S10', code: 'EXEC-10', floor: 6, indexOnFloor: 10, title: 'Multi-Biome Reconnaissance Feed', purpose: 'Discovered chunks & active biome threat profile', category: 'executive', uiKind: 'outbreak_layer' },
  { id: 'F6-S11', code: 'EXEC-11', floor: 6, indexOnFloor: 11, title: 'Power Reserve Autonomy Forecast', purpose: 'Estimated hours of autonomous compound & rail operation', category: 'executive', uiKind: 'engineering_spec' },
  { id: 'F6-S12', code: 'EXEC-12', floor: 6, indexOnFloor: 12, title: 'Executive Corridor Priority Override', purpose: 'Immediate hold/release authority for all 6 lines', category: 'executive', uiKind: 'train_telemetry' },
  { id: 'F6-S13', code: 'EXEC-13', floor: 6, indexOnFloor: 13, title: 'Perimeter Lockdown Directive Board', purpose: 'One-action gate lockdown & sentry verification', category: 'executive', uiKind: 'gate_matrix' },
  { id: 'F6-S14', code: 'EXEC-14', floor: 6, indexOnFloor: 14, title: 'Companion Squad Readiness & Morale', purpose: 'Marcus, Chloe & Dr. Maya status and assignments', category: 'executive', uiKind: 'exec_brief' },
  { id: 'F6-S15', code: 'EXEC-15', floor: 6, indexOnFloor: 15, title: 'Floor 2 Cartography Summary Link', purpose: 'Direct feed from Network Intelligence Observatory', category: 'executive', uiKind: 'network_map' },
  { id: 'F6-S16', code: 'EXEC-16', floor: 6, indexOnFloor: 16, title: 'Floor 3 Arena Operations Link', purpose: 'Live feed from Train Operations Arena', category: 'executive', uiKind: 'train_telemetry' },
  { id: 'F6-S17', code: 'EXEC-17', floor: 6, indexOnFloor: 17, title: 'Floor 4 Engineering Summary Link', purpose: 'Critical track/bridge/substation engineering tickets', category: 'executive', uiKind: 'engineering_spec' },
  { id: 'F6-S18', code: 'EXEC-18', floor: 6, indexOnFloor: 18, title: 'Floor 5 Tech & Comms Health Link', purpose: 'Core servers & Lift A/B availability SLA', category: 'executive', uiKind: 'server_diag' },
  { id: 'F6-S19', code: 'EXEC-19', floor: 6, indexOnFloor: 19, title: 'Floor 7 Compound Radar Preview', purpose: 'Live compound defense perimeter posture summary', category: 'executive', uiKind: 'compound_layer' },
  { id: 'F6-S20', code: 'EXEC-20', floor: 6, indexOnFloor: 20, title: 'Floor 8 Outbreak Radar Preview', purpose: 'Planetary contagion severity & active outbreak warning', category: 'executive', uiKind: 'outbreak_layer' },
  { id: 'F6-S21', code: 'EXEC-21', floor: 6, indexOnFloor: 21, title: 'Supply Drop & Extraction Command', purpose: 'WorldEventsManager parachute crate & beacon monitor', category: 'executive', uiKind: 'outbreak_layer' },
  { id: 'F6-S22', code: 'EXEC-22', floor: 6, indexOnFloor: 22, title: 'Environmental & Weather Risk Desk', purpose: 'Storm, toxic fog & extreme temperature alerts', category: 'executive', uiKind: 'science_diag' },
  { id: 'F6-S23', code: 'EXEC-23', floor: 6, indexOnFloor: 23, title: 'Private Conference Briefing Slate', purpose: 'Interactive strategic agenda & checkpoint log', category: 'executive', uiKind: 'comms_log' },
  { id: 'F6-S24', code: 'EXEC-24', floor: 6, indexOnFloor: 24, title: 'Vertical Transit Executive Priority', purpose: 'Lift A & Lift B live car location & speed monitor', category: 'executive', uiKind: 'server_diag' },
  { id: 'F6-S25', code: 'EXEC-25', floor: 6, indexOnFloor: 25, title: 'Executive Archive & Audit Ledger', purpose: 'Signed directives & saved system state ledger', category: 'executive', uiKind: 'comms_log' },
];

const F7_ITEMS: BlueprintItem[] = [
  { id: 'F7-S01', code: 'CMP-01', floor: 7, indexOnFloor: 1, title: 'Compound Master Tactical Radar', purpose: 'Live 100×126.5m compound plot with all 12 switchable layers', category: 'compound_radar', uiKind: 'compound_layer' },
  { id: 'F7-S02', code: 'CMP-02', floor: 7, indexOnFloor: 2, title: 'Layer 01 · Terrain & Elevation Grid', purpose: 'Compound boundary elevation & contour survey', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'terrain_footprint' },
  { id: 'F7-S03', code: 'CMP-03', floor: 7, indexOnFloor: 3, title: 'Layer 02 · 3 Hero Buildings Telemetry', purpose: 'Structure 1 Aurelion, Structure 2 Nexus, Structure 3 Garage', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'buildings_3' },
  { id: 'F7-S04', code: 'CMP-04', floor: 7, indexOnFloor: 4, title: 'Layer 03 · Perimeter Wall Integrity', purpose: '9 reinforced blast-wall sectors surrounding 12,650 m²', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'security_walls' },
  { id: 'F7-S05', code: 'CMP-05', floor: 7, indexOnFloor: 5, title: 'Layer 04 · 5-Gate Control Matrix', purpose: 'Direct open/close telemetry for Gates 1 through 5', category: 'compound_radar', uiKind: 'gate_matrix', targetId: 'gates_5' },
  { id: 'F7-S06', code: 'CMP-06', floor: 7, indexOnFloor: 6, title: 'Layer 05 · 20-Tower Sentry Network', purpose: 'Master status of all 20 perimeter sentry towers', category: 'compound_radar', uiKind: 'turret_inspector', targetId: 'towers_20' },
  { id: 'F7-S07', code: 'CMP-07', floor: 7, indexOnFloor: 7, title: 'Layer 06 · Internal Roads & Courtyard', purpose: 'Access roadways, walkways & SOUTH plaza chokepoints', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'roads_paths' },
  { id: 'F7-S08', code: 'CMP-08', floor: 7, indexOnFloor: 8, title: 'Layer 07 · 4-Vehicle Fleet & Garage', purpose: 'Armed SUV, Motorbike, Bicycle & Military Carrier telemetry', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'vehicles_fleet' },
  { id: 'F7-S09', code: 'CMP-09', floor: 7, indexOnFloor: 9, title: 'Layer 08 · North Railway Corridor Tie', purpose: 'Adjacent 6-track rail boundary north of Gate 5', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'railway_corridor' },
  { id: 'F7-S10', code: 'CMP-10', floor: 7, indexOnFloor: 10, title: 'Layer 09 · Power, Solar & Water Bus', purpose: 'Aurelion solar, B2 diesel generator, battery & water plant', category: 'compound_radar', uiKind: 'engineering_spec', targetId: 'power_water_grid' },
  { id: 'F7-S11', code: 'CMP-11', floor: 7, indexOnFloor: 11, title: 'Layer 10 · Player Live Biometrics & GPS', purpose: 'Exact player compound coordinates, level & heading', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'player_marker' },
  { id: 'F7-S12', code: 'CMP-12', floor: 7, indexOnFloor: 12, title: 'Layer 11 · Companion & NPC Positions', purpose: 'Marcus, Chloe, Dr. Maya & settlement workers inside compound', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'npc_companions' },
  { id: 'F7-S13', code: 'CMP-13', floor: 7, indexOnFloor: 13, title: 'Layer 12 · 5km Defense Radar Rings', purpose: 'Perimeter threat contacts & firing-arc overlap', category: 'compound_radar', uiKind: 'compound_layer', targetId: 'radar_sweeps' },
  { id: 'F7-S14', code: 'CMP-14', floor: 7, indexOnFloor: 14, title: 'Towers 01–04 (Gates 1 & 2 Flank)', purpose: 'Individual ammo, health & target lock for Towers 01–04', category: 'compound_radar', uiKind: 'turret_inspector', targetId: '0-3' },
  { id: 'F7-S15', code: 'CMP-15', floor: 7, indexOnFloor: 15, title: 'Towers 05–08 (Gates 3 & 4 Flank)', purpose: 'Individual ammo, health & target lock for Towers 05–08', category: 'compound_radar', uiKind: 'turret_inspector', targetId: '4-7' },
  { id: 'F7-S16', code: 'CMP-16', floor: 7, indexOnFloor: 16, title: 'Towers 09–12 (Gate 5 & West South)', purpose: 'Individual ammo, health & target lock for Towers 09–12', category: 'compound_radar', uiKind: 'turret_inspector', targetId: '8-11' },
  { id: 'F7-S17', code: 'CMP-17', floor: 7, indexOnFloor: 17, title: 'Towers 13–16 (West & East Wall)', purpose: 'Individual ammo, health & target lock for Towers 13–16', category: 'compound_radar', uiKind: 'turret_inspector', targetId: '12-15' },
  { id: 'F7-S18', code: 'CMP-18', floor: 7, indexOnFloor: 18, title: 'Towers 17–20 (North Bastion Line)', purpose: 'Individual ammo, health & target lock for Towers 17–20', category: 'compound_radar', uiKind: 'turret_inspector', targetId: '16-19' },
  { id: 'F7-S19', code: 'CMP-19', floor: 7, indexOnFloor: 19, title: 'Turret Hostile-Only ROE Verifier', purpose: 'Strict allegiance safety filter protecting player & friendlies', category: 'compound_radar', uiKind: 'turret_inspector' },
  { id: 'F7-S20', code: 'CMP-20', floor: 7, indexOnFloor: 20, title: 'Gate 1 Main 12m Motorized Portal', purpose: 'Heavy south vehicular gate actuator & sentry overlap', category: 'compound_radar', uiKind: 'gate_matrix' },
  { id: 'F7-S21', code: 'CMP-21', floor: 7, indexOnFloor: 21, title: 'Gates 2 & 3 Pedestrian Checkpoints', purpose: 'West access & East emergency pedestrian airlock status', category: 'compound_radar', uiKind: 'gate_matrix' },
  { id: 'F7-S22', code: 'CMP-22', floor: 7, indexOnFloor: 22, title: 'Gates 4 & 5 Independent Vehicle Portals', purpose: 'Garage direct south portal & north railway approach gate', category: 'compound_radar', uiKind: 'gate_matrix' },
  { id: 'F7-S23', code: 'CMP-23', floor: 7, indexOnFloor: 23, title: 'Garage Bay 1 & 4 Heavy Enforcers', purpose: 'Armed SUV & Military Armored Gun-Carrier readiness', category: 'compound_radar', uiKind: 'compound_layer' },
  { id: 'F7-S24', code: 7 === 7 ? 'CMP-24' : 'CMP-24', floor: 7, indexOnFloor: 24, title: 'Garage Bay 2 & 3 Light Recon Fleet', purpose: 'Enduro 650cc Motorbike & Expedition Bicycle status', category: 'compound_radar', uiKind: 'compound_layer' },
  { id: 'F7-S25', code: 'CMP-25', floor: 7, indexOnFloor: 25, title: 'THE AURELION Energy & Load Shedding', purpose: 'Solar arrays, B2 diesel burn & battery autonomy', category: 'compound_radar', uiKind: 'engineering_spec' },
  { id: 'F7-S26', code: 'CMP-26', floor: 7, indexOnFloor: 26, title: 'THE AURELION Water & Hydroponics Sync', purpose: 'RO/UV reservoir, rainfall catchment & F4 grow-beds', category: 'compound_radar', uiKind: 'engineering_spec' },
  { id: 'F7-S27', code: 'CMP-27', floor: 7, indexOnFloor: 27, title: 'Compound Intrusion Motion Grid', purpose: 'Perimeter laser tripwires & wall breach sensors', category: 'compound_radar', uiKind: 'turret_inspector' },
  { id: 'F7-S28', code: 'CMP-28', floor: 7, indexOnFloor: 28, title: 'Turret Ammunition & Reload Scheduler', purpose: 'Magazine reserves & reload timers across 20 sentries', category: 'compound_radar', uiKind: 'turret_inspector' },
  { id: 'F7-S29', code: 'CMP-29', floor: 7, indexOnFloor: 29, title: 'Total Kill & Engagement Counter', purpose: 'Verified hostile neutralization ledger by tower', category: 'compound_radar', uiKind: 'turret_inspector' },
  { id: 'F7-S30', code: 'CMP-30', floor: 7, indexOnFloor: 30, title: 'Safe-Zone Buffer Protection Monitor', purpose: 'ProtectedSpawnZones enforcement around compound', category: 'compound_radar', uiKind: 'compound_layer' },
  { id: 'F7-S31', code: 'CMP-31', floor: 7, indexOnFloor: 31, title: 'Base Research & Upgrade Tech Feed', purpose: 'Active base level, alarm arming & research unlocks', category: 'compound_radar', uiKind: 'exec_brief' },
  { id: 'F7-S32', code: 'CMP-32', floor: 7, indexOnFloor: 32, title: 'F7 Observatory Sensor Health & Sync', purpose: '3D table & 32-display telemetry feed latency', category: 'compound_radar', uiKind: 'server_diag' },
];

const F8_ITEMS: BlueprintItem[] = [
  { id: 'F8-S01', code: 'BIO-01', floor: 8, indexOnFloor: 1, title: 'Planetary Zombie Outbreak Master Wall', purpose: 'Global outbreak radar & all 10 toggleable surveillance layers', category: 'outbreak_radar', uiKind: 'outbreak_layer' },
  { id: 'F8-S02', code: 'BIO-02', floor: 8, indexOnFloor: 2, title: 'Layer 01 · Geodetic Origin & Biomes', purpose: 'Earth coordinate projection & active expedition anchor', category: 'outbreak_radar', uiKind: 'outbreak_layer', targetId: 'earth_grid' },
  { id: 'F8-S03', code: 'BIO-03', floor: 8, indexOnFloor: 3, title: 'Layer 02 · Global Monitored Cities', purpose: 'RealWorldCities live healthy vs infected vs evacuated counts', category: 'outbreak_radar', uiKind: 'city_intel', targetId: 'cities_network' },
  { id: 'F8-S04', code: 'BIO-04', floor: 8, indexOnFloor: 4, title: 'Layer 03 · Infection Spread Density', purpose: 'Contagion wave intensity & transforming ratios', category: 'outbreak_radar', uiKind: 'outbreak_layer', targetId: 'infection_density' },
  { id: 'F8-S05', code: 'BIO-05', floor: 8, indexOnFloor: 5, title: 'Layer 04 · Live Hostile Zombie Contacts', purpose: 'Active ZombieManager infected clusters in world sector', category: 'outbreak_radar', uiKind: 'outbreak_layer', targetId: 'horde_threats' },
  { id: 'F8-S06', code: 'BIO-06', floor: 8, indexOnFloor: 6, title: 'Layer 05 · Global Power Grid Stability', purpose: 'Power grid collapse % across tracked metropolitan hubs', category: 'outbreak_radar', uiKind: 'city_intel', targetId: 'power_stability' },
  { id: 'F8-S07', code: 'BIO-07', floor: 8, indexOnFloor: 7, title: 'Layer 06 · Survivor & Evacuation Signals', purpose: 'Evacuated counts, rescued survivors & active camps', category: 'outbreak_radar', uiKind: 'outbreak_layer', targetId: 'evacuation_zones' },
  { id: 'F8-S08', code: 'BIO-08', floor: 8, indexOnFloor: 8, title: 'Layer 07 · Wildlife Bio-Telemetry', purpose: 'WildlifeManager active fauna & territorial shifts', category: 'outbreak_radar', uiKind: 'science_diag', targetId: 'wildlife_bio' },
  { id: 'F8-S09', code: 'BIO-09', floor: 8, indexOnFloor: 9, title: 'Layer 08 · Atmospheric & Toxic Weather', purpose: 'WeatherManager visibility, storms & toxic spore density', category: 'outbreak_radar', uiKind: 'science_diag', targetId: 'weather_hazards' },
  { id: 'F8-S10', code: 'BIO-10', floor: 8, indexOnFloor: 10, title: 'Layer 09 · Supply Drops & Extraction', purpose: 'Active emergency supply crate & extraction countdown', category: 'outbreak_radar', uiKind: 'outbreak_layer', targetId: 'supply_extraction' },
  { id: 'F8-S11', code: 'BIO-11', floor: 8, indexOnFloor: 11, title: 'Layer 10 · Explored vs Undiscovered Map', purpose: 'Verified WorldPersistence chunk discovery boundary', category: 'outbreak_radar', uiKind: 'outbreak_layer', targetId: 'explored_chunks' },
  { id: 'F8-S12', code: 'BIO-12', floor: 8, indexOnFloor: 12, title: 'Continent Index · Asia & Indo-Pacific', purpose: 'Tracked city outbreak states across Asia & Oceania', category: 'outbreak_radar', uiKind: 'city_intel', targetId: 'Asia' },
  { id: 'F8-S13', code: 'BIO-13', floor: 8, indexOnFloor: 13, title: 'Continent Index · Europe & Eurasia', purpose: 'Tracked city outbreak states across Europe', category: 'outbreak_radar', uiKind: 'city_intel', targetId: 'Europe' },
  { id: 'F8-S14', code: 'BIO-14', floor: 8, indexOnFloor: 14, title: 'Continent Index · North & South America', purpose: 'Tracked city outbreak states across the Americas', category: 'outbreak_radar', uiKind: 'city_intel', targetId: 'Americas' },
  { id: 'F8-S15', code: 'BIO-15', floor: 8, indexOnFloor: 15, title: 'Continent Index · Africa & Polar Outposts', purpose: 'Tracked city outbreak states across Africa & Antarctica', category: 'outbreak_radar', uiKind: 'city_intel', targetId: 'Africa' },
  { id: 'F8-S16', code: 'BIO-16', floor: 8, indexOnFloor: 16, title: 'Critical & Overrun City Watchlist', purpose: 'Highest-risk hubs requiring containment hold', category: 'outbreak_radar', uiKind: 'city_intel' },
  { id: 'F8-S17', code: 'BIO-17', floor: 8, indexOnFloor: 17, title: 'Apocalyptic Severity Progression', purpose: 'Global infection curve & apocalyptic severity index', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S18', code: 'BIO-18', floor: 8, indexOnFloor: 18, title: 'Transforming Stage (60s Window) Tracker', purpose: 'Civilians in stunned pre-conversion state globally & locally', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S19', code: 'BIO-19', floor: 8, indexOnFloor: 19, title: 'Zombie Variant Breakdown (Standard/Brute)', purpose: 'Live class distribution from ZombieManager active entities', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S20', code: 'BIO-20', floor: 8, indexOnFloor: 20, title: 'Boss & Alpha Threat Telemetry', purpose: 'High-HP boss zombies detected inside active chunks', category: 'outbreak_radar', uiKind: 'outbreak_layer' },
  { id: 'F8-S21', code: 'BIO-21', floor: 8, indexOnFloor: 21, title: 'Night Horde & Dusk Surge Predictor', purpose: 'Time-of-day nocturnal aggression & horde cycle counter', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S22', code: 'BIO-22', floor: 8, indexOnFloor: 22, title: 'Bio-Exposure & Radiation Safety Monitor', purpose: 'Player infection %, atmospheric toxicity & mask readiness', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S23', code: 'BIO-23', floor: 8, indexOnFloor: 23, title: 'Settlement & Survivor Morale Index', purpose: 'Living safe-zone inhabitants & rescued survivor count', category: 'outbreak_radar', uiKind: 'outbreak_layer' },
  { id: 'F8-S24', code: 'BIO-24', floor: 8, indexOnFloor: 24, title: 'Undiscovered Sector Honesty Audit', purpose: 'Chunks lacking live reconnaissance — never fabricated', category: 'outbreak_radar', uiKind: 'outbreak_layer' },
  { id: 'F8-S25', code: 'BIO-25', floor: 8, indexOnFloor: 25, title: 'Airborne Spore & Wind Dispersion', purpose: 'WeatherManager hazardous fog & wind vector analysis', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S26', code: 'BIO-26', floor: 8, indexOnFloor: 26, title: 'Railway Quarantine Corridor Check', purpose: 'Ensuring Track F1–B3 stations remain protected zones', category: 'outbreak_radar', uiKind: 'network_map' },
  { id: 'F8-S27', code: 'BIO-27', floor: 8, indexOnFloor: 27, title: 'Parachute Supply Drop Trajectory', purpose: 'Active drop ETA, coordinates & recovery state', category: 'outbreak_radar', uiKind: 'outbreak_layer' },
  { id: 'F8-S28', code: 'BIO-28', floor: 8, indexOnFloor: 28, title: 'Extraction Beacon Signal Lock', purpose: 'Extraction countdown, wave timer & completion state', category: 'outbreak_radar', uiKind: 'outbreak_layer' },
  { id: 'F8-S29', code: 'BIO-29', floor: 8, indexOnFloor: 29, title: 'Ecosystem Extinction Pressure Monitor', purpose: 'Wildlife population balance against outbreak contamination', category: 'outbreak_radar', uiKind: 'science_diag' },
  { id: 'F8-S30', code: 'BIO-30', floor: 8, indexOnFloor: 30, title: 'Cross-Border Evacuation Rail Demand', purpose: 'Evacuated civilian load vs active rail capacity', category: 'outbreak_radar', uiKind: 'city_intel' },
  { id: 'F8-S31', code: 'BIO-31', floor: 8, indexOnFloor: 31, title: 'Tactical Intelligence Report Builder', purpose: 'Compile & pin live outbreak briefing snapshot', category: 'outbreak_radar', uiKind: 'exec_brief' },
  { id: 'F8-S32', code: 'BIO-32', floor: 8, indexOnFloor: 32, title: 'Crown Bio-Observatory Telemetry Bus', purpose: 'F8 32-screen sync & scientific station status', category: 'outbreak_radar', uiKind: 'server_diag' },
];

/**
 * Generates exact 3D gallery & console mount positions for each screen on Floors 2..8
 * keeping Elevator Lobbies (W, X < -5.8) and East Stairwell (X > 6.2) cleanly unobstructed.
 */
function layoutScreensForFloor(
  items: BlueprintItem[],
  floor: NexusFloorNumber,
  globalStartIndex: number
): NexusScreenSpec[] {
  const floorY = NEXUS_FLOORS[floor].floorY;
  const specs: NexusScreenSpec[] = [];
  const total = items.length;

  items.forEach((item, idx) => {
    const globalIndex = globalStartIndex + idx;
    // Pack cleanly into 16 texture atlases of 12 cells each (4x3 grid per 1280x720 canvas = 320x240 per screen)
    const bank = Math.floor(globalIndex / 12);
    const cell = globalIndex % 12;

    let mountPos: [number, number, number];
    let mountSize: [number, number];
    let mountRotY = Math.PI;
    let mountRotX = 0;

    if (idx < 7) {
      // North Wall Panoramic Curved/Main Video Wall (7 screens)
      const x = -5.6 + idx * 1.88;
      mountPos = [x, floorY + 2.08, 8.68];
      mountSize = [1.72, 1.05];
      mountRotY = Math.PI;
    } else if (idx < 13) {
      // South Panoramic Gallery Header Monitors (6 screens)
      const k = idx - 7;
      const x = -5.0 + k * 2.0;
      mountPos = [x, floorY + 2.52, -8.56];
      mountSize = [1.65, 0.88];
      mountRotY = 0;
    } else if (idx < 19) {
      // Curved Inner Observatory Console Monitors around Central Table/Arena (6 screens)
      const k = idx - 13;
      const angle = (-Math.PI * 0.65) + (k / 5) * (Math.PI * 1.3);
      const radius = floor === 7 || floor === 8 ? 3.9 : 3.6;
      const cx = 0.3 + Math.sin(angle) * radius;
      const cz = Math.cos(angle) * radius;
      mountPos = [cx, floorY + 1.28, cz];
      mountSize = [1.18, 0.68];
      mountRotY = Math.atan2(0.3 - cx, -cz) + Math.PI;
      mountRotX = -0.28;
    } else if (idx < 25) {
      // East Gallery Divider Monitors facing inward (6 screens)
      const k = idx - 19;
      const z = -5.2 + k * 2.08;
      mountPos = [5.95, floorY + 1.95, z];
      mountSize = [1.55, 0.92];
      mountRotY = -Math.PI / 2;
    } else {
      // Extra 7 screens on Floors 7 & 8 (32 total): Northwest & Southwest Tactical Wing Consoles
      const k = idx - 25;
      if (k < 4) {
        mountPos = [-5.5, floorY + 1.92, -6.4 + k * 1.45];
        mountSize = [1.32, 0.84];
        mountRotY = Math.PI / 2;
      } else {
        const j = k - 4;
        mountPos = [-5.5, floorY + 1.92, 4.6 + j * 1.45];
        mountSize = [1.32, 0.84];
        mountRotY = Math.PI / 2;
      }
    }

    // Ensure strict non-negative rotation bounds & clean array
    if (total === 32 && idx === 12) {
      // slight shift clear of corner
      mountPos = [mountPos[0], mountPos[1], mountPos[2]];
    }

    specs.push({
      ...item,
      globalIndex,
      bank,
      cell,
      mountPos,
      mountSize,
      mountRotY,
      mountRotX,
    });
  });

  return specs;
}

export const NEXUS_SCREENS_BY_FLOOR: Record<Exclude<NexusFloorNumber, 1>, NexusScreenSpec[]> = {
  2: layoutScreensForFloor(F2_ITEMS, 2, 0),
  3: layoutScreensForFloor(F3_ITEMS, 3, 25),
  4: layoutScreensForFloor(F4_ITEMS, 4, 50),
  5: layoutScreensForFloor(F5_ITEMS, 5, 75),
  6: layoutScreensForFloor(F6_ITEMS, 6, 100),
  7: layoutScreensForFloor(F7_ITEMS, 7, 125),
  8: layoutScreensForFloor(F8_ITEMS, 8, 157),
};

export const NEXUS_ALL_SCREENS: NexusScreenSpec[] = [
  ...NEXUS_SCREENS_BY_FLOOR[2],
  ...NEXUS_SCREENS_BY_FLOOR[3],
  ...NEXUS_SCREENS_BY_FLOOR[4],
  ...NEXUS_SCREENS_BY_FLOOR[5],
  ...NEXUS_SCREENS_BY_FLOOR[6],
  ...NEXUS_SCREENS_BY_FLOOR[7],
  ...NEXUS_SCREENS_BY_FLOOR[8],
];

export const NEXUS_SCREEN_BANK_COUNT = Math.ceil(NEXUS_ALL_SCREENS.length / 12); // 16 banks

export function getNexusFloorForLocalY(localY: number): NexusFloorSpec {
  for (let i = NEXUS_FLOOR_ORDER.length - 1; i >= 0; i--) {
    const fl = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[i]];
    if (localY >= fl.floorY - 0.85) {
      return fl;
    }
  }
  return NEXUS_FLOORS[1];
}

export function getNexusRoomAtLocalPos(localX: number, localY: number, localZ: number): {
  floor: NexusFloorSpec;
  roomName: string;
  restricted: boolean;
} {
  const floor = getNexusFloorForLocalY(localY);
  for (const room of floor.rooms) {
    const b = room.localBounds;
    if (localX >= b.minX && localX <= b.maxX && localZ >= b.minZ && localZ <= b.maxZ) {
      return { floor, roomName: room.name, restricted: !!room.restricted };
    }
  }
  return { floor, roomName: floor.title, restricted: false };
}
