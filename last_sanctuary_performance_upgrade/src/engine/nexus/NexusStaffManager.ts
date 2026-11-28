import * as THREE from 'three';
import { NEXUS_FLOORS, type NexusFloorNumber } from './NexusConfig';
import { buildRealisticHumanoid, type RealisticHumanoidRig } from '../rendering/RealisticHumanoidBuilder';
import type { NexusLiveContext, NexusLiveNpcMarker, NexusSystems } from './NexusSystems';

export interface NexusStaffSpec {
  id: string;
  name: string;
  roleTitle: string;
  floor: NexusFloorNumber;
  stationName: string;
  waypointA: [number, number];
  waypointB: [number, number];
  facingYaw: number;
  skinColor: number;
  jacketColor: number;
  pantsColor: number;
  hairColor: number;
  gender: 'masculine' | 'feminine';
  hairStyle: 'short' | 'bun' | 'ponytail' | 'parted' | 'station_master_cap';
  hasHeadset?: boolean;
  hasStethoscope?: boolean;
}

const NEXUS_STAFF_ROSTER: NexusStaffSpec[] = [
  {
    id: 'nexus_staff_reception',
    name: 'Nadia Kapoor',
    roleTitle: 'Reception Staff · Atrium Coordinator',
    floor: 1,
    stationName: 'Main Reception Island',
    waypointA: [0.0, -3.0],
    waypointB: [-3.2, -5.8],
    facingYaw: Math.PI,
    skinColor: 0xd19c73,
    jacketColor: 0xb45309,
    pantsColor: 0x1e293b,
    hairColor: 0x1c1410,
    gender: 'feminine',
    hairStyle: 'bun',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_security_f1',
    name: 'Sgt. Vikram Singh',
    roleTitle: 'Security Access Officer',
    floor: 1,
    stationName: 'Security Access Lobby',
    waypointA: [3.2, -1.2],
    waypointB: [1.4, -0.8],
    facingYaw: -Math.PI * 0.5,
    skinColor: 0xc68e62,
    jacketColor: 0x334155,
    pantsColor: 0x0f172a,
    hairColor: 0x111111,
    gender: 'masculine',
    hairStyle: 'short',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_rail_f2',
    name: 'Ananya Rao',
    roleTitle: 'Railway Operator · Network Cartographer',
    floor: 2,
    stationName: '3D Railway Network Table',
    waypointA: [-2.8, 0.2],
    waypointB: [-1.4, 3.3],
    facingYaw: Math.PI * 0.45,
    skinColor: 0xd4a37a,
    jacketColor: 0x0369a1,
    pantsColor: 0x1e293b,
    hairColor: 0x1f1512,
    gender: 'feminine',
    hairStyle: 'ponytail',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_train_f3',
    name: 'Rohan Mehta',
    roleTitle: 'Train Monitoring Staff · Lead Dispatcher',
    floor: 3,
    stationName: 'Train Operations Horseshoe Console',
    waypointA: [-1.8, 1.8],
    waypointB: [2.2, 1.8],
    facingYaw: 0,
    skinColor: 0xc48b61,
    jacketColor: 0x0e7490,
    pantsColor: 0x172554,
    hairColor: 0x171412,
    gender: 'masculine',
    hairStyle: 'station_master_cap',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_eng_f4',
    name: 'Devashish Patel',
    roleTitle: 'Senior Infrastructure Engineer',
    floor: 4,
    stationName: 'Track Test Model Bench',
    waypointA: [-2.2, -1.7],
    waypointB: [2.5, -1.7],
    facingYaw: 0,
    skinColor: 0xc99268,
    jacketColor: 0xd97706,
    pantsColor: 0x27272a,
    hairColor: 0x1b1614,
    gender: 'masculine',
    hairStyle: 'short',
  },
  {
    id: 'nexus_staff_comms_f5',
    name: 'Kiara Sen',
    roleTitle: 'Communications Operator · Radio Bus',
    floor: 5,
    stationName: 'Comms Operator Pod',
    waypointA: [-2.4, 0.2],
    waypointB: [-4.2, 4.4],
    facingYaw: Math.PI * 0.5,
    skinColor: 0xd9ab84,
    jacketColor: 0x4338ca,
    pantsColor: 0x1e1b4b,
    hairColor: 0x261812,
    gender: 'feminine',
    hairStyle: 'parted',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_exec_f6',
    name: 'Director Arvind Nair',
    roleTitle: 'Executive Staff · Rail Commander',
    floor: 6,
    stationName: 'Strategic Sky Command Table',
    waypointA: [-2.2, -1.6],
    waypointB: [2.3, 1.6],
    facingYaw: 0,
    skinColor: 0xc48c64,
    jacketColor: 0x292524,
    pantsColor: 0x1c1917,
    hairColor: 0x3f3f46,
    gender: 'masculine',
    hairStyle: 'parted',
  },
  {
    id: 'nexus_staff_compound_f7',
    name: 'Lt. Meera Joshi',
    roleTitle: 'Compound Monitoring Staff · Defense Radar',
    floor: 7,
    stationName: 'Elevated 3D Compound Radar',
    waypointA: [-2.8, -1.4],
    waypointB: [2.9, 1.5],
    facingYaw: Math.PI * 0.35,
    skinColor: 0xd5a176,
    jacketColor: 0x0f766e,
    pantsColor: 0x111827,
    hairColor: 0x1c1917,
    gender: 'feminine',
    hairStyle: 'bun',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_outbreak_f8',
    name: 'Dr. Kabir Malhotra',
    roleTitle: 'Outbreak Analyst · Global Bio-Radar',
    floor: 8,
    stationName: 'Central Global Outbreak Globe',
    waypointA: [-2.6, 1.2],
    waypointB: [2.7, -1.3],
    facingYaw: -Math.PI * 0.3,
    skinColor: 0xc9926b,
    jacketColor: 0x9f1239,
    pantsColor: 0x18181b,
    hairColor: 0x18181b,
    gender: 'masculine',
    hairStyle: 'short',
    hasHeadset: true,
  },
  {
    id: 'nexus_staff_research_f8',
    name: 'Dr. Elena Vance',
    roleTitle: 'Lead Bio-Researcher · Containment Pod',
    floor: 8,
    stationName: 'Scientific Containment Bench',
    waypointA: [-6.0, -5.6],
    waypointB: [-4.2, -6.2],
    facingYaw: -Math.PI * 0.5,
    skinColor: 0xe8c3a8,
    jacketColor: 0xe2e8f0,
    pantsColor: 0x334155,
    hairColor: 0x713f12,
    gender: 'feminine',
    hairStyle: 'bun',
    hasStethoscope: true,
  },
];

interface StaffRuntime {
  spec: NexusStaffSpec;
  rig: RealisticHumanoidRig;
  phase: number;
  goingToB: boolean;
  waitTimer: number;
  currentX: number;
  currentZ: number;
}

export class NexusStaffManager {
  private readonly roster: StaffRuntime[] = [];

  constructor(floorGroups: Record<number, THREE.Group>) {
    NEXUS_STAFF_ROSTER.forEach((spec, idx) => {
      const parent = floorGroups[spec.floor];
      if (!parent) return;

      const rig = buildRealisticHumanoid({
        name: spec.id,
        facing: '+Z',
        skinColor: spec.skinColor,
        jacketColor: spec.jacketColor,
        pantsColor: spec.pantsColor,
        hairColor: spec.hairColor,
        fabricStyle: 'uniform',
        genderPresentation: spec.gender,
        hairStyle: spec.hairStyle,
        hasHeadset: spec.hasHeadset,
        hasStethoscope: spec.hasStethoscope,
        hasBelt: true,
        armAliasStyle: 'full',
        castShadow: false,
      });

      const fy = NEXUS_FLOORS[spec.floor].floorY;
      rig.group.position.set(spec.waypointA[0], fy, spec.waypointA[1]);
      rig.group.rotation.y = spec.facingYaw;
      parent.add(rig.group);

      this.roster.push({
        spec,
        rig,
        phase: idx * 1.15,
        goingToB: true,
        waitTimer: 2.5 + (idx % 3) * 1.2,
        currentX: spec.waypointA[0],
        currentZ: spec.waypointA[1],
      });
    });
  }

  public update(delta: number, playerRelToNexus: THREE.Vector3): void {
    const dt = Math.min(delta, 0.1);
    for (const member of this.roster) {
      const floorGroup = member.rig.group.parent;
      if (floorGroup && !floorGroup.visible) continue;

      member.phase += dt * 3.4;

      if (member.waitTimer > 0) {
        member.waitTimer -= dt;
        // Workstation console operation animation (subtle typing / scanning)
        const typeSwing = Math.sin(member.phase * 2.2) * 0.14;
        member.rig.leftArm.rotation.x = -0.58 + typeSwing;
        member.rig.rightArm.rotation.x = -0.58 - typeSwing;
        member.rig.leftLeg.rotation.x = THREE.MathUtils.damp(member.rig.leftLeg.rotation.x, 0, 8, dt);
        member.rig.rightLeg.rotation.x = THREE.MathUtils.damp(member.rig.rightLeg.rotation.x, 0, 8, dt);

        // Turn head subtly toward player when close on same floor
        const fy = NEXUS_FLOORS[member.spec.floor].floorY;
        const distPlayer = Math.hypot(
          playerRelToNexus.x - member.currentX,
          playerRelToNexus.z - member.currentZ
        );
        if (Math.abs(playerRelToNexus.y - fy) < 1.8 && distPlayer < 4.5) {
          const desiredYaw = Math.atan2(
            playerRelToNexus.x - member.currentX,
            playerRelToNexus.z - member.currentZ
          );
          member.rig.group.rotation.y = THREE.MathUtils.damp(
            member.rig.group.rotation.y,
            desiredYaw,
            6,
            dt
          );
        } else {
          member.rig.headMesh.rotation.y = Math.sin(member.phase * 0.35) * 0.24;
        }
        continue;
      }

      const target = member.goingToB ? member.spec.waypointB : member.spec.waypointA;
      const dx = target[0] - member.currentX;
      const dz = target[1] - member.currentZ;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.12) {
        member.goingToB = !member.goingToB;
        member.waitTimer = 4.2 + (member.spec.floor % 3) * 1.4;
        member.rig.group.rotation.y = member.spec.facingYaw;
      } else {
        const speed = 1.15;
        const step = Math.min(dist, speed * dt);
        member.currentX += (dx / dist) * step;
        member.currentZ += (dz / dist) * step;
        member.rig.group.position.x = member.currentX;
        member.rig.group.position.z = member.currentZ;
        member.rig.group.rotation.y = Math.atan2(dx, dz);

        const walkSwing = Math.sin(member.phase * 1.65) * 0.42;
        member.rig.leftLeg.rotation.x = walkSwing;
        member.rig.rightLeg.rotation.x = -walkSwing;
        member.rig.leftArm.rotation.x = -walkSwing * 0.55;
        member.rig.rightArm.rotation.x = walkSwing * 0.55;
      }
    }
  }

  public getNearestStaffInteraction(
    relX: number,
    relY: number,
    relZ: number,
    systems: NexusSystems,
    live: NexusLiveContext | null
  ): { staff: NexusStaffSpec; briefing: string } | null {
    for (const member of this.roster) {
      const fy = NEXUS_FLOORS[member.spec.floor].floorY;
      if (Math.abs(relY - fy) > 1.8) continue;
      if (Math.hypot(relX - member.currentX, relZ - member.currentZ) <= 2.35) {
        let briefing = `${member.spec.name} (${member.spec.roleTitle})`;
        if (member.spec.floor === 1) {
          briefing += systems.visitorRegistered
            ? ` — Visitor ${systems.visitorName} logged. Active clearance: ${systems.clearanceLevel.toUpperCase()}.`
            : ' — Reception open. Register visitor credentials or verify Staff ID.';
        } else if (member.spec.floor === 2 || member.spec.floor === 3) {
          const held = live?.trains.filter((t) => t.holdOrdered).length ?? 0;
          briefing += ` — Monitoring ${live?.trains.length ?? 6} AI trains across Lines F1–B3 (${held} held).`;
        } else if (member.spec.floor === 4) {
          const openWo = systems.engineeringOrders.filter((w) => w.status === 'open').length;
          briefing += ` — ${openWo} active rail/bridge engineering work orders queued.`;
        } else if (member.spec.floor === 5) {
          briefing += ` — ${systems.commsLog.length} logged telemetry dispatches; Lift A/B PLC nominal.`;
        } else if (member.spec.floor === 6) {
          briefing += ` — ${systems.pinnedAlertNotes.length} executive alerts pinned.`;
        } else if (member.spec.floor === 7) {
          const engaged = live?.compound.turrets.filter((t) => t.isLockedOn).length ?? 0;
          briefing += ` — All 20 perimeter towers active (${engaged} locked on target).`;
        } else if (member.spec.floor === 8) {
          const sev = Math.round((live?.outbreak.globalMetrics.apocalypticSeverity ?? 0) * 100);
          briefing += ` — Global outbreak severity at ${sev}% across ${live?.outbreak.cities.length ?? 0} hubs.`;
        }
        return { staff: member.spec, briefing };
      }
    }
    return null;
  }

  public getRadarMarkers(nexusWorldOrigin: { x: number; z: number }): NexusLiveNpcMarker[] {
    return this.roster.map((m) => ({
      id: m.spec.id,
      name: m.spec.name,
      role: `${m.spec.roleTitle} (F${m.spec.floor})`,
      kind: 'settlement',
      position: [
        nexusWorldOrigin.x + m.currentX,
        NEXUS_FLOORS[m.spec.floor].floorY,
        nexusWorldOrigin.z + m.currentZ,
      ],
      health: 100,
      maxHealth: 100,
    }));
  }
}
