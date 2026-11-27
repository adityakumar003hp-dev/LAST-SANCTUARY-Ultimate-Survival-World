import * as THREE from 'three';
import { StoryCompanion } from '../../types/prologue';
import { getTerrainHeight } from '../Terrain';
import { soundEngine } from '../../utils/audio';
import { UnifiedPhysicsManager } from '../physics/UnifiedPhysicsManager';
import { ApartmentBuilding } from './ApartmentBuilding';
import { buildRealisticHumanoid } from '../rendering/RealisticHumanoidBuilder';

export class StoryCompanionManager {
  public scene: THREE.Scene;
  public group: THREE.Group;
  public companions: Map<'marcus' | 'chloe' | 'maya' | 'rohan', StoryCompanion> = new Map();
  public companionMeshes: Map<'marcus' | 'chloe' | 'maya' | 'rohan', THREE.Group> = new Map();
  private walkTime: number = 0;
  private gestureTimers = new Map<string, number>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'story_companions';
    this.scene.add(this.group);

    this.initCompanions();
  }

  private initCompanions() {
    const friendDefs: StoryCompanion[] = [
      {
        id: 'marcus',
        name: 'Marcus Cole',
        title: 'The Saviour',
        role: 'Saviour',
        color: 0x1f3b60,
        jacketColor: 0x223a5e,
        pantColor: 0x1c2128,
        hairColor: 0x1a1a1a,
        position: [-8.2, 0, -56.5],
        rotationY: Math.PI / 4,
        health: 150,
        maxHealth: 150,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 80,
      },
      {
        id: 'chloe',
        name: 'Chloe Miller',
        title: 'The Explorer',
        role: 'Explorer',
        color: 0xd9822b,
        jacketColor: 0xd47a22,
        pantColor: 0x3d434a,
        hairColor: 0x5c2c16,
        position: [-9.8, 0, -57.8],
        rotationY: 0,
        health: 100,
        maxHealth: 100,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 85,
      },
      {
        id: 'maya',
        name: 'Dr. Maya Lin',
        title: 'The Doctor',
        role: 'Doctor',
        color: 0x2e8b57,
        jacketColor: 0x2b7a4c,
        pantColor: 0xe6e6e6,
        hairColor: 0x111111,
        position: [-7.8, 0, -58.8],
        rotationY: -Math.PI / 3,
        health: 120,
        maxHealth: 120,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 90,
      },
      {
        id: 'rohan',
        name: 'Rohan Mehta',
        title: 'Armoury & Tactical Specialist',
        role: 'Armoury & Tactical',
        color: 0x8a5ac2,
        jacketColor: 0x39404a,
        pantColor: 0x20262d,
        hairColor: 0x171717,
        position: [-6.2, 0, -60.2],
        rotationY: Math.PI / 2,
        health: 130,
        maxHealth: 130,
        dialogueState: 0,
        isFollowing: false,
        station: 'town',
        relationshipScore: 75,
      },
    ];

    friendDefs.forEach((c) => {
      c.isFriend = c.isFriend ?? true;
      this.companions.set(c.id, c);
      const mesh = this.createCompanionMesh(c);
      mesh.name = `companion_${c.id}`;
      mesh.position.set(c.position[0], getTerrainHeight(c.position[0], c.position[2]), c.position[2]);
      mesh.rotation.y = c.rotationY;
      this.group.add(mesh);
      this.companionMeshes.set(c.id, mesh);
    });
  }

  private createCompanionMesh(c: StoryCompanion): THREE.Group {
    const rig = buildRealisticHumanoid({
      name: `companion_${c.id}`,
      facing: '-Z',
      skinColor: c.id === 'marcus' || c.id === 'rohan' ? 0xc28a66 : c.id === 'maya' ? 0xdcb494 : 0xe4b898,
      jacketColor: c.jacketColor,
      shirtColor: c.id === 'maya' ? 0xeaf2ef : 0x22272e,
      pantsColor: c.pantColor,
      hairColor: c.hairColor,
      accentColor: c.color,
      eyeColor: c.id === 'chloe' ? 0x457b5b : c.id === 'maya' ? 0x2a2420 : 0x45586b,
      fabricStyle: c.id === 'maya' ? 'uniform' : 'tactical',
      genderPresentation: c.id === 'marcus' || c.id === 'rohan' ? 'masculine' : 'feminine',
      hairStyle: c.id === 'chloe' ? 'ponytail' : c.id === 'maya' ? 'bun' : 'short',
      hasBeard: c.id === 'marcus' || c.id === 'rohan',
      hasHeadset: c.id === 'chloe' || c.id === 'rohan',
      hasStethoscope: c.id === 'maya',
      hasMedicArmband: c.id === 'maya',
      hasHolster: c.id === 'marcus' || c.id === 'rohan',
      hasBackpack: true,
      packColor: c.id === 'maya' ? 0x1e4d3a : c.id === 'chloe' ? 0x3b352d : c.id === 'rohan' ? 0x49365f : 0x283024,
      hasBandana: c.id === 'marcus',
      bandanaColor: c.color,
      hasBelt: true,
      armAliasStyle: 'full',
      initialRightArmPitch: -Math.PI / 4,
      castShadow: true,
    });
    return rig.group;
  }

  private getLimb(mesh: THREE.Group, name: 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg'): THREE.Object3D | null {
    const aliasMap = {
      leftArm: ['leftArm', 'lArm'],
      rightArm: ['rightArm', 'rArm'],
      leftLeg: ['leftLeg', 'lLeg'],
      rightLeg: ['rightLeg', 'rLeg'],
    };
    for (const id of aliasMap[name]) {
      const obj = mesh.getObjectByName(id);
      if (obj) return obj;
    }
    return null;
  }

  public update(delta: number, playerPos: THREE.Vector3, isEscapeOrShelter: boolean, apartment?: ApartmentBuilding) {
    this.walkTime += delta;

    // Formation offsets when following player
    const formationOffsets: Record<'marcus' | 'chloe' | 'maya' | 'rohan', THREE.Vector3> = {
      marcus: new THREE.Vector3(1.8, 0, 1.6),
      chloe: new THREE.Vector3(-1.8, 0, 1.6),
      maya: new THREE.Vector3(0, 0, 3.2),
      rohan: new THREE.Vector3(0, 0, -1.8),
    };

    this.companions.forEach((c, id) => {
      const mesh = this.companionMeshes.get(id);
      if (!mesh) return;

      const gestureLeft = this.gestureTimers.get(id);
      const gestureActive = gestureLeft !== undefined && gestureLeft > 0;

      if (gestureActive) {
        const next = gestureLeft - delta;
        if (next <= 0) {
          this.gestureTimers.delete(id);
          const lA = this.getLimb(mesh, 'leftArm');
          const rA = this.getLimb(mesh, 'rightArm');
          const lL = this.getLimb(mesh, 'leftLeg');
          const rL = this.getLimb(mesh, 'rightLeg');
          if (lA) lA.rotation.set(0, 0, 0);
          if (rA) rA.rotation.set(-Math.PI / 4, 0, 0);
          if (lL) lL.rotation.set(0, 0, 0);
          if (rL) rL.rotation.set(0, 0, 0);
        } else {
          this.gestureTimers.set(id, next);

          // Active continuous gesture animation
          const lA = this.getLimb(mesh, 'leftArm');
          const rA = this.getLimb(mesh, 'rightArm');
          const lL = this.getLimb(mesh, 'leftLeg');
          const rL = this.getLimb(mesh, 'rightLeg');

          const gestureType = (mesh.userData.activeGesture as string) || 'handshake';
          if (gestureType === 'handshake') {
            const pump = Math.sin(this.walkTime * 12) * 0.15;
            if (rA) {
              rA.rotation.x = -1.15 + pump;
              rA.rotation.z = -0.32;
            }
            if (lA) lA.rotation.x = 0.12;
          } else if (gestureType === 'clap') {
            const clapCycle = Math.sin(this.walkTime * 14);
            if (lA) {
              lA.rotation.x = -1.2;
              lA.rotation.z = -0.35 + clapCycle * 0.22;
            }
            if (rA) {
              rA.rotation.x = -1.2;
              rA.rotation.z = 0.35 - clapCycle * 0.22;
            }
          } else if (gestureType === 'dance') {
            const danceWave = Math.sin(this.walkTime * 8);
            const danceBeat = Math.sin(this.walkTime * 16);
            if (lA) {
              lA.rotation.x = danceBeat * 0.3;
              lA.rotation.z = 0.75 + danceWave * 0.35;
            }
            if (rA) {
              rA.rotation.x = -danceBeat * 0.3;
              rA.rotation.z = -0.75 - danceWave * 0.35;
            }
            if (lL) lL.rotation.x = danceWave * 0.38;
            if (rL) rL.rotation.x = -danceWave * 0.38;
          }
        }
      }

      if (c.isFollowing && !gestureActive) {
        const offset = formationOffsets[id];
        const targetX = playerPos.x + offset.x;
        const targetZ = playerPos.z + offset.z;
        const formationTarget = new THREE.Vector3(targetX, playerPos.y, targetZ);
        const legalWaypoint = apartment?.getCompanionNavigationWaypoint(mesh.position, formationTarget) ?? null;
        const navigationTarget = legalWaypoint ?? formationTarget;

        const dx = navigationTarget.x - mesh.position.x;
        const dz = navigationTarget.z - mesh.position.z;
        const dist = Math.hypot(dx, dz);

        const lLeg = this.getLimb(mesh, 'leftLeg');
        const rLeg = this.getLimb(mesh, 'rightLeg');
        const lArm = this.getLimb(mesh, 'leftArm');
        const rArm = this.getLimb(mesh, 'rightArm');

        if (dist > 0.45) {
          const moveSpeed = isEscapeOrShelter ? 6.2 : 4.0;
          const step = Math.min(dist, delta * moveSpeed);
          const angle = Math.atan2(dx, dz);

          const desiredPos = new THREE.Vector3(
            mesh.position.x + Math.sin(angle) * step,
            mesh.position.y,
            mesh.position.z + Math.cos(angle) * step
          );

          const phys = UnifiedPhysicsManager.getInstance();
          if (phys) {
            const resolved = phys.resolveMovement(mesh.position, desiredPos, 0.35, 1.8, `companion_${id}`);
            mesh.position.x = resolved.resolvedPos.x;
            mesh.position.z = resolved.resolvedPos.z;
          } else {
            mesh.position.x = desiredPos.x;
            mesh.position.z = desiredPos.z;
          }
          mesh.rotation.y = angle;

          // Leg & arm walk swing
          const cycle = Math.sin(this.walkTime * 12 * (moveSpeed / 4));
          if (lLeg && rLeg) {
            lLeg.rotation.x = cycle * 0.6;
            rLeg.rotation.x = -cycle * 0.6;
          }
          if (lArm && rArm) {
            lArm.rotation.x = -cycle * 0.5;
            rArm.rotation.x = cycle * 0.5;
          }
        } else {
          // Idle posture
          if (lLeg && rLeg) {
            lLeg.rotation.x = THREE.MathUtils.damp(lLeg.rotation.x, 0, 10, delta);
            rLeg.rotation.x = THREE.MathUtils.damp(rLeg.rotation.x, 0, 10, delta);
          }
          if (lArm && rArm) {
            lArm.rotation.x = THREE.MathUtils.damp(lArm.rotation.x, 0, 10, delta);
            rArm.rotation.x = THREE.MathUtils.damp(rArm.rotation.x, 0, 10, delta);
          }
        }
      }

      mesh.position.y =
        apartment?.getCompanionSurfaceHeight(mesh.position, mesh.position.y, playerPos.y) ??
        getTerrainHeight(mesh.position.x, mesh.position.z);
      c.position = [mesh.position.x, mesh.position.y, mesh.position.z];
      c.rotationY = mesh.rotation.y;

      const physMgr = UnifiedPhysicsManager.getInstance();
      if (physMgr) {
        physMgr.updateColliderPosition(`companion_${id}`, mesh.position, mesh.rotation.y);
      }
    });
  }

  public registerColliders(physMgr: UnifiedPhysicsManager) {
    this.companions.forEach((c) => {
      physMgr.registerCylinderCollider(`companion_${c.id}`, 'companion', c.position, 0.45, 1.85);
    });
  }

  public setAllFollowing(following: boolean) {
    this.companions.forEach((c) => {
      c.isFollowing = following;
    });
  }

  public teleportTo(id: 'marcus' | 'chloe' | 'maya' | 'rohan', pos: [number, number, number], rotY: number) {
    const c = this.companions.get(id);
    const mesh = this.companionMeshes.get(id);
    if (c && mesh) {
      c.position = [...pos];
      c.rotationY = rotY;
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.rotation.y = rotY;
    }
  }

  public playFriendGesture(id: 'marcus' | 'chloe' | 'maya' | 'rohan', gesture: 'handshake' | 'clap' | 'dance') {
    const mesh = this.companionMeshes.get(id);
    if (!mesh) return false;
    mesh.userData.activeGesture = gesture;
    this.gestureTimers.set(id, gesture === 'dance' ? 60 : 3.0);
    soundEngine.playUIClick();
    return true;
  }

  public stopFriendGesture(id: 'marcus' | 'chloe' | 'maya' | 'rohan') {
    this.gestureTimers.delete(id);
    const mesh = this.companionMeshes.get(id);
    if (!mesh) return false;
    mesh.userData.activeGesture = undefined;
    const lA = this.getLimb(mesh, 'leftArm');
    const rA = this.getLimb(mesh, 'rightArm');
    const lL = this.getLimb(mesh, 'leftLeg');
    const rL = this.getLimb(mesh, 'rightLeg');
    if (lA) lA.rotation.set(0, 0, 0);
    if (rA) rA.rotation.set(-Math.PI / 4, 0, 0);
    if (lL) lL.rotation.set(0, 0, 0);
    if (rL) rL.rotation.set(0, 0, 0);
    return true;
  }

  public setFriendFollowing(id: 'marcus' | 'chloe' | 'maya' | 'rohan', following: boolean) {
    const c = this.companions.get(id);
    if (!c) return false;
    c.isFollowing = following;
    return true;
  }

  public toggleCompanionFollowing(id: 'marcus' | 'chloe' | 'maya' | 'rohan'): boolean {
    const c = this.companions.get(id);
    if (!c) return false;
    c.isFollowing = !c.isFollowing;
    soundEngine.playUIClick();
    return c.isFollowing;
  }

  public regroupAll(playerPos: THREE.Vector3) {
    this.companions.forEach((c) => {
      c.isFollowing = true;
    });
    soundEngine.playBuildSnap();
  }

  public getNearestCompanion(pos: THREE.Vector3, maxDist = 3.5): StoryCompanion | null {
    let nearest: StoryCompanion | null = null;
    let minDist = maxDist;
    this.companions.forEach((c) => {
      const d = Math.hypot(c.position[0] - pos.x, c.position[2] - pos.z);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    });
    return nearest;
  }

  public dispose() {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry && !child.geometry.userData?.__sharedResource) {
          child.geometry.dispose();
        }
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m && !m.userData?.__sharedResource) m.dispose();
        });
      }
    });
    this.companions.clear();
    this.companionMeshes.clear();
  }
}
