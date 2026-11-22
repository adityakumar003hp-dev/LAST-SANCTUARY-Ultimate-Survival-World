/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { NPCSurvivor, NPCRole } from '../../types/game';
import { TerrainGenerator } from '../world/TerrainGenerator';

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
      const group = new THREE.Group();
      group.name = npc.id;

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 0.7 });
      const clothMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(npc.avatarColor), roughness: 0.8 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x242d38, roughness: 0.85 });

      // Torso
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.3), clothMat);
      torso.position.y = 1.15;
      torso.castShadow = true;

      // Head
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), skinMat);
      head.position.y = 1.65;
      head.castShadow = true;

      // Arms
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), clothMat);
      armL.position.set(-0.35, 1.1, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.6, 0.14), clothMat);
      armR.position.set(0.35, 1.1, 0);

      // Legs
      const legL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), pantsMat);
      legL.position.set(-0.15, 0.45, 0);
      const legR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), pantsMat);
      legR.position.set(0.15, 0.45, 0);

      group.add(torso, head, armL, armR, legL, legR);

      const y = npc.role === 'scout' ? 5.2 : TerrainGenerator.getHeight(npc.position[0], npc.position[2]);
      group.position.set(npc.position[0], y, npc.position[2]);

      this.scene.add(group);
      this.npcMeshes.set(npc.id, group);
    });
  }

  public update(delta: number, isNight: boolean, isPowered: boolean) {
    // Subtle idle animation
    const time = Date.now() * 0.003;
    this.npcs.forEach((npc) => {
      const mesh = this.npcMeshes.get(npc.id);
      if (mesh) {
        mesh.rotation.y = Math.sin(time + npc.name.length) * 0.2;
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
