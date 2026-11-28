import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import {
  AURELION_ATRIUM_VOID,
  AURELION_ELEVATOR_CONFIGS,
  AURELION_F6_INDOOR_POOL,
  AURELION_LEVELS,
  AURELION_ROOFTOP_INFINITY_POOL,
  AURELION_STAIR_VOID,
  AurelionLevelId,
} from './AurelionConfig';
import { B2_FARM_BED_COORDS, B2_WATER_PUMP_POS } from './AurelionBasements';
import { ElevatorId } from './AurelionSystems';

export function registerAurelionStructure1Colliders(
  physMgr: UnifiedPhysicsManager,
  origin: { x: number; y: number; z: number },
  states: {
    doorOpen: boolean;
    patioDoorOpen: boolean;
    bathroomDoorOpen: boolean;
  }
) {
  const ox = origin.x;
  const oz = origin.z;

  // 1. Subterranean B2 & B1 Outer Perimeter Walls (30x24m)
  physMgr.registerBoxCollider('aur_b2_wall_n', 'wall', [ox, -5.85, oz + 12.0], 30.2, 3.5, 0.36);
  physMgr.registerBoxCollider('aur_b2_wall_s', 'wall', [ox, -5.85, oz - 12.0], 30.2, 3.5, 0.36);
  physMgr.registerBoxCollider('aur_b2_wall_w', 'wall', [ox - 15.0, -5.85, oz], 0.36, 3.5, 24.2);
  physMgr.registerBoxCollider('aur_b2_wall_e', 'wall', [ox + 15.0, -5.85, oz], 0.36, 3.5, 24.2);

  physMgr.registerBoxCollider('aur_b1_wall_n', 'wall', [ox, -2.1, oz + 12.0], 30.2, 3.85, 0.36);
  physMgr.registerBoxCollider('aur_b1_wall_s', 'wall', [ox, -2.1, oz - 12.0], 30.2, 3.85, 0.36);
  physMgr.registerBoxCollider('aur_b1_wall_w', 'wall', [ox - 15.0, -2.1, oz], 0.36, 3.85, 24.2);
  physMgr.registerBoxCollider('aur_b1_wall_e', 'wall', [ox + 15.0, -2.1, oz], 0.36, 3.85, 24.2);

  // 2. Podium F1..F4 Perimeter Walls (30x24m, Floor 1 has South Front Entrance & North Patio Doors)
  // F1 South Left & Right of 2.7m Entrance Door
  physMgr.registerBoxCollider('aur_f1_south_l', 'wall', [ox - 8.18, 2.0, oz - 11.9], 13.65, 3.5, 0.35);
  physMgr.registerBoxCollider('aur_f1_south_r', 'wall', [ox + 8.18, 2.0, oz - 11.9], 13.65, 3.5, 0.35);
  physMgr.registerBoxCollider('apt_front_door', 'wall', [ox, 1.65, oz - 11.9], 2.65, 2.85, 0.22, 0, states.doorOpen);

  // F1 North Left & Right of 2.9m Rear Patio Doors
  physMgr.registerBoxCollider('aur_f1_north_l', 'wall', [ox - 8.22, 2.0, oz + 11.9], 13.55, 3.5, 0.35);
  physMgr.registerBoxCollider('aur_f1_north_r', 'wall', [ox + 8.22, 2.0, oz + 11.9], 13.55, 3.5, 0.35);
  physMgr.registerBoxCollider('apt_patio_door', 'wall', [ox, 1.65, oz + 11.9], 2.85, 2.85, 0.22, 0, states.patioDoorOpen);

  // F1 West & East Solid Curtain Walls
  physMgr.registerBoxCollider('aur_f1_west', 'wall', [ox - 15.0, 2.0, oz], 0.35, 3.5, 24.2);
  physMgr.registerBoxCollider('aur_f1_east', 'wall', [ox + 15.0, 2.0, oz], 0.35, 3.5, 24.2);

  // F2..F4 Continuous Curtain Walls
  for (const id of ['F2', 'F3', 'F4'] as AurelionLevelId[]) {
    const spec = AURELION_LEVELS[id];
    const midY = (spec.floorY + spec.ceilingY) * 0.5;
    const h = spec.ceilingY - spec.floorY;
    physMgr.registerBoxCollider(`aur_${id}_n`, 'wall', [ox, midY, oz + spec.halfDepth], spec.halfWidth * 2, h, 0.32);
    physMgr.registerBoxCollider(`aur_${id}_s`, 'wall', [ox, midY, oz - spec.halfDepth], spec.halfWidth * 2, h, 0.32);
    physMgr.registerBoxCollider(`aur_${id}_w`, 'wall', [ox - spec.halfWidth, midY, oz], 0.32, h, spec.halfDepth * 2);
    physMgr.registerBoxCollider(`aur_${id}_e`, 'wall', [ox + spec.halfWidth, midY, oz], 0.32, h, spec.halfDepth * 2);
  }

  // F5 Stepped Sky Garden Perimeter Glass Parapets (outer terrace edge 30x24m)
  const f5RailY = AURELION_LEVELS.F5.floorY;
  physMgr.registerBoxCollider('aur_f5_rail_n', 'wall', [ox, f5RailY + 0.55, oz + 11.95], 30.0, 1.1, 0.14);
  physMgr.registerBoxCollider('aur_f5_rail_s', 'wall', [ox, f5RailY + 0.55, oz - 11.95], 30.0, 1.1, 0.14);
  physMgr.registerBoxCollider('aur_f5_rail_w', 'wall', [ox - 14.95, f5RailY + 0.55, oz], 0.14, 1.1, 24.0);
  physMgr.registerBoxCollider('aur_f5_rail_e', 'wall', [ox + 14.95, f5RailY + 0.55, oz], 0.14, 1.1, 24.0);

  // F6 Perimeter Curtain Walls (23.2x19.2m)
  const f6Spec = AURELION_LEVELS.F6;
  const f6MidY = (f6Spec.floorY + f6Spec.ceilingY) * 0.5;
  const f6H = f6Spec.ceilingY - f6Spec.floorY;
  physMgr.registerBoxCollider('aur_f6_n', 'wall', [ox, f6MidY, oz + f6Spec.halfDepth], f6Spec.halfWidth * 2, f6H, 0.32);
  physMgr.registerBoxCollider('aur_f6_s', 'wall', [ox, f6MidY, oz - f6Spec.halfDepth], f6Spec.halfWidth * 2, f6H, 0.32);
  physMgr.registerBoxCollider('aur_f6_w', 'wall', [ox - f6Spec.halfWidth, f6MidY, oz], 0.32, f6H, f6Spec.halfDepth * 2);
  physMgr.registerBoxCollider('aur_f6_e', 'wall', [ox + f6Spec.halfWidth, f6MidY, oz], 0.32, f6H, f6Spec.halfDepth * 2);

  // F7 Crown Observation Deck Perimeter Glass Parapets (23.2x19.2m)
  const f7Y = AURELION_LEVELS.F7.floorY;
  physMgr.registerBoxCollider('aur_f7_rail_n', 'wall', [ox, f7Y + 0.56, oz + 9.55], 23.2, 1.12, 0.14);
  physMgr.registerBoxCollider('aur_f7_rail_s', 'wall', [ox, f7Y + 0.56, oz - 9.55], 23.2, 1.12, 0.14);
  physMgr.registerBoxCollider('aur_f7_rail_w', 'wall', [ox - 11.55, f7Y + 0.56, oz], 0.14, 1.12, 19.2);
  physMgr.registerBoxCollider('aur_f7_rail_e', 'wall', [ox + 11.55, f7Y + 0.56, oz], 0.14, 1.12, 19.2);

  // 3. Atrium Balustrades (F2..F4) & Stairwell Side Rails (B1..F7)
  for (const id of ['F2', 'F3', 'F4'] as AurelionLevelId[]) {
    const y = AURELION_LEVELS[id].floorY;
    physMgr.registerBoxCollider(`aur_atrium_${id}_s`, 'wall', [ox, y + 0.52, oz + AURELION_ATRIUM_VOID.minZ], 6.4, 1.04, 0.12);
    physMgr.registerBoxCollider(`aur_atrium_${id}_n`, 'wall', [ox, y + 0.52, oz + AURELION_ATRIUM_VOID.maxZ], 6.4, 1.04, 0.12);
    physMgr.registerBoxCollider(`aur_atrium_${id}_w`, 'wall', [ox + AURELION_ATRIUM_VOID.minX, y + 0.52, oz], 0.12, 1.04, 5.6);
    physMgr.registerBoxCollider(`aur_atrium_${id}_e`, 'wall', [ox + AURELION_ATRIUM_VOID.maxX, y + 0.52, oz], 0.12, 1.04, 5.6);
  }
  for (const id of ['B1', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7'] as AurelionLevelId[]) {
    const y = AURELION_LEVELS[id].floorY;
    physMgr.registerBoxCollider(`aur_stair_rail_w_${id}`, 'wall', [ox + AURELION_STAIR_VOID.minX, y + 0.5, oz - 1.4], 0.1, 1.0, 4.4);
    physMgr.registerBoxCollider(`aur_stair_rail_e_${id}`, 'wall', [ox + AURELION_STAIR_VOID.maxX, y + 0.5, oz - 1.4], 0.1, 1.0, 4.4);
  }

  // 4. Three Elevator Shaft Side/Rear Glass Walls (leaving -Z entry open)
  (['main', 'service', 'private'] as ElevatorId[]).forEach((id) => {
    const cfg = AURELION_ELEVATOR_CONFIGS[id];
    const minY = AURELION_LEVELS[cfg.stops[0]].floorY;
    const maxY = AURELION_LEVELS[cfg.stops[cfg.stops.length - 1]].ceilingY;
    const h = maxY - minY;
    const midY = (minY + maxY) * 0.5;
    const halfC = cfg.cabW * 0.5 + 0.08;
    physMgr.registerBoxCollider(`aur_elev_${id}_w`, 'wall', [ox + cfg.localX - halfC, midY, oz + cfg.localZ], 0.12, h, cfg.cabD);
    physMgr.registerBoxCollider(`aur_elev_${id}_e`, 'wall', [ox + cfg.localX + halfC, midY, oz + cfg.localZ], 0.12, h, cfg.cabD);
    physMgr.registerBoxCollider(`aur_elev_${id}_n`, 'wall', [ox + cfg.localX, midY, oz + cfg.localZ + halfC], cfg.cabW, h, 0.12);
  });

  // 5. Floor 1 Preserved Solid Furniture & Guest Bathroom Walls (exact compatible IDs)
  const f1Y = AURELION_LEVELS.F1.floorY;
  physMgr.registerBoxCollider('apt_bed', 'prop', [ox - 5.5, f1Y + 0.35, oz + 3.8], 2.3, 0.75, 2.6);
  physMgr.registerBoxCollider('apt_nightstand', 'prop', [ox - 7.2, f1Y + 0.28, oz + 4.8], 0.68, 0.6, 0.68);
  physMgr.registerBoxCollider('apt_wardrobe', 'prop', [ox - 7.2, f1Y + 1.12, oz + 1.4], 0.85, 2.25, 1.55);
  physMgr.registerBoxCollider('apt_computer_desk', 'prop', [ox - 3.5, f1Y + 0.38, oz + 0.6], 1.55, 0.8, 0.82);
  physMgr.registerBoxCollider('apt_sofa', 'prop', [ox, f1Y + 0.36, oz + 0.5], 2.75, 0.75, 1.08);
  physMgr.registerBoxCollider('apt_coffee_table', 'prop', [ox, f1Y + 0.2, oz - 1.2], 1.8, 0.42, 0.92);
  physMgr.registerBoxCollider('apt_tvstand', 'prop', [ox - 5.5, f1Y + 0.28, oz], 2.3, 0.6, 0.56);
  physMgr.registerBoxCollider('apt_dining_table', 'prop', [ox + 2.2, f1Y + 0.39, oz + 1.2], 1.8, 0.8, 1.2);
  physMgr.registerBoxCollider('apt_kitchen', 'prop', [ox + 5.8, f1Y + 0.45, oz + 3.2], 3.5, 0.9, 1.0);
  physMgr.registerBoxCollider('apt_kitchen_stove', 'prop', [ox + 5.8, f1Y + 0.46, oz + 4.6], 1.1, 0.92, 1.1);
  physMgr.registerBoxCollider('apt_fridge', 'prop', [ox + 4.5, f1Y + 1.08, oz + 5.8], 1.15, 2.15, 0.98);
  physMgr.registerBoxCollider('apt_f1_medical_bed', 'prop', [ox + 3.6, f1Y + 0.3, oz - 5.2], 2.15, 0.65, 1.05);
  physMgr.registerBoxCollider('apt_f1_security_desk', 'prop', [ox + 2.38, f1Y + 0.46, oz - 0.5], 0.95, 0.92, 3.2);
  physMgr.registerBoxCollider('apt_bath_wall_n', 'wall', [ox - 5.45, f1Y + 1.4, oz - 3.2], 3.9, 2.8, 0.22);
  physMgr.registerBoxCollider('apt_bath_wall_e', 'wall', [ox - 3.5, f1Y + 1.4, oz - 5.7], 0.22, 2.8, 1.8);
  physMgr.registerBoxCollider('apt_bath_door', 'wall', [ox - 3.5, f1Y + 1.12, oz - 4.1], 0.22, 2.25, 0.92, 0, states.bathroomDoorOpen);
  physMgr.registerBoxCollider('apt_bath_vanity', 'prop', [ox - 4.5, f1Y + 0.44, oz - 3.55], 1.2, 0.88, 0.65);
  physMgr.registerBoxCollider('apt_bath_toilet', 'prop', [ox - 4.4, f1Y + 0.42, oz - 6.0], 0.65, 0.88, 0.75);
  physMgr.registerBoxCollider('apt_bath_tub', 'prop', [ox - 6.5, f1Y + 0.32, oz - 5.7], 1.2, 0.65, 1.8);

  // 6. B2 Infrastructure Equipment Colliders
  const b2Y = AURELION_LEVELS.B2.floorY;
  physMgr.registerBoxCollider('aur_b2_genset_w', 'prop', [ox - 12.6, b2Y + 0.9, oz - 7.2], 1.9, 1.85, 3.7);
  physMgr.registerBoxCollider('aur_b2_genset_e', 'prop', [ox - 9.4, b2Y + 0.9, oz - 7.2], 1.9, 1.85, 3.7);
  physMgr.registerBoxCollider('aur_b2_water_pump', 'prop', [ox + B2_WATER_PUMP_POS.x - 0.2, b2Y + 0.75, oz + B2_WATER_PUMP_POS.z + 0.1], 2.35, 1.5, 1.65);
  physMgr.registerBoxCollider('aur_b2_water_ro', 'prop', [ox + 3.0, b2Y + 0.9, oz + 8.8], 3.25, 1.8, 1.4);
  physMgr.registerCylinderCollider('aur_b2_cistern_1', 'prop', [ox - 5.4, b2Y, oz + 9.0], 1.2, 2.75);
  physMgr.registerCylinderCollider('aur_b2_cistern_2', 'prop', [ox - 2.6, b2Y, oz + 9.0], 1.2, 2.75);
  for (const bedCfg of B2_FARM_BED_COORDS) {
    physMgr.registerBoxCollider(`aur_b2_farm_${bedCfg.id}`, 'prop', [ox + bedCfg.x, b2Y + 0.45, oz + bedCfg.z], 2.24, 0.9, 1.18);
  }

  // 7. F2, F3, F4, F5, F6, F7 Key Solid Equipment Colliders
  const f2Y = AURELION_LEVELS.F2.floorY;
  physMgr.registerBoxCollider('aur_f2_master_bed', 'prop', [ox - 11.5, f2Y + 0.4, oz + 6.2], 2.6, 0.8, 2.8);
  physMgr.registerBoxCollider('aur_f2_study_desk', 'prop', [ox - 5.8, f2Y + 0.4, oz - 8.2], 2.1, 0.8, 0.95);

  const f3Y = AURELION_LEVELS.F3.floorY;
  physMgr.registerBoxCollider('aur_f3_reception', 'prop', [ox + 1.5, f3Y + 0.5, oz - 8.2], 3.2, 1.02, 0.9);
  physMgr.registerBoxCollider('aur_f3_mri', 'prop', [ox - 11.2, f3Y + 1.1, oz - 7.8], 2.1, 2.2, 1.6);

  const f4Y = AURELION_LEVELS.F4.floorY;
  physMgr.registerCylinderCollider('aur_f4_armory_term', 'prop', [ox - 11.2, f4Y, oz], 0.55, 1.15);

  const f5Y = AURELION_LEVELS.F5.floorY;
  for (let i = 0; i < 12; i++) {
    const col = Math.floor(i / 4);
    const row = i % 4;
    physMgr.registerBoxCollider(`aur_f5_hydro_${i}`, 'prop', [ox - 9.6 + col * 3.1, f5Y + 0.98, oz - 4.2 + row * 2.8], 1.9, 1.95, 0.95);
  }

  const f6Y = AURELION_LEVELS.F6.floorY;
  physMgr.registerBoxCollider('aur_f6_aquarium', 'prop', [ox - 7.0, f6Y + 1.4, oz + 6.4], 6.0, 2.8, 2.2);
  physMgr.registerBoxCollider('aur_f6_pool_rim_n', 'wall', [ox + (AURELION_F6_INDOOR_POOL.localMinX + AURELION_F6_INDOOR_POOL.localMaxX) * 0.5, f6Y + 0.48, oz + AURELION_F6_INDOOR_POOL.localMaxZ + 0.12], 6.3, 0.96, 0.25);
  physMgr.registerBoxCollider('aur_f6_pool_rim_s', 'wall', [ox + (AURELION_F6_INDOOR_POOL.localMinX + AURELION_F6_INDOOR_POOL.localMaxX) * 0.5, f6Y + 0.48, oz + AURELION_F6_INDOOR_POOL.localMinZ - 0.12], 6.3, 0.96, 0.25);

  const p7 = AURELION_ROOFTOP_INFINITY_POOL;
  const p7CX = (p7.localMinX + p7.localMaxX) * 0.5;
  const p7CZ = (p7.localMinZ + p7.localMaxZ) * 0.5;
  physMgr.registerBoxCollider('aur_f7_pool_weir_w', 'wall', [ox + p7.localMinX - 0.08, f7Y + 0.52, oz + p7CZ], 0.2, 1.05, 7.5);
  physMgr.registerBoxCollider('aur_f7_pool_rim_n', 'wall', [ox + p7CX, f7Y + 0.58, oz + p7.localMaxZ + 0.18], 7.3, 1.15, 0.35);
  physMgr.registerBoxCollider('aur_f7_pool_rim_s', 'wall', [ox + p7CX, f7Y + 0.58, oz + p7.localMinZ - 0.18], 7.3, 1.15, 0.35);
}
