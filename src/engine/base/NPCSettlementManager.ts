import * as THREE from 'three';
import { NPCSurvivor, NPCRole } from '../../types/game';
import { TerrainGenerator } from '../world/TerrainGenerator';
import { buildRealisticHumanoid } from '../rendering/RealisticHumanoidBuilder';

export class NPCSettlementManager {
  public scene: THREE.Scene;
  public npcs: NPCSurvivor[] = [
    {
      id: 'npc_marcus',
      name: 'Marcus V.',
      role: 'engineer',
      assignedRoom: 'Workshop & Garage',
      currentTask: 'Inspecting perimeter palisades and solar inverter',
      health: 100,
      maxHealth: 100,
      morale: 85,
      position: [4.5, 0, -5.5],
      avatarColor: '#d97706',
    },
    {
      id: 'npc_elena',
      name: 'Elena Rostova',
      role: 'botanist',
      assignedRoom: 'Greenhouse & Plots',
      currentTask: 'Tending wild berry planter boxes',
      health: 100,
      maxHealth: 100,
      morale: 90,
      position: [-6.0, 0, 3.5],
      avatarColor: '#10b981',
    },
    {
      id: 'npc_jax',
      name: 'Jax "Hawk" Miller',
      role: 'scout',
      assignedRoom: 'North Watchtower',
      currentTask: 'Scanning southern horizon for horde dust plumes',
      health: 100,
      maxHealth: 100,
      morale: 80,
      position: [9.5, 5.2, 8.0],
      avatarColor: '#3b82f6',
    },
  ];

  public npcMeshes: Map<string, THREE.Group> = new Map();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.spawnNPCMeshes();
  }

  private spawnNPCMeshes() {
    this.npcs.forEach((npc) => {
      const jacketHex = new THREE.Color(npc.avatarColor).getHex();
      const rig = buildRealisticHumanoid({
        name: npc.id,
        facing: '-Z',
        skinColor: npc.id === 'npc_elena' ? 0xe6be9e : 0xcfa07a,
        jacketColor: jacketHex,
        pantsColor: 0x242d38,
        hairColor: npc.id === 'npc_elena' ? 0x6b3220 : 0x211b17,
        genderPresentation: npc.id === 'npc_elena' ? 'feminine' : 'masculine',
        hairStyle: npc.id === 'npc_elena' ? 'bun' : npc.id === 'npc_jax' ? 'beanie' : 'short',
        fabricStyle: 'tactical',
        hasBeard: npc.id === 'npc_marcus',
        hasBackpack: npc.role === 'scout',
        hasHolster: npc.role === 'scout',
        hasBelt: true,
        armAliasStyle: 'full',
        castShadow: true,
      });

      const group = rig.group;
      const y = npc.role === 'scout' ? 5.2 : TerrainGenerator.getHeight(npc.position[0], npc.position[2]);
      group.position.set(npc.position[0], y, npc.position[2]);

      this.scene.add(group);
      this.npcMeshes.set(npc.id, group);
    });
  }

  public infectionStageMap = new Map<string, 'normal' | 'stunned' | 'zombie'>();
  public infectionTimerMap = new Map<string, number>();

  public infectNPC(npcId: string): boolean {
    const npc = this.npcs.find((n) => n.id === npcId);
    const stage = this.infectionStageMap.get(npcId) ?? 'normal';
    if (!npc || stage !== 'normal') return false;
    this.infectionStageMap.set(npcId, 'stunned');
    this.infectionTimerMap.set(npcId, 60.0);
    npc.currentTask = 'STUNNED — Infected! Turning in 60s...';
    return true;
  }

  public getLivingTargets(): Array<{ id: string; kind: 'settlement'; position: [number, number, number] }> {
    const out: Array<{ id: string; kind: 'settlement'; position: [number, number, number] }> = [];
    for (const npc of this.npcs) {
      const stage = this.infectionStageMap.get(npc.id) ?? 'normal';
      if (stage !== 'normal') continue;
      const mesh = this.npcMeshes.get(npc.id);
      const pos: [number, number, number] = mesh ? [mesh.position.x, mesh.position.y, mesh.position.z] : npc.position;
      out.push({ id: npc.id, kind: 'settlement', position: pos });
    }
    return out;
  }

  public update(delta: number, _isNight: boolean, isPowered: boolean, onConverted?: (pos: [number, number, number]) => void) {
    const time = Date.now() * 0.0025;
    this.npcs.forEach((npc, idx) => {
      const mesh = this.npcMeshes.get(npc.id);
      if (!mesh) return;
      const stage = this.infectionStageMap.get(npc.id) ?? 'normal';
      if (stage === 'zombie') {
        mesh.visible = false;
        return;
      }
      if (stage === 'stunned') {
        const shiver = Math.sin(time * 9 + idx) * 0.08;
        mesh.rotation.x = THREE.MathUtils.damp(mesh.rotation.x, 0.22, 4, delta);
        mesh.rotation.z = shiver;
        const lArm = mesh.getObjectByName('leftArm');
        const rArm = mesh.getObjectByName('rightArm');
        if (lArm && rArm) {
          lArm.rotation.x = -0.6 + shiver;
          rArm.rotation.x = -0.6 - shiver;
        }
        const rem = Math.max(0, (this.infectionTimerMap.get(npc.id) ?? 60) - delta);
        this.infectionTimerMap.set(npc.id, rem);
        npc.currentTask = `STUNNED — Turning into zombie (${Math.ceil(rem)}s)`;
        if (rem <= 0) {
          this.infectionStageMap.set(npc.id, 'zombie');
          npc.health = 0;
          npc.currentTask = 'Turned into Infected';
          mesh.visible = false;
          onConverted?.([mesh.position.x, mesh.position.y, mesh.position.z]);
        }
        return;
      }

      mesh.rotation.y = Math.sin(time + idx * 1.9) * 0.22;
      const lArm = mesh.getObjectByName('leftArm');
      const rArm = mesh.getObjectByName('rightArm');
      if (lArm && rArm) {
        lArm.rotation.x = Math.sin(time * 1.4 + idx) * 0.06;
        rArm.rotation.x = -Math.sin(time * 1.4 + idx) * 0.06;
      }
    });

    // Morale updates
    const moraleBoost = (isPowered ? 0.02 : -0.04) * delta;
    this.npcs.forEach((npc) => {
      npc.morale = Math.max(20, Math.min(100, npc.morale + moraleBoost));
    });
  }

  public assignRole(npcId: string, role: NPCRole) {
    const npc = this.npcs.find((n) => n.id === npcId);
    if (npc) {
      npc.role = role;
    }
  }

  public dispose() {
    this.npcMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.npcMeshes.clear();
  }
}
