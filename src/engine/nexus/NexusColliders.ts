import * as THREE from 'three';
import type { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import {
  NEXUS_ELEVATORS,
  NEXUS_FLOOR_ORDER,
  NEXUS_FLOORS,
  NEXUS_PLOT_ORIGIN_LOCAL,
} from './NexusConfig';

export function registerNexusStructure2Colliders(
  physMgr: UnifiedPhysicsManager,
  apartmentOrigin: THREE.Vector3,
  restrictedUnlocked: boolean
): void {
  const cx = apartmentOrigin.x + NEXUS_PLOT_ORIGIN_LOCAL.x; // -74
  const cz = apartmentOrigin.z + NEXUS_PLOT_ORIGIN_LOCAL.z; // +62
  const roofY = NEXUS_FLOORS[8].floorY + NEXUS_FLOORS[8].ceilingHeight; // 31.05
  const wallMidY = (0.65 + roofY) * 0.5;
  const wallTotalH = roofY - 0.65;

  // Perimeter Curtain Walls (all 8 floors)
  physMgr.registerBoxCollider('nexus_west_wall', 'wall', [cx - 10.95, wallMidY, cz], 0.36, wallTotalH, 18.0);
  physMgr.registerBoxCollider('nexus_east_wall', 'wall', [cx + 10.95, wallMidY, cz], 0.36, wallTotalH, 18.0);
  physMgr.registerBoxCollider('nexus_north_wall', 'wall', [cx, wallMidY, cz + 8.92], 22.0, wallTotalH, 0.36);

  // South Wall with F1 Grand Central Portico Opening (X in [-2.6, +2.6])
  physMgr.registerBoxCollider('nexus_south_wall_west', 'wall', [cx - 6.9, wallMidY, cz - 8.92], 8.2, wallTotalH, 0.36);
  physMgr.registerBoxCollider('nexus_south_wall_east', 'wall', [cx + 6.9, wallMidY, cz - 8.92], 8.2, wallTotalH, 0.36);
  for (let i = 1; i < NEXUS_FLOOR_ORDER.length; i++) {
    const fl = NEXUS_FLOORS[NEXUS_FLOOR_ORDER[i]];
    physMgr.registerBoxCollider(
      `nexus_south_upper_${fl.floor}`,
      'wall',
      [cx, fl.floorY + fl.ceilingHeight * 0.5, cz - 8.92],
      22.0,
      fl.ceilingHeight,
      0.36
    );
  }

  // Lift A & Lift B Shaft Back & Side Walls (East side open to lobbies)
  for (const id of ['liftA', 'liftB'] as const) {
    const cfg = NEXUS_ELEVATORS[id];
    const hw = cfg.cabW * 0.5 + 0.14;
    const hd = cfg.cabD * 0.5 + 0.14;
    physMgr.registerBoxCollider(`nexus_${id}_shaft_west`, 'wall', [cx + cfg.localX - hw, wallMidY, cz + cfg.localZ], 0.18, wallTotalH, cfg.cabD + 0.3);
    physMgr.registerBoxCollider(`nexus_${id}_shaft_north`, 'wall', [cx + cfg.localX, wallMidY, cz + cfg.localZ + hd], cfg.cabW + 0.3, wallTotalH, 0.18);
    physMgr.registerBoxCollider(`nexus_${id}_shaft_south`, 'wall', [cx + cfg.localX, wallMidY, cz + cfg.localZ - hd], cfg.cabW + 0.3, wallTotalH, 0.18);
  }

  // Floor 1 Furniture & Partitions
  const y1 = NEXUS_FLOORS[1].floorY;
  physMgr.registerBoxCollider('nexus_f1_reception', 'prop', [cx, y1 + 0.54, cz - 3.8], 4.4, 1.08, 1.15);
  physMgr.registerBoxCollider('nexus_f1_spire', 'prop', [cx + 0.2, y1 + 1.1, cz + 3.8], 3.0, 2.2, 3.0);
  physMgr.registerBoxCollider('nexus_f1_vis_desk', 'prop', [cx - 7.6, y1 + 0.48, cz - 6.6], 3.0, 0.96, 0.9);
  physMgr.registerBoxCollider('nexus_f1_staff_desk', 'prop', [cx + 7.6, y1 + 0.48, cz - 6.6], 3.0, 0.96, 0.9);
  physMgr.registerBoxCollider('nexus_f1_sec_info', 'prop', [cx + 3.8, y1 + 0.49, cz - 0.2], 2.1, 0.98, 0.95);
  physMgr.registerBoxCollider('nexus_f1_staff_office_south', 'wall', [cx - 8.0, y1 + 1.9, cz + 4.2], 5.6, 3.8, 0.16);
  physMgr.registerBoxCollider('nexus_f1_restricted_gate', 'wall', [cx - 5.2, y1 + 1.4, cz + 6.2], 0.2, 2.8, 2.0, 0, restrictedUnlocked);
  physMgr.registerBoxCollider('nexus_f1_entrance_door', 'wall', [cx, y1 + 1.8, cz - 8.92], 4.8, 3.6, 0.2, 0, false);

  // Floor 2 Central 3D Railway Network Table
  const y2 = NEXUS_FLOORS[2].floorY;
  physMgr.registerBoxCollider('nexus_f2_network_table', 'prop', [cx + 0.3, y2 + 0.5, cz], 5.4, 1.0, 5.4);

  // Floor 3 Arena Dais Desks (6 consoles)
  const y3 = NEXUS_FLOORS[3].floorY;
  for (let i = 0; i < 6; i++) {
    const angle = (-Math.PI * 0.58) + (i / 5) * (Math.PI * 1.16);
    const r = 2.6;
    physMgr.registerBoxCollider(
      `nexus_f3_console_${i}`,
      'prop',
      [cx + 0.3 + Math.sin(angle) * r, y3 + 0.55, cz + Math.cos(angle) * r],
      1.35,
      1.1,
      0.85
    );
  }

  // Floor 4 Track Test Bench
  const y4 = NEXUS_FLOORS[4].floorY;
  physMgr.registerBoxCollider('nexus_f4_test_bench', 'prop', [cx + 0.2, y4 + 0.5, cz], 6.8, 1.0, 2.2);

  // Floor 5 Comms Pod & Server Racks
  const y5 = NEXUS_FLOORS[5].floorY;
  physMgr.registerBoxCollider('nexus_f5_comms_pod', 'prop', [cx + 0.3, y5 + 0.46, cz], 4.0, 0.92, 4.0);
  physMgr.registerBoxCollider('nexus_f5_servers', 'prop', [cx - 7.9, y5 + 1.22, cz + 6.3], 5.0, 2.45, 3.0);

  // Floor 6 Strategic Overview Table
  const y6 = NEXUS_FLOORS[6].floorY;
  physMgr.registerBoxCollider('nexus_f6_strategic_table', 'prop', [cx + 0.3, y6 + 0.45, cz], 4.4, 0.9, 2.2);

  // Floor 7 Elevated Compound 3D Radar Table
  const y7 = NEXUS_FLOORS[7].floorY;
  physMgr.registerBoxCollider('nexus_f7_compound_table', 'prop', [cx + 0.3, y7 + 0.55, cz], 5.7, 1.1, 5.7);

  // Floor 8 Central Global Outbreak Table
  const y8 = NEXUS_FLOORS[8].floorY;
  physMgr.registerBoxCollider('nexus_f8_outbreak_table', 'prop', [cx + 0.3, y8 + 0.65, cz], 5.5, 1.3, 5.5);
}
